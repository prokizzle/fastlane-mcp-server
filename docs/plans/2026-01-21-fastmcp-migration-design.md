# FastMCP 3.0 Migration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the fastlane-mcp-server from TypeScript to Python using FastMCP 3.0 framework.

**Architecture:** Full replacement - delete TypeScript after migration complete. Migrate all features from Phases 1-5.

**Tech Stack:** Python 3.11+, FastMCP 3.0 (beta), uv package manager, pytest for testing.

---

## Verified FastMCP 3.0 API

Based on research from official docs (gofastmcp.com):

| Aspect | Details |
|--------|---------|
| Installation | `uv add fastmcp --prerelease=allow` |
| Python Version | 3.11+ (3.12+ confirmed working) |
| Tool Decorator | `@mcp.tool` with params: name, description, tags, timeout, annotations |
| Async Support | Both sync/async; sync auto-runs in threadpool |
| Error Handling | `raise ToolError("message")` for user-facing errors |
| Context/Logging | `ctx: Context = CurrentContext()` then `await ctx.info()` |
| Return Types | str, dict, Pydantic models, or ToolResult |

---

## Project Structure

```
fastlane-mcp-server/
├── pyproject.toml
├── README.md
├── src/
│   └── fastlane_mcp/
│       ├── __init__.py
│       ├── server.py           # FastMCP server entry point
│       │
│       ├── tools/              # MCP tool definitions
│       │   ├── __init__.py
│       │   ├── build.py        # build_ios, build_android
│       │   ├── deploy.py       # deploy_firebase, deploy_appcenter
│       │   ├── analyze.py      # analyze_project
│       │   ├── plugins.py      # research_plugins, search_plugins
│       │   ├── lanes.py        # list_lanes
│       │   └── metadata.py     # update_metadata
│       │
│       ├── discovery/          # Project analysis
│       │   ├── __init__.py
│       │   ├── lanes.py
│       │   ├── capabilities.py
│       │   └── signals.py
│       │
│       ├── plugins/            # Plugin advisor
│       │   ├── __init__.py
│       │   └── registry.py
│       │
│       ├── validators/         # Pre-flight checks
│       │   ├── __init__.py
│       │   ├── environment.py
│       │   ├── project.py
│       │   └── tools.py
│       │
│       ├── errors/             # Error intelligence
│       │   ├── __init__.py
│       │   ├── patterns.py
│       │   └── diagnosis.py
│       │
│       └── utils/              # Shared utilities
│           ├── __init__.py
│           ├── executor.py
│           ├── sanitize.py
│           └── logger.py
│
└── tests/
    ├── conftest.py
    ├── test_tools/
    ├── test_discovery/
    ├── test_plugins/
    ├── test_validators/
    └── test_errors/
```

---

## Server Entry Point

```python
# src/fastlane_mcp/server.py
from fastmcp import FastMCP

mcp = FastMCP(
    "Fastlane MCP Server",
    description="Intelligent assistant for iOS/Android builds with fastlane"
)

# Import tools to register them
from fastlane_mcp.tools import build, deploy, analyze, plugins, lanes, metadata

if __name__ == "__main__":
    mcp.run()
```

---

## Tool Pattern

```python
# src/fastlane_mcp/tools/build.py
from fastmcp.exceptions import ToolError
from fastmcp.server.context import Context
from fastmcp.dependencies import CurrentContext

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
    ctx: Context = CurrentContext()
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
    await ctx.info(f"Building iOS app at {project_path}")

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
        raise ToolError(f"Pre-flight failed:\n{preflight.format_issues()}")

    # Execute build
    result = await execute_fastlane(lane, "ios", validated_path)

    if result.exit_code != 0:
        diagnosis = diagnose_error(result.stderr)
        raise ToolError(
            f"{diagnosis['message']}\n\n"
            f"Diagnosis: {diagnosis['diagnosis']}\n\n"
            f"Suggestions:\n" + "\n".join(f"  - {s}" for s in diagnosis['suggestions'])
        )

    await ctx.info("Build completed successfully")
    return {"success": True, "output": result.stdout}


@mcp.tool
async def build_android(
    project_path: str,
    lane: str = "build",
    environment: str | None = None,
    clean: bool = False,
    ctx: Context = CurrentContext()
) -> dict:
    """Build an Android app using fastlane."""
    # Similar pattern to build_ios
    ...
```

---

## Core Utilities

### Executor

```python
# src/fastlane_mcp/utils/executor.py
import asyncio
import os
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ExecutionResult:
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
    """Execute a shell command asynchronously."""
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
        return ExecutionResult("", f"Command timed out after {timeout}s", 124)


async def execute_fastlane(
    lane: str,
    platform: str,
    project_path: Path,
    env_vars: dict[str, str] | None = None
) -> ExecutionResult:
    """Execute a fastlane lane."""
    from fastlane_mcp.utils.sanitize import sanitize_lane_name

    safe_lane = sanitize_lane_name(lane)
    platform_dir = project_path / platform

    return await execute_command(
        "fastlane",
        [safe_lane],
        cwd=platform_dir,
        env=env_vars
    )
```

### Sanitize

```python
# src/fastlane_mcp/utils/sanitize.py
import re
from pathlib import Path

class ValidationError(Exception):
    """Raised when input validation fails."""
    pass

SAFE_LANE_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]*$')
DANGEROUS_CHARS = re.compile(r'[;&|`$(){}[\]<>!#*?~]')

def sanitize_lane_name(lane: str) -> str:
    """Validate and sanitize a fastlane lane name."""
    if not lane or not isinstance(lane, str):
        raise ValidationError("Lane name must be a non-empty string")

    trimmed = lane.strip()

    if DANGEROUS_CHARS.search(trimmed):
        raise ValidationError(f"Lane name contains invalid characters: {trimmed}")

    if not SAFE_LANE_PATTERN.match(trimmed):
        raise ValidationError(f"Invalid lane name format: {trimmed}")

    return trimmed


async def validate_project_path(path: str) -> Path:
    """Validate project path exists and is a directory."""
    if not path or not isinstance(path, str):
        raise ValidationError("Path must be a non-empty string")

    p = Path(path).resolve()

    # Check for path traversal
    if ".." in path:
        original_parts = path.split("/")
        if ".." in original_parts:
            raise ValidationError(f"Path contains suspicious traversal: {path}")

    if not p.exists():
        raise ValidationError(f"Path does not exist: {path}")

    if not p.is_dir():
        raise ValidationError(f"Path is not a directory: {path}")

    return p
```

---

## Validators

```python
# src/fastlane_mcp/validators/__init__.py
from dataclasses import dataclass, field
from enum import Enum

class IssueLevel(Enum):
    ERROR = "error"
    WARNING = "warning"

@dataclass
class ValidationIssue:
    level: IssueLevel
    code: str
    message: str
    suggestion: str | None = None

@dataclass
class ValidationResult:
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    def format_issues(self) -> str:
        lines = []
        for issue in self.issues:
            icon = "X" if issue.level == IssueLevel.ERROR else "!"
            lines.append(f"[{icon}] {issue.message}")
            if issue.suggestion:
                lines.append(f"    -> {issue.suggestion}")
        return "\n".join(lines)

@dataclass
class PreflightContext:
    project_path: str | None = None
    platform: str | None = None
    lane: str | None = None
    required_env_vars: list[str] = field(default_factory=list)
    required_tools: list[str] = field(default_factory=list)

async def run_preflight(ctx: PreflightContext) -> ValidationResult:
    """Run all pre-flight validators."""
    from fastlane_mcp.validators.environment import validate_environment
    from fastlane_mcp.validators.project import validate_project
    from fastlane_mcp.validators.tools import validate_tools

    issues: list[ValidationIssue] = []

    if ctx.required_env_vars:
        issues.extend(validate_environment(ctx.required_env_vars))

    if ctx.project_path:
        issues.extend(await validate_project(ctx.project_path, ctx.platform, ctx.lane))

    if ctx.required_tools:
        issues.extend(await validate_tools(ctx.required_tools))

    has_errors = any(i.level == IssueLevel.ERROR for i in issues)
    return ValidationResult(valid=not has_errors, issues=issues)
```

---

## Discovery Module

```python
# src/fastlane_mcp/discovery/lanes.py
import re
from dataclasses import dataclass

@dataclass
class LaneInfo:
    name: str
    platform: str | None
    description: str | None
    is_private: bool

def parse_lanes_from_fastfile(content: str) -> list[LaneInfo]:
    """Parse lanes from Fastfile content."""
    lanes = []
    current_platform = None
    last_description = None

    for line in content.split('\n'):
        trimmed = line.strip()
        if not trimmed or trimmed.startswith('#'):
            continue

        # Platform blocks
        if match := re.match(r'^platform\s+:(\w+)\s+do\s*$', trimmed):
            platform = match.group(1)
            if platform in ('ios', 'android'):
                current_platform = platform
            continue

        # Descriptions
        if match := re.match(r'^desc\s+(?:"([^"]+)"|\'([^\']+)\')\s*$', trimmed):
            last_description = match.group(1) or match.group(2)
            continue

        # Lane definitions
        if match := re.match(r'^(private_lane|lane)\s+:(\w+)\s+do', trimmed):
            lane_type, name = match.groups()
            lanes.append(LaneInfo(
                name=name,
                platform=current_platform,
                description=last_description,
                is_private=(lane_type == 'private_lane' or name.startswith('_'))
            ))
            last_description = None

    return lanes
```

---

## Error Intelligence

```python
# src/fastlane_mcp/errors/patterns.py
import re
from dataclasses import dataclass

@dataclass
class ErrorPattern:
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
    # ... more patterns from TypeScript version
]

# src/fastlane_mcp/errors/diagnosis.py
from fastlane_mcp.errors.patterns import ERROR_PATTERNS

def diagnose_error(error_output: str) -> dict:
    """Match error output against known patterns."""
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

---

## Plugin Registry

```python
# src/fastlane_mcp/plugins/registry.py
from dataclasses import dataclass

@dataclass
class PluginInfo:
    name: str
    description: str
    source: str  # 'rubygems', 'local', 'git'
    homepage: str | None = None

PLUGIN_CATALOG = {
    "fastlane-plugin-firebase_app_distribution": {
        "description": "Distribute builds via Firebase App Distribution",
        "signals": ["firebase", "crashlytics"],
        "capabilities": ["firebase_app_distribution"],
        "homepage": "https://github.com/fastlane/fastlane-plugin-firebase_app_distribution",
    },
    "fastlane-plugin-appcenter": {
        "description": "Distribute builds via Microsoft AppCenter",
        "signals": ["appcenter"],
        "capabilities": ["appcenter"],
        "homepage": "https://github.com/microsoft/fastlane-plugin-appcenter",
    },
    # ... 15+ plugins
}

def get_plugin_recommendations(signals: list, capabilities) -> list[dict]:
    """Match project signals/capabilities to recommended plugins."""
    # Same logic as TypeScript version
    ...

def search_plugins(query: str) -> list[PluginInfo]:
    """Search plugins by name or description."""
    ...
```

---

## Testing

```python
# tests/conftest.py
import pytest
from pathlib import Path
import tempfile

@pytest.fixture
def temp_project():
    """Create a temporary project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project = Path(tmpdir)
        (project / "ios" / "fastlane").mkdir(parents=True)
        (project / "android" / "fastlane").mkdir(parents=True)
        yield project

@pytest.fixture
def sample_fastfile():
    return '''
platform :ios do
  desc "Build the app"
  lane :build do
    gym
  end
end
'''

# tests/test_discovery/test_lanes.py
from fastlane_mcp.discovery.lanes import parse_lanes_from_fastfile

def test_parse_lanes_extracts_platform(sample_fastfile):
    lanes = parse_lanes_from_fastfile(sample_fastfile)
    assert len(lanes) == 1
    assert lanes[0].name == "build"
    assert lanes[0].platform == "ios"

@pytest.mark.asyncio
async def test_execute_command_timeout():
    from fastlane_mcp.utils.executor import execute_command
    result = await execute_command("sleep", ["10"], timeout=1)
    assert result.exit_code == 124
```

---

## Running the Server

```bash
# Install dependencies
uv add fastmcp --prerelease=allow

# Run with stdio transport (for MCP clients)
uv run python -m fastlane_mcp.server

# Run with HTTP transport (for testing)
uv run fastmcp run src/fastlane_mcp/server.py:mcp --transport http --port 8000

# Run tests
uv run pytest
```

---

## Migration Phases

1. **Phase 1:** Project setup (pyproject.toml, uv, directory structure)
2. **Phase 2:** Core utilities (executor, sanitize, logger)
3. **Phase 3:** Validators (environment, project, tools, preflight)
4. **Phase 4:** Discovery (lanes, capabilities, signals)
5. **Phase 5:** Error intelligence (patterns, diagnosis)
6. **Phase 6:** Plugin system (registry, recommendations)
7. **Phase 7:** MCP tools (build, deploy, analyze, plugins, lanes)
8. **Phase 8:** Tests with pytest
9. **Phase 9:** Remove TypeScript code, update README

---

**End of Migration Design**
