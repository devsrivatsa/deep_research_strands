from strands import Agent
from pydantic import BaseModel, Field
from typing import List, Dict, Literal
from sub_agents.research_conductor.sub_agents.research_worker.tools.tools import ResearchReport

research_verifier_prompt = """
You are an expert at verifying the research findings to ensure that they satisfy the research requirements. You will do this by comparing the condensed research findings to the original research requirements.
Reason carefully about whether all of the returned research findings together are comprehensive enough for a detailed report to answer the overall research question.
Research is expensive, therefore you should be stingy about stating missing research tasks. If they are simple additional details that could be easily omitted, do not include them in the list of missing research tasks.
If the research findings do not satisfy the research requirements, you will return a list of research tasks that have been completed and is useful, and a list of research tasks that are missing.
Ensure that you include the purpose that the missing research tasks serve to answer the overall research question.
"""

research_verifier = Agent(
    name="research_verifier",
    description="An agent that verifies the research findings to ensure that they satisfy the research requirements.",
    system_prompt=research_verifier_prompt,
    model="gemini-2.0-flash-001"
)

class FinalResearchReview(BaseModel):
    research_verdict: Literal["research_complete", "research_incomplete"] = Field(description="The verdict on the research findings. You should return 'research_complete'/'research_incomplete' based on whether the research findings are comprehensive and complete enough to answer the overall research question.")
    research_tasks_completed: List[str] = Field(description="A list of research tasks that have been completed and is useful.")
    research_tasks_missing: List[Dict[str, str]] = Field(description="A list of research tasks with their purposes that are missing. The key is the research task, and the value is the purpose of the research task.")

def verify_research(research_report: ResearchReport) -> FinalResearchReview:
    research_verifier_agent = research_verifier.structured_output(FinalResearchReview, research_verifier_prompt)
    return research_verifier_agent