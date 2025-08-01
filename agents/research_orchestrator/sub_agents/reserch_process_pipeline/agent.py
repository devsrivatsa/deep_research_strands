from sub_agents.research_manager.agent import research_manager_agent
from sub_agents.task_analyzer.agent import task_analysis

research_pipeline = SequentialAgent(
    name="research_pipeline",
    description="A pipeline that orchestrates the research process",
    agents=[task_analyzer_agent, research_manager_agent],
)
#Note: state is not saved unlike the google adk implementation
def research_pipeline(research_plan: ResearchPlan):
    task_analysis = task_analysis(research_plan)
    #add some validation here if needed or do some state updates to update the task_analysis
    raw_research_output = research_manager_agent(research_plan, task_analysis)
    return raw_research_output