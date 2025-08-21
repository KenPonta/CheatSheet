// Enhanced file processor factory with caching, progress tracking, and memory management

import { FileProcessor } from './base-processor';
import { ProcessingResult, SupportedFileType } from './types';
import { FileProcessorFactory } from './factory';
import { FileProcessingCache, getGlobalCache } from './cache';
import { ProgressTracker, getGlobalProgressTracker, ProcessingProgress, BatchProgress } from './progress-tracker';
import { MemoryManager, getGlobalMemoryManager } from './memory-manager';

export interface EnhancedProcessingOptions {
  useCache?: boolean;
  trackProgress?: boolean;
  manageMemory?: boolean;
  onProgress?: (progress: ProcessingProgress) => void;
  onBatchProgress?: (progress: BatchProgress) => void;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface ProcessingQueue {
  id: string;
  file: File;
  options: EnhancedProcessingOptions;
  resolve: (result: ProcessingResult) => void;
  reject: (error: Error) => void;
  addedAt: number;
  priority: number;
}

export class EnhancedFileProcessorFactory {
  private cache: FileProcessingCache;
  private progressTracker: ProgressTracker;
  private memoryManager: MemoryManager;
  private processingQueue: ProcessingQueue[] = [];
  private isProcessing = false;
  private activeProcessors = new Map<string, AbortController>();

  constructor(
    cache?: FileProcessingCache,
    progressTracker?: ProgressTracker,
    memoryManager?: MemoryManager
  ) {
    this.cache = cache || getGlobalCache();
    this.progressTracker = progressTracker || getGlobalProgressTracker();
    this.memoryManager = memoryManager || getGlobalMemoryManager();
  }

  /**
   * Process a single file with enhanced features
   */
  async processFile(file: File, options: EnhancedProcessingOptions = {}): Promise<ProcessingResult> {
    const fileId = this.generateFileId(file);
    
    // Set default options
    const opts: EnhancedProcessingOptions = {
      useCache: true,
      trackProgress: true,
      manageMemory: true,
      priority: 'normal',
      timeout: 300000, // 5 minutes
      ...options
    };

    // Check cache first if enabled
    if (opts.useCache) {
      const cachedResult = await this.cache.get(file);
      if (cachedResult) {
        if (opts.trackProgress && opts.onProgress) {
          const progress = this.progressTracker.startTracking(fileId, file.name, file.size);
          this.progressTracker.completeProgress(fileId, 'Retrieved from cache');
          opts.onProgress(progress);
        }
        return cachedResult;
      }
    }

    // Check memory constraints if enabled
    if (opts.manageMemory) {
      const canProcess = this.memoryManager.canProcessFile(file.size);
      if (!canProcess.canProcess) {
        throw new Error(`Cannot process file: ${canProcess.reason}`);
      }
    }

    return new Promise<ProcessingResult>((resolve, reject) => {
      const queueItem: ProcessingQueue = {
        id: fileId,
        file,
        options: opts,
        resolve,
        reject,
        addedAt: Date.now(),
        priority: this.getPriorityValue(opts.priority || 'normal')
      };

      this.addToQueue(queueItem);
      this.processQueue();
    });
  }

  /**
   * Process multiple files with batch progress tracking
   */
  async processMultipleFiles(
    files: File[],
    options: EnhancedProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileIds = files.map(file => this.generateFileId(file));
    
    // Start batch tracking if enabled
    if (options.trackProgress) {
      this.progressTracker.startBatchTracking(batchId, fileIds);
      
      if (options.onBatchProgress) {
        this.progressTracker.onBatchProgress(batchId, options.onBatchProgress);
      }
    }

    // Process files with individual progress tracking
    const promises = files.map(file => {
      const fileOptions = { ...options };
      
      if (options.trackProgress && !fileOptions.onProgress) {
        fileOptions.onProgress = (progress) => {
          // Progress is automatically tracked by the progress tracker
        };
      }
      
      return this.processFile(file, fileOptions);
    });

    try {
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      memory: this.memoryManager.getMemoryStats(),
      queue: {
        pending: this.processingQueue.length,
        active: this.activeProcessors.size,
        totalProcessed: this.progressTracker.getAllProgress().filter(p => p.stage === 'completed').length,
        totalFailed: this.progressTracker.getAllProgress().filter(p => p.stage === 'failed').length
      }
    };
  }

  /**
   * Cancel processing for a specific file
   */
  cancelProcessing(fileId: string): boolean {
    // Remove from queue if not yet started
    const queueIndex = this.processingQueue.findIndex(item => item.id === fileId);
    if (queueIndex !== -1) {
      const item = this.processingQueue.splice(queueIndex, 1)[0];
      item.reject(new Error('Processing cancelled'));
      return true;
    }

    // Cancel active processing
    const controller = this.activeProcessors.get(fileId);
    if (controller) {
      controller.abort();
      this.activeProcessors.delete(fileId);
      this.progressTracker.failProgress(fileId, 'Processing cancelled');
      return true;
    }

    return false;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Cancel all active processing
    for (const [fileId, controller] of this.activeProcessors.entries()) {
      controller.abort();
      this.progressTracker.failProgress(fileId, 'System shutdown');
    }
    
    // Reject all queued items
    for (const item of this.processingQueue) {
      item.reject(new Error('System shutdown'));
    }
    
    this.processingQueue = [];
    this.activeProcessors.clear();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        // Check if we can process more files
        const limits = this.memoryManager.getProcessingLimits();
        if (this.activeProcessors.size >= limits.maxConcurrentFiles) {
          break;
        }

        // Get highest priority item
        this.processingQueue.sort((a, b) => b.priority - a.priority);
        const item = this.processingQueue.shift();
        
        if (!item) {
          break;
        }

        // Process the file
        this.processQueueItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueueItem(item: ProcessingQueue): Promise<void> {
    const { id, file, options, resolve, reject } = item;
    const controller = new AbortController();
    
    this.activeProcessors.set(id, controller);
    
    try {
      // Start memory tracking
      if (options.manageMemory) {
        this.memoryManager.startProcessing(id);
      }

      // Start progress tracking
      let progress: ProcessingProgress | undefined;
      if (options.trackProgress) {
        progress = this.progressTracker.startTracking(id, file.name, file.size);
        
        if (options.onProgress) {
          const unsubscribe = this.progressTracker.onProgress(id, options.onProgress);
          controller.signal.addEventListener('abort', unsubscribe);
        }
      }

      // Process the file with timeout
      const result = await this.processFileWithTimeout(file, id, options.timeout || 300000);

      // Cache the result if enabled
      if (options.useCache && result.status === 'success') {
        await this.cache.set(file, result);
      }

      // Complete progress tracking
      if (options.trackProgress) {
        this.progressTracker.completeProgress(id);
      }

      resolve(result);
    } catch (error) {
      // Handle processing error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (options.trackProgress) {
        this.progressTracker.failProgress(id, errorMessage);
      }

      reject(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      // Clean up
      this.activeProcessors.delete(id);
      
      if (options.manageMemory) {
        this.memoryManager.finishProcessing(id);
      }

      // Continue processing queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private async processFileWithTimeout(file: File, fileId: string, timeout: number): Promise<ProcessingResult> {
    return new Promise<ProcessingResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Processing timeout after ${timeout}ms`));
      }, timeout);

      this.processFileInternal(file, fileId)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private async processFileInternal(file: File, fileId: string): Promise<ProcessingResult> {
    // Update progress
    this.progressTracker.updateProgress(fileId, 'validating', 'Validating file');

    // Create processor
    const processor = FileProcessorFactory.createProcessor(file);
    if (!processor) {
      throw new Error('No suitable processor found for this file type');
    }

    // Update progress
    this.progressTracker.updateProgress(fileId, 'reading', 'Reading file content');

    // Process the file
    const result = await processor.processFile(file);
    
    // Update the file ID to match our tracking
    result.fileId = fileId;
    
    return result;
  }

  private addToQueue(item: ProcessingQueue): void {
    this.processingQueue.push(item);
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private generateFileId(file: File): string {
    return `file_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global enhanced factory instance
let globalEnhancedFactory: EnhancedFileProcessorFactory | null = null;

export function getGlobalEnhancedFactory(): EnhancedFileProcessorFactory {
  if (!globalEnhancedFactory) {
    globalEnhancedFactory = new EnhancedFileProcessorFactory();
  }
  return globalEnhancedFactory;
}

export function setGlobalEnhancedFactory(factory: EnhancedFileProcessorFactory): void {
  if (globalEnhancedFactory) {
    globalEnhancedFactory.destroy();
  }
  globalEnhancedFactory = factory;
}