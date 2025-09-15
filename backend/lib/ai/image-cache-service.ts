/**
 * Image Cache Service - Manages caching for frequently generated image types
 */

import { GeneratedImage, FlatLineImageRequest, FlatLineStyle } from './simple-image-generator';

interface CacheEntry {
  image: GeneratedImage;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
  tags: string[]; // For categorization and bulk operations
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  ttl: number; // Time to live in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionEnabled: boolean;
  persistToDisk: boolean;
  diskCachePath?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsage: number;
}

interface FrequentImagePattern {
  type: string;
  contentPattern: RegExp;
  contextPattern: RegExp;
  style: FlatLineStyle;
  frequency: number;
  lastSeen: number;
}

/**
 * Advanced caching service for image generation with intelligent preloading
 */
export class ImageCacheService {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: Omit<CacheStats, 'hitRate' | 'averageAccessTime' | 'memoryUsage'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private accessTimes: number[] = [];
  private frequentPatterns = new Map<string, FrequentImagePattern>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxEntries: 1000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      compressionEnabled: true,
      persistToDisk: false,
      ...config
    };

    this.startCleanupTimer();
    this.loadFrequentPatterns();
  }

  /**
   * Get cached image or return null
   */
  async get(key: string): Promise<GeneratedImage | null> {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.entryCount--;
      this.stats.totalSize -= entry.size;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    // Track access time
    const accessTime = Date.now() - startTime;
    this.accessTimes.push(accessTime);
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000); // Keep last 1000 measurements
    }

    return entry.image;
  }

  /**
   * Store image in cache
   */
  async set(key: string, image: GeneratedImage, tags: string[] = []): Promise<void> {
    const size = this.estimateImageSize(image);

    // Check if we need to make space
    await this.ensureSpace(size);

    const entry: CacheEntry = {
      image: this.config.compressionEnabled ? await this.compressImage(image) : image,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      tags
    };

    // Remove existing entry if present
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
      this.stats.entryCount--;
    }

    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entryCount++;

    // Update frequent patterns
    this.updateFrequentPatterns(key, image);
  }

  /**
   * Generate cache key for image request
   */
  generateKey(request: FlatLineImageRequest): string {
    const keyData = {
      type: request.type,
      content: this.normalizeContent(request.content),
      context: request.context,
      style: request.style,
      dimensions: request.dimensions
    };
    
    return this.hashObject(keyData);
  }

  /**
   * Preload frequently used images
   */
  async preloadFrequentImages(generator: any): Promise<void> {
    const patterns = Array.from(this.frequentPatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 patterns

    const requests: FlatLineImageRequest[] = patterns.map(pattern => ({
      type: pattern.type as any,
      content: this.generateSampleContent(pattern),
      context: 'preload',
      style: pattern.style,
      dimensions: { width: 400, height: 300 }
    }));

    for (const request of requests) {
      const key = this.generateKey(request);
      if (!this.cache.has(key)) {
        try {
          const image = await generator.generateFlatLineImage(request);
          await this.set(key, image, ['preloaded']);
        } catch (error) {
          console.warn('Failed to preload image:', error);
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    const averageAccessTime = this.accessTimes.length > 0 
      ? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length 
      : 0;

    return {
      ...this.stats,
      hitRate,
      averageAccessTime,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Clear cache with optional tag filter
   */
  clear(tags?: string[]): void {
    if (!tags) {
      this.cache.clear();
      this.stats.totalSize = 0;
      this.stats.entryCount = 0;
      return;
    }

    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
      }
    }
  }

  /**
   * Get cache entries by tags
   */
  getByTags(tags: string[]): GeneratedImage[] {
    const results: GeneratedImage[] = [];
    
    for (const entry of this.cache.values()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        results.push(entry.image);
      }
    }
    
    return results;
  }

  /**
   * Optimize cache by removing least valuable entries
   */
  optimize(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by value score (access count / age)
    entries.sort(([, a], [, b]) => {
      const ageA = Date.now() - a.timestamp;
      const ageB = Date.now() - b.timestamp;
      const scoreA = a.accessCount / (ageA / (24 * 60 * 60 * 1000)); // Access per day
      const scoreB = b.accessCount / (ageB / (24 * 60 * 60 * 1000));
      return scoreB - scoreA;
    });

    // Keep top 80% of entries
    const keepCount = Math.floor(entries.length * 0.8);
    const toRemove = entries.slice(keepCount);

    for (const [key, entry] of toRemove) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.stats.evictions++;
    }
  }

  /**
   * Export cache for persistence
   */
  export(): string {
    const exportData = {
      entries: Array.from(this.cache.entries()),
      stats: this.stats,
      frequentPatterns: Array.from(this.frequentPatterns.entries()),
      timestamp: Date.now()
    };
    
    return JSON.stringify(exportData);
  }

  /**
   * Import cache from persistence
   */
  import(data: string): void {
    try {
      const importData = JSON.parse(data);
      
      this.cache.clear();
      for (const [key, entry] of importData.entries) {
        this.cache.set(key, entry);
      }
      
      this.stats = importData.stats || this.stats;
      
      if (importData.frequentPatterns) {
        this.frequentPatterns.clear();
        for (const [key, pattern] of importData.frequentPatterns) {
          this.frequentPatterns.set(key, pattern);
        }
      }
    } catch (error) {
      console.error('Failed to import cache:', error);
    }
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }

  // Private methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
        this.stats.evictions++;
      }
    }
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check size limits
    while (
      this.stats.totalSize + requiredSize > this.config.maxSize ||
      this.stats.entryCount >= this.config.maxEntries
    ) {
      await this.evictLeastValuable();
    }
  }

  private async evictLeastValuable(): Promise<void> {
    let leastValuableKey: string | null = null;
    let leastValue = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const age = Date.now() - entry.timestamp;
      const value = entry.accessCount / (age / (60 * 60 * 1000)); // Access per hour
      
      if (value < leastValue) {
        leastValue = value;
        leastValuableKey = key;
      }
    }

    if (leastValuableKey) {
      const entry = this.cache.get(leastValuableKey);
      if (entry) {
        this.cache.delete(leastValuableKey);
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
        this.stats.evictions++;
      }
    }
  }

  private estimateImageSize(image: GeneratedImage): number {
    return (
      image.svgContent.length * 2 + // UTF-16 encoding
      image.base64.length +
      JSON.stringify(image.metadata).length * 2 +
      200 // Object overhead
    );
  }

  private async compressImage(image: GeneratedImage): Promise<GeneratedImage> {
    // Simple compression - remove unnecessary whitespace from SVG
    const compressedSVG = image.svgContent
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();

    return {
      ...image,
      svgContent: compressedSVG,
      base64: this.svgToBase64(compressedSVG)
    };
  }

  private svgToBase64(svg: string): string {
    return Buffer.from(svg).toString('base64');
  }

  private normalizeContent(content: string): string {
    return content.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private updateFrequentPatterns(key: string, image: GeneratedImage): void {
    const patternKey = `${image.metadata.type}_${image.metadata.style.lineWeight}_${image.metadata.style.colorScheme}`;
    
    const existing = this.frequentPatterns.get(patternKey);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
    } else {
      this.frequentPatterns.set(patternKey, {
        type: image.metadata.type,
        contentPattern: new RegExp(this.extractPattern(image.metadata.content)),
        contextPattern: new RegExp('.*'),
        style: image.metadata.style,
        frequency: 1,
        lastSeen: Date.now()
      });
    }
  }

  private extractPattern(content: string): string {
    // Simple pattern extraction - in practice, this would be more sophisticated
    return content.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateSampleContent(pattern: FrequentImagePattern): string {
    // Generate sample content based on pattern
    switch (pattern.type) {
      case 'equation':
        return 'x = y + z';
      case 'concept':
        return 'title: Sample Concept\nelements: [{"id": "1", "label": "Node", "type": "node"}]';
      case 'example':
        return 'problem: Sample problem\nsolution: Sample solution';
      default:
        return 'sample content';
    }
  }

  private loadFrequentPatterns(): void {
    // In a real implementation, this would load from persistent storage
    // For now, we'll start with empty patterns
  }

  private getMemoryUsage(): number {
    let usage = 0;
    for (const entry of this.cache.values()) {
      usage += entry.size;
    }
    return usage;
  }
}

export { CacheConfig, CacheStats, FrequentImagePattern };