/**
 * Comprehensive Layout Engine Tests
 * Tests two-column generation, typography rules, and layout optimization
 */

import { CompactLayoutEngine } from '../compact-layout-engine';
import {
  CompactLayoutConfig,
  ContentBlock,
  LayoutDistribution,
  LayoutError,
  TypographyConfig,
  SpacingConfig
} from '../types';

describe('Layout Engine - Comprehensive Tests', () => {
  let engine: CompactLayoutEngine;

  beforeEach(() => {
    engine = new CompactLayoutEngine();
  });

  describe('Two-Column Layout Generation', () => {
    it('should generate balanced two-column layout', () => {
      const contentBlocks = createTestContentBlocks(20);
      const distribution = engine.distributeContent(contentBlocks);

      expect(distribution.columns).toHaveLength(2);
      
      // Check balance - columns should have similar heights
      const heightDifference = Math.abs(
        distribution.columns[0].totalHeight - distribution.columns[1].totalHeight
      );
      const averageHeight = (distribution.columns[0].totalHeight + distribution.columns[1].totalHeight) / 2;
      const balanceRatio = heightDifference / averageHeight;
      
      expect(balanceRatio).toBeLessThan(0.2); // Within 20% difference
      expect(distribution.balanceScore).toBeGreaterThan(0.7);
    });

    it('should handle column overflow gracefully', () => {
      // Create content that exceeds single column capacity
      const largeContentBlocks = [
        engine.createContentBlock('large1', 'Very long content. '.repeat(500), 'text'),
        engine.createContentBlock('large2', 'Another long content. '.repeat(500), 'text'),
        engine.createContentBlock('large3', 'More long content. '.repeat(500), 'text')
      ];

      const distribution = engine.distributeContent(largeContentBlocks);
      
      // Should distribute across columns or indicate overflow risk
      expect(distribution.overflowRisk).toBeGreaterThan(0);
      
      if (distribution.overflowRisk < 1) {
        // Content fits - verify distribution
        expect(distribution.columns[0].content.length + distribution.columns[1].content.length)
          .toBeGreaterThanOrEqual(largeContentBlocks.length);
      }
    });

    it('should maintain content order within columns', () => {
      const orderedBlocks = Array.from({ length: 10 }, (_, i) => 
        engine.createContentBlock(`block-${i}`, `Content ${i}`, 'text', { priority: 10 - i })
      );

      const distribution = engine.distributeContent(orderedBlocks);
      
      // Within each column, content should maintain relative order based on priority
      distribution.columns.forEach(column => {
        for (let i = 1; i < column.content.length; i++) {
          expect(column.content[i - 1].priority).toBeGreaterThanOrEqual(column.content[i].priority);
        }
      });
    });

    it('should handle different column configurations', () => {
      const testConfigs = [1, 2, 3];
      const contentBlocks = createTestContentBlocks(15);

      testConfigs.forEach(columnCount => {
        engine.updateConfig({ columns: columnCount });
        const distribution = engine.distributeContent(contentBlocks);
        
        expect(distribution.columns).toHaveLength(columnCount);
        
        // Verify all content is distributed
        const totalDistributedBlocks = distribution.columns.reduce(
          (sum, col) => sum + col.content.length, 0
        );
        expect(totalDistributedBlocks).toBeGreaterThanOrEqual(contentBlocks.length);
      });
    });

    it('should optimize column breaks for readability', () => {
      const mixedContent = [
        engine.createContentBlock('heading1', 'Chapter 1: Introduction', 'heading'),
        engine.createContentBlock('text1', 'This is the introduction text.', 'text'),
        engine.createContentBlock('formula1', '\\sum_{i=1}^{n} x_i', 'formula'),
        engine.createContentBlock('example1', 'Example 1.1: Calculate the sum', 'example'),
        engine.createContentBlock('heading2', 'Chapter 2: Methods', 'heading'),
        engine.createContentBlock('text2', 'This describes the methods.', 'text')
      ];

      const distribution = engine.distributeContent(mixedContent);
      
      // Headings should preferably start columns or be followed by related content
      distribution.columns.forEach(column => {
        column.content.forEach((block, index) => {
          if (block.type === 'heading' && index === column.content.length - 1) {
            // Heading at end of column is suboptimal but acceptable if necessary
            expect(distribution.overflowRisk).toBeGreaterThan(0.3);
          }
        });
      });
    });
  });

  describe('Typography Rules Enforcement', () => {
    it('should enforce compact font size constraints', () => {
      const validSizes = [10, 10.5, 11];
      const invalidSizes = [8, 9, 12, 14];

      validSizes.forEach(size => {
        expect(() => {
          new CompactLayoutEngine({
            typography: {
              fontSize: size,
              lineHeight: 1.2,
              fontFamily: {
                body: 'Times',
                heading: 'Arial',
                math: 'Computer Modern',
                code: 'Consolas'
              }
            }
          });
        }).not.toThrow();
      });

      invalidSizes.forEach(size => {
        expect(() => {
          new CompactLayoutEngine({
            typography: {
              fontSize: size,
              lineHeight: 1.2,
              fontFamily: {
                body: 'Times',
                heading: 'Arial',
                math: 'Computer Modern',
                code: 'Consolas'
              }
            }
          });
        }).toThrow(LayoutError);
      });
    });

    it('should enforce compact line height constraints', () => {
      const validLineHeights = [1.15, 1.2, 1.25];
      const invalidLineHeights = [1.0, 1.1, 1.3, 1.5, 2.0];

      validLineHeights.forEach(lineHeight => {
        expect(() => {
          new CompactLayoutEngine({
            typography: {
              fontSize: 10,
              lineHeight,
              fontFamily: {
                body: 'Times',
                heading: 'Arial',
                math: 'Computer Modern',
                code: 'Consolas'
              }
            }
          });
        }).not.toThrow();
      });

      invalidLineHeights.forEach(lineHeight => {
        expect(() => {
          new CompactLayoutEngine({
            typography: {
              fontSize: 10,
              lineHeight,
              fontFamily: {
                body: 'Times',
                heading: 'Arial',
                math: 'Computer Modern',
                code: 'Consolas'
              }
            }
          });
        }).toThrow(LayoutError);
      });
    });

    it('should calculate typography metrics correctly', () => {
      const configs = [
        { fontSize: 10, lineHeight: 1.15 },
        { fontSize: 10.5, lineHeight: 1.2 },
        { fontSize: 11, lineHeight: 1.25 }
      ];

      configs.forEach(({ fontSize, lineHeight }) => {
        const customEngine = new CompactLayoutEngine({
          typography: {
            fontSize,
            lineHeight,
            fontFamily: {
              body: 'Times',
              heading: 'Arial',
              math: 'Computer Modern',
              code: 'Consolas'
            }
          }
        });

        const layout = customEngine.calculateLayout();
        
        expect(layout.effectiveLineHeight).toBeCloseTo(fontSize * lineHeight, 1);
        expect(layout.charactersPerLine).toBeGreaterThan(0);
        expect(layout.linesPerColumn).toBeGreaterThan(0);
      });
    });

    it('should apply font family settings correctly', () => {
      const customFonts = {
        body: 'Georgia, serif',
        heading: 'Helvetica, sans-serif',
        math: 'Latin Modern Math',
        code: 'Fira Code, monospace'
      };

      const customEngine = new CompactLayoutEngine({
        typography: {
          fontSize: 10,
          lineHeight: 1.2,
          fontFamily: customFonts
        }
      });

      const config = customEngine.getConfig();
      expect(config.typography.fontFamily).toEqual(customFonts);
    });
  });

  describe('Spacing Rules Enforcement', () => {
    it('should enforce compact paragraph spacing', () => {
      const validSpacing = [0.1, 0.2, 0.3, 0.35];
      const invalidSpacing = [0.4, 0.5, 1.0];

      validSpacing.forEach(paragraphSpacing => {
        expect(() => {
          new CompactLayoutEngine({
            spacing: {
              paragraphSpacing,
              listSpacing: 0.2,
              sectionSpacing: 0.5,
              headingMargins: { top: 0.3, bottom: 0.2 }
            }
          });
        }).not.toThrow();
      });

      invalidSpacing.forEach(paragraphSpacing => {
        expect(() => {
          new CompactLayoutEngine({
            spacing: {
              paragraphSpacing,
              listSpacing: 0.2,
              sectionSpacing: 0.5,
              headingMargins: { top: 0.3, bottom: 0.2 }
            }
          });
        }).toThrow(LayoutError);
      });
    });

    it('should enforce compact list spacing', () => {
      const validSpacing = [0.1, 0.15, 0.2, 0.25];
      const invalidSpacing = [0.3, 0.4, 0.5];

      validSpacing.forEach(listSpacing => {
        expect(() => {
          new CompactLayoutEngine({
            spacing: {
              paragraphSpacing: 0.3,
              listSpacing,
              sectionSpacing: 0.5,
              headingMargins: { top: 0.3, bottom: 0.2 }
            }
          });
        }).not.toThrow();
      });

      invalidSpacing.forEach(listSpacing => {
        expect(() => {
          new CompactLayoutEngine({
            spacing: {
              paragraphSpacing: 0.3,
              listSpacing,
              sectionSpacing: 0.5,
              headingMargins: { top: 0.3, bottom: 0.2 }
            }
          });
        }).toThrow(LayoutError);
      });
    });

    it('should calculate content density correctly', () => {
      const denseConfig = {
        spacing: {
          paragraphSpacing: 0.15,
          listSpacing: 0.1,
          sectionSpacing: 0.3,
          headingMargins: { top: 0.2, bottom: 0.1 }
        }
      };

      const normalConfig = {
        spacing: {
          paragraphSpacing: 0.35,
          listSpacing: 0.25,
          sectionSpacing: 0.6,
          headingMargins: { top: 0.5, bottom: 0.3 }
        }
      };

      const denseEngine = new CompactLayoutEngine(denseConfig);
      const normalEngine = new CompactLayoutEngine(normalConfig);

      const denseLayout = denseEngine.calculateLayout();
      const normalLayout = normalEngine.calculateLayout();

      expect(denseLayout.estimatedContentDensity).toBeGreaterThan(normalLayout.estimatedContentDensity);
    });
  });

  describe('Content Block Management', () => {
    it('should estimate content height accurately', () => {
      const testCases = [
        { content: 'Short text', type: 'text', expectedRange: [0.5, 2] },
        { content: 'This is a much longer text that should span multiple lines and therefore have a greater estimated height than short text.', type: 'text', expectedRange: [2, 6] },
        { content: '\\sum_{i=1}^{n} x_i', type: 'formula', expectedRange: [1, 3] },
        { content: '\\begin{equation}\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\\end{equation}', type: 'formula', expectedRange: [2, 5] },
        { content: 'Chapter 1: Introduction', type: 'heading', expectedRange: [1, 3] },
        { content: '- Item 1\n- Item 2\n- Item 3\n- Item 4', type: 'list', expectedRange: [2, 6] }
      ];

      testCases.forEach(({ content, type, expectedRange }) => {
        const block = engine.createContentBlock(`test-${type}`, content, type as any);
        expect(block.estimatedHeight).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(block.estimatedHeight).toBeLessThanOrEqual(expectedRange[1]);
      });
    });

    it('should assign appropriate priorities', () => {
      const priorityTests = [
        { type: 'heading', expectedPriority: 10 },
        { type: 'formula', expectedPriority: 9 },
        { type: 'example', expectedPriority: 8 },
        { type: 'definition', expectedPriority: 7 },
        { type: 'theorem', expectedPriority: 7 },
        { type: 'list', expectedPriority: 6 },
        { type: 'text', expectedPriority: 5 }
      ];

      priorityTests.forEach(({ type, expectedPriority }) => {
        const block = engine.createContentBlock(`test-${type}`, 'Test content', type as any);
        expect(block.priority).toBe(expectedPriority);
      });
    });

    it('should handle breakable content correctly', () => {
      const breakableTypes = ['text', 'list'];
      const nonBreakableTypes = ['heading', 'formula', 'example'];

      breakableTypes.forEach(type => {
        const block = engine.createContentBlock(`test-${type}`, 'Test content', type as any);
        expect(block.breakable).toBe(true);
      });

      nonBreakableTypes.forEach(type => {
        const block = engine.createContentBlock(`test-${type}`, 'Test content', type as any);
        expect(block.breakable).toBe(false);
      });
    });

    it('should support custom block options', () => {
      const customBlock = engine.createContentBlock(
        'custom',
        'Custom content',
        'text',
        {
          breakable: false,
          priority: 15,
          estimatedHeight: 5.5
        }
      );

      expect(customBlock.breakable).toBe(false);
      expect(customBlock.priority).toBe(15);
      expect(customBlock.estimatedHeight).toBe(5.5);
    });
  });

  describe('Layout Optimization', () => {
    it('should optimize for minimal page count', () => {
      const contentBlocks = createTestContentBlocks(30);
      const distribution = engine.distributeContent(contentBlocks);

      // Calculate theoretical minimum pages
      const totalHeight = contentBlocks.reduce((sum, block) => sum + block.estimatedHeight, 0);
      const layout = engine.calculateLayout();
      const availableHeightPerPage = layout.pageHeight - layout.margins.top - layout.margins.bottom;
      const theoreticalMinPages = Math.ceil(totalHeight / (availableHeightPerPage * layout.columnCount));

      // Actual pages should be close to theoretical minimum
      const actualPages = Math.ceil(distribution.totalHeight / availableHeightPerPage);
      expect(actualPages).toBeLessThanOrEqual(theoreticalMinPages + 1);
    });

    it('should balance content density and readability', () => {
      const mixedContent = [
        engine.createContentBlock('h1', 'Main Heading', 'heading'),
        engine.createContentBlock('t1', 'Introduction paragraph with moderate length content.', 'text'),
        engine.createContentBlock('f1', 'P(A) = \\frac{|A|}{|S|}', 'formula'),
        engine.createContentBlock('e1', 'Example: Calculate probability of rolling a 6.', 'example'),
        engine.createContentBlock('h2', 'Subheading', 'heading'),
        engine.createContentBlock('t2', 'More detailed explanation with additional content.', 'text'),
        engine.createContentBlock('f2', 'E[X] = \\sum_{i=1}^{n} x_i p_i', 'formula')
      ];

      const distribution = engine.distributeContent(mixedContent);

      // Should achieve good balance (not too uneven)
      expect(distribution.balanceScore).toBeGreaterThan(0.6);
      
      // Should not have excessive overflow risk
      expect(distribution.overflowRisk).toBeLessThan(0.8);
    });

    it('should handle edge cases in content distribution', () => {
      const edgeCases = [
        [], // Empty content
        [engine.createContentBlock('single', 'Single block', 'text')], // Single block
        Array.from({ length: 100 }, (_, i) => 
          engine.createContentBlock(`tiny-${i}`, 'x', 'text')
        ) // Many tiny blocks
      ];

      edgeCases.forEach((contentBlocks, index) => {
        expect(() => {
          const distribution = engine.distributeContent(contentBlocks);
          expect(distribution.columns).toHaveLength(2);
        }).not.toThrow();
      });
    });
  });

  describe('Responsive Layout Behavior', () => {
    it('should adapt to different paper sizes', () => {
      const paperSizes: Array<'a4' | 'letter' | 'legal'> = ['a4', 'letter', 'legal'];
      
      paperSizes.forEach(paperSize => {
        engine.updateConfig({ paperSize });
        const layout = engine.calculateLayout();
        
        expect(layout.pageWidth).toBeGreaterThan(0);
        expect(layout.pageHeight).toBeGreaterThan(0);
        expect(layout.contentWidth).toBeLessThan(layout.pageWidth);
        expect(layout.columnWidth).toBeGreaterThan(0);
      });
    });

    it('should maintain readability across configurations', () => {
      const configurations = [
        { columns: 1, fontSize: 11 },
        { columns: 2, fontSize: 10 },
        { columns: 3, fontSize: 10 }
      ];

      configurations.forEach(config => {
        engine.updateConfig(config);
        const layout = engine.calculateLayout();
        
        // Minimum readability thresholds
        expect(layout.charactersPerLine).toBeGreaterThan(30); // Minimum readable line length
        expect(layout.columnWidth).toBeGreaterThan(2); // Minimum column width in inches
      });
    });
  });

  describe('Error Handling and Validation', () => {
    it('should provide helpful error messages', () => {
      const invalidConfigs = [
        {
          config: { typography: { fontSize: 15, lineHeight: 1.2, fontFamily: {} as any } },
          expectedError: 'Font size too large'
        },
        {
          config: { spacing: { paragraphSpacing: 0.5, listSpacing: 0.2, sectionSpacing: 1, headingMargins: { top: 0.5, bottom: 0.3 } } },
          expectedError: 'Paragraph spacing too large'
        },
        {
          config: { columns: 5 },
          expectedError: 'Too many columns'
        }
      ];

      invalidConfigs.forEach(({ config, expectedError }) => {
        expect(() => {
          new CompactLayoutEngine(config);
        }).toThrow(expect.objectContaining({
          message: expect.stringContaining(expectedError)
        }));
      });
    });

    it('should suggest corrections for invalid configurations', () => {
      try {
        new CompactLayoutEngine({
          spacing: {
            paragraphSpacing: 0.5,
            listSpacing: 0.2,
            sectionSpacing: 1,
            headingMargins: { top: 0.5, bottom: 0.3 }
          }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(LayoutError);
        const layoutError = error as LayoutError;
        expect(layoutError.suggestion).toContain('compact');
        expect(layoutError.suggestion).toContain('0.35');
      }
    });

    it('should validate content blocks', () => {
      expect(() => {
        engine.createContentBlock('', 'content', 'text');
      }).toThrow('Content block ID cannot be empty');

      expect(() => {
        engine.createContentBlock('test', '', 'text');
      }).toThrow('Content cannot be empty');

      expect(() => {
        engine.createContentBlock('test', 'content', 'invalid' as any);
      }).toThrow('Invalid content type');
    });
  });

  // Helper function to create test content blocks
  function createTestContentBlocks(count: number): ContentBlock[] {
    return Array.from({ length: count }, (_, i) => {
      const types = ['text', 'heading', 'formula', 'example', 'list'];
      const type = types[i % types.length];
      const content = `Test ${type} content ${i + 1}. `.repeat(Math.floor(Math.random() * 5) + 1);
      
      return engine.createContentBlock(`block-${i}`, content, type as any);
    });
  }
});