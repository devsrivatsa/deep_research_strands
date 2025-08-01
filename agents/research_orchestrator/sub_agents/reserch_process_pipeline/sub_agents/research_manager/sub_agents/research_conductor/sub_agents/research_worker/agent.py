from pydantic import BaseModel, Field
from typing import List, Dict, Any
from .prompt import research_worker_prompt
from .tools import parallel_tool_call
from strands import Agent


class ResearchOutput(BaseModel):
    research_output: str = Field(description="The output of the research task")


def research_task(research_task: ResearchTask):
    research_worker = Agent(
        name="research_worker",
        description="A research worker that conducts research on a given topic",
        system_prompt=research_worker_prompt,
        model="gemini-2.5-flash",
        tools=[parallel_tool_call]
    )

    research_output = research_worker.structured_output(ResearchOutput, research_task.task_desc)
    
    return research_output
