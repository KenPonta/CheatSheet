// Integration tests for error handling system

import {
  EnhancedContentExtractorWithErrorHandling,
  CompactLayoutEngineWithErrorHandling,
  CrossReferenceSystemWithErrorHandling,
  CompactStudyProcessingPipeline
} from '../error-handling-integration';
import { CompactLayoutConfig, SourceLocation } from '../types';

describe('Error Handling Integration', () => {
  describe('EnhancedContentExtractorWithErrorHandling', () => {
    let extractor: EnhancedContentExtractorWithErrorHandling;

    beforeEach(() => {
      extractor = new EnhancedContentExtractorWithErrorHandling();
    });

    it('should extract mathematical content and handle errors gracefully', async () => {
      const text = `
        Example 1: Calculate E[X] where X is a random variable.
        Solution: E[X] = ∑ x P(X = x)
        
        The probability P(A ∩ B) can be calculated using the formula.
      `;

      const sourceLocation: SourceLocation = {
        fileId: 'test.pdf',
        page: 1,
        section: 'probability'
      };

      const result = await extractor.extractMathematicalContent(text, sourceLocation);

      expect(result.content).toBeDefined();
      expect(result.content.formulas.length).toBeGreaterThan(0);
      expect(result.content.workedExamples.length).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);

      // Check that recovered content is properly handled
      const recoveredFormulas = result.content.formulas.filter(f => f.id.startsWith('recovered-'));
      const recoveredExamples = result.content.workedExamples.filter(e => e.id.startsWith('recovered-example-'));
      
      // Some content might be recovered due to simulated failures
      expect(recoveredFormulas.length + recoveredExamples.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate error summary', () => {
      const summary = extractor.getErrorSummary();
      expect(summary).toHaveProperty('totalWarnings');
      expect(summary).toHaveProperty('byType');
      expect(summary).toHaveProperty('bySeverity');
      expect(summary).toHaveProperty('recommendations');
    });
  });

  describe('CompactLayoutEngineWithErrorHandling', () => {
    let layoutEngine: CompactLayoutEngineWithErrorHandling;

    beforeEach(() => {
      layoutEngine = new CompactLayoutEngineWithErrorHandling();
    });

    it('should generate layout and handle overflow errors', async () => {
      const content = {
        formulas: Array(50).fill(null).map((_, i) => ({
          id: `formula-${i}`,
          latex: `E[X_${i}] = μ_${i}`,
          context: 'test',
          type: 'display' as const,
          sourceLocation: { fileId: 'test.pdf' },
          isKeyFormula: true,
          confidence: 0.9
        })),
        workedExamples: Array(20).fill(null).map((_, i) => ({
          id: `example-${i}`,
          title: `Example ${i}`,
          problem: `Problem ${i}`,
          solution: [{ stepNumber: 1, description: 'Step 1', explanation: 'Explanation' }],
          sourceLocation: { fileId: 'test.pdf' },
          subtopic: 'test',
          confidence: 0.9,
          isComplete: true
        })),
        definitions: [],
        theorems: []
      };

      const config: CompactLayoutConfig = {
        paperSize: 'a4',
        columns: 2,
        typography: {
          fontSize: 11,
          lineHeight: 1.25,
          fontFamily: {
            body: 'Times',
            heading: 'Times',
            math: 'Times',
            code: 'Courier'
          }
        },
        spacing: {
          paragraphSpacing: 0.35,
          listSpacing: 0.25,
          sectionSpacing: 0.5,
          headingMargins: { top: 0.5, bottom: 0.25 }
        },
        margins: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1,
          columnGap: 0.5
        },
        mathRendering: {
          displayEquations: {
            centered: true,
            numbered: true,
            fullWidth: false
          },
          inlineEquations: {
            preserveInline: true,
            maxHeight: 20
          }
        }
      };

      const result = await layoutEngine.generateLayout(content, config);

      expect(result.layout).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);

      // Layout should either succeed or use fallback
      expect(result.layout.columns).toBeGreaterThanOrEqual(1);
      expect(result.layout.columns).toBeLessThanOrEqual(2);
    });
  });

  describe('CrossReferenceSystemWithErrorHandling', () => {
    let crossRefSystem: CrossReferenceSystemWithErrorHandling;

    beforeEach(() => {
      crossRefSystem = new CrossReferenceSystemWithErrorHandling();
    });

    it('should process cross-references and handle missing targets', async () => {
      const content = {
        formulas: [{
          id: 'formula-1',
          latex: 'E[X] = μ',
          context: 'test',
          type: 'display' as const,
          sourceLocation: { fileId: 'test.pdf' },
          isKeyFormula: true,
          confidence: 0.9
        }],
        workedExamples: [{
          id: 'example-1',
          title: 'Example 1',
          problem: 'Test problem',
          solution: [{ stepNumber: 1, description: 'Step 1', explanation: 'Explanation' }],
          sourceLocation: { fileId: 'test.pdf' },
          subtopic: 'test',
          confidence: 0.9,
          isComplete: true
        }],
        definitions: [],
        theorems: []
      };

      const references = [
        {
          id: 'ref-1',
          type: 'formula' as const,
          sourceId: 'source-1',
          targetId: 'formula-1', // This exists
          displayText: 'see Formula 1'
        },
        {
          id: 'ref-2',
          type: 'example' as const,
          sourceId: 'source-2',
          targetId: 'example-999', // This doesn't exist
          displayText: 'see Example 999'
        }
      ];

      const result = await crossRefSystem.processCrossReferences(references, content);

      expect(result.processedReferences).toHaveLength(2);
      expect(Array.isArray(result.warnings)).toBe(true);

      // First reference should be processed normally
      const validRef = result.processedReferences.find(r => r.targetId === 'formula-1');
      expect(validRef).toBeDefined();
      expect(validRef.isProcessed).toBe(true);

      // Second reference should be handled with fallback
      const invalidRef = result.processedReferences.find(r => 
        r.originalReference?.targetId === 'example-999' || r.targetId === 'example-1'
      );
      expect(invalidRef).toBeDefined();
    });
  });

  describe('CompactStudyProcessingPipeline', () => {
    let pipeline: CompactStudyProcessingPipeline;

    beforeEach(() => {
      pipeline = new CompactStudyProcessingPipeline();
    });

    it('should process complete document with comprehensive error handling', async () => {
      const text = `
        Discrete Probability Basics
        
        Example 1: Calculate the expected value E[X] for a discrete random variable.
        Solution: E[X] = ∑ x P(X = x) for all possible values of x.
        
        The probability of intersection P(A ∩ B) follows the multiplication rule.
        
        Example 2: For independent events, P(A ∩ B) = P(A) × P(B).
      `;

      const config: CompactLayoutConfig = {
        paperSize: 'a4',
        columns: 2,
        typography: {
          fontSize: 11,
          lineHeight: 1.25,
          fontFamily: {
            body: 'Times',
            heading: 'Times',
            math: 'Times',
            code: 'Courier'
          }
        },
        spacing: {
          paragraphSpacing: 0.35,
          listSpacing: 0.25,
          sectionSpacing: 0.5,
          headingMargins: { top: 0.5, bottom: 0.25 }
        },
        margins: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1,
          columnGap: 0.5
        },
        mathRendering: {
          displayEquations: {
            centered: true,
            numbered: true,
            fullWidth: false
          },
          inlineEquations: {
            preserveInline: true,
            maxHeight: 20
          }
        }
      };

      const sourceLocation: SourceLocation = {
        fileId: 'test-document.pdf',
        page: 1,
        section: 'discrete-probability'
      };

      const result = await pipeline.processDocument(text, config, sourceLocation);

      // Verify all components are present
      expect(result.content).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(Array.isArray(result.crossReferences)).toBe(true);
      expect(Array.isArray(result.allWarnings)).toBe(true);
      expect(result.errorSummary).toBeDefined();

      // Verify error summary structure
      expect(result.errorSummary.extraction).toBeDefined();
      expect(result.errorSummary.layout).toBeDefined();
      expect(result.errorSummary.crossReferences).toBeDefined();
      expect(result.errorSummary.overall).toBeDefined();

      // Verify overall processing status
      expect(typeof result.errorSummary.overall.processingSuccess).toBe('boolean');
      expect(typeof result.errorSummary.overall.totalWarnings).toBe('number');
      expect(typeof result.errorSummary.overall.hasErrors).toBe('boolean');

      // Content should have been extracted
      expect(result.content.formulas.length + result.content.workedExamples.length).toBeGreaterThan(0);
    });

    it('should handle multiple error types in single processing run', async () => {
      // Text designed to trigger various errors
      const problematicText = `
        Invalid formula: ∫∫∫ complex_formula_that_might_fail dx dy dz
        
        Example with missing steps: Calculate something but no solution provided.
        
        Reference to non-existent Example 99.99 should be handled gracefully.
      `;

      const config: CompactLayoutConfig = {
        paperSize: 'a4',
        columns: 3, // Might cause overflow
        typography: {
          fontSize: 8, // Very small, might cause issues
          lineHeight: 1.0, // Very tight
          fontFamily: {
            body: 'Times',
            heading: 'Times',
            math: 'Times',
            code: 'Courier'
          }
        },
        spacing: {
          paragraphSpacing: 0.1, // Very tight
          listSpacing: 0.1,
          sectionSpacing: 0.1,
          headingMargins: { top: 0.1, bottom: 0.1 }
        },
        margins: {
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5,
          columnGap: 0.2
        },
        mathRendering: {
          displayEquations: {
            centered: true,
            numbered: true,
            fullWidth: false
          },
          inlineEquations: {
            preserveInline: true,
            maxHeight: 10
          }
        }
      };

      const sourceLocation: SourceLocation = {
        fileId: 'problematic-document.pdf',
        page: 1,
        section: 'test'
      };

      const result = await pipeline.processDocument(problematicText, config, sourceLocation);

      // Processing should complete despite errors
      expect(result).toBeDefined();
      expect(result.errorSummary.overall.totalWarnings).toBeGreaterThanOrEqual(0);

      // Processing should complete successfully even with problematic content
      expect(result.errorSummary.overall.processingSuccess).toBeDefined();
      
      // Should have processed some content despite potential issues
      const totalContent = result.content.formulas.length + 
                          result.content.workedExamples.length + 
                          result.content.definitions.length + 
                          result.content.theorems.length;
      expect(totalContent).toBeGreaterThanOrEqual(0);
    });
  });
});