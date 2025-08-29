"""
Research domain events.

This module contains all domain events related to the research workflow.
These events represent important business occurrences in the research process.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .base import DomainEvent, EventMetadata


@dataclass(frozen=True)
class ResearchSessionStarted(DomainEvent):
    """
    Event emitted when a new research session is started.
    
    This event marks the beginning of a research workflow for a specific query.
    """
    
    def __init__(
        self,
        session_id: str,
        project_id: str,
        query: str,
        user_id: Optional[str] = None,
        estimated_duration_minutes: Optional[int] = None,
        correlation_id: Optional[str] = None
    ):
        data = {
            "query": query,
            "project_id": project_id,
            "estimated_duration_minutes": estimated_duration_minutes
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            user_id=user_id,
            session_id=session_id,
            source="research_orchestrator"
        )
        
        super().__init__(
            aggregate_id=session_id,
            event_type="research.session.started",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchPlanGenerated(DomainEvent):
    """
    Event emitted when a research plan is generated for a session.
    
    This event contains the structured plan that will guide the research execution.
    """
    
    def __init__(
        self,
        session_id: str,
        plan_type: str,  # "straightforward", "depth_first", "breadth_first"
        plan_data: Dict[str, Any],
        query_analysis: Dict[str, Any],
        revision_number: int = 0,
        correlation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        data = {
            "plan_type": plan_type,
            "plan_data": plan_data,
            "query_analysis": query_analysis,
            "revision_number": revision_number
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            user_id=user_id,
            session_id=session_id,
            source="research_planner"
        )
        
        super().__init__(
            aggregate_id=session_id,
            event_type="research.plan.generated",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchTaskStarted(DomainEvent):
    """
    Event emitted when a research task begins execution.
    
    This event marks the start of an individual research task within a session.
    """
    
    def __init__(
        self,
        task_id: str,
        session_id: str,
        task_description: str,
        task_type: str = "research_task",
        estimated_tool_calls: Optional[int] = None,
        correlation_id: Optional[str] = None
    ):
        data = {
            "task_description": task_description,
            "task_type": task_type,
            "estimated_tool_calls": estimated_tool_calls,
            "started_at": datetime.now(timezone.utc).isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_worker"
        )
        
        super().__init__(
            aggregate_id=task_id,
            event_type="research.task.started",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchTaskProgress(DomainEvent):
    """
    Event emitted during research task execution to indicate progress.
    
    This event provides real-time updates on task progress.
    """
    
    def __init__(
        self,
        task_id: str,
        session_id: str,
        progress_percentage: float,
        stage: str,
        message: str,
        tool_calls_made: int = 0,
        correlation_id: Optional[str] = None
    ):
        data = {
            "progress_percentage": progress_percentage,
            "stage": stage,
            "message": message,
            "tool_calls_made": tool_calls_made,
            "progress_at": datetime.now(timezone.utc).isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_worker"
        )
        
        super().__init__(
            aggregate_id=task_id,
            event_type="research.task.progress",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchTaskCompleted(DomainEvent):
    """
    Event emitted when a research task completes successfully.
    
    This event contains the results and metadata from the completed task.
    """
    
    def __init__(
        self,
        task_id: str,
        session_id: str,
        task_description: str,
        research_output: str,
        duration_seconds: float,
        tool_calls_used: int,
        sources_count: int,
        research_verdict: str = "research_complete",
        correlation_id: Optional[str] = None
    ):
        data = {
            "task_description": task_description,
            "research_output": research_output,
            "duration_seconds": duration_seconds,
            "tool_calls_used": tool_calls_used,
            "sources_count": sources_count,
            "research_verdict": research_verdict,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_worker"
        )
        
        super().__init__(
            aggregate_id=task_id,
            event_type="research.task.completed",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchTaskFailed(DomainEvent):
    """
    Event emitted when a research task fails to complete.
    
    This event contains error information and context for debugging.
    """
    
    def __init__(
        self,
        task_id: str,
        session_id: str,
        task_description: str,
        error_message: str,
        error_type: str,
        duration_seconds: float,
        tool_calls_made: int = 0,
        retry_count: int = 0,
        correlation_id: Optional[str] = None
    ):
        data = {
            "task_description": task_description,
            "error_message": error_message,
            "error_type": error_type,
            "duration_seconds": duration_seconds,
            "tool_calls_made": tool_calls_made,
            "retry_count": retry_count,
            "failed_at": datetime.utcnow().isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_worker",
            tags={"error": "true", "retry_count": str(retry_count)}
        )
        
        super().__init__(
            aggregate_id=task_id,
            event_type="research.task.failed",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchJobCompleted(DomainEvent):
    """
    Event emitted when a research job (collection of related tasks) completes.
    
    This event aggregates the results from multiple tasks in a job.
    """
    
    def __init__(
        self,
        job_id: str,
        session_id: str,
        completed_tasks: List[str],
        failed_tasks: List[str],
        total_duration_seconds: float,
        total_tool_calls: int,
        correlation_id: Optional[str] = None
    ):
        data = {
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks,
            "total_tasks": len(completed_tasks) + len(failed_tasks),
            "success_rate": len(completed_tasks) / (len(completed_tasks) + len(failed_tasks)) if (completed_tasks or failed_tasks) else 0.0,
            "total_duration_seconds": total_duration_seconds,
            "total_tool_calls": total_tool_calls,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_conductor"
        )
        
        super().__init__(
            aggregate_id=job_id,
            event_type="research.job.completed",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchSessionCompleted(DomainEvent):
    """
    Event emitted when a research session completes successfully.
    
    This event marks the end of the research workflow with final results.
    """
    
    def __init__(
        self,
        session_id: str,
        project_id: str,
        query: str,
        total_tasks: int,
        successful_tasks: int,
        failed_tasks: int,
        total_duration_seconds: float,
        total_tool_calls: int,
        final_report_length: int,
        correlation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        data = {
            "query": query,
            "project_id": project_id,
            "total_tasks": total_tasks,
            "successful_tasks": successful_tasks,
            "failed_tasks": failed_tasks,
            "success_rate": successful_tasks / total_tasks if total_tasks > 0 else 0.0,
            "total_duration_seconds": total_duration_seconds,
            "total_tool_calls": total_tool_calls,
            "final_report_length": final_report_length,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            user_id=user_id,
            session_id=session_id,
            source="research_orchestrator"
        )
        
        super().__init__(
            aggregate_id=session_id,
            event_type="research.session.completed",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchSessionCancelled(DomainEvent):
    """
    Event emitted when a research session is cancelled by the user.
    
    This event indicates that the research was stopped before completion.
    """
    
    def __init__(
        self,
        session_id: str,
        project_id: str,
        reason: str,
        completed_tasks: int,
        partial_duration_seconds: float,
        correlation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        data = {
            "project_id": project_id,
            "reason": reason,
            "completed_tasks": completed_tasks,
            "partial_duration_seconds": partial_duration_seconds,
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            user_id=user_id,
            session_id=session_id,
            source="research_orchestrator"
        )
        
        super().__init__(
            aggregate_id=session_id,
            event_type="research.session.cancelled",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class HumanFeedbackReceived(DomainEvent):
    """
    Event emitted when human feedback is received for a research plan.
    
    This event captures user input during the research planning phase.
    """
    
    def __init__(
        self,
        session_id: str,
        feedback_type: str,  # "proceed", "modify_existing", "develop_new"
        feedback_data: Dict[str, Any],
        revision_number: int,
        correlation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        data = {
            "feedback_type": feedback_type,
            "feedback_data": feedback_data,
            "revision_number": revision_number,
            "received_at": datetime.utcnow().isoformat()
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            user_id=user_id,
            session_id=session_id,
            source="human_feedback_manager"
        )
        
        super().__init__(
            aggregate_id=session_id,
            event_type="research.feedback.received",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class HumanFeedbackRequired(DomainEvent):
    """
    Event emitted when human feedback is required for a research plan.
    
    This event indicates that the system is waiting for user input
    on a generated research plan before proceeding.
    """
    
    def __init__(
        self,
        session_id: str,
        plan_presentation: str,  # Human-readable plan from plan_presenter
        research_plan: Any,      # Original structured research plan
        query_analysis: Dict[str, Any],  # Query analysis context
        revision_number: int = 0,
        correlation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        data = {
            "plan_presentation": plan_presentation,
            "research_plan": research_plan,
            "query_analysis": query_analysis,
            "revision_number": revision_number,
            "requires_feedback": True,
            "feedback_deadline": None  # Could be added later for timeouts
        }
        
        metadata = EventMetadata(
            correlation_id=correlation_id,
            user_id=user_id,
            session_id=session_id,
            source="research_orchestrator"
        )
        
        super().__init__(
            aggregate_id=session_id,
            event_type="human.feedback.required",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchTaskProgress(DomainEvent):
    """
    Event emitted during research task execution to show progress.
    This event provides real-time updates on task completion.
    """

    def __init__(
        self,
        task_id: str,
        session_id: str,
        progress_percentage: int,
        progress_message: str,
        current_action: Optional[str] = None,
        tools_used: Optional[int] = None,
        sources_found: Optional[int] = None,
        correlation_id: Optional[str] = None
    ):
        data = {
            "progress_percentage": progress_percentage,
            "progress_message": progress_message,
            "current_action": current_action,
            "tools_used": tools_used,
            "sources_found": sources_found
        }

        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_worker"
        )

        super().__init__(
            aggregate_id=task_id,
            event_type="research.task.progress",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchPlanGenerated(DomainEvent):
    """
    Event emitted when a research plan is generated.
    This event marks the planning phase completion.
    """

    def __init__(
        self,
        session_id: str,
        plan_data: Dict[str, Any],
        correlation_id: Optional[str] = None
    ):
        data = {
            "total_tasks": plan_data.get("total_tasks"),
            "estimated_duration_minutes": plan_data.get("estimated_duration_minutes"),
            "research_approach": plan_data.get("research_approach"),
            "plan_summary": plan_data.get("plan_summary")
        }

        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_planner"
        )

        super().__init__(
            aggregate_id=session_id,
            event_type="research.plan.generated",
            data=data,
            metadata=metadata
        )


@dataclass(frozen=True)
class ResearchReportGenerated(DomainEvent):
    """
    Event emitted when a research report is generated.
    This event marks the final output generation phase of research.
    """

    def __init__(
        self,
        session_id: str,
        report_data: Dict[str, Any],
        correlation_id: Optional[str] = None
    ):
        data = {
            "report_length": report_data.get("report_length"),
            "sections_count": report_data.get("sections_count"),
            "sources_cited": report_data.get("sources_cited"),
            "quality_score": report_data.get("quality_score")
        }

        metadata = EventMetadata(
            correlation_id=correlation_id,
            session_id=session_id,
            source="research_orchestrator"
        )

        super().__init__(
            aggregate_id=session_id,
            event_type="research.report.generated",
            data=data,
            metadata=metadata
        )
