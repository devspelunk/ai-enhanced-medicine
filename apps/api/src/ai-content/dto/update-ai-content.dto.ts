import { PartialType } from '@nestjs/swagger'
import { CreateAIContentDto } from './create-ai-content.dto'

export class UpdateAIContentDto extends PartialType(CreateAIContentDto) {}