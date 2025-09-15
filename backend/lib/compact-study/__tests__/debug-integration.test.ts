import {
  processCompactStudyDocuments,
  type PipelineOrchestratorConfig
} from '../pipeline-orchestrator';

// Simple test to debug the pipeline issue
describe('Debug Integration Test', () => {
  it('should process a simple document without errors', async () => {
    const mockContent = `
# Test Content
This is a simple test with a formula: P(A) = 0.5
And an example:
Example 1: Calculate P(A ∪ B) = P(A) + P(B) - P(A ∩ B)
`;

    // Create mock File
    const blob = new Blob([mockContent], { type: 'application/pdf' });
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

    const files = [{
      file,
      type: 'probability' as const
    }];

    const config: PipelineOrchestratorConfig = {
      enableProgressTracking: false,
      enableErrorRecovery: true,
      structureConfig: {
        title: 'Debug Test',
        enableNumbering: true,
        enableTableOfContents: false
      },
      mathExtractionConfig: {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true
      }
    };

    try {
      console.log('Starting debug test...');
      const result = await processCompactStudyDocuments(files, config);
      console.log('Debug test completed successfully');
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Debug Test');
      
    } catch (error) {
      console.error('Debug test failed:', error);
      throw error;
    }
  });
});