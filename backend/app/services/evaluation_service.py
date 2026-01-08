"""
Evaluation service - handles prompt evaluation against datasets.
Runs deterministic validators and LLM-based judges.
"""
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Dict, Any, Optional
from app.models.prompt import Prompt
from app.models.evaluation import Evaluation, EvaluationResult
from app.models.dataset import Dataset, DatasetEntry
from app.utils.langchain_utils import PromptExecutor, LLMJudge
from app.utils.validators import FormatValidator
from app.core.config import settings


class EvaluationService:
    """Service for evaluating prompts"""
    
    @staticmethod
    def evaluate_prompt(
        db: Session,
        prompt: Prompt,
        dataset: Optional[Dataset] = None,
        dataset_entries: Optional[List[Dict[str, Any]]] = None,
        evaluation_dimensions: Optional[List[str]] = None,
    ) -> Evaluation:
        """
        Evaluate a prompt against a dataset.
        
        Args:
            db: Database session
            prompt: Prompt to evaluate
            dataset: Optional dataset object
            dataset_entries: Optional inline dataset entries
            evaluation_dimensions: List of dimensions to evaluate
            
        Returns:
            Evaluation object with results
        """
        evaluation_dimensions = evaluation_dimensions or ["correctness", "format"]
        
        # Prepare dataset entries
        if dataset:
            entries = dataset.entries
        elif dataset_entries:
            # Create temporary dataset entries from inline data
            entries = [
                DatasetEntry(
                    input_data=entry.get("input_data", {}),
                    expected_output=entry.get("expected_output"),
                    rubric=entry.get("rubric"),
                )
                for entry in dataset_entries
            ]
        else:
            # Create default test entries if no dataset provided
            # Use a simple test case based on the prompt's input schema
            default_input = {}
            if prompt.input_schema:
                # Try to extract example values from schema
                properties = prompt.input_schema.get("properties", {})
                for key, prop in properties.items():
                    prop_type = prop.get("type", "string")
                    if prop_type == "string":
                        default_input[key] = f"sample_{key}"
                    elif prop_type == "number":
                        default_input[key] = 0
                    elif prop_type == "boolean":
                        default_input[key] = True
                    elif prop_type == "array":
                        default_input[key] = []
                    elif prop_type == "object":
                        default_input[key] = {}
            else:
                # No schema, use a generic test input
                default_input = {"text": "This is a test input for evaluation."}
            
            entries = [
                DatasetEntry(
                    input_data=default_input,
                    expected_output=None,
                    rubric="Evaluate the prompt's ability to process the input correctly.",
                )
            ]
        
        # Create evaluation record
        evaluation = Evaluation(
            prompt_id=prompt.id,
            dataset_id=dataset.id if dataset else None,
            evaluation_type="full",
            judge_model=settings.JUDGE_MODEL,
        )
        db.add(evaluation)
        db.flush()
        
        # Initialize executor and judge
        metadata = prompt.prompt_metadata or {}
        executor = PromptExecutor(
            model_name=metadata.get("model"),
            temperature=metadata.get("temperature"),
        )
        judge = LLMJudge()
        validator = FormatValidator()
        
        # Evaluate each entry
        results = []
        passed_count = 0
        failed_count = 0
        format_passed_count = 0
        
        for entry in entries:
            result = EvaluationService._evaluate_single_entry(
                evaluation,
                prompt,
                entry,
                executor,
                judge,
                validator,
                evaluation_dimensions,
            )
            results.append(result)
            
            if result.passed:
                passed_count += 1
            else:
                failed_count += 1
            
            if result.passed_format_validation:
                format_passed_count += 1
        
        # Calculate aggregate metrics
        if results:
            evaluation.overall_score = sum(r.overall_score or 0 for r in results) / len(results)
            evaluation.correctness_score = sum(r.correctness_score or 0 for r in results) / len(results)
            evaluation.format_score = sum(r.format_score or 0 for r in results) / len(results)
            evaluation.verbosity_score = sum(r.verbosity_score or 0 for r in results) / len(results) if any(r.verbosity_score for r in results) else None
            evaluation.safety_score = sum(r.safety_score or 0 for r in results) / len(results) if any(r.safety_score for r in results) else None
            evaluation.consistency_score = sum(r.consistency_score or 0 for r in results) / len(results) if any(r.consistency_score for r in results) else None
        
        evaluation.total_examples = len(results)
        evaluation.passed_examples = passed_count
        evaluation.failed_examples = failed_count
        evaluation.format_pass_rate = format_passed_count / len(results) if results else 0.0
        
        # Collect failure cases
        failure_cases = [
            {
                "entry_id": r.dataset_entry_id,
                "reason": r.failure_reason,
                "input": r.input_data,
            }
            for r in results if not r.passed
        ]
        evaluation.failure_cases = failure_cases[:10]  # Limit to 10
        
        evaluation.completed_at = func.now()
        db.commit()
        db.refresh(evaluation)
        
        return evaluation
    
    @staticmethod
    def _evaluate_single_entry(
        evaluation: Evaluation,
        prompt: Prompt,
        entry: DatasetEntry,
        executor: PromptExecutor,
        judge: LLMJudge,
        validator: FormatValidator,
        dimensions: List[str],
    ) -> EvaluationResult:
        """
        Evaluate a single dataset entry.
        
        Returns:
            EvaluationResult object
        """
        # Run prompt
        try:
            output = executor.execute(
                template_text=prompt.template_text,
                input_data=entry.input_data,
                output_schema=prompt.output_schema,
            )
            actual_output = output if isinstance(output, dict) else {"output": output}
        except Exception as e:
            # Failed to execute
            result = EvaluationResult(
                evaluation_id=evaluation.id,
                dataset_entry_id=entry.id if hasattr(entry, 'id') else None,
                input_data=entry.input_data,
                expected_output=entry.expected_output,
                actual_output=None,
                passed=False,
                failure_reason=f"Execution failed: {str(e)}",
            )
            return result
        
        # Format validation
        format_passed = False
        format_error = None
        
        if prompt.output_schema:
            format_passed, format_error = validator.validate_json_schema(
                actual_output,
                prompt.output_schema,
            )
        
        # LLM-based evaluation
        judge_result = None
        if "correctness" in dimensions or "verbosity" in dimensions or "safety" in dimensions or "consistency" in dimensions:
            try:
                judge_result = judge.evaluate(
                    input_data=entry.input_data,
                    actual_output=actual_output,
                    expected_output=entry.expected_output,
                    rubric=entry.rubric,
                    dimensions=dimensions,
                )
            except Exception as e:
                # Judge failed, continue with format validation only
                pass
        
        # Extract scores
        scores = judge_result.get("scores", {}) if judge_result else {}
        
        result = EvaluationResult(
            evaluation_id=evaluation.id,
            dataset_entry_id=entry.id if hasattr(entry, 'id') else None,
            input_data=entry.input_data,
            expected_output=entry.expected_output,
            actual_output=actual_output,
            correctness_score=scores.get("correctness"),
            format_score=1.0 if format_passed else 0.0,
            verbosity_score=scores.get("verbosity"),
            safety_score=scores.get("safety"),
            consistency_score=scores.get("consistency"),
            overall_score=scores.get("overall"),
            passed_format_validation=format_passed,
            format_validation_error=format_error,
            judge_feedback=judge_result.get("feedback") if judge_result else None,
            judge_reasoning=scores.get("reasoning") if scores else None,
            passed=format_passed and (scores.get("overall", 0.0) >= 0.7 if scores else True),
            failure_reason=None if (format_passed and (scores.get("overall", 1.0) >= 0.7 if scores else True)) else (
                format_error or "Low overall score"
            ),
        )
        
        return result

