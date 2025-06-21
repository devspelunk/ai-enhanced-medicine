import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JobQueueModule } from './job-queue.module';
import { JobQueueController } from './job-queue.controller';
import { DrugContentScannerService } from './services/drug-content-scanner.service';
import { RateLimitManagerService } from './services/rate-limit-manager.service';
import { FallbackContentService } from './services/fallback-content.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { JobMonitoringService } from './services/job-monitoring.service';
import { DrugProcessingProcessor } from './processors/drug-processing.processor';
import { Drug } from '../drugs/drugs.entity';
import { DrugLabel } from '../drugs/drug-label.entity';
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity';
import { AiContentModule } from '../ai-content/ai-content.module';
import { McpModule } from '../mcp/mcp.module';
import Redis from 'ioredis';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    JobQueueModule,
    AiContentModule,
    McpModule,
    TypeOrmModule.forFeature([Drug, DrugLabel, AIEnhancedContent]),
  ],
  controllers: [JobQueueController],
  providers: [
    DrugContentScannerService,
    RateLimitManagerService,
    FallbackContentService,
    CircuitBreakerService,
    JobMonitoringService,
    DrugProcessingProcessor,
    {
      provide: Redis,
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
        });
      },
    },
  ],
  exports: [
    DrugContentScannerService,
    JobMonitoringService,
    RateLimitManagerService,
    FallbackContentService,
    CircuitBreakerService,
  ],
})
export class JobQueueMainModule {}