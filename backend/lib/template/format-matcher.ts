/**
 * Reference Format Matching System
 * Adapts user content to match reference template styles and patterns
 */

import {
  ReferenceTemplate,
  TemplateApplication,
  TemplateAnalysis,
  LayoutPattern,
  TypographyPattern,
  VisualPattern,
  OrganizationPattern,
  ContentStructure,
  TemplateProcessingError
} from './types';
import { ExtractedContent, OrganizedTopic } from '../ai/types';
import { LayoutConfig } from '../layout/types';
import { TemplateAnalyzer } from './analyzer';
import { TemplateApplicator } from './applicator';
import { CSSGenerator } from './css-generator';

export interface FormatMatchingOptions {
  preserveContentFidelity: boolean;
  allowLayoutModifications: boolean;
  matchContentDensity: boolean;
  adaptTypography: boolean;
  maintainVisualHierarchy: boolean;
}

export interface FormatMatchingResult {
  matchedTemplate: ReferenceTemplate;
  adaptedContent: AdaptedContent;
  generatedCSS: GeneratedFormatCSS;
  contentDensityMatch: ContentDensityMatch;
  layoutAdaptation: LayoutAdaptation;
  matchingScore: number; // 0-1 scale
  warnings: FormatMatchingWarning[];
}

export interface AdaptedContent {
  topics: OrganizedTopic[];
  structure: ContentStructure;
  adjustedForDensity: boolean;
  topicSelectionChanges: TopicSelectionChange[];
}

export interface GeneratedFormatCSS {
  css: string;
  variables: Record<string, string>;
  classes: string[];
  mediaQueries: string[];
  printStyles: string;
  matchFidelity: number; // How closely CSS matches reference
}

export interface ContentDensityMatch {
  referenceWordsPerPage: number;
  userWordsPerPage: number;
  densityRatio: number;
  adjustmentsMade: DensityAdjustment[];
  finalDensity: number;
}

export interface DensityAdjustment {
  type: 'topic-selection' | 'content-expansion' | 'content-reduction' | 'layout-change';
  description: string;
  impact: number; // words affected
  reason: string;
}

export interface LayoutAdaptation {
  originalLayout: LayoutConfig;
  adaptedLayout: LayoutConfig;
  preservedElements: string[];
  modifiedElements: LayoutModification[];
  structuralFidelity: number; // How well structure is preserved
}

export interface LayoutModification {
  element: string;
  originalValue: any;
  adaptedValue: any;
  reason: string;
  impact: 'minor' | 'moderate' | 'major';
}

export interface TopicSelectionChange {
  topicId: string;
  action: 'added' | 'removed' | 'modified' | 'reordered';
  reason: string;
  densityImpact: number;
}

export interface FormatMatchingWarning {
  type: 'density-mismatch' | 'structure-change' | 'content-loss' | 'style-deviation';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedElements: string[];
  suggestion?: string;
}

export class ReferenceFormatMatcher {
  private analyzer: TemplateAnalyzer;
  private applicator: TemplateApplicator;
  private cssGenerator: CSSGenerator;

  constructor() {
    this.analyzer = new TemplateAnalyzer();
    this.applicator = new TemplateApplicator();
    this.cssGenerator = new CSSGenerator();
  }

  /**
   * Matches user content to reference format with comprehensive adaptation
   */
  async matchFormat(
    referenceFile: File,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    options: Partial<FormatMatchingOptions> = {}
  ): Promise<FormatMatchingResult> {
    try {
      const opts: FormatMatchingOptions = {
        preserveContentFidelity: true,
        allowLayoutModifications: true,
        matchContentDensity: true,
        adaptTypography: true,
        maintainVisualHierarchy: true,
        ...options
      };

      // Validate inputs
      if (!referenceFile) {
        throw new Error('Reference file is required');
      }
      if (!userContent) {
        userContent = [];
      }
      if (!userTopics) {
        userTopics = [];
      }

      // Analyze reference template
      const referenceTemplate = await this.analyzer.analyzeTemplate(referenceFile);
      
      if (!referenceTemplate || !referenceTemplate.analysis) {
        throw new Error('Failed to analyze reference template');
      }

      // Perform content density matching
      const contentDensityMatch = await this.matchContentDensity(
        referenceTemplate,
        userContent,
        userTopics,
        opts
      );

      // Adapt content based on density requirements
      const adaptedContent = await this.adaptContentForDensity(
        userTopics,
        contentDensityMatch,
        opts
      );

      // Perform layout adaptation
      const layoutAdaptation = await this.adaptLayout(
        referenceTemplate,
        userContent,
        adaptedContent.topics,
        opts
      );

      // Generate CSS matching reference format
      const generatedCSS = await this.generateMatchingCSS(
        referenceTemplate,
        layoutAdaptation.adaptedLayout,
        opts
      );

      // Calculate overall matching score
      const matchingScore = this.calculateMatchingScore(
        referenceTemplate,
        contentDensityMatch,
        layoutAdaptation,
        generatedCSS
      );

      // Generate warnings
      const warnings = this.generateWarnings(
        referenceTemplate,
        contentDensityMatch,
        layoutAdaptation,
        adaptedContent,
        opts
      );

      return {
        matchedTemplate: referenceTemplate,
        adaptedContent,
        generatedCSS,
        contentDensityMatch,
        layoutAdaptation,
        matchingScore,
        warnings
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Format matching failed: ${error.message}`,
        {
          code: 'APPLICATION_FAILED',
          retryable: true,
          details: { error }
        }
      );
    }
  }

  /**
   * Matches content density to reference patterns
   */
  private async matchContentDensity(
    referenceTemplate: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    options: FormatMatchingOptions
  ): Promise<ContentDensityMatch> {
    const referenceAnalysis = referenceTemplate.analysis;
    const referenceWordsPerPage = referenceAnalysis.organization.structure.contentDensity;
    
    // Calculate user content density
    const userWordCount = userContent.reduce((sum, content) => 
      sum + this.estimateWordCount(content.text), 0);
    const estimatedPages = Math.max(1, Math.ceil(userWordCount / referenceWordsPerPage));
    const userWordsPerPage = userWordCount / estimatedPages;
    
    const densityRatio = userWordsPerPage / referenceWordsPerPage;
    
    const adjustmentsMade: DensityAdjustment[] = [];
    let finalDensity = userWordsPerPage;

    if (options.matchContentDensity) {
      if (densityRatio > 1.2) {
        // Too dense - need to reduce content or increase pages
        const excessWords = userWordCount - (referenceWordsPerPage * estimatedPages);
        adjustmentsMade.push({
          type: 'content-reduction',
          description: `Reduce content by approximately ${excessWords} words to match reference density`,
          impact: excessWords,
          reason: 'Content density exceeds reference pattern by 20%'
        });
        finalDensity = referenceWordsPerPage;
      } else if (densityRatio < 0.8) {
        // Too sparse - can add more content or reduce pages
        const missingWords = (referenceWordsPerPage * estimatedPages) - userWordCount;
        adjustmentsMade.push({
          type: 'content-expansion',
          description: `Can add approximately ${missingWords} more words to match reference density`,
          impact: missingWords,
          reason: 'Content density is below reference pattern by 20%'
        });
        finalDensity = referenceWordsPerPage;
      }
    }

    return {
      referenceWordsPerPage,
      userWordsPerPage,
      densityRatio,
      adjustmentsMade,
      finalDensity
    };
  }

  /**
   * Adapts content based on density requirements
   */
  private async adaptContentForDensity(
    userTopics: OrganizedTopic[],
    densityMatch: ContentDensityMatch,
    options: FormatMatchingOptions
  ): Promise<AdaptedContent> {
    let adaptedTopics = [...userTopics];
    const topicSelectionChanges: TopicSelectionChange[] = [];
    let adjustedForDensity = false;

    if (options.matchContentDensity && densityMatch.adjustmentsMade.length > 0) {
      for (const adjustment of densityMatch.adjustmentsMade) {
        if (adjustment.type === 'content-reduction') {
          // Remove or trim lower priority topics
          const { topics, changes } = this.reduceContentForDensity(
            adaptedTopics,
            adjustment.impact
          );
          adaptedTopics = topics;
          topicSelectionChanges.push(...changes);
          adjustedForDensity = true;
        } else if (adjustment.type === 'content-expansion') {
          // Expand existing topics or suggest additional content
          const { topics, changes } = this.expandContentForDensity(
            adaptedTopics,
            adjustment.impact
          );
          adaptedTopics = topics;
          topicSelectionChanges.push(...changes);
          adjustedForDensity = true;
        }
      }
    }

    // Create adapted content structure
    const structure: ContentStructure = {
      sections: adaptedTopics.map((topic, index) => ({
        type: index === 0 ? 'header' : 'main',
        position: {
          width: 100,
          height: this.estimateTopicHeight(topic),
          unit: 'px'
        },
        contentTypes: ['text'],
        priority: topic.priority === 'high' ? 1 : topic.priority === 'medium' ? 2 : 3
      })),
      topicDistribution: {
        averageTopicsPerPage: Math.ceil(adaptedTopics.length / Math.max(1, Math.ceil(adaptedTopics.length / 4))),
        topicLengthVariation: 'varied',
        topicSeparation: 'spacing'
      },
      contentDensity: densityMatch.finalDensity
    };

    return {
      topics: adaptedTopics,
      structure,
      adjustedForDensity,
      topicSelectionChanges
    };
  }

  /**
   * Adapts layout to match reference while accommodating user content
   */
  private async adaptLayout(
    referenceTemplate: ReferenceTemplate,
    userContent: ExtractedContent[],
    adaptedTopics: OrganizedTopic[],
    options: FormatMatchingOptions
  ): Promise<LayoutAdaptation> {
    const referenceLayout = referenceTemplate.analysis.layout;
    
    // Start with reference layout as base
    const originalLayout: LayoutConfig = {
      page: referenceLayout.pageConfig,
      text: {
        size: this.inferTextSize(referenceTemplate.analysis.typography.bodyTextStyle.fontSize),
        lineHeight: referenceTemplate.analysis.typography.bodyTextStyle.lineHeight,
        fontFamily: referenceTemplate.analysis.typography.bodyTextStyle.fontFamily,
        baseFontSize: referenceTemplate.analysis.typography.bodyTextStyle.fontSize
      },
      maxPages: referenceTemplate.analysis.metadata.pageCount
    };

    let adaptedLayout = { ...originalLayout };
    const modifiedElements: LayoutModification[] = [];
    const preservedElements: string[] = [];

    if (options.allowLayoutModifications) {
      // Calculate content requirements
      const totalWords = adaptedTopics.reduce((sum, topic) => 
        sum + this.estimateWordCount(topic.content), 0);
      const requiredPages = Math.ceil(totalWords / referenceTemplate.analysis.organization.structure.contentDensity);

      // Adjust page count if necessary
      if (requiredPages > originalLayout.maxPages) {
        modifiedElements.push({
          element: 'maxPages',
          originalValue: originalLayout.maxPages,
          adaptedValue: requiredPages,
          reason: 'Increased to accommodate user content volume',
          impact: 'moderate'
        });
        adaptedLayout.maxPages = requiredPages;
      } else {
        preservedElements.push('maxPages');
      }

      // Adjust text size if content is too dense
      const contentDensityRatio = totalWords / (referenceTemplate.analysis.metadata.wordCount || 1);
      if (contentDensityRatio > 1.3) {
        const newTextSize = this.reduceTextSize(adaptedLayout.text.size);
        if (newTextSize !== adaptedLayout.text.size) {
          modifiedElements.push({
            element: 'text.size',
            originalValue: adaptedLayout.text.size,
            adaptedValue: newTextSize,
            reason: 'Reduced to fit more content while maintaining readability',
            impact: 'minor'
          });
          adaptedLayout.text.size = newTextSize;
          adaptedLayout.text.baseFontSize = this.textSizeToPixels(newTextSize);
        }
      } else {
        preservedElements.push('text.size');
      }

      // Adjust columns if beneficial for content distribution
      if (referenceLayout.columnStructure.count === 1 && totalWords > 800) {
        modifiedElements.push({
          element: 'page.columns',
          originalValue: 1,
          adaptedValue: 2,
          reason: 'Added second column to improve content distribution',
          impact: 'moderate'
        });
        adaptedLayout.page.columns = 2;
        adaptedLayout.page.columnGap = 20;
      } else {
        preservedElements.push('page.columns');
      }
    } else {
      // Preserve all layout elements
      preservedElements.push('maxPages', 'text.size', 'page.columns', 'page.margins');
    }

    // Calculate structural fidelity
    const totalElements = preservedElements.length + modifiedElements.length;
    const structuralFidelity = totalElements > 0 ? preservedElements.length / totalElements : 1;

    return {
      originalLayout,
      adaptedLayout,
      preservedElements,
      modifiedElements,
      structuralFidelity
    };
  }

  /**
   * Generates CSS that matches reference format
   */
  private async generateMatchingCSS(
    referenceTemplate: ReferenceTemplate,
    adaptedLayout: LayoutConfig,
    options: FormatMatchingOptions
  ): Promise<GeneratedFormatCSS> {
    // Generate base CSS from reference template
    const baseCSS = this.cssGenerator.generateCSS(referenceTemplate);
    
    // Adapt CSS for the modified layout
    const adaptedCSS = this.adaptCSSForLayout(baseCSS.css, adaptedLayout, referenceTemplate.analysis);
    
    // Calculate match fidelity
    const matchFidelity = this.calculateCSSMatchFidelity(
      referenceTemplate.analysis,
      adaptedLayout,
      options
    );

    return {
      css: adaptedCSS,
      variables: baseCSS.variables.colors,
      classes: baseCSS.classes.layout.concat(baseCSS.classes.typography, baseCSS.classes.components),
      mediaQueries: baseCSS.mediaQueries.map(mq => mq.condition),
      printStyles: baseCSS.printStyles,
      matchFidelity
    };
  }

  /**
   * Adapts CSS for modified layout while preserving reference styling
   */
  private adaptCSSForLayout(
    baseCSS: string,
    adaptedLayout: LayoutConfig,
    referenceAnalysis: TemplateAnalysis
  ): string {
    let adaptedCSS = baseCSS;

    // Update page configuration
    adaptedCSS = adaptedCSS.replace(
      /--container-max-width:\s*[^;]+;/,
      `--container-max-width: ${this.getPageWidth(adaptedLayout.page.paperSize)};`
    );

    // Update column configuration
    if (adaptedLayout.page.columns > 1) {
      const columnWidth = `${100 / adaptedLayout.page.columns}%`;
      adaptedCSS = adaptedCSS.replace(
        /grid-template-columns:\s*[^;]+;/,
        `grid-template-columns: repeat(${adaptedLayout.page.columns}, ${columnWidth});`
      );
    }

    // Update font size
    adaptedCSS = adaptedCSS.replace(
      /--font-size-base:\s*[^;]+;/,
      `--font-size-base: ${adaptedLayout.text.baseFontSize}px;`
    );

    // Add responsive adjustments for modified layouts
    if (adaptedLayout.maxPages > referenceAnalysis.metadata.pageCount) {
      adaptedCSS += `
        /* Adaptations for increased page count */
        .topic {
          margin-bottom: calc(var(--spacing-section) * 0.8);
        }
        
        .subtopic {
          margin-bottom: calc(var(--spacing-md) * 0.8);
        }
      `;
    }

    return adaptedCSS;
  }

  /**
   * Reduces content to match density requirements
   */
  private reduceContentForDensity(
    topics: OrganizedTopic[],
    targetReduction: number
  ): { topics: OrganizedTopic[]; changes: TopicSelectionChange[] } {
    const sortedTopics = [...topics].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

    const changes: TopicSelectionChange[] = [];
    let wordsReduced = 0;
    const reducedTopics: OrganizedTopic[] = [];

    for (const topic of sortedTopics) {
      const topicWords = this.estimateWordCount(topic.content);
      
      if (wordsReduced < targetReduction && topic.priority === 'low') {
        // Remove low priority topics first
        changes.push({
          topicId: topic.id,
          action: 'removed',
          reason: 'Removed to match reference content density',
          densityImpact: -topicWords
        });
        wordsReduced += topicWords;
      } else if (wordsReduced < targetReduction && topicWords > 100) {
        // Trim longer topics
        const reductionNeeded = Math.min(targetReduction - wordsReduced, topicWords * 0.3);
        const trimmedContent = this.trimContent(topic.content, reductionNeeded);
        
        reducedTopics.push({
          ...topic,
          content: trimmedContent
        });
        
        changes.push({
          topicId: topic.id,
          action: 'modified',
          reason: 'Content trimmed to match reference density',
          densityImpact: -reductionNeeded
        });
        wordsReduced += reductionNeeded;
      } else {
        reducedTopics.push(topic);
      }
    }

    return { topics: reducedTopics, changes };
  }

  /**
   * Expands content to match density requirements
   */
  private expandContentForDensity(
    topics: OrganizedTopic[],
    targetExpansion: number
  ): { topics: OrganizedTopic[]; changes: TopicSelectionChange[] } {
    const changes: TopicSelectionChange[] = [];
    let wordsAdded = 0;
    const expandedTopics: OrganizedTopic[] = [];

    for (const topic of topics) {
      if (wordsAdded < targetExpansion && topic.subtopics.length > 0) {
        // Expand subtopics that weren't originally selected
        const unselectedSubtopics = topic.subtopics.filter(st => !st.isSelected);
        
        for (const subtopic of unselectedSubtopics) {
          if (wordsAdded < targetExpansion) {
            const subtopicWords = this.estimateWordCount(subtopic.content);
            
            expandedTopics.push({
              ...topic,
              subtopics: topic.subtopics.map(st => 
                st.id === subtopic.id ? { ...st, isSelected: true } : st
              )
            });
            
            changes.push({
              topicId: topic.id,
              action: 'modified',
              reason: 'Added subtopic to better utilize available space',
              densityImpact: subtopicWords
            });
            wordsAdded += subtopicWords;
            break;
          }
        }
      } else {
        expandedTopics.push(topic);
      }
    }

    return { topics: expandedTopics, changes };
  }

  // Helper methods
  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private estimateTopicHeight(topic: OrganizedTopic): number {
    const baseHeight = 40; // Title height
    const contentHeight = Math.ceil(this.estimateWordCount(topic.content) / 10) * 20; // ~10 words per line
    const subtopicHeight = topic.subtopics.length * 30;
    return baseHeight + contentHeight + subtopicHeight;
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

  private textSizeToPixels(size: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small': return 10;
      case 'medium': return 12;
      case 'large': return 14;
    }
  }

  private getPageWidth(paperSize: string): string {
    switch (paperSize) {
      case 'a4': return '210mm';
      case 'letter': return '8.5in';
      case 'legal': return '8.5in';
      case 'a3': return '297mm';
      default: return '210mm';
    }
  }

  private trimContent(content: string, targetReduction: number): string {
    const words = content.split(/\s+/);
    const wordsToRemove = Math.ceil(targetReduction);
    const trimmedWords = words.slice(0, Math.max(10, words.length - wordsToRemove));
    return trimmedWords.join(' ');
  }

  private calculateMatchingScore(
    referenceTemplate: ReferenceTemplate,
    densityMatch: ContentDensityMatch,
    layoutAdaptation: LayoutAdaptation,
    generatedCSS: GeneratedFormatCSS
  ): number {
    const densityScore = Math.max(0, 1 - Math.abs(densityMatch.densityRatio - 1));
    const layoutScore = layoutAdaptation.structuralFidelity;
    const cssScore = generatedCSS.matchFidelity;
    
    return (densityScore * 0.4) + (layoutScore * 0.3) + (cssScore * 0.3);
  }

  private calculateCSSMatchFidelity(
    referenceAnalysis: TemplateAnalysis,
    adaptedLayout: LayoutConfig,
    options: FormatMatchingOptions
  ): number {
    let fidelity = 1.0;
    
    // Penalize for typography changes
    if (adaptedLayout.text.baseFontSize !== referenceAnalysis.typography.bodyTextStyle.fontSize) {
      fidelity -= 0.1;
    }
    
    // Penalize for layout changes
    if (adaptedLayout.maxPages !== referenceAnalysis.metadata.pageCount) {
      fidelity -= 0.15;
    }
    
    if (adaptedLayout.page.columns !== referenceAnalysis.layout.columnStructure.count) {
      fidelity -= 0.1;
    }
    
    return Math.max(0, fidelity);
  }

  private generateWarnings(
    referenceTemplate: ReferenceTemplate,
    densityMatch: ContentDensityMatch,
    layoutAdaptation: LayoutAdaptation,
    adaptedContent: AdaptedContent,
    options: FormatMatchingOptions
  ): FormatMatchingWarning[] {
    const warnings: FormatMatchingWarning[] = [];

    // Density mismatch warnings
    if (Math.abs(densityMatch.densityRatio - 1) > 0.3) {
      warnings.push({
        type: 'density-mismatch',
        severity: Math.abs(densityMatch.densityRatio - 1) > 0.5 ? 'high' : 'medium',
        message: `Content density differs significantly from reference (${Math.round(densityMatch.densityRatio * 100)}% of reference)`,
        affectedElements: ['content-distribution'],
        suggestion: densityMatch.densityRatio > 1 ? 'Consider reducing content or increasing page count' : 'Consider adding more content or reducing page count'
      });
    }

    // Structure change warnings
    if (layoutAdaptation.structuralFidelity < 0.8) {
      warnings.push({
        type: 'structure-change',
        severity: layoutAdaptation.structuralFidelity < 0.6 ? 'high' : 'medium',
        message: `Layout structure has been significantly modified (${Math.round(layoutAdaptation.structuralFidelity * 100)}% fidelity)`,
        affectedElements: layoutAdaptation.modifiedElements.map(mod => mod.element),
        suggestion: 'Review layout changes to ensure they meet your requirements'
      });
    }

    // Content loss warnings
    const removedTopics = adaptedContent.topicSelectionChanges.filter(change => change.action === 'removed');
    if (removedTopics.length > 0) {
      warnings.push({
        type: 'content-loss',
        severity: removedTopics.length > 2 ? 'high' : 'medium',
        message: `${removedTopics.length} topics were removed to match reference density`,
        affectedElements: removedTopics.map(change => change.topicId),
        suggestion: 'Consider increasing page count or using a different reference template'
      });
    }

    return warnings;
  }
}