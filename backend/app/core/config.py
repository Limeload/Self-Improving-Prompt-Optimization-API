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
    
    # LLM Provider Settings
    LLM_PROVIDER: str = "openai"  # openai, ollama, huggingface, groq, anthropic
    
    # OpenAI API
    OPENAI_API_KEY: Optional[str] = None
    JUDGE_MODEL: str = "gpt-4"
    GENERATION_MODEL: str = "gpt-4o-mini"
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"  # or mistral, qwen, etc.
    OLLAMA_JUDGE_MODEL: str = "llama3.2"
    
    # HuggingFace Settings
    HUGGINGFACE_API_KEY: Optional[str] = None
    HUGGINGFACE_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    HUGGINGFACE_JUDGE_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    
    # Groq Settings (Free tier available)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_JUDGE_MODEL: str = "llama-3.1-70b-versatile"
    
    # Anthropic Settings
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    ANTHROPIC_JUDGE_MODEL: str = "claude-3-5-sonnet-20241022"
    
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
    
    # Caching Settings
    ENABLE_EVALUATION_CACHE: bool = True  # Enable caching of evaluation results
    EVALUATION_CACHE_MAX_SIZE: int = 1000  # Maximum cached entries
    EVALUATION_CACHE_TTL_SECONDS: int = 3600  # Cache TTL in seconds (1 hour)
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

