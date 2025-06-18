import { IsString, IsOptional, IsArray, IsObject, IsNumber, Length, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAIContentDto {
  @ApiProperty({ description: 'Drug ID' })
  @IsString()
  drugId: string

  @ApiProperty({ description: 'SEO title (max 70 characters)', maxLength: 70 })
  @IsString()
  @Length(1, 70)
  seoTitle: string

  @ApiProperty({ description: 'Meta description (max 160 characters)', maxLength: 160 })
  @IsString()
  @Length(1, 160)
  metaDescription: string

  @ApiPropertyOptional({ description: 'Enhanced indications content' })
  @IsOptional()
  @IsString()
  enhancedIndications?: string

  @ApiPropertyOptional({ description: 'Patient-friendly description' })
  @IsOptional()
  @IsString()
  patientFriendlyDescription?: string

  @ApiPropertyOptional({ description: 'Provider-friendly explanation' })
  @IsOptional()
  @IsString()
  providerFriendlyExplanation?: string

  @ApiPropertyOptional({ description: 'Related medical conditions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedConditions?: string[]

  @ApiPropertyOptional({ description: 'Related drugs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDrugs?: string[]

  @ApiPropertyOptional({ description: 'FAQ data as JSON' })
  @IsOptional()
  @IsArray()
  faqs?: Array<{ question: string; answer: string }>

  @ApiPropertyOptional({ description: 'Structured data for SEO' })
  @IsOptional()
  @IsObject()
  structuredData?: Record<string, any>

  @ApiPropertyOptional({ description: 'Content quality score', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contentScore?: number
}