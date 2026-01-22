"""CLI entry point with version support."""

import argparse
import sys

from fastlane_mcp import __version__


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="fastlane-mcp",
        description="Intelligent MCP server for iOS/Android builds with fastlane"
    )
    parser.add_argument(
        "-v", "--version",
        action="version",
        version=f"fastlane-mcp {__version__}"
    )

    # Parse known args only - let FastMCP handle the rest
    args, remaining = parser.parse_known_args()

    # Import and run the MCP server
    from fastlane_mcp.server import mcp
    sys.argv = [sys.argv[0]] + remaining  # Pass remaining args to FastMCP
    mcp.run()


if __name__ == "__main__":
    main()
