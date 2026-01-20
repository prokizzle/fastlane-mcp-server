import { execa, ExecaReturnValue } from 'execa';
import path from 'path';
import chalk from 'chalk';

export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a command with proper error handling
 */
export async function executeCommand(
  command: string,
  args: string[],
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  try {
    const result = await execa(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,  // Preserve existing environment
        ...options.env,  // Override with custom vars
      },
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error: unknown) {
    // Even if command fails, return the output
    if (error && typeof error === 'object' && ('stdout' in error || 'stderr' in error)) {
      const execError = error as { stdout?: string; stderr?: string; message?: string; exitCode?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || execError.message || '',
        exitCode: execError.exitCode || 1,
      };
    }
    throw error;
  }
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
  const platformDir = path.join(projectPath, platform);
  
  process.stderr.write(chalk.blue(`Executing fastlane ${lane} for ${platform}...\n`));
  
  return executeCommand('fastlane', [lane], {
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
  const platformDir = path.join(projectPath, platform);
  
  process.stderr.write(chalk.yellow(`Cleaning ${platform} build directories...\n`));
  
  if (platform === 'ios') {
    await executeCommand('xcodebuild', ['clean'], { cwd: platformDir });
  } else {
    await executeCommand('./gradlew', ['clean'], { cwd: platformDir });
  }
}

/**
 * Format execution result for MCP response
 */
export function formatResult(
  message: string,
  result: ExecutionResult
): { content: Array<{ type: string; text: string }> } {
  let text = message;
  
  if (result.stdout) {
    text += `\n\nOutput:\n${result.stdout}`;
  }
  
  if (result.stderr && result.exitCode === 0) {
    text += `\n\nWarnings:\n${result.stderr}`;
  } else if (result.stderr) {
    text += `\n\nErrors:\n${result.stderr}`;
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
