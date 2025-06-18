import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'
import { MCPTool, MCPRequest, MCPResponse } from '@drug-platform/shared'

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name)

  constructor(
    @InjectRepository(Drug)
    private drugRepository: Repository<Drug>,
    @InjectRepository(DrugLabel)
    private labelRepository: Repository<DrugLabel>,
    @InjectRepository(AIEnhancedContent)
    private aiContentRepository: Repository<AIEnhancedContent>
  ) {}

  getAvailableTools(): MCPTool[] {
    return [
      {
        name: 'search_drugs',
        description: 'Search for drugs by name, manufacturer, or indication',
        parameters: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Maximum number of results', default: 10 }
        }
      },
      {
        name: 'get_drug_details',
        description: 'Get detailed information about a specific drug',
        parameters: {
          drugId: { type: 'string', description: 'Drug ID or name' }
        }
      },
      {
        name: 'get_drug_interactions',
        description: 'Get potential drug interactions for a specific drug',
        parameters: {
          drugId: { type: 'string', description: 'Drug ID' },
          otherDrugs: { type: 'array', description: 'List of other drug IDs to check interactions' }
        }
      },
      {
        name: 'get_drugs_by_condition',
        description: 'Find drugs used to treat a specific medical condition',
        parameters: {
          condition: { type: 'string', description: 'Medical condition or indication' },
          limit: { type: 'number', description: 'Maximum number of results', default: 10 }
        }
      }
    ]
  }

  async executeTool(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.tool) {
        case 'search_drugs':
          return await this.searchDrugs(request.parameters)
        
        case 'get_drug_details':
          return await this.getDrugDetails(request.parameters)
        
        case 'get_drug_interactions':
          return await this.getDrugInteractions(request.parameters)
        
        case 'get_drugs_by_condition':
          return await this.getDrugsByCondition(request.parameters)
        
        default:
          return {
            success: false,
            error: `Unknown tool: ${request.tool}`,
            requestId: request.requestId
          }
      }
    } catch (error) {
      this.logger.error(`Error executing MCP tool ${request.tool}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        requestId: request.requestId
      }
    }
  }

  private async searchDrugs(parameters: any): Promise<MCPResponse> {
    const { query, limit = 10 } = parameters

    if (!query) {
      return { success: false, error: 'Query parameter is required' }
    }

    const drugs = await this.drugRepository
      .createQueryBuilder('drug')
      .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')
      .where(
        'drug.name ILIKE :query OR drug.genericName ILIKE :query OR drug.manufacturer ILIKE :query',
        { query: `%${query}%` }
      )
      .limit(limit)
      .getMany()

    return {
      success: true,
      data: {
        drugs: drugs.map(drug => ({
          id: drug.id,
          name: drug.name,
          genericName: drug.genericName,
          manufacturer: drug.manufacturer,
          dosageForm: drug.dosageForm,
          strength: drug.strength
        })),
        total: drugs.length
      }
    }
  }

  private async getDrugDetails(parameters: any): Promise<MCPResponse> {
    const { drugId } = parameters

    if (!drugId) {
      return { success: false, error: 'drugId parameter is required' }
    }

    let drug: Drug | null = null

    // Try to find by ID first, then by name
    if (drugId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      drug = await this.drugRepository.findOne({
        where: { id: drugId },
        relations: ['label', 'enhancedContent']
      })
    } else {
      drug = await this.drugRepository.findOne({
        where: { name: drugId.toUpperCase() },
        relations: ['label', 'enhancedContent']
      })
    }

    if (!drug) {
      return { success: false, error: 'Drug not found' }
    }

    return {
      success: true,
      data: {
        id: drug.id,
        name: drug.name,
        genericName: drug.genericName,
        manufacturer: drug.manufacturer,
        dosageForm: drug.dosageForm,
        strength: drug.strength,
        route: drug.route,
        approvalDate: drug.approvalDate,
        label: drug.label ? {
          indications: drug.label.indications,
          contraindications: drug.label.contraindications,
          warnings: drug.label.warnings,
          adverseReactions: drug.label.adverseReactions,
          dosageAndAdministration: drug.label.dosageAndAdministration
        } : null,
        enhancedContent: drug.enhancedContent?.[0] ? {
          seoTitle: drug.enhancedContent[0].seoTitle,
          metaDescription: drug.enhancedContent[0].metaDescription,
          enhancedIndications: drug.enhancedContent[0].enhancedIndications,
          patientFriendlyDescription: drug.enhancedContent[0].patientFriendlyDescription,
          providerFriendlyExplanation: drug.enhancedContent[0].providerFriendlyExplanation,
          relatedConditions: drug.enhancedContent[0].relatedConditions,
          relatedDrugs: drug.enhancedContent[0].relatedDrugs,
          faqs: drug.enhancedContent[0].faqs,
          structuredData: drug.enhancedContent[0].structuredData,
          contentScore: drug.enhancedContent[0].contentScore,
          lastEnhanced: drug.enhancedContent[0].lastEnhanced
        } : null
      }
    }
  }

  private async getDrugInteractions(parameters: any): Promise<MCPResponse> {
    const { drugId, otherDrugs = [] } = parameters

    // This is a placeholder implementation
    // In a real system, this would query a drug interactions database
    return {
      success: true,
      data: {
        drugId,
        interactions: [],
        message: 'Drug interaction checking is not yet implemented. Consult healthcare provider for interaction information.'
      }
    }
  }

  private async getDrugsByCondition(parameters: any): Promise<MCPResponse> {
    const { condition, limit = 10 } = parameters

    if (!condition) {
      return { success: false, error: 'condition parameter is required' }
    }

    const drugs = await this.drugRepository
      .createQueryBuilder('drug')
      .leftJoinAndSelect('drug.label', 'label')
      .leftJoinAndSelect('drug.enhancedContent', 'enhancedContent')
      .where('label.indications ILIKE :condition', {
        condition: `%${condition}%`
      })
      .limit(limit)
      .getMany()

    return {
      success: true,
      data: {
        condition,
        drugs: drugs.map(drug => ({
          id: drug.id,
          name: drug.name,
          genericName: drug.genericName,
          manufacturer: drug.manufacturer,
          indications: drug.label?.indications
        })),
        total: drugs.length
      }
    }
  }
}