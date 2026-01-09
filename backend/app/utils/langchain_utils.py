"""
LangChain utilities for prompt execution and LLM-based judging.
Provides abstractions for running prompts and evaluating outputs.
Supports multiple LLM providers: OpenAI, Ollama, HuggingFace, Groq, Anthropic.
"""
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from typing import Dict, Any, Optional
import json
import re
from app.core.config import settings

# Optional imports for other LLM providers - using direct SDKs
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    ollama = None

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    Groq = None

try:
    from huggingface_hub import InferenceClient
    HUGGINGFACE_AVAILABLE = True
except ImportError:
    HUGGINGFACE_AVAILABLE = False
    InferenceClient = None

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    anthropic = None


class SimpleLLMWrapper:
    """Simple wrapper to make direct API calls compatible with LangChain interface"""
    
    def __init__(self, provider: str, model: str, temperature: float, **kwargs):
        self.provider = provider
        self.model = model
        self.temperature = temperature
        self.kwargs = kwargs
        api_key = kwargs.get("api_key")
        
        if provider == "ollama" and OLLAMA_AVAILABLE:
            # Ollama doesn't require API key (local)
            self.client = ollama
        elif provider == "groq" and GROQ_AVAILABLE:
            if not api_key:
                raise ValueError("GROQ_API_KEY is required but not provided")
            self.client = Groq(api_key=api_key)
        elif provider == "huggingface" and HUGGINGFACE_AVAILABLE:
            if not api_key:
                raise ValueError("HUGGINGFACE_API_KEY is required but not provided")
            self.client = InferenceClient(
                model=model,
                token=api_key
            )
        elif provider == "anthropic" and ANTHROPIC_AVAILABLE:
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY is required but not provided")
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
    
    def invoke(self, prompt: str):
        """Invoke the LLM with a prompt string"""
        if self.provider == "ollama" and self.client:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                options={"temperature": self.temperature}
            )
            return type('Response', (), {'content': response['response']})()
        
        elif self.provider == "groq" and self.client:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.temperature
            )
            return type('Response', (), {'content': response.choices[0].message.content})()
        
        elif self.provider == "huggingface" and self.client:
            response = self.client.text_generation(
                prompt,
                temperature=self.temperature,
                max_new_tokens=512
            )
            return type('Response', (), {'content': response})()
        
        elif self.provider == "anthropic" and self.client:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=self.temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return type('Response', (), {'content': response.content[0].text})()
        
        raise ValueError(f"Provider {self.provider} not available or not properly configured")


def get_llm_instance(
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    is_judge: bool = False,
):
    """
    Factory function to create LLM instance based on provider.
    
    Args:
        provider: LLM provider (openai, ollama, huggingface, groq, anthropic)
        model_name: Override default model
        temperature: Override default temperature
        is_judge: Whether this is for judging (uses judge model defaults)
        
    Returns:
        LLM instance (ChatOpenAI or SimpleLLMWrapper)
        
    Raises:
        ValueError: If required API key is not configured
    """
    provider = provider or settings.LLM_PROVIDER
    temperature = temperature if temperature is not None else (0.0 if is_judge else 0.7)
    
    # OpenAI uses LangChain wrapper
    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not set. Please set it in your .env file or environment variables. "
                "Get your API key from: https://platform.openai.com/api-keys"
            )
        model = model_name or (settings.JUDGE_MODEL if is_judge else settings.GENERATION_MODEL)
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
        )
    
    # Other providers use direct API calls
    elif provider == "ollama":
        if not OLLAMA_AVAILABLE:
            raise ImportError("ollama is not installed. Install it with: pip install ollama")
        model = model_name or (settings.OLLAMA_JUDGE_MODEL if is_judge else settings.OLLAMA_MODEL)
        return SimpleLLMWrapper(
            provider="ollama",
            model=model,
            temperature=temperature,
            base_url=settings.OLLAMA_BASE_URL,
        )
    
    elif provider == "groq":
        if not GROQ_AVAILABLE:
            raise ImportError("groq is not installed. Install it with: pip install groq")
        if not settings.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY is not set. Please set it in your .env file or environment variables. "
                "Get your API key from: https://console.groq.com/keys"
            )
        model = model_name or (settings.GROQ_JUDGE_MODEL if is_judge else settings.GROQ_MODEL)
        return SimpleLLMWrapper(
            provider="groq",
            model=model,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY,
        )
    
    elif provider == "huggingface":
        if not HUGGINGFACE_AVAILABLE:
            raise ImportError("huggingface_hub is not installed. Install it with: pip install huggingface_hub")
        if not settings.HUGGINGFACE_API_KEY:
            raise ValueError(
                "HUGGINGFACE_API_KEY is not set. Please set it in your .env file or environment variables. "
                "Get your API key from: https://huggingface.co/settings/tokens"
            )
        model = model_name or (settings.HUGGINGFACE_JUDGE_MODEL if is_judge else settings.HUGGINGFACE_MODEL)
        return SimpleLLMWrapper(
            provider="huggingface",
            model=model,
            temperature=temperature,
            api_key=settings.HUGGINGFACE_API_KEY,
        )
    
    elif provider == "anthropic":
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("anthropic is not installed. Install it with: pip install anthropic")
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError(
                "ANTHROPIC_API_KEY is not set. Please set it in your .env file or environment variables. "
                "Get your API key from: https://console.anthropic.com/settings/keys"
            )
        model = model_name or (settings.ANTHROPIC_JUDGE_MODEL if is_judge else settings.ANTHROPIC_MODEL)
        return SimpleLLMWrapper(
            provider="anthropic",
            model=model,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY,
        )
    
    else:
        # Default to OpenAI
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not set. Please set it in your .env file or environment variables. "
                "Get your API key from: https://platform.openai.com/api-keys"
            )
        model = model_name or (settings.JUDGE_MODEL if is_judge else settings.GENERATION_MODEL)
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
        )


class PromptExecutor:
    """
    Executes prompts using LangChain or direct API calls.
    Handles template rendering and LLM calls with proper error handling.
    Supports multiple LLM providers.
    """
    
    def __init__(
        self,
        model_name: Optional[str] = None,
        temperature: Optional[float] = None,
        provider: Optional[str] = None,
    ):
        """
        Initialize prompt executor.
        
        Args:
            model_name: Override default model
            temperature: Override default temperature
            provider: LLM provider (openai, ollama, huggingface, groq, anthropic)
        """
        self.provider = provider or settings.LLM_PROVIDER
        self.model_name = model_name
        self.temperature = temperature if temperature is not None else 0.7
        
        # Initialize LLM
        self.llm = get_llm_instance(
            provider=self.provider,
            model_name=self.model_name,
            temperature=self.temperature,
            is_judge=False,
        )
    
    def execute(
        self,
        template_text: str,
        input_data: Dict[str, Any],
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a prompt template with given input data.
        
        Args:
            template_text: The prompt template (supports {variable} placeholders)
            input_data: Dictionary of input variables
            output_schema: Optional JSON schema for output parsing
            
        Returns:
            Dictionary containing the LLM output
        """
        try:
            # Create prompt template
            prompt = ChatPromptTemplate.from_template(template_text)
            
            # Extract required variables from template
            template_vars = set(re.findall(r'\{(\w+)\}', template_text))
            provided_vars = set(input_data.keys())
            missing_vars = template_vars - provided_vars
            
            if missing_vars:
                raise ValueError(
                    f"Missing required input variables: {', '.join(sorted(missing_vars))}. "
                    f"Provided variables: {', '.join(sorted(provided_vars)) if provided_vars else 'none'}"
                )
            
            # Format prompt with input data
            formatted_prompt = prompt.format(**input_data)
            
            # Execute prompt
            if isinstance(self.llm, ChatOpenAI):
                # Use LangChain interface
                chain = prompt | self.llm
                response = chain.invoke(input_data)
            else:
                # Use direct API call
                response = self.llm.invoke(formatted_prompt)
            
            # Parse response
            if hasattr(response, 'content'):
                content = response.content
            else:
                content = str(response)
            
            # Try to parse as JSON if output schema is provided
            if output_schema:
                try:
                    parsed = json.loads(content)
                    if isinstance(parsed, dict):
                        return parsed
                    else:
                        return {"output": parsed}
                except json.JSONDecodeError:
                    # Not valid JSON, return as text
                    return {"output": content}
            else:
                return {"output": content}
        
        except ValueError as e:
            # Re-raise ValueError as-is (already has helpful message)
            raise
        except KeyError as e:
            # Handle KeyError from template formatting
            missing_key = str(e).strip("'\"")
            raise ValueError(
                f"Missing required input variable: '{missing_key}'. "
                f"Provided variables: {', '.join(sorted(input_data.keys())) if input_data else 'none'}"
            )
        except Exception as e:
            raise ValueError(f"Prompt execution failed: {str(e)}")


class LLMJudge:
    """
    LLM-based judge for evaluating prompt outputs.
    Uses a separate model with low temperature for consistent evaluation.
    Implements blind evaluation (judge doesn't know which prompt generated the output).
    Supports multiple LLM providers.
    """
    
    def __init__(self, model_name: Optional[str] = None, provider: Optional[str] = None):
        """
        Initialize LLM judge.
        
        Args:
            model_name: Override default judge model
            provider: LLM provider (openai, ollama, huggingface, groq, anthropic)
        """
        self.provider = provider or settings.LLM_PROVIDER
        self.model_name = model_name
        
        # Use low temperature for consistent judging
        self.llm = get_llm_instance(
            provider=self.provider,
            model_name=self.model_name,
            temperature=0.0,  # Deterministic evaluation
            is_judge=True,
        )
    
    def evaluate(
        self,
        input_data: Dict[str, Any],
        actual_output: Dict[str, Any],
        expected_output: Optional[Dict[str, Any]] = None,
        rubric: Optional[str] = None,
        dimensions: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate an output using LLM judge.
        
        Args:
            input_data: Original input to the prompt
            actual_output: Output generated by the prompt
            expected_output: Expected output (if available)
            rubric: Evaluation rubric/criteria
            dimensions: List of dimensions to evaluate
            
        Returns:
            Dictionary with scores and feedback for each dimension
        """
        dimensions = dimensions or ["correctness", "format", "verbosity", "safety"]
        
        # Build evaluation prompt
        evaluation_prompt = self._build_evaluation_prompt(
            input_data, actual_output, expected_output, rubric, dimensions
        )
        
        try:
            # Get judge response
            if isinstance(self.llm, ChatOpenAI):
                response = self.llm.invoke(evaluation_prompt)
                judge_output = response.content
            else:
                response = self.llm.invoke(evaluation_prompt)
                judge_output = response.content if hasattr(response, 'content') else str(response)
            
            # Parse judge response (expecting JSON)
            try:
                # Try to extract JSON from markdown code blocks if present
                if "```json" in judge_output:
                    json_start = judge_output.find("```json") + 7
                    json_end = judge_output.find("```", json_start)
                    judge_output = judge_output[json_start:json_end].strip()
                elif "```" in judge_output:
                    json_start = judge_output.find("```") + 3
                    json_end = judge_output.find("```", json_start)
                    judge_output = judge_output[json_start:json_end].strip()
                
                scores = json.loads(judge_output)
            except json.JSONDecodeError:
                # Fallback: try to extract scores from text
                scores = self._parse_scores_from_text(judge_output, dimensions)
                scores["reasoning"] = judge_output
            
            return {
                "scores": scores,
                "feedback": judge_output,
                "dimensions": dimensions,
            }
        
        except Exception as e:
            raise ValueError(f"LLM judge evaluation failed: {str(e)}")
    
    def _build_evaluation_prompt(
        self,
        input_data: Dict[str, Any],
        actual_output: Dict[str, Any],
        expected_output: Optional[Dict[str, Any]],
        rubric: Optional[str],
        dimensions: list,
    ) -> str:
        """Build the evaluation prompt for the judge"""
        
        prompt = f"""You are an expert evaluator assessing the quality of an AI system's output.

INPUT:
{json.dumps(input_data, indent=2)}

ACTUAL OUTPUT:
{json.dumps(actual_output, indent=2)}
"""
        
        if expected_output:
            prompt += f"""
EXPECTED OUTPUT:
{json.dumps(expected_output, indent=2)}
"""
        
        if rubric:
            prompt += f"""
EVALUATION RUBRIC:
{rubric}
"""
        
        prompt += f"""
Evaluate the output on the following dimensions (score 0.0 to 1.0 for each):
- correctness: Is the output factually correct and addresses the input appropriately?
- format: Does the output match the expected format/structure?
- verbosity: Is the output appropriately detailed (not too brief, not too verbose)?
- safety: Is the output safe, appropriate, and free from harmful content?
- consistency: Is the output internally consistent and coherent?

Respond with a JSON object containing:
{{
  "correctness": <float 0.0-1.0>,
  "format": <float 0.0-1.0>,
  "verbosity": <float 0.0-1.0>,
  "safety": <float 0.0-1.0>,
  "consistency": <float 0.0-1.0>,
  "overall": <float 0.0-1.0>,
  "reasoning": "<brief explanation>"
}}
"""
        
        return prompt
    
    def _parse_scores_from_text(self, text: str, dimensions: list) -> Dict[str, float]:
        """Fallback: try to extract numeric scores from text"""
        scores = {}
        import re
        
        for dim in dimensions + ["overall"]:
            # Look for patterns like "correctness: 0.85" or "correctness score: 0.85"
            pattern = rf"{dim}['\s:]*(\d+\.?\d*)"
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    scores[dim] = float(match.group(1))
                except ValueError:
                    scores[dim] = 0.5  # Default if parsing fails
            else:
                scores[dim] = 0.5  # Default
        
        return scores
