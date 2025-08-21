import { TextSize, TextConfig, LayoutWarning } from './types';

/**
 * Text size configurations with responsive scaling
 */
const TEXT_SIZE_CONFIGS: Record<TextSize, TextConfig> = {
  small: {
    size: 'small',
    lineHeight: 1.2,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    baseFontSize: 10,
  },
  medium: {
    size: 'medium',
    lineHeight: 1.3,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    baseFontSize: 12,
  },
  large: {
    size: 'large',
    lineHeight: 1.4,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    baseFontSize: 14,
  },
};

/**
 * Minimum readable font sizes (in px)
 */
const MIN_READABLE_SIZES = {
  heading1: 14,
  heading2: 12,
  heading3: 11,
  body: 9,
  caption: 8,
};

/**
 * Get text configuration for a given size
 */
export function getTextConfig(size: TextSize): TextConfig {
  return { ...TEXT_SIZE_CONFIGS[size] };
}

/**
 * Calculate responsive font sizes based on base configuration
 */
export function calculateFontSizes(config: TextConfig): Record<string, number> {
  const { baseFontSize } = config;
  
  return {
    h1: Math.max(baseFontSize * 1.6, MIN_READABLE_SIZES.heading1),
    h2: Math.max(baseFontSize * 1.4, MIN_READABLE_SIZES.heading2),
    h3: Math.max(baseFontSize * 1.2, MIN_READABLE_SIZES.heading3),
    body: Math.max(baseFontSize, MIN_READABLE_SIZES.body),
    small: Math.max(baseFontSize * 0.85, MIN_READABLE_SIZES.caption),
    caption: Math.max(baseFontSize * 0.75, MIN_READABLE_SIZES.caption),
  };
}

/**
 * Validate text readability and generate warnings
 */
export function validateTextReadability(config: TextConfig): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const fontSizes = calculateFontSizes(config);
  
  // Check if body text is too small (only if base font size is actually smaller than minimum)
  if (config.baseFontSize < MIN_READABLE_SIZES.body) {
    warnings.push({
      type: 'readability',
      severity: 'high',
      message: `Body text size (${fontSizes.body}px) is below minimum readable size`,
      affectedElements: ['body', 'paragraph'],
    });
  }
  
  // Check if headings are too small
  if (config.baseFontSize * 1.6 < MIN_READABLE_SIZES.heading1) {
    warnings.push({
      type: 'readability',
      severity: 'medium',
      message: `Heading sizes may be too small for clear hierarchy`,
      affectedElements: ['h1', 'h2', 'h3'],
    });
  }
  
  // Check line height for readability
  if (config.lineHeight < 1.1) {
    warnings.push({
      type: 'readability',
      severity: 'medium',
      message: 'Line height is too tight, may affect readability',
      affectedElements: ['all-text'],
    });
  }
  
  return warnings;
}

/**
 * Generate CSS variables for text configuration
 */
export function generateTextCSSVariables(config: TextConfig): Record<string, string> {
  const fontSizes = calculateFontSizes(config);
  
  return {
    '--font-family': config.fontFamily,
    '--line-height': config.lineHeight.toString(),
    '--font-size-h1': `${fontSizes.h1}px`,
    '--font-size-h2': `${fontSizes.h2}px`,
    '--font-size-h3': `${fontSizes.h3}px`,
    '--font-size-body': `${fontSizes.body}px`,
    '--font-size-small': `${fontSizes.small}px`,
    '--font-size-caption': `${fontSizes.caption}px`,
  };
}

/**
 * Estimate text height for given content and configuration
 */
export function estimateTextHeight(
  text: string,
  fontSize: number,
  lineHeight: number,
  columnWidth: number
): number {
  // Rough estimation: average character width is ~0.6 * fontSize
  const avgCharWidth = fontSize * 0.6;
  const charsPerLine = Math.floor(columnWidth / avgCharWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  
  return lines * fontSize * lineHeight;
}

/**
 * Suggest optimal text size for given content and space constraints
 */
export function suggestOptimalTextSize(
  contentLength: number,
  availableHeight: number,
  columnWidth: number
): TextSize {
  const configs = Object.entries(TEXT_SIZE_CONFIGS);
  
  for (const [size, config] of configs.reverse()) {
    const fontSizes = calculateFontSizes(config);
    const estimatedHeight = estimateTextHeight(
      'x'.repeat(contentLength),
      fontSizes.body,
      config.lineHeight,
      columnWidth
    );
    
    if (estimatedHeight <= availableHeight) {
      return size as TextSize;
    }
  }
  
  return 'small'; // Fallback to smallest size
}