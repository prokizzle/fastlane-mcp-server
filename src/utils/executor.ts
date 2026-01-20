import { execa, ExecaReturnValue } from 'execa';
import path from 'path';
import chalk from 'chalk';
import { sanitizeLaneName, validateProjectPath } from './sanitize.js';
import { diagnoseError, formatDiagnosedError } from '../errors/diagnosis.js';

export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;  // Timeout in milliseconds
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Default timeout from config (10 minutes)
const DEFAULT_TIMEOUT = 600000;

/**
 * Execute a command with proper error handling
 */
export async function executeCommand(
  command: string,
  args: string[],
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  try {
    const result = await execa(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,  // Preserve existing environment
        ...options.env,  // Override with custom vars
      },
      timeout,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object') {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
        exitCode?: number;
        timedOut?: boolean;
      };

      // Handle timeout specifically
      if (execError.timedOut) {
        return {
          stdout: execError.stdout || '',
          stderr: `Command timed out after ${timeout}ms`,
          exitCode: 124,  // Standard timeout exit code
        };
      }

      // Even if command fails, return the output
      if (execError.stdout !== undefined || execError.stderr !== undefined) {
        return {
          stdout: execError.stdout || '',
          stderr: execError.stderr || execError.message || '',
          exitCode: execError.exitCode || 1,
        };
      }
    }
    throw error;
  }
}

// Valid platforms for Fastlane operations
const VALID_PLATFORMS = ['ios', 'android'] as const;
type ValidPlatform = typeof VALID_PLATFORMS[number];

function validatePlatform(platform: string): ValidPlatform {
  if (!VALID_PLATFORMS.includes(platform as ValidPlatform)) {
    throw new Error(`Invalid platform: ${platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }
  return platform as ValidPlatform;
}

/**
 * Execute a Fastlane command
 */
export async function executeFastlane(
  lane: string,
  platform: string,
  projectPath: string,
  envVars: Record<string, string> = {}
): Promise<ExecutionResult> {
  // Validate inputs
  const safeLane = sanitizeLaneName(lane);
  const safePlatform = validatePlatform(platform);
  const safeProjectPath = await validateProjectPath(projectPath);

  const platformDir = path.join(safeProjectPath, safePlatform);

  process.stderr.write(chalk.blue(`Executing fastlane ${safeLane} for ${platform}...\n`));

  return executeCommand('fastlane', [safeLane], {
    cwd: platformDir,
    env: envVars,  // executeCommand handles merging with process.env
  });
}

/**
 * Clean build directories
 */
export async function cleanBuildDirectories(
  platform: string,
  projectPath: string
): Promise<void> {
  // Validate inputs
  const safePlatform = validatePlatform(platform);
  const safeProjectPath = await validateProjectPath(projectPath);

  const platformDir = path.join(safeProjectPath, safePlatform);

  process.stderr.write(chalk.yellow(`Cleaning ${safePlatform} build directories...\n`));

  if (safePlatform === 'ios') {
    await executeCommand('xcodebuild', ['clean'], { cwd: platformDir });
  } else {
    await executeCommand('./gradlew', ['clean'], { cwd: platformDir });
  }
}

/**
 * Format execution result for MCP response
 * Uses error intelligence for failed commands to provide helpful diagnostics
 */
export function formatResult(
  message: string,
  result: ExecutionResult
): { content: Array<{ type: string; text: string }> } {
  let text = message;

  if (result.exitCode === 0) {
    // Success case
    if (result.stdout) {
      text += `\n\nOutput:\n${result.stdout}`;
    }
    if (result.stderr) {
      text += `\n\nWarnings:\n${result.stderr}`;
    }
  } else {
    // Error case - use error intelligence
    const errorOutput = result.stderr || result.stdout || 'Unknown error';
    const diagnosed = diagnoseError(errorOutput);
    text += `\n\n${formatDiagnosedError(diagnosed)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Format error for MCP response
 */
export function formatError(error: unknown): { content: Array<{ type: string; text: string }> } {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
  };
}
