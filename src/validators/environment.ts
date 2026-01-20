import { ValidationResult, ValidationIssue } from './index.js';

const ENV_VAR_DESCRIPTIONS: Record<string, string> = {
  FASTLANE_USER: 'Apple ID email for App Store operations',
  FASTLANE_PASSWORD: 'App-specific password for Apple ID',
  FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: 'App-specific password for Apple ID',
  APPCENTER_API_TOKEN: 'AppCenter API token for deployment',
  FIREBASE_TOKEN: 'Firebase CLI token for deployment',
  MATCH_PASSWORD: 'Password for Match certificate encryption',
  MATCH_GIT_URL: 'Git repository URL for Match certificates',
  APP_STORE_CONNECT_API_KEY_KEY_ID: 'App Store Connect API Key ID',
  APP_STORE_CONNECT_API_KEY_ISSUER_ID: 'App Store Connect API Issuer ID',
  APP_STORE_CONNECT_API_KEY_KEY_FILEPATH: 'Path to App Store Connect API private key (.p8)',
};

const FILE_PATH_ENV_VARS = [
  'APP_STORE_CONNECT_API_KEY_KEY_FILEPATH',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

export function validateEnvironment(requiredVars: string[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    const description = ENV_VAR_DESCRIPTIONS[varName] || varName;

    // Check if variable is not set (undefined)
    if (value === undefined) {
      issues.push({
        level: 'error',
        code: 'ENV_MISSING',
        message: `Environment variable ${varName} is not set`,
        suggestion: `Set ${varName} (${description})`,
      });
      continue;
    }

    // Check if variable is set but empty or whitespace-only
    if (value.trim() === '') {
      issues.push({
        level: 'error',
        code: 'ENV_EMPTY',
        message: `Environment variable ${varName} is empty`,
        suggestion: `Provide a value for ${varName}`,
      });
      continue;
    }

    // Check if file path env vars point to existing files
    if (FILE_PATH_ENV_VARS.includes(varName)) {
      if (!value.startsWith('/') && !value.startsWith('~')) {
        issues.push({
          level: 'warning',
          code: 'ENV_PATH_RELATIVE',
          message: `${varName} appears to be a relative path: ${value}`,
          suggestion: 'Consider using an absolute path',
        });
      }
    }
  }

  return {
    valid: !issues.some(i => i.level === 'error'),
    issues,
  };
}
