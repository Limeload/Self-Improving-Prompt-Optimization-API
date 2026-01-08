"""
Utilities for computing prompt diffs and generating changelogs.
Provides transparency into prompt version changes.
"""
from typing import List, Tuple, Optional
import difflib


class PromptDiff:
    """Utilities for computing and displaying prompt differences"""
    
    @staticmethod
    def compute_diff(text_a: str, text_b: str) -> dict:
        """
        Compute diff between two prompt versions.
        
        Args:
            text_a: First prompt text
            text_b: Second prompt text
            
        Returns:
            Dictionary with diff information
        """
        lines_a = text_a.splitlines(keepends=True)
        lines_b = text_b.splitlines(keepends=True)
        
        # Compute unified diff
        diff = list(difflib.unified_diff(
            lines_a,
            lines_b,
            lineterm='',
            n=3  # Context lines
        ))
        
        # Extract added and removed lines
        added_lines = []
        removed_lines = []
        
        for line in diff:
            if line.startswith('+') and not line.startswith('+++'):
                added_lines.append(line[1:].rstrip())
            elif line.startswith('-') and not line.startswith('---'):
                removed_lines.append(line[1:].rstrip())
        
        # Generate summary
        changes_summary = f"Added {len(added_lines)} lines, removed {len(removed_lines)} lines"
        
        return {
            "diff_text": "\n".join(diff),
            "added_lines": added_lines,
            "removed_lines": removed_lines,
            "changes_summary": changes_summary,
            "num_additions": len(added_lines),
            "num_deletions": len(removed_lines),
        }
    
    @staticmethod
    def generate_changelog(
        version_a: str,
        version_b: str,
        diff_result: dict,
        metrics_delta: Optional[dict] = None,
    ) -> str:
        """
        Generate human-readable changelog for prompt version change.
        
        Args:
            version_a: Previous version
            version_b: New version
            diff_result: Result from compute_diff
            metrics_delta: Optional dictionary with metric changes
            
        Returns:
            Human-readable changelog text
        """
        changelog = f"## Prompt Update: {version_a} → {version_b}\n\n"
        changelog += f"**Summary:** {diff_result['changes_summary']}\n\n"
        
        if diff_result['added_lines']:
            changelog += "### Additions:\n"
            for line in diff_result['added_lines'][:10]:  # Limit to first 10
                changelog += f"- {line}\n"
            if len(diff_result['added_lines']) > 10:
                changelog += f"- ... and {len(diff_result['added_lines']) - 10} more\n"
            changelog += "\n"
        
        if diff_result['removed_lines']:
            changelog += "### Removals:\n"
            for line in diff_result['removed_lines'][:10]:
                changelog += f"- {line}\n"
            if len(diff_result['removed_lines']) > 10:
                changelog += f"- ... and {len(diff_result['removed_lines']) - 10} more\n"
            changelog += "\n"
        
        if metrics_delta:
            changelog += "### Performance Changes:\n"
            for metric, delta in metrics_delta.items():
                if delta > 0:
                    changelog += f"- {metric}: +{delta:.2%} improvement\n"
                elif delta < 0:
                    changelog += f"- {metric}: {delta:.2%} regression\n"
                else:
                    changelog += f"- {metric}: no change\n"
        
        return changelog

