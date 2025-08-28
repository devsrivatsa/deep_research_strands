"""
Event integration module for research orchestrator.
Provides event bus injection and event emission capabilities for Phase 3.
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from domain.events import (
    ResearchSessionStarted,
    ResearchSessionCompleted,
    ResearchSessionCancelled,
    ResearchPlanGenerated,
    ResearchWorkflowStarted,
    ResearchWorkflowCompleted,
    ResearchWorkflowFailed,
    AgentExecutionStarted,
    AgentExecutionCompleted,
    AgentExecutionFailed,
    AgentDecisionPoint
)
from domain.events.base import EventBus

logger = logging.getLogger(__name__)


class ResearchOrchestratorEventEmitter:
    """
    Event emitter for research orchestrator operations.
    Handles all event emission for the main research orchestration workflow.
    """
    
    def __init__(self, event_bus: EventBus, session_id: str):
        self.event_bus = event_bus
        self.session_id = session_id
        self.start_time: Optional[datetime] = None
        self.planning_start_time: Optional[datetime] = None
        self.workflow_start_time: Optional[datetime] = None
        
    async def emit_session_started(self, query: str, user_id: Optional[str] = None) -> None:
        """Emit session started event."""
        self.start_time = datetime.now()
        
        event = ResearchSessionStarted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_session_started",
            timestamp=self.start_time,
            version=1,
            session_id=self.session_id,
            query=query,
            user_id=user_id,
            metadata={
                "orchestrator_version": "1.0",
                "event_source": "research_orchestrator"
            }
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted ResearchSessionStarted event for session {self.session_id}")
    
    async def emit_planning_started(self) -> None:
        """Emit planning phase started event."""
        self.planning_start_time = datetime.now()
        
        event = AgentExecutionStarted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="agent_execution_started",
            timestamp=self.planning_start_time,
            version=1,
            session_id=self.session_id,
            agent_id="research_orchestrator",
            agent_type="orchestrator",
            input_data={"phase": "planning"},
            model="gemini-2.5-flash",
            estimated_duration=30.0  # 30 seconds estimated
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted AgentExecutionStarted event for planning phase in session {self.session_id}")
    
    async def emit_planning_completed(self, research_plan: Any, planning_duration: float) -> None:
        """Emit planning phase completed event."""
        if not self.planning_start_time:
            logger.warning("Planning start time not set, cannot calculate duration")
            return
            
        event = ResearchPlanGenerated(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_plan_generated",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            plan=research_plan,
            planning_duration=planning_duration,
            metadata={
                "planning_agent": "research_orchestrator",
                "plan_quality_score": None  # Could be added later
            }
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted ResearchPlanGenerated event for session {self.session_id}")
    
    async def emit_planning_agent_completed(self, planning_duration: float) -> None:
        """Emit planning agent execution completed event."""
        event = AgentExecutionCompleted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="agent_execution_completed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            agent_id="research_orchestrator",
            agent_type="orchestrator",
            output_data={"phase": "planning", "status": "completed"},
            execution_duration=planning_duration,
            token_usage=None,  # Could be added if available
            model="gemini-2.5-flash"
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted AgentExecutionCompleted event for planning phase in session {self.session_id}")
    
    async def emit_workflow_started(self, plan_id: str) -> None:
        """Emit research workflow started event."""
        self.workflow_start_time = datetime.now()
        
        event = ResearchWorkflowStarted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_workflow_started",
            timestamp=self.workflow_start_time,
            version=1,
            session_id=self.session_id,
            plan_id=plan_id,
            workflow_type="research_execution",
            estimated_duration=300.0,  # 5 minutes estimated
            total_expected_tasks=None  # Could be calculated from plan
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted ResearchWorkflowStarted event for session {self.session_id}")
    
    async def emit_workflow_completed(self, output: str, total_tasks: int, 
                                    successful_tasks: int, failed_tasks: int) -> None:
        """Emit research workflow completed event."""
        if not self.workflow_start_time:
            logger.warning("Workflow start time not set, cannot calculate duration")
            return
            
        workflow_duration = (datetime.now() - self.workflow_start_time).total_seconds()
        
        event = ResearchWorkflowCompleted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_workflow_completed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            output=output,
            total_tasks=total_tasks,
            successful_tasks=successful_tasks,
            failed_tasks=failed_tasks,
            total_duration=workflow_duration,
            workflow_type="research_execution"
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted ResearchWorkflowCompleted event for session {self.session_id}")
    
    async def emit_workflow_failed(self, error_message: str, failed_at_task: Optional[str] = None,
                                 partial_results: Optional[str] = None) -> None:
        """Emit research workflow failed event."""
        event = ResearchWorkflowFailed(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_workflow_failed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            error_message=error_message,
            failed_at_task=failed_at_task,
            partial_results=partial_results,
            workflow_type="research_execution"
        )
        
        await self.event_bus.publish(event)
        logger.error(f"Emitted ResearchWorkflowFailed event for session {self.session_id}: {error_message}")
    
    async def emit_session_completed(self, output: str) -> None:
        """Emit session completed event."""
        if not self.start_time:
            logger.warning("Session start time not set, cannot calculate duration")
            return
            
        session_duration = (datetime.now() - self.start_time).total_seconds()
        
        event = ResearchSessionCompleted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_session_completed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            output=output,
            duration=session_duration,
            metadata={
                "completion_status": "success",
                "total_phases": 2,  # planning + execution
                "event_source": "research_orchestrator"
            }
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted ResearchSessionCompleted event for session {self.session_id}")
    
    async def emit_session_cancelled(self, cancellation_reason: str, user_id: Optional[str] = None) -> None:
        """Emit session cancelled event."""
        event = ResearchSessionCancelled(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_session_cancelled",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            cancellation_reason=cancellation_reason,
            user_id=user_id,
            metadata={
                "cancellation_source": "user" if user_id else "system",
                "event_source": "research_orchestrator"
            }
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted ResearchSessionCancelled event for session {self.session_id}")
    
    async def emit_decision_point(self, decision_type: str, decision_context: Dict[str, Any],
                                decision_options: list, selected_option: str, reasoning: str) -> None:
        """Emit agent decision point event."""
        event = AgentDecisionPoint(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="agent_decision_point",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            agent_id="research_orchestrator",
            agent_type="orchestrator",
            decision_type=decision_type,
            decision_context=decision_context,
            decision_options=decision_options,
            selected_option=selected_option,
            reasoning=reasoning
        )
        
        await self.event_bus.publish(event)
        logger.info(f"Emitted AgentDecisionPoint event: {decision_type} -> {selected_option}")
    
    def get_session_duration(self) -> Optional[float]:
        """Get current session duration in seconds."""
        if not self.start_time:
            return None
        return (datetime.now() - self.start_time).total_seconds()
    
    def get_planning_duration(self) -> Optional[float]:
        """Get planning phase duration in seconds."""
        if not self.planning_start_time:
            return None
        return (datetime.now() - self.planning_start_time).total_seconds()
    
    def get_workflow_duration(self) -> Optional[float]:
        """Get workflow execution duration in seconds."""
        if not self.workflow_start_time:
            return None
        return (datetime.now() - self.workflow_start_time).total_seconds()
