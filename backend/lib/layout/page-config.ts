import { PaperSize, Orientation, Dimensions, PageConfig } from './types';

/**
 * Standard paper sizes in millimeters
 */
const PAPER_SIZES: Record<PaperSize, Dimensions> = {
  a4: { width: 210, height: 297, unit: 'mm' },
  letter: { width: 216, height: 279, unit: 'mm' },
  legal: { width: 216, height: 356, unit: 'mm' },
  a3: { width: 297, height: 420, unit: 'mm' },
};

/**
 * Default margins in millimeters
 */
const DEFAULT_MARGINS = {
  top: 20,
  right: 15,
  bottom: 20,
  left: 15,
};

/**
 * Get page dimensions for a given paper size and orientation
 */
export function getPageDimensions(
  paperSize: PaperSize,
  orientation: Orientation
): Dimensions {
  const baseDimensions = PAPER_SIZES[paperSize];
  
  if (orientation === 'landscape') {
    return {
      width: baseDimensions.height,
      height: baseDimensions.width,
      unit: baseDimensions.unit,
    };
  }
  
  return baseDimensions;
}

/**
 * Calculate available content area after margins
 */
export function getContentArea(config: PageConfig): Dimensions {
  const pageDimensions = getPageDimensions(config.paperSize, config.orientation);
  
  return {
    width: pageDimensions.width - config.margins.left - config.margins.right,
    height: pageDimensions.height - config.margins.top - config.margins.bottom,
    unit: pageDimensions.unit,
  };
}

/**
 * Calculate column width based on content area and column count
 */
export function getColumnWidth(config: PageConfig): number {
  const contentArea = getContentArea(config);
  const totalGapWidth = (config.columns - 1) * config.columnGap;
  
  return (contentArea.width - totalGapWidth) / config.columns;
}

/**
 * Create default page configuration
 */
export function createDefaultPageConfig(
  paperSize: PaperSize = 'a4',
  orientation: Orientation = 'portrait'
): PageConfig {
  return {
    paperSize,
    orientation,
    margins: { ...DEFAULT_MARGINS },
    columns: 2,
    columnGap: 10, // mm
  };
}

/**
 * Convert millimeters to pixels for CSS (assuming 96 DPI)
 */
export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

/**
 * Convert pixels to millimeters
 */
export function pxToMm(px: number): number {
  return (px * 25.4) / 96;
}

/**
 * Generate CSS variables for page configuration
 */
export function generatePageCSSVariables(config: PageConfig): Record<string, string> {
  const pageDimensions = getPageDimensions(config.paperSize, config.orientation);
  const contentArea = getContentArea(config);
  const columnWidth = getColumnWidth(config);
  
  return {
    '--page-width': `${mmToPx(pageDimensions.width)}px`,
    '--page-height': `${mmToPx(pageDimensions.height)}px`,
    '--margin-top': `${mmToPx(config.margins.top)}px`,
    '--margin-right': `${mmToPx(config.margins.right)}px`,
    '--margin-bottom': `${mmToPx(config.margins.bottom)}px`,
    '--margin-left': `${mmToPx(config.margins.left)}px`,
    '--content-width': `${mmToPx(contentArea.width)}px`,
    '--content-height': `${mmToPx(contentArea.height)}px`,
    '--column-count': config.columns.toString(),
    '--column-gap': `${mmToPx(config.columnGap)}px`,
    '--column-width': `${mmToPx(columnWidth)}px`,
  };
}