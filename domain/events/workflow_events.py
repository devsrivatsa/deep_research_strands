"""
Workflow domain events for research workflow management.
These events track the execution flow of research workflows and task plans.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime
from .base import DomainEvent


@dataclass(frozen=True)
class ResearchWorkflowStarted(DomainEvent):
    """Emitted when a research workflow begins execution."""
    
    def __init__(self, session_id: str, plan_id: str, workflow_type: str = "research_execution", 
                 estimated_duration: Optional[float] = None, total_expected_tasks: Optional[int] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_workflow_started",
            data={
                "session_id": session_id,
                "plan_id": plan_id,
                "workflow_type": workflow_type,
                "estimated_duration": estimated_duration,
                "total_expected_tasks": total_expected_tasks
            }
        )


@dataclass(frozen=True)
class ResearchWorkflowCompleted(DomainEvent):
    """Emitted when a research workflow completes successfully."""
    
    def __init__(self, session_id: str, output: str, total_tasks: int, successful_tasks: int, 
                 failed_tasks: int, total_duration: float, workflow_type: str = "research_execution"):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_workflow_completed",
            data={
                "session_id": session_id,
                "output": output,
                "total_tasks": total_tasks,
                "successful_tasks": successful_tasks,
                "failed_tasks": failed_tasks,
                "total_duration": total_duration,
                "workflow_type": workflow_type
            }
        )


@dataclass(frozen=True)
class ResearchWorkflowFailed(DomainEvent):
    """Emitted when a research workflow fails."""
    
    def __init__(self, session_id: str, error_message: str, failed_at_task: Optional[str] = None,
                 partial_results: Optional[str] = None, workflow_type: str = "research_execution"):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_workflow_failed",
            data={
                "session_id": session_id,
                "error_message": error_message,
                "failed_at_task": failed_at_task,
                "partial_results": partial_results,
                "workflow_type": workflow_type
            }
        )


@dataclass(frozen=True)
class ResearchTaskPlanGenerated(DomainEvent):
    """Emitted when a detailed task plan is created from a research plan."""
    
    def __init__(self, session_id: str, plan_id: str, task_plan: Dict[str, Any], total_tasks: int,
                 estimated_duration: Optional[float] = None, dependencies: Optional[Dict[str, list]] = None,
                 parallel_groups: Optional[list] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_task_plan_generated",
            data={
                "session_id": session_id,
                "plan_id": plan_id,
                "task_plan": task_plan,
                "total_tasks": total_tasks,
                "estimated_duration": estimated_duration,
                "dependencies": dependencies,
                "parallel_groups": parallel_groups
            }
        )


@dataclass(frozen=True)
class ResearchTaskDependencyResolved(DomainEvent):
    """Emitted when a task dependency is resolved and the task can proceed."""
    
    def __init__(self, session_id: str, task_id: str, dependency_id: str, resolution_type: str,
                 dependency_result: Optional[str] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_task_dependency_resolved",
            data={
                "session_id": session_id,
                "task_id": task_id,
                "dependency_id": dependency_id,
                "resolution_type": resolution_type,
                "dependency_result": dependency_result
            }
        )


@dataclass(frozen=True)
class ResearchTaskGroupStarted(DomainEvent):
    """Emitted when a group of parallel tasks begins execution."""
    
    def __init__(self, session_id: str, group_id: str, task_ids: list[str], group_type: str,
                 estimated_duration: Optional[float] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_task_group_started",
            data={
                "session_id": session_id,
                "group_id": group_id,
                "task_ids": task_ids,
                "group_type": group_type,
                "estimated_duration": estimated_duration
            }
        )


@dataclass(frozen=True)
class ResearchTaskGroupCompleted(DomainEvent):
    """Emitted when a group of parallel tasks completes."""
    
    def __init__(self, session_id: str, group_id: str, completed_tasks: int, failed_tasks: int,
                 total_duration: float, group_results: Dict[str, str]):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_task_group_completed",
            data={
                "session_id": session_id,
                "group_id": group_id,
                "completed_tasks": completed_tasks,
                "failed_tasks": failed_tasks,
                "total_duration": total_duration,
                "group_results": group_results
            }
        )


@dataclass(frozen=True)
class ResearchWorkflowPaused(DomainEvent):
    """Emitted when a research workflow is paused (e.g., waiting for human feedback)."""
    
    def __init__(self, session_id: str, pause_reason: str, paused_at_task: Optional[str] = None,
                 resume_conditions: Optional[list] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_workflow_paused",
            data={
                "session_id": session_id,
                "pause_reason": pause_reason,
                "paused_at_task": paused_at_task,
                "resume_conditions": resume_conditions
            }
        )


@dataclass(frozen=True)
class ResearchWorkflowResumed(DomainEvent):
    """Emitted when a paused research workflow resumes."""
    
    def __init__(self, session_id: str, resume_reason: str, paused_duration: float,
                 resumed_from_task: Optional[str] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_workflow_resumed",
            data={
                "session_id": session_id,
                "resume_reason": resume_reason,
                "paused_duration": paused_duration,
                "resumed_from_task": resumed_from_task
            }
        )


@dataclass(frozen=True)
class ResearchWorkflowCancelled(DomainEvent):
    """Emitted when a research workflow is cancelled by the user or system."""
    
    def __init__(self, session_id: str, cancellation_reason: str, cancelled_at_task: Optional[str] = None,
                 partial_results: Optional[str] = None, user_id: Optional[str] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="research_workflow_cancelled",
            data={
                "session_id": session_id,
                "cancellation_reason": cancellation_reason,
                "cancelled_at_task": cancelled_at_task,
                "partial_results": partial_results,
                "user_id": user_id
            }
        )
