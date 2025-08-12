# Fastlane MCP Server

An MCP (Model Context Protocol) server that provides integration with Fastlane for building, testing, and deploying iOS and Android applications with Firebase and AppCenter support.

## Features

- **Build Management**: Build iOS and Android apps with different configurations
- **AppCenter Deployment**: Deploy apps directly to AppCenter for distribution
- **Firebase Integration**: Support for Firebase App Distribution and Crashlytics
- **Testing**: Run automated tests on various devices and simulators
- **Certificate Management**: Handle iOS code signing certificates and provisioning profiles
- **Version Management**: Bump version numbers and build numbers
- **Metadata Management**: Upload app store metadata and screenshots
- **Lane Discovery**: List available Fastlane lanes in your project

## Prerequisites

- Node.js 18+
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

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Configuration

### MCP Client Configuration

The Fastlane MCP server can be configured in various AI-powered code editors and tools that support the Model Context Protocol.

#### Claude Desktop

Edit the configuration file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fastlane": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/dev/MCP/fastlane-mcp-server/dist/index.js"],
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

#### Cursor

For Cursor editor, add to your settings at `~/Library/Application Support/Cursor/User/settings.json`:

```json
{
  "mcp": {
    "servers": {
      "fastlane": {
        "command": "node",
        "args": ["/Users/YOUR_USERNAME/dev/MCP/fastlane-mcp-server/dist/index.js"],
        "env": {
          "FASTLANE_USER": "your-apple-id@example.com",
          "FASTLANE_PASSWORD": "your-app-specific-password",
          "APPCENTER_API_TOKEN": "your-appcenter-token"
        }
      }
    }
  }
}
```

#### Windsurf

For Windsurf editor, configure in your global settings at `~/.windsurf/settings.json` or workspace settings:

```json
{
  "mcp.servers": [
    {
      "name": "fastlane",
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/dev/MCP/fastlane-mcp-server/dist/index.js"],
      "environment": {
        "FASTLANE_USER": "your-apple-id@example.com",
        "FASTLANE_PASSWORD": "your-app-specific-password",
        "APPCENTER_API_TOKEN": "your-appcenter-token"
      }
    }
  ]
}
```

#### VS Code with Continue

For VS Code with Continue extension, update `settings.json`:

```json
{
  "continue.mcp": {
    "servers": [
      {
        "name": "fastlane",
        "command": "node",
        "args": ["/Users/YOUR_USERNAME/dev/MCP/fastlane-mcp-server/dist/index.js"],
        "env": {
          "FASTLANE_USER": "your-apple-id@example.com",
          "APPCENTER_API_TOKEN": "your-appcenter-token"
        }
      }
    ]
  }
}
```

#### Using npx (Alternative Installation)

You can also run the server directly with npx without cloning:

```json
{
  "mcpServers": {
    "fastlane": {
      "command": "npx",
      "args": ["fastlane-mcp-server"],
      "env": {
        "FASTLANE_USER": "your-apple-id@example.com",
        "FASTLANE_PASSWORD": "your-app-specific-password"
      }
    }
  }
}
```

### Quick Setup Commands

```bash
# For Claude Desktop (macOS)
open -a "TextEdit" ~/Library/Application\ Support/Claude/claude_desktop_config.json

# For Cursor (macOS)
open -a "TextEdit" ~/Library/Application\ Support/Cursor/User/settings.json

# For Windsurf
open -a "TextEdit" ~/.windsurf/settings.json

# Or use any text editor
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Project Structure

Your mobile project should have the following structure:

```
your-project/
├── ios/
│   └── fastlane/
│       ├── Fastfile
│       └── Appfile
├── android/
│   └── fastlane/
│       ├── Fastfile
│       └── Appfile
└── firebase.json (optional)
```

## Available Tools

### 1. Build
Build iOS or Android applications.

**Parameters:**
- `platform`: "ios" or "android"
- `projectPath`: Path to your project directory
- `lane`: (optional) Specific Fastlane lane to run
- `environment`: (optional) "development", "staging", or "production"
- `clean`: (optional) Clean build directories before building

### 2. Deploy to AppCenter
Deploy built applications to AppCenter.

**Parameters:**
- `platform`: "ios" or "android"
- `projectPath`: Path to your project directory
- `appName`: (optional) AppCenter app name
- `group`: (optional) Distribution group
- `notes`: (optional) Release notes

### 3. Firebase Integration
Manage Firebase deployments and distributions.

**Parameters:**
- `action`: "deploy", "distribute", or "crashlytics"
- `platform`: "ios" or "android"
- `projectPath`: Path to your project directory
- `appId`: (optional) Firebase App ID
- `groups`: (optional) Distribution groups
- `releaseNotes`: (optional) Release notes

### 4. Test
Run automated tests on your applications.

**Parameters:**
- `platform`: "ios" or "android"
- `projectPath`: Path to your project directory
- `device`: (optional) Specific device/simulator
- `testPlan`: (optional) Test plan to run

### 5. Manage Certificates
Handle code signing certificates (primarily for iOS).

**Parameters:**
- `platform`: "ios" or "android"
- `action`: "sync", "create", "renew", or "revoke"
- `projectPath`: Path to your project directory
- `type`: (optional) Certificate type

### 6. List Lanes
Discover available Fastlane lanes in your project.

**Parameters:**
- `projectPath`: Path to your project directory
- `platform`: (optional) Filter by platform

### 7. Version Management
Manage app versions and build numbers.

**Parameters:**
- `platform`: "ios" or "android"
- `projectPath`: Path to your project directory
- `action`: "bump", "set", or "get"
- `versionType`: (optional) "major", "minor", "patch", or "build"
- `version`: (optional) Specific version to set

### 8. Metadata Management
Upload app store metadata and screenshots.

**Parameters:**
- `platform`: "ios" or "android"
- `projectPath`: Path to your project directory
- `action`: "deliver", "supply", or "snapshot"
- `skipScreenshots`: (optional) Skip screenshot upload
- `skipMetadata`: (optional) Skip metadata upload

## Example Fastfile Configuration

### iOS Fastfile
```ruby
default_platform(:ios)

platform :ios do
  desc "Build the iOS app"
  lane :build do
    gym(
      scheme: "YourApp",
      export_method: "ad-hoc"
    )
  end

  desc "Deploy to AppCenter"
  lane :appcenter do
    build
    appcenter_upload(
      api_token: ENV["APPCENTER_API_TOKEN"],
      owner_name: "your-organization",
      app_name: ENV["APPCENTER_APP_NAME"] || "YourApp-iOS",
      release_notes: ENV["APPCENTER_DISTRIBUTE_RELEASE_NOTES"] || "New build"
    )
  end

  desc "Deploy to Firebase App Distribution"
  lane :firebase_distribute do
    build
    firebase_app_distribution(
      app: ENV["FIREBASE_APP_ID"],
      groups: ENV["FIREBASE_GROUPS"] || "testers",
      release_notes: ENV["FIREBASE_RELEASE_NOTES"] || "New build"
    )
  end

  desc "Run tests"
  lane :test do
    scan(
      scheme: "YourApp",
      device: ENV["TEST_DEVICE"] || "iPhone 14"
    )
  end
end
```

### Android Fastfile
```ruby
default_platform(:android)

platform :android do
  desc "Build the Android app"
  lane :build do
    gradle(
      task: "assemble",
      build_type: "Release"
    )
  end

  desc "Deploy to AppCenter"
  lane :appcenter do
    build
    appcenter_upload(
      api_token: ENV["APPCENTER_API_TOKEN"],
      owner_name: "your-organization",
      app_name: ENV["APPCENTER_APP_NAME"] || "YourApp-Android",
      file: "./app/build/outputs/apk/release/app-release.apk"
    )
  end

  desc "Deploy to Firebase App Distribution"
  lane :firebase_distribute do
    build
    firebase_app_distribution(
      app: ENV["FIREBASE_APP_ID"],
      groups: ENV["FIREBASE_GROUPS"] || "testers",
      release_notes: ENV["FIREBASE_RELEASE_NOTES"] || "New build",
      android_artifact_path: "./app/build/outputs/apk/release/app-release.apk"
    )
  end

  desc "Run tests"
  lane :test do
    gradle(task: "test")
  end
end
```

## Project Structure

The server is organized in a modular architecture for easy maintenance:

```
src/
├── index.ts              # Entry point with error handling
├── server.ts             # Main MCP server class
├── config/              
│   └── index.ts         # Configuration management
├── handlers/            # Tool implementation handlers
│   ├── index.ts         # Handler exports
│   ├── build.ts         # Build handler
│   ├── appcenter.ts     # AppCenter deployment handler
│   ├── firebase.ts      # Firebase integration handler
│   ├── test.ts          # Test execution handler
│   ├── certificates.ts  # Certificate management handler
│   ├── lanes.ts         # Lane listing handler
│   ├── version.ts       # Version management handler
│   └── metadata.ts      # Metadata management handler
├── tools/
│   └── definitions.ts   # MCP tool definitions
├── types/
│   └── index.ts         # TypeScript types and schemas
├── utils/
│   ├── executor.ts      # Command execution utilities
│   └── logger.ts        # Logging utilities
└── test/
    └── test-utils.ts    # Testing utilities
```

## Configuration

The server supports configuration through a `fastlane-mcp.config.json` file.

Note: The standalone `fastlane-mcp.config.example.json` file has been removed. Use the example below directly in your own `fastlane-mcp.config.json`.

```json
{
  "server": {
    "name": "fastlane-mcp-server",
    "version": "1.0.0",
    "debug": false
  },
  "fastlane": {
    "defaultLanes": {
      "build": "build",
      "test": "test",
      "deploy": "deploy"
    },
    "timeout": 600000,
    "environmentVariables": {
      "FASTLANE_SKIP_UPDATE_CHECK": "true",
      "FASTLANE_HIDE_TIMESTAMP": "true"
    }
  },
  "platforms": {
    "ios": {
      "enabled": true,
      "defaultDevice": "iPhone 14",
      "defaultScheme": "YourApp"
    },
    "android": {
      "enabled": true,
      "defaultBuildType": "Release",
      "gradlePath": "./gradlew"
    }
  },
  "integrations": {
    "appCenter": {
      "enabled": true,
      "defaultOwner": "your-organization",
      "defaultGroup": "Collaborators"
    },
    "firebase": {
      "enabled": true,
      "defaultGroups": ["testers", "qa-team"]
    }
  }
}
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run with debug logging
DEBUG=true npm start
```

## Troubleshooting

### Common Issues

1. **Fastlane not found**: Ensure Fastlane is installed globally or in your project
   ```bash
   gem install fastlane
   ```

2. **Certificate issues on iOS**: Make sure you have proper certificates in your keychain and Match configured

3. **Firebase authentication**: Ensure you're logged in to Firebase CLI
   ```bash
   firebase login
   ```

4. **AppCenter authentication**: Set the APPCENTER_API_TOKEN environment variable

## Security Notes

- Store sensitive credentials in environment variables
- Never commit API tokens or passwords to version control
- Use app-specific passwords for Apple ID authentication
- Consider using Fastlane Match for iOS certificate management

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
