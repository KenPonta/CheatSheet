// Base file processor interface and abstract class

import { ExtractedContent, ProcessingResult, FileValidationResult, SupportedFileType } from './types';

export interface FileProcessor {
  /**
   * Process a file and extract its content
   */
  processFile(file: File): Promise<ProcessingResult>;
  
  /**
   * Validate if the file can be processed by this processor
   */
  canProcess(file: File): boolean;
  
  /**
   * Get the supported file type for this processor
   */
  getSupportedType(): SupportedFileType;
  
  /**
   * Validate file before processing
   */
  validateFile(file: File): FileValidationResult;
}

export abstract class BaseFileProcessor implements FileProcessor {
  protected readonly maxFileSize: number;
  protected readonly supportedMimeTypes: string[];
  protected readonly supportedExtensions: string[];

  constructor(
    maxFileSize: number,
    supportedMimeTypes: string[],
    supportedExtensions: string[]
  ) {
    this.maxFileSize = maxFileSize;
    this.supportedMimeTypes = supportedMimeTypes;
    this.supportedExtensions = supportedExtensions;
  }

  abstract processFile(file: File): Promise<ProcessingResult>;
  abstract getSupportedType(): SupportedFileType;

  canProcess(file: File): boolean {
    const validation = this.validateFile(file);
    return validation.isValid;
  }

  validateFile(file: File): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(this.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check MIME type
    if (!this.supportedMimeTypes.includes(file.type)) {
      errors.push(`Unsupported MIME type: ${file.type}`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!this.supportedExtensions.includes(extension)) {
      errors.push(`Unsupported file extension: ${extension}`);
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      isValid: errors.length === 0,
      fileType: errors.length === 0 ? this.getSupportedType() : undefined,
      errors
    };
  }

  protected getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || '';
  }

  protected generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createProcessingError(code: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium', context?: string) {
    return {
      code,
      message,
      severity,
      context
    };
  }

  protected async measureProcessingTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const startTime = Date.now();
    const result = await operation();
    const time = Date.now() - startTime;
    return { result, time };
  }
}