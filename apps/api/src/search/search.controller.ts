import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { SearchService } from './search.service'
import type { SearchResult } from './search.service'

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('drugs')
  @ApiOperation({ summary: 'Search drugs by query' })
  @ApiResponse({ status: 200, description: 'Returns search results' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async searchDrugs(
    @Query('q') query: string,
    @Query('limit') limit?: number
  ): Promise<SearchResult> {
    return this.searchService.searchDrugs(query, limit)
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, description: 'Returns search suggestions' })
  @ApiQuery({ name: 'q', description: 'Partial query' })
  async getSearchSuggestions(@Query('q') query: string) {
    return this.searchService.getSearchSuggestions(query)
  }

  @Get('by-condition')
  @ApiOperation({ summary: 'Search drugs by medical condition' })
  @ApiResponse({ status: 200, description: 'Returns drugs for condition' })
  @ApiQuery({ name: 'condition', description: 'Medical condition' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async searchByCondition(
    @Query('condition') condition: string,
    @Query('limit') limit?: number
  ) {
    return this.searchService.searchByCondition(condition, limit)
  }
}