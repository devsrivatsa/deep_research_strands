"""
Observability wrapper for research orchestrator.
Provides Langfuse integration and performance tracking for Phase 3.
"""

import logging
import time
from functools import wraps
from typing import Any, Callable, Optional, Dict
from infrastructure.observability import observe_research_function

logger = logging.getLogger(__name__)


def observe_orchestrator_function(function_name: str):
    """
    Decorator to observe research orchestrator functions with Langfuse.
    
    Args:
        function_name: Name of the function being observed
    """
    def decorator(func: Callable) -> Callable:
        @observe_research_function(f"research_orchestrator.{function_name}")
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                # Extract session_id from args/kwargs if available
                session_id = None
                if args and hasattr(args[0], 'session_id'):
                    session_id = args[0].session_id
                elif 'session_id' in kwargs:
                    session_id = kwargs['session_id']
                
                logger.info(f"Starting {function_name} for session {session_id}")
                
                # Execute the function
                result = await func(*args, **kwargs)
                
                execution_time = time.time() - start_time
                logger.info(f"Completed execution of {function_name} for session {session_id} in {execution_time:.2f}s")
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Failed {function_name} for session {session_id} after {execution_time:.2f}s: {e}")
                raise
                
        return wrapper
    return decorator


class OrchestratorPerformanceTracker:
    """
    Performance tracker for research orchestrator operations.
    Provides detailed timing and metrics for different phases.
    """
    
    def __init__(self):
        self.phase_timings: Dict[str, float] = {}
        self.phase_start_times: Dict[str, float] = {}
        self.operation_counts: Dict[str, int] = {}
        self.error_counts: Dict[str, int] = {}
    
    def start_phase(self, phase_name: str) -> None:
        """Start timing a phase."""
        self.phase_start_times[phase_name] = time.time()
        logger.debug(f"Started timing phase: {phase_name}")
    
    def end_phase(self, phase_name: str) -> float:
        """End timing a phase and return duration."""
        if phase_name not in self.phase_start_times:
            logger.warning(f"Phase {phase_name} was not started")
            return 0.0
            
        duration = time.time() - self.phase_start_times[phase_name]
        self.phase_timings[phase_name] = duration
        
        # Increment operation count
        self.operation_counts[phase_name] = self.operation_counts.get(phase_name, 0) + 1
        
        logger.debug(f"Phase {phase_name} completed in {duration:.2f}s")
        return duration
    
    def record_error(self, phase_name: str) -> None:
        """Record an error in a phase."""
        self.error_counts[phase_name] = self.error_counts.get(phase_name, 0) + 1
        logger.warning(f"Error recorded in phase {phase_name}")
    
    def get_phase_duration(self, phase_name: str) -> float:
        """Get duration of a specific phase."""
        return self.phase_timings.get(phase_name, 0.0)
    
    def get_total_duration(self) -> float:
        """Get total duration across all phases."""
        return sum(self.phase_timings.values())
    
    def get_success_rate(self, phase_name: str) -> float:
        """Get success rate for a specific phase."""
        total_ops = self.operation_counts.get(phase_name, 0)
        errors = self.error_counts.get(phase_name, 0)
        
        if total_ops == 0:
            return 1.0
            
        return (total_ops - errors) / total_ops
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        return {
            "phase_timings": self.phase_timings.copy(),
            "operation_counts": self.operation_counts.copy(),
            "error_counts": self.error_counts.copy(),
            "total_duration": self.get_total_duration(),
            "success_rates": {
                phase: self.get_success_rate(phase)
                for phase in self.operation_counts.keys()
            }
        }
    
    def reset(self) -> None:
        """Reset all performance tracking."""
        self.phase_timings.clear()
        self.phase_start_times.clear()
        self.operation_counts.clear()
        self.error_counts.clear()
        logger.debug("Performance tracker reset")


class OrchestratorMetricsCollector:
    """
    Metrics collector for research orchestrator.
    Collects and aggregates performance metrics for observability.
    """
    
    def __init__(self):
        self.performance_tracker = OrchestratorPerformanceTracker()
        self.session_metrics: Dict[str, Dict[str, Any]] = {}
    
    def start_session_tracking(self, session_id: str) -> None:
        """Start tracking metrics for a new session."""
        self.session_metrics[session_id] = {
            "start_time": time.time(),
            "phases": {},
            "total_duration": 0.0,
            "success": False,
            "error_count": 0
        }
        logger.debug(f"Started tracking metrics for session {session_id}")
    
    def record_phase_metrics(self, session_id: str, phase_name: str, 
                           duration: float, success: bool, error_message: Optional[str] = None) -> None:
        """Record metrics for a specific phase."""
        if session_id not in self.session_metrics:
            logger.warning(f"Session {session_id} not being tracked")
            return
            
        self.session_metrics[session_id]["phases"][phase_name] = {
            "duration": duration,
            "success": success,
            "error_message": error_message,
            "timestamp": time.time()
        }
        
        if not success:
            self.session_metrics[session_id]["error_count"] += 1
            
        logger.debug(f"Recorded metrics for phase {phase_name} in session {session_id}")
    
    def end_session_tracking(self, session_id: str, success: bool, final_output: Optional[str] = None) -> Dict[str, Any]:
        """End tracking for a session and return final metrics."""
        if session_id not in self.session_metrics:
            logger.warning(f"Session {session_id} not being tracked")
            return {}
            
        session_data = self.session_metrics[session_id]
        session_data["end_time"] = time.time()
        session_data["total_duration"] = session_data["end_time"] - session_data["start_time"]
        session_data["success"] = success
        session_data["final_output"] = final_output
        
        # Calculate summary metrics
        total_phases = len(session_data["phases"])
        successful_phases = sum(1 for phase in session_data["phases"].values() if phase["success"])
        
        summary = {
            "session_id": session_id,
            "total_duration": session_data["total_duration"],
            "total_phases": total_phases,
            "successful_phases": successful_phases,
            "success_rate": successful_phases / total_phases if total_phases > 0 else 0.0,
            "error_count": session_data["error_count"],
            "success": success,
            "phases": session_data["phases"]
        }
        
        logger.info(f"Session {session_id} completed with success rate: {summary['success_rate']:.2%}")
        return summary
    
    def get_session_metrics(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a specific session."""
        return self.session_metrics.get(session_id)
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all sessions."""
        return self.session_metrics.copy()
    
    def cleanup_old_sessions(self, max_age_hours: int = 24) -> None:
        """Clean up old session metrics."""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        sessions_to_remove = []
        for session_id, metrics in self.session_metrics.items():
            if "start_time" in metrics:
                age = current_time - metrics["start_time"]
                if age > max_age_seconds:
                    sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            del self.session_metrics[session_id]
            
        if sessions_to_remove:
            logger.info(f"Cleaned up {len(sessions_to_remove)} old session metrics")


# Global instances for easy access
performance_tracker = OrchestratorPerformanceTracker()
metrics_collector = OrchestratorMetricsCollector()
