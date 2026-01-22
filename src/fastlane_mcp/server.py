"""FastMCP server entry point."""

from fastmcp import FastMCP

mcp = FastMCP(
    "Fastlane MCP Server",
    instructions="Intelligent assistant for iOS/Android builds with fastlane"
)

if __name__ == "__main__":
    mcp.run()
