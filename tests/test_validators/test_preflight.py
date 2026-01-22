"""Tests for preflight validation runner."""

import pytest
from unittest.mock import patch, AsyncMock
from fastlane_mcp.validators import (
    run_preflight,
    PreflightContext,
    IssueLevel,
    ValidationResult,
)


class TestRunPreflight:
    @pytest.mark.asyncio
    async def test_returns_valid_when_no_checks(self):
        ctx = PreflightContext()
        result = await run_preflight(ctx)
        assert result.valid is True
        assert result.issues == []

    @pytest.mark.asyncio
    async def test_checks_environment_vars(self):
        with patch("fastlane_mcp.validators.validate_environment") as mock:
            from fastlane_mcp.validators.types import ValidationIssue
            mock.return_value = [
                ValidationIssue(IssueLevel.ERROR, "E1", "Missing var")
            ]

            ctx = PreflightContext(required_env_vars=["TEST_VAR"])
            result = await run_preflight(ctx)

            assert result.valid is False
            mock.assert_called_once_with(["TEST_VAR"])

    @pytest.mark.asyncio
    async def test_checks_tools(self):
        with patch("fastlane_mcp.validators.validate_tools") as mock:
            mock.return_value = []

            ctx = PreflightContext(required_tools=["fastlane"])
            result = await run_preflight(ctx)

            assert result.valid is True
            mock.assert_called_once_with(["fastlane"])

    @pytest.mark.asyncio
    async def test_checks_project(self):
        with patch("fastlane_mcp.validators.validate_project") as mock:
            mock.return_value = []

            ctx = PreflightContext(
                project_path="/tmp/test",
                platform="ios",
                lane="build"
            )
            result = await run_preflight(ctx)

            assert result.valid is True
            mock.assert_called_once_with("/tmp/test", "ios", "build")

    @pytest.mark.asyncio
    async def test_invalid_when_any_errors(self):
        with patch("fastlane_mcp.validators.validate_environment") as mock_env, \
             patch("fastlane_mcp.validators.validate_tools") as mock_tools:
            from fastlane_mcp.validators.types import ValidationIssue
            mock_env.return_value = [
                ValidationIssue(IssueLevel.WARNING, "W1", "Warning only")
            ]
            mock_tools.return_value = [
                ValidationIssue(IssueLevel.ERROR, "E1", "Tool missing")
            ]

            ctx = PreflightContext(
                required_env_vars=["VAR"],
                required_tools=["tool"]
            )
            result = await run_preflight(ctx)

            assert result.valid is False
            assert len(result.issues) == 2

    @pytest.mark.asyncio
    async def test_valid_with_warnings_only(self):
        with patch("fastlane_mcp.validators.validate_environment") as mock:
            from fastlane_mcp.validators.types import ValidationIssue
            mock.return_value = [
                ValidationIssue(IssueLevel.WARNING, "W1", "Just a warning")
            ]

            ctx = PreflightContext(required_env_vars=["VAR"])
            result = await run_preflight(ctx)

            assert result.valid is True
            assert len(result.issues) == 1
