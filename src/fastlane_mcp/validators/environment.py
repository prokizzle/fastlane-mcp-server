"""Environment variable validation."""

import os
from fastlane_mcp.validators.types import IssueLevel, ValidationIssue


def validate_environment(required_vars: list[str]) -> list[ValidationIssue]:
    """Validate that required environment variables are set.

    Args:
        required_vars: List of required environment variable names

    Returns:
        List of validation issues found
    """
    issues: list[ValidationIssue] = []

    for var_name in required_vars:
        value = os.environ.get(var_name)

        if value is None:
            issues.append(ValidationIssue(
                level=IssueLevel.ERROR,
                code="ENV_MISSING",
                message=f"Required environment variable not set: {var_name}",
                suggestion=f"Set {var_name} in your environment or .env file"
            ))
        elif value == "":
            issues.append(ValidationIssue(
                level=IssueLevel.WARNING,
                code="ENV_EMPTY",
                message=f"Environment variable is empty: {var_name}",
                suggestion=f"Verify {var_name} has the correct value"
            ))

    return issues
