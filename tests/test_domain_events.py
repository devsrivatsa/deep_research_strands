"""
Test domain events implementation.

This module tests the basic functionality of the domain events system.
"""

import pytest
import asyncio
from datetime import datetime
from uuid import uuid4

from domain.events.base import InMemoryEventBus, event_handler, EventPriority
from domain.events.research_events import (
    ResearchSessionStarted,
    ResearchTaskStarted,
    ResearchTaskCompleted,
    ResearchTaskFailed
)
from domain.events.handlers.research_handlers import (
    ResearchProgressTracker,
    ResearchMetricsCollector,
    ResearchAuditLogger
)


@pytest.fixture
async def event_bus():
    """Create an in-memory event bus for testing"""
    bus = InMemoryEventBus()
    await bus.start()
    yield bus
    await bus.stop()


@pytest.fixture
def sample_session_id():
    """Generate a sample session ID"""
    return str(uuid4())


@pytest.fixture
def sample_task_id():
    """Generate a sample task ID"""
    return str(uuid4())


@pytest.mark.asyncio
async def test_research_session_started_event(event_bus, sample_session_id):
    """Test creating and publishing a ResearchSessionStarted event"""
    
    # Create event
    event = ResearchSessionStarted(
        session_id=sample_session_id,
        project_id="proj-123",
        query="What are the latest developments in AI?",
        user_id="user-456",
        estimated_duration_minutes=30
    )
    
    # Verify event properties
    assert event.aggregate_id == sample_session_id
    assert event.event_type == "research.session.started"
    assert event.data["query"] == "What are the latest developments in AI?"
    assert event.data["project_id"] == "proj-123"
    assert event.metadata.session_id == sample_session_id
    assert event.metadata.user_id == "user-456"
    
    # Test publishing
    await event_bus.publish(event)


@pytest.mark.asyncio
async def test_research_task_lifecycle(event_bus, sample_session_id, sample_task_id):
    """Test the complete lifecycle of a research task"""
    
    # Create and set up handlers
    progress_tracker = ResearchProgressTracker()
    metrics_collector = ResearchMetricsCollector()
    audit_logger = ResearchAuditLogger()
    
    event_bus.subscribe(progress_tracker)
    event_bus.subscribe(metrics_collector)
    event_bus.subscribe(audit_logger)
    
    # 1. Start session
    session_event = ResearchSessionStarted(
        session_id=sample_session_id,
        project_id="proj-123",
        query="Test query",
        user_id="user-456"
    )
    await event_bus.publish(session_event)
    
    # 2. Start task
    task_start_event = ResearchTaskStarted(
        task_id=sample_task_id,
        session_id=sample_session_id,
        task_description="Research AI developments",
        estimated_tool_calls=5
    )
    await event_bus.publish(task_start_event)
    
    # 3. Complete task
    task_complete_event = ResearchTaskCompleted(
        task_id=sample_task_id,
        session_id=sample_session_id,
        task_description="Research AI developments",
        research_output="Found 10 relevant sources about AI developments...",
        duration_seconds=45.5,
        tool_calls_used=3,
        sources_count=10
    )
    await event_bus.publish(task_complete_event)
    
    # Verify progress tracking
    progress = progress_tracker.get_session_progress(sample_session_id)
    assert progress["status"] == "in_progress"
    assert progress["total_tasks"] == 1
    assert progress["completed_tasks"] == 1
    assert progress["failed_tasks"] == 0
    assert sample_task_id in progress["tasks"]
    assert progress["tasks"][sample_task_id]["status"] == "completed"
    
    # Verify metrics collection
    metrics = metrics_collector.get_metrics()
    assert metrics["total_sessions"] == 1
    assert metrics["total_tasks"] == 1
    assert metrics["completed_tasks"] == 1
    assert metrics["failed_tasks"] == 0
    assert metrics["total_tool_calls"] == 3
    
    # Verify audit logging
    audit_log = audit_logger.get_session_audit_log(sample_session_id)
    assert len(audit_log) == 3  # session start, task start, task complete
    assert audit_log[0]["event_type"] == "research.session.started"
    assert audit_log[1]["event_type"] == "research.task.started"
    assert audit_log[2]["event_type"] == "research.task.completed"


@pytest.mark.asyncio
async def test_task_failure_handling(event_bus, sample_session_id, sample_task_id):
    """Test handling of task failures"""
    
    progress_tracker = ResearchProgressTracker()
    metrics_collector = ResearchMetricsCollector()
    
    event_bus.subscribe(progress_tracker)
    event_bus.subscribe(metrics_collector)
    
    # Start session and task
    session_event = ResearchSessionStarted(
        session_id=sample_session_id,
        project_id="proj-123",
        query="Test query"
    )
    await event_bus.publish(session_event)
    
    task_start_event = ResearchTaskStarted(
        task_id=sample_task_id,
        session_id=sample_session_id,
        task_description="Failing task"
    )
    await event_bus.publish(task_start_event)
    
    # Fail the task
    task_failed_event = ResearchTaskFailed(
        task_id=sample_task_id,
        session_id=sample_session_id,
        task_description="Failing task",
        error_message="Network timeout",
        error_type="NetworkError",
        duration_seconds=10.0,
        tool_calls_made=1
    )
    await event_bus.publish(task_failed_event)
    
    # Verify failure is tracked
    progress = progress_tracker.get_session_progress(sample_session_id)
    assert progress["failed_tasks"] == 1
    assert progress["completed_tasks"] == 0
    assert progress["tasks"][sample_task_id]["status"] == "failed"
    assert progress["tasks"][sample_task_id]["error_message"] == "Network timeout"
    
    metrics = metrics_collector.get_metrics()
    assert metrics["failed_tasks"] == 1
    assert metrics["completed_tasks"] == 0


@pytest.mark.asyncio
async def test_event_handler_decorator():
    """Test the event handler decorator"""
    
    handled_events = []
    
    @event_handler(ResearchTaskStarted, priority=EventPriority.HIGH)
    async def handle_task_started(event):
        handled_events.append(event)
    
    # Create event bus and subscribe handler
    bus = InMemoryEventBus()
    await bus.start()
    bus.subscribe(handle_task_started)
    
    # Publish event
    event = ResearchTaskStarted(
        task_id="task-123",
        session_id="session-456",
        task_description="Test task"
    )
    await bus.publish(event)
    
    # Verify handler was called
    assert len(handled_events) == 1
    assert handled_events[0].aggregate_id == "task-123"
    assert handle_task_started.priority == EventPriority.HIGH
    
    await bus.stop()


@pytest.mark.asyncio
async def test_event_serialization():
    """Test event serialization to dictionary"""
    
    event = ResearchSessionStarted(
        session_id="session-123",
        project_id="proj-456",
        query="Test query",
        user_id="user-789",
        correlation_id="corr-abc"
    )
    
    event_dict = event.to_dict()
    
    # Verify serialization
    assert event_dict["event_type"] == "research.session.started"
    assert event_dict["event_name"] == "ResearchSessionStarted"
    assert event_dict["aggregate_id"] == "session-123"
    assert event_dict["data"]["query"] == "Test query"
    assert event_dict["data"]["project_id"] == "proj-456"
    assert event_dict["metadata"]["session_id"] == "session-123"
    assert event_dict["metadata"]["user_id"] == "user-789"
    assert event_dict["metadata"]["correlation_id"] == "corr-abc"


@pytest.mark.asyncio
async def test_multiple_handlers_same_event(event_bus, sample_session_id):
    """Test that multiple handlers can process the same event"""
    
    handler_calls = []
    
    @event_handler(ResearchSessionStarted)
    async def handler1(event):
        handler_calls.append("handler1")
    
    @event_handler(ResearchSessionStarted)
    async def handler2(event):
        handler_calls.append("handler2")
    
    event_bus.subscribe(handler1)
    event_bus.subscribe(handler2)
    
    event = ResearchSessionStarted(
        session_id=sample_session_id,
        project_id="proj-123",
        query="Test query"
    )
    
    await event_bus.publish(event)
    
    # Both handlers should have been called
    assert len(handler_calls) == 2
    assert "handler1" in handler_calls
    assert "handler2" in handler_calls


if __name__ == "__main__":
    # Run a simple test
    async def simple_test():
        print("Testing domain events...")
        
        bus = InMemoryEventBus()
        await bus.start()
        
        # Create handlers
        tracker = ResearchProgressTracker()
        metrics = ResearchMetricsCollector()
        
        bus.subscribe(tracker)
        bus.subscribe(metrics)
        
        # Test events
        session_id = str(uuid4())
        task_id = str(uuid4())
        
        session_event = ResearchSessionStarted(
            session_id=session_id,
            project_id="test-project",
            query="What is the future of AI?",
            user_id="test-user"
        )
        
        task_event = ResearchTaskStarted(
            task_id=task_id,
            session_id=session_id,
            task_description="Research AI trends"
        )
        
        await bus.publish(session_event)
        await bus.publish(task_event)
        
        print(f"Session progress: {tracker.get_session_progress(session_id)}")
        print(f"Metrics: {metrics.get_metrics()}")
        
        await bus.stop()
        print("Test completed successfully!")
    
    asyncio.run(simple_test())
