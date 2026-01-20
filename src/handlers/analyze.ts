/**
 * MCP Handler for analyze_project tool
 *
 * Provides comprehensive project analysis combining lane parsing,
 * capability detection, and environment validation.
 */

import { analyzeProject, ProjectAnalysis } from '../discovery/analyze.js';
import { validateProjectPath } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

interface AnalyzeArgs {
  projectPath: string;
}

/**
 * Check if an error is a ValidationError by checking its name property
 * This is more robust than instanceof for cross-module compatibility
 */
function isValidationError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'ValidationError';
}

/**
 * Format the project analysis as readable markdown text
 */
function formatAnalysis(analysis: ProjectAnalysis): string {
  const lines: string[] = [];

  lines.push('# Project Analysis\n');

  // Platforms
  lines.push('## Platforms');
  lines.push(analysis.platforms.length > 0
    ? analysis.platforms.join(', ')
    : 'None detected');
  lines.push('');

  // iOS Analysis
  if (analysis.ios) {
    lines.push('## iOS');
    lines.push(`- **Signing:** ${analysis.ios.signing}`);
    lines.push(`- **Destinations:** ${analysis.ios.destinations.join(', ') || 'None'}`);
    lines.push(`- **Lanes:** ${analysis.ios.lanes.length > 0
      ? analysis.ios.lanes.map(l => l.name).join(', ')
      : 'None'}`);
    lines.push(`- **Has metadata:** ${analysis.ios.hasMetadata ? 'Yes' : 'No'}`);
    lines.push('');
  }

  // Android Analysis
  if (analysis.android) {
    lines.push('## Android');
    lines.push(`- **Signing:** ${analysis.android.signing}`);
    lines.push(`- **Destinations:** ${analysis.android.destinations.join(', ') || 'None'}`);
    lines.push(`- **Lanes:** ${analysis.android.lanes.length > 0
      ? analysis.android.lanes.map(l => l.name).join(', ')
      : 'None'}`);
    lines.push(`- **Has metadata:** ${analysis.android.hasMetadata ? 'Yes' : 'No'}`);
    lines.push('');
  }

  // Capabilities
  lines.push('## Capabilities');
  if (analysis.capabilities.build.length > 0) {
    lines.push(`- **Build:** ${analysis.capabilities.build.join(', ')}`);
  }
  if (analysis.capabilities.distribution.length > 0) {
    lines.push(`- **Distribution:** ${analysis.capabilities.distribution.join(', ')}`);
  }
  if (analysis.capabilities.signing.length > 0) {
    lines.push(`- **Signing:** ${analysis.capabilities.signing.join(', ')}`);
  }
  if (analysis.capabilities.metadata.length > 0) {
    lines.push(`- **Metadata:** ${analysis.capabilities.metadata.join(', ')}`);
  }
  if (
    analysis.capabilities.build.length === 0 &&
    analysis.capabilities.distribution.length === 0 &&
    analysis.capabilities.signing.length === 0 &&
    analysis.capabilities.metadata.length === 0
  ) {
    lines.push('None detected');
  }
  lines.push('');

  // Environment Status
  lines.push('## Environment');
  lines.push(`**Status:** ${analysis.environment.status === 'ready' ? 'Ready' : 'Issues Found'}`);
  if (analysis.environment.issues.length > 0) {
    lines.push('');
    lines.push('**Issues:**');
    for (const issue of analysis.environment.issues) {
      lines.push(`- ${issue}`);
    }
  }
  lines.push('');

  // Suggested Actions
  lines.push('## Suggested Actions');
  if (analysis.suggestedActions.length > 0) {
    for (const action of analysis.suggestedActions) {
      lines.push(`- ${action}`);
    }
  } else {
    lines.push('No actions available - ensure fastlane is configured in this project');
  }

  return lines.join('\n');
}

/**
 * Handle analyze_project MCP tool call
 *
 * Performs comprehensive analysis of a fastlane project and returns
 * formatted results including platform detection, capabilities,
 * environment status, and suggested actions.
 */
export async function handleAnalyzeProject(args: AnalyzeArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { projectPath } = args;

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

  logger.info(`Analyzing project at: ${validatedPath}`);

  try {
    const analysis = await analyzeProject(validatedPath);
    const text = formatAnalysis(analysis);

    logger.success(
      `Analysis complete: ${analysis.platforms.length} platform(s), ${analysis.suggestedActions.length} action(s)`
    );

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Analysis failed: ${message}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing project: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle analyze_project MCP tool call with JSON output
 *
 * Returns the raw analysis object as JSON for programmatic consumption.
 */
export async function handleAnalyzeProjectJson(args: AnalyzeArgs): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const { projectPath } = args;

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
    const analysis = await analyzeProject(validatedPath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
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
