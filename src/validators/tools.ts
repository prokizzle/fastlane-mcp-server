import { ValidationResult, ValidationIssue } from './index.js';
import { executeCommand } from '../utils/executor.js';

const TOOL_INFO: Record<string, { installCmd: string; description: string }> = {
  fastlane: {
    installCmd: 'gem install fastlane',
    description: 'Fastlane automation toolkit',
  },
  xcodebuild: {
    installCmd: 'xcode-select --install',
    description: 'Xcode command line tools',
  },
  gradle: {
    installCmd: 'Install Android Studio or use ./gradlew wrapper',
    description: 'Gradle build tool',
  },
  firebase: {
    installCmd: 'npm install -g firebase-tools',
    description: 'Firebase CLI',
  },
  appcenter: {
    installCmd: 'npm install -g appcenter-cli',
    description: 'AppCenter CLI',
  },
};

export async function validateTools(requiredTools: string[]): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  for (const tool of requiredTools) {
    const isAvailable = await checkToolAvailable(tool);

    if (!isAvailable) {
      const info = TOOL_INFO[tool] || { installCmd: `Install ${tool}`, description: tool };
      issues.push({
        level: 'error',
        code: 'TOOL_NOT_FOUND',
        message: `${info.description} (${tool}) is not installed or not in PATH`,
        suggestion: `Install with: ${info.installCmd}`,
      });
    }
  }

  return {
    valid: !issues.some(i => i.level === 'error'),
    issues,
  };
}

async function checkToolAvailable(tool: string): Promise<boolean> {
  try {
    const result = await executeCommand('which', [tool], { timeout: 5000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
