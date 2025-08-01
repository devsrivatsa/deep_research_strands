from google.adk.agents import SequentialAgent
from sub_agents.query_components_analyzer.agent import query_components_analyzer_agent
from sub_agents.query_type_analyzer.agent import query_type_analyzer_agent
from callbacks import check_state

query_analysis_pipeline = SequentialAgent(
    name="query_analysis_pipeline",
    sub_agents=[
        query_components_analyzer_agent,
        query_type_analyzer_agent,
    ],
    description="""Executes a sequence of actions via subagents to analyze the user's query and break it down into a research plan for further downstream execution.""",
    after_step_callbacks=check_state #this is a callback that checks the state of the agent and raises an error if the state is not as expected
)