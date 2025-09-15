// Example usage of HTML Output Generator for Compact Study Materials

import {
  HTMLOutputGenerator,
  createHTMLOutputGenerator,
  generateCompactHTML
} from './html-output-generator';
import {
  AcademicDocument,
  HTMLGeneratorConfig,
  CompactLayoutConfig
} from './types';

/**
 * Example: Generate HTML from academic document with default settings
 */
export function generateBasicHTML(document: AcademicDocument) {
  console.log('Generating HTML with default compact settings...');
  
  const result = generateCompactHTML(document);
  
  console.log(`Generated HTML document with:
  - ${result.metadata.stats.totalSections} sections
  - ${result.metadata.stats.totalFormulas} formulas  
  - ${result.metadata.stats.totalExamples} examples
  - Estimated ${result.metadata.stats.estimatedPrintPages} print pages
  - Preservation score: ${result.metadata.preservationScore}`);
  
  return result;
}

/**
 * Example: Generate HTML with custom configuration
 */
export function generateCustomHTML(document: AcademicDocument) {
  console.log('Generating HTML with custom configuration...');
  
  // Custom HTML generator configuration
  const htmlConfig: HTMLGeneratorConfig = {
    includeTableOfContents: true,
    includeMathJax: true,
    compactMode: true,
    removeCardComponents: true,
    generateResponsive: true,
    customCSS: `
      /* Additional custom styles */
      .document-title {
        color: #2c3e50;
        border-bottom: 3px solid #3498db;
      }
      
      .formula-display {
        background: #f8f9fa;
        padding: 0.5em;
        border-radius: 4px;
      }
    `
  };
  
  // Custom layout configuration for ultra-compact mode
  const layoutConfig: CompactLayoutConfig = {
    paperSize: 'a4',
    columns: 3, // Three columns for maximum density
    typography: {
      fontSize: 9, // Smaller font for more content
      lineHeight: 1.1, // Tighter line spacing
      fontFamily: {
        body: 'Arial, sans-serif',
        heading: 'Arial Black, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Consolas, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 0.2, // Minimal paragraph spacing
      listSpacing: 0.1, // Minimal list spacing
      sectionSpacing: 0.5,
      headingMargins: {
        top: 0.2,
        bottom: 0.15
      }
    },
    margins: {
      top: 10, // Smaller margins
      bottom: 10,
      left: 10,
      right: 10,
      columnGap: 4 // Smaller column gap
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 1.2
      }
    }
  };
  
  const generator = createHTMLOutputGenerator(htmlConfig, layoutConfig);
  const result = generator.generateHTML(document);
  
  console.log(`Generated ultra-compact HTML with 3-column layout`);
  
  return result;
}

/**
 * Example: Generate print-optimized HTML
 */
export function generatePrintOptimizedHTML(document: AcademicDocument) {
  console.log('Generating print-optimized HTML...');
  
  const htmlConfig: HTMLGeneratorConfig = {
    includeTableOfContents: true,
    includeMathJax: false, // Disable MathJax for print
    compactMode: true,
    removeCardComponents: true,
    generateResponsive: false // No responsive design for print
  };
  
  const layoutConfig: CompactLayoutConfig = {
    paperSize: 'a4',
    columns: 2,
    typography: {
      fontSize: 10,
      lineHeight: 1.15,
      fontFamily: {
        body: 'Times, "Times New Roman", serif', // Better for print
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Courier, monospace'
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
      top: 20, // Larger margins for print
      bottom: 20,
      left: 20,
      right: 20,
      columnGap: 8
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: false // Avoid column overflow in print
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 1.3
      }
    }
  };
  
  const generator = createHTMLOutputGenerator(htmlConfig, layoutConfig);
  const result = generator.generateHTML(document);
  
  console.log(`Generated print-optimized HTML without MathJax`);
  
  return result;
}

/**
 * Example: Save HTML output to files
 */
export function saveHTMLOutput(
  document: AcademicDocument, 
  outputPath: string = './study_compact'
) {
  const fs = require('fs');
  const path = require('path');
  
  console.log(`Saving HTML output to ${outputPath}...`);
  
  const result = generateCompactHTML(document);
  
  // Save HTML file
  const htmlPath = `${outputPath}.html`;
  fs.writeFileSync(htmlPath, result.html, 'utf8');
  
  // Save standalone CSS file
  const cssPath = `${outputPath}.css`;
  fs.writeFileSync(cssPath, result.css, 'utf8');
  
  // Save metadata as JSON
  const metadataPath = `${outputPath}_metadata.json`;
  fs.writeFileSync(metadataPath, JSON.stringify(result.metadata, null, 2), 'utf8');
  
  console.log(`Files saved:
  - HTML: ${htmlPath}
  - CSS: ${cssPath}
  - Metadata: ${metadataPath}`);
  
  return {
    htmlPath,
    cssPath,
    metadataPath,
    result
  };
}

/**
 * Example: Create sample academic document for testing
 */
export function createSampleDocument(): AcademicDocument {
  return {
    title: 'Discrete Mathematics Study Guide',
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
        title: 'Relations',
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
            content: 'Probability measures the likelihood of events occurring. The sample space S contains all possible outcomes.',
            formulas: [
              {
                id: 'basic-prob',
                latex: 'P(A) = \\frac{|A|}{|S|}',
                context: 'Basic probability formula for equally likely outcomes',
                type: 'display',
                sourceLocation: { fileId: 'sample', page: 1 },
                isKeyFormula: true,
                confidence: 0.95
              }
            ],
            examples: [
              {
                id: 'coin-example',
                title: 'Fair Coin Probability',
                problem: 'Calculate the probability of getting heads in a single coin flip.',
                solution: [
                  {
                    stepNumber: 1,
                    description: 'Identify the sample space',
                    explanation: 'All possible outcomes when flipping a coin',
                    formula: 'S = \\{H, T\\}'
                  },
                  {
                    stepNumber: 2,
                    description: 'Apply the probability formula',
                    explanation: 'One favorable outcome out of two total outcomes',
                    formula: 'P(H) = \\frac{1}{2} = 0.5'
                  }
                ],
                sourceLocation: { fileId: 'sample', page: 1 },
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
      generatedAt: new Date(),
      sourceFiles: ['sample.pdf'],
      totalSections: 1,
      totalFormulas: 1,
      totalExamples: 1,
      preservationScore: 0.95
    }
  };
}

/**
 * Example: Run all HTML generation examples
 */
export function runAllExamples() {
  console.log('=== HTML Output Generator Examples ===\n');
  
  const sampleDoc = createSampleDocument();
  
  // Example 1: Basic HTML generation
  console.log('1. Basic HTML Generation:');
  const basic = generateBasicHTML(sampleDoc);
  console.log(`   Generated ${basic.html.length} characters of HTML\n`);
  
  // Example 2: Custom configuration
  console.log('2. Custom Configuration:');
  const custom = generateCustomHTML(sampleDoc);
  console.log(`   Generated ${custom.html.length} characters of HTML with 3 columns\n`);
  
  // Example 3: Print-optimized
  console.log('3. Print-Optimized:');
  const print = generatePrintOptimizedHTML(sampleDoc);
  console.log(`   Generated ${print.html.length} characters of print-ready HTML\n`);
  
  // Example 4: Save to files (commented out to avoid file system operations)
  // console.log('4. Save to Files:');
  // const saved = saveHTMLOutput(sampleDoc, './example_output/study_guide');
  
  console.log('=== Examples Complete ===');
  
  return {
    basic,
    custom,
    print,
    sampleDoc
  };
}

// Export for use in other modules
export default {
  generateBasicHTML,
  generateCustomHTML,
  generatePrintOptimizedHTML,
  saveHTMLOutput,
  createSampleDocument,
  runAllExamples
};