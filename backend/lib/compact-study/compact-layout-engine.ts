/**
 * Compact Layout Engine Core
 * 
 * Implements the core layout engine for generating compact, academic-style study materials
 * with two-column layouts, dense typography, and optimized space utilization.
 */

import {
  CompactLayoutConfig,
  TypographyConfig,
  SpacingConfig,
  MarginConfig,
  MathRenderingConfig,
  LayoutCalculation,
  ColumnDistribution,
  ColumnContent,
  ContentBlock,
  AcademicDocument,
  LayoutError
} from './types';

export class CompactLayoutEngine {
  private config: CompactLayoutConfig;

  constructor(config?: Partial<CompactLayoutConfig>) {
    this.config = this.createDefaultConfig();
    if (config) {
      this.config = this.mergeConfig(this.config, config);
    }
    this.validateConfig();
  }

  /**
   * Creates default compact layout configuration
   */
  private createDefaultConfig(): CompactLayoutConfig {
    return {
      paperSize: 'a4',
      columns: 2,
      typography: this.createDefaultTypographyConfig(),
      spacing: this.createDefaultSpacingConfig(),
      margins: this.createDefaultMarginConfig(),
      mathRendering: this.createDefaultMathRenderingConfig()
    };
  }

  /**
   * Creates default typography configuration with compact settings
   */
  private createDefaultTypographyConfig(): TypographyConfig {
    return {
      fontSize: 10.5, // 10-11pt range
      lineHeight: 1.2, // 1.15-1.25 range
      fontFamily: {
        body: 'Times, "Times New Roman", serif',
        heading: 'Arial, "Helvetica Neue", sans-serif',
        math: 'Computer Modern, "Latin Modern Math", serif',
        code: 'Consolas, "Courier New", monospace'
      }
    };
  }

  /**
   * Creates default spacing configuration with compact settings
   */
  private createDefaultSpacingConfig(): SpacingConfig {
    return {
      paragraphSpacing: 0.3, // ≤ 0.35em
      listSpacing: 0.2, // ≤ 0.25em
      sectionSpacing: 0.8,
      headingMargins: {
        top: 0.5,
        bottom: 0.3
      }
    };
  }

  /**
   * Creates default margin configuration
   */
  private createDefaultMarginConfig(): MarginConfig {
    return {
      top: 0.75, // inches
      bottom: 0.75,
      left: 0.75,
      right: 0.75,
      columnGap: 0.25
    };
  }

  /**
   * Creates default math rendering configuration
   */
  private createDefaultMathRenderingConfig(): MathRenderingConfig {
    return {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true // Allow overflow to full width when needed
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 1.5 // em units
      }
    };
  }

  /**
   * Merges user configuration with defaults
   */
  private mergeConfig(defaultConfig: CompactLayoutConfig, userConfig: Partial<CompactLayoutConfig>): CompactLayoutConfig {
    return {
      paperSize: userConfig.paperSize ?? defaultConfig.paperSize,
      columns: userConfig.columns ?? defaultConfig.columns,
      typography: {
        ...defaultConfig.typography,
        ...userConfig.typography,
        fontFamily: {
          ...defaultConfig.typography.fontFamily,
          ...userConfig.typography?.fontFamily
        }
      },
      spacing: {
        ...defaultConfig.spacing,
        ...userConfig.spacing,
        headingMargins: {
          ...defaultConfig.spacing.headingMargins,
          ...userConfig.spacing?.headingMargins
        }
      },
      margins: {
        ...defaultConfig.margins,
        ...userConfig.margins
      },
      mathRendering: {
        ...defaultConfig.mathRendering,
        ...userConfig.mathRendering,
        displayEquations: {
          ...defaultConfig.mathRendering.displayEquations,
          ...userConfig.mathRendering?.displayEquations
        },
        inlineEquations: {
          ...defaultConfig.mathRendering.inlineEquations,
          ...userConfig.mathRendering?.inlineEquations
        }
      }
    };
  }

  /**
   * Validates the configuration for consistency and constraints
   */
  private validateConfig(): void {
    const { typography, spacing, columns } = this.config;

    // Validate typography constraints
    if (typography.fontSize < 8 || typography.fontSize > 14) {
      throw new LayoutError(
        `Font size ${typography.fontSize}pt is outside recommended range (8-14pt)`,
        'INVALID_CONFIG',
        undefined,
        'typography',
        'Use font size between 8-14pt for readability'
      );
    }

    if (typography.lineHeight < 1.0 || typography.lineHeight > 2.0) {
      throw new LayoutError(
        `Line height ${typography.lineHeight} is outside valid range (1.0-2.0)`,
        'INVALID_CONFIG',
        undefined,
        'typography',
        'Use line height between 1.0-2.0'
      );
    }

    // Validate spacing constraints
    if (spacing.paragraphSpacing > 0.35) {
      throw new LayoutError(
        `Paragraph spacing ${spacing.paragraphSpacing}em exceeds compact limit (≤0.35em)`,
        'INVALID_CONFIG',
        undefined,
        'spacing',
        'Reduce paragraph spacing to ≤0.35em for compact layout'
      );
    }

    if (spacing.listSpacing > 0.25) {
      throw new LayoutError(
        `List spacing ${spacing.listSpacing}em exceeds compact limit (≤0.25em)`,
        'INVALID_CONFIG',
        undefined,
        'spacing',
        'Reduce list spacing to ≤0.25em for compact layout'
      );
    }

    // Validate column configuration
    if (columns < 1 || columns > 3) {
      throw new LayoutError(
        `Column count ${columns} is outside supported range (1-3)`,
        'INVALID_CONFIG',
        undefined,
        'layout',
        'Use 1-3 columns for optimal readability'
      );
    }
  }

  /**
   * Calculates layout dimensions and properties
   */
  public calculateLayout(): LayoutCalculation {
    const paperDimensions = this.getPaperDimensions();
    const { margins, typography, columns } = this.config;

    // Calculate content area
    const contentWidth = paperDimensions.width - margins.left - margins.right;
    const contentHeight = paperDimensions.height - margins.top - margins.bottom;

    // Calculate column dimensions
    const totalColumnGaps = (columns - 1) * margins.columnGap;
    const columnWidth = (contentWidth - totalColumnGaps) / columns;

    // Calculate typography metrics
    const effectiveLineHeight = typography.fontSize * typography.lineHeight;
    const linesPerColumn = Math.floor(contentHeight / (effectiveLineHeight / 72)); // Convert to inches
    
    // Estimate characters per line (rough approximation)
    const avgCharWidth = typography.fontSize * 0.6; // Approximate character width
    const charactersPerLine = Math.floor((columnWidth * 72) / avgCharWidth); // Convert to points

    // Calculate content density
    const totalLines = linesPerColumn * columns;
    const totalCharacters = totalLines * charactersPerLine;
    const estimatedContentDensity = totalCharacters / (paperDimensions.width * paperDimensions.height);

    return {
      pageWidth: paperDimensions.width,
      pageHeight: paperDimensions.height,
      contentWidth,
      contentHeight,
      columnWidth,
      columnCount: columns,
      effectiveLineHeight,
      linesPerColumn,
      charactersPerLine,
      estimatedContentDensity
    };
  }

  /**
   * Distributes content across columns with optimal balancing
   */
  public distributeContent(contentBlocks: ContentBlock[]): ColumnDistribution {
    const layout = this.calculateLayout();
    const columns: ColumnContent[] = Array.from({ length: layout.columnCount }, (_, index) => ({
      columnIndex: index,
      content: [],
      estimatedHeight: 0
    }));

    // Sort content blocks by priority (higher priority first)
    const sortedBlocks = [...contentBlocks].sort((a, b) => b.priority - a.priority);

    // Distribute content using a greedy algorithm with balancing
    for (const block of sortedBlocks) {
      const targetColumn = this.findBestColumn(columns, block, layout);
      
      if (targetColumn.estimatedHeight + block.estimatedHeight > layout.contentHeight) {
        // Handle overflow
        if (block.breakable) {
          // Split the block if possible
          const splitBlocks = this.splitContentBlock(block, layout.contentHeight - targetColumn.estimatedHeight);
          targetColumn.content.push(splitBlocks.first);
          targetColumn.estimatedHeight += splitBlocks.first.estimatedHeight;
          
          // Add remaining parts to subsequent columns
          if (splitBlocks.remaining) {
            sortedBlocks.push(splitBlocks.remaining);
          }
        } else {
          // Move to next column or handle as overflow
          const nextColumn = this.findNextAvailableColumn(columns, block, layout);
          if (nextColumn) {
            nextColumn.content.push(block);
            nextColumn.estimatedHeight += block.estimatedHeight;
          } else {
            // Content overflow - this needs to be handled by the caller
            throw new LayoutError(
              `Content block "${block.id}" cannot fit in available space`,
              'COLUMN_OVERFLOW',
              block.id,
              block.type,
              'Consider reducing content or increasing page size'
            );
          }
        }
      } else {
        targetColumn.content.push(block);
        targetColumn.estimatedHeight += block.estimatedHeight;
      }
    }

    // Calculate balance metrics
    const totalHeight = Math.max(...columns.map(col => col.estimatedHeight));
    const avgHeight = columns.reduce((sum, col) => sum + col.estimatedHeight, 0) / columns.length;
    const variance = columns.reduce((sum, col) => sum + Math.pow(col.estimatedHeight - avgHeight, 2), 0) / columns.length;
    const balanceScore = Math.max(0, 1 - (Math.sqrt(variance) / avgHeight));
    
    // Calculate overflow risk
    const maxCapacity = layout.contentHeight;
    const overflowRisk = Math.max(...columns.map(col => Math.min(1, col.estimatedHeight / maxCapacity)));

    return {
      columns,
      totalHeight,
      balanceScore,
      overflowRisk
    };
  }

  /**
   * Finds the best column for a content block
   */
  private findBestColumn(columns: ColumnContent[], block: ContentBlock, layout: LayoutCalculation): ColumnContent {
    // Find column with least content that can still fit the block
    const availableColumns = columns.filter(col => 
      col.estimatedHeight + block.estimatedHeight <= layout.contentHeight
    );

    if (availableColumns.length === 0) {
      // Return column with least content for overflow handling
      return columns.reduce((min, col) => col.estimatedHeight < min.estimatedHeight ? col : min);
    }

    // Return column with least content among available ones
    return availableColumns.reduce((min, col) => col.estimatedHeight < min.estimatedHeight ? col : min);
  }

  /**
   * Finds next available column that can fit the content block
   */
  private findNextAvailableColumn(columns: ColumnContent[], block: ContentBlock, layout: LayoutCalculation): ColumnContent | null {
    for (const column of columns) {
      if (column.estimatedHeight + block.estimatedHeight <= layout.contentHeight) {
        return column;
      }
    }
    return null;
  }

  /**
   * Splits a content block to fit available space
   */
  private splitContentBlock(block: ContentBlock, availableHeight: number): { first: ContentBlock; remaining?: ContentBlock } {
    if (!block.breakable || availableHeight <= 0) {
      return { first: block };
    }

    // Simple split based on height ratio
    const splitRatio = availableHeight / block.estimatedHeight;
    const splitPoint = Math.floor(block.content.length * splitRatio);

    if (splitPoint <= 0) {
      return { first: block };
    }

    const firstPart: ContentBlock = {
      ...block,
      id: `${block.id}_part1`,
      content: block.content.substring(0, splitPoint),
      estimatedHeight: availableHeight
    };

    const remainingPart: ContentBlock = {
      ...block,
      id: `${block.id}_part2`,
      content: block.content.substring(splitPoint),
      estimatedHeight: block.estimatedHeight - availableHeight
    };

    return {
      first: firstPart,
      remaining: remainingPart.content.length > 0 ? remainingPart : undefined
    };
  }

  /**
   * Gets paper dimensions in inches
   */
  private getPaperDimensions(): { width: number; height: number } {
    switch (this.config.paperSize) {
      case 'a4':
        return { width: 8.27, height: 11.69 };
      case 'letter':
        return { width: 8.5, height: 11 };
      case 'legal':
        return { width: 8.5, height: 14 };
      default:
        return { width: 8.5, height: 11 }; // Default to letter
    }
  }

  /**
   * Updates the layout configuration
   */
  public updateConfig(newConfig: Partial<CompactLayoutConfig>): void {
    this.config = this.mergeConfig(this.config, newConfig);
    this.validateConfig();
  }

  /**
   * Gets the current configuration
   */
  public getConfig(): CompactLayoutConfig {
    return { ...this.config };
  }

  /**
   * Estimates content block height based on content and typography
   */
  public estimateContentHeight(content: string, type: ContentBlock['type']): number {
    const { typography } = this.config;
    const baseLineHeight = typography.fontSize * typography.lineHeight / 72; // Convert to inches

    // Estimate number of lines based on content type and length
    let estimatedLines: number;
    
    switch (type) {
      case 'heading':
        estimatedLines = 1;
        break;
      case 'formula':
        // Display formulas typically take more vertical space
        estimatedLines = content.includes('\\begin{') ? 3 : 1.5;
        break;
      case 'example':
        // Examples are typically longer with multiple lines
        estimatedLines = Math.max(3, Math.ceil(content.length / 80));
        break;
      case 'list':
        // Count list items
        const listItems = (content.match(/^\s*[-*+]\s/gm) || []).length;
        estimatedLines = listItems * 1.2; // Slightly more space per item
        break;
      case 'text':
      default:
        // Estimate based on character count and average line length
        const avgCharsPerLine = 80; // Approximate for academic text
        estimatedLines = Math.ceil(content.length / avgCharsPerLine);
        break;
    }

    return estimatedLines * baseLineHeight;
  }

  /**
   * Creates a content block from text content
   */
  public createContentBlock(
    id: string,
    content: string,
    type: ContentBlock['type'],
    options: {
      breakable?: boolean;
      priority?: number;
    } = {}
  ): ContentBlock {
    return {
      id,
      type,
      content,
      estimatedHeight: this.estimateContentHeight(content, type),
      breakable: options.breakable ?? (type === 'text' || type === 'list'),
      priority: options.priority ?? this.getDefaultPriority(type)
    };
  }

  /**
   * Gets default priority for content types
   */
  private getDefaultPriority(type: ContentBlock['type']): number {
    switch (type) {
      case 'heading':
        return 10;
      case 'formula':
        return 9;
      case 'example':
        return 8;
      case 'list':
        return 6;
      case 'text':
      default:
        return 5;
    }
  }
}

export default CompactLayoutEngine;