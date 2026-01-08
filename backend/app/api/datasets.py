"""
Dataset API endpoints.
Handles dataset CRUD operations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.dataset import DatasetCreate, DatasetResponse, DatasetEntryCreate
from app.models.dataset import Dataset, DatasetEntry

router = APIRouter(prefix="/datasets", tags=["datasets"])


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
        metadata=dataset_data.metadata,
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
                metadata=entry_data.metadata,
            )
            db.add(entry)
    
    db.commit()
    db.refresh(dataset)
    
    response = DatasetResponse.model_validate(dataset)
    response.entry_count = len(dataset.entries)
    
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
    
    return response

