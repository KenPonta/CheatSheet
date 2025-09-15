// Tests for mathematical content rendering system

import {
  MathContentRenderer,
  createMathRenderer,
  extractMathFromText,
  RenderedFormula,
  RenderedExample,
  ValidationResult
} from '../math-renderer';
import {
  Formula,
  WorkedExample,
  SolutionStep,
  MathRenderingConfig,
  MathContentExtractionError
} from '../types';

describe('MathContentRenderer', () => {
  let renderer: MathContentRenderer;
  let config: MathRenderingConfig;

  beforeEach(() => {
    config = {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 20
      }
    };
    renderer = new MathContentRenderer(config, 'mathjax');
  });

  describe('Formula Rendering', () => {
    it('should render inline formulas correctly', () => {
      const formula: Formula = {
        id: 'test-inline-1',
        latex: 'x^2 + y^2 = z^2',
        context: 'Pythagorean theorem',
        type: 'inline',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 0.95
      };

      const result = renderer.renderFormula(formula);

      expect(result.id).toBe('test-inline-1');
      expect(result.type).toBe('inline');
      expect(result.latex).toBe('x^2 + y^2 = z^2');
      expect(result.html).toContain('inline-math');
      expect(result.numbered).toBe(false);
      expect(result.equationNumber).toBeUndefined();
    });

    it('should render display formulas with numbering', () => {
      const formula: Formula = {
        id: 'test-display-1',
        latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
        context: 'Sum of first n natural numbers',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 0.98
      };

      const result = renderer.renderFormula(formula);

      expect(result.id).toBe('test-display-1');
      expect(result.type).toBe('display');
      expect(result.numbered).toBe(true);
      expect(result.equationNumber).toBe('1');
      expect(result.html).toContain('equation');
    });

    it('should handle formula rendering errors gracefully', () => {
      const formula: Formula = {
        id: 'test-error',
        latex: '\\invalid{command}',
        context: 'Invalid LaTeX',
        type: 'display',
        sourceLocation: { fileId: 'test', page: 1 },
        isKeyFormula: false,
        confidence: 0.5
      };

      // Should not throw but handle gracefully
      expect(() => renderer.renderFormula(formula)).not.toThrow();
    });

    it('should detect full-width requirements for complex formulas', () => {
      const complexFormula: Formula = {
        id: 'test-complex',
        latex: '\\begin{align} P(A|B) &= \\frac{P(B|A)P(A)}{P(B)} \\\\ &= \\frac{P(B|A)P(A)}{P(B|A)P(A) + P(B|A^c)P(A^c)} \\end{align}',
        context: 'Bayes theorem expanded',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 0.99
      };

      const result = renderer.renderFormula(complexFormula);
      expect(result.requiresFullWidth).toBe(true);
    });
  });

  describe('Worked Example Rendering', () => {
    it('should render complete worked examples', () => {
      const example: WorkedExample = {
        id: 'example-1',
        title: 'Conditional Probability Example',
        problem: 'Find P(A|B) given P(A) = 0.3, P(B) = 0.4, P(A∩B) = 0.12',
        solution: [
          {
            stepNumber: 1,
            description: 'Use the conditional probability formula',
            formula: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
            explanation: 'This is the definition of conditional probability'
          },
          {
            stepNumber: 2,
            description: 'Substitute the given values',
            formula: 'P(A|B) = \\frac{0.12}{0.4}',
            explanation: 'Replace with the known probabilities'
          },
          {
            stepNumber: 3,
            description: 'Calculate the result',
            formula: 'P(A|B) = 0.3',
            explanation: 'Simplify the fraction'
          }
        ],
        sourceLocation: { fileId: 'test' },
        subtopic: 'conditional-probability',
        confidence: 0.95,
        isComplete: true
      };

      const result = renderer.renderWorkedExample(example);

      expect(result.id).toBe('example-1');
      expect(result.title).toBe('Conditional Probability Example');
      expect(result.solution).toHaveLength(3);
      expect(result.solution[0].stepNumber).toBe(1);
      expect(result.solution[0].formula).toBeDefined();
      expect(result.totalHeight).toBeGreaterThan(0);
    });

    it('should handle examples without formulas in steps', () => {
      const example: WorkedExample = {
        id: 'example-text',
        title: 'Text-only Example',
        problem: 'Explain the concept of independence',
        solution: [
          {
            stepNumber: 1,
            description: 'Two events are independent if the occurrence of one does not affect the other',
            explanation: 'This is the conceptual definition'
          }
        ],
        sourceLocation: { fileId: 'test' },
        subtopic: 'independence',
        confidence: 0.9,
        isComplete: true
      };

      const result = renderer.renderWorkedExample(example);

      expect(result.solution[0].formula).toBeUndefined();
      expect(result.solution[0].description.html).toContain('Two events are independent');
    });
  });

  describe('Content Rendering', () => {
    it('should render mixed text and math content', () => {
      const text = 'The probability is $P(A) = 0.5$ and the formula is $$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$$';
      
      const result = renderer['renderContent'](text, config);

      expect(result.containsMath).toBe(true);
      expect(result.mathElements).toHaveLength(2);
      // Find the display and inline elements
      const displayElements = result.mathElements.filter(el => el.type === 'display');
      const inlineElements = result.mathElements.filter(el => el.type === 'inline');
      expect(displayElements).toHaveLength(1);
      expect(inlineElements).toHaveLength(1);
      expect(result.plainText).toContain('[MATH]');
    });

    it('should handle text without math content', () => {
      const text = 'This is plain text without any mathematical content.';
      
      const result = renderer['renderContent'](text, config);

      expect(result.containsMath).toBe(false);
      expect(result.mathElements).toHaveLength(0);
      expect(result.html).toBe(text);
      expect(result.plainText).toBe(text);
    });
  });

  describe('Validation', () => {
    it('should validate rendered content correctly', () => {
      const validContent = {
        html: '<span class="math-content">$x^2$</span>',
        plainText: 'x squared',
        containsMath: true,
        mathElements: [{
          id: 'test',
          html: '<span>$x^2$</span>',
          latex: 'x^2',
          type: 'inline' as const,
          numbered: false,
          width: 30,
          height: 20,
          requiresFullWidth: false
        }]
      };

      const result = renderer.validateRendering(validContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.renderingQuality).toBeGreaterThan(0.8);
    });

    it('should detect validation issues', () => {
      const invalidContent = {
        html: '<span>unclosed tag',
        plainText: 'text',
        containsMath: true,
        mathElements: []
      };

      const result = renderer.validateRendering(invalidContent);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should generate correct MathJax configuration', () => {
      const mathJaxConfig = renderer.getMathJaxConfig();

      expect(mathJaxConfig.tex.tags).toBe('ams');
      expect(mathJaxConfig.svg.displayAlign).toBe('center');
      expect(mathJaxConfig.tex.inlineMath).toContainEqual(['$', '$']);
      expect(mathJaxConfig.tex.displayMath).toContainEqual(['$$', '$$']);
    });

    it('should generate correct KaTeX configuration', () => {
      const katexConfig = renderer.getKaTeXConfig(true);

      expect(katexConfig.displayMode).toBe(true);
      expect(katexConfig.throwOnError).toBe(false);
      expect(katexConfig.macros).toHaveProperty('\\RR');
      expect(katexConfig.macros).toHaveProperty('\\PP');
    });

    it('should update configuration correctly', () => {
      const newConfig: MathRenderingConfig = {
        displayEquations: {
          centered: false,
          numbered: false,
          fullWidth: false
        },
        inlineEquations: {
          preserveInline: false,
          maxHeight: 15
        }
      };

      renderer.updateConfig(newConfig);

      const formula: Formula = {
        id: 'test-config',
        latex: 'E = mc^2',
        context: 'Einstein equation',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 1.0
      };

      const result = renderer.renderFormula(formula);
      expect(result.numbered).toBe(false);
    });
  });

  describe('Equation Numbering', () => {
    it('should increment equation numbers correctly', () => {
      const formula1: Formula = {
        id: 'eq1',
        latex: 'a^2 + b^2 = c^2',
        context: 'Pythagorean theorem',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 1.0
      };

      const formula2: Formula = {
        id: 'eq2',
        latex: 'E = mc^2',
        context: 'Mass-energy equivalence',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 1.0
      };

      const result1 = renderer.renderFormula(formula1);
      const result2 = renderer.renderFormula(formula2);

      expect(result1.equationNumber).toBe('1');
      expect(result2.equationNumber).toBe('2');
      expect(renderer.getEquationCount()).toBe(2);
    });

    it('should reset equation counter', () => {
      // Render some equations first
      const formula: Formula = {
        id: 'test',
        latex: 'x = y',
        context: 'test',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 1.0
      };

      renderer.renderFormula(formula);
      expect(renderer.getEquationCount()).toBe(1);

      renderer.resetEquationCounter();
      expect(renderer.getEquationCount()).toBe(0);
    });
  });

  describe('Renderer Switching', () => {
    it('should switch between rendering backends', () => {
      renderer.setRenderer('katex');
      
      const formula: Formula = {
        id: 'test-katex',
        latex: 'x^2',
        context: 'test',
        type: 'inline',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: false,
        confidence: 1.0
      };

      const result = renderer.renderFormula(formula);
      expect(result.html).toContain('katex-inline');
    });

    it('should use fallback renderer', () => {
      renderer.setRenderer('fallback');
      
      const formula: Formula = {
        id: 'test-fallback',
        latex: 'x^2',
        context: 'test',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: false,
        confidence: 1.0
      };

      const result = renderer.renderFormula(formula);
      expect(result.html).toContain('math-fallback-display');
      expect(result.html).toContain('<code');
    });
  });
});

describe('Factory Functions', () => {
  describe('createMathRenderer', () => {
    it('should create renderer with default configuration', () => {
      const renderer = createMathRenderer();
      
      expect(renderer).toBeInstanceOf(MathContentRenderer);
      expect(renderer.getEquationCount()).toBe(0);
    });

    it('should create renderer with custom configuration', () => {
      const customConfig = {
        displayEquations: {
          centered: false,
          numbered: false,
          fullWidth: false
        }
      };

      const renderer = createMathRenderer(customConfig, 'katex');
      
      expect(renderer).toBeInstanceOf(MathContentRenderer);
    });
  });

  describe('extractMathFromText', () => {
    it('should extract inline and display math correctly', () => {
      const text = 'Inline math $x^2$ and display math $$\\sum_{i=1}^n i$$ in text.';
      
      const result = extractMathFromText(text);

      expect(result.inline).toHaveLength(1);
      expect(result.inline[0]).toBe('x^2');
      expect(result.display).toHaveLength(1);
      expect(result.display[0]).toBe('\\sum_{i=1}^n i');
    });

    it('should handle text without math', () => {
      const text = 'This is plain text without any mathematical content.';
      
      const result = extractMathFromText(text);

      expect(result.inline).toHaveLength(0);
      expect(result.display).toHaveLength(0);
    });

    it('should handle multiple math expressions', () => {
      const text = 'First $a = b$ then $c = d$ and finally $$e = f$$ plus $$g = h$$';
      
      const result = extractMathFromText(text);

      expect(result.inline).toHaveLength(2);
      expect(result.display).toHaveLength(2);
    });
  });
});

describe('Error Handling', () => {
  let renderer: MathContentRenderer;

  beforeEach(() => {
    const config: MathRenderingConfig = {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 20
      }
    };
    renderer = new MathContentRenderer(config);
  });

  it('should handle malformed LaTeX gracefully', () => {
    const formula: Formula = {
      id: 'malformed',
      latex: '\\frac{1}{', // Incomplete fraction
      context: 'Malformed LaTeX',
      type: 'display',
      sourceLocation: { fileId: 'test', page: 1 },
      isKeyFormula: false,
      confidence: 0.3,
      originalText: '1/('
    };

    // Should not throw an error
    expect(() => {
      const result = renderer.renderFormula(formula);
      expect(result.fallbackText).toBe('1/(');
    }).not.toThrow();
  });

  it('should provide meaningful error messages', () => {
    const invalidExample: WorkedExample = {
      id: 'invalid-example',
      title: 'Invalid Example',
      problem: 'Test problem',
      solution: [], // Empty solution
      sourceLocation: { fileId: 'test' },
      subtopic: 'test',
      confidence: 0.1,
      isComplete: false
    };

    expect(() => {
      renderer.renderWorkedExample(invalidExample);
    }).not.toThrow();
  });
});

describe('Performance and Edge Cases', () => {
  let renderer: MathContentRenderer;

  beforeEach(() => {
    const config: MathRenderingConfig = {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 20
      }
    };
    renderer = new MathContentRenderer(config);
  });

  it('should handle very long formulas', () => {
    const longLatex = 'x_1 + x_2 + x_3 + x_4 + x_5 + x_6 + x_7 + x_8 + x_9 + x_{10} + x_{11} + x_{12} + x_{13} + x_{14} + x_{15}';
    
    const formula: Formula = {
      id: 'long-formula',
      latex: longLatex,
      context: 'Very long sum',
      type: 'display',
      sourceLocation: { fileId: 'test' },
      isKeyFormula: true,
      confidence: 1.0
    };

    const result = renderer.renderFormula(formula);
    expect(result.requiresFullWidth).toBe(true);
  });

  it('should handle empty or whitespace-only content', () => {
    const emptyText = '   ';
    const result = renderer['renderContent'](emptyText, renderer['config']);
    
    expect(result.containsMath).toBe(false);
    expect(result.mathElements).toHaveLength(0);
  });

  it('should handle nested math expressions', () => {
    const nestedText = 'The formula $P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$ where $P(B) \\neq 0$';
    const result = renderer['renderContent'](nestedText, renderer['config']);
    
    expect(result.containsMath).toBe(true);
    expect(result.mathElements).toHaveLength(2);
  });
});