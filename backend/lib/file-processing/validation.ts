// File validation utilities and enhanced error handling

import { FileValidationResult, SupportedFileType } from './types';

export interface ValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  requireNonEmpty: boolean;
}

export interface EnhancedValidationResult extends FileValidationResult {
  warnings: string[];
  suggestions: string[];
  fileInfo: {
    size: number;
    sizeFormatted: string;
    extension: string;
    mimeType: string;
  };
}

export class FileValidator {
  private static readonly DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  
  private static readonly FILE_TYPE_CONFIGS: Record<SupportedFileType, ValidationConfig> = {
    pdf: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['application/pdf'],
      allowedExtensions: ['pdf'],
      requireNonEmpty: true
    },
    docx: {
      maxFileSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: ['docx'],
      requireNonEmpty: true
    },
    xlsx: {
      maxFileSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      allowedExtensions: ['xlsx'],
      requireNonEmpty: true
    },
    pptx: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      allowedExtensions: ['pptx'],
      requireNonEmpty: true
    },
    image: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp'
      ],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      requireNonEmpty: true
    },
    txt: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['text/plain'],
      allowedExtensions: ['txt'],
      requireNonEmpty: true
    }
  };

  /**
   * Perform enhanced validation with detailed feedback
   */
  static validateFileEnhanced(file: File, fileType?: SupportedFileType): EnhancedValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const extension = FileValidator.getFileExtension(file.name);
    const detectedType = fileType || FileValidator.detectFileType(file);
    
    const fileInfo = {
      size: file.size,
      sizeFormatted: FileValidator.formatFileSize(file.size),
      extension,
      mimeType: file.type
    };

    // Basic file checks
    if (file.size === 0) {
      errors.push('File is empty');
      suggestions.push('Please select a file with content');
    }

    if (!file.name || file.name.trim() === '') {
      errors.push('File name is missing');
    }

    // Type-specific validation
    if (detectedType) {
      const config = FileValidator.FILE_TYPE_CONFIGS[detectedType];
      
      // Size validation
      if (file.size > config.maxFileSize) {
        errors.push(
          `File size ${fileInfo.sizeFormatted} exceeds maximum allowed size of ${FileValidator.formatFileSize(config.maxFileSize)} for ${detectedType.toUpperCase()} files`
        );
        suggestions.push('Try compressing the file or splitting it into smaller parts');
      } else if (file.size > config.maxFileSize * 0.8) {
        warnings.push(
          `File size ${fileInfo.sizeFormatted} is close to the maximum limit of ${FileValidator.formatFileSize(config.maxFileSize)}`
        );
      }

      // MIME type validation
      if (file.type && !config.allowedMimeTypes.includes(file.type.toLowerCase())) {
        errors.push(`Unsupported MIME type: ${file.type} for ${detectedType.toUpperCase()} files`);
        suggestions.push(`Expected MIME types: ${config.allowedMimeTypes.join(', ')}`);
      }

      // Extension validation
      if (!config.allowedExtensions.includes(extension)) {
        errors.push(`Unsupported file extension: .${extension} for ${detectedType.toUpperCase()} files`);
        suggestions.push(`Supported extensions: ${config.allowedExtensions.map(ext => `.${ext}`).join(', ')}`);
      }

      // File name validation
      if (FileValidator.hasProblematicCharacters(file.name)) {
        warnings.push('File name contains special characters that may cause issues');
        suggestions.push('Consider renaming the file to use only letters, numbers, hyphens, and underscores');
      }

    } else {
      errors.push('Unsupported file format');
      suggestions.push(`Supported formats: ${Object.keys(FileValidator.FILE_TYPE_CONFIGS).join(', ').toUpperCase()}`);
    }

    return {
      isValid: errors.length === 0,
      fileType: detectedType,
      errors,
      warnings,
      suggestions,
      fileInfo
    };
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
    const valid: File[] = [];
    const invalid: Array<{ file: File; validation: EnhancedValidationResult }> = [];
    let totalSize = 0;

    for (const file of files) {
      const validation = FileValidator.validateFileEnhanced(file);
      totalSize += file.size;

      if (validation.isValid) {
        valid.push(file);
      } else {
        invalid.push({ file, validation });
      }
    }

    return {
      valid,
      invalid,
      totalSize,
      totalSizeFormatted: FileValidator.formatFileSize(totalSize)
    };
  }

  /**
   * Check if the total size of files exceeds reasonable limits
   */
  static validateTotalSize(files: File[], maxTotalSize: number = 200 * 1024 * 1024): {
    isValid: boolean;
    totalSize: number;
    maxSize: number;
    message?: string;
  } {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const isValid = totalSize <= maxTotalSize;

    return {
      isValid,
      totalSize,
      maxSize: maxTotalSize,
      message: isValid 
        ? undefined 
        : `Total file size ${FileValidator.formatFileSize(totalSize)} exceeds maximum allowed ${FileValidator.formatFileSize(maxTotalSize)}`
    };
  }

  private static detectFileType(file: File): SupportedFileType | undefined {
    const mimeType = file.type.toLowerCase();
    const extension = FileValidator.getFileExtension(file.name);

    // Check each file type configuration
    for (const [type, config] of Object.entries(FileValidator.FILE_TYPE_CONFIGS)) {
      if (config.allowedMimeTypes.includes(mimeType) || 
          config.allowedExtensions.includes(extension)) {
        return type as SupportedFileType;
      }
    }

    return undefined;
  }

  private static getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || '';
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static hasProblematicCharacters(filename: string): boolean {
    // Check for characters that might cause issues in file processing
    const problematicChars = /[<>:"/\\|?*\x00-\x1f]/;
    return problematicChars.test(filename);
  }

  /**
   * Get validation configuration for a specific file type
   */
  static getValidationConfig(fileType: SupportedFileType): ValidationConfig {
    return { ...FileValidator.FILE_TYPE_CONFIGS[fileType] };
  }

  /**
   * Get all supported file information
   */
  static getSupportedFileInfo(): {
    types: SupportedFileType[];
    extensions: string[];
    mimeTypes: string[];
    maxSizes: Record<SupportedFileType, string>;
  } {
    const types = Object.keys(FileValidator.FILE_TYPE_CONFIGS) as SupportedFileType[];
    const extensions: string[] = [];
    const mimeTypes: string[] = [];
    const maxSizes: Record<SupportedFileType, string> = {} as any;

    for (const [type, config] of Object.entries(FileValidator.FILE_TYPE_CONFIGS)) {
      extensions.push(...config.allowedExtensions);
      mimeTypes.push(...config.allowedMimeTypes);
      maxSizes[type as SupportedFileType] = FileValidator.formatFileSize(config.maxFileSize);
    }

    return {
      types,
      extensions: [...new Set(extensions)],
      mimeTypes: [...new Set(mimeTypes)],
      maxSizes
    };
  }
}

/**
 * Utility function for quick file validation
 */
export function validateFile(file: File): FileValidationResult {
  const enhanced = FileValidator.validateFileEnhanced(file);
  return {
    isValid: enhanced.isValid,
    fileType: enhanced.fileType,
    errors: enhanced.errors
  };
}

/**
 * Utility function to check if a file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const validation = FileValidator.validateFileEnhanced(file);
  return validation.isValid && validation.fileType !== undefined;
}

/**
 * Get human-readable error messages for file validation
 */
export function getValidationErrorMessage(validation: EnhancedValidationResult): string {
  if (validation.isValid) {
    return '';
  }

  let message = validation.errors.join('. ');
  
  if (validation.suggestions.length > 0) {
    message += '\n\nSuggestions:\n' + validation.suggestions.map(s => `• ${s}`).join('\n');
  }

  return message;
}