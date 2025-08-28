import logging
import uuid
from typing import Optional, Dict, Any
from strands.multiagent import GraphBuilder
from .sub_agents.query_analysis_workflow.workflow import query_analysis
from .sub_agents.research_planner_agent.agent import generate_new_research_plan
from .sub_agents.human_feedback_manager.agent import manage_human_feedback
from .sub_agents.research_workflow.workflow import run_research_workflow
from domain import ResearchPlan, HumanFeedbackDecision
from jinja2 import Environment

# Import Phase 3 event integration
from .event_integration import ResearchOrchestratorEventEmitter
from .observability_wrapper import observe_orchestrator_function, performance_tracker, metrics_collector
from domain.events.base import EventBus

logging.getLogger("strands.multiagent").setLevel(logging.DEBUG)
logging.basicConfig(
    format="%(levelname)s %(asctime)s %(name)s %(message)s",
    level=logging.DEBUG,
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler()]
)
jinja_env = Environment()

logger = logging.getLogger(__name__)


@observe_orchestrator_function("run_research_planning_phase")
async def run_research_planning_phase(event_bus: EventBus, session_id: str) -> Optional[ResearchPlan]:
    """
    Run the research planning phase with event emission and observability.
    
    Args:
        event_bus: Event bus for emitting domain events
        session_id: Unique session identifier
        
    Returns:
        ResearchPlan if successful, None otherwise
    """
    # Initialize event emitter and performance tracking
    event_emitter = ResearchOrchestratorEventEmitter(event_bus, session_id)
    performance_tracker.start_phase("planning")
    metrics_collector.start_session_tracking(session_id)
    
    try:
        # Emit planning started event
        await event_emitter.emit_planning_started()
        
        revision_no = 0
        user_input = input("Enter your query:\n\n")
        
        while revision_no < 5:
            # Query analysis phase
            logger.info(f"Starting query analysis for revision {revision_no + 1}")
            query_analysis_result = query_analysis(user_input)
            
            # Emit decision point event for plan generation
            await event_emitter.emit_decision_point(
                decision_type="plan_generation",
                decision_context={"revision": revision_no, "query": user_input},
                decision_options=["generate_new_plan", "modify_existing_plan"],
                selected_option="generate_new_plan",
                reasoning=f"Generating new research plan for revision {revision_no + 1}"
            )
            
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
                query_components_analysis=query_analysis_result.query_components_analysis.model_dump_json(), 
                query_type=query_analysis_result.query_type.model_dump_json()
            )
            
            research_plan = generate_new_research_plan(initial_research_request_prompt)
            
            # Emit decision point for human feedback
            await event_emitter.emit_decision_point(
                decision_type="human_feedback_required",
                decision_context={"revision": revision_no, "plan_generated": True},
                decision_options=["proceed", "modify_existing", "develop_new"],
                selected_option="waiting_for_feedback",
                reasoning="Research plan generated, awaiting human feedback"
            )
            
            user_feedback: HumanFeedbackDecision = manage_human_feedback(
                research_plan=research_plan, 
                query_analysis=query_analysis_result, 
                user_feedback=None
            )
            
            while user_feedback.action != "proceed":
                revision_no += 1
                
                # Emit decision point for plan modification
                await event_emitter.emit_decision_point(
                    decision_type="plan_modification",
                    decision_context={"revision": revision_no, "feedback_action": user_feedback.action},
                    decision_options=["modify_existing", "develop_new", "proceed"],
                    selected_option=user_feedback.action,
                    reasoning=f"User requested {user_feedback.action}, proceeding with modification"
                )
                
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
                    # go back to query analysis stage
                    if user_feedback.action == "develop_new":
                        logger.info("Running query analysis for a changed user query. User feedback inferred -> develop_new")
                        query_analysis_result = query_analysis(user_feedback.new_query)
                    if user_feedback.action == 'modify_existing':
                        logger.info("Running query analysis for a modified user query. User feedback inferred -> modify_existing")
                        query_analysis_result = query_analysis(user_feedback.modified_query)
                else:
                    logger.debug("Decided to modify the existing Optional[str] research plan using the same approach. Reason: {reasoning}")

                research_request_prompt = jinja_env.from_string(modify_plan_prompt).render(
                    prev_research_plan=research_plan.model_dump_json(),
                    new_query=user_feedback.new_query,
                    modified_query=user_feedback.modified_query,
                    to_add=user_feedback.modification_option.addition,
                    to_change=user_feedback.modification_option.change,
                    to_retain=user_feedback.modification_option.retain,
                    to_delete=user_feedback.modification_option.deletion,
                    query_components_analysis=query_analysis_result.query_components_analysis.model_dump_json(), 
                    query_type=query_analysis_result.query_type.model_dump_json()
                )
                research_plan = generate_new_research_plan(research_request_prompt)               
            
                user_feedback = manage_human_feedback(
                    research_plan=research_plan, 
                    query_analysis=query_analysis_result, 
                    user_feedback=user_feedback
                )
        
        # Planning phase completed successfully
        planning_duration = performance_tracker.end_phase("planning")
        await event_emitter.emit_planning_completed(research_plan, planning_duration)
        await event_emitter.emit_planning_agent_completed(planning_duration)
        
        # Record metrics
        metrics_collector.record_phase_metrics(
            session_id, "planning", planning_duration, True
        )
        
        logger.info(f"Research planning phase completed successfully in {planning_duration:.2f}s")
        return research_plan
        
    except Exception as e:
        # Planning phase failed
        planning_duration = performance_tracker.end_phase("planning")
        performance_tracker.record_error("planning")
        
        # Record metrics
        metrics_collector.record_phase_metrics(
            session_id, "planning", planning_duration, False, str(e)
        )
        
        logger.error(f"Research planning phase failed after {planning_duration:.2f}s: {e}")
        raise


@observe_orchestrator_function("orchestrate_research")
async def orchestrate_research(event_bus: EventBus, session_id: Optional[str] = None) -> str:
    """
    Main research orchestration function with event emission and observability.
    
    Args:
        event_bus: Event bus for emitting domain events
        session_id: Optional session ID, will generate one if not provided
        
    Returns:
        Research output as string
    """
    # Generate session ID if not provided
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Initialize event emitter
    event_emitter = ResearchOrchestratorEventEmitter(event_bus, session_id)
    
    try:
        # Start performance tracking
        performance_tracker.start_phase("orchestration")
        
        # Emit session started event
        user_query = "Research orchestration started"  # This would come from user input in real scenario
        await event_emitter.emit_session_started(user_query)
        
        # Run planning phase
        logger.info(f"Starting research planning phase for session {session_id}")
        research_plan = await run_research_planning_phase(event_bus, session_id)
        
        if not research_plan:
            error_msg = "Research plan was not produced. Exiting research orchestration process."
            logger.error(error_msg)
            
            # Emit workflow failed event
            await event_emitter.emit_workflow_failed(error_msg)
            
            # End session tracking
            metrics_collector.end_session_tracking(session_id, False, error_msg)
            
            raise ValueError(error_msg)
        
        # Emit workflow started event
        plan_id = str(uuid.uuid4())  # Generate plan ID
        await event_emitter.emit_workflow_started(plan_id)
        
        # Start workflow execution phase
        performance_tracker.start_phase("workflow_execution")
        logger.info(f"Starting research workflow execution for session {session_id}")
        
        # Execute research workflow
        raw_research_output = run_research_workflow(research_plan)
        
        # Workflow execution completed
        workflow_duration = performance_tracker.end_phase("workflow_execution")
        
        # Emit workflow completed event
        await event_emitter.emit_workflow_completed(
            output=raw_research_output,
            total_tasks=1,  # This would be calculated from actual workflow
            successful_tasks=1,
            failed_tasks=0
        )
        
        # Record workflow metrics
        metrics_collector.record_phase_metrics(
            session_id, "workflow_execution", workflow_duration, True
        )
        
        # Orchestration completed
        orchestration_duration = performance_tracker.end_phase("orchestration")
        
        # Emit session completed event
        await event_emitter.emit_session_completed(raw_research_output)
        
        # End session tracking
        final_metrics = metrics_collector.end_session_tracking(session_id, True, raw_research_output)
        
        logger.info(f"Research orchestration completed successfully in {orchestration_duration:.2f}s")
        logger.info(f"Session {session_id} final metrics: {final_metrics}")
        
        return raw_research_output
        
    except Exception as e:
        # Orchestration failed
        orchestration_duration = performance_tracker.end_phase("orchestration")
        performance_tracker.record_error("orchestration")
        
        error_msg = f"Research orchestration failed: {str(e)}"
        logger.error(f"{error_msg} after {orchestration_duration:.2f}s")
        
        # Emit workflow failed event
        await event_emitter.emit_workflow_failed(error_msg)
        
        # End session tracking
        metrics_collector.end_session_tracking(session_id, False, error_msg)
        
        raise


# Legacy function for backward compatibility
async def run_research_planning_phase_legacy() -> Optional[ResearchPlan]:
    """Legacy function for backward compatibility."""
    logger.warning("Using legacy research planning function without event bus")
    # This would need to be implemented or removed based on requirements
    return None


async def orchestrate_research_legacy():
    """Legacy function for backward compatibility."""
    logger.warning("Using legacy research orchestration function without event bus")
    # This would need to be implemented or removed based on requirements
    pass