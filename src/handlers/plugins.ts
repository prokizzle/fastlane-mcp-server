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
