/**
 * Capability Detection for fastlane discovery service
 *
 * This module detects what fastlane toolkit capabilities are available
 * in a project by analyzing config files, Fastfile content, and project structure.
 *
 * Capability categories:
 * - Build: gym, gradle, scan, snapshot
 * - Distribution: pilot, deliver, supply, firebase_app_distribution
 * - Metadata: deliver, supply, frameit, precheck
 * - Signing: match, cert, sigh, register_devices
 */

export interface ProjectCapabilities {
  platforms: ('ios' | 'android')[];
  build: string[];
  distribution: string[];
  metadata: string[];
  signing: string[];
}

/**
 * Config files that indicate specific capabilities
 */
const CONFIG_FILE_INDICATORS: Record<
  string,
  { category: keyof Omit<ProjectCapabilities, 'platforms'>; capability: string }
> = {
  Matchfile: { category: 'signing', capability: 'match' },
  Deliverfile: { category: 'distribution', capability: 'deliver' },
  Gymfile: { category: 'build', capability: 'gym' },
  Snapfile: { category: 'build', capability: 'snapshot' },
  Scanfile: { category: 'build', capability: 'scan' },
  Precheckfile: { category: 'metadata', capability: 'precheck' },
  Appfile: { category: 'metadata', capability: 'appfile' },
};

/**
 * Platform indicators - file patterns that suggest a specific platform
 */
const PLATFORM_INDICATORS: Record<string, 'ios' | 'android'> = {
  '.xcodeproj': 'ios',
  '.xcworkspace': 'ios',
  Podfile: 'ios',
  'build.gradle': 'android',
  'settings.gradle': 'android',
  'AndroidManifest.xml': 'android',
};

/**
 * Actions that indicate capabilities when found in Fastfile
 * Maps action name to its capability category and normalized capability name
 */
const ACTION_CAPABILITIES: Record<
  string,
  { category: keyof Omit<ProjectCapabilities, 'platforms'>; capability: string }
> = {
  // Build capabilities
  gym: { category: 'build', capability: 'gym' },
  build_app: { category: 'build', capability: 'gym' },
  gradle: { category: 'build', capability: 'gradle' },
  scan: { category: 'build', capability: 'scan' },
  run_tests: { category: 'build', capability: 'scan' },
  snapshot: { category: 'build', capability: 'snapshot' },
  capture_screenshots: { category: 'build', capability: 'snapshot' },

  // Distribution capabilities
  pilot: { category: 'distribution', capability: 'pilot' },
  upload_to_testflight: { category: 'distribution', capability: 'pilot' },
  deliver: { category: 'distribution', capability: 'deliver' },
  upload_to_app_store: { category: 'distribution', capability: 'deliver' },
  supply: { category: 'distribution', capability: 'supply' },
  upload_to_play_store: { category: 'distribution', capability: 'supply' },
  firebase_app_distribution: {
    category: 'distribution',
    capability: 'firebase_app_distribution',
  },

  // Signing capabilities
  match: { category: 'signing', capability: 'match' },
  sync_code_signing: { category: 'signing', capability: 'match' },
  cert: { category: 'signing', capability: 'cert' },
  get_certificates: { category: 'signing', capability: 'cert' },
  sigh: { category: 'signing', capability: 'sigh' },
  get_provisioning_profile: { category: 'signing', capability: 'sigh' },
  register_devices: { category: 'signing', capability: 'register_devices' },

  // Metadata capabilities
  frameit: { category: 'metadata', capability: 'frameit' },
  frame_screenshots: { category: 'metadata', capability: 'frameit' },
  precheck: { category: 'metadata', capability: 'precheck' },
};

/**
 * Create an empty ProjectCapabilities object
 */
export function createEmptyCapabilities(): ProjectCapabilities {
  return {
    platforms: [],
    build: [],
    distribution: [],
    metadata: [],
    signing: [],
  };
}

/**
 * Add an item to an array if it doesn't already exist
 */
function addUnique<T>(array: T[], item: T): void {
  if (!array.includes(item)) {
    array.push(item);
  }
}

/**
 * Detect capabilities from a list of file paths
 *
 * This analyzes file paths to detect:
 * - Config files (Matchfile, Deliverfile, Gymfile, etc.)
 * - Platform indicators (xcodeproj, build.gradle, etc.)
 * - Directory structure (ios/, android/)
 *
 * @param files - Array of file paths (relative or absolute)
 * @returns Detected project capabilities
 */
export function detectCapabilitiesFromFiles(files: string[]): ProjectCapabilities {
  const capabilities = createEmptyCapabilities();

  for (const file of files) {
    const filename = file.split('/').pop() || '';

    // Check config files
    for (const [configFile, indicator] of Object.entries(CONFIG_FILE_INDICATORS)) {
      if (filename === configFile || file.includes(`fastlane/${configFile}`)) {
        addUnique(capabilities[indicator.category], indicator.capability);
      }
    }

    // Check platform indicators
    for (const [indicator, platform] of Object.entries(PLATFORM_INDICATORS)) {
      if (file.includes(indicator)) {
        addUnique(capabilities.platforms, platform);
      }
    }

    // iOS directory structure
    if (file.startsWith('ios/') || file.includes('/ios/')) {
      addUnique(capabilities.platforms, 'ios');
    }

    // Android directory structure
    if (file.startsWith('android/') || file.includes('/android/')) {
      addUnique(capabilities.platforms, 'android');
    }

    // Deliverfile also indicates metadata capability
    if (filename === 'Deliverfile' || file.includes('metadata/')) {
      addUnique(capabilities.metadata, 'deliver');
    }
  }

  // If we have Android platform, add gradle as a build capability
  if (capabilities.platforms.includes('android')) {
    addUnique(capabilities.build, 'gradle');
  }

  return capabilities;
}

/**
 * Remove Ruby comments from content while preserving strings
 *
 * This is a simplified approach that handles common cases:
 * - Full line comments (# comment)
 * - End of line comments (code # comment)
 *
 * Note: This doesn't handle all edge cases like # inside strings,
 * but it's sufficient for detecting action calls.
 */
function removeComments(content: string): string {
  const lines = content.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    // Find the first # that's not inside a string
    let inString = false;
    let stringChar = '';
    let commentStart = -1;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';

      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '#') {
          commentStart = i;
          break;
        }
      } else {
        // Check for escaped quotes
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = '';
        }
      }
    }

    if (commentStart === 0) {
      // Full line comment, skip entirely
      cleanedLines.push('');
    } else if (commentStart > 0) {
      // Partial line comment, keep the code part
      cleanedLines.push(line.substring(0, commentStart));
    } else {
      // No comment
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n');
}

/**
 * Detect capabilities from Fastfile content by finding action calls
 *
 * This parses Fastfile content to find usage of fastlane actions
 * and maps them to their corresponding capabilities.
 *
 * @param content - Fastfile content as a string
 * @returns Detected project capabilities
 */
export function detectCapabilitiesFromFastfile(content: string): ProjectCapabilities {
  const capabilities = createEmptyCapabilities();

  if (!content) {
    return capabilities;
  }

  // Remove comments to avoid false positives
  const cleanedContent = removeComments(content);

  // Match action calls like: action_name, action_name(, action_name do
  // Using word boundaries to avoid partial matches
  for (const [action, indicator] of Object.entries(ACTION_CAPABILITIES)) {
    // Pattern matches:
    // - action_name( - function call with parentheses
    // - action_name do - block form
    // - action_name at end of line or followed by whitespace/newline (simple call)
    const pattern = new RegExp(
      `\\b${action}\\b(?:\\s*\\(|\\s+do\\b|\\s*$|\\s+[^\\w])`,
      'm'
    );

    if (pattern.test(cleanedContent)) {
      addUnique(capabilities[indicator.category], indicator.capability);
    }
  }

  return capabilities;
}

/**
 * Merge multiple capability objects into one
 *
 * This is useful for combining capabilities detected from different sources
 * (files, Fastfile content, etc.) into a single comprehensive result.
 *
 * @param caps - Array of ProjectCapabilities to merge
 * @returns Merged ProjectCapabilities with no duplicates
 */
export function mergeCapabilities(...caps: ProjectCapabilities[]): ProjectCapabilities {
  const result = createEmptyCapabilities();

  for (const cap of caps) {
    for (const platform of cap.platforms) {
      addUnique(result.platforms, platform);
    }
    for (const item of cap.build) {
      addUnique(result.build, item);
    }
    for (const item of cap.distribution) {
      addUnique(result.distribution, item);
    }
    for (const item of cap.metadata) {
      addUnique(result.metadata, item);
    }
    for (const item of cap.signing) {
      addUnique(result.signing, item);
    }
  }

  return result;
}
