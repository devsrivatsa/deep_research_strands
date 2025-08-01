from google.adk.agents import Agent
from pydantic import BaseModel, Annotated
from typing import List, Dict

breadth_first_planner_prompt = """
You are an expert at developing breadth-first research plans.
Ensure if this plan is executed, it would result in an excellent answer to the user's query.
You should develop the research plan by using the following guidelines:

- Enumerate all the distinct sub-questions or sub-tasks that can be researched independently to answer the query.
- Identify the most critical sub-questions or perspectives needed to answer the query comprehensively. This is done in order to determine the number of subagents to create. Additional subagents are ONLY created if the query has clearly distinct components that cannot be efficiently handled by fewer agents. We must avoid creating subagents for every possible angle - focus on the essential ones. 
- The task of creating subagents is not yours. This information is only provided to you to help you develop a research plan. 
- Prioritize by assigning order of execution to these sub-tasks based on their importance and expected research complexity.
- Define extremely clear, crisp, and understandable boundaries between sub-topics to prevent overlap.
- Plan how findings will be aggregated into a coherent whole.
- Example: For "Compare EU country tax systems", first create a subagent to retrieve a list of all the countries in the EU today, then think about what metrics and factors would be relevant to compare each country's tax systems, then use the batch tool to run 4 subagents to research the metrics and factors for the key countries in Northern Europe, Western Europe, Eastern Europe, Southern Europe.
"""

class BreadthFirstResearchPlan(BaseModel):
    sub_questions: List[str] = Annotated[List[str], "A list of all the distinct sub-questions or sub-tasks that can be researched independently to answer the query"]
    critical_sub_questions: List[str] = Annotated[List[str], "A list of the most critical sub-questions or perspectives needed to answer the query comprehensively"]
    sub_agent_boundaries: Dict[str, str] = Annotated[Dict[str, str], "A dictionary of extremely clear, crisp, and understandable boundaries between sub-topics to prevent overlap"]
    aggregation_method: str = Annotated[str, "A clear plan for how findings will be aggregated into a coherent whole"]


breadth_first_planner_agent = Agent(
    name="breadth_first_planner_agent",
    description="""This agent is responsible for developing a breadth-first research plan for a given user query.""",
    instructions=breadth_first_planner_prompt,
    model="gemini-2.5-flash",
    output_key="research_plan",
    output_schema=BreadthFirstResearchPlan,
)