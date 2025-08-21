/**
 * Layout and formatting system types for cheat sheet generation
 */

export type PaperSize = 'a4' | 'letter' | 'legal' | 'a3';
export type Orientation = 'portrait' | 'landscape';
export type TextSize = 'small' | 'medium' | 'large';
export type ColumnCount = 1 | 2 | 3;

export interface Dimensions {
  width: number;
  height: number;
  unit: 'mm' | 'in' | 'px';
}

export interface PageConfig {
  paperSize: PaperSize;
  orientation: Orientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  columns: ColumnCount;
  columnGap: number;
}

export interface TextConfig {
  size: TextSize;
  lineHeight: number;
  fontFamily: string;
  baseFontSize: number; // in px
}

export interface LayoutConfig {
  page: PageConfig;
  text: TextConfig;
  maxPages: number;
}

export interface ContentBlock {
  id: string;
  content: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'image';
  priority: number;
  estimatedHeight: number;
}

export interface LayoutCalculation {
  availableSpace: Dimensions;
  usedSpace: Dimensions;
  contentBlocks: ContentBlock[];
  overflow: OverflowAnalysis;
  pageBreaks: number[];
}

export interface OverflowAnalysis {
  hasOverflow: boolean;
  overflowAmount: number;
  affectedBlocks: string[];
  suggestions: OverflowSuggestion[];
}

export interface OverflowSuggestion {
  type: 'reduce-content' | 'increase-pages' | 'smaller-text' | 'more-columns';
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedReduction: number;
}

export interface LayoutWarning {
  type: 'overflow' | 'readability' | 'spacing';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedElements: string[];
}

export interface DetailedOverflowInfo {
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
}