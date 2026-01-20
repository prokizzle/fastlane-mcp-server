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
