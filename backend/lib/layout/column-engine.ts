import { ContentBlock, PageConfig, TextConfig, LayoutCalculation, Dimensions } from './types';
import { getContentArea, getColumnWidth } from './page-config';
import { estimateTextHeight, calculateFontSizes } from './text-config';

/**
 * Multi-column layout engine for content flow optimization
 */
export class ColumnEngine {
  private pageConfig: PageConfig;
  private textConfig: TextConfig;
  private contentArea: Dimensions;
  private columnWidth: number;

  constructor(pageConfig: PageConfig, textConfig: TextConfig) {
    this.pageConfig = pageConfig;
    this.textConfig = textConfig;
    this.contentArea = getContentArea(pageConfig);
    this.columnWidth = getColumnWidth(pageConfig);
  }

  /**
   * Calculate layout for given content blocks
   */
  calculateLayout(blocks: ContentBlock[], maxPages: number = 1): LayoutCalculation {
    const columns = this.distributeContentToColumns(blocks, maxPages);
    const pageBreaks = this.calculatePageBreaks(columns, maxPages);
    const overflow = this.analyzeOverflow(columns, maxPages);

    return {
      availableSpace: this.contentArea,
      usedSpace: this.calculateUsedSpace(columns),
      contentBlocks: blocks,
      overflow,
      pageBreaks,
    };
  }

  /**
   * Distribute content blocks across columns optimally
   */
  private distributeContentToColumns(
    blocks: ContentBlock[],
    maxPages: number
  ): ContentBlock[][] {
    const totalColumns = this.pageConfig.columns * maxPages;
    const columns: ContentBlock[][] = Array(totalColumns).fill(null).map(() => []);
    const columnHeights = Array(totalColumns).fill(0);
    
    // Sort blocks by priority (higher priority first)
    const sortedBlocks = [...blocks].sort((a, b) => b.priority - a.priority);
    
    for (const block of sortedBlocks) {
      const blockHeight = this.estimateBlockHeight(block);
      
      // Find the column with the least height that can fit this block
      let bestColumnIndex = 0;
      let bestColumnHeight = columnHeights[0];
      
      for (let i = 1; i < columnHeights.length; i++) {
        if (columnHeights[i] < bestColumnHeight) {
          bestColumnIndex = i;
          bestColumnHeight = columnHeights[i];
        }
      }
      
      // Check if block fits in the available column height
      const availableHeight = this.getAvailableColumnHeight();
      if (bestColumnHeight + blockHeight <= availableHeight) {
        columns[bestColumnIndex].push(block);
        columnHeights[bestColumnIndex] += blockHeight;
      } else {
        // Try to find any column that can fit this block
        let placed = false;
        for (let i = 0; i < columnHeights.length; i++) {
          if (columnHeights[i] + blockHeight <= availableHeight) {
            columns[i].push(block);
            columnHeights[i] += blockHeight;
            placed = true;
            break;
          }
        }
        
        // If no column can fit the block, it will overflow
        if (!placed) {
          columns[bestColumnIndex].push(block);
          columnHeights[bestColumnIndex] += blockHeight;
        }
      }
    }
    
    return columns;
  }

  /**
   * Calculate page breaks based on column distribution
   */
  private calculatePageBreaks(columns: ContentBlock[][], maxPages: number): number[] {
    const pageBreaks: number[] = [];
    const columnsPerPage = this.pageConfig.columns;
    
    for (let page = 1; page < maxPages; page++) {
      pageBreaks.push(page * columnsPerPage);
    }
    
    return pageBreaks;
  }

  /**
   * Analyze content overflow
   */
  private analyzeOverflow(columns: ContentBlock[][], maxPages: number) {
    const availableHeight = this.getAvailableColumnHeight();
    const totalAvailableHeight = availableHeight * this.pageConfig.columns * maxPages;
    
    let totalUsedHeight = 0;
    const overflowBlocks: string[] = [];
    
    columns.forEach((column, columnIndex) => {
      let columnHeight = 0;
      column.forEach(block => {
        const blockHeight = this.estimateBlockHeight(block);
        columnHeight += blockHeight;
        
        if (columnHeight > availableHeight) {
          overflowBlocks.push(block.id);
        }
      });
      totalUsedHeight += Math.min(columnHeight, availableHeight);
    });
    
    const overflowAmount = Math.max(0, totalUsedHeight - totalAvailableHeight);
    const hasOverflow = overflowAmount > 0 || overflowBlocks.length > 0;
    
    return {
      hasOverflow,
      overflowAmount,
      affectedBlocks: overflowBlocks,
      suggestions: this.generateOverflowSuggestions(overflowAmount, totalAvailableHeight),
    };
  }

  /**
   * Generate suggestions for handling overflow
   */
  private generateOverflowSuggestions(overflowAmount: number, totalAvailableHeight: number) {
    const suggestions = [];
    
    if (overflowAmount > 0) {
      const overflowPercentage = (overflowAmount / totalAvailableHeight) * 100;
      
      if (overflowPercentage > 50) {
        suggestions.push({
          type: 'increase-pages' as const,
          description: 'Consider increasing the number of pages',
          impact: 'high' as const,
          estimatedReduction: overflowAmount * 0.8,
        });
      }
      
      if (overflowPercentage > 20) {
        suggestions.push({
          type: 'smaller-text' as const,
          description: 'Reduce text size to fit more content',
          impact: 'medium' as const,
          estimatedReduction: overflowAmount * 0.3,
        });
      }
      
      if (this.pageConfig.columns < 3) {
        suggestions.push({
          type: 'more-columns' as const,
          description: 'Add more columns to utilize space better',
          impact: 'medium' as const,
          estimatedReduction: overflowAmount * 0.4,
        });
      }
      
      suggestions.push({
        type: 'reduce-content' as const,
        description: 'Remove or shorten some content blocks',
        impact: 'high' as const,
        estimatedReduction: overflowAmount,
      });
    }
    
    return suggestions;
  }

  /**
   * Estimate the height of a content block
   */
  private estimateBlockHeight(block: ContentBlock): number {
    if (block.estimatedHeight > 0) {
      return block.estimatedHeight;
    }
    
    const fontSizes = calculateFontSizes(this.textConfig);
    let fontSize = fontSizes.body;
    
    // Adjust font size based on block type
    switch (block.type) {
      case 'heading':
        fontSize = fontSizes.h2;
        break;
      case 'table':
        fontSize = fontSizes.small;
        break;
      case 'image':
        return 100; // Default image height
    }
    
    return estimateTextHeight(
      block.content,
      fontSize,
      this.textConfig.lineHeight,
      this.columnWidth
    );
  }

  /**
   * Get available height for a single column
   */
  private getAvailableColumnHeight(): number {
    return this.contentArea.height;
  }

  /**
   * Calculate total used space
   */
  private calculateUsedSpace(columns: ContentBlock[][]): Dimensions {
    let maxHeight = 0;
    
    columns.forEach(column => {
      let columnHeight = 0;
      column.forEach(block => {
        columnHeight += this.estimateBlockHeight(block);
      });
      maxHeight = Math.max(maxHeight, columnHeight);
    });
    
    return {
      width: this.contentArea.width,
      height: Math.min(maxHeight, this.contentArea.height),
      unit: this.contentArea.unit,
    };
  }

  /**
   * Optimize column distribution for better balance
   */
  optimizeColumnBalance(columns: ContentBlock[][]): ContentBlock[][] {
    const optimizedColumns = columns.map(col => [...col]);
    const columnHeights = optimizedColumns.map(col => 
      col.reduce((height, block) => height + this.estimateBlockHeight(block), 0)
    );
    
    // Simple balancing: move blocks from tallest to shortest columns
    let improved = true;
    while (improved) {
      improved = false;
      
      const maxHeightIndex = columnHeights.indexOf(Math.max(...columnHeights));
      const minHeightIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      if (maxHeightIndex !== minHeightIndex && columnHeights[maxHeightIndex] - columnHeights[minHeightIndex] > 50) {
        const maxColumn = optimizedColumns[maxHeightIndex];
        const blockToMove = maxColumn[maxColumn.length - 1];
        
        if (blockToMove) {
          const blockHeight = this.estimateBlockHeight(blockToMove);
          
          // Move block if it improves balance
          if (columnHeights[minHeightIndex] + blockHeight < columnHeights[maxHeightIndex]) {
            maxColumn.pop();
            optimizedColumns[minHeightIndex].push(blockToMove);
            columnHeights[maxHeightIndex] -= blockHeight;
            columnHeights[minHeightIndex] += blockHeight;
            improved = true;
          }
        }
      }
    }
    
    return optimizedColumns;
  }
}