# web search - adk google search
# web_fetch - exa to scrape
# reddit_search - mcp
# pubmed_search - mcp
# perplexity_search - mcp
# repl - mcp
# search_youtube - mcp
# google_news_search - 
# podcast_search
# research_complete - important
from strands.tools import tool
from domain import ParallelToolCallConfig, ToolCallResult, ParallelToolCall
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import asyncio

tool_resolver = {
    "web_search": "web_search",
    "web_fetch": "web_fetch",
    "reddit_search": "reddit_search",
    "pubmed_search": "pubmed_search",
    "perplexity_search": "perplexity_search",
    "repl": "repl",
    "search_youtube": "search_youtube",
    "google_news_search": "google_news_search",
    "podcast_search": "podcast_search",
    "research_complete": "research_complete"
}




async def _call_tool(
    tool_name: str,
    tool,
    args: Dict[str, Any],
    sem: asyncio.Semaphore | None = None,
) -> ToolCallResult:
    tool_call_id = f"{tool_name}-{hash(str(args))}"
    try:
        if sem:
            async with sem:
                result = await tool(**args)      # kwargs, no extra param
        else:
            result = await tool(**args)
        return ToolCallResult(
            tool_call_id=tool_call_id,
            tool_name=tool_name,
            tool_result=result,
            is_error=False,
        )
    except Exception as exc:
        return ToolCallResult(
            tool_call_id=tool_call_id,
            tool_name=tool_name,
            is_error=True,
            error_message=str(exc),
        )
@tool
async def parallel_tool_call(config: ParallelToolCallConfig) -> List[ToolCallResult]:
    tasks: list[asyncio.Task] = []

    for tc in config.tool_call_configs:
        if tc.tool_name not in tool_resolver:
            raise ValueError(
                f"Tool {tc.tool_name!r} not known. "
                f"Valid tools: {list(tool_resolver)}"
            )

        tool_fn = tool_resolver[tc.tool_name]
        sem = asyncio.Semaphore(tc.parallel_workers)

        for argset in tc.tool_args:
            tasks.append(
                asyncio.create_task(
                    _call_tool(tc.tool_name, tool_fn, argset, sem)
                )
            )

    return await asyncio.gather(*tasks)

@tool
def research_complete() -> str:
    """
    A tool that signals the research process is complete and no further tool calls are needed.

    This tool should be called when:
    - All required information has been gathered
    - The research objectives have been met
    - No additional searches or tool calls would provide meaningful value
    - The tool call budget has been reached

    The agent should carefully evaluate whether the research is truly complete before calling this tool.
    Calling it prematurely may result in incomplete research findings.

    Returns:
        dict: A dictionary with "research_status": "complete" indicating research completion
    """
    return {"research_status": "complete" }