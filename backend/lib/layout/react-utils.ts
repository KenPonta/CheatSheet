/**
 * React utilities for integrating the layout system with React components
 */

import { useMemo, useCallback } from 'react';
import { LayoutEngine, createContentBlock } from './index';
import { LayoutConfig, ContentBlock, LayoutCalculation, OverflowAnalysis, LayoutWarning } from './types';

/**
 * Hook for managing layout engine state in React components
 */
export function useLayoutEngine(initialConfig?: Partial<LayoutConfig>) {
  const layoutEngine = useMemo(() => {
    return new LayoutEngine(initialConfig);
  }, []);

  const updateConfig = useCallback((updates: Partial<LayoutConfig>) => {
    layoutEngine.updateConfig(updates);
  }, [layoutEngine]);

  const updatePageConfig = useCallback((paperSize?: any, orientation?: any, columns?: any) => {
    layoutEngine.updatePageConfig(paperSize, orientation, columns);
  }, [layoutEngine]);

  const updateTextConfig = useCallback((size?: any) => {
    layoutEngine.updateTextConfig(size);
  }, [layoutEngine]);

  const calculateLayout = useCallback((blocks: ContentBlock[]): LayoutCalculation => {
    return layoutEngine.calculateLayout(blocks);
  }, [layoutEngine]);

  const analyzeOverflow = useCallback((blocks: ContentBlock[]): OverflowAnalysis => {
    return layoutEngine.analyzeOverflow(blocks);
  }, [layoutEngine]);

  const generateWarnings = useCallback((blocks: ContentBlock[]): LayoutWarning[] => {
    return layoutEngine.generateWarnings(blocks);
  }, [layoutEngine]);

  const generateCSSVariables = useCallback((): Record<string, string> => {
    return layoutEngine.generateCSSVariables();
  }, [layoutEngine]);

  const generatePrintCSS = useCallback((): string => {
    return layoutEngine.generatePrintCSS();
  }, [layoutEngine]);

  const optimizeLayout = useCallback((blocks: ContentBlock[]): ContentBlock[] => {
    return layoutEngine.optimizeLayout(blocks);
  }, [layoutEngine]);

  const getConfig = useCallback(() => {
    return layoutEngine.getConfig();
  }, [layoutEngine]);

  return {
    updateConfig,
    updatePageConfig,
    updateTextConfig,
    calculateLayout,
    analyzeOverflow,
    generateWarnings,
    generateCSSVariables,
    generatePrintCSS,
    optimizeLayout,
    getConfig,
  };
}

/**
 * Hook for converting content to layout blocks
 */
export function useContentBlocks() {
  const createBlocksFromContent = useCallback((content: Array<{
    id: string;
    text: string;
    type?: ContentBlock['type'];
    priority?: number;
  }>): ContentBlock[] => {
    return content.map(item => createContentBlock(
      item.id,
      item.text,
      item.type || 'paragraph',
      item.priority || 5
    ));
  }, []);

  const createBlockFromHTML = useCallback((id: string, html: string, priority = 5): ContentBlock => {
    // Simple HTML to text conversion for layout calculation
    const text = html.replace(/<[^>]*>/g, '').trim();
    
    // Determine type based on HTML tags
    let type: ContentBlock['type'] = 'paragraph';
    if (html.includes('<h1>') || html.includes('<h2>') || html.includes('<h3>')) {
      type = 'heading';
    } else if (html.includes('<ul>') || html.includes('<ol>')) {
      type = 'list';
    } else if (html.includes('<table>')) {
      type = 'table';
    } else if (html.includes('<img>')) {
      type = 'image';
    }

    return createContentBlock(id, text, type, priority);
  }, []);

  return {
    createBlocksFromContent,
    createBlockFromHTML,
  };
}

/**
 * Hook for managing CSS variables in React
 */
export function useLayoutCSS(layoutEngine: ReturnType<typeof useLayoutEngine>) {
  const cssVariables = useMemo(() => {
    return layoutEngine.generateCSSVariables();
  }, [layoutEngine]);

  const inlineStyles = useMemo(() => {
    const variables = layoutEngine.generateCSSVariables();
    const styles: Record<string, string> = {};
    
    Object.entries(variables).forEach(([key, value]) => {
      // Convert CSS custom properties to camelCase for React inline styles
      const camelKey = key.replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styles[camelKey] = value;
    });
    
    return styles;
  }, [layoutEngine]);

  const applyCSSVariables = useCallback((element: HTMLElement) => {
    const variables = layoutEngine.generateCSSVariables();
    Object.entries(variables).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  }, [layoutEngine]);

  return {
    cssVariables,
    inlineStyles,
    applyCSSVariables,
  };
}

/**
 * Utility function to create a style tag with layout CSS
 */
export function createLayoutStyleTag(layoutEngine: ReturnType<typeof useLayoutEngine>): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = layoutEngine.generatePrintCSS();
  return style;
}

/**
 * Utility function to inject layout CSS into document head
 */
export function injectLayoutCSS(layoutEngine: ReturnType<typeof useLayoutEngine>, id = 'layout-css'): void {
  // Remove existing style tag if present
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create and inject new style tag
  const style = createLayoutStyleTag(layoutEngine);
  style.id = id;
  document.head.appendChild(style);
}

/**
 * Component props for layout-aware components
 */
export interface LayoutAwareProps {
  layoutEngine?: ReturnType<typeof useLayoutEngine>;
  contentBlocks?: ContentBlock[];
  onLayoutChange?: (layout: LayoutCalculation) => void;
  onOverflowDetected?: (overflow: OverflowAnalysis) => void;
  onWarningsGenerated?: (warnings: LayoutWarning[]) => void;
}

/**
 * Higher-order component for adding layout awareness
 */
export function withLayoutAwareness<P extends object>(
  Component: React.ComponentType<P & LayoutAwareProps>
) {
  return function LayoutAwareComponent(props: P & { layoutConfig?: Partial<LayoutConfig> }) {
    const { layoutConfig, ...componentProps } = props;
    const layoutEngine = useLayoutEngine(layoutConfig);

    return (
      <Component
        {...componentProps as P & LayoutAwareProps}
        layoutEngine={layoutEngine}
      />
    );
  };
}

/**
 * Utility for responsive layout calculations
 */
export function useResponsiveLayout(
  contentBlocks: ContentBlock[],
  layoutEngine: ReturnType<typeof useLayoutEngine>
) {
  const layout = useMemo(() => {
    return layoutEngine.calculateLayout(contentBlocks);
  }, [contentBlocks, layoutEngine]);

  const overflow = useMemo(() => {
    return layoutEngine.analyzeOverflow(contentBlocks);
  }, [contentBlocks, layoutEngine]);

  const warnings = useMemo(() => {
    return layoutEngine.generateWarnings(contentBlocks);
  }, [contentBlocks, layoutEngine]);

  const optimizedBlocks = useMemo(() => {
    return layoutEngine.optimizeLayout(contentBlocks);
  }, [contentBlocks, layoutEngine]);

  return {
    layout,
    overflow,
    warnings,
    optimizedBlocks,
  };
}