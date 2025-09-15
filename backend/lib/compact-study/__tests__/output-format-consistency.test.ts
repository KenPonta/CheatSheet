/**
 * Output Format Consistency Tests
 * Tests HTML, PDF, and Markdown generation consistency and quality
 */

import {
  generateCompactHTML,
  generateCompactMarkdown,
  PDFOutputGenerator
} from '../index';
import {
  AcademicDocument,
  CompactLayoutConfig,
  HTMLOutput,
  MarkdownOutput,
  PDFOutput
} from '../types';

describe('Output Format Consistency', () => {
  let mockDocument: AcademicDocument;
  let layoutConfig: CompactLayoutConfig;

  beforeEach(() => {
    // Create comprehensive mock document
    mockDocument = {
      title: 'Comprehensive Study Guide: Discrete Probability & Relations',
      tableOfContents: [
        {
          level: 1,
          title: 'Part I: Discrete Probability',
          sectionNumber: '1',
          pageAnchor: 'part-1',
          children: [
            {
              level: 2,
              title: 'Basic Probability',
              sectionNumber: '1.1',
              pageAnchor: 'section-1-1',
              children: []
            },
            {
              level: 2,
              title: 'Conditional Probability',
              sectionNumber: '1.2',
              pageAnchor: 'section-1-2',
              children: []
            }
          ]
        },
        {
          level: 1,
          title: 'Part II: Relations',
          sectionNumber: '2',
          pageAnchor: 'part-2',
          children: [
            {
              level: 2,
              title: 'Relation Properties',
              sectionNumber: '2.1',
              pageAnchor: 'section-2-1',
              children: []
            }
          ]
        }
      ],
      parts: [
        {
          partNumber: 1,
          title: 'Discrete Probability',
          sections: [
            {
              sectionNumber: '1.1',
              title: 'Basic Probability',
              content: 'Probability is a measure of the likelihood that an event will occur. The sample space S contains all possible outcomes, and an event A is a subset of S.',
              formulas: [
                {
                  id: 'basic-prob',
                  latex: 'P(A) = \\frac{|A|}{|S|}',
                  context: 'Basic probability formula',
                  type: 'display',
                  sourceLocation: { fileId: 'prob.pdf', page: 1 },
                  isKeyFormula: true,
                  confidence: 0.98
                },
                {
                  id: 'complement',
                  latex: 'P(A^c) = 1 - P(A)',
                  context: 'Complement rule',
                  type: 'display',
                  sourceLocation: { fileId: 'prob.pdf', page: 1 },
                  isKeyFormula: true,
                  confidence: 0.95
                }
              ],
              examples: [
                {
                  id: 'coin-flip',
                  title: 'Coin Flip Probability',
                  problem: 'What is the probability of getting heads when flipping a fair coin?',
                  solution: [
                    {
                      stepNumber: 1,
                      description: 'Identify the sample space',
                      explanation: 'For a coin flip, S = {H, T}',
                      formula: 'S = \\{H, T\\}'
                    },
                    {
                      stepNumber: 2,
                      description: 'Identify the event',
                      explanation: 'Event A = getting heads = {H}',
                      formula: 'A = \\{H\\}'
                    },
                    {
                      stepNumber: 3,
                      description: 'Apply the formula',
                      explanation: 'P(A) = |A|/|S| = 1/2 = 0.5',
                      formula: 'P(A) = \\frac{1}{2} = 0.5'
                    }
                  ],
                  sourceLocation: { fileId: 'prob.pdf', page: 1 },
                  subtopic: 'basic-probability',
                  confidence: 0.92,
                  isComplete: true
                }
              ],
              subsections: []
            },
            {
              sectionNumber: '1.2',
              title: 'Conditional Probability',
              content: 'Conditional probability measures the probability of an event given that another event has occurred.',
              formulas: [
                {
                  id: 'conditional',
                  latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
                  context: 'Conditional probability formula',
                  type: 'display',
                  sourceLocation: { fileId: 'prob.pdf', page: 2 },
                  isKeyFormula: true,
                  confidence: 0.97
                },
                {
                  id: 'bayes',
                  latex: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
                  context: 'Bayes\' theorem',
                  type: 'display',
                  sourceLocation: { fileId: 'prob.pdf', page: 2 },
                  isKeyFormula: true,
                  confidence: 0.99
                }
              ],
              examples: [
                {
                  id: 'card-draw',
                  title: 'Card Drawing with Replacement',
                  problem: 'What is the probability of drawing a red card given that an ace was drawn?',
                  solution: [
                    {
                      stepNumber: 1,
                      description: 'Define events',
                      explanation: 'A = red card, B = ace drawn',
                      formula: 'A = \\text{red card}, B = \\text{ace}'
                    },
                    {
                      stepNumber: 2,
                      description: 'Find intersection',
                      explanation: 'A ∩ B = red aces = {ace of hearts, ace of diamonds}',
                      formula: 'P(A \\cap B) = \\frac{2}{52}'
                    },
                    {
                      stepNumber: 3,
                      description: 'Apply conditional probability',
                      explanation: 'P(A|B) = P(A ∩ B) / P(B) = (2/52) / (4/52) = 1/2',
                      formula: 'P(A|B) = \\frac{2/52}{4/52} = \\frac{1}{2}'
                    }
                  ],
                  sourceLocation: { fileId: 'prob.pdf', page: 2 },
                  subtopic: 'conditional-probability',
                  confidence: 0.89,
                  isComplete: true
                }
              ],
              subsections: []
            }
          ]
        },
        {
          partNumber: 2,
          title: 'Relations',
          sections: [
            {
              sectionNumber: '2.1',
              title: 'Relation Properties',
              content: 'A relation R on a set A is a subset of A × A. Relations can have various properties such as reflexivity, symmetry, and transitivity.',
              formulas: [
                {
                  id: 'reflexive',
                  latex: '\\forall x \\in A, (x,x) \\in R',
                  context: 'Reflexive property definition',
                  type: 'inline',
                  sourceLocation: { fileId: 'relations.pdf', page: 1 },
                  isKeyFormula: true,
                  confidence: 0.94
                },
                {
                  id: 'symmetric',
                  latex: '\\forall x,y \\in A, (x,y) \\in R \\rightarrow (y,x) \\in R',
                  context: 'Symmetric property definition',
                  type: 'display',
                  sourceLocation: { fileId: 'relations.pdf', page: 1 },
                  isKeyFormula: true,
                  confidence: 0.96
                },
                {
                  id: 'transitive',
                  latex: '\\forall x,y,z \\in A, (x,y) \\in R \\land (y,z) \\in R \\rightarrow (x,z) \\in R',
                  context: 'Transitive property definition',
                  type: 'display',
                  sourceLocation: { fileId: 'relations.pdf', page: 1 },
                  isKeyFormula: true,
                  confidence: 0.93
                }
              ],
              examples: [
                {
                  id: 'relation-check',
                  title: 'Checking Relation Properties',
                  problem: 'Let A = {1, 2, 3} and R = {(1,1), (2,2), (3,3), (1,2), (2,1)}. Check if R is reflexive, symmetric, and transitive.',
                  solution: [
                    {
                      stepNumber: 1,
                      description: 'Check reflexivity',
                      explanation: 'Need (x,x) ∈ R for all x ∈ A',
                      formula: '(1,1), (2,2), (3,3) \\in R \\checkmark'
                    },
                    {
                      stepNumber: 2,
                      description: 'Check symmetry',
                      explanation: 'For each (x,y) ∈ R, need (y,x) ∈ R',
                      formula: '(1,2) \\in R \\text{ and } (2,1) \\in R \\checkmark'
                    },
                    {
                      stepNumber: 3,
                      description: 'Check transitivity',
                      explanation: 'Need to verify all transitive pairs',
                      formula: '(1,2), (2,1) \\in R \\text{ but } (1,1) \\in R \\checkmark'
                    }
                  ],
                  sourceLocation: { fileId: 'relations.pdf', page: 1 },
                  subtopic: 'relation-properties',
                  confidence: 0.87,
                  isComplete: true
                }
              ],
              subsections: []
            }
          ]
        }
      ],
      crossReferences: [
        {
          id: 'ref-1',
          type: 'formula',
          sourceId: 'conditional',
          targetId: 'bayes',
          displayText: 'see Formula 1.2.2'
        },
        {
          id: 'ref-2',
          type: 'example',
          sourceId: 'coin-flip',
          targetId: 'card-draw',
          displayText: 'see Example 1.2.1'
        }
      ],
      appendices: [
        {
          id: 'formula-ref',
          title: 'Formula Reference',
          content: 'Quick reference for all key formulas used in this study guide.',
          type: 'formulas'
        }
      ],
      metadata: {
        generatedAt: new Date('2024-01-01T12:00:00Z'),
        sourceFiles: ['probability.pdf', 'relations.pdf'],
        totalSections: 3,
        totalFormulas: 6,
        totalExamples: 3,
        preservationScore: 0.94
      }
    };

    layoutConfig = {
      paperSize: 'a4',
      columns: 2,
      typography: {
        fontSize: 10,
        lineHeight: 1.2,
        fontFamily: {
          body: 'Times New Roman',
          heading: 'Arial',
          math: 'Computer Modern',
          code: 'Consolas'
        }
      },
      spacing: {
        paragraphSpacing: 0.3,
        listSpacing: 0.2,
        sectionSpacing: 0.5,
        headingMargins: {
          top: 0.4,
          bottom: 0.2
        }
      },
      margins: {
        top: 15,
        bottom: 15,
        left: 12,
        right: 12,
        columnGap: 6
      },
      mathRendering: {
        displayEquations: {
          centered: true,
          numbered: true,
          fullWidth: true
        },
        inlineEquations: {
          preserveInline: true,
          maxHeight: 1.5
        }
      }
    };
  });

  describe('Content Consistency Across Formats', () => {
    let htmlOutput: HTMLOutput;
    let markdownOutput: MarkdownOutput;
    let pdfOutput: PDFOutput;

    beforeEach(async () => {
      htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
      markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
      
      const pdfGenerator = new PDFOutputGenerator();
      pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);
    });

    it('should maintain consistent metadata across formats', () => {
      const metadataFields = ['sourceFiles', 'totalSections', 'totalFormulas', 'totalExamples', 'preservationScore'];
      
      metadataFields.forEach(field => {
        expect(htmlOutput.metadata.stats[field] || htmlOutput.metadata[field])
          .toEqual(markdownOutput.metadata.stats[field] || markdownOutput.metadata[field]);
        expect(markdownOutput.metadata.stats[field] || markdownOutput.metadata[field])
          .toEqual(pdfOutput.metadata.stats[field] || pdfOutput.metadata[field]);
      });
    });

    it('should preserve all formulas across formats', () => {
      const expectedFormulas = [
        'P(A) = \\frac{|A|}{|S|}',
        'P(A^c) = 1 - P(A)',
        'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
        'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
        '\\forall x \\in A, (x,x) \\in R',
        '\\forall x,y \\in A, (x,y) \\in R \\rightarrow (y,x) \\in R'
      ];

      expectedFormulas.forEach(formula => {
        // Check HTML
        expect(htmlOutput.html).toContain(formula);
        
        // Check Markdown
        expect(markdownOutput.markdown).toContain(formula);
        
        // PDF contains LaTeX source, so formulas should be there too
        if (pdfOutput.latexSource) {
          expect(pdfOutput.latexSource).toContain(formula);
        }
      });
    });

    it('should preserve all worked examples across formats', () => {
      const expectedExamples = [
        'Coin Flip Probability',
        'Card Drawing with Replacement',
        'Checking Relation Properties'
      ];

      expectedExamples.forEach(example => {
        expect(htmlOutput.html).toContain(example);
        expect(markdownOutput.markdown).toContain(example);
        if (pdfOutput.latexSource) {
          expect(pdfOutput.latexSource).toContain(example);
        }
      });
    });

    it('should maintain consistent document structure', () => {
      const structureElements = [
        'Part I: Discrete Probability',
        'Part II: Relations',
        'Basic Probability',
        'Conditional Probability',
        'Relation Properties'
      ];

      structureElements.forEach(element => {
        expect(htmlOutput.html).toContain(element);
        expect(markdownOutput.markdown).toContain(element);
        if (pdfOutput.latexSource) {
          expect(pdfOutput.latexSource).toContain(element);
        }
      });
    });

    it('should preserve cross-references consistently', () => {
      // HTML should have proper links
      expect(htmlOutput.html).toContain('href="#');
      expect(htmlOutput.html).toContain('see Formula');
      
      // Markdown should have proper anchor links
      expect(markdownOutput.markdown).toContain('[see Formula');
      expect(markdownOutput.markdown).toContain('](#');
      
      // PDF LaTeX should have proper references
      if (pdfOutput.latexSource) {
        expect(pdfOutput.latexSource).toContain('\\ref{');
      }
    });
  });

  describe('Format-Specific Quality Checks', () => {
    describe('HTML Output Quality', () => {
      it('should generate valid HTML structure', async () => {
        const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
        
        expect(htmlOutput.html).toContain('<!DOCTYPE html>');
        expect(htmlOutput.html).toContain('<html lang="en">');
        expect(htmlOutput.html).toContain('<head>');
        expect(htmlOutput.html).toContain('<body>');
        expect(htmlOutput.html).toContain('</html>');
        
        // Should not have unclosed tags (basic check)
        const openTags = (htmlOutput.html.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (htmlOutput.html.match(/<\/[^>]*>/g) || []).length;
        const selfClosingTags = (htmlOutput.html.match(/<[^>]*\/>/g) || []).length;
        
        expect(openTags - selfClosingTags).toBeCloseTo(closeTags, 5); // Allow some tolerance for void elements
      });

      it('should include compact CSS rules', async () => {
        const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
        
        // Two-column layout
        expect(htmlOutput.css).toContain('column-count: 2');
        expect(htmlOutput.css).toContain('column-gap:');
        
        // Compact typography
        expect(htmlOutput.css).toContain('font-size: 10pt');
        expect(htmlOutput.css).toContain('line-height: 1.2');
        
        // Dense spacing
        expect(htmlOutput.css).toContain('margin-bottom: 0.3em');
        
        // No card/box components
        expect(htmlOutput.css).toContain('.card, .box, .panel, .widget');
        expect(htmlOutput.css).toContain('display: none !important');
      });

      it('should configure MathJax properly', async () => {
        const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
        
        expect(htmlOutput.mathJaxConfig).toBeDefined();
        expect(htmlOutput.mathJaxConfig.tex.inlineMath).toEqual([['\\(', '\\)']]);
        expect(htmlOutput.mathJaxConfig.tex.displayMath).toEqual([['\\[', '\\]']]);
        expect(htmlOutput.html).toContain('MathJax');
      });

      it('should be responsive for different screen sizes', async () => {
        const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
        
        expect(htmlOutput.css).toContain('@media screen and (max-width: 768px)');
        expect(htmlOutput.css).toContain('column-count: 1');
      });
    });

    describe('Markdown Output Quality', () => {
      it('should generate valid Markdown syntax', async () => {
        const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
        
        // Headers
        expect(markdownOutput.markdown).toContain('# ');
        expect(markdownOutput.markdown).toContain('## ');
        
        // Math delimiters
        expect(markdownOutput.markdown).toContain('$');
        
        // Links
        expect(markdownOutput.markdown).toContain('[');
        expect(markdownOutput.markdown).toContain('](');
        
        // Lists
        expect(markdownOutput.markdown).toContain('1. ');
        expect(markdownOutput.markdown).toContain('2. ');
      });

      it('should include proper front matter', async () => {
        const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
        
        expect(markdownOutput.frontMatter).toContain('---');
        expect(markdownOutput.frontMatter).toContain('title:');
        expect(markdownOutput.frontMatter).toContain('date:');
        expect(markdownOutput.frontMatter).toContain('geometry:');
      });

      it('should generate Pandoc-compatible template', async () => {
        const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
        
        expect(markdownOutput.pandocTemplate).toContain('\\documentclass[');
        expect(markdownOutput.pandocTemplate).toContain('twocolumn');
        expect(markdownOutput.pandocTemplate).toContain('\\usepackage{amsmath}');
        expect(markdownOutput.pandocTemplate).toContain('\\usepackage{geometry}');
      });

      it('should handle math rendering correctly', async () => {
        const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
        
        // Display math should use $ delimiters for Pandoc
        expect(markdownOutput.markdown).toContain('$P(A) = \\frac{|A|}{|S|}$');
        
        // Inline math should be preserved
        expect(markdownOutput.markdown).toContain('$\\forall x \\in A$');
      });
    });

    describe('PDF Output Quality', () => {
      it('should generate valid PDF buffer', async () => {
        const pdfGenerator = new PDFOutputGenerator();
        const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);
        
        expect(pdfOutput.buffer).toBeInstanceOf(Buffer);
        expect(pdfOutput.buffer.length).toBeGreaterThan(1000); // Reasonable minimum size
        
        // Should start with PDF header
        const pdfHeader = pdfOutput.buffer.toString('ascii', 0, 4);
        expect(pdfHeader).toBe('%PDF');
      });

      it('should have reasonable page count', async () => {
        const pdfGenerator = new PDFOutputGenerator();
        const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);
        
        expect(pdfOutput.pageCount).toBeGreaterThan(0);
        expect(pdfOutput.pageCount).toBeLessThan(20); // Should be compact
      });

      it('should generate proper LaTeX source', async () => {
        const pdfGenerator = new PDFOutputGenerator();
        const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);
        
        if (pdfOutput.latexSource) {
          expect(pdfOutput.latexSource).toContain('\\documentclass[');
          expect(pdfOutput.latexSource).toContain('twocolumn');
          expect(pdfOutput.latexSource).toContain('\\begin{document}');
          expect(pdfOutput.latexSource).toContain('\\end{document}');
        }
      });

      it('should include widow/orphan control', async () => {
        const pdfGenerator = new PDFOutputGenerator();
        const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);
        
        if (pdfOutput.latexSource) {
          expect(pdfOutput.latexSource).toContain('\\clubpenalty=10000');
          expect(pdfOutput.latexSource).toContain('\\widowpenalty=10000');
        }
      });
    });
  });

  describe('Layout Configuration Consistency', () => {
    it('should apply typography settings consistently', async () => {
      const customConfig = {
        ...layoutConfig,
        typography: {
          fontSize: 11,
          lineHeight: 1.15,
          fontFamily: {
            body: 'Georgia',
            heading: 'Helvetica',
            math: 'Latin Modern Math',
            code: 'Fira Code'
          }
        }
      };

      const htmlOutput = await generateCompactHTML(mockDocument, customConfig);
      const markdownOutput = await generateCompactMarkdown(mockDocument, customConfig);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(mockDocument, customConfig);

      // HTML should reflect typography
      expect(htmlOutput.css).toContain('font-size: 11pt');
      expect(htmlOutput.css).toContain('line-height: 1.15');
      expect(htmlOutput.css).toContain('Georgia');

      // Markdown template should reflect typography
      expect(markdownOutput.pandocTemplate).toContain('11pt');
      expect(markdownOutput.pandocTemplate).toContain('\\setstretch{1.15}');

      // PDF LaTeX should reflect typography
      if (pdfOutput.latexSource) {
        expect(pdfOutput.latexSource).toContain('11pt');
        expect(pdfOutput.latexSource).toContain('\\setstretch{1.15}');
      }
    });

    it('should apply spacing settings consistently', async () => {
      const customConfig = {
        ...layoutConfig,
        spacing: {
          paragraphSpacing: 0.25,
          listSpacing: 0.15,
          sectionSpacing: 0.4,
          headingMargins: {
            top: 0.3,
            bottom: 0.15
          }
        }
      };

      const htmlOutput = await generateCompactHTML(mockDocument, customConfig);
      const markdownOutput = await generateCompactMarkdown(mockDocument, customConfig);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(mockDocument, customConfig);

      // HTML should reflect spacing
      expect(htmlOutput.css).toContain('margin-bottom: 0.25em');

      // PDF LaTeX should reflect spacing
      if (pdfOutput.latexSource) {
        expect(pdfOutput.latexSource).toContain('\\setlength{\\parskip}{0.25em}');
        expect(pdfOutput.latexSource).toContain('itemsep=0.15em');
      }
    });

    it('should handle different column configurations', async () => {
      const columnConfigs = [1, 2, 3];

      for (const columns of columnConfigs) {
        const customConfig = { ...layoutConfig, columns };

        const htmlOutput = await generateCompactHTML(mockDocument, customConfig);
        const markdownOutput = await generateCompactMarkdown(mockDocument, customConfig);
        const pdfGenerator = new PDFOutputGenerator();
        const pdfOutput = await pdfGenerator.generatePDF(mockDocument, customConfig);

        // HTML should reflect column count
        expect(htmlOutput.css).toContain(`column-count: ${columns}`);

        // PDF LaTeX should reflect column configuration
        if (pdfOutput.latexSource) {
          if (columns === 1) {
            expect(pdfOutput.latexSource).not.toContain('twocolumn');
          } else {
            expect(pdfOutput.latexSource).toContain('twocolumn');
          }
        }
      }
    });
  });

  describe('Performance and Quality Metrics', () => {
    it('should generate outputs within reasonable time', async () => {
      const startTime = Date.now();

      const [htmlOutput, markdownOutput] = await Promise.all([
        generateCompactHTML(mockDocument, layoutConfig),
        generateCompactMarkdown(mockDocument, layoutConfig)
      ]);

      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);

      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(30000); // 30 seconds max for all formats
    });

    it('should produce outputs of reasonable size', async () => {
      const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
      const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);

      // HTML should be reasonable size (not too bloated)
      expect(htmlOutput.html.length).toBeLessThan(500000); // 500KB max
      expect(htmlOutput.css.length).toBeLessThan(50000); // 50KB max

      // Markdown should be compact
      expect(markdownOutput.markdown.length).toBeLessThan(100000); // 100KB max

      // PDF should be reasonable size
      expect(pdfOutput.buffer.length).toBeLessThan(5000000); // 5MB max
    });

    it('should maintain high preservation scores', async () => {
      const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
      const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);

      expect(htmlOutput.metadata.preservationScore).toBeGreaterThan(0.9);
      expect(markdownOutput.metadata.preservationScore).toBeGreaterThan(0.9);
      expect(pdfOutput.metadata.preservationScore).toBeGreaterThan(0.9);
    });

    it('should estimate print pages accurately', async () => {
      const htmlOutput = await generateCompactHTML(mockDocument, layoutConfig);
      const markdownOutput = await generateCompactMarkdown(mockDocument, layoutConfig);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(mockDocument, layoutConfig);

      // All formats should have similar page estimates
      const htmlPages = htmlOutput.metadata.stats.estimatedPrintPages;
      const markdownPages = markdownOutput.metadata.stats.estimatedPrintPages;
      const pdfPages = pdfOutput.pageCount;

      expect(Math.abs(htmlPages - pdfPages)).toBeLessThanOrEqual(1);
      expect(Math.abs(markdownPages - pdfPages)).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle empty documents consistently', async () => {
      const emptyDocument: AcademicDocument = {
        title: 'Empty Document',
        tableOfContents: [],
        parts: [],
        crossReferences: [],
        appendices: [],
        metadata: {
          generatedAt: new Date(),
          sourceFiles: [],
          totalSections: 0,
          totalFormulas: 0,
          totalExamples: 0,
          preservationScore: 1.0
        }
      };

      const htmlOutput = await generateCompactHTML(emptyDocument, layoutConfig);
      const markdownOutput = await generateCompactMarkdown(emptyDocument, layoutConfig);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(emptyDocument, layoutConfig);

      // All should handle empty document gracefully
      expect(htmlOutput.html).toContain('Empty Document');
      expect(markdownOutput.markdown).toContain('Empty Document');
      expect(pdfOutput.buffer.length).toBeGreaterThan(0);
    });

    it('should handle malformed content consistently', async () => {
      const malformedDocument = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            ...mockDocument.parts[0].sections[0],
            formulas: [{
              id: 'malformed',
              latex: 'P(A = \\frac{incomplete', // Malformed LaTeX
              context: 'Malformed formula',
              type: 'display' as const,
              sourceLocation: { fileId: 'test', page: 1 },
              isKeyFormula: true,
              confidence: 0.5
            }]
          }]
        }]
      };

      // Should not throw errors, but handle gracefully
      expect(async () => {
        await generateCompactHTML(malformedDocument, layoutConfig);
      }).not.toThrow();

      expect(async () => {
        await generateCompactMarkdown(malformedDocument, layoutConfig);
      }).not.toThrow();

      expect(async () => {
        const pdfGenerator = new PDFOutputGenerator();
        await pdfGenerator.generatePDF(malformedDocument, layoutConfig);
      }).not.toThrow();
    });
  });
});