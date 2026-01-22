"""Tests for project validation."""

import pytest
from pathlib import Path
from fastlane_mcp.validators.project import validate_project
from fastlane_mcp.validators.types import IssueLevel


class TestValidateProject:
    @pytest.mark.asyncio
    async def test_error_when_fastfile_missing(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        # No Fastfile

        issues = await validate_project(str(tmp_path), "ios", None)
        errors = [i for i in issues if i.level == IssueLevel.ERROR]
        assert any("Fastfile" in i.message for i in errors)

    @pytest.mark.asyncio
    async def test_passes_when_fastfile_exists(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\nend")

        issues = await validate_project(str(tmp_path), "ios", None)
        errors = [i for i in issues if i.level == IssueLevel.ERROR]
        assert len(errors) == 0

    @pytest.mark.asyncio
    async def test_warning_when_lane_not_found(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\nend")

        issues = await validate_project(str(tmp_path), "ios", "nonexistent")
        warnings = [i for i in issues if i.level == IssueLevel.WARNING]
        assert any("nonexistent" in i.message for i in warnings)

    @pytest.mark.asyncio
    async def test_passes_when_lane_found(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\n  gym\nend")

        issues = await validate_project(str(tmp_path), "ios", "build")
        assert len(issues) == 0

    @pytest.mark.asyncio
    async def test_validates_root_fastfile_when_no_platform(self, tmp_path):
        fastlane_dir = tmp_path / "fastlane"
        fastlane_dir.mkdir()
        (fastlane_dir / "Fastfile").write_text("lane :shared do\nend")

        issues = await validate_project(str(tmp_path), None, "shared")
        assert len(issues) == 0
