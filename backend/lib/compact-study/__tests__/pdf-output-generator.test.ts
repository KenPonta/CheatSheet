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
  DocumentMetadata
} from '../types'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('PDFOutputGenerator', () => {
  let generator: PDFOutputGenerator
  let tempDir: string
  let mockDocument: AcademicDocument
  let mockConfig: CompactLayoutConfig

  beforeEach(() => {
    tempDir = join(tmpdir(), `test_pdf_${Date.now()}`)
    generator = new PDFOutputGenerator(tempDir)

    // Create mock academic document
    const mockSolutionSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: 'Identify the sample space',
        formula: 'S = \\{H, T\\}',
        explanation: 'For a coin flip, we have two possible outcomes'
      },
      {
        stepNumber: 2,
        description: 'Calculate probability',
        formula: 'P(H) = \\frac{1}{2}',
        explanation: 'Each outcome is equally likely'
      }
    ]

    const mockExample: WorkedExample = {
      id: 'example_1',
      title: 'Coin Flip Probability',
      problem: 'What is the probability of getting heads in a fair coin flip?',
      solution: mockSolutionSteps,
      sourceLocation: {
        fileId: 'test_file',
        page: 1,
        section: '1.1'
      },
      subtopic: 'Basic Probability',
      confidence: 0.95,
      isComplete: true
    }

    const mockFormula: Formula = {
      id: 'formula_1',
      latex: 'P(A) = \\frac{|A|}{|S|}',
      context: 'Basic probability formula',
      type: 'display',
      sourceLocation: {
        fileId: 'test_file',
        page: 1
      },
      isKeyFormula: true,
      confidence: 0.98
    }

    const mockSection: AcademicSection = {
      sectionNumber: '1.1',
      title: 'Probability Basics',
      content: 'This section covers the fundamental concepts of probability theory.',
      formulas: [mockFormula],
      examples: [mockExample],
      subsections: []
    }

    const mockPart: DocumentPart = {
      partNumber: 1,
      title: 'Discrete Probability',
      sections: [mockSection]
    }

    const mockTOC: TOCEntry[] = [
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
            children: []
          }
        ]
      }
    ]

    const mockMetadata: DocumentMetadata = {
      generatedAt: new Date(),
      sourceFiles: ['test_probability.pdf'],
      totalSections: 1,
      totalFormulas: 1,
      totalExamples: 1,
      preservationScore: 0.95
    }

    mockDocument = {
      title: 'Compact Study Guide: Discrete Probability',
      tableOfContents: mockTOC,
      parts: [mockPart],
      crossReferences: [],
      appendices: [],
      metadata: mockMetadata
    }

    mockConfig = {
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
          fullWidth: false
        },
        inlineEquations: {
          preserveInline: true,
          maxHeight: 12
        }
      }
    }
  })

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rmdir(tempDir, { recursive: true })
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  describe('LaTeX Source Generation', () => {
    test('should generate valid LaTeX document class', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\documentclass[10pt,a4paper,twocolumn,twoside]{scrartcl}')
    })

    test('should include required packages', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\usepackage{amsmath}')
      expect(latexSource).toContain('\\usepackage{geometry}')
      expect(latexSource).toContain('\\usepackage{hyperref}')
      expect(latexSource).toContain('\\usepackage{needspace}')
    })

    test('should configure geometry with compact margins', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('top=15mm')
      expect(latexSource).toContain('bottom=15mm')
      expect(latexSource).toContain('left=12mm')
      expect(latexSource).toContain('right=12mm')
      expect(latexSource).toContain('columnsep=6mm')
    })

    test('should set compact typography settings', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\setstretch{1.2}')
      expect(latexSource).toContain('\\setlength{\\parskip}{0.3em}')
      expect(latexSource).toContain('itemsep=0.2em')
    })

    test('should include widow and orphan control', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\clubpenalty=10000')
      expect(latexSource).toContain('\\widowpenalty=10000')
      expect(latexSource).toContain('\\needspace')
    })

    test('should generate custom commands for academic content', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\newcommand{\\partTitle}')
      expect(latexSource).toContain('\\newcommand{\\sectionTitle}')
      expect(latexSource).toContain('\\newenvironment{workedexample}')
      expect(latexSource).toContain('\\newcommand{\\keyformula}')
    })
  })

  describe('Content Generation', () => {
    test('should generate document title', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\title{Compact Study Guide: Discrete Probability}')
      expect(latexSource).toContain('\\maketitle')
    })

    test('should generate table of contents', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\tableofcontents')
    })

    test('should generate parts with Roman numerals', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\partTitle{Part I: Discrete Probability}')
    })

    test('should generate sections with proper numbering', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\sectionTitle{Probability Basics}{1_1}')
    })

    test('should generate formulas with labels', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\keyformula{P(A) = \\frac{|A|}{|S|}}{formula_1}')
    })

    test('should generate worked examples with solution steps', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\begin{workedexample}{Coin Flip Probability}{example_1}')
      expect(latexSource).toContain('\\textbf{Problem:}')
      expect(latexSource).toContain('\\textbf{Solution:}')
      expect(latexSource).toContain('\\solutionstep{Identify the sample space}')
      expect(latexSource).toContain('\\[S = \\{H, T\\}\\]')
      expect(latexSource).toContain('\\end{workedexample}')
    })
  })

  describe('LaTeX Escaping', () => {
    test('should escape special LaTeX characters', () => {
      const testText = 'Test & symbols: $ % # ^ _ ~ \\ { }'
      const escaped = (generator as any).escapeLaTeX(testText)
      
      expect(escaped).toContain('\\&')
      expect(escaped).toContain('\\$')
      expect(escaped).toContain('\\%')
      expect(escaped).toContain('\\#')
      expect(escaped).toContain('\\textasciicircum ')
      expect(escaped).toContain('\\_')
      expect(escaped).toContain('\\textasciitilde ')
      expect(escaped).toContain('\\textbackslash ')
      expect(escaped).toContain('\\{')
      expect(escaped).toContain('\\}')
    })

    test('should process markdown-style formatting', () => {
      const testContent = '**bold text** and *italic text* and `code text`'
      const processed = (generator as any).processContent(testContent)
      
      expect(processed).toContain('\\textbf{bold text}')
      expect(processed).toContain('\\textit{italic text}')
      expect(processed).toContain('\\texttt{code text}')
    })

    test('should handle content with special characters after markdown processing', () => {
      const testContent = '**bold & special** text with $ symbols'
      const processed = (generator as any).processContent(testContent)
      
      expect(processed).toContain('\\textbf{bold \\& special}')
      expect(processed).toContain('\\$')
    })
  })

  describe('Roman Numeral Conversion', () => {
    test('should convert numbers to Roman numerals correctly', () => {
      expect((generator as any).toRoman(1)).toBe('I')
      expect((generator as any).toRoman(2)).toBe('II')
      expect((generator as any).toRoman(3)).toBe('III')
      expect((generator as any).toRoman(4)).toBe('IV')
      expect((generator as any).toRoman(5)).toBe('V')
      expect((generator as any).toRoman(9)).toBe('IX')
      expect((generator as any).toRoman(10)).toBe('X')
    })
  })

  describe('Configuration Variations', () => {
    test('should handle letter paper size', () => {
      const letterConfig = { ...mockConfig, paperSize: 'letter' as const }
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, letterConfig)
      
      expect(latexSource).toContain('\\documentclass[10pt,letterpaper,twocolumn,twoside]{scrartcl}')
    })

    test('should handle different font sizes', () => {
      const largeConfig = { ...mockConfig, typography: { ...mockConfig.typography, fontSize: 12 } }
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, largeConfig)
      
      expect(latexSource).toContain('\\documentclass[12pt,a4paper,twocolumn,twoside]{scrartcl}')
    })

    test('should handle different line heights', () => {
      const tightConfig = { ...mockConfig, typography: { ...mockConfig.typography, lineHeight: 1.1 } }
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, tightConfig)
      
      expect(latexSource).toContain('\\setstretch{1.1}')
    })

    test('should handle different spacing configurations', () => {
      const tightSpacing = {
        ...mockConfig,
        spacing: {
          paragraphSpacing: 0.2,
          listSpacing: 0.1,
          sectionSpacing: 0.3,
          headingMargins: { top: 0.2, bottom: 0.1 }
        }
      }
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, tightSpacing)
      
      expect(latexSource).toContain('\\setlength{\\parskip}{0.2em}')
      expect(latexSource).toContain('itemsep=0.1em')
    })
  })

  describe('Page Break Optimization', () => {
    test('should include page break prevention for examples', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\keepexample')
      expect(latexSource).toContain('\\needspace{3\\baselineskip}')
    })

    test('should include page break prevention for formulas', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\keepformula')
      expect(latexSource).toContain('\\needspace{2\\baselineskip}')
    })

    test('should set appropriate penalties for widow/orphan control', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\clubpenalty=10000')
      expect(latexSource).toContain('\\widowpenalty=10000')
      expect(latexSource).toContain('\\displaywidowpenalty=10000')
    })
  })

  describe('Math Rendering Configuration', () => {
    test('should configure equation numbering when enabled', () => {
      const numberedConfig = {
        ...mockConfig,
        mathRendering: {
          ...mockConfig.mathRendering,
          displayEquations: {
            ...mockConfig.mathRendering.displayEquations,
            numbered: true
          }
        }
      }
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, numberedConfig)
      
      expect(latexSource).toContain('\\numberwithin{equation}{section}')
    })

    test('should set compact display equation spacing', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\setlength{\\abovedisplayskip}{0.5em}')
      expect(latexSource).toContain('\\setlength{\\belowdisplayskip}{0.5em}')
    })

    test('should define theorem environments', () => {
      const latexSource = (generator as any).generateLaTeXSource(mockDocument, mockConfig)
      
      expect(latexSource).toContain('\\newtheorem{definition}{Definition}[section]')
      expect(latexSource).toContain('\\newtheorem{theorem}{Theorem}[section]')
      expect(latexSource).toContain('\\newtheorem{example}{Example}[section]')
    })
  })

  describe('Error Handling', () => {
    test('should handle empty document gracefully', () => {
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
      }

      expect(() => {
        (generator as any).generateLaTeXSource(emptyDocument, mockConfig)
      }).not.toThrow()
    })

    test('should handle sections without formulas or examples', () => {
      const simpleSection: AcademicSection = {
        sectionNumber: '1.1',
        title: 'Simple Section',
        content: 'Just some text content.',
        formulas: [],
        examples: [],
        subsections: []
      }

      const simplePart: DocumentPart = {
        partNumber: 1,
        title: 'Simple Part',
        sections: [simpleSection]
      }

      const simpleDocument: AcademicDocument = {
        ...mockDocument,
        parts: [simplePart]
      }

      expect(() => {
        (generator as any).generateLaTeXSource(simpleDocument, mockConfig)
      }).not.toThrow()
    })
  })

  describe('PDF Page Count Extraction', () => {
    test('should extract page count from PDF buffer', async () => {
      // Mock PDF buffer with page count information
      const mockPdfBuffer = Buffer.from(`
        %PDF-1.4
        1 0 obj
        <<
        /Type /Catalog
        /Pages 2 0 R
        >>
        endobj
        2 0 obj
        <<
        /Type /Pages
        /Count 3
        /Kids [3 0 R 4 0 R 5 0 R]
        >>
        endobj
      `)

      const pageCount = await (generator as any).getPageCount(mockPdfBuffer)
      expect(pageCount).toBe(3)
    })

    test('should fallback to 1 for invalid PDF', async () => {
      const invalidBuffer = Buffer.from('not a pdf')
      const pageCount = await (generator as any).getPageCount(invalidBuffer)
      expect(pageCount).toBe(1)
    })
  })
})