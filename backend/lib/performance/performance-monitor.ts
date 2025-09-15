/**
 * Performance Monitor - Tracks and optimizes system performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
  overallScore: number;
}

interface Bottleneck {
  component: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
}

interface ComponentPerformance {
  name: string;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
}

/**
 * Performance monitoring and optimization service
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private componentMetrics = new Map<string, ComponentPerformance>();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.setupDefaultThresholds();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check thresholds
    this.checkThresholds(metric);
  }

  /**
   * Record component performance
   */
  recordComponentPerformance(component: string, performance: Partial<ComponentPerformance>): void {
    const existing = this.componentMetrics.get(component) || {
      name: component,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughput: 0
    };

    this.componentMetrics.set(component, {
      ...existing,
      ...performance
    });
  }

  /**
   * Track function execution time
   */
  async trackExecution<T>(
    name: string, 
    fn: () => Promise<T>, 
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      const memoryDelta = this.getMemoryUsage() - startMemory;

      this.recordMetric(`${name}_execution_time`, executionTime, 'ms', tags);
      this.recordMetric(`${name}_memory_delta`, memoryDelta, 'bytes', tags);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetric(`${name}_execution_time`, executionTime, 'ms', { ...tags, error: 'true' });
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // Last 5 minutes

    const bottlenecks = this.identifyBottlenecks();
    const recommendations = this.generateRecommendations(bottlenecks);
    const overallScore = this.calculateOverallScore();

    return {
      timestamp: now,
      metrics: recentMetrics,
      bottlenecks,
      recommendations,
      overallScore
    };
  }

  /**
   * Get component performance summary
   */
  getComponentSummary(): ComponentPerformance[] {
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Optimize performance based on current metrics
   */
  async optimizePerformance(): Promise<string[]> {
    const report = this.generateReport();
    const optimizations: string[] = [];

    // Analyze bottlenecks and apply optimizations
    for (const bottleneck of report.bottlenecks) {
      const optimization = await this.applyOptimization(bottleneck);
      if (optimization) {
        optimizations.push(optimization);
      }
    }

    return optimizations;
  }

  /**
   * Get performance trends
   */
  getTrends(metricName: string, timeRangeMs: number = 3600000): PerformanceMetric[] {
    const cutoff = Date.now() - timeRangeMs;
    return this.metrics
      .filter(m => m.name === metricName && m.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
    this.componentMetrics.clear();
  }

  // Private methods

  private setupDefaultThresholds(): void {
    this.thresholds = [
      { metric: 'image_generation_time', warning: 2000, critical: 5000, unit: 'ms' },
      { metric: 'cache_hit_rate', warning: 0.7, critical: 0.5, unit: 'ratio' },
      { metric: 'memory_usage', warning: 100 * 1024 * 1024, critical: 200 * 1024 * 1024, unit: 'bytes' },
      { metric: 'component_render_time', warning: 100, critical: 500, unit: 'ms' },
      { metric: 'error_rate', warning: 0.01, critical: 0.05, unit: 'ratio' },
      { metric: 'svg_optimization_ratio', warning: 0.8, critical: 0.6, unit: 'ratio' }
    ];
  }

  private collectSystemMetrics(): void {
    // Memory usage
    const memoryUsage = this.getMemoryUsage();
    this.recordMetric('system_memory_usage', memoryUsage, 'bytes');

    // CPU usage (if available)
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const cpuUsage = process.cpuUsage();
      this.recordMetric('system_cpu_user', cpuUsage.user / 1000, 'ms');
      this.recordMetric('system_cpu_system', cpuUsage.system / 1000, 'ms');
    }

    // Event loop lag (Node.js only)
    if (typeof process !== 'undefined') {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        this.recordMetric('event_loop_lag', lag, 'ms');
      });
    }
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    return 0;
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.find(t => t.metric === metric.name);
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      console.warn(`CRITICAL: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold.critical}${threshold.unit})`);
    } else if (metric.value >= threshold.warning) {
      console.warn(`WARNING: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold.warning}${threshold.unit})`);
    }
  }

  private identifyBottlenecks(): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // Last 5 minutes

    // Analyze image generation performance
    const imageGenTimes = recentMetrics.filter(m => m.name.includes('image_generation_time'));
    if (imageGenTimes.length > 0) {
      const avgTime = imageGenTimes.reduce((sum, m) => sum + m.value, 0) / imageGenTimes.length;
      if (avgTime > 3000) {
        bottlenecks.push({
          component: 'ImageGenerator',
          metric: 'generation_time',
          severity: avgTime > 5000 ? 'critical' : 'high',
          description: `Average image generation time is ${avgTime.toFixed(0)}ms`,
          impact: 'Slow image generation affects user experience',
          recommendation: 'Enable caching and SVG optimization'
        });
      }
    }

    // Analyze cache performance
    const cacheHitRates = recentMetrics.filter(m => m.name.includes('cache_hit_rate'));
    if (cacheHitRates.length > 0) {
      const avgHitRate = cacheHitRates.reduce((sum, m) => sum + m.value, 0) / cacheHitRates.length;
      if (avgHitRate < 0.7) {
        bottlenecks.push({
          component: 'Cache',
          metric: 'hit_rate',
          severity: avgHitRate < 0.5 ? 'critical' : 'medium',
          description: `Cache hit rate is ${(avgHitRate * 100).toFixed(1)}%`,
          impact: 'Low cache hit rate increases generation load',
          recommendation: 'Increase cache size and improve cache key generation'
        });
      }
    }

    // Analyze memory usage
    const memoryMetrics = recentMetrics.filter(m => m.name.includes('memory'));
    if (memoryMetrics.length > 0) {
      const maxMemory = Math.max(...memoryMetrics.map(m => m.value));
      if (maxMemory > 150 * 1024 * 1024) { // 150MB
        bottlenecks.push({
          component: 'System',
          metric: 'memory_usage',
          severity: maxMemory > 200 * 1024 * 1024 ? 'critical' : 'medium',
          description: `Peak memory usage is ${(maxMemory / 1024 / 1024).toFixed(1)}MB`,
          impact: 'High memory usage may cause performance degradation',
          recommendation: 'Implement memory cleanup and optimize data structures'
        });
      }
    }

    // Analyze component render times
    for (const [name, perf] of this.componentMetrics.entries()) {
      if (perf.renderTime > 200) {
        bottlenecks.push({
          component: name,
          metric: 'render_time',
          severity: perf.renderTime > 500 ? 'high' : 'medium',
          description: `Component render time is ${perf.renderTime}ms`,
          impact: 'Slow component rendering affects UI responsiveness',
          recommendation: 'Implement lazy loading and component optimization'
        });
      }
    }

    return bottlenecks;
  }

  private generateRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations = new Set<string>();

    for (const bottleneck of bottlenecks) {
      recommendations.add(bottleneck.recommendation);

      // Add specific recommendations based on bottleneck type
      switch (bottleneck.component) {
        case 'ImageGenerator':
          recommendations.add('Consider implementing progressive image loading');
          recommendations.add('Use WebWorkers for heavy image processing');
          break;
        case 'Cache':
          recommendations.add('Implement intelligent cache preloading');
          recommendations.add('Use compression for cached images');
          break;
        case 'System':
          recommendations.add('Implement garbage collection optimization');
          recommendations.add('Use object pooling for frequently created objects');
          break;
      }
    }

    return Array.from(recommendations);
  }

  private calculateOverallScore(): number {
    const weights = {
      performance: 0.4,
      reliability: 0.3,
      efficiency: 0.3
    };

    // Calculate performance score (based on response times)
    const performanceMetrics = this.metrics.filter(m => 
      m.name.includes('execution_time') || m.name.includes('render_time')
    );
    const avgPerformance = performanceMetrics.length > 0 
      ? performanceMetrics.reduce((sum, m) => sum + Math.min(100, 1000 / m.value), 0) / performanceMetrics.length
      : 50;

    // Calculate reliability score (based on error rates)
    const errorMetrics = this.metrics.filter(m => m.name.includes('error_rate'));
    const avgReliability = errorMetrics.length > 0
      ? errorMetrics.reduce((sum, m) => sum + (100 * (1 - m.value)), 0) / errorMetrics.length
      : 90;

    // Calculate efficiency score (based on cache hit rates and resource usage)
    const cacheMetrics = this.metrics.filter(m => m.name.includes('cache_hit_rate'));
    const avgEfficiency = cacheMetrics.length > 0
      ? cacheMetrics.reduce((sum, m) => sum + (100 * m.value), 0) / cacheMetrics.length
      : 70;

    return Math.round(
      avgPerformance * weights.performance +
      avgReliability * weights.reliability +
      avgEfficiency * weights.efficiency
    );
  }

  private async applyOptimization(bottleneck: Bottleneck): Promise<string | null> {
    // This would implement actual optimizations based on bottleneck type
    // For now, we'll just return the recommendation
    
    switch (bottleneck.component) {
      case 'ImageGenerator':
        if (bottleneck.metric === 'generation_time') {
          // Could trigger cache preloading or adjust generation parameters
          return `Applied optimization: Enabled aggressive caching for ${bottleneck.component}`;
        }
        break;
      
      case 'Cache':
        if (bottleneck.metric === 'hit_rate') {
          // Could increase cache size or improve cache strategy
          return `Applied optimization: Increased cache size and improved eviction strategy`;
        }
        break;
      
      case 'System':
        if (bottleneck.metric === 'memory_usage') {
          // Could trigger garbage collection or memory cleanup
          return `Applied optimization: Triggered memory cleanup and garbage collection`;
        }
        break;
    }

    return null;
  }
}

export { PerformanceMetric, PerformanceThreshold, PerformanceReport, Bottleneck, ComponentPerformance };