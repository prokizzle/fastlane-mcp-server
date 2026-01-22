"""Build tools for iOS and Android."""

from fastmcp.exceptions import ToolError

from fastlane_mcp.server import mcp
from fastlane_mcp.validators import run_preflight, PreflightContext
from fastlane_mcp.utils.executor import execute_fastlane
from fastlane_mcp.utils.sanitize import validate_project_path, ValidationError
from fastlane_mcp.errors.diagnosis import diagnose_error


@mcp.tool
async def build_ios(
    project_path: str,
    lane: str = "build",
    environment: str | None = None,
    clean: bool = False,
) -> dict:
    """Build an iOS app using fastlane.

    Args:
        project_path: Path to the project root
        lane: Fastlane lane to run (default: build)
        environment: Build environment (debug/release)
        clean: Whether to clean before building

    Returns:
        Build result with output and status
    """
    # Validate path
    try:
        validated_path = await validate_project_path(project_path)
    except ValidationError as e:
        raise ToolError(str(e))

    # Pre-flight checks
    preflight = await run_preflight(PreflightContext(
        project_path=str(validated_path),
        platform="ios",
        lane=lane,
        required_tools=["fastlane", "xcodebuild"]
    ))

    if not preflight.valid:
        raise ToolError(f"Pre-flight checks failed:\n\n{preflight.format_issues()}")

    # Build environment variables
    env_vars = {}
    if environment:
        env_vars["FASTLANE_ENV"] = environment

    # Execute build
    result = await execute_fastlane(lane, "ios", validated_path, env_vars)

    if result.exit_code != 0:
        diagnosis = diagnose_error(result.stderr or result.stdout)
        raise ToolError(
            f"{diagnosis['message']}\n\n"
            f"Diagnosis: {diagnosis['diagnosis']}\n\n"
            f"Suggestions:\n" + "\n".join(f"  - {s}" for s in diagnosis['suggestions'])
        )

    return {"success": True, "output": result.stdout}


@mcp.tool
async def build_android(
    project_path: str,
    lane: str = "build",
    environment: str | None = None,
    clean: bool = False,
) -> dict:
    """Build an Android app using fastlane.

    Args:
        project_path: Path to the project root
        lane: Fastlane lane to run (default: build)
        environment: Build environment (debug/release)
        clean: Whether to clean before building

    Returns:
        Build result with output and status
    """
    # Validate path
    try:
        validated_path = await validate_project_path(project_path)
    except ValidationError as e:
        raise ToolError(str(e))

    # Pre-flight checks
    preflight = await run_preflight(PreflightContext(
        project_path=str(validated_path),
        platform="android",
        lane=lane,
        required_tools=["fastlane"]
    ))

    if not preflight.valid:
        raise ToolError(f"Pre-flight checks failed:\n\n{preflight.format_issues()}")

    # Build environment variables
    env_vars = {}
    if environment:
        env_vars["FASTLANE_ENV"] = environment

    # Execute build
    result = await execute_fastlane(lane, "android", validated_path, env_vars)

    if result.exit_code != 0:
        diagnosis = diagnose_error(result.stderr or result.stdout)
        raise ToolError(
            f"{diagnosis['message']}\n\n"
            f"Diagnosis: {diagnosis['diagnosis']}\n\n"
            f"Suggestions:\n" + "\n".join(f"  - {s}" for s in diagnosis['suggestions'])
        )

    return {"success": True, "output": result.stdout}
