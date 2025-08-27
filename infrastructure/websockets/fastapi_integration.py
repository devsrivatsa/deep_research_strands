"""
FastAPI WebSocket Integration for Event-Driven Research.

This module provides the FastAPI routes and WebSocket endpoints
that integrate with the event-driven architecture.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langfuse import observe
from infrastructure.websockets.websocket_manager import ResearchWebSocketManager, WebSocketEventBridge
from infrastructure.websockets.websocket_handlers import WebSocketEventHandlers
from infrastructure.events import EventBusFactory
from domain.events.research_events import ResearchSessionStarted
from domain.research import ParallelResearchConfig

logger = logging.getLogger(__name__)


class WebSocketSubscriptionRequest(BaseModel):
    """Request model for WebSocket subscriptions"""
    session_id: str
    user_id: Optional[str] = None
    subscribed_events: Optional[Set[str]] = None


class ResearchStartRequest(BaseModel):
    """Request model for starting research"""
    query: str
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None


class EventDrivenWebSocketAPI:
    """
    FastAPI integration for event-driven WebSocket communication.
    
    This class provides the WebSocket endpoints and HTTP routes
    for real-time research updates driven by domain events.
    """
    
    def __init__(self, app: FastAPI, event_bus):
        self.app = app
        self.event_bus = event_bus
        
        # Initialize WebSocket infrastructure
        self.websocket_manager = ResearchWebSocketManager()
        self.websocket_handlers = WebSocketEventHandlers(self.websocket_manager)
        self.websocket_bridge = WebSocketEventBridge(self.websocket_manager)
        
        # Register WebSocket event handlers with event bus
        self._register_websocket_handlers()
        
        # Setup FastAPI routes
        self._setup_routes()
        
        logger.info("Event-driven WebSocket API initialized")
    
    def _register_websocket_handlers(self):
        """Register WebSocket event handlers with the event bus"""
        # Register the main bridge handler
        self.event_bus.subscribe(self.websocket_bridge)
        
        # Register specialized handlers
        for handler in self.websocket_handlers.get_all_handlers():
            self.event_bus.subscribe(handler)
        
        logger.info("WebSocket event handlers registered with event bus")
    
    def _setup_routes(self):
        """Setup FastAPI routes and WebSocket endpoints"""
        
        @self.app.websocket("/ws/research/{session_id}")
        async def research_websocket(websocket: WebSocket, session_id: str):
            """
            Main WebSocket endpoint for research updates.
            
            This endpoint provides real-time updates for a specific research session,
            driven by domain events rather than direct calls.
            """
            await self._handle_research_websocket(websocket, session_id)
        
        @self.app.post("/api/research/start")
        async def start_research(request: ResearchStartRequest):
            """
            Start a new research session.
            
            This creates a research session and emits the appropriate domain events
            that will trigger WebSocket updates to connected clients.
            """
            return await self._handle_start_research(request)
        
        @self.app.get("/api/websocket/stats")
        async def websocket_stats():
            """Get WebSocket connection statistics"""
            return self.websocket_manager.get_connection_stats()
        
        @self.app.post("/api/websocket/cleanup")
        async def cleanup_connections():
            """Clean up stale WebSocket connections"""
            await self.websocket_manager.cleanup_stale_connections()
            return {"message": "Cleanup completed"}
    
    @observe(name="research_websocket_connection")
    async def _handle_research_websocket(self, websocket: WebSocket, session_id: str):
        """Handle WebSocket connection for research updates"""
        connection = None
        
        try:
            # Connect WebSocket
            connection = await self.websocket_manager.connect(websocket, session_id)
            
            logger.info(f"WebSocket connected for research session: {session_id}")
            
            # Wait for optional subscription preferences
            try:
                # Give client 5 seconds to send subscription preferences
                subscription_data = await asyncio.wait_for(
                    websocket.receive_text(), 
                    timeout=5.0
                )
                
                # Parse subscription preferences
                subscription_request = WebSocketSubscriptionRequest.parse_raw(subscription_data)
                
                # Update connection with preferences
                if subscription_request.subscribed_events:
                    connection.subscribed_events = subscription_request.subscribed_events
                
                if subscription_request.user_id:
                    connection.user_id = subscription_request.user_id
                
                await self.websocket_manager.send_to_connection(connection, {
                    "type": "subscription_updated",
                    "subscribed_events": list(connection.subscribed_events),
                    "message": "Subscription preferences updated"
                })
                
            except asyncio.TimeoutError:
                # No subscription data received, use defaults
                logger.debug(f"No subscription preferences received for {session_id}, using defaults")
            
            # Keep connection alive and handle any incoming messages
            while True:
                try:
                    # Listen for ping/pong or other messages
                    message = await websocket.receive_text()
                    
                    # Handle client messages (ping, subscription updates, etc.)
                    await self._handle_client_message(connection, message)
                    
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.warning(f"Error handling WebSocket message: {e}")
                    break
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for session: {session_id}")
        except Exception as e:
            logger.error(f"WebSocket error for session {session_id}: {e}")
        finally:
            # Clean up connection
            if connection:
                self.websocket_manager.disconnect(websocket)
    
    async def _handle_client_message(self, connection, message_text: str):
        """Handle messages from WebSocket clients"""
        try:
            message = json.loads(message_text)
            message_type = message.get("type")
            
            if message_type == "ping":
                # Respond to ping with pong
                await self.websocket_manager.send_to_connection(connection, {
                    "type": "pong",
                    "timestamp": connection.last_activity.isoformat()
                })
            
            elif message_type == "update_subscription":
                # Update subscription preferences
                new_events = set(message.get("subscribed_events", []))
                connection.subscribed_events = new_events
                
                await self.websocket_manager.send_to_connection(connection, {
                    "type": "subscription_updated",
                    "subscribed_events": list(connection.subscribed_events)
                })
            
            elif message_type == "request_status":
                # Send current connection status
                await self.websocket_manager.send_to_connection(connection, {
                    "type": "status",
                    "session_id": connection.session_id,
                    "connected_at": connection.connected_at.isoformat(),
                    "last_activity": connection.last_activity.isoformat(),
                    "subscribed_events": list(connection.subscribed_events)
                })
            
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received from client: {message_text}")
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
    
    @observe(name="start_research_session")
    async def _handle_start_research(self, request: ResearchStartRequest) -> Dict[str, Any]:
        """Handle research start request by emitting domain event"""
        from uuid import uuid4
        
        # Generate session ID
        session_id = f"session-{uuid4().hex[:8]}"
        
        # Create research session started event
        session_event = ResearchSessionStarted(
            session_id=session_id,
            project_id=request.project_id or f"project-{uuid4().hex[:6]}",
            query=request.query,
            user_id=request.user_id,
            estimated_duration_minutes=request.estimated_duration_minutes,
            correlation_id=f"api-{session_id}"
        )
        
        # Publish the event (this will trigger WebSocket updates)
        await self.event_bus.publish(session_event)
        
        logger.info(f"Started research session via API: {session_id}")
        
        return {
            "session_id": session_id,
            "status": "started",
            "message": "Research session started successfully",
            "websocket_url": f"/ws/research/{session_id}",
            "query": request.query,
            "estimated_duration_minutes": request.estimated_duration_minutes
        }


def create_websocket_app(event_bus) -> FastAPI:
    """
    Create a FastAPI application with WebSocket support.
    
    This function creates a complete FastAPI app with CORS middleware
    and event-driven WebSocket endpoints.
    """
    app = FastAPI(
        title="DeepResearch Event-Driven API",
        description="Event-driven research API with real-time WebSocket updates",
        version="1.0.0"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize WebSocket API
    websocket_api = EventDrivenWebSocketAPI(app, event_bus)
    
    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "service": "deepresearch-websocket-api",
            "websocket_connections": len(websocket_api.websocket_manager.active_sessions)
        }
    
    return app


# Example usage for testing
async def run_websocket_server():
    """Example of how to run the WebSocket server"""
    import uvicorn
    from infrastructure.events import EventBusFactory
    
    # Create event bus
    event_bus = EventBusFactory.create_simple_event_bus()
    await event_bus.start()
    
    # Create FastAPI app
    app = create_websocket_app(event_bus)
    
    # Run server
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
    
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(run_websocket_server())
