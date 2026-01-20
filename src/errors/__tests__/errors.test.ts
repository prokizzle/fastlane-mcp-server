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
