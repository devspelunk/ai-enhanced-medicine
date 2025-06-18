import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Drug } from './drugs.entity'
import { DrugLabel } from './drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'
import { DrugSearchFilters, DrugSearchResult } from '@drug-platform/shared'

@Injectable()
export class DrugsService {
  private readonly logger = new Logger(DrugsService.name)

  constructor(
    @InjectRepository(Drug)
    private drugRepository: Repository<Drug>,
    @InjectRepository(DrugLabel)
    private labelRepository: Repository<DrugLabel>,
    @InjectRepository(AIEnhancedContent)
    private aiContentRepository: Repository<AIEnhancedContent>
  ) {}

  async findAll(filters: DrugSearchFilters): Promise<DrugSearchResult> {
    try {
      const queryBuilder = this.drugRepository
        .createQueryBuilder('drug')
        .leftJoinAndSelect('drug.label', 'label')
        .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')

      // Apply search query
      if (filters.query) {
        queryBuilder.andWhere(
          `(
            drug.name ILIKE :query OR 
            drug.genericName ILIKE :query OR 
            drug.manufacturer ILIKE :query OR
            label.indications ILIKE :query
          )`,
          { query: `%${filters.query}%` }
        )
      }

      // Apply filters
      if (filters.manufacturer) {
        queryBuilder.andWhere('drug.manufacturer ILIKE :manufacturer', {
          manufacturer: `%${filters.manufacturer}%`
        })
      }

      if (filters.dosageForm) {
        queryBuilder.andWhere('drug.dosageForm = :dosageForm', {
          dosageForm: filters.dosageForm
        })
      }

      if (filters.indication) {
        queryBuilder.andWhere('label.indications ILIKE :indication', {
          indication: `%${filters.indication}%`
        })
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'name':
          queryBuilder.orderBy('drug.name', filters.sortOrder.toUpperCase() as 'ASC' | 'DESC')
          break
        case 'manufacturer':
          queryBuilder.orderBy('drug.manufacturer', filters.sortOrder.toUpperCase() as 'ASC' | 'DESC')
          break
        case 'approval_date':
          queryBuilder.orderBy('drug.approvalDate', filters.sortOrder.toUpperCase() as 'ASC' | 'DESC')
          break
        default:
          // For relevance, order by enhanced content score if available
          queryBuilder.orderBy('enhancedContent.contentScore', 'DESC')
          queryBuilder.addOrderBy('drug.name', 'ASC')
      }

      // Apply pagination
      const total = await queryBuilder.getCount()
      const totalPages = Math.ceil(total / filters.limit)
      
      queryBuilder
        .skip((filters.page - 1) * filters.limit)
        .take(filters.limit)

      const drugs = await queryBuilder.getMany()

      return {
        drugs: drugs.map(drug => ({
          ...drug,
          enhancedContent: drug.enhancedContent?.[0] ? {
            seoTitle: drug.enhancedContent[0].seoTitle,
            metaDescription: drug.enhancedContent[0].metaDescription,
            contentScore: drug.enhancedContent[0].contentScore
          } : undefined
        })),
        total,
        page: filters.page,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1
      }
    } catch (error) {
      this.logger.error('Error searching drugs:', error)
      throw error
    }
  }

  async findOne(id: string): Promise<Drug> {
    try {
      const drug = await this.drugRepository.findOne({
        where: { id },
        relations: ['label', 'enhancedContent']
      })

      if (!drug) {
        throw new NotFoundException(`Drug with ID ${id} not found`)
      }

      return drug
    } catch (error) {
      this.logger.error(`Error finding drug ${id}:`, error)
      throw error
    }
  }

  async findBySlug(slug: string): Promise<Drug> {
    try {
      // Extract name from slug (e.g., "taltz-ixekizumab" -> "taltz")
      const drugName = slug.split('-')[0].toUpperCase()
      
      const drug = await this.drugRepository.findOne({
        where: { name: drugName },
        relations: ['label', 'enhancedContent']
      })

      if (!drug) {
        throw new NotFoundException(`Drug with slug ${slug} not found`)
      }

      return drug
    } catch (error) {
      this.logger.error(`Error finding drug by slug ${slug}:`, error)
      throw error
    }
  }

  async getPopularDrugs(limit: number = 10): Promise<Drug[]> {
    try {
      return await this.drugRepository
        .createQueryBuilder('drug')
        .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')
        .orderBy('enhancedContent.contentScore', 'DESC')
        .limit(limit)
        .getMany()
    } catch (error) {
      this.logger.error('Error getting popular drugs:', error)
      throw error
    }
  }

  async getRelatedDrugs(drugId: string, limit: number = 5): Promise<Drug[]> {
    try {
      const drug = await this.findOne(drugId)
      
      return await this.drugRepository
        .createQueryBuilder('drug')
        .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')
        .where('drug.id != :drugId', { drugId })
        .andWhere(
          '(drug.manufacturer = :manufacturer OR drug.dosageForm = :dosageForm)',
          {
            manufacturer: drug.manufacturer,
            dosageForm: drug.dosageForm
          }
        )
        .orderBy('enhancedContent.contentScore', 'DESC')
        .limit(limit)
        .getMany()
    } catch (error) {
      this.logger.error(`Error getting related drugs for ${drugId}:`, error)
      return []
    }
  }

  generateSlug(drug: Drug): string {
    const name = drug.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const generic = drug.genericName?.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return generic ? `${name}-${generic}` : name
  }
}