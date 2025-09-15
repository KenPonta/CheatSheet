/**
 * Content Density Analyzer
 * Analyzes and matches content density patterns from reference templates
 */

import {
  ReferenceTemplate,
  TemplateAnalysis,
  ContentStructure,
  TopicDistribution
} from './types';
import { ExtractedContent, OrganizedTopic } from '../ai/types';

export interface ContentDensityAnalysis {
  wordsPerPage: number;
  topicsPerPage: number;
  averageTopicLength: number;
  contentDistribution: ContentDistribution;
  spacingPatterns: SpacingPatterns;
  hierarchyDensity: HierarchyDensity;
  visualDensity: VisualDensity;
}

export interface ContentDistribution {
  headerRatio: number; // Percentage of space for headers
  bodyRatio: number; // Percentage of space for body content
  whitespaceRatio: number; // Percentage of whitespace
  exampleRatio: number; // Percentage of space for examples/images
}

export interface SpacingPatterns {
  betweenTopics: number; // Pixels/points between topics
  betweenSections: number; // Pixels/points between sections
  paragraphSpacing: number; // Spacing between paragraphs
  lineHeight: number; // Line height multiplier
  marginRatios: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface HierarchyDensity {
  maxDepth: number;
  averageDepth: number;
  levelDistribution: Record<number, number>; // Level -> count
  indentationPattern: number[]; // Indentation per level
}

export interface VisualDensity {
  textCoverage: number; // Percentage of page covered by text
  imageCoverage: number; // Percentage covered by images
  tableCoverage: number; // Percentage covered by tables
  effectiveContentRatio: number; // Non-whitespace content ratio
}

export interface DensityMatchingStrategy {
  targetDensity: ContentDensityAnalysis;
  currentDensity: ContentDensityAnalysis;
  adjustmentPlan: DensityAdjustmentPlan;
  feasibilityScore: number; // 0-1 how feasible the matching is
}

export interface DensityAdjustmentPlan {
  topicAdjustments: TopicAdjustment[];
  layoutAdjustments: LayoutAdjustment[];
  contentAdjustments: ContentAdjustment[];
  estimatedFinalDensity: ContentDensityAnalysis;
}

export interface TopicAdjustment {
  topicId: string;
  action: 'remove' | 'add' | 'expand' | 'condense' | 'split' | 'merge';
  reason: string;
  densityImpact: number;
  priority: 'high' | 'medium' | 'low';
}

export interface LayoutAdjustment {
  element: 'margins' | 'spacing' | 'columns' | 'font-size' | 'line-height';
  currentValue: any;
  targetValue: any;
  densityImpact: number;
  visualImpact: 'minimal' | 'moderate' | 'significant';
}

export interface ContentAdjustment {
  type: 'add-examples' | 'remove-examples' | 'add-details' | 'remove-details' | 'restructure';
  description: string;
  affectedTopics: string[];
  densityImpact: number;
}

export class ContentDensityAnalyzer {
  /**
   * Analyzes content density from a reference template
   */
  analyzeReferenceDensity(template: ReferenceTemplate): ContentDensityAnalysis {
    const analysis = template.analysis;
    const content = template.extractedContent;

    return {
      wordsPerPage: this.calculateWordsPerPage(analysis, content),
      topicsPerPage: this.calculateTopicsPerPage(analysis),
      averageTopicLength: this.calculateAverageTopicLength(analysis, content),
      contentDistribution: this.analyzeContentDistribution(analysis, content),
      spacingPatterns: this.analyzeSpacingPatterns(analysis),
      hierarchyDensity: this.analyzeHierarchyDensity(analysis, content),
      visualDensity: this.analyzeVisualDensity(analysis, content)
    };
  }

  /**
   * Analyzes current user content density
   */
  analyzeUserContentDensity(
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[],
    estimatedPages: number = 1
  ): ContentDensityAnalysis {
    const totalWords = userContent.reduce((sum, content) => 
      sum + this.estimateWordCount(content.text), 0);
    
    const totalTopics = userTopics.length;
    const averageTopicLength = totalTopics > 0 ? totalWords / totalTopics : 0;

    return {
      wordsPerPage: totalWords / estimatedPages,
      topicsPerPage: totalTopics / estimatedPages,
      averageTopicLength,
      contentDistribution: this.analyzeUserContentDistribution(userContent, userTopics),
      spacingPatterns: this.estimateUserSpacingPatterns(userContent),
      hierarchyDensity: this.analyzeUserHierarchyDensity(userContent, userTopics),
      visualDensity: this.analyzeUserVisualDensity(userContent)
    };
  }

  /**
   * Creates a strategy to match user content density to reference
   */
  createDensityMatchingStrategy(
    referenceDensity: ContentDensityAnalysis,
    userDensity: ContentDensityAnalysis,
    userTopics: OrganizedTopic[]
  ): DensityMatchingStrategy {
    const adjustmentPlan = this.createAdjustmentPlan(referenceDensity, userDensity, userTopics);
    const feasibilityScore = this.calculateFeasibilityScore(referenceDensity, userDensity, adjustmentPlan);

    return {
      targetDensity: referenceDensity,
      currentDensity: userDensity,
      adjustmentPlan,
      feasibilityScore
    };
  }

  /**
   * Applies density adjustments to user topics
   */
  applyDensityAdjustments(
    userTopics: OrganizedTopic[],
    adjustmentPlan: DensityAdjustmentPlan
  ): OrganizedTopic[] {
    let adjustedTopics = [...userTopics];

    // Apply topic adjustments
    for (const adjustment of adjustmentPlan.topicAdjustments) {
      adjustedTopics = this.applyTopicAdjustment(adjustedTopics, adjustment);
    }

    // Sort by priority to ensure high-priority topics are preserved
    adjustedTopics.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });

    return adjustedTopics;
  }

  // Private helper methods

  private calculateWordsPerPage(analysis: TemplateAnalysis, content: ExtractedContent): number {
    const totalWords = this.estimateWordCount(content.text);
    const pageCount = analysis.metadata.pageCount || 1;
    return totalWords / pageCount;
  }

  private calculateTopicsPerPage(analysis: TemplateAnalysis): number {
    const topicCount = analysis.metadata.topicCount;
    const pageCount = analysis.metadata.pageCount || 1;
    return topicCount / pageCount;
  }

  private calculateAverageTopicLength(analysis: TemplateAnalysis, content: ExtractedContent): number {
    const totalWords = this.estimateWordCount(content.text);
    const topicCount = analysis.metadata.topicCount || 1;
    return totalWords / topicCount;
  }

  private analyzeContentDistribution(analysis: TemplateAnalysis, content: ExtractedContent): ContentDistribution {
    // Estimate distribution based on structure analysis
    const headings = content.structure.headings;
    const totalContent = content.text.length;
    
    // Rough estimation - in a real implementation, this would be more sophisticated
    const headerLength = headings.reduce((sum, h) => sum + h.text.length, 0);
    const headerRatio = headerLength / totalContent;
    
    return {
      headerRatio: Math.min(0.2, headerRatio * 2), // Headers typically 10-20%
      bodyRatio: 0.65, // Body content typically 60-70%
      whitespaceRatio: 0.25, // Whitespace typically 20-30%
      exampleRatio: content.images.length > 0 ? 0.1 : 0 // Examples if present
    };
  }

  private analyzeSpacingPatterns(analysis: TemplateAnalysis): SpacingPatterns {
    const layout = analysis.layout;
    
    return {
      betweenTopics: layout.spacing.sectionSpacing,
      betweenSections: layout.spacing.sectionSpacing * 1.5,
      paragraphSpacing: layout.spacing.paragraphSpacing,
      lineHeight: layout.spacing.lineHeight,
      marginRatios: {
        top: layout.margins.top / 100, // Normalize to ratio
        right: layout.margins.right / 100,
        bottom: layout.margins.bottom / 100,
        left: layout.margins.left / 100
      }
    };
  }

  private analyzeHierarchyDensity(analysis: TemplateAnalysis, content: ExtractedContent): HierarchyDensity {
    const headings = content.structure.headings;
    const maxDepth = analysis.organization?.hierarchy?.maxDepth || Math.max(...headings.map(h => h.level), 1);
    
    const levelDistribution: Record<number, number> = {};
    let totalDepth = 0;
    
    headings.forEach(heading => {
      levelDistribution[heading.level] = (levelDistribution[heading.level] || 0) + 1;
      totalDepth += heading.level;
    });
    
    const averageDepth = headings.length > 0 ? totalDepth / headings.length : 1;
    
    return {
      maxDepth,
      averageDepth,
      levelDistribution,
      indentationPattern: analysis.organization?.hierarchy?.indentationRules?.map(rule => rule.amount) || [0, 20, 40, 60]
    };
  }

  private analyzeVisualDensity(analysis: TemplateAnalysis, content: ExtractedContent): VisualDensity {
    // Estimate visual density based on content analysis
    const hasImages = content.images.length > 0;
    const hasTables = content.tables.length > 0;
    
    return {
      textCoverage: 0.7, // Typical text coverage
      imageCoverage: hasImages ? 0.15 : 0,
      tableCoverage: hasTables ? 0.1 : 0,
      effectiveContentRatio: 0.75 // Non-whitespace content
    };
  }

  private analyzeUserContentDistribution(
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): ContentDistribution {
    const totalText = userContent.reduce((sum, content) => sum + content.text.length, 0);
    const totalImages = userContent.reduce((sum, content) => sum + content.images.length, 0);
    const totalTables = userContent.reduce((sum, content) => sum + content.tables.length, 0);
    
    // Estimate header content from topics
    const headerLength = userTopics.reduce((sum, topic) => sum + topic.title.length, 0);
    const headerRatio = totalText > 0 ? headerLength / totalText : 0.1;
    
    return {
      headerRatio: Math.min(0.25, headerRatio * 3),
      bodyRatio: 0.7,
      whitespaceRatio: 0.2,
      exampleRatio: totalImages > 0 || totalTables > 0 ? 0.1 : 0
    };
  }

  private estimateUserSpacingPatterns(userContent: ExtractedContent[]): SpacingPatterns {
    // Default spacing patterns for user content
    return {
      betweenTopics: 24,
      betweenSections: 32,
      paragraphSpacing: 12,
      lineHeight: 1.4,
      marginRatios: {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2
      }
    };
  }

  private analyzeUserHierarchyDensity(
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): HierarchyDensity {
    const allHeadings = userContent.flatMap(content => content.structure.headings);
    const maxDepth = Math.max(...allHeadings.map(h => h.level), 1);
    
    const levelDistribution: Record<number, number> = {};
    let totalDepth = 0;
    
    allHeadings.forEach(heading => {
      levelDistribution[heading.level] = (levelDistribution[heading.level] || 0) + 1;
      totalDepth += heading.level;
    });
    
    // Add topic structure
    userTopics.forEach(topic => {
      levelDistribution[1] = (levelDistribution[1] || 0) + 1;
      topic.subtopics.forEach(() => {
        levelDistribution[2] = (levelDistribution[2] || 0) + 1;
      });
    });
    
    const totalHeadings = allHeadings.length + userTopics.length + 
      userTopics.reduce((sum, topic) => sum + topic.subtopics.length, 0);
    const averageDepth = totalHeadings > 0 ? totalDepth / totalHeadings : 1;
    
    return {
      maxDepth,
      averageDepth,
      levelDistribution,
      indentationPattern: [0, 20, 40, 60] // Default indentation pattern
    };
  }

  private analyzeUserVisualDensity(userContent: ExtractedContent[]): VisualDensity {
    const totalImages = userContent.reduce((sum, content) => sum + content.images.length, 0);
    const totalTables = userContent.reduce((sum, content) => sum + content.tables.length, 0);
    
    return {
      textCoverage: 0.75,
      imageCoverage: totalImages > 0 ? Math.min(0.2, totalImages * 0.05) : 0,
      tableCoverage: totalTables > 0 ? Math.min(0.15, totalTables * 0.05) : 0,
      effectiveContentRatio: 0.8
    };
  }

  private createAdjustmentPlan(
    referenceDensity: ContentDensityAnalysis,
    userDensity: ContentDensityAnalysis,
    userTopics: OrganizedTopic[]
  ): DensityAdjustmentPlan {
    const topicAdjustments: TopicAdjustment[] = [];
    const layoutAdjustments: LayoutAdjustment[] = [];
    const contentAdjustments: ContentAdjustment[] = [];

    // Calculate density differences
    const wordsDiff = userDensity.wordsPerPage - referenceDensity.wordsPerPage;
    const topicsDiff = userDensity.topicsPerPage - referenceDensity.topicsPerPage;

    // Topic adjustments
    if (wordsDiff > referenceDensity.wordsPerPage * 0.2) {
      // Too many words - need to reduce content
      const wordsToReduce = wordsDiff;
      const topicsToAdjust = this.selectTopicsForReduction(userTopics, wordsToReduce);
      
      topicsToAdjust.forEach(({ topic, action, impact }) => {
        topicAdjustments.push({
          topicId: topic.id,
          action,
          reason: `Reduce content to match reference density (${Math.round(wordsDiff)} excess words per page)`,
          densityImpact: -impact,
          priority: topic.priority === 'low' ? 'high' : topic.priority === 'medium' ? 'medium' : 'low'
        });
      });
    } else if (wordsDiff < -referenceDensity.wordsPerPage * 0.2) {
      // Too few words - can add more content
      const wordsToAdd = Math.abs(wordsDiff);
      
      contentAdjustments.push({
        type: 'add-details',
        description: `Add approximately ${Math.round(wordsToAdd)} words per page to match reference density`,
        affectedTopics: userTopics.filter(t => t.priority === 'high').map(t => t.id),
        densityImpact: wordsToAdd
      });
    }

    // Layout adjustments for fine-tuning
    if (Math.abs(wordsDiff) > 0 && Math.abs(wordsDiff) < referenceDensity.wordsPerPage * 0.3) {
      // Small adjustments can be made through layout changes
      if (userDensity.spacingPatterns.lineHeight !== referenceDensity.spacingPatterns.lineHeight) {
        layoutAdjustments.push({
          element: 'line-height',
          currentValue: userDensity.spacingPatterns.lineHeight,
          targetValue: referenceDensity.spacingPatterns.lineHeight,
          densityImpact: wordsDiff * 0.1,
          visualImpact: 'minimal'
        });
      }
    }

    // Estimate final density after adjustments
    const estimatedFinalDensity = this.estimateFinalDensity(
      userDensity,
      topicAdjustments,
      layoutAdjustments,
      contentAdjustments
    );

    return {
      topicAdjustments,
      layoutAdjustments,
      contentAdjustments,
      estimatedFinalDensity
    };
  }

  private selectTopicsForReduction(
    userTopics: OrganizedTopic[],
    targetReduction: number
  ): Array<{ topic: OrganizedTopic; action: TopicAdjustment['action']; impact: number }> {
    const selections: Array<{ topic: OrganizedTopic; action: TopicAdjustment['action']; impact: number }> = [];
    let remainingReduction = targetReduction;

    // Sort by priority (low priority first for removal)
    const sortedTopics = [...userTopics].sort((a, b) => {
      const priorityOrder = { low: 1, medium: 2, high: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

    for (const topic of sortedTopics) {
      if (remainingReduction <= 0) break;

      const topicWords = this.estimateWordCount(topic.content);
      
      if (topic.priority === 'low' && topicWords <= remainingReduction) {
        // Remove entire low-priority topic
        selections.push({
          topic,
          action: 'remove',
          impact: topicWords
        });
        remainingReduction -= topicWords;
      } else if (topicWords > 50 && remainingReduction > 0) {
        // Condense larger topics
        const reductionAmount = Math.min(remainingReduction, topicWords * 0.3);
        selections.push({
          topic,
          action: 'condense',
          impact: reductionAmount
        });
        remainingReduction -= reductionAmount;
      }
    }

    return selections;
  }

  private estimateFinalDensity(
    currentDensity: ContentDensityAnalysis,
    topicAdjustments: TopicAdjustment[],
    layoutAdjustments: LayoutAdjustment[],
    contentAdjustments: ContentAdjustment[]
  ): ContentDensityAnalysis {
    let adjustedWordsPerPage = currentDensity.wordsPerPage;
    let adjustedTopicsPerPage = currentDensity.topicsPerPage;

    // Apply topic adjustments
    topicAdjustments.forEach(adj => {
      adjustedWordsPerPage += adj.densityImpact;
      if (adj.action === 'remove') {
        adjustedTopicsPerPage -= 1;
      } else if (adj.action === 'add') {
        adjustedTopicsPerPage += 1;
      }
    });

    // Apply content adjustments
    contentAdjustments.forEach(adj => {
      adjustedWordsPerPage += adj.densityImpact;
    });

    // Apply layout adjustments
    layoutAdjustments.forEach(adj => {
      adjustedWordsPerPage += adj.densityImpact;
    });

    return {
      ...currentDensity,
      wordsPerPage: Math.max(0, adjustedWordsPerPage),
      topicsPerPage: Math.max(0, adjustedTopicsPerPage),
      averageTopicLength: adjustedTopicsPerPage > 0 ? adjustedWordsPerPage / adjustedTopicsPerPage : 0
    };
  }

  private calculateFeasibilityScore(
    referenceDensity: ContentDensityAnalysis,
    userDensity: ContentDensityAnalysis,
    adjustmentPlan: DensityAdjustmentPlan
  ): number {
    let score = 1.0;

    // Penalize for large content reductions
    const removedTopics = adjustmentPlan.topicAdjustments.filter(adj => adj.action === 'remove');
    if (removedTopics.length > 0) {
      score -= Math.min(0.4, removedTopics.length * 0.1);
    }

    // Penalize for significant layout changes
    const significantLayoutChanges = adjustmentPlan.layoutAdjustments.filter(adj => adj.visualImpact === 'significant');
    if (significantLayoutChanges.length > 0) {
      score -= Math.min(0.3, significantLayoutChanges.length * 0.1);
    }

    // Penalize for large density differences
    const densityDifference = Math.abs(userDensity.wordsPerPage - referenceDensity.wordsPerPage) / referenceDensity.wordsPerPage;
    if (densityDifference > 0.5) {
      score -= Math.min(0.3, (densityDifference - 0.5) * 0.6);
    }

    return Math.max(0, score);
  }

  private applyTopicAdjustment(
    topics: OrganizedTopic[],
    adjustment: TopicAdjustment
  ): OrganizedTopic[] {
    switch (adjustment.action) {
      case 'remove':
        return topics.filter(topic => topic.id !== adjustment.topicId);
      
      case 'condense':
        return topics.map(topic => {
          if (topic.id === adjustment.topicId) {
            const currentWords = this.estimateWordCount(topic.content);
            const targetWords = currentWords - Math.abs(adjustment.densityImpact);
            const condensedContent = this.condenseContent(topic.content, targetWords);
            return { ...topic, content: condensedContent };
          }
          return topic;
        });
      
      case 'expand':
        return topics.map(topic => {
          if (topic.id === adjustment.topicId) {
            // Enable more subtopics or suggest expansion
            return {
              ...topic,
              subtopics: topic.subtopics.map(st => ({ ...st, isSelected: true }))
            };
          }
          return topic;
        });
      
      default:
        return topics;
    }
  }

  private condenseContent(content: string, targetWords: number): string {
    const words = content.split(/\s+/);
    if (words.length <= targetWords) return content;
    
    // Keep the most important sentences (first and last parts)
    const keepRatio = targetWords / words.length;
    const keepCount = Math.floor(words.length * keepRatio);
    
    const firstHalf = Math.ceil(keepCount * 0.7);
    const secondHalf = keepCount - firstHalf;
    
    const condensed = [
      ...words.slice(0, firstHalf),
      ...words.slice(-secondHalf)
    ];
    
    return condensed.join(' ');
  }

  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}