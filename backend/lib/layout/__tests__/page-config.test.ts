import { describe, it, expect } from '@jest/globals';
import {
  getPageDimensions,
  getContentArea,
  getColumnWidth,
  createDefaultPageConfig,
  mmToPx,
  pxToMm,
  generatePageCSSVariables,
} from '../page-config';
import { PaperSize, Orientation } from '../types';

describe('Page Configuration', () => {
  describe('getPageDimensions', () => {
    it('should return correct dimensions for A4 portrait', () => {
      const dimensions = getPageDimensions('a4', 'portrait');
      
      expect(dimensions.width).toBe(210);
      expect(dimensions.height).toBe(297);
      expect(dimensions.unit).toBe('mm');
    });

    it('should return correct dimensions for A4 landscape', () => {
      const dimensions = getPageDimensions('a4', 'landscape');
      
      expect(dimensions.width).toBe(297); // Swapped
      expect(dimensions.height).toBe(210); // Swapped
      expect(dimensions.unit).toBe('mm');
    });

    it('should return correct dimensions for Letter portrait', () => {
      const dimensions = getPageDimensions('letter', 'portrait');
      
      expect(dimensions.width).toBe(216);
      expect(dimensions.height).toBe(279);
      expect(dimensions.unit).toBe('mm');
    });

    it('should return correct dimensions for Letter landscape', () => {
      const dimensions = getPageDimensions('letter', 'landscape');
      
      expect(dimensions.width).toBe(279); // Swapped
      expect(dimensions.height).toBe(216); // Swapped
      expect(dimensions.unit).toBe('mm');
    });

    it('should handle all paper sizes', () => {
      const paperSizes: PaperSize[] = ['a4', 'letter', 'legal', 'a3'];
      const orientations: Orientation[] = ['portrait', 'landscape'];
      
      paperSizes.forEach(size => {
        orientations.forEach(orientation => {
          const dimensions = getPageDimensions(size, orientation);
          
          expect(dimensions.width).toBeGreaterThan(0);
          expect(dimensions.height).toBeGreaterThan(0);
          expect(dimensions.unit).toBe('mm');
        });
      });
    });
  });

  describe('getContentArea', () => {
    it('should calculate content area after subtracting margins', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      const contentArea = getContentArea(config);
      
      // A4 is 210x297mm, default margins are 20,15,20,15
      expect(contentArea.width).toBe(210 - 15 - 15); // 180mm
      expect(contentArea.height).toBe(297 - 20 - 20); // 257mm
      expect(contentArea.unit).toBe('mm');
    });

    it('should handle different margin configurations', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      config.margins = { top: 10, right: 10, bottom: 10, left: 10 };
      
      const contentArea = getContentArea(config);
      
      expect(contentArea.width).toBe(210 - 10 - 10); // 190mm
      expect(contentArea.height).toBe(297 - 10 - 10); // 277mm
    });
  });

  describe('getColumnWidth', () => {
    it('should calculate column width for 2 columns', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      config.columns = 2;
      config.columnGap = 10;
      
      const columnWidth = getColumnWidth(config);
      const contentArea = getContentArea(config);
      
      // (180mm - 10mm gap) / 2 columns = 85mm per column
      expect(columnWidth).toBe((contentArea.width - 10) / 2);
    });

    it('should calculate column width for 3 columns', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      config.columns = 3;
      config.columnGap = 8;
      
      const columnWidth = getColumnWidth(config);
      const contentArea = getContentArea(config);
      
      // (180mm - 2*8mm gaps) / 3 columns
      expect(columnWidth).toBe((contentArea.width - 2 * 8) / 3);
    });

    it('should handle single column layout', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      config.columns = 1;
      
      const columnWidth = getColumnWidth(config);
      const contentArea = getContentArea(config);
      
      expect(columnWidth).toBe(contentArea.width);
    });
  });

  describe('createDefaultPageConfig', () => {
    it('should create default A4 portrait configuration', () => {
      const config = createDefaultPageConfig();
      
      expect(config.paperSize).toBe('a4');
      expect(config.orientation).toBe('portrait');
      expect(config.columns).toBe(2);
      expect(config.columnGap).toBe(10);
      expect(config.margins).toEqual({
        top: 20,
        right: 15,
        bottom: 20,
        left: 15,
      });
    });

    it('should create configuration with specified parameters', () => {
      const config = createDefaultPageConfig('letter', 'landscape');
      
      expect(config.paperSize).toBe('letter');
      expect(config.orientation).toBe('landscape');
      expect(config.columns).toBe(2);
    });
  });

  describe('Unit Conversion', () => {
    describe('mmToPx', () => {
      it('should convert millimeters to pixels correctly', () => {
        // At 96 DPI: 1 inch = 96px, 1 inch = 25.4mm
        // So 25.4mm should equal 96px
        expect(mmToPx(25.4)).toBeCloseTo(96, 1);
        
        // 210mm (A4 width) should be about 794px
        expect(mmToPx(210)).toBeCloseTo(794, 0);
      });

      it('should handle zero and negative values', () => {
        expect(mmToPx(0)).toBe(0);
        expect(mmToPx(-10)).toBeLessThan(0);
      });
    });

    describe('pxToMm', () => {
      it('should convert pixels to millimeters correctly', () => {
        // 96px should equal 25.4mm
        expect(pxToMm(96)).toBeCloseTo(25.4, 1);
        
        // Should be inverse of mmToPx
        const mm = 150;
        expect(pxToMm(mmToPx(mm))).toBeCloseTo(mm, 1);
      });

      it('should handle zero and negative values', () => {
        expect(pxToMm(0)).toBe(0);
        expect(pxToMm(-96)).toBeLessThan(0);
      });
    });
  });

  describe('generatePageCSSVariables', () => {
    it('should generate all required CSS variables', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      const variables = generatePageCSSVariables(config);
      
      const expectedKeys = [
        '--page-width',
        '--page-height',
        '--margin-top',
        '--margin-right',
        '--margin-bottom',
        '--margin-left',
        '--content-width',
        '--content-height',
        '--column-count',
        '--column-gap',
        '--column-width',
      ];
      
      expectedKeys.forEach(key => {
        expect(variables).toHaveProperty(key);
      });
    });

    it('should generate pixel values for dimensions', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      const variables = generatePageCSSVariables(config);
      
      // All dimension values should end with 'px'
      expect(variables['--page-width']).toMatch(/^\d+(\.\d+)?px$/);
      expect(variables['--page-height']).toMatch(/^\d+(\.\d+)?px$/);
      expect(variables['--content-width']).toMatch(/^\d+(\.\d+)?px$/);
      expect(variables['--content-height']).toMatch(/^\d+(\.\d+)?px$/);
    });

    it('should generate correct column count', () => {
      const config = createDefaultPageConfig('a4', 'portrait');
      config.columns = 3;
      
      const variables = generatePageCSSVariables(config);
      
      expect(variables['--column-count']).toBe('3');
    });

    it('should handle different paper sizes', () => {
      const a4Config = createDefaultPageConfig('a4', 'portrait');
      const letterConfig = createDefaultPageConfig('letter', 'portrait');
      
      const a4Variables = generatePageCSSVariables(a4Config);
      const letterVariables = generatePageCSSVariables(letterConfig);
      
      // Letter is wider than A4
      const a4Width = parseFloat(a4Variables['--page-width']);
      const letterWidth = parseFloat(letterVariables['--page-width']);
      
      expect(letterWidth).toBeGreaterThan(a4Width);
    });

    it('should handle landscape orientation', () => {
      const portraitConfig = createDefaultPageConfig('a4', 'portrait');
      const landscapeConfig = createDefaultPageConfig('a4', 'landscape');
      
      const portraitVars = generatePageCSSVariables(portraitConfig);
      const landscapeVars = generatePageCSSVariables(landscapeConfig);
      
      // In landscape, width and height should be swapped
      expect(portraitVars['--page-width']).toBe(landscapeVars['--page-height']);
      expect(portraitVars['--page-height']).toBe(landscapeVars['--page-width']);
    });
  });
});