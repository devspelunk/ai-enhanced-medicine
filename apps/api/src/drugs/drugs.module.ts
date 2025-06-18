import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DrugsService } from './drugs.service'
import { DrugsController } from './drugs.controller'
import { Drug } from './drugs.entity'
import { DrugLabel } from './drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, DrugLabel, AIEnhancedContent])
  ],
  controllers: [DrugsController],
  providers: [DrugsService],
  exports: [DrugsService]
})
export class DrugsModule {}