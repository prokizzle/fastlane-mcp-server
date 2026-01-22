"""Tests for command execution."""

import pytest
from fastlane_mcp.utils.executor import execute_command, ExecutionResult


class TestExecuteCommand:
    @pytest.mark.asyncio
    async def test_successful_command(self):
        result = await execute_command("echo", ["hello"])
        assert result.exit_code == 0
        assert "hello" in result.stdout

    @pytest.mark.asyncio
    async def test_command_with_cwd(self, tmp_path):
        result = await execute_command("pwd", [], cwd=tmp_path)
        assert result.exit_code == 0
        assert str(tmp_path) in result.stdout

    @pytest.mark.asyncio
    async def test_command_with_env(self):
        result = await execute_command(
            "sh", ["-c", "echo $TEST_VAR"],
            env={"TEST_VAR": "test_value"}
        )
        assert result.exit_code == 0
        assert "test_value" in result.stdout

    @pytest.mark.asyncio
    async def test_failed_command(self):
        result = await execute_command("false", [])
        assert result.exit_code != 0

    @pytest.mark.asyncio
    async def test_command_timeout(self):
        result = await execute_command("sleep", ["10"], timeout=1)
        assert result.exit_code == 124
        assert "timed out" in result.stderr.lower()

    @pytest.mark.asyncio
    async def test_captures_stderr(self):
        result = await execute_command("sh", ["-c", "echo error >&2"])
        assert "error" in result.stderr
