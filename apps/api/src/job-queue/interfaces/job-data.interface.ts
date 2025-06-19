export interface DrugProcessingJob {
  drugId: string;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  processingType: 'enhance' | 'refresh' | 'batch';
  metadata?: {
    initiatedBy?: string;
    reason?: string;
    batchId?: string;
    batchIndex?: number;
  };
}

export interface BatchProcessingJob {
  drugIds: string[];
  batchSize: number;
  priority: 'high' | 'medium' | 'low';
  processingType: 'enhance' | 'refresh';
  metadata?: {
    initiatedBy?: string;
    totalBatches?: number;
    currentBatch?: number;
    batchId?: string;
  };
}

export interface ContentRefreshJob {
  drugId: string;
  lastRefreshed: Date;
  reason: 'scheduled' | 'manual' | 'content_outdated';
  metadata?: {
    daysOld?: number;
    contentScore?: number;
  };
}

export interface JobResult {
  success: boolean;
  drugId: string;
  processingTime?: number;
  contentGenerated?: boolean;
  fallbackUsed?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BatchJobResult {
  success: boolean;
  batchId: string;
  processedCount: number;
  failedCount: number;
  results: JobResult[];
  processingTime: number;
}