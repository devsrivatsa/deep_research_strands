"""
Enhanced research domain event handlers using Langfuse Python SDK v3.

These handlers leverage Langfuse's native decorators and spans for
enhanced observability and automatic trace correlation.
"""

import logging
from typing import Type, Dict, Any, Optional
from datetime import datetime, timezone
import os

from langfuse import Langfuse, observe
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


class LangfuseResearchProgressTracker(EventHandler):
    """
    Research progress tracker with native Langfuse integration.
    
    This handler creates Langfuse traces and spans for research sessions,
    providing rich observability in the Langfuse UI.
    """
    
    def __init__(self):
        self._session_progress: Dict[str, Dict[str, Any]] = {}
        try:
            # Initialize Langfuse client with proper configuration
            if os.getenv("LANGFUSE_HOST"):
                logger.info(f"Initializing Langfuse client for: {os.getenv('LANGFUSE_HOST')}")
            else:
                logger.info("Initializing Langfuse client for cloud instance")
            
            self._langfuse_client = Langfuse()
            
            # Test the connection
            try:
                test_response = self._langfuse_client.get_project()
                logger.info(f"✅ Langfuse client connected successfully")
            except Exception as e:
                logger.error(f"❌ Failed to connect to Langfuse: {e}")
                self._langfuse_client = None
                
        except Exception as e:
            logger.error(f"Failed to initialize Langfuse client: {e}")
            self._langfuse_client = None
        
    @observe(name="research_event_handler")
    async def handle(self, event: DomainEvent) -> None:
        """Handle research progress events with Langfuse tracing"""
        session_id = event.metadata.session_id
        
        # Update current trace with event context
        if self._langfuse_client:
            self._langfuse_client.update_current_trace(
                name=f"Research {event.event_name}",
                session_id=session_id,
                user_id=event.metadata.user_id,
                metadata={
                    "event_type": event.event_type,
                    "aggregate_id": event.aggregate_id,
                    "correlation_id": event.metadata.correlation_id,
                    "source": event.metadata.source
                }
            )
        
        # Handle specific event types
        match event:
            case ResearchSessionStarted():
                await self._handle_session_started(event)
            case ResearchTaskStarted():
                await self._handle_task_started(event)
            case ResearchTaskCompleted():
                await self._handle_task_completed(event)
            case ResearchTaskFailed():
                await self._handle_task_failed(event)
            case ResearchSessionCompleted():
                await self._handle_session_completed(event)
            case ResearchSessionCancelled():
                await self._handle_session_cancelled(event)
                await self._mark_session_cancelled(event)
    
    @observe(name="session_started")
    async def _handle_session_started(self, event: ResearchSessionStarted) -> None:
        """Initialize progress tracking for a new session with Langfuse trace"""
        session_id = event.metadata.session_id
        
        # Create comprehensive session progress
        self._session_progress[session_id] = {
            "status": "in_progress",
            "started_at": event.timestamp,
            "query": event.data.get("query"),
            "project_id": event.data.get("project_id"),
            "estimated_duration": event.data.get("estimated_duration_minutes"),
            "tasks": {},
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "metrics": {
                "total_tool_calls": 0,
                "total_duration": 0.0,
                "sources_analyzed": 0
            }
        }
        
        # when session is started, we need to update the trace with the session metadata
        if self._langfuse_client:
            self._langfuse_client.update_current_trace(
                name=f"Research Session: {event.data.get('query', 'Unknown Query')[:50]}...",
                session_id=session_id,
                user_id=event.metadata.user_id,
                input=event.data.get("query"),
                metadata={
                    "project_id": event.data.get("project_id"),
                    "estimated_duration_minutes": event.data.get("estimated_duration_minutes"),
                    "research_type": "academic_research"
                },
                tags=["research", "session_start"]
            )
        
        logger.info(f"Started tracking research session {session_id} in Langfuse")
    
    @observe(name="task_started")
    async def _handle_task_started(self, event: ResearchTaskStarted) -> None:
        """Track task start with Langfuse span"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        if session_id in self._session_progress:
            task_info = {
                "status": "running",
                "started_at": event.timestamp,
                "description": event.data.get("task_description"),
                "estimated_tool_calls": event.data.get("estimated_tool_calls"),
                "actual_tool_calls": 0,
                "sources_found": 0
            }
            
            self._session_progress[session_id]["tasks"][task_id] = task_info
            self._session_progress[session_id]["total_tasks"] += 1
            
            # Create Langfuse span for this task
            if self._langfuse_client:
                with self._langfuse_client.start_as_current_span(
                    name=f"Research Task: {event.data.get('task_description', 'Unknown Task')[:30]}...",
                    input=event.data.get("task_description"),
                    metadata={
                        "task_id": task_id,
                        "session_id": session_id,
                        "estimated_tool_calls": event.data.get("estimated_tool_calls")
                    }
                ) as span:
                    span.update(
                        status_message="Task started",
                        level="INFO"
                    )
        
        logger.debug(f"Task {task_id} started in session {session_id}")
    
    @observe(name="task_completed")
    async def _handle_task_completed(self, event: ResearchTaskCompleted) -> None:
        """Track task completion with Langfuse metrics"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        if session_id in self._session_progress:
            if task_id in self._session_progress[session_id]["tasks"]:
                task_data = self._session_progress[session_id]["tasks"][task_id]
                task_data.update({
                    "status": "completed",
                    "completed_at": event.timestamp,
                    "duration_seconds": event.data.get("duration_seconds"),
                    "actual_tool_calls": event.data.get("tool_calls_used"),
                    "sources_found": event.data.get("sources_count"),
                    "output_length": len(event.data.get("research_output", ""))
                })
                
                # Update session metrics
                metrics = self._session_progress[session_id]["metrics"]
                metrics["total_tool_calls"] += event.data.get("tool_calls_used", 0)
                metrics["sources_analyzed"] += event.data.get("sources_count", 0)
            
            self._session_progress[session_id]["completed_tasks"] += 1
            
            # Update Langfuse with completion metrics
            if self._langfuse_client:
                self._langfuse_client.score_current_trace(
                    name="task_success",
                    value=1.0,
                    comment="Task completed successfully"
                )
                
                # Add detailed metrics as events
                self._langfuse_client.event_current_trace(
                    name="task_completed",
                    input={
                        "task_id": task_id,
                        "duration_seconds": event.data.get("duration_seconds"),
                        "tool_calls_used": event.data.get("tool_calls_used"),
                        "sources_count": event.data.get("sources_count")
                    },
                    metadata={
                        "output_length": len(event.data.get("research_output", "")),
                        "efficiency_score": self._calculate_task_efficiency(event)
                    }
                )
        
        logger.debug(f"Task {task_id} completed in session {session_id}")
    
    @observe(name="task_failed")
    async def _handle_task_failed(self, event: ResearchTaskFailed) -> None:
        """Track task failure with Langfuse error handling"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        if session_id in self._session_progress:
            if task_id in self._session_progress[session_id]["tasks"]:
                self._session_progress[session_id]["tasks"][task_id].update({
                    "status": "failed",
                    "failed_at": event.timestamp,
                    "error_message": event.data.get("error_message"),
                    "error_type": event.data.get("error_type"),
                    "duration_seconds": event.data.get("duration_seconds"),
                    "retry_count": event.data.get("retry_count", 0)
                })
            
            self._session_progress[session_id]["failed_tasks"] += 1
            
            # Record failure in Langfuse
            if self._langfuse_client:
                self._langfuse_client.score_current_trace(
                    name="task_failure",
                    value=0.0,
                    comment=f"Task failed: {event.data.get('error_message')}"
                )
                
                self._langfuse_client.event_current_trace(
                    name="task_failed",
                    level="ERROR",
                    input={
                        "task_id": task_id,
                        "error_type": event.data.get("error_type"),
                        "error_message": event.data.get("error_message"),
                        "retry_count": event.data.get("retry_count", 0)
                    }
                )
        
        logger.warning(f"Task {task_id} failed in session {session_id}: {event.data.get('error_message')}")
    
    @observe(name="session_completed")
    async def _handle_session_completed(self, event: ResearchSessionCompleted) -> None:
        """Track session completion with comprehensive Langfuse metrics"""
        session_id = event.metadata.session_id
        
        if session_id in self._session_progress:
            session_data = self._session_progress[session_id]
            session_data.update({
                "status": "completed",
                "completed_at": event.timestamp,
                "total_duration_seconds": event.data.get("total_duration_seconds"),
                "final_report_length": event.data.get("final_report_length"),
                "success_rate": self._calculate_success_rate(session_data)
            })
            
            # Comprehensive Langfuse trace completion
            if self._langfuse_client:
                self._langfuse_client.update_current_trace(
                    output=f"Research completed: {event.data.get('final_report_length', 0)} characters",
                    metadata={
                        "total_tasks": event.data.get("total_tasks"),
                        "successful_tasks": event.data.get("successful_tasks"),
                        "failed_tasks": event.data.get("failed_tasks"),
                        "total_duration_seconds": event.data.get("total_duration_seconds"),
                        "total_tool_calls": event.data.get("total_tool_calls"),
                        "success_rate": session_data["success_rate"],
                        "efficiency_metrics": self._calculate_session_efficiency(event, session_data)
                    },
                    tags=["research", "session_complete", "success"]
                )
                
                # Add performance scores
                self._langfuse_client.score_current_trace(
                    name="research_quality",
                    value=self._calculate_quality_score(event, session_data),
                    comment="Overall research session quality"
                )
                
                self._langfuse_client.score_current_trace(
                    name="efficiency", 
                    value=session_data["success_rate"],
                    comment="Task completion efficiency"
                )
        
        logger.info(f"Research session {session_id} completed successfully")
    
    @observe(name="session_cancelled")
    async def _handle_session_cancelled(self, event: ResearchSessionCancelled) -> None:
        """Track session cancellation in Langfuse"""
        session_id = event.metadata.session_id
        
        if session_id in self._session_progress:
            self._session_progress[session_id].update({
                "status": "cancelled",
                "cancelled_at": event.timestamp,
                "cancellation_reason": event.data.get("reason")
            })
            
            # Record cancellation in Langfuse
            if self._langfuse_client:
                self._langfuse_client.update_current_trace(
                    output="Research session cancelled",
                    metadata={
                        "cancellation_reason": event.data.get("reason"),
                        "partial_completion": True
                    },
                    tags=["research", "session_cancelled"]
                )
                
                self._langfuse_client.score_current_trace(
                    name="completion",
                    value=0.5,  # Partial credit for cancelled sessions
                    comment=f"Session cancelled: {event.data.get('reason')}"
                )
        
        logger.info(f"Research session {session_id} was cancelled: {event.data.get('reason')}")
    
    def _calculate_task_efficiency(self, event: ResearchTaskCompleted) -> float:
        """Calculate task efficiency score based on performance metrics"""
        duration = event.data.get("duration_seconds", 0)
        tool_calls = event.data.get("tool_calls_used", 0)
        sources = event.data.get("sources_count", 0)
        
        # Simple efficiency calculation (can be enhanced)
        if duration > 0 and tool_calls > 0:
            return min(1.0, (sources * 10) / (duration * tool_calls))
        return 0.5
    
    def _calculate_success_rate(self, session_data: Dict[str, Any]) -> float:
        """Calculate session success rate"""
        total = session_data.get("total_tasks", 0)
        completed = session_data.get("completed_tasks", 0)
        return completed / total if total > 0 else 0.0
    
    def _calculate_session_efficiency(self, event: ResearchSessionCompleted, session_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate comprehensive session efficiency metrics"""
        total_duration = event.data.get("total_duration_seconds", 0)
        total_tool_calls = event.data.get("total_tool_calls", 0)
        report_length = event.data.get("final_report_length", 0)
        
        return {
            "time_efficiency": min(1.0, 3600 / max(total_duration, 1)),  # Higher score for faster completion
            "tool_efficiency": min(1.0, report_length / max(total_tool_calls, 1)),  # Output per tool call
            "overall_efficiency": session_data["success_rate"]
        }
    
    def _calculate_quality_score(self, event: ResearchSessionCompleted, session_data: Dict[str, Any]) -> float:
        """Calculate research quality score"""
        report_length = event.data.get("final_report_length", 0)
        sources_analyzed = session_data.get("metrics", {}).get("sources_analyzed", 0)
        success_rate = session_data["success_rate"]
        
        # Quality based on output length, sources, and success rate
        length_score = min(1.0, report_length / 1000)  # Normalize to 1000 chars
        source_score = min(1.0, sources_analyzed / 10)   # Normalize to 10 sources
        
        return (length_score * 0.4 + source_score * 0.3 + success_rate * 0.3)
    
    def get_session_progress(self, session_id: str) -> Dict[str, Any]:
        """Get progress information for a session"""
        return self._session_progress.get(session_id, {})
    
    def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get progress information for all sessions"""
        return self._session_progress.copy()
    
    @property
    def event_type(self) -> Type[DomainEvent]:
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH


@observe(name="research_metrics_collection")
class LangfuseResearchMetricsCollector(EventHandler):
    """
    Enhanced metrics collector with Langfuse integration.
    
    This handler tracks aggregated metrics and creates
    Langfuse datasets for performance analysis.
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
            "quality_scores": [],
            "efficiency_scores": [],
            "last_updated": None
        }
        # In-memory tracking of dataset items for correlation
        self._session_dataset_items: Dict[str, Dict[str, Any]] = {}
        try:
            # Initialize Langfuse client with proper configuration
            if os.getenv("LANGFUSE_HOST"):
                logger.info(f"Initializing Langfuse client for: {os.getenv('LANGFUSE_HOST')}")
            else:
                logger.info("Initializing Langfuse client for cloud instance")
            
            self._langfuse_client = Langfuse()
            
            # Test the connection
            try:
                test_response = self._langfuse_client.get_project()
                logger.info(f"✅ Langfuse client connected successfully")
            except Exception as e:
                logger.error(f"❌ Failed to connect to Langfuse: {e}")
                self._langfuse_client = None
                
        except Exception as e:
            logger.error(f"Failed to initialize Langfuse client: {e}")
            self._langfuse_client = None
    
    @observe(name="collect_metrics")
    async def handle(self, event: DomainEvent) -> None:
        """Collect metrics with Langfuse dataset integration"""
        match event:
            case ResearchSessionStarted():
                self._metrics["total_sessions"] += 1
                await self._create_session_dataset_item(event)
            
            case ResearchSessionCompleted():
                self._metrics["completed_sessions"] += 1
                self._update_session_duration_metric(event.data.get("total_duration_seconds", 0))
                await self._update_session_dataset_item(event)
            
            case ResearchSessionCancelled():
                self._metrics["cancelled_sessions"] += 1
            
            case ResearchTaskStarted():
                self._metrics["total_tasks"] += 1
            
            case ResearchTaskCompleted():
                self._metrics["completed_tasks"] += 1
                self._metrics["total_tool_calls"] += event.data.get("tool_calls_used", 0)
                self._update_task_duration_metric(event.data.get("duration_seconds", 0))
            
            case ResearchTaskFailed():
                self._metrics["failed_tasks"] += 1
                self._metrics["total_tool_calls"] += event.data.get("tool_calls_made", 0)
        
        self._metrics["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        # Periodically send metrics to Langfuse
        if self._metrics["total_sessions"] % 5 == 0:
            await self._send_metrics_to_langfuse()
    
    async def _create_session_dataset_item(self, event: ResearchSessionStarted):
        """Create a dataset item in Langfuse for this research session"""
        if self._langfuse_client:
            try:
                # Create the dataset item in Langfuse backend
                dataset_item = self._langfuse_client.create_dataset_item(
                    dataset_name="research_sessions",
                    input={
                        "query": event.data.get("query"),
                        "project_id": event.data.get("project_id"),
                        "estimated_duration": event.data.get("estimated_duration_minutes")
                    },
                    expected_output=None,  # Will be updated on completion
                    metadata={
                        "session_id": event.metadata.session_id,
                        "user_id": event.metadata.user_id,
                        "started_at": event.timestamp.isoformat()
                    }
                )
                
                # Store reference in memory for later updates
                self._session_dataset_items[event.metadata.session_id] = {
                    "dataset_item_id": dataset_item.id,  # Store the ID for updates
                    "input": event.data.get("query"),
                    "started_at": event.timestamp.isoformat(),
                    "status": "in_progress",
                    "project_id": event.data.get("project_id")
                }
                
                logger.debug(f"Created dataset item for session {event.metadata.session_id}")
                
            except Exception as e:
                logger.error(f"Failed to create dataset item for session {event.metadata.session_id}: {e}")
                # Store basic info even if Langfuse fails
                self._session_dataset_items[event.metadata.session_id] = {
                    "dataset_item_id": None,
                    "input": event.data.get("query"),
                    "started_at": event.timestamp.isoformat(),
                    "status": "in_progress",
                    "project_id": event.data.get("project_id"),
                    "error": str(e)
                }
    
    async def _update_session_dataset_item(self, event: ResearchSessionCompleted):
        """Update the dataset item with completion data"""
        session_id = event.metadata.session_id
        
        if session_id in self._session_dataset_items:
            session_data = self._session_dataset_items[session_id]
            
            # Update in-memory tracking
            session_data["status"] = "completed"
            session_data["completed_at"] = event.timestamp.isoformat()
            session_data["final_metrics"] = {
                "total_tasks": event.data.get("total_tasks", 0),
                "successful_tasks": event.data.get("successful_tasks", 0),
                "failed_tasks": event.data.get("failed_tasks", 0),
                "total_duration_seconds": event.data.get("total_duration_seconds", 0),
                "total_tool_calls": event.data.get("total_tool_calls", 0),
                "success_rate": event.data.get("success_rate", 0.0),
                "final_report_length": event.data.get("final_report_length", 0)
            }
            
            # Update the dataset item in Langfuse backend if we have a valid ID
            if session_data["dataset_item_id"] and self._langfuse_client:
                try:
                    self._langfuse_client.update_dataset_item(
                        id=session_data["dataset_item_id"],
                        expected_output={
                            "final_report": event.data.get("final_report", ""),
                            "total_tasks": event.data.get("total_tasks", 0),
                            "successful_tasks": event.data.get("successful_tasks", 0),
                            "failed_tasks": event.data.get("failed_tasks", 0),
                            "total_duration_seconds": event.data.get("total_duration_seconds", 0),
                            "total_tool_calls": event.data.get("total_tool_calls", 0),
                            "success_rate": event.data.get("success_rate", 0.0)
                        },
                        metadata={
                            "completed_at": event.timestamp.isoformat(),
                            "final_report_length": event.data.get("final_report_length", 0),
                            "session_status": "completed"
                        }
                    )
                    
                    logger.debug(f"Updated dataset item for completed session {session_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to update dataset item for session {session_id}: {e}")
                    session_data["update_error"] = str(e)
            else:
                logger.warning(f"No valid dataset item ID for session {session_id}, skipping update")
            
            # Clean up old completed sessions to prevent memory bloat
            await self._cleanup_old_sessions()
        else:
            logger.warning(f"Session {session_id} not found in dataset tracking, skipping update")
    
    async def _mark_session_cancelled(self, event: ResearchSessionCancelled):
        """Mark a session as cancelled in the dataset tracking"""
        session_id = event.metadata.session_id
        
        if session_id in self._session_dataset_items:
            session_data = self._session_dataset_items[session_id]
            
            # Update in-memory tracking
            session_data["status"] = "cancelled"
            session_data["cancelled_at"] = event.timestamp.isoformat()
            session_data["cancellation_reason"] = event.data.get("reason", "Unknown")
            
            # Update the dataset item in Langfuse backend if we have a valid ID
            if session_data["dataset_item_id"] and self._langfuse_client:
                try:
                    self._langfuse_client.update_dataset_item(
                        id=session_data["dataset_item_id"],
                        expected_output=None,  # No output for cancelled sessions
                        metadata={
                            "cancelled_at": event.timestamp.isoformat(),
                            "cancellation_reason": event.data.get("reason", "Unknown"),
                            "session_status": "cancelled"
                        }
                    )
                    
                    logger.debug(f"Updated dataset item for cancelled session {session_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to update dataset item for cancelled session {session_id}: {e}")
                    session_data["update_error"] = str(e)
        else:
            logger.warning(f"Session {session_id} not found in dataset tracking, cannot mark as cancelled")
    
    async def _cleanup_old_sessions(self):
        """Clean up old completed sessions to prevent memory bloat"""
        try:
            current_time = datetime.now(timezone.utc)
            sessions_to_remove = []
            
            for session_id, session_data in self._session_dataset_items.items():
                if session_data["status"] == "completed":
                    # Remove sessions completed more than 24 hours ago
                    if "completed_at" in session_data:
                        completed_time = datetime.fromisoformat(session_data["completed_at"])
                        if (current_time - completed_time).total_seconds() > 86400:  # 24 hours
                            sessions_to_remove.append(session_id)
                
                # Also remove sessions with errors that are older than 1 hour
                elif "error" in session_data and "started_at" in session_data:
                    started_time = datetime.fromisoformat(session_data["started_at"])
                    if (current_time - started_time).total_seconds() > 3600:  # 1 hour
                        sessions_to_remove.append(session_id)
            
            # Remove old sessions
            for session_id in sessions_to_remove:
                del self._session_dataset_items[session_id]
                logger.debug(f"Cleaned up old session {session_id}")
            
            # If we still have too many sessions, remove oldest ones
            if len(self._session_dataset_items) > 1000:  # Keep max 1000 sessions in memory
                oldest_sessions = sorted(
                    self._session_dataset_items.items(),
                    key=lambda x: x[1].get("started_at", "0")
                )[:500]  # Remove oldest 500
                
                for session_id, _ in oldest_sessions:
                    del self._session_dataset_items[session_id]
                
                logger.info(f"Cleaned up {len(oldest_sessions)} old sessions to maintain memory limit")
                
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}")
    
    def get_dataset_statistics(self) -> Dict[str, Any]:
        """Get statistics about the tracked dataset items"""
        if not self._session_dataset_items:
            return {"total_sessions": 0, "status_breakdown": {}}
        
        status_counts = {}
        for session_data in self._session_dataset_items.values():
            status = session_data.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_sessions": len(self._session_dataset_items),
            "status_breakdown": status_counts,
            "memory_usage_mb": len(str(self._session_dataset_items)) / (1024 * 1024),  # Rough estimate
            "oldest_session": min(
                (data.get("started_at") for data in self._session_dataset_items.values() if data.get("started_at")),
                default=None
            ),
            "newest_session": max(
                (data.get("started_at") for data in self._session_dataset_items.values() if data.get("started_at")),
                default=None
            )
        }
    
    async def _send_metrics_to_langfuse(self):
        """Send aggregated metrics to Langfuse as events"""
        if self._langfuse_client:
            self._langfuse_client.event(
                name="system_metrics_update",
                input=self._metrics,
                metadata={
                    "metric_type": "research_performance",
                    "timestamp": self._metrics["last_updated"]
                }
            )
    
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

    def get_session_details(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific session"""
        if session_id in self._session_dataset_items:
            return self._session_dataset_items[session_id].copy()
        return None
    
    def get_all_session_ids(self) -> list:
        """Get list of all tracked session IDs"""
        return list(self._session_dataset_items.keys())
    
    def get_sessions_by_status(self, status: str) -> list:
        """Get all sessions with a specific status"""
        return [
            session_id for session_id, data in self._session_dataset_items.items()
            if data.get("status") == status
        ]
