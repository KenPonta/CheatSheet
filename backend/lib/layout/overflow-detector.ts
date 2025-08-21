import { 
  ContentBlock, 
  LayoutConfig, 
  OverflowAnalysis, 
  OverflowSuggestion, 
  LayoutWarning,
  Dimensions 
} from './types';
import { OrganizedTopic } from '../ai/types';
import { ColumnEngine } from './column-engine';
import { getContentArea } from './page-config';
import { estimateTextHeight, calculateFontSizes, suggestOptimalTextSize } from './text-config';
import { 
  ContentPrioritizer, 
  PrioritizationConfig, 
  ContentPriority,
  ContentReductionPlan 
} from './content-prioritizer';

/**
 * Enhanced content overflow detection and warning system with intelligent prioritization
 */
export class OverflowDetector {
  private config: LayoutConfig;
  private columnEngine: ColumnEngine;
  private prioritizer?: ContentPrioritizer;

  constructor(config: LayoutConfig, prioritizationConfig?: PrioritizationConfig) {
    this.config = config;
    this.columnEngine = new ColumnEngine(config.page, config.text);
    
    if (prioritizationConfig) {
      this.prioritizer = new ContentPrioritizer(prioritizationConfig);
    }
  }

  /**
   * Analyze content overflow and generate detailed warnings
   */
  analyzeOverflow(blocks: ContentBlock[]): OverflowAnalysis {
    const layout = this.columnEngine.calculateLayout(blocks, this.config.maxPages);
    const detailedAnalysis = this.performDetailedOverflowAnalysis(blocks);
    
    return {
      hasOverflow: layout.overflow.hasOverflow || detailedAnalysis.hasOverflow,
      overflowAmount: Math.max(layout.overflow.overflowAmount, detailedAnalysis.overflowAmount),
      affectedBlocks: [...new Set([...layout.overflow.affectedBlocks, ...detailedAnalysis.affectedBlocks])],
      suggestions: this.mergeAndPrioritizeSuggestions(
        layout.overflow.suggestions,
        detailedAnalysis.suggestions
      ),
    };
  }

  /**
   * Enhanced overflow analysis with intelligent content prioritization
   */
  analyzeOverflowWithPrioritization(
    blocks: ContentBlock[], 
    topics?: OrganizedTopic[]
  ): OverflowAnalysis & {
    priorities?: ContentPriority[];
    reductionPlan?: ContentReductionPlan;
    intelligentSuggestions?: OverflowSuggestion[];
  } {
    const basicAnalysis = this.analyzeOverflow(blocks);
    
    if (!this.prioritizer || !topics || !basicAnalysis.hasOverflow) {
      return basicAnalysis;
    }

    // Analyze content priorities
    const priorities = this.prioritizer.analyzePriorities(topics, blocks);
    
    // Create reduction plan
    const reductionPlan = this.prioritizer.createReductionPlan(
      basicAnalysis.overflowAmount,
      blocks,
      priorities
    );
    
    // Generate intelligent suggestions
    const intelligentSuggestions = this.prioritizer.generateIntelligentSuggestions(
      basicAnalysis.overflowAmount,
      priorities,
      reductionPlan
    );

    return {
      ...basicAnalysis,
      priorities,
      reductionPlan,
      intelligentSuggestions,
      suggestions: [...basicAnalysis.suggestions, ...intelligentSuggestions],
    };
  }

  /**
   * Perform detailed overflow analysis with precise measurements
   */
  private performDetailedOverflowAnalysis(blocks: ContentBlock[]): OverflowAnalysis {
    const contentArea = getContentArea(this.config.page);
    const totalAvailableHeight = contentArea.height * this.config.maxPages;
    const fontSizes = calculateFontSizes(this.config.text);
    
    let totalRequiredHeight = 0;
    const overflowBlocks: string[] = [];
    const blockHeights: Record<string, number> = {};
    
    // Calculate precise height requirements for each block
    blocks.forEach(block => {
      const height = this.calculatePreciseBlockHeight(block, fontSizes);
      blockHeights[block.id] = height;
      totalRequiredHeight += height;
    });
    
    // Identify which blocks cause overflow
    let cumulativeHeight = 0;
    blocks.forEach(block => {
      cumulativeHeight += blockHeights[block.id];
      if (cumulativeHeight > totalAvailableHeight) {
        overflowBlocks.push(block.id);
      }
    });
    
    const overflowAmount = Math.max(0, totalRequiredHeight - totalAvailableHeight);
    const hasOverflow = overflowAmount > 0;
    
    return {
      hasOverflow,
      overflowAmount,
      affectedBlocks: overflowBlocks,
      suggestions: this.generateDetailedSuggestions(
        overflowAmount,
        totalAvailableHeight,
        blocks,
        blockHeights
      ),
    };
  }

  /**
   * Calculate precise height for a content block
   */
  private calculatePreciseBlockHeight(block: ContentBlock, fontSizes: Record<string, number>): number {
    const columnWidth = (getContentArea(this.config.page).width - 
      (this.config.page.columns - 1) * this.config.page.columnGap) / this.config.page.columns;
    
    switch (block.type) {
      case 'heading':
        return this.calculateHeadingHeight(block, fontSizes, columnWidth);
      case 'paragraph':
        return this.calculateParagraphHeight(block, fontSizes, columnWidth);
      case 'list':
        return this.calculateListHeight(block, fontSizes, columnWidth);
      case 'table':
        return this.calculateTableHeight(block, fontSizes, columnWidth);
      case 'image':
        return this.calculateImageHeight(block, columnWidth);
      default:
        return estimateTextHeight(
          block.content,
          fontSizes.body,
          this.config.text.lineHeight,
          columnWidth
        );
    }
  }

  /**
   * Calculate heading height with proper spacing
   */
  private calculateHeadingHeight(
    block: ContentBlock, 
    fontSizes: Record<string, number>, 
    columnWidth: number
  ): number {
    const fontSize = fontSizes.h2; // Default to h2 for headings
    const baseHeight = estimateTextHeight(
      block.content,
      fontSize,
      this.config.text.lineHeight,
      columnWidth
    );
    
    // Add spacing above and below headings
    const spacingAbove = fontSize * 0.5;
    const spacingBelow = fontSize * 0.3;
    
    return baseHeight + spacingAbove + spacingBelow;
  }

  /**
   * Calculate paragraph height with proper line spacing
   */
  private calculateParagraphHeight(
    block: ContentBlock,
    fontSizes: Record<string, number>,
    columnWidth: number
  ): number {
    const baseHeight = estimateTextHeight(
      block.content,
      fontSizes.body,
      this.config.text.lineHeight,
      columnWidth
    );
    
    // Add paragraph spacing
    const paragraphSpacing = fontSizes.body * 0.5;
    
    return baseHeight + paragraphSpacing;
  }

  /**
   * Calculate list height with bullet points and indentation
   */
  private calculateListHeight(
    block: ContentBlock,
    fontSizes: Record<string, number>,
    columnWidth: number
  ): number {
    // Estimate number of list items (rough heuristic)
    const listItems = block.content.split('\n').filter(line => line.trim().length > 0);
    const indentedWidth = columnWidth * 0.9; // Account for indentation
    
    let totalHeight = 0;
    listItems.forEach(item => {
      const itemHeight = estimateTextHeight(
        item,
        fontSizes.body,
        this.config.text.lineHeight,
        indentedWidth
      );
      totalHeight += itemHeight + (fontSizes.body * 0.2); // Add spacing between items
    });
    
    return totalHeight;
  }

  /**
   * Calculate table height with headers and borders
   */
  private calculateTableHeight(
    block: ContentBlock,
    fontSizes: Record<string, number>,
    columnWidth: number
  ): number {
    // Rough estimation for table height
    const estimatedRows = Math.max(3, Math.ceil(block.content.length / 100));
    const rowHeight = fontSizes.small * this.config.text.lineHeight + 4; // Add padding
    const headerHeight = fontSizes.body * this.config.text.lineHeight + 6;
    
    return headerHeight + (estimatedRows * rowHeight);
  }

  /**
   * Calculate image height with aspect ratio considerations
   */
  private calculateImageHeight(block: ContentBlock, columnWidth: number): number {
    // Default image height, could be enhanced with actual image dimensions
    const defaultHeight = Math.min(columnWidth * 0.6, 150);
    
    // Add caption space if content suggests there's a caption
    const captionHeight = block.content.length > 0 ? 
      calculateFontSizes(this.config.text).caption * 1.5 : 0;
    
    return defaultHeight + captionHeight;
  }

  /**
   * Generate detailed suggestions for overflow resolution
   */
  private generateDetailedSuggestions(
    overflowAmount: number,
    totalAvailableHeight: number,
    blocks: ContentBlock[],
    blockHeights: Record<string, number>
  ): OverflowSuggestion[] {
    const suggestions: OverflowSuggestion[] = [];
    const overflowPercentage = (overflowAmount / totalAvailableHeight) * 100;
    
    // Suggest increasing pages
    if (overflowPercentage > 20) {
      const additionalPages = Math.ceil(overflowAmount / (totalAvailableHeight / this.config.maxPages));
      suggestions.push({
        type: 'increase-pages',
        description: `Add ${additionalPages} more page(s) to accommodate all content`,
        impact: overflowPercentage > 50 ? 'high' : 'medium',
        estimatedReduction: overflowAmount * 0.9,
      });
    }
    
    // Suggest text size reduction
    const currentTextSize = this.config.text.size;
    if (currentTextSize !== 'small') {
      const columnWidth = (getContentArea(this.config.page).width - 
        (this.config.page.columns - 1) * this.config.page.columnGap) / this.config.page.columns;
      
      const optimalSize = suggestOptimalTextSize(
        blocks.reduce((total, block) => total + block.content.length, 0),
        totalAvailableHeight,
        columnWidth
      );
      
      if (optimalSize !== currentTextSize) {
        suggestions.push({
          type: 'smaller-text',
          description: `Reduce text size to "${optimalSize}" for better fit`,
          impact: 'medium',
          estimatedReduction: overflowAmount * 0.4,
        });
      }
    }
    
    // Suggest adding columns
    if (this.config.page.columns < 3) {
      suggestions.push({
        type: 'more-columns',
        description: `Increase to ${this.config.page.columns + 1} columns for better space utilization`,
        impact: 'medium',
        estimatedReduction: overflowAmount * 0.3,
      });
    }
    
    // Suggest content reduction
    const lowPriorityBlocks = blocks
      .filter(block => block.priority < 5)
      .sort((a, b) => a.priority - b.priority);
    
    if (lowPriorityBlocks.length > 0) {
      const removableHeight = lowPriorityBlocks
        .slice(0, Math.ceil(lowPriorityBlocks.length * 0.3))
        .reduce((total, block) => total + blockHeights[block.id], 0);
      
      suggestions.push({
        type: 'reduce-content',
        description: `Remove ${lowPriorityBlocks.length} low-priority content blocks`,
        impact: 'high',
        estimatedReduction: Math.min(removableHeight, overflowAmount),
      });
    }
    
    return suggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Merge and prioritize suggestions from different analysis methods
   */
  private mergeAndPrioritizeSuggestions(
    suggestions1: OverflowSuggestion[],
    suggestions2: OverflowSuggestion[]
  ): OverflowSuggestion[] {
    const merged = new Map<string, OverflowSuggestion>();
    
    [...suggestions1, ...suggestions2].forEach(suggestion => {
      const existing = merged.get(suggestion.type);
      if (!existing || suggestion.estimatedReduction > existing.estimatedReduction) {
        merged.set(suggestion.type, suggestion);
      }
    });
    
    return Array.from(merged.values()).sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Get detailed overflow information with specific content that won't fit
   */
  getDetailedOverflowInfo(blocks: ContentBlock[]): {
    overflowDetails: {
      totalContentHeight: number;
      availableHeight: number;
      overflowAmount: number;
      overflowPercentage: number;
    };
    affectedContent: Array<{
      blockId: string;
      blockType: ContentBlock['type'];
      contentPreview: string;
      estimatedHeight: number;
      priority: number;
      willFit: boolean;
      partialFit?: {
        fittingPercentage: number;
        cutoffPoint: string;
      };
    }>;
    spaceUtilization: {
      usedSpace: number;
      wastedSpace: number;
      efficiency: number; // 0-1 scale
    };
  } {
    const contentArea = getContentArea(this.config.page);
    const totalAvailableHeight = contentArea.height * this.config.maxPages;
    const fontSizes = calculateFontSizes(this.config.text);
    
    let cumulativeHeight = 0;
    const affectedContent = blocks.map(block => {
      const blockHeight = this.calculatePreciseBlockHeight(block, fontSizes);
      const willFit = cumulativeHeight + blockHeight <= totalAvailableHeight;
      
      let partialFit: { fittingPercentage: number; cutoffPoint: string } | undefined;
      if (!willFit && cumulativeHeight < totalAvailableHeight) {
        const remainingSpace = totalAvailableHeight - cumulativeHeight;
        const fittingPercentage = remainingSpace / blockHeight;
        const cutoffPoint = this.estimateCutoffPoint(block.content, fittingPercentage);
        partialFit = { fittingPercentage, cutoffPoint };
      }
      
      cumulativeHeight += blockHeight;
      
      return {
        blockId: block.id,
        blockType: block.type,
        contentPreview: block.content.substring(0, 100) + (block.content.length > 100 ? '...' : ''),
        estimatedHeight: blockHeight,
        priority: block.priority,
        willFit,
        partialFit,
      };
    });
    
    const totalContentHeight = cumulativeHeight;
    const overflowAmount = Math.max(0, totalContentHeight - totalAvailableHeight);
    const overflowPercentage = totalAvailableHeight > 0 ? 
      (overflowAmount / totalAvailableHeight) * 100 : 0;
    
    // Calculate space utilization
    const usedSpace = Math.min(totalContentHeight, totalAvailableHeight);
    const wastedSpace = Math.max(0, totalAvailableHeight - totalContentHeight);
    const efficiency = totalAvailableHeight > 0 ? usedSpace / totalAvailableHeight : 0;
    
    return {
      overflowDetails: {
        totalContentHeight,
        availableHeight: totalAvailableHeight,
        overflowAmount,
        overflowPercentage,
      },
      affectedContent,
      spaceUtilization: {
        usedSpace,
        wastedSpace,
        efficiency,
      },
    };
  }

  /**
   * Estimate where content would be cut off based on fitting percentage
   */
  private estimateCutoffPoint(content: string, fittingPercentage: number): string {
    const cutoffIndex = Math.floor(content.length * fittingPercentage);
    const cutoffText = content.substring(0, cutoffIndex);
    
    // Try to cut at a natural break point (sentence, word, etc.)
    const lastSentence = cutoffText.lastIndexOf('.');
    const lastWord = cutoffText.lastIndexOf(' ');
    
    if (lastSentence > cutoffIndex * 0.8) {
      return content.substring(0, lastSentence + 1);
    } else if (lastWord > cutoffIndex * 0.9) {
      return content.substring(0, lastWord);
    } else {
      return cutoffText;
    }
  }

  /**
   * Generate layout warnings for potential issues
   */
  generateLayoutWarnings(blocks: ContentBlock[]): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];
    const overflow = this.analyzeOverflow(blocks);
    
    // Overflow warnings
    if (overflow.hasOverflow) {
      warnings.push({
        type: 'overflow',
        severity: overflow.overflowAmount > 100 ? 'high' : 'medium',
        message: `Content exceeds available space by ${Math.round(overflow.overflowAmount)}px`,
        affectedElements: overflow.affectedBlocks,
      });
    }
    
    // Readability warnings
    const fontSizes = calculateFontSizes(this.config.text);
    if (fontSizes.body < 10) {
      warnings.push({
        type: 'readability',
        severity: 'high',
        message: 'Text size may be too small for comfortable reading',
        affectedElements: ['body-text'],
      });
    }
    
    // Spacing warnings
    const contentArea = getContentArea(this.config.page);
    const columnWidth = contentArea.width / this.config.page.columns;
    if (columnWidth < 100) {
      warnings.push({
        type: 'spacing',
        severity: 'medium',
        message: 'Columns may be too narrow for optimal readability',
        affectedElements: ['columns'],
      });
    }
    
    return warnings;
  }
}