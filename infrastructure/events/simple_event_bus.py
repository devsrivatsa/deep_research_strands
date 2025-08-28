"""
Simplified Event Bus that works with Langfuse SDK v3.

This event bus focuses on domain event publishing and handling,
while letting Langfuse SDK handle the observability automatically
through decorators and native integration.
"""

import logging
import asyncio
from typing import List, Dict, Type, Optional

from domain.events.base import DomainEvent, EventHandler

logger = logging.getLogger(__name__)


class SimpleEventBus:
    """
    Simplified event bus that focuses on event handling.
    
    Observability is handled by Langfuse SDK v3 through:
    - @observe decorators on event handlers
    - Automatic trace correlation
    - Native span creation and management
    """
    
    def __init__(self):
        self._handlers: Dict[Type[DomainEvent], List[EventHandler]] = {}
        self._running = False
        logger.info("SimpleEventBus initialized")
    
    async def publish(self, event: DomainEvent) -> None:
        """Publish an event to all registered handlers"""
        if not self._running:
            raise RuntimeError("Event bus is not running")
        
        # Get applicable handlers
        event_type = type(event)
        specific_handlers = self._handlers.get(event_type, [])
        base_handlers = self._handlers.get(DomainEvent, [])
        all_handlers = specific_handlers + base_handlers
        
        if all_handlers:
            # Sort handlers by priority
            sorted_handlers = sorted(all_handlers, key=lambda h: h.priority.value, reverse=True)
            
            # Execute handlers concurrently
            # Note: Each handler decorated with @observe will automatically create spans
            tasks = [handler.handle(event) for handler in sorted_handlers]
            await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.debug(f"Published event: {event.event_name}")
    
    async def publish_many(self, events: List[DomainEvent]) -> None:
        """Publish multiple events"""
        for event in events:
            await self.publish(event)
    
    def subscribe(self, handler: EventHandler) -> None:
        """Subscribe an event handler"""
        event_type = handler.event_type
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        
        logger.debug(f"Subscribed handler {handler.__class__.__name__} for {event_type.__name__}")
    
    def unsubscribe(self, handler: EventHandler) -> None:
        """Unsubscribe an event handler"""
        event_type = handler.event_type
        if event_type in self._handlers:
            try:
                self._handlers[event_type].remove(handler)
                logger.debug(f"Unsubscribed handler {handler.__class__.__name__} for {event_type.__name__}")
            except ValueError:
                logger.warning(f"Handler {handler.__class__.__name__} was not subscribed")
    
    async def start(self) -> None:
        """Start the event bus"""
        self._running = True
        logger.info("SimpleEventBus started")
    
    async def stop(self) -> None:
        """Stop the event bus"""
        self._running = False
        logger.info("SimpleEventBus stopped")
    
    def get_handler_count(self, event_type: Type[DomainEvent]) -> int:
        """Get the number of handlers for an event type"""
        return len(self._handlers.get(event_type, []))
    
    @property
    def is_running(self) -> bool:
        """Check if the event bus is running"""
        return self._running


class EventBusFactory:
    """Factory for creating simple event buses"""
    
    @staticmethod
    def create_simple_event_bus() -> SimpleEventBus:
        """Create a simple event bus"""
        return SimpleEventBus()
    
    @staticmethod
    def create_event_bus_with_telemetry(telemetry_manager=None) -> SimpleEventBus:
        """
        Create event bus (telemetry_manager parameter kept for compatibility).
        
        Note: With Langfuse SDK v3, observability is handled automatically
        through @observe decorators on event handlers, so we don't need
        to explicitly integrate with the telemetry manager.
        """
        return SimpleEventBus()
