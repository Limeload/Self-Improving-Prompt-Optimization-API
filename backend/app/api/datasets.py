"""
Dataset API endpoints.
Handles dataset CRUD operations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.dataset import DatasetCreate, DatasetResponse, DatasetEntryCreate, DatasetEntryResponse
from app.models.dataset import Dataset, DatasetEntry
from app.utils.dataset_templates import list_templates, create_dataset_from_template

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=List[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
):
    """
    List all datasets.
    
    Returns all datasets ordered by creation date (newest first).
    """
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    results = []
    for dataset in datasets:
        response = DatasetResponse.model_validate(dataset)
        response.entry_count = len(dataset.entries)
        results.append(response)
    return results


@router.post("", response_model=DatasetResponse, status_code=201)
def create_dataset(
    dataset_data: DatasetCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new evaluation dataset.
    
    - **name**: Unique dataset name
    - **description**: Optional description
    - **metadata**: Optional metadata
    - **entries**: Optional initial dataset entries
    """
    # Check if dataset already exists
    existing = db.query(Dataset).filter(Dataset.name == dataset_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Dataset {dataset_data.name} already exists")
    
    # Create dataset
    dataset = Dataset(
        name=dataset_data.name,
        description=dataset_data.description,
        dataset_metadata=dataset_data.metadata,
    )
    db.add(dataset)
    db.flush()
    
    # Add entries if provided
    if dataset_data.entries:
        for entry_data in dataset_data.entries:
            entry = DatasetEntry(
                dataset_id=dataset.id,
                input_data=entry_data.input_data,
                expected_output=entry_data.expected_output,
                rubric=entry_data.rubric,
                entry_metadata=entry_data.metadata,
            )
            db.add(entry)
    
    db.commit()
    db.refresh(dataset)
    
    response = DatasetResponse.model_validate(dataset)
    response.entry_count = len(dataset.entries)
    
    return response


@router.get("/templates", response_model=List[dict])
def list_dataset_templates():
    """
    List all available dataset templates.
    
    Returns list of template metadata including ID, name, description, and entry count.
    """
    return list_templates()


@router.post("/templates/{template_id}", response_model=DatasetResponse, status_code=201)
def create_dataset_from_template_endpoint(
    template_id: str,
    custom_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Create a dataset from a template.
    
    - **template_id**: Template identifier (e.g., "code-review-assistant", "sentiment-analyzer")
    - **custom_name**: Optional custom name for the dataset (defaults to template name)
    
    Available templates:
    - code-review-assistant: Code review test cases
    - sentiment-analyzer: Sentiment analysis test set
    - text-classifier: Text classification test cases
    - document-summarizer: Document summarization test cases
    - question-answering: Question answering test cases
    - code-generator: Code generation test cases
    - email-classifier: Email classification test cases
    - content-moderation: Content moderation test cases
    - data-extraction: Data extraction test cases
    - translation: Translation quality test cases
    """
    try:
        template_data = create_dataset_from_template(template_id, custom_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    # Check if dataset already exists
    existing = db.query(Dataset).filter(Dataset.name == template_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Dataset {template_data.name} already exists")
    
    # Create dataset
    dataset = Dataset(
        name=template_data.name,
        description=template_data.description,
        dataset_metadata=template_data.metadata,
    )
    db.add(dataset)
    db.flush()
    
    # Add entries
    if template_data.entries:
        for entry_data in template_data.entries:
            entry = DatasetEntry(
                dataset_id=dataset.id,
                input_data=entry_data.input_data,
                expected_output=entry_data.expected_output,
                rubric=entry_data.rubric,
                entry_metadata=entry_data.metadata,
            )
            db.add(entry)
    
    db.commit()
    db.refresh(dataset)
    
    response = DatasetResponse.model_validate(dataset)
    response.entry_count = len(dataset.entries)
    response.entries = [DatasetEntryResponse.model_validate(entry) for entry in dataset.entries]
    
    return response


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    """
    Get a dataset by ID.
    """
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    response = DatasetResponse.model_validate(dataset)
    response.entry_count = len(dataset.entries)
    # Include entries in response
    response.entries = [DatasetEntryResponse.model_validate(entry) for entry in dataset.entries]
    
    return response

