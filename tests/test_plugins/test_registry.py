"""Tests for plugin registry."""

import pytest
from fastlane_mcp.plugins.registry import (
    PLUGIN_CATALOG,
    search_plugins,
    get_plugin_info,
)


class TestPluginCatalog:
    def test_catalog_has_common_plugins(self):
        assert "fastlane-plugin-firebase_app_distribution" in PLUGIN_CATALOG
        assert "fastlane-plugin-appcenter" in PLUGIN_CATALOG

    def test_plugins_have_required_fields(self):
        for name, info in PLUGIN_CATALOG.items():
            assert "description" in info, f"{name} missing description"
            assert "signals" in info, f"{name} missing signals"
            assert "capabilities" in info, f"{name} missing capabilities"


class TestSearchPlugins:
    def test_finds_plugin_by_name(self):
        results = search_plugins("firebase")
        assert len(results) >= 1
        assert any("firebase" in p.name.lower() for p in results)

    def test_finds_plugin_by_description(self):
        results = search_plugins("distribute")
        assert len(results) >= 1

    def test_returns_empty_for_no_match(self):
        results = search_plugins("xyznonexistent123")
        assert results == []

    def test_search_is_case_insensitive(self):
        results1 = search_plugins("Firebase")
        results2 = search_plugins("firebase")
        assert results1 == results2


class TestGetPluginInfo:
    def test_returns_plugin_info(self):
        info = get_plugin_info("fastlane-plugin-firebase_app_distribution")
        assert info is not None
        assert info.name == "fastlane-plugin-firebase_app_distribution"
        assert info.description

    def test_returns_none_for_unknown_plugin(self):
        info = get_plugin_info("nonexistent-plugin-xyz")
        assert info is None
