import { promises as fs } from 'fs';
import path from 'path';
import { LaneArgs } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { validateProjectPath, ValidationError } from '../utils/sanitize.js';

export async function handleListLanes(args: LaneArgs) {
  const { projectPath, platform } = args;

  // Validate projectPath before using it
  let validatedPath: string;
  try {
    validatedPath = await validateProjectPath(projectPath);
  } catch (error) {
    if (error instanceof ValidationError) {
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

  logger.info('Listing available Fastlane lanes...');

  const lanes: string[] = [];

  try {
    if (platform) {
      // List lanes for specific platform
      await extractLanesFromPlatform(validatedPath, platform, lanes);
    } else {
      // List lanes for both platforms
      for (const plat of ['ios', 'android']) {
        await extractLanesFromPlatform(validatedPath, plat, lanes, true);
      }
    }
    
    if (lanes.length === 0) {
      logger.warning('No Fastlane lanes found');
      return {
        content: [
          {
            type: 'text',
            text: 'No Fastlane lanes found. Make sure Fastfile exists in the fastlane directory.',
          },
        ],
      };
    }
    
    logger.success(`Found ${lanes.length} lane(s)`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Available Fastlane lanes:\n\n${lanes.join('\n')}`,
        },
      ],
    };
  } catch (error) {
    logger.error(`Failed to list lanes: ${error}`);
    throw error;
  }
}

async function extractLanesFromPlatform(
  projectPath: string,
  platform: string,
  lanes: string[],
  includePlatformPrefix: boolean = false
): Promise<void> {
  const fastfilePath = path.join(projectPath, platform, 'fastlane', 'Fastfile');
  
  try {
    const content = await fs.readFile(fastfilePath, 'utf-8');
    const laneMatches = content.match(/(?:lane|desc)\s+[:'"]([^'"]+)['"]/g);
    
    if (laneMatches) {
      const extractedLanes: Map<string, string> = new Map();
      let currentDesc = '';
      
      for (const match of laneMatches) {
        if (match.startsWith('desc')) {
          // Extract description
          currentDesc = match.replace(/desc\s+['"]/, '').replace(/['"]$/, '');
        } else if (match.startsWith('lane')) {
          // Extract lane name
          const laneName = match.replace(/lane\s+:/, '').replace(/['"]/, '');
          const prefix = includePlatformPrefix ? `${platform}:` : '';
          const laneEntry = currentDesc 
            ? `${prefix}${laneName} - ${currentDesc}`
            : `${prefix}${laneName}`;
          
          if (!extractedLanes.has(laneName)) {
            extractedLanes.set(laneName, laneEntry);
          }
          currentDesc = ''; // Reset description
        }
      }
      
      lanes.push(...Array.from(extractedLanes.values()));
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      logger.warning(`Could not read Fastfile for ${platform}: ${error.message}`);
    }
    // Platform directory might not exist, which is okay
  }
}
