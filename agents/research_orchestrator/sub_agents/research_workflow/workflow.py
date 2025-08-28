from .sub_agents.research_manager.agent import research_manager_agent
from .sub_agents.task_analyzer import task_analysis


#Note: state is not saved unlike the google adk implementation
def run_research_workflow(research_plan: str):
    research_action_plan = task_analysis(research_plan)
    #add some validation here if needed or do some state updates to update the task_analysis
    raw_research_output = research_manager_agent(research_action_plan.model_dump_json())
    return raw_research_output