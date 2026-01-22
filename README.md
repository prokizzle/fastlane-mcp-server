# Fastlane MCP Server

A FastMCP server that provides integration with Fastlane for building, testing, and deploying iOS and Android applications.

## Features

- **Build Management**: Build iOS and Android apps with different configurations
- **AppCenter Deployment**: Deploy apps directly to AppCenter for distribution
- **Firebase Integration**: Support for Firebase App Distribution
- **Testing**: Run automated tests on various devices and simulators
- **Certificate Management**: Handle iOS code signing certificates and provisioning profiles
- **Version Management**: Bump version numbers and build numbers
- **Metadata Management**: Upload app store metadata and screenshots
- **Lane Discovery**: List available Fastlane lanes in your project

## Prerequisites

- Python 3.11+
- Fastlane installed and configured for your projects
- For iOS: Xcode and valid Apple Developer account
- For Android: Android SDK and Java
- Firebase CLI (for Firebase features)
- AppCenter CLI (for AppCenter deployment)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd fastlane-mcp-server

# Install dependencies with uv
uv sync
```

## Running the Server

```bash
# Run the server
uv run python -m fastlane_mcp.server

# Or use fastmcp directly
uv run fastmcp run src/fastlane_mcp/server.py
```

## Development

```bash
# Install dev dependencies
uv sync --group dev

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest -v
```

## MCP Client Configuration

### Claude Desktop

Edit the configuration file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fastlane": {
      "command": "uv",
      "args": ["run", "python", "-m", "fastlane_mcp.server"],
      "cwd": "/path/to/fastlane-mcp-server",
      "env": {
        "FASTLANE_USER": "your-apple-id@example.com",
        "FASTLANE_PASSWORD": "your-app-specific-password",
        "APPCENTER_API_TOKEN": "your-appcenter-token",
        "FIREBASE_TOKEN": "your-firebase-token"
      }
    }
  }
}
```

### Cursor

For Cursor editor, add to your settings:

```json
{
  "mcp": {
    "servers": {
      "fastlane": {
        "command": "uv",
        "args": ["run", "python", "-m", "fastlane_mcp.server"],
        "cwd": "/path/to/fastlane-mcp-server",
        "env": {
          "FASTLANE_USER": "your-apple-id@example.com",
          "APPCENTER_API_TOKEN": "your-appcenter-token"
        }
      }
    }
  }
}
```

## Available Tools

### 1. fastlane_build
Build iOS or Android applications.

**Parameters:**
- `platform`: "ios" or "android"
- `project_path`: Path to your project directory
- `lane`: (optional) Specific Fastlane lane to run
- `configuration`: (optional) Build configuration

### 2. fastlane_test
Run automated tests on your applications.

**Parameters:**
- `platform`: "ios" or "android"
- `project_path`: Path to your project directory
- `scheme`: (optional) Test scheme to run

### 3. fastlane_deploy
Deploy built applications.

**Parameters:**
- `platform`: "ios" or "android"
- `project_path`: Path to your project directory
- `destination`: Deployment destination (appcenter, firebase, testflight)

### 4. fastlane_list_lanes
Discover available Fastlane lanes in your project.

**Parameters:**
- `project_path`: Path to your project directory
- `platform`: (optional) Filter by platform

### 5. fastlane_match
Handle iOS code signing with match.

**Parameters:**
- `project_path`: Path to your project directory
- `type`: Match type (development, appstore, adhoc)

### 6. fastlane_version
Manage app versions and build numbers.

**Parameters:**
- `platform`: "ios" or "android"
- `project_path`: Path to your project directory
- `action`: "get", "bump", or "set"
- `version`: (optional) Version to set

## Project Structure

```
src/fastlane_mcp/
├── __init__.py           # Package initialization
├── server.py             # FastMCP server entry point
├── tools/                # MCP tool implementations
│   ├── __init__.py
│   ├── build.py
│   ├── deploy.py
│   ├── lanes.py
│   ├── match.py
│   ├── test.py
│   └── version.py
├── discovery/            # Lane discovery utilities
├── validators/           # Input validation
├── errors/               # Error handling and diagnosis
├── utils/                # Utility functions
└── plugins/              # Plugin system
```

## Configuration

The server supports configuration through environment variables:

- `FASTLANE_USER`: Apple ID for iOS builds
- `FASTLANE_PASSWORD`: App-specific password
- `APPCENTER_API_TOKEN`: AppCenter API token
- `FIREBASE_TOKEN`: Firebase CI token
- `MATCH_PASSWORD`: Password for match certificates

## Troubleshooting

### Common Issues

1. **Fastlane not found**: Ensure Fastlane is installed
   ```bash
   gem install fastlane
   ```

2. **Certificate issues on iOS**: Configure Match for certificate management

3. **Firebase authentication**: Log in to Firebase CLI
   ```bash
   firebase login
   ```

4. **AppCenter authentication**: Set the `APPCENTER_API_TOKEN` environment variable

## Security Notes

- Store sensitive credentials in environment variables
- Never commit API tokens or passwords to version control
- Use app-specific passwords for Apple ID authentication
- Consider using Fastlane Match for iOS certificate management

## License

MIT
