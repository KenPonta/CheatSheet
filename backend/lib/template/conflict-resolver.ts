/**
 * Conflict resolution system for template application
 */

import {
  TemplateConflict,
  ConflictResolution,
  ReferenceTemplate,
  TemplateApplication,
  TemplateProcessingError
} from './types';
import { ExtractedContent, OrganizedTopic } from '../ai/types';
import { LayoutConfig } from '../layout/types';

export interface ConflictResolutionOptions {
  prioritizeContent: boolean;
  allowTemplateModification: boolean;
  maxPageIncrease: number;
  minTextSize: number;
  acceptableQualityThreshold: number;
}

export class ConflictResolver {
  private options: ConflictResolutionOptions;

  constructor(options: Partial<ConflictResolutionOptions> = {}) {
    this.options = {
      prioritizeContent: true,
      allowTemplateModification: true,
      maxPageIncrease: 3,
      minTextSize: 8,
      acceptableQualityThreshold: 0.7,
      ...options
    };
  }

  /**
   * Resolves conflicts between template and user content
   */
  async resolveConflicts(
    conflicts: TemplateConflict[],
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): Promise<{
    resolvedConflicts: TemplateConflict[];
    recommendedActions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
    qualityImpact: QualityImpact;
  }> {
    try {
      // Sort conflicts by severity and impact
      const sortedConflicts = this.prioritizeConflicts(conflicts);
      
      // Resolve each conflict
      const resolvedConflicts: TemplateConflict[] = [];
      const recommendedActions: RecommendedAction[] = [];
      let currentLayout = this.getBaseLayout(template);
      
      for (const conflict of sortedConflicts) {
        const resolution = await this.resolveConflict(
          conflict,
          template,
          userContent,
          userTopics,
          currentLayout
        );
        
        resolvedConflicts.push({
          ...conflict,
          resolution: resolution.resolution
        });
        
        recommendedActions.push(...resolution.actions);
        currentLayout = resolution.modifiedLayout;
      }
      
      // Assess overall quality impact
      const qualityImpact = this.assessQualityImpact(
        template,
        currentLayout,
        resolvedConflicts
      );
      
      return {
        resolvedConflicts,
        recommendedActions,
        modifiedLayout: currentLayout,
        qualityImpact
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Failed to resolve conflicts: ${error.message}`,
        {
          code: 'CONFLICT_RESOLUTION_FAILED',
          retryable: true,
          details: { conflictCount: conflicts.length, error }
        }
      );
    }
  }

  /**
   * Resolves a single conflict
   */
  private async resolveConflict(
    conflict: TemplateConflict,
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    currentLayout: LayoutConfig
  ): Promise<{
    resolution: ConflictResolution;
    actions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
  }> {
    switch (conflict.type) {
      case 'content-overflow':
        return this.resolveContentOverflow(conflict, template, userContent, currentLayout);
      
      case 'structure-incompatible':
        return this.resolveStructureIncompatibility(conflict, template, userContent, currentLayout);
      
      case 'style-mismatch':
        return this.resolveStyleMismatch(conflict, template, currentLayout);
      
      case 'format-unsupported':
        return this.resolveFormatUnsupported(conflict, template, userContent, currentLayout);
      
      default:
        return this.resolveGenericConflict(conflict, currentLayout);
    }
  }

  /**
   * Resolves content overflow conflicts
   */
  private async resolveContentOverflow(
    conflict: TemplateConflict,
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    currentLayout: LayoutConfig
  ): Promise<{
    resolution: ConflictResolution;
    actions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
  }> {
    const userWordCount = userContent.reduce((sum, content) => 
      sum + this.estimateWordCount(content.text), 0);
    const templateWordCount = template.analysis.metadata.wordCount;
    const overflowRatio = userWordCount / templateWordCount;
    
    let modifiedLayout = { ...currentLayout };
    const actions: RecommendedAction[] = [];
    
    if (this.options.prioritizeContent) {
      // Strategy: Adjust template to fit content
      
      // Increase page count if allowed
      const pageIncrease = Math.min(
        Math.ceil(overflowRatio) - 1,
        this.options.maxPageIncrease
      );
      
      if (pageIncrease > 0) {
        modifiedLayout.maxPages += pageIncrease;
        actions.push({
          type: 'increase-pages',
          description: `Increase page count by ${pageIncrease} to accommodate content`,
          impact: 'medium',
          automatic: true
        });
      }
      
      // Reduce text size if still needed
      const remainingOverflow = userWordCount / (templateWordCount * modifiedLayout.maxPages);
      if (remainingOverflow > 1.1) {
        const newTextSize = this.reduceTextSize(modifiedLayout.text.size);
        if (newTextSize !== modifiedLayout.text.size) {
          modifiedLayout.text.size = newTextSize;
          modifiedLayout.text.baseFontSize = Math.max(
            this.options.minTextSize,
            modifiedLayout.text.baseFontSize - 2
          );
          actions.push({
            type: 'reduce-text-size',
            description: 'Reduce text size to fit more content',
            impact: 'medium',
            automatic: true
          });
        }
      }
      
      // Adjust columns if beneficial
      if (modifiedLayout.page.columns === 1 && remainingOverflow > 1.2) {
        modifiedLayout.page.columns = 2;
        modifiedLayout.page.columnGap = 15;
        actions.push({
          type: 'increase-columns',
          description: 'Use two-column layout for better space utilization',
          impact: 'low',
          automatic: true
        });
      }
      
      return {
        resolution: {
          strategy: 'prioritize-content',
          description: 'Adjusted template layout to accommodate all user content',
          impact: `Page count increased by ${pageIncrease}, text size may be reduced`,
          alternatives: [
            'Reduce content by removing less important topics',
            'Use a different template designed for more content'
          ]
        },
        actions,
        modifiedLayout
      };
    } else {
      // Strategy: Reduce content to fit template
      const contentReductionNeeded = Math.round((1 - (1 / overflowRatio)) * 100);
      
      actions.push({
        type: 'reduce-content',
        description: `Remove approximately ${contentReductionNeeded}% of content to fit template`,
        impact: 'high',
        automatic: false
      });
      
      return {
        resolution: {
          strategy: 'hybrid',
          description: 'Content reduction required to maintain template fidelity',
          impact: `Approximately ${contentReductionNeeded}% of content will need to be removed`,
          alternatives: [
            'Allow template modification to fit all content',
            'Use a larger template format'
          ]
        },
        actions,
        modifiedLayout
      };
    }
  }

  /**
   * Resolves structure incompatibility conflicts
   */
  private async resolveStructureIncompatibility(
    conflict: TemplateConflict,
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    currentLayout: LayoutConfig
  ): Promise<{
    resolution: ConflictResolution;
    actions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
  }> {
    const modifiedLayout = { ...currentLayout };
    const actions: RecommendedAction[] = [];
    
    if (conflict.description.includes('heading levels')) {
      // Flatten heading hierarchy
      actions.push({
        type: 'flatten-hierarchy',
        description: 'Convert deep heading levels to emphasized text or lists',
        impact: 'medium',
        automatic: true
      });
      
      return {
        resolution: {
          strategy: 'adapt-template',
          description: 'Flatten content hierarchy to match template structure',
          impact: 'Some hierarchical information may be represented differently',
          alternatives: [
            'Modify template to support deeper hierarchy',
            'Restructure content to match template levels'
          ]
        },
        actions,
        modifiedLayout
      };
    }
    
    if (conflict.description.includes('topics')) {
      // Adjust spacing and organization for more topics
      modifiedLayout.page.margins.top = Math.max(10, modifiedLayout.page.margins.top - 5);
      modifiedLayout.page.margins.bottom = Math.max(10, modifiedLayout.page.margins.bottom - 5);
      
      actions.push({
        type: 'adjust-spacing',
        description: 'Reduce margins and spacing to accommodate more topics',
        impact: 'low',
        automatic: true
      });
      
      return {
        resolution: {
          strategy: 'adapt-template',
          description: 'Adjust layout spacing to fit more topics',
          impact: 'Slightly more compact layout with reduced spacing',
          alternatives: [
            'Merge related topics',
            'Use multi-page layout with fewer topics per page'
          ]
        },
        actions,
        modifiedLayout
      };
    }
    
    return this.resolveGenericConflict(conflict, modifiedLayout);
  }

  /**
   * Resolves style mismatch conflicts
   */
  private async resolveStyleMismatch(
    conflict: TemplateConflict,
    template: ReferenceTemplate,
    currentLayout: LayoutConfig
  ): Promise<{
    resolution: ConflictResolution;
    actions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
  }> {
    const modifiedLayout = { ...currentLayout };
    const actions: RecommendedAction[] = [];
    
    if (conflict.description.includes('fonts')) {
      // Use web-safe font alternatives
      modifiedLayout.text.fontFamily = this.getWebSafeFontAlternative(
        modifiedLayout.text.fontFamily
      );
      
      actions.push({
        type: 'substitute-fonts',
        description: 'Use web-safe font alternatives for better compatibility',
        impact: 'low',
        automatic: true
      });
    }
    
    return {
      resolution: {
        strategy: 'adapt-template',
        description: 'Use compatible alternatives for unsupported style elements',
        impact: 'Visual appearance may differ slightly from original template',
        alternatives: [
          'Include custom font files',
          'Accept font substitution',
          'Use a different template with compatible styling'
        ]
      },
      actions,
      modifiedLayout
    };
  }

  /**
   * Resolves format unsupported conflicts
   */
  private async resolveFormatUnsupported(
    conflict: TemplateConflict,
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    currentLayout: LayoutConfig
  ): Promise<{
    resolution: ConflictResolution;
    actions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
  }> {
    const modifiedLayout = { ...currentLayout };
    const actions: RecommendedAction[] = [];
    
    if (conflict.description.includes('tables')) {
      actions.push({
        type: 'convert-tables',
        description: 'Convert tables to formatted text lists',
        impact: 'medium',
        automatic: true
      });
      
      return {
        resolution: {
          strategy: 'prioritize-content',
          description: 'Convert unsupported table format to compatible text format',
          impact: 'Table structure simplified but content preserved',
          alternatives: [
            'Modify template to support tables',
            'Remove tables from content',
            'Use a different template with table support'
          ]
        },
        actions,
        modifiedLayout
      };
    }
    
    if (conflict.description.includes('images')) {
      actions.push({
        type: 'handle-images',
        description: 'Include essential images and convert others to descriptions',
        impact: 'medium',
        automatic: false
      });
      
      return {
        resolution: {
          strategy: 'hybrid',
          description: 'Selective image inclusion based on importance',
          impact: 'Some visual information may be converted to text descriptions',
          alternatives: [
            'Modify template layout to support more images',
            'Remove all images',
            'Use a template designed for visual content'
          ]
        },
        actions,
        modifiedLayout
      };
    }
    
    return this.resolveGenericConflict(conflict, modifiedLayout);
  }

  /**
   * Resolves generic conflicts
   */
  private resolveGenericConflict(
    conflict: TemplateConflict,
    currentLayout: LayoutConfig
  ): Promise<{
    resolution: ConflictResolution;
    actions: RecommendedAction[];
    modifiedLayout: LayoutConfig;
  }> {
    return Promise.resolve({
      resolution: {
        strategy: 'user-choice',
        description: 'Manual review required for this conflict',
        impact: 'Depends on user decision',
        alternatives: [
          'Accept current template with modifications',
          'Choose a different template',
          'Create custom layout'
        ]
      },
      actions: [{
        type: 'manual-review',
        description: 'Review conflict and choose resolution strategy',
        impact: 'varies',
        automatic: false
      }],
      modifiedLayout: currentLayout
    });
  }

  /**
   * Prioritizes conflicts by severity and impact
   */
  private prioritizeConflicts(conflicts: TemplateConflict[]): TemplateConflict[] {
    return conflicts.sort((a, b) => {
      // Sort by severity first
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      
      // Then by type priority
      const typeOrder = {
        'content-overflow': 4,
        'structure-incompatible': 3,
        'format-unsupported': 2,
        'style-mismatch': 1
      };
      
      return typeOrder[b.type] - typeOrder[a.type];
    });
  }

  /**
   * Gets base layout from template
   */
  private getBaseLayout(template: ReferenceTemplate): LayoutConfig {
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
   * Assesses overall quality impact of resolutions
   */
  private assessQualityImpact(
    template: ReferenceTemplate,
    modifiedLayout: LayoutConfig,
    resolvedConflicts: TemplateConflict[]
  ): QualityImpact {
    const originalLayout = this.getBaseLayout(template);
    
    // Calculate fidelity loss
    let fidelityLoss = 0;
    
    // Page count changes
    const pageCountChange = Math.abs(modifiedLayout.maxPages - originalLayout.maxPages) / originalLayout.maxPages;
    fidelityLoss += pageCountChange * 0.3;
    
    // Text size changes
    if (modifiedLayout.text.size !== originalLayout.text.size) {
      fidelityLoss += 0.2;
    }
    
    // Column changes
    if (modifiedLayout.page.columns !== originalLayout.page.columns) {
      fidelityLoss += 0.15;
    }
    
    // Font changes
    if (modifiedLayout.text.fontFamily !== originalLayout.text.fontFamily) {
      fidelityLoss += 0.1;
    }
    
    // Conflict severity impact
    const highSeverityConflicts = resolvedConflicts.filter(c => c.severity === 'high').length;
    const mediumSeverityConflicts = resolvedConflicts.filter(c => c.severity === 'medium').length;
    
    fidelityLoss += (highSeverityConflicts * 0.2) + (mediumSeverityConflicts * 0.1);
    
    const overallQuality = Math.max(0, 1 - fidelityLoss);
    
    return {
      overallQuality,
      fidelityLoss,
      contentPreservation: this.calculateContentPreservation(resolvedConflicts),
      stylePreservation: this.calculateStylePreservation(originalLayout, modifiedLayout),
      usabilityImpact: this.calculateUsabilityImpact(resolvedConflicts),
      recommendation: this.generateQualityRecommendation(overallQuality)
    };
  }

  // Helper methods
  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private reduceTextSize(size: 'small' | 'medium' | 'large'): 'small' | 'medium' | 'large' {
    switch (size) {
      case 'large': return 'medium';
      case 'medium': return 'small';
      case 'small': return 'small';
    }
  }

  private inferTextSize(fontSize: number): 'small' | 'medium' | 'large' {
    if (fontSize <= 10) return 'small';
    if (fontSize <= 14) return 'medium';
    return 'large';
  }

  private getWebSafeFontAlternative(fontFamily: string): string {
    const webSafeFonts = {
      'Arial': 'Arial, Helvetica, sans-serif',
      'Helvetica': 'Helvetica, Arial, sans-serif',
      'Times': 'Times, "Times New Roman", serif',
      'Georgia': 'Georgia, serif',
      'Verdana': 'Verdana, Geneva, sans-serif',
      'Courier': 'Courier, "Courier New", monospace'
    };
    
    // Find closest match or default to Arial
    for (const [font, alternative] of Object.entries(webSafeFonts)) {
      if (fontFamily.toLowerCase().includes(font.toLowerCase())) {
        return alternative;
      }
    }
    
    return 'Arial, Helvetica, sans-serif';
  }

  private calculateContentPreservation(resolvedConflicts: TemplateConflict[]): number {
    let preservation = 1.0;
    
    for (const conflict of resolvedConflicts) {
      if (conflict.resolution.strategy === 'prioritize-content') {
        // Content is preserved but template is modified
        preservation -= 0.05;
      } else if (conflict.resolution.strategy === 'hybrid') {
        // Some content may be lost
        preservation -= 0.15;
      } else if (conflict.type === 'content-overflow' && conflict.severity === 'high') {
        // Significant content reduction likely
        preservation -= 0.3;
      }
    }
    
    return Math.max(0, preservation);
  }

  private calculateStylePreservation(original: LayoutConfig, modified: LayoutConfig): number {
    let preservation = 1.0;
    
    if (original.page.paperSize !== modified.page.paperSize) preservation -= 0.1;
    if (original.page.orientation !== modified.page.orientation) preservation -= 0.1;
    if (original.page.columns !== modified.page.columns) preservation -= 0.15;
    if (original.text.size !== modified.text.size) preservation -= 0.1;
    if (original.text.fontFamily !== modified.text.fontFamily) preservation -= 0.05;
    
    const pageCountDiff = Math.abs(original.maxPages - modified.maxPages) / original.maxPages;
    preservation -= Math.min(0.3, pageCountDiff * 0.5);
    
    return Math.max(0, preservation);
  }

  private calculateUsabilityImpact(resolvedConflicts: TemplateConflict[]): 'low' | 'medium' | 'high' {
    const highImpactConflicts = resolvedConflicts.filter(c => 
      c.severity === 'high' || c.type === 'content-overflow'
    ).length;
    
    if (highImpactConflicts >= 2) return 'high';
    if (highImpactConflicts >= 1 || resolvedConflicts.length >= 3) return 'medium';
    return 'low';
  }

  private generateQualityRecommendation(quality: number): 'accept' | 'review' | 'reject' {
    if (quality >= this.options.acceptableQualityThreshold) return 'accept';
    if (quality >= 0.5) return 'review';
    return 'reject';
  }
}

export interface RecommendedAction {
  type: 'increase-pages' | 'reduce-text-size' | 'increase-columns' | 'reduce-content' | 
        'flatten-hierarchy' | 'adjust-spacing' | 'substitute-fonts' | 'convert-tables' | 
        'handle-images' | 'manual-review';
  description: string;
  impact: 'low' | 'medium' | 'high';
  automatic: boolean;
}

export interface QualityImpact {
  overallQuality: number; // 0-1 scale
  fidelityLoss: number; // 0-1 scale
  contentPreservation: number; // 0-1 scale
  stylePreservation: number; // 0-1 scale
  usabilityImpact: 'low' | 'medium' | 'high';
  recommendation: 'accept' | 'review' | 'reject';
}