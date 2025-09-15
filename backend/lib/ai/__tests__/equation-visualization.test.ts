/**
 * Unit tests for equation visualization system
 */

import { SimpleImageGenerator, ParsedEquation, EquationType, FlatLineStyle, ImageDimensions } from '../simple-image-generator';

describe('Equation Visualization System', () => {
  let generator: SimpleImageGenerator;
  let defaultStyle: FlatLineStyle;
  let defaultDimensions: ImageDimensions;

  beforeEach(() => {
    generator = new SimpleImageGenerator();
    defaultStyle = {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    };
    defaultDimensions = {
      width: 400,
      height: 300
    };
  });

  describe('Equation Parsing', () => {
    test('should parse linear equation correctly', async () => {
      const equation = 'y = 2x + 3';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Linear function',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('y = 2x + 3');
      expect(result.metadata.type).toBe('equation');
      expect(result.dimensions).toEqual(defaultDimensions);
    });

    test('should parse quadratic equation correctly', async () => {
      const equation = 'x^2 + 2x - 3 = 0';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Quadratic equation',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('<tspan baseline-shift="super"');
      expect(result.svgContent).toContain('Parabola');
    });

    test('should parse trigonometric equation correctly', async () => {
      const equation = 'sin(x) = 0.5';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Trigonometric equation',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('sin(x)');
      expect(result.svgContent).toContain('Trigonometric Function');
    });

    test('should parse exponential equation correctly', async () => {
      const equation = 'y = 2^x';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Exponential growth',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('2<tspan');
      expect(result.svgContent).toContain('Exponential Growth');
    });

    test('should parse logarithmic equation correctly', async () => {
      const equation = 'y = log(x)';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Logarithmic function',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('log(x)');
      expect(result.svgContent).toContain('Logarithmic Function');
    });

    test('should parse inequality correctly', async () => {
      const equation = 'x > 5';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Linear inequality',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('x > 5');
      expect(result.svgContent).toContain('Solution on Number Line');
    });
  });

  describe('Mathematical Notation Formatting', () => {
    test('should format exponents correctly', () => {
      const formatted = generator.formatMathematicalNotation('x^2 + y^3');
      expect(formatted).toContain('<tspan baseline-shift="super"');
      expect(formatted).toContain('2</tspan>');
      expect(formatted).toContain('3</tspan>');
    });

    test('should format subscripts correctly', () => {
      const formatted = generator.formatMathematicalNotation('x_1 + x_2');
      expect(formatted).toContain('<tspan baseline-shift="sub"');
      expect(formatted).toContain('1</tspan>');
      expect(formatted).toContain('2</tspan>');
    });

    test('should convert basic operations to symbols', () => {
      const formatted = generator.formatMathematicalNotation('a * b / c');
      expect(formatted).toContain('×');
      expect(formatted).toContain('÷');
    });

    test('should convert Greek letters', () => {
      const formatted = generator.formatMathematicalNotation('pi + alpha + beta');
      expect(formatted).toContain('π');
      expect(formatted).toContain('α');
      expect(formatted).toContain('β');
    });

    test('should convert inequality symbols', () => {
      const formatted = generator.formatMathematicalNotation('x <= 5 and y >= 3 and z != 0');
      expect(formatted).toContain('≤');
      expect(formatted).toContain('≥');
      expect(formatted).toContain('≠');
    });

    test('should convert square root notation', () => {
      const formatted = generator.formatMathematicalNotation('sqrt(x) + sqrt(y)');
      expect(formatted).toContain('√(x)');
      expect(formatted).toContain('√(y)');
    });

    test('should handle complex expressions', () => {
      const formatted = generator.formatMathematicalNotation('x^2 + 2*pi*sqrt(y_1) <= infinity');
      expect(formatted).toContain('<tspan baseline-shift="super"');
      expect(formatted).toContain('×');
      expect(formatted).toContain('π');
      expect(formatted).toContain('√');
      expect(formatted).toContain('<tspan baseline-shift="sub"');
      expect(formatted).toContain('≤');
      expect(formatted).toContain('∞');
    });
  });

  describe('Equation Type Detection', () => {
    // Note: These tests access private methods through type assertion for testing purposes
    // In a real implementation, you might want to make these methods protected or create a test interface

    test('should detect linear equations', () => {
      const generator = new SimpleImageGenerator();
      // Test through public interface
      const testEquations = [
        'y = 2x + 3',
        '3x - 4 = 0',
        'y = mx + b'
      ];
      
      // We test this indirectly through the visualization output
      testEquations.forEach(async (equation) => {
        const request = {
          type: 'equation' as const,
          content: equation,
          context: '',
          style: defaultStyle,
          dimensions: defaultDimensions
        };
        const result = await generator.generateFlatLineImage(request);
        expect(result.svgContent).toContain('Linear Equation');
      });
    });

    test('should detect quadratic equations', async () => {
      const equation = 'x^2 + 2x + 1 = 0';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('Quadratic Equation');
    });

    test('should detect trigonometric equations', async () => {
      const equation = 'sin(x) + cos(y) = 1';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('Trigonometric Equation');
    });

    test('should detect exponential equations', async () => {
      const equation = 'y = exp(x)';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('Exponential Equation');
    });

    test('should detect logarithmic equations', async () => {
      const equation = 'y = ln(x)';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('Logarithmic Equation');
    });

    test('should detect inequalities', async () => {
      const equation = '2x + 3 > 7';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('Inequality');
    });
  });

  describe('Template Rendering', () => {
    test('should render quadratic template with parabola', async () => {
      const equation = 'y = x^2';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('polyline');
      expect(result.svgContent).toContain('Parabola');
    });

    test('should render linear template with line', async () => {
      const equation = 'y = 2x + 1';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('line');
      expect(result.svgContent).toContain('slope');
    });

    test('should render trigonometric template with wave', async () => {
      const equation = 'y = sin(x)';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('polyline');
      expect(result.svgContent).toContain('Trigonometric Function');
    });

    test('should render inequality template with number line', async () => {
      const equation = 'x >= -2';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result.svgContent).toContain('line');
      expect(result.svgContent).toContain('circle');
      expect(result.svgContent).toContain('Solution on Number Line');
    });
  });

  describe('Style Variations', () => {
    test('should apply different line weights', async () => {
      const equation = 'y = x^2';
      const styles: FlatLineStyle[] = [
        { ...defaultStyle, lineWeight: 'thin' },
        { ...defaultStyle, lineWeight: 'medium' },
        { ...defaultStyle, lineWeight: 'thick' }
      ];
      
      for (const style of styles) {
        const request = {
          type: 'equation' as const,
          content: equation,
          context: '',
          style,
          dimensions: defaultDimensions
        };
        
        const result = await generator.generateFlatLineImage(request);
        expect(result.svgContent).toContain('stroke-width');
      }
    });

    test('should apply different color schemes', async () => {
      const equation = 'y = x + 1';
      const styles: FlatLineStyle[] = [
        { ...defaultStyle, colorScheme: 'monochrome' },
        { ...defaultStyle, colorScheme: 'minimal-color' }
      ];
      
      for (const style of styles) {
        const request = {
          type: 'equation' as const,
          content: equation,
          context: '',
          style,
          dimensions: defaultDimensions
        };
        
        const result = await generator.generateFlatLineImage(request);
        expect(result.svgContent).toContain('fill');
        expect(result.svgContent).toContain('stroke');
      }
    });

    test('should toggle annotations', async () => {
      const equation = 'y = 2x^2 + 3x - 1';
      
      const withAnnotations = {
        type: 'equation' as const,
        content: equation,
        context: 'Test context',
        style: { ...defaultStyle, annotations: true },
        dimensions: defaultDimensions
      };
      
      const withoutAnnotations = {
        type: 'equation' as const,
        content: equation,
        context: 'Test context',
        style: { ...defaultStyle, annotations: false },
        dimensions: defaultDimensions
      };
      
      const resultWith = await generator.generateFlatLineImage(withAnnotations);
      const resultWithout = await generator.generateFlatLineImage(withoutAnnotations);
      
      expect(resultWith.svgContent).toContain('Variables:');
      expect(resultWithout.svgContent).not.toContain('Variables:');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty equations', async () => {
      const request = {
        type: 'equation' as const,
        content: '',
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('<svg');
    });

    test('should handle malformed equations', async () => {
      const request = {
        type: 'equation' as const,
        content: 'x + + = y',
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('<svg');
    });

    test('should handle very long equations', async () => {
      const longEquation = 'x^10 + 9x^9 + 8x^8 + 7x^7 + 6x^6 + 5x^5 + 4x^4 + 3x^3 + 2x^2 + x + 1 = 0';
      const request = {
        type: 'equation' as const,
        content: longEquation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('<svg');
    });
  });

  describe('SVG Output Validation', () => {
    test('should generate valid SVG structure', async () => {
      const equation = 'y = x^2 + 2x + 1';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      
      expect(result.svgContent).toMatch(/^<svg[^>]*>/);
      expect(result.svgContent).toMatch(/<\/svg>$/);
      expect(result.svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(result.svgContent).toContain(`width="${defaultDimensions.width}"`);
      expect(result.svgContent).toContain(`height="${defaultDimensions.height}"`);
    });

    test('should generate valid base64 encoding', async () => {
      const equation = 'y = x + 1';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: '',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      
      expect(result.base64).toMatch(/^data:image\/svg\+xml;base64,/);
      
      // Verify base64 can be decoded
      const base64Data = result.base64.split(',')[1];
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      expect(decoded).toContain('<svg');
    });

    test('should include proper metadata', async () => {
      const equation = 'sin(x) = 0.5';
      const request = {
        type: 'equation' as const,
        content: equation,
        context: 'Test context',
        style: defaultStyle,
        dimensions: defaultDimensions
      };
      
      const result = await generator.generateFlatLineImage(request);
      
      expect(result.metadata.type).toBe('equation');
      expect(result.metadata.content).toBe(equation);
      expect(result.metadata.style).toEqual(defaultStyle);
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    });
  });
});