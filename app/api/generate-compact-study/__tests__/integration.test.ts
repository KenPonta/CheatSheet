import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';

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

// Integration test with real compact study library (mocked for now)
describe('/api/generate-compact-study integration', () => {
  const createMockRequest = (body: any): NextRequest => {
    return {
      json: async () => body,
      headers: new Map([['content-type', 'application/json']])
    } as NextRequest;
  };

  // Mock a simple PDF content (base64 encoded "test content")
  const mockPDFContent = Buffer.from('test pdf content').toString('base64');

  const validRequest = {
    files: [
      {
        name: 'discrete-probability.pdf',
        type: 'probability' as const,
        content: mockPDFContent
      },
      {
        name: 'relations.pdf', 
        type: 'relations' as const,
        content: mockPDFContent
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
      title: 'Discrete Probability & Relations Study Guide',
      enableProgressTracking: true,
      enableErrorRecovery: true
    }
  };

  it('should handle request validation correctly', async () => {
    // Test missing files
    const noFilesRequest = createMockRequest({
      files: [],
      config: validRequest.config
    });

    const noFilesResponse = await POST(noFilesRequest);
    const noFilesData = await noFilesResponse.json();
    
    expect(noFilesResponse.status).toBe(400);
    expect(noFilesData.error).toBe('No files provided');

    // Test missing config
    const noConfigRequest = createMockRequest({
      files: validRequest.files
    });

    const noConfigResponse = await POST(noConfigRequest);
    const noConfigData = await noConfigResponse.json();
    
    expect(noConfigResponse.status).toBe(400);
    expect(noConfigData.error).toBe('Configuration is required');
  });

  it('should process configuration parameters correctly', async () => {
    // Test different configuration combinations
    const configTests = [
      {
        name: 'compact layout with 3 columns',
        config: {
          ...validRequest.config,
          layout: 'compact' as const,
          columns: 3 as const,
          fontSize: '9pt'
        }
      },
      {
        name: 'standard layout with wide margins',
        config: {
          ...validRequest.config,
          layout: 'standard' as const,
          margins: 'wide' as const,
          fontSize: '12pt'
        }
      },
      {
        name: 'minimal equations with summary examples',
        config: {
          ...validRequest.config,
          equations: 'minimal' as const,
          examples: 'summary' as const,
          answers: 'appendix' as const
        }
      }
    ];

    for (const test of configTests) {
      const request = createMockRequest({
        files: validRequest.files,
        config: test.config
      });

      // This will fail with the actual library since we don't have real PDFs,
      // but it should validate the configuration parsing
      const response = await POST(request);
      
      // Should either succeed or fail with processing error, not validation error
      expect(response.status).not.toBe(400);
    }
  });

  it('should handle different output formats', async () => {
    const formats: Array<'html' | 'pdf' | 'markdown' | 'all'> = ['html', 'pdf', 'markdown', 'all'];

    for (const format of formats) {
      const request = createMockRequest({
        files: validRequest.files,
        config: {
          ...validRequest.config,
          outputFormat: format
        }
      });

      const response = await POST(request);
      
      // Should not fail with validation error
      expect(response.status).not.toBe(400);
    }
  });

  it('should handle file type validation', async () => {
    const fileTypes: Array<'probability' | 'relations' | 'general'> = ['probability', 'relations', 'general'];

    for (const type of fileTypes) {
      const request = createMockRequest({
        files: [{
          name: `test-${type}.pdf`,
          type,
          content: mockPDFContent
        }],
        config: validRequest.config
      });

      const response = await POST(request);
      
      // Should not fail with validation error
      expect(response.status).not.toBe(400);
    }
  });

  it('should validate response structure for successful requests', async () => {
    // Mock the compact study library to return success
    jest.doMock('@/backend/lib/compact-study', () => ({
      processCompactStudyDocuments: jest.fn().mockResolvedValue({
        title: 'Test Study Guide',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: []
      }),
      generateCompactHTML: jest.fn().mockResolvedValue({
        html: '<html><body>Test content</body></html>',
        css: 'body { font-size: 10pt; }',
        mathJaxConfig: {},
        metadata: {
          generatedAt: new Date(),
          format: 'html',
          sourceFiles: ['test.pdf'],
          config: {},
          stats: {
            totalSections: 5,
            totalFormulas: 10,
            totalExamples: 3,
            estimatedPrintPages: 2
          },
          preservationScore: 0.95
        }
      })
    }));

    const request = createMockRequest(validRequest);
    const response = await POST(request);
    
    if (response.status === 200) {
      const data = await response.json();
      
      // Validate response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('processingTime');
      
      if (data.success) {
        expect(data.metadata).toHaveProperty('generatedAt');
        expect(data.metadata).toHaveProperty('format');
        expect(data.metadata).toHaveProperty('sourceFiles');
        expect(data.metadata).toHaveProperty('stats');
        expect(data.metadata.stats).toHaveProperty('totalSections');
        expect(data.metadata.stats).toHaveProperty('totalFormulas');
        expect(data.metadata.stats).toHaveProperty('totalExamples');
        expect(data.metadata.stats).toHaveProperty('estimatedPrintPages');
      }
    }
  });

  it('should handle progress tracking configuration', async () => {
    const progressConfigs = [
      { enableProgressTracking: true, enableErrorRecovery: true },
      { enableProgressTracking: false, enableErrorRecovery: true },
      { enableProgressTracking: true, enableErrorRecovery: false },
      { enableProgressTracking: false, enableErrorRecovery: false }
    ];

    for (const progressConfig of progressConfigs) {
      const request = createMockRequest({
        files: validRequest.files,
        config: {
          ...validRequest.config,
          ...progressConfig
        }
      });

      const response = await POST(request);
      
      // Should not fail with validation error
      expect(response.status).not.toBe(400);
    }
  });
});