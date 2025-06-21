import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class DrugSearchDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  query?: string

  @ApiPropertyOptional({ description: 'Filter by labeler/manufacturer' })
  @IsOptional()
  @IsString()
  labeler?: string

  @ApiPropertyOptional({ description: 'Filter by product type' })
  @IsOptional()
  @IsString()
  productType?: string

  @ApiPropertyOptional({ description: 'Filter by generic name' })
  @IsOptional()
  @IsString()
  genericName?: string

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20
}