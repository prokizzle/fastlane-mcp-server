"""Plugin registry and search functionality."""

from dataclasses import dataclass


@dataclass
class PluginInfo:
    """Information about a fastlane plugin."""
    name: str
    description: str
    signals: list[str]
    capabilities: list[str]
    homepage: str | None = None


PLUGIN_CATALOG: dict[str, dict] = {
    "fastlane-plugin-firebase_app_distribution": {
        "description": "Distribute builds via Firebase App Distribution",
        "signals": ["firebase", "crashlytics", "google-services"],
        "capabilities": ["firebase_app_distribution"],
        "homepage": "https://github.com/fastlane/fastlane-plugin-firebase_app_distribution",
    },
    "fastlane-plugin-appcenter": {
        "description": "Distribute builds via Microsoft AppCenter",
        "signals": ["appcenter", "hockeyapp"],
        "capabilities": ["appcenter_upload"],
        "homepage": "https://github.com/microsoft/fastlane-plugin-appcenter",
    },
    "fastlane-plugin-versioning": {
        "description": "Manage app version and build numbers",
        "signals": ["version", "build_number"],
        "capabilities": ["increment_version_number", "get_version_number"],
        "homepage": "https://github.com/SiarheiFeworks/fastlane-plugin-versioning",
    },
    "fastlane-plugin-badge": {
        "description": "Add badges to app icons",
        "signals": ["badge", "icon"],
        "capabilities": ["add_badge"],
        "homepage": "https://github.com/HazAT/fastlane-plugin-badge",
    },
    "fastlane-plugin-xcconfig": {
        "description": "Read and update xcconfig files",
        "signals": ["xcconfig", "configuration"],
        "capabilities": ["read_xcconfig", "update_xcconfig"],
        "homepage": "https://github.com/sovanna/fastlane-plugin-xcconfig",
    },
    "fastlane-plugin-emergetools": {
        "description": "Upload builds to Emerge Tools for size analysis",
        "signals": ["emerge", "size", "binary"],
        "capabilities": ["emerge_upload"],
        "homepage": "https://github.com/EmergeTools/fastlane-plugin-emerge",
    },
    "fastlane-plugin-sentry": {
        "description": "Upload dSYMs to Sentry",
        "signals": ["sentry", "dsym", "crash"],
        "capabilities": ["sentry_upload_dsym"],
        "homepage": "https://github.com/getsentry/sentry-fastlane-plugin",
    },
    "fastlane-plugin-aws_s3": {
        "description": "Upload builds to AWS S3",
        "signals": ["s3", "aws", "bucket"],
        "capabilities": ["aws_s3"],
        "homepage": "https://github.com/joshdholtz/fastlane-plugin-aws_s3",
    },
    "fastlane-plugin-slack_bot": {
        "description": "Post messages to Slack using bot tokens",
        "signals": ["slack", "notification"],
        "capabilities": ["slack_bot"],
        "homepage": "https://github.com/aspect-app/fastlane-plugin-slack_bot",
    },
    "fastlane-plugin-test_center": {
        "description": "Advanced testing utilities",
        "signals": ["test", "xctest", "parallel"],
        "capabilities": ["multi_scan", "collate_junit_reports"],
        "homepage": "https://github.com/lyndsey-ferguson/fastlane-plugin-test_center",
    },
}


def search_plugins(query: str) -> list[PluginInfo]:
    """Search plugins by name or description.

    Args:
        query: Search query (case-insensitive)

    Returns:
        List of matching plugins
    """
    query_lower = query.lower()
    results: list[PluginInfo] = []

    for name, info in PLUGIN_CATALOG.items():
        if (query_lower in name.lower() or
            query_lower in info["description"].lower() or
            any(query_lower in s.lower() for s in info["signals"])):
            results.append(PluginInfo(
                name=name,
                description=info["description"],
                signals=info["signals"],
                capabilities=info["capabilities"],
                homepage=info.get("homepage"),
            ))

    return results


def get_plugin_info(plugin_name: str) -> PluginInfo | None:
    """Get information about a specific plugin.

    Args:
        plugin_name: The plugin name

    Returns:
        PluginInfo if found, None otherwise
    """
    info = PLUGIN_CATALOG.get(plugin_name)
    if not info:
        return None

    return PluginInfo(
        name=plugin_name,
        description=info["description"],
        signals=info["signals"],
        capabilities=info["capabilities"],
        homepage=info.get("homepage"),
    )
