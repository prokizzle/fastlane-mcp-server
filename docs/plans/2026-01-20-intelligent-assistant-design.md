# Fastlane MCP Server v2: Intelligent Assistant

## Overview

Transform the fastlane MCP server from a simple command wrapper into an intelligent assistant that understands projects, validates environments, catches problems early, and guides users through fastlane's full capabilities without requiring expertise.

## Goals

1. Fix critical bugs that prevent reliable operation
2. Catch problems during pre-flight, not 5 minutes into a build
3. Transform cryptic errors into actionable guidance
4. Surface fastlane's full power through intelligent discovery
5. Recommend plugins based on project needs and community wisdom
6. Simplify certificate management for teams

## Non-Goals

- CI config generation (future Approach C)
- Build artifact management (future)
- Streaming output (future)
- Build history tracking (future)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                           │
├─────────────────────────────────────────────────────────┤
│  Pre-flight Validator                                   │
│  ├── Environment checker                                │
│  ├── Project analyzer                                   │
│  └── Tool availability checker                          │
├─────────────────────────────────────────────────────────┤
│  Tool Handlers                                          │
│  ├── Input sanitization                                 │
│  ├── Timeout enforcement                                │
│  └── Structured output                                  │
├─────────────────────────────────────────────────────────┤
│  Error Intelligence                                     │
│  ├── Error parser                                       │
│  ├── Diagnosis engine                                   │
│  └── Recovery suggestions                               │
├─────────────────────────────────────────────────────────┤
│  Discovery Service                                      │
│  ├── Lane parser                                        │
│  ├── Capability detector                                │
│  └── Plugin advisor                                     │
├─────────────────────────────────────────────────────────┤
│  Certificate Intelligence                               │
│  ├── Match analyzer                                     │
│  ├── Consolidation detector                             │
│  └── Team onboarding                                    │
└─────────────────────────────────────────────────────────┘
```

## Bug Fixes (Critical)

### 1. Logger Protocol Violation
**Problem:** Logger writes to stdout, corrupting MCP JSON-RPC stream.
**Fix:** Redirect all logging to stderr.

### 2. Environment Variable Merging
**Problem:** `executor.ts` passes only custom env vars, losing `process.env`.
**Fix:** Merge with `{ ...process.env, ...env }`.

### 3. Timeout Enforcement
**Problem:** Config defines 10-minute timeout but never enforces it.
**Fix:** Pass timeout to execa options.

### 4. Input Sanitization
**Problem:** `projectPath` and lane names passed directly to shell.
**Fix:** Validate paths exist, sanitize lane names against allowlist.

## Pre-flight Validator

Runs before every tool call. Returns all issues at once.

### Environment Checker
- Required env vars exist and are non-empty
- File paths in env vars actually exist
- Credentials are properly formatted

### Project Analyzer
- projectPath exists and is a directory
- Fastfile exists at expected location
- Requested lane exists in Fastfile
- Basic project structure valid

### Tool Availability
- fastlane command exists
- Platform tools exist (xcodebuild, gradle)
- Optional tools present when needed (firebase-cli, appcenter-cli)

## Error Intelligence

### Error Parser
Pattern library covering:
- Code signing (certificate, profile, entitlement errors)
- Build failures (module not found, linker, script errors)
- Credentials (auth failed, unauthorized, rate limit)
- Environment (JAVA_HOME, SDK paths, xcrun)

### Diagnosis Engine
Adds context to raw errors:
```
error: "Build failed: code signing error"
diagnosis: "Provisioning profile doesn't include this device"
context: "Profile 'MyApp Dev' has 5 devices, current device not in list"
```

### Recovery Suggestions
Actionable next steps:
```
suggestions:
  - "Run 'fastlane match development' to refresh profiles"
  - "Or add device UDID to Apple Developer Portal"
  - "Device UDID: 00008030-001A35E83C38802E"
```

## Discovery Service

### Enhanced Lane Parsing
Use `fastlane lanes --json` for reliable parsing. Fallback to robust Ruby-aware regex.

Returns:
- Lane name, platform, description
- Dependencies between lanes
- Parameters if defined

### Capability Detection
Detect full fastlane toolkit availability:
- Build: gym, gradle, scan, snapshot
- Distribution: pilot, deliver, supply, firebase
- Metadata: deliver, supply, frameit, precheck
- Signing: match, cert, sigh, register_devices

### New Tool: analyze_project
```
Response:
  platforms: ["ios", "android"]
  ios:
    lanes: [{ name, platform, description }]
    signing: "match" | "manual" | "unknown"
    destinations: ["testflight", "firebase"]
    metadata:
      deliverfile_exists: true
      languages: ["en-US", "es-ES"]
  android:
    lanes: [...]
    signing: "keystore found" | "missing"
  environment:
    status: "ready" | "issues"
    issues: ["Missing FASTLANE_USER"]
  available_actions:
    - "Upload iOS screenshots to App Store"
    - "Generate screenshots with snapshot"
```

## Plugin Advisor

### Project Signal Detection
Scan for services and suggest matching plugins:

| Signal | Source | Plugin |
|--------|--------|--------|
| Sentry | Package.swift, Podfile, gradle | fastlane-plugin-sentry |
| Firebase | firebase.json, Podfile | firebase_app_distribution |
| RevenueCat | Podfile, gradle | fastlane-plugin-revenuecat |
| Slack webhook | env vars | slack-related plugins |
| React Native | react-native.config.js | RN-specific plugins |

### Live Registry Search
Query rubygems.org when no known mapping exists. Search by keywords derived from detected signals.

### Community Intelligence
Search Reddit, Stack Overflow, GitHub for:
- Better alternatives to installed plugins
- Plugins that solve specific errors
- Community-recommended configurations

### New Tool: research_plugins
```
Modes:
  - analyze: Suggest plugins based on project signals
  - search: Query registry + community for specific need
  - alternatives: Find better options for installed plugins
  - solve: Find plugins that fix a specific error
```

### New Tool: manage_plugins
```
Actions:
  - list: Show installed plugins and available updates
  - install: Add a plugin
  - update: Update plugins
  - search: Search plugin registry
```

## Certificate Intelligence

### Match Setup Detection
Scan Matchfile, env vars, Appfile for:
- Match configuration status
- Git/S3/GCS storage location
- Available certificate types
- Team ID and app identifiers

### Consolidation Analysis
Identify certificate sharing opportunities:
- Multiple distribution certs when one would suffice
- Apps that could share profiles
- Keychain sharing opportunities

### Expiration Monitoring
Track and warn about:
- Certificates expiring soon
- Profiles expiring soon
- Impact on which apps

### New Tool: analyze_signing
```
Actions:
  - status: Current signing setup across projects
  - consolidate: Recommend certificate consolidation
  - expiring: List certs/profiles expiring soon
  - sync: Run match to sync team credentials

Response:
  recommendations:
    - priority: "high"
      issue: "Certificate expires in 45 days"
      affected_apps: ["app1", "app2"]
      action: "Renew now to avoid disruption"
      command: "fastlane match appstore --force"
```

### Team Onboarding
For new team members or new apps:
1. Detect existing Match configuration
2. Verify access to certificates repo
3. Add new app to Match
4. Generate required profiles

## New Tools Summary

| Tool | Purpose |
|------|---------|
| analyze_project | Full project capability scan |
| research_plugins | Intelligent plugin discovery |
| manage_plugins | Install/update/search plugins |
| analyze_signing | Certificate and Match management |

## Enhanced Existing Tools

All tools receive:
- Pre-flight validation
- Rich error responses with diagnosis and suggestions
- Timeout enforcement
- Input sanitization

`list_lanes` enhanced with:
- Full descriptions from Fastfile
- Platform information
- Lane dependencies

## Implementation Order

1. **Phase 1: Bug Fixes**
   - Logger to stderr
   - Env var merging
   - Timeout enforcement
   - Input sanitization

2. **Phase 2: Pre-flight Validation**
   - Environment checker
   - Project analyzer
   - Tool availability checker

3. **Phase 3: Error Intelligence**
   - Error pattern library
   - Diagnosis engine
   - Recovery suggestions

4. **Phase 4: Discovery Service**
   - Enhanced lane parsing
   - Capability detection
   - analyze_project tool

5. **Phase 5: Plugin Advisor**
   - Signal detection
   - Registry search
   - Community intelligence
   - research_plugins and manage_plugins tools

6. **Phase 6: Certificate Intelligence**
   - Match detection
   - Consolidation analysis
   - analyze_signing tool

## Success Criteria

- Server starts without protocol errors
- Pre-flight catches missing env vars before build starts
- Code signing errors include specific fix instructions
- User can discover all available lanes and capabilities
- Plugin suggestions match detected project services
- Certificate consolidation saves team from hitting Apple limits
