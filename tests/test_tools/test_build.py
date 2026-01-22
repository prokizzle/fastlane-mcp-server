"""Tests for build tools."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastmcp.exceptions import ToolError

from fastlane_mcp.tools.build import build_ios, build_android
from fastlane_mcp.utils.executor import ExecutionResult
from fastlane_mcp.validators import ValidationResult


# Access the underlying functions from the FunctionTool objects
_build_ios = build_ios.fn
_build_android = build_android.fn


class TestBuildIos:
    @pytest.mark.asyncio
    async def test_successful_build(self, tmp_path):
        # Create project structure
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\n  gym\nend")

        with patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight, \
             patch("fastlane_mcp.tools.build.execute_fastlane") as mock_exec:

            mock_preflight.return_value = ValidationResult(valid=True, issues=[])
            mock_exec.return_value = ExecutionResult("Build succeeded", "", 0)

            result = await _build_ios(
                project_path=str(tmp_path),
                lane="build"
            )

            assert result["success"] is True
            assert "Build succeeded" in result["output"]

    @pytest.mark.asyncio
    async def test_raises_tool_error_on_invalid_path(self):
        with pytest.raises(ToolError, match="does not exist"):
            await _build_ios(
                project_path="/nonexistent/path/12345",
                lane="build"
            )

    @pytest.mark.asyncio
    async def test_raises_tool_error_on_preflight_failure(self, tmp_path):
        with patch("fastlane_mcp.tools.build.validate_project_path") as mock_validate, \
             patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight:

            mock_validate.return_value = tmp_path
            mock_preflight.return_value = ValidationResult(
                valid=False,
                issues=[MagicMock(level=MagicMock(value="error"), message="Missing tool")]
            )

            with pytest.raises(ToolError, match="Pre-flight"):
                await _build_ios(
                    project_path=str(tmp_path),
                    lane="build"
                )

    @pytest.mark.asyncio
    async def test_raises_tool_error_on_build_failure(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\n  gym\nend")

        with patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight, \
             patch("fastlane_mcp.tools.build.execute_fastlane") as mock_exec:

            mock_preflight.return_value = ValidationResult(valid=True, issues=[])
            mock_exec.return_value = ExecutionResult(
                "", "No signing certificate found", 1
            )

            with pytest.raises(ToolError, match="certificate"):
                await _build_ios(
                    project_path=str(tmp_path),
                    lane="build"
                )


class TestBuildAndroid:
    @pytest.mark.asyncio
    async def test_successful_build(self, tmp_path):
        android_dir = tmp_path / "android" / "fastlane"
        android_dir.mkdir(parents=True)
        (android_dir / "Fastfile").write_text("lane :build do\n  gradle\nend")

        with patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight, \
             patch("fastlane_mcp.tools.build.execute_fastlane") as mock_exec:

            mock_preflight.return_value = ValidationResult(valid=True, issues=[])
            mock_exec.return_value = ExecutionResult("BUILD SUCCESSFUL", "", 0)

            result = await _build_android(
                project_path=str(tmp_path),
                lane="build"
            )

            assert result["success"] is True
