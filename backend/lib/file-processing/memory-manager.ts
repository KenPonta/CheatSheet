// Memory management system for large file processing

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  available: number;
}

export interface ProcessingLimits {
  maxConcurrentFiles: number;
  maxFileSize: number;
  maxTotalMemory: number;
  chunkSize: number;
}

export interface MemoryConfig {
  warningThreshold: number; // Percentage (0-100)
  criticalThreshold: number; // Percentage (0-100)
  maxConcurrentFiles: number;
  maxFileSize: number;
  enableGarbageCollection: boolean;
  gcIntervalMs: number;
}

export class MemoryManager {
  private activeProcessing = new Set<string>();
  private memoryUsageHistory: MemoryUsage[] = [];
  private gcTimer?: NodeJS.Timeout;
  
  private readonly config: MemoryConfig = {
    warningThreshold: 80,
    criticalThreshold: 95, // Increased for development
    maxConcurrentFiles: 2, // Reduced for better memory management
    maxFileSize: 50 * 1024 * 1024, // Reduced to 50MB
    enableGarbageCollection: true,
    gcIntervalMs: 15000 // More frequent GC
  };

  constructor(config?: Partial<MemoryConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    if (this.config.enableGarbageCollection) {
      this.startGarbageCollection();
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js environment
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        percentage: (usage.heapUsed / usage.heapTotal) * 100,
        available: usage.heapTotal - usage.heapUsed
      };
    } else if (typeof performance !== 'undefined' && 'memory' in performance) {
      // Browser environment with memory API
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        available: memory.totalJSHeapSize - memory.usedJSHeapSize
      };
    } else {
      // Fallback for environments without memory API
      return {
        used: 0,
        total: 0,
        percentage: 0,
        available: 0
      };
    }
  }

  /**
   * Check if we can process a file given current memory constraints
   */
  canProcessFile(fileSize: number): { canProcess: boolean; reason?: string } {
    // Check file size limit
    if (fileSize > this.config.maxFileSize) {
      return {
        canProcess: false,
        reason: `File size ${this.formatBytes(fileSize)} exceeds maximum allowed size of ${this.formatBytes(this.config.maxFileSize)}`
      };
    }

    // Check concurrent processing limit
    if (this.activeProcessing.size >= this.config.maxConcurrentFiles) {
      return {
        canProcess: false,
        reason: `Maximum concurrent files (${this.config.maxConcurrentFiles}) already being processed`
      };
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.percentage > this.config.criticalThreshold) {
      return {
        canProcess: false,
        reason: `Memory usage at ${memoryUsage.percentage.toFixed(1)}% (critical threshold: ${this.config.criticalThreshold}%)`
      };
    }

    // Estimate if file processing would exceed memory limits
    const estimatedMemoryNeeded = this.estimateMemoryNeeded(fileSize);
    if (memoryUsage.used + estimatedMemoryNeeded > memoryUsage.total * 0.9) {
      return {
        canProcess: false,
        reason: `Estimated memory needed (${this.formatBytes(estimatedMemoryNeeded)}) would exceed available memory`
      };
    }

    return { canProcess: true };
  }

  /**
   * Register that a file is being processed
   */
  startProcessing(fileId: string): void {
    this.activeProcessing.add(fileId);
    this.recordMemoryUsage();
  }

  /**
   * Register that file processing is complete
   */
  finishProcessing(fileId: string): void {
    this.activeProcessing.delete(fileId);
    this.recordMemoryUsage();
    
    // Trigger garbage collection if memory usage is high
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.percentage > this.config.warningThreshold) {
      this.forceGarbageCollection();
    }
  }

  /**
   * Get processing limits based on current memory state
   */
  getProcessingLimits(): ProcessingLimits {
    const memoryUsage = this.getMemoryUsage();
    let maxConcurrentFiles = this.config.maxConcurrentFiles;
    let maxFileSize = this.config.maxFileSize;
    
    // Reduce limits if memory usage is high
    if (memoryUsage.percentage > this.config.warningThreshold) {
      maxConcurrentFiles = Math.max(1, Math.floor(maxConcurrentFiles * 0.5));
      maxFileSize = Math.floor(maxFileSize * 0.7);
    }
    
    if (memoryUsage.percentage > this.config.criticalThreshold) {
      maxConcurrentFiles = 1;
      maxFileSize = Math.floor(maxFileSize * 0.5);
    }

    return {
      maxConcurrentFiles,
      maxFileSize,
      maxTotalMemory: memoryUsage.total,
      chunkSize: this.calculateOptimalChunkSize(memoryUsage)
    };
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: MemoryUsage;
    average: MemoryUsage;
    peak: MemoryUsage;
    activeFiles: number;
    historyLength: number;
  } {
    const current = this.getMemoryUsage();
    
    if (this.memoryUsageHistory.length === 0) {
      return {
        current,
        average: current,
        peak: current,
        activeFiles: this.activeProcessing.size,
        historyLength: 0
      };
    }

    const average: MemoryUsage = {
      used: this.memoryUsageHistory.reduce((sum, usage) => sum + usage.used, 0) / this.memoryUsageHistory.length,
      total: this.memoryUsageHistory.reduce((sum, usage) => sum + usage.total, 0) / this.memoryUsageHistory.length,
      percentage: this.memoryUsageHistory.reduce((sum, usage) => sum + usage.percentage, 0) / this.memoryUsageHistory.length,
      available: this.memoryUsageHistory.reduce((sum, usage) => sum + usage.available, 0) / this.memoryUsageHistory.length
    };

    const peak = this.memoryUsageHistory.reduce((max, usage) => 
      usage.percentage > max.percentage ? usage : max, this.memoryUsageHistory[0]);

    return {
      current,
      average,
      peak,
      activeFiles: this.activeProcessing.size,
      historyLength: this.memoryUsageHistory.length
    };
  }

  /**
   * Create a memory-aware file reader for large files
   */
  createChunkedReader(file: File, chunkSize?: number): AsyncGenerator<ArrayBuffer, void, unknown> {
    const actualChunkSize = chunkSize || this.calculateOptimalChunkSize(this.getMemoryUsage());
    
    return this.readFileInChunks(file, actualChunkSize);
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    } else if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = undefined;
    }
    this.activeProcessing.clear();
    this.memoryUsageHistory = [];
  }

  private async* readFileInChunks(file: File, chunkSize: number): AsyncGenerator<ArrayBuffer, void, unknown> {
    let offset = 0;
    
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const buffer = await chunk.arrayBuffer();
      
      // Check memory usage before yielding chunk
      const memoryUsage = this.getMemoryUsage();
      if (memoryUsage.percentage > this.config.criticalThreshold) {
        this.forceGarbageCollection();
        
        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      yield buffer;
      offset += chunkSize;
    }
  }

  private estimateMemoryNeeded(fileSize: number): number {
    // Rough estimation: file size + processing overhead
    // Text extraction typically uses 2-3x file size
    // Image processing can use 5-10x file size
    // We'll use a conservative 4x multiplier
    return fileSize * 4;
  }

  private calculateOptimalChunkSize(memoryUsage: MemoryUsage): number {
    const baseChunkSize = 1024 * 1024; // 1MB
    
    if (memoryUsage.percentage < 50) {
      return baseChunkSize * 4; // 4MB chunks when memory is abundant
    } else if (memoryUsage.percentage < 75) {
      return baseChunkSize * 2; // 2MB chunks when memory is moderate
    } else {
      return baseChunkSize; // 1MB chunks when memory is tight
    }
  }

  private recordMemoryUsage(): void {
    const usage = this.getMemoryUsage();
    this.memoryUsageHistory.push(usage);
    
    // Keep only last 100 entries
    if (this.memoryUsageHistory.length > 100) {
      this.memoryUsageHistory.shift();
    }
  }

  private startGarbageCollection(): void {
    this.gcTimer = setInterval(() => {
      const memoryUsage = this.getMemoryUsage();
      
      // Trigger GC if memory usage is above warning threshold
      if (memoryUsage.percentage > this.config.warningThreshold) {
        this.forceGarbageCollection();
      }
      
      this.recordMemoryUsage();
    }, this.config.gcIntervalMs);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Global memory manager instance
let globalMemoryManager: MemoryManager | null = null;

export function getGlobalMemoryManager(): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager();
  }
  return globalMemoryManager;
}

export function setGlobalMemoryManager(manager: MemoryManager): void {
  if (globalMemoryManager) {
    globalMemoryManager.destroy();
  }
  globalMemoryManager = manager;
}