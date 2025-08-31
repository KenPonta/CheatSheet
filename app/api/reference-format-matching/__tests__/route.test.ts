/**
 * Tests for reference format matching API endpoint
 */

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the format matcher
jest.mock('../../../../backend/lib/template/format-matcher');
jest.mock('../../../../backend/lib/template/content-density-analyzer');

describe('/api/reference-format-matching', () => {
  let mockFormatMatcher: any;
  let mockDensityAnalyzer: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock ReferenceFormatMatcher
    mockFormatMatcher = {
      matchFormat: jest.fn()
    };
    const MockFormatMatcher = require('../../../../backend/lib/template/format-matcher').ReferenceFormatMatcher;
    MockFormatMatcher.mockImplementation(() => mockFormatMatcher);

    // Mock ContentDensityAnalyzer
    mockDensityAnalyzer = {
      analyzeReferenceDensity: jest.fn(),
      analyzeUserContentDensity: jest.fn()
    };
    const MockDensityAnalyzer = require('../../../../backend/lib/template/content-density-analyzer').ContentDensityAnalyzer;
    MockDensityAnalyzer.mockImplementation(() => mockDensityAnalyzer);

    // Setup default successful responses
    mockFormatMatcher.matchFormat.mockResolvedValue({
      matchingScore: 0.85,
      matchedTemplate: {
        id: 'template_123',
        name: 'reference.pdf',
        analysis: {
          metadata: {
            complexity: 'moderate',
            domain: 'general',
            quality: { score: 0.8 }
          }
        }
      },
      adaptedContent: {
        topics: [
          {
            id: 'topic_1',
            title: 'Test Topic',
            content: 'Test content',
            priority: 'high'
          }
        ],
        adjustedForDensity: true,
        topicSelectionChanges: [
          {
            topicId: 'topic_1',
            action: 'modified',
            reason: 'Adjusted for density',
            densityImpact: 10
          }
        ]
      },
      contentDensityMatch: {
        referenceWordsPerPage: 400,
        userWordsPerPage: 350,
        densityRatio: 0.875,
        adjustmentsMade: [
          {
            type: 'content-expansion',
            description: 'Add more content',
            impact: 50,
            reason: 'Low density'
          }
        ],
        finalDensity: 400
      },
      layoutAdaptation: {
        structuralFidelity: 0.9,
        preservedElements: ['margins', 'typography'],
        modifiedElements: [
          {
            element: 'columns',
            originalValue: 1,
            adaptedValue: 2,
            reason: 'Better content distribution',
            impact: 'moderate'
          }
        ]
      },
      generatedCSS: {
        css: 'body { font-family: Arial; }',
        variables: { 'color-primary': '#000000' },
        classes: ['container', 'topic', 'subtopic'],
        mediaQueries: ['screen and (max-width: 768px)'],
        printStyles: '@media print { body { font-size: 10px; } }',
        matchFidelity: 0.95
      },
      warnings: [
        {
          type: 'density-mismatch',
          severity: 'medium',
          message: 'Content density differs from reference',
          affectedElements: ['content'],
          suggestion: 'Consider adjusting content volume'
        }
      ]
    });

    mockDensityAnalyzer.analyzeReferenceDensity.mockReturnValue({
      wordsPerPage: 400,
      topicsPerPage: 4,
      averageTopicLength: 100,
      contentDistribution: {
        headerRatio: 0.15,
        bodyRatio: 0.7,
        whitespaceRatio: 0.15,
        exampleRatio: 0
      },
      visualDensity: {
        textCoverage: 0.75,
        imageCoverage: 0,
        tableCoverage: 0,
        effectiveContentRatio: 0.75
      }
    });

    mockDensityAnalyzer.analyzeUserContentDensity.mockReturnValue({
      wordsPerPage: 350,
      topicsPerPage: 3,
      averageTopicLength: 117,
      contentDistribution: {
        headerRatio: 0.1,
        bodyRatio: 0.8,
        whitespaceRatio: 0.1,
        exampleRatio: 0
      },
      visualDensity: {
        textCoverage: 0.8,
        imageCoverage: 0,
        tableCoverage: 0,
        effectiveContentRatio: 0.8
      }
    });
  });

  describe('POST /api/reference-format-matching', () => {
    it('should successfully match reference format', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([
        {
          text: 'User content text',
          images: [],
          tables: [],
          metadata: { name: 'user.pdf', size: 1024, type: 'application/pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 1 }
        }
      ]));
      formData.append('userTopics', JSON.stringify([
        {
          id: 'topic_1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['user.pdf'],
          confidence: 0.9,
          priority: 'high',
          examples: [],
          originalWording: 'Test content',
          estimatedSpace: 100,
          isSelected: true
        }
      ]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.matchingResult).toBeDefined();
      expect(data.matchingResult.matchingScore).toBe(0.85);
      expect(data.densityAnalysis).toBeDefined();
      expect(data.template).toBeDefined();
      expect(data.metadata).toBeDefined();
    });

    it('should return error when reference file is missing', async () => {
      const formData = new FormData();
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Reference file is required');
    });

    it('should return error when user content is missing', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User content and topics are required');
    });

    it('should return error when user topics are missing', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User content and topics are required');
    });

    it('should return error for unsupported file type', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['text content'], 'reference.txt', { type: 'text/plain' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported reference file type');
      expect(data.supportedTypes).toBeDefined();
    });

    it('should return error for file too large', async () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join(''); // 11MB
      const formData = new FormData();
      formData.append('referenceFile', new File([largeContent], 'large.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Reference file too large');
      expect(data.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should handle invalid JSON in user content', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', 'invalid json');
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON format for user content or topics');
    });

    it('should handle invalid JSON in user topics', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', 'invalid json');

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON format for user content or topics');
    });

    it('should handle optional options parameter', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));
      formData.append('options', JSON.stringify({
        preserveContentFidelity: false,
        matchContentDensity: false
      }));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFormatMatcher.matchFormat).toHaveBeenCalledWith(
        expect.any(File),
        [],
        [],
        {
          preserveContentFidelity: false,
          matchContentDensity: false
        }
      );
    });

    it('should handle invalid options JSON gracefully', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));
      formData.append('options', 'invalid json');

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFormatMatcher.matchFormat).toHaveBeenCalledWith(
        expect.any(File),
        [],
        [],
        {} // Default options when parsing fails
      );
    });

    it('should handle format matching errors', async () => {
      mockFormatMatcher.matchFormat.mockRejectedValue(new Error('Format matching failed'));

      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to match reference format');
      expect(data.message).toBe('Format matching failed');
    });

    it('should handle TemplateProcessingError specifically', async () => {
      const TemplateProcessingError = require('../../../../backend/lib/template/types').TemplateProcessingError;
      const error = new TemplateProcessingError('Template processing failed', {
        code: 'APPLICATION_FAILED',
        retryable: true,
        details: { reason: 'Test error' }
      });

      mockFormatMatcher.matchFormat.mockRejectedValue(error);

      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Template processing failed');
      expect(data.code).toBe('APPLICATION_FAILED');
      expect(data.retryable).toBe(true);
      expect(data.details).toEqual({ reason: 'Test error' });
    });

    it('should include comprehensive response data', async () => {
      const formData = new FormData();
      formData.append('referenceFile', new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' }));
      formData.append('userContent', JSON.stringify([
        {
          text: 'User content',
          images: [],
          tables: [],
          metadata: { name: 'user.pdf', size: 1024, type: 'application/pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 1 }
        }
      ]));
      formData.append('userTopics', JSON.stringify([
        {
          id: 'topic_1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['user.pdf'],
          confidence: 0.9,
          priority: 'high',
          examples: [],
          originalWording: 'Test content',
          estimatedSpace: 100,
          isSelected: true
        }
      ]));

      const request = new NextRequest('http://localhost:3000/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Check matching result structure
      expect(data.matchingResult.matchingScore).toBe(0.85);
      expect(data.matchingResult.adaptedContent.topicCount).toBe(1);
      expect(data.matchingResult.contentDensityMatch.referenceWordsPerPage).toBe(400);
      expect(data.matchingResult.layoutAdaptation.structuralFidelity).toBe(0.9);
      expect(data.matchingResult.generatedCSS.matchFidelity).toBe(0.95);
      expect(data.matchingResult.warnings).toHaveLength(1);

      // Check density analysis structure
      expect(data.densityAnalysis.reference.wordsPerPage).toBe(400);
      expect(data.densityAnalysis.user.wordsPerPage).toBe(350);

      // Check template metadata
      expect(data.template.id).toBe('template_123');
      expect(data.template.name).toBe('reference.pdf');
      expect(data.template.complexity).toBe('moderate');

      // Check processing metadata
      expect(data.metadata.processingTime).toBeDefined();
      expect(data.metadata.referenceFileName).toBe('reference.pdf');
      expect(data.metadata.userContentFiles).toBe(1);
      expect(data.metadata.userTopicCount).toBe(1);
    });
  });

  describe('GET /api/reference-format-matching', () => {
    it('should return API documentation', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.endpoint).toBe('reference-format-matching');
      expect(data.description).toContain('reference template format');
      expect(data.methods).toContain('POST');
      expect(data.parameters).toBeDefined();
      expect(data.supportedFormats).toBeDefined();
      expect(data.maxFileSize).toBe('10MB');
      expect(data.options).toBeDefined();
      expect(data.features).toBeInstanceOf(Array);
      expect(data.responseStructure).toBeDefined();
    });

    it('should document all required parameters', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.parameters.referenceFile).toContain('reference template');
      expect(data.parameters.userContent).toContain('ExtractedContent');
      expect(data.parameters.userTopics).toContain('OrganizedTopic');
      expect(data.parameters.options).toContain('optional');
    });

    it('should document all supported file formats', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.supportedFormats).toContain('application/pdf');
      expect(data.supportedFormats).toContain('image/jpeg');
      expect(data.supportedFormats).toContain('image/png');
      expect(data.supportedFormats).toContain('image/gif');
      expect(data.supportedFormats).toContain('image/bmp');
    });

    it('should document all available options', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.options.preserveContentFidelity).toContain('boolean');
      expect(data.options.allowLayoutModifications).toContain('boolean');
      expect(data.options.matchContentDensity).toContain('boolean');
      expect(data.options.adaptTypography).toContain('boolean');
      expect(data.options.maintainVisualHierarchy).toContain('boolean');
    });

    it('should document key features', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.features).toContain('Reference template analysis and format extraction');
      expect(data.features).toContain('Content density matching and optimization');
      expect(data.features).toContain('Layout adaptation with structural preservation');
      expect(data.features).toContain('CSS generation matching reference visual elements');
    });
  });
});