/**
 * Enhanced error handling integration service that coordinates all error handling components
 */

import { imageErrorHandler, ImageGenerationError, FallbackImage } from '../ai/image-generation-error-handler';
import { editorErrorHandler, EditorError, RecoveryResult } from '../content-modification/editor-error-handler';
import { errorService, UserNotification, ProcessingStage } from './error-service';
import { comprehensiveLogger } from '../monitoring/comprehensive-logger';
import { FlatLineImageRequest } from '../ai/simple-image-generator';
import { ContentOperation, StudyMaterial } from '../content-modification/types';

export interface EnhancedErrorContext {
  sessionId: string;
  userId?: string;
  operationType: 'image-generation' | 'content-modification' | 'editor-operation' | 'validation' | 'export';
  stage: ProcessingStage;
  correlationId?: string;
  metadata?: any;
}

export interface ErrorHandlingResult {
  success: boolean;
  handled: boolean;
  result?: any;
  fallbackUsed?: boolean;
  recoveryApplied?: boolean;
  userMessage: string;
  nextActions: string[];
  errorDetails?: any;
}

export interface ErrorHandlingConfig {
  enableAutoRecovery: boolean;
  enableFallbacks: boolean;
  enableUserNotifications: boolean;
  enableDetailedLogging: boolean;
  maxRetryAttempts: number;
  fallbackTimeout: number;
  recoveryTimeout: number;
}

export class EnhancedErrorIntegration {
  private static instance: EnhancedErrorIntegration;
  private config: ErrorHandlingConfig = {
    enableAutoRecovery: true,
    enableFallbacks: true,
    enableUserNotifications: true,
    enableDetailedLogging: true,
    maxRetryAttempts: 3,
    fallbackTimeout: 30000,
    recoveryTimeout: 60000
  };

  static getInstance(): EnhancedErrorIntegration {
    if (!EnhancedErrorIntegration.instance) {
      EnhancedErrorIntegration.instance = new EnhancedErrorIntegration();
    }
    return EnhancedErrorIntegration.instance;
  }

  /**
   * Handle image generation errors with comprehensive fallback and recovery
   */
  async handleImageGenerationError(
    error: Error,
    request: FlatLineImageRequest,
    context: EnhancedErrorContext,
    attemptNumber: number = 1
  ): Promise<ErrorHandlingResult> {
    const trackingId = comprehensiveLogger.startPerformanceTracking(
      'image-generation-error-handling',
      { requestType: request.type, attemptNumber }
    );

    try {
      // Log the error
      comprehensiveLogger.logImageGeneration(
        'error',
        `Image generation failed: ${error.message}`,
        'generate-image',
        false,
        undefined,
        error.name,
        { request, attemptNumber },
        context.sessionId
      );

      // Create image generation context
      const imageContext = {
        request,
        sessionId: context.sessionId,
        attemptNumber,
        previousErrors: [],
        fallbacksUsed: []
      };

      // Handle with image error handler
      const fallbackImage = await imageErrorHandler.handleGenerationFailure(
        error,
        imageContext,
        context.sessionId
      );

      // Log successful fallback
      comprehensiveLogger.logImageGeneration(
        'info',
        `Image generation fallback successful: ${fallbackImage.fallbackType}`,
        'fallback-generation',
        true,
        undefined,
        undefined,
        { fallbackType: fallbackImage.fallbackType, originalError: error.message },
        context.sessionId
      );

      // Notify user if enabled
      if (this.config.enableUserNotifications) {
        this.notifyImageFallback(context.sessionId, fallbackImage, error);
      }

      comprehensiveLogger.endPerformanceTracking(trackingId, true, 0, {
        fallbackType: fallbackImage.fallbackType,
        fallbackUsed: true
      });

      return {
        success: true,
        handled: true,
        result: fallbackImage,
        fallbackUsed: true,
        recoveryApplied: false,
        userMessage: fallbackImage.userMessage,
        nextActions: ['continue-with-fallback', 'retry-original', 'skip-image'],
        errorDetails: {
          originalError: error.message,
          fallbackType: fallbackImage.fallbackType
        }
      };

    } catch (handlingError) {
      comprehensiveLogger.error(
        'image-generation',
        `Error handling failed: ${handlingError.message}`,
        {
          component: 'EnhancedErrorIntegration',
          operation: 'handleImageGenerationError',
          success: false
        },
        { originalError: error.message, handlingError: handlingError.message },
        context.sessionId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1);

      return {
        success: false,
        handled: false,
        fallbackUsed: false,
        recoveryApplied: false,
        userMessage: 'Unable to generate image or create fallback. Please try again or skip this image.',
        nextActions: ['retry', 'skip-image', 'contact-support'],
        errorDetails: {
          originalError: error.message,
          handlingError: handlingError.message
        }
      };
    }
  }

  /**
   * Handle content modification errors with recovery strategies
   */
  async handleContentModificationError(
    error: Error,
    operation: ContentOperation,
    material: StudyMaterial,
    context: EnhancedErrorContext,
    attemptNumber: number = 1
  ): Promise<ErrorHandlingResult> {
    const trackingId = comprehensiveLogger.startPerformanceTracking(
      'content-modification-error-handling',
      { operationType: operation.type, materialId: material.id, attemptNumber }
    );

    try {
      // Log the error
      comprehensiveLogger.logContentModification(
        'error',
        `Content modification failed: ${error.message}`,
        operation.type,
        material.id,
        false,
        undefined,
        error.name,
        { operation, attemptNumber },
        context.sessionId,
        context.userId
      );

      // Create editor error context
      const editorContext = {
        operation,
        materialId: material.id,
        userId: context.userId,
        sessionId: context.sessionId,
        materialState: material,
        attemptNumber,
        previousErrors: []
      };

      // Handle with editor error handler
      const recoveryResult = await editorErrorHandler.handleOperationError(error, editorContext);

      // Log recovery result
      comprehensiveLogger.logContentModification(
        recoveryResult.success ? 'info' : 'warn',
        `Content modification recovery ${recoveryResult.success ? 'successful' : 'partial'}: ${recoveryResult.userMessage}`,
        'error-recovery',
        material.id,
        recoveryResult.success,
        undefined,
        undefined,
        { 
          appliedSuggestions: recoveryResult.appliedSuggestions,
          remainingErrors: recoveryResult.remainingErrors.length
        },
        context.sessionId,
        context.userId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, recoveryResult.success, 
        recoveryResult.remainingErrors.length, {
          appliedSuggestions: recoveryResult.appliedSuggestions,
          recoveryApplied: recoveryResult.success
        });

      return {
        success: recoveryResult.success,
        handled: true,
        result: recoveryResult.recoveredMaterial,
        fallbackUsed: false,
        recoveryApplied: recoveryResult.success,
        userMessage: recoveryResult.userMessage,
        nextActions: recoveryResult.success 
          ? ['continue', 'validate-changes'] 
          : ['retry', 'rollback', 'manual-fix'],
        errorDetails: {
          originalError: error.message,
          appliedSuggestions: recoveryResult.appliedSuggestions,
          remainingErrors: recoveryResult.remainingErrors.map(e => e.message)
        }
      };

    } catch (handlingError) {
      comprehensiveLogger.error(
        'content-modification',
        `Error handling failed: ${handlingError.message}`,
        {
          component: 'EnhancedErrorIntegration',
          operation: 'handleContentModificationError',
          success: false
        },
        { originalError: error.message, handlingError: handlingError.message },
        context.sessionId,
        context.userId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1);

      return {
        success: false,
        handled: false,
        fallbackUsed: false,
        recoveryApplied: false,
        userMessage: 'Unable to recover from content modification error. Manual intervention may be required.',
        nextActions: ['rollback', 'reload-material', 'contact-support'],
        errorDetails: {
          originalError: error.message,
          handlingError: handlingError.message
        }
      };
    }
  }

  /**
   * Handle validation errors with detailed feedback
   */
  async handleValidationError(
    validationErrors: any[],
    context: EnhancedErrorContext,
    operation?: string
  ): Promise<ErrorHandlingResult> {
    const trackingId = comprehensiveLogger.startPerformanceTracking(
      'validation-error-handling',
      { errorCount: validationErrors.length, operation }
    );

    try {
      // Log validation errors
      comprehensiveLogger.logValidation(
        'error',
        `Validation failed with ${validationErrors.length} errors`,
        operation || 'unknown',
        false,
        validationErrors.filter(e => e.severity === 'error').length,
        validationErrors.filter(e => e.severity === 'warning').length,
        { errors: validationErrors },
        context.sessionId
      );

      // Create user-friendly error messages
      const errorMessages = validationErrors.map(error => {
        let message = error.message;
        if (error.field) {
          message = `${error.field}: ${message}`;
        }
        if (error.suggestion) {
          message += ` (${error.suggestion})`;
        }
        return message;
      });

      // Determine next actions based on error types
      const nextActions = this.determineValidationActions(validationErrors);

      // Notify user if enabled
      if (this.config.enableUserNotifications) {
        this.notifyValidationErrors(context.sessionId, validationErrors);
      }

      comprehensiveLogger.endPerformanceTracking(trackingId, false, validationErrors.length);

      return {
        success: false,
        handled: true,
        fallbackUsed: false,
        recoveryApplied: false,
        userMessage: `Validation failed: ${errorMessages.join('; ')}`,
        nextActions,
        errorDetails: {
          validationErrors,
          errorCount: validationErrors.length
        }
      };

    } catch (handlingError) {
      comprehensiveLogger.error(
        'validation',
        `Validation error handling failed: ${handlingError.message}`,
        {
          component: 'EnhancedErrorIntegration',
          operation: 'handleValidationError',
          success: false
        },
        { handlingError: handlingError.message },
        context.sessionId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1);

      return {
        success: false,
        handled: false,
        fallbackUsed: false,
        recoveryApplied: false,
        userMessage: 'Validation error handling failed. Please check your input and try again.',
        nextActions: ['fix-input', 'retry'],
        errorDetails: {
          handlingError: handlingError.message
        }
      };
    }
  }

  /**
   * Handle export errors with format alternatives
   */
  async handleExportError(
    error: Error,
    format: string,
    materialId: string,
    context: EnhancedErrorContext
  ): Promise<ErrorHandlingResult> {
    const trackingId = comprehensiveLogger.startPerformanceTracking(
      'export-error-handling',
      { format, materialId }
    );

    try {
      // Log export error
      comprehensiveLogger.error(
        'api',
        `Export failed for format ${format}: ${error.message}`,
        {
          component: 'ExportService',
          operation: 'export',
          success: false
        },
        { format, materialId, error: error.message },
        context.sessionId,
        context.userId
      );

      // Suggest alternative formats
      const alternativeFormats = this.getAlternativeExportFormats(format);
      
      // Notify user with alternatives
      if (this.config.enableUserNotifications) {
        this.notifyExportError(context.sessionId, error, format, alternativeFormats);
      }

      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1, {
        alternativeFormats
      });

      return {
        success: false,
        handled: true,
        fallbackUsed: false,
        recoveryApplied: false,
        userMessage: `Export to ${format} failed. Try alternative formats: ${alternativeFormats.join(', ')}.`,
        nextActions: ['try-alternative-format', 'retry-export', 'download-source'],
        errorDetails: {
          originalFormat: format,
          alternativeFormats,
          error: error.message
        }
      };

    } catch (handlingError) {
      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1);

      return {
        success: false,
        handled: false,
        fallbackUsed: false,
        recoveryApplied: false,
        userMessage: 'Export error handling failed. Please try again later.',
        nextActions: ['retry-later', 'contact-support'],
        errorDetails: {
          originalError: error.message,
          handlingError: handlingError.message
        }
      };
    }
  }

  /**
   * Get comprehensive error statistics across all error handlers
   */
  getComprehensiveErrorStatistics(): {
    imageGeneration: any;
    contentModification: any;
    validation: any;
    overall: any;
  } {
    const imageStats = imageErrorHandler.getErrorStats();
    const editorStats = editorErrorHandler.getErrorStats();
    const logStats = comprehensiveLogger.getErrorStatistics();

    return {
      imageGeneration: imageStats,
      contentModification: editorStats,
      validation: {
        // This would be populated by a validation error tracker
        totalValidationErrors: 0,
        commonValidationIssues: []
      },
      overall: {
        totalErrors: logStats.totalErrors,
        errorsByCategory: logStats.errorsByCategory,
        errorTrends: logStats.errorTrends,
        systemHealth: this.calculateSystemHealth(imageStats, editorStats, logStats)
      }
    };
  }

  /**
   * Configure error handling behavior
   */
  configure(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
    
    comprehensiveLogger.info(
      'system',
      'Error handling configuration updated',
      {
        component: 'EnhancedErrorIntegration',
        operation: 'configure',
        success: true
      },
      config
    );
  }

  /**
   * Notify user about image fallback
   */
  private notifyImageFallback(sessionId: string, fallbackImage: FallbackImage, originalError: Error): void {
    const notification: UserNotification = {
      id: `image_fallback_${Date.now()}`,
      type: 'warning',
      title: 'Image Generation Fallback',
      message: `${fallbackImage.userMessage} Original error: ${originalError.message}`,
      stage: 'ai-processing',
      timestamp: new Date(),
      dismissible: true,
      autoHide: true,
      duration: 10000,
      actions: [
        { label: 'Accept Fallback', action: 'continue' },
        { label: 'Retry Original', action: 'retry' },
        { label: 'Skip Image', action: 'skip' }
      ]
    };

    errorService.addNotification(sessionId, notification);
  }

  /**
   * Notify user about validation errors
   */
  private notifyValidationErrors(sessionId: string, validationErrors: any[]): void {
    const errorCount = validationErrors.filter(e => e.severity === 'error').length;
    const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

    const notification: UserNotification = {
      id: `validation_error_${Date.now()}`,
      type: 'error',
      title: 'Validation Failed',
      message: `Found ${errorCount} errors and ${warningCount} warnings. Please fix the issues and try again.`,
      stage: 'validation',
      timestamp: new Date(),
      dismissible: true,
      actions: [
        { label: 'Show Details', action: 'manual', data: { validationErrors } },
        { label: 'Fix Issues', action: 'manual' }
      ]
    };

    errorService.addNotification(sessionId, notification);
  }

  /**
   * Notify user about export errors
   */
  private notifyExportError(
    sessionId: string, 
    error: Error, 
    format: string, 
    alternatives: string[]
  ): void {
    const notification: UserNotification = {
      id: `export_error_${Date.now()}`,
      type: 'error',
      title: 'Export Failed',
      message: `Failed to export as ${format}. Try these alternatives: ${alternatives.join(', ')}.`,
      stage: 'completion',
      timestamp: new Date(),
      dismissible: true,
      actions: alternatives.map(alt => ({
        label: `Export as ${alt.toUpperCase()}`,
        action: 'retry',
        data: { format: alt }
      }))
    };

    errorService.addNotification(sessionId, notification);
  }

  /**
   * Determine validation error actions
   */
  private determineValidationActions(validationErrors: any[]): string[] {
    const actions = ['fix-validation-errors'];
    
    const hasFieldErrors = validationErrors.some(e => e.field);
    const hasFormatErrors = validationErrors.some(e => e.code?.includes('FORMAT'));
    const hasSizeErrors = validationErrors.some(e => e.code?.includes('SIZE'));

    if (hasFieldErrors) actions.push('check-required-fields');
    if (hasFormatErrors) actions.push('check-format');
    if (hasSizeErrors) actions.push('reduce-content-size');

    actions.push('retry-after-fixes');
    return actions;
  }

  /**
   * Get alternative export formats
   */
  private getAlternativeExportFormats(failedFormat: string): string[] {
    const formatAlternatives: Record<string, string[]> = {
      'pdf': ['html', 'markdown'],
      'html': ['markdown', 'pdf'],
      'markdown': ['html', 'pdf'],
      'docx': ['html', 'markdown'],
      'xlsx': ['csv', 'html']
    };

    return formatAlternatives[failedFormat] || ['html', 'markdown'];
  }

  /**
   * Calculate overall system health score
   */
  private calculateSystemHealth(imageStats: any, editorStats: any, logStats: any): {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    let score = 100;
    const issues: string[] = [];

    // Image generation health
    if (imageStats.fallbackSuccessRate < 0.9) {
      score -= 15;
      issues.push('High image generation failure rate');
    }

    // Content modification health
    if (editorStats.recoverySuccessRate < 0.8) {
      score -= 20;
      issues.push('Low content modification recovery rate');
    }

    // Overall error rate
    const recentErrorCount = logStats.errorTrends.slice(-3).reduce((sum: number, day: any) => sum + day.count, 0);
    if (recentErrorCount > 50) {
      score -= 25;
      issues.push('High recent error count');
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return { score, status, issues };
  }
}

// Export singleton instance
export const enhancedErrorIntegration = EnhancedErrorIntegration.getInstance();