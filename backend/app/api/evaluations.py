"""
Evaluation API endpoints.
Handles prompt evaluation and self-improvement.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
    # Get prompt
    prompt = PromptService.get_prompt(db, name, request.version)
    if not prompt:
        raise HTTPException(status_code=404, detail=f"Prompt {name} not found")
    
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
        
        response = EvaluationResponse.model_validate(evaluation)
        response.prompt_name = prompt.name
        response.prompt_version = prompt.version
        response.results = result_responses
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


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

