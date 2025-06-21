import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { MCPClientService } from './mcp-client.service'

@ApiTags('mcp')
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpClientService: MCPClientService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check MCP client health' })
  @ApiResponse({ status: 200, description: 'Returns MCP client status' })
  async getHealth() {
    const isHealthy = await this.mcpClientService.isHealthy()
    return { status: isHealthy ? 'healthy' : 'unhealthy', timestamp: new Date().toISOString() }
  }

  @Post('search-drugs')
  @ApiOperation({ summary: 'Search drugs using MCP server' })
  @ApiResponse({ status: 200, description: 'Returns drug search results' })
  async searchDrugs(@Body() params: { query?: string; limit?: number; offset?: number }) {
    return this.mcpClientService.searchDrugs(params)
  }

  @Get('drug-details/:drugId')
  @ApiOperation({ summary: 'Get drug details using MCP server' })
  @ApiResponse({ status: 200, description: 'Returns drug details' })
  async getDrugDetails(@Param('drugId') drugId: string) {
    return this.mcpClientService.getDrugDetails({ drugId })
  }

  @Get('drug-interactions/:drugId')
  @ApiOperation({ summary: 'Get drug interactions using MCP server' })
  @ApiResponse({ status: 200, description: 'Returns drug interactions' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  async getDrugInteractions(@Param('drugId') drugId: string, @Query('limit') limit?: number) {
    return this.mcpClientService.getDrugInteractions({ drugId, limit })
  }

  @Get('drugs-by-condition')
  @ApiOperation({ summary: 'Get drugs by medical condition using MCP server' })
  @ApiResponse({ status: 200, description: 'Returns drugs for condition' })
  @ApiQuery({ name: 'condition', required: true, description: 'Medical condition' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  async getDrugsByCondition(@Query('condition') condition: string, @Query('limit') limit?: number) {
    return this.mcpClientService.getDrugsByCondition({ condition, limit })
  }
}