import { CertificateArgs } from '../types/index.js';
import { executeFastlane, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleCertificates(args: CertificateArgs) {
  const { platform, action, projectPath, type } = args;
  
  // Certificate management is primarily for iOS
  if (platform === 'android' && action !== 'sync') {
    logger.warning('Certificate management is primarily for iOS. Android uses keystore files.');
    return {
      content: [
        {
          type: 'text',
          text: 'Certificate management is primarily for iOS. Android uses keystore files.',
        },
      ],
    };
  }
  
  logger.info(`Managing certificates: ${action} for ${platform}...`);
  
  const envVars: Record<string, string> = {};
  
  if (type) {
    envVars.CERT_TYPE = type;
    logger.debug(`Certificate type: ${type}`);
  }
  
  // Map action to appropriate lane
  let lane = 'sync_code_signing';
  switch (action) {
    case 'create':
      lane = 'create_certificate';
      break;
    case 'renew':
      lane = 'renew_certificate';
      break;
    case 'revoke':
      lane = 'revoke_certificate';
      break;
    case 'sync':
    default:
      lane = 'sync_code_signing';
  }
  
  try {
    const result = await executeFastlane(lane, platform, projectPath, envVars);
    
    if (result.exitCode === 0) {
      logger.success(`Certificate ${action} completed successfully for ${platform}`);
    } else {
      logger.warning(`Certificate ${action} completed with warnings for ${platform}`);
    }
    
    return formatResult(`Certificate ${action} completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Certificate ${action} failed for ${platform}: ${error}`);
    throw error;
  }
}
