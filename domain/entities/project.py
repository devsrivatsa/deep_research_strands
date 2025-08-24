from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

from .research import ResearchActionPlan, CompletedResearchTask


class ResearchStatus(str, Enum):
    PENDING = "pending"
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Project(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class ResearchSession(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    query: str = Field(min_length=1)
    status: ResearchStatus = ResearchStatus.PENDING
    
    # Research plan and results stored as JSONB in database
    plan_data: Optional[ResearchActionPlan] = None
    results_data: Optional[List[CompletedResearchTask]] = None
    
    # Metadata
    estimated_duration_minutes: Optional[int] = None
    actual_duration_minutes: Optional[int] = None
    tool_calls_used: int = 0
    tool_calls_budget: Optional[int] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0
    
    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_archived: Optional[bool] = None


class ResearchSessionCreate(BaseModel):
    query: str = Field(min_length=1)
    tool_calls_budget: Optional[int] = Field(None, ge=1, le=1000)


class ResearchSessionUpdate(BaseModel):
    status: Optional[ResearchStatus] = None
    plan_data: Optional[ResearchActionPlan] = None
    results_data: Optional[List[CompletedResearchTask]] = None
    estimated_duration_minutes: Optional[int] = None
    actual_duration_minutes: Optional[int] = None
    tool_calls_used: Optional[int] = None
    error_message: Optional[str] = None


class ProjectResponse(BaseModel):
    """Public project data for API responses"""
    id: UUID
    name: str
    description: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    research_sessions_count: int = 0


class ResearchSessionResponse(BaseModel):
    """Public research session data for API responses"""
    id: UUID
    project_id: UUID
    query: str
    status: ResearchStatus
    estimated_duration_minutes: Optional[int]
    actual_duration_minutes: Optional[int]
    tool_calls_used: int
    tool_calls_budget: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    updated_at: datetime
    error_message: Optional[str]
    retry_count: int