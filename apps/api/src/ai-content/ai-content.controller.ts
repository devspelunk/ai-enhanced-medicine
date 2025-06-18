import { Controller, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AIContentService } from './ai-content.service'

@ApiTags('ai-content')
@Controller('ai-content')
export class AIContentController {
  constructor(private readonly aiContentService: AIContentService) {}

  @Post('enhance/:drugId')
  @ApiOperation({ summary: 'Enhance content for a specific drug' })
  @ApiResponse({ status: 200, description: 'Content enhanced successfully' })
  async enhanceContent(@Param('drugId') drugId: string) {
    // Implementation would fetch drug and label data
    // For now, return a placeholder response
    return { message: `Content enhancement initiated for drug ${drugId}` }
  }

  @Post('batch-enhance')
  @ApiOperation({ summary: 'Batch enhance content for multiple drugs' })
  @ApiResponse({ status: 200, description: 'Batch enhancement initiated' })
  async batchEnhanceContent(@Body() body: { drugIds: string[] }) {
    await this.aiContentService.batchEnhanceContent(body.drugIds)
    return { message: `Batch enhancement initiated for ${body.drugIds.length} drugs` }
  }
}