import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

export interface SearchResult {
  drugs: Drug[]
  total: number
  suggestions: string[]
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    @InjectRepository(Drug)
    private drugRepository: Repository<Drug>,
    @InjectRepository(DrugLabel)
    private labelRepository: Repository<DrugLabel>,
    @InjectRepository(AIEnhancedContent)
    private aiContentRepository: Repository<AIEnhancedContent>
  ) {}

  async searchDrugs(query: string, limit: number = 20): Promise<SearchResult> {
    try {
      if (!query || query.trim().length < 2) {
        return { drugs: [], total: 0, suggestions: [] }
      }

      const searchQuery = query.trim().toLowerCase()

      // Full-text search with relevance scoring
      const queryBuilder = this.drugRepository
        .createQueryBuilder('drug')
        .leftJoinAndSelect('drug.label', 'label')
        .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')
        .where(
          `(
            to_tsvector('english', drug.name || ' ' || COALESCE(drug.genericName, '') || ' ' || drug.manufacturer) @@ plainto_tsquery('english', :query) OR
            drug.name ILIKE :likeQuery OR
            drug.genericName ILIKE :likeQuery OR
            drug.manufacturer ILIKE :likeQuery
          )`,
          { 
            query: searchQuery,
            likeQuery: `%${searchQuery}%`
          }
        )
        .orderBy(
          `ts_rank(to_tsvector('english', drug.name || ' ' || COALESCE(drug.genericName, '') || ' ' || drug.manufacturer), plainto_tsquery('english', :query))`,
          'DESC'
        )
        .setParameter('query', searchQuery)
        .limit(limit)

      const drugs = await queryBuilder.getMany()
      const total = await queryBuilder.getCount()

      // Generate search suggestions
      const suggestions = await this.generateSuggestions(searchQuery)

      return {
        drugs,
        total,
        suggestions
      }
    } catch (error) {
      this.logger.error('Error performing drug search:', error)
      throw error
    }
  }

  async searchByCondition(condition: string, limit: number = 20): Promise<Drug[]> {
    try {
      return await this.drugRepository
        .createQueryBuilder('drug')
        .leftJoinAndSelect('drug.label', 'label')
        .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')
        .where('label.indications ILIKE :condition', {
          condition: `%${condition}%`
        })
        .orderBy('enhancedContent.contentScore', 'DESC')
        .limit(limit)
        .getMany()
    } catch (error) {
      this.logger.error('Error searching by condition:', error)
      return []
    }
  }

  async getSearchSuggestions(partial: string): Promise<string[]> {
    try {
      if (!partial || partial.length < 2) {
        return []
      }

      const suggestions = await this.drugRepository
        .createQueryBuilder('drug')
        .select('DISTINCT drug.name')
        .where('drug.name ILIKE :partial', { partial: `${partial}%` })
        .orderBy('drug.name')
        .limit(10)
        .getRawMany()

      return suggestions.map(item => item.drug_name)
    } catch (error) {
      this.logger.error('Error getting search suggestions:', error)
      return []
    }
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    try {
      // Get drugs with similar names
      const nameSuggestions = await this.drugRepository
        .createQueryBuilder('drug')
        .select('drug.name')
        .where('drug.name % :query', { query })
        .orderBy('similarity(drug.name, :query)', 'DESC')
        .setParameter('query', query)
        .limit(5)
        .getRawMany()

      // Get manufacturers with similar names
      const manufacturerSuggestions = await this.drugRepository
        .createQueryBuilder('drug')
        .select('DISTINCT drug.manufacturer')
        .where('drug.manufacturer % :query', { query })
        .orderBy('similarity(drug.manufacturer, :query)', 'DESC')
        .setParameter('query', query)
        .limit(3)
        .getRawMany()

      return [
        ...nameSuggestions.map(item => item.drug_name),
        ...manufacturerSuggestions.map(item => item.drug_manufacturer)
      ].filter(Boolean)
    } catch (error) {
      this.logger.error('Error generating suggestions:', error)
      return []
    }
  }
}