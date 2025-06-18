import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { DrugsService } from './drugs.service'
import type { DrugSearchFilters } from '@drug-platform/shared'

@ApiTags('drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter drugs' })
  @ApiResponse({ status: 200, description: 'Returns paginated drug results' })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({ name: 'manufacturer', required: false, description: 'Filter by manufacturer' })
  @ApiQuery({ name: 'dosageForm', required: false, description: 'Filter by dosage form' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchDrugs(@Query(ValidationPipe) filters: DrugSearchFilters) {
    return this.drugsService.findAll(filters)
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular drugs' })
  @ApiResponse({ status: 200, description: 'Returns popular drugs' })
  async getPopularDrugs(@Query('limit') limit?: number) {
    return this.drugsService.getPopularDrugs(limit)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get drug by ID' })
  @ApiResponse({ status: 200, description: 'Returns drug details' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  async getDrug(@Param('id') id: string) {
    return this.drugsService.findOne(id)
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related drugs' })
  @ApiResponse({ status: 200, description: 'Returns related drugs' })
  async getRelatedDrugs(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.drugsService.getRelatedDrugs(id, limit)
  }
}