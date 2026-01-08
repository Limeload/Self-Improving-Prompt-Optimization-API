"""
FastAPI application entry point.
Sets up the API with all routes and middleware.
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api import prompts, evaluations, datasets
from app.core.database import engine, Base
import logging

logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Self-Improving Prompt Optimization API",
    description="CI/CD for prompts - version, evaluate, and continuously improve prompts",
    version="0.1.0",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for validation errors to provide better error messages"""
    logger.error(f"Validation error on {request.url.path}: {exc.errors()}")
    # Try to get request body if available
    try:
        body = await request.body()
        if body:
            logger.error(f"Request body: {body.decode('utf-8', errors='ignore')}")
    except Exception:
        pass
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Validation error - check the detail field for specific field errors"
        },
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

