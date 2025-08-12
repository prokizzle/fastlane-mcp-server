import { VersionArgs } from '../types/index.js';
import { executeFastlane, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleVersion(args: VersionArgs) {
  const { platform, projectPath, action, versionType, version } = args;
  
  logger.info(`Managing version (${action}) for ${platform}...`);
  
  const envVars: Record<string, string> = {};
  
  if (version) {
    envVars.VERSION_NUMBER = version;
    logger.debug(`Version number: ${version}`);
  }
  
  if (versionType) {
    envVars.VERSION_TYPE = versionType;
    logger.debug(`Version type: ${versionType}`);
  }
  
  // Determine the lane based on action
  let lane = 'get_version';
  
  switch (action) {
    case 'bump':
      lane = versionType === 'build' ? 'increment_build_number' : 'increment_version_number';
      break;
    case 'set':
      lane = 'set_version';
      break;
    case 'get':
    default:
      lane = 'get_version';
  }
  
  try {
    const result = await executeFastlane(lane, platform, projectPath, envVars);
    
    if (result.exitCode === 0) {
      logger.success(`Version ${action} completed successfully for ${platform}`);
    } else {
      logger.warning(`Version ${action} completed with warnings for ${platform}`);
    }
    
    return formatResult(`Version ${action} completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Version ${action} failed for ${platform}: ${error}`);
    throw error;
  }
}
