from pydantic import BaseModel, Field
from typing import List, Dict, Any


class ToolCall(BaseModel):
    tool_name: str = Field(description="The name of the tool that was called")
    tool_arguments: List[Dict[str, str]] = Field(
        description="The inputs to the tool calls as a list of dictionaries with key as the input name and value as the input value for each tool call"
    )
    number_of_calls: int = Field(description="The number of times the tool was called")


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