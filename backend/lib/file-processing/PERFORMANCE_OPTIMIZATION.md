# File Processing Performance Optimization

This document describes the performance optimization features implemented for the file processing system, including caching, progress tracking, memory management, and background processing capabilities.

## Overview

The performance optimization system consists of four main components:

1. **File Processing Cache** - Avoids reprocessing identical files
2. **Progress Tracker** - Provides real-time progress updates for long-running operations
3. **Memory Manager** - Manages memory usage and prevents system overload
4. **Enhanced Factory** - Orchestrates all optimizations with background processing

## Components

### FileProcessingCache

Implements intelligent caching to avoid reprocessing identical files.

**Features:**
- SHA-256 based file hashing for reliable cache keys
- Configurable cache size and TTL (Time To Live)
- Automatic cache eviction using LRU (Least Recently Used) strategy
- Memory usage estimation and monitoring
- Cache statistics and hit rate tracking

**Usage:**
```typescript
import { FileProcessingCache } from './cache';

const cache = new FileProcessingCache({
  maxEntries: 100,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  ttlMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 10 * 60 * 1000 // 10 minutes
});

// Check if file is cached
const cachedResult = await cache.get(file);
if (cachedResult) {
  return cachedResult; // Use cached result
}

// Process file and cache result
const result = await processFile(file);
await cache.set(file, result);
```

### ProgressTracker

Provides detailed progress tracking for file processing operations.

**Features:**
- Individual file progress tracking with stages
- Batch progress tracking for multiple files
- Estimated time remaining calculations
- Real-time progress callbacks
- Progress history and cleanup

**Usage:**
```typescript
import { ProgressTracker } from './progress-tracker';

const tracker = new ProgressTracker();

// Start tracking a file
const progress = tracker.startTracking(fileId, fileName, fileSize);

// Subscribe to progress updates
const unsubscribe = tracker.onProgress(fileId, (progress) => {
  console.log(`${progress.fileName}: ${progress.stage} (${progress.progress}%)`);
  if (progress.estimatedTimeRemaining) {
    console.log(`ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s`);
  }
});

// Update progress
tracker.updateProgress(fileId, 'extracting-text', 'Extracting text content');
tracker.updateProgressWithPercentage(fileId, 'extracting-text', 45);

// Complete processing
tracker.completeProgress(fileId, 'Processing completed successfully');
```

### MemoryManager

Monitors and manages memory usage to prevent system overload.

**Features:**
- Real-time memory usage monitoring
- Configurable memory thresholds and limits
- Concurrent processing limits based on memory availability
- Automatic garbage collection triggers
- Memory usage statistics and history
- Chunked file reading for large files

**Usage:**
```typescript
import { MemoryManager } from './memory-manager';

const memoryManager = new MemoryManager({
  maxConcurrentFiles: 3,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  warningThreshold: 75, // 75%
  criticalThreshold: 90, // 90%
  enableGarbageCollection: true
});

// Check if file can be processed
const canProcess = memoryManager.canProcessFile(file.size);
if (!canProcess.canProcess) {
  throw new Error(`Cannot process file: ${canProcess.reason}`);
}

// Register processing start/end
memoryManager.startProcessing(fileId);
try {
  // Process file...
} finally {
  memoryManager.finishProcessing(fileId);
}

// Get memory statistics
const stats = memoryManager.getMemoryStats();
console.log(`Memory usage: ${stats.current.percentage.toFixed(1)}%`);
```

### EnhancedFileProcessorFactory

Orchestrates all performance optimizations with background processing capabilities.

**Features:**
- Integrated caching, progress tracking, and memory management
- Background processing queue with priority support
- Concurrent processing with configurable limits
- Timeout handling and error recovery
- Comprehensive statistics and monitoring

**Usage:**
```typescript
import { EnhancedFileProcessorFactory } from './enhanced-factory';

const factory = new EnhancedFileProcessorFactory();

// Process single file with all optimizations
const result = await factory.processFile(file, {
  useCache: true,
  trackProgress: true,
  manageMemory: true,
  priority: 'high',
  timeout: 300000, // 5 minutes
  onProgress: (progress) => {
    console.log(`Processing ${progress.fileName}: ${progress.stage}`);
  }
});

// Process multiple files with batch tracking
const results = await factory.processMultipleFiles(files, {
  useCache: true,
  trackProgress: true,
  manageMemory: true,
  onBatchProgress: (batchProgress) => {
    console.log(`Batch: ${batchProgress.completedFiles}/${batchProgress.totalFiles}`);
  }
});

// Get comprehensive statistics
const stats = factory.getStats();
console.log('Cache hit rate:', (stats.cache.hitRate * 100).toFixed(1) + '%');
console.log('Memory usage:', stats.memory.current.percentage.toFixed(1) + '%');
console.log('Queue status:', stats.queue);
```

## Performance Benefits

### Caching Benefits
- **Avoid Reprocessing**: Identical files are processed only once
- **Faster Response Times**: Cached results return in milliseconds
- **Reduced CPU Usage**: Eliminates redundant processing operations
- **Lower Memory Pressure**: Cached results use less memory than reprocessing

### Progress Tracking Benefits
- **User Experience**: Real-time feedback for long operations
- **Debugging**: Detailed stage information for troubleshooting
- **Monitoring**: Performance metrics and bottleneck identification
- **Cancellation**: Ability to cancel long-running operations

### Memory Management Benefits
- **System Stability**: Prevents memory exhaustion and crashes
- **Optimal Throughput**: Balances processing speed with resource usage
- **Scalability**: Handles varying file sizes and system conditions
- **Resource Efficiency**: Automatic garbage collection and cleanup

### Background Processing Benefits
- **Concurrency**: Multiple files processed simultaneously
- **Prioritization**: Important files processed first
- **Queue Management**: Efficient handling of processing backlogs
- **Error Isolation**: Failed files don't affect others

## Configuration Options

### Cache Configuration
```typescript
interface CacheConfig {
  maxEntries: number;        // Maximum number of cached files
  maxSizeBytes: number;      // Maximum cache size in bytes
  ttlMs: number;            // Time to live in milliseconds
  cleanupIntervalMs: number; // Cleanup interval in milliseconds
}
```

### Memory Configuration
```typescript
interface MemoryConfig {
  warningThreshold: number;     // Warning threshold percentage (0-100)
  criticalThreshold: number;    // Critical threshold percentage (0-100)
  maxConcurrentFiles: number;   // Maximum concurrent processing
  maxFileSize: number;          // Maximum file size in bytes
  enableGarbageCollection: boolean; // Enable automatic GC
  gcIntervalMs: number;         // GC interval in milliseconds
}
```

### Processing Options
```typescript
interface EnhancedProcessingOptions {
  useCache?: boolean;           // Enable caching
  trackProgress?: boolean;      // Enable progress tracking
  manageMemory?: boolean;       // Enable memory management
  priority?: 'low' | 'normal' | 'high'; // Processing priority
  timeout?: number;             // Timeout in milliseconds
  onProgress?: (progress: ProcessingProgress) => void;
  onBatchProgress?: (progress: BatchProgress) => void;
}
```

## Performance Benchmarks

Based on the test suite, the system demonstrates:

- **Cache Operations**: 50 cache operations complete in under 1 second
- **Progress Updates**: 10,000 progress updates complete in under 2 seconds
- **Memory Assessment**: 1,000 file assessments complete in under 100ms
- **Concurrent Processing**: Significant speedup over sequential processing
- **Large File Handling**: Efficient chunked processing for files up to 100MB+

## Best Practices

### For Optimal Caching
1. Enable caching for repeated file processing workflows
2. Configure appropriate cache size based on available memory
3. Monitor cache hit rates and adjust TTL as needed
4. Clear cache periodically in long-running applications

### For Progress Tracking
1. Use progress callbacks for user interface updates
2. Implement cancellation based on progress tracking
3. Clean up completed progress entries regularly
4. Use batch tracking for multiple file operations

### For Memory Management
1. Set conservative memory thresholds for stability
2. Monitor memory usage in production environments
3. Use chunked processing for very large files
4. Enable garbage collection for long-running processes

### For Background Processing
1. Set appropriate timeout values for different file types
2. Use priority levels to handle urgent files first
3. Monitor queue statistics to identify bottlenecks
4. Implement proper error handling and recovery

## Integration with Existing Code

The performance optimizations are designed to be backward compatible. Existing code can continue using the basic `FileProcessorFactory`, while new code can opt into enhanced features:

```typescript
// Basic processing (existing code)
import { FileProcessing } from './index';
const result = await FileProcessing.processFile(file);

// Enhanced processing (new code)
const result = await FileProcessing.processFileEnhanced(file, {
  useCache: true,
  trackProgress: true,
  manageMemory: true
});
```

## Monitoring and Debugging

The system provides comprehensive statistics for monitoring:

```typescript
const stats = factory.getStats();

// Cache statistics
console.log('Cache entries:', stats.cache.totalEntries);
console.log('Cache hit rate:', (stats.cache.hitRate * 100).toFixed(1) + '%');
console.log('Cache size:', Math.round(stats.cache.totalSize / 1024) + ' KB');

// Memory statistics
console.log('Memory usage:', stats.memory.current.percentage.toFixed(1) + '%');
console.log('Peak memory:', stats.memory.peak.percentage.toFixed(1) + '%');
console.log('Active files:', stats.memory.activeFiles);

// Queue statistics
console.log('Pending files:', stats.queue.pending);
console.log('Active processors:', stats.queue.active);
console.log('Total processed:', stats.queue.totalProcessed);
console.log('Total failed:', stats.queue.totalFailed);
```

## Future Enhancements

Potential future improvements include:

1. **Persistent Caching**: Store cache across application restarts
2. **Distributed Processing**: Support for multiple worker processes
3. **Advanced Scheduling**: More sophisticated queue management
4. **Compression**: Compress cached content to save memory
5. **Metrics Export**: Integration with monitoring systems
6. **Auto-tuning**: Automatic optimization based on system performance