// Integration test for Relations Content Processor

import { RelationsProcessor } from '../relations-processor';
import { SourceDocument } from '../processing-pipeline';
import { EnhancedExtractedContent } from '../types';

// Mock OpenAI client
jest.mock('../../ai/client', () => ({
  getOpenAIClient: () => ({
    createChatCompletion: jest.fn()
  })
}));

describe('Relations Processor Integration', () => {
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

  test('should create relations processor successfully', () => {
    expect(processor).toBeDefined();
    expect(processor.name).toBe('relations-processor');
    expect(processor.version).toBe('1.0.0');
  });

  test('should validate relations documents', () => {
    const relationsDoc = createMockDocument('relations_test', `
      Relations and Their Properties
      
      A relation R is reflexive if every element is related to itself.
      A relation R is symmetric if aRb implies bRa.
      A relation R is transitive if aRb and bRc implies aRc.
    `);
    relationsDoc.type = 'relations';

    const result = processor.validate([relationsDoc], {});

    expect(result.passed).toBe(true);
    expect(result.details).toContain('relations documents ready for processing');
  });

  test('should handle empty document list', async () => {
    const result = await processor.process([], {});

    expect(result.success).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('No relations documents found');
  });

  test('should process relations document with mocked AI response', async () => {
    // Mock successful AI response
    const mockResponse = JSON.stringify({
      formulas: [
        {
          latex: '\\forall a \\in A, aRa',
          context: 'Reflexive property',
          type: 'display',
          isKeyFormula: true,
          confidence: 0.9
        }
      ],
      examples: [
        {
          title: 'Reflexive Check Example',
          problem: 'Check if R = {(1,1), (2,2), (3,3)} is reflexive',
          solution: [
            {
              stepNumber: 1,
              description: 'Check each element',
              explanation: 'Verify (a,a) ∈ R for all a'
            }
          ],
          confidence: 0.8,
          isComplete: true
        }
      ],
      definitions: [
        {
          term: 'Reflexive Relation',
          definition: 'A relation where every element is related to itself',
          context: 'Relation properties',
          confidence: 0.9
        }
      ],
      theorems: []
    });

    // Mock all extraction method calls
    mockClient.createChatCompletion
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse);

    const relationsDoc = createMockDocument('relations_test', `
      Relations and Their Properties
      
      A relation R is reflexive if ∀a ∈ A, aRa.
      
      Example: Let A = {1,2,3} and R = {(1,1), (2,2), (3,3)}.
      Check if R is reflexive.
      
      Solution: Since all elements are related to themselves, R is reflexive.
    `);
    relationsDoc.type = 'relations';

    const result = await processor.process([relationsDoc], {
      confidenceThreshold: 0.7
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(mockClient.createChatCompletion).toHaveBeenCalled();
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