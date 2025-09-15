/**
 * Tests for TemplateAnalyzer
 */

import { TemplateAnalyzer } from '../analyzer';
import { ExtractedContent } from '../../ai/types';

// Mock FileProcessorFactory
jest.mock('../../file-processing/factory', () => ({
  FileProcessorFactory: {
    processFile: jest.fn()
  }
}));

describe('TemplateAnalyzer', () => {
  let analyzer: TemplateAnalyzer;
  let mockFile: File;
  let mockExtractedContent: ExtractedContent;
  let mockFactory: any;

  beforeEach(() => {
    analyzer = new TemplateAnalyzer();
    mockFactory = require('../../file-processing/factory').FileProcessorFactory;
    
    mockFile = new File(['test content'], 'test-template.pdf', { type: 'application/pdf' });
    
    mockExtractedContent = {
      text: 'Sample template content with headings and sections',
      images: [],
      tables: [],
      metadata: {
        name: 'test-template.pdf',
        size: 1024,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 2,
        wordCount: 150
      },
      structure: {
        headings: [
          { level: 1, text: 'Main Title', position: 0 },
          { level: 2, text: 'Section 1', position: 50 },
          { level: 2, text: 'Section 2', position: 100 }
        ],
        sections: [
          { title: 'Main Title', content: 'Introduction content', startPosition: 0, endPosition: 49 },
          { title: 'Section 1', content: 'First section content', startPosition: 50, endPosition: 99 },
          { title: 'Section 2', content: 'Second section content', startPosition: 100, endPosition: 149 }
        ],
        hierarchy: 2
      }
    };

    // Default successful mock
    mockFactory.processFile.mockResolvedValue({
      fileId: 'test_123',
      status: 'success',
      content: mockExtractedContent,
      errors: [],
      processingTime: 100
    });
  });

  describe('analyzeTemplate', () => {
    it('should analyze a template file successfully', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('test-template.pdf');
      expect(result.file).toBe(mockFile);
      expect(result.analysis).toBeDefined();
      expect(result.extractedContent).toBe(mockExtractedContent);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle file processing errors', async () => {
      mockFactory.processFile.mockResolvedValue({
        fileId: 'failed_123',
        status: 'failed',
        errors: [{ code: 'PROCESSING_ERROR', message: 'File processing failed', severity: 'high' }],
        processingTime: 50
      });

      await expect(analyzer.analyzeTemplate(mockFile)).rejects.toThrow('Failed to analyze template');
    });
  });

  describe('layout analysis', () => {
    it('should analyze layout patterns correctly', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      const layout = result.analysis.layout;

      expect(layout.pageConfig).toBeDefined();
      expect(layout.pageConfig.paperSize).toBe('a4');
      expect(layout.pageConfig.orientation).toBe('portrait');
      expect(layout.columnStructure).toBeDefined();
      expect(layout.spacing).toBeDefined();
      expect(layout.margins).toBeDefined();
    });
  });

  describe('typography analysis', () => {
    it('should analyze typography patterns correctly', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      const typography = result.analysis.typography;

      expect(typography.fontFamilies).toBeDefined();
      expect(typography.fontFamilies.length).toBeGreaterThan(0);
      expect(typography.headingStyles).toBeDefined();
      expect(typography.headingStyles.length).toBe(3); // Based on mock headings
      expect(typography.bodyTextStyle).toBeDefined();
      expect(typography.emphasisStyles).toBeDefined();
      expect(typography.listStyles).toBeDefined();
    });

    it('should create heading styles for each heading level', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      const headingStyles = result.analysis.typography.headingStyles;

      expect(headingStyles).toHaveLength(3);
      expect(headingStyles[0].level).toBe(1);
      expect(headingStyles[1].level).toBe(2);
      expect(headingStyles[2].level).toBe(2);
      
      // Level 1 should have larger font size
      expect(headingStyles[0].fontSize).toBeGreaterThan(headingStyles[1].fontSize);
    });
  });

  describe('organization analysis', () => {
    it('should analyze content organization correctly', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      const organization = result.analysis.organization;

      expect(organization.structure).toBeDefined();
      expect(organization.hierarchy).toBeDefined();
      expect(organization.hierarchy.maxDepth).toBe(2);
      expect(organization.grouping).toBeDefined();
      expect(organization.flow).toBeDefined();
    });
  });

  describe('metadata analysis', () => {
    it('should analyze template metadata correctly', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      const metadata = result.analysis.metadata;

      expect(metadata.pageCount).toBe(2);
      expect(metadata.wordCount).toBe(150);
      expect(metadata.topicCount).toBe(3); // Based on sections
      expect(metadata.complexity).toMatch(/simple|moderate|complex/);
      expect(metadata.domain).toBeDefined();
      expect(metadata.quality).toBeDefined();
      expect(metadata.quality.score).toBeGreaterThanOrEqual(0);
      expect(metadata.quality.score).toBeLessThanOrEqual(1);
    });

    it('should assess complexity based on content characteristics', async () => {
      // Test with complex content
      const complexContent = {
        ...mockExtractedContent,
        text: 'A'.repeat(6000), // Long text
        structure: {
          ...mockExtractedContent.structure,
          headings: [
            { level: 1, text: 'Title', position: 0 },
            { level: 2, text: 'Section', position: 100 },
            { level: 3, text: 'Subsection', position: 200 },
            { level: 4, text: 'Sub-subsection', position: 300 }
          ],
          sections: Array.from({ length: 12 }, (_, i) => ({
            title: `Section ${i + 1}`,
            content: 'Content',
            startPosition: i * 100,
            endPosition: (i + 1) * 100 - 1
          }))
        },
        images: Array.from({ length: 6 }, (_, i) => ({
          id: `img_${i}`,
          base64: 'base64data',
          context: 'test',
          isExample: false
        })),
        tables: Array.from({ length: 4 }, (_, i) => ({
          id: `table_${i}`,
          headers: ['Col1', 'Col2'],
          rows: [['A', 'B']],
          context: 'test'
        }))
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: complexContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);
      expect(result.analysis.metadata.complexity).toBe('complex');
    });
  });

  describe('quality assessment', () => {
    it('should assess template quality correctly', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      const quality = result.analysis.metadata.quality;

      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(1);
      expect(quality.factors.readability).toBeGreaterThanOrEqual(0);
      expect(quality.factors.organization).toBeGreaterThanOrEqual(0);
      expect(quality.factors.consistency).toBeGreaterThanOrEqual(0);
      expect(quality.factors.density).toBeGreaterThanOrEqual(0);
      expect(quality.issues).toBeInstanceOf(Array);
    });

    it('should identify quality issues', async () => {
      // Test with poor quality content
      const poorContent = {
        ...mockExtractedContent,
        structure: {
          headings: [], // No headings
          sections: [{ title: 'Only Section', content: 'Minimal content', startPosition: 0, endPosition: 15 }],
          hierarchy: 0
        },
        metadata: {
          ...mockExtractedContent.metadata,
          wordCount: 50, // Very low word count
          pageCount: 2
        }
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: poorContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);
      const quality = result.analysis.metadata.quality;

      expect(quality.issues.length).toBeGreaterThan(0);
      expect(quality.issues.some(issue => issue.type === 'poor-structure')).toBe(true);
    });
  });

  describe('domain detection', () => {
    it('should detect mathematics domain', async () => {
      const mathContent = {
        ...mockExtractedContent,
        text: 'This template covers mathematical equations and formulas for calculus'
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: mathContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);
      expect(result.analysis.metadata.domain).toBe('mathematics');
    });

    it('should detect computer science domain', async () => {
      const csContent = {
        ...mockExtractedContent,
        text: 'This template covers programming concepts and code examples with functions'
      };

      mockFactory.processFile.mockResolvedValue({
        fileId: 'test_123',
        status: 'success',
        content: csContent,
        errors: [],
        processingTime: 100
      });

      const result = await analyzer.analyzeTemplate(mockFile);
      expect(result.analysis.metadata.domain).toBe('computer-science');
    });

    it('should default to general domain', async () => {
      const result = await analyzer.analyzeTemplate(mockFile);
      expect(result.analysis.metadata.domain).toBe('general');
    });
  });
});