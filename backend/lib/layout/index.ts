/**
 * Advanced layout and formatting system for cheat sheet generation
 * 
 * This module provides comprehensive layout management including:
 * - Dynamic page size and orientation handling
 * - Responsive text sizing system
 * - Multi-column layout engine with content flow optimization
 * - Content overflow detection and warning system
 */

// Core types
export type {
  PaperSize,
  Orientation,
  TextSize,
  ColumnCount,
  Dimensions,
  PageConfig,
  TextConfig,
  LayoutConfig,
  ContentBlock,
  LayoutCalculation,
  OverflowAnalysis,
  OverflowSuggestion,
  LayoutWarning,
  DetailedOverflowInfo,
} from './types';

// Page configuration utilities
export {
  getPageDimensions,
  getContentArea,
  getColumnWidth,
  createDefaultPageConfig,
  mmToPx,
  pxToMm,
  generatePageCSSVariables,
} from './page-config';

// Text configuration utilities
export {
  getTextConfig,
  calculateFontSizes,
  validateTextReadability,
  generateTextCSSVariables,
  estimateTextHeight,
  suggestOptimalTextSize,
} from './text-config';

// Layout engines
export { ColumnEngine } from './column-engine';
export { OverflowDetector } from './overflow-detector';
export { LayoutEngine } from './layout-engine';

// Content prioritization
export { 
  ContentPrioritizer,
  type ContentPriority,
  type PrioritizationConfig,
  type ContentReductionPlan,
} from './content-prioritizer';

// Convenience function to create a layout engine with default settings
export function createLayoutEngine(config?: Partial<LayoutConfig>) {
  return new LayoutEngine(config);
}

// Utility function to create content blocks from text
export function createContentBlock(
  id: string,
  content: string,
  type: ContentBlock['type'] = 'paragraph',
  priority: number = 5
): ContentBlock {
  return {
    id,
    content,
    type,
    priority,
    estimatedHeight: 0, // Will be calculated by the engine
  };
}

// Utility function to create multiple content blocks from an array
export function createContentBlocks(
  items: Array<{
    id: string;
    content: string;
    type?: ContentBlock['type'];
    priority?: number;
  }>
): ContentBlock[] {
  return items.map(item => createContentBlock(
    item.id,
    item.content,
    item.type,
    item.priority
  ));
}

// React utilities are available in './react-utils' for React projects
// Import them directly: import { useLayoutEngine } from '@/lib/layout/react-utils';