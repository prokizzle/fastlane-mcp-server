import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from '../environment.js';
import { validateTools } from '../tools.js';

describe('validateEnvironment', () => {
  // Store vars we create so we can clean them up
  const testVars: string[] = [];

  afterEach(() => {
    // Clean up test vars
    for (const varName of testVars) {
      delete process.env[varName];
    }
    testVars.length = 0;
  });

  it('should pass when all required vars are set', () => {
    testVars.push('TEST_VAR_SET');
    process.env.TEST_VAR_SET = 'value';
    const result = validateEnvironment(['TEST_VAR_SET']);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should fail when required vars are missing', () => {
    // Use a unique var name that definitely doesn't exist
    delete process.env.MISSING_VAR_TEST_12345;
    const result = validateEnvironment(['MISSING_VAR_TEST_12345']);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('ENV_MISSING');
  });

  it('should fail when required vars are empty', () => {
    testVars.push('EMPTY_VAR_TEST');
    process.env.EMPTY_VAR_TEST = '';
    const result = validateEnvironment(['EMPTY_VAR_TEST']);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('ENV_EMPTY');
  });

  it('should warn about relative paths for file path env vars', () => {
    testVars.push('APP_STORE_CONNECT_API_KEY_KEY_FILEPATH');
    process.env.APP_STORE_CONNECT_API_KEY_KEY_FILEPATH = 'relative/path/key.p8';
    const result = validateEnvironment(['APP_STORE_CONNECT_API_KEY_KEY_FILEPATH']);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('ENV_PATH_RELATIVE');
    expect(result.issues[0].level).toBe('warning');
  });

  it('should not warn about absolute paths for file path env vars', () => {
    testVars.push('APP_STORE_CONNECT_API_KEY_KEY_FILEPATH');
    process.env.APP_STORE_CONNECT_API_KEY_KEY_FILEPATH = '/absolute/path/key.p8';
    const result = validateEnvironment(['APP_STORE_CONNECT_API_KEY_KEY_FILEPATH']);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should check multiple vars and report all issues', () => {
    testVars.push('VAR2_TEST', 'VAR3_TEST');
    delete process.env.VAR1_TEST_MISSING;
    process.env.VAR2_TEST = '';
    process.env.VAR3_TEST = 'valid';
    const result = validateEnvironment(['VAR1_TEST_MISSING', 'VAR2_TEST', 'VAR3_TEST']);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].code).toBe('ENV_MISSING');
    expect(result.issues[1].code).toBe('ENV_EMPTY');
  });
});

describe('validateTools', () => {
  it('should pass when tool is available', async () => {
    const result = await validateTools(['node']);
    expect(result.valid).toBe(true);
  });

  it('should fail when tool is not available', async () => {
    const result = await validateTools(['nonexistent_tool_12345']);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('TOOL_NOT_FOUND');
  });

  it('should provide install suggestion for known tools', async () => {
    const result = await validateTools(['fastlane']);
    // This test depends on whether fastlane is installed
    if (!result.valid) {
      expect(result.issues[0].suggestion).toContain('gem install fastlane');
    }
  });

  it('should check multiple tools and report all issues', async () => {
    const result = await validateTools(['nonexistent_tool_1', 'nonexistent_tool_2']);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(2);
  });
});
