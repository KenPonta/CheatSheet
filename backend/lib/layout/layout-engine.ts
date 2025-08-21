import { 
  LayoutConfig, 
  ContentBlock, 
  LayoutCalculation, 
  LayoutWarning,
  PaperSize,
  Orientation,
  TextSize,
  ColumnCount
} from './types';
import { createDefaultPageConfig, generatePageCSSVariables } from './page-config';
import { getTextConfig, generateTextCSSVariables, validateTextReadability } from './text-config';
import { ColumnEngine } from './column-engine';
import { OverflowDetector } from './overflow-detector';

/**
 * Main layout engine that coordinates all layout subsystems
 */
export class LayoutEngine {
  private config: LayoutConfig;
  private columnEngine: ColumnEngine;
  private overflowDetector: OverflowDetector;

  constructor(config?: Partial<LayoutConfig>) {
    this.config = this.createDefaultConfig(config);
    this.columnEngine = new ColumnEngine(this.config.page, this.config.text);
    this.overflowDetector = new OverflowDetector(this.config);
  }

  /**
   * Create default layout configuration
   */
  private createDefaultConfig(config?: Partial<LayoutConfig>): LayoutConfig {
    const defaultPageConfig = createDefaultPageConfig();
    const defaultTextConfig = getTextConfig('medium');
    
    return {
      page: config?.page || defaultPageConfig,
      text: config?.text || defaultTextConfig,
      maxPages: config?.maxPages || 2,
    };
  }

  /**
   * Update layout configuration
   */
  updateConfig(updates: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...updates };
    this.columnEngine = new ColumnEngine(this.config.page, this.config.text);
    this.overflowDetector = new OverflowDetector(this.config);
  }

  /**
   * Update page configuration
   */
  updatePageConfig(
    paperSize?: PaperSize,
    orientation?: Orientation,
    columns?: ColumnCount
  ): void {
    if (paperSize) this.config.page.paperSize = paperSize;
    if (orientation) this.config.page.orientation = orientation;
    if (columns) this.config.page.columns = columns;
    
    this.columnEngine = new ColumnEngine(this.config.page, this.config.text);
    this.overflowDetector = new OverflowDetector(this.config);
  }

  /**
   * Update text configuration
   */
  updateTextConfig(size?: TextSize): void {
    if (size) {
      this.config.text = getTextConfig(size);
      this.columnEngine = new ColumnEngine(this.config.page, this.config.text);
      this.overflowDetector = new OverflowDetector(this.config);
    }
  }

  /**
   * Calculate complete layout for content blocks
   */
  calculateLayout(blocks: ContentBlock[]): LayoutCalculation {
    return this.columnEngine.calculateLayout(blocks, this.config.maxPages);
  }

  /**
   * Analyze content overflow with detailed suggestions
   */
  analyzeOverflow(blocks: ContentBlock[]) {
    return this.overflowDetector.analyzeOverflow(blocks);
  }

  /**
   * Generate all layout warnings
   */
  generateWarnings(blocks: ContentBlock[]): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];
    
    // Add text readability warnings
    warnings.push(...validateTextReadability(this.config.text));
    
    // Add layout-specific warnings
    warnings.push(...this.overflowDetector.generateLayoutWarnings(blocks));
    
    return warnings;
  }

  /**
   * Generate CSS variables for the current configuration
   */
  generateCSSVariables(): Record<string, string> {
    return {
      ...generatePageCSSVariables(this.config.page),
      ...generateTextCSSVariables(this.config.text),
    };
  }

  /**
   * Generate complete CSS for print layout
   */
  generatePrintCSS(): string {
    const variables = this.generateCSSVariables();
    const variablesCSS = Object.entries(variables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `
:root {
${variablesCSS}
}

@media print {
  @page {
    size: var(--page-width) var(--page-height);
    margin: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
  }
  
  .cheat-sheet {
    width: var(--content-width);
    height: var(--content-height);
    font-family: var(--font-family);
    line-height: var(--line-height);
    font-size: var(--font-size-body);
    column-count: var(--column-count);
    column-gap: var(--column-gap);
    column-fill: balance;
  }
  
  .cheat-sheet h1 {
    font-size: var(--font-size-h1);
    break-after: avoid;
    margin-top: 0;
    margin-bottom: 0.5em;
  }
  
  .cheat-sheet h2 {
    font-size: var(--font-size-h2);
    break-after: avoid;
    margin-top: 1em;
    margin-bottom: 0.3em;
  }
  
  .cheat-sheet h3 {
    font-size: var(--font-size-h3);
    break-after: avoid;
    margin-top: 0.8em;
    margin-bottom: 0.2em;
  }
  
  .cheat-sheet p {
    margin-top: 0;
    margin-bottom: 0.5em;
    break-inside: avoid-column;
  }
  
  .cheat-sheet ul, .cheat-sheet ol {
    margin-top: 0;
    margin-bottom: 0.5em;
    padding-left: 1.2em;
    break-inside: avoid-column;
  }
  
  .cheat-sheet li {
    margin-bottom: 0.2em;
  }
  
  .cheat-sheet table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0.5em;
    font-size: var(--font-size-small);
    break-inside: avoid-column;
  }
  
  .cheat-sheet th, .cheat-sheet td {
    border: 1px solid #ccc;
    padding: 2px 4px;
    text-align: left;
  }
  
  .cheat-sheet th {
    background-color: #f5f5f5;
    font-weight: bold;
  }
  
  .cheat-sheet img {
    max-width: 100%;
    height: auto;
    break-inside: avoid-column;
    margin-bottom: 0.3em;
  }
  
  .cheat-sheet .caption {
    font-size: var(--font-size-caption);
    font-style: italic;
    margin-top: 0.2em;
    margin-bottom: 0.5em;
  }
  
  /* Prevent orphans and widows */
  .cheat-sheet p, .cheat-sheet li {
    orphans: 2;
    widows: 2;
  }
  
  /* Force page breaks */
  .page-break {
    page-break-before: always;
  }
  
  /* Avoid breaks */
  .no-break {
    break-inside: avoid;
  }
}

/* Screen preview styles */
@media screen {
  .cheat-sheet-preview {
    width: var(--page-width);
    min-height: var(--page-height);
    margin: 20px auto;
    padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
    background: white;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    font-family: var(--font-family);
    line-height: var(--line-height);
    font-size: var(--font-size-body);
    column-count: var(--column-count);
    column-gap: var(--column-gap);
    column-fill: balance;
  }
  
  .cheat-sheet-preview h1 { font-size: var(--font-size-h1); }
  .cheat-sheet-preview h2 { font-size: var(--font-size-h2); }
  .cheat-sheet-preview h3 { font-size: var(--font-size-h3); }
  .cheat-sheet-preview .caption { font-size: var(--font-size-caption); }
}
`;
  }

  /**
   * Optimize layout for better content distribution
   */
  optimizeLayout(blocks: ContentBlock[]): ContentBlock[] {
    const layout = this.calculateLayout(blocks);
    
    // If there's overflow, try to optimize
    if (layout.overflow.hasOverflow) {
      // Sort blocks by priority and try to fit the most important ones
      const sortedBlocks = [...blocks].sort((a, b) => b.priority - a.priority);
      const optimizedBlocks: ContentBlock[] = [];
      
      let currentHeight = 0;
      const maxHeight = layout.availableSpace.height * this.config.maxPages;
      
      for (const block of sortedBlocks) {
        const blockHeight = this.estimateBlockHeight(block);
        if (currentHeight + blockHeight <= maxHeight) {
          optimizedBlocks.push(block);
          currentHeight += blockHeight;
        }
      }
      
      return optimizedBlocks;
    }
    
    return blocks;
  }

  /**
   * Estimate block height (simplified version for optimization)
   */
  private estimateBlockHeight(block: ContentBlock): number {
    if (block.estimatedHeight > 0) {
      return block.estimatedHeight;
    }
    
    // Simple estimation based on content length and type
    const baseHeight = Math.max(20, block.content.length * 0.5);
    
    switch (block.type) {
      case 'heading':
        return baseHeight * 1.5;
      case 'table':
        return baseHeight * 2;
      case 'image':
        return 100;
      default:
        return baseHeight;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LayoutConfig {
    return { ...this.config };
  }

  /**
   * Validate configuration and return warnings
   */
  validateConfig(): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];
    
    // Validate text readability
    warnings.push(...validateTextReadability(this.config.text));
    
    // Validate page configuration
    if (this.config.page.columns > 3) {
      warnings.push({
        type: 'spacing',
        severity: 'medium',
        message: 'Too many columns may reduce readability',
        affectedElements: ['columns'],
      });
    }
    
    if (this.config.maxPages > 10) {
      warnings.push({
        type: 'spacing',
        severity: 'low',
        message: 'Large number of pages may not be suitable for a cheat sheet',
        affectedElements: ['pages'],
      });
    }
    
    return warnings;
  }
}