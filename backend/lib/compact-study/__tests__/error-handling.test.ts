// Tests for comprehensive error handling system

import {
  MathContentError,
  LayoutError,
  CrossReferenceError,
  CompactStudyErrorHandler,
  ProcessingWarning,
  RecoveryResult
} from '../error-handling';
import { SourceLocation, CrossReference } from '../types';

describe('MathContentError', () => {
  it('should create error with recovery strategy', () => {
    const sourceLocation: SourceLocation = {
      fileId: 'test.pdf',
      page: 1,
      section: 'probability'
    };

    const error = new MathContentError(
      'Formula extraction failed',
      'FORMULA_EXTRACTION_FAILED',
      sourceLocation,
      true,
      'E[X] = ∑ x P(X = x)'
    );

    expect(error.name).toBe('MathContentError');
    expect(error.code).toBe('FORMULA_EXTRACTION_FAILED');
    expect(error.recoverable).toBe(true);
    expect(error.recoveryStrategy).toEqual({
      type: 'ocr_fallback',
      description: 'Attempt OCR extraction and preserve as code block',
      priority: 'high'
    });
  });

  it('should determine correct recovery strategy for different error codes', () => {
    const latexError = new MathContentError('LaTeX conversion failed', 'LATEX_CONVERSION_FAILED');
    expect(latexError.recoveryStrategy?.type).toBe('preserve_original');

    const validationError = new MathContentError('Validation failed', 'VALIDATION_FAILED');
    expect(validationError.recoveryStrategy?.type).toBe('warning_continue');

    const ocrError = new MathContentError('OCR fallback failed', 'OCR_FALLBACK_FAILED');
    expect(ocrError.recoveryStrategy?.type).toBe('skip_with_warning');
  });
});

describe('LayoutError', () => {
  it('should create error with auto-fix capability', () => {
    const error = new LayoutError(
      'Content overflows column',
      'COLUMN_OVERFLOW',
      'section-1.1',
      'formula',
      'Reduce font size or spacing'
    );

    expect(error.name).toBe('LayoutError');
    expect(error.autoFixAvailable).toBe(true);
    expect(error.recoveryStrategy?.type).toBe('auto_adjust_spacing');
  });

  it('should determine auto-fix availability correctly', () => {
    const overflowError = new LayoutError('Overflow', 'COLUMN_OVERFLOW');
    expect(overflowError.autoFixAvailable).toBe(true);

    const configError = new LayoutError('Invalid config', 'INVALID_CONFIG');
    expect(configError.autoFixAvailable).toBe(false);
  });
});

describe('CrossReferenceError', () => {
  it('should create error with reference details', () => {
    const sourceLocation: SourceLocation = {
      fileId: 'test.pdf',
      page: 2,
      section: 'relations'
    };

    const error = new CrossReferenceError(
      'Reference not found',
      'REFERENCE_NOT_FOUND',
      'ref-123',
      sourceLocation,
      'example-3.2'
    );

    expect(error.name).toBe('CrossReferenceError');
    expect(error.referenceId).toBe('ref-123');
    expect(error.targetId).toBe('example-3.2');
    expect(error.recoveryStrategy?.type).toBe('plain_text_fallback');
  });
});

describe('CompactStudyErrorHandler', () => {
  let errorHandler: CompactStudyErrorHandler;

  beforeEach(() => {
    errorHandler = new CompactStudyErrorHandler();
  });

  describe('handleFormulaExtractionError', () => {
    it('should handle formula extraction error with OCR fallback', async () => {
      const error = new MathContentError(
        'Formula extraction failed',
        'FORMULA_EXTRACTION_FAILED'
      );

      const sourceLocation: SourceLocation = {
        fileId: 'test.pdf',
        page: 1
      };

      const result = await errorHandler.handleFormulaExtractionError(
        error,
        'E[X] = ∑ x P(X = x)',
        sourceLocation
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.recoveredContent).toEqual({
        type: 'code_block',
        content: 'E[X] =  x P(X = x)',
        language: 'text',
        isOCRFallback: true,
        originalLocation: sourceLocation
      });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('math_content');
    });

    it('should preserve as code block when OCR fails', async () => {
      const error = new MathContentError(
        'Formula extraction failed',
        'FORMULA_EXTRACTION_FAILED'
      );

      const result = await errorHandler.handleFormulaExtractionError(
        error,
        '', // Empty text to simulate OCR failure
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.recoveredContent).toEqual({
        type: 'code_block',
        content: '',
        language: 'latex',
        isPreserved: true,
        originalType: 'formula',
        warning: 'Original formula could not be processed, preserved as code block'
      });
    });
  });

  describe('handleLayoutOverflow', () => {
    it('should automatically adjust spacing for overflow', async () => {
      const error = new LayoutError('Column overflow', 'COLUMN_OVERFLOW');
      
      const currentConfig = {
        spacing: {
          paragraphSpacing: 0.35,
          listSpacing: 0.25
        },
        typography: {
          lineHeight: 1.25,
          fontSize: 11
        }
      };

      const result = await errorHandler.handleLayoutOverflow(
        error,
        currentConfig,
        []
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.recoveredContent.spacing.paragraphSpacing).toBeLessThan(0.35);
      expect(result.recoveredContent.typography.lineHeight).toBeLessThan(1.25);
      expect(result.warnings[0].severity).toBe('info');
    });

    it('should use single-column fallback when auto-adjustment fails', async () => {
      const error = new LayoutError('Column overflow', 'COLUMN_OVERFLOW');
      
      const currentConfig = {
        columns: 2,
        spacing: {
          paragraphSpacing: 0.2, // Already at minimum
          listSpacing: 0.15 // Already at minimum
        },
        typography: {
          lineHeight: 1.15, // Already at minimum
          fontSize: 10 // Already at minimum
        }
      };

      const result = await errorHandler.handleLayoutOverflow(
        error,
        currentConfig,
        []
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.recoveredContent.columns).toBe(1);
      expect(result.warnings[0].severity).toBe('warning');
    });
  });

  describe('handleCrossReferenceError', () => {
    it('should find similar reference when exact match not found', async () => {
      const error = new CrossReferenceError(
        'Reference not found',
        'REFERENCE_NOT_FOUND',
        'ref-123'
      );

      const crossReference: CrossReference = {
        id: 'ref-123',
        type: 'example',
        sourceId: 'source-1',
        targetId: 'example-3.2',
        displayText: 'see Ex. 3.2'
      };

      const availableReferences = new Map([
        ['example-3.1', { type: 'example', title: 'Similar Example' }],
        ['example-3.3', { type: 'example', title: 'Another Example' }]
      ]);

      const result = await errorHandler.handleCrossReferenceError(
        error,
        crossReference,
        availableReferences
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.recoveredContent.targetId).toBe('example-3.1'); // Similar reference found
    });

    it('should convert to plain text when no similar reference found', async () => {
      const error = new CrossReferenceError(
        'Reference not found',
        'REFERENCE_NOT_FOUND',
        'ref-123'
      );

      const crossReference: CrossReference = {
        id: 'ref-123',
        type: 'example',
        sourceId: 'source-1',
        targetId: 'example-5.5',
        displayText: 'see Ex. 5.5'
      };

      const availableReferences = new Map([
        ['example-1.1', { type: 'example', title: 'Different Example' }]
      ]);

      const result = await errorHandler.handleCrossReferenceError(
        error,
        crossReference,
        availableReferences
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.recoveredContent).toEqual({
        type: 'plain_text',
        content: 'see Ex. 5.5',
        originalReference: crossReference,
        isPlainTextFallback: true
      });
    });
  });

  describe('warning management', () => {
    it('should collect and categorize warnings', () => {
      const warning1: ProcessingWarning = {
        id: 'w1',
        type: 'math_content',
        severity: 'error',
        message: 'Formula failed',
        timestamp: new Date()
      };

      const warning2: ProcessingWarning = {
        id: 'w2',
        type: 'layout',
        severity: 'warning',
        message: 'Layout adjusted',
        timestamp: new Date()
      };

      errorHandler['addWarning'](warning1);
      errorHandler['addWarning'](warning2);

      expect(errorHandler.getWarnings()).toHaveLength(2);
      expect(errorHandler.getWarningsByType('math_content')).toHaveLength(1);
      expect(errorHandler.getWarningsBySeverity('error')).toHaveLength(1);
    });

    it('should generate comprehensive error summary', () => {
      // Add multiple warnings of different types and severities
      const warnings: ProcessingWarning[] = [
        { id: '1', type: 'math_content', severity: 'error', message: 'Error 1', timestamp: new Date() },
        { id: '2', type: 'math_content', severity: 'warning', message: 'Warning 1', timestamp: new Date() },
        { id: '3', type: 'layout', severity: 'error', message: 'Error 2', timestamp: new Date() },
        { id: '4', type: 'cross_reference', severity: 'info', message: 'Info 1', timestamp: new Date() }
      ];

      warnings.forEach(w => errorHandler['addWarning'](w));

      const summary = errorHandler.generateErrorSummary();

      expect(summary.totalWarnings).toBe(4);
      expect(summary.byType.math_content).toBe(2);
      expect(summary.byType.layout).toBe(1);
      expect(summary.byType.cross_reference).toBe(1);
      expect(summary.bySeverity.error).toBe(2);
      expect(summary.bySeverity.warning).toBe(1);
      expect(summary.bySeverity.info).toBe(1);
      expect(summary.hasErrors).toBe(true);
    });

    it('should generate appropriate recommendations', () => {
      // Add many math content warnings to trigger recommendation
      for (let i = 0; i < 6; i++) {
        errorHandler['addWarning']({
          id: `math-${i}`,
          type: 'math_content',
          severity: 'warning',
          message: `Math warning ${i}`,
          timestamp: new Date()
        });
      }

      const summary = errorHandler.generateErrorSummary();
      expect(summary.recommendations).toContain(
        'Consider improving source document quality for better mathematical content extraction'
      );
    });
  });

  describe('recovery strategies', () => {
    it('should preserve original content as code block', () => {
      const result = errorHandler['preserveAsCodeBlock']('E[X] = μ', 'formula');
      
      expect(result).toEqual({
        type: 'code_block',
        content: 'E[X] = μ',
        language: 'latex',
        isPreserved: true,
        originalType: 'formula',
        warning: 'Original formula could not be processed, preserved as code block'
      });
    });

    it('should create fallback single-column layout', () => {
      const config = {
        columns: 2,
        spacing: {
          paragraphSpacing: 0.35,
          listSpacing: 0.25
        },
        typography: {
          lineHeight: 1.2,
          fontSize: 11
        }
      };

      const fallback = errorHandler['createFallbackLayout'](config);
      
      expect(fallback.columns).toBe(1);
      expect(fallback.spacing.paragraphSpacing).toBeLessThanOrEqual(0.5);
      expect(fallback.typography.lineHeight).toBeGreaterThanOrEqual(1.3);
    });

    it('should find similar references correctly', () => {
      const availableRefs = new Map([
        ['example-3.1', { type: 'example' }],
        ['theorem-2.5', { type: 'theorem' }],
        ['formula-1.2', { type: 'formula' }]
      ]);

      // Test partial match
      const similar1 = errorHandler['findSimilarReference']('example-3.2', availableRefs);
      expect(similar1?.id).toBe('example-3.1');

      // Test section match
      const similar2 = errorHandler['findSimilarReference']('theorem-2.1', availableRefs);
      expect(similar2?.id).toBe('theorem-2.5');

      // Test no match
      const similar3 = errorHandler['findSimilarReference']('definition-5.1', availableRefs);
      expect(similar3).toBeNull();
    });
  });
});