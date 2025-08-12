import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  BuildSchema,
  AppCenterSchema,
  FirebaseSchema,
  TestSchema,
  CertificateSchema,
  LaneSchema,
  VersionSchema,
  MetadataSchema,
} from './types/index.js';

import {
  handleBuild,
  handleAppCenter,
  handleFirebase,
  handleTest,
  handleCertificates,
  handleListLanes,
  handleVersion,
  handleMetadata,
} from './handlers/index.js';

import { toolDefinitions } from './tools/definitions.js';
import { formatError } from './utils/executor.js';
import { logger } from './utils/logger.js';
import { configManager } from './config/index.js';

export class FastlaneMCPServer {
  private server: Server;

  constructor() {
    const serverConfig = configManager.getServerConfig();
    
    this.server = new Server(
      {
        name: serverConfig.name,
        version: serverConfig.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools');
      return {
        tools: toolDefinitions,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info(`Executing tool: ${name}`);
      logger.debug(`Arguments: ${JSON.stringify(args)}`);
      
      try {
        switch (name) {
          case 'build':
            return await handleBuild(BuildSchema.parse(args));
            
          case 'deploy_appcenter':
            return await handleAppCenter(AppCenterSchema.parse(args));
            
          case 'firebase':
            return await handleFirebase(FirebaseSchema.parse(args));
            
          case 'test':
            return await handleTest(TestSchema.parse(args));
            
          case 'manage_certificates':
            return await handleCertificates(CertificateSchema.parse(args));
            
          case 'list_lanes':
            return await handleListLanes(LaneSchema.parse(args));
            
          case 'version':
            return await handleVersion(VersionSchema.parse(args));
            
          case 'metadata':
            return await handleMetadata(MetadataSchema.parse(args));
            
          default:
            logger.error(`Unknown tool: ${name}`);
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${error}`);
        return formatError(error);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.success('Fastlane MCP Server started successfully');
    logger.info('Waiting for requests...');
  }

  async stop() {
    logger.info('Shutting down Fastlane MCP Server...');
    await this.server.close();
    logger.success('Server stopped');
  }
}
