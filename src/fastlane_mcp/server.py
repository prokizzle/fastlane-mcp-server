"""FastMCP server entry point."""

from fastmcp import FastMCP

mcp = FastMCP(
    "Fastlane MCP Server",
    instructions="Intelligent assistant for iOS/Android builds with fastlane"
)

# Import tools to register them
from fastlane_mcp.tools import build, analyze, plugins  # noqa: F401, E402

if __name__ == "__main__":
    mcp.run()
