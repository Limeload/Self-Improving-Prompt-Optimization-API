"""
Deterministic validators for prompt outputs.
Includes JSON schema validation, regex checks, and constraint validation.
"""
import json
import re
from typing import Dict, Any, Optional, List
from jsonschema import validate, ValidationError


class FormatValidator:
    """
    Validates prompt outputs against schemas and constraints.
    Provides deterministic validation independent of LLM evaluation.
    """
    
    @staticmethod
    def validate_json_schema(
        output: Dict[str, Any],
        schema: Dict[str, Any],
    ) -> tuple[bool, Optional[str]]:
        """
        Validate output against JSON schema.
        
        Args:
            output: Output to validate
            schema: JSON schema definition
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            validate(instance=output, schema=schema)
            return True, None
        except ValidationError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Schema validation error: {str(e)}"
    
    @staticmethod
    def validate_regex(
        text: str,
        pattern: str,
        flags: int = 0,
    ) -> tuple[bool, Optional[str]]:
        """
        Validate text against regex pattern.
        
        Args:
            text: Text to validate
            pattern: Regex pattern
            flags: Regex flags
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            if re.match(pattern, text, flags):
                return True, None
            else:
                return False, f"Text does not match pattern: {pattern}"
        except Exception as e:
            return False, f"Regex validation error: {str(e)}"
    
    @staticmethod
    def validate_constraints(
        output: Dict[str, Any],
        constraints: Dict[str, Any],
    ) -> tuple[bool, Optional[str], List[str]]:
        """
        Validate output against various constraints.
        
        Supported constraints:
        - min_length: Minimum length for string fields
        - max_length: Maximum length for string fields
        - required_fields: List of required field names
        - field_types: Dict mapping field names to expected types
        
        Args:
            output: Output to validate
            constraints: Constraint definitions
            
        Returns:
            Tuple of (is_valid, error_message, violations)
        """
        violations = []
        
        # Check required fields
        required_fields = constraints.get("required_fields", [])
        for field in required_fields:
            if field not in output:
                violations.append(f"Missing required field: {field}")
        
        # Check field types
        field_types = constraints.get("field_types", {})
        for field, expected_type in field_types.items():
            if field in output:
                actual_type = type(output[field]).__name__
                if not isinstance(output[field], expected_type):
                    violations.append(
                        f"Field '{field}' has type {actual_type}, expected {expected_type.__name__}"
                    )
        
        # Check length constraints
        min_length = constraints.get("min_length", {})
        max_length = constraints.get("max_length", {})
        
        for field, min_len in min_length.items():
            if field in output:
                value = str(output[field])
                if len(value) < min_len:
                    violations.append(f"Field '{field}' is too short (min: {min_len})")
        
        for field, max_len in max_length.items():
            if field in output:
                value = str(output[field])
                if len(value) > max_len:
                    violations.append(f"Field '{field}' is too long (max: {max_len})")
        
        if violations:
            return False, "; ".join(violations), violations
        
        return True, None, []

