# Self-Improving Prompt Optimization API

A production-ready MVP for **CI/CD for prompts** — a system that treats prompts as versioned, testable artifacts, continuously evaluates them, proposes improvements, runs controlled experiments, and promotes better-performing prompts with full transparency and auditability.

## 🎯 Overview

This system enables you to:

- **Version prompts** like code, with full history and lineage tracking
- **Evaluate prompts** against datasets with deterministic validators and LLM-based judges
- **Automatically improve prompts** by analyzing failures and generating better candidates
- **Promote better prompts** automatically based on configurable criteria
- **Audit all changes** with diffs, changelogs, and natural-language explanations

## 🏗️ Architecture

### Core Components

1. **Prompt Versioning System** (`app/models/prompt.py`)
   - Prompts stored as templates with version numbers
   - Status tracking: `draft` → `active` → `archived`
   - Parent-child relationships for lineage
   - Stable inference endpoints (always use latest active by default)

2. **Evaluation Pipeline** (`app/services/evaluation_service.py`)
   - Deterministic validators: JSON schema, regex, constraints
   - LLM-based judges: Separate model, blinded evaluation
   - Multi-dimensional scoring: correctness, format, verbosity, safety, consistency
   - Per-example and aggregate metrics

3. **Self-Improvement Loop** (`app/services/improvement_service.py`)
   - Failure analysis from evaluation results
   - LLM-generated candidate prompts with rationale
   - A/B evaluation of candidates vs baseline
   - Automatic promotion based on thresholds

4. **Transparency Layer** (`app/utils/diff_utils.py`)
   - Prompt diffs between versions
   - Changelogs with metric deltas
   - Human-readable promotion decisions

### Technology Stack

- **Backend**: FastAPI (Python 3.11+)
- **LLM Orchestration**: LangChain
- **Database**: PostgreSQL (via SQLAlchemy)
- **API**: REST (JSON)
- **Migrations**: Alembic

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/              # API routes
│   │   ├── prompts.py    # Prompt CRUD and inference
│   │   ├── evaluations.py # Evaluation and improvement
│   │   └── datasets.py   # Dataset management
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings and env vars
│   │   └── database.py   # DB connection and session
│   ├── models/           # SQLAlchemy models
│   │   ├── prompt.py     # Prompt version model
│   │   ├── evaluation.py # Evaluation models
│   │   └── dataset.py    # Dataset models
│   ├── schemas/          # Pydantic schemas
│   │   ├── prompt.py     # Prompt request/response
│   │   ├── evaluation.py # Evaluation schemas
│   │   └── dataset.py    # Dataset schemas
│   ├── services/         # Business logic
│   │   ├── prompt_service.py      # Prompt management
│   │   ├── evaluation_service.py # Evaluation logic
│   │   └── improvement_service.py # Self-improvement
│   ├── utils/            # Utilities
│   │   ├── langchain_utils.py # LangChain abstractions
│   │   ├── validators.py      # Format validators
│   │   └── diff_utils.py      # Diff computation
│   └── main.py           # FastAPI app entry point
├── alembic/              # Database migrations
├── requirements.txt      # Python dependencies
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL database
- OpenAI API key (for LLM operations)

### Installation

1. **Clone and navigate to backend:**

```bash
cd backend
```

2. **Create virtual environment:**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**

```bash
pip install -r requirements.txt
```

4. **Set up environment variables:**

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/prompt_optimization_db
OPENAI_API_KEY=your_openai_api_key_here
JUDGE_MODEL=gpt-4
GENERATION_MODEL=gpt-4o-mini
```

5. **Initialize database:**

```bash
# Create database tables
alembic upgrade head
```

6. **Run the API:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

## 📡 API Endpoints

### Prompts

- `POST /prompts` - Create a new prompt version
- `GET /prompts/{name}` - Get prompt (latest active or specific version)
- `POST /prompts/{name}/run` - Run prompt inference
- `GET /prompts/{name}/versions` - List all versions
- `GET /diffs/{version_a_id}/{version_b_id}` - Get diff between versions

### Evaluations

- `POST /evaluations/prompts/{name}/evaluate` - Evaluate a prompt
- `GET /evaluations/{id}` - Get evaluation results
- `POST /evaluations/prompts/{name}/improve` - Trigger self-improvement

### Datasets

- `POST /datasets` - Create a dataset
- `GET /datasets/{id}` - Get a dataset

## 🔄 How CI/CD for Prompts Works

### 1. Versioning

Prompts are versioned like code:

```python
# Create initial version
POST /prompts
{
  "name": "email_classifier",
  "version": "1.0.0",
  "template_text": "Classify this email: {email_text}",
  "output_schema": {"type": "object", "properties": {"category": {"type": "string"}}}
}
```

### 2. Evaluation

Evaluate prompts against datasets:

```python
# Create dataset
POST /datasets
{
  "name": "email_test_set",
  "entries": [
    {
      "input_data": {"email_text": "Meeting at 3pm"},
      "expected_output": {"category": "calendar"}
    }
  ]
}

# Evaluate prompt
POST /evaluations/prompts/email_classifier/evaluate
{
  "dataset_id": 1,
  "evaluation_dimensions": ["correctness", "format"]
}
```

### 3. Self-Improvement

The system automatically improves prompts:

```python
# Trigger improvement
POST /evaluations/prompts/email_classifier/improve
{
  "dataset_id": 1,
  "improvement_threshold": 0.05,
  "max_candidates": 3
}
```

**What happens:**
1. Baseline prompt is evaluated
2. Failure cases are analyzed
3. LLM generates improved candidate prompts
4. Candidates are evaluated against the same dataset
5. Best candidate is promoted if it meets criteria:
   - Improvement ≥ threshold (default 5%)
   - Format pass rate ≥ minimum (default 95%)
   - No regression beyond guardrail (default 2%)

### 4. Promotion Decision

Promotion decisions are transparent:

```json
{
  "baseline_version": "1.0.0",
  "baseline_score": 0.75,
  "best_candidate_version": "1.1.0",
  "best_candidate_score": 0.82,
  "improvement_delta": 0.07,
  "promotion_decision": "promoted",
  "promotion_reason": "Improvement of 7.00% exceeds threshold (5.00%). Format pass rate: 98.00%. No regression detected."
}
```

## 🎛️ Configuration

Key settings in `.env`:

- `IMPROVEMENT_THRESHOLD`: Minimum improvement required for promotion (default: 0.05 = 5%)
- `MIN_FORMAT_PASS_RATE`: Minimum format validation pass rate (default: 0.95 = 95%)
- `REGRESSION_GUARDRAIL`: Maximum allowed regression (default: 0.02 = 2%)
- `JUDGE_MODEL`: Model for LLM-based evaluation (default: gpt-4)
- `GENERATION_MODEL`: Model for prompt execution (default: gpt-4o-mini)

## 🔒 Safety & Reliability

### Evaluation Leakage Prevention

- **Separate models**: Generation and judge use different models
- **Blinded evaluation**: Judge doesn't know which prompt generated the output
- **Deterministic validators**: Format validation is independent of LLM

### Reproducibility

- **Versioned prompts**: Every change creates a new version
- **Stored evaluations**: All results are persisted
- **Deterministic modes**: Judge uses temperature=0 for consistency

### Cost Control

- **Caching**: Identical LLM calls can be cached (implement as needed)
- **Efficient evaluation**: Only evaluates changed prompts
- **Configurable models**: Use cheaper models for generation, better models for judging

## 📊 Example Workflow

```python
# 1. Create initial prompt
prompt_v1 = create_prompt("sentiment_analyzer", "1.0.0", "Analyze sentiment: {text}")

# 2. Create evaluation dataset
dataset = create_dataset("sentiment_test", [
    {"input_data": {"text": "I love this!"}, "expected_output": {"sentiment": "positive"}},
    {"input_data": {"text": "This is terrible"}, "expected_output": {"sentiment": "negative"}}
])

# 3. Evaluate baseline
eval_v1 = evaluate_prompt("sentiment_analyzer", dataset_id=dataset.id)
# Score: 0.72

# 4. Trigger improvement
improvement = improve_prompt("sentiment_analyzer", dataset_id=dataset.id)
# Generates candidates, evaluates, promotes v1.1.0
# New score: 0.81 (12.5% improvement)

# 5. View diff
diff = get_diff(prompt_v1.id, improvement.best_candidate_id)
# Shows what changed and why
```

## 🔧 Extending the System

### Adding New Evaluation Dimensions

1. Update `EvaluationResult` model to add new score field
2. Update `LLMJudge._build_evaluation_prompt()` to include new dimension
3. Update schemas to include new dimension

### Custom Promotion Rules

Modify `ImprovementService.improve_prompt()` to add custom logic:

```python
# Example: Require improvement in all dimensions
if not all([
    candidate_eval.correctness_score > baseline_eval.correctness_score,
    candidate_eval.format_score > baseline_eval.format_score,
    ...
]):
    decision = "rejected"
```

### Custom Validators

Add new validators in `app/utils/validators.py`:

```python
@staticmethod
def validate_custom_constraint(output: dict, constraint: dict) -> tuple[bool, str]:
    # Your validation logic
    pass
```

## 📝 Design Decisions

### Why LangChain?

- Provides abstractions for prompt templates and LLM calls
- Supports multiple LLM providers
- Handles output parsing and validation

### Why Separate Judge Model?

- Prevents evaluation leakage (judge doesn't know the prompt)
- Allows using more capable models for evaluation
- Enables consistent, low-variance scoring

### Why Version Everything?

- Enables rollback if new version performs worse
- Provides audit trail for compliance
- Allows A/B testing and gradual rollout

### Why Store All Evaluations?

- Enables trend analysis over time
- Provides data for future improvements
- Supports debugging and failure analysis

## 🐛 Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and `DATABASE_URL` is correct:
```bash
psql -U user -d prompt_optimization_db -c "SELECT 1;"
```

### LLM API Errors

Check your OpenAI API key:
```bash
export OPENAI_API_KEY=your_key_here
```

### Migration Issues

Reset database (⚠️ **deletes all data**):
```bash
alembic downgrade base
alembic upgrade head
```

## 📚 Further Reading

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

## 🤝 Contributing

This is an MVP. Areas for improvement:

- [ ] Add caching for LLM calls
- [ ] Implement background task queue (Celery)
- [ ] Add more sophisticated failure analysis
- [ ] Support multi-model evaluation
- [ ] Add webhook notifications for promotions
- [ ] Implement prompt templates library
- [ ] Add cost tracking per evaluation

## 📄 License

[Your License Here]

---

**Built with ❤️ for production-ready prompt engineering**

