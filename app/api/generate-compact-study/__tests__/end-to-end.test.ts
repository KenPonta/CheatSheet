import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock the compact study library with realistic implementations
jest.mock('@/backend/lib/compact-study', () => {
  const mockAcademicDocument = {
    title: 'Discrete Probability & Relations Study Guide',
    tableOfContents: [
      { id: 'part1', title: 'Part I: Discrete Probability', level: 1, pageNumber: 1 },
      { id: 'section1.1', title: '1.1 Probability Basics', level: 2, pageNumber: 1 },
      { id: 'section1.2', title: '1.2 Conditional Probability', level: 2, pageNumber: 2 },
      { id: 'part2', title: 'Part II: Relations', level: 1, pageNumber: 3 },
      { id: 'section2.1', title: '2.1 Relation Definitions', level: 2, pageNumber: 3 }
    ],
    parts: [
      {
        partNumber: 1,
        title: 'Part I: Discrete Probability',
        sections: [
          {
            sectionNumber: '1.1',
            title: 'Probability Basics',
            content: 'The probability of an event A is defined as P(A) = |A| / |S|.',
            formulas: [
              {
                id: 'formula1',
                latex: 'P(A) = \\frac{|A|}{|S|}',
                context: 'Basic probability definition',
                type: 'display' as const,
                sourceLocation: { page: 1, line: 5 },
                isKeyFormula: true
              }
            ],
            examples: [
              {
                id: 'example1.1',
                title: 'Rolling a Die',
                problem: 'What is the probability of rolling an even number on a fair six-sided die?',
                solution: [
                  {
                    stepNumber: 1,
                    description: 'Identify the sample space',
                    formula: 'S = \\{1, 2, 3, 4, 5, 6\\}',
                    explanation: 'All possible outcomes when rolling a die'
                  },
                  {
                    stepNumber: 2,
                    description: 'Identify the event',
                    formula: 'A = \\{2, 4, 6\\}',
                    explanation: 'Even numbers on the die'
                  },
                  {
                    stepNumber: 3,
                    description: 'Calculate probability',
                    formula: 'P(A) = \\frac{3}{6} = \\frac{1}{2}',
                    explanation: 'Apply the basic probability formula'
                  }
                ],
                sourceLocation: { page: 1, line: 10 },
                subtopic: 'Basic Probability'
              }
            ],
            subsections: []
          },
          {
            sectionNumber: '1.2',
            title: 'Conditional Probability',
            content: 'The conditional probability of A given B is P(A|B) = P(A ∩ B) / P(B).',
            formulas: [
              {
                id: 'formula2',
                latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
                context: 'Conditional probability definition',
                type: 'display' as const,
                sourceLocation: { page: 2, line: 3 },
                isKeyFormula: true
              }
            ],
            examples: [
              {
                id: 'example1.2',
                title: 'Medical Test',
                problem: 'Calculate the probability of having a disease given a positive test result.',
                solution: [
                  {
                    stepNumber: 1,
                    description: 'Apply Bayes theorem',
                    formula: 'P(D|T) = \\frac{P(T|D) \\cdot P(D)}{P(T)}',
                    explanation: 'Use Bayes theorem for conditional probability'
                  }
                ],
                sourceLocation: { page: 2, line: 8 },
                subtopic: 'Bayes Theorem'
              }
            ],
            subsections: []
          }
        ]
      },
      {
        partNumber: 2,
        title: 'Part II: Relations',
        sections: [
          {
            sectionNumber: '2.1',
            title: 'Relation Definitions',
            content: 'A relation R on a set A is a subset of A × A.',
            formulas: [
              {
                id: 'formula3',
                latex: 'R \\subseteq A \\times A',
                context: 'Relation definition',
                type: 'display' as const,
                sourceLocation: { page: 3, line: 2 },
                isKeyFormula: true
              }
            ],
            examples: [
              {
                id: 'example2.1',
                title: 'Relation Properties',
                problem: 'Check if a relation is reflexive, symmetric, and transitive.',
                solution: [
                  {
                    stepNumber: 1,
                    description: 'Check reflexivity',
                    formula: '\\forall a \\in A: (a,a) \\in R',
                    explanation: 'Every element relates to itself'
                  }
                ],
                sourceLocation: { page: 3, line: 5 },
                subtopic: 'Relation Properties'
              }
            ],
            subsections: []
          }
        ]
      }
    ],
    crossReferences: [
      {
        id: 'ref1',
        type: 'example' as const,
        sourceId: 'section1.2',
        targetId: 'example1.1',
        displayText: 'see Ex. 1.1'
      }
    ],
    appendices: []
  };

  const mockMetadata = {
    generatedAt: new Date(),
    format: 'html',
    sourceFiles: ['discrete-probability.pdf', 'relations.pdf'],
    config: {},
    stats: {
      totalSections: 3,
      totalFormulas: 3,
      totalExamples: 3,
      estimatedPrintPages: 4
    },
    preservationScore: 0.95
  };

  return {
    processCompactStudyDocuments: jest.fn().mockResolvedValue(mockAcademicDocument),
    generateCompactHTML: jest.fn().mockResolvedValue({
      html: `<!DOCTYPE html>
<html>
<head>
  <title>Discrete Probability & Relations Study Guide</title>
  <style>
    body { font-size: 10pt; line-height: 1.15; column-count: 2; }
    .formula { text-align: center; margin: 0.25em 0; }
    .example { margin: 0.5em 0; }
    h1, h2, h3 { margin-top: 0.5em; margin-bottom: 0.25em; }
  </style>
</head>
<body>
  <h1>Discrete Probability & Relations Study Guide</h1>
  <h2>Part I: Discrete Probability</h2>
  <h3>1.1 Probability Basics</h3>
  <p>The probability of an event A is defined as P(A) = |A| / |S|.</p>
  <div class="formula">$$P(A) = \\frac{|A|}{|S|}$$</div>
  <div class="example">
    <h4>Example 1.1: Rolling a Die</h4>
    <p>What is the probability of rolling an even number on a fair six-sided die?</p>
    <p><strong>Solution:</strong></p>
    <ol>
      <li>Sample space: $S = \\{1, 2, 3, 4, 5, 6\\}$</li>
      <li>Event: $A = \\{2, 4, 6\\}$</li>
      <li>Probability: $P(A) = \\frac{3}{6} = \\frac{1}{2}$</li>
    </ol>
  </div>
  <h2>Part II: Relations</h2>
  <h3>2.1 Relation Definitions</h3>
  <p>A relation R on a set A is a subset of A × A.</p>
</body>
</html>`,
      css: `body { font-size: 10pt; line-height: 1.15; column-count: 2; margin: 0.5in; }
.formula { text-align: center; margin: 0.25em 0; }
.example { margin: 0.5em 0; }
h1, h2, h3 { margin-top: 0.5em; margin-bottom: 0.25em; }`,
      mathJaxConfig: {
        tex: {
          inlineMath: [['$', '$']],
          displayMath: [['$$', '$$']]
        }
      },
      metadata: mockMetadata
    }),
    PDFOutputGenerator: jest.fn().mockImplementation(() => ({
      generatePDF: jest.fn().mockResolvedValue({
        buffer: Buffer.from('mock-pdf-content'),
        pageCount: 4,
        metadata: mockMetadata,
        latexSource: `\\documentclass[10pt,twocolumn]{article}
\\usepackage{amsmath}
\\begin{document}
\\title{Discrete Probability \\& Relations Study Guide}
\\maketitle
\\section{Part I: Discrete Probability}
\\subsection{Probability Basics}
The probability of an event A is defined as:
\\begin{equation}
P(A) = \\frac{|A|}{|S|}
\\end{equation}
\\end{document}`
      })
    })),
    generateCompactMarkdown: jest.fn().mockResolvedValue({
      markdown: `---
title: "Discrete Probability & Relations Study Guide"
author: "Generated by Compact Study Generator"
date: "${new Date().toISOString().split('T')[0]}"
---

# Discrete Probability & Relations Study Guide

## Part I: Discrete Probability

### 1.1 Probability Basics

The probability of an event A is defined as P(A) = |A| / |S|.

$$P(A) = \\frac{|A|}{|S|}$$

#### Example 1.1: Rolling a Die

What is the probability of rolling an even number on a fair six-sided die?

**Solution:**

1. Sample space: $S = \\{1, 2, 3, 4, 5, 6\\}$
2. Event: $A = \\{2, 4, 6\\}$
3. Probability: $P(A) = \\frac{3}{6} = \\frac{1}{2}$

## Part II: Relations

### 2.1 Relation Definitions

A relation R on a set A is a subset of A × A.

$$R \\subseteq A \\times A$$`,
      pandocTemplate: `$if(title)$
\\title{$title$}
$endif$
$if(author)$
\\author{$author$}
$endif$
$if(date)$
\\date{$date$}
$endif$

\\documentclass[10pt,twocolumn]{article}
\\usepackage{amsmath}
\\begin{document}
$if(title)$\\maketitle$endif$
$body$
\\end{document}`,
      metadata: mockMetadata
    })
  };
});

describe('End-to-End API Integration Tests', () => {
  const createMockRequest = (body: any): NextRequest => {
    return {
      json: async () => body,
      headers: new Map([['content-type', 'application/json']])
    } as NextRequest;
  };

  // Mock PDF content (base64 encoded)
  const mockPDFContent = Buffer.from(`
    # Discrete Probability
    ## Probability Basics
    P(A) = |A| / |S|
    
    ### Example
    Rolling a die: P(even) = 3/6 = 1/2
  `).toString('base64');

  const mockRelationsContent = Buffer.from(`
    # Relations
    ## Relation Definitions
    R ⊆ A × A
    
    ### Example
    Check reflexivity: ∀a ∈ A: (a,a) ∈ R
  `).toString('base64');

  describe('Complete Workflow Tests', () => {
    it('should handle complete PDF upload to HTML generation workflow', async () => {
      const request = createMockRequest({
        files: [
          {
            name: 'discrete-probability.pdf',
            type: 'probability',
            content: mockPDFContent
          },
          {
            name: 'relations.pdf',
            type: 'relations',
            content: mockRelationsContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'html',
          title: 'Complete Study Guide',
          enableProgressTracking: true,
          enableErrorRecovery: true
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.html).toBeDefined();
      expect(data.html).toContain('<!DOCTYPE html>');
      expect(data.html).toContain('Discrete Probability');
      expect(data.html).toContain('Relations');
      expect(data.html).toContain('column-count: 2');
      expect(data.html).not.toContain('card'); // No card components

      // Validate metadata
      expect(data.metadata).toBeDefined();
      expect(data.metadata.stats.totalSections).toBe(3);
      expect(data.metadata.stats.totalFormulas).toBe(3);
      expect(data.metadata.stats.totalExamples).toBe(3);
      expect(data.metadata.preservationScore).toBe(0.95);
    });

    it('should handle complete PDF upload to PDF generation workflow', async () => {
      const request = createMockRequest({
        files: [
          {
            name: 'discrete-probability.pdf',
            type: 'probability',
            content: mockPDFContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'pdf',
          paperSize: 'a4',
          title: 'PDF Study Guide'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pdf).toBeDefined();
      expect(data.pdf).toBe(Buffer.from('mock-pdf-content').toString('base64'));

      // Validate metadata
      expect(data.metadata.stats.estimatedPrintPages).toBe(4);
    });

    it('should handle complete PDF upload to Markdown generation workflow', async () => {
      const request = createMockRequest({
        files: [
          {
            name: 'relations.pdf',
            type: 'relations',
            content: mockRelationsContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '11pt',
          margins: 'normal',
          outputFormat: 'markdown',
          title: 'Markdown Study Guide'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.markdown).toBeDefined();
      expect(data.markdown).toContain('---'); // Front matter
      expect(data.markdown).toContain('# Discrete Probability');
      expect(data.markdown).toContain('$$'); // Math blocks
    });

    it('should handle all output formats simultaneously', async () => {
      const request = createMockRequest({
        files: [
          {
            name: 'complete-study.pdf',
            type: 'probability',
            content: mockPDFContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'all',
          title: 'All Formats Study Guide'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.html).toBeDefined();
      expect(data.pdf).toBeDefined();
      expect(data.markdown).toBeDefined();

      // All formats should have consistent metadata
      expect(data.metadata.stats.totalSections).toBe(3);
      expect(data.metadata.stats.totalFormulas).toBe(3);
      expect(data.metadata.stats.totalExamples).toBe(3);
    });
  });

  describe('Configuration Validation Tests', () => {
    it('should validate and apply compact layout configuration', async () => {
      const compactConfigs = [
        {
          layout: 'compact',
          columns: 3,
          fontSize: '9pt',
          margins: 'narrow'
        },
        {
          layout: 'compact',
          columns: 2,
          fontSize: '10pt',
          margins: 'narrow'
        }
      ];

      for (const config of compactConfigs) {
        const request = createMockRequest({
          files: [{
            name: 'test.pdf',
            type: 'probability',
            content: mockPDFContent
          }],
          config: {
            ...config,
            equations: 'all',
            examples: 'full',
            answers: 'inline',
            outputFormat: 'html'
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.html).toContain(`column-count: ${config.columns}`);
        expect(data.html).toContain(`font-size: ${config.fontSize}`);
      }
    });

    it('should handle different equation and example configurations', async () => {
      const contentConfigs = [
        { equations: 'all', examples: 'full' },
        { equations: 'key', examples: 'summary' },
        { equations: 'minimal', examples: 'references' }
      ];

      for (const contentConfig of contentConfigs) {
        const request = createMockRequest({
          files: [{
            name: 'test.pdf',
            type: 'probability',
            content: mockPDFContent
          }],
          config: {
            layout: 'compact',
            columns: 2,
            fontSize: '10pt',
            margins: 'narrow',
            answers: 'inline',
            outputFormat: 'html',
            ...contentConfig
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    it('should handle missing files gracefully', async () => {
      const request = createMockRequest({
        files: [],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'html'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No files provided');
    });

    it('should handle missing configuration gracefully', async () => {
      const request = createMockRequest({
        files: [{
          name: 'test.pdf',
          type: 'probability',
          content: mockPDFContent
        }]
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Configuration is required');
    });

    it('should provide meaningful error messages for processing failures', async () => {
      // Mock a processing failure
      const { processCompactStudyDocuments } = require('@/backend/lib/compact-study');
      processCompactStudyDocuments.mockRejectedValueOnce(new Error('Processing failed'));

      const request = createMockRequest({
        files: [{
          name: 'test.pdf',
          type: 'probability',
          content: mockPDFContent
        }],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'html'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Pipeline processing failed: Processing failed');
    });
  });

  describe('Performance and Quality Tests', () => {
    it('should complete processing within reasonable time limits', async () => {
      const startTime = Date.now();

      const request = createMockRequest({
        files: [
          {
            name: 'large-document.pdf',
            type: 'probability',
            content: mockPDFContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'html'
        }
      });

      const response = await POST(request);
      const data = await response.json();
      const processingTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processingTime).toBeLessThan(5000); // Should complete within 5 seconds for mocked data
      expect(processingTime).toBeLessThan(10000); // Total time including network
    });

    it('should maintain high content preservation scores', async () => {
      const request = createMockRequest({
        files: [
          {
            name: 'content-rich.pdf',
            type: 'probability',
            content: mockPDFContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'html'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.preservationScore).toBeGreaterThan(0.9); // High preservation score
    });

    it('should demonstrate page count reduction with compact layout', async () => {
      const request = createMockRequest({
        files: [
          {
            name: 'test-document.pdf',
            type: 'probability',
            content: mockPDFContent
          }
        ],
        config: {
          layout: 'compact',
          columns: 2,
          equations: 'all',
          examples: 'full',
          answers: 'inline',
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'pdf'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.stats.estimatedPrintPages).toBeLessThanOrEqual(4); // Compact layout should be efficient
    });
  });

  describe('Health Check Tests', () => {
    it('should respond to health check requests', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.service).toBe('compact-study-generator');
      expect(data.timestamp).toBeDefined();
    });
  });
});