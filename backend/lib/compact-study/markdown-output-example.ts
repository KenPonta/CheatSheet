// Example usage of Markdown Output Generator for Compact Study Materials

import {
  MarkdownOutputGenerator,
  createMarkdownOutputGenerator,
  generateCompactMarkdown
} from './markdown-output-generator';
import {
  AcademicDocument,
  MarkdownGeneratorConfig,
  CompactLayoutConfig,
  PandocConfig
} from './types';

/**
 * Example: Basic Markdown generation with default settings
 */
export function basicMarkdownExample(document: AcademicDocument) {
  console.log('=== Basic Markdown Generation ===');
  
  // Use convenience function with defaults
  const result = generateCompactMarkdown(document);
  
  console.log('Generated markdown length:', result.markdown.length);
  console.log('Has Pandoc template:', !!result.pandocTemplate);
  console.log('Preservation score:', result.metadata.preservationScore);
  
  return result;
}

/**
 * Example: Custom configuration for different math renderers
 */
export function customMathRenderingExample(document: AcademicDocument) {
  console.log('=== Custom Math Rendering ===');
  
  // Configuration for LaTeX delimiters
  const latexConfig: MarkdownGeneratorConfig = {
    includeFrontMatter: true,
    includeTableOfContents: true,
    mathDelimiters: 'latex',
    codeBlocks: true,
    preserveLineBreaks: false,
    pandocCompatible: true,
    generateTemplate: true
  };
  
  const latexResult = generateCompactMarkdown(document, latexConfig);
  console.log('LaTeX delimiters example:');
  console.log(latexResult.markdown.substring(0, 500) + '...');
  
  // Configuration for GitHub-style math
  const githubConfig: MarkdownGeneratorConfig = {
    ...latexConfig,
    mathDelimiters: 'github',
    pandocCompatible: false
  };
  
  const githubResult = generateCompactMarkdown(document, githubConfig);
  console.log('\nGitHub math blocks example:');
  console.log(githubResult.markdown.substring(0, 500) + '...');
  
  return { latexResult, githubResult };
}

/**
 * Example: Compact layout configuration for different paper sizes
 */
export function compactLayoutExample(document: AcademicDocument) {
  console.log('=== Compact Layout Configuration ===');
  
  // Ultra-compact configuration for maximum density
  const ultraCompactLayout: CompactLayoutConfig = {
    paperSize: 'a4',
    columns: 3, // Three columns for maximum density
    typography: {
      fontSize: 9, // Smaller font
      lineHeight: 1.1, // Tighter line spacing
      fontFamily: {
        body: 'Times, serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern',
        code: 'Consolas, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 0.2, // Minimal paragraph spacing
      listSpacing: 0.15, // Minimal list spacing
      sectionSpacing: 0.6,
      headingMargins: {
        top: 0.3,
        bottom: 0.2
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
  
  const result = generateCompactMarkdown(document, undefined, ultraCompactLayout);
  
  console.log('Ultra-compact configuration applied');
  console.log('Estimated pages:', result.metadata.stats.estimatedPrintPages);
  console.log('Font size in template:', ultraCompactLayout.typography.fontSize + 'pt');
  
  return result;
}

/**
 * Example: Custom Pandoc configuration for specific output needs
 */
export function customPandocExample(document: AcademicDocument) {
  console.log('=== Custom Pandoc Configuration ===');
  
  const customPandocConfig: PandocConfig = {
    template: 'custom',
    mathRenderer: 'katex', // Use KaTeX instead of MathJax
    citationStyle: 'ieee',
    variables: {
      'geometry': 'margin=12mm,columnsep=5mm',
      'fontsize': '9pt',
      'linestretch': '1.1',
      'documentclass': 'article',
      'classoption': ['twocolumn', 'twoside'],
      'mainfont': 'Times New Roman',
      'mathfont': 'Latin Modern Math'
    }
  };
  
  const result = generateCompactMarkdown(document, undefined, undefined, customPandocConfig);
  
  console.log('Custom Pandoc template generated');
  console.log('Math renderer:', customPandocConfig.mathRenderer);
  console.log('Template variables:', Object.keys(customPandocConfig.variables));
  
  return result;
}

/**
 * Example: Minimal configuration for web-only output
 */
export function webOnlyExample(document: AcademicDocument) {
  console.log('=== Web-Only Configuration ===');
  
  const webConfig: MarkdownGeneratorConfig = {
    includeFrontMatter: false, // No YAML front matter
    includeTableOfContents: true,
    mathDelimiters: 'github', // GitHub-compatible math
    codeBlocks: true,
    preserveLineBreaks: true, // Better for web display
    pandocCompatible: false, // Not targeting Pandoc
    generateTemplate: false // No LaTeX template needed
  };
  
  const result = generateCompactMarkdown(document, webConfig);
  
  console.log('Web-optimized markdown generated');
  console.log('No front matter:', !result.frontMatter);
  console.log('No Pandoc template:', !result.pandocTemplate);
  
  return result;
}

/**
 * Example: Generate multiple formats for comparison
 */
export function multiFormatExample(document: AcademicDocument) {
  console.log('=== Multi-Format Generation ===');
  
  // Standard Pandoc format
  const pandocResult = generateCompactMarkdown(document, {
    includeFrontMatter: true,
    includeTableOfContents: true,
    mathDelimiters: 'pandoc',
    codeBlocks: true,
    preserveLineBreaks: false,
    pandocCompatible: true,
    generateTemplate: true
  });
  
  // GitHub format
  const githubResult = generateCompactMarkdown(document, {
    includeFrontMatter: false,
    includeTableOfContents: true,
    mathDelimiters: 'github',
    codeBlocks: true,
    preserveLineBreaks: true,
    pandocCompatible: false,
    generateTemplate: false
  });
  
  // LaTeX format
  const latexResult = generateCompactMarkdown(document, {
    includeFrontMatter: true,
    includeTableOfContents: true,
    mathDelimiters: 'latex',
    codeBlocks: true,
    preserveLineBreaks: false,
    pandocCompatible: true,
    generateTemplate: true
  });
  
  console.log('Generated formats:');
  console.log('- Pandoc:', pandocResult.markdown.length, 'chars');
  console.log('- GitHub:', githubResult.markdown.length, 'chars');
  console.log('- LaTeX:', latexResult.markdown.length, 'chars');
  
  return {
    pandoc: pandocResult,
    github: githubResult,
    latex: latexResult
  };
}

/**
 * Example: Save markdown files to disk
 */
export async function saveMarkdownExample(document: AcademicDocument, outputDir: string) {
  console.log('=== Save Markdown Files ===');
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Generate different formats
  const formats = multiFormatExample(document);
  
  // Save each format
  for (const [formatName, result] of Object.entries(formats)) {
    const filename = `study_compact_${formatName}.md`;
    const filepath = path.join(outputDir, filename);
    
    await fs.writeFile(filepath, result.markdown, 'utf8');
    console.log(`Saved ${formatName} format to:`, filepath);
    
    // Save Pandoc template if available
    if (result.pandocTemplate) {
      const templatePath = path.join(outputDir, `template_${formatName}.tex`);
      await fs.writeFile(templatePath, result.pandocTemplate, 'utf8');
      console.log(`Saved ${formatName} template to:`, templatePath);
    }
  }
  
  return outputDir;
}

/**
 * Example: Create generator instance for reuse
 */
export function reusableGeneratorExample() {
  console.log('=== Reusable Generator Instance ===');
  
  // Create generator with specific configuration
  const generator = createMarkdownOutputGenerator(
    {
      includeFrontMatter: true,
      includeTableOfContents: true,
      mathDelimiters: 'pandoc',
      codeBlocks: true,
      preserveLineBreaks: false,
      pandocCompatible: true,
      generateTemplate: true
    },
    {
      paperSize: 'a4',
      columns: 2,
      typography: {
        fontSize: 10,
        lineHeight: 1.2,
        fontFamily: {
          body: 'Times, serif',
          heading: 'Arial, sans-serif',
          math: 'Computer Modern',
          code: 'Consolas, monospace'
        }
      },
      spacing: {
        paragraphSpacing: 0.3,
        listSpacing: 0.2,
        sectionSpacing: 0.8,
        headingMargins: {
          top: 0.4,
          bottom: 0.3
        }
      },
      margins: {
        top: 15,
        bottom: 15,
        left: 15,
        right: 15,
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
    }
  );
  
  console.log('Generator created and ready for reuse');
  
  return generator;
}

/**
 * Example: Performance comparison
 */
export function performanceExample(documents: AcademicDocument[]) {
  console.log('=== Performance Comparison ===');
  
  const startTime = Date.now();
  
  const results = documents.map((doc, index) => {
    const docStartTime = Date.now();
    const result = generateCompactMarkdown(doc);
    const docEndTime = Date.now();
    
    console.log(`Document ${index + 1}: ${docEndTime - docStartTime}ms`);
    return result;
  });
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`Total processing time: ${totalTime}ms`);
  console.log(`Average per document: ${totalTime / documents.length}ms`);
  console.log(`Documents processed: ${documents.length}`);
  
  return results;
}

// Export all examples for easy access
export const MarkdownExamples = {
  basic: basicMarkdownExample,
  customMath: customMathRenderingExample,
  compactLayout: compactLayoutExample,
  customPandoc: customPandocExample,
  webOnly: webOnlyExample,
  multiFormat: multiFormatExample,
  save: saveMarkdownExample,
  reusableGenerator: reusableGeneratorExample,
  performance: performanceExample
};

export default MarkdownExamples;