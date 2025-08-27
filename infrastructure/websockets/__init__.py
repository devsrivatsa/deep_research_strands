"""
WebSocket infrastructure for real-time communication.

This package provides WebSocket management and event-driven
real-time updates to connected clients.
"""

from .websocket_manager import ResearchWebSocketManager, WebSocketEventBridge
from .websocket_handlers import WebSocketEventHandlers

__all__ = [
    "ResearchWebSocketManager",
    "WebSocketEventBridge", 
    "WebSocketEventHandlers"
]
