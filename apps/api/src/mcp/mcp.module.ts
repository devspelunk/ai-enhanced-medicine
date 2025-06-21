import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { MCPClientService } from './mcp-client.service'
import { McpController } from './mcp.controller'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Drug, DrugLabel, AIEnhancedContent])
  ],
  controllers: [McpController],
  providers: [MCPClientService],
  exports: [MCPClientService]
})
export class McpModule {}