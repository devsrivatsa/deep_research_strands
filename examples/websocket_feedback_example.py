#!/usr/bin/env python3
"""
WebSocket-based Human Feedback Example

This example demonstrates how the human feedback manager integrates with
websockets to provide real-time plan presentation and feedback collection.
"""

import asyncio
import json
import logging
from typing import Dict, Any

from infrastructure.events.simple_event_bus import SimpleEventBus
from infrastructure.websockets.websocket_manager import ResearchWebSocketManager
from infrastructure.websockets.websocket_handlers import WebSocketEventHandlers
from domain.events.research_events import HumanFeedbackRequired, HumanFeedbackReceived
from agents.research_orchestrator.sub_agents.human_feedback_manager import present_plan, analyze_feedback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockResearchPlan:
    """Mock research plan for demonstration"""
    def __init__(self, plan_type: str, content: str):
        self.plan_type = plan_type
        self.content = content
    
    def __str__(self):
        return f"{self.plan_type} Plan: {self.content}"


class MockQueryAnalysis:
    """Mock query analysis for demonstration"""
    def __init__(self):
        self.query_type = {"query_type": "depth_first", "reasoning": "Complex multi-faceted query"}
        self.query_components = {
            "main_concepts": ["AI", "healthcare", "ethics"],
            "key_entities": ["medical professionals", "patients", "AI systems"],
            "relationships": ["AI assists medical decisions", "ethical considerations"]
        }


async def simulate_feedback_workflow():
    """Simulate the complete feedback workflow"""
    
    # Initialize event bus and websocket infrastructure
    event_bus = SimpleEventBus()
    websocket_manager = ResearchWebSocketManager()
    websocket_handlers = WebSocketEventHandlers(websocket_manager)
    
    # Register websocket handlers with event bus
    for handler in websocket_handlers.get_all_handlers():
        event_bus.subscribe(handler)
    
    # Start the event bus
    await event_bus.start()
    
    # Simulate session data
    session_id = "demo-session-123"
    user_id = "demo-user"
    
    # Create mock research plan and query analysis
    research_plan = MockResearchPlan(
        "Depth-First",
        "Investigate AI ethics in healthcare through multiple perspectives: medical, legal, and patient viewpoints"
    )
    query_analysis = MockQueryAnalysis()
    
    try:
        logger.info("=== Starting WebSocket Feedback Workflow Demo ===")
        
        # Step 1: Present the plan (this would normally come from the orchestrator)
        logger.info("Step 1: Presenting research plan to user...")
        plan_presentation = await present_plan(research_plan, query_analysis.__dict__)
        logger.info(f"Plan presentation: {plan_presentation[:100]}...")
        
        # Step 2: Emit HumanFeedbackRequired event
        logger.info("Step 2: Emitting HumanFeedbackRequired event...")
        feedback_event = HumanFeedbackRequired(
            session_id=session_id,
            plan_presentation=plan_presentation,
            research_plan=research_plan,
            query_analysis=query_analysis.__dict__,
            revision_number=0,
            user_id=user_id
        )
        
        # Publish the event - this will trigger websocket handlers
        await event_bus.publish(feedback_event)
        logger.info("✅ HumanFeedbackRequired event published")
        
        # Step 3: Simulate user feedback (in real scenario, this comes from UI via websocket)
        logger.info("Step 3: Simulating user feedback...")
        user_feedback = {
            "action": "modify_existing",
            "modification_option": "same_approach",
            "modification_feedback": {
                "retain": "Keep the multi-perspective approach",
                "change": "Add more focus on patient privacy concerns",
                "addition": "Include regulatory compliance aspects",
                "deletion": "Reduce emphasis on legal technicalities"
            }
        }
        
        # Step 4: Analyze the feedback
        logger.info("Step 4: Analyzing user feedback...")
        feedback_decision = await analyze_feedback(
            user_feedback=json.dumps(user_feedback),
            research_plan=research_plan,
            query_analysis=query_analysis.__dict__
        )
        
        logger.info(f"Feedback analysis result: {feedback_decision}")
        
        # Step 5: Emit HumanFeedbackReceived event
        logger.info("Step 5: Emitting HumanFeedbackReceived event...")
        feedback_received_event = HumanFeedbackReceived(
            session_id=session_id,
            feedback_type=user_feedback["action"],
            feedback_data=user_feedback,
            revision_number=0,
            user_id=user_id
        )
        
        await event_bus.publish(feedback_received_event)
        logger.info("✅ HumanFeedbackReceived event published")
        
        logger.info("=== WebSocket Feedback Workflow Demo Completed ===")
        
    except Exception as e:
        logger.error(f"Error in feedback workflow demo: {e}")
        raise
    
    finally:
        # Cleanup
        await event_bus.stop()
        logger.info("Event bus stopped")


async def main():
    """Main entry point"""
    try:
        await simulate_feedback_workflow()
    except KeyboardInterrupt:
        logger.info("Demo interrupted by user")
    except Exception as e:
        logger.error(f"Demo failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())
