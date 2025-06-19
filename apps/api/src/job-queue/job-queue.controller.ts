import { Controller, Get, Post, Delete, Param, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DrugContentScannerService } from './services/drug-content-scanner.service';
import { JobMonitoringService } from './services/job-monitoring.service';
import { RateLimitManagerService } from './services/rate-limit-manager.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

@ApiTags('Job Queue Management')
@Controller('queue')
export class JobQueueController {
  private readonly logger = new Logger(JobQueueController.name);

  constructor(
    private readonly scannerService: DrugContentScannerService,
    private readonly monitoringService: JobMonitoringService,
    private readonly rateLimitService: RateLimitManagerService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get queue statistics for all queues' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getAllQueueStatistics() {
    return await this.monitoringService.getAllQueueStatistics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health status of all queues' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    return await this.monitoringService.getHealthStatus();
  }

  @Get(':queueName/statistics')
  @ApiOperation({ summary: 'Get statistics for a specific queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStatistics(@Param('queueName') queueName: string) {
    const queue = this.getQueueByName(queueName);
    return await this.monitoringService.getQueueStatistics(queueName, queue);
  }

  @Get(':queueName/jobs/active')
  @ApiOperation({ summary: 'Get active jobs in a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Active jobs retrieved successfully' })
  async getActiveJobs(@Param('queueName') queueName: string) {
    return await this.monitoringService.getActiveJobs(queueName);
  }

  @Get(':queueName/jobs/failed')
  @ApiOperation({ summary: 'Get failed jobs in a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of jobs to retrieve' })
  @ApiResponse({ status: 200, description: 'Failed jobs retrieved successfully' })
  async getFailedJobs(
    @Param('queueName') queueName: string,
    @Query('limit') limit?: number,
  ) {
    return await this.monitoringService.getFailedJobs(queueName, limit);
  }

  @Get(':queueName/jobs/completed')
  @ApiOperation({ summary: 'Get completed jobs in a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of jobs to retrieve' })
  @ApiResponse({ status: 200, description: 'Completed jobs retrieved successfully' })
  async getCompletedJobs(
    @Param('queueName') queueName: string,
    @Query('limit') limit?: number,
  ) {
    return await this.monitoringService.getCompletedJobs(queueName, limit);
  }

  @Get(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Get details of a specific job' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiParam({ name: 'jobId', description: 'ID of the job' })
  @ApiResponse({ status: 200, description: 'Job details retrieved successfully' })
  async getJobDetails(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return await this.monitoringService.getJobById(queueName, jobId);
  }

  @Post('scan/missing-content')
  @ApiOperation({ summary: 'Manually trigger scan for missing AI content' })
  @ApiResponse({ status: 201, description: 'Scan triggered successfully' })
  async triggerMissingContentScan() {
    this.logger.log('Manual scan for missing content triggered');
    await this.scannerService.scanForMissingContent();
    return { message: 'Missing content scan triggered successfully' };
  }

  @Post('scan/outdated-content')
  @ApiOperation({ summary: 'Manually trigger scan for outdated AI content' })
  @ApiResponse({ status: 201, description: 'Scan triggered successfully' })
  async triggerOutdatedContentScan() {
    this.logger.log('Manual scan for outdated content triggered');
    await this.scannerService.scanForOutdatedContent();
    return { message: 'Outdated content scan triggered successfully' };
  }

  @Post('process/batch')
  @ApiOperation({ summary: 'Queue batch processing for multiple drugs' })
  @ApiResponse({ status: 201, description: 'Batch processing queued successfully' })
  async queueBatchProcessing(
    @Body() body: { drugIds: string[]; processingType?: 'enhance' | 'refresh' },
  ) {
    const { drugIds, processingType = 'enhance' } = body;
    this.logger.log(`Batch processing triggered for ${drugIds.length} drugs`);
    
    await this.scannerService.queueBatchProcessing(drugIds, processingType);
    
    return {
      message: `Batch processing queued for ${drugIds.length} drugs`,
      drugIds,
      processingType,
    };
  }

  @Post(':queueName/jobs/:jobId/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiParam({ name: 'jobId', description: 'ID of the job to retry' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    await this.monitoringService.retryFailedJob(queueName, jobId);
    return { message: `Job ${jobId} retried successfully` };
  }

  @Delete(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Remove a job from the queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiParam({ name: 'jobId', description: 'ID of the job to remove' })
  @ApiResponse({ status: 200, description: 'Job removed successfully' })
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    await this.monitoringService.removeJob(queueName, jobId);
    return { message: `Job ${jobId} removed successfully` };
  }

  @Post(':queueName/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to pause' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.monitoringService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Post(':queueName/resume')
  @ApiOperation({ summary: 'Resume a paused queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to resume' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.monitoringService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  @Delete(':queueName/clean')
  @ApiOperation({ summary: 'Clean completed jobs from a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to clean' })
  @ApiQuery({ name: 'olderThan', required: false, description: 'Clean jobs older than (milliseconds)' })
  @ApiResponse({ status: 200, description: 'Queue cleaned successfully' })
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Query('olderThan') olderThan?: number,
  ) {
    const cleanedCount = await this.monitoringService.cleanQueue(queueName, olderThan);
    return { 
      message: `Queue ${queueName} cleaned successfully`,
      cleanedJobsCount: cleanedCount,
    };
  }

  @Get('rate-limit/status')
  @ApiOperation({ summary: 'Get current rate limit status' })
  @ApiResponse({ status: 200, description: 'Rate limit status retrieved successfully' })
  async getRateLimitStatus() {
    return await this.rateLimitService.getRateLimitStatus();
  }

  @Post('rate-limit/reset')
  @ApiOperation({ summary: 'Reset rate limit counter' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetRateLimit() {
    await this.rateLimitService.resetRateLimit();
    return { message: 'Rate limit counter reset successfully' };
  }

  @Get('circuit-breakers')
  @ApiOperation({ summary: 'Get status of all circuit breakers' })
  @ApiResponse({ status: 200, description: 'Circuit breaker status retrieved successfully' })
  async getCircuitBreakerStatus() {
    const breakers = this.circuitBreakerService.getAllCircuitBreakers();
    const status = Array.from(breakers.entries()).map(([name, breaker]) => ({
      name,
      ...breaker.getStats(),
    }));
    return { circuitBreakers: status };
  }

  @Post('circuit-breakers/:name/reset')
  @ApiOperation({ summary: 'Reset a specific circuit breaker' })
  @ApiParam({ name: 'name', description: 'Name of the circuit breaker' })
  @ApiResponse({ status: 200, description: 'Circuit breaker reset successfully' })
  async resetCircuitBreaker(@Param('name') name: string) {
    const breaker = this.circuitBreakerService.getCircuitBreaker(name);
    if (!breaker) {
      throw new Error(`Circuit breaker ${name} not found`);
    }
    
    breaker.reset();
    return { message: `Circuit breaker ${name} reset successfully` };
  }

  private getQueueByName(name: string): any {
    // This is a placeholder - in a real implementation, you'd inject the specific queues
    // For now, we'll let the monitoring service handle queue resolution
    return null;
  }
}