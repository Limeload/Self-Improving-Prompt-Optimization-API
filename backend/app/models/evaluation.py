"""
Evaluation models - track evaluation runs and results.
Stores both aggregate metrics and per-example scores.
"""
from sqlalchemy import Column, Integer, String, Float, Text, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Evaluation(Base):
    """
    Evaluation run model.
    
    Represents a single evaluation run of a prompt against a dataset.
    Stores aggregate metrics and links to per-example results.
    """
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    
    # Evaluation metadata
    evaluation_type = Column(String(50), nullable=False)  # "full", "ab_test", "improvement"
    judge_model = Column(String(100), nullable=True)  # Model used for LLM-based judging
    
    # Aggregate metrics
    overall_score = Column(Float, nullable=True)  # Weighted average across dimensions
    correctness_score = Column(Float, nullable=True)
    format_score = Column(Float, nullable=True)
    verbosity_score = Column(Float, nullable=True)
    safety_score = Column(Float, nullable=True)
    consistency_score = Column(Float, nullable=True)
    
    # Pass/fail metrics
    total_examples = Column(Integer, default=0)
    passed_examples = Column(Integer, default=0)
    failed_examples = Column(Integer, default=0)
    format_pass_rate = Column(Float, nullable=True)  # Percentage passing format validation
    
    # Failure analysis
    failure_cases = Column(JSON, nullable=True)  # List of failed example IDs and reasons
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    prompt = relationship("Prompt", back_populates="evaluations")
    dataset = relationship("Dataset", back_populates="evaluations")
    results = relationship("EvaluationResult", back_populates="evaluation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Evaluation(id={self.id}, prompt_id={self.prompt_id}, score={self.overall_score})>"


class EvaluationResult(Base):
    """
    Per-example evaluation result.
    
    Stores detailed scores and validation results for each test case.
    """
    __tablename__ = "evaluation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False, index=True)
    dataset_entry_id = Column(Integer, ForeignKey("dataset_entries.id"), nullable=True)
    
    # Input/output
    input_data = Column(JSON, nullable=False)
    expected_output = Column(JSON, nullable=True)
    actual_output = Column(JSON, nullable=True)
    
    # Scores (0.0 to 1.0)
    correctness_score = Column(Float, nullable=True)
    format_score = Column(Float, nullable=True)
    verbosity_score = Column(Float, nullable=True)
    safety_score = Column(Float, nullable=True)
    consistency_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    
    # Validation results
    passed_format_validation = Column(Boolean, default=False)
    format_validation_error = Column(Text, nullable=True)
    
    # LLM judge results
    judge_feedback = Column(Text, nullable=True)
    judge_reasoning = Column(Text, nullable=True)
    
    # Metadata
    passed = Column(Boolean, default=False)
    failure_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    evaluation = relationship("Evaluation", back_populates="results")
    dataset_entry = relationship("DatasetEntry", back_populates="results")
    
    def __repr__(self):
        return f"<EvaluationResult(id={self.id}, passed={self.passed}, score={self.overall_score})>"

