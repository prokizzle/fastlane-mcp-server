import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

// Configuration schema
const ConfigSchema = z.object({
  server: z.object({
    name: z.string().default('fastlane-mcp-server'),
    version: z.string().default('1.0.0'),
    debug: z.boolean().default(false),
  }).default({}),
  
  fastlane: z.object({
    defaultLanes: z.object({
      build: z.string().default('build'),
      test: z.string().default('test'),
      deploy: z.string().default('deploy'),
    }).default({}),
    
    timeout: z.number().default(600000), // 10 minutes default
    
    environmentVariables: z.record(z.string()).default({}),
  }).default({}),
  
  platforms: z.object({
    ios: z.object({
      enabled: z.boolean().default(true),
      defaultDevice: z.string().optional(),
      defaultScheme: z.string().optional(),
    }).default({}),
    
    android: z.object({
      enabled: z.boolean().default(true),
      defaultBuildType: z.string().default('Release'),
      gradlePath: z.string().default('./gradlew'),
    }).default({}),
  }).default({}),
  
  integrations: z.object({
    appCenter: z.object({
      enabled: z.boolean().default(true),
      defaultOwner: z.string().optional(),
      defaultGroup: z.string().default('Collaborators'),
    }).default({}),
    
    firebase: z.object({
      enabled: z.boolean().default(true),
      defaultGroups: z.array(z.string()).default(['testers']),
    }).default({}),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'fastlane-mcp.config.json');
    this.config = ConfigSchema.parse({});
  }

  async load(): Promise<void> {
    try {
      const configFile = await fs.readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(configFile);
      this.config = ConfigSchema.parse(rawConfig);
      logger.success(`Configuration loaded from ${this.configPath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info('No configuration file found, using defaults');
      } else {
        logger.warning(`Failed to load configuration: ${error.message}`);
      }
    }

    // Apply debug mode
    if (this.config.server.debug) {
      process.env.DEBUG = 'true';
    }

    // Apply global environment variables
    for (const [key, value] of Object.entries(this.config.fastlane.environmentVariables)) {
      process.env[key] = value;
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
      logger.success(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      logger.error(`Failed to save configuration: ${error}`);
      throw error;
    }
  }

  async createDefaultConfig(): Promise<void> {
    const defaultConfig: Config = ConfigSchema.parse({});
    
    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(defaultConfig, null, 2),
        'utf-8'
      );
      logger.success(`Default configuration created at ${this.configPath}`);
    } catch (error) {
      logger.error(`Failed to create default configuration: ${error}`);
      throw error;
    }
  }

  get(): Config {
    return this.config;
  }

  set(config: Partial<Config>): void {
    this.config = ConfigSchema.parse({ ...this.config, ...config });
  }

  getServerConfig() {
    return this.config.server;
  }

  getFastlaneConfig() {
    return this.config.fastlane;
  }

  getPlatformConfig(platform: 'ios' | 'android') {
    return this.config.platforms[platform];
  }

  getIntegrationConfig(integration: 'appCenter' | 'firebase') {
    return this.config.integrations[integration];
  }
}

export const configManager = new ConfigManager();
