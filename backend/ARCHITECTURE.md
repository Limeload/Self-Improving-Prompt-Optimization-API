# Architecture Overview

## System Design

This document explains the architecture and design decisions for the Self-Improving Prompt Optimization API.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Prompts  │  │Evaluations│ │ Datasets │  │   Diff   │   │
│  │   API    │  │    API    │ │   API    │  │   API    │   │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────┴────────────────────────────┴──────────────┴─────┐  │
│  │              Service Layer                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │  │
│  │  │   Prompt     │  │  Evaluation  │  │Improvement│  │  │
│  │  │   Service    │  │   Service    │  │  Service  │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │  │
│  └─────────┼──────────────────┼─────────────────┼────────┘  │
│            │                  │                 │            │
│  ┌─────────┴──────────────────┴─────────────────┴────────┐ │
│  │              Utility Layer                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐    │ │
│  │  │ LangChain    │  │  Validators  │  │   Diff   │    │ │
│  │  │   Utils      │  │              │  │   Utils  │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Prompts  │  │Evaluations│ │ Results  │  │ Datasets │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              OpenAI API (LLM)                         │ │
│  │  - Generation Model (gpt-4o-mini)                    │ │
│  │  - Judge Model (gpt-4)                                │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Data Models (`app/models/`)

#### Prompt Model
- **Purpose**: Versioned prompt storage
- **Key Features**:
  - Unique constraint on (name, version)
  - Status tracking (draft/active/archived)
  - Parent-child relationships for lineage
  - JSON schemas for input/output validation
  - Metadata for model configuration

#### Evaluation Model
- **Purpose**: Store evaluation runs and results
- **Key Features**:
  - Links to prompt and dataset
  - Aggregate metrics (overall, correctness, format, etc.)
  - Per-example results stored separately
  - Failure case tracking

#### Dataset Model
- **Purpose**: Store evaluation test cases
- **Key Features**:
  - Collections of test cases
  - Support for expected outputs and rubrics
  - Metadata for categorization

### 2. Service Layer (`app/services/`)

#### PromptService
- **Responsibilities**:
  - CRUD operations for prompts
  - Version management
  - Stable inference endpoint (latest active)
  - Version activation/deactivation

#### EvaluationService
- **Responsibilities**:
  - Running evaluations against datasets
  - Coordinating validators and judges
  - Aggregating scores
  - Failure analysis

#### ImprovementService
- **Responsibilities**:
  - Analyzing evaluation failures
  - Generating candidate prompts via LLM
  - Evaluating candidates
  - Making promotion decisions

### 3. Utility Layer (`app/utils/`)

#### LangChain Utils
- **PromptExecutor**: Executes prompts using LangChain
- **LLMJudge**: Blinded LLM-based evaluation
- **Key Design**: Separate models for generation vs. judging

#### Validators
- **FormatValidator**: Deterministic validation
  - JSON schema validation
  - Regex pattern matching
  - Constraint checking (length, types, etc.)

#### Diff Utils
- **PromptDiff**: Computes diffs between versions
- **Changelog Generation**: Human-readable change summaries

## Data Flow

### Prompt Creation Flow

```
User Request → API → PromptService → Database
                    ↓
              Validation (schemas)
                    ↓
              Create Prompt Version
                    ↓
              Return Prompt Response
```

### Evaluation Flow

```
User Request → API → EvaluationService
                    ↓
              Get Prompt & Dataset
                    ↓
              For each test case:
                    ↓
        ┌───────────┴───────────┐
        │                       │
   PromptExecutor          FormatValidator
   (Run prompt)           (Validate output)
        │                       │
        └───────────┬───────────┘
                    ↓
              LLMJudge
              (Score output)
                    ↓
              Store Results
                    ↓
              Aggregate Metrics
                    ↓
              Return Evaluation
```

### Self-Improvement Flow

```
User Request → API → ImprovementService
                    ↓
              Evaluate Baseline
                    ↓
              Analyze Failures
                    ↓
              Generate Candidates (LLM)
                    ↓
              For each candidate:
                    ↓
              Evaluate Candidate
                    ↓
              Compare Scores
                    ↓
              Apply Promotion Rules
                    ↓
              Promote or Reject
                    ↓
              Return Decision
```

## Key Design Decisions

### 1. Versioning Strategy

**Decision**: Store each prompt change as a new version, never overwrite.

**Rationale**:
- Enables rollback
- Provides audit trail
- Supports A/B testing
- Maintains reproducibility

### 2. Separate Judge Model

**Decision**: Use different LLM model for evaluation than generation.

**Rationale**:
- Prevents evaluation leakage
- Allows using more capable models for judging
- Enables consistent, low-variance scoring

### 3. Blinded Evaluation

**Decision**: Judge doesn't know which prompt generated the output.

**Rationale**:
- Reduces bias
- More objective evaluation
- Better generalization

### 4. Deterministic + LLM Evaluation

**Decision**: Combine format validators with LLM judges.

**Rationale**:
- Format validation is fast and reliable
- LLM judges handle semantic correctness
- Best of both worlds

### 5. Automatic Promotion Rules

**Decision**: Configurable thresholds for automatic promotion.

**Rationale**:
- Enables CI/CD automation
- Prevents regressions
- Maintains quality standards

### 6. Full History Storage

**Decision**: Store all evaluations and results.

**Rationale**:
- Enables trend analysis
- Supports debugging
- Provides data for future improvements

## Security Considerations

### 1. API Key Management
- Environment variables for sensitive data
- No hardcoded credentials

### 2. Input Validation
- Pydantic schemas validate all inputs
- SQL injection prevention via SQLAlchemy ORM

### 3. Evaluation Leakage Prevention
- Separate models for generation/judging
- Blinded evaluation process

### 4. Cost Control
- Configurable models (use cheaper for generation)
- Evaluation caching opportunities (future enhancement)

## Scalability Considerations

### Current Limitations
- Synchronous evaluation (can be slow for large datasets)
- No caching of LLM calls
- Single database instance

### Future Enhancements
- Background task queue (Celery) for long-running evaluations
- Redis caching for LLM responses
- Database read replicas for scaling reads
- Horizontal scaling with load balancer

## Testing Strategy

### Unit Tests (Future)
- Service layer logic
- Validator functions
- Diff utilities

### Integration Tests (Future)
- API endpoint testing
- Database operations
- LLM integration (mocked)

### End-to-End Tests (Future)
- Full improvement loop
- Promotion decision logic
- Error handling

## Monitoring & Observability (Future)

### Metrics to Track
- Evaluation success rates
- Average improvement deltas
- Promotion/rejection rates
- LLM API latency
- Database query performance

### Logging
- All prompt changes
- Evaluation results
- Promotion decisions
- Error cases

## Extension Points

### Adding New Evaluation Dimensions
1. Update `EvaluationResult` model
2. Update `LLMJudge` prompt
3. Update schemas

### Custom Promotion Rules
1. Modify `ImprovementService.improve_prompt()`
2. Add custom validation logic
3. Update configuration

### New Validator Types
1. Add methods to `FormatValidator`
2. Integrate in `EvaluationService`
3. Update schemas if needed

### Multi-Model Support
1. Add model selection logic
2. Update `PromptExecutor` and `LLMJudge`
3. Add model metadata to prompts

## Conclusion

This architecture provides a solid foundation for CI/CD for prompts while maintaining flexibility for future enhancements. The modular design allows for easy extension and customization.

