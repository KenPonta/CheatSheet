/**
 * Performance Integration Service
 * Integrates all performance optimizations into a unified service
 */

import { PerformanceOptimizedImageGenerator, OptimizationConfig } from './performance-optimized-image-generator';
import { ImageCacheService, CacheConfig } from './image-cache-service';
import { PerformanceMonitor } from '../performance/performance-monitor';
import { FlatLineImageRequest, GeneratedImage } from './simple-image-generator';

interface IntegrationConfig {
  imageGeneration: Partial<OptimizationConfig>;
  caching: Partial<CacheConfig>;
  monitoring: {
    enabled: boolean;
    intervalMs: number;
    enableAutoOptimization: boolean;
  };
  preloading: {
    enabled: boolean;
    commonPatterns: boolean;
    userPatterns: boolean;
  };
}

interface PerformanceMetrics {
  imageGeneration: {
    averageTime: number;
    cacheHitRate: number;
    throughput: number;
  };
  caching: {
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  system: {
    overallScore: number;
    bottlenecks: number;
    recommendations: string[];
  };
}

/**
 * Unified performance optimization service
 */
export class PerformanceIntegrationService {
  private imageGenerator: PerformanceOptimizedImageGenerator;
  private cacheService: ImageCacheService;
  private performanceMonitor: PerformanceMonitor;
  private config: IntegrationConfig;
  private isInitialized = false;
  private autoOptimizationTimer?: NodeJS.Timeout;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = {
      imageGeneration: {
        enableCaching: true,
        maxCacheSize: 100,
        enableSVGOptimization: true,
        enableLazyGeneration: true,
        batchSize: 5,
        compressionLevel: 'basic',
        ...config.imageGeneration
      },
      caching: {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxEntries: 1000,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        compressionEnabled: true,
        ...config.caching
      },
      monitoring: {
        enabled: true,
        intervalMs: 30000, // 30 seconds
        enableAutoOptimization: true,
        ...config.monitoring
      },
      preloading: {
        enabled: true,
        commonPatterns: true,
        userPatterns: true,
        ...config.preloading
      }
    };

    this.imageGenerator = new PerformanceOptimizedImageGenerator(this.config.imageGeneration);
    this.cacheService = new ImageCacheService(this.config.caching);
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize the performance integration service
   */
  async initialize(sessionId?: string): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing Performance Integration Service...');

    // Start performance monitoring
    if (this.config.monitoring.enabled) {
      this.performanceMonitor.startMonitoring(this.config.monitoring.intervalMs);
    }

    // Preload common images
    if (this.config.preloading.enabled) {
      await this.preloadImages(sessionId);
    }

    // Start auto-optimization
    if (this.config.monitoring.enableAutoOptimization) {
      this.startAutoOptimization();
    }

    this.isInitialized = true;
    console.log('Performance Integration Service initialized successfully');
  }

  /**
   * Generate optimized image with full performance tracking
   */
  async generateImage(request: FlatLineImageRequest, sessionId?: string): Promise<GeneratedImage> {
    if (!this.isInitialized) {
      await this.initialize(sessionId);
    }

    return await this.performanceMonitor.trackExecution(
      'integrated_image_generation',
      async () => {
        // Try cache first
        const cacheKey = this.cacheService.generateKey(request);
        const cached = await this.cacheService.get(cacheKey);
        
        if (cached) {
          this.performanceMonitor.recordMetric('cache_hit', 1, 'boolean', { sessionId });
          return cached;
        }

        this.performanceMonitor.recordMetric('cache_miss', 1, 'boolean', { sessionId });

        // Generate new image
        const image = await this.imageGenerator.generateFlatLineImage(request, sessionId);

        // Cache the result
        await this.cacheService.set(cacheKey, image, [request.type, sessionId || 'unknown']);

        // Record metrics
        this.recordGenerationMetrics(image, request, sessionId);

        return image;
      },
      { sessionId, requestType: request.type }
    );
  }

  /**
   * Batch generate images with optimization
   */
  async batchGenerateImages(requests: FlatLineImageRequest[], sessionId?: string): Promise<GeneratedImage[]> {
    if (!this.isInitialized) {
      await this.initialize(sessionId);
    }

    return await this.performanceMonitor.trackExecution(
      'integrated_batch_generation',
      async () => {
        const results: GeneratedImage[] = [];
        const uncachedRequests: { request: FlatLineImageRequest; index: number }[] = [];

        // Check cache for all requests
        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          const cacheKey = this.cacheService.generateKey(request);
          const cached = await this.cacheService.get(cacheKey);

          if (cached) {
            results[i] = cached;
            this.performanceMonitor.recordMetric('batch_cache_hit', 1, 'count', { sessionId });
          } else {
            uncachedRequests.push({ request, index: i });
            this.performanceMonitor.recordMetric('batch_cache_miss', 1, 'count', { sessionId });
          }
        }

        // Generate uncached images
        if (uncachedRequests.length > 0) {
          const uncachedImages = await this.imageGenerator.batchGenerateImages(
            uncachedRequests.map(({ request }) => request),
            sessionId
          );

          // Cache and assign results
          for (let i = 0; i < uncachedImages.length; i++) {
            const image = uncachedImages[i];
            const { request, index } = uncachedRequests[i];
            const cacheKey = this.cacheService.generateKey(request);

            await this.cacheService.set(cacheKey, image, [request.type, sessionId || 'unknown']);
            results[index] = image;

            this.recordGenerationMetrics(image, request, sessionId);
          }
        }

        return results;
      },
      { sessionId, batchSize: requests.length }
    );
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const generatorStats = this.imageGenerator.getCacheStats();
    const cacheStats = this.cacheService.getStats();
    const monitorReport = this.performanceMonitor.generateReport();

    // Calculate average generation time
    const generationTimes = this.performanceMonitor.getTrends('integrated_image_generation_execution_time', 3600000);
    const averageTime = generationTimes.length > 0
      ? generationTimes.reduce((sum, metric) => sum + metric.value, 0) / generationTimes.length
      : 0;

    // Calculate throughput (images per minute)
    const recentGenerations = generationTimes.filter(m => Date.now() - m.timestamp < 60000);
    const throughput = recentGenerations.length;

    return {
      imageGeneration: {
        averageTime,
        cacheHitRate: generatorStats.hitRate,
        throughput
      },
      caching: {
        hitRate: cacheStats.hitRate,
        size: cacheStats.entryCount,
        memoryUsage: cacheStats.memoryUsage
      },
      system: {
        overallScore: monitorReport.overallScore,
        bottlenecks: monitorReport.bottlenecks.length,
        recommendations: monitorReport.recommendations
      }
    };
  }

  /**
   * Optimize performance based on current metrics
   */
  async optimizePerformance(): Promise<string[]> {
    const optimizations: string[] = [];

    // Get current metrics
    const metrics = this.getPerformanceMetrics();

    // Optimize cache if hit rate is low
    if (metrics.caching.hitRate < 0.7) {
      this.cacheService.optimize();
      optimizations.push('Optimized cache eviction strategy');
    }

    // Preload more images if throughput is high
    if (metrics.imageGeneration.throughput > 10) {
      await this.cacheService.preloadFrequentImages(this.imageGenerator);
      optimizations.push('Preloaded frequent image patterns');
    }

    // Clear old cache entries if memory usage is high
    if (metrics.caching.memoryUsage > 40 * 1024 * 1024) { // 40MB
      this.cacheService.clear(['old', 'unused']);
      optimizations.push('Cleared old cache entries to free memory');
    }

    // Apply system-level optimizations
    const systemOptimizations = await this.performanceMonitor.optimizePerformance();
    optimizations.push(...systemOptimizations);

    return optimizations;
  }

  /**
   * Get performance report for debugging
   */
  getDetailedReport(): {
    generator: any;
    cache: any;
    monitor: any;
    integration: PerformanceMetrics;
  } {
    return {
      generator: {
        stats: this.imageGenerator.getCacheStats(),
        memoryUsage: this.imageGenerator.getMemoryUsage()
      },
      cache: {
        stats: this.cacheService.getStats(),
        export: this.cacheService.export()
      },
      monitor: this.performanceMonitor.generateReport(),
      integration: this.getPerformanceMetrics()
    };
  }

  /**
   * Cleanup and destroy service
   */
  async destroy(): Promise<void> {
    console.log('Destroying Performance Integration Service...');

    // Stop auto-optimization
    if (this.autoOptimizationTimer) {
      clearInterval(this.autoOptimizationTimer);
    }

    // Stop monitoring
    this.performanceMonitor.stopMonitoring();

    // Clear caches
    this.imageGenerator.clearCache();
    this.cacheService.destroy();

    this.isInitialized = false;
    console.log('Performance Integration Service destroyed');
  }

  // Private methods

  private async preloadImages(sessionId?: string): Promise<void> {
    try {
      if (this.config.preloading.commonPatterns) {
        await this.imageGenerator.preloadCommonImages(sessionId);
        console.log('Preloaded common image patterns');
      }

      if (this.config.preloading.userPatterns) {
        await this.cacheService.preloadFrequentImages(this.imageGenerator);
        console.log('Preloaded user-specific patterns');
      }
    } catch (error) {
      console.warn('Failed to preload images:', error);
    }
  }

  private startAutoOptimization(): void {
    this.autoOptimizationTimer = setInterval(async () => {
      try {
        const optimizations = await this.optimizePerformance();
        if (optimizations.length > 0) {
          console.log('Auto-optimization applied:', optimizations);
        }
      } catch (error) {
        console.warn('Auto-optimization failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private recordGenerationMetrics(image: GeneratedImage, request: FlatLineImageRequest, sessionId?: string): void {
    // Record image-specific metrics
    this.performanceMonitor.recordMetric('image_size', image.svgContent.length, 'bytes', {
      sessionId,
      type: request.type
    });

    this.performanceMonitor.recordMetric('image_generated', 1, 'count', {
      sessionId,
      type: request.type,
      style: JSON.stringify(request.style)
    });

    // Update cache metrics
    const cacheStats = this.cacheService.getStats();
    this.performanceMonitor.recordMetric('cache_hit_rate', cacheStats.hitRate, 'ratio', { sessionId });
    this.performanceMonitor.recordMetric('cache_size', cacheStats.entryCount, 'entries', { sessionId });
    this.performanceMonitor.recordMetric('cache_memory_usage', cacheStats.memoryUsage, 'bytes', { sessionId });
  }
}

export { IntegrationConfig, PerformanceMetrics };