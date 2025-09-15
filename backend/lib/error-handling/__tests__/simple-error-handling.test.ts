/**
 * Simple tests to verify error handling components are working
 */

import { imageErrorHandler } from '../../ai/image-generation-error-handler';
import { comprehensiveLogger } from '../../monitoring/comprehensive-logger';

describe('Simple Error Handling Tests', () => {
  beforeEach(() => {
    comprehensiveLogger.clearLogs();
  });

  test('should create image error handler instance', () => {
    expect(imageErrorHandler).toBeDefined();
    expect(typeof imageErrorHandler.handleGenerationFailure).toBe('function');
  });

  test('should create comprehensive logger instance', () => {
    expect(comprehensiveLogger).toBeDefined();
    expect(typeof comprehensiveLogger.log).toBe('function');
  });

  test('should log messages correctly', () => {
    comprehensiveLogger.info(
      'system',
      'Test message',
      {
        component: 'TestComponent',
        operation: 'test',
        success: true
      }
    );

    const logs = comprehensiveLogger.getLogs({ category: 'system', limit: 10 });
    const testLog = logs.find(log => log.message === 'Test message');
    
    expect(testLog).toBeDefined();
    expect(testLog?.level).toBe('info');
    expect(testLog?.category).toBe('system');
  });

  test('should handle image generation fallback', async () => {
    const mockRequest = {
      type: 'equation' as const,
      content: 'x^2 + y^2 = z^2',
      context: 'Test equation',
      style: {
        lineWeight: 'medium' as const,
        colorScheme: 'monochrome' as const,
        layout: 'horizontal' as const,
        annotations: true
      },
      dimensions: { width: 400, height: 300 }
    };

    const mockError = new Error('Test error');
    const context = {
      request: mockRequest,
      sessionId: 'test-session',
      attemptNumber: 1,
      previousErrors: [],
      fallbacksUsed: []
    };

    const result = await imageErrorHandler.handleGenerationFailure(
      mockError,
      context,
      'test-session'
    );

    expect(result).toBeDefined();
    expect(result.isFallback).toBe(true);
    expect(result.svgContent).toContain('<svg');
    expect(result.userMessage).toBeDefined();
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
      0
    );

    expect(result).toBeDefined();
    expect(result?.success).toBe(true);
    expect(result?.duration).toBeGreaterThanOrEqual(0);
  });

  test('should provide error statistics', () => {
    // Generate a test error
    comprehensiveLogger.error(
      'image-generation',
      'Test error message',
      {
        component: 'TestComponent',
        operation: 'test-operation',
        success: false
      }
    );

    const stats = comprehensiveLogger.getErrorStatistics();
    expect(stats.totalErrors).toBeGreaterThan(0);
    expect(stats.errorsByCategory['image-generation']).toBeGreaterThan(0);
  });

  test('should export logs in JSON format', () => {
    comprehensiveLogger.info(
      'system',
      'Test log for export',
      {
        component: 'TestComponent',
        operation: 'export-test',
        success: true
      }
    );

    const exportedData = comprehensiveLogger.exportLogs('json');
    expect(exportedData).toBeDefined();
    
    const parsed = JSON.parse(exportedData);
    expect(parsed.logs).toBeDefined();
    expect(Array.isArray(parsed.logs)).toBe(true);
    expect(parsed.exportedAt).toBeDefined();
  });
});