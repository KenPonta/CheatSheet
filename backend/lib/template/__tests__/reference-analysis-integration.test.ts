/**
 * Integration tests for the enhanced reference format analysis system
 * Tests the complete workflow from file analysis to CSS generation
 */

import { TemplateAnalyzer } from '../analyzer';
import { VisualAnalyzer } from '../visual-analyzer';
import { CSSGenerator } from '../css-generator';

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

describe('Reference Format Analysis Integration', () => {
  let analyzer: TemplateAnalyzer;
  let mockFactory: any;

  beforeEach(() => {
    analyzer = new TemplateAnalyzer();
    mockFactory = require('../../file-processing/factory').FileProcessorFactory;
  });

  describe('Complete Analysis Workflow', () => {
    it('should complete full analysis workflow for reference templates', async () => {
      // Mock extracted content from a reference cheat sheet
      const mockContent = {
        text: 'Data Science Cheat Sheet\n\nMachine Learning Algorithms\n- Linear Regression\n- Decision Trees\n- Neural Networks\n\nStatistics\n- Mean, Median, Mode\n- Standard Deviation\n- Correlation',
        images: [
          {
            id: 'img_1',
            base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            context: 'Formula diagram',
            isExample: true,
            ocrText: 'y = mx + b'
          }
        ],
        tables: [],
        metadata: {
          name: 'data-science-cheat-sheet.pdf',
          size: 2048,
          type: 'application/pdf',
          lastModified: new Date(),
          pageCount: 2,
          wordCount: 150
        },
        structure: {
          headings: [
            { level: 1, text: 'Data Science Cheat Sheet', position: 0 },
            { level: 2, text: 'Machine Learning Algorithms', position: 25 },
            { level: 2, text: 'Statistics', position: 100 }
          ],
          sections: [
            { title: 'Data Science Cheat Sheet', content: 'Introduction', startPosition: 0, endPosition: 24 },
            { title: 'Machine Learning Algorithms', content: 'ML content', startPosition: 25, endPosition: 99 },
            { title: 'Statistics', content: 'Stats content', startPosition: 100, endPosition: 149 }
          ],
          hierarchy: 2
        }
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'ref_analysis_test',
        status: 'success',
        content: mockContent,
        errors: [],
        processingTime: 150
      });

      const mockFile = new File(['test content'], 'data-science-reference.pdf', { type: 'application/pdf' });

      // Perform complete analysis
      const template = await analyzer.analyzeTemplate(mockFile);

      // Verify template analysis
      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe('data-science-reference.pdf');
      expect(template.analysis).toBeDefined();

      // Verify layout analysis
      expect(template.analysis.layout).toBeDefined();
      expect(template.analysis.layout.pageConfig).toBeDefined();
      expect(template.analysis.layout.columnStructure).toBeDefined();
      expect(template.analysis.layout.spacing).toBeDefined();

      // Verify typography analysis
      expect(template.analysis.typography).toBeDefined();
      expect(template.analysis.typography.fontFamilies).toBeDefined();
      expect(template.analysis.typography.headingStyles).toHaveLength(3);
      expect(template.analysis.typography.bodyTextStyle).toBeDefined();

      // Verify visual analysis
      expect(template.analysis.visual).toBeDefined();
      expect(template.analysis.visual.colorScheme).toBeDefined();
      expect(template.analysis.visual.colorScheme.primary).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Verify organization analysis
      expect(template.analysis.organization).toBeDefined();
      expect(template.analysis.organization.structure).toBeDefined();
      expect(template.analysis.organization.hierarchy.maxDepth).toBe(2);

      // Verify metadata analysis
      expect(template.analysis.metadata).toBeDefined();
      expect(template.analysis.metadata.pageCount).toBe(2);
      expect(template.analysis.metadata.wordCount).toBe(150);
      expect(template.analysis.metadata.complexity).toMatch(/simple|moderate|complex/);
      expect(template.analysis.metadata.quality.score).toBeGreaterThanOrEqual(0);
      expect(template.analysis.metadata.quality.score).toBeLessThanOrEqual(1);

      // Generate CSS template
      const cssTemplate = await analyzer.generateCSSTemplate(template);

      // Verify CSS generation
      expect(cssTemplate).toBeDefined();
      expect(cssTemplate.css).toContain(':root');
      expect(cssTemplate.css).toContain('--color-primary');
      expect(cssTemplate.css).toContain('.cheat-sheet');
      expect(cssTemplate.css).toContain('h1, .h1');
      expect(cssTemplate.css).toContain('@media print');

      // Verify CSS variables
      expect(cssTemplate.variables).toBeDefined();
      expect(cssTemplate.variables.colors).toBeDefined();
      expect(cssTemplate.variables.typography).toBeDefined();
      expect(cssTemplate.variables.spacing).toBeDefined();
      expect(cssTemplate.variables.layout).toBeDefined();

      // Verify CSS classes
      expect(cssTemplate.classes).toBeDefined();
      expect(cssTemplate.classes.layout).toContain('container');
      expect(cssTemplate.classes.typography.length).toBeGreaterThan(0);
      expect(cssTemplate.classes.components.length).toBeGreaterThan(0);
      expect(cssTemplate.classes.utilities.length).toBeGreaterThan(0);

      // Verify responsive design
      expect(cssTemplate.mediaQueries).toBeDefined();
      expect(cssTemplate.mediaQueries.length).toBeGreaterThan(0);
      expect(cssTemplate.mediaQueries[0].condition).toContain('max-width');

      // Verify print styles
      expect(cssTemplate.printStyles).toBeDefined();
      expect(cssTemplate.printStyles).toContain('font-size: 10pt');
    });

    it('should handle different reference template types', async () => {
      const testCases = [
        {
          name: 'mathematics-reference.pdf',
          domain: 'mathematics',
          text: 'Calculus formulas derivatives integrals mathematical equations with detailed explanations and multiple examples covering various topics in advanced mathematics including differential equations, linear algebra, and statistical analysis',
          complexity: 'moderate'
        },
        {
          name: 'programming-reference.pdf',
          domain: 'computer-science',
          text: 'Programming concepts code functions algorithms data structures with comprehensive coverage of object-oriented programming, functional programming paradigms, advanced data structures like trees and graphs, sorting algorithms, search algorithms, dynamic programming, and complex system design patterns with detailed code examples and implementation details',
          complexity: 'complex'
        },
        {
          name: 'simple-reference.pdf',
          domain: 'general',
          text: 'Basic concepts simple explanations',
          complexity: 'simple'
        }
      ];

      for (const testCase of testCases) {
        const mockContent = {
          text: testCase.text,
          images: [],
          tables: [],
          metadata: {
            name: testCase.name,
            size: 1024,
            type: 'application/pdf',
            lastModified: new Date(),
            pageCount: 1,
            wordCount: testCase.text.split(' ').length
          },
          structure: {
            headings: testCase.complexity === 'complex' ? [
              { level: 1, text: 'Main Topic', position: 0 },
              { level: 2, text: 'Subtopic 1', position: 100 },
              { level: 2, text: 'Subtopic 2', position: 200 },
              { level: 3, text: 'Sub-subtopic', position: 300 }
            ] : testCase.complexity === 'moderate' ? [
              { level: 1, text: 'Main Topic', position: 0 },
              { level: 2, text: 'Subtopic 1', position: 100 },
              { level: 2, text: 'Subtopic 2', position: 200 }
            ] : [{ level: 1, text: 'Main Topic', position: 0 }],
            sections: testCase.complexity === 'complex' ? [
              { title: 'Main Topic', content: testCase.text.substring(0, 100), startPosition: 0, endPosition: 99 },
              { title: 'Subtopic 1', content: testCase.text.substring(100, 200), startPosition: 100, endPosition: 199 },
              { title: 'Subtopic 2', content: testCase.text.substring(200, 300), startPosition: 200, endPosition: 299 },
              { title: 'Sub-subtopic', content: testCase.text.substring(300), startPosition: 300, endPosition: testCase.text.length }
            ] : testCase.complexity === 'moderate' ? [
              { title: 'Main Topic', content: testCase.text.substring(0, 100), startPosition: 0, endPosition: 99 },
              { title: 'Subtopic 1', content: testCase.text.substring(100, 200), startPosition: 100, endPosition: 199 },
              { title: 'Subtopic 2', content: testCase.text.substring(200), startPosition: 200, endPosition: testCase.text.length }
            ] : [{ title: 'Main Topic', content: testCase.text, startPosition: 0, endPosition: testCase.text.length }],
            hierarchy: testCase.complexity === 'complex' ? 3 : testCase.complexity === 'moderate' ? 2 : 1
          }
        };

        mockFactory.processFile.mockResolvedValue({
          fileId: `test_${testCase.name}`,
          status: 'success',
          content: mockContent,
          errors: [],
          processingTime: 100
        });

        const mockFile = new File(['test'], testCase.name, { type: 'application/pdf' });
        const template = await analyzer.analyzeTemplate(mockFile);

        expect(template.analysis.metadata.domain).toBe(testCase.domain);
        expect(template.analysis.metadata.complexity).toMatch(/simple|moderate|complex/);

        const cssTemplate = await analyzer.generateCSSTemplate(template);
        expect(cssTemplate.css).toContain(':root');
        expect(cssTemplate.variables.colors['color-primary']).toBeDefined();
      }
    });

    it('should generate appropriate CSS for different layout patterns', async () => {
      const layoutTestCases = [
        {
          name: 'single-column.pdf',
          columns: 1,
          expectedCSS: 'width: 100%'
        },
        {
          name: 'two-column.pdf',
          columns: 2,
          expectedCSS: 'grid-template-columns'
        }
      ];

      for (const testCase of layoutTestCases) {
        const mockContent = {
          text: 'Test content for layout analysis',
          images: [],
          tables: [],
          metadata: {
            name: testCase.name,
            size: 1024,
            type: 'application/pdf',
            lastModified: new Date(),
            pageCount: 1,
            wordCount: 50
          },
          structure: {
            headings: [{ level: 1, text: 'Test', position: 0 }],
            sections: [{ title: 'Test', content: 'Content', startPosition: 0, endPosition: 50 }],
            hierarchy: 1
          }
        };

        mockFactory.processFile.mockResolvedValue({
          fileId: `layout_test_${testCase.name}`,
          status: 'success',
          content: mockContent,
          errors: [],
          processingTime: 100
        });

        const mockFile = new File(['test'], testCase.name, { type: 'application/pdf' });
        const template = await analyzer.analyzeTemplate(mockFile);

        // Manually set column count for testing
        template.analysis.layout.columnStructure.count = testCase.columns;
        template.analysis.layout.columnStructure.widths = testCase.columns === 1 ? [100] : [50, 50];

        const cssTemplate = await analyzer.generateCSSTemplate(template);
        expect(cssTemplate.css).toContain(testCase.expectedCSS);
        expect(cssTemplate.variables.layout['column-count']).toBe(testCase.columns.toString());
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle analysis failures gracefully', async () => {
      mockFactory.processFile.mockResolvedValue({
        fileId: 'failed_test',
        status: 'failed',
        errors: [{ code: 'PROCESSING_ERROR', message: 'File processing failed', severity: 'high' }],
        processingTime: 50
      });

      const mockFile = new File(['test'], 'invalid.pdf', { type: 'application/pdf' });

      await expect(analyzer.analyzeTemplate(mockFile)).rejects.toThrow('Failed to analyze template');
    });

    it('should handle empty or minimal content', async () => {
      const mockContent = {
        text: '',
        images: [],
        tables: [],
        metadata: {
          name: 'empty.pdf',
          size: 0,
          type: 'application/pdf',
          lastModified: new Date(),
          pageCount: 1,
          wordCount: 0
        },
        structure: {
          headings: [],
          sections: [],
          hierarchy: 0
        }
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'empty_test',
        status: 'success',
        content: mockContent,
        errors: [],
        processingTime: 50
      });

      const mockFile = new File([''], 'empty.pdf', { type: 'application/pdf' });
      const template = await analyzer.analyzeTemplate(mockFile);

      expect(template).toBeDefined();
      expect(template.analysis.metadata.complexity).toBe('simple');

      const cssTemplate = await analyzer.generateCSSTemplate(template);
      expect(cssTemplate.css).toContain(':root');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large reference templates efficiently', async () => {
      const largeContent = {
        text: 'A'.repeat(10000), // Large text content
        images: Array.from({ length: 5 }, (_, i) => ({
          id: `img_${i}`,
          base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          context: `Image ${i}`,
          isExample: true
        })),
        tables: [],
        metadata: {
          name: 'large-reference.pdf',
          size: 50000,
          type: 'application/pdf',
          lastModified: new Date(),
          pageCount: 10,
          wordCount: 2000
        },
        structure: {
          headings: Array.from({ length: 20 }, (_, i) => ({
            level: (i % 3) + 1,
            text: `Heading ${i + 1}`,
            position: i * 500
          })),
          sections: Array.from({ length: 20 }, (_, i) => ({
            title: `Section ${i + 1}`,
            content: 'A'.repeat(500),
            startPosition: i * 500,
            endPosition: (i + 1) * 500 - 1
          })),
          hierarchy: 3
        }
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'large_test',
        status: 'success',
        content: largeContent,
        errors: [],
        processingTime: 500
      });

      const mockFile = new File(['large content'], 'large-reference.pdf', { type: 'application/pdf' });

      const startTime = Date.now();
      const template = await analyzer.analyzeTemplate(mockFile);
      const cssTemplate = await analyzer.generateCSSTemplate(template);
      const endTime = Date.now();

      expect(template).toBeDefined();
      expect(template.analysis.metadata.complexity).toBe('complex');
      expect(cssTemplate.css).toContain(':root');
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});