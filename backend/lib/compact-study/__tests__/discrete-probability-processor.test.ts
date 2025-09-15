// Tests for discrete probability content processor

import { DiscreteProbabilityProcessor } from '../discrete-probability-processor';
import { SourceDocument, ProcessingResult } from '../processing-pipeline';
import { EnhancedExtractedContent, MathematicalContent } from '../types';

// Mock the AI client
const mockCreateChatCompletion = jest.fn();
jest.mock('../../ai/client', () => ({
  getOpenAIClient: () => ({
    createChatCompletion: mockCreateChatCompletion
  })
}));

describe('DiscreteProbabilityProcessor', () => {
  let processor: DiscreteProbabilityProcessor;
  let mockClient: any;

  beforeEach(() => {
    processor = new DiscreteProbabilityProcessor();
    mockClient = { createChatCompletion: mockCreateChatCompletion };
  });

  afterEach(() => {
    mockCreateChatCompletion.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should have correct name and version', () => {
      expect(processor.name).toBe('discrete-probability-processor');
      expect(processor.version).toBe('1.0.0');
    });

    it('should validate input correctly', () => {
      const validInput: SourceDocument[] = [{
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'probability content',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      }];

      const result = processor.validate(validInput, {});
      expect(result.passed).toBe(true);
      expect(result.details).toContain('probability documents ready for processing');
    });

    it('should fail validation with no probability documents', () => {
      const invalidInput: SourceDocument[] = [{
        id: 'doc1',
        file: new File(['content'], 'other.pdf'),
        type: 'general',
        extractedContent: {
          text: 'general content',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      }];

      const result = processor.validate(invalidInput, {});
      expect(result.passed).toBe(false);
      expect(result.details).toContain('No probability documents found');
    });
  });

  describe('Content Detection', () => {
    it('should detect probability content by document type', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Some general content',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock successful AI responses
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [],
        examples: [],
        definitions: [],
        theorems: []
      }));

      const result = await processor.process([probabilityDoc], {});
      expect(result.success).toBe(true);
      expect(mockCreateChatCompletion).toHaveBeenCalled();
    });

    it('should detect probability content by keywords', async () => {
      const generalDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'general.pdf'),
        type: 'general',
        extractedContent: {
          text: 'This document discusses probability and conditional probability concepts.',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock successful AI responses
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [],
        examples: [],
        definitions: [],
        theorems: []
      }));

      const result = await processor.process([generalDoc], {});
      expect(result.success).toBe(true);
      expect(mockCreateChatCompletion).toHaveBeenCalled();
    });
  });

  describe('Probability Basics Extraction', () => {
    it('should extract basic probability formulas', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'The probability of event A is P(A). The probability of A or B is P(A ∪ B) = P(A) + P(B) - P(A ∩ B).',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI response with probability basics
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [
          {
            latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
            context: 'Addition rule for probability',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.9
          }
        ],
        examples: [],
        definitions: [
          {
            term: 'Probability',
            definition: 'A measure of the likelihood of an event occurring',
            confidence: 0.9
          }
        ],
        theorems: []
      }));

      const result = await processor.process([probabilityDoc], {});
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.formulas.some(f => f.latex.includes('P(A \\cup B)'))).toBe(true);
      expect(content.definitions.length).toBeGreaterThan(0);
      expect(content.definitions.some(d => d.term === 'Probability')).toBe(true);
    });
  });

  describe('Conditional Probability Extraction', () => {
    it('should extract conditional probability formulas', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Conditional probability P(A|B) = P(A ∩ B) / P(B) when P(B) > 0.',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI response with conditional probability content
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [
          {
            latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
            context: 'Definition of conditional probability',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.95
          }
        ],
        examples: [
          {
            title: 'Conditional Probability Example',
            problem: 'Find P(A|B) given P(A∩B) = 0.3 and P(B) = 0.6',
            solution: [
              {
                stepNumber: 1,
                description: 'Apply conditional probability formula',
                formula: 'P(A|B) = P(A∩B) / P(B)',
                explanation: 'Use the definition of conditional probability'
              },
              {
                stepNumber: 2,
                description: 'Substitute values',
                formula: 'P(A|B) = 0.3 / 0.6 = 0.5',
                explanation: 'Calculate the result'
              }
            ],
            confidence: 0.9
          }
        ],
        definitions: [],
        theorems: []
      }));

      const result = await processor.process([probabilityDoc], {});
      
      expect(result.success).toBe(true);
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.formulas.some(f => f.latex.includes('P(A|B)'))).toBe(true);
      expect(content.workedExamples.length).toBeGreaterThan(0);
      expect(content.workedExamples.some(e => e.solution.length === 2)).toBe(true);
    });
  });

  describe('Bayes Theorem Extraction', () => {
    it('should extract Bayes theorem content', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Bayes theorem: P(A|B) = P(B|A) × P(A) / P(B)',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI response with Bayes theorem
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [
          {
            latex: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
            context: 'Bayes theorem formula',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.98
          }
        ],
        examples: [],
        definitions: [],
        theorems: [
          {
            name: 'Bayes Theorem',
            statement: 'For events A and B with P(B) > 0, P(A|B) = P(B|A) × P(A) / P(B)',
            confidence: 0.95
          }
        ]
      }));

      const result = await processor.process([probabilityDoc], {});
      
      expect(result.success).toBe(true);
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.formulas.some(f => f.latex.includes('P(B|A)'))).toBe(true);
      expect(content.theorems.length).toBeGreaterThan(0);
      expect(content.theorems.some(t => t.name === 'Bayes Theorem')).toBe(true);
    });
  });

  describe('Bernoulli Trials Extraction', () => {
    it('should extract Bernoulli trials and binomial content', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Binomial probability: P(X = k) = C(n,k) × p^k × (1-p)^(n-k)',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI response with Bernoulli trials
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [
          {
            latex: 'P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}',
            context: 'Binomial probability formula',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.95
          }
        ],
        examples: [],
        definitions: [
          {
            term: 'Bernoulli Trial',
            definition: 'An experiment with exactly two possible outcomes: success and failure',
            confidence: 0.9
          }
        ],
        theorems: []
      }));

      const result = await processor.process([probabilityDoc], {});
      
      expect(result.success).toBe(true);
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.formulas.some(f => f.latex.includes('\\binom{n}{k}'))).toBe(true);
      expect(content.definitions.length).toBeGreaterThan(0);
      expect(content.definitions.some(d => d.term === 'Bernoulli Trial')).toBe(true);
    });
  });

  describe('Expected Value and Variance Extraction', () => {
    it('should extract expected value, variance, and standard deviation formulas', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Expected value E[X] = Σ x × P(X = x). Variance Var(X) = E[X²] - (E[X])². Standard deviation σ = √Var(X).',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI response with expected value and variance
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [
          {
            latex: 'E[X] = \\sum_{x} x \\cdot P(X = x)',
            context: 'Expected value formula for discrete random variable',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.95
          },
          {
            latex: 'Var(X) = E[X^2] - (E[X])^2',
            context: 'Variance formula',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.95
          },
          {
            latex: '\\sigma = \\sqrt{Var(X)}',
            context: 'Standard deviation formula',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.95
          }
        ],
        examples: [
          {
            title: 'Expected Value Calculation',
            problem: 'Calculate E[X] for a discrete random variable',
            solution: [
              {
                stepNumber: 1,
                description: 'List all possible values and their probabilities',
                explanation: 'Identify the sample space and probability distribution'
              },
              {
                stepNumber: 2,
                description: 'Apply expected value formula',
                formula: 'E[X] = Σ x × P(X = x)',
                explanation: 'Sum over all possible values'
              }
            ],
            confidence: 0.9
          }
        ],
        definitions: [],
        theorems: []
      }));

      const result = await processor.process([probabilityDoc], {});
      
      expect(result.success).toBe(true);
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.formulas.some(f => f.latex.includes('E[X]'))).toBe(true);
      expect(content.formulas.some(f => f.latex.includes('Var(X)'))).toBe(true);
      expect(content.formulas.some(f => f.latex.includes('\\sigma'))).toBe(true);
      expect(content.workedExamples.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI client errors gracefully', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Some probability content',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI client to throw error
      mockCreateChatCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await processor.process([probabilityDoc], {});
      
      // The processor handles errors gracefully and returns empty content rather than failing
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas).toHaveLength(0);
      expect(content.workedExamples).toHaveLength(0);
    });

    it('should handle invalid JSON responses', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Some probability content',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock AI client to return invalid JSON
      mockCreateChatCompletion.mockResolvedValue('invalid json response');

      const result = await processor.process([probabilityDoc], {});
      
      // Should still succeed but with empty content due to graceful error handling
      expect(result.success).toBe(true);
      const content = result.data[0] as MathematicalContent;
      expect(content.formulas).toHaveLength(0);
      expect(content.workedExamples).toHaveLength(0);
    });

    it('should provide recovery mechanism', async () => {
      const probabilityDoc: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Some probability content',
          images: [],
          tables: [],
          metadata: { name: 'test', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      const error = {
        id: 'error1',
        stage: 'test',
        type: 'extraction' as const,
        severity: 'medium' as const,
        message: 'Test error',
        recoverable: true,
        timestamp: new Date()
      };

      // Mock successful recovery
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [],
        examples: [],
        definitions: [],
        theorems: []
      }));

      const result = await processor.recover(error, [probabilityDoc], {});
      
      expect(result.success).toBe(true);
      expect(mockCreateChatCompletion).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should process multiple probability documents', async () => {
      const doc1: SourceDocument = {
        id: 'doc1',
        file: new File(['content'], 'probability1.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Basic probability content',
          images: [],
          tables: [],
          metadata: { name: 'test1', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      const doc2: SourceDocument = {
        id: 'doc2',
        file: new File(['content'], 'probability2.pdf'),
        type: 'probability',
        extractedContent: {
          text: 'Advanced probability with Bayes theorem',
          images: [],
          tables: [],
          metadata: { name: 'test2', size: 100, type: 'pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 },
          mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
          contentPreservation: { 
            totalFormulasFound: 0, 
            formulasPreserved: 0, 
            totalExamplesFound: 0, 
            examplesPreserved: 0, 
            preservationScore: 1, 
            issues: [], 
            validationResults: [] 
          }
        } as EnhancedExtractedContent,
        processingStatus: 'pending',
        errors: []
      };

      // Mock successful responses for both documents
      mockCreateChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [
          {
            latex: 'P(A) = \\frac{|A|}{|S|}',
            context: 'Basic probability formula',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.9
          }
        ],
        examples: [],
        definitions: [],
        theorems: []
      }));

      const result = await processor.process([doc1, doc2], {});
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.metrics.itemsProcessed).toBeGreaterThan(0);
    });
  });
});