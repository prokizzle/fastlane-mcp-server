"""Tests for path utilities."""

import pytest
from pathlib import Path
from fastlane_mcp.utils.paths import find_fastlane_dir, find_execution_dir


class TestFindFastlaneDir:
    def test_finds_platform_specific_dir(self, tmp_path):
        """React Native style: fastlane in ios/ subdirectory."""
        ios_fastlane = tmp_path / "ios" / "fastlane"
        ios_fastlane.mkdir(parents=True)
        (ios_fastlane / "Fastfile").write_text("lane :build do\nend")

        result = find_fastlane_dir(tmp_path, "ios")
        assert result == ios_fastlane

    def test_finds_root_dir_when_platform_specified(self, tmp_path):
        """Native iOS style: fallback to root when platform specified."""
        root_fastlane = tmp_path / "fastlane"
        root_fastlane.mkdir()
        (root_fastlane / "Fastfile").write_text("lane :build do\nend")

        result = find_fastlane_dir(tmp_path, "ios")
        assert result == root_fastlane

    def test_prefers_platform_specific_over_root(self, tmp_path):
        """When both exist, platform-specific takes precedence."""
        # Create both
        ios_fastlane = tmp_path / "ios" / "fastlane"
        ios_fastlane.mkdir(parents=True)
        (ios_fastlane / "Fastfile").write_text("lane :ios_build do\nend")

        root_fastlane = tmp_path / "fastlane"
        root_fastlane.mkdir()
        (root_fastlane / "Fastfile").write_text("lane :shared_build do\nend")

        result = find_fastlane_dir(tmp_path, "ios")
        assert result == ios_fastlane

    def test_finds_root_dir_when_no_platform(self, tmp_path):
        """Finds root fastlane when no platform specified."""
        root_fastlane = tmp_path / "fastlane"
        root_fastlane.mkdir()
        (root_fastlane / "Fastfile").write_text("lane :build do\nend")

        result = find_fastlane_dir(tmp_path, None)
        assert result == root_fastlane

    def test_returns_none_when_no_fastfile(self, tmp_path):
        """Returns None when no Fastfile exists."""
        # Create directory but no Fastfile
        fastlane_dir = tmp_path / "fastlane"
        fastlane_dir.mkdir()

        result = find_fastlane_dir(tmp_path, "ios")
        assert result is None

    def test_returns_none_when_no_fastlane_dir(self, tmp_path):
        """Returns None when fastlane directory doesn't exist."""
        result = find_fastlane_dir(tmp_path, "ios")
        assert result is None


class TestFindExecutionDir:
    def test_returns_platform_dir_for_react_native(self, tmp_path):
        """React Native style: run from ios/ subdirectory."""
        ios_fastlane = tmp_path / "ios" / "fastlane"
        ios_fastlane.mkdir(parents=True)
        (ios_fastlane / "Fastfile").write_text("lane :build do\nend")

        result = find_execution_dir(tmp_path, "ios")
        assert result == tmp_path / "ios"

    def test_returns_root_for_native_ios(self, tmp_path):
        """Native iOS style: run from project root."""
        root_fastlane = tmp_path / "fastlane"
        root_fastlane.mkdir()
        (root_fastlane / "Fastfile").write_text("lane :build do\nend")

        result = find_execution_dir(tmp_path, "ios")
        assert result == tmp_path

    def test_returns_root_when_no_fastfile(self, tmp_path):
        """Falls back to root when no fastfile found."""
        result = find_execution_dir(tmp_path, "ios")
        assert result == tmp_path

    def test_prefers_platform_specific_over_root(self, tmp_path):
        """When both exist, uses platform-specific directory."""
        # Create both
        ios_fastlane = tmp_path / "ios" / "fastlane"
        ios_fastlane.mkdir(parents=True)
        (ios_fastlane / "Fastfile").write_text("lane :ios_build do\nend")

        root_fastlane = tmp_path / "fastlane"
        root_fastlane.mkdir()
        (root_fastlane / "Fastfile").write_text("lane :shared_build do\nend")

        result = find_execution_dir(tmp_path, "ios")
        assert result == tmp_path / "ios"
