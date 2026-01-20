/**
 * Discovery Service Module
 *
 * Provides tools for analyzing and discovering fastlane project structure,
 * lanes, and configuration.
 */

export {
  parseLanesFromFastfile,
  transformFastlaneJson,
  getLanes,
} from './lanes.js';

export type { LaneInfo } from './lanes.js';

export {
  detectCapabilitiesFromFiles,
  detectCapabilitiesFromFastfile,
  mergeCapabilities,
  createEmptyCapabilities,
} from './capabilities.js';

export type { ProjectCapabilities } from './capabilities.js';
