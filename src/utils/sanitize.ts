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
