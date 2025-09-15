import { ImageRegenerationService, RegenerationRequest, BatchRegenerationRequest } from '../image-regeneration-service';
import { SimpleImageGenerator, FlatLineStyle, GeneratedImage } from '../simple-image-generator';

// Mock the SimpleImageGenerator
jest.mock('../simple-image-generator');
jest.mock('../image-recreation-service');

const MockedSimpleImageGenerator = SimpleImageGenerator as jest.MockedClass<typeof SimpleImageGenerator>;

describe('ImageRegenerationService', () => {
  let service: ImageRegenerationService;
  let mockImageGenerator: jest.Mocked<SimpleImageGenerator>;

  const mockGeneratedImage: GeneratedImage = {
    id: 'test-image-1',
    svgContent: '<svg><rect width="100" height="100"/></svg>',
    base64: 'data:image/svg+xml;base64,PHN2Zz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjwvc3ZnPg==',
    dimensions: { width: 400, height: 300 },
    metadata: {
      type: 'equation',
      content: 'x = y + z',
      style: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: true
      },
      generatedAt: new Date()
    }
  };

  beforeEach(() => {
    MockedSimpleImageGenerator.mockClear();
    mockImageGenerator = new MockedSimpleImageGenerator() as jest.Mocked<SimpleImageGenerator>;
    mockImageGenerator.generateFlatLineImage.mockResolvedValue(mockGeneratedImage);
    
    service = new ImageRegenerationService();
    // Replace the internal generator with our mock
    (service as any).simpleImageGenerator = mockImageGenerator;
  });

  describe('getStylePresets', () => {
    it('should return available style presets', () => {
      const presets = service.getStylePresets();
      
      expect(presets).toHaveLength(5);
      expect(presets[0]).toEqual({
        name: 'Clean Minimal',
        description: 'Clean lines with minimal visual elements',
        style: {
          lineWeight: 'thin',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: false
        },
        recommendedFor: ['equation', 'diagram']
      });
    });

    it('should include all expected preset types', () => {
      const presets = service.getStylePresets();
      const presetNames = presets.map(p => p.name);
      
      expect(presetNames).toContain('Clean Minimal');
      expect(presetNames).toContain('Bold Educational');
      expect(presetNames).toContain('Balanced Standard');
      expect(presetNames).toContain('Colorful Concept');
      expect(presetNames).toContain('Step-by-Step');
    });
  });

  describe('generatePreview', () => {
    const mockRequest: RegenerationRequest = {
      imageId: 'test-image-1',
      newStyle: {
        lineWeight: 'thick',
        colorScheme: 'minimal-color',
        layout: 'vertical',
        annotations: false
      }
    };

    beforeEach(() => {
      // Mock the getOriginalImage method
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue(mockGeneratedImage);
    });

    it('should generate preview with new style', async () => {
      const preview = await service.generatePreview(mockRequest);
      
      expect(preview).toBeDefined();
      expect(preview.imageId).toBe(mockRequest.imageId);
      expect(preview.previewImage).toBeDefined();
      expect(preview.estimatedQuality).toBeGreaterThan(0);
      expect(preview.styleComparison).toBeDefined();
    });

    it('should compare styles correctly', async () => {
      const preview = await service.generatePreview(mockRequest);
      
      expect(preview.styleComparison.originalStyle).toEqual(mockGeneratedImage.metadata.style);
      expect(preview.styleComparison.newStyle).toEqual(mockRequest.newStyle);
      expect(preview.styleComparison.differences).toHaveLength(4); // All properties changed
      expect(preview.styleComparison.impact).toBe('high');
    });

    it('should estimate quality based on changes', async () => {
      const preview = await service.generatePreview(mockRequest);
      
      // Quality should be reasonable (between 0 and 1)
      expect(preview.estimatedQuality).toBeGreaterThanOrEqual(0);
      expect(preview.estimatedQuality).toBeLessThanOrEqual(1);
    });

    it('should throw error for non-existent image', async () => {
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue(null);
      
      await expect(service.generatePreview(mockRequest)).rejects.toThrow(
        'Image with ID test-image-1 not found'
      );
    });
  });

  describe('regenerateImage', () => {
    const mockRequest: RegenerationRequest = {
      imageId: 'test-image-1',
      newStyle: {
        lineWeight: 'thick',
        colorScheme: 'monochrome',
        layout: 'grid',
        annotations: true
      }
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue(mockGeneratedImage);
    });

    it('should regenerate image successfully', async () => {
      const result = await service.regenerateImage(mockRequest);
      
      expect(result.success).toBe(true);
      expect(result.imageId).toBe(mockRequest.imageId);
      expect(result.originalImage).toBeDefined();
      expect(result.regeneratedImage).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should generate preview only when requested', async () => {
      const previewRequest = { ...mockRequest, previewOnly: true };
      const result = await service.regenerateImage(previewRequest);
      
      expect(result.success).toBe(true);
      expect(result.previewImage).toBeDefined();
      expect(result.regeneratedImage).toBeUndefined();
    });

    it('should handle regeneration errors gracefully', async () => {
      mockImageGenerator.generateFlatLineImage.mockRejectedValue(new Error('Generation failed'));
      
      const result = await service.regenerateImage(mockRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
      expect(result.regeneratedImage).toBeUndefined();
    });

    it('should call image generator with correct parameters', async () => {
      await service.regenerateImage(mockRequest);
      
      expect(mockImageGenerator.generateFlatLineImage).toHaveBeenCalledWith({
        type: 'equation',
        content: 'x = y + z',
        context: 'x = y + z',
        style: mockRequest.newStyle,
        dimensions: { width: 400, height: 300 }
      });
    });
  });

  describe('regenerateImagesBatch', () => {
    const mockBatchRequest: BatchRegenerationRequest = {
      imageIds: ['image-1', 'image-2', 'image-3'],
      style: {
        lineWeight: 'medium',
        colorScheme: 'minimal-color',
        layout: 'horizontal',
        annotations: true
      },
      options: {
        preserveContent: true,
        generatePreview: false
      }
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue(mockGeneratedImage);
      // Mock setTimeout to avoid delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should process all images in batch', async () => {
      const result = await service.regenerateImagesBatch(mockBatchRequest);
      
      expect(result.totalProcessed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it('should handle partial failures in batch', async () => {
      // Make the second image fail
      let callCount = 0;
      mockImageGenerator.generateFlatLineImage.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Generation failed'));
        }
        return Promise.resolve(mockGeneratedImage);
      });

      const result = await service.regenerateImagesBatch(mockBatchRequest);
      
      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Generation failed');
    });

    it('should include processing time for batch operation', async () => {
      const result = await service.regenerateImagesBatch(mockBatchRequest);
      
      expect(result.totalProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('style comparison', () => {
    it('should identify all style differences', () => {
      const originalStyle: FlatLineStyle = {
        lineWeight: 'thin',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: false
      };

      const newStyle: FlatLineStyle = {
        lineWeight: 'thick',
        colorScheme: 'minimal-color',
        layout: 'vertical',
        annotations: true
      };

      const comparison = (service as any).compareStyles(originalStyle, newStyle);
      
      expect(comparison.differences).toHaveLength(4);
      expect(comparison.impact).toBe('high');
      
      const propertyNames = comparison.differences.map((d: any) => d.property);
      expect(propertyNames).toContain('lineWeight');
      expect(propertyNames).toContain('colorScheme');
      expect(propertyNames).toContain('layout');
      expect(propertyNames).toContain('annotations');
    });

    it('should calculate impact levels correctly', () => {
      const originalStyle: FlatLineStyle = {
        lineWeight: 'thin',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: false
      };

      // Low impact - only line weight change
      const lowImpactStyle: FlatLineStyle = {
        ...originalStyle,
        lineWeight: 'medium'
      };

      // Medium impact - layout change
      const mediumImpactStyle: FlatLineStyle = {
        ...originalStyle,
        layout: 'vertical'
      };

      // High impact - multiple changes
      const highImpactStyle: FlatLineStyle = {
        lineWeight: 'thick',
        colorScheme: 'minimal-color',
        layout: 'grid',
        annotations: true
      };

      const lowComparison = (service as any).compareStyles(originalStyle, lowImpactStyle);
      const mediumComparison = (service as any).compareStyles(originalStyle, mediumImpactStyle);
      const highComparison = (service as any).compareStyles(originalStyle, highImpactStyle);

      expect(lowComparison.impact).toBe('low');
      expect(mediumComparison.impact).toBe('medium');
      expect(highComparison.impact).toBe('high');
    });
  });

  describe('quality estimation', () => {
    it('should estimate higher quality for beneficial changes', () => {
      const styleComparison = {
        originalStyle: {
          lineWeight: 'thin' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: false
        },
        newStyle: {
          lineWeight: 'thick' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: true
        },
        differences: [
          {
            property: 'lineWeight' as const,
            originalValue: 'thin',
            newValue: 'thick',
            description: 'Line weight changed from thin to thick'
          },
          {
            property: 'annotations' as const,
            originalValue: false,
            newValue: true,
            description: 'Annotations enabled'
          }
        ],
        impact: 'medium' as const
      };

      const quality = (service as any).estimateQuality(styleComparison);
      
      // Should be higher than base quality due to beneficial changes
      expect(quality).toBeGreaterThan(0.8);
    });

    it('should estimate lower quality for potentially harmful changes', () => {
      const styleComparison = {
        originalStyle: {
          lineWeight: 'medium' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: true
        },
        newStyle: {
          lineWeight: 'thin' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: false
        },
        differences: [
          {
            property: 'lineWeight' as const,
            originalValue: 'medium',
            newValue: 'thin',
            description: 'Line weight changed from medium to thin'
          },
          {
            property: 'annotations' as const,
            originalValue: true,
            newValue: false,
            description: 'Annotations disabled'
          }
        ],
        impact: 'medium' as const
      };

      const quality = (service as any).estimateQuality(styleComparison);
      
      // Should be lower than base quality due to potentially harmful changes
      expect(quality).toBeLessThan(0.8);
    });
  });

  describe('cache management', () => {
    it('should clear preview cache', () => {
      service.clearPreviewCache();
      
      const stats = service.getCacheStats();
      expect(stats.previewCache).toBe(0);
    });

    it('should clear image cache', () => {
      service.clearImageCache();
      
      const stats = service.getCacheStats();
      expect(stats.imageCache).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('imageCache');
      expect(stats).toHaveProperty('previewCache');
      expect(typeof stats.imageCache).toBe('number');
      expect(typeof stats.previewCache).toBe('number');
    });
  });
});