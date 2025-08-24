from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
from datetime import datetime

class ResearchEventType(Enum):
    TASK_STARTED = "task_started"
    TASK_PROGRESS = "task_progress" 
    TASK_COMPLETED = "task_completed"
    TASK_FAILED = "task_failed"
    RESEARCH_JOB_COMPLETED = "research_job_completed"
    ALL_JOBS_COMPLETED = "all_jobs_completed"

@dataclass
class ResearchEvent:
    type: ResearchEventType
    task_id: str
    data: Dict[str, Any]
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class ResearchEventBus:
    def __init__(self):
        self.handlers: Dict[ResearchEventType, List[Callable]] = {}
        self.event_history: List[ResearchEvent] = []
    
    def on(self, event_type: ResearchEventType, handler: Callable):
        """Register an event handler"""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
    
    async def emit(self, event: ResearchEvent):
        """Emit an event to all registered handlers"""
        self.event_history.append(event)
        
        # Call all handlers for this event type
        handlers = self.handlers.get(event.type, [])
        if handlers:
            await asyncio.gather(*[handler(event) for handler in handlers])

# Example usage in your research conductor
class EventDrivenResearchConductor:
    def __init__(self):
        self.event_bus = ResearchEventBus()
        self.setup_event_handlers()
    
    def setup_event_handlers(self):
        # Progress tracking
        self.event_bus.on(ResearchEventType.TASK_STARTED, self.log_task_start)
        self.event_bus.on(ResearchEventType.TASK_COMPLETED, self.log_task_completion)
        self.event_bus.on(ResearchEventType.TASK_FAILED, self.handle_task_failure)
        
        # UI updates (if you have a frontend)
        self.event_bus.on(ResearchEventType.TASK_PROGRESS, self.update_ui_progress)
        
        # Persistence
        self.event_bus.on(ResearchEventType.TASK_COMPLETED, self.save_task_result)
    
    async def log_task_start(self, event: ResearchEvent):
        print(f"[{event.timestamp}] Started task: {event.task_id}")
    
    async def log_task_completion(self, event: ResearchEvent):
        duration = event.data.get('duration', 'unknown')
        print(f"[{event.timestamp}] Completed task: {event.task_id} in {duration}s")
    
    async def handle_task_failure(self, event: ResearchEvent):
        error = event.data.get('error', 'Unknown error')
        print(f"[{event.timestamp}] Task failed: {event.task_id} - {error}")
        # Could implement retry logic here
    
    async def update_ui_progress(self, event: ResearchEvent):
        # Send progress to frontend via WebSocket
        progress = event.data.get('progress', 0)
        # await websocket.send({"task_id": event.task_id, "progress": progress})
        pass
    
    async def save_task_result(self, event: ResearchEvent):
        # Save to database or file
        result = event.data.get('result')
        # await database.save_research_result(event.task_id, result)
        pass

    async def _single_task_rloop_with_events(self, rt: str, task_id: str):
        """Enhanced version with event emission"""
        try:
            # Emit start event
            await self.event_bus.emit(ResearchEvent(
                type=ResearchEventType.TASK_STARTED,
                task_id=task_id,
                data={"research_task": rt}
            ))
            
            start_time = datetime.now()
            
            # Your existing research logic
            research_output = research_task(rt)
            
            # Emit progress event (optional)
            await self.event_bus.emit(ResearchEvent(
                type=ResearchEventType.TASK_PROGRESS,
                task_id=task_id,
                data={"progress": 50, "stage": "compression"}
            ))
            
            compressed_research_output = compress_research(research_output)
            final_research_review = verify_research(compressed_research_output)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            # Emit completion event
            await self.event_bus.emit(ResearchEvent(
                type=ResearchEventType.TASK_COMPLETED,
                task_id=task_id,
                data={
                    "result": (rt, research_output, compressed_research_output, final_research_review),
                    "duration": duration,
                    "verdict": final_research_review.research_verdict
                }
            ))
            
            return (rt, research_output, compressed_research_output, final_research_review)
            
        except Exception as e:
            # Emit failure event
            await self.event_bus.emit(ResearchEvent(
                type=ResearchEventType.TASK_FAILED,
                task_id=task_id,
                data={"error": str(e), "research_task": rt}
            ))
            raise