import { FirebaseArgs } from '../types/index.js';
import { executeFastlane, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleFirebase(args: FirebaseArgs) {
  const { action, platform, projectPath, appId, groups, releaseNotes } = args;
  
  logger.info(`Performing Firebase ${action} for ${platform}...`);
  
  const envVars: Record<string, string> = {};
  
  if (appId) {
    envVars.FIREBASE_APP_ID = appId;
    logger.debug(`Firebase App ID: ${appId}`);
  }
  
  if (groups && groups.length > 0) {
    envVars.FIREBASE_GROUPS = groups.join(',');
    logger.debug(`Distribution groups: ${groups.join(', ')}`);
  }
  
  if (releaseNotes) {
    envVars.FIREBASE_RELEASE_NOTES = releaseNotes;
    logger.debug('Release notes provided');
  }
  
  // Determine the lane based on action
  let lane = 'firebase_distribute';
  if (action === 'deploy') {
    lane = 'firebase_deploy';
  } else if (action === 'crashlytics') {
    lane = 'upload_symbols_to_crashlytics';
  }
  
  try {
    const result = await executeFastlane(lane, platform, projectPath, envVars);
    
    if (result.exitCode === 0) {
      logger.success(`Firebase ${action} completed successfully for ${platform}`);
    } else {
      logger.warning(`Firebase ${action} completed with warnings for ${platform}`);
    }
    
    return formatResult(`Firebase ${action} completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Firebase ${action} failed for ${platform}: ${error}`);
    throw error;
  }
}
