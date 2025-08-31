import {
  SpaceConstraints,
  OrganizedTopic,
  EnhancedSubTopic,
  ReferenceFormatAnalysis,
  SpaceOptimizationResult,
  SpaceSuggestion,
  TopicSelection,
  SpaceUtilizationInfo
} from './types';

export class SpaceCalculationService {
  // Base space calculations for different page sizes (in square inches)
  private readonly PAGE_SIZES = {
    a4: { width: 8.27, height: 11.69 },
    letter: { width: 8.5, height: 11 },
    legal: { width: 8.5, height: 14 },
    a3: { width: 11.69, height: 16.54 }
  };

  // Character density estimates per square inch for different font sizes
  private readonly FONT_DENSITIES = {
    small: 180,   // characters per square inch
    medium: 140,  // characters per square inch
    large: 100    // characters per square inch
  };

  // Margin and spacing factors
  private readonly MARGIN_FACTOR = 0.85; // 15% margin
  private readonly COLUMN_SPACING_FACTOR = 0.95; // 5% spacing between columns

  /**
   * Calculate available space for content based on page configuration
   */
  calculateAvailableSpace(constraints: SpaceConstraints): number {
    const pageSize = this.PAGE_SIZES[constraints.pageSize];
    const totalPageArea = pageSize.width * pageSize.height * constraints.availablePages;
    const usableArea = totalPageArea * this.MARGIN_FACTOR;
    const columnAdjustedArea = usableArea * Math.pow(this.COLUMN_SPACING_FACTOR, constraints.columns - 1);
    const fontDensity = this.FONT_DENSITIES[constraints.fontSize];
    
    return Math.floor(columnAdjustedArea * fontDensity);
  }

  /**
   * Estimate space required for a piece of content
   */
  estimateContentSpace(content: string, constraints: SpaceConstraints): number {
    // Base character count
    let characterCount = content.length;
    
    // Add overhead for formatting (headers, bullets, spacing)
    const formattingOverhead = 1.2;
    characterCount *= formattingOverhead;
    
    // Adjust for column layout (multi-column requires more space due to breaks)
    if (constraints.columns > 1) {
      characterCount *= 1.1;
    }
    
    return Math.ceil(characterCount);
  }

  /**
   * Calculate optimal topic count based on available space and reference patterns
   */
  calculateOptimalTopicCount(
    availableSpace: number,
    topics: OrganizedTopic[],
    referenceAnalysis?: ReferenceFormatAnalysis
  ): number {
    if (referenceAnalysis) {
      // Use reference analysis to guide topic count
      const referenceRatio = availableSpace / referenceAnalysis.contentDensity;
      const scaledTopicCount = Math.floor(referenceAnalysis.topicCount * referenceRatio);
      
      // Apply organization style adjustments
      let adjustmentFactor = 1.0;
      if (referenceAnalysis.organizationStyle === 'hierarchical') {
        adjustmentFactor = 0.9; // Hierarchical needs more space per topic
      } else if (referenceAnalysis.organizationStyle === 'flat') {
        adjustmentFactor = 1.1; // Flat organization can fit more topics
      }
      
      const adjustedCount = Math.floor(scaledTopicCount * adjustmentFactor);
      return Math.min(Math.max(adjustedCount, 1), topics.length);
    }

    // Fallback to space-based calculation with priority weighting
    const priorityWeights = { high: 1.5, medium: 1.0, low: 0.7 };
    const weightedAverageSpace = topics.reduce((sum, topic) => {
      const topicSpace = this.estimateTopicSpace(topic, { 
        pageSize: 'a4', 
        fontSize: 'medium', 
        columns: 1,
        availablePages: 1,
        targetUtilization: 0.85
      });
      const weight = priorityWeights[topic.priority || 'medium'];
      return sum + (topicSpace * weight);
    }, 0) / topics.length;

    const optimalCount = Math.floor(availableSpace * 0.85 / weightedAverageSpace);
    return Math.min(Math.max(optimalCount, 1), topics.length);
  }

  /**
   * Estimate space required for a complete topic including subtopics
   */
  estimateTopicSpace(topic: OrganizedTopic, constraints: SpaceConstraints): number {
    let totalSpace = 0;

    // Main topic content
    totalSpace += this.estimateContentSpace(topic.content, constraints);
    
    // Topic title overhead
    totalSpace += 50; // Approximate space for title formatting
    
    // Subtopics
    topic.subtopics.forEach(subtopic => {
      totalSpace += this.estimateSubtopicSpace(subtopic, constraints);
    });
    
    // Examples and images (rough estimate)
    totalSpace += topic.examples.length * 200; // Approximate space per image
    
    return totalSpace;
  }

  /**
   * Estimate space required for a subtopic
   */
  estimateSubtopicSpace(subtopic: EnhancedSubTopic, constraints: SpaceConstraints): number {
    let space = this.estimateContentSpace(subtopic.content, constraints);
    space += 30; // Subtopic title and formatting overhead
    return space;
  }

  /**
   * Generate space utilization suggestions with intelligent prioritization
   */
  generateSpaceSuggestions(
    currentSelection: TopicSelection[],
    availableSpace: number,
    allTopics: OrganizedTopic[]
  ): SpaceSuggestion[] {
    const suggestions: SpaceSuggestion[] = [];
    const usedSpace = currentSelection.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
    const remainingSpace = availableSpace - usedSpace;
    const utilizationPercentage = usedSpace / availableSpace;

    // If utilization is low, suggest adding content
    if (utilizationPercentage < 0.7 && remainingSpace > 50) {
      // Find unselected topics that could fit, prioritized by importance and fit
      const unselectedTopics = allTopics
        .filter(topic => !currentSelection.some(sel => sel.topicId === topic.id))
        .map(topic => ({
          topic,
          estimatedSpace: topic.estimatedSpace || 0,
          priority: topic.priority || 'medium',
          fitScore: this.calculateFitScore(topic, remainingSpace)
        }))
        .filter(item => item.estimatedSpace <= remainingSpace)
        .sort((a, b) => b.fitScore - a.fitScore);

      // Add top fitting topics
      for (const item of unselectedTopics.slice(0, 3)) {
        suggestions.push({
          type: 'add_topic',
          targetId: item.topic.id,
          description: `Add "${item.topic.title}" (${item.priority} priority) to better utilize available space`,
          spaceImpact: item.estimatedSpace
        });
      }

      // Suggest adding subtopics from selected topics
      for (const selection of currentSelection) {
        const topic = allTopics.find(t => t.id === selection.topicId);
        if (topic) {
          const unselectedSubtopics = topic.subtopics
            .filter(sub => !selection.subtopicIds.includes(sub.id))
            .map(sub => ({
              subtopic: sub,
              estimatedSpace: sub.estimatedSpace || 0,
              priority: sub.priority || 'medium'
            }))
            .filter(item => item.estimatedSpace <= remainingSpace)
            .sort((a, b) => {
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

          for (const item of unselectedSubtopics.slice(0, 2)) {
            if (suggestions.length < 5) {
              suggestions.push({
                type: 'add_subtopic',
                targetId: item.subtopic.id,
                description: `Add subtopic "${item.subtopic.title}" from ${topic.title}`,
                spaceImpact: item.estimatedSpace
              });
            }
          }
        }
      }
    }

    // If utilization is optimal but could be improved, suggest content expansion
    if (utilizationPercentage >= 0.7 && utilizationPercentage < 0.85 && remainingSpace > 100) {
      const selectedTopics = currentSelection.map(sel => 
        allTopics.find(t => t.id === sel.topicId)
      ).filter(Boolean);

      for (const topic of selectedTopics) {
        if (topic && suggestions.length < 5) {
          suggestions.push({
            type: 'expand_content',
            targetId: topic.id,
            description: `Consider expanding "${topic.title}" with additional details`,
            spaceImpact: Math.min(remainingSpace * 0.3, 150)
          });
        }
      }
    }

    // If utilization is too high, suggest reducing content intelligently
    if (utilizationPercentage > 0.95) {
      // Prioritize removal of low-priority content first
      const removalCandidates = currentSelection
        .map(sel => {
          const topic = allTopics.find(t => t.id === sel.topicId);
          return { selection: sel, topic, priority: topic?.priority || 'medium' };
        })
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      // Suggest removing low-priority topics
      const lowPriorityItems = removalCandidates.filter(item => item.priority === 'low');
      for (const item of lowPriorityItems.slice(0, 2)) {
        if (item.topic) {
          suggestions.push({
            type: 'reduce_content',
            targetId: item.topic.id,
            description: `Remove low-priority topic "${item.topic.title}" to prevent overflow`,
            spaceImpact: -item.selection.estimatedSpace
          });
        }
      }

      // Suggest removing low-priority subtopics if no low-priority topics
      if (lowPriorityItems.length === 0) {
        for (const item of removalCandidates) {
          if (item.topic && suggestions.length < 5) {
            const lowPrioritySubtopics = item.topic.subtopics.filter(sub => 
              item.selection.subtopicIds.includes(sub.id) && sub.priority === 'low'
            );

            for (const subtopic of lowPrioritySubtopics.slice(0, 1)) {
              suggestions.push({
                type: 'reduce_content',
                targetId: subtopic.id,
                description: `Remove low-priority subtopic "${subtopic.title}" to prevent overflow`,
                spaceImpact: -(subtopic.estimatedSpace || 0)
              });
            }
          }
        }
      }
    }

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }

  /**
   * Calculate how well a topic fits the remaining space and user needs
   */
  private calculateFitScore(topic: OrganizedTopic, remainingSpace: number): number {
    const priorityScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const priorityScore = priorityScores[topic.priority || 'medium'];
    
    const spaceEfficiency = Math.min(1.0, remainingSpace / (topic.estimatedSpace || 1));
    const confidenceScore = topic.confidence;
    
    // Bonus for topics with subtopics (more comprehensive)
    const subtopicBonus = topic.subtopics.length > 0 ? 0.1 : 0;
    
    return (priorityScore * 0.4) + (spaceEfficiency * 0.3) + (confidenceScore * 0.2) + subtopicBonus;
  }

  /**
   * Optimize space utilization using priority-based selection with reference pattern matching
   */
  optimizeSpaceUtilization(
    topics: OrganizedTopic[],
    availableSpace: number,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): SpaceOptimizationResult {
    const recommendedTopics: string[] = [];
    const recommendedSubtopics: { topicId: string; subtopicIds: string[] }[] = [];
    let usedSpace = 0;

    // Determine target utilization based on reference analysis
    let targetUtilization = 0.85;
    let bufferSpace = 0.1;
    
    if (referenceAnalysis) {
      // Adjust based on reference organization style
      if (referenceAnalysis.organizationStyle === 'hierarchical') {
        targetUtilization = 0.8; // More conservative for hierarchical
        bufferSpace = 0.15;
      } else if (referenceAnalysis.organizationStyle === 'flat') {
        targetUtilization = 0.9; // More aggressive for flat organization
        bufferSpace = 0.05;
      }
      
      // Adjust based on layout pattern
      if (referenceAnalysis.layoutPattern === 'multi-column') {
        bufferSpace += 0.05; // Need more buffer for column breaks
      }
    }

    // Sort topics by comprehensive scoring
    const scoredTopics = topics.map(topic => ({
      topic,
      score: this.calculateTopicScore(topic, referenceAnalysis)
    })).sort((a, b) => b.score - a.score);

    // Phase 1: Essential high-priority content
    const highPriorityTopics = scoredTopics.filter(item => item.topic.priority === 'high');
    for (const item of highPriorityTopics) {
      const topicSpace = this.calculateTopicSpaceWithSubtopics(item.topic, 'high');
      if (usedSpace + topicSpace <= availableSpace * (1 - bufferSpace)) {
        recommendedTopics.push(item.topic.id);
        
        const highPrioritySubtopics = item.topic.subtopics
          .filter(sub => sub.priority === 'high')
          .map(sub => sub.id);
        
        recommendedSubtopics.push({
          topicId: item.topic.id,
          subtopicIds: highPrioritySubtopics
        });
        
        usedSpace += topicSpace;
      }
    }

    // Phase 2: Fill with medium-priority content using intelligent selection
    const mediumPriorityTopics = scoredTopics.filter(item => 
      (item.topic.priority === 'medium' || !item.topic.priority) &&
      !recommendedTopics.includes(item.topic.id)
    );

    for (const item of mediumPriorityTopics) {
      const topicSpace = this.calculateTopicSpaceWithSubtopics(item.topic, 'medium');
      if (usedSpace + topicSpace <= availableSpace * targetUtilization) {
        recommendedTopics.push(item.topic.id);
        
        const mediumPrioritySubtopics = item.topic.subtopics
          .filter(sub => sub.priority === 'medium' || !sub.priority)
          .map(sub => sub.id);
        
        recommendedSubtopics.push({
          topicId: item.topic.id,
          subtopicIds: mediumPrioritySubtopics
        });
        
        usedSpace += topicSpace;
      }
    }

    // Phase 3: Intelligent space filling with low-priority content
    const remainingSpace = availableSpace - usedSpace;
    if (remainingSpace > 100) {
      const lowPriorityTopics = scoredTopics.filter(item => 
        item.topic.priority === 'low' &&
        !recommendedTopics.includes(item.topic.id)
      );

      // Try to fit multiple small low-priority items or one larger one
      const fittingItems = this.findOptimalLowPriorityFit(lowPriorityTopics, remainingSpace);
      
      for (const item of fittingItems) {
        recommendedTopics.push(item.topic.id);
        
        const lowPrioritySubtopics = item.topic.subtopics
          .filter(sub => sub.priority === 'low')
          .map(sub => sub.id);
        
        recommendedSubtopics.push({
          topicId: item.topic.id,
          subtopicIds: lowPrioritySubtopics
        });
        
        usedSpace += item.estimatedSpace;
      }
    }

    // Phase 4: Fine-tune with individual subtopics if space remains
    const finalRemainingSpace = availableSpace - usedSpace;
    if (finalRemainingSpace > 50) {
      usedSpace += this.addOptimalSubtopics(
        topics,
        recommendedTopics,
        recommendedSubtopics,
        finalRemainingSpace
      );
    }

    const utilizationScore = usedSpace / availableSpace;
    const estimatedFinalUtilization = Math.min(utilizationScore, 1.0);

    // Generate intelligent suggestions
    const currentSelection: TopicSelection[] = recommendedTopics.map(topicId => {
      const topic = topics.find(t => t.id === topicId);
      const subtopicSelection = recommendedSubtopics.find(rs => rs.topicId === topicId);
      
      return {
        topicId,
        subtopicIds: subtopicSelection?.subtopicIds || [],
        priority: topic?.priority || 'medium',
        estimatedSpace: topic?.estimatedSpace || 0
      };
    });

    const suggestions = this.generateSpaceSuggestions(currentSelection, availableSpace, topics);

    return {
      recommendedTopics,
      recommendedSubtopics,
      utilizationScore,
      suggestions,
      estimatedFinalUtilization
    };
  }

  /**
   * Calculate comprehensive topic score for optimization
   */
  private calculateTopicScore(topic: OrganizedTopic, referenceAnalysis?: ReferenceFormatAnalysis): number {
    const priorityScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const priorityScore = priorityScores[topic.priority || 'medium'];
    
    const confidenceScore = topic.confidence;
    
    // Content richness score (subtopics and examples add value)
    const subtopicScore = Math.min(0.2, topic.subtopics.length * 0.05);
    const exampleScore = Math.min(0.1, topic.examples.length * 0.03);
    
    // Reference alignment score
    let referenceScore = 0;
    if (referenceAnalysis) {
      const topicLength = topic.content.length;
      const idealLength = referenceAnalysis.averageTopicLength;
      const lengthAlignment = 1 - Math.abs(topicLength - idealLength) / Math.max(topicLength, idealLength);
      referenceScore = lengthAlignment * 0.15;
    }
    
    return (priorityScore * 0.4) + (confidenceScore * 0.25) + subtopicScore + exampleScore + referenceScore;
  }

  /**
   * Calculate topic space including selected subtopics
   */
  private calculateTopicSpaceWithSubtopics(topic: OrganizedTopic, priorityLevel: 'high' | 'medium' | 'low'): number {
    let totalSpace = topic.estimatedSpace || 0;
    
    const relevantSubtopics = topic.subtopics.filter(sub => {
      if (priorityLevel === 'high') return sub.priority === 'high';
      if (priorityLevel === 'medium') return sub.priority === 'medium' || !sub.priority;
      return sub.priority === 'low';
    });
    
    totalSpace += relevantSubtopics.reduce((sum, sub) => sum + (sub.estimatedSpace || 0), 0);
    
    return totalSpace;
  }

  /**
   * Find optimal combination of low-priority topics that fit in remaining space
   */
  private findOptimalLowPriorityFit(
    lowPriorityTopics: { topic: OrganizedTopic; score: number }[],
    remainingSpace: number
  ): { topic: OrganizedTopic; estimatedSpace: number }[] {
    const candidates = lowPriorityTopics.map(item => ({
      topic: item.topic,
      estimatedSpace: this.calculateTopicSpaceWithSubtopics(item.topic, 'low'),
      score: item.score
    })).filter(item => item.estimatedSpace <= remainingSpace);

    if (candidates.length === 0) return [];

    // Try to fit multiple small items or one larger high-value item
    candidates.sort((a, b) => b.score - a.score);
    
    const result: { topic: OrganizedTopic; estimatedSpace: number }[] = [];
    let usedSpace = 0;
    
    for (const candidate of candidates) {
      if (usedSpace + candidate.estimatedSpace <= remainingSpace) {
        result.push(candidate);
        usedSpace += candidate.estimatedSpace;
      }
    }
    
    return result;
  }

  /**
   * Add optimal individual subtopics to fill remaining space
   */
  private addOptimalSubtopics(
    allTopics: OrganizedTopic[],
    recommendedTopics: string[],
    recommendedSubtopics: { topicId: string; subtopicIds: string[] }[],
    remainingSpace: number
  ): number {
    let addedSpace = 0;
    
    // Find unselected subtopics from selected topics
    for (const topicId of recommendedTopics) {
      const topic = allTopics.find(t => t.id === topicId);
      const currentSubtopics = recommendedSubtopics.find(rs => rs.topicId === topicId);
      
      if (topic && currentSubtopics) {
        const unselectedSubtopics = topic.subtopics
          .filter(sub => !currentSubtopics.subtopicIds.includes(sub.id))
          .map(sub => ({
            subtopic: sub,
            estimatedSpace: sub.estimatedSpace || 0,
            priority: sub.priority || 'medium'
          }))
          .filter(item => item.estimatedSpace <= remainingSpace - addedSpace)
          .sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });

        for (const item of unselectedSubtopics) {
          if (addedSpace + item.estimatedSpace <= remainingSpace) {
            currentSubtopics.subtopicIds.push(item.subtopic.id);
            addedSpace += item.estimatedSpace;
          }
        }
      }
    }
    
    return addedSpace;
  }

  /**
   * Calculate current space utilization info
   */
  calculateSpaceUtilization(
    selectedTopics: TopicSelection[],
    availableSpace: number,
    allTopics: OrganizedTopic[]
  ): SpaceUtilizationInfo {
    const usedSpace = selectedTopics.reduce((sum, selection) => sum + selection.estimatedSpace, 0);
    const remainingSpace = Math.max(0, availableSpace - usedSpace);
    const utilizationPercentage = usedSpace / availableSpace;

    const suggestions = this.generateSpaceSuggestions(selectedTopics, availableSpace, allTopics);

    return {
      totalAvailableSpace: availableSpace,
      usedSpace,
      remainingSpace,
      utilizationPercentage,
      suggestions
    };
  }
}

// Singleton instance
let spaceCalculationService: SpaceCalculationService | null = null;

export function getSpaceCalculationService(): SpaceCalculationService {
  if (!spaceCalculationService) {
    spaceCalculationService = new SpaceCalculationService();
  }
  return spaceCalculationService;
}