import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { getImageRecreationService } from '@/backend/lib/ai';
import type { ImageRecreationResult, ExtractedImage } from '@/backend/lib/ai/types';

// Mock the image recreation service
const mockRecreateImages = jest.fn();
const mockCreateApprovalWorkflow = jest.fn();

jest.mock('@/backend/lib/ai', () => ({
  getImageRecreationService: jest.fn(() => ({
    recreateImages: mockRecreateImages,
    createApprovalWorkflow: mockCreateApprovalWorkflow
  }))
}));

describe('/api/recreate-images', () => {

  const mockExtractedImage: ExtractedImage = {
    id: 'test-image-1',
    base64: 'data:image/png;base64,test',
    context: 'Mathematical formula diagram',
    isExample: true,
    ocrText: 'x = (-b ± √(b²-4ac)) / 2a'
  };

  const mockRecreationResult: ImageRecreationResult = {
    originalImage: mockExtractedImage,
    generatedImage: {
      id: 'gen-1',
      url: 'data:image/svg+xml;base64,generated',
      base64: 'data:image/svg+xml;base64,generated',
      prompt: 'Clean mathematical formula',
      style: 'formula',
      generationTime: 2000,
      metadata: {
        model: 'simple-flat-line-generator',
        size: '1024x1024',
        quality: 'standard',
        flatLineType: 'equation',
        flatLineStyle: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: false
        }
      }
    },
    qualityAssessment: {
      originalScore: 0.6,
      recreatedScore: 0.85,
      recommendation: 'use_recreated',
      factors: {
        clarity: 0.8,
        relevance: 0.9,
        accuracy: 0.85,
        readability: 0.8
      },
      issues: []
    },
    userApprovalRequired: true,
    fallbackToOriginal: false,
    processingTime: 2000
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/recreate-images', () => {
    it('should process images and return results', async () => {
      const requestBody = {
        images: [mockExtractedImage],
        options: {}
      };

      mockRecreateImages.mockResolvedValue([mockRecreationResult]);
      mockCreateApprovalWorkflow.mockReturnValue({
        imageId: 'test-image-1',
        originalImage: mockExtractedImage,
        recreatedImage: mockRecreationResult.generatedImage,
        qualityAssessment: mockRecreationResult.qualityAssessment,
        timestamp: new Date()
      });

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(1);
      expect(data.results[0]).toEqual(mockRecreationResult);
      expect(data.summary.total).toBe(1);
      expect(data.summary.recreated).toBe(1);
      expect(data.summary.needsApproval).toBe(1);
      expect(data.summary.autoApproved).toBe(0);
      expect(data.approvalWorkflows).toHaveLength(1);
      expect(mockRecreateImages).toHaveBeenCalledWith([mockExtractedImage]);
    });

    it('should handle multiple images with mixed results', async () => {
      const images = [
        mockExtractedImage,
        { ...mockExtractedImage, id: 'test-image-2' }
      ];

      const results = [
        mockRecreationResult,
        {
          ...mockRecreationResult,
          originalImage: { ...mockExtractedImage, id: 'test-image-2' },
          userApprovalRequired: false,
          fallbackToOriginal: true
        }
      ];

      mockRecreateImages.mockResolvedValue(results);
      mockCreateApprovalWorkflow.mockReturnValue({
        imageId: 'test-image-1',
        originalImage: mockExtractedImage,
        recreatedImage: mockRecreationResult.generatedImage,
        qualityAssessment: mockRecreationResult.qualityAssessment,
        timestamp: new Date()
      });

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.total).toBe(2);
      expect(data.summary.needsApproval).toBe(1);
      expect(data.summary.autoApproved).toBe(1);
      expect(data.summary.fallbackToOriginal).toBe(1);
      expect(data.approvalWorkflows).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Images array is required');
    });

    it('should validate images array format', async () => {
      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: 'not-an-array' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Images array is required');
    });

    it('should validate individual image fields', async () => {
      const invalidImages = [
        { id: 'test-1' }, // missing context
        { context: 'test context' } // missing id
      ];

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: invalidImages }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Each image must have id and context');
    });

    it('should handle service errors gracefully', async () => {
      mockRecreateImages.mockRejectedValue(new Error('Service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: [mockExtractedImage] }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to recreate images');
      expect(data.details).toBe('Service unavailable');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to recreate images');
    });

    it('should calculate processing statistics correctly', async () => {
      const results = [
        { ...mockRecreationResult, processingTime: 1000 },
        { ...mockRecreationResult, processingTime: 2000, userApprovalRequired: false }
      ];

      mockRecreateImages.mockResolvedValue(results);

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: [mockExtractedImage, mockExtractedImage] }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.processingTime).toBe(3000); // Sum of processing times
      expect(data.summary.total).toBe(2);
      expect(data.summary.recreated).toBe(2); // Both have generated images
    });
  });

  describe('GET /api/recreate-images', () => {
    it('should require imageId parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/recreate-images');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('imageId parameter is required');
    });

    it('should return placeholder response for valid imageId', async () => {
      const request = new NextRequest('http://localhost:3000/api/recreate-images?imageId=test-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Image recreation status endpoint');
    });

    it('should handle errors in GET request', async () => {
      // Mock URL constructor to throw error
      const originalURL = global.URL;
      global.URL = jest.fn().mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      const request = new NextRequest('http://localhost:3000/api/recreate-images?imageId=test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get recreation status');

      // Restore original URL constructor
      global.URL = originalURL;
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty images array', async () => {
      mockRecreateImages.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: [] }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(0);
      expect(data.summary.total).toBe(0);
      expect(data.approvalWorkflows).toHaveLength(0);
    });

    it('should handle results without generated images', async () => {
      const resultWithoutGenerated = {
        ...mockRecreationResult,
        generatedImage: undefined,
        fallbackToOriginal: true,
        userApprovalRequired: false
      };

      mockRecreateImages.mockResolvedValue([resultWithoutGenerated]);

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: [mockExtractedImage] }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.recreated).toBe(0);
      expect(data.summary.fallbackToOriginal).toBe(1);
      expect(data.approvalWorkflows).toHaveLength(0);
    });

    it('should handle service returning null/undefined', async () => {
      mockRecreateImages.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/recreate-images', {
        method: 'POST',
        body: JSON.stringify({ images: [mockExtractedImage] }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to recreate images');
    });
  });
});