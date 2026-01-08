"""
Prompt service - handles prompt CRUD operations and versioning.
Manages prompt lifecycle and provides stable inference endpoints.
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from app.models.prompt import Prompt, PromptStatus
from app.schemas.prompt import PromptCreate
from app.utils.langchain_utils import PromptExecutor


class PromptService:
    """Service for managing prompts"""
    
    @staticmethod
    def create_prompt(db: Session, prompt_data: PromptCreate) -> Prompt:
        """
        Create a new prompt version.
        
        Args:
            db: Database session
            prompt_data: Prompt creation data
            
        Returns:
            Created prompt
        """
        # Check if version already exists
        existing = db.query(Prompt).filter(
            and_(Prompt.name == prompt_data.name, Prompt.version == prompt_data.version)
        ).first()
        
        if existing:
            raise ValueError(f"Prompt {prompt_data.name} version {prompt_data.version} already exists")
        
        # Create new prompt
        prompt = Prompt(
            name=prompt_data.name,
            version=prompt_data.version,
            template_text=prompt_data.template_text,
            input_schema=prompt_data.input_schema,
            output_schema=prompt_data.output_schema,
            metadata=prompt_data.metadata,
            parent_version_id=prompt_data.parent_version_id,
            status=prompt_data.status,
        )
        
        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        
        return prompt
    
    @staticmethod
    def get_prompt(db: Session, name: str, version: Optional[str] = None) -> Optional[Prompt]:
        """
        Get a prompt by name and optionally version.
        If version is None, returns the latest active version.
        
        Args:
            db: Database session
            name: Prompt name
            version: Optional version (defaults to latest active)
            
        Returns:
            Prompt or None if not found
        """
        if version:
            return db.query(Prompt).filter(
                and_(Prompt.name == name, Prompt.version == version)
            ).first()
        else:
            # Get latest active version
            return db.query(Prompt).filter(
                and_(Prompt.name == name, Prompt.status == PromptStatus.ACTIVE)
            ).order_by(Prompt.created_at.desc()).first()
    
    @staticmethod
    def get_prompt_versions(db: Session, name: str) -> List[Prompt]:
        """
        Get all versions of a prompt.
        
        Args:
            db: Database session
            name: Prompt name
            
        Returns:
            List of prompts ordered by creation date
        """
        return db.query(Prompt).filter(Prompt.name == name).order_by(Prompt.created_at.desc()).all()
    
    @staticmethod
    def run_prompt(
        db: Session,
        name: str,
        input_data: dict,
        version: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature_override: Optional[float] = None,
    ) -> dict:
        """
        Run a prompt inference.
        
        Args:
            db: Database session
            name: Prompt name
            input_data: Input data
            version: Optional version (defaults to latest active)
            model_override: Optional model override
            temperature_override: Optional temperature override
            
        Returns:
            Dictionary with output and metadata
        """
        # Get prompt
        prompt = PromptService.get_prompt(db, name, version)
        if not prompt:
            raise ValueError(f"Prompt {name} not found")
        
        # Get model and temperature from metadata or overrides
        metadata = prompt.metadata or {}
        model = model_override or metadata.get("model") or None
        temperature = temperature_override if temperature_override is not None else metadata.get("temperature")
        
        # Execute prompt
        executor = PromptExecutor(model_name=model, temperature=temperature)
        output = executor.execute(
            template_text=prompt.template_text,
            input_data=input_data,
            output_schema=prompt.output_schema,
        )
        
        return {
            "prompt_id": prompt.id,
            "prompt_name": prompt.name,
            "prompt_version": prompt.version,
            "output": output,
            "metadata": metadata,
        }
    
    @staticmethod
    def activate_version(db: Session, name: str, version: str) -> Prompt:
        """
        Activate a prompt version (deactivates other versions).
        
        Args:
            db: Database session
            name: Prompt name
            version: Version to activate
            
        Returns:
            Activated prompt
        """
        prompt = PromptService.get_prompt(db, name, version)
        if not prompt:
            raise ValueError(f"Prompt {name} version {version} not found")
        
        # Deactivate all other versions
        db.query(Prompt).filter(
            and_(Prompt.name == name, Prompt.version != version)
        ).update({Prompt.status: PromptStatus.ARCHIVED})
        
        # Activate this version
        prompt.status = PromptStatus.ACTIVE
        db.commit()
        db.refresh(prompt)
        
        return prompt

