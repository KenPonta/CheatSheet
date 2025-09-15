// Processing configuration management for CPU vs Memory optimization

export type ProcessingMode = 'cpu_optimized' | 'memory_optimized' | 'balanced';

export interface ProcessingConfig {
  mode: ProcessingMode;
  chunkSize: number;
  maxMemory: number;
  enableDiskBuffer: boolean;
  sequentialProcessing: boolean;
  maxConcurrentFiles: number;
  enableImageExtraction: boolean;
  enableOCR: boolean;
  gcInterval: number;
}

export class ProcessingConfigManager {
  private static instance: ProcessingConfigManager;
  private config: ProcessingConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ProcessingConfigManager {
    if (!ProcessingConfigManager.instance) {
      ProcessingConfigManager.instance = new ProcessingConfigManager();
    }
    return ProcessingConfigManager.instance;
  }

  getConfig(): ProcessingConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private loadConfig(): ProcessingConfig {
    const mode = (process.env.PROCESSING_MODE as ProcessingMode) || 'balanced';
    
    // Base configurations for different modes
    const modeConfigs: Record<ProcessingMode, Partial<ProcessingConfig>> = {
      cpu_optimized: {
        chunkSize: 32 * 1024, // 32KB - very small chunks
        maxMemory: 50 * 1024 * 1024, // 50MB - very low memory
        enableDiskBuffer: true,
        sequentialProcessing: true,
        maxConcurrentFiles: 1,
        enableImageExtraction: false, // Disable to save memory
        enableOCR: true, // CPU-intensive but memory efficient
        gcInterval: 5000 // Frequent GC
      },
      memory_optimized: {
        chunkSize: 4 * 1024 * 1024, // 4MB - large chunks
        maxMemory: 500 * 1024 * 1024, // 500MB - high memory
        enableDiskBuffer: false,
        sequentialProcessing: false,
        maxConcurrentFiles: 5,
        enableImageExtraction: true,
        enableOCR: true,
        gcInterval: 30000 // Less frequent GC
      },
      balanced: {
        chunkSize: 256 * 1024, // 256KB - medium chunks
        maxMemory: 200 * 1024 * 1024, // 200MB - moderate memory
        enableDiskBuffer: true,
        sequentialProcessing: true,
        maxConcurrentFiles: 2,
        enableImageExtraction: false,
        enableOCR: true,
        gcInterval: 15000 // Moderate GC
      }
    };

    const baseConfig = modeConfigs[mode];

    return {
      mode,
      chunkSize: parseInt(process.env.PROCESSING_CHUNK_SIZE || '') || baseConfig.chunkSize!,
      maxMemory: parseInt(process.env.PROCESSING_MAX_MEMORY || '') || baseConfig.maxMemory!,
      enableDiskBuffer: process.env.ENABLE_DISK_BUFFER === 'true' ?? baseConfig.enableDiskBuffer!,
      sequentialProcessing: process.env.SEQUENTIAL_PROCESSING === 'true' ?? baseConfig.sequentialProcessing!,
      maxConcurrentFiles: baseConfig.maxConcurrentFiles!,
      enableImageExtraction: baseConfig.enableImageExtraction!,
      enableOCR: baseConfig.enableOCR!,
      gcInterval: baseConfig.gcInterval!
    };
  }

  /**
   * Get optimal settings for current environment
   */
  getOptimalSettings(): {
    shouldUseCPUOptimized: boolean;
    shouldUseStreaming: boolean;
    shouldUseDiskBuffer: boolean;
    recommendedChunkSize: number;
    recommendedMemoryLimit: number;
  } {
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const isLowMemoryEnv = this.config.maxMemory < 100 * 1024 * 1024; // Less than 100MB
    
    return {
      shouldUseCPUOptimized: this.config.mode === 'cpu_optimized' || isServerless || isLowMemoryEnv,
      shouldUseStreaming: this.config.enableDiskBuffer || isServerless,
      shouldUseDiskBuffer: this.config.enableDiskBuffer,
      recommendedChunkSize: this.config.chunkSize,
      recommendedMemoryLimit: this.config.maxMemory
    };
  }

  /**
   * Get processing options for file processing
   */
  getProcessingOptions(): {
    enableOCR: boolean;
    preserveFormatting: boolean;
    extractImages: boolean;
    enableProgressTracking: boolean;
    chunkSize: number;
    maxMemory: number;
    sequentialProcessing: boolean;
  } {
    return {
      enableOCR: this.config.enableOCR,
      preserveFormatting: this.config.mode !== 'cpu_optimized', // Disable for CPU mode
      extractImages: this.config.enableImageExtraction,
      enableProgressTracking: this.config.mode !== 'cpu_optimized', // Disable for CPU mode
      chunkSize: this.config.chunkSize,
      maxMemory: this.config.maxMemory,
      sequentialProcessing: this.config.sequentialProcessing
    };
  }

  /**
   * Log current configuration
   */
  logConfig(): void {
    console.log('Processing Configuration:', {
      mode: this.config.mode,
      chunkSize: `${Math.round(this.config.chunkSize / 1024)}KB`,
      maxMemory: `${Math.round(this.config.maxMemory / 1024 / 1024)}MB`,
      enableDiskBuffer: this.config.enableDiskBuffer,
      sequentialProcessing: this.config.sequentialProcessing,
      maxConcurrentFiles: this.config.maxConcurrentFiles,
      enableImageExtraction: this.config.enableImageExtraction,
      enableOCR: this.config.enableOCR
    });
  }
}

// Convenience functions
export function getProcessingConfig(): ProcessingConfig {
  return ProcessingConfigManager.getInstance().getConfig();
}

export function getOptimalProcessingSettings() {
  return ProcessingConfigManager.getInstance().getOptimalSettings();
}

export function getProcessingOptions() {
  return ProcessingConfigManager.getInstance().getProcessingOptions();
}

export function logProcessingConfig(): void {
  ProcessingConfigManager.getInstance().logConfig();
}