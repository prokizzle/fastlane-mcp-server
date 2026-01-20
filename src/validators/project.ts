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
