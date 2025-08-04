import logging
from strands import Agent, tool
from strands.multiagent import GraphBuilder
from pydantic import BaseModel, Annotated, Optional
from typing import List
from .prompt import research_orchestrator_prompt
from agents.research_orchestrator.sub_agents.query_analysis_workflow.workflow import query_analysis_pipeline
from sub_agents.research_planner_agent.agent import research_planner_agent

logging.getLogger("strands.multiagent").setLevel(logging.DEBUG)
logging.basicConfig(
    format="%(levelname)s %(asctime)s %(name)s %(message)s",
    level=logging.DEBUG,
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler()]
)

builder = GraphBuilder()

builder.add_node(query_analysis_pipeline, "Query Analysis Pipeline")
builder.add_node(research_planner_agent, "Research Planner Agent")
builder.add_node(human_feedback_agent, "Human Feedback Agent")
builder.add_node(feedback_analyzer_agent, "Feedback Analyzer Agent")
builder.add_node(research_process_pipeline, "Research Process Pipeline")

builder.set_entry_point("Query Analysis Pipeline")
research_orchestrator = builder.build()


research_orchestrator = Agent(
    name="Research Orchestrator",
    description="""This is a research orchestrator. It is responsible for orchestrating the research process. It is the main agent that the user interacts with.""",
    instructions=research_orchestrator_prompt,
    model="gemini-2.5-flash",
    output_key="",
    sub_agents=[
        AgentTool(
            agent=query_analysis_pipeline,
            name="Query Analysis Pipeline Tool",
            description="""This agent is responsible for analyzing the user's query and breaking it down into a research plan for further downstream execution."""
        ),
        AgentTool(
            agent=research_planner_agent,
            name="Research Planner Tool",
            description="""This agent is responsible for planning the research process. It is responsible for creating a research plan for the query."""
        )
    ],
)

root_agent = research_orchestrator