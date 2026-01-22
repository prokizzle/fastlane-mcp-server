# FastMCP 3.0 Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the fastlane-mcp-server from TypeScript to Python using FastMCP 3.0 framework.

**Architecture:** Full replacement - create Python package alongside TypeScript, migrate all features from Phases 1-5, then delete TypeScript code. Uses FastMCP's decorator-based tool registration with async execution and structured error handling.

**Tech Stack:** Python 3.11+, FastMCP 3.0 (beta), uv package manager, pytest, pytest-asyncio

**Reference:** See `docs/plans/2026-01-21-fastmcp-migration-design.md` for detailed design decisions.

---

## Task 1: Initialize Python Project with uv

**Files:**
- Create: `pyproject.toml`
- Create: `src/fastlane_mcp/__init__.py`
- Create: `src/fastlane_mcp/server.py`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "fastlane-mcp"
version = "0.1.0"
description = "Intelligent MCP server for iOS/Android builds with fastlane"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "fastmcp>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/fastlane_mcp"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Step 2: Create directory structure and __init__.py**

```bash
mkdir -p src/fastlane_mcp/tools src/fastlane_mcp/discovery src/fastlane_mcp/plugins src/fastlane_mcp/validators src/fastlane_mcp/errors src/fastlane_mcp/utils tests/test_tools tests/test_discovery tests/test_plugins tests/test_validators tests/test_errors tests/test_utils
```

Create `src/fastlane_mcp/__init__.py`:
```python
"""Fastlane MCP Server - Intelligent assistant for iOS/Android builds."""

__version__ = "0.1.0"
```

**Step 3: Create minimal server.py**

```python
"""FastMCP server entry point."""

from fastmcp import FastMCP

mcp = FastMCP(
    "Fastlane MCP Server",
    description="Intelligent assistant for iOS/Android builds with fastlane"
)

if __name__ == "__main__":
    mcp.run()
```

**Step 4: Install dependencies with uv**

Run: `uv add fastmcp --prerelease=allow`
Run: `uv add --dev pytest pytest-asyncio`

**Step 5: Verify server starts**

Run: `uv run python -c "from fastlane_mcp.server import mcp; print(mcp.name)"`
Expected: `Fastlane MCP Server`

**Step 6: Commit**

```bash
git add pyproject.toml src/ tests/
git commit -m "feat: initialize Python project with FastMCP 3.0"
```

---

## Task 2: Create Sanitization Utilities

**Files:**
- Create: `src/fastlane_mcp/utils/__init__.py`
- Create: `src/fastlane_mcp/utils/sanitize.py`
- Create: `tests/test_utils/__init__.py`
- Create: `tests/test_utils/test_sanitize.py`

**Step 1: Write failing tests for sanitize_lane_name**

Create `tests/test_utils/__init__.py`:
```python
"""Tests for utility modules."""
```

Create `tests/test_utils/test_sanitize.py`:
```python
"""Tests for input sanitization."""

import pytest
from fastlane_mcp.utils.sanitize import (
    sanitize_lane_name,
    validate_project_path,
    ValidationError,
)


class TestSanitizeLaneName:
    def test_valid_lane_name(self):
        assert sanitize_lane_name("build") == "build"

    def test_valid_lane_with_underscore(self):
        assert sanitize_lane_name("build_release") == "build_release"

    def test_valid_lane_with_hyphen(self):
        assert sanitize_lane_name("build-release") == "build-release"

    def test_strips_whitespace(self):
        assert sanitize_lane_name("  build  ") == "build"

    def test_rejects_empty_string(self):
        with pytest.raises(ValidationError, match="non-empty"):
            sanitize_lane_name("")

    def test_rejects_none(self):
        with pytest.raises(ValidationError, match="non-empty"):
            sanitize_lane_name(None)

    def test_rejects_shell_injection(self):
        with pytest.raises(ValidationError, match="invalid characters"):
            sanitize_lane_name("build; rm -rf /")

    def test_rejects_command_substitution(self):
        with pytest.raises(ValidationError, match="invalid characters"):
            sanitize_lane_name("build$(whoami)")

    def test_rejects_pipe(self):
        with pytest.raises(ValidationError, match="invalid characters"):
            sanitize_lane_name("build | cat")

    def test_rejects_starting_with_number(self):
        with pytest.raises(ValidationError, match="Invalid lane name"):
            sanitize_lane_name("123build")
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_utils/test_sanitize.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement sanitize.py**

Create `src/fastlane_mcp/utils/__init__.py`:
```python
"""Shared utility modules."""

from fastlane_mcp.utils.sanitize import (
    sanitize_lane_name,
    validate_project_path,
    ValidationError,
)

__all__ = ["sanitize_lane_name", "validate_project_path", "ValidationError"]
```

Create `src/fastlane_mcp/utils/sanitize.py`:
```python
"""Input sanitization and validation utilities."""

import re
from pathlib import Path

class ValidationError(Exception):
    """Raised when input validation fails."""
    pass


# Lane names must start with letter, contain only alphanumeric, underscore, hyphen
SAFE_LANE_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]*$')

# Characters that could be used for shell injection
DANGEROUS_CHARS = re.compile(r'[;&|`$(){}[\]<>!#*?~\\"\']')


def sanitize_lane_name(lane: str | None) -> str:
    """Validate and sanitize a fastlane lane name.

    Args:
        lane: The lane name to sanitize

    Returns:
        The sanitized lane name

    Raises:
        ValidationError: If the lane name is invalid
    """
    if not lane or not isinstance(lane, str):
        raise ValidationError("Lane name must be a non-empty string")

    trimmed = lane.strip()

    if not trimmed:
        raise ValidationError("Lane name must be a non-empty string")

    if DANGEROUS_CHARS.search(trimmed):
        raise ValidationError(f"Lane name contains invalid characters: {trimmed}")

    if not SAFE_LANE_PATTERN.match(trimmed):
        raise ValidationError(f"Invalid lane name format: {trimmed}")

    return trimmed


async def validate_project_path(path: str | None) -> Path:
    """Validate project path exists and is a directory.

    Args:
        path: The path to validate

    Returns:
        The resolved Path object

    Raises:
        ValidationError: If the path is invalid
    """
    if not path or not isinstance(path, str):
        raise ValidationError("Path must be a non-empty string")

    # Check for path traversal attempts
    if ".." in path:
        original_parts = path.split("/")
        if ".." in original_parts:
            raise ValidationError(f"Path contains suspicious traversal: {path}")

    p = Path(path).resolve()

    if not p.exists():
        raise ValidationError(f"Path does not exist: {path}")

    if not p.is_dir():
        raise ValidationError(f"Path is not a directory: {path}")

    return p
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_utils/test_sanitize.py -v`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add src/fastlane_mcp/utils/ tests/test_utils/
git commit -m "feat: add input sanitization utilities"
```

---

## Task 3: Add Path Validation Tests

**Files:**
- Modify: `tests/test_utils/test_sanitize.py`

**Step 1: Write failing tests for validate_project_path**

Add to `tests/test_utils/test_sanitize.py`:
```python
import tempfile
from pathlib import Path


class TestValidateProjectPath:
    @pytest.mark.asyncio
    async def test_valid_directory(self, tmp_path):
        result = await validate_project_path(str(tmp_path))
        assert result == tmp_path

    @pytest.mark.asyncio
    async def test_rejects_empty_string(self):
        with pytest.raises(ValidationError, match="non-empty"):
            await validate_project_path("")

    @pytest.mark.asyncio
    async def test_rejects_none(self):
        with pytest.raises(ValidationError, match="non-empty"):
            await validate_project_path(None)

    @pytest.mark.asyncio
    async def test_rejects_nonexistent_path(self):
        with pytest.raises(ValidationError, match="does not exist"):
            await validate_project_path("/nonexistent/path/12345")

    @pytest.mark.asyncio
    async def test_rejects_file_path(self, tmp_path):
        file_path = tmp_path / "test.txt"
        file_path.write_text("test")
        with pytest.raises(ValidationError, match="not a directory"):
            await validate_project_path(str(file_path))

    @pytest.mark.asyncio
    async def test_rejects_path_traversal(self):
        with pytest.raises(ValidationError, match="traversal"):
            await validate_project_path("/tmp/../etc/passwd")

    @pytest.mark.asyncio
    async def test_allows_double_dots_in_directory_name(self, tmp_path):
        # Directories with ".." in name (not as traversal) should work
        dotdir = tmp_path / "test..dir"
        dotdir.mkdir()
        result = await validate_project_path(str(dotdir))
        assert result == dotdir
```

**Step 2: Run tests to verify they pass**

Run: `uv run pytest tests/test_utils/test_sanitize.py::TestValidateProjectPath -v`
Expected: All 7 tests PASS

**Step 3: Commit**

```bash
git add tests/test_utils/test_sanitize.py
git commit -m "test: add path validation tests"
```

---

## Task 4: Create Command Executor

**Files:**
- Create: `src/fastlane_mcp/utils/executor.py`
- Create: `tests/test_utils/test_executor.py`

**Step 1: Write failing tests for execute_command**

Create `tests/test_utils/test_executor.py`:
```python
"""Tests for command execution."""

import pytest
from fastlane_mcp.utils.executor import execute_command, ExecutionResult


class TestExecuteCommand:
    @pytest.mark.asyncio
    async def test_successful_command(self):
        result = await execute_command("echo", ["hello"])
        assert result.exit_code == 0
        assert "hello" in result.stdout

    @pytest.mark.asyncio
    async def test_command_with_cwd(self, tmp_path):
        result = await execute_command("pwd", [], cwd=tmp_path)
        assert result.exit_code == 0
        assert str(tmp_path) in result.stdout

    @pytest.mark.asyncio
    async def test_command_with_env(self):
        result = await execute_command(
            "sh", ["-c", "echo $TEST_VAR"],
            env={"TEST_VAR": "test_value"}
        )
        assert result.exit_code == 0
        assert "test_value" in result.stdout

    @pytest.mark.asyncio
    async def test_failed_command(self):
        result = await execute_command("false", [])
        assert result.exit_code != 0

    @pytest.mark.asyncio
    async def test_command_timeout(self):
        result = await execute_command("sleep", ["10"], timeout=1)
        assert result.exit_code == 124
        assert "timed out" in result.stderr.lower()

    @pytest.mark.asyncio
    async def test_captures_stderr(self):
        result = await execute_command("sh", ["-c", "echo error >&2"])
        assert "error" in result.stderr
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_utils/test_executor.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement executor.py**

Create `src/fastlane_mcp/utils/executor.py`:
```python
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
```

**Step 4: Update utils __init__.py**

```python
"""Shared utility modules."""

from fastlane_mcp.utils.sanitize import (
    sanitize_lane_name,
    validate_project_path,
    ValidationError,
)
from fastlane_mcp.utils.executor import execute_command, ExecutionResult

__all__ = [
    "sanitize_lane_name",
    "validate_project_path",
    "ValidationError",
    "execute_command",
    "ExecutionResult",
]
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_utils/test_executor.py -v`
Expected: All 6 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/utils/ tests/test_utils/
git commit -m "feat: add async command executor"
```

---

## Task 5: Create Fastlane Executor

**Files:**
- Modify: `src/fastlane_mcp/utils/executor.py`
- Modify: `tests/test_utils/test_executor.py`

**Step 1: Write failing tests for execute_fastlane**

Add to `tests/test_utils/test_executor.py`:
```python
from unittest.mock import patch, AsyncMock
from fastlane_mcp.utils.executor import execute_fastlane


class TestExecuteFastlane:
    @pytest.mark.asyncio
    async def test_executes_in_platform_directory(self, tmp_path):
        # Create platform directory structure
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with patch("fastlane_mcp.utils.executor.execute_command") as mock_exec:
            mock_exec.return_value = ExecutionResult("output", "", 0)

            result = await execute_fastlane("build", "ios", tmp_path)

            mock_exec.assert_called_once()
            call_args = mock_exec.call_args
            assert call_args[0][0] == "fastlane"
            assert call_args[0][1] == ["build"]
            assert call_args[1]["cwd"] == ios_dir

    @pytest.mark.asyncio
    async def test_sanitizes_lane_name(self, tmp_path):
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with patch("fastlane_mcp.utils.executor.execute_command") as mock_exec:
            mock_exec.return_value = ExecutionResult("output", "", 0)

            # Should sanitize whitespace
            await execute_fastlane("  build  ", "ios", tmp_path)

            call_args = mock_exec.call_args
            assert call_args[0][1] == ["build"]

    @pytest.mark.asyncio
    async def test_passes_env_vars(self, tmp_path):
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with patch("fastlane_mcp.utils.executor.execute_command") as mock_exec:
            mock_exec.return_value = ExecutionResult("output", "", 0)

            await execute_fastlane("build", "ios", tmp_path, env_vars={"KEY": "value"})

            call_args = mock_exec.call_args
            assert call_args[1]["env"] == {"KEY": "value"}

    @pytest.mark.asyncio
    async def test_rejects_invalid_platform(self, tmp_path):
        with pytest.raises(ValueError, match="Invalid platform"):
            await execute_fastlane("build", "windows", tmp_path)
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_utils/test_executor.py::TestExecuteFastlane -v`
Expected: FAIL with "cannot import name 'execute_fastlane'"

**Step 3: Implement execute_fastlane**

Add to `src/fastlane_mcp/utils/executor.py`:
```python
from fastlane_mcp.utils.sanitize import sanitize_lane_name

VALID_PLATFORMS = ("ios", "android")


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
    platform_dir = project_path / platform

    return await execute_command(
        "fastlane",
        [safe_lane],
        cwd=platform_dir,
        env=env_vars
    )
```

**Step 4: Update utils __init__.py exports**

Add `execute_fastlane` to exports in `src/fastlane_mcp/utils/__init__.py`.

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_utils/test_executor.py -v`
Expected: All 10 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/utils/ tests/test_utils/
git commit -m "feat: add fastlane command executor"
```

---

## Task 6: Create Validation Types

**Files:**
- Create: `src/fastlane_mcp/validators/__init__.py`
- Create: `src/fastlane_mcp/validators/types.py`
- Create: `tests/test_validators/__init__.py`
- Create: `tests/test_validators/test_types.py`

**Step 1: Write tests for validation types**

Create `tests/test_validators/__init__.py`:
```python
"""Tests for validators."""
```

Create `tests/test_validators/test_types.py`:
```python
"""Tests for validation types."""

import pytest
from fastlane_mcp.validators.types import (
    IssueLevel,
    ValidationIssue,
    ValidationResult,
)


class TestValidationResult:
    def test_format_error_issue(self):
        result = ValidationResult(
            valid=False,
            issues=[
                ValidationIssue(
                    level=IssueLevel.ERROR,
                    code="TEST_ERROR",
                    message="Test error message",
                    suggestion="Try this fix"
                )
            ]
        )
        formatted = result.format_issues()
        assert "[X]" in formatted
        assert "Test error message" in formatted
        assert "Try this fix" in formatted

    def test_format_warning_issue(self):
        result = ValidationResult(
            valid=True,
            issues=[
                ValidationIssue(
                    level=IssueLevel.WARNING,
                    code="TEST_WARN",
                    message="Test warning",
                )
            ]
        )
        formatted = result.format_issues()
        assert "[!]" in formatted
        assert "Test warning" in formatted

    def test_format_multiple_issues(self):
        result = ValidationResult(
            valid=False,
            issues=[
                ValidationIssue(IssueLevel.ERROR, "E1", "Error 1"),
                ValidationIssue(IssueLevel.WARNING, "W1", "Warning 1"),
            ]
        )
        formatted = result.format_issues()
        assert "Error 1" in formatted
        assert "Warning 1" in formatted

    def test_empty_issues_returns_empty_string(self):
        result = ValidationResult(valid=True, issues=[])
        assert result.format_issues() == ""
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_validators/test_types.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement validation types**

Create `src/fastlane_mcp/validators/types.py`:
```python
"""Validation types and data structures."""

from dataclasses import dataclass, field
from enum import Enum


class IssueLevel(Enum):
    """Severity level for validation issues."""
    ERROR = "error"
    WARNING = "warning"


@dataclass
class ValidationIssue:
    """A single validation issue."""
    level: IssueLevel
    code: str
    message: str
    suggestion: str | None = None


@dataclass
class ValidationResult:
    """Result of validation checks."""
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    def format_issues(self) -> str:
        """Format issues for display."""
        if not self.issues:
            return ""

        lines = []
        for issue in self.issues:
            icon = "X" if issue.level == IssueLevel.ERROR else "!"
            lines.append(f"[{icon}] {issue.message}")
            if issue.suggestion:
                lines.append(f"    -> {issue.suggestion}")
        return "\n".join(lines)


@dataclass
class PreflightContext:
    """Context for pre-flight validation."""
    project_path: str | None = None
    platform: str | None = None
    lane: str | None = None
    required_env_vars: list[str] = field(default_factory=list)
    required_tools: list[str] = field(default_factory=list)
```

Create `src/fastlane_mcp/validators/__init__.py`:
```python
"""Validation modules."""

from fastlane_mcp.validators.types import (
    IssueLevel,
    ValidationIssue,
    ValidationResult,
    PreflightContext,
)

__all__ = [
    "IssueLevel",
    "ValidationIssue",
    "ValidationResult",
    "PreflightContext",
]
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_validators/test_types.py -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/fastlane_mcp/validators/ tests/test_validators/
git commit -m "feat: add validation types and data structures"
```

---

## Task 7: Create Environment Validator

**Files:**
- Create: `src/fastlane_mcp/validators/environment.py`
- Create: `tests/test_validators/test_environment.py`

**Step 1: Write failing tests**

Create `tests/test_validators/test_environment.py`:
```python
"""Tests for environment validation."""

import os
import pytest
from unittest.mock import patch
from fastlane_mcp.validators.environment import validate_environment
from fastlane_mcp.validators.types import IssueLevel


class TestValidateEnvironment:
    def test_returns_empty_when_no_vars_required(self):
        issues = validate_environment([])
        assert issues == []

    def test_passes_when_all_vars_present(self):
        with patch.dict(os.environ, {"TEST_VAR": "value"}):
            issues = validate_environment(["TEST_VAR"])
            assert issues == []

    def test_error_when_var_missing(self):
        # Ensure var doesn't exist
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("MISSING_VAR", None)
            issues = validate_environment(["MISSING_VAR"])
            assert len(issues) == 1
            assert issues[0].level == IssueLevel.ERROR
            assert "MISSING_VAR" in issues[0].message

    def test_warning_when_var_empty(self):
        with patch.dict(os.environ, {"EMPTY_VAR": ""}):
            issues = validate_environment(["EMPTY_VAR"])
            assert len(issues) == 1
            assert issues[0].level == IssueLevel.WARNING
            assert "empty" in issues[0].message.lower()

    def test_multiple_vars(self):
        with patch.dict(os.environ, {"VAR1": "value1"}, clear=True):
            os.environ.pop("VAR2", None)
            issues = validate_environment(["VAR1", "VAR2"])
            assert len(issues) == 1
            assert "VAR2" in issues[0].message
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_validators/test_environment.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement environment.py**

Create `src/fastlane_mcp/validators/environment.py`:
```python
"""Environment variable validation."""

import os
from fastlane_mcp.validators.types import IssueLevel, ValidationIssue


def validate_environment(required_vars: list[str]) -> list[ValidationIssue]:
    """Validate that required environment variables are set.

    Args:
        required_vars: List of required environment variable names

    Returns:
        List of validation issues found
    """
    issues: list[ValidationIssue] = []

    for var_name in required_vars:
        value = os.environ.get(var_name)

        if value is None:
            issues.append(ValidationIssue(
                level=IssueLevel.ERROR,
                code="ENV_MISSING",
                message=f"Required environment variable not set: {var_name}",
                suggestion=f"Set {var_name} in your environment or .env file"
            ))
        elif value == "":
            issues.append(ValidationIssue(
                level=IssueLevel.WARNING,
                code="ENV_EMPTY",
                message=f"Environment variable is empty: {var_name}",
                suggestion=f"Verify {var_name} has the correct value"
            ))

    return issues
```

**Step 4: Update validators __init__.py**

Add to `src/fastlane_mcp/validators/__init__.py`:
```python
from fastlane_mcp.validators.environment import validate_environment

# Add to __all__
__all__ = [
    "IssueLevel",
    "ValidationIssue",
    "ValidationResult",
    "PreflightContext",
    "validate_environment",
]
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_validators/test_environment.py -v`
Expected: All 5 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/validators/ tests/test_validators/
git commit -m "feat: add environment variable validator"
```

---

## Task 8: Create Tools Validator

**Files:**
- Create: `src/fastlane_mcp/validators/tools.py`
- Create: `tests/test_validators/test_tools.py`

**Step 1: Write failing tests**

Create `tests/test_validators/test_tools.py`:
```python
"""Tests for tools validation."""

import pytest
from unittest.mock import patch, AsyncMock
from fastlane_mcp.validators.tools import validate_tools
from fastlane_mcp.validators.types import IssueLevel
from fastlane_mcp.utils.executor import ExecutionResult


class TestValidateTools:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_tools_required(self):
        issues = await validate_tools([])
        assert issues == []

    @pytest.mark.asyncio
    async def test_passes_when_tool_available(self):
        with patch("fastlane_mcp.validators.tools.execute_command") as mock:
            mock.return_value = ExecutionResult("/usr/bin/echo", "", 0)
            issues = await validate_tools(["echo"])
            assert issues == []

    @pytest.mark.asyncio
    async def test_error_when_tool_missing(self):
        with patch("fastlane_mcp.validators.tools.execute_command") as mock:
            mock.return_value = ExecutionResult("", "not found", 1)
            issues = await validate_tools(["nonexistent_tool"])
            assert len(issues) == 1
            assert issues[0].level == IssueLevel.ERROR
            assert "nonexistent_tool" in issues[0].message

    @pytest.mark.asyncio
    async def test_provides_install_suggestion_for_fastlane(self):
        with patch("fastlane_mcp.validators.tools.execute_command") as mock:
            mock.return_value = ExecutionResult("", "not found", 1)
            issues = await validate_tools(["fastlane"])
            assert len(issues) == 1
            assert "gem install" in issues[0].suggestion or "brew install" in issues[0].suggestion

    @pytest.mark.asyncio
    async def test_validates_multiple_tools(self):
        async def mock_exec(cmd, args, **kwargs):
            if args[0] == "tool1":
                return ExecutionResult("/path/tool1", "", 0)
            return ExecutionResult("", "not found", 1)

        with patch("fastlane_mcp.validators.tools.execute_command", side_effect=mock_exec):
            issues = await validate_tools(["tool1", "tool2"])
            assert len(issues) == 1
            assert "tool2" in issues[0].message
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_validators/test_tools.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement tools.py**

Create `src/fastlane_mcp/validators/tools.py`:
```python
"""Tool availability validation."""

from fastlane_mcp.validators.types import IssueLevel, ValidationIssue
from fastlane_mcp.utils.executor import execute_command


# Installation suggestions for common tools
TOOL_INSTALL_HINTS = {
    "fastlane": "Install with: gem install fastlane OR brew install fastlane",
    "xcodebuild": "Install Xcode from the App Store",
    "gradle": "Install with: brew install gradle",
    "bundler": "Install with: gem install bundler",
    "pod": "Install with: gem install cocoapods",
    "ruby": "Install with: brew install ruby",
}


async def validate_tools(required_tools: list[str]) -> list[ValidationIssue]:
    """Validate that required tools are available.

    Args:
        required_tools: List of required tool names

    Returns:
        List of validation issues found
    """
    issues: list[ValidationIssue] = []

    for tool_name in required_tools:
        result = await execute_command("which", [tool_name])

        if result.exit_code != 0:
            suggestion = TOOL_INSTALL_HINTS.get(
                tool_name,
                f"Install {tool_name} and ensure it's in your PATH"
            )

            issues.append(ValidationIssue(
                level=IssueLevel.ERROR,
                code="TOOL_MISSING",
                message=f"Required tool not found: {tool_name}",
                suggestion=suggestion
            ))

    return issues
```

**Step 4: Update validators __init__.py**

Add to exports:
```python
from fastlane_mcp.validators.tools import validate_tools
# Add to __all__
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_validators/test_tools.py -v`
Expected: All 5 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/validators/ tests/test_validators/
git commit -m "feat: add tool availability validator"
```

---

## Task 9: Create Project Validator

**Files:**
- Create: `src/fastlane_mcp/validators/project.py`
- Create: `tests/test_validators/test_project.py`

**Step 1: Write failing tests**

Create `tests/test_validators/test_project.py`:
```python
"""Tests for project validation."""

import pytest
from pathlib import Path
from fastlane_mcp.validators.project import validate_project
from fastlane_mcp.validators.types import IssueLevel


class TestValidateProject:
    @pytest.mark.asyncio
    async def test_error_when_fastfile_missing(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        # No Fastfile

        issues = await validate_project(str(tmp_path), "ios", None)
        errors = [i for i in issues if i.level == IssueLevel.ERROR]
        assert any("Fastfile" in i.message for i in errors)

    @pytest.mark.asyncio
    async def test_passes_when_fastfile_exists(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\nend")

        issues = await validate_project(str(tmp_path), "ios", None)
        errors = [i for i in issues if i.level == IssueLevel.ERROR]
        assert len(errors) == 0

    @pytest.mark.asyncio
    async def test_warning_when_lane_not_found(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\nend")

        issues = await validate_project(str(tmp_path), "ios", "nonexistent")
        warnings = [i for i in issues if i.level == IssueLevel.WARNING]
        assert any("nonexistent" in i.message for i in warnings)

    @pytest.mark.asyncio
    async def test_passes_when_lane_found(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\n  gym\nend")

        issues = await validate_project(str(tmp_path), "ios", "build")
        assert len(issues) == 0

    @pytest.mark.asyncio
    async def test_validates_root_fastfile_when_no_platform(self, tmp_path):
        fastlane_dir = tmp_path / "fastlane"
        fastlane_dir.mkdir()
        (fastlane_dir / "Fastfile").write_text("lane :shared do\nend")

        issues = await validate_project(str(tmp_path), None, "shared")
        assert len(issues) == 0
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_validators/test_project.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement project.py**

Create `src/fastlane_mcp/validators/project.py`:
```python
"""Project structure validation."""

from pathlib import Path
from fastlane_mcp.validators.types import IssueLevel, ValidationIssue


async def validate_project(
    project_path: str,
    platform: str | None,
    lane: str | None
) -> list[ValidationIssue]:
    """Validate project structure and lane existence.

    Args:
        project_path: Path to the project root
        platform: Platform (ios, android, or None for shared)
        lane: Lane name to validate (optional)

    Returns:
        List of validation issues found
    """
    issues: list[ValidationIssue] = []
    project = Path(project_path)

    # Determine fastlane directory
    if platform:
        fastlane_dir = project / platform / "fastlane"
    else:
        fastlane_dir = project / "fastlane"

    fastfile = fastlane_dir / "Fastfile"

    # Check Fastfile exists
    if not fastfile.exists():
        issues.append(ValidationIssue(
            level=IssueLevel.ERROR,
            code="NO_FASTFILE",
            message=f"Fastfile not found at {fastfile}",
            suggestion="Run 'fastlane init' to create a Fastfile"
        ))
        return issues  # Can't validate lane without Fastfile

    # Validate lane exists if specified
    if lane:
        content = fastfile.read_text()
        # Simple check for lane definition
        if f"lane :{lane}" not in content and f"private_lane :{lane}" not in content:
            issues.append(ValidationIssue(
                level=IssueLevel.WARNING,
                code="LANE_NOT_FOUND",
                message=f"Lane '{lane}' not found in Fastfile",
                suggestion=f"Available lanes can be listed with 'fastlane lanes'"
            ))

    return issues
```

**Step 4: Update validators __init__.py**

Add to exports:
```python
from fastlane_mcp.validators.project import validate_project
# Add to __all__
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_validators/test_project.py -v`
Expected: All 5 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/validators/ tests/test_validators/
git commit -m "feat: add project structure validator"
```

---

## Task 10: Create Preflight Runner

**Files:**
- Modify: `src/fastlane_mcp/validators/__init__.py`
- Create: `tests/test_validators/test_preflight.py`

**Step 1: Write failing tests**

Create `tests/test_validators/test_preflight.py`:
```python
"""Tests for preflight validation runner."""

import pytest
from unittest.mock import patch, AsyncMock
from fastlane_mcp.validators import (
    run_preflight,
    PreflightContext,
    IssueLevel,
    ValidationResult,
)


class TestRunPreflight:
    @pytest.mark.asyncio
    async def test_returns_valid_when_no_checks(self):
        ctx = PreflightContext()
        result = await run_preflight(ctx)
        assert result.valid is True
        assert result.issues == []

    @pytest.mark.asyncio
    async def test_checks_environment_vars(self):
        with patch("fastlane_mcp.validators.validate_environment") as mock:
            from fastlane_mcp.validators.types import ValidationIssue
            mock.return_value = [
                ValidationIssue(IssueLevel.ERROR, "E1", "Missing var")
            ]

            ctx = PreflightContext(required_env_vars=["TEST_VAR"])
            result = await run_preflight(ctx)

            assert result.valid is False
            mock.assert_called_once_with(["TEST_VAR"])

    @pytest.mark.asyncio
    async def test_checks_tools(self):
        with patch("fastlane_mcp.validators.validate_tools") as mock:
            mock.return_value = []

            ctx = PreflightContext(required_tools=["fastlane"])
            result = await run_preflight(ctx)

            assert result.valid is True
            mock.assert_called_once_with(["fastlane"])

    @pytest.mark.asyncio
    async def test_checks_project(self):
        with patch("fastlane_mcp.validators.validate_project") as mock:
            mock.return_value = []

            ctx = PreflightContext(
                project_path="/tmp/test",
                platform="ios",
                lane="build"
            )
            result = await run_preflight(ctx)

            assert result.valid is True
            mock.assert_called_once_with("/tmp/test", "ios", "build")

    @pytest.mark.asyncio
    async def test_invalid_when_any_errors(self):
        with patch("fastlane_mcp.validators.validate_environment") as mock_env, \
             patch("fastlane_mcp.validators.validate_tools") as mock_tools:
            from fastlane_mcp.validators.types import ValidationIssue
            mock_env.return_value = [
                ValidationIssue(IssueLevel.WARNING, "W1", "Warning only")
            ]
            mock_tools.return_value = [
                ValidationIssue(IssueLevel.ERROR, "E1", "Tool missing")
            ]

            ctx = PreflightContext(
                required_env_vars=["VAR"],
                required_tools=["tool"]
            )
            result = await run_preflight(ctx)

            assert result.valid is False
            assert len(result.issues) == 2

    @pytest.mark.asyncio
    async def test_valid_with_warnings_only(self):
        with patch("fastlane_mcp.validators.validate_environment") as mock:
            from fastlane_mcp.validators.types import ValidationIssue
            mock.return_value = [
                ValidationIssue(IssueLevel.WARNING, "W1", "Just a warning")
            ]

            ctx = PreflightContext(required_env_vars=["VAR"])
            result = await run_preflight(ctx)

            assert result.valid is True
            assert len(result.issues) == 1
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_validators/test_preflight.py -v`
Expected: FAIL with "cannot import name 'run_preflight'"

**Step 3: Implement run_preflight**

Update `src/fastlane_mcp/validators/__init__.py`:
```python
"""Validation modules."""

from fastlane_mcp.validators.types import (
    IssueLevel,
    ValidationIssue,
    ValidationResult,
    PreflightContext,
)
from fastlane_mcp.validators.environment import validate_environment
from fastlane_mcp.validators.tools import validate_tools
from fastlane_mcp.validators.project import validate_project


async def run_preflight(ctx: PreflightContext) -> ValidationResult:
    """Run all pre-flight validators.

    Args:
        ctx: Context specifying what to validate

    Returns:
        ValidationResult with combined issues
    """
    issues: list[ValidationIssue] = []

    # Check environment variables
    if ctx.required_env_vars:
        issues.extend(validate_environment(ctx.required_env_vars))

    # Check required tools
    if ctx.required_tools:
        issues.extend(await validate_tools(ctx.required_tools))

    # Check project structure
    if ctx.project_path:
        issues.extend(await validate_project(
            ctx.project_path,
            ctx.platform,
            ctx.lane
        ))

    # Valid if no errors (warnings are ok)
    has_errors = any(i.level == IssueLevel.ERROR for i in issues)

    return ValidationResult(valid=not has_errors, issues=issues)


__all__ = [
    "IssueLevel",
    "ValidationIssue",
    "ValidationResult",
    "PreflightContext",
    "validate_environment",
    "validate_tools",
    "validate_project",
    "run_preflight",
]
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_validators/test_preflight.py -v`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/fastlane_mcp/validators/ tests/test_validators/
git commit -m "feat: add preflight validation runner"
```

---

## Task 11: Create Lane Parser

**Files:**
- Create: `src/fastlane_mcp/discovery/__init__.py`
- Create: `src/fastlane_mcp/discovery/lanes.py`
- Create: `tests/test_discovery/__init__.py`
- Create: `tests/test_discovery/test_lanes.py`

**Step 1: Write failing tests**

Create `tests/test_discovery/__init__.py`:
```python
"""Tests for discovery modules."""
```

Create `tests/test_discovery/test_lanes.py`:
```python
"""Tests for lane parsing."""

import pytest
from fastlane_mcp.discovery.lanes import parse_lanes_from_fastfile, LaneInfo


class TestParseLanesFromFastfile:
    def test_parses_simple_lane(self):
        content = '''
lane :build do
  gym
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].name == "build"
        assert lanes[0].platform is None
        assert lanes[0].is_private is False

    def test_parses_lane_with_platform(self):
        content = '''
platform :ios do
  lane :build do
    gym
  end
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].name == "build"
        assert lanes[0].platform == "ios"

    def test_parses_private_lane(self):
        content = '''
private_lane :helper do
  puts "helper"
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].name == "helper"
        assert lanes[0].is_private is True

    def test_parses_underscore_prefixed_as_private(self):
        content = '''
lane :_internal do
  puts "internal"
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].is_private is True

    def test_parses_description(self):
        content = '''
desc "Build the app"
lane :build do
  gym
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].description == "Build the app"

    def test_parses_single_quoted_description(self):
        content = """
desc 'Build the app'
lane :build do
  gym
end
"""
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].description == "Build the app"

    def test_parses_multiple_lanes(self):
        content = '''
platform :ios do
  desc "Build for testing"
  lane :build do
    gym
  end

  desc "Deploy to TestFlight"
  lane :deploy do
    pilot
  end
end

platform :android do
  lane :build do
    gradle
  end
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 3

        ios_build = next(l for l in lanes if l.name == "build" and l.platform == "ios")
        assert ios_build.description == "Build for testing"

        ios_deploy = next(l for l in lanes if l.name == "deploy")
        assert ios_deploy.description == "Deploy to TestFlight"

        android_build = next(l for l in lanes if l.platform == "android")
        assert android_build.name == "build"

    def test_skips_comments(self):
        content = '''
# This is a comment
lane :build do
  gym
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1

    def test_returns_empty_for_empty_content(self):
        lanes = parse_lanes_from_fastfile("")
        assert lanes == []
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_discovery/test_lanes.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement lanes.py**

Create `src/fastlane_mcp/discovery/__init__.py`:
```python
"""Discovery modules for analyzing fastlane projects."""

from fastlane_mcp.discovery.lanes import (
    LaneInfo,
    parse_lanes_from_fastfile,
)

__all__ = ["LaneInfo", "parse_lanes_from_fastfile"]
```

Create `src/fastlane_mcp/discovery/lanes.py`:
```python
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
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_discovery/test_lanes.py -v`
Expected: All 9 tests PASS

**Step 5: Commit**

```bash
git add src/fastlane_mcp/discovery/ tests/test_discovery/
git commit -m "feat: add Fastfile lane parser"
```

---

## Task 12: Create Error Patterns

**Files:**
- Create: `src/fastlane_mcp/errors/__init__.py`
- Create: `src/fastlane_mcp/errors/patterns.py`
- Create: `tests/test_errors/__init__.py`
- Create: `tests/test_errors/test_patterns.py`

**Step 1: Write tests for error patterns**

Create `tests/test_errors/__init__.py`:
```python
"""Tests for error intelligence."""
```

Create `tests/test_errors/test_patterns.py`:
```python
"""Tests for error patterns."""

import pytest
from fastlane_mcp.errors.patterns import ERROR_PATTERNS


class TestErrorPatterns:
    def test_all_patterns_have_required_fields(self):
        for pattern in ERROR_PATTERNS:
            assert pattern.id, "Pattern must have id"
            assert pattern.pattern, "Pattern must have regex pattern"
            assert pattern.category, "Pattern must have category"
            assert pattern.message, "Pattern must have message"
            assert pattern.diagnosis, "Pattern must have diagnosis"
            assert isinstance(pattern.suggestions, list), "Suggestions must be list"
            assert len(pattern.suggestions) > 0, "Must have at least one suggestion"

    def test_signing_certificate_pattern_matches(self):
        pattern = next(p for p in ERROR_PATTERNS if p.id == "no_signing_certificate")

        test_cases = [
            "No signing certificate",
            "Code Sign error: No certificate",
            "error: No signing certificate 'iPhone Distribution'",
        ]

        for test_case in test_cases:
            assert pattern.pattern.search(test_case), f"Should match: {test_case}"

    def test_provisioning_profile_pattern_matches(self):
        pattern = next(p for p in ERROR_PATTERNS if p.id == "no_provisioning_profile")

        test_cases = [
            "No provisioning profile",
            "Provisioning profile not found",
            "couldn't find provisioning profile",
        ]

        for test_case in test_cases:
            assert pattern.pattern.search(test_case), f"Should match: {test_case}"

    def test_xcode_select_pattern_matches(self):
        pattern = next(p for p in ERROR_PATTERNS if p.id == "xcode_not_selected")

        assert pattern.pattern.search("xcode-select: error")
        assert pattern.pattern.search("no developer tools were found")
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_errors/test_patterns.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement patterns.py**

Create `src/fastlane_mcp/errors/__init__.py`:
```python
"""Error intelligence modules."""

from fastlane_mcp.errors.patterns import ERROR_PATTERNS, ErrorPattern

__all__ = ["ERROR_PATTERNS", "ErrorPattern"]
```

Create `src/fastlane_mcp/errors/patterns.py`:
```python
"""Error patterns for fastlane and build errors."""

import re
from dataclasses import dataclass


@dataclass
class ErrorPattern:
    """A recognizable error pattern with diagnosis."""
    id: str
    pattern: re.Pattern
    category: str
    message: str
    diagnosis: str
    suggestions: list[str]


ERROR_PATTERNS = [
    ErrorPattern(
        id="no_signing_certificate",
        pattern=re.compile(r"No signing certificate|Code Sign error|No certificate", re.I),
        category="signing",
        message="Code signing certificate not found",
        diagnosis="Your signing certificate is not installed in the keychain or has expired",
        suggestions=[
            "Run 'fastlane match development' to sync certificates",
            "Check Keychain Access for expired certificates",
            "Verify your Apple Developer account has valid certificates",
        ]
    ),
    ErrorPattern(
        id="no_provisioning_profile",
        pattern=re.compile(r"No provisioning profile|Provisioning profile.*not found|couldn't find provisioning profile", re.I),
        category="signing",
        message="Provisioning profile not found",
        diagnosis="The required provisioning profile is missing or expired",
        suggestions=[
            "Run 'fastlane match appstore' or 'fastlane match development'",
            "Check that the bundle ID matches your provisioning profile",
            "Verify the profile hasn't expired in the Developer Portal",
        ]
    ),
    ErrorPattern(
        id="xcode_not_selected",
        pattern=re.compile(r"xcode-select.*error|no developer tools were found", re.I),
        category="environment",
        message="Xcode developer tools not configured",
        diagnosis="Xcode command line tools are not properly installed or selected",
        suggestions=[
            "Run 'xcode-select --install' to install command line tools",
            "Run 'sudo xcode-select -s /Applications/Xcode.app' to select Xcode",
        ]
    ),
    ErrorPattern(
        id="simulator_not_found",
        pattern=re.compile(r"Unable to find a destination matching|No simulator found|destination.*not found", re.I),
        category="simulator",
        message="iOS Simulator not found",
        diagnosis="The specified simulator device or iOS version is not available",
        suggestions=[
            "Open Xcode and download the required simulator runtime",
            "Run 'xcrun simctl list devices' to see available simulators",
            "Check your destination parameter matches an available device",
        ]
    ),
    ErrorPattern(
        id="cocoapods_not_installed",
        pattern=re.compile(r"pod.*command not found|CocoaPods.*not installed", re.I),
        category="dependencies",
        message="CocoaPods not installed",
        diagnosis="CocoaPods is required but not installed",
        suggestions=[
            "Run 'gem install cocoapods'",
            "Run 'pod setup' after installation",
            "Consider using 'bundle exec pod' if using Bundler",
        ]
    ),
    ErrorPattern(
        id="pod_install_failed",
        pattern=re.compile(r"pod install.*failed|Unable to find a specification", re.I),
        category="dependencies",
        message="CocoaPods installation failed",
        diagnosis="One or more pods failed to install",
        suggestions=[
            "Run 'pod repo update' to update the spec repo",
            "Check your Podfile for typos in pod names",
            "Try removing Podfile.lock and running 'pod install' again",
        ]
    ),
    ErrorPattern(
        id="gradle_build_failed",
        pattern=re.compile(r"Gradle build failed|FAILURE: Build failed|Could not resolve", re.I),
        category="build",
        message="Gradle build failed",
        diagnosis="The Android Gradle build encountered an error",
        suggestions=[
            "Run './gradlew clean' and try again",
            "Check build.gradle for dependency conflicts",
            "Verify your Android SDK and build tools are up to date",
        ]
    ),
    ErrorPattern(
        id="android_sdk_not_found",
        pattern=re.compile(r"SDK location not found|ANDROID_HOME.*not set|ANDROID_SDK_ROOT", re.I),
        category="environment",
        message="Android SDK not found",
        diagnosis="The Android SDK is not installed or ANDROID_HOME is not set",
        suggestions=[
            "Install Android Studio which includes the SDK",
            "Set ANDROID_HOME environment variable to your SDK path",
            "Run 'sdkmanager --licenses' to accept licenses",
        ]
    ),
    ErrorPattern(
        id="keystore_not_found",
        pattern=re.compile(r"Keystore.*not found|keystore file|release-key", re.I),
        category="signing",
        message="Android keystore not found",
        diagnosis="The signing keystore file is missing or path is incorrect",
        suggestions=[
            "Verify the keystore path in your gradle.properties",
            "Create a keystore with 'keytool -genkey -v -keystore release.keystore'",
            "Check that MYAPP_RELEASE_STORE_FILE points to the correct file",
        ]
    ),
    ErrorPattern(
        id="ruby_version_mismatch",
        pattern=re.compile(r"ruby.*version.*required|Your Ruby version is", re.I),
        category="environment",
        message="Ruby version mismatch",
        diagnosis="The installed Ruby version doesn't meet requirements",
        suggestions=[
            "Install the required Ruby version with 'rbenv install X.X.X'",
            "Check .ruby-version file for the required version",
            "Run 'rbenv local X.X.X' to set the version for this project",
        ]
    ),
    ErrorPattern(
        id="bundler_not_installed",
        pattern=re.compile(r"bundler.*not found|bundle.*command not found", re.I),
        category="dependencies",
        message="Bundler not installed",
        diagnosis="Ruby Bundler is required but not installed",
        suggestions=[
            "Run 'gem install bundler'",
            "Ensure your Ruby environment is properly configured",
        ]
    ),
    ErrorPattern(
        id="timeout_error",
        pattern=re.compile(r"timed out|timeout|Operation timed out", re.I),
        category="network",
        message="Operation timed out",
        diagnosis="A network operation or build step exceeded the timeout limit",
        suggestions=[
            "Check your network connection",
            "Increase timeout settings if building large projects",
            "Try again - this may be a temporary issue",
        ]
    ),
]
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_errors/test_patterns.py -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/fastlane_mcp/errors/ tests/test_errors/
git commit -m "feat: add error pattern definitions"
```

---

## Task 13: Create Error Diagnosis

**Files:**
- Create: `src/fastlane_mcp/errors/diagnosis.py`
- Create: `tests/test_errors/test_diagnosis.py`

**Step 1: Write failing tests**

Create `tests/test_errors/test_diagnosis.py`:
```python
"""Tests for error diagnosis."""

import pytest
from fastlane_mcp.errors.diagnosis import diagnose_error


class TestDiagnoseError:
    def test_matches_known_error(self):
        error = "Error: No signing certificate found"
        result = diagnose_error(error)

        assert result["matched"] is True
        assert "certificate" in result["message"].lower()
        assert len(result["suggestions"]) > 0

    def test_returns_generic_for_unknown_error(self):
        error = "Some completely unknown error xyz123"
        result = diagnose_error(error)

        assert result["matched"] is False
        assert "original" in result

    def test_provides_suggestions_for_known_error(self):
        error = "xcode-select: error: no developer tools were found"
        result = diagnose_error(error)

        assert result["matched"] is True
        assert any("xcode-select" in s for s in result["suggestions"])

    def test_handles_empty_input(self):
        result = diagnose_error("")
        assert result["matched"] is False

    def test_handles_multiline_error(self):
        error = """
Build failed with error:
Code Sign error: No certificate
Please check your signing configuration.
"""
        result = diagnose_error(error)
        assert result["matched"] is True
        assert "certificate" in result["message"].lower()

    def test_returns_diagnosis_details(self):
        error = "Provisioning profile not found"
        result = diagnose_error(error)

        assert "message" in result
        assert "diagnosis" in result
        assert "suggestions" in result
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_errors/test_diagnosis.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement diagnosis.py**

Create `src/fastlane_mcp/errors/diagnosis.py`:
```python
"""Error diagnosis using pattern matching."""

from fastlane_mcp.errors.patterns import ERROR_PATTERNS


def diagnose_error(error_output: str) -> dict:
    """Match error output against known patterns.

    Args:
        error_output: The error text to diagnose

    Returns:
        Dictionary with diagnosis information:
        - matched: bool indicating if a pattern was found
        - message: Human-readable error message
        - diagnosis: Explanation of what went wrong
        - suggestions: List of suggested fixes
        - original: Original error (only if not matched)
    """
    for pattern in ERROR_PATTERNS:
        if pattern.pattern.search(error_output):
            return {
                "matched": True,
                "message": pattern.message,
                "diagnosis": pattern.diagnosis,
                "suggestions": pattern.suggestions,
            }

    return {
        "matched": False,
        "message": "Build or command failed",
        "diagnosis": "An unrecognized error occurred",
        "suggestions": [
            "Check the full error output below for details",
            "Search for the error message online",
        ],
        "original": error_output,
    }
```

**Step 4: Update errors __init__.py**

```python
"""Error intelligence modules."""

from fastlane_mcp.errors.patterns import ERROR_PATTERNS, ErrorPattern
from fastlane_mcp.errors.diagnosis import diagnose_error

__all__ = ["ERROR_PATTERNS", "ErrorPattern", "diagnose_error"]
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_errors/test_diagnosis.py -v`
Expected: All 6 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/errors/ tests/test_errors/
git commit -m "feat: add error diagnosis system"
```

---

## Task 14: Create Plugin Registry

**Files:**
- Create: `src/fastlane_mcp/plugins/__init__.py`
- Create: `src/fastlane_mcp/plugins/registry.py`
- Create: `tests/test_plugins/__init__.py`
- Create: `tests/test_plugins/test_registry.py`

**Step 1: Write failing tests**

Create `tests/test_plugins/__init__.py`:
```python
"""Tests for plugin modules."""
```

Create `tests/test_plugins/test_registry.py`:
```python
"""Tests for plugin registry."""

import pytest
from fastlane_mcp.plugins.registry import (
    PLUGIN_CATALOG,
    search_plugins,
    get_plugin_info,
)


class TestPluginCatalog:
    def test_catalog_has_common_plugins(self):
        assert "fastlane-plugin-firebase_app_distribution" in PLUGIN_CATALOG
        assert "fastlane-plugin-appcenter" in PLUGIN_CATALOG

    def test_plugins_have_required_fields(self):
        for name, info in PLUGIN_CATALOG.items():
            assert "description" in info, f"{name} missing description"
            assert "signals" in info, f"{name} missing signals"
            assert "capabilities" in info, f"{name} missing capabilities"


class TestSearchPlugins:
    def test_finds_plugin_by_name(self):
        results = search_plugins("firebase")
        assert len(results) >= 1
        assert any("firebase" in p.name.lower() for p in results)

    def test_finds_plugin_by_description(self):
        results = search_plugins("distribute")
        assert len(results) >= 1

    def test_returns_empty_for_no_match(self):
        results = search_plugins("xyznonexistent123")
        assert results == []

    def test_search_is_case_insensitive(self):
        results1 = search_plugins("Firebase")
        results2 = search_plugins("firebase")
        assert results1 == results2


class TestGetPluginInfo:
    def test_returns_plugin_info(self):
        info = get_plugin_info("fastlane-plugin-firebase_app_distribution")
        assert info is not None
        assert info.name == "fastlane-plugin-firebase_app_distribution"
        assert info.description

    def test_returns_none_for_unknown_plugin(self):
        info = get_plugin_info("nonexistent-plugin-xyz")
        assert info is None
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_plugins/test_registry.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement registry.py**

Create `src/fastlane_mcp/plugins/__init__.py`:
```python
"""Plugin modules."""

from fastlane_mcp.plugins.registry import (
    PLUGIN_CATALOG,
    PluginInfo,
    search_plugins,
    get_plugin_info,
)

__all__ = ["PLUGIN_CATALOG", "PluginInfo", "search_plugins", "get_plugin_info"]
```

Create `src/fastlane_mcp/plugins/registry.py`:
```python
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
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_plugins/test_registry.py -v`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/fastlane_mcp/plugins/ tests/test_plugins/
git commit -m "feat: add plugin registry and search"
```

---

## Task 15: Create Build Tool

**Files:**
- Create: `src/fastlane_mcp/tools/__init__.py`
- Create: `src/fastlane_mcp/tools/build.py`
- Modify: `src/fastlane_mcp/server.py`
- Create: `tests/test_tools/__init__.py`
- Create: `tests/test_tools/test_build.py`

**Step 1: Write failing tests for build_ios tool**

Create `tests/test_tools/__init__.py`:
```python
"""Tests for MCP tools."""
```

Create `tests/test_tools/test_build.py`:
```python
"""Tests for build tools."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastmcp.exceptions import ToolError

from fastlane_mcp.tools.build import build_ios, build_android
from fastlane_mcp.utils.executor import ExecutionResult
from fastlane_mcp.validators import ValidationResult


class TestBuildIos:
    @pytest.mark.asyncio
    async def test_successful_build(self, tmp_path):
        # Create project structure
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\n  gym\nend")

        with patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight, \
             patch("fastlane_mcp.tools.build.execute_fastlane") as mock_exec:

            mock_preflight.return_value = ValidationResult(valid=True, issues=[])
            mock_exec.return_value = ExecutionResult("Build succeeded", "", 0)

            result = await build_ios(
                project_path=str(tmp_path),
                lane="build"
            )

            assert result["success"] is True
            assert "Build succeeded" in result["output"]

    @pytest.mark.asyncio
    async def test_raises_tool_error_on_invalid_path(self):
        with pytest.raises(ToolError, match="does not exist"):
            await build_ios(
                project_path="/nonexistent/path/12345",
                lane="build"
            )

    @pytest.mark.asyncio
    async def test_raises_tool_error_on_preflight_failure(self, tmp_path):
        with patch("fastlane_mcp.tools.build.validate_project_path") as mock_validate, \
             patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight:

            mock_validate.return_value = tmp_path
            mock_preflight.return_value = ValidationResult(
                valid=False,
                issues=[MagicMock(level=MagicMock(value="error"), message="Missing tool")]
            )

            with pytest.raises(ToolError, match="Pre-flight"):
                await build_ios(
                    project_path=str(tmp_path),
                    lane="build"
                )

    @pytest.mark.asyncio
    async def test_raises_tool_error_on_build_failure(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\n  gym\nend")

        with patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight, \
             patch("fastlane_mcp.tools.build.execute_fastlane") as mock_exec:

            mock_preflight.return_value = ValidationResult(valid=True, issues=[])
            mock_exec.return_value = ExecutionResult(
                "", "No signing certificate found", 1
            )

            with pytest.raises(ToolError, match="certificate"):
                await build_ios(
                    project_path=str(tmp_path),
                    lane="build"
                )


class TestBuildAndroid:
    @pytest.mark.asyncio
    async def test_successful_build(self, tmp_path):
        android_dir = tmp_path / "android" / "fastlane"
        android_dir.mkdir(parents=True)
        (android_dir / "Fastfile").write_text("lane :build do\n  gradle\nend")

        with patch("fastlane_mcp.tools.build.run_preflight") as mock_preflight, \
             patch("fastlane_mcp.tools.build.execute_fastlane") as mock_exec:

            mock_preflight.return_value = ValidationResult(valid=True, issues=[])
            mock_exec.return_value = ExecutionResult("BUILD SUCCESSFUL", "", 0)

            result = await build_android(
                project_path=str(tmp_path),
                lane="build"
            )

            assert result["success"] is True
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_tools/test_build.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement build.py**

Create `src/fastlane_mcp/tools/__init__.py`:
```python
"""MCP tool definitions."""
```

Create `src/fastlane_mcp/tools/build.py`:
```python
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
```

**Step 4: Update server.py to import tools**

```python
"""FastMCP server entry point."""

from fastmcp import FastMCP

mcp = FastMCP(
    "Fastlane MCP Server",
    description="Intelligent assistant for iOS/Android builds with fastlane"
)

# Import tools to register them
from fastlane_mcp.tools import build  # noqa: F401, E402

if __name__ == "__main__":
    mcp.run()
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_tools/test_build.py -v`
Expected: All 5 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/ tests/test_tools/
git commit -m "feat: add build_ios and build_android MCP tools"
```

---

## Task 16: Create Analyze Tool

**Files:**
- Create: `src/fastlane_mcp/tools/analyze.py`
- Modify: `src/fastlane_mcp/server.py`
- Create: `tests/test_tools/test_analyze.py`

**Step 1: Write failing tests**

Create `tests/test_tools/test_analyze.py`:
```python
"""Tests for analyze tool."""

import pytest
from fastlane_mcp.tools.analyze import analyze_project


class TestAnalyzeProject:
    @pytest.mark.asyncio
    async def test_detects_ios_platform(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text("lane :build do\nend")

        result = await analyze_project(str(tmp_path))

        assert "ios" in result["platforms"]

    @pytest.mark.asyncio
    async def test_detects_android_platform(self, tmp_path):
        android_dir = tmp_path / "android" / "fastlane"
        android_dir.mkdir(parents=True)
        (android_dir / "Fastfile").write_text("lane :build do\nend")

        result = await analyze_project(str(tmp_path))

        assert "android" in result["platforms"]

    @pytest.mark.asyncio
    async def test_lists_lanes(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
desc "Build the app"
lane :build do
  gym
end

lane :test do
  scan
end
''')

        result = await analyze_project(str(tmp_path))

        lane_names = [l["name"] for l in result["lanes"]]
        assert "build" in lane_names
        assert "test" in lane_names

    @pytest.mark.asyncio
    async def test_returns_empty_for_non_fastlane_project(self, tmp_path):
        result = await analyze_project(str(tmp_path))

        assert result["platforms"] == []
        assert result["lanes"] == []
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_tools/test_analyze.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement analyze.py**

Create `src/fastlane_mcp/tools/analyze.py`:
```python
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
```

**Step 4: Update server.py to import analyze**

Add to imports:
```python
from fastlane_mcp.tools import build, analyze  # noqa: F401, E402
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_tools/test_analyze.py -v`
Expected: All 4 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/tools/ tests/test_tools/
git commit -m "feat: add analyze_project MCP tool"
```

---

## Task 17: Create Plugin Tools

**Files:**
- Create: `src/fastlane_mcp/tools/plugins.py`
- Modify: `src/fastlane_mcp/server.py`
- Create: `tests/test_tools/test_plugins.py`

**Step 1: Write failing tests**

Create `tests/test_tools/test_plugins.py`:
```python
"""Tests for plugin tools."""

import pytest
from fastlane_mcp.tools.plugins import search_fastlane_plugins, get_plugin_details


class TestSearchPlugins:
    @pytest.mark.asyncio
    async def test_finds_plugins_by_query(self):
        result = await search_fastlane_plugins("firebase")

        assert len(result["plugins"]) >= 1
        assert any("firebase" in p["name"].lower() for p in result["plugins"])

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_match(self):
        result = await search_fastlane_plugins("xyznonexistent123")

        assert result["plugins"] == []


class TestGetPluginDetails:
    @pytest.mark.asyncio
    async def test_returns_plugin_info(self):
        result = await get_plugin_details("fastlane-plugin-firebase_app_distribution")

        assert result["found"] is True
        assert "description" in result
        assert "capabilities" in result

    @pytest.mark.asyncio
    async def test_returns_not_found_for_unknown(self):
        result = await get_plugin_details("nonexistent-plugin-xyz")

        assert result["found"] is False
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_tools/test_plugins.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement plugins.py**

Create `src/fastlane_mcp/tools/plugins.py`:
```python
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
```

**Step 4: Update server.py to import plugins**

Add to imports:
```python
from fastlane_mcp.tools import build, analyze, plugins  # noqa: F401, E402
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_tools/test_plugins.py -v`
Expected: All 4 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/tools/ tests/test_tools/
git commit -m "feat: add plugin search and info MCP tools"
```

---

## Task 18: Create List Lanes Tool

**Files:**
- Create: `src/fastlane_mcp/tools/lanes.py`
- Modify: `src/fastlane_mcp/server.py`
- Create: `tests/test_tools/test_lanes.py`

**Step 1: Write failing tests**

Create `tests/test_tools/test_lanes.py`:
```python
"""Tests for lanes tool."""

import pytest
from fastmcp.exceptions import ToolError
from fastlane_mcp.tools.lanes import list_lanes


class TestListLanes:
    @pytest.mark.asyncio
    async def test_lists_ios_lanes(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
desc "Build for testing"
lane :build do
  gym
end

desc "Deploy to TestFlight"
lane :deploy do
  pilot
end
''')

        result = await list_lanes(str(tmp_path), "ios")

        assert len(result["lanes"]) == 2
        names = [l["name"] for l in result["lanes"]]
        assert "build" in names
        assert "deploy" in names

    @pytest.mark.asyncio
    async def test_filters_private_lanes_by_default(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
lane :public_lane do
end

private_lane :helper do
end
''')

        result = await list_lanes(str(tmp_path), "ios")

        names = [l["name"] for l in result["lanes"]]
        assert "public_lane" in names
        assert "helper" not in names

    @pytest.mark.asyncio
    async def test_includes_private_when_requested(self, tmp_path):
        ios_dir = tmp_path / "ios" / "fastlane"
        ios_dir.mkdir(parents=True)
        (ios_dir / "Fastfile").write_text('''
lane :public_lane do
end

private_lane :helper do
end
''')

        result = await list_lanes(str(tmp_path), "ios", include_private=True)

        names = [l["name"] for l in result["lanes"]]
        assert "public_lane" in names
        assert "helper" in names

    @pytest.mark.asyncio
    async def test_raises_error_for_missing_fastfile(self, tmp_path):
        ios_dir = tmp_path / "ios"
        ios_dir.mkdir()

        with pytest.raises(ToolError, match="Fastfile not found"):
            await list_lanes(str(tmp_path), "ios")
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_tools/test_lanes.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Implement lanes.py**

Create `src/fastlane_mcp/tools/lanes.py`:
```python
"""Lane listing tool."""

from pathlib import Path
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
```

**Step 4: Update server.py to import lanes**

Add to imports:
```python
from fastlane_mcp.tools import build, analyze, plugins, lanes  # noqa: F401, E402
```

**Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_tools/test_lanes.py -v`
Expected: All 4 tests PASS

**Step 6: Commit**

```bash
git add src/fastlane_mcp/tools/ tests/test_tools/
git commit -m "feat: add list_lanes MCP tool"
```

---

## Task 19: Create Test Configuration

**Files:**
- Create: `tests/conftest.py`

**Step 1: Create conftest.py with fixtures**

Create `tests/conftest.py`:
```python
"""Shared test fixtures."""

import pytest
from pathlib import Path


@pytest.fixture
def sample_fastfile():
    """Return a sample Fastfile content."""
    return '''
platform :ios do
  desc "Build the app"
  lane :build do
    gym
  end

  desc "Deploy to TestFlight"
  lane :deploy do
    pilot
  end

  private_lane :_helper do
    puts "helper"
  end
end

platform :android do
  desc "Build Android app"
  lane :build do
    gradle(task: "assembleRelease")
  end
end
'''


@pytest.fixture
def ios_project(tmp_path):
    """Create a minimal iOS fastlane project structure."""
    ios_dir = tmp_path / "ios" / "fastlane"
    ios_dir.mkdir(parents=True)

    fastfile = ios_dir / "Fastfile"
    fastfile.write_text('''
desc "Build for development"
lane :build do
  gym(scheme: "MyApp")
end

desc "Run tests"
lane :test do
  scan
end
''')

    return tmp_path


@pytest.fixture
def android_project(tmp_path):
    """Create a minimal Android fastlane project structure."""
    android_dir = tmp_path / "android" / "fastlane"
    android_dir.mkdir(parents=True)

    fastfile = android_dir / "Fastfile"
    fastfile.write_text('''
desc "Build debug APK"
lane :build do
  gradle(task: "assembleDebug")
end
''')

    return tmp_path


@pytest.fixture
def cross_platform_project(tmp_path):
    """Create a project with both iOS and Android."""
    # iOS
    ios_dir = tmp_path / "ios" / "fastlane"
    ios_dir.mkdir(parents=True)
    (ios_dir / "Fastfile").write_text('''
lane :build do
  gym
end
''')

    # Android
    android_dir = tmp_path / "android" / "fastlane"
    android_dir.mkdir(parents=True)
    (android_dir / "Fastfile").write_text('''
lane :build do
  gradle
end
''')

    return tmp_path
```

**Step 2: Run all tests**

Run: `uv run pytest -v`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/conftest.py
git commit -m "test: add shared test fixtures"
```

---

## Task 20: Run Full Test Suite and Verify

**Step 1: Run full test suite**

Run: `uv run pytest -v --tb=short`
Expected: All tests PASS

**Step 2: Verify server starts**

Run: `uv run python -c "from fastlane_mcp.server import mcp; print(f'Tools: {len(mcp._tool_manager._tools)}')" `
Expected: Shows number of registered tools

**Step 3: Commit final state**

```bash
git add -A
git commit -m "feat: complete FastMCP 3.0 migration - all tools and tests"
```

---

## Task 21: Clean Up TypeScript Code

**Step 1: Create backup branch**

```bash
git checkout -b backup/typescript-version
git checkout -
```

**Step 2: Remove TypeScript files**

```bash
rm -rf src/*.ts src/**/*.ts
rm -rf tests/*.test.ts tests/**/*.test.ts
rm -f tsconfig.json
rm -f package.json package-lock.json
rm -rf node_modules
rm -rf dist
```

**Step 3: Update README.md**

Update the README to reflect Python/FastMCP instead of TypeScript.

**Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove TypeScript code after Python migration"
```

---

**End of Implementation Plan**
