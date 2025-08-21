import { describe, it, expect, beforeEach } from '@jest/globals';
import { LayoutEngine, createContentBlock, createContentBlocks } from '../index';
import { LayoutConfig, ContentBlock } from '../types';

describe('LayoutEngine', () => {
  let layoutEngine: LayoutEngine;
  let sampleBlocks: ContentBlock[];

  beforeEach(() => {
    layoutEngine = new LayoutEngine();
    sampleBlocks = createContentBlocks([
      { id: '1', content: 'This is a heading', type: 'heading', priority: 8 },
      { id: '2', content: 'This is a paragraph with some content that should wrap across multiple lines when the column width is narrow.', type: 'paragraph', priority: 6 },
      { id: '3', content: 'Item 1\nItem 2\nItem 3', type: 'list', priority: 5 },
      { id: '4', content: 'Table data here', type: 'table', priority: 4 },
      { id: '5', content: 'Image caption', type: 'image', priority: 3 },
    ]);
  });

  describe('Configuration Management', () => {
    it('should create with default configuration', () => {
      const config = layoutEngine.getConfig();
      
      expect(config.page.paperSize).toBe('a4');
      expect(config.page.orientation).toBe('portrait');
      expect(config.page.columns).toBe(2);
      expect(config.text.size).toBe('medium');
      expect(config.maxPages).toBe(2);
    });

    it('should update page configuration', () => {
      layoutEngine.updatePageConfig('letter', 'landscape', 3);
      const config = layoutEngine.getConfig();
      
      expect(config.page.paperSize).toBe('letter');
      expect(config.page.orientation).toBe('landscape');
      expect(config.page.columns).toBe(3);
    });

    it('should update text configuration', () => {
      layoutEngine.updateTextConfig('large');
      const config = layoutEngine.getConfig();
      
      expect(config.text.size).toBe('large');
      expect(config.text.baseFontSize).toBe(14);
    });

    it('should validate configuration and return warnings', () => {
      layoutEngine.updatePageConfig('a4', 'portrait', 4); // Too many columns
      const warnings = layoutEngine.validateConfig();
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('spacing');
      expect(warnings[0].message).toContain('Too many columns');
    });
  });

  describe('Layout Calculation', () => {
    it('should calculate layout for content blocks', () => {
      const layout = layoutEngine.calculateLayout(sampleBlocks);
      
      expect(layout.availableSpace).toBeDefined();
      expect(layout.usedSpace).toBeDefined();
      expect(layout.contentBlocks).toHaveLength(5);
      expect(layout.overflow).toBeDefined();
      expect(layout.pageBreaks).toBeDefined();
    });

    it('should handle empty content blocks', () => {
      const layout = layoutEngine.calculateLayout([]);
      
      expect(layout.contentBlocks).toHaveLength(0);
      expect(layout.overflow.hasOverflow).toBe(false);
    });

    it('should prioritize high-priority content', () => {
      const layout = layoutEngine.calculateLayout(sampleBlocks);
      
      // The heading (priority 8) should be processed first
      expect(layout.contentBlocks[0].priority).toBe(8);
    });
  });

  describe('Overflow Analysis', () => {
    it('should detect overflow when content exceeds available space', () => {
      // Create a lot of content to force overflow
      const largeBlocks = Array.from({ length: 20 }, (_, i) => 
        createContentBlock(
          `block-${i}`,
          'This is a very long paragraph that contains a lot of text content that should definitely cause overflow when there are many such blocks in a limited space layout configuration.',
          'paragraph',
          5
        )
      );

      const overflow = layoutEngine.analyzeOverflow(largeBlocks);
      
      expect(overflow.hasOverflow).toBe(true);
      expect(overflow.overflowAmount).toBeGreaterThan(0);
      expect(overflow.suggestions.length).toBeGreaterThan(0); // Should have suggestions
    });

    it('should provide suggestions for overflow resolution', () => {
      const largeBlocks = Array.from({ length: 15 }, (_, i) => 
        createContentBlock(`block-${i}`, 'Long content here', 'paragraph', 5)
      );

      const overflow = layoutEngine.analyzeOverflow(largeBlocks);
      
      // Should have at least one suggestion
      expect(overflow.suggestions.length).toBeGreaterThan(0);
      
      // Check that suggestions have the right structure
      overflow.suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('impact');
        expect(suggestion).toHaveProperty('estimatedReduction');
      });
    });

    it('should not detect overflow for small content', () => {
      const smallBlocks = [
        createContentBlock('1', 'Short text', 'paragraph', 5),
        createContentBlock('2', 'Another short text', 'paragraph', 5),
      ];

      const overflow = layoutEngine.analyzeOverflow(smallBlocks);
      
      expect(overflow.hasOverflow).toBe(false);
      expect(overflow.overflowAmount).toBe(0);
    });
  });

  describe('CSS Generation', () => {
    it('should generate CSS variables for current configuration', () => {
      const variables = layoutEngine.generateCSSVariables();
      
      expect(variables).toHaveProperty('--page-width');
      expect(variables).toHaveProperty('--page-height');
      expect(variables).toHaveProperty('--font-size-body');
      expect(variables).toHaveProperty('--column-count');
      
      expect(variables['--column-count']).toBe('2');
    });

    it('should generate complete print CSS', () => {
      const css = layoutEngine.generatePrintCSS();
      
      expect(css).toContain('@media print');
      expect(css).toContain('@page');
      expect(css).toContain('.cheat-sheet');
      expect(css).toContain('column-count: var(--column-count)');
    });

    it('should update CSS variables when configuration changes', () => {
      layoutEngine.updatePageConfig('letter', 'landscape', 3);
      const variables = layoutEngine.generateCSSVariables();
      
      expect(variables['--column-count']).toBe('3');
    });
  });

  describe('Layout Optimization', () => {
    it('should optimize layout by removing low-priority content when overflowing', () => {
      // Create blocks with different priorities
      const mixedBlocks = [
        createContentBlock('high1', 'High priority content', 'paragraph', 9),
        createContentBlock('high2', 'Another high priority', 'paragraph', 8),
        createContentBlock('low1', 'Low priority content', 'paragraph', 2),
        createContentBlock('low2', 'Another low priority', 'paragraph', 1),
      ];

      // Add many low priority blocks to force overflow
      for (let i = 0; i < 20; i++) {
        mixedBlocks.push(
          createContentBlock(`low-${i}`, 'Low priority filler content', 'paragraph', 1)
        );
      }

      const optimized = layoutEngine.optimizeLayout(mixedBlocks);
      
      // Should keep high priority content
      expect(optimized.some(block => block.id === 'high1')).toBe(true);
      expect(optimized.some(block => block.id === 'high2')).toBe(true);
    });

    it('should not modify layout when no overflow occurs', () => {
      const optimized = layoutEngine.optimizeLayout(sampleBlocks);
      
      expect(optimized).toHaveLength(sampleBlocks.length);
      expect(optimized.map(b => b.id)).toEqual(sampleBlocks.map(b => b.id));
    });
  });

  describe('Warning Generation', () => {
    it('should generate warnings for readability issues', () => {
      // Create a config with very small text that should trigger warnings
      layoutEngine.updateConfig({
        text: { ...layoutEngine.getConfig().text, baseFontSize: 6 }
      });
      const warnings = layoutEngine.generateWarnings(sampleBlocks);
      
      // Should include readability warnings for very small text
      const readabilityWarnings = warnings.filter(w => w.type === 'readability');
      expect(readabilityWarnings.length).toBeGreaterThan(0);
    });

    it('should generate warnings for overflow', () => {
      const largeBlocks = Array.from({ length: 25 }, (_, i) => 
        createContentBlock(`block-${i}`, 'Content that will overflow', 'paragraph', 5)
      );

      const warnings = layoutEngine.generateWarnings(largeBlocks);
      
      const overflowWarnings = warnings.filter(w => w.type === 'overflow');
      expect(overflowWarnings.length).toBeGreaterThan(0);
    });

    it('should generate warnings for spacing issues', () => {
      layoutEngine.updatePageConfig('a4', 'portrait', 4); // Many columns
      const warnings = layoutEngine.generateWarnings(sampleBlocks);
      
      const spacingWarnings = warnings.filter(w => w.type === 'spacing');
      expect(spacingWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Different Paper Sizes and Orientations', () => {
    it('should handle A4 portrait correctly', () => {
      layoutEngine.updatePageConfig('a4', 'portrait');
      const variables = layoutEngine.generateCSSVariables();
      
      // A4 portrait: 210mm x 297mm
      expect(parseFloat(variables['--page-width'])).toBeCloseTo(794, 0); // ~210mm in px
      expect(parseFloat(variables['--page-height'])).toBeCloseTo(1123, 0); // ~297mm in px
    });

    it('should handle Letter landscape correctly', () => {
      layoutEngine.updatePageConfig('letter', 'landscape');
      const variables = layoutEngine.generateCSSVariables();
      
      // Letter landscape: 279mm x 216mm (swapped)
      expect(parseFloat(variables['--page-width'])).toBeCloseTo(1054, 0); // ~279mm in px
      expect(parseFloat(variables['--page-height'])).toBeCloseTo(816, 0); // ~216mm in px
    });

    it('should adjust content area based on margins', () => {
      const config = layoutEngine.getConfig();
      const layout = layoutEngine.calculateLayout(sampleBlocks);
      
      // Content area should be smaller than page size due to margins
      const pageWidth = 794; // A4 width in px
      const pageHeight = 1123; // A4 height in px
      
      expect(layout.availableSpace.width).toBeLessThan(pageWidth);
      expect(layout.availableSpace.height).toBeLessThan(pageHeight);
    });
  });
});