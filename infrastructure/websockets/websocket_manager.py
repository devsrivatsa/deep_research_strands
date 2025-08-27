"""
Enhanced WebSocket Manager with Event-Driven Integration.

This module provides WebSocket management that integrates with the domain event system,
allowing real-time updates to be driven by domain events rather than direct calls.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Set, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

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
    ResearchReportGenerated
)

logger = logging.getLogger(__name__)


@dataclass
class WebSocketConnection:
    """Represents a WebSocket connection with subscription preferences"""
    websocket: WebSocket
    session_id: str
    user_id: Optional[str] = None
    subscribed_events: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()


class ResearchWebSocketManager:
    """
    Enhanced WebSocket manager that integrates with domain events.
    
    This manager:
    - Handles multiple WebSocket connections per session
    - Filters events based on subscription preferences
    - Provides automatic reconnection support
    - Tracks connection health and metrics
    """
    
    def __init__(self):
        # Map of session_id -> list of connections
        self.connections: Dict[str, List[WebSocketConnection]] = {}
        
        # Map of websocket -> connection for quick lookup
        self.websocket_to_connection: Dict[WebSocket, WebSocketConnection] = {}
        
        # Connection metrics
        self.total_connections = 0
        self.active_sessions: Set[str] = set()
        
        logger.info("Enhanced ResearchWebSocketManager initialized")
    
    @observe(name="websocket_connect")
    async def connect(
        self, 
        websocket: WebSocket, 
        session_id: str, 
        user_id: Optional[str] = None,
        subscribed_events: Optional[Set[str]] = None
    ) -> WebSocketConnection:
        """Connect a new WebSocket client"""
        await websocket.accept()
        
        # Create connection object
        connection = WebSocketConnection(
            websocket=websocket,
            session_id=session_id,
            user_id=user_id,
            subscribed_events=subscribed_events or {
                "research.session.started",
                "research.session.completed", 
                "research.task.started",
                "research.task.progress",
                "research.task.completed",
                "research.task.failed",
                "research.plan.generated",
                "research.report.generated"
            }
        )
        
        # Add to connections
        if session_id not in self.connections:
            self.connections[session_id] = []
        
        self.connections[session_id].append(connection)
        self.websocket_to_connection[websocket] = connection
        
        # Update metrics
        self.total_connections += 1
        self.active_sessions.add(session_id)
        
        logger.info(f"WebSocket connected: session={session_id}, user={user_id}, total_connections={self.total_connections}")
        
        # Send connection confirmation
        await self.send_to_connection(connection, {
            "type": "connection_established",
            "session_id": session_id,
            "subscribed_events": list(connection.subscribed_events),
            "timestamp": connection.connected_at.isoformat()
        })
        
        return connection
    
    @observe(name="websocket_disconnect")
    def disconnect(self, websocket: WebSocket) -> Optional[WebSocketConnection]:
        """Disconnect a WebSocket client"""
        connection = self.websocket_to_connection.pop(websocket, None)
        
        if connection:
            session_id = connection.session_id
            
            # Remove from session connections
            if session_id in self.connections:
                self.connections[session_id] = [
                    conn for conn in self.connections[session_id] 
                    if conn.websocket != websocket
                ]
                
                # Remove session if no more connections
                if not self.connections[session_id]:
                    del self.connections[session_id]
                    self.active_sessions.discard(session_id)
            
            logger.info(f"WebSocket disconnected: session={session_id}, user={connection.user_id}")
            
        return connection
    
    async def send_to_connection(self, connection: WebSocketConnection, message: Dict[str, Any]):
        """Send a message to a specific connection"""
        try:
            connection.update_activity()
            await connection.websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning(f"Failed to send message to connection {connection.session_id}: {e}")
            # Connection might be dead, will be cleaned up on next operation
    
    async def send_to_session(self, session_id: str, message: Dict[str, Any]):
        """Send a message to all connections for a session"""
        connections = self.connections.get(session_id, [])
        
        if connections:
            tasks = [
                self.send_to_connection(conn, message) 
                for conn in connections
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
        else:
            logger.debug(f"No active connections for session {session_id}")
    
    async def send_event_to_session(self, session_id: str, event: DomainEvent):
        """Send a domain event to session connections (with filtering)"""
        connections = self.connections.get(session_id, [])
        
        # Filter connections that are subscribed to this event type
        interested_connections = [
            conn for conn in connections 
            if event.event_type in conn.subscribed_events
        ]
        
        if interested_connections:
            message = self._event_to_websocket_message(event)
            tasks = [
                self.send_to_connection(conn, message) 
                for conn in interested_connections
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_event(self, event: DomainEvent):
        """Broadcast an event to all interested connections"""
        message = self._event_to_websocket_message(event)
        
        # Get all connections interested in this event type
        all_tasks = []
        for session_connections in self.connections.values():
            for conn in session_connections:
                if event.event_type in conn.subscribed_events:
                    all_tasks.append(self.send_to_connection(conn, message))
        
        if all_tasks:
            await asyncio.gather(*all_tasks, return_exceptions=True)
    
    def _event_to_websocket_message(self, event: DomainEvent) -> Dict[str, Any]:
        """Convert a domain event to a WebSocket message"""
        base_message = {
            "type": "domain_event",
            "event_id": str(event.event_id),
            "event_type": event.event_type,
            "event_name": event.event_name,
            "aggregate_id": event.aggregate_id,
            "timestamp": event.timestamp.isoformat(),
            "version": event.version,
            "data": event.data,
            "metadata": {
                "correlation_id": event.metadata.correlation_id,
                "user_id": event.metadata.user_id,
                "session_id": event.metadata.session_id,
                "source": event.metadata.source,
                "priority": event.metadata.priority.value,
                "tags": event.metadata.tags
            }
        }
        
        # Add event-specific UI information
        if isinstance(event, ResearchSessionStarted):
            base_message.update({
                "ui_type": "session_started",
                "ui_title": "Research Session Started",
                "ui_message": f"Starting research: {event.data.get('query', 'Unknown query')}",
                "ui_progress": 0,
                "ui_status": "starting"
            })
        
        elif isinstance(event, ResearchTaskStarted):
            base_message.update({
                "ui_type": "task_started", 
                "ui_title": "Research Task Started",
                "ui_message": event.data.get('task_description', 'Task started'),
                "ui_progress": 10,
                "ui_status": "in_progress"
            })
        
        elif isinstance(event, ResearchTaskProgress):
            progress_percent = min(100, max(0, event.data.get('progress_percentage', 0)))
            base_message.update({
                "ui_type": "task_progress",
                "ui_title": "Research Progress", 
                "ui_message": event.data.get('progress_message', 'Research in progress...'),
                "ui_progress": progress_percent,
                "ui_status": "in_progress"
            })
        
        elif isinstance(event, ResearchTaskCompleted):
            base_message.update({
                "ui_type": "task_completed",
                "ui_title": "Research Task Completed",
                "ui_message": f"Completed: {event.data.get('task_description', 'Task')}",
                "ui_progress": 100,
                "ui_status": "completed"
            })
        
        elif isinstance(event, ResearchTaskFailed):
            base_message.update({
                "ui_type": "task_failed",
                "ui_title": "Research Task Failed", 
                "ui_message": f"Failed: {event.data.get('error_message', 'Unknown error')}",
                "ui_progress": 0,
                "ui_status": "error"
            })
        
        elif isinstance(event, ResearchSessionCompleted):
            base_message.update({
                "ui_type": "session_completed",
                "ui_title": "Research Session Completed",
                "ui_message": "Research completed successfully",
                "ui_progress": 100,
                "ui_status": "completed"
            })
        
        elif isinstance(event, ResearchPlanGenerated):
            base_message.update({
                "ui_type": "plan_generated",
                "ui_title": "Research Plan Generated",
                "ui_message": f"Generated plan with {event.data.get('total_tasks', 0)} tasks",
                "ui_progress": 5,
                "ui_status": "planning"
            })
        
        elif isinstance(event, ResearchReportGenerated):
            base_message.update({
                "ui_type": "report_generated",
                "ui_title": "Research Report Generated",
                "ui_message": f"Generated report ({event.data.get('report_length', 0)} characters)",
                "ui_progress": 95,
                "ui_status": "reporting"
            })
        
        return base_message
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": self.total_connections,
            "active_sessions": len(self.active_sessions),
            "connections_per_session": {
                session_id: len(connections) 
                for session_id, connections in self.connections.items()
            }
        }
    
    async def cleanup_stale_connections(self, max_idle_minutes: int = 30):
        """Clean up stale connections"""
        from datetime import timedelta
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=max_idle_minutes)
        stale_connections = []
        
        for session_connections in self.connections.values():
            for conn in session_connections:
                if conn.last_activity < cutoff_time:
                    stale_connections.append(conn.websocket)
        
        for websocket in stale_connections:
            self.disconnect(websocket)
        
        if stale_connections:
            logger.info(f"Cleaned up {len(stale_connections)} stale connections")


class WebSocketEventBridge(EventHandler):
    """
    Event handler that bridges domain events to WebSocket clients.
    
    This handler automatically sends relevant domain events to connected
    WebSocket clients, providing real-time updates for the UI.
    """
    
    def __init__(self, websocket_manager: ResearchWebSocketManager):
        self.websocket_manager = websocket_manager
    
    @observe(name="websocket_event_bridge") 
    async def handle(self, event: DomainEvent) -> None:
        """Handle domain events by sending them to WebSocket clients"""
        try:
            # Send to specific session if available
            session_id = event.metadata.session_id
            if session_id:
                await self.websocket_manager.send_event_to_session(session_id, event)
            else:
                # Broadcast to all interested connections
                await self.websocket_manager.broadcast_event(event)
            
            logger.debug(f"Sent event {event.event_name} to WebSocket clients")
            
        except Exception as e:
            logger.error(f"Failed to send event {event.event_name} to WebSocket clients: {e}")
    
    @property
    def event_type(self):
        """This handler processes all domain events"""
        from domain.events.base import DomainEvent
        return DomainEvent
    
    @property
    def priority(self) -> EventPriority:
        """Medium priority for UI updates"""
        return EventPriority.NORMAL
