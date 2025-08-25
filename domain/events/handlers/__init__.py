"""
Event handlers package.

This package contains domain event handlers that implement business logic
in response to domain events.
"""

from .research_handlers import (
    ResearchProgressTracker,
    ResearchMetricsCollector,
    ResearchAuditLogger
)

__all__ = [
    "ResearchProgressTracker",
    "ResearchMetricsCollector", 
    "ResearchAuditLogger"
]
