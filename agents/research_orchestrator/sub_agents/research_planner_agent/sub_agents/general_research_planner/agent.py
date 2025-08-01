from google.adk.agents import Agent
from pydantic import BaseModel, Annotated
from typing import List, Dict, Optional

general_research_planner_prompt = """
    You are an expert at developing general research plans.
    Ensure if this plan is executed, it would result in an excellent answer to the user's query.
    You should develop the research plan by using the following guidelines:
    
    - Identify the most direct, efficient path to the answer. 
    - Determine whether basic fact-finding or minor analysis is needed.
    - Specify exact data points or information required to answer.
    - Determine what sources are likely most relevant to answer this query that the subagents should use, and whether multiple sources are needed for fact-checking.
    - Plan basic verification methods to ensure the accuracy of the answer.
    - Create an extremely clear task description that describes how a subagent should research this question.
    - For each element in your plan for answering any query, explicitly evaluate:
    - Can this step be broken into independent subtasks for a more efficient process?
    - Would multiple perspectives benefit this step?
    - What specific output is expected from this step?
    - Is this step strictly necessary to answer the user's query well?
"""

class PlanElement(BaseModel):
    description: str = Annotated[str, "A clear description of the plan step"]
    should_decompose: bool = Annotated[bool, "Whether this step should be decomposed into smaller steps"]
    sub_steps: Optional[List[str]] = Annotated[Optional[List[str]], "A list of sub-steps that need to be taken to complete this step"]
    expected_output: Optional[str] = Annotated[Optional[str], "A clear description of the expected output from this step"]
    is_strictly_necessary: bool = Annotated[bool, "Whether this step is strictly necessary to answer the user's query well"]    


class StraightforwardResearchPlan(BaseModel):
    direct_path: str = Annotated[str, "A direct path to the answer"]
    fact_finding_steps: Optional[List[str]] = Annotated[Optional[List[str]], "A list of fact-finding steps that need to be taken to answer the query"]
    key_data_points: Optional[List[str]] = Annotated[Optional[List[str]], "A list of key data points that need to be found to answer the query"]
    sources_to_use: Optional[List[str]] = Annotated[Optional[List[str]], "A list of sources that need to be used to answer the query"]
    verification_steps: Optional[List[str]] = Annotated[Optional[List[str]], "A list of verification steps that need to be taken to ensure the accuracy of the answer"]
    plan_elements: Optional[List[PlanElement]] = Annotated[Optional[List[PlanElement]], "A list of plan elements that need to be addressed to answer the query"]


general_research_planner_agent = Agent(
    name="general_research_planner_agent",
    description="""This agent is responsible for developing a general research plan (not specific to depth-first or breadth-first queries) for a given user query.""",
    instructions=general_research_planner_prompt,
    model="gemini-2.5-flash",
    output_key="research_plan",
    output_schema=StraightforwardResearchPlan,
)
