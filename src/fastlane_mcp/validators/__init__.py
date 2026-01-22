"""Validation modules."""

from fastlane_mcp.validators.types import (
    IssueLevel,
    ValidationIssue,
    ValidationResult,
    PreflightContext,
)
from fastlane_mcp.validators.environment import validate_environment
from fastlane_mcp.validators.tools import validate_tools
from fastlane_mcp.validators.project import validate_project


async def run_preflight(ctx: PreflightContext) -> ValidationResult:
    """Run all pre-flight validators.

    Args:
        ctx: Context specifying what to validate

    Returns:
        ValidationResult with combined issues
    """
    issues: list[ValidationIssue] = []

    # Check environment variables
    if ctx.required_env_vars:
        issues.extend(validate_environment(ctx.required_env_vars))

    # Check required tools
    if ctx.required_tools:
        issues.extend(await validate_tools(ctx.required_tools))

    # Check project structure
    if ctx.project_path:
        issues.extend(await validate_project(
            ctx.project_path,
            ctx.platform,
            ctx.lane
        ))

    # Valid if no errors (warnings are ok)
    has_errors = any(i.level == IssueLevel.ERROR for i in issues)

    return ValidationResult(valid=not has_errors, issues=issues)


__all__ = [
    "IssueLevel",
    "ValidationIssue",
    "ValidationResult",
    "PreflightContext",
    "validate_environment",
    "validate_tools",
    "validate_project",
    "run_preflight",
]
