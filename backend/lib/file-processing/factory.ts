// Factory pattern for creating file processors

import { FileProcessor } from './base-processor';
import { SupportedFileType, FileValidationResult, ProcessingResult } from './types';
import { FileValidator, EnhancedValidationResult } from './validation';
import { PDFProcessor } from './processors/pdf-processor';
import { WordProcessor } from './processors/word-processor';
import { ExcelProcessor } from './processors/excel-processor';
import { PowerPointProcessor } from './processors/powerpoint-processor';
import { ImageProcessor } from './processors/image-processor';
import { TextProcessor } from './processors/text-processor';

export class FileProcessorFactory {
  private static processors: Map<SupportedFileType, () => FileProcessor> = new Map([
    ['pdf', () => new PDFProcessor()],
    ['docx', () => new WordProcessor()],
    ['xlsx', () => new ExcelProcessor()],
    ['pptx', () => new PowerPointProcessor()],
    ['image', () => new ImageProcessor()],
    ['txt', () => new TextProcessor()]
  ]);

  /**
   * Create a processor for the given file
   */
  static createProcessor(file: File): FileProcessor | null {
    const validation = FileValidator.validateFileEnhanced(file);
    const fileType = validation.fileType;
    if (!fileType) {
      return null;
    }

    const processorFactory = this.processors.get(fileType);
    return processorFactory ? processorFactory() : null;
  }

  /**
   * Get all available processors
   */
  static getAllProcessors(): FileProcessor[] {
    return Array.from(this.processors.values()).map(factory => factory());
  }

  /**
   * Validate a file against all available processors
   */
  static validateFile(file: File): FileValidationResult {
    const enhanced = FileValidator.validateFileEnhanced(file);
    return {
      isValid: enhanced.isValid,
      fileType: enhanced.fileType,
      errors: enhanced.errors
    };
  }

  /**
   * Enhanced validation with detailed feedback
   */
  static validateFileEnhanced(file: File): EnhancedValidationResult {
    return FileValidator.validateFileEnhanced(file);
  }

  /**
   * Validate multiple files at once
   */
  static validateMultipleFiles(files: File[]): {
    valid: File[];
    invalid: Array<{ file: File; validation: EnhancedValidationResult }>;
    totalSize: number;
    totalSizeFormatted: string;
  } {
    return FileValidator.validateMultipleFiles(files);
  }

  /**
   * Process a file with enhanced error handling and validation
   */
  static async processFile(file: File): Promise<ProcessingResult> {
    // First validate the file
    const validation = FileValidator.validateFileEnhanced(file);
    
    if (!validation.isValid) {
      return {
        fileId: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'failed',
        errors: validation.errors.map(error => ({
          code: 'VALIDATION_ERROR',
          message: error,
          severity: 'high' as const
        })),
        processingTime: 0
      };
    }

    // Create appropriate processor
    const processor = this.createProcessor(file);
    
    if (!processor) {
      return {
        fileId: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'failed',
        errors: [{
          code: 'NO_PROCESSOR',
          message: 'No suitable processor found for this file type',
          severity: 'high'
        }],
        processingTime: 0
      };
    }

    try {
      return await processor.processFile(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      return {
        fileId: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'failed',
        errors: [{
          code: 'PROCESSING_ERROR',
          message: `Failed to process file: ${errorMessage}`,
          severity: 'high'
        }],
        processingTime: 0
      };
    }
  }

  /**
   * Process multiple files with progress tracking
   */
  static async processMultipleFiles(
    files: File[], 
    onProgress?: (processed: number, total: number, currentFile: string) => void
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (onProgress) {
        onProgress(i, files.length, file.name);
      }
      
      const result = await this.processFile(file);
      results.push(result);
    }
    
    if (onProgress) {
      onProgress(files.length, files.length, '');
    }
    
    return results;
  }

  /**
   * Detect the file type based on MIME type and extension
   */
  private static detectFileType(file: File): SupportedFileType | null {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.toLowerCase().split('.').pop() || '';

    // PDF files
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf';
    }

    // Word documents
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        extension === 'docx') {
      return 'docx';
    }

    // Excel files
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        extension === 'xlsx') {
      return 'xlsx';
    }

    // PowerPoint files
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
        extension === 'pptx') {
      return 'pptx';
    }

    // Image files
    if (mimeType.startsWith('image/') || 
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      return 'image';
    }

    // Text files
    if (mimeType === 'text/plain' || extension === 'txt') {
      return 'txt';
    }

    return null;
  }

  /**
   * Get supported file types
   */
  static getSupportedFileTypes(): SupportedFileType[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Get supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'text/plain'
    ];
  }

  /**
   * Get supported file extensions
   */
  static getSupportedExtensions(): string[] {
    return ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'txt'];
  }

  /**
   * Get detailed information about supported file types
   */
  static getSupportedFileInfo() {
    return FileValidator.getSupportedFileInfo();
  }

  /**
   * Check if a file can be processed
   */
  static canProcessFile(file: File): boolean {
    const validation = this.validateFile(file);
    return validation.isValid;
  }

  /**
   * Get processor configuration for a file type
   */
  static getProcessorConfig(fileType: SupportedFileType) {
    return FileValidator.getValidationConfig(fileType);
  }

  /**
   * Create a processor with custom configuration
   */
  static createProcessorWithConfig(file: File, config?: Partial<{ maxFileSize: number }>): FileProcessor | null {
    const processor = this.createProcessor(file);
    
    if (processor && config?.maxFileSize) {
      // Note: This would require processors to accept configuration
      // For now, we return the standard processor
      console.warn('Custom configuration not yet supported for processors');
    }
    
    return processor;
  }
}