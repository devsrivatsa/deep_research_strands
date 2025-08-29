"""
Specialized WebSocket event handlers for different types of UI updates.

This module provides specific handlers for different categories of WebSocket updates,
allowing for fine-grained control over what gets sent to clients.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from langfuse import observe
from domain.events.base import DomainEvent, EventHandler, EventPriority
from domain.events.research_events import (
    ResearchSessionStarted,
    ResearchSessionCompleted,
    ResearchSessionCancelled,
    ResearchTaskStarted,
    ResearchTaskProgress,
    ResearchTaskCompleted,
    ResearchTaskFailed,
    ResearchPlanGenerated,
    ResearchReportGenerated,
    HumanFeedbackRequired,
    HumanFeedbackReceived
)

logger = logging.getLogger(__name__)


class WebSocketEventHandlers:
    """
    Collection of specialized WebSocket event handlers.
    
    These handlers provide specific UI update logic for different
    types of research events.
    """
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
        
        # Create specialized handlers
        self.session_handler = ResearchSessionWebSocketHandler(websocket_manager)
        self.task_handler = ResearchTaskWebSocketHandler(websocket_manager)
        self.progress_handler = ResearchProgressWebSocketHandler(websocket_manager)
        self.planning_handler = ResearchPlanningWebSocketHandler(websocket_manager)
        self.feedback_handler = HumanFeedbackWebSocketHandler(websocket_manager)
    
    def get_all_handlers(self) -> list:
        """Get all WebSocket event handlers for registration"""
        return [
            self.session_handler,
            self.task_handler, 
            self.progress_handler,
            self.planning_handler,
            self.feedback_handler
        ]


class ResearchSessionWebSocketHandler(EventHandler):
    """Handles session-level WebSocket updates"""
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
    
    @observe(name="session_websocket_handler")
    async def handle(self, event: DomainEvent) -> None:
        """Handle session events for WebSocket updates"""
        if isinstance(event, ResearchSessionStarted):
            await self._handle_session_started(event)
        elif isinstance(event, ResearchSessionCompleted):
            await self._handle_session_completed(event)
        elif isinstance(event, ResearchSessionCancelled):
            await self._handle_session_cancelled(event)
    
    async def _handle_session_started(self, event: ResearchSessionStarted):
        """Handle session started event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "session_started",
            "session_id": session_id,
            "query": event.data.get("query"),
            "project_id": event.data.get("project_id"),
            "estimated_duration": event.data.get("estimated_duration_minutes"),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Research Session Started",
                "message": f"Starting research: {event.data.get('query', 'Unknown query')}",
                "status": "started",
                "progress": 0,
                "show_notification": True,
                "notification_type": "info"
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
        logger.info(f"Sent session started notification to WebSocket clients: {session_id}")
    
    async def _handle_session_completed(self, event: ResearchSessionCompleted):
        """Handle session completed event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "session_completed",
            "session_id": session_id,
            "total_tasks": event.data.get("total_tasks"),
            "successful_tasks": event.data.get("successful_tasks"),
            "failed_tasks": event.data.get("failed_tasks"),
            "total_duration": event.data.get("total_duration_seconds"),
            "final_report_length": event.data.get("final_report_length"),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Research Completed",
                "message": f"Research completed successfully with {event.data.get('successful_tasks', 0)} tasks",
                "status": "completed",
                "progress": 100,
                "show_notification": True,
                "notification_type": "success",
                "show_summary": True,
                "summary": {
                    "total_tasks": event.data.get("total_tasks", 0),
                    "duration": f"{event.data.get('total_duration_seconds', 0):.1f}s",
                    "report_length": f"{event.data.get('final_report_length', 0)} characters"
                }
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
        logger.info(f"Sent session completed notification to WebSocket clients: {session_id}")
    
    async def _handle_session_cancelled(self, event: ResearchSessionCancelled):
        """Handle session cancelled event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "session_cancelled",
            "session_id": session_id,
            "reason": event.data.get("reason"),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Research Cancelled",
                "message": f"Research cancelled: {event.data.get('reason', 'Unknown reason')}",
                "status": "cancelled",
                "progress": 0,
                "show_notification": True,
                "notification_type": "warning"
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
        logger.info(f"Sent session cancelled notification to WebSocket clients: {session_id}")
    
    @property
    def event_type(self):
        from domain.events.base import DomainEvent
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH


class ResearchTaskWebSocketHandler(EventHandler):
    """Handles task-level WebSocket updates"""
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
    
    @observe(name="task_websocket_handler")
    async def handle(self, event: DomainEvent) -> None:
        """Handle task events for WebSocket updates"""
        if isinstance(event, ResearchTaskStarted):
            await self._handle_task_started(event)
        elif isinstance(event, ResearchTaskCompleted):
            await self._handle_task_completed(event)
        elif isinstance(event, ResearchTaskFailed):
            await self._handle_task_failed(event)
    
    async def _handle_task_started(self, event: ResearchTaskStarted):
        """Handle task started event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "task_started",
            "session_id": session_id,
            "task_id": event.aggregate_id,
            "task_description": event.data.get("task_description"),
            "estimated_tool_calls": event.data.get("estimated_tool_calls"),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Task Started",
                "message": event.data.get("task_description", "Task started"),
                "status": "in_progress",
                "progress": 20,
                "show_in_timeline": True,
                "timeline_icon": "play",
                "timeline_color": "blue"
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
    
    async def _handle_task_completed(self, event: ResearchTaskCompleted):
        """Handle task completed event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "task_completed",
            "session_id": session_id,
            "task_id": event.aggregate_id,
            "task_description": event.data.get("task_description"),
            "duration": event.data.get("duration_seconds"),
            "tool_calls_used": event.data.get("tool_calls_used"),
            "sources_count": event.data.get("sources_count"),
            "output_length": len(event.data.get("research_output", "")),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Task Completed",
                "message": f"Completed: {event.data.get('task_description', 'Task')}",
                "status": "completed",
                "progress": 100,
                "show_in_timeline": True,
                "timeline_icon": "check",
                "timeline_color": "green",
                "show_metrics": True,
                "metrics": {
                    "duration": f"{event.data.get('duration_seconds', 0):.1f}s",
                    "tool_calls": event.data.get("tool_calls_used", 0),
                    "sources": event.data.get("sources_count", 0)
                }
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
    
    async def _handle_task_failed(self, event: ResearchTaskFailed):
        """Handle task failed event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "task_failed",
            "session_id": session_id,
            "task_id": event.aggregate_id,
            "task_description": event.data.get("task_description"),
            "error_message": event.data.get("error_message"),
            "error_type": event.data.get("error_type"),
            "retry_count": event.data.get("retry_count", 0),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Task Failed",
                "message": f"Failed: {event.data.get('error_message', 'Unknown error')}",
                "status": "error",
                "progress": 0,
                "show_in_timeline": True,
                "timeline_icon": "x",
                "timeline_color": "red",
                "show_notification": True,
                "notification_type": "error",
                "error_details": {
                    "type": event.data.get("error_type"),
                    "message": event.data.get("error_message"),
                    "retry_count": event.data.get("retry_count", 0)
                }
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
    
    @property
    def event_type(self):
        from domain.events.base import DomainEvent
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.NORMAL


class ResearchProgressWebSocketHandler(EventHandler):
    """Handles real-time progress updates"""
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
        self.last_progress_update = {}  # Track to avoid spam
    
    @observe(name="progress_websocket_handler")
    async def handle(self, event: DomainEvent) -> None:
        """Handle progress events for WebSocket updates"""
        if isinstance(event, ResearchTaskProgress):
            await self._handle_task_progress(event)
    
    async def _handle_task_progress(self, event: ResearchTaskProgress):
        """Handle task progress event with throttling"""
        session_id = event.metadata.session_id
        task_id = event.aggregate_id
        
        # Throttle progress updates (only send if significant change)
        progress_key = f"{session_id}:{task_id}"
        current_progress = event.data.get("progress_percentage", 0)
        last_progress = self.last_progress_update.get(progress_key, -1)
        
        # Only send if progress changed by at least 5% or it's been a while
        if abs(current_progress - last_progress) >= 5 or current_progress == 100:
            self.last_progress_update[progress_key] = current_progress
            
            message = {
                "type": "task_progress",
                "session_id": session_id,
                "task_id": task_id,
                "progress_percentage": current_progress,
                "progress_message": event.data.get("progress_message"),
                "current_action": event.data.get("current_action"),
                "tools_used": event.data.get("tools_used", 0),
                "sources_found": event.data.get("sources_found", 0),
                "timestamp": event.timestamp.isoformat(),
                "ui": {
                    "title": "Research Progress",
                    "message": event.data.get("progress_message", "Research in progress..."),
                    "status": "in_progress",
                    "progress": current_progress,
                    "show_progress_bar": True,
                    "progress_details": {
                        "current_action": event.data.get("current_action"),
                        "tools_used": event.data.get("tools_used", 0),
                        "sources_found": event.data.get("sources_found", 0)
                    }
                }
            }
            
            await self.websocket_manager.send_to_session(session_id, message)
    
    @property
    def event_type(self):
        from domain.events.base import DomainEvent
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.LOW  # Progress updates are least critical


class ResearchPlanningWebSocketHandler(EventHandler):
    """Handles planning and reporting phase updates"""
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
    
    @observe(name="planning_websocket_handler")
    async def handle(self, event: DomainEvent) -> None:
        """Handle planning events for WebSocket updates"""
        if isinstance(event, ResearchPlanGenerated):
            await self._handle_plan_generated(event)
        elif isinstance(event, ResearchReportGenerated):
            await self._handle_report_generated(event)
    
    async def _handle_plan_generated(self, event: ResearchPlanGenerated):
        """Handle research plan generated event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "plan_generated",
            "session_id": session_id,
            "total_tasks": event.data.get("total_tasks"),
            "estimated_duration": event.data.get("estimated_duration_minutes"),
            "research_approach": event.data.get("research_approach"),
            "plan_summary": event.data.get("plan_summary"),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Research Plan Generated",
                "message": f"Generated plan with {event.data.get('total_tasks', 0)} tasks",
                "status": "planning",
                "progress": 10,
                "show_notification": True,
                "notification_type": "info",
                "show_plan_preview": True,
                "plan_preview": {
                    "total_tasks": event.data.get("total_tasks", 0),
                    "estimated_duration": event.data.get("estimated_duration_minutes", 0),
                    "approach": event.data.get("research_approach", "Comprehensive")
                }
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
    
    async def _handle_report_generated(self, event: ResearchReportGenerated):
        """Handle research report generated event"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "report_generated",
            "session_id": session_id,
            "report_length": event.data.get("report_length"),
            "sections_count": event.data.get("sections_count"),
            "sources_cited": event.data.get("sources_cited"),
            "quality_score": event.data.get("quality_score"),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Research Report Generated",
                "message": f"Generated report ({event.data.get('report_length', 0)} characters)",
                "status": "reporting",
                "progress": 95,
                "show_notification": True,
                "notification_type": "success",
                "show_report_preview": True,
                "report_preview": {
                    "length": event.data.get("report_length", 0),
                    "sections": event.data.get("sections_count", 0),
                    "sources": event.data.get("sources_cited", 0),
                    "quality": event.data.get("quality_score", 0)
                }
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
    
    @property
    def event_type(self):
        from domain.events.base import DomainEvent
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.NORMAL


class HumanFeedbackWebSocketHandler(EventHandler):
    """Handles human feedback workflow events"""
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
    
    @observe(name="human_feedback_websocket_handler")
    async def handle(self, event: DomainEvent) -> None:
        """Handle human feedback events for WebSocket updates"""
        from domain.events.research_events import HumanFeedbackRequired, HumanFeedbackReceived
        
        if isinstance(event, HumanFeedbackRequired):
            await self._handle_feedback_required(event)
        elif isinstance(event, HumanFeedbackReceived):
            await self._handle_feedback_received(event)
    
    async def _handle_feedback_required(self, event):
        """Handle when human feedback is required"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "human_feedback_required",
            "session_id": session_id,
            "plan_presentation": event.data.get("plan_presentation"),
            "revision_number": event.data.get("revision_number", 0),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Human Feedback Required",
                "message": "Please review the research plan and provide feedback",
                "status": "waiting_for_feedback",
                "progress": 15,
                "show_notification": True,
                "notification_type": "warning",
                "show_feedback_form": True,
                "feedback_form": {
                    "plan_presentation": event.data.get("plan_presentation"),
                    "revision_number": event.data.get("revision_number", 0),
                    "requires_user_input": True
                }
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
        logger.info(f"Sent feedback request to WebSocket clients: {session_id}")
    
    async def _handle_feedback_received(self, event):
        """Handle when human feedback is received"""
        session_id = event.metadata.session_id
        
        message = {
            "type": "human_feedback_received",
            "session_id": session_id,
            "feedback_type": event.data.get("feedback_type"),
            "revision_number": event.data.get("revision_number", 0),
            "timestamp": event.timestamp.isoformat(),
            "ui": {
                "title": "Feedback Received",
                "message": f"Feedback received: {event.data.get('feedback_type')}",
                "status": "processing_feedback",
                "progress": 20,
                "show_notification": True,
                "notification_type": "info",
                "feedback_processed": True
            }
        }
        
        await self.websocket_manager.send_to_session(session_id, message)
        logger.info(f"Sent feedback received notification to WebSocket clients: {session_id}")
    
    @property
    def event_type(self):
        from domain.events.base import DomainEvent
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH  # Human feedback is high priority
