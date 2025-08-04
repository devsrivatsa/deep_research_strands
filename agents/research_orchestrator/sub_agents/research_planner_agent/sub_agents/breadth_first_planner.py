from strands import Agent, tool
from domain import BreadthFirstResearchPlan

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

breadth_first_planner_agent = Agent(
    name="breadth_first_planner_agent",
    description="""This agent is responsible for developing a breadth-first research plan for a given user query.""",
    system_prompt=breadth_first_planner_prompt,
    model="gemini-2.5-flash"
)

@tool
async def breadth_first_planner(query: str) -> BreadthFirstResearchPlan:
    """
    Generates a breadth-first research plan for a given query by breaking it down into distinct sub-questions or sub-tasks.

    This tool analyzes the query and creates a structured research plan that:
    - Identifies independent sub-questions that can be researched in parallel
    - Prioritizes and orders sub-tasks based on importance and complexity 
    - Defines clear boundaries between sub-topics to prevent overlap
    - Plans how findings will be aggregated into a coherent answer

    Best used for queries that:
    - Have multiple distinct components that need to be researched separately
    - Require gathering information across different categories or dimensions
    - Can benefit from parallel research of independent sub-topics
    - Need systematic coverage of a broad topic area

    Args:
        query (str): The user's research query to be analyzed

    Returns:
        BreadthFirstResearchPlan: A structured plan containing the sub-questions, priorities,
            and approach for researching the query in a breadth-first manner

    Example:
        For "Compare EU country tax systems", the plan would:
        1. Get list of current EU countries
        2. Define tax system comparison metrics
        3. Research metrics for countries by region in parallel
        4. Specify how to synthesize findings
    """
    return await breadth_first_planner_agent.structured_output_async(BreadthFirstResearchPlan, f"\n\nHere is the user's query:\n{query}")