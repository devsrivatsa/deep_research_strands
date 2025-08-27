#!/usr/bin/env python3
"""
Event-Driven WebSocket Integration Example.

This example demonstrates Phase 2 of the event-driven architecture:
- WebSocket integration with domain events
- Real-time UI updates driven by research events
- Complete event-to-WebSocket bridge functionality
- Multiple client connections and event filtering
"""

import asyncio
import json
import logging
from pathlib import Path
from uuid import uuid4
import sys

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.events import EventBusFactory
from infrastructure.websockets.websocket_manager import ResearchWebSocketManager, WebSocketEventBridge
from infrastructure.websockets.websocket_handlers import WebSocketEventHandlers
from domain.events.research_events import (
    ResearchSessionStarted,
    ResearchTaskStarted,
    ResearchTaskProgress,
    ResearchTaskCompleted,
    ResearchSessionCompleted,
    ResearchPlanGenerated,
    ResearchReportGenerated
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MockWebSocket:
    """Mock WebSocket for testing purposes"""
    
    def __init__(self, name: str):
        self.name = name
        self.messages = []
        self.accepted = False
        self.closed = False
    
    async def accept(self):
        """Accept the WebSocket connection"""
        self.accepted = True
        logger.info(f"MockWebSocket {self.name} accepted")
    
    async def send_text(self, message: str):
        """Send text message"""
        if not self.accepted or self.closed:
            raise Exception("WebSocket not connected")
        
        self.messages.append(message)
        data = json.loads(message)
        logger.info(f"📱 {self.name} received: {data.get('type', 'unknown')} - {data.get('ui', {}).get('message', 'No message')}")
    
    async def close(self):
        """Close the WebSocket"""
        self.closed = True
        logger.info(f"MockWebSocket {self.name} closed")
    
    def get_messages(self):
        """Get all received messages"""
        return [json.loads(msg) for msg in self.messages]


async def simulate_research_workflow():
    """
    Simulate a complete research workflow with WebSocket updates.
    
    This demonstrates how domain events automatically trigger
    WebSocket updates to connected clients.
    """
    print("🚀 Event-Driven WebSocket Integration Demo")
    print("=" * 60)
    
    # Step 1: Initialize Event Bus and WebSocket Infrastructure
    print("\n1️⃣ Setting up Event-Driven WebSocket Infrastructure...")
    
    event_bus = EventBusFactory.create_simple_event_bus()
    await event_bus.start()
    
    # Create WebSocket infrastructure
    websocket_manager = ResearchWebSocketManager()
    websocket_handlers = WebSocketEventHandlers(websocket_manager)
    websocket_bridge = WebSocketEventBridge(websocket_manager)
    
    # Register WebSocket handlers with event bus
    event_bus.subscribe(websocket_bridge)
    for handler in websocket_handlers.get_all_handlers():
        event_bus.subscribe(handler)
    
    print("   ✅ Event bus started")
    print("   ✅ WebSocket manager initialized")
    print("   ✅ WebSocket event handlers registered")
    
    # Step 2: Connect Mock WebSocket Clients
    print("\n2️⃣ Connecting WebSocket Clients...")
    
    session_id = f"demo-session-{uuid4().hex[:8]}"
    
    # Create multiple mock WebSocket clients
    client1 = MockWebSocket("Client-Desktop")
    client2 = MockWebSocket("Client-Mobile")
    client3 = MockWebSocket("Client-Dashboard")
    
    # Connect clients with different subscription preferences
    await websocket_manager.connect(
        client1.websocket if hasattr(client1, 'websocket') else client1,
        session_id,
        user_id="user-123",
        subscribed_events={
            "research.session.started",
            "research.session.completed", 
            "research.task.started",
            "research.task.completed",
            "research.task.progress"
        }
    )
    
    await websocket_manager.connect(
        client2.websocket if hasattr(client2, 'websocket') else client2,
        session_id,
        user_id="user-123",
        subscribed_events={
            "research.session.started",
            "research.session.completed",
            "research.task.completed"  # Mobile gets fewer updates
        }
    )
    
    await websocket_manager.connect(
        client3.websocket if hasattr(client3, 'websocket') else client3,
        session_id,
        user_id="admin-456",
        subscribed_events={
            "research.session.started",
            "research.session.completed",
            "research.plan.generated",
            "research.report.generated"  # Dashboard gets planning updates
        }
    )
    
    print(f"   ✅ Connected 3 WebSocket clients to session: {session_id}")
    print(f"   📱 Desktop Client: Full updates")
    print(f"   📱 Mobile Client: Essential updates only")
    print(f"   📱 Dashboard Client: Planning & completion updates")
    
    # Step 3: Simulate Research Event Flow
    print("\n3️⃣ Simulating Research Event Flow...")
    
    correlation_id = f"demo-{session_id}"
    
    # Start research session
    session_event = ResearchSessionStarted(
        session_id=session_id,
        project_id="websocket-demo-project",
        query="How do event-driven WebSocket updates improve user experience?",
        user_id="user-123",
        estimated_duration_minutes=15,
        correlation_id=correlation_id
    )
    
    print("   📤 Publishing: ResearchSessionStarted")
    await event_bus.publish(session_event)
    await asyncio.sleep(0.1)  # Allow processing
    
    # Generate research plan
    plan_event = ResearchPlanGenerated(
        session_id=session_id,
        plan_data={
            "total_tasks": 3,
            "estimated_duration_minutes": 15,
            "research_approach": "Comprehensive analysis",
            "plan_summary": "Three-phase research covering technical implementation, user experience, and performance benefits"
        },
        correlation_id=correlation_id
    )
    
    print("   📤 Publishing: ResearchPlanGenerated")
    await event_bus.publish(plan_event)
    await asyncio.sleep(0.1)
    
    # Simulate 3 research tasks
    for i in range(1, 4):
        task_id = f"task-{i}-{uuid4().hex[:6]}"
        
        # Start task
        task_start_event = ResearchTaskStarted(
            task_id=task_id,
            session_id=session_id,
            task_description=f"Research Phase {i}: {['Technical Implementation', 'User Experience', 'Performance Benefits'][i-1]}",
            estimated_tool_calls=8,
            correlation_id=correlation_id
        )
        
        print(f"   📤 Publishing: ResearchTaskStarted (Task {i})")
        await event_bus.publish(task_start_event)
        await asyncio.sleep(0.1)
        
        # Simulate progress updates
        for progress in [25, 50, 75, 100]:
            progress_event = ResearchTaskProgress(
                task_id=task_id,
                session_id=session_id,
                progress_percentage=progress,
                progress_message=f"Phase {i} progress: {progress}%",
                current_action=f"Analyzing {['APIs', 'UX patterns', 'metrics'][i-1]}",
                tools_used=progress // 25 * 2,
                sources_found=progress // 25 * 3,
                correlation_id=correlation_id
            )
            
            if progress % 50 == 0:  # Only log major progress
                print(f"   📤 Publishing: ResearchTaskProgress (Task {i}: {progress}%)")
            await event_bus.publish(progress_event)
            await asyncio.sleep(0.05)
        
        # Complete task
        task_complete_event = ResearchTaskCompleted(
            task_id=task_id,
            session_id=session_id,
            task_description=f"Research Phase {i}: {['Technical Implementation', 'User Experience', 'Performance Benefits'][i-1]}",
            research_output=f"Comprehensive analysis of {['technical implementation aspects', 'user experience improvements', 'performance optimization benefits'][i-1]}",
            duration_seconds=180 + i * 30,
            tool_calls_used=8,
            sources_count=12,
            correlation_id=correlation_id
        )
        
        print(f"   📤 Publishing: ResearchTaskCompleted (Task {i})")
        await event_bus.publish(task_complete_event)
        await asyncio.sleep(0.1)
    
    # Generate report
    report_event = ResearchReportGenerated(
        session_id=session_id,
        report_data={
            "report_length": 2500,
            "sections_count": 5,
            "sources_cited": 36,
            "quality_score": 0.92
        },
        correlation_id=correlation_id
    )
    
    print("   📤 Publishing: ResearchReportGenerated")
    await event_bus.publish(report_event)
    await asyncio.sleep(0.1)
    
    # Complete session
    session_complete_event = ResearchSessionCompleted(
        session_id=session_id,
        project_id="websocket-demo-project",
        query="How do event-driven WebSocket updates improve user experience?",
        total_tasks=3,
        successful_tasks=3,
        failed_tasks=0,
        total_duration_seconds=690,
        total_tool_calls=24,
        final_report_length=2500,
        user_id="user-123",
        correlation_id=correlation_id
    )
    
    print("   📤 Publishing: ResearchSessionCompleted")
    await event_bus.publish(session_complete_event)
    await asyncio.sleep(0.2)  # Final processing
    
    # Step 4: Show WebSocket Results
    print("\n4️⃣ WebSocket Integration Results:")
    print("=" * 50)
    
    # Show connection stats
    stats = websocket_manager.get_connection_stats()
    print(f"📊 Connection Statistics:")
    print(f"   Total Connections: {stats['total_connections']}")
    print(f"   Active Sessions: {stats['active_sessions']}")
    print(f"   Connections per Session: {stats['connections_per_session']}")
    
    # Show messages received by each client
    print(f"\n📱 Client Message Summary:")
    
    clients = {
        "Desktop": client1,
        "Mobile": client2, 
        "Dashboard": client3
    }
    
    for client_name, client in clients.items():
        messages = client.get_messages()
        print(f"\n   {client_name} Client ({len(messages)} messages):")
        
        event_types = {}
        for msg in messages:
            msg_type = msg.get('type', 'unknown')
            event_types[msg_type] = event_types.get(msg_type, 0) + 1
        
        for event_type, count in event_types.items():
            print(f"     - {event_type}: {count}")
    
    # Show detailed message examples
    print(f"\n📋 Sample Messages (Desktop Client):")
    desktop_messages = client1.get_messages()
    
    # Show first few message types
    for i, msg in enumerate(desktop_messages[:5]):
        print(f"   {i+1}. {msg.get('type')} - {msg.get('ui', {}).get('message', 'No UI message')}")
        if msg.get('ui', {}).get('progress') is not None:
            print(f"      Progress: {msg['ui']['progress']}%")
    
    if len(desktop_messages) > 5:
        print(f"   ... and {len(desktop_messages) - 5} more messages")
    
    print("\n" + "=" * 60)
    print("🎉 Event-Driven WebSocket Integration Demo Complete!")
    print("\nWhat was demonstrated:")
    print("✅ Event-driven WebSocket updates (no direct calls)")
    print("✅ Multiple client connections with different subscriptions")
    print("✅ Automatic event filtering and routing")
    print("✅ Real-time progress updates and notifications")
    print("✅ Specialized handlers for different event types")
    print("✅ Comprehensive UI message formatting")
    print("✅ Connection management and statistics")
    
    print("\n🔧 Integration Points:")
    print("✅ Domain events → WebSocket bridge → Client updates")
    print("✅ Event filtering based on client subscriptions")  
    print("✅ UI-specific message formatting for different clients")
    print("✅ Automatic correlation and session management")
    
    print("\n📈 Benefits:")
    print("✅ Decoupled: Research logic independent of WebSocket code")
    print("✅ Scalable: Multiple clients, filtered subscriptions")
    print("✅ Reliable: Event-driven updates are guaranteed")
    print("✅ Flexible: Easy to add new event types and handlers")
    
    # Cleanup
    await event_bus.stop()
    print("\n✅ Cleanup completed")
    
    return True


async def main():
    """Run the WebSocket integration demo"""
    print("🌟 DeepResearch Phase 2: WebSocket Integration Demo")
    print("This demonstrates event-driven real-time updates:")
    print("- Domain events trigger WebSocket messages")
    print("- Multiple clients with filtered subscriptions")
    print("- Specialized handlers for different UI needs")
    print("- Complete separation of concerns")
    print("")
    
    success = await simulate_research_workflow()
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
