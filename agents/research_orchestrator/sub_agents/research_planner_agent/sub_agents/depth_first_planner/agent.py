from google.adk.agents import Agent
from pydantic import BaseModel, Annotated
from typing import List

depth_first_planner_prompt = """
You are an expert at developing depth-first research plans.
Ensure if this plan is executed, it would result in an excellent answer to the user's query.
You should develop the research plan by using the following guidelines:

- Define 3-5 different methodological approaches or perspectives.
- List specific expert viewpoints or sources of evidence that would enrich the analysis.
- Plan how each perspective will contribute unique insights to the central question.
- Specify how findings from different approaches will be synthesized.
- Example: For "What causes obesity?", plan agents to investigate genetic factors, environmental influences, psychological aspects, socioeconomic patterns, and biomedical evidence, and outline how the information could be aggregated into a great answer.
"""

class DepthFirstResearchPlan(BaseModel):
    approaches: List[str] = Annotated[List[str], "A list of 3-5 different methodological approaches or perspectives"]
    expert_viewpoints: List[str] = Annotated[List[str], "A list of specific expert viewpoints or sources of evidence that would enrich the analysis"]
    synthesis_method: str = Annotated[str, "A clear plan for how findings from different approaches will be synthesized"]


depth_first_planner_agent = Agent(
    name="depth_first_planner_agent",
    description="""This agent is responsible for developing a depth-first research plan for a given user query.""",
    instructions=depth_first_planner_prompt,
    model="gemini-2.5-flash",
    output_key="research_plan",
    output_schema=DepthFirstResearchPlan,
)

