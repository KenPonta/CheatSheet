import { ContentBlock, OverflowSuggestion } from './types';
import { OrganizedTopic, SubTopic } from '../ai/types';

/**
 * Content prioritization system based on user topic selections and content importance
 */
export interface ContentPriority {
  topicId: string;
  priority: number; // 1-10 scale (10 = highest priority)
  userSelected: boolean;
  contentLength: number;
  educationalValue: 'high' | 'medium' | 'low';
  dependencies: string[]; // Other topics this depends on
}

export interface PrioritizationConfig {
  userSelectedTopics: string[];
  maxContentReduction: number; // Percentage (0-100)
  preserveHighValueContent: boolean;
  maintainTopicBalance: boolean;
}

export interface ContentReductionPlan {
  removableBlocks: string[];
  compressibleBlocks: Array<{
    blockId: string;
    originalLength: number;
    targetLength: number;
    compressionRatio: number;
  }>;
  estimatedSpaceSaved: number;
  impactAssessment: {
    topicsAffected: string[];
    educationalValueLoss: 'minimal' | 'moderate' | 'significant';
    contentCoherence: 'maintained' | 'reduced' | 'compromised';
  };
}

export class ContentPrioritizer {
  private config: PrioritizationConfig;
  private topicPriorities: Map<string, ContentPriority>;

  constructor(config: PrioritizationConfig) {
    this.config = config;
    this.topicPriorities = new Map();
  }

  /**
   * Analyze and prioritize content based on user selections and topic importance
   */
  analyzePriorities(
    topics: OrganizedTopic[],
    contentBlocks: ContentBlock[]
  ): ContentPriority[] {
    const priorities: ContentPriority[] = [];

    topics.forEach(topic => {
      const priority = this.calculateTopicPriority(topic, contentBlocks);
      priorities.push(priority);
      this.topicPriorities.set(topic.id, priority);
    });

    return this.sortPrioritiesByImportance(priorities);
  }

  /**
   * Calculate priority score for a topic based on multiple factors
   */
  private calculateTopicPriority(
    topic: OrganizedTopic,
    contentBlocks: ContentBlock[]
  ): ContentPriority {
    let priority = 5; // Base priority

    // User selection is the primary factor
    const userSelected = this.config.userSelectedTopics.includes(topic.id);
    if (userSelected) {
      priority += 4; // Significant boost for user-selected topics
    }

    // Content confidence affects priority
    priority += Math.round(topic.confidence * 2); // 0-2 points based on confidence

    // Educational value assessment
    const educationalValue = this.assessEducationalValue(topic);
    switch (educationalValue) {
      case 'high':
        priority += 2;
        break;
      case 'medium':
        priority += 1;
        break;
      case 'low':
        priority -= 1;
        break;
    }

    // Content length consideration (longer content gets slight penalty if not selected)
    const contentLength = topic.content.length + 
      topic.subtopics.reduce((sum, sub) => sum + sub.content.length, 0);
    
    if (!userSelected && contentLength > 1000) {
      priority -= 1; // Penalty for long unselected content
    }

    // Dependencies boost priority if dependent topics are selected
    const dependencies = this.findTopicDependencies(topic, contentBlocks);
    const selectedDependencies = dependencies.filter(dep => 
      this.config.userSelectedTopics.includes(dep)
    );
    priority += selectedDependencies.length * 0.5;

    // Ensure priority stays within bounds
    priority = Math.max(1, Math.min(10, Math.round(priority)));

    return {
      topicId: topic.id,
      priority,
      userSelected,
      contentLength,
      educationalValue,
      dependencies,
    };
  }

  /**
   * Assess educational value of a topic based on content analysis
   */
  private assessEducationalValue(topic: OrganizedTopic): 'high' | 'medium' | 'low' {
    const content = topic.content.toLowerCase();
    const hasExamples = topic.examples.length > 0;
    const hasSubtopics = topic.subtopics.length > 0;
    
    // High value indicators
    const highValueKeywords = [
      'example', 'formula', 'equation', 'theorem', 'principle',
      'definition', 'concept', 'method', 'algorithm', 'process'
    ];
    
    // Medium value indicators
    const mediumValueKeywords = [
      'note', 'tip', 'remember', 'important', 'key', 'summary'
    ];

    const highValueCount = highValueKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;
    
    const mediumValueCount = mediumValueKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;

    if (hasExamples && (highValueCount >= 2 || hasSubtopics)) {
      return 'high';
    } else if (highValueCount >= 1 || mediumValueCount >= 2 || hasSubtopics) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Find dependencies between topics based on content references
   */
  private findTopicDependencies(
    topic: OrganizedTopic,
    contentBlocks: ContentBlock[]
  ): string[] {
    const dependencies: string[] = [];
    const topicContent = topic.content.toLowerCase();
    
    // Look for references to other topics in the content
    contentBlocks.forEach(block => {
      if (block.id !== topic.id) {
        // Simple heuristic: if topic content mentions another block's content
        const blockWords = block.content.toLowerCase().split(/\s+/).slice(0, 5);
        const hasReference = blockWords.some(word => 
          word.length > 3 && topicContent.includes(word)
        );
        
        if (hasReference) {
          dependencies.push(block.id);
        }
      }
    });

    return dependencies;
  }

  /**
   * Sort priorities by importance (highest first)
   */
  private sortPrioritiesByImportance(priorities: ContentPriority[]): ContentPriority[] {
    return priorities.sort((a, b) => {
      // Primary sort: user selected topics first
      if (a.userSelected !== b.userSelected) {
        return a.userSelected ? -1 : 1;
      }
      
      // Secondary sort: by priority score
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Tertiary sort: by educational value
      const valueOrder = { high: 3, medium: 2, low: 1 };
      return valueOrder[b.educationalValue] - valueOrder[a.educationalValue];
    });
  }

  /**
   * Create a content reduction plan to fit within space constraints
   */
  createReductionPlan(
    overflowAmount: number,
    contentBlocks: ContentBlock[],
    priorities: ContentPriority[]
  ): ContentReductionPlan {
    const plan: ContentReductionPlan = {
      removableBlocks: [],
      compressibleBlocks: [],
      estimatedSpaceSaved: 0,
      impactAssessment: {
        topicsAffected: [],
        educationalValueLoss: 'minimal',
        contentCoherence: 'maintained',
      },
    };

    // Sort blocks by priority (lowest first for removal)
    const sortedBlocks = contentBlocks
      .map(block => ({
        block,
        priority: this.getBlockPriority(block.id, priorities),
      }))
      .sort((a, b) => a.priority - b.priority);

    let spaceSaved = 0;
    const totalContentHeight = contentBlocks.reduce((sum, b) => {
      const height = b.estimatedHeight > 0 ? b.estimatedHeight : Math.max(20, b.content.length * 0.1);
      return sum + height;
    }, 0);
    
    const maxAllowedReduction = (totalContentHeight * this.config.maxContentReduction) / 100;
    const targetReduction = Math.min(
      overflowAmount * 1.2, // Add 20% buffer for better results
      maxAllowedReduction
    );

    // Phase 1: Remove lowest priority blocks
    for (const { block, priority } of sortedBlocks) {
      if (spaceSaved >= targetReduction) break;
      
      // Don't remove user-selected high-priority content
      if (priority >= 7) continue;
      
      plan.removableBlocks.push(block.id);
      // Use estimated height or fallback to content length estimation
      const blockHeight = block.estimatedHeight > 0 ? block.estimatedHeight : Math.max(20, block.content.length * 0.1);
      spaceSaved += blockHeight;
      
      const topicId = this.findTopicForBlock(block.id, priorities);
      if (topicId && !plan.impactAssessment.topicsAffected.includes(topicId)) {
        plan.impactAssessment.topicsAffected.push(topicId);
      }
    }

    // Phase 2: Compress medium priority blocks if needed
    if (spaceSaved < targetReduction) {
      for (const { block, priority } of sortedBlocks) {
        if (spaceSaved >= targetReduction) break;
        if (priority < 3 || priority > 8) continue; // Expanded range for compression
        if (plan.removableBlocks.includes(block.id)) continue;
        
        const compressionRatio = this.calculateOptimalCompression(block, priority);
        if (compressionRatio > 0.05) { // Only compress if meaningful reduction
          const blockHeight = block.estimatedHeight > 0 ? block.estimatedHeight : Math.max(20, block.content.length * 0.1);
          const spaceSavings = blockHeight * compressionRatio;
          
          plan.compressibleBlocks.push({
            blockId: block.id,
            originalLength: block.content.length,
            targetLength: Math.round(block.content.length * (1 - compressionRatio)),
            compressionRatio,
          });
          
          spaceSaved += spaceSavings;
        }
      }
    }

    plan.estimatedSpaceSaved = spaceSaved;
    plan.impactAssessment = this.assessReductionImpact(plan, priorities);

    return plan;
  }

  /**
   * Get priority score for a content block
   */
  private getBlockPriority(blockId: string, priorities: ContentPriority[]): number {
    const topicId = this.findTopicForBlock(blockId, priorities);
    const topicPriority = priorities.find(p => p.topicId === topicId);
    return topicPriority?.priority || 5;
  }

  /**
   * Find which topic a block belongs to
   */
  private findTopicForBlock(blockId: string, priorities: ContentPriority[]): string | null {
    // Extract topic ID from block ID (assuming format like "topic-1-block" or "topic-1")
    const topicMatch = blockId.match(/topic-(\d+)/);
    if (topicMatch) {
      const topicId = `topic-${topicMatch[1]}`;
      return priorities.find(p => p.topicId === topicId)?.topicId || null;
    }
    
    // Fallback: check if block ID contains any topic ID
    return priorities.find(p => blockId.includes(p.topicId))?.topicId || null;
  }

  /**
   * Calculate optimal compression ratio for a block based on its priority
   */
  private calculateOptimalCompression(block: ContentBlock, priority: number): number {
    // Higher priority blocks get less compression
    const basePriority = 5;
    const priorityFactor = Math.max(0.2, (10 - priority) / 10); // Increased compression for lower priority
    
    // Different block types have different compression tolerances
    const typeFactors = {
      heading: 0.15, // Headings can be compressed slightly more
      paragraph: 0.5, // Paragraphs can be compressed significantly
      list: 0.4, // Lists can be compressed moderately
      table: 0.25, // Tables can be compressed with care
      image: 0.1, // Images should rarely be compressed
    };
    
    const typeFactor = typeFactors[block.type] || 0.4;
    return Math.min(0.6, priorityFactor * typeFactor); // Max 60% compression
  }

  /**
   * Assess the impact of the reduction plan
   */
  private assessReductionImpact(
    plan: ContentReductionPlan,
    priorities: ContentPriority[]
  ): ContentReductionPlan['impactAssessment'] {
    const affectedPriorities = priorities.filter(p => 
      plan.impactAssessment.topicsAffected.includes(p.topicId)
    );
    
    const highValueTopicsAffected = affectedPriorities.filter(p => 
      p.educationalValue === 'high'
    ).length;
    
    const userSelectedTopicsAffected = affectedPriorities.filter(p => 
      p.userSelected
    ).length;

    // Assess educational value loss
    let educationalValueLoss: 'minimal' | 'moderate' | 'significant' = 'minimal';
    if (highValueTopicsAffected > 2 || userSelectedTopicsAffected > 1) {
      educationalValueLoss = 'significant';
    } else if (highValueTopicsAffected > 0 || userSelectedTopicsAffected > 0) {
      educationalValueLoss = 'moderate';
    }

    // Assess content coherence
    let contentCoherence: 'maintained' | 'reduced' | 'compromised' = 'maintained';
    const totalReductionRatio = plan.removableBlocks.length / 
      (plan.removableBlocks.length + plan.compressibleBlocks.length + 1);
    
    if (totalReductionRatio > 0.4) {
      contentCoherence = 'compromised';
    } else if (totalReductionRatio > 0.2) {
      contentCoherence = 'reduced';
    }

    return {
      topicsAffected: plan.impactAssessment.topicsAffected,
      educationalValueLoss,
      contentCoherence,
    };
  }

  /**
   * Generate intelligent suggestions based on prioritization analysis
   */
  generateIntelligentSuggestions(
    overflowAmount: number,
    priorities: ContentPriority[],
    reductionPlan: ContentReductionPlan
  ): OverflowSuggestion[] {
    const suggestions: OverflowSuggestion[] = [];
    const overflowPercentage = overflowAmount / (overflowAmount + 1000); // Rough percentage

    // Suggest increasing pages for significant overflow
    if (overflowAmount > 200) {
      const additionalPages = Math.ceil(overflowAmount / 400); // Rough estimate: 400px per page
      suggestions.push({
        type: 'increase-pages',
        description: `Add ${additionalPages} more page(s) to accommodate all content`,
        impact: overflowAmount > 800 ? 'high' : 'medium',
        estimatedReduction: overflowAmount * 0.9,
      });
    }

    // Suggest smaller text size
    suggestions.push({
      type: 'smaller-text',
      description: 'Reduce text size to fit more content per page',
      impact: 'medium',
      estimatedReduction: overflowAmount * 0.4,
    });

    // Suggest more columns
    suggestions.push({
      type: 'more-columns',
      description: 'Increase to 3 columns for better space utilization',
      impact: 'medium',
      estimatedReduction: overflowAmount * 0.3,
    });

    // Suggest deselecting low-priority topics
    const lowPriorityUnselected = priorities.filter(p => 
      !p.userSelected && p.priority <= 6
    );
    
    if (lowPriorityUnselected.length > 0) {
      suggestions.push({
        type: 'reduce-content',
        description: `Consider removing ${lowPriorityUnselected.length} low-priority topics that weren't selected`,
        impact: 'medium',
        estimatedReduction: lowPriorityUnselected.reduce((sum, p) => 
          sum + Math.max(50, p.contentLength * 0.15), 0
        ),
      });
    }

    // Suggest topic consolidation
    const similarTopics = this.findSimilarTopics(priorities);
    if (similarTopics.length > 0) {
      suggestions.push({
        type: 'reduce-content',
        description: `Merge ${similarTopics.length} similar topics to reduce redundancy`,
        impact: 'low',
        estimatedReduction: overflowAmount * 0.2,
      });
    }

    // Suggest selective compression
    if (reductionPlan.compressibleBlocks.length > 0) {
      const avgCompression = reductionPlan.compressibleBlocks.reduce((sum, b) => 
        sum + b.compressionRatio, 0
      ) / reductionPlan.compressibleBlocks.length;
      
      suggestions.push({
        type: 'reduce-content',
        description: `Compress ${reductionPlan.compressibleBlocks.length} content blocks by ${Math.round(avgCompression * 100)}% on average`,
        impact: reductionPlan.impactAssessment.educationalValueLoss === 'minimal' ? 'low' : 'medium',
        estimatedReduction: reductionPlan.compressibleBlocks.reduce((sum, b) => {
          const blockHeight = Math.max(50, b.originalLength * 0.1);
          return sum + (blockHeight * b.compressionRatio);
        }, 0),
      });
    }

    return suggestions.sort((a, b) => {
      const impactOrder = { low: 1, medium: 2, high: 3 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  /**
   * Find topics with similar content for potential merging
   */
  private findSimilarTopics(priorities: ContentPriority[]): string[] {
    // Simplified similarity detection - in practice, you'd use more sophisticated NLP
    const similar: string[] = [];
    
    for (let i = 0; i < priorities.length; i++) {
      for (let j = i + 1; j < priorities.length; j++) {
        const topic1 = priorities[i];
        const topic2 = priorities[j];
        
        // Simple heuristic: topics with similar length and overlapping dependencies
        const lengthSimilar = Math.abs(topic1.contentLength - topic2.contentLength) < 
          Math.min(topic1.contentLength, topic2.contentLength) * 0.3;
        
        const sharedDependencies = topic1.dependencies.filter(dep => 
          topic2.dependencies.includes(dep)
        ).length;
        
        if (lengthSimilar && sharedDependencies > 0) {
          if (!similar.includes(topic1.topicId)) similar.push(topic1.topicId);
          if (!similar.includes(topic2.topicId)) similar.push(topic2.topicId);
        }
      }
    }
    
    return similar;
  }
}