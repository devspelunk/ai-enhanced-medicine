export const QUEUE_NAMES = {
  DRUG_PROCESSING: 'drug-processing',
  CONTENT_REFRESH: 'content-refresh',
} as const;

export const JOB_TYPES = {
  ENHANCE_CONTENT: 'enhance-content',
  BATCH_ENHANCE: 'batch-enhance',
  REFRESH_CONTENT: 'refresh-content',
  SCAN_MISSING_CONTENT: 'scan-missing-content',
} as const;

export const JOB_PRIORITIES = {
  HIGH: 10,
  MEDIUM: 5,
  LOW: 1,
} as const;

export const RETRY_CONFIG = {
  IMMEDIATE: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000, // 1s, 2s, 4s
    },
  },
  DELAYED: {
    attempts: 2,
    delay: 24 * 60 * 60 * 1000, // 24 hours
    backoff: {
      type: 'exponential' as const,
      delay: 60000, // 1 minute, 2 minutes
    },
  },
  RATE_LIMITED: {
    attempts: 5,
    delay: 5 * 60 * 1000, // 5 minutes initial delay
    backoff: {
      type: 'exponential' as const,
      delay: 60000, // Exponential backoff for rate limits
    },
  },
} as const;

export const PROCESSING_CONFIG = {
  CONCURRENCY: parseInt(process.env.DRUG_PROCESSING_CONCURRENCY || '3', 10),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '5', 10),
  OPENAI_RATE_LIMIT: parseInt(process.env.OPENAI_RATE_LIMIT || '60', 10),
  OPENAI_TIMEOUT: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
} as const;