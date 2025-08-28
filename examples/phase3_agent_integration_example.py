"""
Phase 3: Agent Integration with Event Bus and Observability Example

This example demonstrates the complete integration of research agents with the event bus,
showing how domain events are emitted throughout the research workflow and how
WebSocket clients receive real-time updates.
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any

# Import the event-driven infrastructure
from infrastructure.events import EventBusFactory
from infrastructure.websockets import ResearchWebSocketManager, WebSocketEventBridge
from infrastructure.websockets.websocket_handlers import (
    ResearchSessionWebSocketHandler,
    ResearchTaskWebSocketHandler,
    ResearchProgressWebSocketHandler,
    ResearchPlanningWebSocketHandler
)

# Import the research orchestrator with event integration
from agents.research_orchestrator.agent import orchestrate_research
from agents.research_orchestrator.observability_wrapper import metrics_collector

# Import domain events
from domain.events import (
    ResearchSessionStarted,
    ResearchPlanGenerated,
    ResearchWorkflowStarted,
    ResearchWorkflowCompleted,
    ResearchSessionCompleted
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Phase3IntegrationDemo:
    """
    Demo class for Phase 3 agent integration.
    Simulates a complete research workflow with event emission and WebSocket updates.
    """
    
    def __init__(self):
        self.event_bus = None
        self.websocket_manager = None
        self.event_bridge = None
        self.session_id = None
        self.connected_clients = {}
        
    async def initialize(self):
        """Initialize the Phase 3 integration demo."""
        logger.info("🚀 Initializing Phase 3: Agent Integration Demo...")
        
        # Create event bus
        self.event_bus = EventBusFactory.create_simple_event_bus()
        
        # Create WebSocket manager
        self.websocket_manager = ResearchWebSocketManager()
        
        # Create event bridge
        self.event_bridge = WebSocketEventBridge(self.websocket_manager)
        
        # Subscribe WebSocket handlers to event bus
        self.event_bus.subscribe(ResearchSessionWebSocketHandler())
        self.event_bus.subscribe(ResearchTaskWebSocketHandler())
        self.event_bus.subscribe(ResearchProgressWebSocketHandler())
        self.event_bus.subscribe(ResearchPlanningWebSocketHandler())
        
        # Start event bus
        await self.event_bus.start()
        
        logger.info("✅ Phase 3 integration demo initialized successfully")
        
    async def simulate_websocket_clients(self):
        """Simulate multiple WebSocket clients connecting."""
        logger.info("🔌 Simulating WebSocket client connections...")
        
        # Create different types of clients with different subscription preferences
        clients = {
            "desktop": {
                "name": "Desktop Client",
                "subscribed_events": ["session", "planning", "task", "progress", "workflow"],
                "description": "Full updates for desktop application"
            },
            "mobile": {
                "name": "Mobile Client", 
                "subscribed_events": ["session", "task"],
                "description": "Essential updates for mobile app"
            },
            "dashboard": {
                "name": "Dashboard Client",
                "subscribed_events": ["planning", "workflow", "progress"],
                "description": "Planning and workflow focused updates"
            }
        }
        
        # Simulate client connections
        for client_id, client_config in clients.items():
            # Create a mock WebSocket connection
            mock_websocket = MockWebSocket(client_id)
            
            # Connect to WebSocket manager
            connection = await self.websocket_manager.connect(
                mock_websocket, 
                self.session_id,
                subscribed_events=client_config["subscribed_events"]
            )
            
            self.connected_clients[client_id] = {
                "connection": connection,
                "config": client_config,
                "message_count": 0
            }
            
            logger.info(f"✅ {client_config['name']} connected with subscriptions: {client_config['subscribed_events']}")
        
        logger.info(f"🔌 {len(self.connected_clients)} WebSocket clients connected")
        
    async def run_research_workflow(self):
        """Run the complete research workflow with event emission."""
        logger.info("🔬 Starting research workflow with event-driven architecture...")
        
        try:
            # Start the research orchestration
            logger.info(f"🎯 Starting research orchestration for session {self.session_id}")
            
            # This would normally be called from an API endpoint
            # For demo purposes, we'll simulate the workflow step by step
            
            # Step 1: Emit session started event
            await self._emit_session_started()
            
            # Step 2: Emit planning phase events
            await self._emit_planning_events()
            
            # Step 3: Emit workflow execution events
            await self._emit_workflow_events()
            
            # Step 4: Emit completion events
            await self._emit_completion_events()
            
            logger.info("✅ Research workflow completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Research workflow failed: {e}")
            await self._emit_error_events(str(e))
    
    async def _emit_session_started(self):
        """Emit session started event."""
        logger.info("📡 Emitting ResearchSessionStarted event...")
        
        event = ResearchSessionStarted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_session_started",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            query="Phase 3 Integration Demo: Event-Driven Research Workflow",
            user_id="demo-user-001",
            metadata={
                "demo_mode": True,
                "phase": "3",
                "integration_type": "agent_event_bus"
            }
        )
        
        await self.event_bus.publish(event)
        logger.info("✅ ResearchSessionStarted event emitted")
        
        # Wait for WebSocket processing
        await asyncio.sleep(0.1)
    
    async def _emit_planning_events(self):
        """Emit planning phase events."""
        logger.info("📡 Emitting planning phase events...")
        
        # Simulate planning phase with multiple events
        planning_events = [
            ("ResearchPlanGenerated", {
                "plan": "Comprehensive research plan for Phase 3 integration",
                "planning_duration": 45.2,
                "metadata": {"planning_agent": "research_orchestrator"}
            }),
            ("ResearchWorkflowStarted", {
                "plan_id": str(uuid.uuid4()),
                "workflow_type": "research_execution",
                "estimated_duration": 300.0
            })
        ]
        
        for event_type, event_data in planning_events:
            logger.info(f"📡 Emitting {event_type} event...")
            
            # Create and emit the event
            event_class = globals()[event_type]
            event = event_class(
                aggregate_id=self.session_id,
                correlation_id=str(uuid.uuid4()),
                event_type=event_type.lower(),
                timestamp=datetime.now(),
                version=1,
                session_id=self.session_id,
                **event_data
            )
            
            await self.event_bus.publish(event)
            logger.info(f"✅ {event_type} event emitted")
            
            # Wait for WebSocket processing
            await asyncio.sleep(0.2)
    
    async def _emit_workflow_events(self):
        """Emit workflow execution events."""
        logger.info("📡 Emitting workflow execution events...")
        
        # Simulate task execution with progress updates
        tasks = [
            {"id": "task-1", "name": "Query Analysis", "duration": 12.5},
            {"id": "task-2", "name": "Research Planning", "duration": 23.8},
            {"id": "task-3", "name": "Data Collection", "duration": 67.2},
            {"id": "task-4", "name": "Analysis & Synthesis", "duration": 45.1}
        ]
        
        for task in tasks:
            logger.info(f"📡 Emitting task events for {task['name']}...")
            
            # Task started
            from domain.events.research_events import ResearchTaskStarted
            task_started_event = ResearchTaskStarted(
                aggregate_id=self.session_id,
                correlation_id=str(uuid.uuid4()),
                event_type="research_task_started",
                timestamp=datetime.now(),
                version=1,
                session_id=self.session_id,
                task_id=task["id"],
                task_name=task["name"],
                description=f"Executing {task['name']} for Phase 3 integration demo"
            )
            await self.event_bus.publish(task_started_event)
            
            # Task progress (simulate multiple progress updates)
            from domain.events.research_events import ResearchTaskProgress
            for progress in [25, 50, 75, 100]:
                progress_event = ResearchTaskProgress(
                    aggregate_id=self.session_id,
                    correlation_id=str(uuid.uuid4()),
                    event_type="research_task_progress",
                    timestamp=datetime.now(),
                    version=1,
                    session_id=self.session_id,
                    task_id=task["id"],
                    progress_percentage=progress,
                    current_action=f"Processing {task['name']} - {progress}% complete"
                )
                await self.event_bus.publish(progress_event)
                await asyncio.sleep(0.1)  # Simulate processing time
            
            # Task completed
            from domain.events.research_events import ResearchTaskCompleted
            task_completed_event = ResearchTaskCompleted(
                aggregate_id=self.session_id,
                correlation_id=str(uuid.uuid4()),
                event_type="research_task_completed",
                timestamp=datetime.now(),
                version=1,
                session_id=self.session_id,
                task_id=task["id"],
                result=f"Successfully completed {task['name']}",
                duration=task["duration"],
                metadata={"demo_task": True}
            )
            await self.event_bus.publish(task_completed_event)
            
            logger.info(f"✅ Task {task['name']} completed")
            await asyncio.sleep(0.2)
    
    async def _emit_completion_events(self):
        """Emit completion events."""
        logger.info("📡 Emitting completion events...")
        
        # Workflow completed
        workflow_completed_event = ResearchWorkflowCompleted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_workflow_completed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            output="Phase 3 integration demo completed successfully with event-driven architecture",
            total_tasks=4,
            successful_tasks=4,
            failed_tasks=0,
            total_duration=148.6,
            workflow_type="research_execution"
        )
        await self.event_bus.publish(workflow_completed_event)
        
        # Session completed
        session_completed_event = ResearchSessionCompleted(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_session_completed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            output="Complete research workflow executed with event-driven architecture",
            duration=193.8,
            metadata={
                "demo_session": True,
                "total_events_emitted": 25,
                "success_rate": 100.0
            }
        )
        await self.event_bus.publish(session_completed_event)
        
        logger.info("✅ Completion events emitted")
    
    async def _emit_error_events(self, error_message: str):
        """Emit error events."""
        logger.info("📡 Emitting error events...")
        
        from domain.events.workflow_events import ResearchWorkflowFailed
        error_event = ResearchWorkflowFailed(
            aggregate_id=self.session_id,
            correlation_id=str(uuid.uuid4()),
            event_type="research_workflow_failed",
            timestamp=datetime.now(),
            version=1,
            session_id=self.session_id,
            error_message=error_message,
            failed_at_task="workflow_execution",
            partial_results="Demo workflow failed during execution"
        )
        
        await self.event_bus.publish(error_event)
        logger.info("✅ Error events emitted")
    
    async def display_results(self):
        """Display the results of the Phase 3 integration demo."""
        logger.info("\n" + "="*80)
        logger.info("🎉 PHASE 3: AGENT INTEGRATION DEMO RESULTS")
        logger.info("="*80)
        
        # Display WebSocket client statistics
        logger.info("\n📊 WebSocket Client Statistics:")
        for client_id, client_info in self.connected_clients.items():
            config = client_info["config"]
            message_count = client_info["connection"].message_count
            logger.info(f"  {config['name']}: {message_count} messages received")
            logger.info(f"    Subscriptions: {config['subscribed_events']}")
            logger.info(f"    Description: {config['description']}")
        
        # Display event bus statistics
        if self.event_bus:
            logger.info(f"\n📡 Event Bus Statistics:")
            logger.info(f"  Total handlers: {len(self.event_bus.handlers)}")
            logger.info(f"  Event types handled: {list(set(handler.event_type for handler in self.event_bus.handlers))}")
        
        # Display WebSocket manager statistics
        if self.websocket_manager:
            stats = self.websocket_manager.get_statistics()
            logger.info(f"\n🔌 WebSocket Manager Statistics:")
            logger.info(f"  Total connections: {stats['total_connections']}")
            logger.info(f"  Active sessions: {len(stats['active_sessions'])}")
            logger.info(f"  Session connections: {stats['session_connections']}")
        
        # Display metrics collector statistics
        if metrics_collector:
            all_metrics = metrics_collector.get_all_metrics()
            logger.info(f"\n📈 Metrics Collector Statistics:")
            logger.info(f"  Total sessions tracked: {len(all_metrics)}")
            if all_metrics:
                for session_id, session_metrics in all_metrics.items():
                    logger.info(f"  Session {session_id}:")
                    logger.info(f"    Success: {session_metrics.get('success', 'Unknown')}")
                    logger.info(f"    Total duration: {session_metrics.get('total_duration', 0):.2f}s")
                    logger.info(f"    Phases: {len(session_metrics.get('phases', {}))}")
        
        logger.info("\n" + "="*80)
        logger.info("✅ Phase 3: Agent Integration Demo Completed Successfully!")
        logger.info("="*80)
    
    async def cleanup(self):
        """Clean up resources."""
        logger.info("🧹 Cleaning up Phase 3 integration demo...")
        
        if self.event_bus:
            await self.event_bus.stop()
        
        logger.info("✅ Cleanup completed")


class MockWebSocket:
    """Mock WebSocket for demo purposes."""
    
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.message_count = 0
        self.messages = []
    
    async def send_text(self, message: str):
        """Mock send_text method."""
        self.message_count += 1
        self.messages.append(message)
        logger.debug(f"📤 Mock WebSocket {self.client_id} received: {message[:100]}...")
    
    async def close(self):
        """Mock close method."""
        logger.debug(f"🔌 Mock WebSocket {self.client_id} closed")


async def main():
    """Main demo function."""
    demo = Phase3IntegrationDemo()
    
    try:
        # Initialize the demo
        await demo.initialize()
        
        # Generate session ID
        demo.session_id = str(uuid.uuid4())
        logger.info(f"🎯 Demo session ID: {demo.session_id}")
        
        # Simulate WebSocket clients
        await demo.simulate_websocket_clients()
        
        # Run the research workflow
        await demo.run_research_workflow()
        
        # Display results
        await demo.display_results()
        
    except Exception as e:
        logger.error(f"❌ Demo failed: {e}")
        raise
    
    finally:
        # Cleanup
        await demo.cleanup()


if __name__ == "__main__":
    logger.info("🚀 Starting Phase 3: Agent Integration Demo...")
    asyncio.run(main())
