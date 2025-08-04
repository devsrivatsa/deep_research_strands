from strands import Agent, tool
from domain import StraightforwardResearchPlan

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

general_research_planner_agent = Agent(
    name="general_research_planner_agent",
    description="""This agent is responsible for developing a general research plan (not specific to depth-first or breadth-first queries) for a given user query.""",
    system_prompt=general_research_planner_prompt,
    model="gemini-2.5-flash"
)

@tool
async def general_research_planner(query: str) -> StraightforwardResearchPlan:
    """
    Generates a straightforward research plan for queries that require basic fact-finding or minor analysis.

    This tool analyzes the query and creates a structured research plan that:
    - Identifies the most direct path to answering the query
    - Specifies exact data points and information needed
    - Determines relevant sources for research and fact-checking
    - Plans basic verification methods
    - Creates clear task descriptions for research execution

    Best used for queries that:
    - Have straightforward answers that can be found through basic research
    - Don't require multiple perspectives or complex analysis
    - Need focused fact-finding or minor analytical work
    - Can be answered efficiently with a direct approach

    Args:
        query (str): The user's research query to be analyzed

    Returns:
        StraightforwardResearchPlan: A structured plan containing the research approach,
            required information, sources to check, and verification methods for
            answering the query efficiently

    Example:
        For "What is the population of Tokyo?", the plan would:
        1. Specify exact data points needed (current population)
        2. Identify authoritative sources
        3. Include verification steps
        4. Provide clear research instructions
    """
    return await general_research_planner_agent.structured_output_async(StraightforwardResearchPlan, f"\n\nHere is the user's query:\n{query}")