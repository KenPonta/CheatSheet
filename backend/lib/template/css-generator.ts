/**
 * CSS Template Generator
 * Produces CSS and layout rules from reference format analysis
 */

import {
  ReferenceTemplate,
  TemplateAnalysis,
  LayoutPattern,
  TypographyPattern,
  VisualPattern,
  ColorScheme,
  HeadingStyle,
  TextStyle,
  SpacingPattern,
  ColumnStructure,
  BorderPattern,
  BackgroundPattern
} from './types';

export interface GeneratedCSS {
  css: string;
  variables: CSSVariables;
  classes: CSSClasses;
  mediaQueries: MediaQuery[];
  printStyles: string;
}

export interface CSSVariables {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  layout: Record<string, string>;
}

export interface CSSClasses {
  layout: string[];
  typography: string[];
  components: string[];
  utilities: string[];
}

export interface MediaQuery {
  condition: string;
  styles: string;
}

export class CSSGenerator {
  /**
   * Generates complete CSS from template analysis
   */
  generateCSS(template: ReferenceTemplate): GeneratedCSS {
    const analysis = template.analysis;
    
    // Generate CSS variables
    const variables = this.generateCSSVariables(analysis);
    
    // Generate base styles
    const baseStyles = this.generateBaseStyles(analysis, variables);
    
    // Generate layout styles
    const layoutStyles = this.generateLayoutStyles(analysis.layout, variables);
    
    // Generate typography styles
    const typographyStyles = this.generateTypographyStyles(analysis.typography, variables);
    
    // Generate component styles
    const componentStyles = this.generateComponentStyles(analysis, variables);
    
    // Generate utility classes
    const utilityStyles = this.generateUtilityStyles(analysis, variables);
    
    // Generate media queries
    const mediaQueries = this.generateMediaQueries(analysis);
    
    // Generate print styles
    const printStyles = this.generatePrintStyles(analysis, variables);
    
    // Combine all styles
    const css = this.combineStyles({
      variables: this.variablesToCSS(variables),
      base: baseStyles,
      layout: layoutStyles,
      typography: typographyStyles,
      components: componentStyles,
      utilities: utilityStyles,
      mediaQueries: mediaQueries.map(mq => `@media ${mq.condition} { ${mq.styles} }`).join('\n'),
      print: `@media print { ${printStyles} }`
    });
    
    return {
      css,
      variables,
      classes: this.extractClasses(css),
      mediaQueries,
      printStyles
    };
  }

  /**
   * Generates CSS custom properties from template analysis
   */
  private generateCSSVariables(analysis: TemplateAnalysis): CSSVariables {
    const colors = this.generateColorVariables(analysis.visual.colorScheme);
    const typography = this.generateTypographyVariables(analysis.typography);
    const spacing = this.generateSpacingVariables(analysis.layout.spacing);
    const layout = this.generateLayoutVariables(analysis.layout);

    return { colors, typography, spacing, layout };
  }

  private generateColorVariables(colorScheme: ColorScheme): Record<string, string> {
    return {
      'color-primary': colorScheme.primary,
      'color-secondary': colorScheme.secondary,
      'color-accent': colorScheme.accent,
      'color-text': colorScheme.text,
      'color-background': colorScheme.background,
      'color-muted': colorScheme.muted,
      'color-border': this.adjustColorBrightness(colorScheme.muted, -20),
      'color-highlight': this.adjustColorOpacity(colorScheme.accent, 0.1),
      'color-success': '#28a745',
      'color-warning': '#ffc107',
      'color-error': '#dc3545'
    };
  }

  private generateTypographyVariables(typography: TypographyPattern): Record<string, string> {
    const bodyFont = typography.fontFamilies.find(f => f.usage === 'body');
    const headingFont = typography.fontFamilies.find(f => f.usage === 'heading');
    
    return {
      'font-family-base': bodyFont ? `"${bodyFont.name}", ${bodyFont.fallbacks.join(', ')}` : 'Arial, sans-serif',
      'font-family-heading': headingFont ? `"${headingFont.name}", ${headingFont.fallbacks.join(', ')}` : 'Arial Bold, sans-serif',
      'font-size-base': `${typography.bodyTextStyle.fontSize}px`,
      'font-weight-normal': typography.bodyTextStyle.fontWeight.toString(),
      'font-weight-bold': '700',
      'line-height-base': typography.bodyTextStyle.lineHeight.toString(),
      'line-height-heading': '1.2',
      ...this.generateHeadingVariables(typography.headingStyles)
    };
  }

  private generateHeadingVariables(headingStyles: HeadingStyle[]): Record<string, string> {
    const variables: Record<string, string> = {};
    
    headingStyles.forEach(style => {
      const level = style.level;
      variables[`font-size-h${level}`] = `${style.fontSize}px`;
      variables[`font-weight-h${level}`] = style.fontWeight.toString();
      variables[`margin-top-h${level}`] = `${style.marginTop}px`;
      variables[`margin-bottom-h${level}`] = `${style.marginBottom}px`;
      if (style.letterSpacing) {
        variables[`letter-spacing-h${level}`] = `${style.letterSpacing}px`;
      }
    });
    
    return variables;
  }

  private generateSpacingVariables(spacing: SpacingPattern): Record<string, string> {
    return {
      'spacing-xs': '4px',
      'spacing-sm': '8px',
      'spacing-md': '16px',
      'spacing-lg': '24px',
      'spacing-xl': '32px',
      'spacing-paragraph': `${spacing.paragraphSpacing}px`,
      'spacing-section': `${spacing.sectionSpacing}px`,
      'spacing-heading-before': `${spacing.headingSpacing.before}px`,
      'spacing-heading-after': `${spacing.headingSpacing.after}px`,
      'line-height': spacing.lineHeight.toString()
    };
  }

  private generateLayoutVariables(layout: LayoutPattern): Record<string, string> {
    return {
      'page-margin-top': `${layout.margins.top}${layout.margins.unit}`,
      'page-margin-right': `${layout.margins.right}${layout.margins.unit}`,
      'page-margin-bottom': `${layout.margins.bottom}${layout.margins.unit}`,
      'page-margin-left': `${layout.margins.left}${layout.margins.unit}`,
      'column-count': layout.columnStructure.count.toString(),
      'column-gap': layout.columnStructure.gaps[0] ? `${layout.columnStructure.gaps[0]}px` : '20px',
      'container-max-width': layout.pageConfig.paperSize === 'a4' ? '210mm' : '8.5in'
    };
  }

  /**
   * Generates base styles for the document
   */
  private generateBaseStyles(analysis: TemplateAnalysis, variables: CSSVariables): string {
    return `
/* Base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  line-height: var(--line-height);
}

body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-base);
  color: var(--color-text);
  background-color: var(--color-background);
  margin: 0;
  padding: 0;
}

.cheat-sheet {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
  background: var(--color-background);
  min-height: 100vh;
}
`;
  }

  /**
   * Generates layout-specific styles
   */
  private generateLayoutStyles(layout: LayoutPattern, variables: CSSVariables): string {
    const columnStyles = this.generateColumnStyles(layout.columnStructure);
    const spacingStyles = this.generateSpacingStyles(layout.spacing);
    
    return `
/* Layout styles */
.container {
  width: 100%;
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--page-margin-left);
}

${columnStyles}

.section {
  margin-bottom: var(--spacing-section);
}

.section:last-child {
  margin-bottom: 0;
}

${spacingStyles}

/* Page break controls */
.page-break-before {
  page-break-before: always;
}

.page-break-after {
  page-break-after: always;
}

.page-break-avoid {
  page-break-inside: avoid;
}
`;
  }

  private generateColumnStyles(columnStructure: ColumnStructure): string {
    if (columnStructure.count === 1) {
      return `
.content {
  width: 100%;
}
`;
    }

    const columnWidths = columnStructure.widths.map(w => `${w}%`).join(' ');
    
    return `
.content {
  display: grid;
  grid-template-columns: ${columnWidths};
  gap: var(--column-gap);
  align-items: start;
}

.column {
  min-width: 0; /* Prevent overflow */
}

@supports not (display: grid) {
  .content {
    display: flex;
    flex-wrap: wrap;
    margin: 0 calc(var(--column-gap) / -2);
  }
  
  .column {
    flex: 1;
    padding: 0 calc(var(--column-gap) / 2);
    min-width: ${100 / columnStructure.count}%;
  }
}
`;
  }

  private generateSpacingStyles(spacing: SpacingPattern): string {
    return `
/* Spacing utilities */
.mb-paragraph {
  margin-bottom: var(--spacing-paragraph);
}

.mb-section {
  margin-bottom: var(--spacing-section);
}

.mt-heading {
  margin-top: var(--spacing-heading-before);
}

.mb-heading {
  margin-bottom: var(--spacing-heading-after);
}

p {
  margin-bottom: var(--spacing-paragraph);
}

p:last-child {
  margin-bottom: 0;
}
`;
  }

  /**
   * Generates typography styles
   */
  private generateTypographyStyles(typography: TypographyPattern, variables: CSSVariables): string {
    const headingStyles = this.generateHeadingStyles(typography.headingStyles);
    const listStyles = this.generateListStyles(typography.listStyles);
    const emphasisStyles = this.generateEmphasisStyles(typography.emphasisStyles);
    
    return `
/* Typography styles */
${headingStyles}

${listStyles}

${emphasisStyles}

/* Text alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }

/* Font weights */
.font-normal { font-weight: var(--font-weight-normal); }
.font-bold { font-weight: var(--font-weight-bold); }

/* Text sizes */
.text-sm { font-size: 0.875em; }
.text-base { font-size: 1em; }
.text-lg { font-size: 1.125em; }
.text-xl { font-size: 1.25em; }
`;
  }

  private generateHeadingStyles(headingStyles: HeadingStyle[]): string {
    return headingStyles.map(style => {
      const level = style.level;
      const transform = style.textTransform ? `text-transform: ${style.textTransform};` : '';
      const letterSpacing = style.letterSpacing ? `letter-spacing: var(--letter-spacing-h${level});` : '';
      
      return `
h${level}, .h${level} {
  font-family: var(--font-family-heading);
  font-size: var(--font-size-h${level});
  font-weight: var(--font-weight-h${level});
  line-height: var(--line-height-heading);
  color: ${style.color};
  margin-top: var(--margin-top-h${level});
  margin-bottom: var(--margin-bottom-h${level});
  ${transform}
  ${letterSpacing}
}`;
    }).join('\n');
  }

  private generateListStyles(listStyles: any[]): string {
    return `
/* List styles */
ul, ol {
  margin-bottom: var(--spacing-paragraph);
  padding-left: 20px;
}

ul {
  list-style-type: disc;
}

ol {
  list-style-type: decimal;
}

li {
  margin-bottom: 4px;
  line-height: var(--line-height-base);
}

li:last-child {
  margin-bottom: 0;
}

/* Nested lists */
ul ul, ol ol, ul ol, ol ul {
  margin-top: 4px;
  margin-bottom: 0;
}

/* Custom bullet styles */
.bullet-circle { list-style-type: circle; }
.bullet-square { list-style-type: square; }
.bullet-none { list-style-type: none; }
`;
  }

  private generateEmphasisStyles(emphasisStyles: any[]): string {
    return `
/* Emphasis styles */
strong, .bold {
  font-weight: var(--font-weight-bold);
}

em, .italic {
  font-style: italic;
}

.underline {
  text-decoration: underline;
}

.highlight {
  background-color: var(--color-highlight);
  padding: 2px 4px;
  border-radius: 2px;
}

code, .code {
  font-family: 'Courier New', monospace;
  background-color: var(--color-muted);
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 0.9em;
}
`;
  }

  /**
   * Generates component styles for common cheat sheet elements
   */
  private generateComponentStyles(analysis: TemplateAnalysis, variables: CSSVariables): string {
    const borderStyles = this.generateBorderStyles(analysis.visual.borders);
    const backgroundStyles = this.generateBackgroundStyles(analysis.visual.backgrounds);
    
    return `
/* Component styles */
.topic {
  margin-bottom: var(--spacing-section);
  page-break-inside: avoid;
}

.topic-title {
  font-family: var(--font-family-heading);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-heading-after);
  color: var(--color-primary);
}

.topic-content {
  margin-bottom: var(--spacing-paragraph);
}

.subtopic {
  margin-bottom: var(--spacing-md);
  margin-left: var(--spacing-md);
}

.subtopic-title {
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-sm);
  color: var(--color-secondary);
}

.example {
  background-color: var(--color-highlight);
  padding: var(--spacing-md);
  border-left: 3px solid var(--color-accent);
  margin: var(--spacing-md) 0;
  border-radius: 2px;
}

.formula {
  text-align: center;
  font-family: 'Times New Roman', serif;
  font-style: italic;
  margin: var(--spacing-md) 0;
  padding: var(--spacing-sm);
  background-color: var(--color-muted);
  border-radius: 2px;
}

.definition {
  border: 1px solid var(--color-border);
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  border-radius: 4px;
  background-color: var(--color-background);
}

.definition-term {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

${borderStyles}

${backgroundStyles}
`;
  }

  private generateBorderStyles(borders: BorderPattern[]): string {
    return borders.map((border, index) => `
.border-${border.type} {
  border: ${border.width}px ${border.style} ${border.color};
}
`).join('\n');
  }

  private generateBackgroundStyles(backgrounds: BackgroundPattern[]): string {
    return backgrounds.map((bg, index) => `
.bg-${bg.type} {
  background-color: ${bg.color};
  opacity: ${bg.opacity};
}
`).join('\n');
  }

  /**
   * Generates utility classes
   */
  private generateUtilityStyles(analysis: TemplateAnalysis, variables: CSSVariables): string {
    return `
/* Utility classes */
.hidden { display: none; }
.visible { display: block; }

/* Margins */
.m-0 { margin: 0; }
.m-1 { margin: var(--spacing-xs); }
.m-2 { margin: var(--spacing-sm); }
.m-3 { margin: var(--spacing-md); }
.m-4 { margin: var(--spacing-lg); }

.mt-0 { margin-top: 0; }
.mt-1 { margin-top: var(--spacing-xs); }
.mt-2 { margin-top: var(--spacing-sm); }
.mt-3 { margin-top: var(--spacing-md); }
.mt-4 { margin-top: var(--spacing-lg); }

.mb-0 { margin-bottom: 0; }
.mb-1 { margin-bottom: var(--spacing-xs); }
.mb-2 { margin-bottom: var(--spacing-sm); }
.mb-3 { margin-bottom: var(--spacing-md); }
.mb-4 { margin-bottom: var(--spacing-lg); }

/* Padding */
.p-0 { padding: 0; }
.p-1 { padding: var(--spacing-xs); }
.p-2 { padding: var(--spacing-sm); }
.p-3 { padding: var(--spacing-md); }
.p-4 { padding: var(--spacing-lg); }

/* Colors */
.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-accent { color: var(--color-accent); }
.text-muted { color: var(--color-muted); }

.bg-primary { background-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.bg-accent { background-color: var(--color-accent); }
.bg-muted { background-color: var(--color-muted); }
.bg-highlight { background-color: var(--color-highlight); }
`;
  }

  /**
   * Generates responsive media queries
   */
  private generateMediaQueries(analysis: TemplateAnalysis): MediaQuery[] {
    return [
      {
        condition: 'screen and (max-width: 768px)',
        styles: `
          .cheat-sheet {
            padding: var(--spacing-md);
          }
          
          .content {
            grid-template-columns: 1fr;
            gap: var(--spacing-md);
          }
          
          h1, .h1 { font-size: 1.5rem; }
          h2, .h2 { font-size: 1.25rem; }
          h3, .h3 { font-size: 1.125rem; }
        `
      },
      {
        condition: 'screen and (max-width: 480px)',
        styles: `
          .cheat-sheet {
            padding: var(--spacing-sm);
          }
          
          .subtopic {
            margin-left: var(--spacing-sm);
          }
          
          .example, .definition {
            padding: var(--spacing-sm);
          }
        `
      }
    ];
  }

  /**
   * Generates print-specific styles
   */
  private generatePrintStyles(analysis: TemplateAnalysis, variables: CSSVariables): string {
    return `
    /* Print styles */
    body {
      font-size: 10pt;
      line-height: 1.3;
    }
    
    .cheat-sheet {
      max-width: none;
      margin: 0;
      padding: 0.5in;
      background: white;
      color: black;
    }
    
    h1, .h1 { font-size: 14pt; }
    h2, .h2 { font-size: 12pt; }
    h3, .h3 { font-size: 11pt; }
    h4, .h4 { font-size: 10pt; }
    
    .topic {
      page-break-inside: avoid;
      margin-bottom: 12pt;
    }
    
    .example, .definition {
      border: 1px solid #ccc;
      page-break-inside: avoid;
    }
    
    .hidden-print { display: none; }
    .visible-print { display: block; }
    
    /* Ensure good contrast for printing */
    .bg-highlight {
      background-color: #f0f0f0 !important;
    }
    
    .text-primary, .text-secondary, .text-accent {
      color: black !important;
    }
  `;
  }

  /**
   * Combines all CSS sections into a single stylesheet
   */
  private combineStyles(sections: Record<string, string>): string {
    return `
/* Generated CSS from Reference Template Analysis */
/* Generated on: ${new Date().toISOString()} */

${sections.variables}

${sections.base}

${sections.layout}

${sections.typography}

${sections.components}

${sections.utilities}

${sections.mediaQueries}

${sections.print}
`.trim();
  }

  /**
   * Converts CSS variables object to CSS custom properties
   */
  private variablesToCSS(variables: CSSVariables): string {
    const allVariables = {
      ...variables.colors,
      ...variables.typography,
      ...variables.spacing,
      ...variables.layout
    };

    const cssVars = Object.entries(allVariables)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join('\n');

    return `:root {\n${cssVars}\n}`;
  }

  /**
   * Extracts class names from generated CSS
   */
  private extractClasses(css: string): CSSClasses {
    const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
    const matches = css.match(classRegex) || [];
    const uniqueClasses = [...new Set(matches.map(match => match.substring(1)))];

    return {
      layout: uniqueClasses.filter(cls => 
        cls.includes('container') || cls.includes('column') || cls.includes('grid') || cls.includes('flex') || cls.includes('content')
      ),
      typography: uniqueClasses.filter(cls => 
        cls.startsWith('h') || cls.includes('text') || cls.includes('font')
      ),
      components: uniqueClasses.filter(cls => 
        cls.includes('topic') || cls.includes('example') || cls.includes('definition') || cls.includes('formula')
      ),
      utilities: uniqueClasses.filter(cls => 
        cls.startsWith('m-') || cls.startsWith('p-') || cls.startsWith('bg-') || cls.includes('hidden')
      )
    };
  }

  // Helper methods
  private adjustColorBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  private adjustColorOpacity(hex: string, opacity: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = num >> 16;
    const G = num >> 8 & 0x00FF;
    const B = num & 0x0000FF;
    
    return `rgba(${R}, ${G}, ${B}, ${opacity})`;
  }
}