"""Error diagnosis using pattern matching."""

from fastlane_mcp.errors.patterns import ERROR_PATTERNS


def diagnose_error(error_output: str) -> dict:
    """Match error output against known patterns.

    Args:
        error_output: The error text to diagnose

    Returns:
        Dictionary with diagnosis information:
        - matched: bool indicating if a pattern was found
        - message: Human-readable error message
        - diagnosis: Explanation of what went wrong
        - suggestions: List of suggested fixes
        - original: Original error (only if not matched)
    """
    for pattern in ERROR_PATTERNS:
        if pattern.pattern.search(error_output):
            return {
                "matched": True,
                "message": pattern.message,
                "diagnosis": pattern.diagnosis,
                "suggestions": pattern.suggestions,
            }

    return {
        "matched": False,
        "message": "Build or command failed",
        "diagnosis": "An unrecognized error occurred",
        "suggestions": [
            "Check the full error output below for details",
            "Search for the error message online",
        ],
        "original": error_output,
    }
