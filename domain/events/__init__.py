"""
Domain events package for DeepResearch.
Provides event-driven architecture foundation for research workflows.
"""

# Base event infrastructure
from .base import (
    DomainEvent,
    EventBus,
    EventHandler,
    EventPriority,
    InMemoryEventBus,
    event_handler
)

# Research domain events
from .research_events import (
    ResearchSessionStarted,
    ResearchSessionCompleted,
    ResearchSessionCancelled,
    ResearchPlanGenerated,
    ResearchTaskStarted,
    ResearchTaskProgress,
    ResearchTaskCompleted,
    ResearchTaskFailed,
    ResearchJobCompleted,
    HumanFeedbackReceived,
    ResearchReportGenerated
)

# Workflow domain events (Phase 3)
from .workflow_events import (
    ResearchWorkflowStarted,
    ResearchWorkflowCompleted,
    ResearchWorkflowFailed,
    ResearchTaskPlanGenerated,
    ResearchTaskDependencyResolved,
    ResearchTaskGroupStarted,
    ResearchTaskGroupCompleted,
    ResearchWorkflowPaused,
    ResearchWorkflowResumed,
    ResearchWorkflowCancelled
)

# Agent domain events (Phase 3)
from .agent_events import (
    AgentExecutionStarted,
    AgentExecutionCompleted,
    AgentExecutionFailed,
    AgentToolCallStarted,
    AgentToolCallCompleted,
    AgentToolCallFailed,
    AgentDecisionPoint,
    AgentIterationStarted,
    AgentIterationCompleted,
    AgentCollaborationStarted,
    AgentCollaborationCompleted,
    AgentPerformanceMetrics,
    AgentResourceUsage,
    AgentStateTransition,
    AgentFeedbackReceived,
    AgentAdaptationTriggered
)

# Event handlers
from .handlers.research_handlers import (
    ResearchProgressTracker,
    ResearchMetricsCollector,
    ResearchAuditLogger
)

from .handlers.langfuse_research_handlers import (
    LangfuseResearchProgressTracker,
    LangfuseResearchMetricsCollector
)

__all__ = [
    # Base infrastructure
    "DomainEvent",
    "EventBus", 
    "EventHandler",
    "EventPriority",
    "InMemoryEventBus",
    "event_handler",
    
    # Research events
    "ResearchSessionStarted",
    "ResearchSessionCompleted", 
    "ResearchSessionCancelled",
    "ResearchPlanGenerated",
    "ResearchTaskStarted",
    "ResearchTaskProgress",
    "ResearchTaskCompleted",
    "ResearchTaskFailed",
    "ResearchJobCompleted",
    "HumanFeedbackReceived",
    "ResearchReportGenerated",
    
    # Workflow events
    "ResearchWorkflowStarted",
    "ResearchWorkflowCompleted",
    "ResearchWorkflowFailed", 
    "ResearchTaskPlanGenerated",
    "ResearchTaskDependencyResolved",
    "ResearchTaskGroupStarted",
    "ResearchTaskGroupCompleted",
    "ResearchWorkflowPaused",
    "ResearchWorkflowResumed",
    "ResearchWorkflowCancelled",
    
    # Agent events
    "AgentExecutionStarted",
    "AgentExecutionCompleted",
    "AgentExecutionFailed",
    "AgentToolCallStarted", 
    "AgentToolCallCompleted",
    "AgentToolCallFailed",
    "AgentDecisionPoint",
    "AgentIterationStarted",
    "AgentIterationCompleted",
    "AgentCollaborationStarted",
    "AgentCollaborationCompleted",
    "AgentPerformanceMetrics",
    "AgentResourceUsage",
    "AgentStateTransition",
    "AgentFeedbackReceived",
    "AgentAdaptationTriggered",
    
    # Event handlers
    "ResearchProgressTracker",
    "ResearchMetricsCollector", 
    "ResearchAuditLogger",
    "LangfuseResearchProgressTracker",
    "LangfuseResearchMetricsCollector"
]
