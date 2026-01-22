"""Project analysis tool."""

from pathlib import Path
from fastmcp.exceptions import ToolError

from fastlane_mcp.server import mcp
from fastlane_mcp.utils.sanitize import validate_project_path, ValidationError
from fastlane_mcp.discovery.lanes import parse_lanes_from_fastfile


@mcp.tool
async def analyze_project(project_path: str) -> dict:
    """Analyze a fastlane project structure.

    Discovers platforms, lanes, and configuration.

    Args:
        project_path: Path to the project root

    Returns:
        Analysis result with platforms, lanes, and recommendations
    """
    try:
        validated_path = await validate_project_path(project_path)
    except ValidationError as e:
        raise ToolError(str(e))

    platforms: list[str] = []
    all_lanes: list[dict] = []

    # Check for platform-specific fastlane directories
    for platform in ["ios", "android"]:
        fastfile = validated_path / platform / "fastlane" / "Fastfile"
        if fastfile.exists():
            platforms.append(platform)
            content = fastfile.read_text()
            lanes = parse_lanes_from_fastfile(content)
            for lane in lanes:
                all_lanes.append({
                    "name": lane.name,
                    "platform": lane.platform or platform,
                    "description": lane.description,
                    "is_private": lane.is_private,
                })

    # Check for root-level fastlane directory (shared lanes)
    root_fastfile = validated_path / "fastlane" / "Fastfile"
    if root_fastfile.exists():
        content = root_fastfile.read_text()
        lanes = parse_lanes_from_fastfile(content)
        for lane in lanes:
            all_lanes.append({
                "name": lane.name,
                "platform": lane.platform,
                "description": lane.description,
                "is_private": lane.is_private,
            })

    return {
        "project_path": str(validated_path),
        "platforms": platforms,
        "lanes": all_lanes,
        "has_fastlane": len(platforms) > 0 or root_fastfile.exists(),
    }
