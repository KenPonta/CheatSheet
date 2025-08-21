// Main exports for file processing system

// Core interfaces and types
export type {
  ExtractedContent,
  ExtractedImage,
  ExtractedTable,
  FileMetadata,
  DocumentStructure,
  Heading,
  Section,
  ProcessingError,
  ProcessingResult,
  SupportedFileType,
  FileValidationResult
} from './types';

// Base processor and interface
export type { FileProcessor } from './base-processor';
export { BaseFileProcessor } from './base-processor';

// Factory for creating processors
export { FileProcessorFactory } from './factory';

// Validation utilities
export {
  FileValidator,
  validateFile,
  isSupportedFileType,
  getValidationErrorMessage
} from './validation';
export type {
  ValidationConfig,
  EnhancedValidationResult
} from './validation';

// Error handling
export {
  FileProcessingError,
  ErrorHandler,
  withErrorHandling,
  withRetry
} from './error-handler';
export type {
  ErrorContext,
  ErrorRecoveryOptions
} from './error-handler';

// Individual processors (for direct use if needed)
export { PDFProcessor } from './processors/pdf-processor';
export { WordProcessor } from './processors/word-processor';
export { ExcelProcessor } from './processors/excel-processor';
export { PowerPointProcessor } from './processors/powerpoint-processor';
export { ImageProcessor } from './processors/image-processor';
export { TextProcessor } from './processors/text-processor';

// Performance optimization components
export {
  FileProcessingCache,
  getGlobalCache,
  setGlobalCache,
  clearGlobalCache
} from './cache';
export type {
  CacheEntry,
  CacheStats,
  CacheConfig
} from './cache';

export {
  ProgressTracker,
  getGlobalProgressTracker,
  setGlobalProgressTracker
} from './progress-tracker';
export type {
  ProcessingProgress,
  ProcessingStage,
  BatchProgress,
  ProgressCallback,
  BatchProgressCallback
} from './progress-tracker';

export {
  MemoryManager,
  getGlobalMemoryManager,
  setGlobalMemoryManager
} from './memory-manager';
export type {
  MemoryUsage,
  ProcessingLimits,
  MemoryConfig
} from './memory-manager';

export {
  EnhancedFileProcessorFactory,
  getGlobalEnhancedFactory,
  setGlobalEnhancedFactory
} from './enhanced-factory';
export type {
  EnhancedProcessingOptions,
  ProcessingQueue
} from './enhanced-factory';

// Convenience functions for common operations
import { FileValidator } from './validation';
import { FileProcessorFactory } from './factory';
import { ErrorHandler } from './error-handler';
import { getGlobalEnhancedFactory } from './enhanced-factory';

export const FileProcessing = {
  // Quick file validation
  validate: FileValidator.validateFileEnhanced,
  
  // Process single file (basic)
  processFile: FileProcessorFactory.processFile,
  
  // Process multiple files (basic)
  processMultipleFiles: FileProcessorFactory.processMultipleFiles,
  
  // Enhanced processing with caching, progress tracking, and memory management
  processFileEnhanced: (file: File, options?: any) => getGlobalEnhancedFactory().processFile(file, options),
  processMultipleFilesEnhanced: (files: File[], options?: any) => getGlobalEnhancedFactory().processMultipleFiles(files, options),
  
  // Get supported file info
  getSupportedTypes: FileProcessorFactory.getSupportedFileTypes,
  getSupportedExtensions: FileProcessorFactory.getSupportedExtensions,
  getSupportedMimeTypes: FileProcessorFactory.getSupportedMimeTypes,
  getSupportedFileInfo: FileProcessorFactory.getSupportedFileInfo,
  
  // Utility functions
  canProcess: FileProcessorFactory.canProcessFile,
  createProcessor: FileProcessorFactory.createProcessor,
  
  // Performance and monitoring
  getStats: () => getGlobalEnhancedFactory().getStats(),
  clearCache: () => getGlobalEnhancedFactory().clearCache(),
  
  // Error handling utilities
  getUserFriendlyError: ErrorHandler.getUserFriendlyMessage,
  getRecoveryOptions: ErrorHandler.getRecoveryOptions,
  getErrorStats: ErrorHandler.getErrorStats
};

// Default export for convenience
export default FileProcessing;