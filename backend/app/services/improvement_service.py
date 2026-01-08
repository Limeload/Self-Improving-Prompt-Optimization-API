"""
Self-improvement service - analyzes failures and generates improved prompt candidates.
Implements the core CI/CD loop for prompts.
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from app.models.prompt import Prompt, PromptStatus
from app.models.evaluation import Evaluation
from app.models.dataset import Dataset
from app.services.prompt_service import PromptService
from app.services.evaluation_service import EvaluationService
from app.core.config import settings
import json


class ImprovementService:
    """Service for self-improving prompts"""
    
    @staticmethod
    def improve_prompt(
        db: Session,
        prompt_name: str,
        dataset: Optional[Dataset] = None,
        baseline_version: Optional[str] = None,
        improvement_threshold: Optional[float] = None,
        max_candidates: int = 3,
    ) -> Dict[str, Any]:
        """
        Run self-improvement loop for a prompt.
        
        Steps:
        1. Evaluate baseline prompt
        2. Analyze failure cases
        3. Generate candidate improvements
        4. Evaluate candidates
        5. Promote best candidate if it meets criteria
        
        Args:
            db: Database session
            prompt_name: Name of prompt to improve
            dataset: Dataset for evaluation
            baseline_version: Version to compare against (defaults to active)
            improvement_threshold: Minimum improvement required
            max_candidates: Maximum candidates to generate
            
        Returns:
            Dictionary with improvement results
        """
        improvement_threshold = improvement_threshold or settings.IMPROVEMENT_THRESHOLD
        
        # Get baseline prompt
        baseline = PromptService.get_prompt(db, prompt_name, baseline_version)
        if not baseline:
            raise ValueError(f"Prompt {prompt_name} not found")
        
        # Evaluate baseline
        baseline_eval = EvaluationService.evaluate_prompt(db, baseline, dataset)
        baseline_score = baseline_eval.overall_score or 0.0
        
        # Analyze failures and generate candidates
        candidates = ImprovementService._generate_candidates(
            db,
            baseline,
            baseline_eval,
            max_candidates,
        )
        
        # Evaluate each candidate
        best_candidate = None
        best_score = baseline_score
        best_eval = None
        
        for candidate in candidates:
            candidate_eval = EvaluationService.evaluate_prompt(db, candidate, dataset)
            candidate_score = candidate_eval.overall_score or 0.0
            
            if candidate_score > best_score:
                best_score = candidate_score
                best_candidate = candidate
                best_eval = candidate_eval
        
        # Make promotion decision
        improvement_delta = best_score - baseline_score
        meets_threshold = improvement_delta >= improvement_threshold
        meets_format = best_eval.format_pass_rate >= settings.MIN_FORMAT_PASS_RATE if best_eval else False
        no_regression = improvement_delta >= -settings.REGRESSION_GUARDRAIL
        
        if meets_threshold and meets_format and no_regression and best_candidate:
            # Promote best candidate
            PromptService.activate_version(db, prompt_name, best_candidate.version)
            decision = "promoted"
            reason = (
                f"Improvement of {improvement_delta:.2%} exceeds threshold ({improvement_threshold:.2%}). "
                f"Format pass rate: {best_eval.format_pass_rate:.2%}. "
                f"No regression detected."
            )
        else:
            decision = "rejected"
            reasons = []
            if not meets_threshold:
                reasons.append(f"Improvement ({improvement_delta:.2%}) below threshold ({improvement_threshold:.2%})")
            if not meets_format:
                reasons.append(f"Format pass rate ({best_eval.format_pass_rate:.2%}) below minimum ({settings.MIN_FORMAT_PASS_RATE:.2%})")
            if not no_regression:
                reasons.append(f"Regression detected ({improvement_delta:.2%})")
            if not best_candidate:
                reasons.append("No candidate outperformed baseline")
            reason = "; ".join(reasons)
        
        return {
            "baseline_prompt_id": baseline.id,
            "baseline_version": baseline.version,
            "baseline_score": baseline_score,
            "candidates_generated": len(candidates),
            "candidates_evaluated": len(candidates),
            "best_candidate_id": best_candidate.id if best_candidate else None,
            "best_candidate_version": best_candidate.version if best_candidate else None,
            "best_candidate_score": best_score,
            "improvement_delta": improvement_delta,
            "promotion_decision": decision,
            "promotion_reason": reason,
        }
    
    @staticmethod
    def _generate_candidates(
        db: Session,
        baseline: Prompt,
        baseline_eval: Evaluation,
        max_candidates: int,
    ) -> List[Prompt]:
        """
        Generate improved prompt candidates based on failure analysis.
        
        Uses LLM to analyze failures and propose improvements.
        
        Args:
            db: Database session
            baseline: Baseline prompt
            baseline_eval: Baseline evaluation results
            max_candidates: Maximum candidates to generate
            
        Returns:
            List of candidate prompts
        """
        # Analyze failures
        failure_analysis = ImprovementService._analyze_failures(baseline, baseline_eval)
        
        # Generate candidate prompts
        llm = ChatOpenAI(
            model=settings.GENERATION_MODEL,
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY,
        )
        
        improvement_prompt = f"""You are an expert prompt engineer. Analyze the following prompt and its failures, then propose improved versions.

BASELINE PROMPT:
{baseline.template_text}

FAILURE ANALYSIS:
{failure_analysis}

TASK: Generate {max_candidates} improved versions of this prompt that address the identified failures.

For each candidate, provide:
1. An improved prompt template
2. A brief explanation of what was changed and why
3. How it addresses the failure cases

Respond with a JSON array, where each element has:
{{
  "version": "<incremented version number>",
  "template_text": "<improved prompt>",
  "rationale": "<explanation of changes>",
  "addressed_failures": ["<list of failure types addressed>"]
}}
"""
        
        try:
            response = llm.invoke(improvement_prompt)
            content = response.content
            
            # Parse JSON from response
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "```" in content:
                json_start = content.find("```") + 3
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            
            candidates_data = json.loads(content)
            if not isinstance(candidates_data, list):
                candidates_data = [candidates_data]
        except Exception as e:
            # Fallback: generate simple candidates
            candidates_data = ImprovementService._generate_fallback_candidates(baseline, max_candidates)
        
        # Create prompt versions for each candidate
        candidates = []
        for i, candidate_data in enumerate(candidates_data[:max_candidates]):
            # Determine next version
            version_parts = baseline.version.split(".")
            if len(version_parts) == 3 and version_parts[0].isdigit():
                # Semantic versioning
                major, minor, patch = map(int, version_parts)
                new_version = f"{major}.{minor + 1}.{i}"
            else:
                # Incremental versioning
                base_version = baseline.version.lstrip("v")
                try:
                    version_num = int(base_version) + i + 1
                    new_version = f"v{version_num}"
                except ValueError:
                    new_version = f"{baseline.version}-candidate-{i+1}"
            
            # Create new prompt version
            from app.schemas.prompt import PromptCreate
            
            prompt_create = PromptCreate(
                name=baseline.name,
                version=new_version,
                template_text=candidate_data.get("template_text", baseline.template_text),
                input_schema=baseline.input_schema,
                output_schema=baseline.output_schema,
                metadata={
                    **(baseline.metadata or {}),
                    "improvement_rationale": candidate_data.get("rationale", ""),
                    "addressed_failures": candidate_data.get("addressed_failures", []),
                    "parent_version": baseline.version,
                },
                parent_version_id=baseline.id,
                status=PromptStatus.DRAFT,
            )
            
            candidate = PromptService.create_prompt(db, prompt_create)
            candidates.append(candidate)
        
        return candidates
    
    @staticmethod
    def _analyze_failures(baseline: Prompt, evaluation: Evaluation) -> str:
        """
        Analyze evaluation failures and generate summary.
        
        Args:
            baseline: Baseline prompt
            evaluation: Evaluation results
            
        Returns:
            Human-readable failure analysis
        """
        failure_cases = evaluation.failure_cases or []
        
        if not failure_cases:
            return "No specific failure cases identified. Overall score could be improved."
        
        analysis = f"Evaluation Results:\n"
        analysis += f"- Overall Score: {evaluation.overall_score:.2f}\n"
        analysis += f"- Format Pass Rate: {evaluation.format_pass_rate:.2%}\n"
        analysis += f"- Failed Examples: {evaluation.failed_examples}/{evaluation.total_examples}\n\n"
        
        analysis += "Failure Cases:\n"
        for i, case in enumerate(failure_cases[:5], 1):  # Limit to 5
            analysis += f"{i}. {case.get('reason', 'Unknown reason')}\n"
            analysis += f"   Input: {json.dumps(case.get('input', {}), indent=2)[:200]}...\n"
        
        if len(failure_cases) > 5:
            analysis += f"\n... and {len(failure_cases) - 5} more failures\n"
        
        # Identify common failure patterns
        common_patterns = []
        if evaluation.format_pass_rate < 0.95:
            common_patterns.append("Format validation failures")
        if evaluation.correctness_score and evaluation.correctness_score < 0.7:
            common_patterns.append("Low correctness scores")
        if evaluation.overall_score and evaluation.overall_score < 0.7:
            common_patterns.append("Low overall performance")
        
        if common_patterns:
            analysis += f"\nCommon Issues: {', '.join(common_patterns)}\n"
        
        return analysis
    
    @staticmethod
    def _generate_fallback_candidates(baseline: Prompt, max_candidates: int) -> List[Dict[str, Any]]:
        """
        Generate simple fallback candidates if LLM generation fails.
        
        Args:
            baseline: Baseline prompt
            max_candidates: Number of candidates
            
        Returns:
            List of candidate data dictionaries
        """
        candidates = []
        
        # Candidate 1: Add more explicit instructions
        candidates.append({
            "version": "1",
            "template_text": f"{baseline.template_text}\n\nPlease ensure your response is accurate, well-formatted, and complete.",
            "rationale": "Added explicit instructions for accuracy and formatting",
            "addressed_failures": ["format", "correctness"],
        })
        
        # Candidate 2: Add examples
        if max_candidates > 1:
            candidates.append({
                "version": "2",
                "template_text": f"{baseline.template_text}\n\nExample:\nInput: [example input]\nOutput: [example output]",
                "rationale": "Added example to guide output format",
                "addressed_failures": ["format"],
            })
        
        # Candidate 3: Add step-by-step reasoning
        if max_candidates > 2:
            candidates.append({
                "version": "3",
                "template_text": f"Think step by step.\n\n{baseline.template_text}\n\nProvide your answer after careful consideration.",
                "rationale": "Added step-by-step reasoning prompt",
                "addressed_failures": ["correctness", "consistency"],
            })
        
        return candidates[:max_candidates]

