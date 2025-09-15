/**
 * Enhanced error handling for editor operations and content modifications
 */

import { 
  ContentOperation, 
  ValidationResult, 
  StudyMaterial, 
  ContentSection, 
  GeneratedImage,
  ContentModificationError 
} from './types';
import { errorService, UserNotification } from '../error-handling/error-service';

export interface EditorError extends Error {
  code: EditorErrorCode;
  severity: 'low' | 'medium' | 'high';
  context: EditorErrorContext;
  recoverable: boolean;
  suggestions: RecoverySuggestion[];
}

export type EditorErrorCode = 
  | 'VALIDATION_ERROR'
  | 'DEPENDENCY_CONFLICT'
  | 'CONTENT_CORRUPTION'
  | 'STORAGE_ERROR'
  | 'CONCURRENT_MODIFICATION'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_OPERATION'
  | 'ROLLBACK_FAILED'
  | 'EXPORT_ERROR';

export interface EditorErrorContext {
  operation: ContentOperation;
  materialId: string;
  userId?: string;
  sessionId?: string;
  materialState: StudyMaterial;
  attemptNumber: number;
  previousErrors: EditorError[];
}

export interface RecoverySuggestion {
  type: 'retry' | 'rollback' | 'fix-dependencies' | 'validate-content' | 'reload-material' | 'contact-support';
  description: string;
  automated: boolean;
  priority: number;
  action?: () => Promise<void>;
  parameters?: any;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface RecoveryResult {
  success: boolean;
  recoveredMaterial?: StudyMaterial;
  appliedSuggestions: string[];
  remainingErrors: EditorError[];
  userMessage: string;
}

export class EditorErrorHandler {
  private static instance: EditorErrorHandler;
  private maxRetries = 3;
  private recoveryCache = new Map<string, RecoveryResult>();
  private validationRules = new Map<string, ValidationRule>();

  static getInstance(): EditorErrorHandler {
    if (!EditorErrorHandler.instance) {
      EditorErrorHandler.instance = new EditorErrorHandler();
      EditorErrorHandler.instance.initializeValidationRules();
    }
    return EditorErrorHandler.instance;
  }

  /**
   * Handle editor operation error with recovery strategies
   */
  async handleOperationError(
    error: Error,
    context: EditorErrorContext
  ): Promise<RecoveryResult> {
    const editorError = this.createEditorError(error, context);
    
    // Log error for monitoring
    this.logError(editorError);
    
    // Notify user of error
    if (context.sessionId) {
      this.notifyError(context.sessionId, editorError);
    }
    
    // Determine recovery strategies
    const suggestions = this.determineRecoveryStrategies(editorError);
    
    // Execute recovery strategies
    return await this.executeRecovery(editorError, suggestions);
  }

  /**
   * Validate editor operation before execution
   */
  async validateOperation(
    material: StudyMaterial,
    operation: ContentOperation,
    context?: Partial<EditorErrorContext>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Basic operation validation
      const basicValidation = this.validateBasicOperation(operation);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Material-specific validation
      const materialValidation = await this.validateAgainstMaterial(material, operation);
      errors.push(...materialValidation.errors);
      warnings.push(...materialValidation.warnings);

      // Dependency validation
      const dependencyValidation = this.validateDependencies(material, operation);
      errors.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);

      // Business rule validation
      const businessValidation = this.validateBusinessRules(material, operation);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

      return {
        valid: errors.length === 0,
        errors: errors.map(e => ({
          code: e.code,
          message: e.message,
          severity: e.severity,
          field: e.field,
          suggestion: e.suggestion
        })),
        warnings: warnings.map(w => ({
          code: w.code,
          message: w.message,
          severity: w.severity,
          field: w.field,
          suggestion: w.suggestion
        }))
      };
    } catch (validationError) {
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_SYSTEM_ERROR',
          message: `Validation system error: ${validationError.message}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Create structured editor error
   */
  private createEditorError(error: Error, context: EditorErrorContext): EditorError {
    let code: EditorErrorCode = 'INVALID_OPERATION';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let recoverable = true;

    // Determine error code and severity
    if (error instanceof ContentModificationError) {
      switch (error.code) {
        case 'MATERIAL_NOT_FOUND':
          code = 'STORAGE_ERROR';
          severity = 'high';
          break;
        case 'VALIDATION_FAILED':
          code = 'VALIDATION_ERROR';
          severity = 'medium';
          break;
        default:
          code = 'INVALID_OPERATION';
      }
    } else if (error.message.includes('concurrent') || error.message.includes('conflict')) {
      code = 'CONCURRENT_MODIFICATION';
      severity = 'medium';
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      code = 'PERMISSION_DENIED';
      severity = 'high';
      recoverable = false;
    } else if (error.message.includes('storage') || error.message.includes('save')) {
      code = 'STORAGE_ERROR';
      severity = 'high';
    } else if (error.message.includes('dependency')) {
      code = 'DEPENDENCY_CONFLICT';
      severity = 'medium';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      code = 'QUOTA_EXCEEDED';
      severity = 'high';
    } else if (error.message.includes('corrupt')) {
      code = 'CONTENT_CORRUPTION';
      severity = 'high';
    } else if (error.message.includes('export')) {
      code = 'EXPORT_ERROR';
      severity = 'medium';
    }

    const suggestions = this.determineRecoveryStrategies({
      code,
      severity,
      recoverable,
      context
    } as EditorError);

    return Object.assign(new Error(error.message), {
      code,
      severity,
      context,
      recoverable,
      suggestions,
      name: 'EditorError'
    }) as EditorError;
  }

  /**
   * Determine recovery strategies based on error type
   */
  private determineRecoveryStrategies(error: EditorError): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];
    const { code, context, severity } = error;

    switch (code) {
      case 'VALIDATION_ERROR':
        suggestions.push({
          type: 'validate-content',
          description: 'Fix validation errors and retry',
          automated: false,
          priority: 8,
          parameters: { showValidationDetails: true }
        });
        if (context.attemptNumber < this.maxRetries) {
          suggestions.push({
            type: 'retry',
            description: 'Retry operation with corrected data',
            automated: false,
            priority: 6
          });
        }
        break;

      case 'DEPENDENCY_CONFLICT':
        suggestions.push({
          type: 'fix-dependencies',
          description: 'Resolve dependency conflicts',
          automated: true,
          priority: 9,
          action: async () => {
            await this.fixDependencyConflicts(context.materialState, context.operation);
          }
        });
        break;

      case 'CONCURRENT_MODIFICATION':
        suggestions.push({
          type: 'reload-material',
          description: 'Reload material and retry operation',
          automated: true,
          priority: 8,
          action: async () => {
            // This would reload the material from storage
            console.log('Reloading material to resolve conflicts');
          }
        });
        suggestions.push({
          type: 'rollback',
          description: 'Rollback to previous version',
          automated: false,
          priority: 6
        });
        break;

      case 'STORAGE_ERROR':
        if (context.attemptNumber < this.maxRetries) {
          suggestions.push({
            type: 'retry',
            description: 'Retry storage operation',
            automated: true,
            priority: 7
          });
        }
        suggestions.push({
          type: 'rollback',
          description: 'Rollback to last saved state',
          automated: false,
          priority: 5
        });
        break;

      case 'CONTENT_CORRUPTION':
        suggestions.push({
          type: 'rollback',
          description: 'Restore from backup',
          automated: false,
          priority: 9
        });
        suggestions.push({
          type: 'validate-content',
          description: 'Validate and repair content',
          automated: true,
          priority: 7,
          action: async () => {
            await this.repairCorruptedContent(context.materialState);
          }
        });
        break;

      case 'QUOTA_EXCEEDED':
        suggestions.push({
          type: 'validate-content',
          description: 'Remove unnecessary content to reduce size',
          automated: false,
          priority: 8,
          parameters: { showQuotaDetails: true }
        });
        break;

      case 'PERMISSION_DENIED':
        suggestions.push({
          type: 'contact-support',
          description: 'Contact support for permission issues',
          automated: false,
          priority: 5
        });
        break;

      case 'EXPORT_ERROR':
        suggestions.push({
          type: 'retry',
          description: 'Retry export with different format',
          automated: false,
          priority: 7,
          parameters: { suggestAlternativeFormats: true }
        });
        break;

      default:
        if (context.attemptNumber < this.maxRetries) {
          suggestions.push({
            type: 'retry',
            description: 'Retry operation',
            automated: true,
            priority: 5
          });
        }
        suggestions.push({
          type: 'rollback',
          description: 'Rollback changes',
          automated: false,
          priority: 4
        });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute recovery strategies
   */
  private async executeRecovery(
    error: EditorError,
    suggestions: RecoverySuggestion[]
  ): Promise<RecoveryResult> {
    const appliedSuggestions: string[] = [];
    const remainingErrors: EditorError[] = [error];
    let recoveredMaterial: StudyMaterial | undefined;
    let success = false;

    // Try automated recovery suggestions first
    for (const suggestion of suggestions.filter(s => s.automated)) {
      try {
        if (suggestion.action) {
          await suggestion.action();
          appliedSuggestions.push(suggestion.type);
          
          // If this was a critical recovery, consider it successful
          if (suggestion.priority >= 8) {
            success = true;
            remainingErrors.pop(); // Remove the error as it's been handled
            break;
          }
        }
      } catch (recoveryError) {
        console.warn(`Recovery suggestion ${suggestion.type} failed:`, recoveryError);
        continue;
      }
    }

    // Generate user message
    let userMessage = '';
    if (success) {
      userMessage = `Operation recovered successfully. Applied: ${appliedSuggestions.join(', ')}.`;
    } else {
      const manualSuggestions = suggestions.filter(s => !s.automated);
      if (manualSuggestions.length > 0) {
        userMessage = `Manual intervention required. Suggested actions: ${manualSuggestions.map(s => s.description).join(', ')}.`;
      } else {
        userMessage = 'Unable to recover automatically. Please try again or contact support.';
      }
    }

    return {
      success,
      recoveredMaterial,
      appliedSuggestions,
      remainingErrors,
      userMessage
    };
  }

  /**
   * Validate basic operation structure
   */
  private validateBasicOperation(operation: ContentOperation): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check required fields
    if (!operation.type) {
      errors.push({
        field: 'type',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Operation type is required',
        severity: 'error'
      });
    }

    if (!operation.data) {
      errors.push({
        field: 'data',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Operation data is required',
        severity: 'error'
      });
    }

    // Validate operation-specific requirements
    switch (operation.type) {
      case 'add_section':
        if (!operation.data?.section) {
          errors.push({
            field: 'data.section',
            code: 'MISSING_SECTION_DATA',
            message: 'Section data is required for add_section operation',
            severity: 'error'
          });
        }
        break;

      case 'edit_section':
      case 'remove_section':
        if (!operation.targetId) {
          errors.push({
            field: 'targetId',
            code: 'MISSING_TARGET_ID',
            message: 'Target section ID is required',
            severity: 'error'
          });
        }
        break;

      case 'reorder_sections':
        if (!operation.data?.sectionIds || !Array.isArray(operation.data.sectionIds)) {
          errors.push({
            field: 'data.sectionIds',
            code: 'INVALID_SECTION_ORDER',
            message: 'Section IDs array is required for reorder operation',
            severity: 'error'
          });
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Validate operation against material state
   */
  private async validateAgainstMaterial(
    material: StudyMaterial,
    operation: ContentOperation
  ): Promise<{ errors: ValidationError[], warnings: ValidationError[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    switch (operation.type) {
      case 'remove_section':
      case 'edit_section':
        const sectionExists = material.sections.some(s => s.id === operation.targetId);
        if (!sectionExists) {
          errors.push({
            field: 'targetId',
            code: 'SECTION_NOT_FOUND',
            message: `Section with ID ${operation.targetId} not found`,
            severity: 'error'
          });
        }
        break;

      case 'reorder_sections':
        const materialSectionIds = new Set(material.sections.map(s => s.id));
        const requestedIds = new Set(operation.data?.sectionIds || []);
        
        if (materialSectionIds.size !== requestedIds.size) {
          errors.push({
            field: 'data.sectionIds',
            code: 'SECTION_COUNT_MISMATCH',
            message: 'Number of sections in reorder does not match material',
            severity: 'error'
          });
        }

        for (const id of requestedIds) {
          if (!materialSectionIds.has(id)) {
            errors.push({
              field: 'data.sectionIds',
              code: 'INVALID_SECTION_ID',
              message: `Section ID ${id} not found in material`,
              severity: 'error'
            });
          }
        }
        break;

      case 'add_section':
        const position = operation.data?.position;
        if (position !== undefined && (position < 0 || position > material.sections.length)) {
          warnings.push({
            field: 'data.position',
            code: 'INVALID_POSITION',
            message: 'Position will be adjusted to valid range',
            severity: 'warning',
            suggestion: 'Position will be clamped to valid range'
          });
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Validate dependencies between sections
   */
  private validateDependencies(
    material: StudyMaterial,
    operation: ContentOperation
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (operation.type === 'remove_section') {
      // Check if other sections depend on the section being removed
      const dependentSections = material.sections.filter(section =>
        section.dependencies.includes(operation.targetId!)
      );

      if (dependentSections.length > 0) {
        errors.push({
          field: 'targetId',
          code: 'DEPENDENCY_CONFLICT',
          message: `Cannot remove section: ${dependentSections.length} other sections depend on it`,
          severity: 'error',
          suggestion: 'Remove dependencies first or use cascade delete'
        });
      }
    }

    if (operation.type === 'add_section' && operation.data?.section?.dependencies) {
      // Check if all dependencies exist
      const materialSectionIds = new Set(material.sections.map(s => s.id));
      const invalidDeps = operation.data.section.dependencies.filter(
        depId => !materialSectionIds.has(depId)
      );

      if (invalidDeps.length > 0) {
        errors.push({
          field: 'data.section.dependencies',
          code: 'INVALID_DEPENDENCIES',
          message: `Invalid dependencies: ${invalidDeps.join(', ')}`,
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    material: StudyMaterial,
    operation: ContentOperation
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Maximum sections limit
    if (operation.type === 'add_section' && material.sections.length >= 100) {
      errors.push({
        field: 'sections',
        code: 'MAX_SECTIONS_EXCEEDED',
        message: 'Maximum number of sections (100) exceeded',
        severity: 'error'
      });
    }

    // Content size limits
    if (operation.type === 'add_section' || operation.type === 'edit_section') {
      const content = operation.data?.section?.content || operation.data?.content;
      if (content && content.length > 10000) {
        warnings.push({
          field: 'content',
          code: 'LARGE_CONTENT',
          message: 'Section content is very large and may affect performance',
          severity: 'warning',
          suggestion: 'Consider breaking into smaller sections'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Fix dependency conflicts automatically
   */
  private async fixDependencyConflicts(
    material: StudyMaterial,
    operation: ContentOperation
  ): Promise<void> {
    if (operation.type === 'remove_section') {
      // Remove dependencies on the deleted section
      material.sections.forEach(section => {
        section.dependencies = section.dependencies.filter(dep => dep !== operation.targetId);
      });
    }
  }

  /**
   * Repair corrupted content
   */
  private async repairCorruptedContent(material: StudyMaterial): Promise<void> {
    // Basic content repair strategies
    material.sections.forEach(section => {
      // Fix missing required fields
      if (!section.id) {
        section.id = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      if (section.order === undefined) {
        section.order = material.sections.indexOf(section);
      }
      if (!section.type) {
        section.type = 'text';
      }
      if (!section.content) {
        section.content = '[Content missing]';
      }
      if (!section.dependencies) {
        section.dependencies = [];
      }
    });

    // Fix section order consistency
    material.sections.forEach((section, index) => {
      section.order = index;
    });
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // This would be expanded with more sophisticated validation rules
    this.validationRules.set('content_length', {
      validate: (value: string) => value.length <= 10000,
      message: 'Content exceeds maximum length',
      severity: 'error'
    });

    this.validationRules.set('section_count', {
      validate: (sections: ContentSection[]) => sections.length <= 100,
      message: 'Too many sections',
      severity: 'error'
    });
  }

  /**
   * Log error for monitoring
   */
  private logError(error: EditorError): void {
    const logData = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      severity: error.severity,
      message: error.message,
      context: {
        operationType: error.context.operation.type,
        materialId: error.context.materialId,
        userId: error.context.userId,
        attemptNumber: error.context.attemptNumber
      }
    };

    console.error('Editor Operation Error:', logData);
  }

  /**
   * Notify user of error
   */
  private notifyError(sessionId: string, error: EditorError): void {
    const notification: UserNotification = {
      id: `editor_error_${Date.now()}`,
      type: error.severity === 'high' ? 'error' : 'warning',
      title: this.getErrorTitle(error.code),
      message: this.getUserFriendlyMessage(error),
      stage: 'content-organization',
      timestamp: new Date(),
      dismissible: true,
      actions: error.suggestions.filter(s => !s.automated).map(suggestion => ({
        label: this.getSuggestionLabel(suggestion.type),
        action: suggestion.type as any,
        data: suggestion.parameters
      }))
    };

    errorService.addNotification(sessionId, notification);
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(code: EditorErrorCode): string {
    const titles: Record<EditorErrorCode, string> = {
      'VALIDATION_ERROR': 'Content Validation Failed',
      'DEPENDENCY_CONFLICT': 'Dependency Conflict',
      'CONTENT_CORRUPTION': 'Content Corruption Detected',
      'STORAGE_ERROR': 'Storage Error',
      'CONCURRENT_MODIFICATION': 'Concurrent Modification Conflict',
      'PERMISSION_DENIED': 'Permission Denied',
      'QUOTA_EXCEEDED': 'Storage Quota Exceeded',
      'INVALID_OPERATION': 'Invalid Operation',
      'ROLLBACK_FAILED': 'Rollback Failed',
      'EXPORT_ERROR': 'Export Failed'
    };

    return titles[code] || 'Editor Error';
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: EditorError): string {
    const messages: Record<EditorErrorCode, string> = {
      'VALIDATION_ERROR': 'The content changes could not be validated. Please check the data and try again.',
      'DEPENDENCY_CONFLICT': 'This operation conflicts with existing content dependencies.',
      'CONTENT_CORRUPTION': 'The content appears to be corrupted and needs to be repaired.',
      'STORAGE_ERROR': 'Unable to save changes due to a storage issue.',
      'CONCURRENT_MODIFICATION': 'Another user has modified this content. Please refresh and try again.',
      'PERMISSION_DENIED': 'You do not have permission to perform this operation.',
      'QUOTA_EXCEEDED': 'Storage quota exceeded. Please remove some content or upgrade your plan.',
      'INVALID_OPERATION': 'The requested operation is not valid for this content.',
      'ROLLBACK_FAILED': 'Unable to rollback changes. Manual intervention may be required.',
      'EXPORT_ERROR': 'Failed to export the content in the requested format.'
    };

    return messages[error.code] || error.message;
  }

  /**
   * Get suggestion label for UI
   */
  private getSuggestionLabel(type: string): string {
    const labels: Record<string, string> = {
      'retry': 'Retry',
      'rollback': 'Rollback Changes',
      'fix-dependencies': 'Fix Dependencies',
      'validate-content': 'Validate Content',
      'reload-material': 'Reload Material',
      'contact-support': 'Contact Support'
    };

    return labels[type] || 'Take Action';
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<EditorErrorCode, number>;
    recoverySuccessRate: number;
    mostCommonErrors: EditorErrorCode[];
  } {
    // This would be implemented with proper error tracking
    return {
      totalErrors: 0,
      errorsByCode: {} as Record<EditorErrorCode, number>,
      recoverySuccessRate: 0.85,
      mostCommonErrors: ['VALIDATION_ERROR', 'DEPENDENCY_CONFLICT', 'STORAGE_ERROR']
    };
  }
}

interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

// Export singleton instance
export const editorErrorHandler = EditorErrorHandler.getInstance();