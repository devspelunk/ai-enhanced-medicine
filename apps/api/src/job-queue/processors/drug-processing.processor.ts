import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Drug } from '../../drugs/drugs.entity';
import { DrugLabel } from '../../drugs/drug-label.entity';
import { AIEnhancedContent } from '../../ai-content/ai-enhanced-content.entity';
import { AIContentService } from '../../ai-content/ai-content.service';
import { MCPClientService } from '../../mcp/mcp-client.service';
import { RateLimitManagerService, RateLimitError } from '../services/rate-limit-manager.service';
import { FallbackContentService } from '../services/fallback-content.service';
import { DrugProcessingJob, JobResult, BatchProcessingJob, BatchJobResult } from '../interfaces/job-data.interface';
import { QUEUE_NAMES, JOB_TYPES, PROCESSING_CONFIG } from '../constants/queue-config.constants';

@Processor(QUEUE_NAMES.DRUG_PROCESSING)
@Injectable()
export class DrugProcessingProcessor {
  private readonly logger = new Logger(DrugProcessingProcessor.name);

  constructor(
    @InjectRepository(Drug)
    private readonly drugRepository: Repository<Drug>,
    @InjectRepository(DrugLabel)
    private readonly drugLabelRepository: Repository<DrugLabel>,
    @InjectRepository(AIEnhancedContent)
    private readonly aiContentRepository: Repository<AIEnhancedContent>,
    private readonly aiContentService: AIContentService,
    private readonly mcpClientService: MCPClientService,
    private readonly rateLimitManager: RateLimitManagerService,
    private readonly fallbackContentService: FallbackContentService,
  ) {}

  @Process({
    name: JOB_TYPES.ENHANCE_CONTENT,
    concurrency: PROCESSING_CONFIG.CONCURRENCY,
  })
  async enhanceContent(job: Job<DrugProcessingJob>): Promise<JobResult> {
    const startTime = Date.now();
    const { drugId, processingType, metadata } = job.data;
    
    this.logger.log(`Starting ${processingType} processing for drug ID: ${drugId}`);
    
    try {
      await job.progress(10);
      
      // Load drug and related data
      const drug = await this.loadDrugWithRelations(drugId);
      if (!drug) {
        throw new Error(`Drug with ID ${drugId} not found`);
      }

      await job.progress(20);

      // Check rate limits before making AI API calls
      await this.rateLimitManager.enforceRateLimit();
      
      await job.progress(30);

      // Generate AI content using MCP client
      const enhancedContent = await this.generateAIContent(drug, job);
      
      await job.progress(70);

      // Save enhanced content to database
      await this.saveEnhancedContent(drug, enhancedContent);
      
      await job.progress(90);

      const processingTime = Date.now() - startTime;
      await job.progress(100);

      this.logger.log(`Successfully processed drug ${drug.name || drug.drugName} (ID: ${drugId}) in ${processingTime}ms`);
      
      return {
        success: true,
        drugId,
        processingTime,
        contentGenerated: true,
        fallbackUsed: false,
        metadata: {
          ...metadata,
          processingType,
          completedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      return await this.handleProcessingError(error, job, drugId, processingTime);
    }
  }

  @Process({
    name: JOB_TYPES.BATCH_ENHANCE,
    concurrency: 1, // Process batches sequentially
  })
  async batchEnhanceContent(job: Job<BatchProcessingJob>): Promise<BatchJobResult> {
    const startTime = Date.now();
    const { drugIds, batchSize, processingType, metadata } = job.data;
    const batchId = metadata?.batchId || `batch-${Date.now()}`;
    
    this.logger.log(`Starting batch processing for ${drugIds.length} drugs (Batch ID: ${batchId})`);
    
    const results: JobResult[] = [];
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < drugIds.length; i += batchSize) {
      const batch = drugIds.slice(i, i + batchSize);
      const progress = Math.round((i / drugIds.length) * 100);
      await job.progress(progress);

      for (const drugId of batch) {
        try {
          // Create individual job data for processing
          const individualJobData: DrugProcessingJob = {
            drugId,
            priority: job.data.priority || 'medium',
            retryCount: 0,
            processingType,
            metadata: {
              ...metadata,
              batchId,
              batchIndex: i,
            },
          };

          // Create a mock job for individual processing
          const mockJob = {
            data: individualJobData,
            progress: async (progress: number) => {
              // Update overall batch progress
              const overallProgress = Math.round(((i + (progress / 100)) / drugIds.length) * 100);
              await job.progress(overallProgress);
            },
          } as Job<DrugProcessingJob>;

          const result = await this.enhanceContent(mockJob);
          results.push(result);
          
          if (result.success) {
            processedCount++;
          } else {
            failedCount++;
          }

        } catch (error) {
          this.logger.error(`Error processing drug ${drugId} in batch ${batchId}`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            success: false,
            drugId,
            error: errorMessage,
            fallbackUsed: false,
          });
          failedCount++;
        }

        // Add delay between drugs to respect rate limits
        if (i < drugIds.length - 1) {
          const delay = await this.rateLimitManager.getOptimalDelay();
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const processingTime = Date.now() - startTime;
    await job.progress(100);

    this.logger.log(`Batch processing completed. Processed: ${processedCount}, Failed: ${failedCount}, Time: ${processingTime}ms`);

    return {
      success: failedCount === 0,
      batchId,
      processedCount,
      failedCount,
      results,
      processingTime,
    };
  }

  private async loadDrugWithRelations(drugId: string): Promise<Drug | null> {
    return await this.drugRepository.findOne({
      where: { id: drugId },
      relations: ['label', 'enhancedContent'],
    });
  }

  private async generateAIContent(drug: Drug, job: Job<DrugProcessingJob>): Promise<Partial<AIEnhancedContent>> {
    try {
      // Check if MCP client is available
      const isHealthy = await this.mcpClientService.healthCheck();
      if (!isHealthy) {
        throw new Error('MCP client is not available');
      }

      await job.progress(40);

      // Use MCP client to generate SEO content
      const seoContent = await this.mcpClientService.callTool('generate_seo_content', {
        drugId: drug.id,
        includeStructuredData: true,
        generateFAQs: true,
      });

      await job.progress(50);

      // Generate provider-friendly content
      const providerContent = await this.mcpClientService.callTool('create_provider_friendly_content', {
        drugId: drug.id,
        targetAudience: 'healthcare_providers',
      });

      await job.progress(60);

      // Generate FAQs
      const faqs = await this.mcpClientService.callTool('generate_drug_faqs', {
        drugId: drug.id,
      });

      return {
        seoTitle: (seoContent as any)?.title || `${drug.name || drug.drugName} - Drug Information`,
        metaDescription: (seoContent as any)?.metaDescription || `Prescribing information for ${drug.name || drug.drugName}`,
        patientFriendlyDescription: (providerContent as any)?.description || '',
        structuredData: (seoContent as any)?.structuredData || {},
        faqs: (faqs as any)?.questions || [],
        contentScore: this.calculateContentScore(seoContent, providerContent, faqs),
        lastEnhanced: new Date(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`MCP content generation failed for drug ${drug.id}, using fallback: ${errorMessage}`);
      throw error; // Re-throw to be handled by error handler
    }
  }

  private async saveEnhancedContent(drug: Drug, contentData: Partial<AIEnhancedContent>): Promise<void> {
    let existingContent = await this.aiContentRepository.findOne({
      where: { drugId: drug.id },
    });

    if (existingContent) {
      // Update existing content
      Object.assign(existingContent, {
        ...contentData,
        updatedAt: new Date(),
      });
      await this.aiContentRepository.save(existingContent);
    } else {
      // Create new content
      existingContent = this.aiContentRepository.create({
        ...contentData,
        drugId: drug.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.aiContentRepository.save(existingContent);
    }

    this.logger.debug(`Saved enhanced content for drug ${drug.name} (ID: ${drug.id})`);
  }

  private async handleProcessingError(
    error: any,
    job: Job<DrugProcessingJob>,
    drugId: string,
    processingTime: number,
  ): Promise<JobResult> {
    this.logger.error(`Error processing drug ${drugId}:`, error);

    if (error instanceof RateLimitError) {
      // Rate limit error - should trigger delayed retry
      throw new Error('RATE_LIMIT');
    }

    if (this.isTemporaryError(error)) {
      // Temporary error - should trigger immediate retry
      throw error;
    }

    // Permanent error - generate fallback content
    try {
      const drug = await this.loadDrugWithRelations(drugId);
      if (drug) {
        const fallbackContent = this.fallbackContentService.generateSEOFallback(
          drug,
          drug.label,
        );
        
        await this.saveEnhancedContent(drug, fallbackContent);
        
        this.logger.log(`Generated fallback content for drug ${drug.name || drug.drugName} (ID: ${drugId})`);
        
        return {
          success: true,
          drugId,
          processingTime,
          contentGenerated: true,
          fallbackUsed: true,
          metadata: {
            fallbackReason: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.name : 'UnknownError',
          },
        };
      }
    } catch (fallbackError) {
      this.logger.error(`Failed to generate fallback content for drug ${drugId}:`, fallbackError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      drugId,
      processingTime,
      contentGenerated: false,
      fallbackUsed: false,
      error: errorMessage,
    };
  }

  private isTemporaryError(error: any): boolean {
    // Define temporary errors that should trigger immediate retry
    const temporaryErrorPatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /econnreset/i,
      /enotfound/i,
      /502/,
      /503/,
      /504/,
    ];

    const errorMessage = error.message || error.toString();
    return temporaryErrorPatterns.some(pattern => pattern.test(errorMessage));
  }

  private calculateContentScore(seoContent: any, providerContent: any, faqs: any): number {
    let score = 0.5; // Base score
    
    if (seoContent?.title && seoContent.title.length > 10) score += 0.1;
    if (seoContent?.metaDescription && seoContent.metaDescription.length > 50) score += 0.1;
    if (seoContent?.structuredData) score += 0.1;
    if (providerContent?.description && providerContent.description.length > 100) score += 0.1;
    if (faqs?.questions && faqs.questions.length > 0) score += 0.1;
    
    return Math.min(1.0, score);
  }
}