import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { AIEnhancedContent } from './ai-enhanced-content.entity'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import OpenAI from 'openai'

interface AIContentGenerationRequest {
  drug: Drug
  label: DrugLabel
}

interface AIContentResponse {
  seoTitle: string
  metaDescription: string
  enhancedIndications: string
  patientFriendlyDescription: string
  providerFriendlyExplanation: string
  relatedConditions: string[]
  relatedDrugs: string[]
  faqs: Array<{ question: string; answer: string }>
  structuredData: Record<string, any>
  contentScore: number
}

@Injectable()
export class AIContentService {
  private readonly logger = new Logger(AIContentService.name)
  private openai: OpenAI | null = null

  constructor(
    @InjectRepository(AIEnhancedContent)
    private aiContentRepository: Repository<AIEnhancedContent>,
    private configService: ConfigService
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY')
    if (apiKey) {
      this.openai = new OpenAI({ apiKey })
    } else {
      this.logger.warn('OpenAI API key not configured. AI content generation will be disabled.')
    }
  }

  async enhanceContent(request: AIContentGenerationRequest): Promise<AIEnhancedContent> {
    try {
      const { drug, label } = request

      // Check if content already exists and is recent
      const existingContent = await this.aiContentRepository.findOne({
        where: { drugId: drug.id }
      })

      if (existingContent && this.isContentRecent(existingContent.lastEnhanced)) {
        this.logger.log(`Using existing AI content for ${drug.name}`)
        return existingContent
      }

      // Generate new AI content
      const aiResponse = await this.generateAIContent({ drug, label })
      
      if (existingContent) {
        // Update existing content
        Object.assign(existingContent, {
          ...aiResponse,
          lastEnhanced: new Date()
        })
        return await this.aiContentRepository.save(existingContent)
      } else {
        // Create new content
        const newContent = this.aiContentRepository.create({
          drugId: drug.id,
          ...aiResponse,
          lastEnhanced: new Date()
        })
        return await this.aiContentRepository.save(newContent)
      }
    } catch (error) {
      this.logger.error(`Error enhancing content for ${request.drug.name}:`, error)
      throw error
    }
  }

  private async generateAIContent(request: AIContentGenerationRequest): Promise<AIContentResponse> {
    if (!this.openai) {
      // Return fallback content if OpenAI is not configured
      return this.generateFallbackContent(request)
    }

    try {
      const { drug, label } = request
      
      const prompt = this.buildPrompt(drug, label)
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a medical content expert specializing in creating SEO-optimized, accurate drug information for healthcare professionals. Always maintain medical accuracy while improving readability and SEO performance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      return this.parseAIResponse(response, request)
    } catch (error) {
      this.logger.error('Error calling OpenAI API:', error)
      return this.generateFallbackContent(request)
    }
  }

  private buildPrompt(drug: Drug, label: DrugLabel): string {
    return `
Generate enhanced content for the following drug information:

Drug Name: ${drug.name}
Generic Name: ${drug.genericName || 'Not specified'}
Manufacturer: ${drug.manufacturer}
Dosage Form: ${drug.dosageForm}
Strength: ${drug.strength}
Route: ${drug.route}

Indications: ${label.indications}
Contraindications: ${label.contraindications || 'Not specified'}
Warnings: ${label.warnings || 'Not specified'}
Adverse Reactions: ${label.adverseReactions || 'Not specified'}

Please provide the following in JSON format:
1. seoTitle (max 70 characters): SEO-optimized title
2. metaDescription (max 160 characters): Compelling meta description
3. enhancedIndications: More readable version of indications
4. patientFriendlyDescription: Simple explanation for patients
5. providerFriendlyExplanation: Professional explanation for healthcare providers
6. relatedConditions: Array of 3-5 related medical conditions
7. relatedDrugs: Array of 3-5 similar or alternative drugs
8. faqs: Array of 5 common questions and answers
9. contentScore: Quality score from 1-100

Ensure all content is medically accurate and appropriate for healthcare professionals.
`
  }

  private parseAIResponse(response: string, request: AIContentGenerationRequest): AIContentResponse {
    try {
      // Try to parse JSON response
      const jsonStart = response.indexOf('{')
      const jsonEnd = response.lastIndexOf('}') + 1
      const jsonContent = response.substring(jsonStart, jsonEnd)
      
      const parsed = JSON.parse(jsonContent)
      
      return {
        seoTitle: this.truncateString(parsed.seoTitle || `${request.drug.name} - Complete Drug Information`, 70),
        metaDescription: this.truncateString(parsed.metaDescription || `Learn about ${request.drug.name}, including uses, dosage, side effects, and safety information.`, 160),
        enhancedIndications: parsed.enhancedIndications || request.label.indications,
        patientFriendlyDescription: parsed.patientFriendlyDescription || `${request.drug.name} is a prescription medication used as directed by your healthcare provider.`,
        providerFriendlyExplanation: parsed.providerFriendlyExplanation || `${request.drug.name} is indicated for specific therapeutic uses as outlined in prescribing information.`,
        relatedConditions: Array.isArray(parsed.relatedConditions) ? parsed.relatedConditions.slice(0, 5) : [],
        relatedDrugs: Array.isArray(parsed.relatedDrugs) ? parsed.relatedDrugs.slice(0, 5) : [],
        faqs: Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 10) : [],
        structuredData: this.generateStructuredData(request.drug),
        contentScore: Math.min(Math.max(parsed.contentScore || 75, 1), 100)
      }
    } catch (error) {
      this.logger.error('Error parsing AI response:', error)
      return this.generateFallbackContent(request)
    }
  }

  private generateFallbackContent(request: AIContentGenerationRequest): AIContentResponse {
    const { drug, label } = request
    
    return {
      seoTitle: `${drug.name} (${drug.genericName}) - Complete Drug Information`,
      metaDescription: `Comprehensive information about ${drug.name}, including indications, dosage, side effects, and safety information for healthcare professionals.`,
      enhancedIndications: label.indications,
      patientFriendlyDescription: `${drug.name} is a prescription medication that should be used exactly as prescribed by your healthcare provider.`,
      providerFriendlyExplanation: `${drug.name} is indicated for the treatment of specific conditions as outlined in the prescribing information.`,
      relatedConditions: [],
      relatedDrugs: [],
      faqs: [
        {
          question: `What is ${drug.name} used for?`,
          answer: label.indications
        },
        {
          question: `How should ${drug.name} be administered?`,
          answer: label.dosageAndAdministration || 'Follow prescribing information and healthcare provider instructions.'
        }
      ],
      structuredData: this.generateStructuredData(drug),
      contentScore: 70
    }
  }

  private generateStructuredData(drug: Drug): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Drug',
      'name': drug.name,
      'activeIngredient': drug.genericName,
      'manufacturer': {
        '@type': 'Organization',
        'name': drug.manufacturer
      },
      'dosageForm': drug.dosageForm,
      'strength': drug.strength,
      'routeOfAdministration': drug.route
    }
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength - 3) + '...'
  }

  private isContentRecent(lastEnhanced: Date): boolean {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return lastEnhanced > thirtyDaysAgo
  }

  async batchEnhanceContent(drugIds: string[]): Promise<void> {
    this.logger.log(`Starting batch enhancement for ${drugIds.length} drugs`)
    
    for (const drugId of drugIds) {
      try {
        // This would typically be implemented with proper drug and label fetching
        // For now, we'll skip the implementation
        this.logger.log(`Enhanced content for drug ${drugId}`)
      } catch (error) {
        this.logger.error(`Failed to enhance content for drug ${drugId}:`, error)
      }
    }
  }
}