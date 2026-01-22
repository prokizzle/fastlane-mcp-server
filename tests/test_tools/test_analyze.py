"""Tests for analyze tool."""

import pytest
from fastlane_mcp.tools.analyze import analyze_project


# Access the underlying function from the FunctionTool object
_analyze_project = analyze_project.fn


class TestAnalyzeProject:
    @pytest.mark.asyncio
    async def test_detects_ios_platform(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\nend")

        result = await _analyze_project(str(tmp_path))

        assert "ios" in result["platforms"]

    @pytest.mark.asyncio
    async def test_detects_android_platform(self, tmp_path):
        android_dir = tmp_path / "android" / "fastlane"
        android_dir.mkdir(parents=True)
        (android_dir / "Fastfile").write_text("lane :build do\nend")

        result = await _analyze_project(str(tmp_path))

        assert "android" in result["platforms"]

    @pytest.mark.asyncio
    async def test_lists_lanes(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
desc "Build the app"
lane :build do
  gym
end

lane :test do
  scan
end
''')

        result = await _analyze_project(str(tmp_path))

        lane_names = [l["name"] for l in result["lanes"]]
        assert "build" in lane_names
        assert "test" in lane_names

    @pytest.mark.asyncio
    async def test_returns_empty_for_non_fastlane_project(self, tmp_path):
        result = await _analyze_project(str(tmp_path))

        assert result["platforms"] == []
        assert result["lanes"] == []
