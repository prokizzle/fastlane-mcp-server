# Fastlane MCP Server v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the fastlane MCP server into an intelligent assistant with pre-flight validation, error intelligence, plugin discovery, and certificate management.

**Architecture:** Six-phase approach - fix critical bugs first, then add validation layer, error intelligence, discovery features, plugin advisor, and certificate management. Each phase builds on the previous.

**Tech Stack:** TypeScript, Zod schemas, MCP SDK 0.5.0, execa for shell execution, Jest for testing.

---

## Phase 1: Bug Fixes (Critical)

### Task 1.1: Fix Logger Protocol Violation

The logger writes to stdout via `console.log`, corrupting the MCP JSON-RPC stream. All logging must go to stderr.

**Files:**
- Modify: `src/utils/logger.ts`
- Create: `src/utils/__tests__/logger.test.ts`

**Step 1: Create test file and write failing test**

```typescript
// src/utils/__tests__/logger.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should write info messages to stderr, not stdout', async () => {
    const { Logger } = await import('../logger.js');
    const logger = new Logger('Test');

    logger.info('test message');

    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('should write error messages to stderr', async () => {
    const { Logger } = await import('../logger.js');
    const logger = new Logger('Test');

    logger.error('error message');

    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
```

**Step 2: Set up Vitest**

```bash
npm install -D vitest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

**Step 3: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - logger still writes to stdout

**Step 4: Fix the logger to use stderr**

```typescript
// src/utils/logger.ts
import chalk from 'chalk';

export class Logger {
  private prefix: string;

  constructor(prefix: string = 'Fastlane MCP') {
    this.prefix = prefix;
  }

  private writeToStderr(message: string): void {
    process.stderr.write(message + '\n');
  }

  info(message: string): void {
    this.writeToStderr(chalk.blue(`[${this.prefix}] ${message}`));
  }

  success(message: string): void {
    this.writeToStderr(chalk.green(`[${this.prefix}] ✓ ${message}`));
  }

  warning(message: string): void {
    this.writeToStderr(chalk.yellow(`[${this.prefix}] ⚠ ${message}`));
  }

  error(message: string): void {
    this.writeToStderr(chalk.red(`[${this.prefix}] ✗ ${message}`));
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      this.writeToStderr(chalk.gray(`[${this.prefix}] ${message}`));
    }
  }
}

export const logger = new Logger();
```

**Step 5: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 6: Also fix console.log in executor.ts**

```typescript
// src/utils/executor.ts line 59 - change:
console.log(chalk.blue(`Executing fastlane ${lane} for ${platform}...`));
// to:
process.stderr.write(chalk.blue(`Executing fastlane ${lane} for ${platform}...\n`));

// line 76 - change:
console.log(chalk.yellow(`Cleaning ${platform} build directories...`));
// to:
process.stderr.write(chalk.yellow(`Cleaning ${platform} build directories...\n`));
```

**Step 7: Commit**

```bash
git add -A
git commit -m "fix: redirect all logging to stderr for MCP protocol compliance

Logger was writing to stdout via console.log, which corrupts the
MCP JSON-RPC stream. All diagnostic output now goes to stderr."
```

---

### Task 1.2: Fix Environment Variable Merging

The executor passes only custom env vars, losing `process.env` (PATH, HOME, etc.).

**Files:**
- Modify: `src/utils/executor.ts`
- Create: `src/utils/__tests__/executor.test.ts`

**Step 1: Write failing test**

```typescript
// src/utils/__tests__/executor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { executeCommand } from '../executor.js';

describe('executeCommand', () => {
  it('should preserve process.env when passing custom env vars', async () => {
    // This command prints the PATH env var
    const result = await executeCommand('printenv', ['PATH'], {
      env: { CUSTOM_VAR: 'test' }
    });

    // PATH should still be available (inherited from process.env)
    expect(result.stdout).toBeTruthy();
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('should include custom env vars in execution', async () => {
    const result = await executeCommand('printenv', ['CUSTOM_VAR'], {
      env: { CUSTOM_VAR: 'test_value' }
    });

    expect(result.stdout.trim()).toBe('test_value');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test src/utils/__tests__/executor.test.ts
```

Expected: FAIL - PATH not found because process.env not merged

**Step 3: Fix executor to merge env vars**

```typescript
// src/utils/executor.ts - modify executeCommand function
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
```

**Step 4: Also fix executeFastlane**

```typescript
// src/utils/executor.ts - modify executeFastlane function
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
    env: envVars,  // executeCommand now handles merging
  });
}
```

**Step 5: Run test to verify it passes**

```bash
npm test src/utils/__tests__/executor.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "fix: merge process.env with custom env vars in executor

Commands were failing because PATH and other essential env vars
were not being passed. Now properly merges process.env with
custom environment variables."
```

---

### Task 1.3: Add Timeout Enforcement

Config defines timeout but it's never used. Add timeout to command execution.

**Files:**
- Modify: `src/utils/executor.ts`
- Modify: `src/types/index.ts`

**Step 1: Write failing test**

```typescript
// Add to src/utils/__tests__/executor.test.ts
describe('executeCommand timeout', () => {
  it('should timeout if command takes too long', async () => {
    const result = await executeCommand('sleep', ['10'], {
      timeout: 100  // 100ms timeout
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('timed out');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - test hangs for 10 seconds

**Step 3: Add timeout to ExecutionOptions**

```typescript
// src/utils/executor.ts - update interface
export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;  // Timeout in milliseconds
}

// Default timeout from config (10 minutes)
const DEFAULT_TIMEOUT = 600000;
```

**Step 4: Implement timeout in executeCommand**

```typescript
// src/utils/executor.ts - update executeCommand
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
        ...process.env,
        ...options.env,
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
```

**Step 5: Run test to verify it passes**

```bash
npm test
```

Expected: PASS (test completes quickly with timeout error)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add timeout enforcement to command execution

Commands now respect a configurable timeout (default 10 minutes).
Timed-out commands return exit code 124 with clear error message."
```

---

### Task 1.4: Add Input Sanitization

Validate paths and sanitize lane names to prevent shell injection.

**Files:**
- Create: `src/utils/sanitize.ts`
- Create: `src/utils/__tests__/sanitize.test.ts`
- Modify: `src/utils/executor.ts`

**Step 1: Write tests first**

```typescript
// src/utils/__tests__/sanitize.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeLaneName, validatePath, ValidationError } from '../sanitize.js';

describe('sanitizeLaneName', () => {
  it('should allow valid lane names', () => {
    expect(sanitizeLaneName('build')).toBe('build');
    expect(sanitizeLaneName('deploy_beta')).toBe('deploy_beta');
    expect(sanitizeLaneName('build_ios_release')).toBe('build_ios_release');
  });

  it('should reject lane names with shell metacharacters', () => {
    expect(() => sanitizeLaneName('build; rm -rf /')).toThrow(ValidationError);
    expect(() => sanitizeLaneName('build && cat /etc/passwd')).toThrow(ValidationError);
    expect(() => sanitizeLaneName('build | grep')).toThrow(ValidationError);
    expect(() => sanitizeLaneName('$(whoami)')).toThrow(ValidationError);
  });
});

describe('validatePath', () => {
  it('should allow valid paths', async () => {
    // Use a path that exists
    await expect(validatePath('/tmp')).resolves.toBe('/tmp');
  });

  it('should reject paths that do not exist', async () => {
    await expect(validatePath('/nonexistent/path/12345')).rejects.toThrow(ValidationError);
  });

  it('should reject paths with traversal attempts', async () => {
    await expect(validatePath('/tmp/../../../etc/passwd')).rejects.toThrow(ValidationError);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test src/utils/__tests__/sanitize.test.ts
```

Expected: FAIL - module does not exist

**Step 3: Implement sanitization module**

```typescript
// src/utils/sanitize.ts
import { promises as fs } from 'fs';
import path from 'path';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Allowed characters in lane names: alphanumeric, underscore, hyphen
const SAFE_LANE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

// Shell metacharacters to block
const DANGEROUS_CHARS = /[;&|`$(){}[\]<>!#*?~]/;

export function sanitizeLaneName(lane: string): string {
  if (!lane || typeof lane !== 'string') {
    throw new ValidationError('Lane name must be a non-empty string');
  }

  const trimmed = lane.trim();

  if (DANGEROUS_CHARS.test(trimmed)) {
    throw new ValidationError(`Lane name contains invalid characters: ${trimmed}`);
  }

  if (!SAFE_LANE_PATTERN.test(trimmed)) {
    throw new ValidationError(
      `Lane name must start with a letter and contain only letters, numbers, underscores, and hyphens: ${trimmed}`
    );
  }

  return trimmed;
}

export async function validatePath(inputPath: string): Promise<string> {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new ValidationError('Path must be a non-empty string');
  }

  const trimmed = inputPath.trim();

  // Resolve to absolute path and normalize
  const resolved = path.resolve(trimmed);
  const normalized = path.normalize(resolved);

  // Check for path traversal (.. that escapes the intended directory)
  // Allow .. only if it stays within a reasonable path structure
  if (trimmed.includes('..')) {
    const originalParts = trimmed.split(path.sep).filter(p => p !== '');
    const normalizedParts = normalized.split(path.sep).filter(p => p !== '');

    // If normalized has fewer parts and original had .., potential traversal
    if (originalParts.includes('..') && normalizedParts.length < originalParts.filter(p => p !== '..').length) {
      throw new ValidationError(`Path contains suspicious traversal: ${trimmed}`);
    }
  }

  // Verify the path exists
  try {
    await fs.access(normalized);
  } catch {
    throw new ValidationError(`Path does not exist: ${normalized}`);
  }

  return normalized;
}

export async function validateProjectPath(projectPath: string): Promise<string> {
  const validated = await validatePath(projectPath);

  // Check it's a directory
  const stats = await fs.stat(validated);
  if (!stats.isDirectory()) {
    throw new ValidationError(`Project path must be a directory: ${validated}`);
  }

  return validated;
}
```

**Step 4: Run tests**

```bash
npm test src/utils/__tests__/sanitize.test.ts
```

Expected: PASS

**Step 5: Integrate sanitization into executor**

```typescript
// src/utils/executor.ts - add import
import { sanitizeLaneName, validateProjectPath } from './sanitize.js';

// Update executeFastlane to validate inputs
export async function executeFastlane(
  lane: string,
  platform: string,
  projectPath: string,
  envVars: Record<string, string> = {}
): Promise<ExecutionResult> {
  // Validate inputs
  const safeLane = sanitizeLaneName(lane);
  const safeProjectPath = await validateProjectPath(projectPath);

  const platformDir = path.join(safeProjectPath, platform);

  process.stderr.write(chalk.blue(`Executing fastlane ${safeLane} for ${platform}...\n`));

  return executeCommand('fastlane', [safeLane], {
    cwd: platformDir,
    env: envVars,
  });
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add input sanitization for shell safety

- Validate lane names against allowlist pattern
- Block shell metacharacters in lane names
- Validate project paths exist and are directories
- Detect and block path traversal attempts"
```

---

## Phase 2: Pre-flight Validation

### Task 2.1: Create Pre-flight Validator Framework

**Files:**
- Create: `src/validators/index.ts`
- Create: `src/validators/environment.ts`
- Create: `src/validators/project.ts`
- Create: `src/validators/tools.ts`
- Create: `src/validators/__tests__/validators.test.ts`

**Step 1: Define validation result types**

```typescript
// src/validators/index.ts
export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface PreflightContext {
  projectPath?: string;
  platform?: 'ios' | 'android';
  lane?: string;
  requiredEnvVars?: string[];
  requiredTools?: string[];
}

export async function runPreflight(context: PreflightContext): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Run all validators
  const { validateEnvironment } = await import('./environment.js');
  const { validateProject } = await import('./project.js');
  const { validateTools } = await import('./tools.js');

  if (context.requiredEnvVars?.length) {
    const envResult = validateEnvironment(context.requiredEnvVars);
    issues.push(...envResult.issues);
  }

  if (context.projectPath) {
    const projectResult = await validateProject(context.projectPath, context.platform, context.lane);
    issues.push(...projectResult.issues);
  }

  if (context.requiredTools?.length) {
    const toolsResult = await validateTools(context.requiredTools);
    issues.push(...toolsResult.issues);
  }

  const hasErrors = issues.some(i => i.level === 'error');

  return {
    valid: !hasErrors,
    issues,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return 'Pre-flight checks passed';
  }

  const lines: string[] = [];

  const errors = result.issues.filter(i => i.level === 'error');
  const warnings = result.issues.filter(i => i.level === 'warning');

  if (errors.length > 0) {
    lines.push('Errors:');
    for (const issue of errors) {
      lines.push(`  ✗ ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    → ${issue.suggestion}`);
      }
    }
  }

  if (warnings.length > 0) {
    lines.push('Warnings:');
    for (const issue of warnings) {
      lines.push(`  ⚠ ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    → ${issue.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}
```

**Step 2: Implement environment validator**

```typescript
// src/validators/environment.ts
import { ValidationResult, ValidationIssue } from './index.js';
import { promises as fs } from 'fs';

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

    if (!value) {
      issues.push({
        level: 'error',
        code: 'ENV_MISSING',
        message: `Environment variable ${varName} is not set`,
        suggestion: `Set ${varName} (${description})`,
      });
      continue;
    }

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
      // We'll check async in a separate pass
      // For now, just validate it looks like a path
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

export async function validateEnvFilePaths(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  for (const varName of FILE_PATH_ENV_VARS) {
    const value = process.env[varName];
    if (!value) continue;

    const filePath = value.startsWith('~')
      ? value.replace('~', process.env.HOME || '')
      : value;

    try {
      await fs.access(filePath);
    } catch {
      issues.push({
        level: 'error',
        code: 'ENV_FILE_NOT_FOUND',
        message: `File specified by ${varName} does not exist: ${value}`,
        suggestion: `Verify the file exists at: ${filePath}`,
      });
    }
  }

  return {
    valid: !issues.some(i => i.level === 'error'),
    issues,
  };
}
```

**Step 3: Implement project validator**

```typescript
// src/validators/project.ts
import { ValidationResult, ValidationIssue } from './index.js';
import { promises as fs } from 'fs';
import path from 'path';

export async function validateProject(
  projectPath: string,
  platform?: 'ios' | 'android',
  lane?: string
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Check project path exists
  try {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      issues.push({
        level: 'error',
        code: 'PROJECT_NOT_DIRECTORY',
        message: `Project path is not a directory: ${projectPath}`,
        suggestion: 'Provide a path to your project directory',
      });
      return { valid: false, issues };
    }
  } catch {
    issues.push({
      level: 'error',
      code: 'PROJECT_NOT_FOUND',
      message: `Project path does not exist: ${projectPath}`,
      suggestion: 'Verify the project path is correct',
    });
    return { valid: false, issues };
  }

  // Check platform directories and Fastfiles
  const platforms = platform ? [platform] : ['ios', 'android'];

  for (const plat of platforms) {
    const platformDir = path.join(projectPath, plat);
    const fastfilePath = path.join(platformDir, 'fastlane', 'Fastfile');

    try {
      await fs.access(platformDir);
    } catch {
      if (platform === plat) {
        // Only error if this specific platform was requested
        issues.push({
          level: 'error',
          code: 'PLATFORM_DIR_NOT_FOUND',
          message: `Platform directory not found: ${platformDir}`,
          suggestion: `Create the ${plat} directory in your project`,
        });
      }
      continue;
    }

    try {
      await fs.access(fastfilePath);
    } catch {
      issues.push({
        level: platform === plat ? 'error' : 'warning',
        code: 'FASTFILE_NOT_FOUND',
        message: `Fastfile not found: ${fastfilePath}`,
        suggestion: `Run 'fastlane init' in the ${plat} directory`,
      });
      continue;
    }

    // If a specific lane was requested, check it exists
    if (lane && platform === plat) {
      const lanes = await extractLaneNames(fastfilePath);
      if (!lanes.includes(lane)) {
        issues.push({
          level: 'error',
          code: 'LANE_NOT_FOUND',
          message: `Lane '${lane}' not found in ${plat}/fastlane/Fastfile`,
          suggestion: `Available lanes: ${lanes.join(', ') || 'none found'}`,
        });
      }
    }
  }

  return {
    valid: !issues.some(i => i.level === 'error'),
    issues,
  };
}

async function extractLaneNames(fastfilePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(fastfilePath, 'utf-8');
    const laneMatches = content.matchAll(/^\s*lane\s+:(\w+)/gm);
    return Array.from(laneMatches, m => m[1]);
  } catch {
    return [];
  }
}
```

**Step 4: Implement tools validator**

```typescript
// src/validators/tools.ts
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
    // Use 'which' on Unix-like systems
    const result = await executeCommand('which', [tool], { timeout: 5000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
```

**Step 5: Write tests**

```typescript
// src/validators/__tests__/validators.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from '../environment.js';
import { validateTools } from '../tools.js';

describe('validateEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass when all required vars are set', () => {
    process.env.TEST_VAR = 'value';
    const result = validateEnvironment(['TEST_VAR']);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should fail when required vars are missing', () => {
    delete process.env.MISSING_VAR;
    const result = validateEnvironment(['MISSING_VAR']);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('ENV_MISSING');
  });

  it('should fail when required vars are empty', () => {
    process.env.EMPTY_VAR = '';
    const result = validateEnvironment(['EMPTY_VAR']);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('ENV_EMPTY');
  });
});

describe('validateTools', () => {
  it('should pass when tool is available', async () => {
    // 'node' should always be available
    const result = await validateTools(['node']);
    expect(result.valid).toBe(true);
  });

  it('should fail when tool is not available', async () => {
    const result = await validateTools(['nonexistent_tool_12345']);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('TOOL_NOT_FOUND');
  });
});
```

**Step 6: Run tests**

```bash
npm test src/validators
```

Expected: PASS

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add pre-flight validation framework

- Environment validator checks required env vars and file paths
- Project validator checks directory structure and Fastfiles
- Tools validator checks required CLI tools are installed
- All validators return structured issues with suggestions"
```

---

### Task 2.2: Integrate Pre-flight into Handlers

**Files:**
- Modify: `src/handlers/build.ts`
- Modify: `src/handlers/index.ts` (add shared preflight runner)

**Step 1: Create handler wrapper with preflight**

```typescript
// src/handlers/withPreflight.ts
import { runPreflight, PreflightContext, formatValidationResult } from '../validators/index.js';
import { formatError } from '../utils/executor.js';

type HandlerResult = { content: Array<{ type: string; text: string }> };
type Handler<T> = (args: T) => Promise<HandlerResult>;

export function withPreflight<T>(
  handler: Handler<T>,
  getContext: (args: T) => PreflightContext
): Handler<T> {
  return async (args: T): Promise<HandlerResult> => {
    const context = getContext(args);
    const preflight = await runPreflight(context);

    if (!preflight.valid) {
      return {
        content: [{
          type: 'text',
          text: `Pre-flight checks failed:\n\n${formatValidationResult(preflight)}`,
        }],
      };
    }

    // Log warnings if any
    if (preflight.issues.length > 0) {
      const warnings = formatValidationResult(preflight);
      // Will be logged to stderr
      process.stderr.write(`Pre-flight warnings:\n${warnings}\n`);
    }

    return handler(args);
  };
}
```

**Step 2: Update build handler**

```typescript
// src/handlers/build.ts
import { BuildArgs } from '../types/index.js';
import { executeFastlane, cleanBuildDirectories, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';
import { withPreflight } from './withPreflight.js';
import { PreflightContext } from '../validators/index.js';

async function buildHandler(args: BuildArgs) {
  const { platform, projectPath, lane = 'build', environment, clean } = args;

  logger.info(`Building ${platform} app...`);

  const envVars: Record<string, string> = {};

  if (environment) {
    envVars.BUILD_ENV = environment;
    logger.debug(`Build environment: ${environment}`);
  }

  try {
    if (clean) {
      await cleanBuildDirectories(platform, projectPath);
      logger.success('Build directories cleaned');
    }

    const result = await executeFastlane(lane, platform, projectPath, envVars);

    if (result.exitCode === 0) {
      logger.success(`Build completed successfully for ${platform}`);
    } else {
      logger.warning(`Build completed with warnings for ${platform}`);
    }

    return formatResult(`Build completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Build failed for ${platform}: ${error}`);
    throw error;
  }
}

function getBuildPreflightContext(args: BuildArgs): PreflightContext {
  return {
    projectPath: args.projectPath,
    platform: args.platform,
    lane: args.lane,
    requiredTools: ['fastlane', args.platform === 'ios' ? 'xcodebuild' : 'gradle'],
  };
}

export const handleBuild = withPreflight(buildHandler, getBuildPreflightContext);
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: integrate pre-flight validation into handlers

Build handler now runs pre-flight checks before execution.
Catches missing tools, invalid paths, and missing lanes early."
```

---

## Phase 3: Error Intelligence

### Task 3.1: Create Error Pattern Library

**Files:**
- Create: `src/errors/patterns.ts`
- Create: `src/errors/diagnosis.ts`
- Create: `src/errors/__tests__/errors.test.ts`

**Step 1: Define error patterns**

```typescript
// src/errors/patterns.ts
export interface ErrorPattern {
  id: string;
  pattern: RegExp;
  category: 'signing' | 'build' | 'credentials' | 'environment' | 'network';
  message: string;
  diagnosis: string;
  suggestions: string[];
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  // Code Signing
  {
    id: 'no_signing_certificate',
    pattern: /No signing certificate|Code Sign error|No certificate/i,
    category: 'signing',
    message: 'Code signing certificate not found',
    diagnosis: 'Your signing certificate is not installed in the keychain or has expired',
    suggestions: [
      "Run 'fastlane match development' to sync certificates",
      'Check Keychain Access for expired certificates',
      'Verify your Apple Developer account has valid certificates',
    ],
  },
  {
    id: 'provisioning_profile_mismatch',
    pattern: /Provisioning profile.*doesn't match|no matching provisioning/i,
    category: 'signing',
    message: 'Provisioning profile mismatch',
    diagnosis: 'The provisioning profile does not match the signing certificate or bundle ID',
    suggestions: [
      "Run 'fastlane match' to regenerate profiles",
      'Verify bundle ID matches in Xcode and Apple Developer Portal',
      'Check that certificate and profile are for the same team',
    ],
  },
  {
    id: 'device_not_registered',
    pattern: /device.*not.*registered|Unable to install.*device/i,
    category: 'signing',
    message: 'Device not registered for development',
    diagnosis: 'This device UDID is not in your provisioning profile',
    suggestions: [
      "Add device UDID to Apple Developer Portal",
      "Run 'fastlane match --force' to regenerate profiles with new device",
      "Use 'fastlane register_devices' to add devices",
    ],
  },

  // Build Errors
  {
    id: 'module_not_found',
    pattern: /No such module|module.*not found|Cannot find module/i,
    category: 'build',
    message: 'Module or dependency not found',
    diagnosis: 'A required module or framework is missing',
    suggestions: [
      "Run 'pod install' for CocoaPods dependencies",
      "Run 'swift package resolve' for SPM dependencies",
      'Check that the module name is spelled correctly',
    ],
  },
  {
    id: 'linker_error',
    pattern: /Linker command failed|ld: symbol|Undefined symbol/i,
    category: 'build',
    message: 'Linker error',
    diagnosis: 'The linker cannot find required symbols or libraries',
    suggestions: [
      'Check that all required frameworks are linked',
      'Verify library search paths in build settings',
      'Clean build folder and rebuild',
    ],
  },

  // Credentials
  {
    id: 'auth_failed',
    pattern: /Authentication failed|Invalid credentials|401 Unauthorized/i,
    category: 'credentials',
    message: 'Authentication failed',
    diagnosis: 'Your credentials are invalid or expired',
    suggestions: [
      'Verify your Apple ID and app-specific password',
      'Check that API keys are correct and not expired',
      'Re-authenticate with fastlane',
    ],
  },
  {
    id: 'rate_limited',
    pattern: /rate limit|too many requests|429/i,
    category: 'credentials',
    message: 'Rate limited',
    diagnosis: 'Too many requests to the API',
    suggestions: [
      'Wait a few minutes before retrying',
      'Check if other CI jobs are running simultaneously',
    ],
  },

  // Environment
  {
    id: 'java_home_not_set',
    pattern: /JAVA_HOME.*not set|No Java runtime present/i,
    category: 'environment',
    message: 'Java not configured',
    diagnosis: 'JAVA_HOME environment variable is not set',
    suggestions: [
      'Install JDK and set JAVA_HOME',
      "Add 'export JAVA_HOME=$(/usr/libexec/java_home)' to your shell profile",
    ],
  },
  {
    id: 'android_sdk_not_found',
    pattern: /SDK location not found|ANDROID_HOME.*not set/i,
    category: 'environment',
    message: 'Android SDK not found',
    diagnosis: 'Android SDK is not installed or ANDROID_HOME is not set',
    suggestions: [
      'Install Android Studio',
      'Set ANDROID_HOME to your SDK location',
      "Typically: export ANDROID_HOME=$HOME/Library/Android/sdk",
    ],
  },
  {
    id: 'xcode_select',
    pattern: /xcrun: error|xcode-select.*error/i,
    category: 'environment',
    message: 'Xcode command line tools issue',
    diagnosis: 'Xcode command line tools are not properly configured',
    suggestions: [
      "Run 'xcode-select --install'",
      "Run 'sudo xcode-select -s /Applications/Xcode.app'",
    ],
  },
];
```

**Step 2: Create diagnosis engine**

```typescript
// src/errors/diagnosis.ts
import { ERROR_PATTERNS, ErrorPattern } from './patterns.js';

export interface DiagnosedError {
  originalError: string;
  matched: boolean;
  pattern?: ErrorPattern;
  message: string;
  diagnosis: string;
  suggestions: string[];
}

export function diagnoseError(errorOutput: string): DiagnosedError {
  // Try to match against known patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(errorOutput)) {
      return {
        originalError: errorOutput,
        matched: true,
        pattern,
        message: pattern.message,
        diagnosis: pattern.diagnosis,
        suggestions: pattern.suggestions,
      };
    }
  }

  // No match - return generic response with original error
  return {
    originalError: errorOutput,
    matched: false,
    message: 'Build or command failed',
    diagnosis: 'An unrecognized error occurred',
    suggestions: [
      'Check the full error output below for details',
      'Search for the error message online',
      'Check fastlane troubleshooting docs',
    ],
  };
}

export function formatDiagnosedError(diagnosed: DiagnosedError): string {
  const lines: string[] = [];

  lines.push(`Error: ${diagnosed.message}`);
  lines.push('');
  lines.push(`Diagnosis: ${diagnosed.diagnosis}`);
  lines.push('');
  lines.push('Suggestions:');
  for (const suggestion of diagnosed.suggestions) {
    lines.push(`  → ${suggestion}`);
  }

  if (!diagnosed.matched || process.env.DEBUG) {
    lines.push('');
    lines.push('Full error output:');
    lines.push(diagnosed.originalError);
  }

  return lines.join('\n');
}
```

**Step 3: Write tests**

```typescript
// src/errors/__tests__/errors.test.ts
import { describe, it, expect } from 'vitest';
import { diagnoseError } from '../diagnosis.js';

describe('diagnoseError', () => {
  it('should diagnose code signing errors', () => {
    const error = 'error: No signing certificate "iOS Development" found';
    const diagnosed = diagnoseError(error);

    expect(diagnosed.matched).toBe(true);
    expect(diagnosed.pattern?.category).toBe('signing');
    expect(diagnosed.suggestions.length).toBeGreaterThan(0);
  });

  it('should diagnose module not found errors', () => {
    const error = "error: No such module 'Firebase'";
    const diagnosed = diagnoseError(error);

    expect(diagnosed.matched).toBe(true);
    expect(diagnosed.pattern?.category).toBe('build');
  });

  it('should handle unrecognized errors gracefully', () => {
    const error = 'Some completely unknown error XYZ123';
    const diagnosed = diagnoseError(error);

    expect(diagnosed.matched).toBe(false);
    expect(diagnosed.suggestions.length).toBeGreaterThan(0);
    expect(diagnosed.originalError).toBe(error);
  });
});
```

**Step 4: Run tests**

```bash
npm test src/errors
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add error intelligence with pattern matching

- Library of 10+ common fastlane error patterns
- Diagnosis engine matches errors to known patterns
- Provides actionable suggestions for each error type
- Graceful fallback for unrecognized errors"
```

---

### Task 3.2: Integrate Error Intelligence into Handlers

**Files:**
- Modify: `src/utils/executor.ts`

**Step 1: Update formatResult to use error intelligence**

```typescript
// src/utils/executor.ts - update formatResult function
import { diagnoseError, formatDiagnosedError } from '../errors/diagnosis.js';

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
    content: [{ type: 'text', text }],
  };
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: integrate error intelligence into command results

Failed commands now return diagnosed errors with clear explanations
and actionable suggestions instead of raw error output."
```

---

## Phase 4-6: Remaining Tasks (Summary)

The remaining phases follow the same pattern. Here's a summary:

### Phase 4: Discovery Service
- Task 4.1: Enhanced lane parsing using `fastlane lanes --json`
- Task 4.2: Create `analyze_project` tool
- Task 4.3: Capability detection (deliver, supply, snapshot, etc.)

### Phase 5: Plugin Advisor
- Task 5.1: Project signal detection (rc files, SPM, Pods)
- Task 5.2: Plugin registry search integration
- Task 5.3: Create `research_plugins` tool
- Task 5.4: Create `manage_plugins` tool

### Phase 6: Certificate Intelligence
- Task 6.1: Match setup detection
- Task 6.2: Certificate consolidation analysis
- Task 6.3: Create `analyze_signing` tool
- Task 6.4: Team onboarding helper

---

## Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test src/utils/__tests__/logger.test.ts

# Build
npm run build

# Start server
npm start
```

## Commit Convention

Use conventional commits:
- `fix:` - Bug fixes
- `feat:` - New features
- `test:` - Test additions
- `docs:` - Documentation
- `refactor:` - Code refactoring

---

**End of Phase 1-3 detailed tasks. Phases 4-6 follow the same TDD pattern.**
