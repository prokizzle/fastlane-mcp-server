"""Error intelligence modules."""

from fastlane_mcp.errors.patterns import ERROR_PATTERNS, ErrorPattern
from fastlane_mcp.errors.diagnosis import diagnose_error

__all__ = ["ERROR_PATTERNS", "ErrorPattern", "diagnose_error"]
