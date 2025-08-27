"""
Domain Events Package

This package contains domain events and event handling infrastructure for the DeepResearch system.
Domain events represent important business occurrences in the research workflow.
"""

from .base import (
    DomainEvent,
    EventHandler,
    EventPublisher,
    EventBus,
    EventMetadata
)

from .research_events import (
    ResearchSessionStarted,
    ResearchPlanGenerated,
    ResearchTaskStarted,
    ResearchTaskProgress,
    ResearchTaskCompleted,
    ResearchTaskFailed,
    ResearchSessionCompleted,
    ResearchSessionCancelled,
    ResearchReportGenerated,
    HumanFeedbackReceived
)

__all__ = [
    # Base classes
    "DomainEvent",
    "EventHandler", 
    "EventPublisher",
    "EventBus",
    "EventMetadata",
    
    # Research events
    "ResearchSessionStarted",
    "ResearchPlanGenerated", 
    "ResearchTaskStarted",
    "ResearchTaskProgress",
    "ResearchTaskCompleted",
    "ResearchTaskFailed",
    "ResearchSessionCompleted",
    "ResearchSessionCancelled",
    "ResearchReportGenerated",
    "HumanFeedbackReceived",
]
