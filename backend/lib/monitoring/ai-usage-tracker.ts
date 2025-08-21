/**
 * AI Usage Analytics and Optimization
 * Tracks AI service usage patterns for cost optimization and performance monitoring
 */

import { trackAIRequest, trackAIError, trackPerformanceMetric } from './analytics';
import { reportError, addBreadcrumb } from './sentry';

interface AIUsageMetrics {
  service: string;
  operation: string;
  tokensUsed: number;
  responseTime: number;
  success: boolean;
  errorType?: string;
  retryCount?: number;
  inputSize: number;
  outputSize: number;
  timestamp: Date;
}

interface AIOptimizationSuggestion {
  type: 'cost' | 'performance' | 'reliability';
  message: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

class AIUsageTracker {
  private metrics: AIUsageMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private readonly costPerToken = 0.00002; // Approximate GPT-4 cost per token

  // Track AI service usage
  async trackUsage<T>(
    service: string,
    operation: string,
    inputData: any,
    aiFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const inputSize = this.calculateInputSize(inputData);
    
    addBreadcrumb(`AI ${service} ${operation} started`, 'ai', {
      service,
      operation,
      inputSize,
    });

    try {
      const result = await aiFunction();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const outputSize = this.calculateOutputSize(result);
      
      // Estimate tokens used (rough approximation)
      const tokensUsed = Math.ceil((inputSize + outputSize) / 4);
      
      const metrics: AIUsageMetrics = {
        service,
        operation,
        tokensUsed,
        responseTime,
        success: true,
        inputSize,
        outputSize,
        timestamp: new Date(),
      };

      this.recordMetrics(metrics);
      
      // Track in analytics
      trackAIRequest(service as any, tokensUsed);
      trackPerformanceMetric(`ai_${service}_response_time`, responseTime, {
        operation,
        tokens_used: tokensUsed,
      });

      addBreadcrumb(`AI ${service} ${operation} completed`, 'ai', {
        responseTime,
        tokensUsed,
        success: true,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorType = error instanceof Error ? error.message : 'Unknown error';

      const metrics: AIUsageMetrics = {
        service,
        operation,
        tokensUsed: 0,
        responseTime,
        success: false,
        errorType,
        inputSize,
        outputSize: 0,
        timestamp: new Date(),
      };

      this.recordMetrics(metrics);
      
      // Track error in analytics
      trackAIError(service, errorType);
      reportError(error as Error, {
        service,
        operation,
        inputSize,
        responseTime,
      });

      addBreadcrumb(`AI ${service} ${operation} failed`, 'ai', {
        responseTime,
        errorType,
        success: false,
      });

      throw error;
    }
  }

  // Track retry attempts
  async trackWithRetry<T>(
    service: string,
    operation: string,
    inputData: any,
    aiFunction: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.trackUsage(service, operation, inputData, aiFunction);
        
        if (attempt > 1) {
          // Track successful retry
          trackPerformanceMetric('ai_retry_success', attempt, {
            service,
            operation,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          
          trackAIError(service, `Retry attempt ${attempt}`, attempt);
        }
      }
    }
    
    // All retries failed
    trackAIError(service, 'All retries failed', maxRetries);
    throw lastError;
  }

  // Record metrics with history management
  private recordMetrics(metrics: AIUsageMetrics) {
    this.metrics.push(metrics);
    
    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  // Calculate input size (characters/bytes)
  private calculateInputSize(input: any): number {
    if (typeof input === 'string') {
      return input.length;
    }
    return JSON.stringify(input).length;
  }

  // Calculate output size
  private calculateOutputSize(output: any): number {
    if (typeof output === 'string') {
      return output.length;
    }
    return JSON.stringify(output).length;
  }

  // Get usage statistics
  getUsageStats(timeframe: 'hour' | 'day' | 'week' = 'day') {
    const now = new Date();
    const timeframMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    }[timeframe];

    const cutoff = new Date(now.getTime() - timeframMs);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const totalTokens = recentMetrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalCost = totalTokens * this.costPerToken;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests || 0;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const serviceBreakdown = recentMetrics.reduce((acc, m) => {
      if (!acc[m.service]) {
        acc[m.service] = { requests: 0, tokens: 0, errors: 0 };
      }
      acc[m.service].requests++;
      acc[m.service].tokens += m.tokensUsed;
      if (!m.success) acc[m.service].errors++;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; errors: number }>);

    return {
      timeframe,
      totalRequests,
      successfulRequests,
      totalTokens,
      totalCost,
      avgResponseTime,
      successRate,
      serviceBreakdown,
    };
  }

  // Generate optimization suggestions
  getOptimizationSuggestions(): AIOptimizationSuggestion[] {
    const stats = this.getUsageStats('day');
    const suggestions: AIOptimizationSuggestion[] = [];

    // Cost optimization
    if (stats.totalCost > 10) { // $10 per day threshold
      suggestions.push({
        type: 'cost',
        message: `High daily AI costs: $${stats.totalCost.toFixed(2)}`,
        impact: 'high',
        suggestion: 'Consider implementing request caching or reducing token usage per request',
      });
    }

    // Performance optimization
    if (stats.avgResponseTime > 10000) { // 10 second threshold
      suggestions.push({
        type: 'performance',
        message: `Slow average response time: ${(stats.avgResponseTime / 1000).toFixed(1)}s`,
        impact: 'medium',
        suggestion: 'Consider breaking large requests into smaller chunks or implementing parallel processing',
      });
    }

    // Reliability optimization
    if (stats.successRate < 95) {
      suggestions.push({
        type: 'reliability',
        message: `Low success rate: ${stats.successRate.toFixed(1)}%`,
        impact: 'high',
        suggestion: 'Implement better error handling, retry logic, or fallback mechanisms',
      });
    }

    // Service-specific suggestions
    Object.entries(stats.serviceBreakdown).forEach(([service, data]) => {
      const errorRate = (data.errors / data.requests) * 100;
      if (errorRate > 10) {
        suggestions.push({
          type: 'reliability',
          message: `High error rate for ${service}: ${errorRate.toFixed(1)}%`,
          impact: 'medium',
          suggestion: `Review ${service} implementation and add service-specific error handling`,
        });
      }
    });

    return suggestions;
  }

  // Export metrics for analysis
  exportMetrics(format: 'json' | 'csv' = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'service', 'operation', 'tokensUsed', 'responseTime', 'success', 'errorType', 'inputSize', 'outputSize'];
    const rows = this.metrics.map(m => [
      m.timestamp.toISOString(),
      m.service,
      m.operation,
      m.tokensUsed,
      m.responseTime,
      m.success,
      m.errorType || '',
      m.inputSize,
      m.outputSize,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Clear metrics (for testing or reset)
  clearMetrics() {
    this.metrics = [];
  }
}

// Singleton instance
export const aiUsageTracker = new AIUsageTracker();

// Convenience functions
export const trackAIUsage = aiUsageTracker.trackUsage.bind(aiUsageTracker);
export const trackAIWithRetry = aiUsageTracker.trackWithRetry.bind(aiUsageTracker);
export const getAIUsageStats = aiUsageTracker.getUsageStats.bind(aiUsageTracker);
export const getAIOptimizationSuggestions = aiUsageTracker.getOptimizationSuggestions.bind(aiUsageTracker);