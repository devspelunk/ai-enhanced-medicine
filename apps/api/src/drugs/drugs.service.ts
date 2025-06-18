import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Drug } from './drugs.entity'
import { DrugLabel } from './drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'
import { DrugSearchDto, CreateDrugDto, UpdateDrugDto } from './dto'
import { v4 as uuidv4 } from 'uuid'

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

  async findAll(filters: DrugSearchDto) {
    try {
      const queryBuilder = this.drugRepository
        .createQueryBuilder('drug')
        .leftJoinAndSelect('drug.label', 'label')
        .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')

      // Apply search query
      if (filters.query) {
        queryBuilder.andWhere(
          `(
            drug.drugName ILIKE :query OR 
            drug.genericName ILIKE :query OR 
            drug.labeler ILIKE :query OR
            label.indicationsAndUsage ILIKE :query
          )`,
          { query: `%${filters.query}%` }
        )
      }

      // Apply filters
      if (filters.labeler) {
        queryBuilder.andWhere('drug.labeler ILIKE :labeler', {
          labeler: `%${filters.labeler}%`
        })
      }

      if (filters.productType) {
        queryBuilder.andWhere('label.productType = :productType', {
          productType: filters.productType
        })
      }

      if (filters.genericName) {
        queryBuilder.andWhere('label.genericName ILIKE :genericName', {
          genericName: `%${filters.genericName}%`
        })
      }

      // Apply sorting - default by relevance and content score
      queryBuilder.orderBy('enhancedContent.contentScore', 'DESC')
      queryBuilder.addOrderBy('drug.drugName', 'ASC')

      // Apply pagination
      const total = await queryBuilder.getCount()
      const totalPages = Math.ceil(total / (filters.limit || 20))
      
      queryBuilder
        .skip(((filters.page || 1) - 1) * (filters.limit || 20))
        .take(filters.limit || 20)

      const drugs = await queryBuilder.getMany()

      return {
        drugs: drugs.map(drug => ({
          ...drug,
          enhancedContent: drug.enhancedContent ? {
            seoTitle: drug.enhancedContent.seoTitle,
            metaDescription: drug.enhancedContent.metaDescription,
            contentScore: drug.enhancedContent.contentScore
          } : undefined
        })),
        total,
        page: filters.page || 1,
        totalPages,
        hasNext: (filters.page || 1) < totalPages,
        hasPrev: (filters.page || 1) > 1
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
      const drug = await this.drugRepository.findOne({
        where: { slug },
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
          '(drug.labeler = :labeler OR label.productType = :productType)',
          {
            labeler: drug.labeler,
            productType: drug.label?.productType
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

  async create(createDrugDto: CreateDrugDto): Promise<Drug> {
    try {
      const drug = this.drugRepository.create({
        ...createDrugDto,
        id: uuidv4()
      })
      return await this.drugRepository.save(drug)
    } catch (error) {
      this.logger.error('Error creating drug:', error)
      throw error
    }
  }

  async update(id: string, updateDrugDto: UpdateDrugDto): Promise<Drug> {
    try {
      await this.drugRepository.update(id, updateDrugDto)
      return this.findOne(id)
    } catch (error) {
      this.logger.error(`Error updating drug ${id}:`, error)
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.drugRepository.delete(id)
      if (result.affected === 0) {
        throw new NotFoundException(`Drug with ID ${id} not found`)
      }
    } catch (error) {
      this.logger.error(`Error deleting drug ${id}:`, error)
      throw error
    }
  }

  generateSlug(drugName: string, genericName?: string): string {
    const name = drugName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const generic = genericName?.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return generic ? `${name}-${generic}` : name
  }
}