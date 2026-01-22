"""Validation types and data structures."""

from dataclasses import dataclass, field
from enum import Enum


class IssueLevel(Enum):
    """Severity level for validation issues."""
    ERROR = "error"
    WARNING = "warning"


@dataclass
class ValidationIssue:
    """A single validation issue."""
    level: IssueLevel
    code: str
    message: str
    suggestion: str | None = None


@dataclass
class ValidationResult:
    """Result of validation checks."""
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    def format_issues(self) -> str:
        """Format issues for display."""
        if not self.issues:
            return ""

        lines = []
        for issue in self.issues:
            icon = "X" if issue.level == IssueLevel.ERROR else "!"
            lines.append(f"[{icon}] {issue.message}")
            if issue.suggestion:
                lines.append(f"    -> {issue.suggestion}")
        return "\n".join(lines)


@dataclass
class PreflightContext:
    """Context for pre-flight validation."""
    project_path: str | None = None
    platform: str | None = None
    lane: str | None = None
    required_env_vars: list[str] = field(default_factory=list)
    required_tools: list[str] = field(default_factory=list)
