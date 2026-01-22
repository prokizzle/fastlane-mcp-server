"""Tests for input sanitization."""

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
