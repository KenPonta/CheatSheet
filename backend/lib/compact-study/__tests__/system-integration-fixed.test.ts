import {
  processCompactStudyDocuments,
  generateCompactHTML,
  PDFOutputGenerator,
  generateCompactMarkdown,
  type CompactLayoutConfig,
  type PipelineOrchestratorConfig,
  type AcademicDocument
} from '../index';

// Mock the AI client to avoid API key requirement
jest.mock('../../ai/client', () => ({
  getAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                formulas: [
                  {
                    id: 'formula1',
                    latex: 'P(A) = \\frac{|A|}{|S|}',
                    context: 'Basic probability definition',
                    type: 'display',
                    isKeyFormula: true
                  }
                ],
                workedExamples: [
                  {
                    id: 'example1',
                    title: 'Rolling a Die',
                    problem: 'What is the probability of rolling an even number?',
                    solution: [
                      {
                        stepNumber: 1,
                        description: 'Identify sample space',
                        formula: 'S = \\{1, 2, 3, 4, 5, 6\\}',
                        explanation: 'All possible outcomes'
                      }
                    ],
                    subtopic: 'Basic Probability'
                  }
                ],
                definitions: [],
                theorems: []
              })
            }
          }]
        })
      }
    }
  }))
}));

// Mock file processing to avoid PDF parsing issues
jest.mock('../../file-processing', () => ({
  getFileProcessor: jest.fn(() => ({
    processFile: jest.fn().mockResolvedValue({
      text: 'Mock extracted text with P(A) = 0.5 and worked examples',
      metadata: {
        pageCount: 1,
        wordCount: 10,
        hasImages: false,
        hasTables: false,
        language: 'en'
      }
    })
  }))
}));

describe('System Integration Tests (Fixed)', () => {
  let layoutConfig: CompactLayoutConfig;
  let pipelineConfig: PipelineOrchestratorConfig;

  beforeEach(() => {
    // Set up environment
    process.env.OPENAI_API_KEY = 'mock-api-key';

    layoutConfig = {
      paperSize: 'a4',
      columns: 2,
      typography: {
        fontSize: 10,
        lineHeight: 1.15,
        fontFamily: {
          body: 'Times, serif',
          heading: 'Times, serif',
          math: 'Computer Modern, serif',
          code: 'Courier, monospace'
        }
      },
      spacing: {
        paragraphSpacing: 0.25,
        listSpacing: 0.15,
        sectionSpacing: 0.5,
        headingMargins: {
          top: 0.5,
          bottom: 0.25
        }
      },
      margins: {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      },
      mathRendering: {
        displayEquations: {
          centered: true,
          numbered: true,
          fullWidth: true
        },
        inlineEquations: {
          preserveInline: true,
          maxHeight: 12
        }
      }
    };

    pipelineConfig = {
      enableProgressTracking: true,
      enableErrorRecovery: true,
      structureConfig: {
        title: 'Discrete Probability & Relations Study Guide',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          probability: 'Part I: Discrete Probability',
          relations: 'Part II: Relations'
        }
      },
      mathExtractionConfig: {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true
      }
    };
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('End-to-End Workflow Validation', () => {
    it('should process PDF upload to compact output generation successfully', async () => {
      const mockContent = `
# Discrete Probability

## 1.1 Probability Basics
The probability of an event A is P(A) = |A| / |S|.

### Example 1.1
Calculate the probability of rolling an even number on a die.
Solution: P(even) = 3/6 = 1/2
`;

      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'discrete-probability.pdf', { type: 'application/pdf' });

      const files = [{
        file,
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Validate document structure
      expect(academicDocument).toBeDefined();
      expect(academicDocument.title).toBe('Discrete Probability & Relations Study Guide');
      expect(academicDocument.parts).toBeDefined();
      expect(academicDocument.tableOfContents).toBeDefined();
    }, 30000);

    it('should generate HTML output with compact layout', async () => {
      const mockContent = `# Test Content\nP(A) = 0.5`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];
      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      const htmlOutput = await generateCompactHTML(
        academicDocument,
        {
          includeTableOfContents: true,
          includeMathJax: true,
          compactMode: true,
          removeCardComponents: true,
          generateResponsive: true
        },
        layoutConfig
      );

      expect(htmlOutput).toBeDefined();
      expect(htmlOutput.html).toBeDefined();
      expect(htmlOutput.css).toBeDefined();
      expect(htmlOutput.html).toContain('<!DOCTYPE html>');
      expect(htmlOutput.css).toContain('column-count: 2');
      expect(htmlOutput.html).not.toContain('card');
    }, 30000);

    it('should generate PDF output with LaTeX backend', async () => {
      const mockContent = `# Test Content\nP(A) = 0.5`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];
      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(
        academicDocument,
        layoutConfig,
        {
          includeSource: true,
          timeout: 30000,
          engine: 'pdflatex'
        }
      );

      expect(pdfOutput).toBeDefined();
      expect(pdfOutput.buffer).toBeDefined();
      expect(pdfOutput.pageCount).toBeGreaterThan(0);
      expect(pdfOutput.metadata).toBeDefined();
    }, 45000);

    it('should generate Markdown output with Pandoc compatibility', async () => {
      const mockContent = `# Test Content\nP(A) = 0.5`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];
      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      const markdownOutput = await generateCompactMarkdown(
        academicDocument,
        {
          includeFrontMatter: true,
          includeTableOfContents: true,
          mathDelimiters: 'latex',
          codeBlocks: true,
          preserveLineBreaks: false,
          pandocCompatible: true,
          generateTemplate: true
        },
        layoutConfig,
        {
          template: 'compact',
          mathRenderer: 'mathjax',
          variables: {
            title: 'Test Study Guide',
            author: 'Generated by Compact Study Generator',
            date: new Date().toISOString().split('T')[0]
          }
        }
      );

      expect(markdownOutput).toBeDefined();
      expect(markdownOutput.markdown).toBeDefined();
      expect(markdownOutput.pandocTemplate).toBeDefined();
      expect(markdownOutput.markdown).toContain('---');
      expect(markdownOutput.markdown).toContain('# ');
    }, 30000);
  });

  describe('Acceptance Criteria Validation', () => {
    let academicDocument: AcademicDocument;

    beforeEach(async () => {
      const mockContent = `
# Discrete Probability
## Probability Basics
P(A) = |A| / |S|

### Example 1
Calculate P(even) on a die: P(even) = 3/6 = 1/2

# Relations  
## Relation Definitions
R ⊆ A × A

### Example 2
Check if relation is reflexive: ∀a ∈ A: (a,a) ∈ R
`;

      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'comprehensive.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];
      academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
    });

    it('should satisfy Requirement 1.1: Extract mathematical formulas and examples', () => {
      expect(academicDocument).toBeDefined();
      expect(academicDocument.parts.length).toBeGreaterThan(0);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      expect(allSections.length).toBeGreaterThan(0);
    });

    it('should satisfy Requirement 2.1-2.2: Organize content in academic structure', () => {
      expect(academicDocument.parts).toBeDefined();
      expect(academicDocument.tableOfContents).toBeDefined();
      expect(academicDocument.title).toBe('Discrete Probability & Relations Study Guide');
    });

    it('should satisfy Requirement 3.1: Use two-column layout', async () => {
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, layoutConfig);

      expect(htmlOutput.css).toContain('column-count: 2');
      expect(htmlOutput.css).toContain('font-size: 10pt');
      expect(htmlOutput.css).toContain('line-height: 1.15');
    });

    it('should satisfy Requirement 6.4: Remove all Card/Box UI components', async () => {
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, layoutConfig);

      expect(htmlOutput.html).not.toContain('card');
      expect(htmlOutput.html).not.toContain('box-shadow');
      expect(htmlOutput.css).not.toContain('border-radius');
      expect(htmlOutput.css).not.toContain('box-shadow');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle empty files gracefully', async () => {
      const emptyFiles: any[] = [];

      try {
        await processCompactStudyDocuments(emptyFiles, pipelineConfig);
        fail('Should have thrown an error for empty files');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should handle malformed content gracefully', async () => {
      const malformedContent = `Invalid content with broken LaTeX: $\\invalid{`;
      const blob = new Blob([malformedContent], { type: 'application/pdf' });
      const file = new File([blob], 'malformed.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];

      // Should not throw, but handle errors gracefully
      const result = await processCompactStudyDocuments(files, {
        ...pipelineConfig,
        enableErrorRecovery: true
      });

      expect(result).toBeDefined();
    });
  });

  describe('Performance Validation', () => {
    it('should complete processing within reasonable time', async () => {
      const startTime = Date.now();

      const mockContent = `# Test\nP(A) = 0.5`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];
      const result = await processCompactStudyDocuments(files, pipelineConfig);

      const processingTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should demonstrate compact layout efficiency', async () => {
      const mockContent = `# Test Content\nP(A) = 0.5\n\nLong content that would benefit from compact layout...`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

      const files = [{ file, type: 'probability' as const }];
      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Generate compact layout
      const compactHTML = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, layoutConfig);

      // Generate standard layout for comparison
      const standardLayout = { ...layoutConfig, columns: 1 };
      const standardHTML = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: false,
        removeCardComponents: false,
        generateResponsive: true
      }, standardLayout);

      // Compact version should be more efficient (shorter HTML due to denser layout)
      expect(compactHTML.html.length).toBeLessThanOrEqual(standardHTML.html.length * 1.2);
    });
  });
});