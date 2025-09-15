import {
  createFileProcessor,
  createMathContentProcessor,
  createAcademicStructureProcessor
} from '../content-processors';
import { SourceDocument } from '../processing-pipeline';

describe('Processor Debug Tests', () => {
  it('should test file processor individually', async () => {
    const mockContent = `
# Test Content
This is a simple test with a formula: P(A) = 0.5
`;

    const blob = new Blob([mockContent], { type: 'application/pdf' });
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

    const sourceDoc: SourceDocument = {
      id: 'test-doc',
      file,
      type: 'probability',
      processingStatus: 'pending',
      errors: []
    };

    const processor = createFileProcessor();
    
    try {
      const result = await processor.process([sourceDoc], {});
      console.log('File processor result:', result);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
    } catch (error) {
      console.error('File processor error:', error);
      throw error;
    }
  });

  it('should test math content processor individually', async () => {
    // Mock processed document from file processor
    const mockProcessedDoc: SourceDocument = {
      id: 'test-doc',
      file: new File([''], 'test.pdf'),
      type: 'probability',
      processingStatus: 'completed',
      errors: [],
      extractedContent: {
        text: 'This is a test with formula P(A) = 0.5 and example: Calculate P(A ∪ B)',
        metadata: {
          pageCount: 1,
          wordCount: 15,
          hasImages: false,
          hasTables: false,
          language: 'en'
        }
      }
    };

    const processor = createMathContentProcessor();
    
    try {
      const result = await processor.process([mockProcessedDoc], {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true
      });
      
      console.log('Math processor result:', result);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
    } catch (error) {
      console.error('Math processor error:', error);
      throw error;
    }
  });

  it('should test academic structure processor individually', async () => {
    // Mock document with mathematical content
    const mockMathDoc: SourceDocument = {
      id: 'test-doc',
      file: new File([''], 'test.pdf'),
      type: 'probability',
      processingStatus: 'completed',
      errors: [],
      extractedContent: {
        text: 'This is a test with formula P(A) = 0.5',
        metadata: {
          pageCount: 1,
          wordCount: 10,
          hasImages: false,
          hasTables: false,
          language: 'en'
        }
      },
      mathematicalContent: {
        formulas: [{
          id: 'formula1',
          latex: 'P(A) = 0.5',
          context: 'probability formula',
          type: 'inline' as const,
          sourceLocation: { page: 1, line: 1 },
          isKeyFormula: true
        }],
        workedExamples: [],
        definitions: [],
        theorems: []
      }
    };

    const processor = createAcademicStructureProcessor();
    
    try {
      const result = await processor.process([mockMathDoc], {
        title: 'Test Document',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          probability: 'Part I: Probability'
        }
      });
      
      console.log('Structure processor result:', result);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
    } catch (error) {
      console.error('Structure processor error:', error);
      throw error;
    }
  });
});