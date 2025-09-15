// HTML Output Generator for Compact Study Materials
// Generates HTML with compact CSS and MathJax configuration

import {
  AcademicDocument,
  HTMLOutput,
  HTMLGeneratorConfig,
  CompactLayoutConfig,
  MathJaxConfig,
  OutputMetadata,
  Formula,
  WorkedExample,
  AcademicSection,
  DocumentPart,
  TOCEntry
} from './types';

export class HTMLOutputGenerator {
  private config: HTMLGeneratorConfig;
  private layoutConfig: CompactLayoutConfig;

  constructor(
    config: HTMLGeneratorConfig = {
      includeTableOfContents: true,
      includeMathJax: true,
      compactMode: true,
      removeCardComponents: true,
      generateResponsive: true
    },
    layoutConfig?: CompactLayoutConfig
  ) {
    this.config = config;
    this.layoutConfig = layoutConfig || this.getDefaultLayoutConfig();
  }

  /**
   * Generate HTML output from academic document
   */
  public generateHTML(document: AcademicDocument): HTMLOutput {
    const html = this.buildHTMLDocument(document);
    const css = this.generateCompactCSS();
    const mathJaxConfig = this.generateMathJaxConfig();
    const metadata = this.generateMetadata(document, 'html');

    return {
      html,
      css,
      mathJaxConfig,
      metadata
    };
  }

  /**
   * Build complete HTML document structure
   */
  private buildHTMLDocument(document: AcademicDocument): string {
    const head = this.generateHTMLHead(document);
    const body = this.generateHTMLBody(document);

    return `<!DOCTYPE html>
<html lang="en">
${head}
${body}
</html>`;
  }

  /**
   * Generate HTML head section with styles and MathJax
   */
  private generateHTMLHead(document: AcademicDocument): string {
    const title = document.title || 'Compact Study Guide';
    const css = this.generateCompactCSS();
    const mathJaxScript = this.config.includeMathJax ? this.generateMathJaxScript() : '';

    return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
${css}
  </style>
${mathJaxScript}
</head>`;
  }

  /**
   * Generate HTML body with academic content
   */
  private generateHTMLBody(document: AcademicDocument): string {
    const header = this.generateHeader(document);
    const tableOfContents = this.config.includeTableOfContents && document.tableOfContents.length > 0 ? 
      this.generateTableOfContents(document.tableOfContents) : '';
    const content = this.generateMainContent(document);

    return `<body>
  <div class="document-container">
${header}
${tableOfContents}
${content}
  </div>
</body>`;
  }

  /**
   * Generate document header
   */
  private generateHeader(document: AcademicDocument): string {
    const title = document.title || 'Compact Study Guide';
    const generatedDate = document.metadata?.generatedAt ? 
      document.metadata.generatedAt.toLocaleDateString() : 
      new Date().toLocaleDateString();

    return `    <header class="document-header">
      <h1 class="document-title">${this.escapeHtml(title)}</h1>
      <div class="document-meta">
        <span class="generated-date">Generated: ${generatedDate}</span>
        <span class="stats">
          ${document.metadata?.totalSections || 0} sections • 
          ${document.metadata?.totalFormulas || 0} formulas • 
          ${document.metadata?.totalExamples || 0} examples
        </span>
      </div>
    </header>`;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(tocEntries: TOCEntry[]): string {
    if (!tocEntries.length) return '';

    const tocItems = tocEntries.map(entry => this.generateTOCItem(entry)).join('\n');

    return `    <nav class="table-of-contents">
      <h2 class="toc-title">Contents</h2>
      <ul class="toc-list">
${tocItems}
      </ul>
    </nav>`;
  }

  /**
   * Generate individual TOC item
   */
  private generateTOCItem(entry: TOCEntry, level: number = 0): string {
    const indent = '  '.repeat(level + 2);
    const sectionNumber = entry.sectionNumber ? `${entry.sectionNumber} ` : '';
    const children = entry.children.length > 0 ? 
      `\n${indent}  <ul class="toc-sublist">\n${entry.children.map(child => 
        this.generateTOCItem(child, level + 1)).join('\n')}\n${indent}  </ul>` : '';

    return `${indent}<li class="toc-item toc-level-${level}">
${indent}  <a href="#${entry.pageAnchor}" class="toc-link">
${indent}    <span class="toc-number">${sectionNumber}</span>
${indent}    <span class="toc-title">${this.escapeHtml(entry.title)}</span>
${indent}  </a>${children}
${indent}</li>`;
  }

  /**
   * Generate main document content
   */
  private generateMainContent(document: AcademicDocument): string {
    const parts = document.parts.map(part => this.generateDocumentPart(part)).join('\n\n');

    return `    <main class="document-content">
      <div class="content-columns">
${parts}
      </div>
    </main>`;
  }

  /**
   * Generate document part (Part I, Part II, etc.)
   */
  private generateDocumentPart(part: DocumentPart): string {
    const partTitle = `Part ${part.partNumber}: ${part.title}`;
    const sections = part.sections.map(section => this.generateAcademicSection(section)).join('\n\n');

    return `        <section class="document-part" id="part-${part.partNumber}">
          <h2 class="part-title">${this.escapeHtml(partTitle)}</h2>
${sections}
        </section>`;
  }

  /**
   * Generate academic section
   */
  private generateAcademicSection(section: AcademicSection, level: number = 3): string {
    const sectionId = `section-${section.sectionNumber.replace('.', '-')}`;
    const headingTag = `h${Math.min(level, 6)}`;
    const sectionTitle = `${section.sectionNumber} ${section.title}`;
    
    const content = this.processContentText(section.content);
    const formulas = section.formulas.length > 0 ? 
      this.generateFormulasSection(section.formulas) : '';
    const examples = section.examples.length > 0 ? 
      this.generateExamplesSection(section.examples) : '';
    const subsections = section.subsections.length > 0 ? 
      section.subsections.map(sub => this.generateAcademicSection(sub, level + 1)).join('\n\n') : '';

    return `          <section class="academic-section section-level-${level}" id="${sectionId}">
            <${headingTag} class="section-title">${this.escapeHtml(sectionTitle)}</${headingTag}>
            <div class="section-content">
${content}
${formulas}
${examples}
${subsections}
            </div>
          </section>`;
  }

  /**
   * Generate formulas section
   */
  private generateFormulasSection(formulas: Formula[]): string {
    if (!formulas.length) return '';
    
    const formulaItems = formulas.map(formula => this.generateFormula(formula)).join('\n');

    return `              <div class="formulas-section">
${formulaItems}
              </div>`;
  }

  /**
   * Generate individual formula
   */
  private generateFormula(formula: Formula): string {
    const formulaClass = formula.type === 'display' ? 'formula-display' : 'formula-inline';
    const formulaId = `formula-${formula.id}`;
    const mathContent = formula.latex || formula.originalText || '';
    const context = formula.context ? `<div class="formula-context">${this.escapeHtml(formula.context)}</div>` : '';

    if (formula.type === 'display') {
      return `                <div class="formula ${formulaClass}" id="${formulaId}">
                  <div class="formula-content">
                    \\[${mathContent}\\]
                  </div>
${context}
                </div>`;
    } else {
      return `<span class="formula ${formulaClass}" id="${formulaId}">\\(${mathContent}\\)</span>`;
    }
  }

  /**
   * Generate examples section
   */
  private generateExamplesSection(examples: WorkedExample[]): string {
    if (!examples.length) return '';
    
    const exampleItems = examples.map(example => this.generateWorkedExample(example)).join('\n');

    return `              <div class="examples-section">
${exampleItems}
              </div>`;
  }

  /**
   * Generate worked example
   */
  private generateWorkedExample(example: WorkedExample): string {
    const exampleId = `example-${example.id}`;
    const title = example.title ? `<h4 class="example-title">${this.escapeHtml(example.title)}</h4>` : '';
    const problem = `<div class="example-problem">${this.processContentText(example.problem)}</div>`;
    const solution = this.generateSolutionSteps(example.solution);

    return `                <div class="worked-example" id="${exampleId}">
${title}
${problem}
                  <div class="example-solution">
                    <h5 class="solution-title">Solution:</h5>
${solution}
                  </div>
                </div>`;
  }

  /**
   * Generate solution steps
   */
  private generateSolutionSteps(steps: any[]): string {
    const stepItems = steps.map((step, index) => {
      const stepNumber = step.stepNumber || (index + 1);
      const description = this.processContentText(step.description);
      const formula = step.formula || step.latex ? 
        `<div class="step-formula">\\[${step.formula || step.latex}\\]</div>` : '';
      const explanation = step.explanation ? 
        `<div class="step-explanation">${this.processContentText(step.explanation)}</div>` : '';

      return `                      <div class="solution-step">
                        <div class="step-number">${stepNumber}.</div>
                        <div class="step-content">
                          <div class="step-description">${description}</div>
${formula}
${explanation}
                        </div>
                      </div>`;
    }).join('\n');

    return `                    <div class="solution-steps">
${stepItems}
                    </div>`;
  }

  /**
   * Process content text to handle inline math and formatting
   */
  private processContentText(text: string): string {
    if (!text) return '';

    // Convert inline math patterns to MathJax format
    let processed = text
      .replace(/\$([^$]+)\$/g, '\\($1\\)') // Convert $...$ to \(...\)
      .replace(/\\\[([^\]]+)\\\]/g, '\\[$1\\]') // Ensure display math is preserved
      .replace(/\\\(([^)]+)\\\)/g, '\\($1\\)'); // Ensure inline math is preserved

    // Escape HTML but preserve math delimiters
    processed = this.escapeHtml(processed)
      .replace(/\\\\?\(/g, '\\(')
      .replace(/\\\\?\)/g, '\\)')
      .replace(/\\\\?\[/g, '\\[')
      .replace(/\\\\?\]/g, '\\]');

    return `              ${processed}`;
  }

  /**
   * Generate compact CSS for dense typography and two-column layout
   */
  private generateCompactCSS(): string {
    const typography = this.layoutConfig.typography;
    const spacing = this.layoutConfig.spacing;
    const margins = this.layoutConfig.margins;

    return `/* Compact Study Guide CSS - Dense Typography & Two-Column Layout */

/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ${typography.fontFamily.body};
  font-size: ${typography.fontSize}pt;
  line-height: ${typography.lineHeight};
  color: #000;
  background: #fff;
  margin: 0;
  padding: 0;
}

/* Remove all card/box components */
.card, .box, .panel, .widget {
  display: none !important;
}

/* Document container */
.document-container {
  max-width: 100%;
  margin: 0;
  padding: ${margins.top}mm ${margins.left}mm ${margins.bottom}mm ${margins.right}mm;
}

/* Document header */
.document-header {
  margin-bottom: ${spacing.sectionSpacing}em;
  text-align: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.5em;
}

.document-title {
  font-family: ${typography.fontFamily.heading};
  font-size: 1.4em;
  font-weight: bold;
  margin-bottom: 0.25em;
}

.document-meta {
  font-size: 0.85em;
  color: #666;
}

.document-meta .stats {
  margin-left: 1em;
}

/* Table of Contents */
.table-of-contents {
  margin-bottom: ${spacing.sectionSpacing}em;
  padding: 0.5em;
  background: #f9f9f9;
  border: 1px solid #ddd;
}

.toc-title {
  font-family: ${typography.fontFamily.heading};
  font-size: 1.1em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

.toc-list, .toc-sublist {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-item {
  margin-bottom: 0.1em;
}

.toc-link {
  text-decoration: none;
  color: #333;
  display: block;
  padding: 0.1em 0;
}

.toc-link:hover {
  color: #0066cc;
}

.toc-number {
  font-weight: bold;
  margin-right: 0.5em;
}

.toc-level-1 .toc-link {
  padding-left: 0;
}

.toc-level-2 .toc-link {
  padding-left: 1em;
  font-size: 0.95em;
}

.toc-level-3 .toc-link {
  padding-left: 2em;
  font-size: 0.9em;
}

/* Main content with two-column layout */
.document-content {
  margin-top: ${spacing.sectionSpacing}em;
}

.content-columns {
  column-count: ${this.layoutConfig.columns};
  column-gap: ${margins.columnGap}mm;
  column-fill: balance;
}

/* Document parts */
.document-part {
  break-inside: avoid-column;
  margin-bottom: ${spacing.sectionSpacing}em;
}

.part-title {
  font-family: ${typography.fontFamily.heading};
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: ${spacing.headingMargins.bottom}em;
  margin-top: ${spacing.headingMargins.top}em;
  text-align: center;
  border-bottom: 2px solid #333;
  padding-bottom: 0.25em;
}

/* Academic sections */
.academic-section {
  margin-bottom: ${spacing.sectionSpacing * 0.8}em;
}

.section-title {
  font-family: ${typography.fontFamily.heading};
  font-weight: bold;
  margin-bottom: ${spacing.headingMargins.bottom}em;
  margin-top: ${spacing.headingMargins.top}em;
}

.section-level-3 .section-title {
  font-size: 1.1em;
}

.section-level-4 .section-title {
  font-size: 1.05em;
}

.section-level-5 .section-title {
  font-size: 1em;
}

.section-level-6 .section-title {
  font-size: 0.95em;
}

.section-content {
  margin-bottom: ${spacing.paragraphSpacing}em;
}

/* Paragraphs and text */
p {
  margin-bottom: ${spacing.paragraphSpacing}em;
  text-align: justify;
}

/* Lists */
ul, ol {
  margin-bottom: ${spacing.listSpacing}em;
  padding-left: 1.2em;
}

li {
  margin-bottom: ${spacing.listSpacing * 0.5}em;
}

/* Mathematical content */
.formulas-section {
  margin: ${spacing.sectionSpacing * 0.6}em 0;
}

.formula {
  margin: 0.3em 0;
}

.formula-display {
  text-align: center;
  margin: 0.5em 0;
  break-inside: avoid;
}

.formula-display .formula-content {
  display: block;
  margin: 0.3em 0;
}

.formula-inline {
  display: inline;
}

.formula-context {
  font-size: 0.9em;
  color: #666;
  font-style: italic;
  margin-top: 0.2em;
  text-align: left;
}

/* Worked examples */
.examples-section {
  margin: ${spacing.sectionSpacing * 0.8}em 0;
}

.worked-example {
  margin-bottom: ${spacing.sectionSpacing}em;
  break-inside: avoid;
  border-left: 3px solid #ddd;
  padding-left: 0.8em;
}

.example-title {
  font-family: ${typography.fontFamily.heading};
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 0.3em;
}

.example-problem {
  margin-bottom: 0.5em;
  font-weight: 500;
}

.example-solution {
  margin-top: 0.4em;
}

.solution-title {
  font-family: ${typography.fontFamily.heading};
  font-size: 0.95em;
  font-weight: bold;
  margin-bottom: 0.3em;
}

.solution-steps {
  margin-left: 0.5em;
}

.solution-step {
  display: flex;
  margin-bottom: 0.4em;
  break-inside: avoid;
}

.step-number {
  font-weight: bold;
  margin-right: 0.5em;
  min-width: 1.5em;
}

.step-content {
  flex: 1;
}

.step-description {
  margin-bottom: 0.2em;
}

.step-formula {
  margin: 0.3em 0;
  text-align: center;
}

.step-explanation {
  font-size: 0.95em;
  color: #555;
  margin-top: 0.2em;
}

/* Print styles */
@media print {
  .document-container {
    margin: 0;
    padding: 15mm;
  }
  
  .content-columns {
    column-count: ${this.layoutConfig.columns};
    column-gap: ${margins.columnGap}mm;
  }
  
  .worked-example {
    break-inside: avoid;
  }
  
  .formula-display {
    break-inside: avoid;
  }
  
  .academic-section {
    break-inside: avoid-column;
  }
}

/* Responsive design for smaller screens */
@media screen and (max-width: 768px) {
  .content-columns {
    column-count: 1;
  }
  
  .document-container {
    padding: 1em;
  }
  
  .document-title {
    font-size: 1.3em;
  }
}`;
  }

  /**
   * Generate MathJax configuration
   */
  private generateMathJaxConfig(): MathJaxConfig {
    return {
      tex: {
        inlineMath: [['\\(', '\\)']],
        displayMath: [['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        tags: 'ams'
      },
      svg: {
        fontCache: 'global',
        displayAlign: 'center',
        displayIndent: '0'
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        includeHtmlTags: ['p', 'div', 'span', 'li', 'td', 'th'],
        processHtmlClass: 'tex2jax_process',
        ignoreHtmlClass: 'tex2jax_ignore'
      }
    };
  }

  /**
   * Generate MathJax script tag
   */
  private generateMathJaxScript(): string {
    const config = this.generateMathJaxConfig();
    
    return `  <script>
    window.MathJax = ${JSON.stringify(config, null, 4)};
  </script>
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>`;
  }

  /**
   * Generate output metadata
   */
  private generateMetadata(document: AcademicDocument, format: 'html' | 'pdf' | 'markdown'): OutputMetadata {
    return {
      generatedAt: new Date(),
      format,
      sourceFiles: document.metadata.sourceFiles,
      config: this.layoutConfig,
      stats: {
        totalSections: document.metadata.totalSections,
        totalFormulas: document.metadata.totalFormulas,
        totalExamples: document.metadata.totalExamples,
        estimatedPrintPages: this.estimatePrintPages(document)
      },
      preservationScore: document.metadata.preservationScore
    };
  }

  /**
   * Estimate number of print pages
   */
  private estimatePrintPages(document: AcademicDocument): number {
    // Rough estimation based on content volume
    const totalContent = document.parts.reduce((total, part) => {
      return total + part.sections.reduce((sectionTotal, section) => {
        return sectionTotal + section.content.length + 
               section.formulas.length * 100 + 
               section.examples.length * 300;
      }, 0);
    }, 0);

    // Assume ~2000 characters per page in compact two-column layout
    return Math.ceil(totalContent / 2000);
  }

  /**
   * Get default layout configuration
   */
  private getDefaultLayoutConfig(): CompactLayoutConfig {
    return {
      paperSize: 'a4',
      columns: 2,
      typography: {
        fontSize: 10,
        lineHeight: 1.2,
        fontFamily: {
          body: 'Times, "Times New Roman", serif',
          heading: 'Arial, sans-serif',
          math: 'Computer Modern, "Latin Modern Math", serif',
          code: 'Consolas, "Courier New", monospace'
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
    };
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/**
 * Create HTML output generator with default configuration
 */
export function createHTMLOutputGenerator(
  config?: Partial<HTMLGeneratorConfig>,
  layoutConfig?: CompactLayoutConfig
): HTMLOutputGenerator {
  const defaultConfig: HTMLGeneratorConfig = {
    includeTableOfContents: true,
    includeMathJax: true,
    compactMode: true,
    removeCardComponents: true,
    generateResponsive: true
  };

  return new HTMLOutputGenerator(
    { ...defaultConfig, ...config },
    layoutConfig
  );
}

/**
 * Generate HTML output from academic document
 */
export function generateCompactHTML(
  document: AcademicDocument,
  config?: Partial<HTMLGeneratorConfig>,
  layoutConfig?: CompactLayoutConfig
): HTMLOutput {
  const generator = createHTMLOutputGenerator(config, layoutConfig);
  return generator.generateHTML(document);
}