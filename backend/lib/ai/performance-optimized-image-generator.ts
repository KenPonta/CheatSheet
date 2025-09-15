/**
 * Performance-optimized Simple Image Generator
 * Implements caching, lazy loading, and SVG optimization for large study materials
 */

import { SimpleImageGenerator, FlatLineImageRequest, GeneratedImage, FlatLineStyle, ImageDimensions } from './simple-image-generator';

interface CacheEntry {
  image: GeneratedImage;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
}

interface OptimizationConfig {
  enableCaching: boolean;
  maxCacheSize: number;
  cacheExpiryMs: number;
  enableSVGOptimization: boolean;
  enableLazyGeneration: boolean;
  batchSize: number;
  compressionLevel: 'none' | 'basic' | 'aggressive';
}

/**
 * Performance-optimized image generator with caching and optimization features
 */
export class PerformanceOptimizedImageGenerator extends SimpleImageGenerator {
  private cache = new Map<string, CacheEntry>();
  private cacheStats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalSize: 0 };
  private config: OptimizationConfig;
  private generationQueue: Array<{ request: FlatLineImageRequest; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  constructor(config: Partial<OptimizationConfig> = {}) {
    super();
    this.config = {
      enableCaching: true,
      maxCacheSize: 100, // Maximum number of cached images
      cacheExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
      enableSVGOptimization: true,
      enableLazyGeneration: true,
      batchSize: 5,
      compressionLevel: 'basic',
      ...config
    };
  }

  /**
   * Generate optimized flat-line image with caching
   */
  async generateFlatLineImage(request: FlatLineImageRequest, sessionId?: string): Promise<GeneratedImage> {
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedImage(cacheKey);
      if (cached) {
        this.cacheStats.hits++;
        return cached;
      }
      this.cacheStats.misses++;
    }

    // Generate image
    let image: GeneratedImage;
    
    if (this.config.enableLazyGeneration && this.generationQueue.length > 0) {
      // Add to queue for batch processing
      image = await this.queueGeneration(request, sessionId);
    } else {
      // Generate immediately
      image = await super.generateFlatLineImage(request, sessionId);
    }

    // Optimize SVG if enabled
    if (this.config.enableSVGOptimization) {
      image = await this.optimizeSVG(image);
    }

    // Cache the result
    if (this.config.enableCaching) {
      this.cacheImage(cacheKey, image);
    }

    return image;
  }

  /**
   * Batch generate multiple images for better performance
   */
  async batchGenerateImages(requests: FlatLineImageRequest[], sessionId?: string): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    const uncachedRequests: { request: FlatLineImageRequest; index: number }[] = [];

    // Check cache for all requests
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      const cacheKey = this.generateCacheKey(request);
      
      if (this.config.enableCaching) {
        const cached = this.getCachedImage(cacheKey);
        if (cached) {
          results[i] = cached;
          this.cacheStats.hits++;
          continue;
        }
        this.cacheStats.misses++;
      }
      
      uncachedRequests.push({ request, index: i });
    }

    // Process uncached requests in batches
    const batchSize = this.config.batchSize;
    for (let i = 0; i < uncachedRequests.length; i += batchSize) {
      const batch = uncachedRequests.slice(i, i + batchSize);
      const batchPromises = batch.map(({ request }) => 
        super.generateFlatLineImage(request, sessionId)
      );

      const batchResults = await Promise.all(batchPromises);
      
      // Process and cache results
      for (let j = 0; j < batchResults.length; j++) {
        let image = batchResults[j];
        const { request, index } = batch[j];
        
        // Optimize SVG if enabled
        if (this.config.enableSVGOptimization) {
          image = await this.optimizeSVG(image);
        }
        
        // Cache the result
        if (this.config.enableCaching) {
          const cacheKey = this.generateCacheKey(request);
          this.cacheImage(cacheKey, image);
        }
        
        results[index] = image;
      }
    }

    return results;
  }

  /**
   * Queue generation for lazy processing
   */
  private async queueGeneration(request: FlatLineImageRequest, sessionId?: string): Promise<GeneratedImage> {
    return new Promise((resolve, reject) => {
      this.generationQueue.push({ request, resolve, reject });
      
      if (!this.isProcessingQueue) {
        this.processQueue(sessionId);
      }
    });
  }

  /**
   * Process the generation queue
   */
  private async processQueue(sessionId?: string): Promise<void> {
    if (this.isProcessingQueue || this.generationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.generationQueue.length > 0) {
        const batch = this.generationQueue.splice(0, this.config.batchSize);
        const promises = batch.map(async ({ request, resolve, reject }) => {
          try {
            const image = await super.generateFlatLineImage(request, sessionId);
            resolve(image);
          } catch (error) {
            reject(error);
          }
        });

        await Promise.all(promises);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: FlatLineImageRequest): string {
    const keyData = {
      type: request.type,
      content: request.content,
      context: request.context,
      style: request.style,
      dimensions: request.dimensions
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Get cached image if valid
   */
  private getCachedImage(cacheKey: string): GeneratedImage | null {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > this.config.cacheExpiryMs) {
      this.cache.delete(cacheKey);
      this.cacheStats.evictions++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.image;
  }

  /**
   * Cache generated image
   */
  private cacheImage(cacheKey: string, image: GeneratedImage): void {
    // Check cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      image,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(cacheKey, entry);
    this.cacheStats.totalSize = this.cache.size;
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Optimize SVG content for better performance
   */
  private async optimizeSVG(image: GeneratedImage): Promise<GeneratedImage> {
    let optimizedSVG = image.svgContent;

    switch (this.config.compressionLevel) {
      case 'basic':
        optimizedSVG = this.basicSVGOptimization(optimizedSVG);
        break;
      case 'aggressive':
        optimizedSVG = this.aggressiveSVGOptimization(optimizedSVG);
        break;
      case 'none':
      default:
        break;
    }

    return {
      ...image,
      svgContent: optimizedSVG,
      base64: this.svgToBase64(optimizedSVG)
    };
  }

  /**
   * Basic SVG optimization - remove unnecessary whitespace and comments
   */
  private basicSVGOptimization(svg: string): string {
    return svg
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();
  }

  /**
   * Aggressive SVG optimization - additional compression techniques
   */
  private aggressiveSVGOptimization(svg: string): string {
    let optimized = this.basicSVGOptimization(svg);

    // Round decimal values to reduce precision
    optimized = optimized.replace(/(\d+\.\d{3,})/g, (match) => {
      return parseFloat(match).toFixed(2);
    });

    // Remove default attribute values
    optimized = optimized.replace(/fill="none"/g, '');
    optimized = optimized.replace(/stroke-width="1"/g, '');

    // Combine similar paths
    optimized = this.combineSimilarPaths(optimized);

    return optimized;
  }

  /**
   * Combine similar SVG paths for better compression
   */
  private combineSimilarPaths(svg: string): string {
    // This is a simplified implementation
    // In a real scenario, you'd want more sophisticated path analysis
    const pathRegex = /<path[^>]*d="([^"]*)"[^>]*>/g;
    const paths: Array<{ element: string; d: string }> = [];
    let match;

    while ((match = pathRegex.exec(svg)) !== null) {
      paths.push({
        element: match[0],
        d: match[1]
      });
    }

    // Group similar paths (simplified logic)
    const groupedPaths = new Map<string, string[]>();
    paths.forEach(path => {
      const key = path.d.substring(0, 10); // Simple grouping by first 10 chars
      if (!groupedPaths.has(key)) {
        groupedPaths.set(key, []);
      }
      groupedPaths.get(key)!.push(path.element);
    });

    return svg; // Return as-is for now (full implementation would be more complex)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, totalSize: 0 };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats & { hitRate: number; size: number } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? this.cacheStats.hits / total : 0;
    
    return {
      ...this.cacheStats,
      hitRate,
      size: this.cache.size
    };
  }

  /**
   * Preload frequently used image types
   */
  async preloadCommonImages(sessionId?: string): Promise<void> {
    const commonRequests: FlatLineImageRequest[] = [
      {
        type: 'equation',
        content: 'x = (-b ± √(b² - 4ac)) / 2a',
        context: 'quadratic formula',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 200 }
      },
      {
        type: 'concept',
        content: 'title: Basic Concept\nelements: [{"id": "1", "label": "Start", "type": "start"}, {"id": "2", "label": "Process", "type": "process"}]\nrelationships: [{"from": "1", "to": "2", "type": "arrow"}]',
        context: 'basic flowchart',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'vertical', annotations: true },
        dimensions: { width: 300, height: 200 }
      },
      {
        type: 'example',
        content: 'problem: Sample problem\nsolution: Sample solution\nsteps: [{"id": "1", "description": "Step 1"}]',
        context: 'basic example',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      }
    ];

    await this.batchGenerateImages(commonRequests, sessionId);
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): { estimatedBytes: number; cacheEntries: number } {
    let estimatedBytes = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimate: SVG content + base64 + metadata
      estimatedBytes += entry.image.svgContent.length * 2; // UTF-16
      estimatedBytes += entry.image.base64.length;
      estimatedBytes += 200; // Metadata overhead
    }

    return {
      estimatedBytes,
      cacheEntries: this.cache.size
    };
  }
}

export { OptimizationConfig, CacheStats };