"""
FastAPI application entry point.
Sets up the API with all routes and middleware.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import prompts, evaluations, datasets
from app.core.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Self-Improving Prompt Optimization API",
    description="CI/CD for prompts - version, evaluate, and continuously improve prompts",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(prompts.router)
app.include_router(evaluations.router)
app.include_router(datasets.router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Self-Improving Prompt Optimization API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

