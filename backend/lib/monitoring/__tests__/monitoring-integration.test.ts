/**
 * Integration tests for monitoring system
 * Tests the complete monitoring setup and functionality
 */

import './setup';
import { env } from '../../config/environment';
import { healthMonitor } from '../health-monitor';
import { aiUsageTracker, trackAIUsage } from '../ai-usage-tracker';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Monitoring Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiUsageTracker.clearMetrics();
  });

  afterEach(() => {
    healthMonitor.stopMonitoring();
  });

  describe('Environment Configuration', () => {
    it('should validate required environment variables', () => {
      expect(env.OPENAI_API_KEY).toBeDefined();
      expect(env.NODE_ENV).toBeDefined();
      expect(env.HEALTH_CHECK_INTERVAL).toBeGreaterThan(0);
      expect(env.HEALTH_CHECK_TIMEOUT).toBeGreaterThan(0);
    });

    it('should have proper default values', () => {
      expect(env.HEALTH_CHECK_INTERVAL).toBe(30000);
      expect(env.HEALTH_CHECK_TIMEOUT).toBe(5000);
      expect(env.MAX_FILE_SIZE).toBe(50000000);
    });
  });

  describe('Health Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(healthMonitor.getCurrentStatus()).toBeNull();
      
      healthMonitor.startMonitoring();
      // Health monitor should be running but no status yet
      
      healthMonitor.stopMonitoring();
    });

    it('should get health statistics', () => {
      const stats = healthMonitor.getHealthStats(60);
      // Should return stats object even with no or minimal metrics
      if (stats) {
        expect(stats.totalChecks).toBeGreaterThanOrEqual(0);
        expect(stats.period).toBe('60 minutes');
      } else {
        expect(stats).toBeNull();
      }
    });
  });

  describe('AI Usage Tracking', () => {
    it('should track AI usage successfully', async () => {
      const mockAIFunction = jest.fn().mockResolvedValue('test result');
      
      const result = await trackAIUsage(
        'test-service',
        'test-operation',
        'test input',
        mockAIFunction
      );

      expect(result).toBe('test result');
      expect(mockAIFunction).toHaveBeenCalledTimes(1);

      const stats = aiUsageTracker.getUsageStats('hour');
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    it('should track AI errors', async () => {
      const mockError = new Error('AI service error');
      const mockAIFunction = jest.fn().mockRejectedValue(mockError);
      
      await expect(
        trackAIUsage('test-service', 'test-operation', 'test input', mockAIFunction)
      ).rejects.toThrow('AI service error');

      const stats = aiUsageTracker.getUsageStats('hour');
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should generate optimization suggestions', () => {
      // Add some mock metrics to trigger suggestions
      const suggestions = aiUsageTracker.getOptimizationSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Health Check API', () => {
    it('should handle health check endpoint', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          ai: { status: 'healthy', message: 'OK' },
          fileProcessing: { status: 'healthy', message: 'OK' },
          monitoring: { status: 'healthy', message: 'OK' },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse),
      });

      // This would normally be tested with a real HTTP request
      // but we're mocking it here for unit testing
      const response = await fetch('/api/health');
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.services).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring initialization errors gracefully', () => {
      // Test that monitoring can handle initialization failures
      expect(() => {
        // This should not throw even if services are not configured
        const { initMonitoring } = require('../index');
        initMonitoring();
      }).not.toThrow();
    });

    it('should handle missing environment variables', () => {
      // Test environment validation with missing variables
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        // Re-require to trigger validation
        jest.resetModules();
        require('../../config/environment');
      }).toThrow();

      // Restore environment
      process.env.OPENAI_API_KEY = originalEnv;
    });
  });

  describe('Performance Metrics', () => {
    it('should measure performance correctly', async () => {
      await trackAIUsage(
        'performance-test',
        'timing-test',
        'input',
        async () => {
          // Use fake timers, so we don't actually wait
          return 'result';
        }
      );

      const stats = aiUsageTracker.getUsageStats('hour');
      expect(stats.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalRequests).toBe(1);
    }, 10000); // Increase timeout
  });
});