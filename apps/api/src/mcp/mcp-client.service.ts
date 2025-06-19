import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export interface DrugSearchParams {
  [key: string]: unknown
  query?: string
  limit?: number
  offset?: number
}

export interface DrugDetailsParams {
  [key: string]: unknown
  drugId: string
}

export interface DrugInteractionsParams {
  [key: string]: unknown
  drugId: string
  limit?: number
}

export interface DrugsByConditionParams {
  [key: string]: unknown
  condition: string
  limit?: number
}

export interface GenerateSEOContentParams {
  [key: string]: unknown
  drugId: string
  includeStructuredData?: boolean
  generateFAQs?: boolean
}

export interface CreateProviderFriendlyContentParams {
  [key: string]: unknown
  drugId: string
  targetAudience?: string
}

export interface GenerateDrugFAQsParams {
  [key: string]: unknown
  drugId: string
}

export interface BatchGenerateContentParams {
  [key: string]: unknown
  drugIds: string[]
  contentTypes?: string[]
}

@Injectable()
export class MCPClientService {
  private readonly logger = new Logger(MCPClientService.name)
  private client: Client | null = null
  private transport: StdioClientTransport | null = null

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.initializeClient()
    } catch (error) {
      this.logger.error('Failed to initialize MCP client', error)
    }
  }

  async onModuleDestroy() {
    await this.cleanup()
  }

  private async initializeClient() {
    try {
      // Get MCP server configuration
      const mcpServerPath = this.configService.get<string>('MCP_SERVER_PATH', 'python-ai-content/server.py')
      const mcpServerArgs = this.configService.get<string[]>('MCP_SERVER_ARGS', [])

      // Create transport for stdio communication with Python MCP server
      this.transport = new StdioClientTransport({
        command: 'python3',
        args: [mcpServerPath, ...mcpServerArgs],
        env: {
          ...process.env,
          OPENAI_API_KEY: this.configService.get<string>('OPENAI_API_KEY'),
        },
      })

      // Create and initialize the MCP client
      this.client = new Client(
        {
          name: 'drug-platform-api',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      )

      await this.client.connect(this.transport)
      this.logger.log('MCP client connected successfully')

      // List available tools for debugging
      const { tools } = await this.client.listTools()
      this.logger.log(`Available MCP tools: ${tools.map(t => t.name).join(', ')}`)
    } catch (error) {
      this.logger.error('Failed to initialize MCP client', error)
      throw error
    }
  }

  private async cleanup() {
    try {
      if (this.client) {
        await this.client.close()
      }
      if (this.transport) {
        await this.transport.close()
      }
    } catch (error) {
      this.logger.error('Error during MCP client cleanup', error)
    }
  }

  async searchDrugs(params: DrugSearchParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'search_drugs',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling search_drugs tool', error)
      throw error
    }
  }

  async getDrugDetails(params: DrugDetailsParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'get_drug_details',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling get_drug_details tool', error)
      throw error
    }
  }

  async getDrugInteractions(params: DrugInteractionsParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'get_drug_interactions',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling get_drug_interactions tool', error)
      throw error
    }
  }

  async getDrugsByCondition(params: DrugsByConditionParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'get_drugs_by_condition',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling get_drugs_by_condition tool', error)
      throw error
    }
  }

  async generateSEOContent(params: GenerateSEOContentParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'generate_seo_content',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling generate_seo_content tool', error)
      throw error
    }
  }

  async createProviderFriendlyContent(params: CreateProviderFriendlyContentParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'create_provider_friendly_content',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling create_provider_friendly_content tool', error)
      throw error
    }
  }

  async generateDrugFAQs(params: GenerateDrugFAQsParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'generate_drug_faqs',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling generate_drug_faqs tool', error)
      throw error
    }
  }

  async batchGenerateContent(params: BatchGenerateContentParams) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: 'batch_generate_content',
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error('Error calling batch_generate_content tool', error)
      throw error
    }
  }

  async callTool(toolName: string, params: Record<string, unknown>) {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: params,
      })

      return result.content
    } catch (error) {
      this.logger.error(`Error calling ${toolName} tool`, error)
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false
      }

      // Test connection with health_check tool if available
      try {
        await this.client.callTool({
          name: 'health_check',
          arguments: {},
        })
        return true
      } catch {
        // Fallback to listing tools
        await this.client.listTools()
        return true
      }
    } catch {
      return false
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.healthCheck()
  }

  async getAvailableTools(): Promise<string[]> {
    if (!this.client) {
      throw new Error('MCP client not initialized')
    }

    try {
      const { tools } = await this.client.listTools()
      return tools.map(t => t.name)
    } catch (error) {
      this.logger.error('Error listing available tools', error)
      throw error
    }
  }

  async reconnect(): Promise<void> {
    this.logger.log('Reconnecting MCP client...')
    await this.cleanup()
    await this.initializeClient()
  }
}