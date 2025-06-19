import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { QUEUE_NAMES } from '../constants/queue-config.constants';
import { DrugProcessingJob } from '../interfaces/job-data.interface';

export interface QueueStatistics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  successRate: number;
  averageProcessingTime: number;
  lastProcessedJob?: {
    id: string;
    processedOn: number;
    finishedOn: number;
    data: any;
  };
}

export interface JobDetails {
  id: string;
  name: string;
  data: any;
  progress: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  attempts: number;
  delay: number;
  timestamp: number;
  opts: any;
}

@Injectable()
export class JobMonitoringService {
  private readonly logger = new Logger(JobMonitoringService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DRUG_PROCESSING)
    private readonly drugProcessingQueue: Queue<DrugProcessingJob>,
    @InjectQueue(QUEUE_NAMES.CONTENT_REFRESH)
    private readonly contentRefreshQueue: Queue,
  ) {}

  async getAllQueueStatistics(): Promise<QueueStatistics[]> {
    const queues = [
      { name: QUEUE_NAMES.DRUG_PROCESSING, queue: this.drugProcessingQueue },
      { name: QUEUE_NAMES.CONTENT_REFRESH, queue: this.contentRefreshQueue },
    ];

    const statistics: QueueStatistics[] = [];

    for (const { name, queue } of queues) {
      try {
        const stats = await this.getQueueStatistics(name, queue);
        statistics.push(stats);
      } catch (error) {
        this.logger.error(`Error getting statistics for queue ${name}:`, error);
        statistics.push({
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: false,
          successRate: 0,
          averageProcessingTime: 0,
        });
      }
    }

    return statistics;
  }

  async getQueueStatistics(name: string, queue: Queue): Promise<QueueStatistics> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    const isPaused = await queue.isPaused();
    const successRate = this.calculateSuccessRate(completed.length, failed.length);
    const averageProcessingTime = await this.calculateAverageProcessingTime(completed);
    const lastProcessedJob = completed.length > 0 ? this.formatJobSummary(completed[0]) : undefined;

    return {
      name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: isPaused,
      successRate,
      averageProcessingTime,
      lastProcessedJob,
    };
  }

  async getActiveJobs(queueName: string): Promise<JobDetails[]> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const activeJobs = await queue.getActive();
    return activeJobs.map(job => this.formatJobDetails(job));
  }

  async getFailedJobs(queueName: string, limit = 50): Promise<JobDetails[]> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed(0, limit - 1);
    return failedJobs.map(job => this.formatJobDetails(job));
  }

  async getCompletedJobs(queueName: string, limit = 50): Promise<JobDetails[]> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const completedJobs = await queue.getCompleted(0, limit - 1);
    return completedJobs.map(job => this.formatJobDetails(job));
  }

  async getJobById(queueName: string, jobId: string): Promise<JobDetails | null> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    return job ? this.formatJobDetails(job) : null;
  }

  async retryFailedJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.retry();
    this.logger.log(`Retried job ${jobId} in queue ${queueName}`);
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.remove();
    this.logger.log(`Removed job ${jobId} from queue ${queueName}`);
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.logger.log(`Paused queue ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.logger.log(`Resumed queue ${queueName}`);
  }

  async cleanQueue(queueName: string, olderThan: number = 24 * 60 * 60 * 1000): Promise<number> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const cleaned = await queue.clean(olderThan, 'completed');
    this.logger.log(`Cleaned ${cleaned.length} completed jobs from queue ${queueName}`);
    return cleaned.length;
  }

  async getJobCounts(queueName: string): Promise<Record<string, number>> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const counts = await queue.getJobCounts();
    return counts as unknown as Record<string, number>;
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    queues: Array<{
      name: string;
      healthy: boolean;
      issues: string[];
    }>;
    overallIssues: string[];
  }> {
    const queues = [
      { name: QUEUE_NAMES.DRUG_PROCESSING, queue: this.drugProcessingQueue },
      { name: QUEUE_NAMES.CONTENT_REFRESH, queue: this.contentRefreshQueue },
    ];

    const queueHealth = [];
    const overallIssues = [];
    let overallHealthy = true;

    for (const { name, queue } of queues) {
      const issues = [];
      let queueHealthy = true;

      try {
        // Check if queue is responsive
        await queue.getJobCounts();

        // Check for too many failed jobs
        const failed = await queue.getFailed();
        if (failed.length > 100) {
          issues.push(`High number of failed jobs: ${failed.length}`);
          queueHealthy = false;
        }

        // Check for stuck active jobs
        const active = await queue.getActive();
        const now = Date.now();
        const stuckJobs = active.filter(job => {
          const jobAge = now - job.processedOn;
          return jobAge > 10 * 60 * 1000; // 10 minutes
        });

        if (stuckJobs.length > 0) {
          issues.push(`${stuckJobs.length} jobs stuck for more than 10 minutes`);
          queueHealthy = false;
        }

        // Check if queue is paused
        const isPaused = await queue.isPaused();
        if (isPaused) {
          issues.push('Queue is paused');
          queueHealthy = false;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        issues.push(`Queue connection error: ${errorMessage}`);
        queueHealthy = false;
      }

      if (!queueHealthy) {
        overallHealthy = false;
        overallIssues.push(`Issues with queue ${name}: ${issues.join(', ')}`);
      }

      queueHealth.push({
        name,
        healthy: queueHealthy,
        issues,
      });
    }

    return {
      healthy: overallHealthy,
      queues: queueHealth,
      overallIssues,
    };
  }

  private getQueueByName(name: string): Queue | null {
    switch (name) {
      case QUEUE_NAMES.DRUG_PROCESSING:
        return this.drugProcessingQueue;
      case QUEUE_NAMES.CONTENT_REFRESH:
        return this.contentRefreshQueue;
      default:
        return null;
    }
  }

  private calculateSuccessRate(completed: number, failed: number): number {
    const total = completed + failed;
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  }

  private async calculateAverageProcessingTime(completedJobs: Job[]): Promise<number> {
    if (completedJobs.length === 0) return 0;

    const processingTimes = completedJobs
      .filter(job => job.processedOn && job.finishedOn)
      .map(job => job.finishedOn - job.processedOn)
      .slice(0, 50); // Only consider last 50 jobs

    if (processingTimes.length === 0) return 0;

    const average = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    return Math.round(average);
  }

  private formatJobDetails(job: Job): JobDetails {
    return {
      id: job.id.toString(),
      name: job.name,
      data: job.data,
      progress: job.progress(),
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      delay: job.opts.delay || 0,
      timestamp: job.timestamp,
      opts: job.opts,
    };
  }

  private formatJobSummary(job: Job): any {
    return {
      id: job.id.toString(),
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      data: job.data,
    };
  }
}