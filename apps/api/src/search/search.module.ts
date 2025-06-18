import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SearchService } from './search.service'
import { SearchController } from './search.controller'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, DrugLabel, AIEnhancedContent])
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService]
})
export class SearchModule {}