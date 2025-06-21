import { Injectable, Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: Array<new (...args: any[]) => Error>;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreakerInstance>();

  createCircuitBreaker(name: string, options: CircuitBreakerOptions): CircuitBreakerInstance {
    const breaker = new CircuitBreakerInstance(name, options, this.logger);
    this.breakers.set(name, breaker);
    return breaker;
  }

  getCircuitBreaker(name: string): CircuitBreakerInstance | undefined {
    return this.breakers.get(name);
  }

  getAllCircuitBreakers(): Map<string, CircuitBreakerInstance> {
    return this.breakers;
  }

  getCircuitBreakerStats(name: string): any {
    const breaker = this.breakers.get(name);
    return breaker ? breaker.getStats() : null;
  }
}

export class CircuitBreakerInstance {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private successCount = 0;
  private totalAttempts = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions,
    private readonly logger: Logger,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker ${this.name} is OPEN. Next attempt allowed at ${new Date(this.nextAttemptTime)}`);
      }
      
      // Try to transition to HALF_OPEN
      this.state = CircuitBreakerState.HALF_OPEN;
      this.logger.log(`Circuit breaker ${this.name} transitioned to HALF_OPEN`);
    }

    this.totalAttempts++;
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.logger.log(`Circuit breaker ${this.name} transitioned to CLOSED after successful operation`);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private onFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Check if this is an expected error that shouldn't trigger the circuit breaker
    if (this.options.expectedErrors && error instanceof Error) {
      const isExpectedError = this.options.expectedErrors.some(
        expectedError => error instanceof expectedError
      );
      if (isExpectedError) {
        return;
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
      this.logger.warn(`Circuit breaker ${this.name} transitioned to OPEN after failure in HALF_OPEN state`);
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
      this.logger.warn(`Circuit breaker ${this.name} transitioned to OPEN after ${this.failureCount} failures`);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  getStats(): {
    name: string;
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    totalAttempts: number;
    lastFailureTime: number;
    nextAttemptTime: number;
    failureRate: number;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalAttempts: this.totalAttempts,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      failureRate: this.totalAttempts > 0 ? (this.failureCount / this.totalAttempts) * 100 : 0,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalAttempts = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.logger.log(`Circuit breaker ${this.name} has been reset`);
  }

  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
    this.logger.log(`Circuit breaker ${this.name} forced to OPEN state`);
  }

  forceClose(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = 0;
    this.logger.log(`Circuit breaker ${this.name} forced to CLOSED state`);
  }
}