"""
Evaluation API endpoints.
Handles prompt evaluation and self-improvement.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    ImprovementRequest,
    ImprovementResponse,
)
from app.services.prompt_service import PromptService
from app.services.evaluation_service import EvaluationService
from app.services.improvement_service import ImprovementService
from app.models.dataset import Dataset

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.post("/prompts/{name}/evaluate", response_model=EvaluationResponse, status_code=201)
def evaluate_prompt(
    name: str,
    request: EvaluationRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluate a prompt against a dataset.
    
    - **dataset_id**: Optional dataset ID
    - **dataset_entries**: Optional inline dataset entries
    - **version**: Optional prompt version (defaults to latest active)
    - **evaluation_dimensions**: List of dimensions to evaluate
    
    Returns comprehensive evaluation results with per-example scores.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # FastAPI automatically URL-decodes the path parameter
    # Log the received name for debugging
    logger.info(f"Evaluating prompt with name: '{name}' (length: {len(name)})")
    
    # Get prompt
    prompt = PromptService.get_prompt(db, name, request.version)
    if not prompt:
        # Try to find similar prompts for debugging
        from app.models.prompt import Prompt
        all_prompts = db.query(Prompt).filter(Prompt.name.like(f"%{name[:20]}%")).limit(5).all()
        similar_names = [p.name for p in all_prompts]
        logger.warning(f"Prompt '{name}' not found. Similar names: {similar_names}")
        raise HTTPException(status_code=404, detail=f"Prompt '{name}' not found")
    
    # Get dataset if provided
    dataset = None
    if request.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset {request.dataset_id} not found")
    
    # Run evaluation
    try:
        evaluation = EvaluationService.evaluate_prompt(
            db,
            prompt,
            dataset=dataset,
            dataset_entries=request.dataset_entries,
            evaluation_dimensions=request.evaluation_dimensions,
        )
        
        # Load results for response
        from app.schemas.evaluation import EvaluationResultResponse
        result_responses = [
            EvaluationResultResponse.model_validate(r) for r in evaluation.results
        ]
        
        # Create response with all required fields
        response_data = {
            "id": evaluation.id,
            "prompt_id": evaluation.prompt_id,
            "prompt_name": prompt.name,
            "prompt_version": prompt.version,
            "dataset_id": evaluation.dataset_id,
            "evaluation_type": evaluation.evaluation_type,
            "overall_score": evaluation.overall_score,
            "correctness_score": evaluation.correctness_score,
            "format_score": evaluation.format_score,
            "verbosity_score": evaluation.verbosity_score,
            "safety_score": evaluation.safety_score,
            "consistency_score": evaluation.consistency_score,
            "total_examples": evaluation.total_examples,
            "passed_examples": evaluation.passed_examples,
            "failed_examples": evaluation.failed_examples,
            "format_pass_rate": evaluation.format_pass_rate,
            "failure_cases": evaluation.failure_cases,
            "created_at": evaluation.created_at,
            "completed_at": evaluation.completed_at,
            "results": result_responses,
        }
        
        response = EvaluationResponse(**response_data)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/prompts/{name}", response_model=List[EvaluationResponse])
def list_prompt_evaluations(
    name: str,
    db: Session = Depends(get_db),
):
    """
    List all evaluations for a prompt.
    
    Returns all evaluations for the specified prompt, ordered by creation date (newest first).
    """
    from app.models.evaluation import Evaluation
    from app.models.prompt import Prompt
    from app.schemas.evaluation import EvaluationResultResponse
    
    # Get prompt to verify it exists
    prompt = PromptService.get_prompt(db, name)
    if not prompt:
        raise HTTPException(status_code=404, detail=f"Prompt {name} not found")
    
    # Get all prompts with this name (all versions)
    all_prompts = db.query(Prompt).filter(Prompt.name == name).all()
    prompt_ids = [p.id for p in all_prompts]
    
    # Get all evaluations for these prompts
    evaluations = (
        db.query(Evaluation)
        .filter(Evaluation.prompt_id.in_(prompt_ids))
        .order_by(Evaluation.created_at.desc())
        .all()
    )
    
    # Build responses
    responses = []
    for evaluation in evaluations:
        # Create response with all required fields
        response_data = {
            "id": evaluation.id,
            "prompt_id": evaluation.prompt_id,
            "prompt_name": evaluation.prompt.name,
            "prompt_version": evaluation.prompt.version,
            "dataset_id": evaluation.dataset_id,
            "evaluation_type": evaluation.evaluation_type,
            "overall_score": evaluation.overall_score,
            "correctness_score": evaluation.correctness_score,
            "format_score": evaluation.format_score,
            "verbosity_score": evaluation.verbosity_score,
            "safety_score": evaluation.safety_score,
            "consistency_score": evaluation.consistency_score,
            "total_examples": evaluation.total_examples,
            "passed_examples": evaluation.passed_examples,
            "failed_examples": evaluation.failed_examples,
            "format_pass_rate": evaluation.format_pass_rate,
            "failure_cases": evaluation.failure_cases,
            "created_at": evaluation.created_at,
            "completed_at": evaluation.completed_at,
            "results": [
                EvaluationResultResponse.model_validate(r) for r in evaluation.results
            ],
        }
        response = EvaluationResponse(**response_data)
        responses.append(response)
    
    return responses


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
):
    """
    Get evaluation results by ID.
    
    Returns full evaluation details including all per-example results.
    """
    from app.models.evaluation import Evaluation
    from app.schemas.evaluation import EvaluationResultResponse
    
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found")
    
    response = EvaluationResponse.model_validate(evaluation)
    response.prompt_name = evaluation.prompt.name
    response.prompt_version = evaluation.prompt.version
    response.results = [
        EvaluationResultResponse.model_validate(r) for r in evaluation.results
    ]
    
    return response


@router.get("/prompts/{name}/improvements", response_model=List[ImprovementResponse])
def list_prompt_improvements(
    name: str,
    db: Session = Depends(get_db),
):
    """
    List all improvements for a prompt.
    
    Returns all improvement runs for the specified prompt, ordered by creation date (newest first).
    Note: Improvements are tracked through evaluations with evaluation_type="improvement".
    """
    from app.models.evaluation import Evaluation
    from app.models.prompt import Prompt
    from app.services.prompt_service import PromptService
    
    # Get prompt to verify it exists
    prompt = PromptService.get_prompt(db, name)
    if not prompt:
        raise HTTPException(status_code=404, detail=f"Prompt {name} not found")
    
    # Get all prompts with this name (all versions)
    all_prompts = db.query(Prompt).filter(Prompt.name == name).all()
    prompt_ids = [p.id for p in all_prompts]
    
    # Get evaluations with type "improvement" - these represent improvement runs
    # Note: We'll need to reconstruct ImprovementResponse from evaluation data
    # For now, return empty list as improvements are not stored separately
    # TODO: Store improvement metadata separately or enhance evaluation model
    return []


@router.post("/prompts/{name}/improve", response_model=ImprovementResponse, status_code=201)
def improve_prompt(
    name: str,
    request: ImprovementRequest,
    db: Session = Depends(get_db),
):
    """
    Trigger self-improvement for a prompt.
    
    This endpoint:
    1. Evaluates the baseline prompt
    2. Analyzes failure cases
    3. Generates improved candidate prompts
    4. Evaluates candidates
    5. Promotes best candidate if it meets criteria
    
    - **dataset_id**: Dataset for evaluation
    - **baseline_version**: Version to compare against
    - **improvement_threshold**: Minimum improvement required
    - **max_candidates**: Maximum candidates to generate
    
    Returns improvement results with promotion decision and reasoning.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # FastAPI automatically URL-decodes the path parameter
    logger.info(f"Improving prompt with name: '{name}' (length: {len(name)})")
    
    # Get dataset if provided
    dataset = None
    if request.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset {request.dataset_id} not found")
    
    try:
        result = ImprovementService.improve_prompt(
            db,
            name,
            dataset=dataset,
            baseline_version=request.baseline_version,
            improvement_threshold=request.improvement_threshold,
            max_candidates=request.max_candidates,
        )
        
        from datetime import datetime
        
        return ImprovementResponse(
            **result,
            created_at=datetime.now(),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Improvement failed: {str(e)}")

