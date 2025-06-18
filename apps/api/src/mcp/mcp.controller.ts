import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { McpService } from './mcp.service'
import type { MCPRequest } from '@drug-platform/shared'

@ApiTags('mcp')
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('tools')
  @ApiOperation({ summary: 'Get available MCP tools' })
  @ApiResponse({ status: 200, description: 'Returns available tools' })
  getTools() {
    return this.mcpService.getAvailableTools()
  }

  @Post('execute')
  @ApiOperation({ summary: 'Execute an MCP tool' })
  @ApiResponse({ status: 200, description: 'Returns tool execution result' })
  async executeTool(@Body() request: MCPRequest) {
    return this.mcpService.executeTool(request)
  }
}