"""
Prompt API endpoints.
Handles prompt CRUD, versioning, and inference.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.prompt import (
    PromptCreate,
    PromptResponse,
    PromptRunRequest,
    PromptRunResponse,
    PromptVersionResponse,
    PromptDiffResponse,
)
from app.services.prompt_service import PromptService
from app.utils.diff_utils import PromptDiff
from app.models.prompt import Prompt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompts", tags=["prompts"])


# More specific routes first to avoid matching conflicts
@router.get("/diffs/{version_a_id}/{version_b_id}", response_model=PromptDiffResponse)
def get_prompt_diff(
    version_a_id: int,
    version_b_id: int,
    db: Session = Depends(get_db),
):
    """
    Get diff between two prompt versions.
    
    Returns detailed diff showing additions, removals, and changes.
    """
    version_a = db.query(Prompt).filter(Prompt.id == version_a_id).first()
    version_b = db.query(Prompt).filter(Prompt.id == version_b_id).first()
    
    if not version_a or not version_b:
        raise HTTPException(status_code=404, detail="One or both versions not found")
    
    if version_a.name != version_b.name:
        raise HTTPException(status_code=400, detail="Versions must be from the same prompt")
    
    diff_result = PromptDiff.compute_diff(version_a.template_text, version_b.template_text)
    
    return PromptDiffResponse(
        version_a=version_a.version,
        version_b=version_b.version,
        diff_text=diff_result["diff_text"],
        changes_summary=diff_result["changes_summary"],
        added_lines=diff_result["added_lines"],
        removed_lines=diff_result["removed_lines"],
    )


@router.post("/{name}/run", response_model=PromptRunResponse)
def run_prompt(
    name: str,
    request: PromptRunRequest,
    db: Session = Depends(get_db),
):
    """
    Run prompt inference.
    
    Executes the prompt with provided input data and returns the output.
    Uses the latest active version by default, or specified version.
    """
    logger.info(f"Running prompt: name={name}, version={request.version}")
    try:
        result = PromptService.run_prompt(
            db,
            name,
            request.input_data,
            version=request.version,
            model_override=request.model_override,
            temperature_override=request.temperature_override,
        )
        logger.info(f"Successfully ran prompt: name={name}")
        return result
    except ValueError as e:
        logger.warning(f"Prompt not found or invalid: name={name}, error={str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error running prompt: name={name}, error={str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/{name}/versions", response_model=List[PromptVersionResponse])
def get_prompt_versions(
    name: str,
    db: Session = Depends(get_db),
):
    """
    Get all versions of a prompt.
    
    Returns list of all versions ordered by creation date (newest first).
    """
    versions = PromptService.get_prompt_versions(db, name)
    if not versions:
        raise HTTPException(status_code=404, detail=f"Prompt {name} not found")
    return versions


@router.post("", response_model=PromptResponse, status_code=201)
def create_prompt(
    prompt_data: PromptCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new prompt version.
    
    - **name**: Unique prompt identifier
    - **version**: Version string (e.g., "1.0.0" or "v2")
    - **template_text**: The prompt template
    - **input_schema**: Optional JSON schema for inputs
    - **output_schema**: Optional JSON schema for outputs
    - **metadata**: Optional metadata (model, temperature, task, etc.)
    """
    try:
        logger.info(f"Creating prompt: name={prompt_data.name}, version={prompt_data.version}")
        prompt = PromptService.create_prompt(db, prompt_data)
        return prompt
    except ValueError as e:
        logger.error(f"Value error creating prompt: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating prompt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create prompt: {str(e)}")


@router.get("/{name}", response_model=PromptResponse)
def get_prompt(
    name: str,
    version: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Get a prompt by name.
    
    - If **version** is provided, returns that specific version
    - If **version** is omitted, returns the latest active version
    """
    prompt = PromptService.get_prompt(db, name, version)
    if not prompt:
        raise HTTPException(status_code=404, detail=f"Prompt {name} not found")
    return prompt

