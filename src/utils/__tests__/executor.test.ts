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

describe('executeCommand timeout', () => {
  it('should timeout if command takes too long', async () => {
    const result = await executeCommand('sleep', ['10'], {
      timeout: 100  // 100ms timeout
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('timed out');
  });
});

describe('formatResult with error intelligence', () => {
  it('should diagnose known errors', async () => {
    const { formatResult } = await import('../executor.js');

    const result = formatResult('Build failed', {
      stdout: '',
      stderr: 'error: No signing certificate "iOS Development" found',
      exitCode: 1,
    });

    expect(result.content[0].text).toContain('Code signing certificate not found');
    expect(result.content[0].text).toContain('Diagnosis:');
    expect(result.content[0].text).toContain('Suggestions:');
  });

  it('should include original error for unrecognized errors', async () => {
    const { formatResult } = await import('../executor.js');

    const result = formatResult('Build failed', {
      stdout: '',
      stderr: 'Some random unrecognized error 12345',
      exitCode: 1,
    });

    expect(result.content[0].text).toContain('Some random unrecognized error 12345');
  });

  it('should format success results normally', async () => {
    const { formatResult } = await import('../executor.js');

    const result = formatResult('Build succeeded', {
      stdout: 'Build complete',
      stderr: '',
      exitCode: 0,
    });

    expect(result.content[0].text).toContain('Build succeeded');
    expect(result.content[0].text).toContain('Output:');
    expect(result.content[0].text).toContain('Build complete');
    expect(result.content[0].text).not.toContain('Diagnosis:');
  });

  it('should show warnings for success with stderr', async () => {
    const { formatResult } = await import('../executor.js');

    const result = formatResult('Build succeeded', {
      stdout: 'Build complete',
      stderr: 'warning: deprecated API',
      exitCode: 0,
    });

    expect(result.content[0].text).toContain('Warnings:');
    expect(result.content[0].text).toContain('deprecated API');
    expect(result.content[0].text).not.toContain('Diagnosis:');
  });
});
