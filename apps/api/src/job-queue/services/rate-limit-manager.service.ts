import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { PROCESSING_CONFIG } from '../constants/queue-config.constants';

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

@Injectable()
export class RateLimitManagerService {
  private readonly logger = new Logger(RateLimitManagerService.name);
  private readonly RATE_LIMIT_KEY = 'openai_request_count';
  private readonly RATE_LIMIT_WINDOW = 60; // 1 minute window

  constructor(
    @Inject(Redis)
    private readonly redis: Redis,
  ) {}

  async enforceRateLimit(): Promise<void> {
    const currentCount = await this.getCurrentRequestCount();
    
    if (currentCount >= PROCESSING_CONFIG.OPENAI_RATE_LIMIT) {
      const ttl = await this.redis.ttl(this.RATE_LIMIT_KEY);
      const retryAfter = ttl > 0 ? ttl : this.RATE_LIMIT_WINDOW;
      
      this.logger.warn(`OpenAI rate limit exceeded: ${currentCount}/${PROCESSING_CONFIG.OPENAI_RATE_LIMIT}. Retry after ${retryAfter} seconds`);
      throw new RateLimitError(
        `OpenAI rate limit exceeded. Current: ${currentCount}/${PROCESSING_CONFIG.OPENAI_RATE_LIMIT}`,
        retryAfter
      );
    }

    await this.incrementRequestCount();
    this.logger.debug(`OpenAI API request recorded. Current count: ${currentCount + 1}/${PROCESSING_CONFIG.OPENAI_RATE_LIMIT}`);
  }

  async getCurrentRequestCount(): Promise<number> {
    const count = await this.redis.get(this.RATE_LIMIT_KEY);
    return count ? parseInt(count, 10) : 0;
  }

  async incrementRequestCount(): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(this.RATE_LIMIT_KEY);
    pipeline.expire(this.RATE_LIMIT_KEY, this.RATE_LIMIT_WINDOW);
    await pipeline.exec();
  }

  async getRateLimitStatus(): Promise<{
    currentCount: number;
    limit: number;
    remainingRequests: number;
    resetTime: number;
  }> {
    const currentCount = await this.getCurrentRequestCount();
    const ttl = await this.redis.ttl(this.RATE_LIMIT_KEY);
    
    return {
      currentCount,
      limit: PROCESSING_CONFIG.OPENAI_RATE_LIMIT,
      remainingRequests: Math.max(0, PROCESSING_CONFIG.OPENAI_RATE_LIMIT - currentCount),
      resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + (this.RATE_LIMIT_WINDOW * 1000),
    };
  }

  async resetRateLimit(): Promise<void> {
    await this.redis.del(this.RATE_LIMIT_KEY);
    this.logger.log('Rate limit counter reset');
  }

  async canMakeRequest(): Promise<boolean> {
    const currentCount = await this.getCurrentRequestCount();
    return currentCount < PROCESSING_CONFIG.OPENAI_RATE_LIMIT;
  }

  async waitForRateLimit(): Promise<void> {
    const canMake = await this.canMakeRequest();
    if (canMake) return;

    const ttl = await this.redis.ttl(this.RATE_LIMIT_KEY);
    const waitTime = ttl > 0 ? ttl * 1000 : this.RATE_LIMIT_WINDOW * 1000;
    
    this.logger.log(`Waiting ${waitTime}ms for rate limit reset`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  async getOptimalDelay(): Promise<number> {
    const status = await this.getRateLimitStatus();
    
    if (status.remainingRequests === 0) {
      // If no requests remaining, wait for reset
      return status.resetTime - Date.now();
    }
    
    if (status.remainingRequests < 5) {
      // If close to limit, add some delay to spread requests
      return Math.random() * 5000; // 0-5 seconds
    }
    
    // Plenty of requests remaining
    return Math.random() * 1000; // 0-1 second
  }
}