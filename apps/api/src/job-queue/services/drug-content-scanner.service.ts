import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Drug } from '../../drugs/drugs.entity';
import { AIEnhancedContent } from '../../ai-content/ai-enhanced-content.entity';
import { DrugProcessingJob } from '../interfaces/job-data.interface';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } from '../constants/queue-config.constants';

@Injectable()
export class DrugContentScannerService {
  private readonly logger = new Logger(DrugContentScannerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DRUG_PROCESSING)
    private readonly drugProcessingQueue: Queue<DrugProcessingJob>,
    @InjectRepository(Drug)
    private readonly drugRepository: Repository<Drug>,
    @InjectRepository(AIEnhancedContent)
    private readonly aiContentRepository: Repository<AIEnhancedContent>,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async scanForMissingContent() {
    this.logger.log('Starting scheduled scan for missing AI content');
    
    try {
      const drugsNeedingContent = await this.findDrugsNeedingContent();
      this.logger.log(`Found ${drugsNeedingContent.length} drugs needing AI content enhancement`);

      for (const drug of drugsNeedingContent) {
        await this.queueDrugForProcessing(drug, 'enhance', 'scheduled_scan');
      }

      this.logger.log(`Queued ${drugsNeedingContent.length} drugs for AI content processing`);
    } catch (error) {
      this.logger.error('Error during scheduled content scan', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scanForOutdatedContent() {
    this.logger.log('Starting scheduled scan for outdated AI content');
    
    try {
      const drugsWithOutdatedContent = await this.findDrugsWithOutdatedContent();
      this.logger.log(`Found ${drugsWithOutdatedContent.length} drugs with outdated content`);

      for (const drug of drugsWithOutdatedContent) {
        await this.queueDrugForProcessing(drug, 'refresh', 'content_refresh');
      }

      this.logger.log(`Queued ${drugsWithOutdatedContent.length} drugs for content refresh`);
    } catch (error) {
      this.logger.error('Error during outdated content scan', error);
    }
  }

  async findDrugsNeedingContent(): Promise<Drug[]> {
    const query = this.drugRepository
      .createQueryBuilder('drug')
      .leftJoin('drug.aiEnhancedContent', 'aec')
      .where('aec.id IS NULL') // No AI content exists
      .orderBy('drug.createdAt', 'DESC')
      .limit(100); // Process in batches of 100

    return await query.getMany();
  }

  async findDrugsWithOutdatedContent(): Promise<Drug[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = this.drugRepository
      .createQueryBuilder('drug')
      .innerJoin('drug.aiEnhancedContent', 'aec')
      .where('aec.updatedAt < :thirtyDaysAgo', { thirtyDaysAgo })
      .orWhere('aec.contentFreshnessScore < :minScore', { minScore: 0.7 })
      .orderBy('aec.updatedAt', 'ASC')
      .limit(50); // Refresh in smaller batches

    return await query.getMany();
  }

  async queueDrugForProcessing(
    drug: Drug,
    processingType: 'enhance' | 'refresh',
    reason: string,
  ): Promise<void> {
    const priority = this.calculatePriority(drug);
    const delay = this.calculateDelay(drug, processingType);

    const jobData: DrugProcessingJob = {
      drugId: drug.id,
      priority,
      retryCount: 0,
      processingType,
      metadata: {
        initiatedBy: 'scanner',
        reason,
      },
    };

    const jobOptions = {
      priority: this.getPriorityValue(priority),
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 1000,
      },
    };

    try {
      const job = await this.drugProcessingQueue.add(
        JOB_TYPES.ENHANCE_CONTENT,
        jobData,
        jobOptions,
      );

      this.logger.debug(`Queued drug ${drug.name} (ID: ${drug.id}) for ${processingType} processing. Job ID: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to queue drug ${drug.id} for processing`, error);
    }
  }

  async queueBatchProcessing(drugIds: string[], processingType: 'enhance' | 'refresh' = 'enhance'): Promise<void> {
    this.logger.log(`Starting batch processing for ${drugIds.length} drugs`);

    const batchSize = 5; // Process 5 drugs at a time
    const batches = this.chunkArray(drugIds, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchId = `batch-${Date.now()}-${i}`;

      for (const drugId of batch) {
        const jobData: DrugProcessingJob = {
          drugId,
          priority: 'medium',
          retryCount: 0,
          processingType,
          metadata: {
            initiatedBy: 'batch_processor',
            batchId,
            reason: 'batch_processing',
          },
        };

        await this.drugProcessingQueue.add(
          JOB_TYPES.ENHANCE_CONTENT,
          jobData,
          {
            priority: JOB_PRIORITIES.MEDIUM,
            delay: i * 1000, // Stagger batch processing
          },
        );
      }
    }

    this.logger.log(`Queued ${drugIds.length} drugs in ${batches.length} batches for processing`);
  }

  private calculatePriority(drug: Drug): 'high' | 'medium' | 'low' {
    // High priority for recently created drugs
    const daysSinceCreation = Math.floor(
      (Date.now() - drug.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceCreation <= 7) {
      return 'high';
    }

    if (daysSinceCreation <= 30) {
      return 'medium';
    }

    return 'low';
  }

  private calculateDelay(drug: Drug, processingType: 'enhance' | 'refresh'): number {
    // Add delay to spread out processing and respect rate limits
    if (processingType === 'refresh') {
      return Math.random() * 30000; // 0-30 seconds random delay for refresh
    }

    const priority = this.calculatePriority(drug);
    switch (priority) {
      case 'high':
        return 0; // Process immediately
      case 'medium':
        return Math.random() * 10000; // 0-10 seconds
      case 'low':
        return Math.random() * 60000; // 0-60 seconds
      default:
        return 0;
    }
  }

  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high':
        return JOB_PRIORITIES.HIGH;
      case 'medium':
        return JOB_PRIORITIES.MEDIUM;
      case 'low':
        return JOB_PRIORITIES.LOW;
      default:
        return JOB_PRIORITIES.MEDIUM;
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async getQueueStatistics() {
    const waiting = await this.drugProcessingQueue.getWaiting();
    const active = await this.drugProcessingQueue.getActive();
    const completed = await this.drugProcessingQueue.getCompleted();
    const failed = await this.drugProcessingQueue.getFailed();

    return {
      queued: waiting.length,
      processing: active.length,
      completed: completed.length,
      failed: failed.length,
      successRate: this.calculateSuccessRate(completed.length, failed.length),
    };
  }

  private calculateSuccessRate(completed: number, failed: number): number {
    const total = completed + failed;
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  }
}