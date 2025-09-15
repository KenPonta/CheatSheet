import {
  processCompactStudyDocuments,
  generateCompactHTML,
  PDFOutputGenerator,
  generateCompactMarkdown,
  CompactLayoutEngine,
  type CompactLayoutConfig,
  type PipelineOrchestratorConfig,
  type AcademicDocument,
  type HTMLOutput,
  type PDFOutput,
  type MarkdownOutput
} from '../index';

// Mock file content that simulates discrete probability and relations PDFs
const mockDiscreteProbabilityContent = `
# Discrete Probability

## 1.1 Probability Basics
The probability of an event A is defined as P(A) = |A| / |S|, where |S| is the size of the sample space.

### Example 1.1
If we roll a fair six-sided die, what is the probability of rolling an even number?

Solution:
- Sample space S = {1, 2, 3, 4, 5, 6}
- Event A = {2, 4, 6} (even numbers)
- P(A) = |A| / |S| = 3 / 6 = 1/2

## 1.2 Conditional Probability
The conditional probability of A given B is P(A|B) = P(A ∩ B) / P(B), provided P(B) > 0.

### Bayes' Theorem
P(A|B) = P(B|A) × P(A) / P(B)

### Example 1.2
In a medical test with 95% accuracy, if 1% of the population has the disease, what is the probability that a person who tests positive actually has the disease?

Solution:
Let D = has disease, T = tests positive
- P(D) = 0.01
- P(T|D) = 0.95
- P(T|¬D) = 0.05
- P(T) = P(T|D)P(D) + P(T|¬D)P(¬D) = 0.95 × 0.01 + 0.05 × 0.99 = 0.0590
- P(D|T) = P(T|D) × P(D) / P(T) = 0.95 × 0.01 / 0.0590 ≈ 0.161

## 1.3 Random Variables
A random variable X is a function that assigns a real number to each outcome in the sample space.

### Expected Value
E[X] = Σ x × P(X = x)

### Variance
Var(X) = E[X²] - (E[X])²

### Example 1.3
For a fair coin flip where X = 1 for heads and X = 0 for tails:
- E[X] = 1 × 0.5 + 0 × 0.5 = 0.5
- E[X²] = 1² × 0.5 + 0² × 0.5 = 0.5
- Var(X) = 0.5 - (0.5)² = 0.25
`;

const mockRelationsContent = `
# Relations

## 2.1 Relation Definitions
A relation R on a set A is a subset of A × A. For elements a, b ∈ A, we write aRb if (a,b) ∈ R.

## 2.2 Relation Properties

### Reflexive
A relation R is reflexive if for all a ∈ A, aRa.

### Symmetric  
A relation R is symmetric if for all a, b ∈ A, if aRb then bRa.

### Transitive
A relation R is transitive if for all a, b, c ∈ A, if aRb and bRc then aRc.

### Example 2.1
Consider the relation R = {(1,1), (2,2), (3,3), (1,2), (2,1)} on A = {1, 2, 3}.

Check properties:
- Reflexive: Yes, (1,1), (2,2), (3,3) ∈ R
- Symmetric: Yes, (1,2) ∈ R and (2,1) ∈ R
- Transitive: Yes, no violations found

## 2.3 Combining Relations
Given relations R and S on set A:
- Union: R ∪ S = {(a,b) | (a,b) ∈ R or (a,b) ∈ S}
- Intersection: R ∩ S = {(a,b) | (a,b) ∈ R and (a,b) ∈ S}
- Composition: R ∘ S = {(a,c) | ∃b: (a,b) ∈ S and (b,c) ∈ R}

### Example 2.2
Let R = {(1,2), (2,3)} and S = {(1,1), (2,2), (3,3)} on A = {1, 2, 3}.

Calculate R ∘ S:
- For (1,1) ∈ S: need (1,c) ∈ R, we have (1,2) ∈ R, so (1,2) ∈ R ∘ S
- For (2,2) ∈ S: need (2,c) ∈ R, we have (2,3) ∈ R, so (2,3) ∈ R ∘ S
- For (3,3) ∈ S: need (3,c) ∈ R, no such pair exists

Therefore, R ∘ S = {(1,2), (2,3)}

## 2.4 SQL-Style Operations
Relations can be viewed as tables, enabling SQL-like operations:

\`\`\`sql
SELECT * FROM R WHERE first_element = 1;
SELECT R.first, S.second FROM R JOIN S ON R.second = S.first;
\`\`\`

### Example 2.3
Given relation R(student, course) and S(course, grade):
- Natural join: R ⋈ S produces (student, course, grade) tuples
- Selection: σ_{grade='A'}(R ⋈ S) finds students with A grades
`;

// Create mock File objects
function createMockFile(name: string, content: string): File {
  const blob = new Blob([content], { type: 'application/pdf' });
  return new File([blob], name, { type: 'application/pdf' });
}

describe('Complete System Integration Tests', () => {
  let layoutConfig: CompactLayoutConfig;
  let pipelineConfig: PipelineOrchestratorConfig;

  beforeEach(() => {
    // Setup compact layout configuration
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

    // Setup pipeline configuration
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

  describe('End-to-End Workflow Tests', () => {
    it('should process PDF upload to compact output generation successfully', async () => {
      // Arrange: Create mock files
      const files = [
        {
          file: createMockFile('discrete-probability.pdf', mockDiscreteProbabilityContent),
          type: 'probability' as const
        },
        {
          file: createMockFile('relations.pdf', mockRelationsContent),
          type: 'relations' as const
        }
      ];

      // Act: Process documents through complete pipeline
      const academicDocument: AcademicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Assert: Validate document structure
      expect(academicDocument).toBeDefined();
      expect(academicDocument.title).toBe('Discrete Probability & Relations Study Guide');
      expect(academicDocument.parts).toHaveLength(2);
      expect(academicDocument.tableOfContents).toBeDefined();
      
      // Validate Part I (Discrete Probability)
      const probabilityPart = academicDocument.parts.find(p => p.title.includes('Discrete Probability'));
      expect(probabilityPart).toBeDefined();
      expect(probabilityPart!.sections.length).toBeGreaterThan(0);
      
      // Validate Part II (Relations)
      const relationsPart = academicDocument.parts.find(p => p.title.includes('Relations'));
      expect(relationsPart).toBeDefined();
      expect(relationsPart!.sections.length).toBeGreaterThan(0);

      // Validate mathematical content preservation
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const totalFormulas = allSections.reduce((sum, section) => sum + section.formulas.length, 0);
      const totalExamples = allSections.reduce((sum, section) => sum + section.examples.length, 0);
      
      expect(totalFormulas).toBeGreaterThan(0);
      expect(totalExamples).toBeGreaterThan(0);

      // Validate cross-references
      expect(academicDocument.crossReferences).toBeDefined();
      expect(Array.isArray(academicDocument.crossReferences)).toBe(true);
    }, 30000);

    it('should generate HTML output with compact layout', async () => {
      // Arrange: Process documents first
      const files = [
        {
          file: createMockFile('discrete-probability.pdf', mockDiscreteProbabilityContent),
          type: 'probability' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Act: Generate HTML output
      const htmlOutput: HTMLOutput = await generateCompactHTML(
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

      // Assert: Validate HTML output
      expect(htmlOutput).toBeDefined();
      expect(htmlOutput.html).toBeDefined();
      expect(htmlOutput.css).toBeDefined();
      expect(htmlOutput.mathJaxConfig).toBeDefined();
      expect(htmlOutput.metadata).toBeDefined();

      // Validate HTML structure
      expect(htmlOutput.html).toContain('<!DOCTYPE html>');
      expect(htmlOutput.html).toContain('Discrete Probability');
      expect(htmlOutput.html).not.toContain('card'); // No card components
      expect(htmlOutput.html).not.toContain('box-shadow'); // No box styling

      // Validate CSS contains compact rules
      expect(htmlOutput.css).toContain('column-count: 2');
      expect(htmlOutput.css).toContain('font-size: 10pt');
      expect(htmlOutput.css).toContain('line-height: 1.15');

      // Validate metadata
      expect(htmlOutput.metadata.stats.totalSections).toBeGreaterThan(0);
      expect(htmlOutput.metadata.stats.totalFormulas).toBeGreaterThan(0);
      expect(htmlOutput.metadata.preservationScore).toBeGreaterThan(0);
    }, 30000);

    it('should generate PDF output with LaTeX backend', async () => {
      // Arrange: Process documents first
      const files = [
        {
          file: createMockFile('relations.pdf', mockRelationsContent),
          type: 'relations' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Act: Generate PDF output
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput: PDFOutput = await pdfGenerator.generatePDF(
        academicDocument,
        layoutConfig,
        {
          includeSource: true,
          timeout: 30000,
          engine: 'pdflatex'
        }
      );

      // Assert: Validate PDF output
      expect(pdfOutput).toBeDefined();
      expect(pdfOutput.buffer).toBeDefined();
      expect(pdfOutput.buffer.length).toBeGreaterThan(0);
      expect(pdfOutput.pageCount).toBeGreaterThan(0);
      expect(pdfOutput.metadata).toBeDefined();

      // Validate metadata
      expect(pdfOutput.metadata.stats.totalSections).toBeGreaterThan(0);
      expect(pdfOutput.metadata.preservationScore).toBeGreaterThan(0);

      // If LaTeX source is included, validate it
      if (pdfOutput.latexSource) {
        expect(pdfOutput.latexSource).toContain('\\documentclass');
        expect(pdfOutput.latexSource).toContain('\\twocolumn');
        expect(pdfOutput.latexSource).toContain('Relations');
      }
    }, 45000);

    it('should generate Markdown output with Pandoc compatibility', async () => {
      // Arrange: Process documents first
      const files = [
        {
          file: createMockFile('discrete-probability.pdf', mockDiscreteProbabilityContent),
          type: 'probability' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Act: Generate Markdown output
      const markdownOutput: MarkdownOutput = await generateCompactMarkdown(
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
            title: 'Discrete Probability Study Guide',
            author: 'Generated by Compact Study Generator',
            date: new Date().toISOString().split('T')[0]
          }
        }
      );

      // Assert: Validate Markdown output
      expect(markdownOutput).toBeDefined();
      expect(markdownOutput.markdown).toBeDefined();
      expect(markdownOutput.pandocTemplate).toBeDefined();
      expect(markdownOutput.metadata).toBeDefined();

      // Validate Markdown structure
      expect(markdownOutput.markdown).toContain('---'); // Front matter
      expect(markdownOutput.markdown).toContain('# '); // Headers
      expect(markdownOutput.markdown).toContain('Discrete Probability');
      expect(markdownOutput.markdown).toContain('$$'); // Math blocks

      // Validate Pandoc template
      expect(markdownOutput.pandocTemplate).toContain('$title$');
      expect(markdownOutput.pandocTemplate).toContain('$body$');

      // Validate metadata
      expect(markdownOutput.metadata.stats.totalSections).toBeGreaterThan(0);
      expect(markdownOutput.metadata.preservationScore).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Acceptance Criteria Validation', () => {
    let academicDocument: AcademicDocument;

    beforeEach(async () => {
      const files = [
        {
          file: createMockFile('discrete-probability.pdf', mockDiscreteProbabilityContent),
          type: 'probability' as const
        },
        {
          file: createMockFile('relations.pdf', mockRelationsContent),
          type: 'relations' as const
        }
      ];

      academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
    });

    it('should satisfy Requirement 1.1: Extract all mathematical formulas, definitions, and worked examples', () => {
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const totalFormulas = allSections.reduce((sum, section) => sum + section.formulas.length, 0);
      const totalExamples = allSections.reduce((sum, section) => sum + section.examples.length, 0);

      expect(totalFormulas).toBeGreaterThan(0);
      expect(totalExamples).toBeGreaterThan(0);

      // Check for specific formulas from mock content
      const formulaTexts = allSections.flatMap(s => s.formulas.map(f => f.latex));
      expect(formulaTexts.some(f => f.includes('P(A)'))).toBe(true);
      expect(formulaTexts.some(f => f.includes('E[X]'))).toBe(true);
    });

    it('should satisfy Requirement 2.1-2.2: Organize content in logical academic structure', () => {
      // Check Part I and Part II structure
      expect(academicDocument.parts).toHaveLength(2);
      
      const probabilityPart = academicDocument.parts.find(p => p.title.includes('Discrete Probability'));
      const relationsPart = academicDocument.parts.find(p => p.title.includes('Relations'));
      
      expect(probabilityPart).toBeDefined();
      expect(relationsPart).toBeDefined();
      
      // Check numbered sections
      expect(probabilityPart!.sections.length).toBeGreaterThan(0);
      expect(relationsPart!.sections.length).toBeGreaterThan(0);
      
      // Check table of contents
      expect(academicDocument.tableOfContents).toBeDefined();
      expect(academicDocument.tableOfContents.length).toBeGreaterThan(0);
    });

    it('should satisfy Requirement 3.1: Use two-column layout for compact typography', async () => {
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

    it('should satisfy Requirement 4.1: Preserve all mathematical content with proper formatting', () => {
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const allFormulas = allSections.flatMap(s => s.formulas);
      
      // Check that formulas are preserved
      expect(allFormulas.length).toBeGreaterThan(0);
      
      // Check that worked examples have complete solution steps
      const allExamples = allSections.flatMap(s => s.examples);
      expect(allExamples.length).toBeGreaterThan(0);
      
      allExamples.forEach(example => {
        expect(example.solution).toBeDefined();
        expect(example.solution.length).toBeGreaterThan(0);
      });
    });

    it('should satisfy Requirement 6.4: Remove all Card/Box UI components', async () => {
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, layoutConfig);

      // Check that no card/box styling is present
      expect(htmlOutput.html).not.toContain('card');
      expect(htmlOutput.html).not.toContain('box-shadow');
      expect(htmlOutput.css).not.toContain('border-radius');
      expect(htmlOutput.css).not.toContain('box-shadow');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed mathematical content gracefully', async () => {
      const malformedContent = `
      # Test Content
      This has malformed LaTeX: $\\invalid{formula
      And incomplete examples without solutions.
      `;

      const files = [{
        file: createMockFile('malformed.pdf', malformedContent),
        type: 'general' as const
      }];

      // Should not throw, but handle errors gracefully
      const result = await processCompactStudyDocuments(files, {
        ...pipelineConfig,
        enableErrorRecovery: true
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it('should provide meaningful error messages for processing failures', async () => {
      const emptyFiles: any[] = [];

      try {
        await processCompactStudyDocuments(emptyFiles, pipelineConfig);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('files');
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should process multiple documents efficiently', async () => {
      const startTime = Date.now();
      
      const files = [
        {
          file: createMockFile('discrete-probability.pdf', mockDiscreteProbabilityContent),
          type: 'probability' as const
        },
        {
          file: createMockFile('relations.pdf', mockRelationsContent),
          type: 'relations' as const
        }
      ];

      const result = await processCompactStudyDocuments(files, pipelineConfig);
      
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should generate compact output with reduced page count', async () => {
      const files = [{
        file: createMockFile('discrete-probability.pdf', mockDiscreteProbabilityContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      // Generate both compact and standard layouts for comparison
      const compactLayout: CompactLayoutConfig = { ...layoutConfig, columns: 2 };
      const standardLayout: CompactLayoutConfig = { 
        ...layoutConfig, 
        columns: 1,
        spacing: {
          paragraphSpacing: 0.75,
          listSpacing: 0.5,
          sectionSpacing: 1.0,
          headingMargins: { top: 1.0, bottom: 0.75 }
        }
      };

      const compactHTML = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayout);

      const standardHTML = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: false,
        removeCardComponents: false,
        generateResponsive: true
      }, standardLayout);

      // Compact version should have higher content density
      expect(compactHTML.metadata.stats.estimatedPrintPages)
        .toBeLessThanOrEqual(standardHTML.metadata.stats.estimatedPrintPages);
    });
  });
});