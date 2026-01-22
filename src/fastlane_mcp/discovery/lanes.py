"""Lane parsing from Fastfiles."""

import re
from dataclasses import dataclass


@dataclass
class LaneInfo:
    """Information about a fastlane lane."""
    name: str
    platform: str | None
    description: str | None
    is_private: bool


def parse_lanes_from_fastfile(content: str) -> list[LaneInfo]:
    """Parse lanes from Fastfile content.

    Handles:
    - Platform blocks (platform :ios do ... end)
    - Lane definitions (lane :name do ... end)
    - Private lanes (private_lane :name do ... end)
    - Underscore-prefixed private lanes (_name)
    - Description blocks (desc "..." or desc '...')

    Args:
        content: The Fastfile content as a string

    Returns:
        List of LaneInfo objects
    """
    lanes: list[LaneInfo] = []
    current_platform: str | None = None
    last_description: str | None = None

    for line in content.split('\n'):
        trimmed = line.strip()

        # Skip empty lines and comments
        if not trimmed or trimmed.startswith('#'):
            continue

        # Track platform blocks
        platform_match = re.match(r'^platform\s+:(\w+)\s+do\s*$', trimmed)
        if platform_match:
            platform = platform_match.group(1)
            if platform in ('ios', 'android'):
                current_platform = platform
            continue

        # Track description blocks - supports both single and double quotes
        desc_match = re.match(r'^desc\s+(?:"([^"]+)"|\'([^\']+)\')\s*$', trimmed)
        if desc_match:
            last_description = desc_match.group(1) or desc_match.group(2)
            continue

        # Match lane definitions (both regular and private)
        lane_match = re.match(r'^(private_lane|lane)\s+:(\w+)\s+do', trimmed)
        if lane_match:
            lane_type = lane_match.group(1)
            name = lane_match.group(2)
            is_private = lane_type == 'private_lane' or name.startswith('_')

            lanes.append(LaneInfo(
                name=name,
                platform=current_platform,
                description=last_description,
                is_private=is_private
            ))

            last_description = None  # Reset after use
            continue

        # Track end statements to manage platform block context
        if trimmed == 'end' and current_platform is not None:
            # Simplified: assume top-level end closes platform
            # A full Ruby parser would track block depth
            current_platform = None

    return lanes
