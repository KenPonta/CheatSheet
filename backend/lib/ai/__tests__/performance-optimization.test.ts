/**
 * Performance Optimization Tests
 * Tests for caching, lazy loading, and performance monitoring
 */

import { PerformanceOptimizedImageGenerator } from '../performance-optimized-image-generator';
import { ImageCacheService } from '../image-cache-service';
import { PerformanceMonitor } from '../../performance/performance-monitor';
import { FlatLineImageRequest, GeneratedImage } from '../simple-image-generator';

// Mock the base SimpleImageGenerator
jest.mock('../simple-image-generator', () => ({
  SimpleImageGenerator: class MockSimpleImageGenerator {
    async generateFlatLineImage(request: FlatLineImageRequest): Promise<GeneratedImage> {
      // Simulate generation time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        id: `mock-${Date.now()}`,
        svgContent: '<svg><rect width="100" height="100"/></svg>',
        base64: 'mock-base64-data',
        dimensions: request.dimensions,
        metadata: {
          type: request.type,
          content: request.content,
          style: request.style,
          generatedAt: new Date()
        }
      };
    }

    protected svgToBase64(svg: string): string {
      return Buffer.from(svg).toString('base64');
    }
  }
}));

describe('Performance Optimization', () => {
  describe('PerformanceOptimizedImageGenerator', () => {
    let generator: PerformanceOptimizedImageGenerator;
    
    beforeEach(() => {
      generator = new PerformanceOptimizedImageGenerator({
        enableCaching: true,
        maxCacheSize: 10,
        enableSVGOptimization: true,
        enableLazyGeneration: false, // Disable for predictable testing
        batchSize: 3
      });
    });

    afterEach(() => {
      generator.clearCache();
    });

    test('should cache generated images', async () => {
      const request: FlatLineImageRequest = {
        type: 'equation',
        content: 'x = y + z',
        context: 'test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      };

      // First generation
      const start1 = Date.now();
      const image1 = await generator.generateFlatLineImage(request);
      const time1 = Date.now() - start1;

      // Second generation (should be cached)
      const start2 = Date.now();
      const image2 = await generator.generateFlatLineImage(request);
      const time2 = Date.now() - start2;

      expect(image1.id).toBe(image2.id);
      expect(time2).toBeLessThan(time1); // Cached should be faster
      
      const stats = generator.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should optimize SVG content', async () => {
      const request: FlatLineImageRequest = {
        type: 'concept',
        content: 'test content with   extra   spaces',
        context: 'test',
        style: { lineWeight: 'thick', colorScheme: 'minimal-color', layout: 'vertical', annotations: false },
        dimensions: { width: 500, height: 400 }
      };

      const image = await generator.generateFlatLineImage(request);
      
      // SVG should be optimized (no extra spaces)
      expect(image.svgContent).not.toMatch(/\s{2,}/);
      expect(image.svgContent).not.toMatch(/>\s+</);
    });

    test('should handle batch generation efficiently', async () => {
      const requests: FlatLineImageRequest[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'equation',
        content: `equation ${i}`,
        context: 'batch test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      }));

      const start = Date.now();
      const images = await generator.batchGenerateImages(requests);
      const totalTime = Date.now() - start;

      expect(images).toHaveLength(5);
      expect(images.every(img => img.id)).toBe(true);
      
      // Batch should be more efficient than individual generations
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should evict least recently used items when cache is full', async () => {
      const requests: FlatLineImageRequest[] = Array.from({ length: 15 }, (_, i) => ({
        type: 'equation',
        content: `equation ${i}`,
        context: 'eviction test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      }));

      // Fill cache beyond capacity
      for (const request of requests) {
        await generator.generateFlatLineImage(request);
      }

      const stats = generator.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(10); // Should not exceed max cache size
      expect(stats.evictions).toBeGreaterThan(0);
    });

    test('should preload common images', async () => {
      await generator.preloadCommonImages('test-session');
      
      const stats = generator.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    test('should provide memory usage estimates', () => {
      const usage = generator.getMemoryUsage();
      expect(usage).toHaveProperty('estimatedBytes');
      expect(usage).toHaveProperty('cacheEntries');
      expect(typeof usage.estimatedBytes).toBe('number');
      expect(typeof usage.cacheEntries).toBe('number');
    });
  });

  describe('ImageCacheService', () => {
    let cacheService: ImageCacheService;
    
    beforeEach(() => {
      cacheService = new ImageCacheService({
        maxSize: 1024 * 1024, // 1MB
        maxEntries: 100,
        ttl: 60000, // 1 minute
        compressionEnabled: true
      });
    });

    afterEach(() => {
      cacheService.destroy();
    });

    test('should cache and retrieve images', async () => {
      const request: FlatLineImageRequest = {
        type: 'diagram',
        content: 'test diagram',
        context: 'cache test',
        style: { lineWeight: 'thin', colorScheme: 'monochrome', layout: 'grid', annotations: true },
        dimensions: { width: 300, height: 200 }
      };

      const image: GeneratedImage = {
        id: 'test-image',
        svgContent: '<svg><circle r="50"/></svg>',
        base64: 'test-base64',
        dimensions: { width: 300, height: 200 },
        metadata: {
          type: 'diagram',
          content: 'test diagram',
          style: request.style,
          generatedAt: new Date()
        }
      };

      const key = cacheService.generateKey(request);
      
      // Cache miss
      const cached1 = await cacheService.get(key);
      expect(cached1).toBeNull();

      // Store image
      await cacheService.set(key, image, ['test']);

      // Cache hit
      const cached2 = await cacheService.get(key);
      expect(cached2).not.toBeNull();
      expect(cached2!.id).toBe(image.id);

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should expire old entries', async () => {
      const cacheServiceShortTTL = new ImageCacheService({
        ttl: 100 // 100ms
      });

      const request: FlatLineImageRequest = {
        type: 'equation',
        content: 'x = 1',
        context: 'expiry test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      };

      const image: GeneratedImage = {
        id: 'expiry-test',
        svgContent: '<svg><text>x=1</text></svg>',
        base64: 'expiry-base64',
        dimensions: { width: 400, height: 300 },
        metadata: {
          type: 'equation',
          content: 'x = 1',
          style: request.style,
          generatedAt: new Date()
        }
      };

      const key = cacheServiceShortTTL.generateKey(request);
      await cacheServiceShortTTL.set(key, image);

      // Should be cached initially
      const cached1 = await cacheServiceShortTTL.get(key);
      expect(cached1).not.toBeNull();

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      const cached2 = await cacheServiceShortTTL.get(key);
      expect(cached2).toBeNull();

      cacheServiceShortTTL.destroy();
    });

    test('should handle cache by tags', async () => {
      const images = [
        { id: 'math-1', tags: ['math', 'equation'] },
        { id: 'physics-1', tags: ['physics', 'diagram'] },
        { id: 'math-2', tags: ['math', 'concept'] }
      ];

      for (const { id, tags } of images) {
        const image: GeneratedImage = {
          id,
          svgContent: `<svg><text>${id}</text></svg>`,
          base64: `${id}-base64`,
          dimensions: { width: 400, height: 300 },
          metadata: {
            type: 'equation',
            content: id,
            style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
            generatedAt: new Date()
          }
        };

        await cacheService.set(`key-${id}`, image, tags);
      }

      const mathImages = cacheService.getByTags(['math']);
      expect(mathImages).toHaveLength(2);
      expect(mathImages.map(img => img.id)).toContain('math-1');
      expect(mathImages.map(img => img.id)).toContain('math-2');

      const physicsImages = cacheService.getByTags(['physics']);
      expect(physicsImages).toHaveLength(1);
      expect(physicsImages[0].id).toBe('physics-1');
    });

    test('should optimize cache performance', () => {
      // Add some entries with different access patterns
      const entries = Array.from({ length: 20 }, (_, i) => ({
        id: `image-${i}`,
        accessCount: Math.floor(Math.random() * 10),
        timestamp: Date.now() - Math.random() * 86400000 // Random age up to 1 day
      }));

      // This would normally involve actual cache operations
      // For testing, we'll just verify the optimize method exists and runs
      expect(() => cacheService.optimize()).not.toThrow();
    });

    test('should export and import cache data', () => {
      const exportData = cacheService.export();
      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();

      const newCacheService = new ImageCacheService();
      expect(() => newCacheService.import(exportData)).not.toThrow();
      
      newCacheService.destroy();
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;
    
    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    afterEach(() => {
      monitor.stopMonitoring();
    });

    test('should record and retrieve metrics', () => {
      monitor.recordMetric('test_metric', 100, 'ms', { component: 'test' });
      monitor.recordMetric('test_metric', 150, 'ms', { component: 'test' });

      const trends = monitor.getTrends('test_metric');
      expect(trends).toHaveLength(2);
      expect(trends[0].value).toBe(100);
      expect(trends[1].value).toBe(150);
    });

    test('should track execution time', async () => {
      const result = await monitor.trackExecution('test_function', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'test result';
      });

      expect(result).toBe('test result');

      const trends = monitor.getTrends('test_function_execution_time');
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0].value).toBeGreaterThanOrEqual(50);
    });

    test('should generate performance report', () => {
      // Add some test metrics
      monitor.recordMetric('image_generation_time', 3000, 'ms');
      monitor.recordMetric('cache_hit_rate', 0.6, 'ratio');
      monitor.recordMetric('memory_usage', 160 * 1024 * 1024, 'bytes');

      const report = monitor.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('bottlenecks');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('overallScore');
      
      expect(Array.isArray(report.bottlenecks)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(typeof report.overallScore).toBe('number');
    });

    test('should identify bottlenecks', () => {
      // Add metrics that should trigger bottleneck detection
      monitor.recordMetric('image_generation_time', 6000, 'ms'); // Critical threshold
      monitor.recordMetric('cache_hit_rate', 0.4, 'ratio'); // Below warning threshold
      monitor.recordMetric('memory_usage', 250 * 1024 * 1024, 'bytes'); // Critical threshold

      const report = monitor.generateReport();
      
      expect(report.bottlenecks.length).toBeGreaterThan(0);
      
      const imageBottleneck = report.bottlenecks.find(b => b.component === 'ImageGenerator');
      expect(imageBottleneck).toBeDefined();
      expect(imageBottleneck!.severity).toBe('critical');

      const cacheBottleneck = report.bottlenecks.find(b => b.component === 'Cache');
      expect(cacheBottleneck).toBeDefined();

      const memoryBottleneck = report.bottlenecks.find(b => b.component === 'System');
      expect(memoryBottleneck).toBeDefined();
    });

    test('should record component performance', () => {
      monitor.recordComponentPerformance('TestComponent', {
        renderTime: 250,
        memoryUsage: 1024 * 1024,
        cacheHitRate: 0.8,
        errorRate: 0.02,
        throughput: 100
      });

      const summary = monitor.getComponentSummary();
      expect(summary).toHaveLength(1);
      expect(summary[0].name).toBe('TestComponent');
      expect(summary[0].renderTime).toBe(250);
    });

    test('should start and stop monitoring', () => {
      expect(() => monitor.startMonitoring(1000)).not.toThrow();
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    test('should optimize performance', async () => {
      // Add bottleneck-triggering metrics
      monitor.recordMetric('image_generation_time', 4000, 'ms');
      monitor.recordMetric('cache_hit_rate', 0.5, 'ratio');

      const optimizations = await monitor.optimizePerformance();
      expect(Array.isArray(optimizations)).toBe(true);
    });

    test('should clear metrics', () => {
      monitor.recordMetric('test_metric', 100, 'ms');
      monitor.recordComponentPerformance('TestComponent', { renderTime: 100 });

      expect(monitor.getTrends('test_metric')).toHaveLength(1);
      expect(monitor.getComponentSummary()).toHaveLength(1);

      monitor.clearMetrics();

      expect(monitor.getTrends('test_metric')).toHaveLength(0);
      expect(monitor.getComponentSummary()).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate performance monitoring with image generation', async () => {
      const monitor = new PerformanceMonitor();
      const generator = new PerformanceOptimizedImageGenerator({
        enableCaching: true,
        maxCacheSize: 5
      });

      const request: FlatLineImageRequest = {
        type: 'example',
        content: 'integration test',
        context: 'performance test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      };

      // Track image generation performance
      const image = await monitor.trackExecution('image_generation', async () => {
        return await generator.generateFlatLineImage(request);
      });

      expect(image).toBeDefined();
      expect(image.id).toBeDefined();

      const trends = monitor.getTrends('image_generation_execution_time');
      expect(trends.length).toBeGreaterThan(0);

      const cacheStats = generator.getCacheStats();
      monitor.recordMetric('cache_hit_rate', cacheStats.hitRate, 'ratio');
      monitor.recordMetric('cache_size', cacheStats.size, 'entries');

      const report = monitor.generateReport();
      expect(report.metrics.length).toBeGreaterThan(0);

      monitor.stopMonitoring();
      generator.clearCache();
    });

    test('should handle performance optimization workflow', async () => {
      const monitor = new PerformanceMonitor();
      const cacheService = new ImageCacheService();
      const generator = new PerformanceOptimizedImageGenerator();

      // Simulate a complete workflow
      const requests: FlatLineImageRequest[] = Array.from({ length: 10 }, (_, i) => ({
        type: 'equation',
        content: `equation ${i}`,
        context: 'workflow test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      }));

      // Generate images and track performance
      for (const request of requests) {
        await monitor.trackExecution('workflow_generation', async () => {
          const image = await generator.generateFlatLineImage(request);
          const key = cacheService.generateKey(request);
          await cacheService.set(key, image, ['workflow']);
          return image;
        });
      }

      // Analyze performance
      const report = monitor.generateReport();
      const cacheStats = cacheService.getStats();
      const generatorStats = generator.getCacheStats();

      expect(report.metrics.length).toBeGreaterThan(0);
      expect(cacheStats.entryCount).toBeGreaterThan(0);
      expect(generatorStats.size).toBeGreaterThan(0);

      // Cleanup
      monitor.stopMonitoring();
      cacheService.destroy();
      generator.clearCache();
    });
  });
});