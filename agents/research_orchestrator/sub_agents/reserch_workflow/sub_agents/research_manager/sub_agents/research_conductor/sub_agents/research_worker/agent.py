from .prompt import research_worker_prompt
from .tools import parallel_tool_call, research_complete
from strands import Agent
from domain import ResearchTask, ResearchOutput

research_worker = Agent(
    name="research_worker",
    description="A research worker that conducts research on a given topic",
    system_prompt=research_worker_prompt,
    model="gemini-2.5-flash",
    tools=[parallel_tool_call, research_complete]
)

async def research_task(research_task: ResearchTask) -> ResearchOutput:
    """
    Conducts research on a given research task using a research worker agent.

    This function takes a research task, passes it to a research worker agent that uses various tools
    (like web search, web fetch, reddit search, etc.) to gather information and conduct comprehensive
    research on the topic. The research worker follows a structured OODA loop (Observe, Orient, Decide, Act)
    and manages tool calls based on task complexity.

    Args:
        research_task (ResearchTask): A structured research task containing the task description
            and any additional context needed for research.

    Returns:
        ResearchOutput: A structured output containing the research findings, including:
            - Raw research results from tool calls
            - Sources and citations
            - Any relevant metadata about the research process

    The research worker will automatically determine task complexity and adjust the number of
    tool calls accordingly, following these guidelines:
    - Lookup/trivial tasks: 1-3 calls
    - Simple tasks: 3-5 calls  
    - Moderate tasks: 5-8 calls
    - Complex tasks: 8-12 calls
    - Hard cap at 15 calls (absolute max 20)
    """
    research_output = await research_worker.structured_output_async(ResearchOutput, f"\n\nHere is the research task:\n{research_task.task_description}")
    
    return research_output
