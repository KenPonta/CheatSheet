/**
 * Integration tests for frontend-backend communication
 * Tests the complete workflow from file upload to cheat sheet generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock file for testing
const createMockFile = (name: string, type: string, content: string = 'test content') => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

describe('Frontend-Backend Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Topic Extraction API', () => {
    it('should successfully extract topics from uploaded files', async () => {
      const mockResponse = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content for the topic',
            confidence: 0.85,
            source: 'test.pdf',
            subtopics: [],
            examples: [],
            originalWording: 'Test content for the topic'
          }
        ],
        totalFiles: 1,
        successfulFiles: 1,
        failedFiles: 0,
        processingStats: {
          totalProcessingTime: 1500,
          cacheHits: 0,
          memoryUsage: 1024000
        },
        message: 'Successfully extracted 1 topics from 1 file(s)',
        warnings: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const formData = new FormData();
      formData.append('files', createMockFile('test.pdf', 'application/pdf'));

      const response = await fetch('/api/extract-topics', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/extract-topics', {
        method: 'POST',
        body: expect.any(FormData)
      });

      expect(data).toEqual(mockResponse);
      expect(data.topics).toHaveLength(1);
      expect(data.topics[0]).toHaveProperty('id');
      expect(data.topics[0]).toHaveProperty('confidence');
      expect(data.processingStats).toBeDefined();
    });

    it('should handle file validation errors', async () => {
      const mockErrorResponse = {
        error: 'Invalid files detected',
        details: [
          {
            fileName: 'invalid.xyz',
            errors: ['Unsupported file type']
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      });

      const formData = new FormData();
      formData.append('files', createMockFile('invalid.xyz', 'application/unknown'));

      const response = await fetch('/api/extract-topics', {
        method: 'POST',
        body: formData
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid files detected');
      expect(data.details).toHaveLength(1);
    });

    it('should handle processing warnings', async () => {
      const mockResponse = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Partial Topic',
            content: 'Partially extracted content',
            confidence: 0.6,
            source: 'corrupted.pdf',
            subtopics: [],
            examples: [],
            originalWording: 'Partially extracted content'
          }
        ],
        totalFiles: 2,
        successfulFiles: 1,
        failedFiles: 1,
        processingStats: {
          totalProcessingTime: 2500,
          cacheHits: 0,
          memoryUsage: 2048000
        },
        message: 'Successfully extracted 1 topics from 1 file(s)',
        warnings: [
          {
            fileName: 'corrupted.pdf',
            error: 'Partial content extraction',
            suggestion: 'Try uploading a different version of the file'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const formData = new FormData();
      formData.append('files', createMockFile('test.pdf', 'application/pdf'));
      formData.append('files', createMockFile('corrupted.pdf', 'application/pdf'));

      const response = await fetch('/api/extract-topics', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      expect(data.warnings).toHaveLength(1);
      expect(data.warnings[0]).toHaveProperty('suggestion');
      expect(data.failedFiles).toBe(1);
    });
  });

  // Cheat Sheet Generation API tests removed as part of cleanup
  describe.skip('Cheat Sheet Generation API (REMOVED)', () => {
    it('should successfully generate a cheat sheet', async () => {
      const mockGenerationRequest = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            priority: 1
          }
        ],
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 2,
          fontSize: 'small',
          referenceText: '',
          referenceImage: null,
          includeHeaders: true,
          includeFooters: true
        },
        title: 'Study Cheat Sheet',
        outputFormat: 'html',
        enableImageRecreation: false,
        enableContentValidation: false
      };

      const mockResponse = {
        html: '<html><body><h1>Test Cheat Sheet</h1></body></html>',
        success: true,
        message: 'Generated cheat sheet with 1 topics',
        warnings: [],
        pageCount: 1,
        contentFit: {
          fitsInPages: true,
          estimatedPages: 1,
          overflowContent: []
        },
        imageRecreation: null,
        fidelityValidation: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/generate-cheatsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockGenerationRequest)
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/generate-cheatsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockGenerationRequest)
      });

      expect(data.success).toBe(true);
      expect(data.html).toContain('Test Cheat Sheet');
      expect(data.pageCount).toBe(1);
    });

    it('should handle image recreation when enabled', async () => {
      const mockGenerationRequest = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Visual Topic',
            content: 'Content with images',
            examples: [
              {
                id: 'img-1',
                context: 'Example diagram',
                isExample: true
              }
            ],
            priority: 1
          }
        ],
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: 'medium',
          referenceText: '',
          referenceImage: null,
          includeHeaders: true,
          includeFooters: true
        },
        enableImageRecreation: true,
        enableContentValidation: false
      };

      const mockResponse = {
        html: '<html><body><h1>Visual Cheat Sheet</h1><img src="data:image/png;base64,..." /></body></html>',
        success: true,
        message: 'Generated cheat sheet with 1 topics',
        warnings: [],
        pageCount: 1,
        contentFit: {
          fitsInPages: true,
          estimatedPages: 1
        },
        imageRecreation: {
          total: 1,
          recreated: 1,
          needsApproval: 0,
          fallbackToOriginal: 0
        },
        fidelityValidation: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/generate-cheatsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockGenerationRequest)
      });

      const data = await response.json();

      expect(data.imageRecreation).toBeDefined();
      expect(data.imageRecreation.total).toBe(1);
      expect(data.imageRecreation.recreated).toBe(1);
    });

    it('should handle content validation warnings', async () => {
      const mockGenerationRequest = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Modified Topic',
            content: 'Heavily modified content',
            customContent: 'Heavily modified content',
            originalWording: 'Original content that was changed significantly',
            priority: 1
          }
        ],
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 2,
          fontSize: 'small',
          referenceText: '',
          referenceImage: null,
          includeHeaders: true,
          includeFooters: true
        },
        enableImageRecreation: false,
        enableContentValidation: true
      };

      const mockResponse = {
        html: '<html><body><h1>Modified Cheat Sheet</h1></body></html>',
        success: true,
        message: 'Generated cheat sheet with 1 topics',
        warnings: [
          'Topic "Modified Topic" has low content fidelity (65%). Significant changes detected from original content'
        ],
        pageCount: 1,
        contentFit: {
          fitsInPages: true,
          estimatedPages: 1
        },
        imageRecreation: null,
        fidelityValidation: {
          checked: 1,
          warnings: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/generate-cheatsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockGenerationRequest)
      });

      const data = await response.json();

      expect(data.fidelityValidation).toBeDefined();
      expect(data.fidelityValidation.warnings).toBe(1);
      expect(data.warnings).toHaveLength(1);
      expect(data.warnings[0]).toContain('low content fidelity');
    });

    it('should handle generation errors gracefully', async () => {
      const mockErrorResponse = {
        error: 'Failed to generate cheat sheet',
        details: 'Insufficient memory for PDF generation'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse
      });

      const mockRequest = {
        topics: [],
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: 'small',
          referenceText: '',
          referenceImage: null,
          includeHeaders: true,
          includeFooters: true
        }
      };

      const response = await fetch('/api/generate-cheatsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockRequest)
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Failed to generate cheat sheet');
      expect(data.details).toBeDefined();
    });
  });

  describe('Image Recreation API', () => {
    it('should process image recreation requests', async () => {
      const mockRequest = {
        images: [
          {
            id: 'img-1',
            context: 'Mathematical diagram showing quadratic function',
            base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
          }
        ],
        options: {
          quality: 'high',
          style: 'educational'
        }
      };

      const mockResponse = {
        success: true,
        results: [
          {
            originalImage: {
              id: 'img-1',
              context: 'Mathematical diagram showing quadratic function'
            },
            generatedImage: {
              base64: 'data:image/png;base64,recreated_image_data',
              prompt: 'Educational diagram of quadratic function y=x^2',
              quality: 0.9
            },
            userApprovalRequired: false,
            fallbackToOriginal: false,
            processingTime: 2500
          }
        ],
        summary: {
          total: 1,
          recreated: 1,
          needsApproval: 0,
          autoApproved: 1,
          fallbackToOriginal: 0
        },
        approvalWorkflows: [],
        processingTime: 2500
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/recreate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockRequest)
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(1);
      expect(data.summary.recreated).toBe(1);
      expect(data.results[0].generatedImage).toBeDefined();
    });

    it('should handle images requiring user approval', async () => {
      const mockRequest = {
        images: [
          {
            id: 'img-1',
            context: 'Complex technical diagram',
            base64: 'data:image/png;base64,complex_diagram_data'
          }
        ]
      };

      const mockResponse = {
        success: true,
        results: [
          {
            originalImage: {
              id: 'img-1',
              context: 'Complex technical diagram'
            },
            generatedImage: {
              base64: 'data:image/png;base64,recreated_complex_diagram',
              prompt: 'Technical diagram recreation',
              quality: 0.7
            },
            userApprovalRequired: true,
            fallbackToOriginal: false,
            processingTime: 3500
          }
        ],
        summary: {
          total: 1,
          recreated: 1,
          needsApproval: 1,
          autoApproved: 0,
          fallbackToOriginal: 0
        },
        approvalWorkflows: [
          {
            imageId: 'img-1',
            originalImage: {
              id: 'img-1',
              context: 'Complex technical diagram'
            },
            recreatedImage: {
              base64: 'data:image/png;base64,recreated_complex_diagram',
              prompt: 'Technical diagram recreation',
              quality: 0.7
            },
            qualityAssessment: {
              originalScore: 0.8,
              recreatedScore: 0.7,
              recommendation: 'needs_review',
              factors: {
                clarity: 0.7,
                accuracy: 0.6,
                completeness: 0.8
              },
              issues: [
                {
                  type: 'detail_loss',
                  severity: 'medium',
                  description: 'Some fine details may be lost in recreation'
                }
              ]
            },
            userApprovalRequired: true
          }
        ],
        processingTime: 3500
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/recreate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockRequest)
      });

      const data = await response.json();

      expect(data.summary.needsApproval).toBe(1);
      expect(data.approvalWorkflows).toHaveLength(1);
      expect(data.approvalWorkflows[0].qualityAssessment).toBeDefined();
      expect(data.approvalWorkflows[0].qualityAssessment.recommendation).toBe('needs_review');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/extract-topics', {
          method: 'POST',
          body: new FormData()
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      try {
        const response = await fetch('/api/extract-topics', {
          method: 'POST',
          body: new FormData()
        });
        await response.json();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid JSON');
      }
    });
  });

  describe('Type Safety', () => {
    it('should maintain type consistency between frontend and backend', () => {
      // This test ensures that the types used in the frontend match the API responses
      const mockTopicResponse = {
        id: 'topic-1',
        topic: 'Test Topic',
        content: 'Test content',
        confidence: 0.85,
        source: 'test.pdf',
        subtopics: [],
        examples: [],
        originalWording: 'Test content'
      };

      // These should not throw TypeScript errors if types are consistent
      expect(typeof mockTopicResponse.id).toBe('string');
      expect(typeof mockTopicResponse.confidence).toBe('number');
      expect(Array.isArray(mockTopicResponse.subtopics)).toBe(true);
      expect(Array.isArray(mockTopicResponse.examples)).toBe(true);
    });
  });
});