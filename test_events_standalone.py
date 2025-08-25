#!/usr/bin/env python3
"""
Standalone test for domain events system.
This bypasses the domain module imports to test our event system.
"""

import asyncio
import sys
from uuid import uuid4
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import our event system directly
from domain.events.base import InMemoryEventBus, event_handler, EventPriority
from domain.events.research_events import (
    ResearchSessionStarted,
    ResearchTaskStarted,
    ResearchTaskCompleted,
    ResearchTaskFailed,
    ResearchSessionCompleted
)
from domain.events.handlers.research_handlers import (
    ResearchProgressTracker,
    ResearchMetricsCollector,
    ResearchAuditLogger
)


async def test_basic_event_system():
    """Test the basic functionality of our event system"""
    print("🚀 Testing Domain Events System...")
    print("=" * 60)
    
    # Create event bus
    bus = InMemoryEventBus()
    await bus.start()
    print("✅ Event bus started")
    
    # Create and subscribe handlers
    tracker = ResearchProgressTracker()
    metrics = ResearchMetricsCollector()
    audit_logger = ResearchAuditLogger()
    
    bus.subscribe(tracker)
    bus.subscribe(metrics)
    bus.subscribe(audit_logger)
    print("✅ Handlers subscribed")
    
    # Test data
    session_id = f"session-{uuid4().hex[:8]}"
    task_id = f"task-{uuid4().hex[:8]}"
    
    print(f"\n📋 Test Session: {session_id}")
    print(f"📋 Test Task: {task_id}")
    
    # 1. Start research session
    print("\n1️⃣ Starting research session...")
    session_event = ResearchSessionStarted(
        session_id=session_id,
        project_id="proj-test-123",
        query="What are the latest developments in quantum computing?",
        user_id="user-test-456",
        estimated_duration_minutes=45
    )
    
    await bus.publish(session_event)
    print(f"   ✅ Published: {session_event.event_name}")
    
    # 2. Start research task
    print("\n2️⃣ Starting research task...")
    task_start_event = ResearchTaskStarted(
        task_id=task_id,
        session_id=session_id,
        task_description="Research quantum computing breakthroughs in 2024",
        estimated_tool_calls=10
    )
    
    await bus.publish(task_start_event)
    print(f"   ✅ Published: {task_start_event.event_name}")
    
    # 3. Complete research task
    print("\n3️⃣ Completing research task...")
    task_complete_event = ResearchTaskCompleted(
        task_id=task_id,
        session_id=session_id,
        task_description="Research quantum computing breakthroughs in 2024",
        research_output="Found comprehensive information about quantum computing advances including IBM's 1000-qubit processor and Google's quantum error correction breakthroughs...",
        duration_seconds=87.5,
        tool_calls_used=8,
        sources_count=25
    )
    
    await bus.publish(task_complete_event)
    print(f"   ✅ Published: {task_complete_event.event_name}")
    
    # 4. Complete research session
    print("\n4️⃣ Completing research session...")
    session_complete_event = ResearchSessionCompleted(
        session_id=session_id,
        project_id="proj-test-123",
        query="What are the latest developments in quantum computing?",
        total_tasks=1,
        successful_tasks=1,
        failed_tasks=0,
        total_duration_seconds=87.5,
        total_tool_calls=8,
        final_report_length=2450,
        user_id="user-test-456"
    )
    
    await bus.publish(session_complete_event)
    print(f"   ✅ Published: {session_complete_event.event_name}")
    
    # Check results
    print("\n📊 Results:")
    print("=" * 40)
    
    # Progress tracking results
    progress = tracker.get_session_progress(session_id)
    print(f"Session Status: {progress.get('status', 'unknown')}")
    print(f"Total Tasks: {progress.get('total_tasks', 0)}")
    print(f"Completed Tasks: {progress.get('completed_tasks', 0)}")
    print(f"Failed Tasks: {progress.get('failed_tasks', 0)}")
    
    # Metrics results
    metrics_data = metrics.get_metrics()
    print(f"\nGlobal Metrics:")
    print(f"  Sessions: {metrics_data['total_sessions']}")
    print(f"  Tasks: {metrics_data['total_tasks']}")
    print(f"  Tool Calls: {metrics_data['total_tool_calls']}")
    print(f"  Avg Session Duration: {metrics_data['average_session_duration']:.1f}s")
    
    # Audit log results
    audit_entries = audit_logger.get_session_audit_log(session_id)
    print(f"\nAudit Log Entries: {len(audit_entries)}")
    for entry in audit_entries:
        print(f"  - {entry['timestamp'][:19]} | {entry['event_name']}")
    
    # Test event serialization
    print(f"\n🔄 Testing Event Serialization:")
    event_dict = session_event.to_dict()
    print(f"  Event Name: {event_dict['event_name']}")
    print(f"  Event Type: {event_dict['event_type']}")
    print(f"  Aggregate ID: {event_dict['aggregate_id']}")
    print(f"  Session ID: {event_dict['metadata']['session_id']}")
    
    await bus.stop()
    print("\n🎉 Domain Events test completed successfully!")
    print("=" * 60)


async def test_event_handler_decorator():
    """Test the event handler decorator functionality"""
    print("\n🧪 Testing Event Handler Decorator...")
    
    # Track handler calls
    handler_calls = []
    
    @event_handler(ResearchTaskStarted, priority=EventPriority.HIGH)
    async def custom_task_handler(event):
        handler_calls.append({
            'event_name': event.event_name,
            'task_id': event.aggregate_id,
            'session_id': event.metadata.session_id
        })
        print(f"   🔥 Custom handler processed: {event.event_name}")
    
    # Create bus and subscribe
    bus = InMemoryEventBus()
    await bus.start()
    bus.subscribe(custom_task_handler)
    
    # Test event
    task_event = ResearchTaskStarted(
        task_id="decorator-test-task",
        session_id="decorator-test-session",
        task_description="Test decorator functionality"
    )
    
    await bus.publish(task_event)
    
    # Verify handler was called
    assert len(handler_calls) == 1
    assert handler_calls[0]['event_name'] == 'ResearchTaskStarted'
    assert custom_task_handler.priority == EventPriority.HIGH
    
    await bus.stop()
    print("   ✅ Event handler decorator works correctly!")


async def test_error_handling():
    """Test error handling in event processing"""
    print("\n⚠️  Testing Error Handling...")
    
    bus = InMemoryEventBus()
    await bus.start()
    
    tracker = ResearchProgressTracker()
    bus.subscribe(tracker)
    
    session_id = "error-test-session"
    task_id = "failed-task-123"
    
    # First start a session (required for tracking)
    session_event = ResearchSessionStarted(
        session_id=session_id,
        project_id="error-test-project",
        query="Test error handling"
    )
    await bus.publish(session_event)
    
    # Start the task
    task_start_event = ResearchTaskStarted(
        task_id=task_id,
        session_id=session_id,
        task_description="Task that will fail"
    )
    await bus.publish(task_start_event)
    
    # Test task failure event
    task_failed_event = ResearchTaskFailed(
        task_id=task_id,
        session_id=session_id,
        task_description="Task that fails",
        error_message="Network timeout after 30 seconds",
        error_type="NetworkTimeoutError",
        duration_seconds=30.0,
        tool_calls_made=3,
        retry_count=1
    )
    
    await bus.publish(task_failed_event)
    
    # Verify failure tracking
    progress = tracker.get_session_progress(session_id)
    assert progress.get('failed_tasks', 0) == 1, f"Expected 1 failed task, got {progress.get('failed_tasks', 0)}"
    assert progress.get('total_tasks', 0) == 1, f"Expected 1 total task, got {progress.get('total_tasks', 0)}"
    
    await bus.stop()
    print("   ✅ Error handling works correctly!")


async def main():
    """Run all tests"""
    try:
        await test_basic_event_system()
        await test_event_handler_decorator()
        await test_error_handling()
        
        print("\n🏆 All tests passed! Domain Events system is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
