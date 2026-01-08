"""
Pydantic schemas for Dataset API endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class DatasetEntryCreate(BaseModel):
    """Schema for creating a dataset entry"""
    input_data: Dict[str, Any] = Field(..., description="Input data for the test case")
    expected_output: Optional[Dict[str, Any]] = Field(None, description="Expected output (for deterministic validation)")
    rubric: Optional[str] = Field(None, description="Evaluation rubric (for LLM-based evaluation)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class DatasetCreate(BaseModel):
    """Schema for creating a dataset"""
    name: str = Field(..., description="Unique dataset name")
    description: Optional[str] = Field(None, description="Dataset description")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Dataset metadata")
    entries: Optional[List[DatasetEntryCreate]] = Field([], description="Initial dataset entries")


class DatasetResponse(BaseModel):
    """Schema for dataset response"""
    id: int
    name: str
    description: Optional[str]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    entry_count: int = 0
    
    model_config = {"from_attributes": True}

