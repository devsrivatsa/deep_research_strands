"""
Tool call domain model.

This module contains the tool call model used in research outputs.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class ToolCall(BaseModel):
    """Represents a tool call made during research"""
    tool_name: str = Field(description="Name of the tool that was called")
    arguments: Dict[str, Any] = Field(description="Arguments passed to the tool")
    result: Optional[str] = Field(default=None, description="Result returned by the tool")
    timestamp: Optional[str] = Field(default=None, description="When the tool was called")
    duration_ms: Optional[float] = Field(default=None, description="How long the tool took to execute")
    success: bool = Field(default=True, description="Whether the tool call was successful")
    error_message: Optional[str] = Field(default=None, description="Error message if the tool failed")