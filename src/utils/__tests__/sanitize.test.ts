import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { sanitizeLaneName, validatePath, validateProjectPath, ValidationError } from '../sanitize.js';

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
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sanitize-test-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('should allow valid paths', async () => {
    // Use the temp directory that exists
    await expect(validatePath(tempDir)).resolves.toBe(tempDir);
  });

  it('should reject paths that do not exist', async () => {
    await expect(validatePath('/nonexistent/path/12345')).rejects.toThrow(ValidationError);
  });

  it('should reject paths with traversal attempts', async () => {
    // Test various traversal patterns - no dependency on specific system files
    await expect(validatePath('../../../etc/passwd')).rejects.toThrow(ValidationError);
    await expect(validatePath('/tmp/../../../etc/passwd')).rejects.toThrow(ValidationError);
    await expect(validatePath('./foo/../../../bar')).rejects.toThrow(ValidationError);
    await expect(validatePath('some/path/../../../other')).rejects.toThrow(ValidationError);
  });

  it('should reject relative path traversal that would escape directory', async () => {
    // This is the key test: relative paths with .. should be rejected
    await expect(validatePath('../../../etc/passwd')).rejects.toThrow("Path contains path traversal sequence '..'");
  });
});

describe('validateProjectPath', () => {
  let tempDir: string;
  let tempFile: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'project-test-'));
    tempFile = join(tempDir, 'test-file.txt');
    await writeFile(tempFile, 'test content');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('should allow valid directory paths', async () => {
    await expect(validateProjectPath(tempDir)).resolves.toBe(tempDir);
  });

  it('should reject file paths (requires directory)', async () => {
    await expect(validateProjectPath(tempFile)).rejects.toThrow('Project path must be a directory');
  });

  it('should reject paths that do not exist', async () => {
    await expect(validateProjectPath('/nonexistent/project/path')).rejects.toThrow(ValidationError);
  });

  it('should reject paths with traversal sequences', async () => {
    await expect(validateProjectPath('../../../etc')).rejects.toThrow("Path contains path traversal sequence '..'");
  });
});
