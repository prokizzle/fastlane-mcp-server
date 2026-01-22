"""Tests for tools validation."""

import pytest
from unittest.mock import patch, AsyncMock
from fastlane_mcp.validators.tools import validate_tools
from fastlane_mcp.validators.types import IssueLevel
from fastlane_mcp.utils.executor import ExecutionResult


class TestValidateTools:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_tools_required(self):
        issues = await validate_tools([])
        assert issues == []

    @pytest.mark.asyncio
    async def test_passes_when_tool_available(self):
        with patch("fastlane_mcp.validators.tools.execute_command") as mock:
            mock.return_value = ExecutionResult("/usr/bin/echo", "", 0)
            issues = await validate_tools(["echo"])
            assert issues == []

    @pytest.mark.asyncio
    async def test_error_when_tool_missing(self):
        with patch("fastlane_mcp.validators.tools.execute_command") as mock:
            mock.return_value = ExecutionResult("", "not found", 1)
            issues = await validate_tools(["nonexistent_tool"])
            assert len(issues) == 1
            assert issues[0].level == IssueLevel.ERROR
            assert "nonexistent_tool" in issues[0].message

    @pytest.mark.asyncio
    async def test_provides_install_suggestion_for_fastlane(self):
        with patch("fastlane_mcp.validators.tools.execute_command") as mock:
            mock.return_value = ExecutionResult("", "not found", 1)
            issues = await validate_tools(["fastlane"])
            assert len(issues) == 1
            assert "gem install" in issues[0].suggestion or "brew install" in issues[0].suggestion

    @pytest.mark.asyncio
    async def test_validates_multiple_tools(self):
        async def mock_exec(cmd, args, **kwargs):
            if args[0] == "tool1":
                return ExecutionResult("/path/tool1", "", 0)
            return ExecutionResult("", "not found", 1)

        with patch("fastlane_mcp.validators.tools.execute_command", side_effect=mock_exec):
            issues = await validate_tools(["tool1", "tool2"])
            assert len(issues) == 1
            assert "tool2" in issues[0].message
