"""
Pydantic schemas for Evaluation API endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class EvaluationRequest(BaseModel):
    """Schema for running an evaluation"""
    dataset_id: Optional[int] = Field(None, description="Dataset ID to evaluate against")
    dataset_entries: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Inline dataset entries [{input_data, expected_output, rubric}]"
    )
    version: Optional[str] = Field(None, description="Specific prompt version (defaults to latest active)")
    evaluation_dimensions: Optional[List[str]] = Field(
        ["correctness", "format"],
        description="Dimensions to evaluate (correctness, format, verbosity, safety, consistency)"
    )


class EvaluationResultResponse(BaseModel):
    """Schema for individual evaluation result"""
    id: int
    input_data: Dict[str, Any]
    expected_output: Optional[Dict[str, Any]]
    actual_output: Optional[Dict[str, Any]]
    correctness_score: Optional[float]
    format_score: Optional[float]
    verbosity_score: Optional[float]
    safety_score: Optional[float]
    consistency_score: Optional[float]
    overall_score: Optional[float]
    passed_format_validation: bool
    format_validation_error: Optional[str]
    judge_feedback: Optional[str]
    passed: bool
    failure_reason: Optional[str]
    
    model_config = {"from_attributes": True}


class EvaluationResponse(BaseModel):
    """Schema for evaluation run response"""
    id: int
    prompt_id: int
    prompt_name: str
    prompt_version: str
    dataset_id: Optional[int]
    evaluation_type: str
    overall_score: Optional[float]
    correctness_score: Optional[float]
    format_score: Optional[float]
    verbosity_score: Optional[float]
    safety_score: Optional[float]
    consistency_score: Optional[float]
    total_examples: int
    passed_examples: int
    failed_examples: int
    format_pass_rate: Optional[float]
    failure_cases: Optional[List[Dict[str, Any]]]
    created_at: datetime
    completed_at: Optional[datetime]
    results: List[EvaluationResultResponse] = []
    
    model_config = {"from_attributes": True}


class ImprovementRequest(BaseModel):
    """Schema for triggering self-improvement"""
    dataset_id: Optional[int] = Field(None, description="Dataset ID for evaluation")
    dataset_entries: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Inline dataset entries [{input_data, expected_output, rubric}]"
    )
    baseline_version: Optional[str] = Field(None, description="Version to compare against (defaults to current active)")
    improvement_threshold: Optional[float] = Field(None, description="Minimum improvement required (overrides config)")
    max_candidates: int = Field(3, description="Maximum number of candidate prompts to generate")


class ImprovementResponse(BaseModel):
    """Schema for improvement process response"""
    baseline_prompt_id: int
    baseline_version: str
    baseline_score: Optional[float]
    candidates_generated: int
    candidates_evaluated: int
    best_candidate_id: Optional[int]
    best_candidate_version: Optional[str]
    best_candidate_score: Optional[float]
    improvement_delta: Optional[float]
    promotion_decision: str  # "promoted", "rejected", "pending"
    promotion_reason: str
    created_at: datetime

