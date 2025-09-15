/**
 * Template preview and comparison functionality
 */

import {
  ReferenceTemplate,
  TemplateApplication,
  TemplateComparison,
  TemplateDifference,
  TemplatePreview,
  TemplateProcessingError
} from './types';
import { ExtractedContent, OrganizedTopic } from '../ai/types';
import { LayoutConfig } from '../layout/types';

export class TemplatePreviewGenerator {
  /**
   * Generates a comprehensive preview of template application
   */
  async generatePreview(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    layout: LayoutConfig
  ): Promise<TemplatePreview> {
    try {
      // Generate HTML structure
      const html = this.generateHTML(template, userTopics, layout);
      
      // Generate CSS styles
      const css = this.generateCSS(template, layout);
      
      // Analyze fit and generate warnings
      const fitAnalysis = this.analyzeFit(template, userContent, userTopics, layout);
      const warnings = this.generateWarnings(template, userContent, layout, fitAnalysis);
      
      return {
        html,
        css,
        warnings,
        fitAnalysis
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Failed to generate preview: ${error.message}`,
        {
          code: 'PREVIEW_GENERATION_FAILED',
          retryable: true,
          details: { templateId: template.id, error }
        }
      );
    }
  }

  /**
   * Compares original template with applied version
   */
  async compareTemplates(
    original: ReferenceTemplate,
    applied: TemplateApplication
  ): Promise<TemplateComparison> {
    try {
      // Identify differences between original and applied
      const differences = this.identifyDifferences(original, applied);
      
      // Calculate similarity score
      const similarity = this.calculateSimilarity(differences);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(similarity, differences);
      
      return {
        original,
        applied,
        differences,
        similarity,
        recommendation
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Failed to compare templates: ${error.message}`,
        {
          code: 'PREVIEW_GENERATION_FAILED',
          retryable: true,
          details: { templateId: original.id, error }
        }
      );
    }
  }

  /**
   * Generates side-by-side comparison preview
   */
  async generateComparisonPreview(
    original: ReferenceTemplate,
    applied: TemplateApplication
  ): Promise<{
    originalPreview: TemplatePreview;
    appliedPreview: TemplatePreview;
    comparisonHTML: string;
  }> {
    // Generate preview for original template
    const originalPreview = await this.generatePreview(
      original,
      original.extractedContent ? [original.extractedContent] : [],
      this.extractTopicsFromContent(original.extractedContent),
      this.convertTemplateToLayout(original)
    );
    
    // Use the applied template's preview
    const appliedPreview = applied.preview;
    
    // Generate side-by-side comparison HTML
    const comparisonHTML = this.generateComparisonHTML(originalPreview, appliedPreview);
    
    return {
      originalPreview,
      appliedPreview,
      comparisonHTML
    };
  }

  /**
   * Generates HTML structure for preview
   */
  private generateHTML(
    template: ReferenceTemplate,
    userTopics: OrganizedTopic[],
    layout: LayoutConfig
  ): string {
    const analysis = template.analysis;
    
    let html = `
      <div class="cheat-sheet-preview" data-template-id="${template.id}">
        <div class="preview-metadata">
          <span class="template-name">${template.name}</span>
          <span class="page-count">${layout.maxPages} page(s)</span>
          <span class="layout-info">${layout.page.paperSize.toUpperCase()} ${layout.page.orientation}</span>
        </div>
    `;
    
    // Add header if template has one
    if (this.hasHeader(analysis)) {
      html += `
        <header class="cheat-sheet-header">
          <h1 class="main-title">Study Guide</h1>
        </header>
      `;
    }
    
    // Add main content container
    html += '<main class="cheat-sheet-content">';
    
    // Generate content based on column layout
    if (layout.page.columns > 1) {
      html += '<div class="column-container">';
      
      // Distribute topics across columns
      const topicsPerColumn = Math.ceil(userTopics.length / layout.page.columns);
      
      for (let col = 0; col < layout.page.columns; col++) {
        html += '<div class="column">';
        
        const startIndex = col * topicsPerColumn;
        const endIndex = Math.min(startIndex + topicsPerColumn, userTopics.length);
        const columnTopics = userTopics.slice(startIndex, endIndex);
        
        html += this.generateTopicsHTML(columnTopics, analysis);
        html += '</div>';
      }
      
      html += '</div>';
    } else {
      // Single column layout
      html += this.generateTopicsHTML(userTopics, analysis);
    }
    
    html += '</main>';
    
    // Add footer if template has one
    if (this.hasFooter(analysis)) {
      html += `
        <footer class="cheat-sheet-footer">
          <div class="footer-content">Page <span class="page-number">1</span></div>
        </footer>
      `;
    }
    
    html += '</div>';
    
    return html;
  }

  /**
   * Generates HTML for topics
   */
  private generateTopicsHTML(topics: OrganizedTopic[], analysis: any): string {
    let html = '';
    
    topics.forEach((topic, index) => {
      html += `
        <section class="topic-section" data-topic-id="${topic.id}">
          <h2 class="topic-title">${this.escapeHtml(topic.title)}</h2>
          <div class="topic-content">
            ${this.formatContent(topic.content)}
          </div>
      `;
      
      // Add subtopics
      if (topic.subtopics && topic.subtopics.length > 0) {
        html += '<div class="subtopics">';
        topic.subtopics.forEach(subtopic => {
          html += `
            <div class="subtopic">
              <h3 class="subtopic-title">${this.escapeHtml(subtopic.title)}</h3>
              <div class="subtopic-content">
                ${this.formatContent(subtopic.content)}
              </div>
            </div>
          `;
        });
        html += '</div>';
      }
      
      // Add examples if available
      if (topic.examples && topic.examples.length > 0) {
        html += '<div class="examples">';
        topic.examples.forEach(example => {
          html += `
            <div class="example">
              <img src="data:image/png;base64,${example.base64}" alt="Example" class="example-image" />
              ${example.ocrText ? `<p class="example-text">${this.escapeHtml(example.ocrText)}</p>` : ''}
            </div>
          `;
        });
        html += '</div>';
      }
      
      html += '</section>';
    });
    
    return html;
  }

  /**
   * Generates CSS styles for preview
   */
  private generateCSS(template: ReferenceTemplate, layout: LayoutConfig): string {
    const analysis = template.analysis;
    const typography = analysis.typography;
    const visual = analysis.visual;
    const spacing = analysis.layout.spacing;
    
    return `
      .cheat-sheet-preview {
        font-family: ${typography.bodyTextStyle.fontFamily}, sans-serif;
        font-size: ${layout.text.baseFontSize}px;
        line-height: ${typography.bodyTextStyle.lineHeight};
        color: ${visual.colorScheme.text};
        background-color: ${visual.colorScheme.background};
        padding: ${layout.page.margins.top}mm ${layout.page.margins.right}mm ${layout.page.margins.bottom}mm ${layout.page.margins.left}mm;
        max-width: 210mm; /* A4 width */
        margin: 0 auto;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        position: relative;
      }
      
      .preview-metadata {
        position: absolute;
        top: -30px;
        right: 0;
        font-size: 12px;
        color: #666;
        background: #f5f5f5;
        padding: 5px 10px;
        border-radius: 3px;
      }
      
      .preview-metadata span {
        margin-right: 15px;
      }
      
      .cheat-sheet-header {
        text-align: center;
        margin-bottom: ${spacing.sectionSpacing}px;
        border-bottom: 2px solid ${visual.colorScheme.primary};
        padding-bottom: 10px;
      }
      
      .main-title {
        font-size: ${typography.headingStyles[0]?.fontSize || 20}px;
        font-weight: ${typography.headingStyles[0]?.fontWeight || 700};
        color: ${visual.colorScheme.primary};
        margin: 0;
        text-transform: ${typography.headingStyles[0]?.textTransform || 'none'};
      }
      
      .cheat-sheet-content {
        ${layout.page.columns > 1 ? '' : 'column-count: 1;'}
      }
      
      .column-container {
        display: flex;
        gap: ${layout.page.columnGap}px;
      }
      
      .column {
        flex: 1;
        break-inside: avoid;
      }
      
      .topic-section {
        break-inside: avoid;
        margin-bottom: ${spacing.sectionSpacing}px;
        page-break-inside: avoid;
      }
      
      .topic-title {
        font-size: ${typography.headingStyles[1]?.fontSize || 16}px;
        font-weight: ${typography.headingStyles[1]?.fontWeight || 700};
        color: ${visual.colorScheme.primary};
        margin: ${spacing.headingSpacing.before}px 0 ${spacing.headingSpacing.after}px 0;
        border-left: 3px solid ${visual.colorScheme.accent};
        padding-left: 8px;
      }
      
      .topic-content {
        margin-bottom: ${spacing.paragraphSpacing}px;
        text-align: ${typography.bodyTextStyle.textAlign};
      }
      
      .subtopics {
        margin-left: 15px;
        border-left: 1px solid ${visual.colorScheme.muted};
        padding-left: 10px;
      }
      
      .subtopic {
        margin-bottom: ${spacing.paragraphSpacing}px;
      }
      
      .subtopic-title {
        font-size: ${typography.headingStyles[2]?.fontSize || 14}px;
        font-weight: ${typography.headingStyles[2]?.fontWeight || 600};
        color: ${visual.colorScheme.secondary};
        margin: 8px 0 4px 0;
      }
      
      .subtopic-content {
        margin-left: 10px;
      }
      
      .examples {
        margin-top: 10px;
        padding: 8px;
        background-color: ${visual.colorScheme.muted};
        border-radius: 4px;
      }
      
      .example {
        margin-bottom: 8px;
      }
      
      .example-image {
        max-width: 100%;
        height: auto;
        border: 1px solid ${visual.colorScheme.secondary};
        border-radius: 2px;
      }
      
      .example-text {
        font-size: ${layout.text.baseFontSize - 1}px;
        color: ${visual.colorScheme.secondary};
        margin: 4px 0 0 0;
        font-style: italic;
      }
      
      .cheat-sheet-footer {
        margin-top: ${spacing.sectionSpacing}px;
        padding-top: 10px;
        border-top: 1px solid ${visual.colorScheme.muted};
        text-align: center;
        font-size: ${layout.text.baseFontSize - 2}px;
        color: ${visual.colorScheme.secondary};
      }
      
      ul, ol {
        margin: ${spacing.paragraphSpacing / 2}px 0;
        padding-left: 20px;
      }
      
      li {
        margin-bottom: 2px;
      }
      
      strong {
        font-weight: 700;
        color: ${visual.colorScheme.primary};
      }
      
      em {
        font-style: italic;
        color: ${visual.colorScheme.secondary};
      }
      
      code {
        font-family: 'Courier New', monospace;
        background-color: ${visual.colorScheme.muted};
        padding: 2px 4px;
        border-radius: 2px;
        font-size: ${layout.text.baseFontSize - 1}px;
      }
      
      .highlight {
        background-color: ${visual.colorScheme.accent};
        color: white;
        padding: 1px 3px;
        border-radius: 2px;
      }
      
      @media print {
        .cheat-sheet-preview {
          box-shadow: none;
          margin: 0;
        }
        
        .preview-metadata {
          display: none;
        }
        
        .topic-section {
          page-break-inside: avoid;
        }
      }
    `;
  }

  /**
   * Identifies differences between original and applied templates
   */
  private identifyDifferences(
    original: ReferenceTemplate,
    applied: TemplateApplication
  ): TemplateDifference[] {
    const differences: TemplateDifference[] = [];
    const originalLayout = this.convertTemplateToLayout(original);
    const appliedLayout = applied.adaptedLayout;
    
    // Layout differences
    if (originalLayout.page.paperSize !== appliedLayout.page.paperSize) {
      differences.push({
        category: 'layout',
        type: 'paper-size',
        original: originalLayout.page.paperSize,
        applied: appliedLayout.page.paperSize,
        impact: 'visual',
        severity: 'moderate'
      });
    }
    
    if (originalLayout.page.orientation !== appliedLayout.page.orientation) {
      differences.push({
        category: 'layout',
        type: 'orientation',
        original: originalLayout.page.orientation,
        applied: appliedLayout.page.orientation,
        impact: 'functional',
        severity: 'major'
      });
    }
    
    if (originalLayout.page.columns !== appliedLayout.page.columns) {
      differences.push({
        category: 'layout',
        type: 'columns',
        original: originalLayout.page.columns,
        applied: appliedLayout.page.columns,
        impact: 'visual',
        severity: 'moderate'
      });
    }
    
    if (originalLayout.maxPages !== appliedLayout.maxPages) {
      differences.push({
        category: 'layout',
        type: 'page-count',
        original: originalLayout.maxPages,
        applied: appliedLayout.maxPages,
        impact: 'functional',
        severity: originalLayout.maxPages < appliedLayout.maxPages ? 'moderate' : 'major'
      });
    }
    
    // Typography differences
    if (originalLayout.text.size !== appliedLayout.text.size) {
      differences.push({
        category: 'typography',
        type: 'text-size',
        original: originalLayout.text.size,
        applied: appliedLayout.text.size,
        impact: 'visual',
        severity: 'moderate'
      });
    }
    
    if (originalLayout.text.fontFamily !== appliedLayout.text.fontFamily) {
      differences.push({
        category: 'typography',
        type: 'font-family',
        original: originalLayout.text.fontFamily,
        applied: appliedLayout.text.fontFamily,
        impact: 'visual',
        severity: 'minor'
      });
    }
    
    // Organization differences (based on adaptations)
    applied.adaptations.forEach(adaptation => {
      differences.push({
        category: 'organization',
        type: adaptation.type,
        original: adaptation.original,
        applied: adaptation.adapted,
        impact: 'content',
        severity: adaptation.confidence > 0.8 ? 'minor' : 'moderate'
      });
    });
    
    return differences;
  }

  /**
   * Calculates similarity between original and applied templates
   */
  private calculateSimilarity(differences: TemplateDifference[]): number {
    if (differences.length === 0) return 1.0;
    
    let totalImpact = 0;
    const maxImpact = differences.length * 1.0; // Maximum possible impact
    
    differences.forEach(diff => {
      let impact = 0;
      
      // Weight by severity
      switch (diff.severity) {
        case 'minor': impact += 0.2; break;
        case 'moderate': impact += 0.5; break;
        case 'major': impact += 1.0; break;
      }
      
      // Weight by category importance
      switch (diff.category) {
        case 'layout': impact *= 1.2; break;
        case 'typography': impact *= 1.0; break;
        case 'organization': impact *= 0.8; break;
        case 'visual': impact *= 0.6; break;
      }
      
      totalImpact += impact;
    });
    
    return Math.max(0, 1 - (totalImpact / maxImpact));
  }

  /**
   * Generates recommendation based on similarity and differences
   */
  private generateRecommendation(
    similarity: number,
    differences: TemplateDifference[]
  ): 'use-template' | 'modify-template' | 'create-custom' {
    if (similarity >= 0.8) {
      return 'use-template';
    }
    
    if (similarity >= 0.5) {
      // Check if differences are mostly minor
      const majorDifferences = differences.filter(d => d.severity === 'major').length;
      return majorDifferences <= 1 ? 'modify-template' : 'create-custom';
    }
    
    return 'create-custom';
  }

  /**
   * Generates side-by-side comparison HTML
   */
  private generateComparisonHTML(
    original: TemplatePreview,
    applied: TemplatePreview
  ): string {
    return `
      <div class="template-comparison">
        <div class="comparison-header">
          <h2>Template Comparison</h2>
          <div class="comparison-legend">
            <span class="legend-item original">Original Template</span>
            <span class="legend-item applied">Applied Template</span>
          </div>
        </div>
        
        <div class="comparison-content">
          <div class="comparison-side original-side">
            <h3>Original Template</h3>
            <div class="preview-container">
              <style>${original.css}</style>
              ${original.html}
            </div>
          </div>
          
          <div class="comparison-side applied-side">
            <h3>Applied Template</h3>
            <div class="preview-container">
              <style>${applied.css}</style>
              ${applied.html}
            </div>
          </div>
        </div>
        
        <div class="comparison-warnings">
          ${applied.warnings.map(warning => `
            <div class="warning ${warning.severity}">
              <strong>${warning.type}:</strong> ${warning.message}
              ${warning.suggestion ? `<br><em>Suggestion: ${warning.suggestion}</em>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      
      <style>
        .template-comparison {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .comparison-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .comparison-legend {
          margin-top: 10px;
        }
        
        .legend-item {
          display: inline-block;
          padding: 5px 10px;
          margin: 0 10px;
          border-radius: 3px;
        }
        
        .legend-item.original {
          background-color: #e3f2fd;
          border: 1px solid #2196f3;
        }
        
        .legend-item.applied {
          background-color: #f3e5f5;
          border: 1px solid #9c27b0;
        }
        
        .comparison-content {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .comparison-side {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 5px;
          overflow: hidden;
        }
        
        .comparison-side h3 {
          margin: 0;
          padding: 10px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }
        
        .original-side h3 {
          background-color: #e3f2fd;
        }
        
        .applied-side h3 {
          background-color: #f3e5f5;
        }
        
        .preview-container {
          padding: 10px;
          max-height: 600px;
          overflow-y: auto;
          transform: scale(0.7);
          transform-origin: top left;
          width: 142.86%; /* 100% / 0.7 */
        }
        
        .comparison-warnings {
          margin-top: 20px;
        }
        
        .warning {
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
          border-left: 4px solid;
        }
        
        .warning.low {
          background-color: #fff3cd;
          border-color: #ffc107;
        }
        
        .warning.medium {
          background-color: #f8d7da;
          border-color: #dc3545;
        }
        
        .warning.high {
          background-color: #f5c6cb;
          border-color: #721c24;
        }
      </style>
    `;
  }

  // Helper methods
  private hasHeader(analysis: any): boolean {
    return analysis.organization.structure.sections.some(s => s.type === 'header');
  }

  private hasFooter(analysis: any): boolean {
    return analysis.organization.structure.sections.some(s => s.type === 'footer');
  }

  private convertTemplateToLayout(template: ReferenceTemplate): LayoutConfig {
    const analysis = template.analysis;
    
    return {
      page: analysis.layout.pageConfig,
      text: {
        size: this.inferTextSize(analysis.typography.bodyTextStyle.fontSize),
        lineHeight: analysis.typography.bodyTextStyle.lineHeight,
        fontFamily: analysis.typography.bodyTextStyle.fontFamily,
        baseFontSize: analysis.typography.bodyTextStyle.fontSize
      },
      maxPages: analysis.metadata.pageCount
    };
  }

  private extractTopicsFromContent(content: ExtractedContent): OrganizedTopic[] {
    if (!content) return [];
    
    return content.structure.sections.map((section, index) => ({
      id: `topic_${index}`,
      title: section.title,
      content: section.content,
      subtopics: [],
      sourceFiles: [content.metadata.name],
      confidence: 0.8,
      examples: [],
      originalWording: section.content
    }));
  }

  private analyzeFit(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    layout: LayoutConfig
  ) {
    // Simplified fit analysis - in a real implementation this would be more sophisticated
    const userWordCount = userContent.reduce((sum, content) => 
      sum + this.estimateWordCount(content.text), 0);
    const templateCapacity = template.analysis.metadata.wordCount * layout.maxPages;
    const contentFit = Math.min(1, templateCapacity / userWordCount);
    
    return {
      contentFit,
      styleFidelity: 0.9, // Placeholder
      overallQuality: contentFit * 0.9,
      recommendations: []
    };
  }

  private generateWarnings(template: ReferenceTemplate, userContent: ExtractedContent[], layout: LayoutConfig, fitAnalysis: any) {
    const warnings = [];
    
    if (fitAnalysis.contentFit < 0.8) {
      warnings.push({
        type: 'content-modified' as const,
        severity: 'medium' as const,
        message: 'Content may be compressed to fit template',
        affectedElements: ['content'],
        suggestion: 'Consider increasing page count'
      });
    }
    
    return warnings;
  }

  private inferTextSize(fontSize: number): 'small' | 'medium' | 'large' {
    if (fontSize <= 10) return 'small';
    if (fontSize <= 14) return 'medium';
    return 'large';
  }

  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatContent(content: string): string {
    // Basic content formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }
}