# Quick Start Guide

Get the Self-Improving Prompt Optimization API running in 5 minutes.

## Prerequisites

- Python 3.11+
- PostgreSQL (running locally or remote)
- OpenAI API key

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/prompt_optimization_db
OPENAI_API_KEY=sk-your-key-here
JUDGE_MODEL=gpt-4
GENERATION_MODEL=gpt-4o-mini
```

### 3. Create Database

```bash
# Create database (PostgreSQL)
createdb prompt_optimization_db

# Or using psql:
psql -U postgres
CREATE DATABASE prompt_optimization_db;
```

### 4. Initialize Database Schema

```bash
# Run migrations
alembic upgrade head

# Or create tables directly (for development)
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 5. Start the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the provided script:

```bash
./run.sh
```

### 6. Test the API

Open your browser to:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Example: Create Your First Prompt

### 1. Create a Prompt

```bash
curl -X POST "http://localhost:8000/prompts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sentiment_analyzer",
    "version": "1.0.0",
    "template_text": "Analyze the sentiment of this text: {text}\n\nRespond with JSON: {\"sentiment\": \"positive\" or \"negative\" or \"neutral\"}",
    "output_schema": {
      "type": "object",
      "properties": {
        "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]}
      },
      "required": ["sentiment"]
    },
    "metadata": {
      "model": "gpt-4o-mini",
      "temperature": 0.3,
      "task": "sentiment_analysis"
    }
  }'
```

### 2. Create a Dataset

```bash
curl -X POST "http://localhost:8000/datasets" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sentiment_test",
    "entries": [
      {
        "input_data": {"text": "I love this product!"},
        "expected_output": {"sentiment": "positive"}
      },
      {
        "input_data": {"text": "This is terrible"},
        "expected_output": {"sentiment": "negative"}
      },
      {
        "input_data": {"text": "It is okay"},
        "expected_output": {"sentiment": "neutral"}
      }
    ]
  }'
```

### 3. Run Inference

```bash
curl -X POST "http://localhost:8000/prompts/sentiment_analyzer/run" \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {"text": "This is amazing!"}
  }'
```

### 4. Evaluate the Prompt

```bash
curl -X POST "http://localhost:8000/evaluations/prompts/sentiment_analyzer/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": 1,
    "evaluation_dimensions": ["correctness", "format"]
  }'
```

### 5. Trigger Self-Improvement

```bash
curl -X POST "http://localhost:8000/evaluations/prompts/sentiment_analyzer/improve" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": 1,
    "improvement_threshold": 0.05,
    "max_candidates": 3
  }'
```

## Using the Interactive API Docs

The easiest way to explore the API is through the interactive Swagger UI:

1. Start the server
2. Navigate to http://localhost:8000/docs
3. Click "Try it out" on any endpoint
4. Fill in the request body
5. Click "Execute"

## Common Issues

### Database Connection Error

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct.

### OpenAI API Error

```
openai.error.AuthenticationError: Invalid API key
```

**Solution**: Check your `OPENAI_API_KEY` in `.env` file.

### Import Errors

```
ModuleNotFoundError: No module named 'app'
```

**Solution**: Make sure you're running from the `backend/` directory or have the correct Python path.

## Next Steps

- Read the full [README.md](README.md) for architecture details
- Explore the API endpoints in `/docs`
- Check out the code examples in the README
- Customize evaluation dimensions and promotion rules

## Support

For issues or questions:
1. Check the [README.md](README.md) for detailed documentation
2. Review the code comments for implementation details
3. Check the API docs at `/docs` for endpoint specifications

