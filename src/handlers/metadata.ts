import { MetadataArgs } from '../types/index.js';
import { executeFastlane, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleMetadata(args: MetadataArgs) {
  const { platform, projectPath, action, skipScreenshots, skipMetadata } = args;
  
  logger.info(`Managing metadata (${action}) for ${platform}...`);
  
  const envVars: Record<string, string> = {};
  
  if (skipScreenshots) {
    envVars.SKIP_SCREENSHOTS = 'true';
    logger.debug('Skipping screenshots');
  }
  
  if (skipMetadata) {
    envVars.SKIP_METADATA = 'true';
    logger.debug('Skipping metadata');
  }
  
  // Validate action for platform
  if (platform === 'ios' && action === 'supply') {
    logger.warning('`supply` is for Android. Use `deliver` for iOS.');
    return {
      content: [
        {
          type: 'text',
          text: '`supply` is for Android. Use `deliver` for iOS metadata management.',
        },
      ],
    };
  }
  
  if (platform === 'android' && action === 'deliver') {
    logger.warning('`deliver` is for iOS. Use `supply` for Android.');
    return {
      content: [
        {
          type: 'text',
          text: '`deliver` is for iOS. Use `supply` for Android metadata management.',
        },
      ],
    };
  }
  
  try {
    const result = await executeFastlane(action, platform, projectPath, envVars);
    
    if (result.exitCode === 0) {
      logger.success(`Metadata ${action} completed successfully for ${platform}`);
    } else {
      logger.warning(`Metadata ${action} completed with warnings for ${platform}`);
    }
    
    return formatResult(`Metadata ${action} completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Metadata ${action} failed for ${platform}: ${error}`);
    throw error;
  }
}
