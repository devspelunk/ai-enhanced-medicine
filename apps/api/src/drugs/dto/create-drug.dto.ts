import { IsString, IsOptional, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDrugDto {
  @ApiProperty({ description: 'Drug name' })
  @IsString()
  drugName: string

  @ApiProperty({ description: 'Unique set ID from FDA' })
  @IsString()
  setId: string

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  slug: string

  @ApiProperty({ description: 'Labeler/manufacturer name' })
  @IsString()
  labeler: string

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ description: 'Legacy name field' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ description: 'Generic name' })
  @IsOptional()
  @IsString()
  genericName?: string

  @ApiPropertyOptional({ description: 'Brand name' })
  @IsOptional()
  @IsString()
  brandName?: string

  @ApiPropertyOptional({ description: 'Manufacturer name' })
  @IsOptional()
  @IsString()
  manufacturer?: string

  @ApiPropertyOptional({ description: 'Dosage form' })
  @IsOptional()
  @IsString()
  dosageForm?: string

  @ApiPropertyOptional({ description: 'Strength' })
  @IsOptional()
  @IsString()
  strength?: string

  @ApiPropertyOptional({ description: 'Route of administration' })
  @IsOptional()
  @IsString()
  route?: string

  @ApiPropertyOptional({ description: 'NDC number' })
  @IsOptional()
  @IsString()
  ndc?: string

  @ApiPropertyOptional({ description: 'FDA application number' })
  @IsOptional()
  @IsString()
  fdaApplicationNumber?: string

  @ApiPropertyOptional({ description: 'FDA approval date' })
  @IsOptional()
  @IsDateString()
  approvalDate?: string
}