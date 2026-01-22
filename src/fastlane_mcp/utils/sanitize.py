"""Input sanitization and validation utilities."""

import re
from pathlib import Path

class ValidationError(Exception):
    """Raised when input validation fails."""
    pass


# Lane names must start with letter, contain only alphanumeric, underscore, hyphen
SAFE_LANE_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]*$')

# Characters that could be used for shell injection
DANGEROUS_CHARS = re.compile(r'[;&|`$(){}[\]<>!#*?~\\"\']')


def sanitize_lane_name(lane: str | None) -> str:
    """Validate and sanitize a fastlane lane name.

    Args:
        lane: The lane name to sanitize

    Returns:
        The sanitized lane name

    Raises:
        ValidationError: If the lane name is invalid
    """
    if not lane or not isinstance(lane, str):
        raise ValidationError("Lane name must be a non-empty string")

    trimmed = lane.strip()

    if not trimmed:
        raise ValidationError("Lane name must be a non-empty string")

    if DANGEROUS_CHARS.search(trimmed):
        raise ValidationError(f"Lane name contains invalid characters: {trimmed}")

    if not SAFE_LANE_PATTERN.match(trimmed):
        raise ValidationError(f"Invalid lane name format: {trimmed}")

    return trimmed


async def validate_project_path(path: str | None) -> Path:
    """Validate project path exists and is a directory.

    Args:
        path: The path to validate

    Returns:
        The resolved Path object

    Raises:
        ValidationError: If the path is invalid
    """
    if not path or not isinstance(path, str):
        raise ValidationError("Path must be a non-empty string")

    # Check for path traversal attempts
    if ".." in path:
        original_parts = path.split("/")
        if ".." in original_parts:
            raise ValidationError(f"Path contains suspicious traversal: {path}")

    p = Path(path).resolve()

    if not p.exists():
        raise ValidationError(f"Path does not exist: {path}")

    if not p.is_dir():
        raise ValidationError(f"Path is not a directory: {path}")

    return p
