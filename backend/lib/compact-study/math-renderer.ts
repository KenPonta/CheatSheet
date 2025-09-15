// Mathematical content rendering system for compact study generator

import { 
  Formula, 
  WorkedExample, 
  SolutionStep, 
  MathRenderingConfig, 
  CompactLayoutConfig,
  MathContentExtractionError 
} from './types';

export interface MathRenderer {
  renderFormula(formula: Formula, config: MathRenderingConfig): RenderedFormula;
  renderWorkedExample(example: WorkedExample, config: MathRenderingConfig): RenderedExample;
  renderSolutionStep(step: SolutionStep, config: MathRenderingConfig): RenderedStep;
  validateRendering(rendered: RenderedContent): ValidationResult;
}

export interface RenderedFormula {
  id: string;
  html: string;
  latex: string;
  type: 'inline' | 'display';
  numbered: boolean;
  equationNumber?: string;
  width: number;
  height: number;
  requiresFullWidth: boolean;
  fallbackText?: string;
}

export interface RenderedExample {
  id: string;
  title: string;
  problem: RenderedContent;
  solution: RenderedStep[];
  totalHeight: number;
  breakable: boolean;
}

export interface RenderedStep {
  stepNumber: number;
  description: RenderedContent;
  formula?: RenderedFormula;
  explanation: RenderedContent;
  height: number;
}

export interface RenderedContent {
  html: string;
  latex?: string;
  plainText: string;
  containsMath: boolean;
  mathElements: RenderedFormula[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  renderingQuality: number; // 0-1 scale
}

export interface MathJaxConfig {
  tex: {
    inlineMath: string[][];
    displayMath: string[][];
    processEscapes: boolean;
    processEnvironments: boolean;
    tags: 'ams' | 'all' | 'none';
  };
  svg: {
    fontCache: 'global' | 'local' | 'none';
    displayAlign: 'left' | 'center' | 'right';
    displayIndent: string;
  };
  options: {
    renderActions: any;
    skipHtmlTags: string[];
    includeHtmlTags: string[];
  };
}

export interface KaTeXConfig {
  displayMode: boolean;
  throwOnError: boolean;
  errorColor: string;
  macros: Record<string, string>;
  colorIsTextColor: boolean;
  maxSize: number;
  maxExpand: number;
  strict: boolean | 'warn' | 'ignore';
}

/**
 * Mathematical content rendering system that handles LaTeX/MathJax/KaTeX rendering
 * with support for equation numbering, centering, and column overflow handling
 */
export class MathContentRenderer implements MathRenderer {
  private equationCounter: number = 0;
  private renderer: 'mathjax' | 'katex' | 'fallback';
  private config: MathRenderingConfig;

  constructor(config: MathRenderingConfig, renderer: 'mathjax' | 'katex' | 'fallback' = 'mathjax') {
    this.config = config;
    this.renderer = renderer;
  }

  /**
   * Renders a mathematical formula with appropriate formatting
   */
  renderFormula(formula: Formula, config?: MathRenderingConfig): RenderedFormula {
    const renderConfig = config || this.config;
    
    try {
      const isDisplay = formula.type === 'display';
      const shouldNumber = isDisplay && renderConfig.displayEquations.numbered;
      const equationNumber = shouldNumber ? this.getNextEquationNumber() : undefined;

      let html: string;
      let width: number;
      let height: number;
      let requiresFullWidth = false;

      if (this.renderer === 'mathjax') {
        html = this.renderWithMathJax(formula.latex, isDisplay, equationNumber);
      } else if (this.renderer === 'katex') {
        html = this.renderWithKaTeX(formula.latex, isDisplay, equationNumber);
      } else {
        html = this.renderFallback(formula.latex, isDisplay, equationNumber);
      }

      // Estimate dimensions (would be more accurate with actual rendering)
      const dimensions = this.estimateFormulaDimensions(formula.latex, isDisplay);
      width = dimensions.width;
      height = dimensions.height;

      // Check if formula requires full width (column overflow)
      if (isDisplay && renderConfig.displayEquations.fullWidth) {
        requiresFullWidth = this.checkFullWidthRequirement(formula.latex, width);
      }

      return {
        id: formula.id,
        html,
        latex: formula.latex,
        type: formula.type,
        numbered: shouldNumber,
        equationNumber,
        width,
        height,
        requiresFullWidth,
        fallbackText: formula.originalText
      };
    } catch (error) {
      throw new MathContentExtractionError(
        `Failed to render formula ${formula.id}: ${error.message}`,
        'LATEX_CONVERSION_FAILED',
        formula.sourceLocation,
        true
      );
    }
  }

  /**
   * Renders a complete worked example with all solution steps
   */
  renderWorkedExample(example: WorkedExample, config?: MathRenderingConfig): RenderedExample {
    const renderConfig = config || this.config;

    try {
      const problem = this.renderContent(example.problem, renderConfig);
      const solution = example.solution.map(step => this.renderSolutionStep(step, renderConfig));
      
      const totalHeight = this.calculateExampleHeight(problem, solution);
      const breakable = this.isExampleBreakable(example, solution);

      return {
        id: example.id,
        title: example.title,
        problem,
        solution,
        totalHeight,
        breakable
      };
    } catch (error) {
      throw new MathContentExtractionError(
        `Failed to render worked example ${example.id}: ${error.message}`,
        'EXAMPLE_PARSING_FAILED',
        example.sourceLocation,
        true
      );
    }
  }

  /**
   * Renders a single solution step with mathematical content
   */
  renderSolutionStep(step: SolutionStep, config?: MathRenderingConfig): RenderedStep {
    const renderConfig = config || this.config;

    const description = this.renderContent(step.description, renderConfig);
    const explanation = this.renderContent(step.explanation, renderConfig);
    
    let formula: RenderedFormula | undefined;
    if (step.formula || step.latex) {
      const formulaLatex = step.latex || step.formula!;
      const tempFormula: Formula = {
        id: `step-${step.stepNumber}-formula`,
        latex: formulaLatex,
        context: step.description,
        type: 'display',
        sourceLocation: { fileId: 'step' },
        isKeyFormula: false,
        confidence: 1.0
      };
      formula = this.renderFormula(tempFormula, renderConfig);
    }

    const height = this.calculateStepHeight(description, formula, explanation);

    return {
      stepNumber: step.stepNumber,
      description,
      formula,
      explanation,
      height
    };
  }

  /**
   * Validates the quality of rendered mathematical content
   */
  validateRendering(rendered: RenderedContent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let renderingQuality = 1.0;

    // Check for malformed HTML
    if (!this.isValidHTML(rendered.html)) {
      errors.push('Generated HTML is malformed');
      renderingQuality -= 0.3;
    }

    // Check for missing math elements
    if (rendered.containsMath && rendered.mathElements.length === 0) {
      warnings.push('Content marked as containing math but no math elements found');
      renderingQuality -= 0.1;
    }

    // Check for fallback usage
    const fallbackCount = rendered.mathElements.filter(el => el.fallbackText).length;
    if (fallbackCount > 0) {
      warnings.push(`${fallbackCount} formulas using fallback rendering`);
      renderingQuality -= 0.05 * fallbackCount;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      renderingQuality: Math.max(0, renderingQuality)
    };
  }

  /**
   * Generates MathJax configuration for the rendering system
   */
  getMathJaxConfig(): MathJaxConfig {
    return {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        tags: this.config.displayEquations.numbered ? 'ams' : 'none'
      },
      svg: {
        fontCache: 'global',
        displayAlign: this.config.displayEquations.centered ? 'center' : 'left',
        displayIndent: '0em'
      },
      options: {
        renderActions: {
          addMenu: [0, '', '']
        },
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        includeHtmlTags: ['p', 'div', 'span', 'li', 'td', 'th']
      }
    };
  }

  /**
   * Generates KaTeX configuration for the rendering system
   */
  getKaTeXConfig(displayMode: boolean = false): KaTeXConfig {
    return {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      macros: {
        '\\RR': '\\mathbb{R}',
        '\\NN': '\\mathbb{N}',
        '\\ZZ': '\\mathbb{Z}',
        '\\QQ': '\\mathbb{Q}',
        '\\CC': '\\mathbb{C}',
        '\\PP': '\\mathbb{P}',
        '\\EE': '\\mathbb{E}',
        '\\Var': '\\text{Var}',
        '\\Cov': '\\text{Cov}'
      },
      colorIsTextColor: false,
      maxSize: Infinity,
      maxExpand: 1000,
      strict: 'warn'
    };
  }

  // Private helper methods

  private renderWithMathJax(latex: string, isDisplay: boolean, equationNumber?: string): string {
    const delimiter = isDisplay ? '$$' : '$';
    let mathContent = `${delimiter}${latex}${delimiter}`;
    
    if (isDisplay && equationNumber && this.config.displayEquations.numbered) {
      mathContent = `\\begin{equation}\\label{eq:${equationNumber}}${latex}\\end{equation}`;
    }

    return `<span class="math-content ${isDisplay ? 'display-math' : 'inline-math'}">${mathContent}</span>`;
  }

  private renderWithKaTeX(latex: string, isDisplay: boolean, equationNumber?: string): string {
    // KaTeX rendering would be implemented here
    // For now, return a placeholder structure
    const className = isDisplay ? 'katex-display' : 'katex-inline';
    let content = latex;
    
    if (isDisplay && equationNumber && this.config.displayEquations.numbered) {
      content = `\\tag{${equationNumber}}${latex}`;
    }

    return `<span class="${className}" data-latex="${encodeURIComponent(content)}">${content}</span>`;
  }

  private renderFallback(latex: string, isDisplay: boolean, equationNumber?: string): string {
    const className = isDisplay ? 'math-fallback-display' : 'math-fallback-inline';
    let content = latex;
    
    if (isDisplay && equationNumber && this.config.displayEquations.numbered) {
      content = `(${equationNumber}) ${latex}`;
    }

    return `<code class="${className}">${content}</code>`;
  }

  private renderContent(text: string, config: MathRenderingConfig): RenderedContent {
    const mathElements: RenderedFormula[] = [];
    let processedHtml = text;
    let containsMath = false;

    // First, detect and render display math ($$...$$) to avoid conflicts with inline math
    const displayMathRegex = /\$\$([^$]+?)\$\$/g;
    let match;
    while ((match = displayMathRegex.exec(text)) !== null) {
      containsMath = true;
      const latex = match[1];
      const tempFormula: Formula = {
        id: `display-${Date.now()}-${Math.random()}`,
        latex,
        context: text,
        type: 'display',
        sourceLocation: { fileId: 'content' },
        isKeyFormula: false,
        confidence: 1.0
      };
      
      const rendered = this.renderFormula(tempFormula, config);
      mathElements.push(rendered);
      processedHtml = processedHtml.replace(match[0], rendered.html);
    }

    // Then detect and render inline math ($...$) on the processed text
    const inlineMathRegex = /\$([^$]+?)\$/g;
    while ((match = inlineMathRegex.exec(processedHtml)) !== null) {
      // Skip if this is part of already processed display math
      if (match[0].includes('math-content')) continue;
      
      containsMath = true;
      const latex = match[1];
      const tempFormula: Formula = {
        id: `inline-${Date.now()}-${Math.random()}`,
        latex,
        context: text,
        type: 'inline',
        sourceLocation: { fileId: 'content' },
        isKeyFormula: false,
        confidence: 1.0
      };
      
      const rendered = this.renderFormula(tempFormula, config);
      mathElements.push(rendered);
      processedHtml = processedHtml.replace(match[0], rendered.html);
    }

    return {
      html: processedHtml,
      plainText: text.replace(/\$\$[^$]+?\$\$|\$[^$]+?\$/g, '[MATH]'),
      containsMath,
      mathElements
    };
  }

  private getNextEquationNumber(): string {
    return (++this.equationCounter).toString();
  }

  private estimateFormulaDimensions(latex: string, isDisplay: boolean): { width: number; height: number } {
    // Rough estimation based on LaTeX content
    const baseWidth = latex.length * (isDisplay ? 12 : 8);
    const baseHeight = isDisplay ? 40 : 20;
    
    // Adjust for complex elements
    const complexElements = (latex.match(/\\frac|\\sum|\\int|\\prod|\\sqrt/g) || []).length;
    const height = baseHeight + (complexElements * 15);
    
    return { width: baseWidth, height };
  }

  private checkFullWidthRequirement(latex: string, estimatedWidth: number): boolean {
    // Check if formula is too wide for column layout
    const maxColumnWidth = 300; // Approximate column width in pixels
    
    // Long formulas or those with specific patterns should use full width
    const longFormula = estimatedWidth > maxColumnWidth;
    const hasWideElements = /\\begin\{align|\\begin\{array|\\begin\{matrix/.test(latex);
    
    return longFormula || hasWideElements;
  }

  private calculateExampleHeight(problem: RenderedContent, solution: RenderedStep[]): number {
    const problemHeight = this.estimateContentHeight(problem);
    const solutionHeight = solution.reduce((total, step) => total + step.height, 0);
    return problemHeight + solutionHeight + 40; // Add padding
  }

  private calculateStepHeight(description: RenderedContent, formula?: RenderedFormula, explanation?: RenderedContent): number {
    let height = this.estimateContentHeight(description);
    
    if (formula) {
      height += formula.height + 10; // Add margin
    }
    
    if (explanation) {
      height += this.estimateContentHeight(explanation);
    }
    
    return height + 15; // Add step padding
  }

  private estimateContentHeight(content: RenderedContent): number {
    // Rough estimation based on text length and math elements
    const textLines = Math.ceil(content.plainText.length / 80); // ~80 chars per line
    const mathHeight = content.mathElements.reduce((total, math) => total + math.height, 0);
    return (textLines * 18) + mathHeight; // 18px line height
  }

  private isExampleBreakable(example: WorkedExample, solution: RenderedStep[]): boolean {
    // Examples with multiple steps can potentially be broken
    return solution.length > 2 && example.solution.length > 2;
  }

  private isValidHTML(html: string): boolean {
    try {
      // Basic HTML validation - check for balanced tags
      const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (html.match(/<\/[^>]*>/g) || []).length;
      const selfClosing = (html.match(/<[^>]*\/>/g) || []).length;
      
      return openTags === closeTags + selfClosing;
    } catch {
      return false;
    }
  }

  /**
   * Resets the equation counter (useful for new documents)
   */
  resetEquationCounter(): void {
    this.equationCounter = 0;
  }

  /**
   * Gets the current equation count
   */
  getEquationCount(): number {
    return this.equationCounter;
  }

  /**
   * Updates the rendering configuration
   */
  updateConfig(config: MathRenderingConfig): void {
    this.config = config;
  }

  /**
   * Switches the rendering backend
   */
  setRenderer(renderer: 'mathjax' | 'katex' | 'fallback'): void {
    this.renderer = renderer;
  }
}

/**
 * Factory function to create a math renderer with default configuration
 */
export function createMathRenderer(
  config?: Partial<MathRenderingConfig>, 
  renderer: 'mathjax' | 'katex' | 'fallback' = 'mathjax'
): MathContentRenderer {
  const defaultConfig: MathRenderingConfig = {
    displayEquations: {
      centered: true,
      numbered: true,
      fullWidth: true
    },
    inlineEquations: {
      preserveInline: true,
      maxHeight: 20
    }
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new MathContentRenderer(finalConfig, renderer);
}

/**
 * Utility function to extract math content from text
 */
export function extractMathFromText(text: string): { inline: string[]; display: string[] } {
  const inline: string[] = [];
  const display: string[] = [];

  // First extract display math to avoid conflicts
  const displayMatches = text.match(/\$\$([^$]+?)\$\$/g);
  if (displayMatches) {
    display.push(...displayMatches.map(match => match.slice(2, -2)));
  }

  // Remove display math from text before extracting inline math
  const textWithoutDisplay = text.replace(/\$\$[^$]+?\$\$/g, '');

  // Extract inline math from remaining text
  const inlineMatches = textWithoutDisplay.match(/\$([^$]+?)\$/g);
  if (inlineMatches) {
    inline.push(...inlineMatches.map(match => match.slice(1, -1)));
  }

  return { inline, display };
}