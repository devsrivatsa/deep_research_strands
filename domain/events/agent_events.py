"""
Agent-specific domain events for tracking agent operations, performance, and interactions.
These events provide detailed observability into agent execution patterns.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from datetime import datetime
from .base import DomainEvent


@dataclass(frozen=True)
class AgentExecutionStarted(DomainEvent):
    """Emitted when an agent begins execution."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, input_data: Dict[str, Any],
                 model: Optional[str] = None, estimated_duration: Optional[float] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_execution_started",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "input_data": input_data,
                "model": model,
                "estimated_duration": estimated_duration
            }
        )


@dataclass(frozen=True)
class AgentExecutionCompleted(DomainEvent):
    """Emitted when an agent completes execution successfully."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, output_data: Dict[str, Any],
                 execution_duration: float, token_usage: Optional[Dict[str, int]] = None,
                 model: Optional[str] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_execution_completed",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "output_data": output_data,
                "execution_duration": execution_duration,
                "token_usage": token_usage,
                "model": model
            }
        )


@dataclass(frozen=True)
class AgentExecutionFailed(DomainEvent):
    """Emitted when an agent execution fails."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, error_message: str,
                 error_type: str, execution_duration: Optional[float] = None,
                 partial_output: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_execution_failed",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "error_message": error_message,
                "error_type": error_type,
                "execution_duration": execution_duration,
                "partial_output": partial_output
            }
        )


@dataclass(frozen=True)
class AgentToolCallStarted(DomainEvent):
    """Emitted when an agent starts calling a tool."""
    
    def __init__(self, session_id: str, agent_id: str, tool_name: str, tool_input: Dict[str, Any],
                 tool_metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_tool_call_started",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "tool_name": tool_name,
                "tool_input": tool_input,
                "tool_metadata": tool_metadata
            }
        )


@dataclass(frozen=True)
class AgentToolCallCompleted(DomainEvent):
    """Emitted when an agent completes a tool call successfully."""
    
    def __init__(self, session_id: str, agent_id: str, tool_name: str, tool_output: Any,
                 execution_duration: float, tool_metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_tool_call_completed",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "tool_name": tool_name,
                "tool_output": tool_output,
                "execution_duration": execution_duration,
                "tool_metadata": tool_metadata
            }
        )


@dataclass(frozen=True)
class AgentToolCallFailed(DomainEvent):
    """Emitted when an agent tool call fails."""
    
    def __init__(self, session_id: str, agent_id: str, tool_name: str, error_message: str,
                 error_type: str, execution_duration: Optional[float] = None,
                 tool_metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_tool_call_failed",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "tool_name": tool_name,
                "error_message": error_message,
                "error_type": error_type,
                "execution_duration": execution_duration,
                "tool_metadata": tool_metadata
            }
        )


@dataclass(frozen=True)
class AgentDecisionPoint(DomainEvent):
    """Emitted when an agent reaches a decision point in its execution."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, decision_type: str,
                 decision_context: Dict[str, Any], decision_options: List[str], selected_option: str,
                 reasoning: str):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_decision_point",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "decision_type": decision_type,
                "decision_context": decision_context,
                "decision_options": decision_options,
                "selected_option": selected_option,
                "reasoning": reasoning
            }
        )


@dataclass(frozen=True)
class AgentIterationStarted(DomainEvent):
    """Emitted when an agent starts a new iteration of its task."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, iteration_number: int,
                 iteration_reason: str, previous_results: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_iteration_started",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "iteration_number": iteration_number,
                "iteration_reason": iteration_reason,
                "previous_results": previous_results
            }
        )


@dataclass(frozen=True)
class AgentIterationCompleted(DomainEvent):
    """Emitted when an agent completes an iteration."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, iteration_number: int,
                 iteration_results: Dict[str, Any], iteration_duration: float,
                 quality_score: Optional[float] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_iteration_completed",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "iteration_number": iteration_number,
                "iteration_results": iteration_results,
                "iteration_duration": iteration_duration,
                "quality_score": quality_score
            }
        )


@dataclass(frozen=True)
class AgentCollaborationStarted(DomainEvent):
    """Emitted when multiple agents begin collaborating on a task."""
    
    def __init__(self, session_id: str, collaboration_id: str, agent_ids: List[str],
                 collaboration_type: str, shared_context: Dict[str, Any], coordination_strategy: str):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_collaboration_started",
            data={
                "session_id": session_id,
                "collaboration_id": collaboration_id,
                "agent_ids": agent_ids,
                "collaboration_type": collaboration_type,
                "shared_context": shared_context,
                "coordination_strategy": coordination_strategy
            }
        )


@dataclass(frozen=True)
class AgentCollaborationCompleted(DomainEvent):
    """Emitted when agent collaboration completes."""
    
    def __init__(self, session_id: str, collaboration_id: str, agent_ids: List[str],
                 collaboration_results: Dict[str, Any], collaboration_duration: float,
                 coordination_overhead: Optional[float] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_collaboration_completed",
            data={
                "session_id": session_id,
                "collaboration_id": collaboration_id,
                "agent_ids": agent_ids,
                "collaboration_results": collaboration_results,
                "collaboration_duration": collaboration_duration,
                "coordination_overhead": coordination_overhead
            }
        )


@dataclass(frozen=True)
class AgentPerformanceMetrics(DomainEvent):
    """Emitted periodically with agent performance metrics."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, metrics: Dict[str, Any],
                 collection_timestamp: datetime, metrics_period: float):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_performance_metrics",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "metrics": metrics,
                "collection_timestamp": collection_timestamp,
                "metrics_period": metrics_period
            }
        )


@dataclass(frozen=True)
class AgentResourceUsage(DomainEvent):
    """Emitted when agent resource usage is tracked."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, resource_type: str,
                 usage_amount: float, usage_unit: str, timestamp: datetime,
                 resource_metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_resource_usage",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "resource_type": resource_type,
                "usage_amount": usage_amount,
                "usage_unit": usage_unit,
                "timestamp": timestamp,
                "resource_metadata": resource_metadata
            }
        )


@dataclass(frozen=True)
class AgentStateTransition(DomainEvent):
    """Emitted when an agent transitions between states."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, from_state: str,
                 to_state: str, transition_reason: str, state_data: Optional[Dict[str, Any]] = None,
                 timestamp: datetime = None):
        if timestamp is None:
            timestamp = datetime.now()
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_state_transition",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "from_state": from_state,
                "to_state": to_state,
                "transition_reason": transition_reason,
                "state_data": state_data,
                "timestamp": timestamp
            }
        )


@dataclass(frozen=True)
class AgentFeedbackReceived(DomainEvent):
    """Emitted when an agent receives feedback (human or system)."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, feedback_type: str,
                 feedback_content: str, feedback_score: Optional[float] = None,
                 feedback_source: str = "system", requires_action: bool = False):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_feedback_received",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "feedback_type": feedback_type,
                "feedback_content": feedback_content,
                "feedback_score": feedback_score,
                "feedback_source": feedback_source,
                "requires_action": requires_action
            }
        )


@dataclass(frozen=True)
class AgentAdaptationTriggered(DomainEvent):
    """Emitted when an agent adapts its behavior based on feedback or conditions."""
    
    def __init__(self, session_id: str, agent_id: str, agent_type: str, adaptation_type: str,
                 adaptation_reason: str, adaptation_details: Dict[str, Any],
                 previous_configuration: Optional[Dict[str, Any]] = None,
                 new_configuration: Optional[Dict[str, Any]] = None):
        super().__init__(
            aggregate_id=session_id,
            event_type="agent_adaptation_triggered",
            data={
                "session_id": session_id,
                "agent_id": agent_id,
                "agent_type": agent_type,
                "adaptation_type": adaptation_type,
                "adaptation_reason": adaptation_reason,
                "adaptation_details": adaptation_details,
                "previous_configuration": previous_configuration,
                "new_configuration": new_configuration
            }
        )
