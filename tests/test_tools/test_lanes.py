"""Tests for lanes tool."""

import pytest
from fastmcp.exceptions import ToolError
from fastlane_mcp.tools.lanes import list_lanes


# Access the underlying function from the FunctionTool object
_list_lanes = list_lanes.fn


class TestListLanes:
    @pytest.mark.asyncio
    async def test_lists_ios_lanes(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
desc "Build for testing"
lane :build do
  gym
end

desc "Deploy to TestFlight"
lane :deploy do
  pilot
end
''')

        result = await _list_lanes(str(tmp_path), "ios")

        assert len(result["lanes"]) == 2
        names = [l["name"] for l in result["lanes"]]
        assert "build" in names
        assert "deploy" in names

    @pytest.mark.asyncio
    async def test_filters_private_lanes_by_default(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
lane :public_lane do
end

private_lane :helper do
end
''')

        result = await _list_lanes(str(tmp_path), "ios")

        names = [l["name"] for l in result["lanes"]]
        assert "public_lane" in names
        assert "helper" not in names

    @pytest.mark.asyncio
    async def test_includes_private_when_requested(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
lane :public_lane do
end

private_lane :helper do
end
''')

        result = await _list_lanes(str(tmp_path), "ios", include_private=True)

        names = [l["name"] for l in result["lanes"]]
        assert "public_lane" in names
        assert "helper" in names

    @pytest.mark.asyncio
    async def test_raises_error_for_missing_fastfile(self, tmp_path):
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with pytest.raises(ToolError, match="Fastfile not found"):
            await _list_lanes(str(tmp_path), "ios")
