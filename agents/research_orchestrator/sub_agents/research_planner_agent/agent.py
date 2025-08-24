from strands import Agent, tool
from sub_agents.general_research_planner import general_research_planner
from sub_agents.depth_first_planner import depth_first_planner
from sub_agents.breadth_first_planner import breadth_first_planner
from domain import GeneralResearchPlan, DepthFirstResearchPlan, BreadthFirstResearchPlan
from typing import Annotated


research_planner_prompt = """
You are an expert at developing research plans for a given user query with or without user feedback.
<Task>
Your task is to use the details from the query analysis to develop a specific research plan with clear allocation of tasks across different research subagents in mind.
You can either develop a research plan from start with just the user query or you can modify an existing research plan based on user feedback.
If you receive a feedback, you can decide:
- To reuse many aspects of the existing research plan and only add or change a few aspects of it to accomodate the suggestions from the feedback.
- To resuse existing steps/aspects of the existing plan but redevelop a new plan with same or different approach to accomodate the suggestions from the feedback.
- To develop a new research plan from scratch based on the suggestions from the feedback.
</Task>

<Research Plan Types>
You can develop 3 different types of research plans:
- General research plan: This is a general research plan that is not specific to depth-first or breadth-first queries. This is used for straightforward queries or those that require minor analysis.
- Depth-first research plan: This is a research plan that is specific to depth-first queries. This is used for queries that require multiple perspectives or viewpoints.
- Breadth-first research plan: This is a research plan that is specific to breadth-first queries. This is used for queries that require multiple sub-questions or sub-tasks.

Note: The task of creating subagents is not yours. This information is only provided to you to help you develop a research plan. 

You develop the research plan by using the most appropriate research plan tool based on insights from the previous analysis.
After developing the research plan, present it to the user by using the handoff_to_user tool in order to get feedback on the research plan. 
"""




research_planner_agent = Agent(
    name="research_planner_agent",
    description="""This agent is responsible for developing a research plan for a given user query.""",
    system_prompt=research_planner_prompt,
    model="gemini-2.5-flash",
    tools=[
        general_research_planner,
        depth_first_planner,
        breadth_first_planner
    ]
)

ResearchPlan = Annotated[
    GeneralResearchPlan | DepthFirstResearchPlan | BreadthFirstResearchPlan,
    "A research plan that can be any of the three types"
]


@tool
async def generate_new_research_plan(query: str) -> ResearchPlan:
    """
    Generates an appropriate research plan for a given query by selecting and applying the most suitable planning approach.

    This tool analyzes the query and creates a structured research plan using one of three approaches:
    - General research plan: For straightforward queries requiring basic fact-finding or minor analysis
    - Depth-first research plan: For queries needing multiple perspectives or in-depth analysis
    - Breadth-first research plan: For queries that can be broken into distinct sub-questions

    The appropriate plan type is selected based on the query's characteristics and complexity.

    Args:
        query (str): The user's research query to be analyzed

    Returns:
        ResearchPlan: A structured research plan containing the appropriate strategy and approach for answering 
            the query effectively. Can be one of:
            - GeneralResearchPlan: For straightforward, fact-finding queries
            - DepthFirstResearchPlan: For queries requiring multiple perspectives
            - BreadthFirstResearchPlan: For queries with distinct sub-components

    Example:
        For a straightforward query like "What is the population of Tokyo?", returns a GeneralResearchPlan
        For a complex query like "How has AI impacted healthcare?", returns a DepthFirstResearchPlan
        For a broad query like "Compare EU tax systems", returns a BreadthFirstResearchPlan
    """

    return await research_planner_agent.structured_output_async(ResearchPlan, query)



