import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { McpService } from './mcp.service'
import { McpController } from './mcp.controller'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, DrugLabel, AIEnhancedContent])
  ],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService]
})
export class McpModule {}