/**
 * Plugins Module
 *
 * Provides tools for detecting project signals and recommending fastlane plugins
 * based on what tools, frameworks, and patterns are being used in a mobile project.
 */

export {
  detectProjectSignals,
  extractPodDependencies,
  extractPackageSwiftDependencies,
  extractNpmDependencies,
  extractGradleDependencies,
} from './signals.js';

export type { ProjectSignal } from './signals.js';
