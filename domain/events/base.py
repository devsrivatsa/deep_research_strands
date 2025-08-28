"""
Base domain event classes and interfaces.

This module provides the foundational classes for implementing domain events
following Domain-Driven Design patterns.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Callable, Optional, Type, Union
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
import asyncio


class EventPriority(Enum):
    """Priority levels for event processing"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass(frozen=True)
class EventMetadata:
    """Metadata associated with domain events"""
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None  # ID of the command/event that caused this event
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    source: Optional[str] = None  # Source system/component
    priority: EventPriority = EventPriority.NORMAL
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class DomainEvent(ABC):
    """
    Base class for all domain events.
    
    Domain events represent important business occurrences that domain experts
    care about and that may trigger side effects.
    """
    aggregate_id: str  # ID of the aggregate that emitted this event
    event_type: str   # Type identifier for the event
    event_id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=lambda: datetime.utcnow())
    version: int = field(default=1)  # Event schema version
    data: Dict[str, Any] = field(default_factory=dict)  # Event payload
    metadata: EventMetadata = field(default_factory=EventMetadata)
    
    def __post_init__(self):
        """Validate event after initialization"""
        if not self.aggregate_id:
            raise ValueError("aggregate_id is required")
        if not self.event_type:
            raise ValueError("event_type is required")
    
    @property
    def event_name(self) -> str:
        """Human-readable event name"""
        return self.__class__.__name__
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            "event_id": str(self.event_id),
            "aggregate_id": self.aggregate_id,
            "event_type": self.event_type,
            "event_name": self.event_name,
            "timestamp": self.timestamp.isoformat(),
            "version": self.version,
            "data": self.data,
            "metadata": {
                "correlation_id": self.metadata.correlation_id,
                "causation_id": self.metadata.causation_id,
                "user_id": self.metadata.user_id,
                "session_id": self.metadata.session_id,
                "source": self.metadata.source,
                "priority": self.metadata.priority.value,
                "tags": self.metadata.tags
            }
        }


class EventHandler(ABC):
    """
    Base class for domain event handlers.
    
    Event handlers contain the side effects that should occur when
    domain events are published.
    """
    
    @abstractmethod
    async def handle(self, event: DomainEvent) -> None:
        """Handle a domain event"""
        pass
    
    @property
    @abstractmethod
    def event_type(self) -> Type[DomainEvent]:
        """The type of event this handler processes"""
        pass
    
    @property
    def priority(self) -> EventPriority:
        """Priority for this handler (affects processing order)"""
        return EventPriority.NORMAL


class EventPublisher(ABC):
    """
    Interface for publishing domain events.
    
    This abstraction allows the domain layer to publish events
    without depending on infrastructure concerns.
    """
    
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        """Publish a single domain event"""
        pass
    
    @abstractmethod
    async def publish_many(self, events: List[DomainEvent]) -> None:
        """Publish multiple domain events"""
        pass


class EventBus(ABC):
    """
    Interface for the domain event bus.
    
    The event bus coordinates event publishing and handler execution.
    """
    
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        """Publish an event to all registered handlers"""
        pass
    
    @abstractmethod
    async def publish_many(self, events: List[DomainEvent]) -> None:
        """Publish multiple events"""
        pass
    
    @abstractmethod
    def subscribe(self, handler: EventHandler) -> None:
        """Subscribe an event handler"""
        pass
    
    @abstractmethod
    def unsubscribe(self, handler: EventHandler) -> None:
        """Unsubscribe an event handler"""
        pass
    
    @abstractmethod
    async def start(self) -> None:
        """Start the event bus"""
        pass
    
    @abstractmethod
    async def stop(self) -> None:
        """Stop the event bus"""
        pass


# Type aliases for convenience
EventHandlerFunc = Callable[[DomainEvent], None]
AsyncEventHandlerFunc = Callable[[DomainEvent], asyncio.Future[None]]


class InMemoryEventBus(EventBus):
    """
    Simple in-memory implementation of EventBus for development and testing.
    
    This implementation processes events synchronously and doesn't persist them.
    For production, you'd want a more robust implementation with persistence,
    retry logic, and async processing.
    """
    
    def __init__(self):
        self._handlers: Dict[Type[DomainEvent], List[EventHandler]] = {}
        self._running = False
    
    async def publish(self, event: DomainEvent) -> None:
        """Publish an event to all registered handlers"""
        if not self._running:
            raise RuntimeError("Event bus is not running")
        
        event_type = type(event)
        
        # Get handlers for this specific event type
        specific_handlers = self._handlers.get(event_type, [])
        
        # Also get handlers that handle all DomainEvent types
        base_handlers = self._handlers.get(DomainEvent, [])
        
        # Combine all applicable handlers
        all_handlers = specific_handlers + base_handlers
        
        if all_handlers:
            # Sort handlers by priority
            sorted_handlers = sorted(all_handlers, key=lambda h: h.priority.value, reverse=True)
            
            # Execute handlers concurrently
            tasks = [handler.handle(event) for handler in sorted_handlers]
            await asyncio.gather(*tasks, return_exceptions=True)
    
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
    
    def unsubscribe(self, handler: EventHandler) -> None:
        """Unsubscribe an event handler"""
        event_type = handler.event_type
        if event_type in self._handlers:
            try:
                self._handlers[event_type].remove(handler)
            except ValueError:
                pass  # Handler wasn't subscribed
    
    async def start(self) -> None:
        """Start the event bus"""
        self._running = True
    
    async def stop(self) -> None:
        """Stop the event bus"""
        self._running = False
    
    def get_handler_count(self, event_type: Type[DomainEvent]) -> int:
        """Get the number of handlers for an event type (useful for testing)"""
        return len(self._handlers.get(event_type, []))


def event_handler(event_type: Type[DomainEvent], priority: EventPriority = EventPriority.NORMAL):
    """
    Decorator for creating event handlers from functions.
    
    Usage:
        @event_handler(ResearchTaskStarted)
        async def handle_task_started(event: ResearchTaskStarted):
            print(f"Task {event.data['task_id']} started")
    """
    def decorator(func: AsyncEventHandlerFunc) -> EventHandler:
        class DecoratedHandler(EventHandler):
            def __init__(self):
                self._func = func
                self._event_type = event_type
                self._priority = priority
            
            async def handle(self, event: DomainEvent) -> None:
                await self._func(event)
            
            @property
            def event_type(self) -> Type[DomainEvent]:
                return self._event_type
            
            @property
            def priority(self) -> EventPriority:
                return self._priority
        
        return DecoratedHandler()
    
    return decorator
