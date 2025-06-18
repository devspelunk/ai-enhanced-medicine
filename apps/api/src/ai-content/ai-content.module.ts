import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AIContentService } from './ai-content.service'
import { AIContentController } from './ai-content.controller'
import { AIEnhancedContent } from './ai-enhanced-content.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([AIEnhancedContent])
  ],
  controllers: [AIContentController],
  providers: [AIContentService],
  exports: [AIContentService]
})
export class AiContentModule {}