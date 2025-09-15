// Enhanced error handling for file processing

import { ProcessingError } from './types';

export interface ErrorContext {
  fileId?: string;
  fileName?: string;
  fileType?: string;
  operation?: string;
  timestamp?: Date;
  additionalInfo?: Record<string, any>;
}

export interface ErrorRecoveryOptions {
  retryCount?: number;
  fallbackProcessor?: string;
  skipOnError?: boolean;
  notifyUser?: boolean;
}

export class FileProcessingError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high';
  public readonly context?: ErrorContext;
  public readonly recoverable: boolean;

  constructor(
    code: string,
    message: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    context?: ErrorContext,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'FileProcessingError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.recoverable = recoverable;
  }

  toProcessingError(): ProcessingError {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context ? JSON.stringify(this.context) : undefined
    };
  }
}

export class ErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static maxRetries = 3;

  /**
   * Handle and categorize errors during file processing
   */
  static handleError(
    error: Error | FileProcessingError,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): ProcessingError {
    const timestamp = new Date();
    const errorKey = `${context?.fileName || 'unknown'}_${error.message}`;
    
    // Track error frequency
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Determine if this is a known error type
    const categorizedError = this.categorizeError(error, context);
    
    // Log error for debugging
    console.error('File processing error:', {
      error: categorizedError,
      context: { ...context, timestamp },
      retryCount: currentCount
    });

    return categorizedError;
  }

  /**
   * Categorize errors based on type and context
   */
  private static categorizeError(
    error: Error | FileProcessingError,
    context?: ErrorContext
  ): ProcessingError {
    if (error instanceof FileProcessingError) {
      return error.toProcessingError();
    }

    // File system errors
    if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      return {
        code: 'FILE_NOT_FOUND',
        message: 'File could not be found or accessed',
        severity: 'high',
        context: JSON.stringify(context)
      };
    }

    // Permission errors
    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return {
        code: 'PERMISSION_DENIED',
        message: 'Insufficient permissions to access the file',
        severity: 'high',
        context: JSON.stringify(context)
      };
    }

    // Memory errors
    if (error.message.includes('out of memory') || error.message.includes('heap')) {
      return {
        code: 'MEMORY_ERROR',
        message: 'Insufficient memory to process the file',
        severity: 'high',
        context: JSON.stringify(context)
      };
    }

    // Network/timeout errors
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network or timeout error during processing',
        severity: 'medium',
        context: JSON.stringify(context)
      };
    }

    // Parsing errors
    if (error.message.includes('parse') || error.message.includes('invalid format')) {
      return {
        code: 'PARSE_ERROR',
        message: 'File format is invalid or corrupted',
        severity: 'medium',
        context: JSON.stringify(context)
      };
    }

    // OCR specific errors
    if (error.message.includes('tesseract') || error.message.includes('OCR')) {
      return {
        code: 'OCR_ERROR',
        message: 'Text recognition failed for image content',
        severity: 'low',
        context: JSON.stringify(context)
      };
    }

    // Generic processing error
    return {
      code: 'UNKNOWN_ERROR',
      message: `Unexpected error: ${error.message}`,
      severity: 'medium',
      context: JSON.stringify(context)
    };
  }

  /**
   * Determine if an error is recoverable and suggest recovery actions
   */
  static getRecoveryOptions(error: ProcessingError): {
    recoverable: boolean;
    suggestions: string[];
    retryRecommended: boolean;
  } {
    const suggestions: string[] = [];
    let recoverable = false;
    let retryRecommended = false;

    switch (error.code) {
      case 'FILE_NOT_FOUND':
        suggestions.push('Verify the file exists and try uploading again');
        break;

      case 'PERMISSION_DENIED':
        suggestions.push('Check file permissions and try again');
        retryRecommended = true;
        break;

      case 'MEMORY_ERROR':
        suggestions.push('Try processing a smaller file or reduce image quality');
        suggestions.push('Close other applications to free up memory');
        break;

      case 'NETWORK_ERROR':
        suggestions.push('Check your internet connection and try again');
        retryRecommended = true;
        recoverable = true;
        break;

      case 'PARSE_ERROR':
        suggestions.push('Verify the file is not corrupted');
        suggestions.push('Try saving the file in a different format');
        break;

      case 'OCR_ERROR':
        suggestions.push('Image quality may be too low for text recognition');
        suggestions.push('Try using a higher resolution image');
        recoverable = true;
        break;

      case 'VALIDATION_ERROR':
        suggestions.push('Check file format and size requirements');
        break;

      default:
        suggestions.push('Try processing the file again');
        retryRecommended = true;
        recoverable = true;
    }

    return {
      recoverable,
      suggestions,
      retryRecommended
    };
  }

  /**
   * Create user-friendly error messages
   */
  static getUserFriendlyMessage(error: ProcessingError): string {
    const baseMessages: Record<string, string> = {
      FILE_NOT_FOUND: 'The file could not be found. Please try uploading it again.',
      PERMISSION_DENIED: 'Unable to access the file due to permission restrictions.',
      MEMORY_ERROR: 'The file is too large to process. Please try a smaller file.',
      NETWORK_ERROR: 'A network error occurred. Please check your connection and try again.',
      PARSE_ERROR: 'The file appears to be corrupted or in an unsupported format.',
      OCR_ERROR: 'Unable to extract text from images in this file. The image quality may be too low.',
      VALIDATION_ERROR: 'The file does not meet the requirements for processing.',
      UNKNOWN_ERROR: 'An unexpected error occurred while processing the file.'
    };

    const baseMessage = baseMessages[error.code] || error.message;
    const recovery = this.getRecoveryOptions(error);

    if (recovery.suggestions.length > 0) {
      return `${baseMessage}\n\nSuggestions:\n${recovery.suggestions.map(s => `• ${s}`).join('\n')}`;
    }

    return baseMessage;
  }

  /**
   * Reset error counts (useful for testing or cleanup)
   */
  static resetErrorCounts(): void {
    this.errorCounts.clear();
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    mostCommonErrors: Array<{ error: string; count: number }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByType: Record<string, number> = {};
    
    for (const [errorKey, count] of this.errorCounts.entries()) {
      const errorType = errorKey.split('_')[0] || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + count;
    }

    const mostCommonErrors = Array.from(this.errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors,
      errorsByType,
      mostCommonErrors
    };
  }
}

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  options?: ErrorRecoveryOptions
): Promise<{ result?: T; error?: ProcessingError }> {
  try {
    const result = await operation();
    return { result };
  } catch (error) {
    const processedError = ErrorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      options
    );
    return { error: processedError };
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: ErrorContext
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const errorMessage = lastError ? lastError.message : 'Unknown error';
  throw new FileProcessingError(
    'RETRY_EXHAUSTED',
    `Operation failed after ${maxRetries + 1} attempts: ${errorMessage}`,
    'high',
    context,
    false
  );
}