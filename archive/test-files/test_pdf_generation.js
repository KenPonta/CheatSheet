const { PDFOutputGenerator } = require('./backend/lib/compact-study/pdf-output-generator.ts');

// Create a simple test document
const testDocument = {
  title: 'Test Document',
  parts: [{
    partNumber: 1,
    title: 'Test Part',
    sections: [{
      sectionNumber: '1.1',
      title: 'Test Section',
      content: 'This is a test section with some content.',
      formulas: [{
        id: 'test-formula',
        latex: 'E = mc^2',
        text: 'E = mc^2'
      }],
      examples: [{
        id: 'test-example',
        title: 'Test Example',
        problem: 'What is 2 + 2?',
        solution: '2 + 2 = 4'
      }],
      subsections: []
    }]
  }],
  crossReferences: [],
  appendices: [],
  metadata: {
    generatedAt: new Date(),
    sourceFiles: ['test.pdf'],
    totalSections: 1,
    totalFormulas: 1,
    totalExamples: 1,
    preservationScore: 1.0
  }
};

const layoutConfig = {
  paperSize: 'a4',
  columns: 2,
  typography: {
    fontSize: 10,
    lineHeight: 1.2,
    fontFamily: {
      body: 'Times, serif',
      heading: 'Arial, sans-serif',
      math: 'Computer Modern, serif',
      code: 'Courier, monospace'
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
    top: 20,
    bottom: 20,
    left: 15,
    right: 15,
    columnGap: 10
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

async function testPDFGeneration() {
  try {
    console.log('🔄 Testing PDF generation...');
    
    const generator = new PDFOutputGenerator();
    const result = await generator.generatePDF(testDocument, layoutConfig, {
      includeSource: false,
      timeout: 60000,
      engine: 'pdflatex'
    });
    
    console.log('✅ PDF generation successful!');
    console.log(`📄 Generated PDF: ${result.buffer.length} bytes, ${result.pageCount} pages`);
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
  }
}

testPDFGeneration();