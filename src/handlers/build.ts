import { BuildArgs } from '../types/index.js';
import { executeFastlane, cleanBuildDirectories, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleBuild(args: BuildArgs) {
  const { platform, projectPath, lane = 'build', environment, clean } = args;
  
  logger.info(`Building ${platform} app...`);
  
  const envVars: Record<string, string> = {};
  
  if (environment) {
    envVars.BUILD_ENV = environment;
    logger.debug(`Build environment: ${environment}`);
  }
  
  try {
    // Clean build directories if requested
    if (clean) {
      await cleanBuildDirectories(platform, projectPath);
      logger.success('Build directories cleaned');
    }
    
    // Execute the build
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
