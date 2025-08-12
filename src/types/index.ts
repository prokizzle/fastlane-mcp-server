import { z } from 'zod';

// Platform type
export type Platform = 'ios' | 'android';
export type Environment = 'development' | 'staging' | 'production';
export type CertificateAction = 'sync' | 'create' | 'renew' | 'revoke';
export type FirebaseAction = 'deploy' | 'distribute' | 'crashlytics';
export type VersionAction = 'bump' | 'set' | 'get';
export type VersionType = 'major' | 'minor' | 'patch' | 'build';
export type MetadataAction = 'deliver' | 'supply' | 'snapshot';

// Tool schemas
export const BuildSchema = z.object({
  platform: z.enum(['ios', 'android']).describe('Target platform for the build'),
  projectPath: z.string().describe('Path to the project directory'),
  lane: z.string().optional().describe('Specific Fastlane lane to run (default: build)'),
  environment: z.enum(['development', 'staging', 'production']).optional().describe('Build environment'),
  clean: z.boolean().optional().describe('Clean build directories before building'),
});

export const AppCenterSchema = z.object({
  platform: z.enum(['ios', 'android']).describe('Target platform for deployment'),
  projectPath: z.string().describe('Path to the project directory'),
  appName: z.string().optional().describe('AppCenter app name (if different from default)'),
  group: z.string().optional().describe('Distribution group in AppCenter'),
  notes: z.string().optional().describe('Release notes for the deployment'),
});

export const FirebaseSchema = z.object({
  action: z.enum(['deploy', 'distribute', 'crashlytics']).describe('Firebase action to perform'),
  platform: z.enum(['ios', 'android']).describe('Target platform'),
  projectPath: z.string().describe('Path to the project directory'),
  appId: z.string().optional().describe('Firebase App ID'),
  groups: z.array(z.string()).optional().describe('Distribution groups for Firebase App Distribution'),
  releaseNotes: z.string().optional().describe('Release notes for distribution'),
});

export const TestSchema = z.object({
  platform: z.enum(['ios', 'android']).describe('Target platform for testing'),
  projectPath: z.string().describe('Path to the project directory'),
  device: z.string().optional().describe('Specific device or simulator to test on'),
  testPlan: z.string().optional().describe('Test plan or suite to run'),
});

export const CertificateSchema = z.object({
  platform: z.enum(['ios', 'android']).describe('Platform for certificate management'),
  action: z.enum(['sync', 'create', 'renew', 'revoke']).describe('Certificate action'),
  projectPath: z.string().describe('Path to the project directory'),
  type: z.string().optional().describe('Certificate type (development, distribution, adhoc)'),
});

export const LaneSchema = z.object({
  projectPath: z.string().describe('Path to the project directory'),
  platform: z.enum(['ios', 'android']).optional().describe('Filter lanes by platform'),
});

export const VersionSchema = z.object({
  platform: z.enum(['ios', 'android']).describe('Target platform'),
  projectPath: z.string().describe('Path to the project directory'),
  action: z.enum(['bump', 'set', 'get']).describe('Version action'),
  versionType: z.enum(['major', 'minor', 'patch', 'build']).optional().describe('Version component to modify'),
  version: z.string().optional().describe('Specific version to set'),
});

export const MetadataSchema = z.object({
  platform: z.enum(['ios', 'android']).describe('Target platform'),
  projectPath: z.string().describe('Path to the project directory'),
  action: z.enum(['deliver', 'supply', 'snapshot']).describe('Metadata action'),
  skipScreenshots: z.boolean().optional().describe('Skip screenshot upload'),
  skipMetadata: z.boolean().optional().describe('Skip metadata upload'),
});

// Type exports
export type BuildArgs = z.infer<typeof BuildSchema>;
export type AppCenterArgs = z.infer<typeof AppCenterSchema>;
export type FirebaseArgs = z.infer<typeof FirebaseSchema>;
export type TestArgs = z.infer<typeof TestSchema>;
export type CertificateArgs = z.infer<typeof CertificateSchema>;
export type LaneArgs = z.infer<typeof LaneSchema>;
export type VersionArgs = z.infer<typeof VersionSchema>;
export type MetadataArgs = z.infer<typeof MetadataSchema>;
