/**
 * Project Analysis for fastlane discovery service
 *
 * This module provides comprehensive project analysis combining:
 * - Lane parsing from Fastfiles
 * - Capability detection from files and content
 * - Signing method detection
 * - Distribution destination detection
 * - Environment validation
 * - Suggested action generation
 */

import { LaneInfo, parseLanesFromFastfile } from './lanes.js';
import {
  ProjectCapabilities,
  detectCapabilitiesFromFiles,
  detectCapabilitiesFromFastfile,
  mergeCapabilities,
  createEmptyCapabilities,
} from './capabilities.js';
import { validateEnvironment } from '../validators/environment.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Analysis results for a specific platform (iOS or Android)
 */
export interface PlatformAnalysis {
  /** Lanes available for this platform */
  lanes: LaneInfo[];
  /** Code signing method: 'match' (automated), 'manual', or 'unknown' */
  signing: 'match' | 'manual' | 'unknown';
  /** Distribution destinations detected (e.g., 'testflight', 'firebase') */
  destinations: string[];
  /** Whether metadata directory or Deliverfile exists */
  hasMetadata: boolean;
}

/**
 * Environment status indicating readiness
 */
export interface EnvironmentStatus {
  /** Overall status: 'ready' or 'issues' */
  status: 'ready' | 'issues';
  /** List of environment issues found */
  issues: string[];
}

/**
 * Complete project analysis result
 */
export interface ProjectAnalysis {
  /** Platforms detected in the project */
  platforms: ('ios' | 'android')[];
  /** iOS platform analysis (if iOS detected) */
  ios?: PlatformAnalysis;
  /** Android platform analysis (if Android detected) */
  android?: PlatformAnalysis;
  /** Environment configuration status */
  environment: EnvironmentStatus;
  /** Detected project capabilities */
  capabilities: ProjectCapabilities;
  /** Suggested actions based on detected capabilities */
  suggestedActions: string[];
}

/**
 * Directories to skip during file listing
 */
const SKIP_DIRECTORIES = [
  'node_modules',
  '.git',
  'build',
  'DerivedData',
  'Pods',
  '.gradle',
  '.idea',
  '.vscode',
];

/**
 * Detect signing method for a platform based on project files
 *
 * For iOS:
 * - Returns 'match' if Matchfile is found
 * - Returns 'manual' if exportOptions.plist or .mobileprovision files exist
 * - Returns 'unknown' otherwise
 *
 * For Android:
 * - Returns 'manual' if .keystore or .jks files exist
 * - Returns 'unknown' otherwise
 *
 * @param files - Array of file paths in the project
 * @param platform - Platform to detect signing for
 * @returns Detected signing method
 */
export function detectSigningMethod(
  files: string[],
  platform: 'ios' | 'android'
): 'match' | 'manual' | 'unknown' {
  if (platform === 'ios') {
    // Check for match (highest priority)
    if (files.some((f) => f.includes('Matchfile'))) {
      return 'match';
    }
    // Check for manual signing indicators
    if (
      files.some(
        (f) => f.includes('exportOptions.plist') || f.includes('.mobileprovision')
      )
    ) {
      return 'manual';
    }
  }

  if (platform === 'android') {
    // Check for keystore references
    if (files.some((f) => f.includes('.keystore') || f.includes('.jks'))) {
      return 'manual';
    }
  }

  return 'unknown';
}

/**
 * Detect distribution destinations based on capabilities and platform
 *
 * Maps capability names to user-friendly destination names:
 * - iOS: pilot -> testflight, deliver -> app_store
 * - Android: supply -> play_store
 * - Cross-platform: firebase_app_distribution -> firebase
 *
 * @param capabilities - Detected project capabilities
 * @param platform - Platform to detect destinations for
 * @returns Array of destination names
 */
export function detectDestinations(
  capabilities: ProjectCapabilities,
  platform: 'ios' | 'android'
): string[] {
  const destinations: string[] = [];

  if (platform === 'ios') {
    if (capabilities.distribution.includes('pilot')) {
      destinations.push('testflight');
    }
    if (capabilities.distribution.includes('deliver')) {
      destinations.push('app_store');
    }
  }

  if (platform === 'android') {
    if (capabilities.distribution.includes('supply')) {
      destinations.push('play_store');
    }
  }

  // Cross-platform destinations
  if (capabilities.distribution.includes('firebase_app_distribution')) {
    destinations.push('firebase');
  }

  return destinations;
}

/**
 * Generate suggested actions based on detected capabilities
 *
 * Creates human-readable action suggestions for each detected capability,
 * organized by category (build, distribution, signing, metadata).
 *
 * @param capabilities - Detected project capabilities
 * @returns Array of suggested action strings
 */
export function generateSuggestedActions(
  capabilities: ProjectCapabilities
): string[] {
  const actions: string[] = [];

  // Build actions
  if (capabilities.build.includes('gym')) {
    actions.push('Build iOS app with gym');
  }
  if (capabilities.build.includes('gradle')) {
    actions.push('Build Android app with gradle');
  }
  if (capabilities.build.includes('scan')) {
    actions.push('Run tests with scan');
  }
  if (capabilities.build.includes('snapshot')) {
    actions.push('Capture screenshots with snapshot');
  }

  // Distribution actions
  if (capabilities.distribution.includes('pilot')) {
    actions.push('Upload to TestFlight');
  }
  if (capabilities.distribution.includes('deliver')) {
    actions.push('Upload to App Store');
  }
  if (capabilities.distribution.includes('supply')) {
    actions.push('Upload to Play Store');
  }
  if (capabilities.distribution.includes('firebase_app_distribution')) {
    actions.push('Distribute via Firebase App Distribution');
  }

  // Signing actions
  if (capabilities.signing.includes('match')) {
    actions.push('Sync certificates with match');
  }

  // Metadata actions
  if (capabilities.metadata.includes('deliver')) {
    actions.push('Upload App Store metadata');
  }
  if (capabilities.metadata.includes('frameit')) {
    actions.push('Frame screenshots with frameit');
  }

  return actions;
}

/**
 * List files in a directory recursively with depth limit
 *
 * Skips common non-essential directories (node_modules, .git, build, etc.)
 * to improve performance and focus on relevant project files.
 *
 * @param projectPath - Root path of the project
 * @param maxDepth - Maximum directory depth to scan (default: 3)
 * @returns Array of relative file paths
 */
export async function listProjectFiles(
  projectPath: string,
  maxDepth = 3
): Promise<string[]> {
  const files: string[] = [];

  async function scan(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip common non-essential directories
        if (SKIP_DIRECTORIES.includes(entry.name)) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          files.push(relativePath + '/');
          await scan(fullPath, depth + 1);
        } else {
          files.push(relativePath);
        }
      }
    } catch {
      // Directory not accessible - silently skip
    }
  }

  await scan(projectPath, 0);
  return files;
}

/**
 * Main project analysis function
 *
 * Performs comprehensive analysis of a fastlane project:
 * 1. Lists all relevant project files
 * 2. Detects capabilities from file structure
 * 3. Parses Fastfiles for lanes and additional capabilities
 * 4. Determines platforms and their specific configurations
 * 5. Checks environment requirements
 * 6. Generates suggested actions
 *
 * @param projectPath - Path to the project root
 * @returns Complete project analysis
 */
export async function analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
  // List files in project
  const files = await listProjectFiles(projectPath);

  // Detect capabilities from files
  const fileCapabilities = detectCapabilitiesFromFiles(files);

  // Try to read and parse Fastfiles
  let fastfileCapabilities = createEmptyCapabilities();
  const allLanes: LaneInfo[] = [];

  // Check root fastlane directory
  const rootFastfile = path.join(projectPath, 'fastlane', 'Fastfile');
  try {
    const content = await fs.readFile(rootFastfile, 'utf-8');
    fastfileCapabilities = mergeCapabilities(
      fastfileCapabilities,
      detectCapabilitiesFromFastfile(content)
    );
    allLanes.push(...parseLanesFromFastfile(content));
  } catch {
    // No root fastfile - continue
  }

  // Check platform-specific fastlane directories
  for (const platform of ['ios', 'android'] as const) {
    const platformFastfile = path.join(
      projectPath,
      platform,
      'fastlane',
      'Fastfile'
    );
    try {
      const content = await fs.readFile(platformFastfile, 'utf-8');
      fastfileCapabilities = mergeCapabilities(
        fastfileCapabilities,
        detectCapabilitiesFromFastfile(content)
      );
      const platformLanes = parseLanesFromFastfile(content);
      // Tag lanes with platform if not already set
      for (const lane of platformLanes) {
        if (!lane.platform) {
          lane.platform = platform;
        }
        allLanes.push(lane);
      }
    } catch {
      // No platform fastfile - continue
    }
  }

  // Merge all capabilities
  const capabilities = mergeCapabilities(fileCapabilities, fastfileCapabilities);

  // Determine platforms
  const platforms = capabilities.platforms;

  // Build result with base structure
  const result: ProjectAnalysis = {
    platforms,
    environment: { status: 'ready', issues: [] },
    capabilities,
    suggestedActions: generateSuggestedActions(capabilities),
  };

  // Add iOS platform analysis if detected
  if (platforms.includes('ios')) {
    result.ios = {
      lanes: allLanes.filter((l) => l.platform === 'ios' || l.platform === null),
      signing: detectSigningMethod(files, 'ios'),
      destinations: detectDestinations(capabilities, 'ios'),
      hasMetadata: files.some(
        (f) => f.includes('metadata/') || f.includes('Deliverfile')
      ),
    };
  }

  // Add Android platform analysis if detected
  if (platforms.includes('android')) {
    result.android = {
      lanes: allLanes.filter(
        (l) => l.platform === 'android' || l.platform === null
      ),
      signing: detectSigningMethod(files, 'android'),
      destinations: detectDestinations(capabilities, 'android'),
      hasMetadata: files.some(
        (f) => f.includes('supply/') || f.includes('metadata/')
      ),
    };
  }

  // Check environment requirements
  const envVars: string[] = [];
  if (
    capabilities.distribution.includes('pilot') ||
    capabilities.distribution.includes('deliver')
  ) {
    envVars.push('FASTLANE_USER');
  }
  if (capabilities.signing.includes('match')) {
    envVars.push('MATCH_PASSWORD');
  }

  if (envVars.length > 0) {
    const envResult = validateEnvironment(envVars);
    if (!envResult.valid) {
      result.environment = {
        status: 'issues',
        issues: envResult.issues.map((i) => i.message),
      };
    }
  }

  return result;
}
