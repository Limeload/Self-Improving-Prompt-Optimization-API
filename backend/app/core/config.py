"""
Application configuration using Pydantic settings.
Centralizes all environment variables and configuration.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/prompt_optimization_db"
    
    # OpenAI API
    OPENAI_API_KEY: str
    JUDGE_MODEL: str = "gpt-4"
    GENERATION_MODEL: str = "gpt-4o-mini"
    
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True
    
    # Redis (for Celery)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    
    # Evaluation Settings
    IMPROVEMENT_THRESHOLD: float = 0.05  # 5% improvement required for promotion
    MIN_FORMAT_PASS_RATE: float = 0.95  # 95% format pass rate required
    REGRESSION_GUARDRAIL: float = 0.02  # 2% regression allowed before blocking
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

