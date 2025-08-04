from strands import Agent, tool
from domain import DepthFirstResearchPlan

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

depth_first_planner_agent = Agent(
    name="depth_first_planner_agent",
    description="""This agent is responsible for developing a depth-first research plan for a given user query.""",
    system_prompt=depth_first_planner_prompt,
    model="gemini-2.5-flash"
)

@tool
async def depth_first_planner(query: str) -> DepthFirstResearchPlan:
    """
    Generates a depth-first research plan for a given query by exploring multiple methodological approaches and perspectives.

    This tool analyzes the query and creates a structured research plan that:
    - Defines 3-5 different methodological approaches or expert viewpoints
    - Plans how each perspective will contribute unique insights
    - Specifies how findings from different approaches will be synthesized
    - Ensures comprehensive coverage through multiple angles of analysis

    Best used for queries that:
    - Require examining multiple viewpoints or methodologies
    - Need deep analysis from different expert perspectives
    - Benefit from considering various sources of evidence
    - Need to synthesize insights from different approaches

    Args:
        query (str): The user's research query to be analyzed

    Returns:
        DepthFirstResearchPlan: A structured plan containing the different perspectives,
            methodological approaches, and synthesis strategy for researching the query
            in a depth-first manner

    Example:
        For "What causes obesity?", the plan would:
        1. Define perspectives (genetic, environmental, psychological, etc.)
        2. Specify expert viewpoints and evidence sources for each
        3. Plan how insights from each approach contribute
        4. Outline synthesis of findings into comprehensive answer
    """
    return await depth_first_planner_agent.structured_output_async(DepthFirstResearchPlan, f"\n\nHere is the user's query:\n{query}")

