/**
 * Plugins Module
 *
 * Provides tools for detecting project signals and recommending fastlane plugins
 * based on what tools, frameworks, and patterns are being used in a mobile project.
 *
 * Key components:
 * - Signal detection: Identifies project characteristics (signals.ts)
 * - Plugin registry: Searches and recommends plugins based on signals (registry.ts)
 */

export {
  detectProjectSignals,
  extractPodDependencies,
  extractPackageSwiftDependencies,
  extractNpmDependencies,
  extractGradleDependencies,
} from './signals.js';

export type { ProjectSignal } from './signals.js';

export {
  getPluginRecommendations,
  searchPlugins,
  getPluginInfo,
  parsePluginfile,
  filterInstalledPlugins,
} from './registry.js';

export type { PluginInfo, PluginRecommendation } from './registry.js';
