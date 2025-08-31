import {
  SpaceConstraints,
  OrganizedTopic,
  EnhancedSubTopic,
  ReferenceFormatAnalysis,
  SpaceSuggestion,
  TopicSelection,
  SpaceUtilizationInfo
} from './types';
import { getSpaceCalculationService } from './space-calculation-service';

export interface ContentUtilizationAnalysis {
  utilizationPercentage: number;
  emptySpaceDetected: boolean;
  overflowDetected: boolean;
  recommendations: ContentUtilizationRecommendation[];
  densityOptimization: DensityOptimizationResult;
}

export interface ContentUtilizationRecommendation {
  type: 'add_content' | 'expand_existing' | 'reduce_content' | 'redistribute';
  priority: 'high' | 'medium' | 'low';
  description: string;
  targetIds: string[];
  expectedSpaceImpact: number;
  confidenceScore: number;
  implementationSteps: string[];
}

export interface DensityOptimizationResult {
  currentDensity: number;
  targetDensity: number;
  densityGap: number;
  optimizationActions: DensityAction[];
  referenceAlignment: number; // 0-1 score of how well content matches reference density
}

export interface DensityAction {
  type: 'increase_density' | 'decrease_density' | 'maintain_density';
  targetArea: 'topics' | 'subtopics' | 'spacing' | 'formatting';
  description: string;
  impact: number;
}

export interface ContentExpansionSuggestion {
  topicId: string;
  subtopicId?: string;
  expansionType: 'add_examples' | 'add_details' | 'add_subtopics' | 'add_context';
  suggestedContent: string;
  estimatedSpace: number;
  relevanceScore: number;
}

export interface ContentReductionStrategy {
  reductionType: 'remove_topics' | 'remove_subtopics' | 'condense_content' | 'merge_similar';
  targetIds: string[];
  spaceRecovered: number;
  contentImpact: 'minimal' | 'moderate' | 'significant';
  preservationScore: number; // How well original meaning is preserved
}

export class ContentUtilizationService {
  private spaceCalculationService = getSpaceCalculationService();

  /**
   * Analyze current content utilization and provide comprehensive recommendations
   */
  analyzeContentUtilization(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[],
    constraints: SpaceConstraints,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): ContentUtilizationAnalysis {
    const availableSpace = this.spaceCalculationService.calculateAvailableSpace(constraints);
    const usedSpace = selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
    const utilizationPercentage = usedSpace / availableSpace;

    const emptySpaceDetected = utilizationPercentage < 0.7;
    const overflowDetected = utilizationPercentage > 0.95;

    const recommendations = this.generateUtilizationRecommendations(
      selectedTopics,
      allTopics,
      availableSpace,
      utilizationPercentage,
      referenceAnalysis
    );

    const densityOptimization = this.optimizeContentDensity(
      selectedTopics,
      allTopics,
      constraints,
      referenceAnalysis
    );

    return {
      utilizationPercentage,
      emptySpaceDetected,
      overflowDetected,
      recommendations,
      densityOptimization
    };
  }

  /**
   * Detect partially empty pages and suggest content to fill them
   */
  detectEmptySpaceAndSuggestContent(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[],
    availableSpace: number,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): ContentExpansionSuggestion[] {
    const usedSpace = selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
    const remainingSpace = availableSpace - usedSpace;
    const utilizationPercentage = usedSpace / availableSpace;

    const suggestions: ContentExpansionSuggestion[] = [];

    // Only suggest content if utilization is below optimal and significant space remains
    if (utilizationPercentage < 0.8 && remainingSpace > 100) {
      // Find unselected high-value topics that could fit
      const unselectedTopics = allTopics.filter(topic => 
        !selectedTopics.some(sel => sel.topicId === topic.id)
      );

      // Prioritize by value and fit
      const topicSuggestions = unselectedTopics
        .map(topic => ({
          topicId: topic.id,
          expansionType: 'add_subtopics' as const,
          suggestedContent: `Add topic: ${topic.title}`,
          estimatedSpace: topic.estimatedSpace || 0,
          relevanceScore: this.calculateTopicRelevance(topic, selectedTopics, allTopics)
        }))
        .filter(suggestion => suggestion.estimatedSpace <= remainingSpace)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);

      suggestions.push(...topicSuggestions);

      // Suggest expanding existing topics with additional subtopics
      for (const selection of selectedTopics) {
        const topic = allTopics.find(t => t.id === selection.topicId);
        if (topic) {
          const unselectedSubtopics = topic.subtopics.filter(sub => 
            !selection.subtopicIds.includes(sub.id)
          );

          for (const subtopic of unselectedSubtopics.slice(0, 2)) {
            if (subtopic.estimatedSpace && subtopic.estimatedSpace <= remainingSpace) {
              suggestions.push({
                topicId: topic.id,
                subtopicId: subtopic.id,
                expansionType: 'add_subtopics',
                suggestedContent: `Add subtopic: ${subtopic.title}`,
                estimatedSpace: subtopic.estimatedSpace,
                relevanceScore: this.calculateSubtopicRelevance(subtopic, topic)
              });
            }
          }
        }
      }

      // Suggest content expansion for existing topics
      if (remainingSpace > 200) {
        for (const selection of selectedTopics.slice(0, 2)) {
          const topic = allTopics.find(t => t.id === selection.topicId);
          if (topic) {
            suggestions.push({
              topicId: topic.id,
              expansionType: 'add_details',
              suggestedContent: `Expand "${topic.title}" with additional examples and explanations`,
              estimatedSpace: Math.min(remainingSpace * 0.3, 300),
              relevanceScore: 0.7
            });
          }
        }
      }
    }

    // Apply reference-guided filtering if available
    if (referenceAnalysis) {
      return this.filterSuggestionsByReference(suggestions, referenceAnalysis);
    }

    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  /**
   * Create priority-based content reduction strategies for overflow scenarios
   */
  createContentReductionStrategy(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[],
    overflowAmount: number,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): ContentReductionStrategy[] {
    const strategies: ContentReductionStrategy[] = [];

    // Strategy 1: Remove low-priority topics
    const lowPrioritySelections = selectedTopics.filter(sel => sel.priority === 'low');
    if (lowPrioritySelections.length > 0) {
      const spaceRecovered = lowPrioritySelections.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
      if (spaceRecovered >= overflowAmount * 0.8) {
        strategies.push({
          reductionType: 'remove_topics',
          targetIds: lowPrioritySelections.map(sel => sel.topicId),
          spaceRecovered,
          contentImpact: 'minimal',
          preservationScore: 0.9
        });
      }
    }

    // Strategy 2: Remove low-priority subtopics
    const subtopicReductions: string[] = [];
    let subtopicSpaceRecovered = 0;

    for (const selection of selectedTopics) {
      const topic = allTopics.find(t => t.id === selection.topicId);
      if (topic) {
        const lowPrioritySubtopics = topic.subtopics.filter(sub => 
          selection.subtopicIds.includes(sub.id) && sub.priority === 'low'
        );

        for (const subtopic of lowPrioritySubtopics) {
          if (subtopicSpaceRecovered < overflowAmount) {
            subtopicReductions.push(subtopic.id);
            subtopicSpaceRecovered += subtopic.estimatedSpace || 0;
          }
        }
      }
    }

    if (subtopicReductions.length > 0) {
      strategies.push({
        reductionType: 'remove_subtopics',
        targetIds: subtopicReductions,
        spaceRecovered: subtopicSpaceRecovered,
        contentImpact: 'minimal',
        preservationScore: 0.85
      });
    }

    // Strategy 3: Condense content intelligently
    const condensationTargets = selectedTopics
      .filter(sel => sel.priority !== 'high')
      .map(sel => {
        const topic = allTopics.find(t => t.id === sel.topicId);
        return {
          topicId: sel.topicId,
          currentSpace: sel.estimatedSpace,
          condensationPotential: this.calculateCondensationPotential(topic)
        };
      })
      .filter(target => target.condensationPotential > 0.2)
      .sort((a, b) => b.condensationPotential - a.condensationPotential);

    if (condensationTargets.length > 0) {
      const condensationSpace = condensationTargets.reduce((sum, target) => 
        sum + (target.currentSpace * target.condensationPotential), 0
      );

      strategies.push({
        reductionType: 'condense_content',
        targetIds: condensationTargets.map(target => target.topicId),
        spaceRecovered: condensationSpace,
        contentImpact: 'moderate',
        preservationScore: 0.75
      });
    }

    // Strategy 4: Merge similar topics (advanced)
    const mergeCandidates = this.findMergeablTopics(selectedTopics, allTopics);
    if (mergeCandidates.length > 0) {
      strategies.push({
        reductionType: 'merge_similar',
        targetIds: mergeCandidates,
        spaceRecovered: overflowAmount * 0.3, // Estimated
        contentImpact: 'moderate',
        preservationScore: 0.8
      });
    }

    return strategies.sort((a, b) => b.preservationScore - a.preservationScore);
  }

  /**
   * Optimize content density based on reference analysis
   */
  optimizeContentDensity(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[],
    constraints: SpaceConstraints,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): DensityOptimizationResult {
    const availableSpace = this.spaceCalculationService.calculateAvailableSpace(constraints);
    const usedSpace = selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
    const currentDensity = usedSpace / availableSpace;

    let targetDensity = 0.85; // Default target
    let referenceAlignment = 0.5; // Default alignment score

    if (referenceAnalysis) {
      // Calculate target density based on reference
      const referenceDensityRatio = referenceAnalysis.contentDensity / availableSpace;
      targetDensity = Math.min(0.95, Math.max(0.7, referenceDensityRatio));
      
      // Calculate how well current selection aligns with reference
      referenceAlignment = this.calculateReferenceAlignment(
        selectedTopics,
        allTopics,
        referenceAnalysis
      );
    }

    const densityGap = targetDensity - currentDensity;
    const optimizationActions: DensityAction[] = [];

    if (Math.abs(densityGap) > 0.1) {
      if (densityGap > 0) {
        // Need to increase density
        optimizationActions.push({
          type: 'increase_density',
          targetArea: 'topics',
          description: 'Add more topics or expand existing content to match reference density',
          impact: densityGap * 0.6
        });

        optimizationActions.push({
          type: 'increase_density',
          targetArea: 'subtopics',
          description: 'Include additional subtopics from selected topics',
          impact: densityGap * 0.4
        });
      } else {
        // Need to decrease density
        optimizationActions.push({
          type: 'decrease_density',
          targetArea: 'topics',
          description: 'Remove lower-priority topics to match reference density',
          impact: Math.abs(densityGap) * 0.7
        });

        optimizationActions.push({
          type: 'decrease_density',
          targetArea: 'spacing',
          description: 'Optimize spacing and formatting to reduce density',
          impact: Math.abs(densityGap) * 0.3
        });
      }
    } else {
      optimizationActions.push({
        type: 'maintain_density',
        targetArea: 'formatting',
        description: 'Current density is optimal, maintain with fine-tuning',
        impact: 0
      });
    }

    return {
      currentDensity,
      targetDensity,
      densityGap,
      optimizationActions,
      referenceAlignment
    };
  }

  /**
   * Generate comprehensive utilization recommendations
   */
  private generateUtilizationRecommendations(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[],
    availableSpace: number,
    utilizationPercentage: number,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): ContentUtilizationRecommendation[] {
    const recommendations: ContentUtilizationRecommendation[] = [];

    // Low utilization recommendations
    if (utilizationPercentage < 0.7) {
      const expansionSuggestions = this.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace,
        referenceAnalysis
      );

      recommendations.push({
        type: 'add_content',
        priority: 'high',
        description: `Space utilization is low (${(utilizationPercentage * 100).toFixed(1)}%). Consider adding more content.`,
        targetIds: expansionSuggestions.slice(0, 3).map(s => s.topicId),
        expectedSpaceImpact: expansionSuggestions.slice(0, 3).reduce((sum, s) => sum + s.estimatedSpace, 0),
        confidenceScore: 0.9,
        implementationSteps: [
          'Review suggested topics and subtopics',
          'Select high-relevance additions',
          'Verify content quality and accuracy',
          'Update topic selection'
        ]
      });
    }

    // Optimal utilization with expansion potential
    if (utilizationPercentage >= 0.7 && utilizationPercentage < 0.85) {
      recommendations.push({
        type: 'expand_existing',
        priority: 'medium',
        description: 'Good utilization. Consider expanding existing topics with more details.',
        targetIds: selectedTopics.slice(0, 2).map(sel => sel.topicId),
        expectedSpaceImpact: (availableSpace - selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0)) * 0.5,
        confidenceScore: 0.7,
        implementationSteps: [
          'Identify topics that could benefit from expansion',
          'Add relevant examples or explanations',
          'Ensure expanded content maintains quality'
        ]
      });
    }

    // High utilization recommendations
    if (utilizationPercentage > 0.95) {
      const overflowAmount = (selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0)) - availableSpace;
      const reductionStrategies = this.createContentReductionStrategy(
        selectedTopics,
        allTopics,
        overflowAmount,
        referenceAnalysis
      );

      if (reductionStrategies.length > 0) {
        const bestStrategy = reductionStrategies[0];
        recommendations.push({
          type: 'reduce_content',
          priority: 'high',
          description: `Content overflow detected. ${bestStrategy.reductionType.replace('_', ' ')} recommended.`,
          targetIds: bestStrategy.targetIds,
          expectedSpaceImpact: -bestStrategy.spaceRecovered,
          confidenceScore: bestStrategy.preservationScore,
          implementationSteps: [
            'Review content reduction strategy',
            'Prioritize content preservation',
            'Apply recommended changes',
            'Verify final layout fits'
          ]
        });
      }
    }

    // Reference alignment recommendations
    if (referenceAnalysis) {
      const alignment = this.calculateReferenceAlignment(selectedTopics, allTopics, referenceAnalysis);
      if (alignment < 0.7) {
        recommendations.push({
          type: 'redistribute',
          priority: 'medium',
          description: 'Content doesn\'t align well with reference format. Consider redistributing topics.',
          targetIds: selectedTopics.map(sel => sel.topicId),
          expectedSpaceImpact: 0,
          confidenceScore: alignment,
          implementationSteps: [
            'Analyze reference format patterns',
            'Adjust topic selection to match reference density',
            'Optimize content organization',
            'Verify visual alignment'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate topic relevance for expansion suggestions
   */
  private calculateTopicRelevance(
    topic: OrganizedTopic,
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[]
  ): number {
    const priorityScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const priorityScore = priorityScores[topic.priority || 'medium'];
    
    const confidenceScore = topic.confidence;
    
    // Content richness (subtopics and examples add value)
    const richnessScore = Math.min(0.3, (topic.subtopics.length * 0.1) + (topic.examples.length * 0.05));
    
    // Complementarity with selected topics (avoid redundancy)
    const selectedTitles = selectedTopics.map(sel => {
      const selectedTopic = allTopics.find(t => t.id === sel.topicId);
      return selectedTopic?.title.toLowerCase() || '';
    });
    
    const titleSimilarity = selectedTitles.reduce((maxSim, selectedTitle) => {
      const similarity = this.calculateStringSimilarity(topic.title.toLowerCase(), selectedTitle);
      return Math.max(maxSim, similarity);
    }, 0);
    
    const complementarityScore = 1 - titleSimilarity;
    
    return (priorityScore * 0.4) + (confidenceScore * 0.3) + richnessScore + (complementarityScore * 0.2);
  }

  /**
   * Calculate subtopic relevance for expansion
   */
  private calculateSubtopicRelevance(subtopic: EnhancedSubTopic, parentTopic: OrganizedTopic): number {
    const priorityScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const priorityScore = priorityScores[subtopic.priority || 'medium'];
    
    const confidenceScore = subtopic.confidence;
    
    // Length-based relevance (longer subtopics might be more valuable)
    const lengthScore = Math.min(0.2, subtopic.content.length / 500);
    
    return (priorityScore * 0.5) + (confidenceScore * 0.3) + lengthScore;
  }

  /**
   * Filter suggestions based on reference analysis
   */
  private filterSuggestionsByReference(
    suggestions: ContentExpansionSuggestion[],
    referenceAnalysis: ReferenceFormatAnalysis
  ): ContentExpansionSuggestion[] {
    // Adjust suggestions based on reference organization style
    if (referenceAnalysis.organizationStyle === 'hierarchical') {
      // Prefer subtopic additions over new topics
      return suggestions
        .sort((a, b) => {
          const aIsSubtopic = a.subtopicId ? 1 : 0;
          const bIsSubtopic = b.subtopicId ? 1 : 0;
          return bIsSubtopic - aIsSubtopic;
        })
        .slice(0, Math.min(suggestions.length, 4));
    } else if (referenceAnalysis.organizationStyle === 'flat') {
      // Prefer new topics over subtopic additions
      return suggestions
        .sort((a, b) => {
          const aIsSubtopic = a.subtopicId ? 0 : 1;
          const bIsSubtopic = b.subtopicId ? 0 : 1;
          return bIsSubtopic - aIsSubtopic;
        })
        .slice(0, Math.min(suggestions.length, 5));
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Calculate how well content aligns with reference format
   */
  private calculateReferenceAlignment(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[],
    referenceAnalysis: ReferenceFormatAnalysis
  ): number {
    let alignmentScore = 0;
    let factors = 0;

    // Topic count alignment
    const topicCountRatio = selectedTopics.length / referenceAnalysis.topicCount;
    const topicCountAlignment = 1 - Math.abs(1 - topicCountRatio);
    alignmentScore += topicCountAlignment * 0.3;
    factors += 0.3;

    // Average topic length alignment
    const averageTopicLength = selectedTopics.reduce((sum, sel) => {
      const topic = allTopics.find(t => t.id === sel.topicId);
      return sum + (topic?.content.length || 0);
    }, 0) / selectedTopics.length;

    const lengthRatio = averageTopicLength / referenceAnalysis.averageTopicLength;
    const lengthAlignment = 1 - Math.abs(1 - lengthRatio);
    alignmentScore += lengthAlignment * 0.3;
    factors += 0.3;

    // Organization style alignment
    const hierarchicalTopics = selectedTopics.filter(sel => {
      const topic = allTopics.find(t => t.id === sel.topicId);
      return topic && topic.subtopics.length > 0;
    }).length;

    const hierarchicalRatio = hierarchicalTopics / selectedTopics.length;
    let organizationAlignment = 0.5; // Default

    if (referenceAnalysis.organizationStyle === 'hierarchical') {
      organizationAlignment = hierarchicalRatio;
    } else if (referenceAnalysis.organizationStyle === 'flat') {
      organizationAlignment = 1 - hierarchicalRatio;
    }

    alignmentScore += organizationAlignment * 0.4;
    factors += 0.4;

    return factors > 0 ? alignmentScore / factors : 0.5;
  }

  /**
   * Calculate condensation potential for a topic
   */
  private calculateCondensationPotential(topic?: OrganizedTopic): number {
    if (!topic) return 0;

    // Factors that indicate condensation potential
    let potential = 0;

    // Long content can usually be condensed
    if (topic.content.length > 500) {
      potential += 0.3;
    }

    // Multiple subtopics might have redundancy
    if (topic.subtopics.length > 3) {
      potential += 0.2;
    }

    // Low confidence content might be less essential
    if (topic.confidence < 0.7) {
      potential += 0.2;
    }

    // Low priority content is more condensable
    if (topic.priority === 'low') {
      potential += 0.3;
    } else if (topic.priority === 'medium') {
      potential += 0.1;
    }

    return Math.min(potential, 0.8); // Cap at 80% condensation potential
  }

  /**
   * Find topics that could potentially be merged
   */
  private findMergeablTopics(
    selectedTopics: TopicSelection[],
    allTopics: OrganizedTopic[]
  ): string[] {
    const mergeCandidates: string[] = [];

    for (let i = 0; i < selectedTopics.length; i++) {
      for (let j = i + 1; j < selectedTopics.length; j++) {
        const topicA = allTopics.find(t => t.id === selectedTopics[i].topicId);
        const topicB = allTopics.find(t => t.id === selectedTopics[j].topicId);

        if (topicA && topicB) {
          const similarity = this.calculateStringSimilarity(
            topicA.title.toLowerCase(),
            topicB.title.toLowerCase()
          );

          // If topics are similar and both are not high priority
          if (similarity > 0.6 && 
              topicA.priority !== 'high' && 
              topicB.priority !== 'high') {
            if (!mergeCandidates.includes(topicA.id)) {
              mergeCandidates.push(topicA.id);
            }
            if (!mergeCandidates.includes(topicB.id)) {
              mergeCandidates.push(topicB.id);
            }
          }
        }
      }
    }

    return mergeCandidates;
  }

  /**
   * Calculate string similarity using simple algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate edit distance between two strings
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Singleton instance
let contentUtilizationService: ContentUtilizationService | null = null;

export function getContentUtilizationService(): ContentUtilizationService {
  if (!contentUtilizationService) {
    contentUtilizationService = new ContentUtilizationService();
  }
  return contentUtilizationService;
}