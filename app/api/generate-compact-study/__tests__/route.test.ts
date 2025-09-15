import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '../route';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200
    }))
  }
}));

// Mock the compact study library
jest.mock('@/backend/lib/compact-study', () => ({
  processCompactStudyDocuments: jest.fn(),
  generateCompactHTML: jest.fn(),
  PDFOutputGenerator: jest.fn(),
  generateCompactMarkdown: jest.fn()
}));

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('/api/generate-compact-study', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return health check status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        service: 'compact-study-generator',
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST', () => {
    const mockRequest = (body: any) => {
      return {
        json: async () => body,
        headers: new Map([['content-type', 'application/json']])
      } as NextRequest;
    };

    const validRequestData = {
      files: [
        {
          name: 'probability.pdf',
          type: 'probability' as const,
          content: 'base64encodedcontent'
        }
      ],
      config: {
        layout: 'compact' as const,
        columns: 2 as const,
        equations: 'all' as const,
        examples: 'full' as const,
        answers: 'inline' as const,
        fontSize: '10pt',
        margins: 'narrow' as const,
        outputFormat: 'html' as const,
        title: 'Test Study Guide'
      }
    };

    it('should return error for missing files', async () => {
      const request = mockRequest({
        files: [],
        config: validRequestData.config
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No files provided');
    });

    it('should return error for missing config', async () => {
      const request = mockRequest({
        files: validRequestData.files
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Configuration is required');
    });

    it('should process valid request and return HTML output', async () => {
      const { processCompactStudyDocuments, generateCompactHTML } = require('@/backend/lib/compact-study');
      
      // Mock successful processing
      const mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      };

      const mockHTMLOutput = {
        html: '<html><body>Test content</body></html>',
        css: 'body { font-size: 10pt; }',
        mathJaxConfig: {},
        metadata: {
          generatedAt: new Date(),
          format: 'html',
          sourceFiles: ['probability.pdf'],
          config: {},
          stats: {
            totalSections: 5,
            totalFormulas: 10,
            totalExamples: 3,
            estimatedPrintPages: 2
          },
          preservationScore: 0.95
        }
      };

      processCompactStudyDocuments.mockResolvedValue(mockAcademicDocument);
      generateCompactHTML.mockResolvedValue(mockHTMLOutput);

      const request = mockRequest(validRequestData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.html).toBe(mockHTMLOutput.html);
      expect(data.metadata.stats.totalSections).toBe(5);
      expect(data.metadata.stats.totalFormulas).toBe(10);
      expect(data.metadata.preservationScore).toBe(0.95);
    });

    it('should process PDF output format', async () => {
      const { processCompactStudyDocuments, PDFOutputGenerator } = require('@/backend/lib/compact-study');
      
      const mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      };

      const mockPDFOutput = {
        buffer: Buffer.from('mock pdf content'),
        pageCount: 2,
        metadata: {
          generatedAt: new Date(),
          format: 'pdf',
          sourceFiles: ['probability.pdf'],
          config: {},
          stats: {
            totalSections: 5,
            totalFormulas: 10,
            totalExamples: 3,
            estimatedPrintPages: 2
          },
          preservationScore: 0.95
        }
      };

      const mockPDFGenerator = {
        generatePDF: jest.fn().mockResolvedValue(mockPDFOutput)
      };

      processCompactStudyDocuments.mockResolvedValue(mockAcademicDocument);
      PDFOutputGenerator.mockImplementation(() => mockPDFGenerator);

      const request = mockRequest({
        ...validRequestData,
        config: {
          ...validRequestData.config,
          outputFormat: 'pdf'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pdf).toBe(mockPDFOutput.buffer.toString('base64'));
      expect(mockPDFGenerator.generatePDF).toHaveBeenCalled();
    });

    it('should process Markdown output format', async () => {
      const { processCompactStudyDocuments, generateCompactMarkdown } = require('@/backend/lib/compact-study');
      
      const mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      };

      const mockMarkdownOutput = {
        markdown: '# Test Study Guide\n\nContent here...',
        pandocTemplate: 'template content',
        metadata: {
          generatedAt: new Date(),
          format: 'markdown',
          sourceFiles: ['probability.pdf'],
          config: {},
          stats: {
            totalSections: 5,
            totalFormulas: 10,
            totalExamples: 3,
            estimatedPrintPages: 2
          },
          preservationScore: 0.95
        },
        frontMatter: '---\ntitle: Test\n---'
      };

      processCompactStudyDocuments.mockResolvedValue(mockAcademicDocument);
      generateCompactMarkdown.mockResolvedValue(mockMarkdownOutput);

      const request = mockRequest({
        ...validRequestData,
        config: {
          ...validRequestData.config,
          outputFormat: 'markdown'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.markdown).toBe(mockMarkdownOutput.markdown);
    });

    it('should handle all output formats', async () => {
      const { 
        processCompactStudyDocuments, 
        generateCompactHTML, 
        PDFOutputGenerator,
        generateCompactMarkdown 
      } = require('@/backend/lib/compact-study');
      
      const mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      };

      const mockMetadata = {
        generatedAt: new Date(),
        format: 'all',
        sourceFiles: ['probability.pdf'],
        config: {},
        stats: {
          totalSections: 5,
          totalFormulas: 10,
          totalExamples: 3,
          estimatedPrintPages: 2
        },
        preservationScore: 0.95
      };

      const mockHTMLOutput = {
        html: '<html>content</html>',
        css: 'body {}',
        mathJaxConfig: {},
        metadata: mockMetadata
      };

      const mockPDFOutput = {
        buffer: Buffer.from('pdf content'),
        pageCount: 2,
        metadata: mockMetadata
      };

      const mockMarkdownOutput = {
        markdown: '# Content',
        pandocTemplate: 'template',
        metadata: mockMetadata,
        frontMatter: '---\ntitle: Test\n---'
      };

      const mockPDFGenerator = {
        generatePDF: jest.fn().mockResolvedValue(mockPDFOutput)
      };

      processCompactStudyDocuments.mockResolvedValue(mockAcademicDocument);
      generateCompactHTML.mockResolvedValue(mockHTMLOutput);
      PDFOutputGenerator.mockImplementation(() => mockPDFGenerator);
      generateCompactMarkdown.mockResolvedValue(mockMarkdownOutput);

      const request = mockRequest({
        ...validRequestData,
        config: {
          ...validRequestData.config,
          outputFormat: 'all'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.html).toBe(mockHTMLOutput.html);
      expect(data.pdf).toBe(mockPDFOutput.buffer.toString('base64'));
      expect(data.markdown).toBe(mockMarkdownOutput.markdown);
    });

    it('should handle pipeline processing errors', async () => {
      const { processCompactStudyDocuments } = require('@/backend/lib/compact-study');
      
      processCompactStudyDocuments.mockRejectedValue(new Error('Pipeline failed'));

      const request = mockRequest(validRequestData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to process documents');
      expect(data.errors).toContain('Pipeline processing failed: Pipeline failed');
    });

    it('should handle output generation errors', async () => {
      const { processCompactStudyDocuments, generateCompactHTML } = require('@/backend/lib/compact-study');
      
      const mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      };

      processCompactStudyDocuments.mockResolvedValue(mockAcademicDocument);
      generateCompactHTML.mockRejectedValue(new Error('HTML generation failed'));

      const request = mockRequest(validRequestData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to generate output');
      expect(data.errors).toContain('Output generation failed: HTML generation failed');
    });

    it('should validate configuration parameters', async () => {
      const { processCompactStudyDocuments, generateCompactHTML } = require('@/backend/lib/compact-study');
      
      const mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      };

      const mockHTMLOutput = {
        html: '<html>content</html>',
        css: 'body {}',
        mathJaxConfig: {},
        metadata: {
          generatedAt: new Date(),
          format: 'html',
          sourceFiles: ['test.pdf'],
          config: {},
          stats: {
            totalSections: 1,
            totalFormulas: 1,
            totalExamples: 1,
            estimatedPrintPages: 1
          },
          preservationScore: 1.0
        }
      };

      processCompactStudyDocuments.mockResolvedValue(mockAcademicDocument);
      generateCompactHTML.mockResolvedValue(mockHTMLOutput);

      // Test with different configuration values
      const configVariations = [
        { columns: 3, fontSize: '11pt', margins: 'wide' },
        { layout: 'standard', equations: 'key', examples: 'summary' },
        { answers: 'appendix', paperSize: 'letter', orientation: 'landscape' }
      ];

      for (const configOverride of configVariations) {
        const request = mockRequest({
          ...validRequestData,
          config: {
            ...validRequestData.config,
            ...configOverride
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });
});