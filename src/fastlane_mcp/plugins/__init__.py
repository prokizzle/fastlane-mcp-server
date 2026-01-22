"""Plugin modules."""

from fastlane_mcp.plugins.registry import (
    PLUGIN_CATALOG,
    PluginInfo,
    search_plugins,
    get_plugin_info,
)

__all__ = ["PLUGIN_CATALOG", "PluginInfo", "search_plugins", "get_plugin_info"]
