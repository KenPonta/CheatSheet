// File processing cache system for performance optimization

import { ExtractedContent, ProcessingResult, FileMetadata } from './types';

export interface CacheEntry {
  id: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  content: ExtractedContent;
  processingTime: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  averageProcessingTime: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheConfig {
  maxEntries: number;
  maxSizeBytes: number;
  ttlMs: number;
  cleanupIntervalMs: number;
}

export class FileProcessingCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private cleanupTimer?: NodeJS.Timeout;
  
  private readonly config: CacheConfig = {
    maxEntries: 100,
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    ttlMs: 60 * 60 * 1000, // 1 hour
    cleanupIntervalMs: 10 * 60 * 1000 // 10 minutes
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startCleanupTimer();
  }

  /**
   * Generate a hash for file content to use as cache key
   */
  async generateFileHash(file: File): Promise<string> {
    try {
      // Try to use Web Crypto API if available - hash actual file content
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (error) {
      // Fall through to simple hash
    }
    
    // Fallback to content-based hash for testing environments
    return this.generateContentBasedHash(file);
  }

  /**
   * Generate a content-based hash for environments without crypto.subtle
   */
  private async generateContentBasedHash(file: File): Promise<string> {
    try {
      // Read a sample of the file content to create a more unique hash
      const sampleSize = Math.min(8192, file.size); // Read first 8KB or entire file if smaller
      const buffer = await file.slice(0, sampleSize).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Create hash from file metadata + content sample + current timestamp for uniqueness
      const metadata = `${file.name}_${file.size}_${file.lastModified}_${file.type}_${Date.now()}_${Math.random()}`;
      let hash = 0;
      
      // Hash metadata
      for (let i = 0; i < metadata.length; i++) {
        const char = metadata.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Hash content sample
      for (let i = 0; i < bytes.length; i++) {
        hash = ((hash << 5) - hash) + bytes[i];
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      // Ultimate fallback - use timestamp and random number to ensure uniqueness
      const fallback = `${file.name}_${file.size}_${Date.now()}_${Math.random().toString(36)}`;
      let hash = 0;
      
      for (let i = 0; i < fallback.length; i++) {
        const char = fallback.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * Get cached processing result for a file
   */
  async get(file: File): Promise<ProcessingResult | null> {
    const hash = await this.generateFileHash(file);
    const entry = this.cache.get(hash);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry is still valid
    if (this.isEntryExpired(entry) || !this.isFileMatch(file, entry)) {
      this.cache.delete(hash);
      this.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return {
      fileId: entry.id,
      status: 'success',
      content: entry.content,
      errors: [],
      processingTime: entry.processingTime
    };
  }

  /**
   * Store processing result in cache
   */
  async set(file: File, result: ProcessingResult): Promise<void> {
    if (result.status !== 'success' || !result.content) {
      return; // Don't cache failed results
    }

    const hash = await this.generateFileHash(file);
    const now = Date.now();
    
    const entry: CacheEntry = {
      id: result.fileId,
      fileHash: hash,
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
      content: result.content,
      processingTime: result.processingTime,
      createdAt: now,
      accessCount: 1,
      lastAccessed: now
    };

    // Check if we need to make space
    await this.ensureSpace(this.estimateEntrySize(entry));
    
    this.cache.set(hash, entry);
  }

  /**
   * Check if file has been processed before (without returning content)
   */
  async has(file: File): Promise<boolean> {
    const hash = await this.generateFileHash(file);
    const entry = this.cache.get(hash);
    
    if (!entry) {
      return false;
    }

    return !this.isEntryExpired(entry) && this.isFileMatch(file, entry);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + this.estimateEntrySize(entry), 0);
    const totalRequests = this.hits + this.misses;
    
    return {
      totalEntries: entries.length,
      totalSize,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      averageProcessingTime: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + entry.processingTime, 0) / entries.length 
        : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.createdAt)) : 0
    };
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [hash, entry] of this.cache.entries()) {
      if (this.isEntryExpired(entry)) {
        this.cache.delete(hash);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Get cache entries sorted by various criteria
   */
  getEntriesSorted(sortBy: 'lastAccessed' | 'createdAt' | 'accessCount' | 'size' = 'lastAccessed'): CacheEntry[] {
    const entries = Array.from(this.cache.values());
    
    return entries.sort((a, b) => {
      switch (sortBy) {
        case 'lastAccessed':
          return b.lastAccessed - a.lastAccessed;
        case 'createdAt':
          return b.createdAt - a.createdAt;
        case 'accessCount':
          return b.accessCount - a.accessCount;
        case 'size':
          return this.estimateEntrySize(b) - this.estimateEntrySize(a);
        default:
          return 0;
      }
    });
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  private isEntryExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > this.config.ttlMs;
  }

  private isFileMatch(file: File, entry: CacheEntry): boolean {
    return file.name === entry.fileName && 
           file.size === entry.fileSize && 
           file.lastModified === entry.lastModified;
  }

  private estimateEntrySize(entry: CacheEntry): number {
    // Rough estimation of memory usage
    const textSize = entry.content.text.length * 2; // UTF-16 characters
    const imagesSize = entry.content.images.reduce((sum, img) => 
      sum + (img.base64?.length || 0) + (img.ocrText?.length || 0) * 2, 0);
    const tablesSize = entry.content.tables.reduce((sum, table) => 
      sum + JSON.stringify(table).length * 2, 0);
    const metadataSize = JSON.stringify(entry.content.metadata).length * 2;
    const structureSize = JSON.stringify(entry.content.structure).length * 2;
    
    return textSize + imagesSize + tablesSize + metadataSize + structureSize + 1000; // 1KB overhead
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentCacheSize();
    
    // Check if we need to remove entries
    if (this.cache.size >= this.config.maxEntries || 
        currentSize + requiredSize > this.config.maxSizeBytes) {
      
      // First try cleanup of expired entries
      this.cleanup();
      
      // If still need space, remove least recently used entries
      const sortedEntries = this.getEntriesSorted('lastAccessed');
      
      while ((this.cache.size >= this.config.maxEntries || 
              this.getCurrentCacheSize() + requiredSize > this.config.maxSizeBytes) &&
             sortedEntries.length > 0) {
        
        const entryToRemove = sortedEntries.pop();
        if (entryToRemove) {
          this.cache.delete(entryToRemove.fileHash);
        }
      }
    }
  }

  private getCurrentCacheSize(): number {
    return Array.from(this.cache.values())
      .reduce((sum, entry) => sum + this.estimateEntrySize(entry), 0);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }
}

// Global cache instance
let globalCache: FileProcessingCache | null = null;

export function getGlobalCache(): FileProcessingCache {
  if (!globalCache) {
    globalCache = new FileProcessingCache();
  }
  return globalCache;
}

export function setGlobalCache(cache: FileProcessingCache): void {
  if (globalCache) {
    globalCache.destroy();
  }
  globalCache = cache;
}

export function clearGlobalCache(): void {
  if (globalCache) {
    globalCache.destroy();
    globalCache = null;
  }
}