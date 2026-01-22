"""Command execution utilities."""

import asyncio
import os
from dataclasses import dataclass
from pathlib import Path


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
