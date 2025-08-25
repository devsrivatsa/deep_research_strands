"""
Research domain event handlers.

This module contains handlers for research-related domain events.
These handlers implement business logic side effects.
"""

import logging
from typing import Type, Dict, Any
from datetime import datetime

from ..base import DomainEvent, EventHandler, EventPriority
from ..research_events import (
    ResearchSessionStarted,
    ResearchTaskStarted,
    ResearchTaskCompleted,
    ResearchTaskFailed,
    ResearchSessionCompleted,
    ResearchSessionCancelled
)

logger = logging.getLogger(__name__)


class ResearchProgressTracker(EventHandler):
    """
    Tracks research progress across sessions and tasks.
    
    This handler maintains progress state and calculates metrics
    for research sessions.
    """
    
    def __init__(self):
        self._session_progress: Dict[str, Dict[str, Any]] = {}
    
    async def handle(self, event: DomainEvent) -> None:
        """Handle research progress events"""
        session_id = event.metadata.session_id
        
        # Handle events even without session_id for some events
        if isinstance(event, ResearchSessionStarted):
            await self._handle_session_started(event)
        elif isinstance(event, ResearchTaskStarted):
            await self._handle_task_started(event)
        elif isinstance(event, ResearchTaskCompleted):
            await self._handle_task_completed(event)
        elif isinstance(event, ResearchTaskFailed):
            await self._handle_task_failed(event)
        elif isinstance(event, ResearchSessionCompleted):
            await self._handle_session_completed(event)
        elif isinstance(event, ResearchSessionCancelled):
            await self._handle_session_cancelled(event)
    
    async def _handle_session_started(self, event: ResearchSessionStarted) -> None:
        """Initialize progress tracking for a new session"""
        session_id = event.metadata.session_id
        self._session_progress[session_id] = {
            "status": "in_progress",
            "started_at": event.timestamp,
            "query": event.data.get("query"),
            "project_id": event.data.get("project_id"),
            "tasks": {},
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0
        }
        
        logger.info(f"Started tracking progress for session {session_id}")
    
    async def _handle_task_started(self, event: ResearchTaskStarted) -> None:
        """Track task start"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        if session_id in self._session_progress:
            self._session_progress[session_id]["tasks"][task_id] = {
                "status": "running",
                "started_at": event.timestamp,
                "description": event.data.get("task_description"),
                "estimated_tool_calls": event.data.get("estimated_tool_calls")
            }
            self._session_progress[session_id]["total_tasks"] += 1
        
        logger.debug(f"Task {task_id} started in session {session_id}")
    
    async def _handle_task_completed(self, event: ResearchTaskCompleted) -> None:
        """Track task completion"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        if session_id in self._session_progress:
            if task_id in self._session_progress[session_id]["tasks"]:
                self._session_progress[session_id]["tasks"][task_id].update({
                    "status": "completed",
                    "completed_at": event.timestamp,
                    "duration_seconds": event.data.get("duration_seconds"),
                    "tool_calls_used": event.data.get("tool_calls_used"),
                    "sources_count": event.data.get("sources_count")
                })
            
            self._session_progress[session_id]["completed_tasks"] += 1
        
        logger.debug(f"Task {task_id} completed in session {session_id}")
    
    async def _handle_task_failed(self, event: ResearchTaskFailed) -> None:
        """Track task failure"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        if session_id in self._session_progress:
            if task_id in self._session_progress[session_id]["tasks"]:
                self._session_progress[session_id]["tasks"][task_id].update({
                    "status": "failed",
                    "failed_at": event.timestamp,
                    "error_message": event.data.get("error_message"),
                    "error_type": event.data.get("error_type"),
                    "duration_seconds": event.data.get("duration_seconds")
                })
            
            self._session_progress[session_id]["failed_tasks"] += 1
        
        logger.warning(f"Task {task_id} failed in session {session_id}: {event.data.get('error_message')}")
    
    async def _handle_session_completed(self, event: ResearchSessionCompleted) -> None:
        """Track session completion"""
        session_id = event.metadata.session_id
        
        if session_id in self._session_progress:
            self._session_progress[session_id].update({
                "status": "completed",
                "completed_at": event.timestamp,
                "total_duration_seconds": event.data.get("total_duration_seconds"),
                "final_report_length": event.data.get("final_report_length")
            })
        
        logger.info(f"Session {session_id} completed successfully")
    
    async def _handle_session_cancelled(self, event: ResearchSessionCancelled) -> None:
        """Track session cancellation"""
        session_id = event.metadata.session_id
        
        if session_id in self._session_progress:
            self._session_progress[session_id].update({
                "status": "cancelled",
                "cancelled_at": event.timestamp,
                "cancellation_reason": event.data.get("reason")
            })
        
        logger.info(f"Session {session_id} was cancelled: {event.data.get('reason')}")
    
    def get_session_progress(self, session_id: str) -> Dict[str, Any]:
        """Get progress information for a session"""
        return self._session_progress.get(session_id, {})
    
    def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get progress information for all sessions"""
        return self._session_progress.copy()
    
    @property
    def event_type(self) -> Type[DomainEvent]:
        # This handler processes multiple event types
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH


class ResearchMetricsCollector(EventHandler):
    """
    Collects metrics and analytics from research events.
    
    This handler aggregates metrics for performance monitoring
    and research workflow optimization.
    """
    
    def __init__(self):
        self._metrics: Dict[str, Any] = {
            "total_sessions": 0,
            "completed_sessions": 0,
            "cancelled_sessions": 0,
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "total_tool_calls": 0,
            "average_session_duration": 0.0,
            "average_task_duration": 0.0,
            "last_updated": None
        }
    
    async def handle(self, event: DomainEvent) -> None:
        """Handle events for metrics collection"""
        if isinstance(event, ResearchSessionStarted):
            self._metrics["total_sessions"] += 1
        elif isinstance(event, ResearchSessionCompleted):
            self._metrics["completed_sessions"] += 1
            self._update_session_duration_metric(event.data.get("total_duration_seconds", 0))
        elif isinstance(event, ResearchSessionCancelled):
            self._metrics["cancelled_sessions"] += 1
        elif isinstance(event, ResearchTaskStarted):
            self._metrics["total_tasks"] += 1
        elif isinstance(event, ResearchTaskCompleted):
            self._metrics["completed_tasks"] += 1
            self._metrics["total_tool_calls"] += event.data.get("tool_calls_used", 0)
            self._update_task_duration_metric(event.data.get("duration_seconds", 0))
        elif isinstance(event, ResearchTaskFailed):
            self._metrics["failed_tasks"] += 1
            self._metrics["total_tool_calls"] += event.data.get("tool_calls_made", 0)
        
        self._metrics["last_updated"] = datetime.utcnow().isoformat()
        
        # Log significant metrics periodically
        if self._metrics["total_sessions"] % 10 == 0:
            logger.info(f"Metrics update: {self._metrics}")
    
    def _update_session_duration_metric(self, duration: float) -> None:
        """Update average session duration"""
        completed = self._metrics["completed_sessions"]
        if completed > 1:
            current_avg = self._metrics["average_session_duration"]
            self._metrics["average_session_duration"] = ((current_avg * (completed - 1)) + duration) / completed
        else:
            self._metrics["average_session_duration"] = duration
    
    def _update_task_duration_metric(self, duration: float) -> None:
        """Update average task duration"""
        completed = self._metrics["completed_tasks"]
        if completed > 1:
            current_avg = self._metrics["average_task_duration"]
            self._metrics["average_task_duration"] = ((current_avg * (completed - 1)) + duration) / completed
        else:
            self._metrics["average_task_duration"] = duration
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        return self._metrics.copy()
    
    @property
    def event_type(self) -> Type[DomainEvent]:
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.NORMAL


class ResearchAuditLogger(EventHandler):
    """
    Logs all research events for audit and debugging purposes.
    
    This handler provides a comprehensive audit trail of all
    research activities.
    """
    
    def __init__(self):
        # In a production system, this would write to a persistent audit log
        self._audit_log = []
    
    async def handle(self, event: DomainEvent) -> None:
        """Log event to audit trail"""
        audit_entry = {
            "timestamp": event.timestamp.isoformat(),
            "event_id": str(event.event_id),
            "event_type": event.event_type,
            "event_name": event.event_name,
            "aggregate_id": event.aggregate_id,
            "session_id": event.metadata.session_id,
            "user_id": event.metadata.user_id,
            "correlation_id": event.metadata.correlation_id,
            "source": event.metadata.source,
            "data": event.data
        }
        
        self._audit_log.append(audit_entry)
        
        # Log to standard logging as well
        logger.info(
            f"[AUDIT] {event.event_name} | Session: {event.metadata.session_id} | "
            f"Aggregate: {event.aggregate_id} | User: {event.metadata.user_id}"
        )
        
        # In production, you'd also persist this to a database or external audit system
        # await self._persist_audit_entry(audit_entry)
    
    def get_audit_log(self, limit: int = 100) -> list:
        """Get recent audit log entries"""
        return self._audit_log[-limit:] if limit else self._audit_log
    
    def get_session_audit_log(self, session_id: str) -> list:
        """Get audit log entries for a specific session"""
        return [entry for entry in self._audit_log if entry.get("session_id") == session_id]
    
    @property
    def event_type(self) -> Type[DomainEvent]:
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.LOW  # Audit logging has lowest priority
