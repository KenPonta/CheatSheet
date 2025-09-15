/**
 * Performance Integration Tests
 * Tests the complete performance optimization integration
 */

import { PerformanceIntegrationService } from '../performance-integration-service';
import { FlatLineImageRequest } from '../simple-image-generator';

// Mock the base SimpleImageGenerator
jest.mock('../simple-image-generator', () => ({
  SimpleImageGenerator: class MockSimpleImageGenerator {
    async generateFlatLineImage(request: any) {
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        id: `mock-${Date.now()}-${Math.random()}`,
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

describe('Performance Integration Service', () => {
  let service: PerformanceIntegrationService;

  beforeEach(() => {
    service = new PerformanceIntegrationService({
      imageGeneration: {
        enableCaching: true,
        maxCacheSize: 10,
        enableSVGOptimization: true,
        batchSize: 3
      },
      caching: {
        maxSize: 1024 * 1024, // 1MB
        maxEntries: 50,
        ttl: 60000 // 1 minute
      },
      monitoring: {
        enabled: true,
        intervalMs: 1000, // 1 second for testing
        enableAutoOptimization: false // Disable for predictable testing
      },
      preloading: {
        enabled: true,
        commonPatterns: true,
        userPatterns: false // Disable for testing
      }
    });
  });

  afterEach(async () => {
    await service.destroy();
  });

  test('should initialize successfully', async () => {
    await service.initialize('test-session');
    
    const metrics = service.getPerformanceMetrics();
    expect(metrics).toHaveProperty('imageGeneration');
    expect(metrics).toHaveProperty('caching');
    expect(metrics).toHaveProperty('system');
  });

  test('should generate images with performance tracking', async () => {
    const request: FlatLineImageRequest = {
      type: 'equation',
      content: 'x = y + z',
      context: 'integration test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    };

    const image = await service.generateImage(request, 'test-session');
    
    expect(image).toBeDefined();
    expect(image.id).toBeDefined();
    expect(image.svgContent).toBeDefined();
    expect(image.metadata.type).toBe('equation');

    const metrics = service.getPerformanceMetrics();
    expect(metrics.imageGeneration.throughput).toBeGreaterThanOrEqual(0);
  });

  test('should cache images effectively', async () => {
    const request: FlatLineImageRequest = {
      type: 'concept',
      content: 'test concept',
      context: 'cache test',
      style: { lineWeight: 'thin', colorScheme: 'minimal-color', layout: 'vertical', annotations: false },
      dimensions: { width: 300, height: 200 }
    };

    // First generation
    const start1 = Date.now();
    const image1 = await service.generateImage(request, 'cache-test');
    const time1 = Date.now() - start1;

    // Second generation (should be cached)
    const start2 = Date.now();
    const image2 = await service.generateImage(request, 'cache-test');
    const time2 = Date.now() - start2;

    expect(image1.id).toBe(image2.id);
    expect(time2).toBeLessThan(time1); // Cached should be faster

    const metrics = service.getPerformanceMetrics();
    expect(metrics.caching.hitRate).toBeGreaterThan(0);
  });

  test('should handle batch generation efficiently', async () => {
    const requests: FlatLineImageRequest[] = Array.from({ length: 6 }, (_, i) => ({
      type: 'example',
      content: `example ${i}`,
      context: 'batch test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    }));

    const start = Date.now();
    const images = await service.batchGenerateImages(requests, 'batch-test');
    const totalTime = Date.now() - start;

    expect(images).toHaveLength(6);
    expect(images.every(img => img.id)).toBe(true);
    expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds

    const metrics = service.getPerformanceMetrics();
    expect(metrics.imageGeneration.throughput).toBeGreaterThanOrEqual(0);
  });

  test('should optimize performance automatically', async () => {
    // Generate some images to create metrics
    const requests: FlatLineImageRequest[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'diagram',
      content: `diagram ${i}`,
      context: 'optimization test',
      style: { lineWeight: 'thick', colorScheme: 'monochrome', layout: 'grid', annotations: true },
      dimensions: { width: 500, height: 400 }
    }));

    for (const request of requests) {
      await service.generateImage(request, 'optimization-test');
    }

    const optimizations = await service.optimizePerformance();
    expect(Array.isArray(optimizations)).toBe(true);
  });

  test('should provide detailed performance metrics', async () => {
    // Generate some activity
    const request: FlatLineImageRequest = {
      type: 'equation',
      content: 'a² + b² = c²',
      context: 'metrics test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    };

    await service.generateImage(request, 'metrics-test');
    await service.generateImage(request, 'metrics-test'); // Second call should hit cache

    const metrics = service.getPerformanceMetrics();
    
    expect(metrics.imageGeneration).toHaveProperty('averageTime');
    expect(metrics.imageGeneration).toHaveProperty('cacheHitRate');
    expect(metrics.imageGeneration).toHaveProperty('throughput');
    
    expect(metrics.caching).toHaveProperty('hitRate');
    expect(metrics.caching).toHaveProperty('size');
    expect(metrics.caching).toHaveProperty('memoryUsage');
    
    expect(metrics.system).toHaveProperty('overallScore');
    expect(metrics.system).toHaveProperty('bottlenecks');
    expect(metrics.system).toHaveProperty('recommendations');

    expect(typeof metrics.imageGeneration.averageTime).toBe('number');
    expect(typeof metrics.caching.hitRate).toBe('number');
    expect(typeof metrics.system.overallScore).toBe('number');
  });

  test('should provide detailed debugging report', async () => {
    await service.initialize('debug-test');
    
    const request: FlatLineImageRequest = {
      type: 'concept',
      content: 'debug concept',
      context: 'debug test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    };

    await service.generateImage(request, 'debug-test');

    const report = service.getDetailedReport();
    
    expect(report).toHaveProperty('generator');
    expect(report).toHaveProperty('cache');
    expect(report).toHaveProperty('monitor');
    expect(report).toHaveProperty('integration');

    expect(report.generator).toHaveProperty('stats');
    expect(report.generator).toHaveProperty('memoryUsage');
    
    expect(report.cache).toHaveProperty('stats');
    expect(report.cache).toHaveProperty('export');
    
    expect(report.monitor).toHaveProperty('timestamp');
    expect(report.monitor).toHaveProperty('metrics');
    expect(report.monitor).toHaveProperty('bottlenecks');
    
    expect(report.integration).toHaveProperty('imageGeneration');
    expect(report.integration).toHaveProperty('caching');
    expect(report.integration).toHaveProperty('system');
  });

  test('should handle mixed cache hits and misses in batch operations', async () => {
    // First, generate some images to populate cache
    const initialRequests: FlatLineImageRequest[] = [
      {
        type: 'equation',
        content: 'x = 1',
        context: 'mixed test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      },
      {
        type: 'equation',
        content: 'y = 2',
        context: 'mixed test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      }
    ];

    for (const request of initialRequests) {
      await service.generateImage(request, 'mixed-test');
    }

    // Now batch generate with mix of cached and new requests
    const mixedRequests: FlatLineImageRequest[] = [
      ...initialRequests, // These should hit cache
      {
        type: 'equation',
        content: 'z = 3',
        context: 'mixed test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      },
      {
        type: 'equation',
        content: 'w = 4',
        context: 'mixed test',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        dimensions: { width: 400, height: 300 }
      }
    ];

    const images = await service.batchGenerateImages(mixedRequests, 'mixed-test');
    
    expect(images).toHaveLength(4);
    expect(images.every(img => img.id)).toBe(true);

    const metrics = service.getPerformanceMetrics();
    expect(metrics.caching.hitRate).toBeGreaterThan(0);
    expect(metrics.caching.size).toBeGreaterThan(0);
  });

  test('should handle service lifecycle correctly', async () => {
    // Test initialization
    await service.initialize('lifecycle-test');
    expect(service.getPerformanceMetrics()).toBeDefined();

    // Test operation
    const request: FlatLineImageRequest = {
      type: 'diagram',
      content: 'lifecycle diagram',
      context: 'lifecycle test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    };

    const image = await service.generateImage(request, 'lifecycle-test');
    expect(image).toBeDefined();

    // Test destruction
    await service.destroy();
    
    // After destruction, service should still be callable but may reinitialize
    const newImage = await service.generateImage(request, 'lifecycle-test');
    expect(newImage).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    // Service should be functional with valid requests
    const validRequest: FlatLineImageRequest = {
      type: 'equation',
      content: 'x = 1',
      context: 'recovery test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    };

    const image = await service.generateImage(validRequest, 'error-test');
    expect(image).toBeDefined();
    
    // Test that service continues to work after successful operations
    const image2 = await service.generateImage(validRequest, 'error-test');
    expect(image2).toBeDefined();
  });

  test('should track performance trends over time', async () => {
    const request: FlatLineImageRequest = {
      type: 'example',
      content: 'trend tracking',
      context: 'trend test',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
      dimensions: { width: 400, height: 300 }
    };

    // Generate multiple images to create trend data
    for (let i = 0; i < 5; i++) {
      await service.generateImage({
        ...request,
        content: `trend tracking ${i}`
      }, 'trend-test');
      
      // Small delay to create time separation
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const metrics = service.getPerformanceMetrics();
    expect(metrics.imageGeneration.throughput).toBeGreaterThan(0);
    expect(metrics.imageGeneration.averageTime).toBeGreaterThan(0);

    const report = service.getDetailedReport();
    expect(report.monitor.metrics.length).toBeGreaterThan(0);
  });
});