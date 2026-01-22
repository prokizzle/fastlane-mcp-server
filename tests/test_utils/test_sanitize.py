"""Tests for input sanitization."""

import tempfile
from pathlib import Path

import pytest
from fastlane_mcp.utils.sanitize import (
    sanitize_lane_name,
    validate_project_path,
    ValidationError,
)


class TestSanitizeLaneName:
    def test_valid_lane_name(self):
        assert sanitize_lane_name("build") == "build"

    def test_valid_lane_with_underscore(self):
        assert sanitize_lane_name("build_release") == "build_release"

    def test_valid_lane_with_hyphen(self):
        assert sanitize_lane_name("build-release") == "build-release"

    def test_strips_whitespace(self):
        assert sanitize_lane_name("  build  ") == "build"

    def test_rejects_empty_string(self):
        with pytest.raises(ValidationError, match="non-empty"):
            sanitize_lane_name("")

    def test_rejects_none(self):
        with pytest.raises(ValidationError, match="non-empty"):
            sanitize_lane_name(None)

    def test_rejects_shell_injection(self):
        with pytest.raises(ValidationError, match="invalid characters"):
            sanitize_lane_name("build; rm -rf /")

    def test_rejects_command_substitution(self):
        with pytest.raises(ValidationError, match="invalid characters"):
            sanitize_lane_name("build$(whoami)")

    def test_rejects_pipe(self):
        with pytest.raises(ValidationError, match="invalid characters"):
            sanitize_lane_name("build | cat")

    def test_rejects_starting_with_number(self):
        with pytest.raises(ValidationError, match="Invalid lane name"):
            sanitize_lane_name("123build")


class TestValidateProjectPath:
    @pytest.mark.asyncio
    async def test_valid_directory(self, tmp_path):
        result = await validate_project_path(str(tmp_path))
        assert result == tmp_path

    @pytest.mark.asyncio
    async def test_rejects_empty_string(self):
        with pytest.raises(ValidationError, match="non-empty"):
            await validate_project_path("")

    @pytest.mark.asyncio
    async def test_rejects_none(self):
        with pytest.raises(ValidationError, match="non-empty"):
            await validate_project_path(None)

    @pytest.mark.asyncio
    async def test_rejects_nonexistent_path(self):
        with pytest.raises(ValidationError, match="does not exist"):
            await validate_project_path("/nonexistent/path/12345")

    @pytest.mark.asyncio
    async def test_rejects_file_path(self, tmp_path):
        file_path = tmp_path / "test.txt"
        file_path.write_text("test")
        with pytest.raises(ValidationError, match="not a directory"):
            await validate_project_path(str(file_path))

    @pytest.mark.asyncio
    async def test_rejects_path_traversal(self):
        with pytest.raises(ValidationError, match="traversal"):
            await validate_project_path("/tmp/../etc/passwd")

    @pytest.mark.asyncio
    async def test_allows_double_dots_in_directory_name(self, tmp_path):
        # Directories with ".." in name (not as traversal) should work
        dotdir = tmp_path / "test..dir"
        dotdir.mkdir()
        result = await validate_project_path(str(dotdir))
        assert result == dotdir
