import {
  MarkdownOutputGenerator,
  createMarkdownOutputGenerator,
  generateCompactMarkdown
} from '../markdown-output-generator';
import {
  AcademicDocument,
  MarkdownGeneratorConfig,
  CompactLayoutConfig,
  PandocConfig,
  DocumentPart,
  AcademicSection,
  Formula,
  WorkedExample,
  TOCEntry
} from '../types';

describe('MarkdownOutputGenerator', () => {
  let generator: MarkdownOutputGenerator;
  let mockDocument: AcademicDocument;

  beforeEach(() => {
    generator = new MarkdownOutputGenerator();
    
    mockDocument = {
      title: 'Compact Study Guide',
      tableOfContents: [
        {
          level: 1,
          title: 'Part I: Discrete Probability',
          sectionNumber: '1',
          pageAnchor: 'part-1',
          children: [
            {
              level: 2,
              title: 'Probability Basics',
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
              title: 'Probability Basics',
              content: 'Probability is a measure of the likelihood of an event occurring.',
              formulas: [
                {
                  id: 'prob-basic',
                  latex: 'P(A) = \\frac{|A|}{|S|}',
                  context: 'Basic probability formula',
                  type: 'display' as const,
                  sourceLocation: {
                    fileId: 'test-file',
                    page: 1
                  },
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
                      explanation: 'S = {H, T}',
                      formula: 'S = \\{H, T\\}'
                    },
                    {
                      stepNumber: 2,
                      description: 'Calculate probability',
                      explanation: 'Since the coin is fair, P(H) = 1/2',
                      formula: 'P(H) = \\frac{1}{2}'
                    }
                  ],
                  sourceLocation: {
                    fileId: 'test-file',
                    page: 1
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

  describe('generateMarkdown', () => {
    it('should generate complete markdown document', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toBeDefined();
      expect(result.pandocTemplate).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.frontMatter).toBeDefined();
    });

    it('should include front matter when configured', () => {
      const config: MarkdownGeneratorConfig = {
        includeFrontMatter: true,
        includeTableOfContents: true,
        mathDelimiters: 'pandoc',
        codeBlocks: true,
        preserveLineBreaks: false,
        pandocCompatible: true,
        generateTemplate: true
      };

      const customGenerator = new MarkdownOutputGenerator(config);
      const result = customGenerator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('---');
      expect(result.markdown).toContain('title: Compact Study Guide');
      expect(result.frontMatter).toContain('title: Compact Study Guide');
    });

    it('should exclude front matter when configured', () => {
      const config: MarkdownGeneratorConfig = {
        includeFrontMatter: false,
        includeTableOfContents: true,
        mathDelimiters: 'pandoc',
        codeBlocks: true,
        preserveLineBreaks: false,
        pandocCompatible: true,
        generateTemplate: true
      };

      const customGenerator = new MarkdownOutputGenerator(config);
      const result = customGenerator.generateMarkdown(mockDocument);

      expect(result.markdown).not.toContain('---');
      expect(result.markdown).toContain('# Compact Study Guide');
    });

    it('should include table of contents when configured', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('# Contents');
      expect(result.markdown).toContain('[1 Part I: Discrete Probability](#part-1)');
      expect(result.markdown).toContain('[1.1 Probability Basics](#section-1-1)');
    });

    it('should generate proper document structure', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('# Part I: Discrete Probability {#part-1}');
      expect(result.markdown).toContain('## 1.1 Probability Basics {#section-1-1}');
    });
  });

  describe('formula generation', () => {
    it('should generate display formulas with pandoc delimiters', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('$$P(A) = \\frac{|A|}{|S|}$$ {#formula-prob-basic}');
      expect(result.markdown).toContain('*Basic probability formula*');
    });

    it('should generate formulas with latex delimiters when configured', () => {
      const config: MarkdownGeneratorConfig = {
        includeFrontMatter: true,
        includeTableOfContents: true,
        mathDelimiters: 'latex',
        codeBlocks: true,
        preserveLineBreaks: false,
        pandocCompatible: true,
        generateTemplate: true
      };

      const customGenerator = new MarkdownOutputGenerator(config);
      const result = customGenerator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('\\[P(A) = \\frac{|A|}{|S|}\\] {#formula-prob-basic}');
    });

    it('should generate formulas with github delimiters when configured', () => {
      const config: MarkdownGeneratorConfig = {
        includeFrontMatter: true,
        includeTableOfContents: true,
        mathDelimiters: 'github',
        codeBlocks: true,
        preserveLineBreaks: false,
        pandocCompatible: true,
        generateTemplate: true
      };

      const customGenerator = new MarkdownOutputGenerator(config);
      const result = customGenerator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('```math\nP(A) = \\frac{|A|}{|S|}\n```');
    });
  });

  describe('worked examples generation', () => {
    it('should generate complete worked examples', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('**Example: Coin Flip Probability** {#example-coin-flip}');
      expect(result.markdown).toContain('**Problem:** What is the probability of getting heads when flipping a fair coin?');
      expect(result.markdown).toContain('**Solution:**');
      expect(result.markdown).toContain('1. Identify the sample space');
      expect(result.markdown).toContain('2. Calculate probability');
    });

    it('should include solution steps with formulas', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('$$S = \\{H, T\\}$$');
      expect(result.markdown).toContain('$$P(H) = \\frac{1}{2}$$');
    });

    it('should include step explanations', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('S = {H, T}');
      expect(result.markdown).toContain('Since the coin is fair, P(H) = 1/2');
    });
  });

  describe('pandoc template generation', () => {
    it('should generate pandoc template with compact settings', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.pandocTemplate).toContain('\\documentclass[');
      expect(result.pandocTemplate).toContain('twocolumn');
      expect(result.pandocTemplate).toContain('\\usepackage{amsmath}');
      expect(result.pandocTemplate).toContain('\\clubpenalty=10000');
      expect(result.pandocTemplate).toContain('\\widowpenalty=10000');
    });

    it('should include layout configuration in template', () => {
      const layoutConfig: CompactLayoutConfig = {
        paperSize: 'a4',
        columns: 2,
        typography: {
          fontSize: 11,
          lineHeight: 1.3,
          fontFamily: {
            body: 'Times',
            heading: 'Arial',
            math: 'Computer Modern',
            code: 'Consolas'
          }
        },
        spacing: {
          paragraphSpacing: 0.4,
          listSpacing: 0.25,
          sectionSpacing: 1.0,
          headingMargins: {
            top: 0.5,
            bottom: 0.4
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
            numbered: true,
            fullWidth: true
          },
          inlineEquations: {
            preserveInline: true,
            maxHeight: 1.5
          }
        }
      };

      const customGenerator = new MarkdownOutputGenerator(undefined, layoutConfig);
      const result = customGenerator.generateMarkdown(mockDocument);

      expect(result.pandocTemplate).toContain('margin=20mm');
      expect(result.pandocTemplate).toContain('columnsep=8mm');
      expect(result.pandocTemplate).toContain('\\setstretch{1.3}');
      expect(result.pandocTemplate).toContain('\\setlength{\\parskip}{0.4em}');
    });
  });

  describe('metadata generation', () => {
    it('should generate correct metadata', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.sourceFiles).toEqual(['test.pdf']);
      expect(result.metadata.stats.totalSections).toBe(1);
      expect(result.metadata.stats.totalFormulas).toBe(1);
      expect(result.metadata.stats.totalExamples).toBe(1);
      expect(result.metadata.preservationScore).toBe(0.95);
    });

    it('should estimate print pages', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.metadata.stats.estimatedPrintPages).toBeGreaterThan(0);
    });
  });

  describe('content processing', () => {
    it('should preserve markdown formatting in content', () => {
      const testDocument = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            ...mockDocument.parts[0].sections[0],
            content: 'This has *asterisks* and _underscores_ and [brackets] and #hash'
          }]
        }]
      };

      const result = generator.generateMarkdown(testDocument);

      expect(result.markdown).toContain('This has *asterisks* and _underscores_ and [brackets] and #hash');
    });

    it('should convert lists to proper markdown', () => {
      const testDocument = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            ...mockDocument.parts[0].sections[0],
            content: '* Item 1\n* Item 2\n1. Numbered item\n2. Another numbered item'
          }]
        }]
      };

      const result = generator.generateMarkdown(testDocument);

      expect(result.markdown).toContain('- Item 1');
      expect(result.markdown).toContain('- Item 2');
      expect(result.markdown).toContain('1. Numbered item');
      expect(result.markdown).toContain('2. Another numbered item');
    });
  });

  describe('utility functions', () => {
    it('should create generator with default config', () => {
      const defaultGenerator = createMarkdownOutputGenerator();
      expect(defaultGenerator).toBeInstanceOf(MarkdownOutputGenerator);
    });

    it('should generate markdown with convenience function', () => {
      const result = generateCompactMarkdown(mockDocument);
      
      expect(result.markdown).toBeDefined();
      expect(result.pandocTemplate).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should generate proper anchors', () => {
      const result = generator.generateMarkdown(mockDocument);

      expect(result.markdown).toContain('{#part-1}');
      expect(result.markdown).toContain('{#section-1-1}');
      expect(result.markdown).toContain('{#formula-prob-basic}');
      expect(result.markdown).toContain('{#example-coin-flip}');
    });
  });

  describe('appendices handling', () => {
    it('should generate appendices when present', () => {
      const documentWithAppendices = {
        ...mockDocument,
        appendices: [
          {
            id: 'formulas',
            title: 'Formula Reference',
            content: 'All important formulas are listed here.',
            type: 'formulas' as const
          }
        ]
      };

      const result = generator.generateMarkdown(documentWithAppendices);

      expect(result.markdown).toContain('# Appendices');
      expect(result.markdown).toContain('## Formula Reference');
      expect(result.markdown).toContain('All important formulas are listed here.');
    });
  });

  describe('error handling', () => {
    it('should handle empty document gracefully', () => {
      const emptyDocument: AcademicDocument = {
        title: '',
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

      const result = generator.generateMarkdown(emptyDocument);

      expect(result.markdown).toBeDefined();
      expect(result.metadata.stats.totalSections).toBe(0);
    });

    it('should handle missing content gracefully', () => {
      const documentWithMissingContent = {
        ...mockDocument,
        parts: [{
          ...mockDocument.parts[0],
          sections: [{
            sectionNumber: '1.1',
            title: 'Empty Section',
            content: '',
            formulas: [],
            examples: [],
            subsections: []
          }]
        }]
      };

      const result = generator.generateMarkdown(documentWithMissingContent);

      expect(result.markdown).toContain('## 1.1 Empty Section');
      expect(result.markdown).toBeDefined();
    });
  });
});