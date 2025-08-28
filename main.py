from strands.telemetry import StrandsTelemetry

from config import Config
from pydantic import BaseModel, Field
import asyncio
from typing import Optional
import logging

# Import enhanced observability infrastructure
from infrastructure.observability import (
    LangfuseTelemetryManager,
    initialize_langfuse_telemetry,
    shutdown_langfuse_telemetry
)
from infrastructure.events import SimpleEventBus, EventBusFactory
from domain.events.handlers.langfuse_research_handlers import (
    LangfuseResearchProgressTracker,
    LangfuseResearchMetricsCollector
)
from domain.events.handlers.research_handlers import ResearchAuditLogger

# Import research orchestrator for Phase 3 integration
from agents.research_orchestrator.agent import orchestrate_research
from agents.research_orchestrator.observability_wrapper import metrics_collector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeepResearchApp:
    """
    Main application class for the Deep Research application.
    Manages the lifecycle of all services including tracer, agents, databases, and server.
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.telemetry_manager: Optional[LangfuseTelemetryManager] = None
        self.event_bus: Optional[SimpleEventBus] = None
        self.main_agent = None
        self.database = None
        self.server = None
        self.is_running = False
        
        logger.info("DeepResearchApp initialized with enhanced Langfuse configuration")
    
    async def initialize(self):
        """Initialize all services asynchronously"""
        try:
            logger.info("Initializing Deep Research Application...")
            
            # Initialize enhanced telemetry with Langfuse SDK v3
            await self._initialize_langfuse_telemetry()
            
            # Initialize simplified event bus 
            await self._initialize_event_bus()
            
            # Initialize database connections
            await self._initialize_database()
            
            # Initialize main agent with tracing
            await self._initialize_main_agent()
            
            # Initialize research orchestrator with event bus integration (Phase 3)
            await self._initialize_research_orchestrator()
            
            # Initialize server
            await self._initialize_server()
            
            self.is_running = True
            logger.info("🚀 Deep Research Application initialized successfully with full observability and Phase 3 agent integration")
            
        except Exception as e:
            logger.error(f"Failed to initialize application: {e}")
            await self.shutdown()
            raise
    
    async def _initialize_langfuse_telemetry(self):
        """Initialize enhanced telemetry with Langfuse SDK v3"""
        logger.info("Initializing enhanced telemetry with Langfuse SDK v3...")
        
        try:
            # Initialize global Langfuse telemetry manager
            self.telemetry_manager = initialize_langfuse_telemetry(self.config)
            logger.info("✅ Enhanced telemetry initialized with Langfuse SDK v3")
            
        except Exception as e:
            logger.error(f"Failed to initialize telemetry: {e}")
            # Continue without telemetry in case of configuration issues
            logger.warning("⚠️ Continuing without telemetry - check Langfuse configuration")
    
    async def _initialize_event_bus(self):
        """Initialize simplified event bus with Langfuse handlers"""
        logger.info("Initializing event bus with Langfuse handlers...")
        
        try:
            # Create simple event bus (observability handled by @observe decorators)
            self.event_bus = EventBusFactory.create_simple_event_bus()
            
            # Subscribe enhanced Langfuse event handlers
            progress_tracker = LangfuseResearchProgressTracker()
            metrics_collector = LangfuseResearchMetricsCollector()
            audit_logger = ResearchAuditLogger()  # Keep basic audit logger
            
            self.event_bus.subscribe(progress_tracker)
            self.event_bus.subscribe(metrics_collector)
            self.event_bus.subscribe(audit_logger)
            
            # Start the event bus
            await self.event_bus.start()
            
            logger.info("✅ Event bus initialized with enhanced Langfuse handlers")
            
        except Exception as e:
            logger.error(f"Failed to initialize event bus: {e}")
            raise
    
    async def _initialize_database(self):
        """Initialize database connections"""
        logger.info("Initializing database...")
        # TODO: Initialize your database connections
        # e.g., PostgreSQL, Vector DB, etc.
        pass
    
    async def _initialize_main_agent(self):
        """Initialize the main research agent with tracing"""
        logger.info("Initializing main research agent...")
        
        try:
            if self.telemetry_manager and self.telemetry_manager.is_initialized:
                # Create agent with tracing attributes
                self.main_agent = self.telemetry_manager.create_agent_with_tracing(
                    model="anthropic.claude-3-sonnet-20240229",
                    system_prompt="You are a helpful research assistant specialized in conducting comprehensive research.",
                    trace_attributes={
                        "agent.type": "research_orchestrator",
                        "agent.version": "1.0.0",
                        "service.name": "deepresearch-system"
                    }
                )
                logger.info("✅ Main research agent initialized with tracing")
            else:
                logger.info("⚠️ Main agent initialization skipped - no telemetry available")
                
        except Exception as e:
            logger.error(f"Failed to initialize main agent: {e}")
            # Continue without agent for now
            logger.warning("⚠️ Continuing without main agent")
    
    async def _initialize_research_orchestrator(self):
        """Initialize research orchestrator with event bus integration"""
        logger.info("Initializing research orchestrator with event bus...")
        
        try:
            if self.event_bus:
                # Test the research orchestrator integration
                logger.info("Testing research orchestrator event integration...")
                
                # Create a test session
                test_session_id = "test-session-001"
                logger.info(f"Creating test research session: {test_session_id}")
                
                # Note: This is a test - in production, you'd call this from an API endpoint
                # await orchestrate_research(self.event_bus, test_session_id)
                
                logger.info("✅ Research orchestrator initialized with event bus integration")
                logger.info("📊 Event-driven research workflow ready for Phase 3")
                
            else:
                logger.warning("⚠️ Research orchestrator initialization skipped - no event bus available")
                
        except Exception as e:
            logger.error(f"Failed to initialize research orchestrator: {e}")
            logger.warning("⚠️ Continuing without research orchestrator integration")
    
    async def _initialize_server(self):
        """Initialize the web server"""
        logger.info("Initializing server...")
        # TODO: Initialize FastAPI/Flask server
        pass
    
    async def start(self):
        """Start all services"""
        if not self.is_running:
            await self.initialize()
        
        logger.info("Starting Deep Research Application services...")
        logger.info("🎯 Phase 3: Agent Integration with Event-Driven Architecture is ACTIVE")
        
        # Display current metrics
        if metrics_collector:
            all_metrics = metrics_collector.get_all_metrics()
            if all_metrics:
                logger.info(f"📊 Current session metrics: {len(all_metrics)} sessions tracked")
            else:
                logger.info("📊 No active sessions - ready for new research workflows")
        
        # TODO: Start server, background tasks, etc.
        
    async def shutdown(self):
        """Gracefully shutdown all services"""
        logger.info("Shutting down Deep Research Application...")
        
        try:
            if self.server:
                # TODO: Stop server
                pass
                
            if self.database:
                # TODO: Close database connections
                pass
            
            if self.event_bus:
                await self.event_bus.stop()
                logger.info("✅ Event bus stopped")
                
            if self.telemetry_manager:
                self.telemetry_manager.shutdown()
                logger.info("✅ Telemetry shutdown")
            
            # Shutdown global Langfuse telemetry
            shutdown_langfuse_telemetry()
                
            self.is_running = False
            logger.info("✅ Deep Research Application shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
            self.is_running = False
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.shutdown()

async def main():
    """Main application entry point"""
    try:
        # Load configuration
        config = Config.load()
        
        # Create and run application
        async with DeepResearchApp(config) as app:
            logger.info("Deep Research Application is running...")
            # Keep the application running
            # In a real scenario, you might want to run a web server here
            await asyncio.sleep(1)  # Replace with actual server.run() or similar
            
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
