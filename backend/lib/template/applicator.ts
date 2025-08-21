/**
 * Template application system that adapts user content to reference formatting
 */

import {
  ReferenceTemplate,
  TemplateApplication,
  TemplateConflict,
  TemplateAdaptation,
  TemplatePreview,
  ConflictResolution,
  TemplateProcessingError,
  TemplateFitAnalysis,
  TemplateWarning
} from './types';
import { ExtractedContent, OrganizedTopic } from '../ai/types';
import { LayoutConfig } from '../layout/types';

export class TemplateApplicator {
  /**
   * Applies a reference template to user content
   */
  async applyTemplate(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): Promise<TemplateApplication> {
    try {
      // Analyze compatibility between template and user content
      const conflicts = await this.identifyConflicts(template, userContent, userTopics);
      
      // Create adapted layout configuration
      const adaptedLayout = await this.adaptLayout(template, userContent, conflicts);
      
      // Generate adaptations made to resolve conflicts
      const adaptations = await this.generateAdaptations(template, adaptedLayout, conflicts);
      
      // Generate preview of the applied template
      const preview = await this.generatePreview(template, userContent, userTopics, adaptedLayout);
      
      return {
        sourceTemplate: template,
        userContent,
        adaptedLayout,
        conflicts,
        adaptations,
        preview
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Failed to apply template: ${error.message}`,
        {
          code: 'APPLICATION_FAILED',
          retryable: true,
          details: { templateId: template.id, error }
        }
      );
    }
  }

  /**
   * Identifies conflicts between template and user content
   */
  private async identifyConflicts(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): Promise<TemplateConflict[]> {
    const conflicts: TemplateConflict[] = [];
    
    // Check content volume conflicts
    const contentVolumeConflicts = this.checkContentVolumeConflicts(template, userContent, userTopics);
    conflicts.push(...contentVolumeConflicts);
    
    // Check structure compatibility conflicts
    const structureConflicts = this.checkStructureConflicts(template, userContent);
    conflicts.push(...structureConflicts);
    
    // Check formatting conflicts
    const formatConflicts = this.checkFormatConflicts(template, userContent);
    conflicts.push(...formatConflicts);
    
    // Check visual element conflicts
    const visualConflicts = this.checkVisualConflicts(template, userContent);
    conflicts.push(...visualConflicts);
    
    return conflicts;
  }

  /**
   * Checks for content volume conflicts (too much/little content)
   */
  private checkContentVolumeConflicts(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): TemplateConflict[] {
    const conflicts: TemplateConflict[] = [];
    
    // Calculate user content metrics
    const userWordCount = userContent.reduce((sum, content) => 
      sum + this.estimateWordCount(content.text), 0);
    const userTopicCount = userTopics.length;
    
    // Compare with template metrics
    const templateWordCount = template.analysis.metadata.wordCount;
    const templateTopicCount = template.analysis.metadata.topicCount;
    
    // Check word count overflow
    const wordCountRatio = userWordCount / templateWordCount;
    if (wordCountRatio > 1.5) {
      conflicts.push({
        type: 'content-overflow',
        severity: wordCountRatio > 2 ? 'high' : 'medium',
        description: `User content (${userWordCount} words) significantly exceeds template capacity (${templateWordCount} words)`,
        affectedContent: ['all-content'],
        resolution: this.createContentOverflowResolution(wordCountRatio)
      });
    }
    
    // Check topic count mismatch
    const topicCountRatio = userTopicCount / templateTopicCount;
    if (topicCountRatio > 1.3) {
      conflicts.push({
        type: 'structure-incompatible',
        severity: topicCountRatio > 2 ? 'high' : 'medium',
        description: `User has ${userTopicCount} topics but template is designed for ${templateTopicCount} topics`,
        affectedContent: userTopics.map(t => t.id),
        resolution: this.createTopicCountResolution(topicCountRatio)
      });
    }
    
    return conflicts;
  }

  /**
   * Checks for structural compatibility conflicts
   */
  private checkStructureConflicts(
    template: ReferenceTemplate,
    userContent: ExtractedContent[]
  ): TemplateConflict[] {
    const conflicts: TemplateConflict[] = [];
    
    // Check heading level compatibility
    const userMaxHeadingLevel = Math.max(
      ...userContent.flatMap(content => 
        content.structure.headings.map(h => h.level)
      ), 1
    );
    const templateMaxHeadingLevel = template.analysis.organization.hierarchy.maxDepth;
    
    if (userMaxHeadingLevel > templateMaxHeadingLevel) {
      conflicts.push({
        type: 'structure-incompatible',
        severity: 'medium',
        description: `User content has ${userMaxHeadingLevel} heading levels but template supports only ${templateMaxHeadingLevel}`,
        affectedContent: ['headings'],
        resolution: {
          strategy: 'adapt-template',
          description: 'Flatten heading hierarchy to match template structure',
          impact: 'Some heading levels will be merged or converted to emphasis',
          alternatives: ['Modify template to support deeper hierarchy', 'Restructure user content']
        }
      });
    }
    
    // Check table compatibility
    const userTableCount = userContent.reduce((sum, content) => sum + content.tables.length, 0);
    if (userTableCount > 0 && !this.templateSupportsTables(template)) {
      conflicts.push({
        type: 'format-unsupported',
        severity: 'medium',
        description: `User content contains ${userTableCount} tables but template doesn't support table formatting`,
        affectedContent: userContent.flatMap(content => content.tables.map(t => t.id)),
        resolution: {
          strategy: 'prioritize-content',
          description: 'Convert tables to formatted text lists',
          impact: 'Table structure will be simplified but content preserved',
          alternatives: ['Modify template to support tables', 'Remove tables from content']
        }
      });
    }
    
    return conflicts;
  }

  /**
   * Checks for formatting conflicts
   */
  private checkFormatConflicts(
    template: ReferenceTemplate,
    userContent: ExtractedContent[]
  ): TemplateConflict[] {
    const conflicts: TemplateConflict[] = [];
    
    // Check image compatibility
    const userImageCount = userContent.reduce((sum, content) => sum + content.images.length, 0);
    const templateSupportsImages = this.templateSupportsImages(template);
    
    if (userImageCount > 0 && !templateSupportsImages) {
      conflicts.push({
        type: 'format-unsupported',
        severity: 'low',
        description: `User content contains ${userImageCount} images but template has minimal image support`,
        affectedContent: userContent.flatMap(content => content.images.map(img => img.id)),
        resolution: {
          strategy: 'hybrid',
          description: 'Include essential images and convert others to text descriptions',
          impact: 'Some visual information may be lost',
          alternatives: ['Modify template layout for images', 'Remove all images']
        }
      });
    }
    
    return conflicts;
  }

  /**
   * Checks for visual element conflicts
   */
  private checkVisualConflicts(
    template: ReferenceTemplate,
    userContent: ExtractedContent[]
  ): TemplateConflict[] {
    const conflicts: TemplateConflict[] = [];
    
    // Check color scheme compatibility (if user content has color information)
    // This is a placeholder for more sophisticated color analysis
    
    // Check font compatibility
    const templateFonts = template.analysis.typography.fontFamilies.map(f => f.name);
    const hasSpecialFonts = templateFonts.some(font => 
      !['Arial', 'Helvetica', 'Times', 'Georgia', 'Verdana'].includes(font)
    );
    
    if (hasSpecialFonts) {
      conflicts.push({
        type: 'style-mismatch',
        severity: 'low',
        description: 'Template uses specialized fonts that may not be available in all environments',
        affectedContent: ['typography'],
        resolution: {
          strategy: 'adapt-template',
          description: 'Use web-safe font alternatives',
          impact: 'Visual appearance may differ slightly from original template',
          alternatives: ['Include font files', 'Accept font substitution']
        }
      });
    }
    
    return conflicts;
  }

  /**
   * Adapts the template layout to accommodate user content
   */
  private async adaptLayout(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    conflicts: TemplateConflict[]
  ): Promise<LayoutConfig> {
    const baseLayout = this.convertTemplateToLayoutConfig(template);
    
    // Apply adaptations based on conflicts
    let adaptedLayout = { ...baseLayout };
    
    for (const conflict of conflicts) {
      adaptedLayout = this.applyConflictResolution(adaptedLayout, conflict);
    }
    
    // Ensure layout is valid and functional
    adaptedLayout = this.validateAndAdjustLayout(adaptedLayout, userContent);
    
    return adaptedLayout;
  }

  /**
   * Converts template analysis to layout configuration
   */
  private convertTemplateToLayoutConfig(template: ReferenceTemplate): LayoutConfig {
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

  /**
   * Applies conflict resolution to layout
   */
  private applyConflictResolution(
    layout: LayoutConfig,
    conflict: TemplateConflict
  ): LayoutConfig {
    const adaptedLayout = { ...layout };
    
    switch (conflict.resolution.strategy) {
      case 'prioritize-content':
        // Adjust layout to fit more content
        if (conflict.type === 'content-overflow') {
          adaptedLayout.maxPages = Math.ceil(adaptedLayout.maxPages * 1.5);
          adaptedLayout.text.size = this.reduceTextSize(adaptedLayout.text.size);
        }
        break;
        
      case 'adapt-template':
        // Modify template structure
        if (conflict.type === 'structure-incompatible') {
          // Adjust column count or spacing for better content fit
          if (adaptedLayout.page.columns === 1) {
            adaptedLayout.page.columns = 2;
            adaptedLayout.page.columnGap = 15;
          }
        }
        break;
        
      case 'hybrid':
        // Balanced approach
        adaptedLayout.maxPages = Math.ceil(adaptedLayout.maxPages * 1.2);
        break;
    }
    
    return adaptedLayout;
  }

  /**
   * Validates and adjusts layout for functionality
   */
  private validateAndAdjustLayout(
    layout: LayoutConfig,
    userContent: ExtractedContent[]
  ): LayoutConfig {
    const adjustedLayout = { ...layout };
    
    // Ensure minimum readability
    if (adjustedLayout.text.baseFontSize < 8) {
      adjustedLayout.text.baseFontSize = 8;
      adjustedLayout.text.size = 'small';
    }
    
    // Ensure reasonable page limits
    if (adjustedLayout.maxPages > 10) {
      adjustedLayout.maxPages = 10;
    }
    
    // Ensure proper margins for content
    if (adjustedLayout.page.margins.top < 10) {
      adjustedLayout.page.margins.top = 10;
    }
    
    return adjustedLayout;
  }

  /**
   * Generates adaptations made during template application
   */
  private async generateAdaptations(
    template: ReferenceTemplate,
    adaptedLayout: LayoutConfig,
    conflicts: TemplateConflict[]
  ): Promise<TemplateAdaptation[]> {
    const adaptations: TemplateAdaptation[] = [];
    
    // Compare original template with adapted layout
    const originalLayout = this.convertTemplateToLayoutConfig(template);
    
    // Check for layout changes
    if (adaptedLayout.maxPages !== originalLayout.maxPages) {
      adaptations.push({
        type: 'layout',
        original: originalLayout.maxPages,
        adapted: adaptedLayout.maxPages,
        reason: 'Adjusted page count to accommodate user content volume',
        confidence: 0.9
      });
    }
    
    if (adaptedLayout.text.size !== originalLayout.text.size) {
      adaptations.push({
        type: 'typography',
        original: originalLayout.text.size,
        adapted: adaptedLayout.text.size,
        reason: 'Reduced text size to fit more content',
        confidence: 0.8
      });
    }
    
    if (adaptedLayout.page.columns !== originalLayout.page.columns) {
      adaptations.push({
        type: 'layout',
        original: originalLayout.page.columns,
        adapted: adaptedLayout.page.columns,
        reason: 'Adjusted column count for better content distribution',
        confidence: 0.7
      });
    }
    
    return adaptations;
  }

  /**
   * Generates preview of applied template
   */
  private async generatePreview(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    adaptedLayout: LayoutConfig
  ): Promise<TemplatePreview> {
    try {
      // Generate HTML structure based on template patterns
      const html = this.generatePreviewHTML(template, userTopics, adaptedLayout);
      
      // Generate CSS based on template styles
      const css = this.generatePreviewCSS(template, adaptedLayout);
      
      // Analyze fit and generate warnings
      const fitAnalysis = this.analyzeFit(template, userContent, userTopics, adaptedLayout);
      const warnings = this.generateWarnings(template, userContent, adaptedLayout, fitAnalysis);
      
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
   * Generates HTML structure for preview
   */
  private generatePreviewHTML(
    template: ReferenceTemplate,
    userTopics: OrganizedTopic[],
    layout: LayoutConfig
  ): string {
    const analysis = template.analysis;
    
    let html = '<div class="cheat-sheet-preview">';
    
    // Add header if template has one
    if (analysis.organization.structure.sections.some(s => s.type === 'header')) {
      html += '<header class="cheat-sheet-header">';
      html += '<h1>Cheat Sheet</h1>';
      html += '</header>';
    }
    
    // Add main content area
    html += '<main class="cheat-sheet-content">';
    
    // Generate content based on user topics and template organization
    userTopics.forEach((topic, index) => {
      html += `<section class="topic-section" data-topic-id="${topic.id}">`;
      html += `<h2 class="topic-title">${this.escapeHtml(topic.title)}</h2>`;
      html += `<div class="topic-content">${this.formatTopicContent(topic.content)}</div>`;
      
      // Add subtopics
      if (topic.subtopics && topic.subtopics.length > 0) {
        html += '<div class="subtopics">';
        topic.subtopics.forEach(subtopic => {
          html += `<div class="subtopic">`;
          html += `<h3 class="subtopic-title">${this.escapeHtml(subtopic.title)}</h3>`;
          html += `<div class="subtopic-content">${this.formatTopicContent(subtopic.content)}</div>`;
          html += '</div>';
        });
        html += '</div>';
      }
      
      html += '</section>';
    });
    
    html += '</main>';
    html += '</div>';
    
    return html;
  }

  /**
   * Generates CSS based on template styles
   */
  private generatePreviewCSS(template: ReferenceTemplate, layout: LayoutConfig): string {
    const analysis = template.analysis;
    
    let css = `
      .cheat-sheet-preview {
        font-family: ${analysis.typography.bodyTextStyle.fontFamily};
        font-size: ${layout.text.baseFontSize}px;
        line-height: ${analysis.typography.bodyTextStyle.lineHeight};
        color: ${analysis.visual.colorScheme.text};
        background-color: ${analysis.visual.colorScheme.background};
        margin: ${layout.page.margins.top}mm ${layout.page.margins.right}mm ${layout.page.margins.bottom}mm ${layout.page.margins.left}mm;
        column-count: ${layout.page.columns};
        column-gap: ${layout.page.columnGap}px;
      }
      
      .cheat-sheet-header {
        column-span: all;
        text-align: center;
        margin-bottom: ${analysis.layout.spacing.sectionSpacing}px;
        border-bottom: 1px solid ${analysis.visual.colorScheme.primary};
        padding-bottom: 10px;
      }
      
      .cheat-sheet-header h1 {
        font-size: ${analysis.typography.headingStyles[0]?.fontSize || 18}px;
        font-weight: ${analysis.typography.headingStyles[0]?.fontWeight || 700};
        margin: 0;
        color: ${analysis.visual.colorScheme.primary};
      }
      
      .topic-section {
        break-inside: avoid;
        margin-bottom: ${analysis.layout.spacing.sectionSpacing}px;
      }
      
      .topic-title {
        font-size: ${analysis.typography.headingStyles[1]?.fontSize || 16}px;
        font-weight: ${analysis.typography.headingStyles[1]?.fontWeight || 700};
        color: ${analysis.visual.colorScheme.primary};
        margin: ${analysis.layout.spacing.headingSpacing.before}px 0 ${analysis.layout.spacing.headingSpacing.after}px 0;
      }
      
      .topic-content {
        margin-bottom: ${analysis.layout.spacing.paragraphSpacing}px;
      }
      
      .subtopics {
        margin-left: 20px;
      }
      
      .subtopic {
        margin-bottom: ${analysis.layout.spacing.paragraphSpacing}px;
      }
      
      .subtopic-title {
        font-size: ${analysis.typography.headingStyles[2]?.fontSize || 14}px;
        font-weight: ${analysis.typography.headingStyles[2]?.fontWeight || 600};
        color: ${analysis.visual.colorScheme.secondary};
        margin: 8px 0 4px 0;
      }
      
      .subtopic-content {
        margin-left: 10px;
      }
      
      ul, ol {
        margin: ${analysis.layout.spacing.paragraphSpacing / 2}px 0;
        padding-left: 20px;
      }
      
      li {
        margin-bottom: 2px;
      }
      
      strong {
        font-weight: 700;
        color: ${analysis.visual.colorScheme.primary};
      }
      
      em {
        font-style: italic;
        color: ${analysis.visual.colorScheme.secondary};
      }
    `;
    
    return css;
  }

  /**
   * Analyzes how well content fits the template
   */
  private analyzeFit(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    layout: LayoutConfig
  ): TemplateFitAnalysis {
    // Calculate content fit percentage
    const userWordCount = userContent.reduce((sum, content) => 
      sum + this.estimateWordCount(content.text), 0);
    const templateCapacity = template.analysis.metadata.wordCount * layout.maxPages;
    const contentFit = Math.min(1, templateCapacity / userWordCount);
    
    // Calculate style fidelity
    const originalLayout = this.convertTemplateToLayoutConfig(template);
    const styleFidelity = this.calculateStyleFidelity(originalLayout, layout);
    
    // Calculate overall quality
    const overallQuality = (contentFit * 0.6) + (styleFidelity * 0.4);
    
    // Generate recommendations
    const recommendations = this.generateFitRecommendations(contentFit, styleFidelity, overallQuality);
    
    return {
      contentFit,
      styleFidelity,
      overallQuality,
      recommendations
    };
  }

  /**
   * Generates warnings about template application
   */
  private generateWarnings(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    layout: LayoutConfig,
    fitAnalysis: TemplateFitAnalysis
  ): TemplateWarning[] {
    const warnings: TemplateWarning[] = [];
    
    if (fitAnalysis.contentFit < 0.8) {
      warnings.push({
        type: 'content-modified',
        severity: fitAnalysis.contentFit < 0.6 ? 'high' : 'medium',
        message: `Content may be truncated or compressed to fit template (${Math.round(fitAnalysis.contentFit * 100)}% fit)`,
        affectedElements: ['content'],
        suggestion: 'Consider increasing page count or reducing content'
      });
    }
    
    if (fitAnalysis.styleFidelity < 0.8) {
      warnings.push({
        type: 'style-changed',
        severity: fitAnalysis.styleFidelity < 0.6 ? 'high' : 'medium',
        message: `Template styling has been significantly modified (${Math.round(fitAnalysis.styleFidelity * 100)}% fidelity)`,
        affectedElements: ['typography', 'layout'],
        suggestion: 'Review style changes and consider template adjustments'
      });
    }
    
    if (layout.maxPages > template.analysis.metadata.pageCount * 1.5) {
      warnings.push({
        type: 'layout-adjusted',
        severity: 'medium',
        message: `Page count increased significantly from ${template.analysis.metadata.pageCount} to ${layout.maxPages}`,
        affectedElements: ['layout'],
        suggestion: 'Consider reducing content or using a different template'
      });
    }
    
    return warnings;
  }

  // Helper methods
  private createContentOverflowResolution(ratio: number): ConflictResolution {
    if (ratio > 2) {
      return {
        strategy: 'prioritize-content',
        description: 'Significantly increase page count and reduce text size',
        impact: 'Template appearance will be substantially modified',
        alternatives: ['Reduce content by 50%', 'Use a different template', 'Create custom layout']
      };
    } else {
      return {
        strategy: 'hybrid',
        description: 'Moderately adjust layout and slightly increase pages',
        impact: 'Template will be adapted but maintain overall structure',
        alternatives: ['Reduce content by 25%', 'Accept modified appearance']
      };
    }
  }

  private createTopicCountResolution(ratio: number): ConflictResolution {
    return {
      strategy: 'adapt-template',
      description: 'Adjust section spacing and organization to accommodate more topics',
      impact: 'Topics may be more densely packed',
      alternatives: ['Merge related topics', 'Use multi-page layout', 'Reduce topic detail']
    };
  }

  private templateSupportsImages(template: ReferenceTemplate): boolean {
    return template.extractedContent.images.length > 0;
  }

  private templateSupportsTables(template: ReferenceTemplate): boolean {
    return template.extractedContent.tables.length > 0;
  }

  private inferTextSize(fontSize: number): 'small' | 'medium' | 'large' {
    if (fontSize <= 10) return 'small';
    if (fontSize <= 14) return 'medium';
    return 'large';
  }

  private reduceTextSize(size: 'small' | 'medium' | 'large'): 'small' | 'medium' | 'large' {
    switch (size) {
      case 'large': return 'medium';
      case 'medium': return 'small';
      case 'small': return 'small';
    }
  }

  private calculateStyleFidelity(original: LayoutConfig, adapted: LayoutConfig): number {
    let fidelity = 1.0;
    
    // Check page configuration changes
    if (original.page.paperSize !== adapted.page.paperSize) fidelity -= 0.1;
    if (original.page.orientation !== adapted.page.orientation) fidelity -= 0.1;
    if (original.page.columns !== adapted.page.columns) fidelity -= 0.15;
    
    // Check text configuration changes
    if (original.text.size !== adapted.text.size) fidelity -= 0.1;
    if (original.text.fontFamily !== adapted.text.fontFamily) fidelity -= 0.05;
    
    // Check page count changes
    const pageCountRatio = Math.abs(original.maxPages - adapted.maxPages) / original.maxPages;
    fidelity -= Math.min(0.3, pageCountRatio * 0.5);
    
    return Math.max(0, fidelity);
  }

  private generateFitRecommendations(
    contentFit: number,
    styleFidelity: number,
    overallQuality: number
  ) {
    const recommendations = [];
    
    if (overallQuality >= 0.8) {
      recommendations.push({
        type: 'accept-as-is' as const,
        description: 'Template application is successful with good fit and fidelity',
        impact: 'low' as const,
        effort: 'easy' as const
      });
    } else if (contentFit < 0.7) {
      recommendations.push({
        type: 'reduce-content' as const,
        description: 'Reduce content volume to better fit template structure',
        impact: 'medium' as const,
        effort: 'moderate' as const
      });
    } else if (styleFidelity < 0.7) {
      recommendations.push({
        type: 'adjust-template' as const,
        description: 'Modify template parameters to better accommodate content',
        impact: 'medium' as const,
        effort: 'moderate' as const
      });
    } else {
      recommendations.push({
        type: 'change-layout' as const,
        description: 'Consider using a different template or custom layout',
        impact: 'high' as const,
        effort: 'difficult' as const
      });
    }
    
    return recommendations;
  }

  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatTopicContent(content: string): string {
    // Basic formatting - convert line breaks to HTML
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^\s*/, '<p>')
      .replace(/\s*$/, '</p>');
  }
}