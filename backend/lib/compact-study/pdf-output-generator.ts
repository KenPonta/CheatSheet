import { 
  AcademicDocument, 
  CompactLayoutConfig, 
  OutputMetadata,
  WorkedExample,
  Formula,
  AcademicSection,
  DocumentPart
} from './types'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface PDFOutput {
  buffer: Buffer;
  pageCount: number;
  metadata: OutputMetadata;
  latexSource?: string;
}

export interface LaTeXGenerationOptions {
  includeSource: boolean;
  tempDir?: string;
  timeout?: number;
  engine?: 'pdflatex' | 'xelatex' | 'lualatex';
}

export class PDFOutputGenerator {
  private tempDir: string;
  private latexEngine: string;
  private latexTimeout: number;
  private enableLatex: boolean;
  private enablePuppeteerFallback: boolean;

  constructor(tempDir?: string) {
    this.tempDir = tempDir || process.env.LATEX_TEMP_DIR || tmpdir();
    this.latexEngine = process.env.LATEX_ENGINE || 'pdflatex';
    this.latexTimeout = parseInt(process.env.LATEX_TIMEOUT || '60000');
    this.enableLatex = process.env.ENABLE_LATEX_PDF !== 'false';
    this.enablePuppeteerFallback = process.env.ENABLE_PUPPETEER_FALLBACK !== 'false';
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Ensure the temporary directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log(`📁 Temp directory ensured: ${this.tempDir}`);
    } catch (error) {
      console.warn(`Failed to create temp directory ${this.tempDir}:`, error);
      // Fall back to system temp directory
      this.tempDir = tmpdir();
      console.log(`📁 Using fallback temp directory: ${this.tempDir}`);
      
      // Try to create the fallback directory too
      try {
        await fs.mkdir(this.tempDir, { recursive: true });
      } catch (fallbackError) {
        console.error('Failed to create fallback temp directory:', fallbackError);
        throw new Error(`Cannot create temporary directory for PDF generation: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Generate PDF output from academic document using LaTeX backend
   */
  async generatePDF(
    document: AcademicDocument,
    config: CompactLayoutConfig,
    options: LaTeXGenerationOptions = { includeSource: false }
  ): Promise<PDFOutput> {
    const startTime = Date.now();
    console.log('🔄 Starting PDF generation...');
    
    try {
      // Validate input document
      if (!document || !document.parts || document.parts.length === 0) {
        throw new Error('Invalid or empty academic document provided');
      }

      console.log(`📄 Generating PDF for document: ${document.title}`);
      console.log(`📊 Document stats: ${document.parts.length} parts, ${document.metadata?.totalSections || 0} sections`);
      
      // Only ensure temp directory exists if LaTeX is enabled
      if (this.enableLatex) {
        await this.ensureTempDirectory();
      }
      
      let pdfBuffer: Buffer;
      let latexSource: string | undefined;

      // Try LaTeX first if enabled
      if (this.enableLatex) {
        try {
          console.log('🔄 Attempting LaTeX PDF generation...');
          
          // Generate LaTeX source
          latexSource = this.generateLaTeXSource(document, config);
          console.log(`📝 Generated LaTeX source (${latexSource.length} characters)`);
          
          // Create temporary files
          const tempId = `compact_study_${Date.now()}`;
          const texFile = join(this.tempDir, `${tempId}.tex`);
          const pdfFile = join(this.tempDir, `${tempId}.pdf`);
          
          console.log(`📁 Temp files will be: TEX=${texFile}, PDF=${pdfFile}`);
          
          // Write LaTeX source to file
          await fs.writeFile(texFile, latexSource, 'utf8');
          console.log(`💾 LaTeX source written to: ${texFile}`);
          
          // Compile LaTeX to PDF
          console.log('🔄 Compiling LaTeX to PDF...');
          pdfBuffer = await this.compileLaTeX(texFile, pdfFile, options);
          console.log(`✅ LaTeX PDF compilation completed (${pdfBuffer.length} bytes)`);
          
          // Clean up temporary files
          await this.cleanup([texFile, pdfFile]);
        } catch (latexError) {
          console.error('❌ LaTeX PDF generation failed:', latexError.message);
          
          if (!this.enablePuppeteerFallback) {
            throw latexError;
          }
          
          console.log('🔄 Falling back to Puppeteer PDF generation...');
          try {
            pdfBuffer = await this.generatePuppeteerPDF(document, config);
            console.log(`✅ Puppeteer fallback successful (${pdfBuffer.length} bytes)`);
          } catch (puppeteerError) {
            console.error('❌ Puppeteer fallback also failed:', puppeteerError.message);
            throw new Error(`Both LaTeX and Puppeteer failed. LaTeX: ${latexError.message}. Puppeteer: ${puppeteerError.message}`);
          }
        }
      } else {
        console.log('🔄 LaTeX disabled, using Puppeteer PDF generation...');
        try {
          pdfBuffer = await this.generatePuppeteerPDF(document, config);
          console.log(`✅ Puppeteer PDF generation completed (${pdfBuffer.length} bytes)`);
        } catch (puppeteerError) {
          console.error('❌ Puppeteer PDF generation failed:', puppeteerError.message);
          throw puppeteerError;
        }
      }
      
      // Validate the PDF buffer
      if (!this.validatePDFBuffer(pdfBuffer)) {
        throw new Error(`Generated PDF is invalid or corrupted (${pdfBuffer.length} bytes)`);
      }
      
      // Get page count from PDF
      const pageCount = await this.getPageCount(pdfBuffer);
      console.log(`📄 PDF page count: ${pageCount}`);
      
      const metadata: OutputMetadata = {
        generatedAt: new Date(),
        format: 'pdf',
        sourceFiles: document.metadata?.sourceFiles || [],
        config,
        stats: {
          totalPages: pageCount,
          totalSections: document.metadata?.totalSections || 0,
          totalFormulas: document.metadata?.totalFormulas || 0,
          totalExamples: document.metadata?.totalExamples || 0,
          estimatedPrintPages: pageCount
        },
        preservationScore: document.metadata?.preservationScore || 0.8
      };

      const processingTime = Date.now() - startTime;
      console.log(`🎉 PDF generation completed successfully in ${processingTime}ms`);

      return {
        buffer: pdfBuffer,
        pageCount,
        metadata,
        latexSource: options.includeSource && latexSource ? latexSource : undefined
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`💥 PDF generation failed after ${processingTime}ms:`, error);
      
      // Provide more specific error information
      let errorMessage = `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      if (error instanceof Error) {
        if (error.message.includes('LaTeX')) {
          errorMessage += '\n\nThis may be due to:\n- LaTeX not being installed on the system\n- Missing LaTeX packages\n- Invalid LaTeX syntax in the generated source';
        } else if (error.message.includes('Puppeteer')) {
          errorMessage += '\n\nThis may be due to:\n- Puppeteer browser launch issues\n- Missing system dependencies for headless Chrome\n- Memory or resource constraints';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Generate LaTeX source with compact academic layout
   */
  private generateLaTeXSource(document: AcademicDocument, config: CompactLayoutConfig): string {
    const documentClass = this.generateDocumentClass(config);
    const packages = this.generatePackages(config);
    const geometry = this.generateGeometry(config);
    const typography = this.generateTypographySettings(config);
    const mathSettings = this.generateMathSettings(config);
    const pageBreakSettings = this.generatePageBreakSettings();
    const customCommands = this.generateCustomCommands();
    
    const content = this.generateContent(document, config);

    return `${documentClass}

${packages}

${geometry}

${typography}

${mathSettings}

${pageBreakSettings}

${customCommands}

\\begin{document}

${this.generateTitle(document)}

${this.generateTableOfContents(document)}

${content}

\\end{document}`;
  }

  /**
   * Generate document class with two-column layout
   */
  private generateDocumentClass(config: CompactLayoutConfig): string {
    const paperSize = config.paperSize === 'letter' ? 'letterpaper' : 'a4paper';
    const fontSize = `${config.typography.fontSize}pt`;
    
    // Use standard article class to avoid KOMA-Script package conflicts
    return `\\documentclass[${fontSize},${paperSize},twocolumn,twoside]{article}`;
  }

  /**
   * Generate required packages
   */
  private generatePackages(config: CompactLayoutConfig): string {
    return `% Essential packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{microtype}

% Math packages
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{amsthm}
\\usepackage{mathtools}

% Layout and spacing
\\usepackage{geometry}
\\usepackage{multicol}
\\usepackage{setspace}
\\usepackage{titlesec}
\\usepackage{enumitem}

% Graphics and tables
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{array}

% Cross-references and links
\\usepackage{hyperref}

% Widow and orphan control
\\usepackage{needspace}
\\usepackage{afterpage}

% Color support
\\usepackage{xcolor}`;
  }

  /**
   * Generate geometry settings for compact layout
   */
  private generateGeometry(config: CompactLayoutConfig): string {
    const margins = config.margins;
    
    // Ensure all margin values are numbers
    const top = typeof margins.top === 'number' ? margins.top : 20;
    const bottom = typeof margins.bottom === 'number' ? margins.bottom : 20;
    const left = typeof margins.left === 'number' ? margins.left : 15;
    const right = typeof margins.right === 'number' ? margins.right : 15;
    const columnGap = typeof margins.columnGap === 'number' ? margins.columnGap : 10;
    
    return `% Page geometry with compact margins
\\geometry{
  top=${top}mm,
  bottom=${bottom}mm,
  left=${left}mm,
  right=${right}mm,
  columnsep=${columnGap}mm,
  headsep=5mm,
  footskip=8mm
}`;
  }

  /**
   * Generate typography settings for compact layout
   */
  private generateTypographySettings(config: CompactLayoutConfig): string {
    const lineHeight = config.typography.lineHeight;
    const paragraphSpacing = `${config.spacing.paragraphSpacing}em`;
    const listSpacing = `${config.spacing.listSpacing}em`;
    
    return `% Typography settings for compact layout
\\setstretch{${lineHeight}}

% Paragraph spacing
\\setlength{\\parskip}{${paragraphSpacing}}
\\setlength{\\parindent}{0pt}

% List spacing
\\setlist{
  itemsep=${listSpacing},
  parsep=0pt,
  topsep=${listSpacing},
  partopsep=0pt,
  leftmargin=*
}

% Section title formatting
\\titleformat{\\section}
  {\\normalfont\\large\\bfseries}
  {\\thesection}{0.5em}{}
\\titlespacing*{\\section}
  {0pt}{${config.spacing.headingMargins.top}em}{${config.spacing.headingMargins.bottom}em}

\\titleformat{\\subsection}
  {\\normalfont\\normalsize\\bfseries}
  {\\thesubsection}{0.5em}{}
\\titlespacing*{\\subsection}
  {0pt}{${config.spacing.headingMargins.top * 0.8}em}{${config.spacing.headingMargins.bottom * 0.8}em}

\\titleformat{\\subsubsection}
  {\\normalfont\\small\\bfseries}
  {\\thesubsubsection}{0.5em}{}
\\titlespacing*{\\subsubsection}
  {0pt}{${config.spacing.headingMargins.top * 0.6}em}{${config.spacing.headingMargins.bottom * 0.6}em}`;
  }

  /**
   * Generate math rendering settings
   */
  private generateMathSettings(config: CompactLayoutConfig): string {
    const mathConfig = config.mathRendering;
    
    return `% Math settings
${mathConfig.displayEquations.numbered ? '\\numberwithin{equation}{section}' : ''}

% Display equation formatting
\\setlength{\\abovedisplayskip}{0.5em}
\\setlength{\\belowdisplayskip}{0.5em}
\\setlength{\\abovedisplayshortskip}{0.3em}
\\setlength{\\belowdisplayshortskip}{0.3em}

% Theorem environments
\\theoremstyle{definition}
\\newtheorem{definition}{Definition}[section]
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{example}{Example}[section]
\\newtheorem{exercise}{Exercise}[section]

% Custom theorem formatting for compact layout
\\newtheoremstyle{compact}
  {0.3em}   % Space above
  {0.3em}   % Space below
  {\\normalfont} % Body font
  {0pt}     % Indent amount
  {\\bfseries} % Theorem head font
  {:}       % Punctuation after theorem head
  {0.5em}   % Space after theorem head
  {}        % Theorem head spec`;
  }

  /**
   * Generate page break and widow/orphan control settings
   */
  private generatePageBreakSettings(): string {
    return `% Page break and widow/orphan control
\\clubpenalty=10000    % Prevent orphans
\\widowpenalty=10000   % Prevent widows
\\displaywidowpenalty=10000
\\predisplaypenalty=10000
\\postdisplaypenalty=0
\\interlinepenalty=0

% Column break penalties
\\columnseprule=0pt
\\columnsep=6mm

% Prevent breaking of examples and formulas
\\newcommand{\\keepexample}[1]{%
  \\needspace{3\\baselineskip}%
  #1%
}

\\newcommand{\\keepformula}[1]{%
  \\needspace{2\\baselineskip}%
  #1%
}`;
  }

  /**
   * Generate custom commands for academic content
   */
  private generateCustomCommands(): string {
    return `% Custom commands for academic content
\\newcommand{\\partTitle}[1]{%
  \\clearpage%
  \\section*{#1}%
  \\addcontentsline{toc}{section}{#1}%
}

\\newcommand{\\sectionTitle}[2]{%
  \\subsection{#1}%
  \\label{sec:#2}%
}

\\newcommand{\\formulaRef}[1]{Formula~\\ref{#1}}
\\newcommand{\\exampleRef}[1]{Example~\\ref{#1}}
\\newcommand{\\sectionRef}[1]{Section~\\ref{#1}}

% Worked example environment
\\newenvironment{workedexample}[2]{%
  \\begin{quote}%
  \\textbf{#1}\\label{ex:#2}\\\\%
}{%
  \\end{quote}%
}

% Solution step environment
\\newcounter{solutionstep}
\\newcommand{\\solutionstep}[1]{%
  \\stepcounter{solutionstep}%
  \\textbf{Step \\thesolutionstep:} #1\\\\%
}

% Simple formula environments (removed custom commands to avoid compilation issues)`;
  }

  /**
   * Generate document title
   */
  private generateTitle(document: AcademicDocument): string {
    return `\\title{${this.escapeLaTeX(document.title)}}
\\author{}
\\date{\\today}
\\maketitle`;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(document: AcademicDocument): string {
    if (document.tableOfContents.length === 0) {
      return '';
    }

    return `\\tableofcontents
\\vspace{1em}`;
  }

  /**
   * Generate main content from academic document
   */
  private generateContent(document: AcademicDocument, config: CompactLayoutConfig): string {
    let content = '';

    for (const part of document.parts) {
      content += this.generatePart(part, config);
    }

    // Add appendices if any
    if (document.appendices.length > 0) {
      content += '\\appendix\n';
      for (const appendix of document.appendices) {
        content += `\\section{${this.escapeLaTeX(appendix.title)}}\n`;
        content += `${this.processContent(appendix.content)}\n\n`;
      }
    }

    return content;
  }

  /**
   * Generate a document part (Part I, Part II, etc.)
   */
  private generatePart(part: DocumentPart, config: CompactLayoutConfig): string {
    let content = `\\partTitle{Part ${this.toRoman(part.partNumber)}: ${this.escapeLaTeX(part.title)}}\n\n`;

    for (const section of part.sections) {
      content += this.generateSection(section, config);
    }

    return content;
  }

  /**
   * Generate an academic section
   */
  private generateSection(section: AcademicSection, config: CompactLayoutConfig): string {
    let content = `\\sectionTitle{${this.escapeLaTeX(section.title)}}{${section.sectionNumber.replace('.', '_')}}\n\n`;

    // Add section content
    content += this.processContent(section.content) + '\n\n';

    // Add formulas
    for (const formula of section.formulas) {
      content += this.generateFormula(formula, config);
    }

    // Add worked examples
    for (const example of section.examples) {
      content += this.generateWorkedExample(example, config);
    }

    // Add subsections
    for (const subsection of section.subsections) {
      content += this.generateSubsection(subsection, config);
    }

    return content;
  }

  /**
   * Generate a subsection
   */
  private generateSubsection(section: AcademicSection, config: CompactLayoutConfig): string {
    let content = `\\subsubsection{${this.escapeLaTeX(section.title)}}\n\n`;

    content += this.processContent(section.content) + '\n\n';

    // Add formulas and examples for subsection
    for (const formula of section.formulas) {
      content += this.generateFormula(formula, config);
    }

    for (const example of section.examples) {
      content += this.generateWorkedExample(example, config);
    }

    return content;
  }

  /**
   * Generate a formula
   */
  private generateFormula(formula: Formula, config: CompactLayoutConfig): string {
    // Ensure we have valid LaTeX content
    const latexContent = formula.latex || formula.originalText || formula.text || '';
    if (!latexContent.trim()) {
      return ''; // Skip empty formulas
    }
    
    // Clean the LaTeX content - remove any problematic characters
    const cleanLatex = this.cleanLaTeXFormula(latexContent);
    if (!cleanLatex.trim()) {
      return ''; // Skip if cleaning resulted in empty content
    }
    
    // Use simple LaTeX environments instead of custom commands
    if (formula.type === 'display') {
      return `\\begin{equation}\n${cleanLatex}\n\\end{equation}\n\n`;
    } else {
      return `$${cleanLatex}$ `;
    }
  }

  /**
   * Generate a worked example
   */
  private generateWorkedExample(example: WorkedExample, config: CompactLayoutConfig): string {
    const exampleId = example.id.replace(/[^a-zA-Z0-9]/g, '_');
    
    let content = `\\begin{workedexample}{${this.escapeLaTeX(example.title)}}{${exampleId}}\n`;
    content += `\\textbf{Problem:} ${this.processContent(example.problem)}\n\n`;
    content += `\\textbf{Solution:}\n`;

    for (const step of example.solution) {
      content += `\\solutionstep{${this.processContent(step.description)}}\n`;
      if (step.formula) {
        content += `\\[${step.formula}\\]\n`;
      }
      if (step.explanation) {
        content += `${this.processContent(step.explanation)}\n`;
      }
    }

    content += `\\end{workedexample}\n\n`;
    return content;
  }

  /**
   * Process content to handle LaTeX formatting
   */
  private processContent(content: string): string {
    let processed = content;
    
    // Handle lists first (before other formatting) - wrap in proper environments
    processed = this.convertListsToLaTeX(processed);
    
    // Handle markdown-style formatting
    // Handle bold text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
    
    // Handle italic text (but not bold) - be more careful with asterisks
    processed = processed.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '\\textit{$1}');
    
    // Handle inline code
    processed = processed.replace(/`(.*?)`/g, '\\texttt{$1}');
    
    // Handle line breaks
    processed = processed.replace(/\n\n/g, '\n\n\\par\n');
    
    // Now escape remaining LaTeX special characters
    processed = this.escapeLaTeXContent(processed);
    
    return processed;
  }

  /**
   * Escape LaTeX special characters in content (avoiding already processed LaTeX commands)
   */
  private escapeLaTeXContent(text: string): string {
    return text
      .replace(/([^\\])&/g, '$1\\&')  // Don't escape & in LaTeX commands
      .replace(/^&/g, '\\&')          // Escape & at start of line
      .replace(/([^\\])\$/g, '$1\\$') // Don't escape $ in LaTeX commands
      .replace(/^\$/g, '\\$')         // Escape $ at start of line
      .replace(/([^\\])%/g, '$1\\%')  // Don't escape % in LaTeX commands
      .replace(/^%/g, '\\%')          // Escape % at start of line
      .replace(/([^\\])#/g, '$1\\#')  // Don't escape # in LaTeX commands
      .replace(/^#/g, '\\#')          // Escape # at start of line
      .replace(/([^\\])\^/g, '$1\\textasciicircum{}')
      .replace(/^\^/g, '\\textasciicircum{}')
      .replace(/([^\\])_/g, '$1\\_')
      .replace(/^_/g, '\\_')
      .replace(/([^\\])~/g, '$1\\textasciitilde{}')
      .replace(/^~/g, '\\textasciitilde{}');
  }

  /**
   * Escape LaTeX special characters (for simple text)
   */
  private escapeLaTeX(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash ')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/\^/g, '\\textasciicircum ')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\textasciitilde ');
  }

  /**
   * Validate PDF buffer to ensure it's a valid PDF file
   */
  private validatePDFBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    
    // Check PDF header
    const header = buffer.toString('ascii', 0, 4);
    if (!header.startsWith('%PDF')) {
      return false;
    }
    
    // Check for PDF trailer (should end with %%EOF)
    const trailer = buffer.toString('ascii', Math.max(0, buffer.length - 20));
    if (!trailer.includes('%%EOF')) {
      console.warn('PDF may be incomplete - missing %%EOF trailer');
    }
    
    return true;
  }

  /**
   * Clean LaTeX formula content to prevent compilation errors
   */
  private cleanLaTeXFormula(latex: string): string {
    let cleaned = latex.trim();
    
    // Remove any surrounding $ signs (we'll add them in the command)
    cleaned = cleaned.replace(/^\$+|\$+$/g, '');
    
    // Remove any surrounding \( \) or \[ \] (we'll handle display vs inline in the command)
    cleaned = cleaned.replace(/^\\[\(\[]|\\[\)\]]$/g, '');
    
    // Ensure braces are balanced
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      // If braces are unbalanced, escape them
      cleaned = cleaned.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    }
    
    // Remove any problematic characters that might cause runaway arguments
    cleaned = cleaned.replace(/[\r\n]+/g, ' '); // Replace newlines with spaces
    cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
    
    return cleaned;
  }

  /**
   * Convert lists to proper LaTeX environments
   */
  private convertListsToLaTeX(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inBulletList = false;
    let inNumberedList = false;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bulletMatch = line.match(/^\* (.+)$/);
      const numberedMatch = line.match(/^(\d+)\. (.+)$/);
      
      if (bulletMatch) {
        // Handle bullet list
        if (inNumberedList) {
          // Close numbered list and start bullet list
          result.push('\\begin{enumerate}');
          result.push(...listItems.map(item => `\\item ${item}`));
          result.push('\\end{enumerate}');
          listItems = [];
          inNumberedList = false;
        }
        
        if (!inBulletList) {
          inBulletList = true;
        }
        listItems.push(bulletMatch[1]);
        
      } else if (numberedMatch) {
        // Handle numbered list
        if (inBulletList) {
          // Close bullet list and start numbered list
          result.push('\\begin{itemize}');
          result.push(...listItems.map(item => `\\item ${item}`));
          result.push('\\end{itemize}');
          listItems = [];
          inBulletList = false;
        }
        
        if (!inNumberedList) {
          inNumberedList = true;
        }
        listItems.push(numberedMatch[2]);
        
      } else {
        // Not a list item - close any open lists
        if (inBulletList) {
          result.push('\\begin{itemize}');
          result.push(...listItems.map(item => `\\item ${item}`));
          result.push('\\end{itemize}');
          listItems = [];
          inBulletList = false;
        }
        
        if (inNumberedList) {
          result.push('\\begin{enumerate}');
          result.push(...listItems.map(item => `\\item ${item}`));
          result.push('\\end{enumerate}');
          listItems = [];
          inNumberedList = false;
        }
        
        // Add the non-list line
        result.push(line);
      }
    }
    
    // Close any remaining open lists
    if (inBulletList) {
      result.push('\\begin{itemize}');
      result.push(...listItems.map(item => `\\item ${item}`));
      result.push('\\end{itemize}');
    }
    
    if (inNumberedList) {
      result.push('\\begin{enumerate}');
      result.push(...listItems.map(item => `\\item ${item}`));
      result.push('\\end{enumerate}');
    }
    
    return result.join('\n');
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
   * Compile LaTeX to PDF using pdflatex (with fallback to HTML-based PDF)
   */
  private async compileLaTeX(
    texFile: string, 
    pdfFile: string, 
    options: LaTeXGenerationOptions
  ): Promise<Buffer> {
    const engine = options.engine || 'pdflatex';
    const timeout = options.timeout || 30000;

    // This method is now only called for LaTeX compilation
    // The main logic has been moved to generatePDF method
    return await this.tryLaTeXCompilation(engine, texFile, pdfFile, timeout);
  }

  /**
   * Try LaTeX compilation with the system LaTeX installation
   */
  private async tryLaTeXCompilation(
    engine: string,
    texFile: string, 
    pdfFile: string, 
    timeout: number
  ): Promise<Buffer> {
    // Use configured engine and timeout
    const actualEngine = engine || this.latexEngine;
    const actualTimeout = timeout || this.latexTimeout;
    return new Promise((resolve, reject) => {
      console.log(`🔄 Starting ${actualEngine} compilation...`);
      
      const process = spawn(actualEngine, [
        '-interaction=nonstopmode',
        '-output-directory=' + this.tempDir,
        texFile
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`LaTeX compilation timed out after ${actualTimeout}ms`));
      }, actualTimeout);

      process.on('close', async (code) => {
        clearTimeout(timeoutId);
        
        if (code !== 0) {
          reject(new Error(`LaTeX compilation failed with code ${code}:\n${stderr}\n${stdout}`));
          return;
        }

        try {
          console.log(`📖 Attempting to read PDF file: ${pdfFile}`);
          
          // Check if file exists first
          try {
            await fs.access(pdfFile);
            console.log(`✅ PDF file exists: ${pdfFile}`);
          } catch (accessError) {
            console.error(`❌ PDF file does not exist: ${pdfFile}`);
            
            // List files in temp directory for debugging
            try {
              const files = await fs.readdir(this.tempDir);
              console.log(`📁 Files in temp directory: ${files.join(', ')}`);
            } catch (listError) {
              console.error('Failed to list temp directory:', listError.message);
            }
            
            throw new Error(`PDF file not found: ${pdfFile}`);
          }
          
          const pdfBuffer = await fs.readFile(pdfFile);
          console.log(`✅ Successfully read PDF file: ${pdfBuffer.length} bytes`);
          
          // Validate that this is actually a PDF file
          if (pdfBuffer.length < 4 || !pdfBuffer.toString('ascii', 0, 4).startsWith('%PDF')) {
            throw new Error(`Generated file is not a valid PDF (size: ${pdfBuffer.length} bytes, header: ${pdfBuffer.toString('ascii', 0, 10)})`);
          }
          
          resolve(pdfBuffer);
        } catch (error) {
          console.error(`❌ Failed to read PDF file: ${error.message}`);
          reject(new Error(`Failed to read generated PDF: ${error.message}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start LaTeX process: ${error.message}. LaTeX may not be installed.`));
      });
    });
  }

  /**
   * Generate PDF using Puppeteer directly from document
   */
  private async generatePuppeteerPDF(document: AcademicDocument, config: CompactLayoutConfig): Promise<Buffer> {
    try {
      // Generate HTML content directly from document
      const htmlContent = this.generateHTMLFromDocument(document, config);
      
      // Generate PDF from HTML
      return await this.htmlToPDF(htmlContent);
      
    } catch (error) {
      throw new Error(`Puppeteer PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF from HTML as fallback when LaTeX is not available
   */
  private async generatePDFFromHTML(texFile: string, options: LaTeXGenerationOptions): Promise<Buffer> {
    try {
      // Read the LaTeX source
      const latexSource = await fs.readFile(texFile, 'utf8');
      
      // Convert LaTeX to HTML
      const htmlContent = this.convertLaTeXToHTML(latexSource);
      
      // Generate PDF from HTML using a simple approach
      return await this.htmlToPDF(htmlContent);
      
    } catch (error) {
      throw new Error(`HTML-based PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML content directly from academic document
   */
  private generateHTMLFromDocument(document: AcademicDocument, config: CompactLayoutConfig): string {
    const title = document.title || 'Compact Study Guide';
    
    const partsHTML = document.parts.map(part => `
      <div class="part">
        <h1>${part.title}</h1>
        ${part.sections.map(section => `
          <div class="section">
            <h2>${section.sectionNumber} ${section.title}</h2>
            <div class="content">${section.content}</div>
            ${section.formulas.map(formula => `
              <div class="formula">${formula.latex || formula.text}</div>
            `).join('')}
            ${section.examples.map(example => `
              <div class="example">
                <h4>${example.title}</h4>
                <div class="problem">${example.problem}</div>
                ${example.solution ? `<div class="solution">${example.solution}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: 'Times New Roman', serif; 
      font-size: ${config.typography.fontSize}pt; 
      line-height: ${config.typography.lineHeight}; 
      margin: ${config.margins.top}mm ${config.margins.right}mm ${config.margins.bottom}mm ${config.margins.left}mm;
      column-count: ${config.columns}; 
      column-gap: ${config.margins.columnGap}mm; 
    }
    h1, h2, h3, h4 { 
      break-after: avoid; 
      margin-top: ${config.spacing.headingMargins.top}em; 
      margin-bottom: ${config.spacing.headingMargins.bottom}em; 
    }
    h1 { font-size: ${config.typography.fontSize + 4}pt; column-span: all; }
    h2 { font-size: ${config.typography.fontSize + 2}pt; }
    h3 { font-size: ${config.typography.fontSize + 1}pt; }
    h4 { font-size: ${config.typography.fontSize}pt; }
    p, .content { margin: ${config.spacing.paragraphSpacing}em 0; }
    .formula { 
      text-align: center; 
      margin: 0.5em 0; 
      font-style: italic; 
      break-inside: avoid;
    }
    .example { 
      margin: 1em 0; 
      padding: 0.5em; 
      border-left: 3px solid #ccc; 
      break-inside: avoid;
    }
    .part { break-before: page; }
    .section { break-inside: avoid; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${partsHTML}
</body>
</html>`;
  }

  /**
   * Convert LaTeX source to HTML (simplified conversion)
   */
  private convertLaTeXToHTML(latexSource: string): string {
    // Simple LaTeX to HTML conversion
    let html = latexSource;
    
    // Remove LaTeX document structure
    html = html.replace(/\\documentclass\[.*?\]\{.*?\}/, '');
    html = html.replace(/\\usepackage\[.*?\]\{.*?\}/g, '');
    html = html.replace(/\\usepackage\{.*?\}/g, '');
    html = html.replace(/\\geometry\{[\s\S]*?\}/, '');
    html = html.replace(/\\begin\{document\}/, '');
    html = html.replace(/\\end\{document\}/, '');
    
    // Convert basic LaTeX commands to HTML
    html = html.replace(/\\title\{(.*?)\}/g, '<h1>$1</h1>');
    html = html.replace(/\\section\{(.*?)\}/g, '<h2>$1</h2>');
    html = html.replace(/\\subsection\{(.*?)\}/g, '<h3>$1</h3>');
    html = html.replace(/\\subsubsection\{(.*?)\}/g, '<h4>$1</h4>');
    
    // Convert text formatting
    html = html.replace(/\\textbf\{(.*?)\}/g, '<strong>$1</strong>');
    html = html.replace(/\\textit\{(.*?)\}/g, '<em>$1</em>');
    html = html.replace(/\\emph\{(.*?)\}/g, '<em>$1</em>');
    
    // Convert math environments (simplified)
    html = html.replace(/\\\[([\s\S]*?)\\\]/g, '<div class="math-display">$1</div>');
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-display">$1</div>');
    html = html.replace(/\$(.*?)\$/g, '<span class="math-inline">$1</span>');
    
    // Convert lists
    html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, content) => {
      const items = content.replace(/\\item\s*/g, '<li>').replace(/\n\s*(?=<li>)/g, '</li>\n');
      return `<ul>${items}</li></ul>`;
    });
    
    html = html.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (match, content) => {
      const items = content.replace(/\\item\s*/g, '<li>').replace(/\n\s*(?=<li>)/g, '</li>\n');
      return `<ol>${items}</li></ol>`;
    });
    
    // Clean up extra whitespace and newlines
    html = html.replace(/\n\s*\n/g, '</p><p>');
    html = html.replace(/^\s*/, '<p>');
    html = html.replace(/\s*$/, '</p>');
    
    // Wrap in basic HTML structure
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compact Study Guide</title>
  <style>
    body { 
      font-family: 'Times New Roman', serif; 
      font-size: 10pt; 
      line-height: 1.2; 
      margin: 20mm; 
      column-count: 2; 
      column-gap: 10mm; 
    }
    h1, h2, h3, h4 { 
      break-after: avoid; 
      margin-top: 0.5em; 
      margin-bottom: 0.25em; 
    }
    h1 { font-size: 14pt; }
    h2 { font-size: 12pt; }
    h3 { font-size: 11pt; }
    h4 { font-size: 10pt; }
    p { margin: 0.3em 0; }
    .math-display { 
      text-align: center; 
      margin: 0.5em 0; 
      font-style: italic; 
    }
    .math-inline { font-style: italic; }
    ul, ol { margin: 0.25em 0; padding-left: 1.5em; }
    li { margin: 0.15em 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPDF(htmlContent: string): Promise<Buffer> {
    let browser;
    try {
      // Try to use Puppeteer for PDF generation
      const puppeteer = await import('puppeteer');
      
      console.log('🔄 Launching Puppeteer for PDF generation...');
      
      // Enhanced browser launch options for better compatibility
      browser = await puppeteer.default.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--run-all-compositor-stages-before-draw',
          '--memory-pressure-off'
        ],
        timeout: 30000
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 800 });
      
      // Set content with enhanced options
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });
      
      // Wait a bit more for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📄 Generating PDF with Puppeteer...');
      
      // Generate PDF with compact settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        timeout: 30000
      });

      await browser.close();
      console.log('✅ PDF generated successfully with Puppeteer');
      
      return pdfBuffer;
      
    } catch (puppeteerError) {
      console.error('Puppeteer PDF generation failed:', puppeteerError.message);
      
      // Ensure browser is closed even on error
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn('Failed to close browser:', closeError.message);
        }
      }
      
      // Throw the actual error instead of calling createPDFErrorFallback
      throw new Error(`Puppeteer failed: ${puppeteerError.message}`);
    }
  }

  /**
   * Create a fallback error message when all PDF generation methods fail
   */
  private createPDFErrorFallback(): never {
    const errorMessage = `PDF generation failed: All methods exhausted.

Available solutions:
1. Install LaTeX on your system (recommended for best quality)
   - macOS: brew install --cask mactex
   - Ubuntu: sudo apt install texlive-full
   - Windows: Download from https://miktex.org/

2. Ensure Puppeteer is properly configured with Chrome/Chromium
   - Check if Chrome is installed and accessible
   - Verify system has sufficient memory for browser instances

3. Use HTML or Markdown output formats instead
   - Set outputFormat to 'html' or 'markdown' in your request

4. Check environment configuration:
   - ENABLE_LATEX_PDF=${this.enableLatex}
   - ENABLE_PUPPETEER_FALLBACK=${this.enablePuppeteerFallback}
   - LATEX_TEMP_DIR=${this.tempDir}

For detailed setup instructions, see docs/LATEX_SETUP.md`;

    throw new Error(errorMessage);
  }

  /**
   * Get page count from PDF buffer
   */
  private async getPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
      // Simple PDF page count extraction
      const pdfString = pdfBuffer.toString('binary');
      const matches = pdfString.match(/\/Count\s+(\d+)/);
      
      if (matches && matches[1]) {
        return parseInt(matches[1], 10);
      }
      
      // Fallback: count page objects
      const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
      return pageMatches ? pageMatches.length : 1;
    } catch (error) {
      console.warn('Could not determine PDF page count:', error);
      return 1;
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to clean up file ${file}:`, error.message);
      }
    }
  }
}