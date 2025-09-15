import { EnhancedExportService, EnhancedExportOptions } from '../export-service';
import { StudyMaterial, ContentSection, GeneratedImage } from '../types';

// Mock the PDF generator
const mockPDFGenerator = {
  generatePDF: jest.fn().mockResolvedValue({
    success: true,
    pdf: Buffer.from('mock-pdf-content'),
    warnings: [],
    pageCount: 1,
    contentFit: {
      totalContent: 1000,
      fittedContent: 1000,
      overflowContent: 0,
      estimatedPages: 1,
      contentUtilization: 1.0
    }
  }),
  cleanup: jest.fn()
};

jest.mock('../../pdf-generation/pdf-generator', () => ({
  PDFGenerator: jest.fn().mockImplementation(() => mockPDFGenerator)
}));

describe('EnhancedExportService', () => {
  let exportService: EnhancedExportService;
  let mockMaterial: StudyMaterial;

  beforeEach(() => {
    exportService = new EnhancedExportService();
    
    // Create mock study material
    mockMaterial = {
      id: 'test-material-1',
      title: 'Test Study Material',
      sections: [
        {
          id: 'section-1',
          type: 'heading',
          content: 'Introduction to Mathematics',
          order: 0,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-2',
          type: 'text',
          content: 'This is a basic introduction to mathematical concepts.',
          order: 1,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-3',
          type: 'equation',
          content: 'E = mc²',
          order: 2,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-4',
          type: 'example',
          content: 'Example: Calculate the energy of a 1kg mass at rest.',
          order: 3,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-5',
          type: 'list',
          content: '- Point 1\n- Point 2\n- Point 3',
          order: 4,
          editable: true,
          dependencies: [],
          parentId: undefined
        }
      ],
      images: [
        {
          id: 'image-1',
          type: 'generated',
          source: {
            type: 'simple-generator',
            originalPrompt: 'Energy equation visualization',
            generationParams: { style: 'flat-line' }
          },
          base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          metadata: {
            width: 400,
            height: 300,
            format: 'png',
            generatedAt: new Date('2024-01-01'),
            context: 'Energy equation visualization'
          },
          editable: true,
          regenerationOptions: {
            availableStyles: [
              {
                lineWeight: 'medium',
                colorScheme: 'monochrome',
                layout: 'horizontal',
                annotations: true
              }
            ],
            contentHints: ['equation', 'physics'],
            contextOptions: ['energy', 'mass', 'speed of light']
          }
        }
      ],
      metadata: {
        originalFiles: ['physics-notes.pdf'],
        generationConfig: { format: 'compact' },
        preservationScore: 0.95,
        totalSections: 5,
        totalFormulas: 1,
        totalExamples: 1,
        estimatedPrintPages: 2
      },
      version: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02')
    };
  });

  afterEach(async () => {
    await exportService.cleanup();
  });

  describe('HTML Export', () => {
    it('should export to HTML with default options', async () => {
      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: true,
        includeMetadata: true
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.format).toBe('html');
      expect(result.filename).toBe('Test_Study_Material.html');
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('Test Study Material');
      expect(result.content).toContain('Introduction to Mathematics');
      expect(result.content).toContain('E = mc²');
      expect(result.metadata.sections).toBe(5);
      expect(result.metadata.images).toBe(1);
    });

    it('should export HTML with embedded SVG images', async () => {
      // Update mock material to have SVG image
      mockMaterial.images[0].metadata.format = 'svg';
      mockMaterial.images[0].base64Data = btoa('<svg><circle cx="50" cy="50" r="40"/></svg>');

      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: true,
        includeMetadata: false,
        htmlConfig: {
          embedSVG: true,
          includeCSS: true,
          responsive: true,
          theme: 'dark'
        }
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.content).toContain('<svg>');
      expect(result.content).toContain('theme-dark');
      expect(result.content).toContain('--primary-color: #ffffff');
    });

    it('should export HTML without images when includeImages is false', async () => {
      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: false,
        includeMetadata: true
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.content).not.toContain('<section class="images-section">');
      expect(result.content).not.toContain('Generated Images');
      expect(result.metadata.images).toBe(0);
    });

    it('should generate table of contents for materials with many sections', async () => {
      // Add more heading sections
      const additionalSections: ContentSection[] = [
        {
          id: 'section-6',
          type: 'heading',
          content: 'Advanced Concepts',
          order: 5,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-7',
          type: 'heading',
          content: 'Applications',
          order: 6,
          editable: true,
          dependencies: [],
          parentId: undefined
        }
      ];

      mockMaterial.sections.push(...additionalSections);

      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: false,
        includeMetadata: false
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.content).toContain('table-of-contents');
      expect(result.content).toContain('Table of Contents');
    });
  });

  describe('Markdown Export', () => {
    it('should export to Markdown with default options', async () => {
      const options: EnhancedExportOptions = {
        format: 'markdown',
        includeImages: true,
        includeMetadata: true
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.format).toBe('markdown');
      expect(result.filename).toBe('Test_Study_Material.md');
      expect(result.content).toContain('# Test Study Material');
      expect(result.content).toContain('## Introduction to Mathematics');
      expect(result.content).toContain('$$E = mc²$$');
      expect(result.content).toContain('> **Example:**');
      expect(result.content).toContain('- Point 1');
    });

    it('should export Markdown with different image formats', async () => {
      const options: EnhancedExportOptions = {
        format: 'markdown',
        includeImages: true,
        includeMetadata: false,
        markdownConfig: {
          imageFormat: 'reference',
          mathFormat: 'ascii',
          includeTableOfContents: false
        }
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.content).toContain('[image1]:');
      expect(result.content).toContain('**Equation:** E = mc²');
      expect(result.content).not.toContain('## Table of Contents');
    });

    it('should include table of contents when enabled', async () => {
      const options: EnhancedExportOptions = {
        format: 'markdown',
        includeImages: false,
        includeMetadata: false,
        markdownConfig: {
          includeTableOfContents: true
        }
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.content).toContain('## Table of Contents');
      expect(result.content).toContain('- [Introduction to Mathematics]');
    });
  });

  describe('PDF Export', () => {
    it('should export to PDF with default options', async () => {
      const options: EnhancedExportOptions = {
        format: 'pdf',
        includeImages: true,
        includeMetadata: true
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.format).toBe('pdf');
      expect(result.filename).toBe('Test_Study_Material.pdf');
      expect(Buffer.isBuffer(result.content)).toBe(true);
      expect(result.content).toEqual(Buffer.from('mock-pdf-content'));
    });

    it('should export PDF with custom configuration', async () => {
      const options: EnhancedExportOptions = {
        format: 'pdf',
        includeImages: true,
        includeMetadata: false,
        pdfConfig: {
          paperSize: 'letter',
          orientation: 'landscape',
          fontSize: 'large',
          includeHeaders: false,
          includeFooters: true
        }
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.format).toBe('pdf');
      expect(Buffer.isBuffer(result.content)).toBe(true);
    });

    it('should handle PDF generation failure gracefully', async () => {
      // Mock PDF generator to fail
      mockPDFGenerator.generatePDF.mockResolvedValueOnce({
        success: false,
        pdf: null,
        warnings: [{ type: 'error', message: 'PDF generation failed' }]
      });

      const options: EnhancedExportOptions = {
        format: 'pdf',
        includeImages: true,
        includeMetadata: true
      };

      await expect(exportService.exportMaterial(mockMaterial, options))
        .rejects.toThrow('PDF generation failed');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', async () => {
      const options: EnhancedExportOptions = {
        format: 'xml' as any,
        includeImages: true,
        includeMetadata: true
      };

      await expect(exportService.exportMaterial(mockMaterial, options))
        .rejects.toThrow('Unsupported export format: xml');
    });

    it('should handle empty material gracefully', async () => {
      const emptyMaterial: StudyMaterial = {
        ...mockMaterial,
        sections: [],
        images: []
      };

      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: true,
        includeMetadata: true
      };

      const result = await exportService.exportMaterial(emptyMaterial, options);

      expect(result.content).toContain('Test Study Material');
      expect(result.metadata.sections).toBe(0);
      expect(result.metadata.images).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('should sanitize filenames correctly', async () => {
      const materialWithSpecialChars: StudyMaterial = {
        ...mockMaterial,
        title: 'Test/Material: With "Special" Characters!'
      };

      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: false,
        includeMetadata: false
      };

      const result = await exportService.exportMaterial(materialWithSpecialChars, options);

      expect(result.filename).toBe('TestMaterial_With_Special_Characters.html');
    });

    it('should calculate correct file sizes', async () => {
      const options: EnhancedExportOptions = {
        format: 'html',
        includeImages: true,
        includeMetadata: true
      };

      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.metadata.size).toBeGreaterThan(0);
      expect(typeof result.metadata.size).toBe('number');
    });
  });

  describe('Content Conversion', () => {
    it('should convert StudyMaterial to CheatSheetTopics correctly', async () => {
      const options: EnhancedExportOptions = {
        format: 'pdf',
        includeImages: true,
        includeMetadata: true
      };

      // This will internally call convertToCheatSheetTopics
      const result = await exportService.exportMaterial(mockMaterial, options);

      expect(result.format).toBe('pdf');
      // The conversion is tested indirectly through successful PDF generation
    });

    it('should handle materials without headings', async () => {
      const materialWithoutHeadings: StudyMaterial = {
        ...mockMaterial,
        sections: mockMaterial.sections.filter(s => s.type !== 'heading')
      };

      const options: EnhancedExportOptions = {
        format: 'pdf',
        includeImages: false,
        includeMetadata: false
      };

      const result = await exportService.exportMaterial(materialWithoutHeadings, options);

      expect(result.format).toBe('pdf');
      expect(Buffer.isBuffer(result.content)).toBe(true);
    });
  });
});