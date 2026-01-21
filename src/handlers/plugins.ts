/**
 * MCP Handler for research_plugins tool
 *
 * Analyzes a project and recommends relevant fastlane plugins based on
 * detected project signals and capabilities.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { validateProjectPath } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';
import { detectProjectSignals, ProjectSignal } from '../plugins/signals.js';
import {
  getPluginRecommendations,
  parsePluginfile,
  filterInstalledPlugins,
  PluginRecommendation,
  searchPlugins,
  getPluginInfo,
  PluginInfo,
} from '../plugins/registry.js';
import {
  detectCapabilitiesFromFiles,
  detectCapabilitiesFromFastfile,
  mergeCapabilities,
  createEmptyCapabilities,
  ProjectCapabilities,
} from '../discovery/capabilities.js';
import { listProjectFiles } from '../discovery/analyze.js';

/**
 * Arguments for the research_plugins tool
 */
export interface ResearchPluginsArgs {
  projectPath: string;
  platform?: 'ios' | 'android';
  includeInstalled?: boolean; // default false - exclude already installed plugins
}

/**
 * Result structure for plugin research
 */
interface PluginResearchResult {
  recommendations: PluginRecommendation[];
  installedPlugins: string[];
  signals: ProjectSignal[];
  capabilities: ProjectCapabilities;
}

/**
 * Check if an error is a ValidationError by checking its name property
 */
function isValidationError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'ValidationError';
}

/**
 * Read Pluginfile from project and parse installed plugins
 */
async function getInstalledPlugins(projectPath: string): Promise<string[]> {
  const pluginfilePaths = [
    path.join(projectPath, 'fastlane', 'Pluginfile'),
    path.join(projectPath, 'Pluginfile'),
    path.join(projectPath, 'ios', 'fastlane', 'Pluginfile'),
    path.join(projectPath, 'android', 'fastlane', 'Pluginfile'),
  ];

  for (const pluginfilePath of pluginfilePaths) {
    try {
      const content = await fs.readFile(pluginfilePath, 'utf-8');
      return parsePluginfile(content);
    } catch {
      // Try next path
    }
  }

  return [];
}

/**
 * Detect capabilities from the project by analyzing files and Fastfiles
 */
async function detectProjectCapabilities(projectPath: string): Promise<ProjectCapabilities> {
  // List files in project
  const files = await listProjectFiles(projectPath);

  // Detect capabilities from files
  const fileCapabilities = detectCapabilitiesFromFiles(files);

  // Try to read and parse Fastfiles for more capabilities
  let fastfileCapabilities = createEmptyCapabilities();

  const fastfilePaths = [
    path.join(projectPath, 'fastlane', 'Fastfile'),
    path.join(projectPath, 'ios', 'fastlane', 'Fastfile'),
    path.join(projectPath, 'android', 'fastlane', 'Fastfile'),
  ];

  for (const fastfilePath of fastfilePaths) {
    try {
      const content = await fs.readFile(fastfilePath, 'utf-8');
      fastfileCapabilities = mergeCapabilities(
        fastfileCapabilities,
        detectCapabilitiesFromFastfile(content)
      );
    } catch {
      // File doesn't exist - continue
    }
  }

  return mergeCapabilities(fileCapabilities, fastfileCapabilities);
}

/**
 * Filter recommendations by platform if specified
 */
function filterByPlatform(
  recommendations: PluginRecommendation[],
  platform: 'ios' | 'android' | undefined
): PluginRecommendation[] {
  if (!platform) {
    return recommendations;
  }

  // Platform-specific signal mappings
  const iosSignals = ['xcode', 'cocoapods', 'swift-package-manager', 'swiftui', 'uikit', 'combine'];
  const androidSignals = ['gradle', 'kotlin', 'java'];

  const relevantSignals = platform === 'ios' ? iosSignals : androidSignals;
  const crossPlatformPlugins = [
    'fastlane-plugin-firebase_app_distribution',
    'fastlane-plugin-appcenter',
    'fastlane-plugin-changelog',
    'fastlane-plugin-semantic_release',
    'fastlane-plugin-sentry',
  ];

  return recommendations.filter((rec) => {
    // Always include cross-platform plugins
    if (crossPlatformPlugins.includes(rec.plugin.name)) {
      return true;
    }

    // Include if any relevant signal matches
    return rec.relevantSignals.some((signal) =>
      relevantSignals.some((rs) => signal.toLowerCase().includes(rs.toLowerCase()))
    );
  });
}

/**
 * Core research logic - shared between text and JSON handlers
 */
async function researchPlugins(
  projectPath: string,
  platform?: 'ios' | 'android',
  includeInstalled?: boolean
): Promise<PluginResearchResult> {
  // Detect project signals
  const signals = await detectProjectSignals(projectPath);

  // Detect capabilities
  const capabilities = await detectProjectCapabilities(projectPath);

  // Get installed plugins from Pluginfile
  const installedPlugins = await getInstalledPlugins(projectPath);

  // Get plugin recommendations
  let recommendations = getPluginRecommendations(signals, capabilities);

  // Filter by platform if specified
  if (platform) {
    recommendations = filterByPlatform(recommendations, platform);
  }

  // Filter out installed plugins unless includeInstalled is true
  if (!includeInstalled) {
    recommendations = filterInstalledPlugins(recommendations, installedPlugins);
  }

  return {
    recommendations,
    installedPlugins,
    signals,
    capabilities,
  };
}

/**
 * Format recommendations as a human-readable report
 */
function formatReport(
  result: PluginResearchResult,
  includeInstalled: boolean
): string {
  const lines: string[] = [];

  lines.push('## Plugin Recommendations for Your Project\n');

  if (result.recommendations.length === 0 && result.installedPlugins.length === 0) {
    lines.push('No plugin recommendations found for your project configuration.\n');
    lines.push('This could mean:');
    lines.push('- Your project signals did not match any plugins in our catalog');
    lines.push('- Consider running `fastlane search_plugins` for more options');
    return lines.join('\n');
  }

  if (result.recommendations.length > 0) {
    lines.push('Based on analysis of your project, here are recommended fastlane plugins:\n');

    // Group by priority
    const highPriority = result.recommendations.filter((r) => r.priority === 'high');
    const mediumPriority = result.recommendations.filter((r) => r.priority === 'medium');
    const lowPriority = result.recommendations.filter((r) => r.priority === 'low');

    if (highPriority.length > 0) {
      lines.push('### High Priority\n');
      for (const rec of highPriority) {
        lines.push(formatRecommendation(rec));
      }
    }

    if (mediumPriority.length > 0) {
      lines.push('### Medium Priority\n');
      for (const rec of mediumPriority) {
        lines.push(formatRecommendation(rec));
      }
    }

    if (lowPriority.length > 0) {
      lines.push('### Low Priority\n');
      for (const rec of lowPriority) {
        lines.push(formatRecommendation(rec));
      }
    }
  } else {
    lines.push('No new plugin recommendations - all suggested plugins are already installed.\n');
  }

  // Show installed plugins if requested
  if (includeInstalled && result.installedPlugins.length > 0) {
    lines.push('### Already Installed\n');
    for (const plugin of result.installedPlugins) {
      lines.push(`- ${plugin} (already in Pluginfile)`);
    }
    lines.push('');
  }

  // Summary of detected signals
  if (result.signals.length > 0) {
    lines.push('### Detected Project Signals\n');
    const signalsByCategory = groupSignalsByCategory(result.signals);
    for (const [category, categorySignals] of Object.entries(signalsByCategory)) {
      const names = categorySignals.map((s) => s.name).join(', ');
      lines.push(`- **${capitalize(category)}:** ${names}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a single recommendation
 */
function formatRecommendation(rec: PluginRecommendation): string {
  const lines: string[] = [];
  lines.push(`**${rec.plugin.name}**`);
  lines.push(`- ${rec.plugin.description}`);
  lines.push(`- Reason: ${rec.reason}`);
  lines.push(`- Install: \`gem '${rec.plugin.name}'\``);
  if (rec.plugin.homepage) {
    lines.push(`- Homepage: ${rec.plugin.homepage}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Group signals by category
 */
function groupSignalsByCategory(
  signals: ProjectSignal[]
): Record<string, ProjectSignal[]> {
  const grouped: Record<string, ProjectSignal[]> = {};
  for (const signal of signals) {
    if (!grouped[signal.category]) {
      grouped[signal.category] = [];
    }
    grouped[signal.category].push(signal);
  }
  return grouped;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Handle research_plugins MCP tool call
 *
 * Analyzes a project to detect signals and capabilities, then recommends
 * relevant fastlane plugins based on what's detected.
 */
export async function handleResearchPlugins(args: ResearchPluginsArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { projectPath, platform, includeInstalled = false } = args;

  // Validate project path
  let validatedPath: string;
  try {
    validatedPath = await validateProjectPath(projectPath);
  } catch (error) {
    if (isValidationError(error)) {
      logger.error(`Invalid project path: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }

  logger.info(`Researching plugins for project at: ${validatedPath}`);

  try {
    const result = await researchPlugins(validatedPath, platform, includeInstalled);
    const text = formatReport(result, includeInstalled);

    logger.success(
      `Plugin research complete: ${result.recommendations.length} recommendation(s), ${result.signals.length} signal(s) detected`
    );

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Plugin research failed: ${message}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error researching plugins: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle research_plugins MCP tool call with JSON output
 *
 * Returns the same data as handleResearchPlugins but formatted as JSON
 * for programmatic consumption.
 */
export async function handleResearchPluginsJson(args: ResearchPluginsArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { projectPath, platform, includeInstalled = false } = args;

  // Validate project path
  let validatedPath: string;
  try {
    validatedPath = await validateProjectPath(projectPath);
  } catch (error) {
    if (isValidationError(error)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }

  try {
    const result = await researchPlugins(validatedPath, platform, includeInstalled);

    // Format for JSON output
    const jsonOutput = {
      recommendations: result.recommendations.map((rec) => ({
        name: rec.plugin.name,
        description: rec.plugin.description,
        reason: rec.reason,
        priority: rec.priority,
        relevantSignals: rec.relevantSignals,
        homepage: rec.plugin.homepage,
        installCommand: `gem '${rec.plugin.name}'`,
      })),
      installedPlugins: result.installedPlugins,
      signals: result.signals.map((s) => ({
        category: s.category,
        name: s.name,
        source: s.source,
        confidence: s.confidence,
      })),
      capabilities: result.capabilities,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(jsonOutput, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Search Plugins Handler
// =============================================================================

/**
 * Arguments for the search_plugins tool
 */
export interface SearchPluginsArgs {
  query: string;
}

/**
 * Handle search_plugins MCP tool call
 *
 * Searches for fastlane plugins by keyword in name or description.
 */
export async function handleSearchPlugins(args: SearchPluginsArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { query } = args;

  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    logger.error('Search query is required');
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Search query is required and must be a non-empty string.',
        },
      ],
      isError: true,
    };
  }

  const trimmedQuery = query.trim();
  logger.info(`Searching for plugins matching: ${trimmedQuery}`);

  try {
    const results = searchPlugins(trimmedQuery);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `## Plugin Search Results for "${trimmedQuery}"\n\nNo plugins found matching your search query.\n\nTry:\n- Using different keywords\n- Searching for plugin functionality (e.g., "firebase", "versioning", "badge")\n- Running \`fastlane search_plugins\` for more options from RubyGems`,
          },
        ],
      };
    }

    const lines: string[] = [];
    lines.push(`## Plugin Search Results for "${trimmedQuery}"\n`);
    lines.push(`Found ${results.length} matching plugin${results.length === 1 ? '' : 's'}:\n`);

    for (const plugin of results) {
      lines.push(`**${plugin.name}**`);
      lines.push(`- ${plugin.description}`);
      if (plugin.homepage) {
        lines.push(`- Homepage: ${plugin.homepage}`);
      }
      lines.push('');
    }

    logger.success(`Found ${results.length} plugin(s) matching "${trimmedQuery}"`);

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Plugin search failed: ${message}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error searching plugins: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Get Plugin Info Handler
// =============================================================================

/**
 * Arguments for the get_plugin_info tool
 */
export interface GetPluginInfoArgs {
  pluginName: string;
}

/**
 * Handle get_plugin_info MCP tool call
 *
 * Returns detailed information about a specific fastlane plugin.
 */
export async function handleGetPluginInfo(args: GetPluginInfoArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { pluginName } = args;

  // Validate plugin name
  if (!pluginName || typeof pluginName !== 'string' || pluginName.trim().length === 0) {
    logger.error('Plugin name is required');
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Plugin name is required and must be a non-empty string.',
        },
      ],
      isError: true,
    };
  }

  const trimmedName = pluginName.trim();
  logger.info(`Getting info for plugin: ${trimmedName}`);

  try {
    // Try with the exact name first
    let plugin = getPluginInfo(trimmedName);

    // If not found, try with 'fastlane-plugin-' prefix
    if (!plugin && !trimmedName.startsWith('fastlane-plugin-')) {
      plugin = getPluginInfo(`fastlane-plugin-${trimmedName}`);
    }

    if (!plugin) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Plugin "${trimmedName}" not found in the catalog.\n\nTry:\n- Using the full plugin name (e.g., "fastlane-plugin-firebase_app_distribution")\n- Searching for plugins with \`search_plugins\` tool\n- The plugin may exist on RubyGems but is not in our curated catalog`,
          },
        ],
        isError: true,
      };
    }

    const lines: string[] = [];
    lines.push(`## ${plugin.name}\n`);
    lines.push(`- **Description:** ${plugin.description}`);
    lines.push(`- **Source:** ${plugin.source}`);
    if (plugin.homepage) {
      lines.push(`- **Homepage:** ${plugin.homepage}`);
    }
    lines.push(`- **Install:** \`gem '${plugin.name}'\``);

    logger.success(`Retrieved info for plugin: ${plugin.name}`);

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Get plugin info failed: ${message}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error getting plugin info: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Install Plugins Handler (Command Generator)
// =============================================================================

/**
 * Arguments for the install_plugins tool
 */
export interface InstallPluginsArgs {
  plugins: string[];
  projectPath: string;
}

/**
 * Handle install_plugins MCP tool call
 *
 * Generates installation commands for fastlane plugins.
 * Does NOT actually execute the installation - returns instructions only.
 */
export async function handleInstallPlugins(args: InstallPluginsArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { plugins, projectPath } = args;

  // Validate project path
  let validatedPath: string;
  try {
    validatedPath = await validateProjectPath(projectPath);
  } catch (error) {
    if (isValidationError(error)) {
      logger.error(`Invalid project path: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }

  // Validate plugins array
  if (!plugins || !Array.isArray(plugins) || plugins.length === 0) {
    logger.error('Plugins array is required');
    return {
      content: [
        {
          type: 'text',
          text: 'Error: plugins must be a non-empty array of plugin names.',
        },
      ],
      isError: true,
    };
  }

  // Validate and normalize plugin names
  const validPlugins: PluginInfo[] = [];
  const invalidPlugins: string[] = [];

  for (const pluginName of plugins) {
    if (typeof pluginName !== 'string' || pluginName.trim().length === 0) {
      invalidPlugins.push(String(pluginName));
      continue;
    }

    const trimmedName = pluginName.trim();

    // Try to find the plugin in catalog
    let plugin = getPluginInfo(trimmedName);

    // If not found, try with 'fastlane-plugin-' prefix
    if (!plugin && !trimmedName.startsWith('fastlane-plugin-')) {
      plugin = getPluginInfo(`fastlane-plugin-${trimmedName}`);
    }

    if (plugin) {
      validPlugins.push(plugin);
    } else {
      invalidPlugins.push(trimmedName);
    }
  }

  // Report invalid plugins if any
  if (invalidPlugins.length > 0 && validPlugins.length === 0) {
    logger.error(`No valid plugins found: ${invalidPlugins.join(', ')}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error: None of the specified plugins were found in the catalog.\n\nInvalid plugins:\n${invalidPlugins.map(p => `- ${p}`).join('\n')}\n\nTry:\n- Using the full plugin name (e.g., "fastlane-plugin-firebase_app_distribution")\n- Searching for plugins with \`search_plugins\` tool`,
        },
      ],
      isError: true,
    };
  }

  logger.info(`Generating install commands for ${validPlugins.length} plugin(s)`);

  // Generate installation instructions
  const lines: string[] = [];
  lines.push('## Install Plugins\n');

  if (invalidPlugins.length > 0) {
    lines.push(`**Warning:** The following plugins were not found in the catalog and will be skipped:`);
    for (const p of invalidPlugins) {
      lines.push(`- ${p}`);
    }
    lines.push('');
  }

  lines.push('To install the requested plugins, run the following commands in your project directory:\n');
  lines.push('```bash');
  lines.push(`cd ${validatedPath}`);

  // Extract short plugin name from full name for add_plugin command
  for (const plugin of validPlugins) {
    const shortName = plugin.name.replace(/^fastlane-plugin-/, '');
    lines.push(`fastlane add_plugin ${shortName}`);
  }
  lines.push('```\n');

  lines.push('Or add these lines to your Pluginfile:\n');
  lines.push('```ruby');
  for (const plugin of validPlugins) {
    lines.push(`gem '${plugin.name}'`);
  }
  lines.push('```\n');

  lines.push('Then run: `fastlane install_plugins`');

  logger.success(`Generated install commands for ${validPlugins.length} plugin(s)`);

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
