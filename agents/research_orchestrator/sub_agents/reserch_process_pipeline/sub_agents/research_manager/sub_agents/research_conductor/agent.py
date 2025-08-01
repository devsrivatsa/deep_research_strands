from sub_agents.research_worker.agent import research_task, ResearchOutput
from sub_agents.research_aggregator.agent import compress_research, CompressedResearchOutput
from sub_agents.research_verifier.agent import verify_research, FinalResearchReview
import asyncio
from typing import Dict, Any, List
from sub_agents.research_manager.agent import ResearchJob
from pydantic import BaseModel

class ParallelResearchConfig(BaseModel):
    research_jobs: List[ResearchJob]

async def _single_task_rloop(rt: str):
    """Orchestrate the single task research loop"""
    #TODO: handle errors if rt is not up to the standard
    research_output: ResearchOutput = research_task(rt)
    compressed_research_output: CompressedResearchOutput = compress_research(research_output)
    final_research_review: FinalResearchReview = verify_research(compressed_research_output)
    return [(rt, research_output, compressed_research_output, final_research_review)]

async def _sequential_rloop(rt_list: List[str]):
    """Orchestrate the sequential research loop. Tasks are executed in order, and the output of each task is used as input to the next task."""
    research_output = []
    for rt in rt_list:
        research_output: ResearchOutput = research_task(rt)
        if not research_output.research_output or len(research_output.research_output) == 0:
            #TODO: handle errors if research_output is not up to the standard
            return {
                "research_verdict": "research_incomplete",
                "error_message": "No research output was returned from the research task",
                "what else do i put here": "should brains"
            }
        compressed_research_output: CompressedResearchOutput = compress_research(research_output)
        #TODO: handle errors if compressed_research_output is not up to the standard
        final_research_review: FinalResearchReview = verify_research(compressed_research_output)
        #TODO: handle errors if final_research_review is not up to the standard
        research_output.append((rt, research_output, compressed_research_output, final_research_review))
    
    #TODO: construct report for the _sequential_rloop; DO not return the research_output_list.
    return research_output

async def _conduct_research(research_job: ResearchJob):
    if len(research_job.research_tasks) == 1:
        root_research_task = research_job.research_tasks[0]
        return await _single_task_rloop(root_research_task)
    else:
        return await _sequential_rloop(research_job.research_tasks)



# async def _call_tool(
#     tool_name: str,
#     tool,
#     args: Dict[str, Any],
#     sem: asyncio.Semaphore | None = None,
# ) -> ToolCallResult:
#     tool_call_id = f"{tool_name}-{hash(str(args))}"
#     try:
#         if sem:
#             async with sem:
#                 result = await tool(**args)      # kwargs, no extra param
#         else:
#             result = await tool(**args)
#         return ToolCallResult(
#             tool_call_id=tool_call_id,
#             tool_name=tool_name,
#             tool_result=result,
#             is_error=False,
#         )
#     except Exception as exc:
#         return ToolCallResult(
#             tool_call_id=tool_call_id,
#             tool_name=tool_name,
#             is_error=True,
#             error_message=str(exc),
#         )


async def conduct_research(prconfig: ParallelResearchConfig) -> List[(CompressedResearchOutput, FinalResearchReview)]:
    tasks: list[asyncio.Task] = []

    for rj in prconfig.research_jobs:
        if not isinstance(rj, ResearchJob):
            raise ValueError("Each item in the research_job_config must be a ResearchJob object. Check the research_job_config and ensure that each item in the list is a ResearchJob object.")
        tasks.append(
            asyncio.create_task(
                _conduct_research(rj)
            )
        )

    return await asyncio.gather(*tasks)