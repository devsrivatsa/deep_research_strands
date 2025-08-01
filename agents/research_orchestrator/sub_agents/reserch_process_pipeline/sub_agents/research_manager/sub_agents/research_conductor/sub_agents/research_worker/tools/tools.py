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

class ParallelToolCall(BaseModel):
    tool_name: str = Field(description="The name of the tool to call")
    tool_args: List[Dict[str, Any]] = Field(description="The list of tool arguments to pass to the all tool calls")
    parallel_workers: int = Field(description="The number of parallel workers to use for the tool call (must match the number of tool calls argument sets in the tool_args list)", default=1)

class ParallelToolCallConfig(BaseModel):
    tool_call_configs: List[ParallelToolCall] = Field(description="The list of tool calls to make in parallel")

class ToolCallResult(BaseModel):
    tool_call_id: str = Field(description="The id of the tool call")
    tool_name: str = Field(description="The name of the tool that was called")
    tool_result: Any = Field(description="The result of the tool call")
    is_error: bool = Field(description="Whether the tool call was successful or not", default=False)
    error_message: str = Field(description="The error message if the tool call was not successful", default="")


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