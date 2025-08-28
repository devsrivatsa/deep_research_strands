from domain import (
    Feedback, 
    CompletedResearchTask, 
    CompressedResearchOutput, 
    FinalResearchReview, 
    ResearchOutput,  
    ResearchJob, 
    ParallelResearchConfig
)
from jinja2 import Environment
from sub_agents.research_worker.agent import research_task 
from sub_agents.research_aggergator import compress_research
from sub_agents.research_verifier import verify_research
import asyncio
from typing import Dict, Any, List, Tuple, Optional
from pydantic import BaseModel
from strands import tool

class ParallelResearchConfig(BaseModel):
    research_jobs: List[ResearchJob]

async def _single_task_rloop(rt: str):
    """Orchestrate the single task research loop"""
    #TODO: handle errors if rt is not up to the standard
    research_output: ResearchOutput = await research_task(rt)
    if not research_output.research_output or len(research_output.research_output) == 0:
        return {
            "Error": "No research output was returned from the research task",
        }
    compressed_research_output: CompressedResearchOutput = await compress_research(research_output)
    final_research_review: FinalResearchReview = await verify_research(compressed_research_output)
    return (rt, research_output, compressed_research_output, final_research_review)

async def _sequential_rloop(rt_list: List[str]):
    """Orchestrate the sequential research loop. Tasks are executed in order, and the output of each task is used as input to the next task."""
    research_output = []
    for rt in rt_list:
        research_output: ResearchOutput = await research_task(rt)
        if not research_output.research_output or len(research_output.research_output) == 0:
            #TODO: handle errors if research_output is not up to the standard
            return {
                "research_verdict": "research_incomplete",
                "error_message": "No research output was returned from the research task"
            }
        compressed_research_output: CompressedResearchOutput = await compress_research(research_output)
        
        final_research_review: FinalResearchReview = await verify_research(compressed_research_output)
      
        research_output.append((rt, research_output, compressed_research_output, final_research_review))
    
    return research_output

async def _conduct_research(research_job: ResearchJob):
    if len(research_job.research_tasks) == 1:
        root_research_task = research_job.research_tasks[0]
        rt, research_output, compressed_research_output, final_research_review = await _single_task_rloop(root_research_task)
        #handle feedback here.
        if final_research_review.research_verdict != "research_complete":
            feedbacks, completed_tasks = _segregate_task_results([(rt, research_output, compressed_research_output, final_research_review)])
            #TODO: store completed tasks in persistent storage, and some id of it in the agent state.
            return _format_for_presentation(
                feedbacks, 
                completed_tasks
            )
        else:
            return _format_for_presentation(
                None, 
                [CompletedResearchTask(
                    research_task=root_research_task, 
                    completed_research_tasks=final_research_review.research_tasks_completed, 
                    compress_research_output=compressed_research_output
                )]
            )
    else:
        research_outputs = await _sequential_rloop(research_job.research_tasks)
        to_be_segregated, completed = [], []
        for ro in research_outputs:
            if ro[3].research_verdict != "research_complete":
                to_be_segregated.append(ro)
            else:
                completed.append(
                    CompletedResearchTask(
                        research_task=ro[0], 
                        completed_research_tasks=ro[3].research_tasks_completed, 
                        compress_research_output=ro[2]
                    )
                )
        feedbacks, completed_tasks = _segregate_task_results(to_be_segregated)
        completed.extend(completed_tasks)
        return _format_for_presentation(feedbacks, completed)

def _segregate_task_results(completed_jobs: List[Tuple[str, ResearchOutput, CompressedResearchOutput, FinalResearchReview]]):
    """
    Analyze the results of the completed research tasks and return a list of feedback for the research tasks that are incomplete.
    """
    completed, feedbacks = [], []
    for job in completed_jobs:
        if job[3].research_verdict != "research_complete":
            feedback = Feedback(research_task=job[0], incomplete_research_tasks=job[3].research_tasks_missing)
            completed_task = CompletedResearchTask(research_task=job[0], completed_research_tasks=job[3].research_tasks_completed, compress_research_output=job[2])
            completed.append(completed_task)
            feedbacks.append(feedback)
        else:
            completed_task = CompletedResearchTask(research_task=job[0], completed_research_tasks=job[3].research_tasks_completed, compress_research_output=job[2])
            completed.append(completed_task)
    return feedbacks, completed

def _format_for_presentation(feedbacks: Optional[List[Feedback]], completed_tasks: List[CompletedResearchTask]):
    """Format the feedback and or completed tasks for presenting to the supervisor agent"""
    jinja_env = Environment()
    prompt_template = jinja_env.from_string("""
        The following is a overview of the research tasks that were completed as part of this research round:        
        {% for completed_task in completed_tasks %}
            Research Objective: {{completed_task.research_task}}
            Completed Research Tasks:
            {% for task in completed_task.completed_research_tasks %}
                {{task}}
            {% endfor %}
        {% endfor %}
        {% if len(feedbacks) > 0 %}
            The feedback from the review agent is:
            {% for feedback in feedbacks %}
                Feedback on task: {{feedback.research_task}}
                Feedback on incomplete Research Tasks:
                {% for task, purpose in feedback.incomplete_research_tasks.items() %}
                    Feedback: {{task}}
                    Purpose: {{purpose}}
                {% endfor %}
            {% endfor %}
        {% endif %}"""
    )
    short_research_overview = prompt_template.render(feedbacks=feedbacks, completed_tasks=completed_tasks)
    return short_research_overview

@tool
async def conduct_research(prconfig: ParallelResearchConfig) -> List[Tuple[str, ResearchOutput, CompressedResearchOutput, FinalResearchReview]]:
    """
    A tool that executes multiple research tasks in parallel to gather comprehensive information.

    This tool takes a research configuration and spawns multiple sub-agents to conduct research tasks simultaneously. Each task is independently executed and reviewed. The results are aggregated into a final overview.

    Args:
        prconfig (ParallelResearchConfig): Configuration object containing a list of research jobs to be executed. Each job should specify what information needs to be researched.

    Returns:
        List[Tuple[str, ResearchOutput, CompressedResearchOutput, FinalResearchReview]]: A list containing tuples for each completed research job. Each tuple contains:
            - The research task description (str)
            - The detailed research output (ResearchOutput) 
            - A compressed version of the findings (CompressedResearchOutput)
            - A review of the research completeness (FinalResearchReview)

    Example:
        research_config = ParallelResearchConfig(research_jobs=[...])
        results = await conduct_research(research_config)
    """
    tasks: list[asyncio.Task] = []

    for rj in prconfig.research_jobs:
        if not isinstance(rj, ResearchJob):
            raise ValueError("Each item in the research_job_config must be a ResearchJob object. Check the research_job_config and ensure that each item in the list is a ResearchJob object.")
        tasks.append(
            asyncio.create_task(
                _conduct_research(rj)
            )
        )

    completed_jobs = await asyncio.gather(*tasks)
    jinja_env = Environment()
    prompt_template = jinja_env.from_string(
        """
        All the assigned research jobs were completed. The following is a overview of each completed research job which were all reviewed by the review agent. 
        Note: This is just a one liner overview of the completed research jobs, not the full report or the summary.
        {% for job in completed_jobs %}
            Research Job: {{job.research_task}}
            Completed Research Tasks:
            {% for task in job.completed_research_tasks %}
                {{task}}
            {% endfor %}
        {% endfor %}
        """
    )
    full_research_overview = prompt_template.render(completed_jobs=completed_jobs)
    
    return full_research_overview
