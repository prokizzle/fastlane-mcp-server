/**
 * Plugin Registry for fastlane Plugin Advisor
 *
 * This module provides tools for searching the fastlane plugin ecosystem
 * and matching plugins to project signals. It enables the Plugin Advisor
 * to recommend relevant plugins based on detected project characteristics.
 *
 * Key features:
 * - Built-in catalog of commonly used fastlane plugins
 * - Signal-based plugin recommendations
 * - Pluginfile parsing for installed plugin detection
 * - Keyword-based plugin search
 */

import type { ProjectSignal } from './signals.js';
import type { ProjectCapabilities } from '../discovery/capabilities.js';

/**
 * Information about a fastlane plugin
 */
export interface PluginInfo {
  name: string;
  description: string;
  source: 'rubygems' | 'local' | 'git';
  homepage?: string;
  downloads?: number;
  version?: string;
}

/**
 * A plugin recommendation with context about why it was recommended
 */
export interface PluginRecommendation {
  plugin: PluginInfo;
  reason: string;
  relevantSignals: string[]; // names of ProjectSignals that triggered this
  priority: 'high' | 'medium' | 'low';
}

/**
 * Internal catalog entry with additional matching metadata
 */
interface CatalogEntry {
  description: string;
  signals: string[]; // signal names this plugin is relevant for
  capabilities: string[]; // capabilities from discovery module
  homepage?: string;
}

/**
 * Built-in catalog of known fastlane plugins mapped to signals and capabilities
 *
 * This catalog contains commonly used plugins and the project signals/capabilities
 * that indicate they would be useful.
 */
const PLUGIN_CATALOG: Record<string, CatalogEntry> = {
  'fastlane-plugin-firebase_app_distribution': {
    description: 'Distribute builds via Firebase App Distribution for beta testing',
    signals: ['firebase', 'crashlytics'],
    capabilities: ['firebase_app_distribution'],
    homepage: 'https://github.com/fastlane/fastlane-plugin-firebase_app_distribution',
  },
  'fastlane-plugin-appcenter': {
    description: 'Distribute builds and manage apps via Microsoft App Center',
    signals: ['appcenter'],
    capabilities: [],
    homepage: 'https://github.com/microsoft/fastlane-plugin-appcenter',
  },
  'fastlane-plugin-versioning': {
    description: 'Manage version numbers from Xcode or Android projects automatically',
    signals: ['xcode', 'gradle', 'cocoapods', 'swift-package-manager'],
    capabilities: ['build', 'gym', 'gradle'],
    homepage: 'https://github.com/SiarheiFeworka/fastlane-plugin-versioning',
  },
  'fastlane-plugin-badge': {
    description: 'Add version badges and build information to app icons',
    signals: ['xcode', 'gradle'],
    capabilities: ['build', 'gym', 'gradle'],
    homepage: 'https://github.com/HazAT/fastlane-plugin-badge',
  },
  'fastlane-plugin-changelog': {
    description: 'Automate changelog generation from git commits and tags',
    signals: [],
    capabilities: ['deliver', 'supply'],
    homepage: 'https://github.com/pajapro/fastlane-plugin-changelog',
  },
  'fastlane-plugin-sonar': {
    description: 'Upload code analysis results to SonarQube for quality metrics',
    signals: ['sonarqube', 'sonar'],
    capabilities: ['scan'],
    homepage: 'https://github.com/phatblat/fastlane-plugin-sonar',
  },
  'fastlane-plugin-test_center': {
    description: 'Enhanced testing with multi-scan support and test retries',
    signals: ['xcode', 'swiftui', 'uikit'],
    capabilities: ['scan'],
    homepage: 'https://github.com/lyndsey-ferguson/fastlane-plugin-test_center',
  },
  'fastlane-plugin-slack_upload': {
    description: 'Upload files and build artifacts directly to Slack channels',
    signals: ['slack'],
    capabilities: [],
    homepage: 'https://github.com/teriiehina/fastlane-plugin-slack_upload',
  },
  'fastlane-plugin-jira': {
    description: 'Integrate with JIRA for ticket updates and release notes',
    signals: ['jira'],
    capabilities: [],
    homepage: 'https://github.com/valeriomazzeo/fastlane-plugin-jira',
  },
  'fastlane-plugin-sentry': {
    description: 'Upload dSYMs and source maps to Sentry for error tracking',
    signals: ['sentry'],
    capabilities: ['build', 'gym'],
    homepage: 'https://github.com/getsentry/sentry-fastlane-plugin',
  },
  'fastlane-plugin-aws_s3': {
    description: 'Upload builds and artifacts to Amazon S3 buckets',
    signals: ['aws', 's3'],
    capabilities: ['build'],
    homepage: 'https://github.com/joshdholtz/fastlane-plugin-s3',
  },
  'fastlane-plugin-xcconfig': {
    description: 'Manage Xcode build settings through xcconfig files',
    signals: ['xcode', 'xcconfig'],
    capabilities: ['build', 'gym'],
    homepage: 'https://github.com/sovag/fastlane-plugin-xcconfig',
  },
  'fastlane-plugin-match_keychain': {
    description: 'Additional keychain helpers for match code signing',
    signals: ['fastlane-match'],
    capabilities: ['match', 'signing'],
    homepage: 'https://github.com/nicholasprokesch/fastlane-plugin-match_keychain',
  },
  'fastlane-plugin-semantic_release': {
    description: 'Automated versioning based on semantic commit messages',
    signals: [],
    capabilities: ['build', 'deliver', 'supply'],
    homepage: 'https://github.com/xotahal/fastlane-plugin-semantic_release',
  },
  'fastlane-plugin-emerge': {
    description: 'Upload builds to Emerge for app size analysis and monitoring',
    signals: [],
    capabilities: ['build', 'gym'],
    homepage: 'https://github.com/EmergeTools/fastlane-plugin-emerge',
  },
};

/**
 * Get recommendations based on project signals and capabilities
 *
 * Analyzes the detected project signals and capabilities to recommend
 * relevant fastlane plugins that would enhance the development workflow.
 *
 * @param signals - Array of detected project signals
 * @param capabilities - Detected project capabilities
 * @returns Array of plugin recommendations sorted by priority
 */
export function getPluginRecommendations(
  signals: ProjectSignal[],
  capabilities: ProjectCapabilities
): PluginRecommendation[] {
  const recommendations: PluginRecommendation[] = [];
  const seenPlugins = new Set<string>();

  // Extract signal names for matching
  const signalNames = new Set(signals.map(s => s.name.toLowerCase()));

  // Extract capability names for matching
  const capabilityNames = new Set<string>();
  for (const cap of capabilities.build) {
    capabilityNames.add(cap.toLowerCase());
  }
  for (const cap of capabilities.distribution) {
    capabilityNames.add(cap.toLowerCase());
  }
  for (const cap of capabilities.metadata) {
    capabilityNames.add(cap.toLowerCase());
  }
  for (const cap of capabilities.signing) {
    capabilityNames.add(cap.toLowerCase());
  }

  // Check each plugin in catalog
  for (const [pluginName, entry] of Object.entries(PLUGIN_CATALOG)) {
    const matchedSignals: string[] = [];
    const matchedCapabilities: string[] = [];

    // Check signal matches
    for (const signal of entry.signals) {
      if (signalNames.has(signal.toLowerCase())) {
        matchedSignals.push(signal);
      }
    }

    // Check capability matches
    for (const cap of entry.capabilities) {
      if (capabilityNames.has(cap.toLowerCase())) {
        matchedCapabilities.push(cap);
      }
    }

    // If there are matches, create a recommendation
    if (matchedSignals.length > 0 || matchedCapabilities.length > 0) {
      if (!seenPlugins.has(pluginName)) {
        seenPlugins.add(pluginName);

        const relevantSignals = [...matchedSignals, ...matchedCapabilities];
        const priority = determinePriority(matchedSignals.length, matchedCapabilities.length);
        const reason = generateReason(pluginName, matchedSignals, matchedCapabilities);

        recommendations.push({
          plugin: {
            name: pluginName,
            description: entry.description,
            source: 'rubygems',
            homepage: entry.homepage,
          },
          reason,
          relevantSignals,
          priority,
        });
      }
    }
  }

  // Sort by priority (high first, then medium, then low)
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Determine recommendation priority based on match quality
 */
function determinePriority(
  signalMatches: number,
  capabilityMatches: number
): 'high' | 'medium' | 'low' {
  const totalMatches = signalMatches + capabilityMatches;

  if (signalMatches >= 2 || totalMatches >= 3) {
    return 'high';
  } else if (signalMatches >= 1 || totalMatches >= 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generate a human-readable reason for the recommendation
 */
function generateReason(
  pluginName: string,
  matchedSignals: string[],
  matchedCapabilities: string[]
): string {
  const parts: string[] = [];

  if (matchedSignals.length > 0) {
    parts.push(`detected ${matchedSignals.join(', ')} in your project`);
  }

  if (matchedCapabilities.length > 0) {
    parts.push(`enhances ${matchedCapabilities.join(', ')} capabilities`);
  }

  const entry = PLUGIN_CATALOG[pluginName];
  if (entry) {
    return `${entry.description}. Recommended because ${parts.join(' and ')}.`;
  }

  return `Recommended because ${parts.join(' and ')}.`;
}

/**
 * Search plugins by keyword in name or description
 *
 * Performs a case-insensitive search across plugin names and descriptions
 * to find matching plugins in the catalog.
 *
 * @param query - Search keyword
 * @returns Array of matching PluginInfo objects
 */
export function searchPlugins(query: string): PluginInfo[] {
  const results: PluginInfo[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [pluginName, entry] of Object.entries(PLUGIN_CATALOG)) {
    // Match against plugin name or description
    if (
      pluginName.toLowerCase().includes(lowerQuery) ||
      entry.description.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        name: pluginName,
        description: entry.description,
        source: 'rubygems',
        homepage: entry.homepage,
      });
    }
  }

  return results;
}

/**
 * Get info about a specific plugin by name
 *
 * Returns detailed information about a plugin if it exists in the catalog.
 *
 * @param pluginName - The full plugin name (e.g., 'fastlane-plugin-firebase_app_distribution')
 * @returns PluginInfo if found, null otherwise
 */
export function getPluginInfo(pluginName: string): PluginInfo | null {
  const entry = PLUGIN_CATALOG[pluginName];

  if (!entry) {
    return null;
  }

  return {
    name: pluginName,
    description: entry.description,
    source: 'rubygems',
    homepage: entry.homepage,
  };
}

/**
 * Parse Pluginfile content to get list of installed plugins
 *
 * Parses a Ruby Pluginfile to extract gem declarations for fastlane plugins.
 * Handles various gem declaration formats:
 * - gem 'plugin-name'
 * - gem "plugin-name"
 * - gem 'plugin-name', '~> 1.0'
 * - gem 'plugin-name', git: '...'
 *
 * @param content - Content of the Pluginfile
 * @returns Array of plugin names (gem names)
 */
export function parsePluginfile(content: string): string[] {
  const plugins: string[] = [];
  const seen = new Set<string>();

  // Split into lines and process each
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (trimmedLine.startsWith('#') || trimmedLine === '') {
      continue;
    }

    // Match gem declarations: gem 'name' or gem "name"
    // Handles optional version/options that follow
    const gemMatch = trimmedLine.match(/^\s*gem\s+['"]([^'"]+)['"]/);

    if (gemMatch) {
      const pluginName = gemMatch[1];
      if (!seen.has(pluginName)) {
        seen.add(pluginName);
        plugins.push(pluginName);
      }
    }
  }

  return plugins;
}

/**
 * Filter out already installed plugins from recommendations
 *
 * Removes plugins that are already installed from the recommendation list,
 * allowing users to see only new plugins they might want to add.
 *
 * @param recommendations - Array of plugin recommendations
 * @param installedPlugins - Array of installed plugin names
 * @returns Filtered array of recommendations excluding installed plugins
 */
export function filterInstalledPlugins(
  recommendations: PluginRecommendation[],
  installedPlugins: string[]
): PluginRecommendation[] {
  const installedSet = new Set(installedPlugins.map(p => p.toLowerCase()));

  return recommendations.filter(
    rec => !installedSet.has(rec.plugin.name.toLowerCase())
  );
}
