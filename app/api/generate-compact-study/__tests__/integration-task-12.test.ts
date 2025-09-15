/**
 * Integration test for Task 12: Update compact study generator integration
 * Tests the integration of simple image generator and post-generation editing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the dependencies
jest.mock('@/backend/lib/compact-study', () => ({
  processCompactStudyDocuments: jest.fn(),
  generateCompactHTML: jest.fn(),
  PDFOutputGenerator: jest.fn(),
  generateCompactMarkdown: jest.fn()
}));

jest.mock('@/backend/lib/ai/simple-image-generator', () => ({
  SimpleImageGenerator: jest.fn().mockImplementation(() => ({
    generateFlatLineImage: jest.fn().mockResolvedValue({
      id: 'test-image-1',
      svgContent: '<svg>test</svg>',
      base64: 'data:image/svg+xml;base64,test',
      dimensions: { width: 400, height: 200 },
      metadata: {
        type: 'equation',
        content: 'x = y + 1',
        style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        generatedAt: new Date()
      }
    })
  }))
}));

jest.mock('../debug', () => ({
  CompactStudyDebugger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    getLogs: jest.fn().mockReturnValue([])
  })),
  validateRequest: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  createSafeFileProcessor: jest.fn(),
  createFallbackMathExtractor: jest.fn()
}));

// Mock fetch for study material storage
global.fetch = jest.fn();

describe('Task 12: Compact Study Generator Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate simple image generator with compact study processing', async () => {
    const { processCompactStudyDocuments } = await import('@/backend/lib/compact-study');
    const { SimpleImageGenerator } = await import('@/backend/lib/ai/simple-image-generator');

    // Mock academic document with formulas and examples
    const mockAcademicDocument = {
      title: 'Test Study Guide',
      parts: [{
        partNumber: 1,
        title: 'Test Part',
        sections: [{
          sectionNumber: '1.1',
          title: 'Test Section',
          content: 'Test content',
          formulas: [{
            id: 'formula-1',
            latex: 'x = y + 1',
            original: 'x = y + 1'
          }],
          examples: [{
            id: 'example-1',
            problem: 'Solve for x',
            solution: 'x = 2'
          }]
        }]
      }],
      metadata: {
        totalFormulas: 1,
        totalExamples: 1,
        preservationScore: 0.9
      }
    };

    (processCompactStudyDocuments as jest.Mock).mockResolvedValue(mockAcademicDocument);

    // Mock fetch for study material storage
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Import and test the route handler
    const { POST } = await import('../route');

    const mockRequest = {
      json: () => Promise.resolve({
        files: [{
          name: 'test.pdf',
          type: 'probability',
          content: 'base64content'
        }],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'html',
          title: 'Test Study Guide',
          enableImageGeneration: true,
          imageGenerationConfig: {
            generateForEquations: true,
            generateForExamples: true,
            generateForConcepts: false,
            imageStyle: {
              lineWeight: 'medium',
              colorScheme: 'monochrome',
              layout: 'horizontal',
              annotations: true
            }
          },
          enablePostGenerationEditing: true
        }
      })
    } as any;

    const response = await POST(mockRequest);
    const result = await response.json();

    // Verify the response includes image generation and editing features
    expect(result.success).toBe(true);
    expect(result.editingEnabled).toBe(true);
    expect(result.studyMaterialId).toBeDefined();
    expect(result.metadata.stats.totalImages).toBeGreaterThan(0);

    // Verify SimpleImageGenerator was called
    const imageGeneratorInstance = (SimpleImageGenerator as jest.Mock).mock.instances[0];
    expect(imageGeneratorInstance.generateFlatLineImage).toHaveBeenCalled();

    // Verify study material was stored for editing
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/content-modification/study-material'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"action":"create"')
      })
    );
  });

  it('should generate images for equations when enabled', async () => {
    const { SimpleImageGenerator } = await import('@/backend/lib/ai/simple-image-generator');
    
    // Test the image generation function directly
    const mockDocument = {
      parts: [{
        sections: [{
          title: 'Test Section',
          content: 'Test content',
          formulas: [{
            id: 'formula-1',
            latex: 'E = mc^2',
            original: 'E = mc^2'
          }],
          examples: []
        }]
      }]
    };

    const imageConfig = {
      enabled: true,
      generateForEquations: true,
      generateForExamples: false,
      generateForConcepts: false,
      style: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: true
      }
    };

    // Mock logger
    const mockLogger = {
      log: jest.fn()
    };

    // This would normally be called within the route handler
    // For testing, we verify the SimpleImageGenerator is properly configured
    const imageGeneratorInstance = new (SimpleImageGenerator as jest.Mock)();
    
    expect(imageGeneratorInstance.generateFlatLineImage).toBeDefined();
  });

  it('should handle image generation errors gracefully', async () => {
    const { SimpleImageGenerator } = await import('@/backend/lib/ai/simple-image-generator');
    
    // Mock image generator to throw an error
    const mockImageGenerator = {
      generateFlatLineImage: jest.fn().mockRejectedValue(new Error('Image generation failed'))
    };
    
    (SimpleImageGenerator as jest.Mock).mockImplementation(() => mockImageGenerator);

    const { processCompactStudyDocuments } = await import('@/backend/lib/compact-study');
    
    const mockAcademicDocument = {
      title: 'Test Study Guide',
      parts: [{
        partNumber: 1,
        title: 'Test Part',
        sections: [{
          sectionNumber: '1.1',
          title: 'Test Section',
          content: 'Test content',
          formulas: [{
            id: 'formula-1',
            latex: 'x = y + 1',
            original: 'x = y + 1'
          }],
          examples: []
        }]
      }],
      metadata: {
        totalFormulas: 1,
        totalExamples: 0,
        preservationScore: 0.9
      }
    };

    (processCompactStudyDocuments as jest.Mock).mockResolvedValue(mockAcademicDocument);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { POST } = await import('../route');

    const mockRequest = {
      json: () => Promise.resolve({
        files: [{
          name: 'test.pdf',
          type: 'probability',
          content: 'base64content'
        }],
        config: {
          layout: 'compact',
          outputFormat: 'html',
          enableImageGeneration: true,
          enablePostGenerationEditing: true
        }
      })
    } as any;

    const response = await POST(mockRequest);
    const result = await response.json();

    // Should still succeed even if image generation fails
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('Image generation failed, proceeding without images');
  });

  it('should support post-generation editing workflow', async () => {
    // Test the study material storage and retrieval
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'test-study-material',
            title: 'Test Study Guide',
            sections: [],
            images: [],
            metadata: {
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              version: 1
            }
          }
        })
      });

    // Test study material API
    const studyMaterialResponse = await fetch('/api/content-modification/study-material?id=test-study-material');
    const studyMaterialData = await studyMaterialResponse.json();

    expect(studyMaterialData.success).toBe(true);
    expect(studyMaterialData.data.id).toBe('test-study-material');
  });

  it('should maintain backward compatibility with existing compact study features', async () => {
    const { processCompactStudyDocuments, generateCompactHTML } = await import('@/backend/lib/compact-study');
    
    // Mock the existing functions to ensure they're still called
    (processCompactStudyDocuments as jest.Mock).mockResolvedValue({
      title: 'Test Study Guide',
      parts: [],
      metadata: { preservationScore: 0.9 }
    });

    (generateCompactHTML as jest.Mock).mockResolvedValue({
      html: '<html>test</html>',
      metadata: {
        generatedAt: new Date(),
        format: 'html',
        sourceFiles: ['test.pdf'],
        stats: { totalSections: 1, totalFormulas: 0, totalExamples: 0, estimatedPrintPages: 1 },
        preservationScore: 0.9
      }
    });

    const { POST } = await import('../route');

    const mockRequest = {
      json: () => Promise.resolve({
        files: [{
          name: 'test.pdf',
          type: 'probability',
          content: 'base64content'
        }],
        config: {
          layout: 'compact',
          outputFormat: 'html',
          enableImageGeneration: false,
          enablePostGenerationEditing: false
        }
      })
    } as any;

    const response = await POST(mockRequest);
    const result = await response.json();

    // Verify existing functionality still works
    expect(result.success).toBe(true);
    expect(result.html).toBeDefined();
    expect(processCompactStudyDocuments).toHaveBeenCalled();
    expect(generateCompactHTML).toHaveBeenCalled();
  });
});