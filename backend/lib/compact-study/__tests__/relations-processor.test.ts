// Tests for Relations Content Processor

import { RelationsProcessor } from '../relations-processor';
import { SourceDocument, ProcessingResult } from '../processing-pipeline';
import { EnhancedExtractedContent, MathematicalContent } from '../types';

// Mock OpenAI client
jest.mock('../../ai/client', () => ({
  getOpenAIClient: () => ({
    createChatCompletion: jest.fn()
  })
}));

describe('RelationsProcessor', () => {
  let processor: RelationsProcessor;
  let mockClient: any;

  beforeEach(() => {
    processor = new RelationsProcessor();
    
    // Get the mocked client
    const { getOpenAIClient } = require('../../ai/client');
    mockClient = getOpenAIClient();
    
    // Reset mock
    mockClient.createChatCompletion.mockReset();
  });

  describe('Basic Functionality', () => {
    test('should create processor with correct name and version', () => {
      expect(processor.name).toBe('relations-processor');
      expect(processor.version).toBe('1.0.0');
    });

    test('should identify relations content correctly', () => {
      const relationsDoc = createMockDocument('relations_test', `
        Relations are fundamental in discrete mathematics. A relation R from set A to set B
        is a subset of the Cartesian product A × B. Relations can be reflexive, symmetric,
        transitive, or antisymmetric depending on their properties.
      `);

      const nonRelationsDoc = createMockDocument('other_test', `
        This document discusses calculus and differential equations, which are not
        about discrete mathematics or set theory.
      `);

      // Test private method through processing
      expect(relationsDoc.extractedContent?.text.toLowerCase()).toContain('relation');
      expect(relationsDoc.extractedContent?.text.toLowerCase()).toContain('reflexive');
      expect(relationsDoc.extractedContent?.text.toLowerCase()).toContain('symmetric');
      
      expect(nonRelationsDoc.extractedContent?.text.toLowerCase()).not.toContain('reflexive');
    });
  });

  describe('Content Processing', () => {
    test('should process relations documents successfully', async () => {
      const mockResponse = JSON.stringify({
        formulas: [
          {
            latex: 'R \\subseteq A \\times B',
            context: 'Definition of relation',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.9
          }
        ],
        examples: [
          {
            title: 'Reflexive Property Check',
            problem: 'Check if relation R is reflexive',
            solution: [
              {
                stepNumber: 1,
                description: 'Check if (a,a) ∈ R for all a ∈ A',
                explanation: 'Reflexive property requires every element to be related to itself'
              }
            ],
            confidence: 0.8,
            isComplete: true
          }
        ],
        definitions: [
          {
            term: 'Reflexive Relation',
            definition: 'A relation R on set A is reflexive if ∀a ∈ A, aRa',
            context: 'Relation properties',
            confidence: 0.9
          }
        ],
        theorems: []
      });

      // Mock all 6 extraction calls
      mockClient.createChatCompletion
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const relationsDoc = createMockDocument('relations_test', `
        Relations and Their Properties
        
        A relation R from set A to set B is a subset of A × B.
        
        Reflexive Property: ∀a ∈ A, aRa
        
        Example: Let A = {1,2,3} and R = {(1,1), (2,2), (3,3)}.
        Check if R is reflexive.
        
        Solution: Since (1,1), (2,2), and (3,3) are all in R, 
        the relation is reflexive.
      `);
      relationsDoc.type = 'relations';

      const result = await processor.process([relationsDoc], {
        confidenceThreshold: 0.7,
        enableLatexConversion: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const content = result.data![0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.definitions.length).toBeGreaterThan(0);
      expect(content.workedExamples.length).toBeGreaterThan(0);
    });

    test('should handle documents without relations content', async () => {
      const nonRelationsDoc = createMockDocument('calculus_test', `
        Calculus and Derivatives
        
        The derivative of f(x) = x² is f'(x) = 2x.
        This has nothing to do with discrete mathematics.
      `);

      const result = await processor.process([nonRelationsDoc], {});

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('No relations documents found');
    });

    test('should handle processing errors gracefully', async () => {
      mockClient.createChatCompletion.mockRejectedValue(new Error('API Error'));

      const relationsDoc = createMockDocument('relations_test', `
        Relations content that will cause processing error with reflexive and symmetric properties
      `);
      relationsDoc.type = 'relations';

      const result = await processor.process([relationsDoc], {});

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Failed to extract relations content');
    });
  });

  describe('Relation Property Extraction', () => {
    test('should extract relation properties correctly', async () => {
      const propertiesResponse = JSON.stringify({
        formulas: [
          {
            latex: '\\forall a \\in A, aRa',
            context: 'Reflexive property definition',
            type: 'display',
            isKeyFormula: true
          },
          {
            latex: '\\forall a,b \\in A, aRb \\rightarrow bRa',
            context: 'Symmetric property definition',
            type: 'display',
            isKeyFormula: true
          }
        ],
        definitions: [
          {
            term: 'Reflexive',
            definition: 'Every element is related to itself',
            context: 'Relation properties'
          },
          {
            term: 'Symmetric',
            definition: 'If a is related to b, then b is related to a',
            context: 'Relation properties'
          }
        ],
        examples: [],
        theorems: []
      });

      mockClient.createChatCompletion.mockResolvedValue(propertiesResponse);

      const propertiesDoc = createMockDocument('properties_test', `
        Relation Properties
        
        Reflexive: ∀a ∈ A, aRa
        Symmetric: ∀a,b ∈ A, aRb → bRa
        Transitive: ∀a,b,c ∈ A, (aRb ∧ bRc) → aRc
        Antisymmetric: ∀a,b ∈ A, (aRb ∧ bRa) → a = b
      `);
      propertiesDoc.type = 'relations';

      const result = await processor.process([propertiesDoc], {});

      expect(result.success).toBe(true);
      const content = result.data![0] as MathematicalContent;
      
      // Should extract property formulas
      expect(content.formulas.some(f => f.latex.includes('forall'))).toBe(true);
      
      // Should extract property definitions
      expect(content.definitions.some(d => d.term.toLowerCase().includes('reflexive'))).toBe(true);
      expect(content.definitions.some(d => d.term.toLowerCase().includes('symmetric'))).toBe(true);
    });
  });

  describe('SQL Operations Extraction', () => {
    test('should extract SQL-style operations', async () => {
      const sqlResponse = JSON.stringify({
        formulas: [
          {
            latex: '\\sigma_{condition}(R) = \\{t \\in R | condition(t)\\}',
            context: 'Selection operation',
            type: 'display',
            isKeyFormula: true
          },
          {
            latex: '\\pi_{attributes}(R) = \\{t[attributes] | t \\in R\\}',
            context: 'Projection operation',
            type: 'display',
            isKeyFormula: true
          }
        ],
        examples: [
          {
            title: 'SQL Join Example',
            problem: 'Join Employee and Department tables',
            solution: [
              {
                stepNumber: 1,
                description: 'SELECT * FROM Employee E JOIN Department D ON E.dept_id = D.id',
                explanation: 'Natural join based on department ID'
              }
            ]
          }
        ],
        definitions: [
          {
            term: 'Selection Operation',
            definition: 'Selects tuples that satisfy a given condition',
            context: 'Relational algebra'
          }
        ],
        theorems: []
      });

      mockClient.createChatCompletion.mockResolvedValue(sqlResponse);

      const sqlDoc = createMockDocument('sql_test', `
        SQL-Style Operations
        
        Selection: σ_condition(R) = {t ∈ R | condition(t)}
        Projection: π_attributes(R) = {t[attributes] | t ∈ R}
        
        Example:
        SELECT name, salary FROM Employee WHERE age > 25;
      `);
      sqlDoc.type = 'relations';

      const result = await processor.process([sqlDoc], {});

      expect(result.success).toBe(true);
      const content = result.data![0] as MathematicalContent;
      
      // Should extract SQL operation formulas
      expect(content.formulas.some(f => f.latex.includes('sigma'))).toBe(true);
      expect(content.formulas.some(f => f.latex.includes('pi'))).toBe(true);
      
      // Should extract SQL examples
      expect(content.workedExamples.some(e => 
        e.solution.some(s => s.description.includes('SELECT'))
      )).toBe(true);
    });
  });

  describe('Validation', () => {
    test('should validate relations documents correctly', () => {
      const relationsDoc = createMockDocument('relations_test', 'Relations content with reflexive properties');
      relationsDoc.type = 'relations';

      const result = processor.validate([relationsDoc], {});

      expect(result.passed).toBe(true);
      expect(result.details).toContain('relations documents ready for processing');
    });

    test('should fail validation when no relations documents found', () => {
      const otherDoc = createMockDocument('other_test', 'Non-relations content about calculus');

      const result = processor.validate([otherDoc], {});

      expect(result.passed).toBe(false);
      expect(result.details).toContain('No relations documents found');
    });

    test('should fail validation when no extracted content', () => {
      const emptyDoc = createMockDocument('empty_test', '');
      emptyDoc.type = 'relations';
      emptyDoc.extractedContent = undefined;

      const result = processor.validate([emptyDoc], {});

      expect(result.passed).toBe(false);
      expect(result.details).toContain('No relations documents with extracted content');
    });
  });

  describe('Error Recovery', () => {
    test('should attempt recovery with fallback configuration', async () => {
      const mockError = {
        id: 'test_error',
        stage: 'relations-processor',
        type: 'extraction' as const,
        severity: 'medium' as const,
        message: 'Processing failed',
        recoverable: true,
        timestamp: new Date()
      };

      // Mock successful recovery response
      mockClient.createChatCompletion.mockResolvedValue(JSON.stringify({
        formulas: [],
        examples: [],
        definitions: [
          {
            term: 'Relation',
            definition: 'A subset of Cartesian product',
            context: 'Basic definition'
          }
        ],
        theorems: []
      }));

      const relationsDoc = createMockDocument('recovery_test', 'Relations content');
      relationsDoc.type = 'relations';

      const result = await processor.recover(mockError, [relationsDoc], {
        confidenceThreshold: 0.8
      });

      expect(result.success).toBe(true);
      
      // Should have called with fallback config
      expect(mockClient.createChatCompletion).toHaveBeenCalled();
    });
  });

  describe('Content Processing Integration', () => {
    test('should process all relation subtopics', async () => {
      // Mock responses for different subtopics
      const mockResponses = [
        // Definitions
        JSON.stringify({
          formulas: [{ latex: 'R \\subseteq A \\times B', context: 'Relation definition', type: 'display' }],
          definitions: [{ term: 'Relation', definition: 'Subset of Cartesian product', context: 'Basic' }],
          examples: [],
          theorems: []
        }),
        // Properties  
        JSON.stringify({
          formulas: [{ latex: '\\forall a \\in A, aRa', context: 'Reflexive', type: 'display' }],
          definitions: [{ term: 'Reflexive', definition: 'Self-related', context: 'Properties' }],
          examples: [],
          theorems: []
        }),
        // Combining
        JSON.stringify({
          formulas: [{ latex: 'R_1 \\cup R_2', context: 'Union', type: 'inline' }],
          definitions: [],
          examples: [],
          theorems: []
        }),
        // N-ary
        JSON.stringify({
          formulas: [{ latex: 'R \\subseteq A_1 \\times A_2 \\times A_3', context: 'Ternary', type: 'display' }],
          definitions: [],
          examples: [],
          theorems: []
        }),
        // SQL
        JSON.stringify({
          formulas: [{ latex: '\\sigma_{condition}(R)', context: 'Selection', type: 'inline' }],
          definitions: [],
          examples: [],
          theorems: []
        }),
        // Examples
        JSON.stringify({
          examples: [{
            title: 'Property Check',
            problem: 'Check reflexive property',
            solution: [{ stepNumber: 1, description: 'Check all elements', explanation: 'Verify condition' }]
          }]
        })
      ];

      mockClient.createChatCompletion
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3])
        .mockResolvedValueOnce(mockResponses[4])
        .mockResolvedValueOnce(mockResponses[5]);

      const comprehensiveDoc = createMockDocument('comprehensive_test', `
        Relations and Their Properties
        
        Basic definitions, reflexive, symmetric, transitive properties.
        Combining relations with union, intersection, composition.
        N-ary relations and SQL operations.
        
        Examples of property checking and relational algebra.
      `);
      comprehensiveDoc.type = 'relations';

      const result = await processor.process([comprehensiveDoc], {
        confidenceThreshold: 0.7
      });

      expect(result.success).toBe(true);
      expect(mockClient.createChatCompletion).toHaveBeenCalledTimes(6);
      
      const content = result.data![0] as MathematicalContent;
      expect(content.formulas.length).toBeGreaterThan(0);
      expect(content.definitions.length).toBeGreaterThan(0);
      expect(content.workedExamples.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to create mock documents
function createMockDocument(id: string, text: string): SourceDocument {
  const extractedContent: EnhancedExtractedContent = {
    text,
    images: [],
    tables: [],
    metadata: {
      name: `${id}.pdf`,
      size: text.length * 10,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 1,
      wordCount: text.split(' ').length,
      mathContentDensity: 0.5,
      hasWorkedExamples: text.includes('Example') || text.includes('Solution'),
      academicLevel: 'undergraduate'
    },
    structure: {
      headings: [],
      sections: [],
      hierarchy: 1
    },
    mathematicalContent: {
      formulas: [],
      workedExamples: [],
      definitions: [],
      theorems: []
    },
    contentPreservation: {
      totalFormulasFound: 0,
      formulasPreserved: 0,
      totalExamplesFound: 0,
      examplesPreserved: 0,
      preservationScore: 1.0,
      issues: [],
      validationResults: []
    }
  };

  return {
    id,
    file: new File([text], `${id}.pdf`, { type: 'application/pdf' }),
    type: 'unknown',
    extractedContent,
    errors: [],
    warnings: [],
    processingStages: []
  };
}