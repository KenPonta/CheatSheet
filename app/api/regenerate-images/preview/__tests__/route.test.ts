import { NextRequest } from 'next/server';
import { POST, DELETE } from '../route';
import { getImageRegenerationService } from '@/backend/lib/ai/image-regeneration-service';

// Mock the image regeneration service
jest.mock('@/backend/lib/ai/image-regeneration-service');

const mockImageRegenerationService = {
  generatePreview: jest.fn(),
  clearPreviewCache: jest.fn()
};

(getImageRegenerationService as jest.Mock).mockReturnValue(mockImageRegenerationService);

describe('/api/regenerate-images/preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should generate image preview successfully', async () => {
      const mockPreview = {
        imageId: 'test-image-1',
        previewImage: {
          id: 'preview-1',
          svgContent: '<svg><rect width="100" height="100"/></svg>',
          base64: 'data:image/svg+xml;base64,PHN2Zz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjwvc3ZnPg==',
          dimensions: { width: 400, height: 300 },
          metadata: {
            type: 'equation',
            content: 'x = y + z',
            style: {
              lineWeight: 'thick',
              colorScheme: 'minimal-color',
              layout: 'vertical',
              annotations: true
            },
            generatedAt: new Date()
          }
        },
        estimatedQuality: 0.85,
        styleComparison: {
          originalStyle: {
            lineWeight: 'medium',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: true
          },
          newStyle: {
            lineWeight: 'thick',
            colorScheme: 'minimal-color',
            layout: 'vertical',
            annotations: true
          },
          differences: [
            {
              property: 'lineWeight',
              originalValue: 'medium',
              newValue: 'thick',
              description: 'Line weight changed from medium to thick'
            },
            {
              property: 'colorScheme',
              originalValue: 'monochrome',
              newValue: 'minimal-color',
              description: 'Color scheme changed from monochrome to minimal-color'
            },
            {
              property: 'layout',
              originalValue: 'horizontal',
              newValue: 'vertical',
              description: 'Layout changed from horizontal to vertical'
            }
          ],
          impact: 'high'
        }
      };

      mockImageRegenerationService.generatePreview.mockResolvedValue(mockPreview);

      const request = new NextRequest('http://localhost:3000/api/regenerate-images/preview', {
        method: 'POST',
        body: JSON.stringify({
          imageId: 'test-image-1',
          newStyle: {
            lineWeight: 'thick',
            colorScheme: 'minimal-color',
            layout: 'vertical',
            annotations: true
          }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPreview);
      expect(mockImageRegenerationService.generatePreview).toHaveBeenCalledWith({
        imageId: 'test-image-1',
        newStyle: {
          lineWeight: 'thick',
          colorScheme: 'minimal-color',
          layout: 'vertical',
          annotations: true
        },
        newContent: undefined,
        newContext: undefined,
        newDimensions: undefined,
        previewOnly: true
      });
    });

    it('should handle preview generation with custom content', async () => {
      const mockPreview = {
        imageId: 'test-image-2',
        previewImage: {
          id: 'preview-2',
          svgContent: '<svg><circle cx="50" cy="50" r="40"/></svg>',
          base64: 'data:image/svg+xml;base64,PHN2Zz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIvPjwvc3ZnPg==',
          dimensions: { width: 500, height: 400 },
          metadata: {
            type: 'concept',
            content: 'Custom concept diagram',
            style: {
              lineWeight: 'medium',
              colorScheme: 'monochrome',
              layout: 'grid',
              annotations: false
            },
            generatedAt: new Date()
          }
        },
        estimatedQuality: 0.92,
        styleComparison: {
          originalStyle: {
            lineWeight: 'thin',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: true
          },
          newStyle: {
            lineWeight: 'medium',
            colorScheme: 'monochrome',
            layout: 'grid',
            annotations: false
          },
          differences: [
            {
              property: 'lineWeight',
              originalValue: 'thin',
              newValue: 'medium',
              description: 'Line weight changed from thin to medium'
            },
            {
              property: 'layout',
              originalValue: 'horizontal',
              newValue: 'grid',
              description: 'Layout changed from horizontal to grid'
            },
            {
              property: 'annotations',
              originalValue: true,
              newValue: false,
              description: 'Annotations disabled'
            }
          ],
          impact: 'medium'
        }
      };

      mockImageRegenerationService.generatePreview.mockResolvedValue(mockPreview);

      const request = new NextRequest('http://localhost:3000/api/regenerate-images/preview', {
        method: 'POST',
        body: JSON.stringify({
          imageId: 'test-image-2',
          newStyle: {
            lineWeight: 'medium',
            colorScheme: 'monochrome',
            layout: 'grid',
            annotations: false
          },
          newContent: 'Custom concept diagram',
          newContext: 'Educational material context',
          newDimensions: { width: 500, height: 400 }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPreview);
      expect(mockImageRegenerationService.generatePreview).toHaveBeenCalledWith({
        imageId: 'test-image-2',
        newStyle: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'grid',
          annotations: false
        },
        newContent: 'Custom concept diagram',
        newContext: 'Educational material context',
        newDimensions: { width: 500, height: 400 },
        previewOnly: true
      });
    });

    it('should handle preview generation errors', async () => {
      mockImageRegenerationService.generatePreview.mockRejectedValue(
        new Error('Image not found')
      );

      const request = new NextRequest('http://localhost:3000/api/regenerate-images/preview', {
        method: 'POST',
        body: JSON.stringify({
          imageId: 'non-existent-image',
          newStyle: {
            lineWeight: 'medium',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: true
          }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Image not found');
    });

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/regenerate-images/preview', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unexpected token');
    });
  });

  describe('DELETE', () => {
    it('should clear preview cache successfully', async () => {
      mockImageRegenerationService.clearPreviewCache.mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/regenerate-images/preview', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Preview cache cleared');
      expect(mockImageRegenerationService.clearPreviewCache).toHaveBeenCalled();
    });

    it('should handle cache clear errors', async () => {
      mockImageRegenerationService.clearPreviewCache.mockImplementation(() => {
        throw new Error('Cache clear failed');
      });

      const request = new NextRequest('http://localhost:3000/api/regenerate-images/preview', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cache clear failed');
    });
  });
});