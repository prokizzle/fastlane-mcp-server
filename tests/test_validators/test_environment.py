"""Tests for environment validation."""

import os
import pytest
from unittest.mock import patch
from fastlane_mcp.validators.environment import validate_environment
from fastlane_mcp.validators.types import IssueLevel


class TestValidateEnvironment:
    def test_returns_empty_when_no_vars_required(self):
        issues = validate_environment([])
        assert issues == []

    def test_passes_when_all_vars_present(self):
        with patch.dict(os.environ, {"TEST_VAR": "value"}):
            issues = validate_environment(["TEST_VAR"])
            assert issues == []

    def test_error_when_var_missing(self):
        # Ensure var doesn't exist
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("MISSING_VAR", None)
            issues = validate_environment(["MISSING_VAR"])
            assert len(issues) == 1
            assert issues[0].level == IssueLevel.ERROR
            assert "MISSING_VAR" in issues[0].message

    def test_warning_when_var_empty(self):
        with patch.dict(os.environ, {"EMPTY_VAR": ""}):
            issues = validate_environment(["EMPTY_VAR"])
            assert len(issues) == 1
            assert issues[0].level == IssueLevel.WARNING
            assert "empty" in issues[0].message.lower()

    def test_multiple_vars(self):
        with patch.dict(os.environ, {"VAR1": "value1"}, clear=True):
            os.environ.pop("VAR2", None)
            issues = validate_environment(["VAR1", "VAR2"])
            assert len(issues) == 1
            assert "VAR2" in issues[0].message
