/**
 * Tests for Compact Layout Engine Core
 */

import { CompactLayoutEngine } from '../compact-layout-engine';
import {
  CompactLayoutConfig,
  TypographyConfig,
  SpacingConfig,
  ContentBlock,
  LayoutError
} from '../types';

describe('CompactLayoutEngine', () => {
  let engine: CompactLayoutEngine;

  beforeEach(() => {
    engine = new CompactLayoutEngine();
  });

  describe('Configuration Management', () => {
    it('should create default configuration with compact settings', () => {
      const config = engine.getConfig();
      
      expect(config.paperSize).toBe('a4');
      expect(config.columns).toBe(2);
      expect(config.typography.fontSize).toBeGreaterThanOrEqual(10);
      expect(config.typography.fontSize).toBeLessThanOrEqual(11);
      expect(config.typography.lineHeight).toBeGreaterThanOrEqual(1.15);
      expect(config.typography.lineHeight).toBeLessThanOrEqual(1.25);
      expect(config.spacing.paragraphSpacing).toBeLessThanOrEqual(0.35);
      expect(config.spacing.listSpacing).toBeLessThanOrEqual(0.25);
    });

    it('should merge user configuration with defaults', () => {
      const customConfig: Partial<CompactLayoutConfig> = {
        columns: 3,
        typography: {
          fontSize: 11,
          lineHeight: 1.15,
          fontFamily: {
            body: 'Custom Font',
            heading: 'Custom Heading',
            math: 'Custom Math',
            code: 'Custom Code'
          }
        },
        spacing: {
          paragraphSpacing: 0.25,
          listSpacing: 0.15,
          sectionSpacing: 0.6,
          headingMargins: {
            top: 0.4,
            bottom: 0.2
          }
        }
      };

      const customEngine = new CompactLayoutEngine(customConfig);
      const config = customEngine.getConfig();

      expect(config.columns).toBe(3);
      expect(config.typography.fontSize).toBe(11);
      expect(config.typography.lineHeight).toBe(1.15);
      expect(config.typography.fontFamily.body).toBe('Custom Font');
      expect(config.spacing.paragraphSpacing).toBe(0.25);
      expect(config.spacing.listSpacing).toBe(0.15);
    });

    it('should validate configuration constraints', () => {
      expect(() => {
        new CompactLayoutEngine({
          typography: { fontSize: 15, lineHeight: 1.2, fontFamily: {} as any }
        });
      }).toThrow(LayoutError);

      expect(() => {
        new CompactLayoutEngine({
          typography: { fontSize: 10, lineHeight: 2.5, fontFamily: {} as any }
        });
      }).toThrow(LayoutError);

      expect(() => {
        new CompactLayoutEngine({
          spacing: { paragraphSpacing: 0.5, listSpacing: 0.2, sectionSpacing: 1, headingMargins: { top: 0.5, bottom: 0.3 } }
        });
      }).toThrow(LayoutError);

      expect(() => {
        new CompactLayoutEngine({
          spacing: { paragraphSpacing: 0.3, listSpacing: 0.3, sectionSpacing: 1, headingMargins: { top: 0.5, bottom: 0.3 } }
        });
      }).toThrow(LayoutError);

      expect(() => {
        new CompactLayoutEngine({ columns: 5 });
      }).toThrow(LayoutError);
    });

    it('should update configuration dynamically', () => {
      const initialConfig = engine.getConfig();
      expect(initialConfig.columns).toBe(2);

      engine.updateConfig({ columns: 1 });
      const updatedConfig = engine.getConfig();
      expect(updatedConfig.columns).toBe(1);
    });
  });

  describe('Layout Calculations', () => {
    it('should calculate layout dimensions correctly for A4 paper', () => {
      const layout = engine.calculateLayout();

      expect(layout.pageWidth).toBeCloseTo(8.27, 2);
      expect(layout.pageHeight).toBeCloseTo(11.69, 2);
      expect(layout.columnCount).toBe(2);
      expect(layout.contentWidth).toBeGreaterThan(0);
      expect(layout.columnWidth).toBeGreaterThan(0);
      expect(layout.linesPerColumn).toBeGreaterThan(0);
      expect(layout.charactersPerLine).toBeGreaterThan(0);
      expect(layout.estimatedContentDensity).toBeGreaterThan(0);
    });

    it('should calculate layout for different paper sizes', () => {
      engine.updateConfig({ paperSize: 'letter' });
      const letterLayout = engine.calculateLayout();
      expect(letterLayout.pageWidth).toBeCloseTo(8.5, 2);
      expect(letterLayout.pageHeight).toBeCloseTo(11, 2);

      engine.updateConfig({ paperSize: 'legal' });
      const legalLayout = engine.calculateLayout();
      expect(legalLayout.pageWidth).toBeCloseTo(8.5, 2);
      expect(legalLayout.pageHeight).toBeCloseTo(14, 2);
    });

    it('should adjust column width based on column count', () => {
      const twoColumnLayout = engine.calculateLayout();
      
      engine.updateConfig({ columns: 1 });
      const oneColumnLayout = engine.calculateLayout();
      
      engine.updateConfig({ columns: 3 });
      const threeColumnLayout = engine.calculateLayout();

      expect(oneColumnLayout.columnWidth).toBeGreaterThan(twoColumnLayout.columnWidth);
      expect(twoColumnLayout.columnWidth).toBeGreaterThan(threeColumnLayout.columnWidth);
    });

    it('should calculate typography metrics correctly', () => {
      engine.updateConfig({
        typography: {
          fontSize: 10,
          lineHeight: 1.2,
          fontFamily: {
            body: 'Times',
            heading: 'Arial',
            math: 'Computer Modern',
            code: 'Consolas'
          }
        }
      });

      const layout = engine.calculateLayout();
      expect(layout.effectiveLineHeight).toBeCloseTo(10 * 1.2, 1);
    });
  });

  describe('Content Block Management', () => {
    it('should create content blocks with correct properties', () => {
      const textBlock = engine.createContentBlock('text1', 'This is a sample text content.', 'text');
      expect(textBlock.id).toBe('text1');
      expect(textBlock.type).toBe('text');
      expect(textBlock.content).toBe('This is a sample text content.');
      expect(textBlock.estimatedHeight).toBeGreaterThan(0);
      expect(textBlock.breakable).toBe(true);
      expect(textBlock.priority).toBe(5);

      const formulaBlock = engine.createContentBlock('formula1', '\\sum_{i=1}^{n} x_i', 'formula');
      expect(formulaBlock.type).toBe('formula');
      expect(formulaBlock.breakable).toBe(false);
      expect(formulaBlock.priority).toBe(9);

      const headingBlock = engine.createContentBlock('heading1', 'Chapter 1: Introduction', 'heading');
      expect(headingBlock.type).toBe('heading');
      expect(headingBlock.priority).toBe(10);
    });

    it('should estimate content height based on type and content', () => {
      const shortText = engine.createContentBlock('short', 'Short text', 'text');
      const longText = engine.createContentBlock('long', 'This is a much longer text that should span multiple lines and therefore have a greater estimated height than the short text.', 'text');
      
      expect(longText.estimatedHeight).toBeGreaterThan(shortText.estimatedHeight);

      const formula = engine.createContentBlock('formula', '\\begin{equation}\\sum_{i=1}^{n} x_i\\end{equation}', 'formula');
      const inlineFormula = engine.createContentBlock('inline', '$x + y = z$', 'formula');
      
      expect(formula.estimatedHeight).toBeGreaterThan(inlineFormula.estimatedHeight);

      const list = engine.createContentBlock('list', '- Item 1\n- Item 2\n- Item 3', 'list');
      expect(list.estimatedHeight).toBeGreaterThan(0);
    });

    it('should handle custom options for content blocks', () => {
      const customBlock = engine.createContentBlock('custom', 'Custom content', 'text', {
        breakable: false,
        priority: 15
      });

      expect(customBlock.breakable).toBe(false);
      expect(customBlock.priority).toBe(15);
    });
  });

  describe('Content Distribution', () => {
    let contentBlocks: ContentBlock[];

    beforeEach(() => {
      contentBlocks = [
        engine.createContentBlock('heading1', 'Chapter 1: Probability Basics', 'heading'),
        engine.createContentBlock('text1', 'Probability is a measure of the likelihood of an event occurring. It ranges from 0 to 1, where 0 means the event will never occur and 1 means it will always occur.', 'text'),
        engine.createContentBlock('formula1', 'P(A) = \\frac{|A|}{|S|}', 'formula'),
        engine.createContentBlock('example1', 'Example 1.1: Rolling a fair six-sided die. What is the probability of rolling a 3? Solution: There is 1 favorable outcome (rolling a 3) out of 6 possible outcomes. Therefore, P(rolling a 3) = 1/6.', 'example'),
        engine.createContentBlock('text2', 'The complement of an event A is the set of all outcomes in the sample space that are not in A. It is denoted as A^c or A\'.', 'text'),
        engine.createContentBlock('formula2', 'P(A^c) = 1 - P(A)', 'formula')
      ];
    });

    it('should distribute content across columns', () => {
      const distribution = engine.distributeContent(contentBlocks);

      expect(distribution.columns).toHaveLength(2);
      expect(distribution.totalHeight).toBeGreaterThan(0);
      expect(distribution.balanceScore).toBeGreaterThanOrEqual(0);
      expect(distribution.balanceScore).toBeLessThanOrEqual(1);
      expect(distribution.overflowRisk).toBeGreaterThanOrEqual(0);
      expect(distribution.overflowRisk).toBeLessThanOrEqual(1);

      // Check that all content blocks are distributed
      const totalDistributedBlocks = distribution.columns.reduce(
        (sum, col) => sum + col.content.length, 0
      );
      expect(totalDistributedBlocks).toBeGreaterThanOrEqual(contentBlocks.length);
    });

    it('should prioritize high-priority content', () => {
      const distribution = engine.distributeContent(contentBlocks);
      
      // Headings (priority 10) should be placed first
      const firstColumn = distribution.columns[0];
      const headingBlock = firstColumn.content.find(block => block.type === 'heading');
      expect(headingBlock).toBeDefined();
    });

    it('should handle single column layout', () => {
      engine.updateConfig({ columns: 1 });
      const distribution = engine.distributeContent(contentBlocks);

      expect(distribution.columns).toHaveLength(1);
      expect(distribution.columns[0].content.length).toBeGreaterThan(0);
    });

    it('should handle three column layout', () => {
      engine.updateConfig({ columns: 3 });
      const distribution = engine.distributeContent(contentBlocks);

      expect(distribution.columns).toHaveLength(3);
    });

    it('should handle content overflow gracefully', () => {
      // Create a very large content block that won't fit
      const largeContent = 'Very long content. '.repeat(1000);
      const largeBlock = engine.createContentBlock('large', largeContent, 'text');
      
      const blocksWithLarge = [...contentBlocks, largeBlock];
      
      // Should either handle the overflow or throw a descriptive error
      try {
        const distribution = engine.distributeContent(blocksWithLarge);
        expect(distribution.overflowRisk).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(LayoutError);
        expect((error as LayoutError).code).toBe('COLUMN_OVERFLOW');
      }
    });

    it('should split breakable content when necessary', () => {
      // Create content that's just slightly too large for one column
      const mediumContent = 'Medium length content that should be breakable. '.repeat(50);
      const breakableBlock = engine.createContentBlock('breakable', mediumContent, 'text', { breakable: true });
      
      const blocksWithBreakable = [...contentBlocks, breakableBlock];
      const distribution = engine.distributeContent(blocksWithBreakable);
      
      // Should successfully distribute without throwing overflow error
      expect(distribution.columns).toHaveLength(2);
      expect(distribution.overflowRisk).toBeLessThan(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw LayoutError for invalid configurations', () => {
      expect(() => {
        new CompactLayoutEngine({
          typography: { fontSize: 20, lineHeight: 1.2, fontFamily: {} as any }
        });
      }).toThrow(LayoutError);
    });

    it('should provide helpful error messages and suggestions', () => {
      try {
        new CompactLayoutEngine({
          spacing: { paragraphSpacing: 0.5, listSpacing: 0.2, sectionSpacing: 1, headingMargins: { top: 0.5, bottom: 0.3 } }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(LayoutError);
        const layoutError = error as LayoutError;
        expect(layoutError.suggestion).toContain('compact');
        expect(layoutError.contentType).toBe('spacing');
      }
    });

    it('should handle edge cases in content distribution', () => {
      // Empty content blocks
      const emptyDistribution = engine.distributeContent([]);
      expect(emptyDistribution.columns).toHaveLength(2);
      expect(emptyDistribution.totalHeight).toBe(0);

      // Single very small block
      const tinyBlock = engine.createContentBlock('tiny', 'x', 'text');
      const tinyDistribution = engine.distributeContent([tinyBlock]);
      expect(tinyDistribution.columns[0].content).toHaveLength(1);
    });
  });

  describe('Typography and Spacing Compliance', () => {
    it('should enforce compact typography constraints', () => {
      const config = engine.getConfig();
      
      // Font size should be in 10-11pt range for compact layout
      expect(config.typography.fontSize).toBeGreaterThanOrEqual(10);
      expect(config.typography.fontSize).toBeLessThanOrEqual(11);
      
      // Line height should be in 1.15-1.25 range for compact layout
      expect(config.typography.lineHeight).toBeGreaterThanOrEqual(1.15);
      expect(config.typography.lineHeight).toBeLessThanOrEqual(1.25);
    });

    it('should enforce compact spacing constraints', () => {
      const config = engine.getConfig();
      
      // Paragraph spacing should be ≤ 0.35em
      expect(config.spacing.paragraphSpacing).toBeLessThanOrEqual(0.35);
      
      // List spacing should be ≤ 0.25em
      expect(config.spacing.listSpacing).toBeLessThanOrEqual(0.25);
    });

    it('should support math rendering configuration', () => {
      const config = engine.getConfig();
      
      expect(config.mathRendering.displayEquations.centered).toBe(true);
      expect(config.mathRendering.displayEquations.numbered).toBe(true);
      expect(config.mathRendering.displayEquations.fullWidth).toBe(true);
      expect(config.mathRendering.inlineEquations.preserveInline).toBe(true);
    });
  });

  describe('Two-Column Layout Specific Tests', () => {
    it('should calculate proper column widths for two-column layout', () => {
      engine.updateConfig({ columns: 2 });
      const layout = engine.calculateLayout();
      
      // Column width should be less than half the content width due to gap
      const expectedMaxWidth = layout.contentWidth / 2;
      expect(layout.columnWidth).toBeLessThan(expectedMaxWidth);
      expect(layout.columnWidth).toBeGreaterThan(0);
    });

    it('should balance content between two columns', () => {
      const manyBlocks = Array.from({ length: 10 }, (_, i) => 
        engine.createContentBlock(`block${i}`, `Content block ${i}`, 'text')
      );
      
      const distribution = engine.distributeContent(manyBlocks);
      
      expect(distribution.columns).toHaveLength(2);
      
      // Both columns should have content
      expect(distribution.columns[0].content.length).toBeGreaterThan(0);
      expect(distribution.columns[1].content.length).toBeGreaterThan(0);
      
      // Balance score should be reasonable
      expect(distribution.balanceScore).toBeGreaterThan(0.5);
    });
  });
});