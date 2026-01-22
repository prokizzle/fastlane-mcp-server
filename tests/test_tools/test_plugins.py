"""Tests for plugin tools."""

import pytest
from fastlane_mcp.tools.plugins import search_fastlane_plugins, get_plugin_details


# Access the underlying function from the FunctionTool object
_search_fastlane_plugins = search_fastlane_plugins.fn
_get_plugin_details = get_plugin_details.fn


class TestSearchPlugins:
    @pytest.mark.asyncio
    async def test_finds_plugins_by_query(self):
        result = await _search_fastlane_plugins("firebase")

        assert len(result["plugins"]) >= 1
        assert any("firebase" in p["name"].lower() for p in result["plugins"])

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_match(self):
        result = await _search_fastlane_plugins("xyznonexistent123")

        assert result["plugins"] == []


class TestGetPluginDetails:
    @pytest.mark.asyncio
    async def test_returns_plugin_info(self):
        result = await _get_plugin_details("fastlane-plugin-firebase_app_distribution")

        assert result["found"] is True
        assert "description" in result
        assert "capabilities" in result

    @pytest.mark.asyncio
    async def test_returns_not_found_for_unknown(self):
        result = await _get_plugin_details("nonexistent-plugin-xyz")

        assert result["found"] is False
