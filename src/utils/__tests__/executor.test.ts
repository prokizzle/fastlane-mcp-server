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
