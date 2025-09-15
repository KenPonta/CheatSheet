import { PDFOutputGenerator } from '../pdf-output-generator'
import { 
  AcademicDocument, 
  CompactLayoutConfig, 
  DocumentPart, 
  AcademicSection,
  WorkedExample,
  Formula,
  SolutionStep,
  TOCEntry,
  DocumentMetadata,
  Appendix
} from '../types'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('PDFOutputGenerator Integration', () => {
  let generator: PDFOutputGenerator
  let tempDir: string
  let complexDocument: AcademicDocument
  let compactConfig: CompactLayoutConfig

  beforeEach(() => {
    tempDir = join(tmpdir(), `test_pdf_integration_${Date.now()}`)
    generator = new PDFOutputGenerator(tempDir)

    // Create a more complex academic document for integration testing
    const probabilityFormulas: Formula[] = [
      {
        id: 'basic_prob',
        latex: 'P(A) = \\frac{|A|}{|S|}',
        context: 'Basic probability definition',
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
        sourceLocation: { fileId: 'prob.pdf', page: 2 },
        isKeyFormula: true,
        confidence: 0.95
      }
    ]

    const probabilityExamples: WorkedExample[] = [
      {
        id: 'coin_example',
        title: 'Fair Coin Probability',
        problem: 'Calculate P(Heads) for a fair coin.',
        solution: [
          {
            stepNumber: 1,
            description: 'Identify sample space',
            formula: 'S = \\{H, T\\}',
            explanation: 'Two equally likely outcomes'
          },
          {
            stepNumber: 2,
            description: 'Apply basic probability formula',
            formula: 'P(H) = \\frac{1}{2}',
            explanation: 'One favorable outcome out of two total'
          }
        ],
        sourceLocation: { fileId: 'prob.pdf', page: 3 },
        subtopic: 'Basic Probability',
        confidence: 0.92,
        isComplete: true
      }
    ]

    const relationsFormulas: Formula[] = [
      {
        id: 'reflexive_def',
        latex: '\\forall x \\in A: (x, x) \\in R',
        context: 'Reflexive relation definition',
        type: 'display',
        sourceLocation: { fileId: 'relations.pdf', page: 1 },
        isKeyFormula: true,
        confidence: 0.97
      }
    ]

    const relationsExamples: WorkedExample[] = [
      {
        id: 'reflexive_example',
        title: 'Checking Reflexivity',
        problem: 'Determine if R = {(1,1), (2,2), (3,3)} on A = {1,2,3} is reflexive.',
        solution: [
          {
            stepNumber: 1,
            description: 'Check definition',
            explanation: 'For reflexivity, every element must be related to itself'
          },
          {
            stepNumber: 2,
            description: 'Verify all pairs',
            explanation: 'All pairs (x,x) for x ∈ A are present in R'
          }
        ],
        sourceLocation: { fileId: 'relations.pdf', page: 2 },
        subtopic: 'Relation Properties',
        confidence: 0.89,
        isComplete: true
      }
    ]

    const probabilitySection: AcademicSection = {
      sectionNumber: '1.1',
      title: 'Probability Basics',
      content: 'Probability theory deals with the analysis of random phenomena. The **fundamental concept** is the probability of an event.',
      formulas: probabilityFormulas,
      examples: probabilityExamples,
      subsections: [
        {
          sectionNumber: '1.1.1',
          title: 'Sample Spaces',
          content: 'A *sample space* is the set of all possible outcomes.',
          formulas: [],
          examples: [],
          subsections: []
        }
      ]
    }

    const relationsSection: AcademicSection = {
      sectionNumber: '2.1',
      title: 'Relation Properties',
      content: 'Relations can have various properties such as reflexivity, symmetry, and transitivity.',
      formulas: relationsFormulas,
      examples: relationsExamples,
      subsections: []
    }

    const probabilityPart: DocumentPart = {
      partNumber: 1,
      title: 'Discrete Probability',
      sections: [probabilitySection]
    }

    const relationsPart: DocumentPart = {
      partNumber: 2,
      title: 'Relations',
      sections: [relationsSection]
    }

    const tableOfContents: TOCEntry[] = [
      {
        level: 1,
        title: 'Part I: Discrete Probability',
        sectionNumber: '1',
        pageAnchor: 'part1',
        children: [
          {
            level: 2,
            title: 'Probability Basics',
            sectionNumber: '1.1',
            pageAnchor: 'sec1_1',
            children: [
              {
                level: 3,
                title: 'Sample Spaces',
                sectionNumber: '1.1.1',
                pageAnchor: 'sec1_1_1',
                children: []
              }
            ]
          }
        ]
      },
      {
        level: 1,
        title: 'Part II: Relations',
        sectionNumber: '2',
        pageAnchor: 'part2',
        children: [
          {
            level: 2,
            title: 'Relation Properties',
            sectionNumber: '2.1',
            pageAnchor: 'sec2_1',
            children: []
          }
        ]
      }
    ]

    const appendices: Appendix[] = [
      {
        id: 'formulas',
        title: 'Formula Reference',
        content: 'Quick reference for all formulas used in this study guide.',
        type: 'formulas'
      }
    ]

    const metadata: DocumentMetadata = {
      generatedAt: new Date(),
      sourceFiles: ['probability.pdf', 'relations.pdf'],
      totalSections: 2,
      totalFormulas: 3,
      totalExamples: 2,
      preservationScore: 0.94
    }

    complexDocument = {
      title: 'Comprehensive Study Guide: Discrete Mathematics',
      tableOfContents,
      parts: [probabilityPart, relationsPart],
      crossReferences: [],
      appendices,
      metadata
    }

    compactConfig = {
      paperSize: 'a4',
      columns: 2,
      typography: {
        fontSize: 10,
        lineHeight: 1.2,
        fontFamily: {
          body: 'Latin Modern Roman',
          heading: 'Latin Modern Sans',
          math: 'Latin Modern Math',
          code: 'Latin Modern Mono'
        }
      },
      spacing: {
        paragraphSpacing: 0.25,
        listSpacing: 0.15,
        sectionSpacing: 0.4,
        headingMargins: {
          top: 0.3,
          bottom: 0.15
        }
      },
      margins: {
        top: 12,
        bottom: 12,
        left: 10,
        right: 10,
        columnGap: 5
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
    }
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  describe('Complete LaTeX Generation', () => {
    test('should generate complete LaTeX document with all components', () => {
      const latexSource = (generator as any).generateLaTeXSource(complexDocument, compactConfig)
      
      // Check document structure
      expect(latexSource).toContain('\\documentclass[10pt,a4paper,twocolumn,twoside]{scrartcl}')
      expect(latexSource).toContain('\\begin{document}')
      expect(latexSource).toContain('\\end{document}')
      
      // Check title and TOC
      expect(latexSource).toContain('\\title{Comprehensive Study Guide: Discrete Mathematics}')
      expect(latexSource).toContain('\\tableofcontents')
      
      // Check parts
      expect(latexSource).toContain('\\partTitle{Part I: Discrete Probability}')
      expect(latexSource).toContain('\\partTitle{Part II: Relations}')
      
      // Check sections
      expect(latexSource).toContain('\\sectionTitle{Probability Basics}{1_1}')
      expect(latexSource).toContain('\\sectionTitle{Relation Properties}{2_1}')
      
      // Check subsections
      expect(latexSource).toContain('\\subsubsection{Sample Spaces}')
      
      // Check formulas
      expect(latexSource).toContain('\\keyformula{P(A) = \\frac{|A|}{|S|}}{basic_prob}')
      expect(latexSource).toContain('\\keyformula{P(A^c) = 1 - P(A)}{complement}')
      
      // Check worked examples
      expect(latexSource).toContain('\\begin{workedexample}{Fair Coin Probability}{coin_example}')
      expect(latexSource).toContain('\\begin{workedexample}{Checking Reflexivity}{reflexive_example}')
      
      // Check appendices
      expect(latexSource).toContain('\\appendix')
      expect(latexSource).toContain('\\section{Formula Reference}')
    })

    test('should handle markdown formatting in content', () => {
      const latexSource = (generator as any).generateLaTeXSource(complexDocument, compactConfig)
      
      // Check bold formatting
      expect(latexSource).toContain('\\textbf{fundamental concept}')
      
      // Check italic formatting
      expect(latexSource).toContain('\\textit{sample space}')
    })

    test('should generate proper cross-references', () => {
      const latexSource = (generator as any).generateLaTeXSource(complexDocument, compactConfig)
      
      // Check formula commands with IDs
      expect(latexSource).toContain('\\keyformula{P(A) = \\frac{|A|}{|S|}}{basic_prob}')
      expect(latexSource).toContain('\\keyformula{P(A^c) = 1 - P(A)}{complement}')
      
      // Check example usage with IDs
      expect(latexSource).toContain('\\begin{workedexample}{Fair Coin Probability}{coin_example}')
      expect(latexSource).toContain('\\begin{workedexample}{Checking Reflexivity}{reflexive_example}')
      
      // Check section usage with IDs
      expect(latexSource).toContain('\\sectionTitle{Probability Basics}{1_1}')
      expect(latexSource).toContain('\\sectionTitle{Relation Properties}{2_1}')
      
      // Check that the command definitions include label templates
      expect(latexSource).toContain('\\label{eq:#2}')
      expect(latexSource).toContain('\\label{ex:#2}')
      expect(latexSource).toContain('\\label{sec:#2}')
    })

    test('should apply compact spacing settings', () => {
      const latexSource = (generator as any).generateLaTeXSource(complexDocument, compactConfig)
      
      expect(latexSource).toContain('\\setstretch{1.2}')
      expect(latexSource).toContain('\\setlength{\\parskip}{0.25em}')
      expect(latexSource).toContain('itemsep=0.15em')
      expect(latexSource).toContain('top=12mm')
      expect(latexSource).toContain('columnsep=5mm')
    })

    test('should include widow and orphan control', () => {
      const latexSource = (generator as any).generateLaTeXSource(complexDocument, compactConfig)
      
      expect(latexSource).toContain('\\clubpenalty=10000')
      expect(latexSource).toContain('\\widowpenalty=10000')
      expect(latexSource).toContain('\\needspace')
    })
  })

  describe('Configuration Variations', () => {
    test('should handle letter paper with different margins', () => {
      const letterConfig: CompactLayoutConfig = {
        ...compactConfig,
        paperSize: 'letter',
        margins: {
          top: 20,
          bottom: 20,
          left: 15,
          right: 15,
          columnGap: 8
        }
      }

      const latexSource = (generator as any).generateLaTeXSource(complexDocument, letterConfig)
      
      expect(latexSource).toContain('\\documentclass[10pt,letterpaper,twocolumn,twoside]{scrartcl}')
      expect(latexSource).toContain('top=20mm')
      expect(latexSource).toContain('left=15mm')
      expect(latexSource).toContain('columnsep=8mm')
    })

    test('should handle different typography settings', () => {
      const customTypography: CompactLayoutConfig = {
        ...compactConfig,
        typography: {
          fontSize: 11,
          lineHeight: 1.15,
          fontFamily: {
            body: 'Times New Roman',
            heading: 'Arial',
            math: 'Computer Modern',
            code: 'Courier New'
          }
        }
      }

      const latexSource = (generator as any).generateLaTeXSource(complexDocument, customTypography)
      
      expect(latexSource).toContain('\\documentclass[11pt,a4paper,twocolumn,twoside]{scrartcl}')
      expect(latexSource).toContain('\\setstretch{1.15}')
    })

    test('should handle math rendering without equation numbering', () => {
      const noNumberConfig: CompactLayoutConfig = {
        ...compactConfig,
        mathRendering: {
          displayEquations: {
            centered: true,
            numbered: false,
            fullWidth: false
          },
          inlineEquations: {
            preserveInline: true,
            maxHeight: 12
          }
        }
      }

      const latexSource = (generator as any).generateLaTeXSource(complexDocument, noNumberConfig)
      
      expect(latexSource).not.toContain('\\numberwithin{equation}{section}')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle document with no table of contents', () => {
      const noTocDocument: AcademicDocument = {
        ...complexDocument,
        tableOfContents: []
      }

      expect(() => {
        (generator as any).generateLaTeXSource(noTocDocument, compactConfig)
      }).not.toThrow()
    })

    test('should handle sections with no formulas or examples', () => {
      const emptySection: AcademicSection = {
        sectionNumber: '3.1',
        title: 'Empty Section',
        content: 'This section has no formulas or examples.',
        formulas: [],
        examples: [],
        subsections: []
      }

      const documentWithEmpty: AcademicDocument = {
        ...complexDocument,
        parts: [
          ...complexDocument.parts,
          {
            partNumber: 3,
            title: 'Empty Part',
            sections: [emptySection]
          }
        ]
      }

      expect(() => {
        (generator as any).generateLaTeXSource(documentWithEmpty, compactConfig)
      }).not.toThrow()
    })

    test('should handle formulas with special LaTeX characters', () => {
      const specialFormula: Formula = {
        id: 'special_chars',
        latex: '\\sum_{i=1}^{n} x_i \\approx \\int_0^\\infty f(x) dx',
        context: 'Formula with special characters',
        type: 'display',
        sourceLocation: { fileId: 'test.pdf', page: 1 },
        isKeyFormula: true,
        confidence: 0.9
      }

      const sectionWithSpecial: AcademicSection = {
        sectionNumber: '4.1',
        title: 'Special Characters',
        content: 'Testing special characters in formulas.',
        formulas: [specialFormula],
        examples: [],
        subsections: []
      }

      const documentWithSpecial: AcademicDocument = {
        ...complexDocument,
        parts: [
          {
            partNumber: 4,
            title: 'Special Characters',
            sections: [sectionWithSpecial]
          }
        ]
      }

      const latexSource = (generator as any).generateLaTeXSource(documentWithSpecial, compactConfig)
      expect(latexSource).toContain('\\sum_{i=1}^{n} x_i \\approx \\int_0^\\infty f(x) dx')
    })
  })

  describe('Content Processing', () => {
    test('should process complex markdown content correctly', () => {
      const complexContent = `This is **bold text** and *italic text*.
Here's some \`inline code\` and special characters: & $ % # ^ _ ~

* First item
* Second item with **bold**
* Third item with normal text

1. Numbered item
2. Another numbered item`

      const processed = (generator as any).processContent(complexContent)
      
      expect(processed).toContain('\\textbf{bold text}')
      expect(processed).toContain('\\textit{italic text}')
      expect(processed).toContain('\\texttt{inline code}')
      expect(processed).toContain('\\&')
      expect(processed).toContain('\\$')
      expect(processed).toContain('\\item First item')
      expect(processed).toContain('\\item Another numbered item')
    })

    test('should handle nested formatting correctly', () => {
      const nestedContent = '**Bold with *nested italic* text**'
      const processed = (generator as any).processContent(nestedContent)
      
      expect(processed).toContain('\\textbf{Bold with \\textit{nested italic} text}')
    })
  })
})