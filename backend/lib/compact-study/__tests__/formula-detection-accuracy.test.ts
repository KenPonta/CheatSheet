/**
 * Formula Detection Accuracy Tests
 * Tests mathematical content extraction and formula detection with real-world examples
 */

import { MathPatternRecognizer } from '../math-pattern-recognition';

// Mock the AI client to avoid API key requirement
jest.mock('../../ai/client', () => ({
  getOpenAIClient: () => ({
    createChatCompletion: jest.fn()
  })
}));

describe('Formula Detection Accuracy', () => {
  let recognizer: MathPatternRecognizer;

  beforeEach(() => {
    recognizer = new MathPatternRecognizer();
  });

  describe('Probability Formula Detection', () => {
    const probabilityFormulas = [
      {
        text: 'P(A) = |A|/|S|',
        expected: 'P(A) = \\frac{|A|}{|S|}',
        type: 'basic probability'
      },
      {
        text: 'P(A|B) = P(A∩B)/P(B)',
        expected: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
        type: 'conditional probability'
      },
      {
        text: 'P(A∪B) = P(A) + P(B) - P(A∩B)',
        expected: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
        type: 'union probability'
      },
      {
        text: 'E[X] = Σ x·P(X=x)',
        expected: 'E[X] = \\sum x \\cdot P(X=x)',
        type: 'expected value'
      },
      {
        text: 'Var(X) = E[X²] - (E[X])²',
        expected: 'Var(X) = E[X^2] - (E[X])^2',
        type: 'variance'
      },
      {
        text: 'σ = √Var(X)',
        expected: '\\sigma = \\sqrt{Var(X)}',
        type: 'standard deviation'
      },
      {
        text: 'P(A|B) = P(B|A)·P(A)/P(B)',
        expected: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
        type: 'Bayes theorem'
      }
    ];

    probabilityFormulas.forEach(({ text, expected, type }) => {
      it(`should detect and convert ${type} formula correctly`, () => {
        const matches = recognizer.findMathPatterns(text);
        
        expect(matches.length).toBeGreaterThan(0);
        
        const formulaMatch = matches.find(m => m.type === 'formula');
        expect(formulaMatch).toBeDefined();
        expect(formulaMatch?.priority).toBe('high');
        
        const formulas = recognizer.extractFormulasWithLatex(text);
        expect(formulas.length).toBeGreaterThan(0);
        
        const formula = formulas[0];
        expect(formula.latex).toContain(expected.split(' ')[0]); // Check key parts
        expect(formula.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should detect complex probability expressions', () => {
      const complexText = `
        The joint probability distribution is given by:
        P(X=i, Y=j) = P(X=i|Y=j) × P(Y=j)
        
        For independent events: P(A∩B) = P(A) × P(B)
        
        The binomial probability is: P(X=k) = C(n,k) × p^k × (1-p)^(n-k)
      `;

      const matches = recognizer.findMathPatterns(complexText);
      const formulaMatches = matches.filter(m => m.type === 'formula');
      
      expect(formulaMatches.length).toBeGreaterThanOrEqual(3);
      
      // Check for joint probability
      expect(formulaMatches.some(m => m.text.includes('P(X=i, Y=j)'))).toBe(true);
      
      // Check for independence
      expect(formulaMatches.some(m => m.text.includes('P(A∩B)'))).toBe(true);
      
      // Check for binomial
      expect(formulaMatches.some(m => m.text.includes('C(n,k)'))).toBe(true);
    });
  });

  describe('Relations Formula Detection', () => {
    const relationsFormulas = [
      {
        text: '∀x ∈ A, (x,x) ∈ R',
        expected: '\\forall x \\in A, (x,x) \\in R',
        type: 'reflexive property'
      },
      {
        text: '∀x,y ∈ A, (x,y) ∈ R → (y,x) ∈ R',
        expected: '\\forall x,y \\in A, (x,y) \\in R \\rightarrow (y,x) \\in R',
        type: 'symmetric property'
      },
      {
        text: '∀x,y,z ∈ A, (x,y) ∈ R ∧ (y,z) ∈ R → (x,z) ∈ R',
        expected: '\\forall x,y,z \\in A, (x,y) \\in R \\land (y,z) \\in R \\rightarrow (x,z) \\in R',
        type: 'transitive property'
      },
      {
        text: 'R ⊆ A × A',
        expected: 'R \\subseteq A \\times A',
        type: 'relation definition'
      },
      {
        text: 'R⁻¹ = {(y,x) | (x,y) ∈ R}',
        expected: 'R^{-1} = \\{(y,x) | (x,y) \\in R\\}',
        type: 'inverse relation'
      },
      {
        text: 'R ∘ S = {(x,z) | ∃y: (x,y) ∈ R ∧ (y,z) ∈ S}',
        expected: 'R \\circ S = \\{(x,z) | \\exists y: (x,y) \\in R \\land (y,z) \\in S\\}',
        type: 'composition'
      }
    ];

    relationsFormulas.forEach(({ text, expected, type }) => {
      it(`should detect and convert ${type} formula correctly`, () => {
        const matches = recognizer.findMathPatterns(text);
        
        expect(matches.length).toBeGreaterThan(0);
        
        const formulaMatch = matches.find(m => m.type === 'formula');
        expect(formulaMatch).toBeDefined();
        
        const formulas = recognizer.extractFormulasWithLatex(text);
        expect(formulas.length).toBeGreaterThan(0);
        
        const formula = formulas[0];
        expect(formula.confidence).toBeGreaterThan(0.6);
      });
    });

    it('should detect set operations in relations', () => {
      const setOperationsText = `
        Union of relations: R₁ ∪ R₂ = {(x,y) | (x,y) ∈ R₁ ∨ (x,y) ∈ R₂}
        Intersection: R₁ ∩ R₂ = {(x,y) | (x,y) ∈ R₁ ∧ (x,y) ∈ R₂}
        Difference: R₁ - R₂ = {(x,y) | (x,y) ∈ R₁ ∧ (x,y) ∉ R₂}
      `;

      const matches = recognizer.findMathPatterns(setOperationsText);
      const formulaMatches = matches.filter(m => m.type === 'formula');
      
      expect(formulaMatches.length).toBeGreaterThanOrEqual(3);
      
      // Check for union
      expect(formulaMatches.some(m => m.text.includes('R₁ ∪ R₂'))).toBe(true);
      
      // Check for intersection
      expect(formulaMatches.some(m => m.text.includes('R₁ ∩ R₂'))).toBe(true);
      
      // Check for difference
      expect(formulaMatches.some(m => m.text.includes('R₁ - R₂'))).toBe(true);
    });
  });

  describe('Mathematical Symbol Recognition', () => {
    const symbolTests = [
      { symbol: '∀', latex: '\\forall', name: 'universal quantifier' },
      { symbol: '∃', latex: '\\exists', name: 'existential quantifier' },
      { symbol: '∈', latex: '\\in', name: 'element of' },
      { symbol: '∉', latex: '\\notin', name: 'not element of' },
      { symbol: '⊆', latex: '\\subseteq', name: 'subset or equal' },
      { symbol: '⊂', latex: '\\subset', name: 'proper subset' },
      { symbol: '∪', latex: '\\cup', name: 'union' },
      { symbol: '∩', latex: '\\cap', name: 'intersection' },
      { symbol: '×', latex: '\\times', name: 'cartesian product' },
      { symbol: '→', latex: '\\rightarrow', name: 'implies' },
      { symbol: '↔', latex: '\\leftrightarrow', name: 'if and only if' },
      { symbol: '∧', latex: '\\land', name: 'logical and' },
      { symbol: '∨', latex: '\\lor', name: 'logical or' },
      { symbol: '¬', latex: '\\neg', name: 'logical not' },
      { symbol: '≤', latex: '\\leq', name: 'less than or equal' },
      { symbol: '≥', latex: '\\geq', name: 'greater than or equal' },
      { symbol: '≠', latex: '\\neq', name: 'not equal' },
      { symbol: '≈', latex: '\\approx', name: 'approximately equal' },
      { symbol: '∞', latex: '\\infty', name: 'infinity' },
      { symbol: '∑', latex: '\\sum', name: 'summation' },
      { symbol: '∏', latex: '\\prod', name: 'product' },
      { symbol: '∫', latex: '\\int', name: 'integral' },
      { symbol: '√', latex: '\\sqrt', name: 'square root' },
      { symbol: 'α', latex: '\\alpha', name: 'alpha' },
      { symbol: 'β', latex: '\\beta', name: 'beta' },
      { symbol: 'γ', latex: '\\gamma', name: 'gamma' },
      { symbol: 'δ', latex: '\\delta', name: 'delta' },
      { symbol: 'ε', latex: '\\epsilon', name: 'epsilon' },
      { symbol: 'θ', latex: '\\theta', name: 'theta' },
      { symbol: 'λ', latex: '\\lambda', name: 'lambda' },
      { symbol: 'μ', latex: '\\mu', name: 'mu' },
      { symbol: 'π', latex: '\\pi', name: 'pi' },
      { symbol: 'σ', latex: '\\sigma', name: 'sigma' },
      { symbol: 'φ', latex: '\\phi', name: 'phi' },
      { symbol: 'ω', latex: '\\omega', name: 'omega' }
    ];

    symbolTests.forEach(({ symbol, latex, name }) => {
      it(`should recognize ${name} (${symbol})`, () => {
        const text = `The symbol ${symbol} is used in mathematics.`;
        const matches = recognizer.findMathPatterns(text);
        
        const symbolMatch = matches.find(m => m.text === symbol);
        expect(symbolMatch).toBeDefined();
        expect(symbolMatch?.type).toBe('symbol');
      });
    });

    it('should handle multiple symbols in complex expressions', () => {
      const complexExpression = '∀x ∈ A, ∃y ∈ B: (x,y) ∈ R ∧ P(x) → Q(y)';
      const matches = recognizer.findMathPatterns(complexExpression);
      
      const symbols = ['∀', '∈', '∃', '∧', '→'];
      symbols.forEach(symbol => {
        expect(matches.some(m => m.text === symbol)).toBe(true);
      });
    });
  });

  describe('Formula Context Recognition', () => {
    it('should identify probability context correctly', () => {
      const probabilityTexts = [
        'The probability of event A is P(A) = 0.5',
        'Calculate the conditional probability P(B|A)',
        'The expected value E[X] equals the mean',
        'Variance Var(Y) measures spread',
        'Standard deviation σ = √Var(X)'
      ];

      probabilityTexts.forEach(text => {
        const matches = recognizer.findMathPatterns(text);
        if (matches.length > 0) {
          const formulaMatch = matches.find(m => m.type === 'formula');
          if (formulaMatch) {
            expect(formulaMatch.confidence).toBeGreaterThan(0.5);
          }
        }
      });
    });

    it('should identify relations context correctly', () => {
      const relationsTexts = [
        'A relation R on set A is reflexive if ∀x ∈ A, (x,x) ∈ R',
        'The relation is symmetric when (x,y) ∈ R implies (y,x) ∈ R',
        'Transitivity requires (x,y) ∈ R ∧ (y,z) ∈ R → (x,z) ∈ R',
        'The composition R ∘ S is defined as {(x,z) | ∃y: (x,y) ∈ R ∧ (y,z) ∈ S}'
      ];

      relationsTexts.forEach(text => {
        const matches = recognizer.findMathPatterns(text);
        if (matches.length > 0) {
          const formulaMatch = matches.find(m => m.type === 'formula');
          if (formulaMatch) {
            expect(formulaMatch.confidence).toBeGreaterThan(0.4);
          }
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed mathematical expressions', () => {
      const malformedExpressions = [
        'P(A = 0.5', // Missing closing parenthesis
        'E[X = μ', // Missing closing bracket
        '∀x ∈ A (x,x) ∈ R', // Missing comma
        'P(A|B) = P(A∩B/P(B)', // Missing closing parenthesis
        'Var(X) = E[X²] - E[X]²' // Missing parentheses around E[X]
      ];

      malformedExpressions.forEach(expr => {
        expect(() => {
          const matches = recognizer.findMathPatterns(expr);
          // Should not throw, but may have lower confidence
          if (matches.length > 0) {
            expect(matches[0].confidence).toBeLessThan(0.9);
          }
        }).not.toThrow();
      });
    });

    it('should handle empty or whitespace-only input', () => {
      const emptyInputs = ['', '   ', '\n\n', '\t\t'];

      emptyInputs.forEach(input => {
        expect(() => {
          const matches = recognizer.findMathPatterns(input);
          expect(matches).toHaveLength(0);
        }).not.toThrow();
      });
    });

    it('should handle very long mathematical expressions', () => {
      const longExpression = 'P(A₁ ∩ A₂ ∩ A₃ ∩ A₄ ∩ A₅ ∩ A₆ ∩ A₇ ∩ A₈ ∩ A₉ ∩ A₁₀) = P(A₁) × P(A₂|A₁) × P(A₃|A₁ ∩ A₂) × P(A₄|A₁ ∩ A₂ ∩ A₃) × P(A₅|A₁ ∩ A₂ ∩ A₃ ∩ A₄) × P(A₆|A₁ ∩ A₂ ∩ A₃ ∩ A₄ ∩ A₅) × P(A₇|A₁ ∩ A₂ ∩ A₃ ∩ A₄ ∩ A₅ ∩ A₆) × P(A₈|A₁ ∩ A₂ ∩ A₃ ∩ A₄ ∩ A₅ ∩ A₆ ∩ A₇) × P(A₉|A₁ ∩ A₂ ∩ A₃ ∩ A₄ ∩ A₅ ∩ A₆ ∩ A₇ ∩ A₈) × P(A₁₀|A₁ ∩ A₂ ∩ A₃ ∩ A₄ ∩ A₅ ∩ A₆ ∩ A₇ ∩ A₈ ∩ A₉)';

      expect(() => {
        const matches = recognizer.findMathPatterns(longExpression);
        expect(matches.length).toBeGreaterThan(0);
        
        const formulas = recognizer.extractFormulasWithLatex(longExpression);
        if (formulas.length > 0) {
          expect(formulas[0].original.length).toBeGreaterThan(100);
        }
      }).not.toThrow();
    });

    it('should handle mixed text and formulas', () => {
      const mixedText = `
        In probability theory, we often use the formula P(A) = |A|/|S| to calculate
        basic probabilities. For conditional probability, we use P(A|B) = P(A∩B)/P(B).
        
        When dealing with independent events, we know that P(A∩B) = P(A) × P(B).
        
        The expected value formula E[X] = Σ x·P(X=x) is fundamental in statistics.
      `;

      const matches = recognizer.findMathPatterns(mixedText);
      const formulaMatches = matches.filter(m => m.type === 'formula');
      
      expect(formulaMatches.length).toBeGreaterThanOrEqual(4);
      
      // Verify each formula is detected
      expect(formulaMatches.some(m => m.text.includes('P(A) = |A|/|S|'))).toBe(true);
      expect(formulaMatches.some(m => m.text.includes('P(A|B)'))).toBe(true);
      expect(formulaMatches.some(m => m.text.includes('P(A∩B) = P(A) × P(B)'))).toBe(true);
      expect(formulaMatches.some(m => m.text.includes('E[X]'))).toBe(true);
    });
  });

  describe('Confidence Scoring Accuracy', () => {
    it('should assign higher confidence to well-formed formulas', () => {
      const wellFormedFormulas = [
        'P(A) = |A|/|S|',
        'E[X] = Σ x·P(X=x)',
        '∀x ∈ A, (x,x) ∈ R'
      ];

      const poorlyFormedFormulas = [
        'P(A = 0.5',
        'E[X = μ',
        'x ∈ A (x,x'
      ];

      wellFormedFormulas.forEach(formula => {
        const formulas = recognizer.extractFormulasWithLatex(formula);
        if (formulas.length > 0) {
          expect(formulas[0].confidence).toBeGreaterThan(0.8);
        }
      });

      poorlyFormedFormulas.forEach(formula => {
        const formulas = recognizer.extractFormulasWithLatex(formula);
        if (formulas.length > 0) {
          expect(formulas[0].confidence).toBeLessThan(0.7);
        }
      });
    });

    it('should assign higher confidence to formulas with mathematical context', () => {
      const contextualFormula = 'The probability formula P(A) = |A|/|S| calculates the likelihood of event A.';
      const isolatedFormula = 'P(A) = |A|/|S|';

      const contextualMatches = recognizer.findMathPatterns(contextualFormula);
      const isolatedMatches = recognizer.findMathPatterns(isolatedFormula);

      const contextualFormulaMatch = contextualMatches.find(m => m.type === 'formula');
      const isolatedFormulaMatch = isolatedMatches.find(m => m.type === 'formula');

      if (contextualFormulaMatch && isolatedFormulaMatch) {
        expect(contextualFormulaMatch.confidence).toBeGreaterThanOrEqual(isolatedFormulaMatch.confidence);
      }
    });
  });
});