"""Command execution utilities."""

import asyncio
import os
from dataclasses import dataclass
from pathlib import Path

from fastlane_mcp.utils.sanitize import sanitize_lane_name
from fastlane_mcp.utils.paths import find_execution_dir

VALID_PLATFORMS = ("ios", "android")


@dataclass
class ExecutionResult:
    """Result of command execution."""
    stdout: str
    stderr: str
    exit_code: int


DEFAULT_TIMEOUT = 600  # 10 minutes


async def execute_command(
    command: str,
    args: list[str],
    cwd: Path | str | None = None,
    env: dict[str, str] | None = None,
    timeout: int = DEFAULT_TIMEOUT
) -> ExecutionResult:
    """Execute a shell command asynchronously.

    Args:
        command: The command to execute
        args: Command arguments
        cwd: Working directory
        env: Additional environment variables (merged with current env)
        timeout: Timeout in seconds

    Returns:
        ExecutionResult with stdout, stderr, and exit code
    """
    merged_env = {**os.environ, **(env or {})}

    proc = await asyncio.create_subprocess_exec(
        command, *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(cwd) if cwd else None,
        env=merged_env
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=timeout
        )
        return ExecutionResult(
            stdout=stdout.decode(),
            stderr=stderr.decode(),
            exit_code=proc.returncode or 0
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return ExecutionResult(
            stdout="",
            stderr=f"Command timed out after {timeout}s",
            exit_code=124
        )


async def execute_fastlane(
    lane: str,
    platform: str,
    project_path: Path,
    env_vars: dict[str, str] | None = None
) -> ExecutionResult:
    """Execute a fastlane lane.

    Args:
        lane: The lane name to execute
        platform: Platform (ios or android)
        project_path: Path to the project root
        env_vars: Additional environment variables

    Returns:
        ExecutionResult with stdout, stderr, and exit code

    Raises:
        ValueError: If platform is invalid
    """
    if platform not in VALID_PLATFORMS:
        raise ValueError(f"Invalid platform: {platform}. Must be one of: {', '.join(VALID_PLATFORMS)}")

    safe_lane = sanitize_lane_name(lane)

    # Find correct working directory (handles both RN and native projects)
    execution_dir = find_execution_dir(project_path, platform)

    return await execute_command(
        "fastlane",
        [safe_lane],
        cwd=execution_dir,
        env=env_vars
    )
