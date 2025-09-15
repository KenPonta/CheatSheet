// Progress tracking system for file processing operations

export interface ProcessingProgress {
  id: string;
  fileName: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  startTime: number;
  estimatedTimeRemaining?: number;
  bytesProcessed?: number;
  totalBytes?: number;
  error?: string;
}

export type ProcessingStage = 
  | 'queued'
  | 'validating'
  | 'reading'
  | 'extracting-text'
  | 'extracting-images'
  | 'performing-ocr'
  | 'analyzing-structure'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface BatchProgress {
  id: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile?: ProcessingProgress;
  files: ProcessingProgress[];
  startTime: number;
  estimatedTimeRemaining?: number;
  overallProgress: number; // 0-100
}

export type ProgressCallback = (progress: ProcessingProgress) => void;
export type BatchProgressCallback = (progress: BatchProgress) => void;

export class ProgressTracker {
  private progressMap = new Map<string, ProcessingProgress>();
  private batchMap = new Map<string, BatchProgress>();
  private callbacks = new Map<string, ProgressCallback>();
  private batchCallbacks = new Map<string, BatchProgressCallback>();
  private stageWeights: Record<ProcessingStage, number> = {
    'queued': 0,
    'validating': 5,
    'reading': 15,
    'extracting-text': 30,
    'extracting-images': 25,
    'performing-ocr': 15,
    'analyzing-structure': 8,
    'finalizing': 2,
    'completed': 100,
    'failed': 100
  };

  /**
   * Start tracking progress for a file
   */
  startTracking(fileId: string, fileName: string, fileSize?: number): ProcessingProgress {
    const progress: ProcessingProgress = {
      id: fileId,
      fileName,
      stage: 'queued',
      progress: 0,
      message: 'Queued for processing',
      startTime: Date.now(),
      totalBytes: fileSize
    };

    this.progressMap.set(fileId, progress);
    this.notifyProgress(fileId);
    return progress;
  }

  /**
   * Update progress for a file
   */
  updateProgress(
    fileId: string, 
    stage: ProcessingStage, 
    message?: string,
    bytesProcessed?: number
  ): void {
    const progress = this.progressMap.get(fileId);
    if (!progress) {
      return;
    }

    progress.stage = stage;
    progress.progress = this.stageWeights[stage];
    progress.message = message || this.getDefaultMessage(stage);
    
    if (bytesProcessed !== undefined) {
      progress.bytesProcessed = bytesProcessed;
    }

    // Calculate estimated time remaining
    if (progress.progress > 0 && progress.progress < 100) {
      const elapsed = Date.now() - progress.startTime;
      const estimatedTotal = (elapsed / progress.progress) * 100;
      progress.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
    }

    this.notifyProgress(fileId);
    this.updateBatchProgress(fileId);
  }

  /**
   * Update progress with custom percentage
   */
  updateProgressWithPercentage(
    fileId: string,
    stage: ProcessingStage,
    percentage: number,
    message?: string
  ): void {
    const progress = this.progressMap.get(fileId);
    if (!progress) {
      return;
    }

    progress.stage = stage;
    progress.progress = Math.max(0, Math.min(100, percentage));
    progress.message = message || this.getDefaultMessage(stage);

    // Calculate estimated time remaining
    if (progress.progress > 0 && progress.progress < 100) {
      const elapsed = Date.now() - progress.startTime;
      const estimatedTotal = (elapsed / progress.progress) * 100;
      progress.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
    }

    this.notifyProgress(fileId);
    this.updateBatchProgress(fileId);
  }

  /**
   * Mark file processing as completed
   */
  completeProgress(fileId: string, message?: string): void {
    const progress = this.progressMap.get(fileId);
    if (!progress) {
      return;
    }

    progress.stage = 'completed';
    progress.progress = 100;
    progress.message = message || 'Processing completed successfully';
    progress.estimatedTimeRemaining = 0;

    this.notifyProgress(fileId);
    this.updateBatchProgress(fileId);
  }

  /**
   * Mark file processing as failed
   */
  failProgress(fileId: string, error: string): void {
    const progress = this.progressMap.get(fileId);
    if (!progress) {
      return;
    }

    progress.stage = 'failed';
    progress.progress = 100;
    progress.message = 'Processing failed';
    progress.error = error;
    progress.estimatedTimeRemaining = 0;

    this.notifyProgress(fileId);
    this.updateBatchProgress(fileId);
  }

  /**
   * Get current progress for a file
   */
  getProgress(fileId: string): ProcessingProgress | undefined {
    return this.progressMap.get(fileId);
  }

  /**
   * Subscribe to progress updates for a file
   */
  onProgress(fileId: string, callback: ProgressCallback): () => void {
    this.callbacks.set(fileId, callback);
    
    // Send current progress immediately if available
    const progress = this.progressMap.get(fileId);
    if (progress) {
      callback(progress);
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(fileId);
    };
  }

  /**
   * Start tracking batch progress
   */
  startBatchTracking(batchId: string, fileIds: string[]): BatchProgress {
    const batch: BatchProgress = {
      id: batchId,
      totalFiles: fileIds.length,
      completedFiles: 0,
      failedFiles: 0,
      files: fileIds.map(id => this.progressMap.get(id)).filter(Boolean) as ProcessingProgress[],
      startTime: Date.now(),
      overallProgress: 0
    };

    this.batchMap.set(batchId, batch);
    this.notifyBatchProgress(batchId);
    return batch;
  }

  /**
   * Get batch progress
   */
  getBatchProgress(batchId: string): BatchProgress | undefined {
    return this.batchMap.get(batchId);
  }

  /**
   * Subscribe to batch progress updates
   */
  onBatchProgress(batchId: string, callback: BatchProgressCallback): () => void {
    this.batchCallbacks.set(batchId, callback);
    
    // Send current progress immediately if available
    const progress = this.batchMap.get(batchId);
    if (progress) {
      callback(progress);
    }

    // Return unsubscribe function
    return () => {
      this.batchCallbacks.delete(batchId);
    };
  }

  /**
   * Clean up completed or failed progress entries
   */
  cleanup(olderThanMs: number = 60000): number {
    const cutoff = Date.now() - olderThanMs;
    let removedCount = 0;

    // Clean up individual progress entries
    for (const [fileId, progress] of this.progressMap.entries()) {
      if ((progress.stage === 'completed' || progress.stage === 'failed') && 
          progress.startTime < cutoff) {
        this.progressMap.delete(fileId);
        this.callbacks.delete(fileId);
        removedCount++;
      }
    }

    // Clean up batch progress entries
    for (const [batchId, batch] of this.batchMap.entries()) {
      const allCompleted = batch.files.every(f => 
        f.stage === 'completed' || f.stage === 'failed');
      
      if (allCompleted && batch.startTime < cutoff) {
        this.batchMap.delete(batchId);
        this.batchCallbacks.delete(batchId);
      }
    }

    return removedCount;
  }

  /**
   * Get all active progress entries
   */
  getAllProgress(): ProcessingProgress[] {
    return Array.from(this.progressMap.values());
  }

  /**
   * Get all active batch progress entries
   */
  getAllBatchProgress(): BatchProgress[] {
    return Array.from(this.batchMap.values());
  }

  private notifyProgress(fileId: string): void {
    const progress = this.progressMap.get(fileId);
    const callback = this.callbacks.get(fileId);
    
    if (progress && callback) {
      callback(progress);
    }
  }

  private notifyBatchProgress(batchId: string): void {
    const batch = this.batchMap.get(batchId);
    const callback = this.batchCallbacks.get(batchId);
    
    if (batch && callback) {
      callback(batch);
    }
  }

  private updateBatchProgress(fileId: string): void {
    // Find which batch this file belongs to
    for (const [batchId, batch] of this.batchMap.entries()) {
      const fileIndex = batch.files.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        // Update the file in the batch
        const progress = this.progressMap.get(fileId);
        if (progress) {
          batch.files[fileIndex] = progress;
          
          // Update batch statistics
          batch.completedFiles = batch.files.filter(f => f.stage === 'completed').length;
          batch.failedFiles = batch.files.filter(f => f.stage === 'failed').length;
          batch.currentFile = batch.files.find(f => 
            f.stage !== 'completed' && f.stage !== 'failed') || progress;
          
          // Calculate overall progress
          const totalProgress = batch.files.reduce((sum, f) => sum + f.progress, 0);
          batch.overallProgress = totalProgress / batch.totalFiles;
          
          // Calculate estimated time remaining
          if (batch.overallProgress > 0 && batch.overallProgress < 100) {
            const elapsed = Date.now() - batch.startTime;
            const estimatedTotal = (elapsed / batch.overallProgress) * 100;
            batch.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
          }
          
          this.notifyBatchProgress(batchId);
        }
        break;
      }
    }
  }

  private getDefaultMessage(stage: ProcessingStage): string {
    switch (stage) {
      case 'queued': return 'Queued for processing';
      case 'validating': return 'Validating file';
      case 'reading': return 'Reading file content';
      case 'extracting-text': return 'Extracting text content';
      case 'extracting-images': return 'Extracting images';
      case 'performing-ocr': return 'Performing OCR on images';
      case 'analyzing-structure': return 'Analyzing document structure';
      case 'finalizing': return 'Finalizing extraction';
      case 'completed': return 'Processing completed';
      case 'failed': return 'Processing failed';
      default: return 'Processing...';
    }
  }
}

// Global progress tracker instance
let globalTracker: ProgressTracker | null = null;

export function getGlobalProgressTracker(): ProgressTracker {
  if (!globalTracker) {
    globalTracker = new ProgressTracker();
  }
  return globalTracker;
}

export function setGlobalProgressTracker(tracker: ProgressTracker): void {
  globalTracker = tracker;
}