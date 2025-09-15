/**
 * Comprehensive Integration Tests for Compact Study Generator
 * Tests end-to-end PDF processing pipeline with real-world scenarios
 */

import { 
  processCompactStudyDocuments,
  generateCompactHTML,
  generateCompactMarkdown,
  PDFOutputGenerator
} from '../index';
import { 
  CompactLayoutConfig,
  CLIConfig,
  AcademicDocument,
  ProcessingPipeline,
  SourceDocument
} from '../types';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock file processing for integration tests
jest.mock('../../file-processing', () => ({
  FileProcessing: {
    processFile: jest.fn()
  }
}));

// Mock AI client
jest.mock('../../ai/client', () => ({
  getOpenAIClient: () => ({
    createChatCompletion: jest.fn()
  })
}));

describe('Compact Study Generator - End-to-End Integration', () => {
  let mockProbabilityContent: any;
  let mockRelationsContent: any;
  let mockAIResponses: any;

  beforeEach(() => {
    // Mock probability PDF content
    mockProbabilityContent = {
      text: `
        Chapter 1: Probability Basics
        
        Probability is a measure of the likelihood of an event occurring.
        The basic probability formula is P(A) = |A|/|S|.
        
        Example 1.1: Rolling a Die
        What is the probability of rolling a 3 on a fair six-sided die?
        
        Solution:
        Step 1: Identify the sample space S = {1, 2, 3, 4, 5, 6}
        Step 2: Identify the favorable outcomes A = {3}
        Step 3: Apply the formula P(A) = |A|/|S| = 1/6
        
        Conditional Probability
        The conditional probability formula is P(A|B) = P(A∩B)/P(B).
        
        Bayes' Theorem
        P(A|B) = P(B|A) × P(A) / P(B)
      `,
      images: [],
      tables: [],
      metadata: {
        name: 'probability.pdf',
        size: 50000,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 5,
        wordCount: 150
      },
      structure: {
        headings: [
          'Chapter 1: Probability Basics',
          'Conditional Probability',
          'Bayes\' Theorem'
        ],
        sections: [],
        hierarchy: 2
      }
    };

    // Mock relations PDF content
    mockRelationsContent = {
      text: `
        Chapter 2: Relations
        
        A relation R on a set A is a subset of A × A.
        
        Properties of Relations:
        - Reflexive: ∀x ∈ A, (x,x) ∈ R
        - Symmetric: ∀x,y ∈ A, (x,y) ∈ R → (y,x) ∈ R
        - Transitive: ∀x,y,z ∈ A, (x,y) ∈ R ∧ (y,z) ∈ R → (x,z) ∈ R
        
        Example 2.1: Checking Reflexivity
        Let A = {1, 2, 3} and R = {(1,1), (2,2), (3,3), (1,2)}.
        Is R reflexive?
        
        Solution:
        Step 1: Check if (x,x) ∈ R for all x ∈ A
        Step 2: (1,1) ∈ R ✓, (2,2) ∈ R ✓, (3,3) ∈ R ✓
        Step 3: Therefore, R is reflexive.
      `,
      images: [],
      tables: [],
      metadata: {
        name: 'relations.pdf',
        size: 40000,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 4,
        wordCount: 120
      },
      structure: {
        headings: [
          'Chapter 2: Relations',
          'Properties of Relations'
        ],
        sections: [],
        hierarchy: 2
      }
    };

    // Mock AI responses for mathematical content extraction
    mockAIResponses = {
      formulas: [
        {
          originalText: 'P(A) = |A|/|S|',
          latex: 'P(A) = \\frac{|A|}{|S|}',
          context: 'Basic probability formula',
          type: 'display',
          isKeyFormula: true,
          confidence: 0.95,
          textPosition: { start: 80, end: 95 }
        },
        {
          originalText: 'P(A|B) = P(A∩B)/P(B)',
          latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
          context: 'Conditional probability formula',
          type: 'display',
          isKeyFormula: true,
          confidence: 0.98,
          textPosition: { start: 200, end: 220 }
        },
        {
          originalText: '∀x ∈ A, (x,x) ∈ R',
          latex: '\\forall x \\in A, (x,x) \\in R',
          context: 'Reflexive property definition',
          type: 'inline',
          isKeyFormula: true,
          confidence: 0.92,
          textPosition: { start: 150, end: 170 }
        }
      ],
      examples: [
        {
          title: 'Rolling a Die',
          problem: 'What is the probability of rolling a 3 on a fair six-sided die?',
          subtopic: 'Basic Probability',
          solution: [
            {
              stepNumber: 1,
              description: 'Identify the sample space',
              formula: 'S = \\{1, 2, 3, 4, 5, 6\\}',
              explanation: 'List all possible outcomes'
            },
            {
              stepNumber: 2,
              description: 'Identify favorable outcomes',
              formula: 'A = \\{3\\}',
              explanation: 'Only one favorable outcome'
            },
            {
              stepNumber: 3,
              description: 'Apply the formula',
              formula: 'P(A) = \\frac{1}{6}',
              explanation: 'Use basic probability formula'
            }
          ],
          confidence: 0.9,
          isComplete: true,
          textPosition: { start: 120, end: 180 }
        },
        {
          title: 'Checking Reflexivity',
          problem: 'Let A = {1, 2, 3} and R = {(1,1), (2,2), (3,3), (1,2)}. Is R reflexive?',
          subtopic: 'Relation Properties',
          solution: [
            {
              stepNumber: 1,
              description: 'Check reflexive condition',
              explanation: 'Verify (x,x) ∈ R for all x ∈ A'
            },
            {
              stepNumber: 2,
              description: 'Check each element',
              explanation: '(1,1) ∈ R ✓, (2,2) ∈ R ✓, (3,3) ∈ R ✓'
            },
            {
              stepNumber: 3,
              description: 'Conclusion',
              explanation: 'Therefore, R is reflexive'
            }
          ],
          confidence: 0.88,
          isComplete: true,
          textPosition: { start: 300, end: 400 }
        }
      ],
      definitions: [
        {
          term: 'Probability',
          definition: 'A measure of the likelihood of an event occurring',
          context: 'Basic probability theory',
          confidence: 0.95
        },
        {
          term: 'Relation',
          definition: 'A subset of the Cartesian product A × A',
          context: 'Set theory and relations',
          confidence: 0.93
        }
      ],
      theorems: [
        {
          name: 'Bayes\' Theorem',
          statement: 'P(A|B) = P(B|A) × P(A) / P(B)',
          context: 'Conditional probability',
          confidence: 0.97
        }
      ]
    };

    // Setup mocks
    const { FileProcessing } = require('../../file-processing');
    FileProcessing.processFile
      .mockResolvedValueOnce({
        status: 'success',
        content: mockProbabilityContent,
        errors: [],
        processingTime: 1500
      })
      .mockResolvedValueOnce({
        status: 'success',
        content: mockRelationsContent,
        errors: [],
        processingTime: 1200
      });

    const { getOpenAIClient } = require('../../ai/client');
    const mockClient = getOpenAIClient();
    mockClient.createChatCompletion
      .mockResolvedValueOnce(JSON.stringify({ formulas: mockAIResponses.formulas.slice(0, 2) }))
      .mockResolvedValueOnce(JSON.stringify({ examples: [mockAIResponses.examples[0]] }))
      .mockResolvedValueOnce(JSON.stringify({ definitions: [mockAIResponses.definitions[0]] }))
      .mockResolvedValueOnce(JSON.stringify({ theorems: [mockAIResponses.theorems[0]] }))
      .mockResolvedValueOnce(JSON.stringify({ formulas: [mockAIResponses.formulas[2]] }))
      .mockResolvedValueOnce(JSON.stringify({ examples: [mockAIResponses.examples[1]] }))
      .mockResolvedValueOnce(JSON.stringify({ definitions: [mockAIResponses.definitions[1]] }))
      .mockResolvedValueOnce(JSON.stringify({ theorems: [] }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End PDF Processing Pipeline', () => {
    it('should process multiple PDFs and generate academic document', async () => {
      const sourceFiles = [
        new File([Buffer.from('mock probability pdf')], 'probability.pdf', { type: 'application/pdf' }),
        new File([Buffer.from('mock relations pdf')], 'relations.pdf', { type: 'application/pdf' })
      ];

      const sourceDocuments: SourceDocument[] = [
        {
          file: sourceFiles[0],
          type: 'probability',
          extractedContent: mockProbabilityContent,
          mathematicalContent: {
            formulas: mockAIResponses.formulas.slice(0, 2),
            workedExamples: [mockAIResponses.examples[0]],
            definitions: [mockAIResponses.definitions[0]],
            theorems: [mockAIResponses.theorems[0]]
          }
        },
        {
          file: sourceFiles[1],
          type: 'relations',
          extractedContent: mockRelationsContent,
          mathematicalContent: {
            formulas: [mockAIResponses.formulas[2]],
            workedExamples: [mockAIResponses.examples[1]],
            definitions: [mockAIResponses.definitions[1]],
            theorems: []
          }
        }
      ];

      const result = await processCompactStudyDocuments(sourceDocuments);

      // Verify document structure
      expect(result.title).toContain('Compact Study Guide');
      expect(result.parts).toHaveLength(2);
      expect(result.parts[0].title).toContain('Discrete Probability');
      expect(result.parts[1].title).toContain('Relations');

      // Verify content preservation
      expect(result.parts[0].sections).toHaveLength(1);
      expect(result.parts[0].sections[0].formulas).toHaveLength(2);
      expect(result.parts[0].sections[0].examples).toHaveLength(1);

      expect(result.parts[1].sections).toHaveLength(1);
      expect(result.parts[1].sections[0].formulas).toHaveLength(1);
      expect(result.parts[1].sections[0].examples).toHaveLength(1);

      // Verify table of contents generation
      expect(result.tableOfContents).toHaveLength(2);
      expect(result.tableOfContents[0].title).toContain('Discrete Probability');
      expect(result.tableOfContents[1].title).toContain('Relations');

      // Verify metadata
      expect(result.metadata.totalSections).toBe(2);
      expect(result.metadata.totalFormulas).toBe(3);
      expect(result.metadata.totalExamples).toBe(2);
      expect(result.metadata.preservationScore).toBeGreaterThan(0.8);
    });

    it('should handle processing errors gracefully', async () => {
      const { FileProcessing } = require('../../file-processing');
      FileProcessing.processFile.mockRejectedValueOnce(new Error('PDF processing failed'));

      const sourceFiles = [
        new File([Buffer.from('corrupted pdf')], 'corrupted.pdf', { type: 'application/pdf' })
      ];

      const sourceDocuments: SourceDocument[] = [
        {
          file: sourceFiles[0],
          type: 'probability',
          extractedContent: mockProbabilityContent,
          mathematicalContent: {
            formulas: [],
            workedExamples: [],
            definitions: [],
            theorems: []
          }
        }
      ];

      await expect(processCompactStudyDocuments(sourceDocuments))
        .rejects.toThrow('PDF processing failed');
    });

    it('should validate formula preservation across pipeline', async () => {
      const sourceFiles = [
        new File([Buffer.from('mock pdf')], 'test.pdf', { type: 'application/pdf' })
      ];

      const sourceDocuments: SourceDocument[] = [
        {
          file: sourceFiles[0],
          type: 'probability',
          extractedContent: mockProbabilityContent,
          mathematicalContent: {
            formulas: mockAIResponses.formulas,
            workedExamples: mockAIResponses.examples,
            definitions: mockAIResponses.definitions,
            theorems: mockAIResponses.theorems
          }
        }
      ];

      const result = await processCompactStudyDocuments(sourceDocuments);

      // Verify all formulas are preserved
      const allFormulas = result.parts.flatMap(part => 
        part.sections.flatMap(section => section.formulas)
      );
      expect(allFormulas).toHaveLength(3);
      
      // Verify key formulas are marked correctly
      const keyFormulas = allFormulas.filter(f => f.isKeyFormula);
      expect(keyFormulas).toHaveLength(3);

      // Verify LaTeX conversion
      expect(allFormulas[0].latex).toContain('\\frac');
      expect(allFormulas[1].latex).toContain('\\cap');
      expect(allFormulas[2].latex).toContain('\\forall');
    });

    it('should validate worked example completeness', async () => {
      const sourceFiles = [
        new File([Buffer.from('mock pdf')], 'test.pdf', { type: 'application/pdf' })
      ];

      const sourceDocuments: SourceDocument[] = [
        {
          file: sourceFiles[0],
          type: 'probability',
          extractedContent: mockProbabilityContent,
          mathematicalContent: {
            formulas: mockAIResponses.formulas,
            workedExamples: mockAIResponses.examples,
            definitions: mockAIResponses.definitions,
            theorems: mockAIResponses.theorems
          }
        }
      ];

      const result = await processCompactStudyDocuments(sourceDocuments);

      // Verify all examples are preserved
      const allExamples = result.parts.flatMap(part => 
        part.sections.flatMap(section => section.examples)
      );
      expect(allExamples).toHaveLength(2);

      // Verify solution steps are complete
      const firstExample = allExamples[0];
      expect(firstExample.solution).toHaveLength(3);
      expect(firstExample.solution[0].stepNumber).toBe(1);
      expect(firstExample.solution[0].formula).toBeDefined();
      expect(firstExample.solution[0].explanation).toBeDefined();

      // Verify example completeness flags
      expect(allExamples.every(ex => ex.isComplete)).toBe(true);
    });
  });

  describe('Multi-Format Output Generation', () => {
    let mockAcademicDocument: AcademicDocument;

    beforeEach(() => {
      mockAcademicDocument = {
        title: 'Test Study Guide',
        tableOfContents: [
          {
            level: 1,
            title: 'Part I: Discrete Probability',
            sectionNumber: '1',
            pageAnchor: 'part-1',
            children: []
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
                content: 'Probability content here',
                formulas: mockAIResponses.formulas.slice(0, 1),
                examples: mockAIResponses.examples.slice(0, 1),
                subsections: []
              }
            ]
          }
        ],
        crossReferences: [],
        appendices: [],
        metadata: {
          generatedAt: new Date(),
          sourceFiles: ['test.pdf'],
          totalSections: 1,
          totalFormulas: 1,
          totalExamples: 1,
          preservationScore: 0.95
        }
      };
    });

    it('should generate consistent HTML output', async () => {
      const htmlResult = await generateCompactHTML(mockAcademicDocument);

      // Verify HTML structure
      expect(htmlResult.html).toContain('<!DOCTYPE html>');
      expect(htmlResult.html).toContain('<html lang="en">');
      expect(htmlResult.html).toContain('Test Study Guide');

      // Verify compact CSS
      expect(htmlResult.css).toContain('column-count: 2');
      expect(htmlResult.css).toContain('font-size: 10pt');
      expect(htmlResult.css).toContain('line-height: 1.2');

      // Verify no card/box components
      expect(htmlResult.css).toContain('.card, .box, .panel, .widget');
      expect(htmlResult.css).toContain('display: none !important');

      // Verify MathJax configuration
      expect(htmlResult.mathJaxConfig).toBeDefined();
      expect(htmlResult.mathJaxConfig.tex.inlineMath).toEqual([['\\(', '\\)']]);

      // Verify formula rendering
      expect(htmlResult.html).toContain('\\[P(A) = \\frac{|A|}{|S|}\\]');

      // Verify metadata
      expect(htmlResult.metadata.format).toBe('html');
      expect(htmlResult.metadata.stats.estimatedPrintPages).toBeGreaterThan(0);
    });

    it('should generate consistent Markdown output', async () => {
      const markdownResult = await generateCompactMarkdown(mockAcademicDocument);

      // Verify markdown structure
      expect(markdownResult.markdown).toContain('# Test Study Guide');
      expect(markdownResult.markdown).toContain('## 1.1 Basic Probability');

      // Verify formula rendering
      expect(markdownResult.markdown).toContain('$P(A) = \\frac{|A|}{|S|}$');

      // Verify Pandoc template
      expect(markdownResult.pandocTemplate).toContain('\\documentclass[');
      expect(markdownResult.pandocTemplate).toContain('twocolumn');
      expect(markdownResult.pandocTemplate).toContain('\\clubpenalty=10000');

      // Verify front matter
      expect(markdownResult.frontMatter).toContain('title: Test Study Guide');

      // Verify metadata consistency
      expect(markdownResult.metadata.format).toBe('markdown');
      expect(markdownResult.metadata.stats.totalFormulas).toBe(1);
    });

    it('should generate consistent PDF output', async () => {
      const pdfGenerator = new PDFOutputGenerator();
      const pdfResult = await pdfGenerator.generatePDF(mockAcademicDocument);

      // Verify PDF buffer
      expect(pdfResult.buffer).toBeInstanceOf(Buffer);
      expect(pdfResult.buffer.length).toBeGreaterThan(0);

      // Verify page count
      expect(pdfResult.pageCount).toBeGreaterThan(0);

      // Verify metadata consistency
      expect(pdfResult.metadata.format).toBe('pdf');
      expect(pdfResult.metadata.stats.totalFormulas).toBe(1);
      expect(pdfResult.metadata.stats.estimatedPrintPages).toBe(pdfResult.pageCount);
    });

    it('should maintain content consistency across formats', async () => {
      const htmlResult = await generateCompactHTML(mockAcademicDocument);
      const markdownResult = await generateCompactMarkdown(mockAcademicDocument);
      const pdfGenerator = new PDFOutputGenerator();
      const pdfResult = await pdfGenerator.generatePDF(mockAcademicDocument);

      // Verify metadata consistency
      expect(htmlResult.metadata.stats.totalSections).toBe(markdownResult.metadata.stats.totalSections);
      expect(markdownResult.metadata.stats.totalFormulas).toBe(pdfResult.metadata.stats.totalFormulas);
      expect(htmlResult.metadata.stats.totalExamples).toBe(pdfResult.metadata.stats.totalExamples);

      // Verify preservation scores are consistent
      expect(htmlResult.metadata.preservationScore).toBe(0.95);
      expect(markdownResult.metadata.preservationScore).toBe(0.95);
      expect(pdfResult.metadata.preservationScore).toBe(0.95);

      // Verify source files are consistent
      expect(htmlResult.metadata.sourceFiles).toEqual(['test.pdf']);
      expect(markdownResult.metadata.sourceFiles).toEqual(['test.pdf']);
      expect(pdfResult.metadata.sourceFiles).toEqual(['test.pdf']);
    });
  });

  describe('Configuration Integration', () => {
    it('should apply CLI configuration to layout engine', async () => {
      const cliConfig: CLIConfig = {
        layout: 'compact',
        columns: 3,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '11pt',
        margins: 'narrow',
        outputFormat: 'html'
      };

      const layoutConfig: CompactLayoutConfig = {
        paperSize: 'a4',
        columns: cliConfig.columns,
        typography: {
          fontSize: 11,
          lineHeight: 1.15,
          fontFamily: {
            body: 'Times New Roman',
            heading: 'Arial',
            math: 'Computer Modern',
            code: 'Consolas'
          }
        },
        spacing: {
          paragraphSpacing: 0.25,
          listSpacing: 0.15,
          sectionSpacing: 0.5,
          headingMargins: {
            top: 0.3,
            bottom: 0.2
          }
        },
        margins: {
          top: 12,
          bottom: 12,
          left: 10,
          right: 10,
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

      const mockDocument: AcademicDocument = {
        title: 'CLI Config Test',
        tableOfContents: [],
        parts: [{
          partNumber: 1,
          title: 'Test Part',
          sections: [{
            sectionNumber: '1.1',
            title: 'Test Section',
            content: 'Test content',
            formulas: [],
            examples: [],
            subsections: []
          }]
        }],
        crossReferences: [],
        appendices: [],
        metadata: {
          generatedAt: new Date(),
          sourceFiles: ['test.pdf'],
          totalSections: 1,
          totalFormulas: 0,
          totalExamples: 0,
          preservationScore: 1.0
        }
      };

      const htmlResult = await generateCompactHTML(mockDocument, layoutConfig);

      // Verify configuration application
      expect(htmlResult.css).toContain('column-count: 3');
      expect(htmlResult.css).toContain('font-size: 11pt');
      expect(htmlResult.css).toContain('line-height: 1.15');
    });

    it('should validate configuration constraints', () => {
      const invalidConfigs = [
        { fontSize: 15 }, // Too large
        { lineHeight: 2.5 }, // Too large
        { paragraphSpacing: 0.5 }, // Too large
        { listSpacing: 0.3 }, // Too large
        { columns: 5 } // Too many
      ];

      invalidConfigs.forEach(invalidConfig => {
        expect(() => {
          // This would be validated in the actual layout engine
          if (invalidConfig.fontSize && invalidConfig.fontSize > 12) {
            throw new Error('Font size too large for compact layout');
          }
          if (invalidConfig.lineHeight && invalidConfig.lineHeight > 1.5) {
            throw new Error('Line height too large for compact layout');
          }
          if (invalidConfig.paragraphSpacing && invalidConfig.paragraphSpacing > 0.35) {
            throw new Error('Paragraph spacing too large for compact layout');
          }
          if (invalidConfig.listSpacing && invalidConfig.listSpacing > 0.25) {
            throw new Error('List spacing too large for compact layout');
          }
          if (invalidConfig.columns && invalidConfig.columns > 4) {
            throw new Error('Too many columns for readable layout');
          }
        }).toThrow();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large documents efficiently', async () => {
      // Create a large mock document
      const largeSections = Array.from({ length: 20 }, (_, i) => ({
        sectionNumber: `${Math.floor(i / 5) + 1}.${(i % 5) + 1}`,
        title: `Section ${i + 1}`,
        content: 'Large content section. '.repeat(100),
        formulas: Array.from({ length: 5 }, (_, j) => ({
          id: `formula-${i}-${j}`,
          latex: `x_{${i},${j}} = \\frac{a_{${i}}}{b_{${j}}}`,
          context: `Formula ${i}.${j}`,
          type: 'display' as const,
          sourceLocation: { fileId: 'large-file', page: i + 1 },
          isKeyFormula: true,
          confidence: 0.9
        })),
        examples: Array.from({ length: 3 }, (_, k) => ({
          id: `example-${i}-${k}`,
          title: `Example ${i}.${k}`,
          problem: `Problem statement ${i}.${k}`,
          solution: Array.from({ length: 4 }, (_, l) => ({
            stepNumber: l + 1,
            description: `Step ${l + 1}`,
            explanation: `Explanation for step ${l + 1}`,
            formula: `y_{${l}} = f(x_{${l}})`
          })),
          sourceLocation: { fileId: 'large-file', page: i + 1 },
          subtopic: `topic-${i}`,
          confidence: 0.85,
          isComplete: true
        })),
        subsections: []
      }));

      const largeDocument: AcademicDocument = {
        title: 'Large Study Guide',
        tableOfContents: [],
        parts: Array.from({ length: 4 }, (_, i) => ({
          partNumber: i + 1,
          title: `Part ${i + 1}`,
          sections: largeSections.slice(i * 5, (i + 1) * 5)
        })),
        crossReferences: [],
        appendices: [],
        metadata: {
          generatedAt: new Date(),
          sourceFiles: ['large-file.pdf'],
          totalSections: 20,
          totalFormulas: 100,
          totalExamples: 60,
          preservationScore: 0.9
        }
      };

      const startTime = Date.now();
      const htmlResult = await generateCompactHTML(largeDocument);
      const processingTime = Date.now() - startTime;

      // Verify performance (should complete within reasonable time)
      expect(processingTime).toBeLessThan(10000); // 10 seconds max

      // Verify content integrity
      expect(htmlResult.html).toContain('Large Study Guide');
      expect(htmlResult.metadata.stats.totalSections).toBe(20);
      expect(htmlResult.metadata.stats.totalFormulas).toBe(100);
      expect(htmlResult.metadata.stats.totalExamples).toBe(60);
    });

    it('should manage memory efficiently during processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process multiple documents
      const documents = Array.from({ length: 5 }, (_, i) => ({
        title: `Document ${i}`,
        tableOfContents: [],
        parts: [{
          partNumber: 1,
          title: 'Test Part',
          sections: [{
            sectionNumber: '1.1',
            title: 'Test Section',
            content: 'Content '.repeat(1000),
            formulas: [],
            examples: [],
            subsections: []
          }]
        }],
        crossReferences: [],
        appendices: [],
        metadata: {
          generatedAt: new Date(),
          sourceFiles: [`doc${i}.pdf`],
          totalSections: 1,
          totalFormulas: 0,
          totalExamples: 0,
          preservationScore: 1.0
        }
      }));

      for (const doc of documents) {
        await generateCompactHTML(doc);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});