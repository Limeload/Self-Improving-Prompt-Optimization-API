"""
Dataset models - store evaluation datasets with inputs and expected outputs/rubrics.
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Dataset(Base):
    """
    Dataset model - collection of test cases for evaluation.
    """
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Dataset metadata
    metadata = Column(JSON, nullable=True)  # {task_type, domain, etc.}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    entries = relationship("DatasetEntry", back_populates="dataset", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="dataset")
    
    def __repr__(self):
        return f"<Dataset(name={self.name}, entries={len(self.entries)})>"


class DatasetEntry(Base):
    """
    Individual dataset entry - a single test case.
    
    Contains:
    - input: The input to the prompt
    - expected_output: Expected output (if deterministic)
    - rubric: Evaluation criteria (if using LLM judge)
    """
    __tablename__ = "dataset_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False, index=True)
    
    # Test case data
    input_data = Column(JSON, nullable=False)
    expected_output = Column(JSON, nullable=True)  # For deterministic validation
    rubric = Column(Text, nullable=True)  # For LLM-based evaluation
    
    # Metadata
    metadata = Column(JSON, nullable=True)  # {tags, difficulty, category, etc.}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="entries")
    results = relationship("EvaluationResult", back_populates="dataset_entry")
    
    def __repr__(self):
        return f"<DatasetEntry(id={self.id}, dataset_id={self.dataset_id})>"

