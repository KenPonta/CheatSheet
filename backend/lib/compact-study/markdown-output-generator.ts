// Markdown Output Generator for Compact Study Materials
// Generates Pandoc-compatible Markdown with mathematical content and compact template

import {
  AcademicDocument,
  MarkdownOutput,
  MarkdownGeneratorConfig,
  CompactLayoutConfig,
  PandocConfig,
  OutputMetadata,
  Formula,
  WorkedExample,
  AcademicSection,
  DocumentPart,
  TOCEntry
} from './types';

export class MarkdownOutputGenerator {
  private config: MarkdownGeneratorConfig;
  private layoutConfig: CompactLayoutConfig;
  private pandocConfig: PandocConfig;

  constructor(
    config: MarkdownGeneratorConfig = {
      includeFrontMatter: true,
      includeTableOfContents: true,
      mathDelimiters: 'pandoc',
      codeBlocks: true,
      preserveLineBreaks: false,
      pandocCompatible: true,
      generateTemplate: true
    },
    layoutConfig?: CompactLayoutConfig,
    pandocConfig?: PandocConfig
  ) {
    this.config = config;
    this.layoutConfig = layoutConfig || this.getDefaultLayoutConfig();
    this.pandocConfig = pandocConfig || this.getDefaultPandocConfig();
  }

  /**
   * Generate Markdown output from academic document
   */
  public generateMarkdown(document: AcademicDocument): MarkdownOutput {
    const frontMatter = this.config.includeFrontMatter ? 
      this.generateFrontMatter(document) : '';
    const tableOfContents = this.config.includeTableOfContents && document.tableOfContents.length > 0 ? 
      this.generateTableOfContents(document.tableOfContents) : '';
    const content = this.generateMainContent(document);
    const pandocTemplate = this.config.generateTemplate ? 
      this.generatePandocTemplate() : '';
    const metadata = this.generateMetadata(document, 'markdown');

    const markdown = [
      frontMatter,
      tableOfContents,
      content
    ].filter(Boolean).join('\n\n');

    return {
      markdown,
      pandocTemplate,
      metadata,
      frontMatter
    };
  }

  /**
   * Generate YAML front matter for Pandoc
   */
  private generateFrontMatter(document: AcademicDocument): string {
    const title = document.title || 'Compact Study Guide';
    const date = document.metadata?.generatedAt ? 
      document.metadata.generatedAt.toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    const stats = document.metadata || {};

    const frontMatter = {
      title,
      date,
      documentclass: 'scrartcl',
      classoption: ['twocolumn', `${this.layoutConfig.typography.fontSize}pt`],
      geometry: [
        `margin=${this.layoutConfig.margins.top}mm`,
        `columnsep=${this.layoutConfig.margins.columnGap}mm`
      ],
      fontsize: `${this.layoutConfig.typography.fontSize}pt`,
      linestretch: this.layoutConfig.typography.lineHeight,
      'header-includes': [
        '\\usepackage{amsmath}',
        '\\usepackage{amsfonts}',
        '\\usepackage{amssymb}',
        '\\usepackage{mathtools}',
        '\\usepackage{microtype}',
        '\\usepackage{needspace}',
        '\\clubpenalty=10000',
        '\\widowpenalty=10000',
        `\\setlength{\\parskip}{${this.layoutConfig.spacing.paragraphSpacing}em}`,
        '\\setlength{\\parindent}{0pt}'
      ],
      'math-renderer': this.pandocConfig.mathRenderer,
      'preserve-tabs': true,
      'wrap': 'preserve',
      'metadata': {
        'total-sections': stats.totalSections,
        'total-formulas': stats.totalFormulas,
        'total-examples': stats.totalExamples,
        'preservation-score': stats.preservationScore,
        'source-files': stats.sourceFiles
      }
    };

    return '---\n' + this.yamlStringify(frontMatter) + '\n---';
  }

  /**
   * Generate table of contents in Markdown format
   */
  private generateTableOfContents(tocEntries: TOCEntry[]): string {
    if (!tocEntries.length) return '';

    let toc = '# Contents\n\n';
    
    for (const entry of tocEntries) {
      toc += this.generateTOCItem(entry, 0);
    }

    return toc;
  }

  /**
   * Generate individual TOC item
   */
  private generateTOCItem(entry: TOCEntry, level: number): string {
    const indent = '  '.repeat(level);
    const sectionNumber = entry.sectionNumber ? `${entry.sectionNumber} ` : '';
    const link = `[${sectionNumber}${entry.title}](#${this.generateAnchor(entry.pageAnchor)})`;
    
    let result = `${indent}- ${link}\n`;
    
    for (const child of entry.children) {
      result += this.generateTOCItem(child, level + 1);
    }
    
    return result;
  }

  /**
   * Generate main document content
   */
  private generateMainContent(document: AcademicDocument): string {
    let content = '';

    // Add document title if not in front matter
    if (!this.config.includeFrontMatter && document.title) {
      content += `# ${this.escapeMarkdown(document.title)}\n\n`;
    }

    // Generate parts
    for (const part of document.parts) {
      content += this.generateDocumentPart(part) + '\n\n';
    }

    // Add appendices if any
    if (document.appendices.length > 0) {
      content += '# Appendices\n\n';
      for (const appendix of document.appendices) {
        content += `## ${this.escapeMarkdown(appendix.title)}\n\n`;
        content += this.processContent(appendix.content) + '\n\n';
      }
    }

    return content.trim();
  }

  /**
   * Generate document part (Part I, Part II, etc.)
   */
  private generateDocumentPart(part: DocumentPart): string {
    const partTitle = `Part ${this.toRoman(part.partNumber)}: ${part.title}`;
    let content = `# ${this.escapeMarkdown(partTitle)} {#part-${part.partNumber}}\n\n`;

    for (const section of part.sections) {
      content += this.generateAcademicSection(section, 2) + '\n\n';
    }

    return content.trim();
  }

  /**
   * Generate academic section
   */
  private generateAcademicSection(section: AcademicSection, level: number = 2): string {
    const headingPrefix = '#'.repeat(level);
    const sectionId = this.generateAnchor(`section-${section.sectionNumber}`);
    const sectionTitle = `${section.sectionNumber} ${section.title}`;
    
    let content = `${headingPrefix} ${this.escapeMarkdown(sectionTitle)} {#${sectionId}}\n\n`;
    
    // Add section content
    if (section.content) {
      content += this.processContent(section.content) + '\n\n';
    }

    // Add formulas
    if (section.formulas.length > 0) {
      content += this.generateFormulasSection(section.formulas) + '\n\n';
    }

    // Add worked examples
    if (section.examples.length > 0) {
      content += this.generateExamplesSection(section.examples) + '\n\n';
    }

    // Add subsections
    for (const subsection of section.subsections) {
      content += this.generateAcademicSection(subsection, level + 1) + '\n\n';
    }

    return content.trim();
  }

  /**
   * Generate formulas section
   */
  private generateFormulasSection(formulas: Formula[]): string {
    if (!formulas.length) return '';
    
    let content = '';
    
    for (const formula of formulas) {
      content += this.generateFormula(formula) + '\n\n';
    }

    return content.trim();
  }

  /**
   * Generate individual formula
   */
  private generateFormula(formula: Formula): string {
    const formulaId = this.generateAnchor(`formula-${formula.id}`);
    const mathContent = formula.latex || formula.originalText || '';
    
    if (formula.type === 'display') {
      let result = '';
      
      if (this.config.mathDelimiters === 'pandoc') {
        result = `$$${mathContent}$$ {#${formulaId}}`;
      } else if (this.config.mathDelimiters === 'latex') {
        result = `\\[${mathContent}\\] {#${formulaId}}`;
      } else { // github
        result = `\`\`\`math\n${mathContent}\n\`\`\``;
      }
      
      if (formula.context) {
        result += `\n\n*${this.escapeMarkdown(formula.context)}*`;
      }
      
      return result;
    } else {
      // Inline formula
      if (this.config.mathDelimiters === 'pandoc') {
        return `$${mathContent}$`;
      } else if (this.config.mathDelimiters === 'latex') {
        return `\\(${mathContent}\\)`;
      } else { // github
        return `\`${mathContent}\``;
      }
    }
  }

  /**
   * Generate examples section
   */
  private generateExamplesSection(examples: WorkedExample[]): string {
    if (!examples.length) return '';
    
    let content = '';
    
    for (const example of examples) {
      content += this.generateWorkedExample(example) + '\n\n';
    }

    return content.trim();
  }

  /**
   * Generate worked example
   */
  private generateWorkedExample(example: WorkedExample): string {
    const exampleId = this.generateAnchor(`example-${example.id}`);
    let content = '';

    // Example title
    if (example.title) {
      content += `**Example: ${this.escapeMarkdown(example.title)}** {#${exampleId}}\n\n`;
    }

    // Problem statement
    content += `**Problem:** ${this.processContent(example.problem)}\n\n`;

    // Solution
    content += `**Solution:**\n\n`;
    content += this.generateSolutionSteps(example.solution);

    return content;
  }

  /**
   * Generate solution steps
   */
  private generateSolutionSteps(steps: any[]): string {
    let content = '';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNumber = step.stepNumber || (i + 1);
      
      content += `${stepNumber}. ${this.processContent(step.description)}\n\n`;
      
      if (step.formula || step.latex) {
        const mathContent = step.formula || step.latex;
        if (this.config.mathDelimiters === 'pandoc') {
          content += `   $$${mathContent}$$\n\n`;
        } else if (this.config.mathDelimiters === 'latex') {
          content += `   \\[${mathContent}\\]\n\n`;
        } else { // github
          content += `   \`\`\`math\n   ${mathContent}\n   \`\`\`\n\n`;
        }
      }
      
      if (step.explanation) {
        content += `   ${this.processContent(step.explanation)}\n\n`;
      }
    }

    return content.trim();
  }

  /**
   * Process content text to handle markdown formatting
   */
  private processContent(text: string): string {
    if (!text) return '';

    let processed = text;

    // Handle inline math if not already processed
    if (this.config.mathDelimiters === 'pandoc') {
      // Convert LaTeX delimiters to Pandoc format
      processed = processed
        .replace(/\\\(([^)]+)\\\)/g, '$$$1$$')
        .replace(/\\\[([^\]]+)\\\]/g, '$$$$$$1$$$$$$');
    } else if (this.config.mathDelimiters === 'latex') {
      // Keep LaTeX delimiters
      processed = processed
        .replace(/\$([^$]+)\$/g, '\\($1\\)');
    }

    // Handle line breaks
    if (this.config.preserveLineBreaks) {
      processed = processed.replace(/\n/g, '  \n');
    }

    // Handle lists - convert to proper markdown
    processed = processed
      .replace(/^\* (.+)$/gm, '- $1')
      .replace(/^(\d+)\. (.+)$/gm, '$1. $2');

    return processed;
  }

  /**
   * Escape content that needs special character handling
   */
  private escapeContent(text: string): string {
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/#/g, '\\#');
  }

  /**
   * Generate Pandoc template for compact PDF generation
   */
  private generatePandocTemplate(): string {
    const typography = this.layoutConfig.typography;
    const spacing = this.layoutConfig.spacing;
    const margins = this.layoutConfig.margins;

    return `% Compact Study Guide Pandoc Template
\\documentclass[$if(fontsize)$$fontsize$,$endif$$if(lang)$$babel-lang$,$endif$$if(papersize)$$papersize$paper,$endif$$for(classoption)$$classoption$$sep$,$endfor$twocolumn]{$documentclass$}

% Packages for compact layout
\\usepackage{lmodern}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{ifxetex,ifluatex}
\\usepackage{fixltx2e}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{microtype}

% Geometry and spacing
\\usepackage[margin=${margins.top}mm,columnsep=${margins.columnGap}mm]{geometry}
\\usepackage{setspace}
\\setstretch{${typography.lineHeight}}

% Math packages
\\usepackage{mathtools}
\\usepackage{amsthm}

% Page layout control
\\usepackage{needspace}
\\usepackage{afterpage}

% Widow and orphan control
\\clubpenalty=10000
\\widowpenalty=10000
\\displaywidowpenalty=10000

% Compact spacing
\\setlength{\\parskip}{${spacing.paragraphSpacing}em}
\\setlength{\\parindent}{0pt}

% Section formatting
\\usepackage{titlesec}
\\titlespacing*{\\section}{0pt}{${spacing.headingMargins.top}em}{${spacing.headingMargins.bottom}em}
\\titlespacing*{\\subsection}{0pt}{${spacing.headingMargins.top * 0.8}em}{${spacing.headingMargins.bottom * 0.8}em}
\\titlespacing*{\\subsubsection}{0pt}{${spacing.headingMargins.top * 0.6}em}{${spacing.headingMargins.bottom * 0.6}em}

% List formatting
\\usepackage{enumitem}
\\setlist{itemsep=${spacing.listSpacing}em,parsep=0pt,topsep=${spacing.listSpacing}em}

% Header includes
$for(header-includes)$
$header-includes$
$endfor$

% Title and metadata
$if(title)$
\\title{$title$}
$endif$
$if(author)$
\\author{$for(author)$$author$$sep$ \\and $endfor$}
$endif$
$if(date)$
\\date{$date$}
$endif$

\\begin{document}

$if(title)$
\\maketitle
$endif$

$if(toc)$
{
\\hypersetup{linkcolor=$if(toccolor)$$toccolor$$else$black$endif$}
\\setcounter{tocdepth}{$toc-depth$}
\\tableofcontents
}
$endif$

$body$

\\end{document}`;
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
   * Estimate number of print pages for markdown content
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
   * Get default Pandoc configuration
   */
  private getDefaultPandocConfig(): PandocConfig {
    return {
      template: 'compact',
      mathRenderer: 'mathjax',
      variables: {
        'geometry': 'margin=15mm,columnsep=6mm',
        'fontsize': '10pt',
        'linestretch': '1.2',
        'documentclass': 'scrartcl',
        'classoption': ['twocolumn']
      }
    };
  }

  /**
   * Generate anchor from text
   */
  private generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-\.]/g, '')
      .replace(/\./g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Escape markdown special characters (only in titles and headings)
   */
  private escapeMarkdown(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/#/g, '\\#')
      .replace(/`/g, '\\`');
  }

  /**
   * Convert number to Roman numerals
   */
  private toRoman(num: number): string {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    
    let result = '';
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }
    return result;
  }

  /**
   * Simple YAML stringify for front matter
   */
  private yamlStringify(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            result += `${spaces}- \n${this.yamlStringify(item, indent + 1)}`;
          } else {
            result += `${spaces}- ${this.yamlEscape(item)}\n`;
          }
        }
      } else if (typeof value === 'object') {
        result += `${spaces}${key}:\n${this.yamlStringify(value, indent + 1)}`;
      } else {
        result += `${spaces}${key}: ${this.yamlEscape(value)}\n`;
      }
    }

    return result;
  }

  /**
   * Escape YAML values
   */
  private yamlEscape(value: any): string {
    const str = String(value);
    
    // Quote strings that contain special characters or start with special chars
    if (str.match(/[:\[\]{}|>'"@`]/) || str.match(/^[-?]/) || str.match(/^\d/)) {
      return `"${str.replace(/"/g, '\\"')}"`;
    }
    
    return str;
  }
}

/**
 * Create Markdown output generator with default configuration
 */
export function createMarkdownOutputGenerator(
  config?: Partial<MarkdownGeneratorConfig>,
  layoutConfig?: CompactLayoutConfig,
  pandocConfig?: PandocConfig
): MarkdownOutputGenerator {
  const defaultConfig: MarkdownGeneratorConfig = {
    includeFrontMatter: true,
    includeTableOfContents: true,
    mathDelimiters: 'pandoc',
    codeBlocks: true,
    preserveLineBreaks: false,
    pandocCompatible: true,
    generateTemplate: true
  };

  return new MarkdownOutputGenerator(
    { ...defaultConfig, ...config },
    layoutConfig,
    pandocConfig
  );
}

/**
 * Generate Markdown output from academic document
 */
export function generateCompactMarkdown(
  document: AcademicDocument,
  config?: Partial<MarkdownGeneratorConfig>,
  layoutConfig?: CompactLayoutConfig,
  pandocConfig?: PandocConfig
): MarkdownOutput {
  const generator = createMarkdownOutputGenerator(config, layoutConfig, pandocConfig);
  return generator.generateMarkdown(document);
}