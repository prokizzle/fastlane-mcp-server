import { BuildArgs } from '../types/index.js';
import { executeFastlane, cleanBuildDirectories, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';
import { withPreflight } from './withPreflight.js';
import { PreflightContext } from '../validators/index.js';

async function buildHandler(args: BuildArgs) {
  const { platform, projectPath, lane = 'build', environment, clean } = args;

  logger.info(`Building ${platform} app...`);

  const envVars: Record<string, string> = {};

  if (environment) {
    envVars.BUILD_ENV = environment;
    logger.debug(`Build environment: ${environment}`);
  }

  try {
    if (clean) {
      await cleanBuildDirectories(platform, projectPath);
      logger.success('Build directories cleaned');
    }

    const result = await executeFastlane(lane, platform, projectPath, envVars);

    if (result.exitCode === 0) {
      logger.success(`Build completed successfully for ${platform}`);
    } else {
      logger.warning(`Build completed with warnings for ${platform}`);
    }

    return formatResult(`Build completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Build failed for ${platform}: ${error}`);
    throw error;
  }
}

function getBuildPreflightContext(args: BuildArgs): PreflightContext {
  return {
    projectPath: args.projectPath,
    platform: args.platform,
    lane: args.lane,
    requiredTools: ['fastlane', args.platform === 'ios' ? 'xcodebuild' : 'gradle'],
  };
}

export const handleBuild = withPreflight(buildHandler, getBuildPreflightContext);
