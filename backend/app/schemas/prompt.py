"""
Pydantic schemas for Prompt API endpoints.
Defines request/response models with validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.prompt import PromptStatus


class PromptCreate(BaseModel):
    """Schema for creating a new prompt version"""
    name: str = Field(..., description="Unique prompt name (e.g., 'email_classifier')")
    version: str = Field(..., description="Version identifier (e.g., '1.0.0' or 'v2')")
    template_text: str = Field(..., description="The prompt template text")
    input_schema: Optional[Dict[str, Any]] = Field(None, description="JSON schema for inputs")
    output_schema: Optional[Dict[str, Any]] = Field(None, description="JSON schema for outputs")
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata (task, constraints, model, temperature, owner)"
    )
    parent_version_id: Optional[int] = Field(None, description="ID of parent version for lineage")
    status: PromptStatus = Field(PromptStatus.DRAFT, description="Initial status")


class PromptResponse(BaseModel):
    """Schema for prompt response"""
    id: int
    name: str
    version: str
    template_text: str
    input_schema: Optional[Dict[str, Any]]
    output_schema: Optional[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]
    parent_version_id: Optional[int]
    status: PromptStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


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
    id: int
    version: str
    status: PromptStatus
    parent_version_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class PromptDiffResponse(BaseModel):
    """Schema for prompt version diff"""
    version_a: str
    version_b: str
    diff_text: str
    changes_summary: str
    added_lines: List[str]
    removed_lines: List[str]

