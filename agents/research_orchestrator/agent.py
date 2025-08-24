import logging
from strands.multiagent import GraphBuilder
from sub_agents.query_analysis_workflow.workflow import QueryAnalysis
from sub_agents.query_analysis_workflow.workflow import query_analysis
from sub_agents.research_planner_agent.agent import generate_new_research_plan
from sub_agents.human_feedback_manager.agent import manage_human_feedback
from sub_agents.research_workflow.workflow import run_research_workflow
from domain import ResearchPlan, HumanFeedbackDecision
from jinja2 import Environment

logging.getLogger("strands.multiagent").setLevel(logging.DEBUG)
logging.basicConfig(
    format="%(levelname)s %(asctime)s %(name)s %(message)s",
    level=logging.DEBUG,
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler()]
)
jinja_env = Environment()

async def run_research_planning_phase() -> Optional[ResearchPlan]:
    revision_no = 0
    user_input = input("Enter your query:\n\n")
    while revision_no < 5:
        query_analysis: QueryAnalysis = query_analysis(user_input)
        initial_research_request_prompt = jinja_env.from_string("""
        Here is the raw user query, the results of query type and components analysis:
        <raw_user_query>
        {query}
        </raw_user_query>

        <query_components_analysis>
                                                            
        {query_components_analysis}
                                                            
        </query_components_analysis>
                                                            
        <query_type>
        {query_type}
        </query_type>
        """).render(
            query=user_input, 
            query_components_analysis=query_analysis.query_components_analysis.model_dump_json(), 
            query_type=query_analysis.query_type.model_dump_json()
        )
        research_plan = generate_new_research_plan(initial_research_request_prompt)
        #TODO: a json structure to present the research plan to the frontend. for now just presenting the raw research.

        user_feedback: HumanFeedbackDecision = manage_human_feedback(research_plan=research_plan, query_analysis=query_analysis, user_feedback=None)
        while user_feedback.action != "proceed":
            revision_no += 1
            modify_plan_prompt = """
                Modify the research plan based on user feedback:
                <previous_research_plan>
                {prev_research_plan}
                </previous_research_plan>

                <user_feedback>
                {% if user_feedback.action == 'develop_new' %}
                    New User Query: {new_query}
                {% else if user_feedback.action == 'modify_existing' %}
                    Modified User Query: {modified_query}

                {if user_feedback.modification_option and user_feedback.modification_option.retain}
                    Retain the following:
                    {to_retain}
                {if user_feedback.modification_option and user_feedback.modification_option.change}
                    Change the following:
                    {to_change}
                {if user_feedback.modification_option and user_feedback.modification_option.addition}
                    Include the following:
                    {to_add}
                {if user_feedback.modification_option and user_feedback.modification_option.deletion}
                    Remove the following from plan:
                    {to_delete}
                </user_feedback>    
                
                <query_components_analysis>                                                        
                {query_components_analysis}                         
                </query_components_analysis>
                                                                    
                <query_type>
                {query_type}
                </query_type>
            """
            if (user_feedback.action == "modify_existing" and user_feedback.modification_option == "different_approach") or (user_feedback.action == "develop_new"):
                # go back to query analysis statge
                if user_feedback.action == "develop_new":
                    logging.info("Running query analysis for a changed user query. User feedback inferred -> develop_new")
                    query_analysis: QueryAnalysis = query_analysis(user_feedback.new_query)
                if user_feedback.action == 'modify_existing':
                    logging.info("Running query analysis for a modified user query. User feedback inferred -> modify_existing")
                    query_analysis: QueryAnalysis = query_analysis(user_feedback.modified_query)
            else:
                logging.debug("Decided to modify the existing Optional[str] research plan using the same approach. Reason: {reasoning}")


            research_request_prompt = jinja_env.from_string(modify_plan_prompt).render(
                prev_research_plan=research_plan.model_dump_json(),
                new_query=user_feedback.new_query,
                modified_query=user_feedback.modified_query,
                to_add=user_feedback.modification_option.addition,
                to_change=user_feedback.modification_option.change,
                to_retain=user_feedback.modification_option.retain,
                to_delete=user_feedback.modification_option.deletion,
                query_components_analysis=query_analysis.query_components_analysis.model_dump_json(), 
                query_type=query_analysis.query_type.model_dump_json()
            )
            research_plan = generate_new_research_plan(research_request_prompt)               
        
            user_feedback = manage_human_feedback(research_plan=research_plan, query_analysis=query_analysis, user_feedback=user_feedback)
        
        #broke out of feedback loop
        return research_plan
    #TODO: add logic to exit current session and start research phase
    return None


async def orchestrate_research():
    research_plan = run_research_planning_phase()
    if not research_plan:
        logging.error("Research plan was not produced. Exiting research orchestration process.")
        raise ValueError()
    raw_research_output = run_research_workflow(research_plan)
    logging.info("Saving final research output to db")
    #TODO: store in db
    #TODO: Report writing, storage, scratchpad info.