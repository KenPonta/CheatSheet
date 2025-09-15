// Comprehensive error handling system for compact study generator

import { SourceLocation, Formula, WorkedExample, CrossReference } from './types';

// Enhanced error classes with recovery strategies
export class MathContentError extends Error {
  public code: 'FORMULA_EXTRACTION_FAILED' | 'EXAMPLE_PARSING_FAILED' | 'LATEX_CONVERSION_FAILED' | 'VALIDATION_FAILED' | 'OCR_FALLBACK_FAILED';
  public sourceLocation?: SourceLocation;
  public recoverable: boolean;
  public originalContent?: string;
  public recoveryStrategy?: RecoveryStrategy;

  constructor(
    message: string,
    code: 'FORMULA_EXTRACTION_FAILED' | 'EXAMPLE_PARSING_FAILED' | 'LATEX_CONVERSION_FAILED' | 'VALIDATION_FAILED' | 'OCR_FALLBACK_FAILED',
    sourceLocation?: SourceLocation,
    recoverable: boolean = true,
    originalContent?: string
  ) {
    super(message);
    this.name = 'MathContentError';
    this.code = code;
    this.sourceLocation = sourceLocation;
    this.recoverable = recoverable;
    this.originalContent = originalContent;
    this.recoveryStrategy = this.determineRecoveryStrategy();
  }

  private determineRecoveryStrategy(): RecoveryStrategy {
    switch (this.code) {
      case 'FORMULA_EXTRACTION_FAILED':
        return {
          type: 'ocr_fallback',
          description: 'Attempt OCR extraction and preserve as code block',
          priority: 'high'
        };
      case 'LATEX_CONVERSION_FAILED':
        return {
          type: 'preserve_original',
          description: 'Keep original text in code block with LaTeX markers',
          priority: 'medium'
        };
      case 'EXAMPLE_PARSING_FAILED':
        return {
          type: 'partial_extraction',
          description: 'Extract available parts and mark as incomplete',
          priority: 'medium'
        };
      case 'VALIDATION_FAILED':
        return {
          type: 'warning_continue',
          description: 'Generate warning and continue with available content',
          priority: 'low'
        };
      case 'OCR_FALLBACK_FAILED':
        return {
          type: 'skip_with_warning',
          description: 'Skip content and generate detailed warning',
          priority: 'high'
        };
      default:
        return {
          type: 'warning_continue',
          description: 'Generate warning and continue processing',
          priority: 'low'
        };
    }
  }
}

export class LayoutError extends Error {
  public code: 'COLUMN_OVERFLOW' | 'CONTENT_TOO_LARGE' | 'INVALID_CONFIG' | 'CALCULATION_FAILED' | 'SPACING_ADJUSTMENT_FAILED';
  public section?: string;
  public contentType?: string;
  public suggestion?: string;
  public autoFixAvailable: boolean;
  public recoveryStrategy?: RecoveryStrategy;

  constructor(
    message: string,
    code: 'COLUMN_OVERFLOW' | 'CONTENT_TOO_LARGE' | 'INVALID_CONFIG' | 'CALCULATION_FAILED' | 'SPACING_ADJUSTMENT_FAILED',
    section?: string,
    contentType?: string,
    suggestion?: string
  ) {
    super(message);
    this.name = 'LayoutError';
    this.code = code;
    this.section = section;
    this.contentType = contentType;
    this.suggestion = suggestion;
    this.autoFixAvailable = this.canAutoFix();
    this.recoveryStrategy = this.determineRecoveryStrategy();
  }

  private canAutoFix(): boolean {
    return ['COLUMN_OVERFLOW', 'SPACING_ADJUSTMENT_FAILED'].includes(this.code);
  }

  private determineRecoveryStrategy(): RecoveryStrategy {
    switch (this.code) {
      case 'COLUMN_OVERFLOW':
        return {
          type: 'auto_adjust_spacing',
          description: 'Automatically reduce spacing and font size within limits',
          priority: 'high'
        };
      case 'CONTENT_TOO_LARGE':
        return {
          type: 'content_reduction',
          description: 'Suggest content reduction or format change',
          priority: 'medium'
        };
      case 'SPACING_ADJUSTMENT_FAILED':
        return {
          type: 'fallback_layout',
          description: 'Use single-column layout as fallback',
          priority: 'high'
        };
      case 'INVALID_CONFIG':
        return {
          type: 'use_defaults',
          description: 'Apply default configuration values',
          priority: 'medium'
        };
      case 'CALCULATION_FAILED':
        return {
          type: 'manual_layout',
          description: 'Use predefined layout calculations',
          priority: 'low'
        };
      default:
        return {
          type: 'warning_continue',
          description: 'Generate warning and continue with best effort',
          priority: 'low'
        };
    }
  }
}

export class CrossReferenceError extends Error {
  public code: 'REFERENCE_NOT_FOUND' | 'CIRCULAR_REFERENCE' | 'INVALID_REFERENCE_FORMAT' | 'LINK_GENERATION_FAILED';
  public referenceId: string;
  public sourceLocation?: SourceLocation;
  public targetId?: string;
  public recoveryStrategy?: RecoveryStrategy;

  constructor(
    message: string,
    code: 'REFERENCE_NOT_FOUND' | 'CIRCULAR_REFERENCE' | 'INVALID_REFERENCE_FORMAT' | 'LINK_GENERATION_FAILED',
    referenceId: string,
    sourceLocation?: SourceLocation,
    targetId?: string
  ) {
    super(message);
    this.name = 'CrossReferenceError';
    this.code = code;
    this.referenceId = referenceId;
    this.sourceLocation = sourceLocation;
    this.targetId = targetId;
    this.recoveryStrategy = this.determineRecoveryStrategy();
  }

  private determineRecoveryStrategy(): RecoveryStrategy {
    switch (this.code) {
      case 'REFERENCE_NOT_FOUND':
        return {
          type: 'plain_text_fallback',
          description: 'Convert to plain text reference with warning',
          priority: 'medium'
        };
      case 'CIRCULAR_REFERENCE':
        return {
          type: 'break_cycle',
          description: 'Remove one reference to break the cycle',
          priority: 'high'
        };
      case 'INVALID_REFERENCE_FORMAT':
        return {
          type: 'format_correction',
          description: 'Attempt to correct reference format automatically',
          priority: 'medium'
        };
      case 'LINK_GENERATION_FAILED':
        return {
          type: 'plain_text_fallback',
          description: 'Use plain text instead of hyperlink',
          priority: 'low'
        };
      default:
        return {
          type: 'warning_continue',
          description: 'Generate warning and continue processing',
          priority: 'low'
        };
    }
  }
}

// Recovery strategy interface
export interface RecoveryStrategy {
  type: 'ocr_fallback' | 'preserve_original' | 'partial_extraction' | 'warning_continue' | 
        'skip_with_warning' | 'auto_adjust_spacing' | 'content_reduction' | 'fallback_layout' |
        'use_defaults' | 'manual_layout' | 'plain_text_fallback' | 'break_cycle' | 'format_correction';
  description: string;
  priority: 'low' | 'medium' | 'high';
}

// Warning system
export interface ProcessingWarning {
  id: string;
  type: 'math_content' | 'layout' | 'cross_reference' | 'general';
  severity: 'info' | 'warning' | 'error';
  message: string;
  sourceLocation?: SourceLocation;
  suggestion?: string;
  recoveryAction?: string;
  timestamp: Date;
}

// Error recovery results
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  originalError: Error;
  recoveredContent?: any;
  warnings: ProcessingWarning[];
  fallbackUsed: boolean;
}

// Comprehensive error handler class
export class CompactStudyErrorHandler {
  private warnings: ProcessingWarning[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private maxRecoveryAttempts = 3;

  // Formula extraction fallback mechanisms
  async handleFormulaExtractionError(
    error: MathContentError,
    originalText: string,
    sourceLocation?: SourceLocation
  ): Promise<RecoveryResult> {
    const warningId = `formula_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (error.code === 'FORMULA_EXTRACTION_FAILED' && error.recoveryStrategy?.type === 'ocr_fallback') {
        // Attempt OCR fallback
        const ocrResult = await this.attemptOCRFallback(originalText, sourceLocation);
        
        if (ocrResult.success) {
          this.addWarning({
            id: warningId,
            type: 'math_content',
            severity: 'warning',
            message: `Formula extraction failed, used OCR fallback: ${error.message}`,
            sourceLocation,
            suggestion: 'Review OCR result for accuracy',
            recoveryAction: 'OCR fallback applied',
            timestamp: new Date()
          });

          return {
            success: true,
            strategy: error.recoveryStrategy,
            originalError: error,
            recoveredContent: ocrResult.content,
            warnings: [this.warnings[this.warnings.length - 1]],
            fallbackUsed: true
          };
        }
      }

      // If OCR fails or not applicable, preserve as code block
      const codeBlockContent = this.preserveAsCodeBlock(originalText, 'formula');
      
      this.addWarning({
        id: warningId,
        type: 'math_content',
        severity: 'error',
        message: `Formula extraction failed, preserved as code block: ${error.message}`,
        sourceLocation,
        suggestion: 'Manual review required for mathematical content',
        recoveryAction: 'Preserved as code block',
        timestamp: new Date()
      });

      return {
        success: true,
        strategy: { type: 'preserve_original', description: 'Preserved as code block', priority: 'medium' },
        originalError: error,
        recoveredContent: codeBlockContent,
        warnings: [this.warnings[this.warnings.length - 1]],
        fallbackUsed: true
      };

    } catch (recoveryError) {
      this.addWarning({
        id: warningId,
        type: 'math_content',
        severity: 'error',
        message: `Formula recovery failed: ${recoveryError.message}`,
        sourceLocation,
        suggestion: 'Content may be missing from output',
        recoveryAction: 'Recovery failed',
        timestamp: new Date()
      });

      return {
        success: false,
        strategy: { type: 'skip_with_warning', description: 'Recovery failed', priority: 'high' },
        originalError: error,
        warnings: [this.warnings[this.warnings.length - 1]],
        fallbackUsed: false
      };
    }
  }

  // Layout overflow detection and automatic spacing adjustment
  async handleLayoutOverflow(
    error: LayoutError,
    currentConfig: any,
    contentBlocks: any[]
  ): Promise<RecoveryResult> {
    const warningId = `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (error.code === 'COLUMN_OVERFLOW' && error.autoFixAvailable) {
        // Attempt automatic spacing adjustment
        const adjustedConfig = await this.adjustSpacingAutomatically(currentConfig, contentBlocks);
        
        if (adjustedConfig.success) {
          this.addWarning({
            id: warningId,
            type: 'layout',
            severity: 'info',
            message: `Layout overflow detected, automatically adjusted spacing`,
            suggestion: 'Review layout for readability',
            recoveryAction: `Reduced spacing: ${adjustedConfig.adjustments.join(', ')}`,
            timestamp: new Date()
          });

          return {
            success: true,
            strategy: error.recoveryStrategy!,
            originalError: error,
            recoveredContent: adjustedConfig.config,
            warnings: [this.warnings[this.warnings.length - 1]],
            fallbackUsed: false
          };
        }
      }

      // Fallback to single column layout
      const fallbackConfig = this.createFallbackLayout(currentConfig);
      
      this.addWarning({
        id: warningId,
        type: 'layout',
        severity: 'warning',
        message: `Layout overflow could not be auto-fixed, using single-column fallback`,
        suggestion: 'Consider reducing content or using larger paper size',
        recoveryAction: 'Applied single-column layout',
        timestamp: new Date()
      });

      return {
        success: true,
        strategy: { type: 'fallback_layout', description: 'Single-column fallback', priority: 'high' },
        originalError: error,
        recoveredContent: fallbackConfig,
        warnings: [this.warnings[this.warnings.length - 1]],
        fallbackUsed: true
      };

    } catch (recoveryError) {
      this.addWarning({
        id: warningId,
        type: 'layout',
        severity: 'error',
        message: `Layout recovery failed: ${recoveryError.message}`,
        suggestion: 'Manual layout adjustment required',
        recoveryAction: 'Recovery failed',
        timestamp: new Date()
      });

      return {
        success: false,
        strategy: { type: 'manual_layout', description: 'Manual intervention required', priority: 'low' },
        originalError: error,
        warnings: [this.warnings[this.warnings.length - 1]],
        fallbackUsed: false
      };
    }
  }

  // Cross-reference failure handling with warning generation
  async handleCrossReferenceError(
    error: CrossReferenceError,
    crossReference: CrossReference,
    availableReferences: Map<string, any>
  ): Promise<RecoveryResult> {
    const warningId = `crossref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (error.code === 'REFERENCE_NOT_FOUND') {
        // Attempt to find similar references
        const similarRef = this.findSimilarReference(crossReference.targetId, availableReferences);
        
        if (similarRef) {
          this.addWarning({
            id: warningId,
            type: 'cross_reference',
            severity: 'warning',
            message: `Reference "${crossReference.targetId}" not found, using similar reference "${similarRef.id}"`,
            sourceLocation: error.sourceLocation,
            suggestion: 'Verify reference accuracy',
            recoveryAction: `Substituted with ${similarRef.id}`,
            timestamp: new Date()
          });

          const correctedReference = { ...crossReference, targetId: similarRef.id };
          return {
            success: true,
            strategy: error.recoveryStrategy!,
            originalError: error,
            recoveredContent: correctedReference,
            warnings: [this.warnings[this.warnings.length - 1]],
            fallbackUsed: false
          };
        }
      }

      // Convert to plain text reference
      const plainTextRef = this.convertToPlainText(crossReference);
      
      this.addWarning({
        id: warningId,
        type: 'cross_reference',
        severity: 'warning',
        message: `Cross-reference "${crossReference.targetId}" could not be resolved, converted to plain text`,
        sourceLocation: error.sourceLocation,
        suggestion: 'Check reference targets and formatting',
        recoveryAction: 'Converted to plain text',
        timestamp: new Date()
      });

      return {
        success: true,
        strategy: { type: 'plain_text_fallback', description: 'Plain text conversion', priority: 'medium' },
        originalError: error,
        recoveredContent: plainTextRef,
        warnings: [this.warnings[this.warnings.length - 1]],
        fallbackUsed: true
      };

    } catch (recoveryError) {
      this.addWarning({
        id: warningId,
        type: 'cross_reference',
        severity: 'error',
        message: `Cross-reference recovery failed: ${recoveryError.message}`,
        sourceLocation: error.sourceLocation,
        suggestion: 'Reference will be omitted from output',
        recoveryAction: 'Recovery failed',
        timestamp: new Date()
      });

      return {
        success: false,
        strategy: { type: 'skip_with_warning', description: 'Reference omitted', priority: 'high' },
        originalError: error,
        warnings: [this.warnings[this.warnings.length - 1]],
        fallbackUsed: false
      };
    }
  }

  // OCR fallback implementation
  private async attemptOCRFallback(text: string, sourceLocation?: SourceLocation): Promise<{ success: boolean; content?: any }> {
    try {
      // Simulate OCR processing - in real implementation, this would use actual OCR
      const ocrText = text.replace(/[^\w\s\+\-\*\/\=\(\)\[\]\{\}]/g, '');
      
      if (ocrText.length > 0) {
        return {
          success: true,
          content: {
            type: 'code_block',
            content: ocrText,
            language: 'text',
            isOCRFallback: true,
            originalLocation: sourceLocation
          }
        };
      }
      
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  // Preserve content as code block
  private preserveAsCodeBlock(content: string, type: 'formula' | 'example' | 'general'): any {
    return {
      type: 'code_block',
      content: content.trim(),
      language: type === 'formula' ? 'latex' : 'text',
      isPreserved: true,
      originalType: type,
      warning: `Original ${type} could not be processed, preserved as code block`
    };
  }

  // Automatic spacing adjustment
  private async adjustSpacingAutomatically(config: any, contentBlocks: any[]): Promise<{ success: boolean; config?: any; adjustments?: string[] }> {
    const adjustments: string[] = [];
    const newConfig = { ...config };

    try {
      // Reduce paragraph spacing if above minimum
      if (newConfig.spacing?.paragraphSpacing > 0.2) {
        newConfig.spacing.paragraphSpacing = Math.max(0.2, newConfig.spacing.paragraphSpacing * 0.8);
        adjustments.push('paragraph spacing reduced');
      }

      // Reduce list spacing if above minimum
      if (newConfig.spacing?.listSpacing > 0.15) {
        newConfig.spacing.listSpacing = Math.max(0.15, newConfig.spacing.listSpacing * 0.8);
        adjustments.push('list spacing reduced');
      }

      // Reduce line height if above minimum
      if (newConfig.typography?.lineHeight > 1.15) {
        newConfig.typography.lineHeight = Math.max(1.15, newConfig.typography.lineHeight * 0.95);
        adjustments.push('line height reduced');
      }

      // Reduce font size if above minimum
      if (newConfig.typography?.fontSize > 10) {
        newConfig.typography.fontSize = Math.max(10, newConfig.typography.fontSize - 0.5);
        adjustments.push('font size reduced');
      }

      return {
        success: adjustments.length > 0,
        config: newConfig,
        adjustments
      };
    } catch (error) {
      return { success: false };
    }
  }

  // Create fallback single-column layout
  private createFallbackLayout(config: any): any {
    return {
      ...config,
      columns: 1,
      spacing: {
        ...config.spacing,
        paragraphSpacing: Math.min(config.spacing?.paragraphSpacing || 0.35, 0.5),
        listSpacing: Math.min(config.spacing?.listSpacing || 0.25, 0.35)
      },
      typography: {
        ...config.typography,
        lineHeight: Math.max(config.typography?.lineHeight || 1.2, 1.3)
      }
    };
  }

  // Find similar reference
  private findSimilarReference(targetId: string, availableReferences: Map<string, any>): any | null {
    const target = targetId.toLowerCase();
    
    for (const [id, ref] of availableReferences) {
      const refId = id.toLowerCase();
      
      // Check for partial matches or similar patterns
      if (refId.includes(target) || target.includes(refId)) {
        return { id, ...ref };
      }
      
      // Check for similar numbering patterns (e.g., "3.2" vs "3.1")
      const targetMatch = target.match(/(\d+)\.(\d+)/);
      const refMatch = refId.match(/(\d+)\.(\d+)/);
      
      if (targetMatch && refMatch && targetMatch[1] === refMatch[1]) {
        return { id, ...ref };
      }
    }
    
    return null;
  }

  // Convert cross-reference to plain text
  private convertToPlainText(crossReference: CrossReference): any {
    return {
      type: 'plain_text',
      content: crossReference.displayText || `[${crossReference.type} ${crossReference.targetId}]`,
      originalReference: crossReference,
      isPlainTextFallback: true
    };
  }

  // Add warning to collection
  private addWarning(warning: ProcessingWarning): void {
    this.warnings.push(warning);
  }

  // Get all warnings
  getWarnings(): ProcessingWarning[] {
    return [...this.warnings];
  }

  // Get warnings by type
  getWarningsByType(type: ProcessingWarning['type']): ProcessingWarning[] {
    return this.warnings.filter(w => w.type === type);
  }

  // Get warnings by severity
  getWarningsBySeverity(severity: ProcessingWarning['severity']): ProcessingWarning[] {
    return this.warnings.filter(w => w.severity === severity);
  }

  // Clear warnings
  clearWarnings(): void {
    this.warnings = [];
  }

  // Generate error summary report
  generateErrorSummary(): ErrorSummary {
    const byType = this.warnings.reduce((acc, warning) => {
      acc[warning.type] = (acc[warning.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = this.warnings.reduce((acc, warning) => {
      acc[warning.severity] = (acc[warning.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalWarnings: this.warnings.length,
      byType,
      bySeverity,
      hasErrors: this.warnings.some(w => w.severity === 'error'),
      hasRecoveryFailures: this.warnings.some(w => w.recoveryAction === 'Recovery failed'),
      recommendations: this.generateRecommendations()
    };
  }

  // Generate recommendations based on warnings
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const warnings = this.warnings;

    if (warnings.filter(w => w.type === 'math_content').length > 5) {
      recommendations.push('Consider improving source document quality for better mathematical content extraction');
    }

    if (warnings.filter(w => w.type === 'layout' && w.severity === 'error').length > 0) {
      recommendations.push('Consider using single-column layout or reducing content density');
    }

    if (warnings.filter(w => w.type === 'cross_reference').length > 3) {
      recommendations.push('Review cross-reference formatting and target availability');
    }

    if (warnings.filter(w => w.recoveryAction?.includes('OCR')).length > 0) {
      recommendations.push('Review OCR results for accuracy and consider manual correction');
    }

    return recommendations;
  }
}

// Error summary interface
export interface ErrorSummary {
  totalWarnings: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  hasErrors: boolean;
  hasRecoveryFailures: boolean;
  recommendations: string[];
}

// Export singleton instance
export const errorHandler = new CompactStudyErrorHandler();