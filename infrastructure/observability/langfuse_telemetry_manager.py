"""
Enhanced Telemetry Manager using Langfuse Python SDK v3.

This version leverages the native Langfuse SDK which is built on OpenTelemetry,
simplifying our integration while maintaining full compatibility with Strands Telemetry.
"""

import logging
import os
from typing import Optional, Dict, Any
from opentelemetry import trace
from opentelemetry.trace import Tracer
from strands.telemetry import StrandsTelemetry

# Import Langfuse SDK v3
from langfuse import Langfuse, observe
try:
    from langfuse.openai import openai as langfuse_openai
except ImportError:
    langfuse_openai = None

from config import Config

logger = logging.getLogger(__name__)


class LangfuseTelemetryManager:
    """
    Enhanced telemetry manager using Langfuse Python SDK v3.
    
    This integrates:
    - Langfuse SDK v3 (built on OpenTelemetry)
    - Strands Telemetry for agent tracing  
    - Domain events with automatic correlation
    """
    
    def __init__(self, config: Config):
        self.config = config
        self._strands_telemetry: Optional[StrandsTelemetry] = None
        self._langfuse_client = None
        self._tracer: Optional[Tracer] = None
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize telemetry with Langfuse SDK v3"""
        if self._initialized:
            logger.warning("Telemetry already initialized")
            return
        
        try:
            logger.info("Initializing telemetry with Langfuse SDK v3...")
            
            # Initialize Langfuse client (handles OpenTelemetry setup automatically)
            if self.config.langfuse_public_key and self.config.langfuse_secret_key:
                # Set environment variables for Langfuse
                os.environ["LANGFUSE_PUBLIC_KEY"] = self.config.langfuse_public_key
                os.environ["LANGFUSE_SECRET_KEY"] = self.config.langfuse_secret_key
                
                if self.config.langfuse_host:
                    os.environ["LANGFUSE_HOST"] = self.config.langfuse_host
                    logger.info(f"Connecting to Langfuse at: {self.config.langfuse_host}")
                else:
                    logger.warning("LANGFUSE_HOST not set, using default cloud instance")
                
                # Initialize Langfuse client (this automatically sets up OpenTelemetry)
                self._langfuse_client = Langfuse()
                
                # Test the connection
                try:
                    # Try to get a simple API call to verify connection
                    test_response = self._langfuse_client.get_project()
                    logger.info(f"✅ Langfuse client initialized successfully: {self.config.langfuse_host}")
                    logger.info(f"Project: {test_response.get('name', 'Unknown')}")
                except Exception as e:
                    logger.error(f"❌ Failed to connect to Langfuse at {self.config.langfuse_host}: {e}")
                    logger.warning("Telemetry will continue with limited functionality")
                    self._langfuse_client = None
            else:
                logger.warning("⚠️ Langfuse credentials not provided, using OpenTelemetry only")
            
            # Configure sampling
            if self.config.trace_sample_rate < 1.0:
                os.environ["OTEL_TRACES_SAMPLER"] = "traceidratio"
                os.environ["OTEL_TRACES_SAMPLER_ARG"] = str(self.config.trace_sample_rate)
            
            # Set service metadata
            os.environ["OTEL_SERVICE_NAME"] = "deepresearch-system"
            os.environ["OTEL_RESOURCE_ATTRIBUTES"] = (
                "service.name=deepresearch-system,"
                "service.version=1.0.0,"
                "deployment.environment=development"
            )
            
            # Initialize Strands Telemetry (now works with Langfuse's OpenTelemetry setup)
            self._strands_telemetry = StrandsTelemetry()
            
            if self.config.enable_tracing:
                # Strands will use the existing OpenTelemetry setup from Langfuse
                if self._langfuse_client:
                    logger.info("✅ Strands Telemetry using Langfuse's OpenTelemetry setup")
                else:
                    # Fallback to manual OTLP setup if no Langfuse
                    self._strands_telemetry.setup_otlp_exporter()
                    logger.info("✅ Strands Telemetry using manual OTLP setup")
            
            if self.config.enable_console_export:
                self._strands_telemetry.setup_console_exporter()
                logger.info("✅ Console exporter enabled for development")
            
            # Get the tracer for manual instrumentation
            self._tracer = trace.get_tracer("deepresearch.domain.events")
            
            self._initialized = True
            logger.info("Telemetry initialization completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize telemetry: {e}")
            self._initialized = False
            raise
    
    def shutdown(self) -> None:
        """Shutdown telemetry and flush any pending data"""
        if not self._initialized:
            return
        
        try:
            logger.info("Shutting down telemetry...")
            
            # Flush Langfuse data
            if self._langfuse_client:
                self._langfuse_client.flush()
                logger.info("✅ Langfuse data flushed")
            
            # Shutdown OpenTelemetry
            trace.get_tracer_provider().shutdown()
            
            self._initialized = False
            logger.info("✅ Telemetry shutdown completed")
            
        except Exception as e:
            logger.error(f"Error during telemetry shutdown: {e}")
    
    @property
    def tracer(self) -> Tracer:
        """Get the OpenTelemetry tracer for manual instrumentation"""
        if not self._initialized:
            raise RuntimeError("Telemetry not initialized. Call initialize() first.")
        return self._tracer
    
    @property
    def langfuse_client(self):
        """Get the Langfuse client"""
        if not self._initialized:
            raise RuntimeError("Telemetry not initialized. Call initialize() first.")
        return self._langfuse_client
    
    @property
    def strands_telemetry(self) -> StrandsTelemetry:
        """Get the Strands Telemetry instance"""
        if not self._initialized:
            raise RuntimeError("Telemetry not initialized. Call initialize() first.")
        return self._strands_telemetry
    
    @property
    def is_initialized(self) -> bool:
        """Check if telemetry is initialized"""
        return self._initialized
    
    def create_agent_with_tracing(self, **agent_kwargs):
        """
        Create a Strands Agent with enhanced Langfuse tracing.
        
        This automatically adds Langfuse trace attributes and context.
        """
        if not self._initialized:
            raise RuntimeError("Telemetry not initialized. Call initialize() first.")
        
        from strands import Agent
        
        # Extract Langfuse-specific attributes
        langfuse_attrs = {}
        if 'session_id' in agent_kwargs.get('trace_attributes', {}):
            langfuse_attrs['session_id'] = agent_kwargs['trace_attributes']['session_id']
        if 'user_id' in agent_kwargs.get('trace_attributes', {}):
            langfuse_attrs['user_id'] = agent_kwargs['trace_attributes']['user_id']
        
        # Create agent with enhanced trace attributes
        enhanced_attrs = {
            "service.name": "deepresearch-system",
            "agent.framework": "strands",
            "observability.provider": "langfuse",
            **agent_kwargs.get('trace_attributes', {})
        }
        agent_kwargs['trace_attributes'] = enhanced_attrs
        
        # Strands automatically uses the configured telemetry
        return Agent(**agent_kwargs)
    
    def start_langfuse_span(self, name: str, **kwargs):
        """Start a Langfuse span with context management"""
        if not self._langfuse_client:
            raise RuntimeError("Langfuse client not available")
        
        return self._langfuse_client.span(name=name, **kwargs)
    
    def start_langfuse_generation(self, name: str, model: str, **kwargs):
        """Start a Langfuse generation for LLM calls"""
        if not self._langfuse_client:
            raise RuntimeError("Langfuse client not available")
        
        return self._langfuse_client.generation(
            name=name, 
            model=model, 
            **kwargs
        )
    
    def update_current_trace(self, **kwargs):
        """Update the current Langfuse trace with attributes"""
        # Note: In Langfuse SDK, traces are updated through spans/generations
        # This method is for compatibility
        pass
    
    def get_trace_context(self) -> dict:
        """Get current trace context for correlation"""
        if not self._initialized:
            return {}
        
        try:
            current_span = trace.get_current_span()
            if current_span and current_span.is_recording():
                span_context = current_span.get_span_context()
                return {
                    "trace_id": f"{span_context.trace_id:032x}",
                    "span_id": f"{span_context.span_id:016x}",
                    "trace_flags": span_context.trace_flags
                }
        except Exception as e:
            logger.debug(f"Could not get trace context: {e}")
        
        return {}


# Enhanced decorators using Langfuse SDK
def observe_research_function(name: Optional[str] = None, **langfuse_kwargs):
    """
    Enhanced @observe decorator that integrates with our research domain.
    
    Usage:
        @observe_research_function(name="research_task", session_id="session-123")
        async def execute_research_task(query: str):
            # Function is automatically traced in Langfuse
            return result
    """
    def decorator(func):
        # Apply Langfuse's @observe decorator with our enhancements
        langfuse_observe = observe(name=name or func.__name__, **langfuse_kwargs)
        return langfuse_observe(func)
    
    return decorator


def with_research_generation(model: str, name: Optional[str] = None, **kwargs):
    """
    Decorator for LLM generation functions that creates Langfuse generations.
    
    Usage:
        @with_research_generation(model="gpt-4", name="answer_generation")
        async def generate_answer(prompt: str):
            # LLM call is automatically tracked as a Langfuse generation
            return llm_response
    """
    def decorator(func):
        async def async_wrapper(*args, **func_kwargs):
            manager = get_langfuse_telemetry_manager()
            if manager and manager.langfuse_client:
                with manager.langfuse_client.start_as_current_generation(
                    name=name or func.__name__, 
                    model=model, 
                    **kwargs
                ) as generation:
                    result = await func(*args, **func_kwargs)
                    if isinstance(result, str):
                        generation.update(output=result)
                    return result
            else:
                return await func(*args, **func_kwargs)
        
        def sync_wrapper(*args, **func_kwargs):
            manager = get_langfuse_telemetry_manager()
            if manager and manager.langfuse_client:
                with manager.langfuse_client.start_as_current_generation(
                    name=name or func.__name__, 
                    model=model, 
                    **kwargs
                ) as generation:
                    result = func(*args, **func_kwargs)
                    if isinstance(result, str):
                        generation.update(output=result)
                    return result
            else:
                return func(*args, **func_kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Global manager instance
_langfuse_telemetry_manager: Optional[LangfuseTelemetryManager] = None


def get_langfuse_telemetry_manager() -> Optional[LangfuseTelemetryManager]:
    """Get the global Langfuse telemetry manager instance"""
    return _langfuse_telemetry_manager


def initialize_langfuse_telemetry(config: Config) -> LangfuseTelemetryManager:
    """Initialize global Langfuse telemetry manager"""
    global _langfuse_telemetry_manager
    
    if _langfuse_telemetry_manager is None:
        _langfuse_telemetry_manager = LangfuseTelemetryManager(config)
        _langfuse_telemetry_manager.initialize()
    
    return _langfuse_telemetry_manager


def shutdown_langfuse_telemetry():
    """Shutdown global Langfuse telemetry manager"""
    global _langfuse_telemetry_manager
    
    if _langfuse_telemetry_manager:
        _langfuse_telemetry_manager.shutdown()
        _langfuse_telemetry_manager = None
