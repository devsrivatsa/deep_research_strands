"""
Domain event bus service.

This module provides the domain service interface for publishing events.
The actual implementation is provided by the infrastructure layer.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from ..events.base import DomainEvent, EventPublisher


class DomainEventBus(EventPublisher):
    """
    Domain service for publishing domain events.
    
    This service provides a clean interface for the domain layer
    to publish events without depending on infrastructure concerns.
    """
    
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        """Publish a single domain event"""
        pass
    
    @abstractmethod
    async def publish_many(self, events: List[DomainEvent]) -> None:
        """Publish multiple domain events atomically"""
        pass
    
    @abstractmethod
    async def publish_with_correlation(
        self, 
        event: DomainEvent, 
        correlation_id: str,
        causation_id: Optional[str] = None
    ) -> None:
        """Publish an event with correlation tracking"""
        pass
