"""
Prompt model - core entity for versioned prompts.
Tracks prompt templates, versions, lineage, and status.
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.core.database import Base


class PromptStatus(str, enum.Enum):
    """Prompt lifecycle status"""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class Prompt(Base):
    """
    Prompt version model.
    
    Each prompt has:
    - name: Unique identifier (e.g., "email_classifier")
    - version: Semantic or incremental version (e.g., "1.0.0" or "v2")
    - template_text: The actual prompt template
    - input_schema: JSON schema for expected inputs
    - output_schema: JSON schema for expected outputs
    - metadata: Additional config (model, temperature, task, constraints)
    - parent_version: Link to previous version for lineage
    - status: draft | active | archived
    """
    __tablename__ = "prompts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    
    # Prompt content
    template_text = Column(Text, nullable=False)
    input_schema = Column(JSON, nullable=True)  # JSON schema for inputs
    output_schema = Column(JSON, nullable=True)  # JSON schema for outputs
    
    # Metadata (renamed from 'metadata' to avoid SQLAlchemy reserved name conflict)
    prompt_metadata = Column("metadata", JSON, nullable=True)  # {task, constraints, model, temperature, owner}
    
    # Versioning and lineage
    parent_version_id = Column(Integer, ForeignKey("prompts.id"), nullable=True)
    status = Column(SQLEnum(PromptStatus), default=PromptStatus.DRAFT, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    parent = relationship("Prompt", remote_side=[id], backref="children")
    evaluations = relationship("Evaluation", back_populates="prompt", cascade="all, delete-orphan")
    
    # Composite unique constraint: name + version must be unique
    __table_args__ = (
        UniqueConstraint('name', 'version', name='uq_prompt_name_version'),
    )
    
    def __repr__(self):
        return f"<Prompt(name={self.name}, version={self.version}, status={self.status})>"

