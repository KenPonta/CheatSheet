// Tests for compact study generator types

import {
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  MathContentExtractionError
} from '../types';

describe('Mathematical Content Types', () => {
  describe('Type structure validation', () => {
    it('should create valid Formula object', () => {
      const formula: Formula = {
        id: 'formula-1',
        latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
        context: 'conditional probability formula',
        type: 'display',
        sourceLocation: {
          fileId: 'test.pdf',
          page: 1,
          textPosition: { start: 0, end: 20 }
        },
        isKeyFormula: true,
        confidence: 0.9,
        originalText: 'P(A|B) = P(A∩B)/P(B)'
      };

      expect(formula.id).toBe('formula-1');
      expect(formula.type).toBe('display');
      expect(formula.isKeyFormula).toBe(true);
      expect(formula.confidence).toBe(0.9);
    });

    it('should create valid WorkedExample object', () => {
      const example: WorkedExample = {
        id: 'example-1',
        title: 'Example 1: Conditional Probability',
        problem: 'Calculate P(A|B) given P(A) = 0.3, P(B) = 0.5, P(A∩B) = 0.1',
        solution: [
          {
            stepNumber: 1,
            description: 'Apply the conditional probability formula',
            formula: 'P(A|B) = P(A∩B)/P(B)',
            explanation: 'Use the definition of conditional probability'
          },
          {
            stepNumber: 2,
            description: 'Substitute the given values',
            formula: 'P(A|B) = 0.1/0.5',
            explanation: 'Replace P(A∩B) with 0.1 and P(B) with 0.5'
          }
        ],
        sourceLocation: {
          fileId: 'test.pdf',
          page: 2
        },
        subtopic: 'Conditional Probability',
        confidence: 0.85,
        isComplete: true
      };

      expect(example.id).toBe('example-1');
      expect(example.solution).toHaveLength(2);
      expect(example.isComplete).toBe(true);
      expect(example.solution[0].stepNumber).toBe(1);
    });

    it('should create valid Definition object', () => {
      const definition: Definition = {
        id: 'def-1',
        term: 'Conditional Probability',
        definition: 'The probability of an event A occurring given that another event B has already occurred',
        context: 'probability theory fundamentals',
        sourceLocation: {
          fileId: 'test.pdf',
          section: '2.1'
        },
        relatedFormulas: ['formula-1'],
        confidence: 0.9
      };

      expect(definition.term).toBe('Conditional Probability');
      expect(definition.relatedFormulas).toContain('formula-1');
      expect(definition.confidence).toBe(0.9);
    });

    it('should create valid Theorem object', () => {
      const theorem: Theorem = {
        id: 'theorem-1',
        name: 'Bayes\' Theorem',
        statement: 'P(A|B) = P(B|A) * P(A) / P(B)',
        proof: 'Follows from the definition of conditional probability...',
        conditions: ['P(B) > 0', 'Events A and B are well-defined'],
        sourceLocation: {
          fileId: 'test.pdf',
          page: 3
        },
        relatedFormulas: ['formula-1', 'formula-2'],
        confidence: 0.95
      };

      expect(theorem.name).toBe('Bayes\' Theorem');
      expect(theorem.conditions).toHaveLength(2);
      expect(theorem.relatedFormulas).toHaveLength(2);
    });

    it('should create valid MathematicalContent object', () => {
      const mathContent: MathematicalContent = {
        formulas: [],
        workedExamples: [],
        definitions: [],
        theorems: []
      };

      expect(mathContent.formulas).toEqual([]);
      expect(mathContent.workedExamples).toEqual([]);
      expect(mathContent.definitions).toEqual([]);
      expect(mathContent.theorems).toEqual([]);
    });
  });

  describe('Error classes', () => {
    it('should create MathContentExtractionError with proper properties', () => {
      const error = new MathContentExtractionError(
        'Formula parsing failed',
        'FORMULA_EXTRACTION_FAILED',
        {
          fileId: 'test.pdf',
          page: 5
        },
        false
      );

      expect(error.message).toBe('Formula parsing failed');
      expect(error.code).toBe('FORMULA_EXTRACTION_FAILED');
      expect(error.sourceLocation?.fileId).toBe('test.pdf');
      expect(error.recoverable).toBe(false);
      expect(error.name).toBe('MathContentExtractionError');
    });

    it('should create recoverable error by default', () => {
      const error = new MathContentExtractionError(
        'Temporary failure',
        'VALIDATION_FAILED'
      );

      expect(error.recoverable).toBe(true);
    });
  });

  describe('Type validation', () => {
    it('should validate formula types correctly', () => {
      const inlineFormula: Formula = {
        id: 'f1',
        latex: '$x + y$',
        context: 'simple addition',
        type: 'inline',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: false,
        confidence: 0.8
      };

      const displayFormula: Formula = {
        id: 'f2',
        latex: '\\[E = mc^2\\]',
        context: 'mass-energy equivalence',
        type: 'display',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: true,
        confidence: 0.95
      };

      expect(inlineFormula.type).toBe('inline');
      expect(displayFormula.type).toBe('display');
    });

    it('should validate confidence ranges', () => {
      const formula: Formula = {
        id: 'f1',
        latex: 'x = 1',
        context: 'simple equation',
        type: 'inline',
        sourceLocation: { fileId: 'test' },
        isKeyFormula: false,
        confidence: 0.75
      };

      expect(formula.confidence).toBeGreaterThanOrEqual(0);
      expect(formula.confidence).toBeLessThanOrEqual(1);
    });

    it('should validate source location structure', () => {
      const sourceLocation = {
        fileId: 'document.pdf',
        page: 10,
        section: '3.2',
        coordinates: {
          x: 100,
          y: 200,
          width: 300,
          height: 50
        },
        textPosition: {
          start: 1500,
          end: 1600
        }
      };

      expect(sourceLocation.fileId).toBeDefined();
      expect(sourceLocation.page).toBeGreaterThan(0);
      expect(sourceLocation.coordinates?.width).toBeGreaterThan(0);
      expect(sourceLocation.textPosition?.end).toBeGreaterThan(sourceLocation.textPosition?.start);
    });
  });

  describe('Solution step validation', () => {
    it('should create valid solution steps', () => {
      const step = {
        stepNumber: 1,
        description: 'Apply the quadratic formula',
        formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        explanation: 'This formula gives us the roots of any quadratic equation',
        latex: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
      };

      expect(step.stepNumber).toBe(1);
      expect(step.description).toContain('quadratic formula');
      expect(step.formula).toBeDefined();
      expect(step.explanation).toBeDefined();
    });

    it('should handle optional fields in solution steps', () => {
      const minimalStep = {
        stepNumber: 1,
        description: 'Simple step',
        explanation: 'Basic explanation'
      };

      expect(minimalStep.formula).toBeUndefined();
      expect(minimalStep.latex).toBeUndefined();
      expect(minimalStep.stepNumber).toBe(1);
    });
  });
});