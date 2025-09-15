import { ImageRegenerationService } from '../image-regeneration-service';
import { SimpleImageGenerator } from '../simple-image-generator';

// Mock dependencies
jest.mock('../simple-image-generator');
jest.mock('../image-recreation-service', () => ({
  getImageRecreationService: () => ({})
}));

// Integration test for image regeneration functionality
describe('Image Regeneration Integration', () => {
  let service: ImageRegenerationService;

  beforeEach(() => {
    service = new ImageRegenerationService();
  });

  describe('End-to-End Workflow', () => {
    it('should complete full regeneration workflow', async () => {
      // 1. Get available style presets
      const presets = service.getStylePresets();
      expect(presets).toHaveLength(5);
      expect(presets[0].name).toBe('Clean Minimal');

      // 2. Generate preview with a preset style
      const mockRequest = {
        imageId: 'test-image-1',
        newStyle: presets[0].style
      };

      // Mock the internal methods for this integration test
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue({
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
      });

      const mockGenerator = {
        generateFlatLineImage: jest.fn().mockResolvedValue({
          id: 'regenerated-image-1',
          svgContent: '<svg><rect width="200" height="200"/></svg>',
          base64: 'data:image/svg+xml;base64,PHN2Zz48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjwvc3ZnPg==',
          dimensions: { width: 400, height: 300 },
          metadata: {
            type: 'equation',
            content: 'x = y + z',
            style: presets[0].style,
            generatedAt: new Date()
          }
        })
      };

      (service as any).simpleImageGenerator = mockGenerator;

      const preview = await service.generatePreview(mockRequest);
      
      expect(preview).toBeDefined();
      expect(preview.imageId).toBe('test-image-1');
      expect(preview.estimatedQuality).toBeGreaterThan(0);
      expect(preview.styleComparison.impact).toBeDefined();

      // 3. Regenerate the actual image
      const regenerationResult = await service.regenerateImage({
        ...mockRequest,
        previewOnly: false
      });

      expect(regenerationResult.success).toBe(true);
      expect(regenerationResult.regeneratedImage).toBeDefined();
      expect(regenerationResult.regeneratedImage?.metadata.style).toEqual(presets[0].style);
    });

    it('should handle batch regeneration workflow', async () => {
      const imageIds = ['image-1', 'image-2', 'image-3'];
      const selectedStyle = service.getStylePresets()[1].style; // Bold Educational

      // Mock dependencies
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue({
        id: 'mock-image',
        svgContent: '<svg></svg>',
        base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        dimensions: { width: 400, height: 300 },
        metadata: {
          type: 'concept',
          content: 'Mock content',
          style: {
            lineWeight: 'thin',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: false
          },
          generatedAt: new Date()
        }
      });

      const mockGenerator = {
        generateFlatLineImage: jest.fn().mockResolvedValue({
          id: 'regenerated-mock',
          svgContent: '<svg></svg>',
          base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
          dimensions: { width: 400, height: 300 },
          metadata: {
            type: 'concept',
            content: 'Mock content',
            style: selectedStyle,
            generatedAt: new Date()
          }
        })
      };

      (service as any).simpleImageGenerator = mockGenerator;

      const batchResult = await service.regenerateImagesBatch({
        imageIds,
        style: selectedStyle,
        options: { preserveContent: true }
      });

      expect(batchResult.totalProcessed).toBe(3);
      expect(batchResult.successCount).toBe(3);
      expect(batchResult.failureCount).toBe(0);
      expect(batchResult.results).toHaveLength(3);
      
      // Verify all images were processed with the correct style
      batchResult.results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.regeneratedImage?.metadata.style).toEqual(selectedStyle);
      });
    });

    it('should handle errors gracefully in workflow', async () => {
      const mockRequest = {
        imageId: 'failing-image',
        newStyle: service.getStylePresets()[0].style
      };

      // Mock failure scenario
      jest.spyOn(service as any, 'getOriginalImage').mockResolvedValue({
        id: 'failing-image',
        svgContent: '<svg></svg>',
        base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        dimensions: { width: 400, height: 300 },
        metadata: {
          type: 'equation',
          content: 'Failing equation',
          style: {
            lineWeight: 'medium',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: true
          },
          generatedAt: new Date()
        }
      });

      const mockGenerator = {
        generateFlatLineImage: jest.fn().mockRejectedValue(new Error('Generation failed'))
      };

      (service as any).simpleImageGenerator = mockGenerator;

      const result = await service.regenerateImage(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
      expect(result.regeneratedImage).toBeUndefined();
    });
  });

  describe('Style Preset Validation', () => {
    it('should have valid style presets for all content types', () => {
      const presets = service.getStylePresets();
      const contentTypes = ['equation', 'concept', 'example', 'diagram'];

      contentTypes.forEach(contentType => {
        const applicablePresets = presets.filter(preset => 
          preset.recommendedFor.includes(contentType)
        );
        expect(applicablePresets.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent style properties across presets', () => {
      const presets = service.getStylePresets();
      const requiredProperties = ['lineWeight', 'colorScheme', 'layout', 'annotations'];

      presets.forEach(preset => {
        requiredProperties.forEach(prop => {
          expect(preset.style).toHaveProperty(prop);
        });
      });
    });
  });

  describe('Cache Management', () => {
    it('should manage cache lifecycle correctly', () => {
      // Initial state
      let stats = service.getCacheStats();
      expect(stats.imageCache).toBe(0);
      expect(stats.previewCache).toBe(0);

      // Clear operations should not fail
      expect(() => service.clearImageCache()).not.toThrow();
      expect(() => service.clearPreviewCache()).not.toThrow();

      // Stats should still be accessible
      stats = service.getCacheStats();
      expect(stats).toHaveProperty('imageCache');
      expect(stats).toHaveProperty('previewCache');
    });
  });
});