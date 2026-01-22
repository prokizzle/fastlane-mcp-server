"""Tests for validation types."""

import pytest
from fastlane_mcp.validators.types import (
    IssueLevel,
    ValidationIssue,
    ValidationResult,
)


class TestValidationResult:
    def test_format_error_issue(self):
        result = ValidationResult(
            valid=False,
            issues=[
                ValidationIssue(
                    level=IssueLevel.ERROR,
                    code="TEST_ERROR",
                    message="Test error message",
                    suggestion="Try this fix"
                )
            ]
        )
        formatted = result.format_issues()
        assert "[X]" in formatted
        assert "Test error message" in formatted
        assert "Try this fix" in formatted

    def test_format_warning_issue(self):
        result = ValidationResult(
            valid=True,
            issues=[
                ValidationIssue(
                    level=IssueLevel.WARNING,
                    code="TEST_WARN",
                    message="Test warning",
                )
            ]
        )
        formatted = result.format_issues()
        assert "[!]" in formatted
        assert "Test warning" in formatted

    def test_format_multiple_issues(self):
        result = ValidationResult(
            valid=False,
            issues=[
                ValidationIssue(IssueLevel.ERROR, "E1", "Error 1"),
                ValidationIssue(IssueLevel.WARNING, "W1", "Warning 1"),
            ]
        )
        formatted = result.format_issues()
        assert "Error 1" in formatted
        assert "Warning 1" in formatted

    def test_empty_issues_returns_empty_string(self):
        result = ValidationResult(valid=True, issues=[])
        assert result.format_issues() == ""
