"""
Pydantic schemas for Prompt API endpoints.
Defines request/response models with validation.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.prompt import PromptStatus


class PromptCreate(BaseModel):
    """Schema for creating a new prompt version"""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    name: str = Field(..., min_length=1, description="Unique prompt name (e.g., 'email_classifier')")
    version: str = Field(..., min_length=1, description="Version identifier (e.g., '1.0.0' or 'v2')")
    template_text: str = Field(..., min_length=1, description="The prompt template text")
    input_schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for inputs")
    output_schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for outputs")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional metadata (task, constraints, model, temperature, owner)"
    )
    parent_version_id: Optional[int] = Field(default=None, description="ID of parent version for lineage")
    status: PromptStatus = Field(default=PromptStatus.DRAFT, description="Initial status")


class PromptResponse(BaseModel):
    """Schema for prompt response"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    name: str
    version: str
    template_text: str
    input_schema: Optional[Dict[str, Any]]
    output_schema: Optional[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = Field(alias="prompt_metadata")
    parent_version_id: Optional[int]
    status: PromptStatus
    created_at: datetime
    updated_at: datetime


class PromptRunRequest(BaseModel):
    """Schema for running a prompt inference"""
    input_data: Dict[str, Any] = Field(..., description="Input data matching input_schema")
    version: Optional[str] = Field(None, description="Specific version to use (defaults to latest active)")
    model_override: Optional[str] = Field(None, description="Override model from metadata")
    temperature_override: Optional[float] = Field(None, description="Override temperature from metadata")


class PromptRunResponse(BaseModel):
    """Schema for prompt inference response"""
    prompt_id: int
    prompt_name: str
    prompt_version: str
    output: Dict[str, Any]
    metadata: Optional[Dict[str, Any]]


class PromptVersionResponse(BaseModel):
    """Schema for prompt version listing"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    version: str
    status: PromptStatus
    parent_version_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class PromptDiffResponse(BaseModel):
    """Schema for prompt version diff"""
    version_a: str
    version_b: str
    diff_text: str
    changes_summary: str
    added_lines: List[str]
    removed_lines: List[str]

