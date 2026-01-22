"""Project structure validation."""

from pathlib import Path
from fastlane_mcp.validators.types import IssueLevel, ValidationIssue


async def validate_project(
    project_path: str,
    platform: str | None,
    lane: str | None
) -> list[ValidationIssue]:
    """Validate project structure and lane existence.

    Args:
        project_path: Path to the project root
        platform: Platform (ios, android, or None for shared)
        lane: Lane name to validate (optional)

    Returns:
        List of validation issues found
    """
    issues: list[ValidationIssue] = []
    project = Path(project_path)

    # Determine fastlane directory
    if platform:
        fastlane_dir = project / platform / "fastlane"
    else:
        fastlane_dir = project / "fastlane"

    fastfile = fastlane_dir / "Fastfile"

    # Check Fastfile exists
    if not fastfile.exists():
        issues.append(ValidationIssue(
            level=IssueLevel.ERROR,
            code="NO_FASTFILE",
            message=f"Fastfile not found at {fastfile}",
            suggestion="Run 'fastlane init' to create a Fastfile"
        ))
        return issues  # Can't validate lane without Fastfile

    # Validate lane exists if specified
    if lane:
        content = fastfile.read_text()
        # Simple check for lane definition
        if f"lane :{lane}" not in content and f"private_lane :{lane}" not in content:
            issues.append(ValidationIssue(
                level=IssueLevel.WARNING,
                code="LANE_NOT_FOUND",
                message=f"Lane '{lane}' not found in Fastfile",
                suggestion=f"Available lanes can be listed with 'fastlane lanes'"
            ))

    return issues
