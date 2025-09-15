import { POST, GET } from '../route';
import { getImageRegenerationService } from '@/backend/lib/ai/image-regeneration-service';

// Mock the image regeneration service
jest.mock('@/backend/lib/ai/image-regeneration-service');

// Mock NextRequest
const createMockRequest = (url: string, options: any = {}) => ({
  json: () => Promise.resolve(options.body ? JSON.parse(options.body) : {}),
  url,
  method: options.method || 'GET'
});

const mockImageRegenerationService = {
  regenerateImage: jest.fn(),
  regenerateImagesBatch: jest.fn(),
  getStylePresets: jest.fn(),
  getCacheStats: jest.fn()
};

(getImageRegenerationService as jest.Mock).mockReturnValue(mockImageRegenerationService);

describe('/api/regenerate-images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should handle single image regeneration', async () => {
      const mockResult = {
        imageId: 'test-image-1',
        originalImage: { id: 'test-image-1' },
        regeneratedImage: { id: 'test-image-1-new' },
        success: true,
        processingTime: 1500
      };

      mockImageRegenerationService.regenerateImage.mockResolvedValue(mockResult);

      const request = createMockRequest('http://localhost:3000/api/regenerate-images', {
        method: 'POST',
        body: JSON.stringify({
          imageId: 'test-image-1',
          newStyle: {
            lineWeight: 'thick',
            colorScheme: 'monochrome',
            layout: 'vertical',
            annotations: true
          }
        })
      }) as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(mockImageRegenerationService.regenerateImage).toHaveBeenCalledWith({
        imageId: 'test-image-1',
        newStyle: {
          lineWeight: 'thick',
          colorScheme: 'monochrome',
          layout: 'vertical',
          annotations: true
        },
        newContent: undefined,
        newContext: undefined,
        newDimensions: undefined,
        previewOnly: false
      });
    });

    it('should handle batch image regeneration', async () => {
      const mockResult = {
        results: [
          { imageId: 'image-1', success: true, processingTime: 1000 },
          { imageId: 'image-2', success: true, processingTime: 1200 },
          { imageId: 'image-3', success: false, error: 'Generation failed', processingTime: 500 }
        ],
        totalProcessed: 3,
        successCount: 2,
        failureCount: 1,
        totalProcessingTime: 2700
      };

      mockImageRegenerationService.regenerateImagesBatch.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/regenerate-images', {
        method: 'POST',
        body: JSON.stringify({
          imageIds: ['image-1', 'image-2', 'image-3'],
          style: {
            lineWeight: 'medium',
            colorScheme: 'minimal-color',
            layout: 'grid',
            annotations: true
          },
          options: {
            preserveContent: true
          }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(mockImageRegenerationService.regenerateImagesBatch).toHaveBeenCalledWith({
        imageIds: ['image-1', 'image-2', 'image-3'],
        style: {
          lineWeight: 'medium',
          colorScheme: 'minimal-color',
          layout: 'grid',
          annotations: true
        },
        options: {
          preserveContent: true
        }
      });
    });

    it('should handle preview-only regeneration', async () => {
      const mockResult = {
        imageId: 'test-image-1',
        originalImage: { id: 'test-image-1' },
        previewImage: { id: 'test-image-1-preview' },
        success: true,
        processingTime: 800
      };

      mockImageRegenerationService.regenerateImage.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/regenerate-images', {
        method: 'POST',
        body: JSON.stringify({
          imageId: 'test-image-1',
          newStyle: {
            lineWeight: 'thin',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: false
          },
          previewOnly: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(mockImageRegenerationService.regenerateImage).toHaveBeenCalledWith({
        imageId: 'test-image-1',
        newStyle: {
          lineWeight: 'thin',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: false
        },
        newContent: undefined,
        newContext: undefined,
        newDimensions: undefined,
        previewOnly: true
      });
    });

    it('should return 400 for invalid request format', async () => {
      const request = new NextRequest('http://localhost:3000/api/regenerate-images', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request format');
    });

    it('should handle service errors', async () => {
      mockImageRegenerationService.regenerateImage.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/regenerate-images', {
        method: 'POST',
        body: JSON.stringify({
          imageId: 'test-image-1',
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
      expect(data.error).toBe('Service unavailable');
    });
  });

  describe('GET', () => {
    it('should return style presets', async () => {
      const mockPresets = [
        {
          name: 'Clean Minimal',
          description: 'Clean lines with minimal visual elements',
          style: {
            lineWeight: 'thin',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: false
          },
          recommendedFor: ['equation', 'diagram']
        },
        {
          name: 'Bold Educational',
          description: 'Thick lines with annotations for teaching',
          style: {
            lineWeight: 'thick',
            colorScheme: 'monochrome',
            layout: 'vertical',
            annotations: true
          },
          recommendedFor: ['example', 'concept']
        }
      ];

      mockImageRegenerationService.getStylePresets.mockReturnValue(mockPresets);

      const request = new NextRequest('http://localhost:3000/api/regenerate-images?action=presets');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPresets);
      expect(mockImageRegenerationService.getStylePresets).toHaveBeenCalled();
    });

    it('should return cache statistics', async () => {
      const mockStats = {
        imageCache: 15,
        previewCache: 8
      };

      mockImageRegenerationService.getCacheStats.mockReturnValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/regenerate-images?action=cache-stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(mockImageRegenerationService.getCacheStats).toHaveBeenCalled();
    });

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/regenerate-images?action=invalid');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action');
    });

    it('should handle service errors in GET requests', async () => {
      mockImageRegenerationService.getStylePresets.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/regenerate-images?action=presets');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });
  });
});