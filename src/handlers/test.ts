import { TestArgs } from '../types/index.js';
import { executeFastlane, formatResult } from '../utils/executor.js';
import { logger } from '../utils/logger.js';

export async function handleTest(args: TestArgs) {
  const { platform, projectPath, device, testPlan } = args;
  
  logger.info(`Running tests for ${platform}...`);
  
  const envVars: Record<string, string> = {};
  
  if (device) {
    envVars.TEST_DEVICE = device;
    logger.debug(`Test device: ${device}`);
  }
  
  if (testPlan) {
    envVars.TEST_PLAN = testPlan;
    logger.debug(`Test plan: ${testPlan}`);
  }
  
  try {
    const result = await executeFastlane('test', platform, projectPath, envVars);
    
    if (result.exitCode === 0) {
      logger.success(`Tests passed successfully for ${platform}`);
    } else {
      logger.warning(`Tests completed with failures for ${platform}`);
    }
    
    return formatResult(`Test execution completed for ${platform}`, result);
  } catch (error) {
    logger.error(`Test execution failed for ${platform}: ${error}`);
    throw error;
  }
}
