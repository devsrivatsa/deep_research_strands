from google.adk.agents import Agent
from sub_agents.general_research_planner.agent import general_research_planner_agent
from sub_agents.depth_first_planner.agent import depth_first_planner_agent
from sub_agents.breadth_first_planner.agent import breadth_first_planner_agent
from google.adk.tools import AgentTool

research_planner_prompt = """
You are an expert at developing research plans for a given user query.
You can develop 3 different types of research plans:
- General research plan: This is a general research plan that is not specific to depth-first or breadth-first queries. This is used for straightforward queries or those that require minor analysis.
- Depth-first research plan: This is a research plan that is specific to depth-first queries. This is used for queries that require multiple perspectives or viewpoints.
- Breadth-first research plan: This is a research plan that is specific to breadth-first queries. This is used for queries that require multiple sub-questions or sub-tasks.

Your task is to use the details from the previous analysis to develop a specific research plan with clear allocation of tasks across different research subagents in mind.
Note: The task of creating subagents is not yours. This information is only provided to you to help you develop a research plan. 

You develop the research plan by using the most appropriate research plan tool based on insights from the previous analysis.

In our previous analysis, we have determined that the user's query is of type: {{.QueryType}}.
We have also broken down the user's query into the following components:

<main_concepts>
{{.MainConcepts}}
</main_concepts>

<key_entities>
{{.KeyEntities}}
</key_entities>

<relationships>
{{.Relationships}}
</relationships>

<temporal_constraints>
{{.TemporalConstraints}}
</temporal_constraints>

<important_features>
{{.ImportantFeatures}}
</important_features>

<tools_needed>
{{.ToolsNeeded}}
</tools_needed>

<other_details>
{{.OtherDetails}}
</other_details>
"""

research_planner_agent = Agent(
    name="research_planner_agent",
    description="""This agent is responsible for developing a research plan for a given user query.""",
    instructions=research_planner_prompt,
    model="gemini-2.5-flash",
    output_key="research_plan",
    tools=[
        AgentTool(
            agent=general_research_planner_agent,
            name="general_research_planner_agent",
            description="This tool is used to develop a general research plan for a given user query. This is used for straightforward queries or those that require minor analysis."
        ),
        AgentTool(
            agent=depth_first_planner_agent,
            name="depth_first_planner_agent",
            description="This tool is used to develop a depth-first research plan for a given user query. This is used for queries that require multiple perspectives or viewpoints."
        ),
        AgentTool(
            agent=breadth_first_planner_agent,
            name="breadth_first_planner_agent",
            description="This tool is used to develop a breadth-first research plan for a given user query. This is used for queries that require multiple sub-questions or sub-tasks."
        )
    ]
)









