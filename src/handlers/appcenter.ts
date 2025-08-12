import { AppCenterArgs } from '../types/index.js';
import { executeFastlane, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleAppCenter(args: AppCenterArgs) {
  const { platform, projectPath, appName, group, notes } = args;
  
  logger.info(`Deploying to AppCenter for ${platform}...`);
  
  const envVars: Record<string, string> = {};
  
  if (appName) {
    envVars.APPCENTER_APP_NAME = appName;
    logger.debug(`AppCenter app name: ${appName}`);
  }
  
  if (group) {
    envVars.APPCENTER_DISTRIBUTE_GROUP = group;
    logger.debug(`Distribution group: ${group}`);
  }
  
  if (notes) {
    envVars.APPCENTER_DISTRIBUTE_RELEASE_NOTES = notes;
    logger.debug('Release notes provided');
  }
  
  try {
    const result = await executeFastlane('appcenter', platform, projectPath, envVars);
    
    if (result.exitCode === 0) {
      logger.success(`Successfully deployed to AppCenter for ${platform}`);
    } else {
      logger.warning(`Deployment to AppCenter completed with warnings for ${platform}`);
    }
    
    return formatResult(`AppCenter deployment completed for ${platform}`, result);
  } catch (error) {
    logger.error(`AppCenter deployment failed for ${platform}: ${error}`);
    throw error;
  }
}
