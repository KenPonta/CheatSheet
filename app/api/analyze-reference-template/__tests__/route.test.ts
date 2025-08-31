/**
 * Tests for reference template analysis API endpoint
 */

import { POST, GET } from '../route';

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200
    }))
  }
}));

// Mock the template analyzer
jest.mock('../../../../backend/lib/template/analyzer', () => ({
  TemplateAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeTemplate: jest.fn(),
    generateCSSTemplate: jest.fn()
  }))
}));

// Mock File constructor to ensure proper type and size properties
global.File = class MockFile {
  name: string;
  type: string;
  size: number;
  
  constructor(content: any[], name: string, options: any = {}) {
    this.name = name;
    this.type = options.type || 'text/plain';
    this.size = options.size || content.join('').length;
  }
} as any;

describe('/api/analyze-reference-template', () => {
  let mockAnalyzer: any;

  beforeEach(() => {
    const { TemplateAnalyzer } = require('../../../../backend/lib/template/analyzer');
    mockAnalyzer = new TemplateAnalyzer();
    
    // Default successful mock responses
    mockAnalyzer.analyzeTemplate.mockResolvedValue({
      id: 'template_123',
      name: 'test-template.pdf',
      createdAt: new Date('2024-01-01'),
      analysis: {
        layout: {
          pageConfig: { paperSize: 'a4', orientation: 'portrait' },
          columnStructure: { count: 2, widths: [50, 50] },
          spacing: { lineHeight: 1.4, paragraphSpacing: 12 }
        },
        typography: {
          fontFamilies: [{ name: 'Arial', usage: 'body' }],
          headingStyles: [{ level: 1, fontSize: 18 }],
          bodyTextStyle: { fontSize: 12, fontFamily: 'Arial' }
        },
        visual: {
          colorScheme: { primary: '#000000', background: '#ffffff' },
          borders: [],
          backgrounds: []
        },
        organization: {
          structure: { contentDensity: 100 },
          hierarchy: { maxDepth: 2 }
        },
        metadata: {
          pageCount: 1,
          wordCount: 200,
          complexity: 'moderate',
          domain: 'general',
          quality: { score: 0.8 }
        }
      }
    });

    mockAnalyzer.generateCSSTemplate.mockResolvedValue({
      css: ':root { --color-primary: #000000; } .cheat-sheet { font-family: Arial; }',
      variables: {
        colors: { 'color-primary': '#000000' },
        typography: { 'font-family-base': 'Arial' },
        spacing: { 'spacing-paragraph': '12px' },
        layout: { 'column-count': '2' }
      },
      classes: {
        layout: ['container', 'content'],
        typography: ['h1', 'text-base'],
        components: ['topic', 'example'],
        utilities: ['m-0', 'p-1']
      },
      mediaQueries: [
        { condition: 'screen and (max-width: 768px)', styles: 'responsive styles' }
      ],
      printStyles: 'print styles'
    });
  });

  describe('POST', () => {
    it('should analyze a PDF reference template successfully', async () => {
      const formData = new FormData();
      const mockFile = new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.template).toBeDefined();
      expect(data.template.id).toBe('template_123');
      expect(data.template.name).toBe('test-template.pdf');
      expect(data.cssTemplate).toBeDefined();
      expect(data.cssTemplate.css).toContain(':root');
      expect(data.cssTemplate.variables).toBeDefined();
      expect(data.metadata).toBeDefined();
    });

    it('should analyze an image reference template successfully', async () => {
      const formData = new FormData();
      const mockFile = new File(['image content'], 'reference.png', { type: 'image/png' });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAnalyzer.analyzeTemplate).toHaveBeenCalledWith(expect.any(File));
      expect(mockAnalyzer.generateCSSTemplate).toHaveBeenCalled();
    });

    it('should return error when no file is provided', async () => {
      const formData = new FormData();
      
      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should return error for unsupported file types', async () => {
      const formData = new FormData();
      const mockFile = new File(['text content'], 'reference.txt', { type: 'text/plain' });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported file type');
      expect(data.supportedTypes).toBeDefined();
    });

    it('should return error for files that are too large', async () => {
      const formData = new FormData();
      // Create a mock file that appears to be larger than 10MB
      const mockFile = new File(['content'], 'large-reference.pdf', { 
        type: 'application/pdf',
        size: 11 * 1024 * 1024 // 11MB
      });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File too large');
      expect(data.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should handle template processing errors', async () => {
      const { TemplateProcessingError } = require('../../../../backend/lib/template/types');
      
      mockAnalyzer.analyzeTemplate.mockRejectedValue(
        new TemplateProcessingError('Analysis failed', {
          code: 'ANALYSIS_FAILED',
          retryable: true,
          details: { reason: 'Invalid file format' }
        })
      );

      const formData = new FormData();
      const mockFile = new File(['pdf content'], 'invalid.pdf', { type: 'application/pdf' });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Analysis failed');
      expect(data.code).toBe('ANALYSIS_FAILED');
      expect(data.retryable).toBe(true);
    });

    it('should handle generic errors', async () => {
      mockAnalyzer.analyzeTemplate.mockRejectedValue(new Error('Unexpected error'));

      const formData = new FormData();
      const mockFile = new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to analyze reference template');
      expect(data.message).toBe('Unexpected error');
    });

    it('should include CSS template details in response', async () => {
      const formData = new FormData();
      const mockFile = new File(['pdf content'], 'reference.pdf', { type: 'application/pdf' });
      formData.append('file', mockFile);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(formData)
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.cssTemplate.css).toContain(':root');
      expect(data.cssTemplate.variables.colors).toBeDefined();
      expect(data.cssTemplate.variables.typography).toBeDefined();
      expect(data.cssTemplate.variables.spacing).toBeDefined();
      expect(data.cssTemplate.variables.layout).toBeDefined();
      expect(data.cssTemplate.classes.layout).toContain('container');
      expect(data.cssTemplate.classes.typography).toContain('h1');
      expect(data.cssTemplate.classes.components).toContain('topic');
      expect(data.cssTemplate.classes.utilities).toContain('m-0');
      expect(data.cssTemplate.mediaQueries).toHaveLength(1);
      expect(data.cssTemplate.printStylesLength).toBeGreaterThan(0);
    });
  });

  describe('GET', () => {
    it('should return API documentation', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.endpoint).toBe('analyze-reference-template');
      expect(data.description).toContain('computer vision');
      expect(data.methods).toContain('POST');
      expect(data.supportedFormats).toContain('application/pdf');
      expect(data.supportedFormats).toContain('image/jpeg');
      expect(data.maxFileSize).toBe('10MB');
      expect(data.features).toContain('Computer vision-based visual analysis');
      expect(data.features).toContain('CSS template generation');
    });
  });
});