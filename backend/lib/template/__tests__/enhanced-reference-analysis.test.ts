/**
 * Tests for enhanced reference format analysis system
 * Tests computer vision-based analysis and CSS generation with sample cheat sheets
 */

import { TemplateAnalyzer } from '../analyzer';
import { VisualAnalyzer } from '../visual-analyzer';
import { CSSGenerator } from '../css-generator';
import { ExtractedContent } from '../../ai/types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock FileProcessorFactory
jest.mock('../../file-processing/factory', () => ({
  FileProcessorFactory: {
    processFile: jest.fn()
  }
}));

// Mock canvas for visual analysis
jest.mock('canvas', () => ({
  createCanvas: jest.fn(() => ({
    width: 800,
    height: 600,
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(800 * 600 * 4),
        width: 800,
        height: 600
      }))
    }))
  })),
  loadImage: jest.fn(() => Promise.resolve({
    width: 800,
    height: 600
  }))
}));

describe('Enhanced Reference Format Analysis System', () => {
  let analyzer: TemplateAnalyzer;
  let visualAnalyzer: VisualAnalyzer;
  let cssGenerator: CSSGenerator;
  let mockFactory: any;

  beforeEach(() => {
    analyzer = new TemplateAnalyzer();
    visualAnalyzer = new VisualAnalyzer();
    cssGenerator = new CSSGenerator();
    mockFactory = require('../../file-processing/factory').FileProcessorFactory;
  });

  describe('TemplateAnalyzer with Computer Vision', () => {
    const createMockExtractedContent = (options: Partial<ExtractedContent> = {}): ExtractedContent => ({
      text: 'Sample cheat sheet content with formulas and examples',
      images: [
        {
          id: 'img_1',
          base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          context: 'Sample image',
          isExample: true,
          ocrText: 'Sample OCR text'
        }
      ],
      tables: [],
      metadata: {
        name: 'test-cheat-sheet.pdf',
        size: 1024,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 1,
        wordCount: 200
      },
      structure: {
        headings: [
          { level: 1, text: 'Main Topic', position: 0 },
          { level: 2, text: 'Subtopic 1', position: 50 },
          { level: 2, text: 'Subtopic 2', position: 100 }
        ],
        sections: [
          { title: 'Main Topic', content: 'Introduction', startPosition: 0, endPosition: 49 },
          { title: 'Subtopic 1', content: 'First section', startPosition: 50, endPosition: 99 },
          { title: 'Subtopic 2', content: 'Second section', startPosition: 100, endPosition: 149 }
        ],
        hierarchy: 2
      },
      ...options
    });

    it('should perform enhanced analysis with computer vision', async () => {
      const mockContent = createMockExtractedContent();
      const mockFile = new File(['test'], 'data-sci-cheat-sheet.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: mockContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.analysis.layout).toBeDefined();
      expect(result.analysis.typography).toBeDefined();
      expect(result.analysis.visual).toBeDefined();
      expect(result.analysis.organization).toBeDefined();
      expect(result.analysis.metadata).toBeDefined();
    });

    it('should generate CSS template from analysis', async () => {
      const mockContent = createMockExtractedContent();
      const mockFile = new File(['test'], 'industrial-cheat-sheet.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: mockContent,
        errors: [],
        processingTime: 100
      });

      const template = await analyzer.analyzeTemplate(mockFile);
      const cssResult = await analyzer.generateCSSTemplate(template);

      expect(cssResult).toBeDefined();
      expect(cssResult.css).toContain(':root');
      expect(cssResult.css).toContain('--color-primary');
      expect(cssResult.css).toContain('.cheat-sheet');
      expect(cssResult.variables).toBeDefined();
      expect(cssResult.classes).toBeDefined();
      expect(cssResult.printStyles).toBeDefined();
    });

    it('should handle mathematics domain cheat sheets', async () => {
      const mathContent = createMockExtractedContent({
        text: 'Mathematical formulas and equations for calculus derivatives integrals',
        images: [
          {
            id: 'formula_1',
            base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            context: 'Mathematical formula',
            isExample: true,
            ocrText: 'f(x) = x^2 + 2x + 1'
          }
        ]
      });

      const mockFile = new File(['test'], 'math-cheat-sheet.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: mathContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);

      expect(result.analysis.metadata.domain).toBe('mathematics');
      expect(result.analysis.metadata.complexity).toMatch(/simple|moderate|complex/);
    });

    it('should detect high content density patterns', async () => {
      const denseContent = createMockExtractedContent({
        text: 'A'.repeat(1000), // Dense content
        metadata: {
          name: 'dense-cheat-sheet.pdf',
          size: 2048,
          type: 'application/pdf',
          lastModified: new Date(),
          pageCount: 1,
          wordCount: 500
        }
      });

      const mockFile = new File(['test'], 'dense-cheat-sheet.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: denseContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);

      expect(result.analysis.metadata.quality.factors.density).toBeGreaterThanOrEqual(0.1);
    });

    it('should fallback gracefully when visual analysis fails', async () => {
      const mockContent = createMockExtractedContent({
        images: [] // No images for visual analysis
      });

      const mockFile = new File(['test'], 'text-only-cheat-sheet.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: mockContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);

      // Should still complete analysis without visual components
      expect(result).toBeDefined();
      expect(result.analysis.visual.colorScheme.primary).toBeDefined();
      expect(result.analysis.layout.pageConfig).toBeDefined();
    });
  });

  describe('VisualAnalyzer', () => {
    it('should analyze visual elements from image content', async () => {
      const mockContent = createMockExtractedContent();

      const result = await visualAnalyzer.analyzeVisualElements(mockContent);

      expect(result).toBeDefined();
      expect(result.colorScheme).toBeDefined();
      expect(result.typography).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.spacing).toBeDefined();
      expect(result.visualElements).toBeDefined();
      expect(result.contentDensity).toBeDefined();
    });

    it('should extract color scheme from visual content', async () => {
      const mockContent = createMockExtractedContent();

      const result = await visualAnalyzer.analyzeVisualElements(mockContent);

      expect(result.colorScheme.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(result.colorScheme.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(result.colorScheme.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should analyze content density patterns', async () => {
      const mockContent = createMockExtractedContent();

      const result = await visualAnalyzer.analyzeVisualElements(mockContent);

      expect(result.contentDensity.wordsPerSquareInch).toBeGreaterThan(0);
      expect(result.contentDensity.textCoverage).toBeGreaterThanOrEqual(0);
      expect(result.contentDensity.textCoverage).toBeLessThanOrEqual(1);
      expect(result.contentDensity.whitespaceRatio).toBeGreaterThanOrEqual(0);
      expect(result.contentDensity.whitespaceRatio).toBeLessThanOrEqual(1);
    });

    it('should fallback to text-based analysis when visual analysis fails', async () => {
      const mockContent = createMockExtractedContent({
        images: [] // No images
      });

      const result = await visualAnalyzer.analyzeVisualElements(mockContent);

      // Should still return valid analysis
      expect(result).toBeDefined();
      expect(result.colorScheme.primary).toBeDefined();
      expect(result.typography.fontFamilies).toBeDefined();
      expect(result.layout.pageConfig).toBeDefined();
    });
  });

  describe('CSSGenerator', () => {
    let mockTemplate: any;

    beforeEach(() => {
      mockTemplate = {
        id: 'test_template',
        name: 'Test Template',
        analysis: {
          layout: {
            pageConfig: {
              paperSize: 'a4',
              orientation: 'portrait',
              margins: { top: 20, right: 20, bottom: 20, left: 20 },
              columns: 2,
              columnGap: 20
            },
            columnStructure: {
              count: 2,
              widths: [50, 50],
              gaps: [20],
              alignment: 'left'
            },
            spacing: {
              lineHeight: 1.4,
              paragraphSpacing: 12,
              sectionSpacing: 24,
              headingSpacing: { before: 16, after: 8 }
            },
            margins: { top: 20, right: 20, bottom: 20, left: 20, unit: 'px' },
            pageBreaks: []
          },
          typography: {
            fontFamilies: [
              { name: 'Arial', usage: 'body', fallbacks: ['Helvetica', 'sans-serif'] },
              { name: 'Arial Bold', usage: 'heading', fallbacks: ['Helvetica Bold', 'sans-serif'] }
            ],
            headingStyles: [
              { level: 1, fontSize: 18, fontWeight: 700, fontFamily: 'Arial Bold', color: '#000000', marginTop: 16, marginBottom: 8 },
              { level: 2, fontSize: 16, fontWeight: 700, fontFamily: 'Arial Bold', color: '#000000', marginTop: 16, marginBottom: 8 }
            ],
            bodyTextStyle: {
              fontSize: 12,
              fontWeight: 400,
              fontFamily: 'Arial',
              color: '#000000',
              lineHeight: 1.4,
              textAlign: 'left'
            },
            emphasisStyles: [],
            listStyles: []
          },
          visual: {
            colorScheme: {
              primary: '#000000',
              secondary: '#666666',
              accent: '#0066cc',
              text: '#000000',
              background: '#ffffff',
              muted: '#f5f5f5'
            },
            borders: [],
            backgrounds: [],
            icons: [],
            emphasis: []
          },
          organization: {
            structure: { sections: [], topicDistribution: { averageTopicsPerPage: 3, topicLengthVariation: 'varied', topicSeparation: 'spacing' }, contentDensity: 100 },
            hierarchy: { maxDepth: 2, levelIndicators: [], indentationRules: [] },
            grouping: [],
            flow: { direction: 'top-to-bottom', continuity: 'sectioned', breakPoints: [] }
          },
          metadata: {
            pageCount: 1,
            wordCount: 200,
            topicCount: 3,
            complexity: 'moderate',
            domain: 'general',
            quality: { score: 0.8, factors: { readability: 0.8, organization: 0.8, consistency: 0.8, density: 0.8 }, issues: [] }
          }
        }
      };
    });

    it('should generate complete CSS from template analysis', () => {
      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.css).toContain(':root');
      expect(result.css).toContain('--color-primary: #000000');
      expect(result.css).toContain('--font-family-base');
      expect(result.css).toContain('.cheat-sheet');
      expect(result.css).toContain('h1, .h1');
      expect(result.css).toContain('@media print');
    });

    it('should generate CSS variables correctly', () => {
      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.variables.colors['color-primary']).toBe('#000000');
      expect(result.variables.colors['color-background']).toBe('#ffffff');
      expect(result.variables.typography['font-family-base']).toContain('Arial');
      expect(result.variables.spacing['spacing-paragraph']).toBe('12px');
      expect(result.variables.layout['column-count']).toBe('2');
    });

    it('should generate responsive media queries', () => {
      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.mediaQueries).toBeDefined();
      expect(result.mediaQueries.length).toBeGreaterThan(0);
      expect(result.mediaQueries[0].condition).toContain('max-width');
      expect(result.mediaQueries[0].styles).toContain('grid-template-columns: 1fr');
    });

    it('should generate print-optimized styles', () => {
      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.printStyles).toContain('font-size: 10pt');
      expect(result.printStyles).toContain('page-break-inside: avoid');
      expect(result.printStyles).toContain('color: black');
    });

    it('should extract CSS classes correctly', () => {
      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.classes.layout).toContain('container');
      expect(result.classes.layout).toContain('content');
      expect(result.classes.typography).toContain('h1');
      expect(result.classes.components).toContain('topic');
      expect(result.classes.utilities).toContain('m-0');
    });

    it('should handle single column layouts', () => {
      mockTemplate.analysis.layout.columnStructure.count = 1;
      mockTemplate.analysis.layout.columnStructure.widths = [100];
      mockTemplate.analysis.layout.columnStructure.gaps = [];

      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.css).toContain('width: 100%');
      expect(result.variables.layout['column-count']).toBe('1');
    });

    it('should generate appropriate styles for different paper sizes', () => {
      mockTemplate.analysis.layout.pageConfig.paperSize = 'letter';

      const result = cssGenerator.generateCSS(mockTemplate);

      expect(result.variables.layout['container-max-width']).toBe('8.5in');
    });
  });

  describe('Integration with Reference Files', () => {
    // These tests would use actual reference files if available
    const referenceFiles = [
      'all_in_one.pdf',
      'daifuku_cheatsheet.pdf',
      'Data-sci.pdf',
      'Industrial.pdf'
    ];

    referenceFiles.forEach(fileName => {
      it(`should analyze ${fileName} reference format`, async () => {
        // Mock the file content since we can't actually read files in tests
        const mockContent = createMockExtractedContent({
          metadata: {
            name: fileName,
            size: 2048,
            type: 'application/pdf',
            lastModified: new Date(),
            pageCount: 2,
            wordCount: 400
          }
        });

        const mockFile = new File(['test'], fileName, { type: 'application/pdf' });

        mockFactory.processFile.mockResolvedValue({
          fileId: `ref_${fileName}`,
          status: 'success',
          content: mockContent,
          errors: [],
          processingTime: 200
        });

        const result = await analyzer.analyzeTemplate(mockFile);

        expect(result).toBeDefined();
        expect(result.name).toBe(fileName);
        expect(result.analysis.metadata.pageCount).toBeGreaterThan(0);
        expect(result.analysis.metadata.wordCount).toBeGreaterThan(0);
        expect(result.analysis.metadata.quality.score).toBeGreaterThanOrEqual(0);
        expect(result.analysis.metadata.quality.score).toBeLessThanOrEqual(1);
      });

      it(`should generate CSS template for ${fileName}`, async () => {
        const mockContent = createMockExtractedContent({
          metadata: { name: fileName, size: 2048, type: 'application/pdf', lastModified: new Date(), pageCount: 2, wordCount: 400 }
        });

        const mockFile = new File(['test'], fileName, { type: 'application/pdf' });

        mockFactory.processFile.mockResolvedValue({
          fileId: `ref_${fileName}`,
          status: 'success',
          content: mockContent,
          errors: [],
          processingTime: 200
        });

        const template = await analyzer.analyzeTemplate(mockFile);
        const cssResult = await analyzer.generateCSSTemplate(template);

        expect(cssResult.css).toContain('cheat-sheet');
        expect(cssResult.css).toContain('@media print');
        expect(cssResult.variables.colors).toBeDefined();
        expect(cssResult.variables.typography).toBeDefined();
        expect(cssResult.variables.spacing).toBeDefined();
        expect(cssResult.variables.layout).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted image data gracefully', async () => {
      const corruptedContent = createMockExtractedContent({
        images: [
          {
            id: 'corrupted',
            base64: 'invalid-base64-data',
            context: 'Corrupted image',
            isExample: false
          }
        ]
      });

      const result = await visualAnalyzer.analyzeVisualElements(corruptedContent);

      // Should fallback to text-based analysis
      expect(result).toBeDefined();
      expect(result.colorScheme).toBeDefined();
    });

    it('should handle empty content gracefully', async () => {
      const emptyContent = createMockExtractedContent({
        text: '',
        images: [],
        structure: {
          headings: [],
          sections: [],
          hierarchy: 0
        }
      });

      const mockFile = new File([''], 'empty.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'empty_123',
        status: 'success',
        content: emptyContent,
        errors: [],
        processingTime: 50
      });

      const result = await analyzer.analyzeTemplate(mockFile);

      expect(result).toBeDefined();
      expect(result.analysis.metadata.complexity).toBe('simple');
      expect(result.analysis.metadata.quality.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large content efficiently', async () => {
      const largeContent = createMockExtractedContent({
        text: 'A'.repeat(10000),
        structure: {
          headings: Array.from({ length: 20 }, (_, i) => ({
            level: (i % 4) + 1,
            text: `Heading ${i + 1}`,
            position: i * 500
          })),
          sections: Array.from({ length: 20 }, (_, i) => ({
            title: `Section ${i + 1}`,
            content: 'A'.repeat(500),
            startPosition: i * 500,
            endPosition: (i + 1) * 500 - 1
          })),
          hierarchy: 4
        }
      });

      const mockFile = new File(['test'], 'large-cheat-sheet.pdf', { type: 'application/pdf' });

      mockFactory.processFile.mockResolvedValue({
        fileId: 'large_123',
        status: 'success',
        content: largeContent,
        errors: [],
        processingTime: 500
      });

      const startTime = Date.now();
      const result = await analyzer.analyzeTemplate(mockFile);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.analysis.metadata.complexity).toBe('complex');
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Helper function to create mock extracted content
function createMockExtractedContent(options: Partial<ExtractedContent> = {}): ExtractedContent {
  return {
    text: 'Sample cheat sheet content',
    images: [],
    tables: [],
    metadata: {
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 1,
      wordCount: 100
    },
    structure: {
      headings: [
        { level: 1, text: 'Main Topic', position: 0 }
      ],
      sections: [
        { title: 'Main Topic', content: 'Content', startPosition: 0, endPosition: 50 }
      ],
      hierarchy: 1
    },
    ...options
  };
}