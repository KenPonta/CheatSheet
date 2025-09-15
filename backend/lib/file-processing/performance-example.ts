// Example usage of performance optimization features

import {
  EnhancedFileProcessorFactory,
  FileProcessingCache,
  ProgressTracker,
  MemoryManager,
  ProcessingProgress,
  BatchProgress
} from './index';

/**
 * Example 1: Basic enhanced processing with all optimizations enabled
 */
export async function basicEnhancedProcessing() {
  const factory = new EnhancedFileProcessorFactory();
  
  // Create a sample file (in real usage, this would come from user input)
  const file = new File(['sample content'], 'example.txt', { type: 'text/plain' });
  
  try {
    const result = await factory.processFile(file, {
      useCache: true,
      trackProgress: true,
      manageMemory: true,
      onProgress: (progress: ProcessingProgress) => {
        console.log(`Processing ${progress.fileName}: ${progress.stage} (${progress.progress}%)`);
        if (progress.estimatedTimeRemaining) {
          console.log(`  ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s`);
        }
      }
    });
    
    console.log('Processing completed:', result.status);
    return result;
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  } finally {
    factory.destroy();
  }
}

/**
 * Example 2: Batch processing with progress tracking
 */
export async function batchProcessingExample() {
  const factory = new EnhancedFileProcessorFactory();
  
  // Create multiple sample files
  const files = [
    new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
    new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
    new File(['content 3'], 'file3.txt', { type: 'text/plain' })
  ];
  
  try {
    const results = await factory.processMultipleFiles(files, {
      useCache: true,
      trackProgress: true,
      manageMemory: true,
      onBatchProgress: (progress: BatchProgress) => {
        console.log(`Batch progress: ${progress.completedFiles}/${progress.totalFiles} files completed`);
        console.log(`Overall progress: ${progress.overallProgress.toFixed(1)}%`);
        
        if (progress.currentFile) {
          console.log(`Currently processing: ${progress.currentFile.fileName}`);
        }
        
        if (progress.estimatedTimeRemaining) {
          console.log(`Batch ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s`);
        }
      }
    });
    
    console.log(`Batch completed: ${results.length} files processed`);
    return results;
  } catch (error) {
    console.error('Batch processing failed:', error);
    throw error;
  } finally {
    factory.destroy();
  }
}

/**
 * Example 3: Custom cache configuration for specific use cases
 */
export async function customCacheExample() {
  // Create a cache optimized for large files with longer retention
  const cache = new FileProcessingCache({
    maxEntries: 20,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    ttlMs: 2 * 60 * 60 * 1000, // 2 hours
    cleanupIntervalMs: 15 * 60 * 1000 // 15 minutes
  });
  
  const factory = new EnhancedFileProcessorFactory(cache);
  
  // Process files with custom cache
  const file = new File(['large file content'], 'large-file.txt', { type: 'text/plain' });
  
  try {
    // First processing - will be cached
    console.log('First processing (will be cached)...');
    const result1 = await factory.processFile(file, { useCache: true });
    
    // Second processing - should be much faster from cache
    console.log('Second processing (from cache)...');
    const result2 = await factory.processFile(file, { useCache: true });
    
    // Check cache statistics
    const stats = cache.getStats();
    console.log('Cache stats:', {
      entries: stats.totalEntries,
      hitRate: (stats.hitRate * 100).toFixed(1) + '%',
      totalSize: Math.round(stats.totalSize / 1024) + ' KB'
    });
    
    return { result1, result2, stats };
  } finally {
    factory.destroy();
    cache.destroy();
  }
}

/**
 * Example 4: Memory-constrained processing
 */
export async function memoryConstrainedProcessing() {
  // Create a memory manager with tight constraints
  const memoryManager = new MemoryManager({
    maxConcurrentFiles: 2,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    warningThreshold: 60,
    criticalThreshold: 80,
    enableGarbageCollection: true,
    gcIntervalMs: 10000 // 10 seconds
  });
  
  const factory = new EnhancedFileProcessorFactory(undefined, undefined, memoryManager);
  
  // Create files that would normally exceed memory limits
  const files = Array.from({ length: 10 }, (_, i) => 
    new File([`content for file ${i}`], `file${i}.txt`, { type: 'text/plain' })
  );
  
  try {
    console.log('Processing files with memory constraints...');
    
    const results = await factory.processMultipleFiles(files, {
      manageMemory: true,
      onProgress: (progress) => {
        console.log(`${progress.fileName}: ${progress.stage}`);
      }
    });
    
    // Check memory statistics
    const memStats = memoryManager.getMemoryStats();
    console.log('Memory stats:', {
      currentUsage: memStats.current.percentage.toFixed(1) + '%',
      peakUsage: memStats.peak.percentage.toFixed(1) + '%',
      activeFiles: memStats.activeFiles
    });
    
    return results;
  } finally {
    factory.destroy();
    memoryManager.destroy();
  }
}

/**
 * Example 5: Performance monitoring and optimization
 */
export async function performanceMonitoringExample() {
  const factory = new EnhancedFileProcessorFactory();
  
  // Create test files of different sizes
  const files = [
    new File(['small'], 'small.txt', { type: 'text/plain' }),
    new File(['medium content'.repeat(100)], 'medium.txt', { type: 'text/plain' }),
    new File(['large content'.repeat(1000)], 'large.txt', { type: 'text/plain' })
  ];
  
  try {
    console.log('Starting performance monitoring...');
    
    // Process files and measure performance
    const startTime = Date.now();
    
    for (const file of files) {
      const fileStartTime = Date.now();
      
      await factory.processFile(file, {
        useCache: true,
        trackProgress: true,
        manageMemory: true,
        onProgress: (progress) => {
          if (progress.stage === 'completed') {
            const fileTime = Date.now() - fileStartTime;
            console.log(`${file.name}: ${fileTime}ms (${progress.processingTime}ms processing)`);
          }
        }
      });
    }
    
    const totalTime = Date.now() - startTime;
    
    // Get comprehensive statistics
    const stats = factory.getStats();
    
    console.log('\nPerformance Summary:');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Cache hit rate: ${(stats.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`Memory usage: ${stats.memory.current.percentage.toFixed(1)}%`);
    console.log(`Queue stats: ${stats.queue.totalProcessed} processed, ${stats.queue.totalFailed} failed`);
    
    return stats;
  } finally {
    factory.destroy();
  }
}

/**
 * Example 6: Chunked processing for very large files
 */
export async function chunkedProcessingExample() {
  const memoryManager = new MemoryManager();
  
  // Simulate a large file
  const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB of content
  const largeFile = new File([largeContent], 'large-file.txt', { type: 'text/plain' });
  
  try {
    console.log('Processing large file in chunks...');
    
    // Create chunked reader
    const chunkReader = memoryManager.createChunkedReader(largeFile, 1024 * 1024); // 1MB chunks
    
    let chunkCount = 0;
    let totalSize = 0;
    
    for await (const chunk of chunkReader) {
      chunkCount++;
      totalSize += chunk.byteLength;
      
      console.log(`Processed chunk ${chunkCount}: ${chunk.byteLength} bytes`);
      
      // Simulate processing the chunk
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`Completed: ${chunkCount} chunks, ${totalSize} total bytes`);
    
    return { chunkCount, totalSize };
  } finally {
    memoryManager.destroy();
  }
}

/**
 * Example 7: Error handling and recovery
 */
export async function errorHandlingExample() {
  const factory = new EnhancedFileProcessorFactory();
  
  // Create a mix of valid and problematic files
  const files = [
    new File(['valid content'], 'valid.txt', { type: 'text/plain' }),
    new File([''], 'empty.txt', { type: 'text/plain' }), // Empty file
    new File(['valid content 2'], 'valid2.txt', { type: 'text/plain' })
  ];
  
  try {
    console.log('Processing files with error handling...');
    
    const results = await Promise.allSettled(
      files.map(file => 
        factory.processFile(file, {
          useCache: true,
          trackProgress: true,
          timeout: 5000, // 5 second timeout
          onProgress: (progress) => {
            if (progress.error) {
              console.log(`Error in ${progress.fileName}: ${progress.error}`);
            } else {
              console.log(`${progress.fileName}: ${progress.stage} (${progress.progress}%)`);
            }
          }
        })
      )
    );
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Results: ${successful} successful, ${failed} failed`);
    
    return results;
  } finally {
    factory.destroy();
  }
}

// Export all examples for easy testing
export const examples = {
  basicEnhancedProcessing,
  batchProcessingExample,
  customCacheExample,
  memoryConstrainedProcessing,
  performanceMonitoringExample,
  chunkedProcessingExample,
  errorHandlingExample
};