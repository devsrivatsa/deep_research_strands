"""
Example of how to integrate the streaming research conductor with a web frontend
"""
import asyncio
import json
from typing import Dict, Any
from fastapi import FastAPI, WebSocket
from agents.research_orchestrator.sub_agents.research_workflow.sub_agents.research_manager.sub_agents.research_conductor.conduct_research import conduct_research_streaming
from domain.research import ParallelResearchConfig, ResearchProgress, ResearchJob, ResearchProgressType

app = FastAPI()

class ResearchWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
    
    async def send_progress(self, session_id: str, progress: ResearchProgress):
        websocket = self.active_connections.get(session_id)
        if websocket:
            # Send only essential progress information
            await websocket.send_text(json.dumps({
                "type": "progress",
                "event_type": progress.type.value,
                "message": progress.message,
                "progress": progress.progress
            }))
    
    async def send_final_result(self, session_id: str, result: str):
        websocket = self.active_connections.get(session_id)
        if websocket:
            await websocket.send_text(json.dumps({
                "type": "final_result",
                "result": result
            }))

manager = ResearchWebSocketManager()

@app.websocket("/research/{session_id}")
async def research_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    
    try:
        # Wait for research configuration from frontend
        config_data = await websocket.receive_text()
        config = ParallelResearchConfig.parse_raw(config_data)
        
        # Start streaming research with real-time updates
        async for update in conduct_research_streaming(config):
            if isinstance(update, ResearchProgress):
                if update.type == ResearchProgressType.ALL_JOBS_COMPLETED:
                    # Send final result
                    await manager.send_final_result(session_id, update.data)
                    break
                else:
                    # Send progress update using manager
                    await manager.send_progress(session_id, update)
            
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))
    finally:
        manager.disconnect(session_id)

# Example usage in your main research orchestrator
async def run_research_with_streaming(research_plan):
    """
    Integration point with your main orchestrator
    """
    from domain.research import ResearchJob
    
    # Convert your research plan to parallel config
    research_jobs = [
        ResearchJob(research_tasks=[task]) 
        for task in research_plan.tasks  # Adjust based on your ResearchPlan structure
    ]
    
    config = ParallelResearchConfig(research_jobs=research_jobs)
    
    # Stream the research process
    progress_updates = []
    final_result = None
    
    async for update in conduct_research_streaming(config):
        if isinstance(update, ResearchProgress):
            progress_updates.append(update)
            
            # Log progress
            print(f"[{update.type.value}] {update.message}")
            
            # Could also save to database for persistence
            # await save_research_progress(update)
            
            # Check if research is complete
            if update.type == ResearchProgressType.ALL_JOBS_COMPLETED:
                final_result = update.data
                break
    
    return final_result, progress_updates