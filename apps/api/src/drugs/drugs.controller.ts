import { Controller, Get, Post, Put, Delete, Param, Query, Body, ValidationPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { DrugsService } from './drugs.service'
import { DrugSearchDto, CreateDrugDto, UpdateDrugDto } from './dto'

@ApiTags('drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter drugs' })
  @ApiResponse({ status: 200, description: 'Returns paginated drug results' })
  async searchDrugs(@Query(ValidationPipe) filters: DrugSearchDto) {
    return this.drugsService.findAll(filters)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new drug' })
  @ApiResponse({ status: 201, description: 'Drug created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createDrug(@Body() createDrugDto: CreateDrugDto) {
    return this.drugsService.create(createDrugDto)
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

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get drug by slug' })
  @ApiResponse({ status: 200, description: 'Returns drug details' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  async getDrugBySlug(@Param('slug') slug: string) {
    return this.drugsService.findBySlug(slug)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update drug by ID' })
  @ApiResponse({ status: 200, description: 'Drug updated successfully' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  async updateDrug(@Param('id') id: string, @Body() updateDrugDto: UpdateDrugDto) {
    return this.drugsService.update(id, updateDrugDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete drug by ID' })
  @ApiResponse({ status: 200, description: 'Drug deleted successfully' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  async deleteDrug(@Param('id') id: string) {
    return this.drugsService.remove(id)
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related drugs' })
  @ApiResponse({ status: 200, description: 'Returns related drugs' })
  async getRelatedDrugs(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.drugsService.getRelatedDrugs(id, limit)
  }
}