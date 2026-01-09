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


class DatasetEntryResponse(BaseModel):
    """Schema for dataset entry response"""
    id: int
    input_data: Dict[str, Any]
    expected_output: Optional[Dict[str, Any]]
    rubric: Optional[str]
    metadata: Optional[Dict[str, Any]] = Field(None, alias="entry_metadata")
    created_at: datetime
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class DatasetResponse(BaseModel):
    """Schema for dataset response"""
    id: int
    name: str
    description: Optional[str]
    metadata: Optional[Dict[str, Any]] = Field(alias="dataset_metadata")
    created_at: datetime
    updated_at: datetime
    entry_count: int = 0
    entries: Optional[List[DatasetEntryResponse]] = None
    
    model_config = {"from_attributes": True, "populate_by_name": True}

