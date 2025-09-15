import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { ContentModificationService } from '../../../../../backend/lib/content-modification/content-modification-service';
import { EnhancedExportService } from '../../../../../backend/lib/content-modification/export-service';

// Mock the services
jest.mock('../../../../../backend/lib/content-modification/content-modification-service');
jest.mock('../../../../../backend/lib/content-modification/export-service');

const mockContentService = ContentModificationService as jest.MockedClass<typeof ContentModificationService>;
const mockExportService = EnhancedExportService as jest.MockedClass<typeof EnhancedExportService>;

describe('/api/content-modification/export', () => {
  let mockMaterial: any;
  let mockExportResult: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMaterial = {
      id: 'test-material-1',
      title: 'Test Study Material',
      sections: [
        {
          id: 'section-1',
          type: 'heading',
          content: 'Introduction',
          order: 0,
          editable: true,
          dependencies: []
        }
      ],
      images: [],
      metadata: {
        originalFiles: [],
        generationConfig: {},
        preservationScore: 1.0,
        totalSections: 1,
        totalFormulas: 0,
        totalExamples: 0,
        estimatedPrintPages: 1
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockExportResult = {
      content: '<html><body>Test Content</body></html>',
      format: 'html',
      filename: 'Test_Study_Material.html',
      metadata: {
        exportedAt: new Date(),
        sections: 1,
        images: 0,
        size: 1024
      }
    };

    // Setup mocks
    mockContentService.prototype.loadMaterial = jest.fn().mockResolvedValue(mockMaterial);
    mockExportService.prototype.exportMaterial = jest.fn().mockResolvedValue(mockExportResult);
  });

  describe('POST /api/content-modification/export', () => {
    it('should export material successfully with HTML format', async () => {
      const requestBody = {
        materialId: 'test-material-1',
        options: {
          format: 'html',
          includeImages: true,
          includeMetadata: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
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
      expect(data.result.format).toBe('html');
      expect(data.result.filename).toBe('Test_Study_Material.html');
      expect(data.result.contentType).toBe('text/html');
      expect(data.result.encoding).toBe('utf8');
    });

    it('should export material successfully with PDF format', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content');
      mockExportResult = {
        ...mockExportResult,
        content: pdfBuffer,
        format: 'pdf',
        filename: 'Test_Study_Material.pdf'
      };
      mockExportService.prototype.exportMaterial = jest.fn().mockResolvedValue(mockExportResult);

      const requestBody = {
        materialId: 'test-material-1',
        options: {
          format: 'pdf',
          includeImages: true,
          includeMetadata: true,
          pdfConfig: {
            paperSize: 'a4',
            orientation: 'portrait'
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
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
      expect(data.result.format).toBe('pdf');
      expect(data.result.contentType).toBe('application/pdf');
      expect(data.result.encoding).toBe('base64');
      expect(typeof data.result.content).toBe('string'); // Base64 encoded
    });

    it('should export material successfully with Markdown format', async () => {
      mockExportResult = {
        ...mockExportResult,
        content: '# Test Study Material\n\n## Introduction\n\nContent here.',
        format: 'markdown',
        filename: 'Test_Study_Material.md'
      };
      mockExportService.prototype.exportMaterial = jest.fn().mockResolvedValue(mockExportResult);

      const requestBody = {
        materialId: 'test-material-1',
        options: {
          format: 'markdown',
          includeImages: false,
          includeMetadata: false,
          markdownConfig: {
            mathFormat: 'latex',
            includeTableOfContents: true
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
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
      expect(data.result.format).toBe('markdown');
      expect(data.result.contentType).toBe('text/markdown');
      expect(data.result.encoding).toBe('utf8');
    });

    it('should return 400 for missing materialId', async () => {
      const requestBody = {
        options: {
          format: 'html',
          includeImages: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Material ID is required');
    });

    it('should return 400 for missing options', async () => {
      const requestBody = {
        materialId: 'test-material-1'
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Export options with format are required');
    });

    it('should return 400 for invalid format', async () => {
      const requestBody = {
        materialId: 'test-material-1',
        options: {
          format: 'xml',
          includeImages: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export format. Must be pdf, html, or markdown');
    });

    it('should return 404 for non-existent material', async () => {
      const error = new (require('../../../../../backend/lib/content-modification/types').ContentModificationError)(
        'Material not found',
        'MATERIAL_NOT_FOUND'
      );
      mockContentService.prototype.loadMaterial = jest.fn().mockRejectedValue(error);

      const requestBody = {
        materialId: 'non-existent-material',
        options: {
          format: 'html',
          includeImages: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Material not found');
      expect(data.code).toBe('MATERIAL_NOT_FOUND');
    });

    it('should return 500 for unexpected errors', async () => {
      mockContentService.prototype.loadMaterial = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const requestBody = {
        materialId: 'test-material-1',
        options: {
          format: 'html',
          includeImages: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/content-modification/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error during export');
    });
  });

  describe('GET /api/content-modification/export', () => {
    it('should export and download HTML file directly', async () => {
      const url = 'http://localhost:3000/api/content-modification/export?materialId=test-material-1&format=html';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('Test_Study_Material.html');
    });

    it('should export and download PDF file directly', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content');
      mockExportResult = {
        ...mockExportResult,
        content: pdfBuffer,
        format: 'pdf',
        filename: 'Test_Study_Material.pdf'
      };
      mockExportService.prototype.exportMaterial = jest.fn().mockResolvedValue(mockExportResult);

      const url = 'http://localhost:3000/api/content-modification/export?materialId=test-material-1&format=pdf';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('Test_Study_Material.pdf');
    });

    it('should export and download Markdown file directly', async () => {
      mockExportResult = {
        ...mockExportResult,
        content: '# Test Study Material\n\nContent here.',
        format: 'markdown',
        filename: 'Test_Study_Material.md'
      };
      mockExportService.prototype.exportMaterial = jest.fn().mockResolvedValue(mockExportResult);

      const url = 'http://localhost:3000/api/content-modification/export?materialId=test-material-1&format=markdown';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('Test_Study_Material.md');
    });

    it('should return 400 for missing parameters', async () => {
      const url = 'http://localhost:3000/api/content-modification/export?materialId=test-material-1';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Material ID and format are required');
    });

    it('should return 404 for non-existent material', async () => {
      const error = new (require('../../../../../backend/lib/content-modification/types').ContentModificationError)(
        'Material not found',
        'MATERIAL_NOT_FOUND'
      );
      mockContentService.prototype.loadMaterial = jest.fn().mockRejectedValue(error);

      const url = 'http://localhost:3000/api/content-modification/export?materialId=non-existent&format=html';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Material not found');
      expect(data.code).toBe('MATERIAL_NOT_FOUND');
    });
  });

  describe('OPTIONS /api/content-modification/export', () => {
    it('should handle CORS preflight request', async () => {
      const { OPTIONS } = await import('../route');
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });
});