#!/usr/bin/env python3
"""
Simplified Langfuse Integration Example.

This example demonstrates the cleaned up codebase using:
- Simplified event bus
- Enhanced Langfuse event handlers 
- Clean separation of concerns
"""

import asyncio
import logging
import sys
from pathlib import Path
from uuid import uuid4

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config import Config
from infrastructure.observability import (
    initialize_langfuse_telemetry,
    shutdown_langfuse_telemetry
)
from infrastructure.events import EventBusFactory
from domain.events.research_events import (
    ResearchSessionStarted,
    ResearchTaskStarted,
    ResearchTaskCompleted,
    ResearchSessionCompleted
)
from domain.events.handlers.langfuse_research_handlers import (
    LangfuseResearchProgressTracker,
    LangfuseResearchMetricsCollector
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_simplified_langfuse_demo():
    """
    Run simplified Langfuse integration demo.
    
    This demonstrates:
    - Clean codebase without old observability files
    - Simplified event bus
    - Enhanced Langfuse event handlers
    - Proper separation of concerns
    """
    
    print("🚀 Simplified Langfuse Integration Demo")
    print("=" * 60)
    
    # Load configuration
    try:
        config = Config.load()
        print(f"✅ Configuration loaded")
        print(f"   Langfuse Host: {config.langfuse_host}")
    except Exception as e:
        print(f"⚠️ Configuration error: {e}")
        print("   Continuing with demo setup...")
        config = Config()  # Use defaults
    
    telemetry_manager = None
    event_bus = None
    
    try:
        # Step 1: Initialize Simplified Telemetry
        print("\n1️⃣ Initializing Simplified Telemetry...")
        
        try:
            telemetry_manager = initialize_langfuse_telemetry(config)
            print("   ✅ Langfuse telemetry initialized")
        except Exception as e:
            print(f"   ⚠️ Telemetry initialization skipped: {e}")
        
        # Step 2: Set up Simplified Event Bus
        print("\n2️⃣ Setting up Simplified Event Bus...")
        
        event_bus = EventBusFactory.create_simple_event_bus()
        
        # Subscribe Langfuse handlers (with @observe decorators)
        progress_tracker = LangfuseResearchProgressTracker()
        metrics_collector = LangfuseResearchMetricsCollector()
        
        event_bus.subscribe(progress_tracker)
        event_bus.subscribe(metrics_collector)
        
        await event_bus.start()
        print("   ✅ Simple event bus with Langfuse handlers started")
        
        # Step 3: Execute Research Workflow
        print("\n3️⃣ Executing Research Workflow...")
        
        session_id = f"session-{uuid4().hex[:8]}"
        task_id = f"task-{uuid4().hex[:8]}"
        
        # Start research session
        session_event = ResearchSessionStarted(
            session_id=session_id,
            project_id="simplified-demo-project",
            query="How does the simplified observability architecture work?",
            user_id="demo-user-123",
            estimated_duration_minutes=10,
            correlation_id=f"demo-{session_id}"
        )
        
        await event_bus.publish(session_event)
        print(f"   ✅ Research session started: {session_id}")
        
        # Simulate some delay
        await asyncio.sleep(0.1)
        
        # Start research task
        task_event = ResearchTaskStarted(
            task_id=task_id,
            session_id=session_id,
            task_description="Analyze simplified observability architecture",
            estimated_tool_calls=5,
            correlation_id=f"demo-{session_id}"
        )
        
        await event_bus.publish(task_event)
        print(f"   ✅ Research task started: {task_id}")
        
        # Simulate research processing
        await asyncio.sleep(0.2)
        
        # Complete research task
        research_output = """
        The simplified observability architecture provides:
        
        1. Clean separation between domain events and observability
        2. Langfuse SDK v3 handles tracing automatically via @observe decorators
        3. Simplified event bus focuses on event handling, not tracing
        4. Enhanced handlers provide rich Langfuse integration
        5. Reduced complexity and improved maintainability
        """
        
        task_complete_event = ResearchTaskCompleted(
            task_id=task_id,
            session_id=session_id,
            task_description="Analyze simplified observability architecture",
            research_output=research_output,
            duration_seconds=1.5,
            tool_calls_used=5,
            sources_count=3,
            correlation_id=f"demo-{session_id}"
        )
        
        await event_bus.publish(task_complete_event)
        print(f"   ✅ Research task completed: {task_id}")
        
        # Complete research session
        session_complete_event = ResearchSessionCompleted(
            session_id=session_id,
            project_id="simplified-demo-project",
            query="How does the simplified observability architecture work?",
            total_tasks=1,
            successful_tasks=1,
            failed_tasks=0,
            total_duration_seconds=1.5,
            total_tool_calls=5,
            final_report_length=len(research_output),
            user_id="demo-user-123",
            correlation_id=f"demo-{session_id}"
        )
        
        await event_bus.publish(session_complete_event)
        print(f"   ✅ Research session completed: {session_id}")
        
        # Step 4: Show Results
        print("\n4️⃣ Simplified Results:")
        print("=" * 40)
        
        # Progress tracking results
        progress = progress_tracker.get_session_progress(session_id)
        print(f"📈 Session Progress:")
        print(f"   Status: {progress.get('status', 'unknown')}")
        print(f"   Total Tasks: {progress.get('total_tasks', 0)}")
        print(f"   Completed: {progress.get('completed_tasks', 0)}")
        print(f"   Success Rate: {progress.get('success_rate', 0):.1%}")
        
        # Metrics results
        metrics = metrics_collector.get_metrics()
        print(f"\n📊 Global Metrics:")
        print(f"   Sessions: {metrics['total_sessions']}")
        print(f"   Tasks: {metrics['total_tasks']}")
        print(f"   Tool Calls: {metrics['total_tool_calls']}")
        print(f"   Avg Duration: {metrics['average_session_duration']:.1f}s")
        
        print("\n" + "=" * 60)
        print("🎉 Simplified Langfuse Integration Demo Complete!")
        print("\nWhat's been simplified:")
        print("✅ Removed old telemetry manager, event tracer, correlation context")
        print("✅ Simplified event bus focuses on event handling only")
        print("✅ Langfuse SDK v3 handles observability via @observe decorators")
        print("✅ Enhanced event handlers with rich Langfuse integration")
        print("✅ Cleaner separation of concerns")
        print("✅ Reduced complexity while maintaining functionality")
        
        if config and config.langfuse_host:
            print(f"\n🔗 View traces in Langfuse: {config.langfuse_host}")
        else:
            print("\n💡 Configure Langfuse to see traces:")
            print("   LANGFUSE_PUBLIC_KEY=your_public_key")
            print("   LANGFUSE_SECRET_KEY=your_secret_key")
            print("   LANGFUSE_HOST=https://your-langfuse-instance.com")
        
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        # Cleanup
        if event_bus:
            await event_bus.stop()
        
        if telemetry_manager:
            shutdown_langfuse_telemetry()
    
    return 0


async def main():
    """Run the simplified demo"""
    print("🌟 DeepResearch Simplified Observability Demo")
    print("This demonstrates the cleaned up codebase with:")
    print("- Simplified event bus")
    print("- Enhanced Langfuse event handlers")
    print("- Clean separation of concerns")
    print("- Reduced complexity")
    print("")
    
    exit_code = await run_simplified_langfuse_demo()
    return exit_code


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
