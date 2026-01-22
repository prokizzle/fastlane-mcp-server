"""Tool availability validation."""

from fastlane_mcp.validators.types import IssueLevel, ValidationIssue
from fastlane_mcp.utils.executor import execute_command


# Installation suggestions for common tools
TOOL_INSTALL_HINTS = {
    "fastlane": "Install with: gem install fastlane OR brew install fastlane",
    "xcodebuild": "Install Xcode from the App Store",
    "gradle": "Install with: brew install gradle",
    "bundler": "Install with: gem install bundler",
    "pod": "Install with: gem install cocoapods",
    "ruby": "Install with: brew install ruby",
}


async def validate_tools(required_tools: list[str]) -> list[ValidationIssue]:
    """Validate that required tools are available.

    Args:
        required_tools: List of required tool names

    Returns:
        List of validation issues found
    """
    issues: list[ValidationIssue] = []

    for tool_name in required_tools:
        result = await execute_command("which", [tool_name])

        if result.exit_code != 0:
            suggestion = TOOL_INSTALL_HINTS.get(
                tool_name,
                f"Install {tool_name} and ensure it's in your PATH"
            )

            issues.append(ValidationIssue(
                level=IssueLevel.ERROR,
                code="TOOL_MISSING",
                message=f"Required tool not found: {tool_name}",
                suggestion=suggestion
            ))

    return issues
