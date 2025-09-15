// Tests for mathematical pattern recognition

import { MathPatternRecognizer } from '../math-pattern-recognition';

describe('MathPatternRecognizer', () => {
  let recognizer: MathPatternRecognizer;

  beforeEach(() => {
    recognizer = new MathPatternRecognizer();
  });

  describe('findMathPatterns', () => {
    it('should find LaTeX delimited formulas', () => {
      const text = 'The formula is $P(A|B) = \\frac{P(A \\cap B)}{P(B)}$ and also $$E[X] = \\sum_{i=1}^{n} x_i p_i$$';
      
      const matches = recognizer.findMathPatterns(text);
      
      expect(matches.length).toBeGreaterThanOrEqual(2);
      
      const inlineMatch = matches.find(m => m.text.includes('P(A|B)'));
      expect(inlineMatch).toBeDefined();
      expect(inlineMatch?.type).toBe('formula');
      expect(inlineMatch?.priority).toBe('high');
      
      const displayMatch = matches.find(m => m.text.includes('E[X]'));
      expect(displayMatch).toBeDefined();
      expect(displayMatch?.type).toBe('formula'); // Expected value notation is classified as formula
      expect(displayMatch?.priority).toBe('high');
    });

    it('should find mathematical symbols', () => {
      const text = 'The integral ∫ and summation ∑ symbols, plus inequality ≤ and set membership ∈';
      
      const matches = recognizer.findMathPatterns(text);
      
      expect(matches.length).toBeGreaterThanOrEqual(4);
      expect(matches.some(m => m.text === '∫')).toBe(true);
      expect(matches.some(m => m.text === '∑')).toBe(true);
      expect(matches.some(m => m.text === '≤')).toBe(true);
      expect(matches.some(m => m.text === '∈')).toBe(true);
    });

    it('should find probability notation', () => {
      const text = 'Calculate P(A ∩ B), E[X], and Var(Y) for the given distribution';
      
      const matches = recognizer.findMathPatterns(text);
      
      const probMatch = matches.find(m => m.text.includes('P(A ∩ B)'));
      expect(probMatch).toBeDefined();
      expect(probMatch?.type).toBe('formula');
      
      const expectationMatch = matches.find(m => m.text.includes('E[X]'));
      expect(expectationMatch).toBeDefined();
      expect(expectationMatch?.type).toBe('formula');
      
      const varianceMatch = matches.find(m => m.text.includes('Var(Y)'));
      expect(varianceMatch).toBeDefined();
      expect(varianceMatch?.type).toBe('formula');
    });

    it('should find function definitions', () => {
      const text = 'Define f(x) = x² + 2x + 1 and g(y) = sin(y) + cos(y)';
      
      const matches = recognizer.findMathPatterns(text);
      
      const functionMatch = matches.find(m => m.text.includes('f(x) = x² + 2x + 1'));
      expect(functionMatch).toBeDefined();
      expect(functionMatch?.type).toBe('formula');
      
      const trigMatch = matches.find(m => m.text.includes('sin(y)'));
      expect(trigMatch).toBeDefined();
      expect(trigMatch?.type).toBe('formula'); // Trigonometric functions are classified as formula
    });

    it('should find set notation', () => {
      const text = 'The set {x | x > 0} and the enumeration {1, 2, 3, 4}';
      
      const matches = recognizer.findMathPatterns(text);
      
      const builderMatch = matches.find(m => m.text.includes('{x | x > 0}'));
      expect(builderMatch).toBeDefined();
      expect(builderMatch?.type).toBe('formula');
      
      const enumMatch = matches.find(m => m.text.includes('{1, 2, 3, 4}'));
      expect(enumMatch).toBeDefined();
      expect(enumMatch?.type).toBe('formula');
    });

    it('should prioritize matches correctly', () => {
      const text = 'High priority: $P(A|B)$, medium priority: ≤, low priority: α';
      
      const matches = recognizer.findMathPatterns(text);
      
      // Should be sorted by priority (high first)
      expect(matches[0].priority).toBe('high');
      expect(matches[0].text).toContain('P(A|B)');
    });
  });

  describe('extractFormulasWithLatex', () => {
    it('should extract formulas with LaTeX conversion', () => {
      const text = 'The probability formula P(A|B) = P(A∩B)/P(B) and Bayes theorem';
      
      const formulas = recognizer.extractFormulasWithLatex(text);
      
      expect(formulas.length).toBeGreaterThan(0);
      
      const formula = formulas[0];
      expect(formula.original).toBeDefined();
      expect(formula.latex).toBeDefined();
      expect(formula.type).toMatch(/inline|display/);
      expect(formula.confidence).toBeGreaterThan(0);
      expect(formula.position).toBeDefined();
      expect(formula.position.start).toBeGreaterThanOrEqual(0);
      expect(formula.position.end).toBeGreaterThan(formula.position.start);
    });

    it('should handle already LaTeX formatted content', () => {
      const text = 'The formula $\\frac{a}{b}$ is already in LaTeX format';
      
      const formulas = recognizer.extractFormulasWithLatex(text);
      
      expect(formulas.length).toBeGreaterThan(0);
      const formula = formulas[0];
      expect(formula.latex).toContain('\\frac{a}{b}');
    });

    it('should convert simple expressions to LaTeX', () => {
      const text = 'Simple equation: x^2 + y^2 = z^2';
      
      const formulas = recognizer.extractFormulasWithLatex(text);
      
      if (formulas.length > 0) {
        const formula = formulas[0];
        expect(formula.latex).toContain('^{2}'); // Should convert x^2 to x^{2}
      }
    });
  });

  describe('detectWorkedExamples', () => {
    it('should detect explicit examples', () => {
      const text = `
        Example 1: Calculate the probability of drawing a red card.
        Solution: There are 26 red cards out of 52 total cards.
        Step 1: Identify the favorable outcomes.
        Step 2: Apply the probability formula P = favorable/total.
      `;
      
      const examples = recognizer.detectWorkedExamples(text);
      
      expect(examples.length).toBeGreaterThan(0);
      
      const example = examples.find(e => e.type === 'example');
      expect(example).toBeDefined();
      expect(example?.text).toContain('Example 1');
      
      const solution = examples.find(e => e.type === 'solution');
      expect(solution).toBeDefined();
      expect(solution?.text).toContain('Solution:');
    });

    it('should detect problems and solutions', () => {
      const text = `
        Problem 1: Find the expected value of X.
        Solution: Use the formula E[X] = Σ x_i * p_i.
      `;
      
      const examples = recognizer.detectWorkedExamples(text);
      
      const problem = examples.find(e => e.type === 'problem');
      expect(problem).toBeDefined();
      expect(problem?.text).toContain('Problem 1');
      
      const solution = examples.find(e => e.type === 'solution');
      expect(solution).toBeDefined();
      expect(solution?.text).toContain('E[X]');
    });

    it('should detect step-by-step solutions', () => {
      const text = `
        Step 1: Calculate P(A).
        Step 2: Calculate P(B|A).
        Step 3: Apply Bayes' theorem.
      `;
      
      const examples = recognizer.detectWorkedExamples(text);
      
      expect(examples.length).toBeGreaterThanOrEqual(3);
      examples.forEach(example => {
        expect(example.type).toBe('solution');
        expect(example.text).toContain('Step');
      });
    });

    it('should calculate confidence scores', () => {
      const text = `
        Example 1: This is a detailed mathematical example with formulas P(A|B) = 0.5.
        The solution involves multiple steps and mathematical reasoning.
      `;
      
      const examples = recognizer.detectWorkedExamples(text);
      
      if (examples.length > 0) {
        const example = examples[0];
        expect(example.confidence).toBeGreaterThan(0);
        expect(example.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('validateLatex', () => {
    it('should validate correct LaTeX syntax', () => {
      const validLatex = '\\frac{P(A \\cap B)}{P(B)}';
      
      const result = recognizer.validateLatex(validLatex);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unbalanced delimiters', () => {
      const invalidLatex = '\\frac{P(A \\cap B}{P(B)}'; // Missing closing brace
      
      const result = recognizer.validateLatex(invalidLatex);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unbalanced');
    });

    it('should detect unknown commands', () => {
      const invalidLatex = '\\unknowncommand{x}';
      
      const result = recognizer.validateLatex(invalidLatex);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unknown command');
    });

    it('should accept known mathematical commands', () => {
      const validLatex = '\\sum_{i=1}^{n} \\alpha_i \\cdot \\beta_i';
      
      const result = recognizer.validateLatex(validLatex);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('convertToLatex', () => {
    it('should convert Greek letter names to LaTeX', () => {
      const text = 'alpha + beta = gamma';
      
      // Access private method through any casting for testing
      const latex = (recognizer as any).convertToLatex(text, 'formula');
      
      expect(latex).toContain('\\alpha');
      expect(latex).toContain('\\beta');
      expect(latex).toContain('\\gamma');
    });

    it('should convert mathematical operators', () => {
      const text = 'x <= y and a != b';
      
      const latex = (recognizer as any).convertToLatex(text, 'formula');
      
      expect(latex).toContain('\\leq');
      expect(latex).toContain('\\neq');
    });

    it('should convert fractions', () => {
      const text = '3/4 + 1/2';
      
      const latex = (recognizer as any).convertToLatex(text, 'formula');
      
      expect(latex).toContain('\\frac{3}{4}');
      expect(latex).toContain('\\frac{1}{2}');
    });

    it('should wrap in appropriate delimiters', () => {
      const text = 'x + y';
      
      const inlineLatex = (recognizer as any).convertToLatex(text, 'formula');
      const displayLatex = (recognizer as any).convertToLatex(text, 'equation');
      
      expect(inlineLatex).toMatch(/^\$.*\$$/);
      expect(displayLatex).toMatch(/^\\\[.*\\\]$/);
    });
  });

  describe('confidence calculation', () => {
    it('should give higher confidence to explicit LaTeX', () => {
      const latexText = '$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$';
      const plainText = 'P(A|B) = P(A and B) / P(B)';
      
      const latexMatches = recognizer.findMathPatterns(latexText);
      const plainMatches = recognizer.findMathPatterns(plainText);
      
      if (latexMatches.length > 0 && plainMatches.length > 0) {
        expect(latexMatches[0].confidence).toBeGreaterThan(plainMatches[0].confidence);
      }
    });

    it('should give higher confidence to longer mathematical expressions', () => {
      const shortText = 'x + y';
      const longText = 'P(A|B) = P(A ∩ B) / P(B) where A and B are events';
      
      const shortMatches = recognizer.findMathPatterns(shortText);
      const longMatches = recognizer.findMathPatterns(longText);
      
      if (shortMatches.length > 0 && longMatches.length > 0) {
        const shortFormula = shortMatches.find(m => m.text.includes('x + y'));
        const longFormula = longMatches.find(m => m.text.includes('P(A|B)'));
        
        if (shortFormula && longFormula) {
          expect(longFormula.confidence).toBeGreaterThan(shortFormula.confidence);
        }
      }
    });
  });
});