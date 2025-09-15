// Tests for HTML Output Generator

import {
  HTMLOutputGenerator,
  createHTMLOutputGenerator,
  generateCompactHTML
} from '../html-output-generator';
import {
  AcademicDocument,
  HTMLGeneratorConfig,
  CompactLayoutConfig,
  DocumentPart,
  AcademicSection,
  Formula,
  WorkedExample,
  TOCEntry
} from '../types';

describe('HTMLOutputGenerator', () => {
  let generator: HTMLOutputGenerator;
  let mockDocument: AcademicDocument;

  beforeEach(() => {
    generator = new HTMLOutputGenerator();
    
    // Create mock academic document
    mockDocument = {
      title: 'Test Study Guide',
      tableOfContents: [
        {
          level: 1,
          title: 'Discrete Probability',
          sectionNumber: '1',
          pageAnchor: 'part-1',
          children: [
            {
              level: 2,
              title: 'Basic Probability',
              sectionNumber: '1.1',
              pageAnchor: 'section-1-1',
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
              content: 'Probability is the measure of likelihood that an event will occur.',
              formulas: [
                {
                  id: 'formula-1',
                  latex: 'P(A) = \\frac{|A|}{|S|}',
                  context: 'Basic probability formula',
                  type: 'display' as const,
                  sourceLocation: {
                    fileId: 'test-file',
                    page: 1,
                    section: '1.1'
                  },
                  isKeyFormula: true,
                  confidence: 0.95
                }
              ],
              examples: [
                {
                  id: 'example-1',
                  title: 'Coin Flip Probability',
                  problem: 'What is the probability of getting heads when flipping a fair coin?',
                  solution: [
                    {
                      stepNumber: 1,
                      description: 'Identify the sample space',
                      explanation: 'S = {H, T}',
                      formula: 'S = \\{H, T\\}'
                    },
                    {
                      stepNumber: 2,
                      description: 'Calculate probability',
                      explanation: 'P(H) = 1/2 = 0.5',
                      formula: 'P(H) = \\frac{1}{2}'
                    }
                  ],
                  sourceLocation: {
                    fileId: 'test-file',
                    page: 1,
                    section: '1.1'
                  },
                  subtopic: 'basic-probability',
                  confidence: 0.9,
                  isComplete: true
                }
              ],
              subsections: []
            }
          ]
        }
      ],
      crossReferences: [],
      appendices: [],
      metadata: {
        generatedAt: new Date('2024-01-01'),
        sourceFiles: ['test.pdf'],
        totalSections: 1,
        totalFormulas: 1,
        totalExamples: 1,
        preservationScore: 0.95
      }
    };
  });

  describe('generateHTML', () => {
    it('should generate complete HTML document', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html lang="en">');
      expect(result.html).toContain('Test Study Guide');
      expect(result.css).toContain('column-count: 2');
      expect(result.mathJaxConfig).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should include table of contents when enabled', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.html).toContain('table-of-contents');
      expect(result.html).toContain('Discrete Probability');
      expect(result.html).toContain('Basic Probability');
    });

    it('should include MathJax configuration', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.html).toContain('MathJax');
      expect(result.mathJaxConfig.tex.inlineMath).toEqual([['\\(', '\\)']]);
      expect(result.mathJaxConfig.tex.displayMath).toEqual([['\\[', '\\]']]);
    });

    it('should render formulas correctly', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.html).toContain('\\[P(A) = \\frac{|A|}{|S|}\\]');
      expect(result.html).toContain('formula-display');
    });

    it('should render worked examples', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.html).toContain('Coin Flip Probability');
      expect(result.html).toContain('What is the probability of getting heads');
      expect(result.html).toContain('solution-step');
      expect(result.html).toContain('\\[S = \\{H, T\\}\\]');
    });

    it('should not include card/box components', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.css).toContain('.card, .box, .panel, .widget {');
      expect(result.css).toContain('display: none !important;');
    });
  });

  describe('generateCompactCSS', () => {
    it('should generate two-column layout CSS', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.css).toContain('column-count: 2');
      expect(result.css).toContain('column-gap:');
      expect(result.css).toContain('column-fill: balance');
    });

    it('should include compact typography settings', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.css).toContain('font-size: 10pt');
      expect(result.css).toContain('line-height: 1.2');
    });

    it('should include dense spacing rules', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.css).toContain('margin-bottom: 0.3em'); // paragraph spacing
    });

    it('should include print styles', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.css).toContain('@media print');
      expect(result.css).toContain('break-inside: avoid');
    });

    it('should include responsive design', () => {
      const result = generator.generateHTML(mockDocument);

      expect(result.css).toContain('@media screen and (max-width: 768px)');
      expect(result.css).toContain('column-count: 1');
    });
  });

  describe('configuration options', () => {
    it('should respect custom HTML generator config', () => {
      const config: HTMLGeneratorConfig = {
        includeTableOfContents: false,
        includeMathJax: false,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: false
      };

      const customGenerator = new HTMLOutputGenerator(config);
      const result = customGenerator.generateHTML(mockDocument);

      expect(result.html).not.toContain('<nav class="table-of-contents">');
      expect(result.html).not.toContain('MathJax-script');
    });

    it('should respect custom layout config', () => {
      const layoutConfig: CompactLayoutConfig = {
        paperSize: 'letter',
        columns: 3,
        typography: {
          fontSize: 11,
          lineHeight: 1.15,
          fontFamily: {
            body: 'Arial, sans-serif',
            heading: 'Georgia, serif',
            math: 'Computer Modern',
            code: 'Monaco, monospace'
          }
        },
        spacing: {
          paragraphSpacing: 0.25,
          listSpacing: 0.15,
          sectionSpacing: 0.6,
          headingMargins: {
            top: 0.3,
            bottom: 0.2
          }
        },
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
          columnGap: 8
        },
        mathRendering: {
          displayEquations: {
            centered: true,
            numbered: false,
            fullWidth: false
          },
          inlineEquations: {
            preserveInline: true,
            maxHeight: 2
          }
        }
      };

      const customGenerator = new HTMLOutputGenerator(undefined, layoutConfig);
      const result = customGenerator.generateHTML(mockDocument);

      expect(result.css).toContain('column-count: 3');
      expect(result.css).toContain('font-size: 11pt');
      expect(result.css).toContain('Arial, sans-serif');
    });
  });

  describe('utility functions', () => {
    it('should create generator with default config', () => {
      const generator = createHTMLOutputGenerator();
      expect(generator).toBeInstanceOf(HTMLOutputGenerator);
    });

    it('should generate HTML with utility function', () => {
      const result = generateCompactHTML(mockDocument);
      
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.css).toContain('column-count: 2');
      expect(result.mathJaxConfig).toBeDefined();
    });
  });

  describe('content processing', () => {
    it('should escape HTML characters in content', () => {
      const documentWithHtml = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            ...mockDocument.parts[0].sections[0],
            content: 'This contains <script>alert("xss")</script> and & symbols'
          }]
        }]
      };

      const result = generator.generateHTML(documentWithHtml);
      
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('&amp;');
      expect(result.html).not.toContain('<script>alert');
    });

    it('should preserve math delimiters in content', () => {
      const documentWithMath = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            ...mockDocument.parts[0].sections[0],
            content: 'The formula \\(x = 2\\) is inline and \\[y = 3\\] is display.'
          }]
        }]
      };

      const result = generator.generateHTML(documentWithMath);
      
      expect(result.html).toContain('\\(x = 2\\)');
      expect(result.html).toContain('\\[y = 3\\]');
    });

    it('should handle empty or missing content gracefully', () => {
      const emptyDocument = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            ...mockDocument.parts[0].sections[0],
            content: '',
            formulas: [],
            examples: []
          }]
        }]
      };

      const result = generator.generateHTML(emptyDocument);
      
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).not.toContain('<div class="formulas-section">');
      expect(result.html).not.toContain('<div class="examples-section">');
    });
  });

  describe('metadata generation', () => {
    it('should generate accurate metadata', () => {
      const result = generator.generateHTML(mockDocument);
      
      expect(result.metadata.format).toBe('html');
      expect(result.metadata.sourceFiles).toEqual(['test.pdf']);
      expect(result.metadata.stats.totalSections).toBe(1);
      expect(result.metadata.stats.totalFormulas).toBe(1);
      expect(result.metadata.stats.totalExamples).toBe(1);
      expect(result.metadata.stats.estimatedPrintPages).toBeGreaterThan(0);
      expect(result.metadata.preservationScore).toBe(0.95);
    });
  });
});