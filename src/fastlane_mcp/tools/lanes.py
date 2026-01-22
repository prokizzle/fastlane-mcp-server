"""Lane listing tool."""

from fastmcp.exceptions import ToolError

from fastlane_mcp.server import mcp
from fastlane_mcp.utils.sanitize import validate_project_path, ValidationError
from fastlane_mcp.discovery.lanes import parse_lanes_from_fastfile


@mcp.tool
async def list_lanes(
    project_path: str,
    platform: str | None = None,
    include_private: bool = False,
) -> dict:
    """List available fastlane lanes.

    Args:
        project_path: Path to the project root
        platform: Filter by platform (ios/android) or None for all
        include_private: Include private lanes in the output

    Returns:
        List of lanes with their details
    """
    try:
        validated_path = await validate_project_path(project_path)
    except ValidationError as e:
        raise ToolError(str(e))

    lanes_found: list[dict] = []

    # Determine which directories to check
    if platform:
        dirs_to_check = [(platform, validated_path / platform / "fastlane")]
    else:
        dirs_to_check = [
            ("ios", validated_path / "ios" / "fastlane"),
            ("android", validated_path / "android" / "fastlane"),
            (None, validated_path / "fastlane"),
        ]

    for plat, fastlane_dir in dirs_to_check:
        fastfile = fastlane_dir / "Fastfile"
        if not fastfile.exists():
            if platform:  # Only error if a specific platform was requested
                raise ToolError(f"Fastfile not found at {fastfile}")
            continue

        content = fastfile.read_text()
        lanes = parse_lanes_from_fastfile(content)

        for lane in lanes:
            # Skip private lanes unless requested
            if lane.is_private and not include_private:
                continue

            lanes_found.append({
                "name": lane.name,
                "platform": lane.platform or plat,
                "description": lane.description,
                "is_private": lane.is_private,
            })

    return {
        "project_path": str(validated_path),
        "platform_filter": platform,
        "lanes": lanes_found,
    }
