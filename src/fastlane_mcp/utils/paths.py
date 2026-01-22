"""Path utilities for fastlane project discovery."""

from pathlib import Path


def find_fastlane_dir(project_path: Path, platform: str | None = None) -> Path | None:
    """Find the fastlane directory for a project.

    Checks both platform-specific directories (React Native style) and
    root-level fastlane directories (native iOS/Android style).

    Args:
        project_path: Path to the project root
        platform: Optional platform to check (ios/android)

    Returns:
        Path to the fastlane directory if found with a Fastfile, None otherwise
    """
    if platform:
        # First check platform-specific directory (React Native style)
        platform_dir = project_path / platform / "fastlane"
        if (platform_dir / "Fastfile").exists():
            return platform_dir

    # Fall back to root-level fastlane directory (native style)
    root_dir = project_path / "fastlane"
    if (root_dir / "Fastfile").exists():
        return root_dir

    return None


def find_execution_dir(project_path: Path, platform: str) -> Path:
    """Find the correct working directory for running fastlane.

    For native iOS/Android projects, fastlane runs from the project root.
    For React Native projects, fastlane runs from the platform subdirectory.

    Args:
        project_path: Path to the project root
        platform: Platform (ios/android)

    Returns:
        Path to use as working directory for fastlane execution
    """
    # Check if platform-specific fastlane exists (React Native style)
    platform_dir = project_path / platform / "fastlane"
    if (platform_dir / "Fastfile").exists():
        return project_path / platform

    # Otherwise use root (native iOS/Android style)
    return project_path
