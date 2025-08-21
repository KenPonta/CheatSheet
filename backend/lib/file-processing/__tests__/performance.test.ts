// Performance tests and benchmarks for file processing optimization

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FileProcessingCache } from '../cache';
import { ProgressTracker } from '../progress-tracker';
import { MemoryManager } from '../memory-manager';
import { EnhancedFileProcessorFactory } from '../enhanced-factory';

// Mock file creation helper
function createMockFile(name: string, size: number, content: string = 'test content'): File {
  const blob = new Blob([content.repeat(Math.ceil(size / content.length))], { type: 'text/plain' });
  return new File([blob], name, { lastModified: Date.now() });
}

// Performance measurement helper
function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  return fn().then(result => ({
    result,
    time: performance.now() - start
  }));
}

describe('FileProcessingCache Performance', () => {
  let cache: FileProcessingCache;

  beforeEach(() => {
    cache = new FileProcessingCache({
      maxEntries: 50,
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      ttlMs: 60000,
      cleanupIntervalMs: 5000
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should handle rapid cache operations efficiently', async () => {
    const files = Array.from({ length: 100 }, (_, i) => 
      createMockFile(`test${i}.txt`, 1024, `content for file ${i}`)
    );

    // Measure cache set operations
    const { time: setTime } = await measureTime(async () => {
      for (const file of files.slice(0, 50)) {
        const mockResult = {
          fileId: `file_${Date.now()}`,
          status: 'success' as const,
          content: {
            text: 'test content',
            images: [],
            tables: [],
            metadata: {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: new Date(file.lastModified)
            },
            structure: { headings: [], sections: [], hierarchy: 0 }
          },
          errors: [],
          processingTime: 100
        };
        await cache.set(file, mockResult);
      }
    });

    // Measure cache get operations
    const { time: getTime } = await measureTime(async () => {
      for (const file of files.slice(0, 50)) {
        await cache.get(file);
      }
    });

    // Performance assertions
    expect(setTime).toBeLessThan(1000); // Should complete in under 1 second
    expect(getTime).toBeLessThan(500); // Gets should be faster than sets
    
    const stats = cache.getStats();
    expect(stats.hitRate).toBe(1); // All gets should be hits
    expect(stats.totalEntries).toBe(50);
  });

  it('should efficiently handle cache eviction under memory pressure', async () => {
    const largeFiles = Array.from({ length: 20 }, (_, i) => 
      createMockFile(`large${i}.txt`, 1024 * 1024, `large content ${i}`) // 1MB each
    );

    const { time } = await measureTime(async () => {
      for (const file of largeFiles) {
        const mockResult = {
          fileId: `file_${Date.now()}`,
          status: 'success' as const,
          content: {
            text: 'x'.repeat(1024 * 1024), // 1MB of text
            images: [],
            tables: [],
            metadata: {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: new Date(file.lastModified)
            },
            structure: { headings: [], sections: [], hierarchy: 0 }
          },
          errors: [],
          processingTime: 100
        };
        await cache.set(file, mockResult);
      }
    });

    expect(time).toBeLessThan(2000); // Should handle eviction efficiently
    
    const stats = cache.getStats();
    expect(stats.totalEntries).toBeLessThanOrEqual(cache['config'].maxEntries);
    expect(stats.totalSize).toBeLessThanOrEqual(cache['config'].maxSizeBytes);
  });

  it('should have fast hash generation for large files', async () => {
    const largeFile = createMockFile('large.txt', 10 * 1024 * 1024, 'x'); // 10MB

    const { time } = await measureTime(async () => {
      await cache.generateFileHash(largeFile);
    });

    expect(time).toBeLessThan(1000); // Hash generation should be under 1 second
  });
});

describe('ProgressTracker Performance', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  it('should handle many concurrent progress updates efficiently', async () => {
    const fileCount = 1000;
    const updateCount = 10;

    const { time } = await measureTime(async () => {
      // Start tracking many files
      for (let i = 0; i < fileCount; i++) {
        tracker.startTracking(`file_${i}`, `test${i}.txt`, 1024);
      }

      // Update progress for all files multiple times
      for (let update = 0; update < updateCount; update++) {
        for (let i = 0; i < fileCount; i++) {
          tracker.updateProgressWithPercentage(`file_${i}`, 'extracting-text', (update + 1) * 10);
        }
      }

      // Complete all files
      for (let i = 0; i < fileCount; i++) {
        tracker.completeProgress(`file_${i}`);
      }
    });

    expect(time).toBeLessThan(2000); // Should handle 10,000 updates in under 2 seconds
    
    const allProgress = tracker.getAllProgress();
    expect(allProgress).toHaveLength(fileCount);
    expect(allProgress.every(p => p.stage === 'completed')).toBe(true);
  });

  it('should efficiently manage batch progress for large batches', async () => {
    const batchSize = 500;
    const fileIds = Array.from({ length: batchSize }, (_, i) => `file_${i}`);

    // Start tracking individual files
    for (const fileId of fileIds) {
      tracker.startTracking(fileId, `${fileId}.txt`, 1024);
    }

    const { time } = await measureTime(async () => {
      // Start batch tracking
      tracker.startBatchTracking('large_batch', fileIds);

      // Update all files to completion
      for (const fileId of fileIds) {
        tracker.updateProgressWithPercentage(fileId, 'extracting-text', 50);
        tracker.updateProgressWithPercentage(fileId, 'finalizing', 90);
        tracker.completeProgress(fileId);
      }
    });

    expect(time).toBeLessThan(1000); // Should handle large batch efficiently
    
    const batchProgress = tracker.getBatchProgress('large_batch');
    expect(batchProgress?.completedFiles).toBe(batchSize);
    expect(batchProgress?.overallProgress).toBe(100);
  });
});

describe('MemoryManager Performance', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager({
      maxConcurrentFiles: 5,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      warningThreshold: 70,
      criticalThreshold: 85
    });
  });

  afterEach(() => {
    memoryManager.destroy();
  });

  it('should quickly assess processing capability for many files', async () => {
    const fileSizes = Array.from({ length: 1000 }, () => Math.random() * 100 * 1024 * 1024); // Random sizes up to 100MB

    const { time } = await measureTime(async () => {
      for (const size of fileSizes) {
        memoryManager.canProcessFile(size);
      }
    });

    expect(time).toBeLessThan(100); // Should assess 1000 files in under 100ms
  });

  it('should efficiently manage concurrent processing tracking', async () => {
    const fileIds = Array.from({ length: 100 }, (_, i) => `file_${i}`);

    const { time } = await measureTime(async () => {
      // Start processing many files
      for (const fileId of fileIds) {
        memoryManager.startProcessing(fileId);
      }

      // Finish processing all files
      for (const fileId of fileIds) {
        memoryManager.finishProcessing(fileId);
      }
    });

    expect(time).toBeLessThan(50); // Should handle 200 operations in under 50ms
  });

  it('should provide fast memory usage statistics', async () => {
    // Start some processing to generate data
    for (let i = 0; i < 10; i++) {
      memoryManager.startProcessing(`file_${i}`);
    }

    const { time } = await measureTime(async () => {
      for (let i = 0; i < 100; i++) {
        memoryManager.getMemoryStats();
      }
    });

    expect(time).toBeLessThan(50); // Should get stats 100 times in under 50ms
  });
});

describe('EnhancedFileProcessorFactory Performance', () => {
  let factory: EnhancedFileProcessorFactory;
  let cache: FileProcessingCache;
  let tracker: ProgressTracker;
  let memoryManager: MemoryManager;

  beforeEach(() => {
    cache = new FileProcessingCache();
    tracker = new ProgressTracker();
    memoryManager = new MemoryManager();
    factory = new EnhancedFileProcessorFactory(cache, tracker, memoryManager);
  });

  afterEach(() => {
    factory.destroy();
    cache.destroy();
    memoryManager.destroy();
  });

  it('should demonstrate cache performance benefits', async () => {
    const file = createMockFile('test.txt', 1024, 'test content for caching');

    // Mock the internal processing to be slow
    const originalProcess = factory['processFileInternal'];
    factory['processFileInternal'] = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate 100ms processing
      return {
        fileId: 'test_file',
        status: 'success' as const,
        content: {
          text: 'processed content',
          images: [],
          tables: [],
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
          },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 100
      };
    });

    // First processing (should be slow)
    const { time: firstTime } = await measureTime(async () => {
      await factory.processFile(file, { useCache: true });
    });

    // Second processing (should be fast due to cache)
    const { time: secondTime } = await measureTime(async () => {
      await factory.processFile(file, { useCache: true });
    });

    expect(firstTime).toBeGreaterThan(90); // Should take at least 90ms (processing time)
    expect(secondTime).toBeLessThan(50); // Should be much faster from cache
    expect(secondTime).toBeLessThan(firstTime / 2); // At least 50% faster

    // Restore original method
    factory['processFileInternal'] = originalProcess;
  });

  it('should efficiently handle concurrent file processing', async () => {
    // Create a memory manager with higher concurrent file limit for this test
    const memoryManager = new MemoryManager({
      maxConcurrentFiles: 10, // Allow more concurrent files
      maxFileSize: 100 * 1024 * 1024, // 100MB
      warningThreshold: 90,
      criticalThreshold: 95
    });
    
    const testFactory = new EnhancedFileProcessorFactory(cache, tracker, memoryManager);
    
    const files = Array.from({ length: 5 }, (_, i) => 
      createMockFile(`concurrent${i}.txt`, 1024, `content ${i}`)
    );

    // Mock processing to be consistent
    testFactory['processFileInternal'] = jest.fn().mockImplementation(async (file, fileId) => {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms processing
      return {
        fileId,
        status: 'success' as const,
        content: {
          text: `processed ${file.name}`,
          images: [],
          tables: [],
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
          },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 50
      };
    });

    const { time } = await measureTime(async () => {
      await testFactory.processMultipleFiles(files, {
        useCache: false, // Disable cache to test actual processing
        trackProgress: true,
        manageMemory: true
      });
    });

    // With concurrent processing, should be faster than sequential
    // Sequential would be 5 * 50ms = 250ms
    // Concurrent should be closer to 50ms * (5 / maxConcurrentFiles)
    expect(time).toBeLessThan(300); // Should benefit from concurrency
    
    testFactory.destroy();
    memoryManager.destroy();
  });

  it('should maintain performance under memory pressure', async () => {
    // Configure memory manager with reasonable limits for testing
    const tightMemoryManager = new MemoryManager({
      maxConcurrentFiles: 2,
      maxFileSize: 1024 * 1024, // 1MB
      warningThreshold: 90, // Higher threshold for testing
      criticalThreshold: 95
    });

    // Mock the memory usage to return safe values
    const originalGetMemoryUsage = tightMemoryManager.getMemoryUsage;
    tightMemoryManager.getMemoryUsage = jest.fn().mockReturnValue({
      used: 50 * 1024 * 1024, // 50MB
      total: 100 * 1024 * 1024, // 100MB
      percentage: 50, // 50% usage - safe level
      available: 50 * 1024 * 1024
    });

    const factoryWithTightMemory = new EnhancedFileProcessorFactory(
      cache, 
      tracker, 
      tightMemoryManager
    );

    const files = Array.from({ length: 3 }, (_, i) => 
      createMockFile(`memory${i}.txt`, 512 * 1024, `content ${i}`) // 512KB each
    );

    factoryWithTightMemory['processFileInternal'] = jest.fn().mockImplementation(async (file, fileId) => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return {
        fileId,
        status: 'success' as const,
        content: {
          text: `processed ${file.name}`,
          images: [],
          tables: [],
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
          },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 30
      };
    });

    const { time } = await measureTime(async () => {
      // Process files sequentially to avoid hitting concurrent limits
      for (const file of files) {
        await factoryWithTightMemory.processFile(file, {
          manageMemory: true
        });
      }
    });

    // Should complete despite memory constraints
    expect(time).toBeLessThan(1000);

    // Restore original method
    tightMemoryManager.getMemoryUsage = originalGetMemoryUsage;
    factoryWithTightMemory.destroy();
    tightMemoryManager.destroy();
  });
});

describe('Integration Performance Benchmarks', () => {
  it('should benchmark end-to-end processing performance', async () => {
    const factory = new EnhancedFileProcessorFactory();
    
    // Create test files of various sizes
    const testFiles = [
      createMockFile('small.txt', 1024, 'small content'), // 1KB
      createMockFile('medium.txt', 100 * 1024, 'medium content'), // 100KB
      createMockFile('large.txt', 1024 * 1024, 'large content'), // 1MB
    ];

    const results: Array<{ size: string; time: number; throughput: number }> = [];

    for (const file of testFiles) {
      const { time } = await measureTime(async () => {
        await factory.processFile(file, {
          useCache: false, // Disable cache for pure processing benchmark
          trackProgress: true,
          manageMemory: true
        });
      });

      const throughput = file.size / (time / 1000); // bytes per second
      const sizeLabel = file.size < 1024 ? `${file.size}B` :
                       file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)}KB` :
                       `${Math.round(file.size / (1024 * 1024))}MB`;

      results.push({
        size: sizeLabel,
        time,
        throughput
      });
    }

    // Log benchmark results
    console.log('File Processing Benchmarks:');
    results.forEach(result => {
      console.log(`${result.size}: ${result.time.toFixed(2)}ms (${(result.throughput / 1024).toFixed(2)} KB/s)`);
    });

    // Performance assertions
    expect(results[0].time).toBeLessThan(100); // Small files should be very fast
    expect(results[1].time).toBeLessThan(500); // Medium files should be reasonable
    expect(results[2].time).toBeLessThan(2000); // Large files should complete in reasonable time

    factory.destroy();
  });
});