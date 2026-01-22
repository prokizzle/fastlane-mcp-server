"""Tests for command execution."""

import pytest
from unittest.mock import patch, AsyncMock
from fastlane_mcp.utils.executor import execute_command, ExecutionResult, execute_fastlane


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


class TestExecuteFastlane:
    @pytest.mark.asyncio
    async def test_executes_in_platform_directory(self, tmp_path):
        # Create platform directory structure
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with patch("fastlane_mcp.utils.executor.execute_command") as mock_exec:
            mock_exec.return_value = ExecutionResult("output", "", 0)

            result = await execute_fastlane("build", "ios", tmp_path)

            mock_exec.assert_called_once()
            call_args = mock_exec.call_args
            assert call_args[0][0] == "fastlane"
            assert call_args[0][1] == ["build"]
            assert call_args[1]["cwd"] == ios_dir

    @pytest.mark.asyncio
    async def test_sanitizes_lane_name(self, tmp_path):
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with patch("fastlane_mcp.utils.executor.execute_command") as mock_exec:
            mock_exec.return_value = ExecutionResult("output", "", 0)

            # Should sanitize whitespace
            await execute_fastlane("  build  ", "ios", tmp_path)

            call_args = mock_exec.call_args
            assert call_args[0][1] == ["build"]

    @pytest.mark.asyncio
    async def test_passes_env_vars(self, tmp_path):
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with patch("fastlane_mcp.utils.executor.execute_command") as mock_exec:
            mock_exec.return_value = ExecutionResult("output", "", 0)

            await execute_fastlane("build", "ios", tmp_path, env_vars={"KEY": "value"})

            call_args = mock_exec.call_args
            assert call_args[1]["env"] == {"KEY": "value"}

    @pytest.mark.asyncio
    async def test_rejects_invalid_platform(self, tmp_path):
        with pytest.raises(ValueError, match="Invalid platform"):
            await execute_fastlane("build", "windows", tmp_path)
