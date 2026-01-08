"""
Prompt service - handles prompt CRUD operations and versioning.
Manages prompt lifecycle and provides stable inference endpoints.
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, distinct
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
            prompt_metadata=prompt_data.metadata,
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
        If version is None, returns the latest active version, or latest version if no active exists.
        
        Args:
            db: Database session
            name: Prompt name
            version: Optional version (defaults to latest active, or latest if no active)
            
        Returns:
            Prompt or None if not found
        """
        if version:
            return db.query(Prompt).filter(
                and_(Prompt.name == name, Prompt.version == version)
            ).first()
        else:
            # Get latest active version
            prompt = db.query(Prompt).filter(
                and_(Prompt.name == name, Prompt.status == PromptStatus.ACTIVE)
            ).order_by(Prompt.created_at.desc()).first()
            
            # If no active version, get latest version regardless of status
            if not prompt:
                prompt = db.query(Prompt).filter(
                    Prompt.name == name
                ).order_by(Prompt.created_at.desc()).first()
            
            return prompt
    
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
    def list_prompts(db: Session) -> List[Prompt]:
        """
        Get all prompts, returning the latest version of each unique prompt name.
        
        Args:
            db: Database session
            
        Returns:
            List of prompts (latest version of each name) ordered by creation date
        """
        # Get all unique prompt names
        names = db.query(distinct(Prompt.name)).all()
        names = [name[0] for name in names]
        
        # Get latest version of each prompt
        prompts = []
        for name in names:
            prompt = db.query(Prompt).filter(Prompt.name == name).order_by(Prompt.created_at.desc()).first()
            if prompt:
                prompts.append(prompt)
        
        return sorted(prompts, key=lambda p: p.created_at, reverse=True)
    
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
        metadata = prompt.prompt_metadata or {}
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
    
    @staticmethod
    def delete_prompt(db: Session, name: str, version: Optional[str] = None) -> bool:
        """
        Delete a prompt version or all versions of a prompt.
        
        Args:
            db: Database session
            name: Prompt name
            version: Optional version to delete (if None, deletes all versions)
            
        Returns:
            True if deleted, False if not found
        """
        if version:
            prompt = PromptService.get_prompt(db, name, version)
            if not prompt:
                return False
            db.delete(prompt)
        else:
            # Delete all versions of the prompt
            prompts = db.query(Prompt).filter(Prompt.name == name).all()
            if not prompts:
                return False
            for prompt in prompts:
                db.delete(prompt)
        
        db.commit()
        return True

