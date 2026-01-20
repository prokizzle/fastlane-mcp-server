/**
 * Enhanced lane parsing for fastlane discovery service
 *
 * This module provides Ruby-aware parsing of Fastfiles to extract
 * lane information including names, platforms, descriptions, and privacy status.
 */

export interface LaneInfo {
  name: string;
  platform: 'ios' | 'android' | null;
  description: string | null;
  isPrivate: boolean;
}

/**
 * Parse lanes from Fastfile content using Ruby-aware regex
 *
 * This handles:
 * - Platform blocks (platform :ios do ... end)
 * - Lane definitions (lane :name do ... end)
 * - Private lanes (private_lane :name do ... end)
 * - Underscore-prefixed private lanes (_name)
 * - Description blocks (desc "..." or desc '...')
 */
export function parseLanesFromFastfile(content: string): LaneInfo[] {
  const lanes: LaneInfo[] = [];

  // Track current platform context
  let currentPlatform: 'ios' | 'android' | null = null;
  let lastDescription: string | null = null;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Track platform blocks
    const platformMatch = trimmed.match(/^platform\s+:(\w+)\s+do\s*$/);
    if (platformMatch) {
      const platform = platformMatch[1];
      if (platform === 'ios' || platform === 'android') {
        currentPlatform = platform;
      }
      continue;
    }

    // Track description blocks - supports both single and double quotes (must match)
    const descMatch = trimmed.match(/^desc\s+(?:"([^"]+)"|'([^']+)')\s*$/);
    if (descMatch) {
      // Either group 1 (double quotes) or group 2 (single quotes) will have the value
      lastDescription = descMatch[1] || descMatch[2];
      continue;
    }

    // Match lane definitions (both regular and private)
    const laneMatch = trimmed.match(/^(private_lane|lane)\s+:(\w+)\s+do/);
    if (laneMatch) {
      const laneType = laneMatch[1];
      const name = laneMatch[2];
      const isPrivate = laneType === 'private_lane' || name.startsWith('_');

      lanes.push({
        name,
        platform: currentPlatform,
        description: lastDescription,
        isPrivate,
      });

      lastDescription = null; // Reset after use
      continue;
    }

    // Track end statements to manage platform block context
    // We need to be careful here as 'end' can close lanes, if-blocks, etc.
    if (trimmed === 'end' && currentPlatform !== null) {
      // Count block depth to determine if we're closing a platform block
      // This is simplified - a full Ruby parser would track all blocks
      const contentBefore = lines.slice(0, i + 1).join('\n');
      const contentInPlatform = contentBefore.slice(
        contentBefore.lastIndexOf(`platform :${currentPlatform}`)
      );

      // Count 'do' and 'end' occurrences in the platform block
      const doCount = (contentInPlatform.match(/\bdo\b/g) || []).length;
      const endCount = (contentInPlatform.match(/\bend\b/g) || []).length;

      // If ends match dos, we're closing the platform block
      if (endCount >= doCount) {
        currentPlatform = null;
      }
    }
  }

  return lanes;
}

/**
 * Transform fastlane lanes --json output to our LaneInfo format
 *
 * The JSON output from fastlane typically has this structure:
 * {
 *   "ios": [{ "name": "build", "description": "..." }, ...],
 *   "android": [{ "name": "release", "description": "..." }, ...],
 *   "": [{ "name": "shared_lane", ... }]  // Shared lanes
 * }
 */
export function transformFastlaneJson(json: unknown): LaneInfo[] {
  const lanes: LaneInfo[] = [];

  if (typeof json !== 'object' || json === null) {
    return lanes;
  }

  const data = json as Record<string, unknown>;

  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value)) continue;

    // Determine platform from key
    let lanePlatform: 'ios' | 'android' | null = null;
    if (key === 'ios' || key === 'android') {
      lanePlatform = key;
    }
    // Empty string or other keys = shared lanes (null platform)

    for (const lane of value) {
      if (typeof lane === 'object' && lane !== null) {
        const laneObj = lane as Record<string, unknown>;
        const name = String(laneObj.name || '');

        lanes.push({
          name,
          platform: lanePlatform,
          description: laneObj.description ? String(laneObj.description) : null,
          isPrivate: name.startsWith('_'),
        });
      }
    }
  }

  return lanes;
}

/**
 * Get lanes for a project, trying fastlane CLI first then falling back to parsing
 *
 * @param projectPath - Path to the project root
 * @param platform - Optional platform to filter ('ios' or 'android')
 * @returns Array of LaneInfo objects
 */
export async function getLanes(
  projectPath: string,
  platform?: 'ios' | 'android'
): Promise<LaneInfo[]> {
  const { executeCommand } = await import('../utils/executor.js');
  const { promises: fs } = await import('fs');
  const path = await import('path');

  // Determine the directory to work in
  const platformDir = platform
    ? path.default.join(projectPath, platform)
    : projectPath;
  const fastfilePath = path.default.join(platformDir, 'fastlane', 'Fastfile');

  // Try fastlane lanes --json first for reliable parsing
  try {
    const result = await executeCommand('fastlane', ['lanes', '--json'], {
      cwd: platformDir,
      timeout: 30000,
    });

    if (result.exitCode === 0 && result.stdout) {
      // Try to parse the JSON output
      try {
        const parsed = JSON.parse(result.stdout);
        return transformFastlaneJson(parsed);
      } catch {
        // JSON parsing failed, fall through to file parsing
      }
    }
  } catch {
    // Command execution failed, fall through to file parsing
  }

  // Fall back to parsing Fastfile directly
  try {
    const content = await fs.readFile(fastfilePath, 'utf-8');
    return parseLanesFromFastfile(content);
  } catch {
    // File doesn't exist or can't be read
    return [];
  }
}

// Re-export for type checking in tests
export type { LaneInfo as LaneInfoType };
