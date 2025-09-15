import { describe, it, expect } from '@jest/globals';
import {
  getTextConfig,
  calculateFontSizes,
  validateTextReadability,
  generateTextCSSVariables,
  estimateTextHeight,
  suggestOptimalTextSize,
} from '../text-config';
import { TextSize } from '../types';

describe('Text Configuration', () => {
  describe('getTextConfig', () => {
    it('should return configuration for small text size', () => {
      const config = getTextConfig('small');
      
      expect(config.size).toBe('small');
      expect(config.baseFontSize).toBe(10);
      expect(config.lineHeight).toBe(1.2);
      expect(config.fontFamily).toContain('system-ui');
    });

    it('should return configuration for medium text size', () => {
      const config = getTextConfig('medium');
      
      expect(config.size).toBe('medium');
      expect(config.baseFontSize).toBe(12);
      expect(config.lineHeight).toBe(1.3);
    });

    it('should return configuration for large text size', () => {
      const config = getTextConfig('large');
      
      expect(config.size).toBe('large');
      expect(config.baseFontSize).toBe(14);
      expect(config.lineHeight).toBe(1.4);
    });

    it('should return different configurations for different sizes', () => {
      const small = getTextConfig('small');
      const medium = getTextConfig('medium');
      const large = getTextConfig('large');
      
      expect(small.baseFontSize).toBeLessThan(medium.baseFontSize);
      expect(medium.baseFontSize).toBeLessThan(large.baseFontSize);
      
      expect(small.lineHeight).toBeLessThan(medium.lineHeight);
      expect(medium.lineHeight).toBeLessThan(large.lineHeight);
    });
  });

  describe('calculateFontSizes', () => {
    it('should calculate font sizes based on base font size', () => {
      const config = getTextConfig('medium'); // baseFontSize: 12
      const fontSizes = calculateFontSizes(config);
      
      expect(fontSizes.h1).toBeGreaterThan(fontSizes.h2);
      expect(fontSizes.h2).toBeGreaterThan(fontSizes.h3);
      expect(fontSizes.h3).toBeGreaterThan(fontSizes.body);
      expect(fontSizes.body).toBeGreaterThan(fontSizes.small);
      expect(fontSizes.small).toBeGreaterThan(fontSizes.caption);
    });

    it('should respect minimum readable sizes', () => {
      const config = getTextConfig('small'); // baseFontSize: 10
      const fontSizes = calculateFontSizes(config);
      
      // Even with small base size, should maintain minimum readable sizes
      expect(fontSizes.h1).toBeGreaterThanOrEqual(14);
      expect(fontSizes.h2).toBeGreaterThanOrEqual(12);
      expect(fontSizes.h3).toBeGreaterThanOrEqual(11);
      expect(fontSizes.body).toBeGreaterThanOrEqual(9);
      expect(fontSizes.caption).toBeGreaterThanOrEqual(8);
    });

    it('should scale proportionally for larger base sizes', () => {
      const smallConfig = getTextConfig('small');
      const largeConfig = getTextConfig('large');
      
      const smallSizes = calculateFontSizes(smallConfig);
      const largeSizes = calculateFontSizes(largeConfig);
      
      // Large configuration should have larger font sizes
      expect(largeSizes.body).toBeGreaterThan(smallSizes.body);
      expect(largeSizes.h1).toBeGreaterThan(smallSizes.h1);
    });
  });

  describe('validateTextReadability', () => {
    it('should not generate warnings for medium text size', () => {
      const config = getTextConfig('medium');
      const warnings = validateTextReadability(config);
      
      // Medium size should be readable without warnings
      expect(warnings).toHaveLength(0);
    });

    it('should generate warnings for very small text', () => {
      const config = getTextConfig('small');
      config.baseFontSize = 6; // Very small
      
      const warnings = validateTextReadability(config);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.type === 'readability')).toBe(true);
    });

    it('should generate warnings for tight line height', () => {
      const config = getTextConfig('medium');
      config.lineHeight = 1.0; // Very tight
      
      const warnings = validateTextReadability(config);
      
      expect(warnings.some(w => w.message.includes('Line height'))).toBe(true);
    });

    it('should categorize warnings by severity', () => {
      const config = getTextConfig('small');
      config.baseFontSize = 5; // Extremely small
      config.lineHeight = 0.9; // Very tight
      
      const warnings = validateTextReadability(config);
      
      const highSeverity = warnings.filter(w => w.severity === 'high');
      const mediumSeverity = warnings.filter(w => w.severity === 'medium');
      
      expect(highSeverity.length).toBeGreaterThan(0);
      expect(mediumSeverity.length).toBeGreaterThan(0);
    });
  });

  describe('generateTextCSSVariables', () => {
    it('should generate all required CSS variables', () => {
      const config = getTextConfig('medium');
      const variables = generateTextCSSVariables(config);
      
      const expectedKeys = [
        '--font-family',
        '--line-height',
        '--font-size-h1',
        '--font-size-h2',
        '--font-size-h3',
        '--font-size-body',
        '--font-size-small',
        '--font-size-caption',
      ];
      
      expectedKeys.forEach(key => {
        expect(variables).toHaveProperty(key);
      });
    });

    it('should generate pixel values for font sizes', () => {
      const config = getTextConfig('medium');
      const variables = generateTextCSSVariables(config);
      
      // Font size values should end with 'px'
      expect(variables['--font-size-h1']).toMatch(/^\d+(\.\d+)?px$/);
      expect(variables['--font-size-body']).toMatch(/^\d+(\.\d+)?px$/);
      expect(variables['--font-size-caption']).toMatch(/^\d+(\.\d+)?px$/);
    });

    it('should include font family and line height', () => {
      const config = getTextConfig('medium');
      const variables = generateTextCSSVariables(config);
      
      expect(variables['--font-family']).toBe(config.fontFamily);
      expect(variables['--line-height']).toBe(config.lineHeight.toString());
    });

    it('should generate different values for different text sizes', () => {
      const smallVars = generateTextCSSVariables(getTextConfig('small'));
      const largeVars = generateTextCSSVariables(getTextConfig('large'));
      
      const smallBodySize = parseFloat(smallVars['--font-size-body']);
      const largeBodySize = parseFloat(largeVars['--font-size-body']);
      
      expect(largeBodySize).toBeGreaterThan(smallBodySize);
    });
  });

  describe('estimateTextHeight', () => {
    it('should estimate height based on text length and font size', () => {
      const shortText = 'Short text';
      const longText = 'This is a much longer text that should wrap to multiple lines when rendered in a narrow column width, resulting in a taller estimated height.';
      
      const shortHeight = estimateTextHeight(shortText, 12, 1.3, 200);
      const longHeight = estimateTextHeight(longText, 12, 1.3, 200);
      
      expect(longHeight).toBeGreaterThan(shortHeight);
    });

    it('should account for font size in height calculation', () => {
      const text = 'Sample text for height estimation';
      
      const smallHeight = estimateTextHeight(text, 10, 1.3, 200);
      const largeHeight = estimateTextHeight(text, 16, 1.3, 200);
      
      expect(largeHeight).toBeGreaterThan(smallHeight);
    });

    it('should account for line height in calculation', () => {
      const text = 'Sample text for height estimation';
      
      const tightHeight = estimateTextHeight(text, 12, 1.0, 200);
      const looseHeight = estimateTextHeight(text, 12, 2.0, 200);
      
      expect(looseHeight).toBeGreaterThan(tightHeight);
    });

    it('should account for column width in wrapping', () => {
      const text = 'This is a long text that will wrap differently based on column width';
      
      const narrowHeight = estimateTextHeight(text, 12, 1.3, 100);
      const wideHeight = estimateTextHeight(text, 12, 1.3, 400);
      
      expect(narrowHeight).toBeGreaterThan(wideHeight);
    });
  });

  describe('suggestOptimalTextSize', () => {
    it('should suggest smaller text size for large content in limited space', () => {
      const largeContentLength = 5000; // Lots of text
      const limitedHeight = 200; // Small available height
      const columnWidth = 200;
      
      const suggestion = suggestOptimalTextSize(largeContentLength, limitedHeight, columnWidth);
      
      expect(suggestion).toBe('small');
    });

    it('should suggest larger text size for small content in ample space', () => {
      const smallContentLength = 100; // Little text
      const ampleHeight = 1000; // Lots of available height
      const columnWidth = 300;
      
      const suggestion = suggestOptimalTextSize(smallContentLength, ampleHeight, columnWidth);
      
      expect(['medium', 'large']).toContain(suggestion);
    });

    it('should fallback to small size when nothing fits', () => {
      const hugeContentLength = 50000; // Enormous amount of text
      const tinyHeight = 50; // Very little space
      const columnWidth = 100;
      
      const suggestion = suggestOptimalTextSize(hugeContentLength, tinyHeight, columnWidth);
      
      expect(suggestion).toBe('small');
    });

    it('should test all text sizes in order', () => {
      const textSizes: TextSize[] = ['small', 'medium', 'large'];
      
      // Test with moderate content and space
      const contentLength = 1000;
      const availableHeight = 400;
      const columnWidth = 250;
      
      const suggestion = suggestOptimalTextSize(contentLength, availableHeight, columnWidth);
      
      expect(textSizes).toContain(suggestion);
    });
  });
});