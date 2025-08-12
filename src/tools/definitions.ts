import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'build',
    description: 'Build iOS or Android app using Fastlane',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Target platform for the build',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        lane: {
          type: 'string',
          description: 'Specific Fastlane lane to run (default: build)',
        },
        environment: {
          type: 'string',
          enum: ['development', 'staging', 'production'],
          description: 'Build environment',
        },
        clean: {
          type: 'boolean',
          description: 'Clean build directories before building',
        },
      },
      required: ['platform', 'projectPath'],
    },
  },
  {
    name: 'deploy_appcenter',
    description: 'Deploy app to AppCenter using Fastlane',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Target platform for deployment',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        appName: {
          type: 'string',
          description: 'AppCenter app name (if different from default)',
        },
        group: {
          type: 'string',
          description: 'Distribution group in AppCenter',
        },
        notes: {
          type: 'string',
          description: 'Release notes for the deployment',
        },
      },
      required: ['platform', 'projectPath'],
    },
  },
  {
    name: 'firebase',
    description: 'Manage Firebase integration (deploy, distribute, crashlytics)',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['deploy', 'distribute', 'crashlytics'],
          description: 'Firebase action to perform',
        },
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Target platform',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        appId: {
          type: 'string',
          description: 'Firebase App ID',
        },
        groups: {
          type: 'array',
          items: { type: 'string' },
          description: 'Distribution groups for Firebase App Distribution',
        },
        releaseNotes: {
          type: 'string',
          description: 'Release notes for distribution',
        },
      },
      required: ['action', 'platform', 'projectPath'],
    },
  },
  {
    name: 'test',
    description: 'Run tests using Fastlane',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Target platform for testing',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        device: {
          type: 'string',
          description: 'Specific device or simulator to test on',
        },
        testPlan: {
          type: 'string',
          description: 'Test plan or suite to run',
        },
      },
      required: ['platform', 'projectPath'],
    },
  },
  {
    name: 'manage_certificates',
    description: 'Manage code signing certificates and provisioning profiles',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Platform for certificate management',
        },
        action: {
          type: 'string',
          enum: ['sync', 'create', 'renew', 'revoke'],
          description: 'Certificate action',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        type: {
          type: 'string',
          description: 'Certificate type (development, distribution, adhoc)',
        },
      },
      required: ['platform', 'action', 'projectPath'],
    },
  },
  {
    name: 'list_lanes',
    description: 'List available Fastlane lanes in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Filter lanes by platform',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'version',
    description: 'Manage app version and build numbers',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Target platform',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        action: {
          type: 'string',
          enum: ['bump', 'set', 'get'],
          description: 'Version action',
        },
        versionType: {
          type: 'string',
          enum: ['major', 'minor', 'patch', 'build'],
          description: 'Version component to modify',
        },
        version: {
          type: 'string',
          description: 'Specific version to set',
        },
      },
      required: ['platform', 'projectPath', 'action'],
    },
  },
  {
    name: 'metadata',
    description: 'Manage app store metadata and screenshots',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Target platform',
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        action: {
          type: 'string',
          enum: ['deliver', 'supply', 'snapshot'],
          description: 'Metadata action',
        },
        skipScreenshots: {
          type: 'boolean',
          description: 'Skip screenshot upload',
        },
        skipMetadata: {
          type: 'boolean',
          description: 'Skip metadata upload',
        },
      },
      required: ['platform', 'projectPath', 'action'],
    },
  },
];
