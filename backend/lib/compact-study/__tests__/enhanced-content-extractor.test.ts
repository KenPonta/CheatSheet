// Tests for enhanced mathematical content extractor

import { EnhancedContentExtractor } from '../enhanced-content-extractor';
import { MathExtractionConfig } from '../types';

// Mock the AI client
const mockCreateChatCompletion = jest.fn();
jest.mock('../../ai/client', () => ({
  getOpenAIClient: () => ({
    createChatCompletion: mockCreateChatCompletion
  })
}));

// Mock file processing
jest.mock('../../file-processing', () => ({
  FileProcessing: {
    processFile: jest.fn()
  }
}));

describe('EnhancedContentExtractor', () => {
  let extractor: EnhancedContentExtractor;
  let mockAIClient: any;
  let mockFileProcessing: any;

  beforeEach(() => {
    extractor = new EnhancedContentExtractor();
    
    // Setup mocks
    mockAIClient = { createChatCompletion: mockCreateChatCompletion };
    
    const { FileProcessing } = require('../../file-processing');
    mockFileProcessing = FileProcessing;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractMathematicalContent', () => {
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    const mockBasicContent = {
      text: 'This is a test document with formulas like P(A|B) = P(A∩B)/P(B) and examples.',
      images: [],
      tables: [],
      metadata: {
        name: 'test.pdf',
        size: 1000,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 1,
        wordCount: 15
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 0
      }
    };

    beforeEach(() => {
      mockFileProcessing.processFile.mockResolvedValue({
        status: 'success',
        content: mockBasicContent,
        errors: [],
        processingTime: 100
      });
    });

    it('should extract mathematical content successfully', async () => {
      // Mock AI responses
      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify({
          formulas: [{
            originalText: 'P(A|B) = P(A∩B)/P(B)',
            latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
            context: 'conditional probability formula',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.9,
            textPosition: { start: 45, end: 65 }
          }]
        }))
        .mockResolvedValueOnce(JSON.stringify({
          examples: [{
            title: 'Example 1',
            problem: 'Calculate P(A|B)',
            subtopic: 'Conditional Probability',
            solution: [{
              stepNumber: 1,
              description: 'Apply the formula',
              formula: 'P(A|B) = P(A∩B)/P(B)',
              explanation: 'Use the definition of conditional probability'
            }],
            confidence: 0.8,
            isComplete: true,
            textPosition: { start: 70, end: 120 }
          }]
        }))
        .mockResolvedValueOnce(JSON.stringify({ definitions: [] }))
        .mockResolvedValueOnce(JSON.stringify({ theorems: [] }));

      const result = await extractor.extractMathematicalContent(mockFile);

      expect(result).toBeDefined();
      expect(result.mathematicalContent).toBeDefined();
      expect(result.mathematicalContent.formulas).toHaveLength(1);
      expect(result.mathematicalContent.workedExamples).toHaveLength(1);
      expect(result.contentPreservation).toBeDefined();
      expect(result.contentPreservation.preservationScore).toBeGreaterThan(0);
    });

    it('should handle file processing errors', async () => {
      mockFileProcessing.processFile.mockResolvedValue({
        status: 'failed',
        errors: [{ message: 'File processing failed' }],
        processingTime: 0
      });

      await expect(extractor.extractMathematicalContent(mockFile))
        .rejects.toThrow('File processing failed');
    });

    it('should respect configuration options', async () => {
      const config: Partial<MathExtractionConfig> = {
        enableWorkedExampleDetection: false,
        enableDefinitionExtraction: false,
        enableTheoremExtraction: false,
        confidenceThreshold: 0.8
      };

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify({
          formulas: [{
            originalText: 'P(A|B)',
            latex: 'P(A|B)',
            context: 'probability notation',
            type: 'inline',
            isKeyFormula: false,
            confidence: 0.7, // Below threshold
            textPosition: { start: 0, end: 6 }
          }]
        }));

      const result = await extractor.extractMathematicalContent(mockFile, config);

      expect(result.mathematicalContent.formulas).toHaveLength(0); // Filtered out by confidence
      expect(result.mathematicalContent.workedExamples).toHaveLength(0); // Disabled
      expect(result.mathematicalContent.definitions).toHaveLength(0); // Disabled
      expect(result.mathematicalContent.theorems).toHaveLength(0); // Disabled
    });

    it('should validate content preservation', async () => {
      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify({
          formulas: [{
            originalText: 'P(A|B) = P(A∩B)/P(B)',
            latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
            context: 'conditional probability',
            type: 'display',
            isKeyFormula: true,
            confidence: 0.9,
            textPosition: { start: 0, end: 20 }
          }]
        }))
        .mockResolvedValueOnce(JSON.stringify({ examples: [] }))
        .mockResolvedValueOnce(JSON.stringify({ definitions: [] }))
        .mockResolvedValueOnce(JSON.stringify({ theorems: [] }));

      const result = await extractor.extractMathematicalContent(mockFile);

      expect(result.contentPreservation.totalFormulasFound).toBeGreaterThan(0);
      expect(result.contentPreservation.formulasPreserved).toBe(1);
      expect(result.contentPreservation.preservationScore).toBeGreaterThan(0);
      expect(result.contentPreservation.validationResults).toBeDefined();
    });

    it('should enhance images with math detection', async () => {
      const mockContentWithImages = {
        ...mockBasicContent,
        images: [{
          id: 'img1',
          base64: 'data:image/png;base64,test',
          ocrText: 'This image contains formula: x² + y² = z²',
          context: 'Pythagorean theorem',
          isExample: true
        }]
      };

      mockFileProcessing.processFile.mockResolvedValue({
        status: 'success',
        content: mockContentWithImages,
        errors: [],
        processingTime: 100
      });

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify({ formulas: [] }))
        .mockResolvedValueOnce(JSON.stringify({ examples: [] }))
        .mockResolvedValueOnce(JSON.stringify({ definitions: [] }))
        .mockResolvedValueOnce(JSON.stringify({ theorems: [] }));

      const result = await extractor.extractMathematicalContent(mockFile);

      expect(result.images).toHaveLength(1);
      expect(result.images[0].containsMath).toBe(true);
      expect(result.images[0].mathContent).toBeDefined();
      expect(result.images[0].mathContent.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    it('should handle AI service errors gracefully', async () => {
      mockFileProcessing.processFile.mockResolvedValue({
        status: 'success',
        content: {
          text: 'test content',
          images: [],
          tables: [],
          metadata: { name: 'test.pdf', size: 100, type: 'application/pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 100
      });

      mockCreateChatCompletion.mockRejectedValue(new Error('AI service error'));

      await expect(extractor.extractMathematicalContent(mockFile))
        .rejects.toThrow('Mathematical content extraction failed');
    });

    it('should handle invalid AI responses', async () => {
      mockFileProcessing.processFile.mockResolvedValue({
        status: 'success',
        content: {
          text: 'test content',
          images: [],
          tables: [],
          metadata: { name: 'test.pdf', size: 100, type: 'application/pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 100
      });

      mockCreateChatCompletion.mockResolvedValue('invalid json');

      await expect(extractor.extractMathematicalContent(mockFile))
        .rejects.toThrow('Mathematical content extraction failed');
    });
  });

  describe('formula extraction', () => {
    it('should process extracted formulas correctly', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      mockFileProcessing.processFile.mockResolvedValue({
        status: 'success',
        content: {
          text: 'Formula: E = mc²',
          images: [],
          tables: [],
          metadata: { name: 'test.pdf', size: 100, type: 'application/pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 100
      });

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify({
          formulas: [{
            originalText: 'E = mc²',
            latex: 'E = mc^2',
            context: 'Einstein mass-energy equivalence',
            type: 'inline',
            isKeyFormula: true,
            confidence: 0.95,
            textPosition: { start: 9, end: 16 }
          }]
        }))
        .mockResolvedValueOnce(JSON.stringify({ examples: [] }))
        .mockResolvedValueOnce(JSON.stringify({ definitions: [] }))
        .mockResolvedValueOnce(JSON.stringify({ theorems: [] }));

      const result = await extractor.extractMathematicalContent(mockFile);

      const formula = result.mathematicalContent.formulas[0];
      expect(formula.id).toContain('test.pdf_formula_0');
      expect(formula.latex).toBe('E = mc^2');
      expect(formula.type).toBe('inline');
      expect(formula.isKeyFormula).toBe(true);
      expect(formula.confidence).toBe(0.95);
      expect(formula.originalText).toBe('E = mc²');
    });
  });

  describe('worked example extraction', () => {
    it('should process extracted examples correctly', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      mockFileProcessing.processFile.mockResolvedValue({
        status: 'success',
        content: {
          text: 'Example 1: Calculate the probability',
          images: [],
          tables: [],
          metadata: { name: 'test.pdf', size: 100, type: 'application/pdf', lastModified: new Date() },
          structure: { headings: [], sections: [], hierarchy: 0 }
        },
        errors: [],
        processingTime: 100
      });

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify({ formulas: [] }))
        .mockResolvedValueOnce(JSON.stringify({
          examples: [{
            title: 'Example 1',
            problem: 'Calculate P(A and B)',
            subtopic: 'Joint Probability',
            solution: [
              {
                stepNumber: 1,
                description: 'Identify given information',
                explanation: 'We need to find the joint probability'
              },
              {
                stepNumber: 2,
                description: 'Apply the formula',
                formula: 'P(A ∩ B) = P(A) × P(B|A)',
                explanation: 'Use the multiplication rule'
              }
            ],
            confidence: 0.85,
            isComplete: true,
            textPosition: { start: 0, end: 30 }
          }]
        }))
        .mockResolvedValueOnce(JSON.stringify({ definitions: [] }))
        .mockResolvedValueOnce(JSON.stringify({ theorems: [] }));

      const result = await extractor.extractMathematicalContent(mockFile);

      const example = result.mathematicalContent.workedExamples[0];
      expect(example.id).toContain('test.pdf_example_0');
      expect(example.title).toBe('Example 1');
      expect(example.problem).toBe('Calculate P(A and B)');
      expect(example.subtopic).toBe('Joint Probability');
      expect(example.solution).toHaveLength(2);
      expect(example.isComplete).toBe(true);
      expect(example.confidence).toBe(0.85);
    });
  });
});