/**
 * Comprehensive tests for the enhanced error handling system
 */

import { imageErrorHandler, ImageGenerationError } from '../../ai/image-generation-error-handler';
import { editorErrorHandler, EditorError } from '../../content-modification/editor-error-handler';
import { enhancedErrorIntegration } from '../enhanced-error-integration';
import { comprehensiveLogger } from '../../monitoring/comprehensive-logger';
import { FlatLineImageRequest, FlatLineStyle, ImageDimensions } from '../../ai/simple-image-generator';
import { ContentOperation, StudyMaterial, ContentSection } from '../../content-modification/types';

describe('Comprehensive Error Handling System', () => {
  beforeEach(() => {
    // Clear any existing logs and state
    comprehensiveLogger.clearLogs();
    imageErrorHandler.clearCache();
  });

  describe('Image Generation Error Handling', () => {
    const mockImageRequest: FlatLineImageRequest = {
      type: 'equation',
      content: 'x^2 + y^2 = z^2',
      context: 'Pythagorean theorem',
      style: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: true
      } as FlatLineStyle,
      dimensions: { width: 400, height: 300 } as ImageDimensions
    };

    test('should handle timeout errors with retry fallback', async () => {
      const timeoutError = new Error('Generation timeout exceeded');
      const context = {
        request: mockImageRequest,
        sessionId: 'test-session-1',
        attemptNumber: 1,
        previousErrors: [],
        fallbacksUsed: []
      };

      const result = await imageErrorHandler.handleGenerationFailure(
        timeoutError,
        context,
        'test-session-1'
      );

      expect(result.isFallback).toBe(true);
      expect(result.fallbackType).toBeDefined();
      expect(result.svgContent).toContain('<svg');
      expect(result.userMessage).toContain('timeout');
    });

    test('should handle memory errors with simplified style fallback', async () => {
      const memoryError = new Error('Memory limit exceeded during SVG generation');
      const context = {
        request: mockImageRequest,
        sessionId: 'test-session-2',
        attemptNumber: 1,
        previousErrors: [],
        fallbacksUsed: []
      };

      const result = await imageErrorHandler.handleGenerationFailure(
        memoryError,
        context,
        'test-session-2'
      );

      expect(result.isFallback).toBe(true);
      expect(result.fallbackType).toBe('simplified-style');
      expect(result.svgContent).toContain('<svg');
      expect(result.userMessage).toContain('memory');
    });

    test('should handle content parsing errors with text-only fallback', async () => {
      const parseError = new Error('Unable to parse mathematical content');
      const context = {
        request: mockImageRequest,
        sessionId: 'test-session-3',
        attemptNumber: 2,
        previousErrors: [],
        fallbacksUsed: ['simplified-style']
      };

      const result = await imageErrorHandler.handleGenerationFailure(
        parseError,
        context,
        'test-session-3'
      );

      expect(result.isFallback).toBe(true);
      expect(result.fallbackType).toBe('text-only');
      expect(result.svgContent).toContain('monospace');
    });

    test('should create placeholder when all fallbacks fail', async () => {
      const criticalError = new Error('Critical system failure');
      const context = {
        request: mockImageRequest,
        sessionId: 'test-session-4',
        attemptNumber: 3,
        previousErrors: [],
        fallbacksUsed: ['simplified-style', 'basic-template', 'text-only']
      };

      const result = await imageErrorHandler.handleGenerationFailure(
        criticalError,
        context,
        'test-session-4'
      );

      expect(result.isFallback).toBe(true);
      expect(result.fallbackType).toBe('placeholder');
      expect(result.svgContent).toContain('Image Generation Failed');
    });
  });

  describe('Content Modification Error Handling', () => {
    const mockMaterial: StudyMaterial = {
      id: 'test-material-1',
      title: 'Test Study Material',
      sections: [
        {
          id: 'section-1',
          type: 'text',
          content: 'Test content',
          order: 0,
          editable: true,
          dependencies: []
        }
      ],
      images: [],
      metadata: {
        originalFiles: [],
        generationConfig: {},
        preservationScore: 1.0,
        totalSections: 1,
        totalFormulas: 0,
        totalExamples: 0,
        estimatedPrintPages: 1
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockOperation: ContentOperation = {
      type: 'add_section',
      data: {
        section: {
          type: 'text',
          content: 'New section content',
          editable: true,
          dependencies: []
        } as Omit<ContentSection, 'id' | 'order'>,
        position: 1
      }
    };

    test('should handle validation errors with detailed feedback', async () => {
      const validationError = new Error('Validation failed: Missing required fields');
      const context = {
        operation: mockOperation,
        materialId: mockMaterial.id,
        sessionId: 'test-session-5',
        materialState: mockMaterial,
        attemptNumber: 1,
        previousErrors: []
      };

      const result = await editorErrorHandler.handleOperationError(validationError, context);

      expect(result.success).toBe(false);
      expect(result.userMessage).toContain('validation');
      expect(result.appliedSuggestions).toBeDefined();
    });

    test('should handle dependency conflicts with automatic resolution', async () => {
      const dependencyError = new Error('Dependency conflict detected');
      const materialWithDeps = {
        ...mockMaterial,
        sections: [
          ...mockMaterial.sections,
          {
            id: 'section-2',
            type: 'text',
            content: 'Dependent section',
            order: 1,
            editable: true,
            dependencies: ['section-1']
          }
        ]
      };

      const removeOperation: ContentOperation = {
        type: 'remove_section',
        targetId: 'section-1'
      };

      const context = {
        operation: removeOperation,
        materialId: materialWithDeps.id,
        sessionId: 'test-session-6',
        materialState: materialWithDeps,
        attemptNumber: 1,
        previousErrors: []
      };

      const result = await editorErrorHandler.handleOperationError(dependencyError, context);

      expect(result.appliedSuggestions).toContain('fix-dependencies');
    });

    test('should handle storage errors with retry strategy', async () => {
      const storageError = new Error('Failed to save material to storage');
      const context = {
        operation: mockOperation,
        materialId: mockMaterial.id,
        sessionId: 'test-session-7',
        materialState: mockMaterial,
        attemptNumber: 1,
        previousErrors: []
      };

      const result = await editorErrorHandler.handleOperationError(storageError, context);

      expect(result.userMessage).toContain('storage');
      expect(result.appliedSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Error Integration', () => {
    test('should coordinate image generation error handling', async () => {
      const error = new Error('Image generation timeout');
      const context = {
        sessionId: 'integration-test-1',
        userId: 'user-1',
        operationType: 'image-generation' as const,
        stage: 'ai-processing' as const
      };

      const result = await enhancedErrorIntegration.handleImageGenerationError(
        error,
        mockImageRequest,
        context,
        1
      );

      expect(result.handled).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.userMessage).toBeDefined();
      expect(result.nextActions.length).toBeGreaterThan(0);
    });

    test('should coordinate content modification error handling', async () => {
      const error = new Error('Content modification failed');
      const context = {
        sessionId: 'integration-test-2',
        userId: 'user-1',
        operationType: 'content-modification' as const,
        stage: 'content-organization' as const
      };

      const result = await enhancedErrorIntegration.handleContentModificationError(
        error,
        mockOperation,
        mockMaterial,
        context,
        1
      );

      expect(result.handled).toBe(true);
      expect(result.userMessage).toBeDefined();
      expect(result.nextActions.length).toBeGreaterThan(0);
    });

    test('should handle validation errors with user-friendly messages', async () => {
      const validationErrors = [
        {
          field: 'content',
          code: 'REQUIRED_FIELD',
          message: 'Content is required',
          severity: 'error',
          suggestion: 'Please provide content for the section'
        },
        {
          field: 'type',
          code: 'INVALID_TYPE',
          message: 'Invalid section type',
          severity: 'warning',
          suggestion: 'Use one of: text, equation, example'
        }
      ];

      const context = {
        sessionId: 'integration-test-3',
        operationType: 'validation' as const,
        stage: 'validation' as const
      };

      const result = await enhancedErrorIntegration.handleValidationError(
        validationErrors,
        context,
        'add_section'
      );

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.userMessage).toContain('Validation failed');
      expect(result.nextActions).toContain('fix-validation-errors');
    });

    test('should handle export errors with format alternatives', async () => {
      const exportError = new Error('PDF generation failed');
      const context = {
        sessionId: 'integration-test-4',
        userId: 'user-1',
        operationType: 'export' as const,
        stage: 'completion' as const
      };

      const result = await enhancedErrorIntegration.handleExportError(
        exportError,
        'pdf',
        'material-1',
        context
      );

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.userMessage).toContain('alternative formats');
      expect(result.errorDetails?.alternativeFormats).toContain('html');
    });
  });

  describe('Comprehensive Logging', () => {
    test('should log image generation events', () => {
      comprehensiveLogger.logImageGeneration(
        'error',
        'Image generation failed',
        'generate-equation',
        false,
        5000,
        'TIMEOUT_ERROR',
        { requestType: 'equation' },
        'test-session'
      );

      const logs = comprehensiveLogger.getLogs({
        category: 'image-generation',
        level: 'error'
      });

      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Image generation failed');
      expect(logs[0].context.operation).toBe('generate-equation');
    });

    test('should log content modification events', () => {
      comprehensiveLogger.logContentModification(
        'info',
        'Section added successfully',
        'add_section',
        'material-1',
        true,
        1200,
        undefined,
        { sectionType: 'text' },
        'test-session',
        'user-1'
      );

      const logs = comprehensiveLogger.getLogs({
        category: 'content-modification',
        sessionId: 'test-session'
      });

      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Section added successfully');
      expect(logs[0].userId).toBe('user-1');
    });

    test('should track performance metrics', () => {
      const trackingId = comprehensiveLogger.startPerformanceTracking(
        'test-operation',
        { testData: 'value' }
      );

      expect(trackingId).toBeDefined();

      const result = comprehensiveLogger.endPerformanceTracking(
        trackingId,
        true,
        0,
        { additionalData: 'result' }
      );

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.duration).toBeGreaterThan(0);
    });

    test('should provide error statistics', () => {
      // Generate some test errors
      comprehensiveLogger.error(
        'image-generation',
        'Test error 1',
        { component: 'Test', operation: 'test', success: false },
        {},
        'session-1'
      );

      comprehensiveLogger.error(
        'content-modification',
        'Test error 2',
        { component: 'Test', operation: 'test', success: false },
        {},
        'session-2'
      );

      const stats = comprehensiveLogger.getErrorStatistics();

      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByCategory['image-generation']).toBe(1);
      expect(stats.errorsByCategory['content-modification']).toBe(1);
    });

    test('should log user interactions', () => {
      comprehensiveLogger.logUserInteraction(
        'user-1',
        'session-1',
        'add-section',
        'StudyMaterialEditor',
        true,
        2500,
        undefined,
        { sectionType: 'equation' }
      );

      const stats = comprehensiveLogger.getUserInteractionStatistics('user-1');

      expect(stats.totalInteractions).toBe(1);
      expect(stats.successRate).toBe(1);
      expect(stats.actionBreakdown['add-section']).toBe(1);
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from cascading failures', async () => {
      // Simulate a scenario where image generation fails, then content modification fails
      const imageError = new Error('Image generation memory error');
      const imageContext = {
        sessionId: 'cascade-test-1',
        operationType: 'image-generation' as const,
        stage: 'ai-processing' as const
      };

      const imageResult = await enhancedErrorIntegration.handleImageGenerationError(
        imageError,
        mockImageRequest,
        imageContext
      );

      expect(imageResult.handled).toBe(true);
      expect(imageResult.fallbackUsed).toBe(true);

      // Now simulate content modification error
      const contentError = new Error('Failed to save modified content');
      const contentContext = {
        sessionId: 'cascade-test-1',
        operationType: 'content-modification' as const,
        stage: 'content-organization' as const
      };

      const contentResult = await enhancedErrorIntegration.handleContentModificationError(
        contentError,
        mockOperation,
        mockMaterial,
        contentContext
      );

      expect(contentResult.handled).toBe(true);

      // Check that both errors were logged
      const logs = comprehensiveLogger.getLogs({
        sessionId: 'cascade-test-1'
      });

      expect(logs.length).toBeGreaterThan(2);
    });

    test('should provide comprehensive system health assessment', () => {
      // Generate various types of errors to test health calculation
      for (let i = 0; i < 10; i++) {
        comprehensiveLogger.error(
          'image-generation',
          `Test error ${i}`,
          { component: 'Test', operation: 'test', success: false }
        );
      }

      const stats = enhancedErrorIntegration.getComprehensiveErrorStatistics();

      expect(stats.overall).toBeDefined();
      expect(stats.overall.systemHealth).toBeDefined();
      expect(stats.overall.systemHealth.score).toBeGreaterThanOrEqual(0);
      expect(stats.overall.systemHealth.score).toBeLessThanOrEqual(100);
      expect(['healthy', 'warning', 'critical']).toContain(stats.overall.systemHealth.status);
    });
  });

  describe('Configuration and Customization', () => {
    test('should allow error handling configuration', () => {
      const config = {
        enableAutoRecovery: false,
        enableFallbacks: true,
        maxRetryAttempts: 5,
        fallbackTimeout: 60000
      };

      enhancedErrorIntegration.configure(config);

      // Configuration should be applied (we can't directly test private config,
      // but we can verify it doesn't throw and logs the change)
      const logs = comprehensiveLogger.getLogs({
        category: 'system',
        limit: 1
      });

      expect(logs[0].message).toContain('configuration updated');
    });

    test('should allow logger configuration', () => {
      comprehensiveLogger.configure({
        logLevel: 'warn',
        enabledCategories: ['image-generation', 'content-modification'],
        maxLogEntries: 5000
      });

      // Test that debug messages are now filtered out
      comprehensiveLogger.debug(
        'image-generation',
        'This should not appear',
        { component: 'Test', operation: 'test' }
      );

      const logs = comprehensiveLogger.getLogs({
        level: 'debug'
      });

      expect(logs.length).toBe(0);
    });
  });

  describe('Export and Monitoring', () => {
    test('should export logs in JSON format', () => {
      comprehensiveLogger.info(
        'system',
        'Test log for export',
        { component: 'Test', operation: 'export-test' }
      );

      const exportedData = comprehensiveLogger.exportLogs('json');
      const parsed = JSON.parse(exportedData);

      expect(parsed.logs).toBeDefined();
      expect(parsed.performanceMetrics).toBeDefined();
      expect(parsed.userInteractions).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });

    test('should export logs in CSV format', () => {
      comprehensiveLogger.info(
        'system',
        'Test log for CSV export',
        { component: 'Test', operation: 'csv-export-test' }
      );

      const csvData = comprehensiveLogger.exportLogs('csv');
      const lines = csvData.split('\n');

      expect(lines[0]).toContain('timestamp,level,category');
      expect(lines.length).toBeGreaterThan(1);
    });
  });
});