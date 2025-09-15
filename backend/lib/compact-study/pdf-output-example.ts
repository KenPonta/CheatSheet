/**
 * Example usage of the PDF Output Generator for compact study materials
 */

import { PDFOutputGenerator } from './pdf-output-generator';
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
} from './types';

async function generateCompactStudyPDF() {
  // Create PDF generator
  const pdfGenerator = new PDFOutputGenerator();

  // Create sample mathematical content
  const probabilityFormula: Formula = {
    id: 'basic_probability',
    latex: 'P(A) = \\frac{|A|}{|S|}',
    context: 'Basic probability formula',
    type: 'display',
    sourceLocation: {
      fileId: 'probability_notes.pdf',
      page: 1,
      section: '1.1'
    },
    isKeyFormula: true,
    confidence: 0.98
  };

  const coinExample: WorkedExample = {
    id: 'coin_flip_example',
    title: 'Fair Coin Probability',
    problem: 'What is the probability of getting heads when flipping a fair coin?',
    solution: [
      {
        stepNumber: 1,
        description: 'Identify the sample space',
        formula: 'S = \\{H, T\\}',
        explanation: 'A fair coin has two equally likely outcomes: heads (H) and tails (T)'
      },
      {
        stepNumber: 2,
        description: 'Apply the basic probability formula',
        formula: 'P(H) = \\frac{|\\{H\\}|}{|\\{H, T\\}|} = \\frac{1}{2}',
        explanation: 'There is 1 favorable outcome (heads) out of 2 total possible outcomes'
      }
    ],
    sourceLocation: {
      fileId: 'probability_notes.pdf',
      page: 2,
      section: '1.1'
    },
    subtopic: 'Basic Probability',
    confidence: 0.95,
    isComplete: true
  };

  // Create academic section
  const probabilitySection: AcademicSection = {
    sectionNumber: '1.1',
    title: 'Probability Basics',
    content: 'Probability theory provides a mathematical framework for analyzing random events. The **fundamental concept** is the probability of an event, which quantifies the likelihood of that event occurring.',
    formulas: [probabilityFormula],
    examples: [coinExample],
    subsections: []
  };

  // Create document part
  const probabilityPart: DocumentPart = {
    partNumber: 1,
    title: 'Discrete Probability',
    sections: [probabilitySection]
  };

  // Create table of contents
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
          children: []
        }
      ]
    }
  ];

  // Create document metadata
  const metadata: DocumentMetadata = {
    generatedAt: new Date(),
    sourceFiles: ['probability_notes.pdf'],
    totalSections: 1,
    totalFormulas: 1,
    totalExamples: 1,
    preservationScore: 0.95
  };

  // Create academic document
  const document: AcademicDocument = {
    title: 'Compact Study Guide: Discrete Probability',
    tableOfContents,
    parts: [probabilityPart],
    crossReferences: [],
    appendices: [],
    metadata
  };

  // Create compact layout configuration
  const compactConfig: CompactLayoutConfig = {
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
  };

  try {
    // Generate PDF with LaTeX source included
    console.log('Generating compact study PDF...');
    const pdfOutput = await pdfGenerator.generatePDF(document, compactConfig, {
      includeSource: true,
      engine: 'pdflatex',
      timeout: 30000
    });

    console.log('PDF generated successfully!');
    console.log(`- File size: ${(pdfOutput.buffer.length / 1024).toFixed(1)} KB`);
    console.log(`- Page count: ${pdfOutput.pageCount}`);
    console.log(`- Preservation score: ${pdfOutput.metadata.preservationScore}`);
    console.log(`- Total formulas: ${pdfOutput.metadata.stats.totalFormulas}`);
    console.log(`- Total examples: ${pdfOutput.metadata.stats.totalExamples}`);

    // Save PDF to file (in a real application)
    // await fs.writeFile('compact_study_guide.pdf', pdfOutput.buffer);

    // Optionally save LaTeX source for debugging
    if (pdfOutput.latexSource) {
      console.log('\nLaTeX source generated (first 500 characters):');
      console.log(pdfOutput.latexSource.substring(0, 500) + '...');
      // await fs.writeFile('compact_study_guide.tex', pdfOutput.latexSource);
    }

    return pdfOutput;

  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

// Example with different configurations
async function generateWithDifferentConfigs() {
  const pdfGenerator = new PDFOutputGenerator();

  // Create a minimal document for testing different configs
  const minimalDocument: AcademicDocument = {
    title: 'Configuration Test',
    tableOfContents: [],
    parts: [{
      partNumber: 1,
      title: 'Test Part',
      sections: [{
        sectionNumber: '1.1',
        title: 'Test Section',
        content: 'This is a test section with **bold** and *italic* text.',
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

  // Test different paper sizes and configurations
  const configs = [
    {
      name: 'A4 Portrait, 2 columns, 10pt',
      config: {
        paperSize: 'a4' as const,
        columns: 2 as const,
        typography: { fontSize: 10, lineHeight: 1.2, fontFamily: { body: 'Times', heading: 'Arial', math: 'Computer Modern', code: 'Courier' } },
        spacing: { paragraphSpacing: 0.3, listSpacing: 0.2, sectionSpacing: 0.5, headingMargins: { top: 0.4, bottom: 0.2 } },
        margins: { top: 15, bottom: 15, left: 12, right: 12, columnGap: 6 },
        mathRendering: { displayEquations: { centered: true, numbered: true, fullWidth: false }, inlineEquations: { preserveInline: true, maxHeight: 12 } }
      }
    },
    {
      name: 'Letter Portrait, 1 column, 11pt',
      config: {
        paperSize: 'letter' as const,
        columns: 1 as const,
        typography: { fontSize: 11, lineHeight: 1.25, fontFamily: { body: 'Times', heading: 'Arial', math: 'Computer Modern', code: 'Courier' } },
        spacing: { paragraphSpacing: 0.4, listSpacing: 0.25, sectionSpacing: 0.6, headingMargins: { top: 0.5, bottom: 0.25 } },
        margins: { top: 20, bottom: 20, left: 15, right: 15, columnGap: 0 },
        mathRendering: { displayEquations: { centered: true, numbered: false, fullWidth: false }, inlineEquations: { preserveInline: true, maxHeight: 14 } }
      }
    }
  ];

  for (const { name, config } of configs) {
    try {
      console.log(`\nGenerating PDF with configuration: ${name}`);
      const result = await pdfGenerator.generatePDF(minimalDocument, config);
      console.log(`✓ Success - ${result.pageCount} page(s), ${(result.buffer.length / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.error(`✗ Failed: ${error.message}`);
    }
  }
}

// Export example functions
export {
  generateCompactStudyPDF,
  generateWithDifferentConfigs
};

// Run example if this file is executed directly
if (require.main === module) {
  generateCompactStudyPDF()
    .then(() => console.log('\nExample completed successfully!'))
    .catch(error => console.error('\nExample failed:', error));
}