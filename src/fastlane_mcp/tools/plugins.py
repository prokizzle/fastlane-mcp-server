"""Plugin discovery and management tools."""

from fastlane_mcp.server import mcp
from fastlane_mcp.plugins.registry import search_plugins, get_plugin_info


@mcp.tool
async def search_fastlane_plugins(query: str) -> dict:
    """Search for fastlane plugins.

    Args:
        query: Search query (matches name, description, signals)

    Returns:
        List of matching plugins with details
    """
    results = search_plugins(query)

    return {
        "query": query,
        "plugins": [
            {
                "name": p.name,
                "description": p.description,
                "capabilities": p.capabilities,
                "homepage": p.homepage,
            }
            for p in results
        ]
    }


@mcp.tool
async def get_plugin_details(plugin_name: str) -> dict:
    """Get detailed information about a fastlane plugin.

    Args:
        plugin_name: The plugin name (e.g., fastlane-plugin-firebase_app_distribution)

    Returns:
        Plugin details including description, capabilities, and installation
    """
    info = get_plugin_info(plugin_name)

    if not info:
        return {
            "found": False,
            "message": f"Plugin '{plugin_name}' not found in registry",
        }

    return {
        "found": True,
        "name": info.name,
        "description": info.description,
        "signals": info.signals,
        "capabilities": info.capabilities,
        "homepage": info.homepage,
        "installation": f"Add to your Gemfile: gem '{info.name}'",
    }
