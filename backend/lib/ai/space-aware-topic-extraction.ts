import { getSpaceCalculationService } from './space-calculation-service';
import { AIContentService } from './content-service';
import {
  ExtractedContent,
  TopicExtractionRequest,
  OrganizedTopic,
  SpaceConstraints,
  ReferenceFormatAnalysis,
  SpaceOptimizationResult
} from './types';

/**
 * Enhanced topic extraction service that considers space constraints
 */
export class SpaceAwareTopicExtractionService {
  private aiContentService: AIContentService;
  private spaceCalculationService: ReturnType<typeof getSpaceCalculationService>;

  constructor() {
    this.aiContentService = new AIContentService();
    this.spaceCalculationService = getSpaceCalculationService();
  }

  /**
   * Extract topics with space-aware optimization
   */
  async extractTopicsWithSpaceOptimization(
    content: ExtractedContent[],
    constraints: SpaceConstraints,
    referenceAnalysis?: ReferenceFormatAnalysis,
    userPreferences?: {
      maxTopics?: number;
      focusAreas?: string[];
      excludePatterns?: string[];
    }
  ): Promise<{
    topics: OrganizedTopic[];
    spaceOptimization: SpaceOptimizationResult;
    availableSpace: number;
    recommendations: {
      optimalTopicCount: number;
      suggestedConfiguration: SpaceConstraints;
      spaceUtilizationTips: string[];
    };
  }> {
    // Calculate available space
    const availableSpace = this.spaceCalculationService.calculateAvailableSpace(constraints);

    // Calculate optimal topic count based on space and reference analysis
    let optimalTopicCount = userPreferences?.maxTopics;
    if (!optimalTopicCount) {
      // Use a preliminary extraction to estimate topic count
      const preliminaryTopics = await this.aiContentService.extractTopics(content);
      optimalTopicCount = this.spaceCalculationService.calculateOptimalTopicCount(
        availableSpace,
        preliminaryTopics,
        referenceAnalysis
      );
    }

    // Create space-aware extraction request
    const extractionRequest: TopicExtractionRequest = {
      content,
      userPreferences: {
        maxTopics: optimalTopicCount,
        focusAreas: userPreferences?.focusAreas || [],
        excludePatterns: userPreferences?.excludePatterns || []
      },
      spaceConstraints: constraints,
      referenceAnalysis
    };

    // Extract topics with space considerations
    const topics = await this.extractTopicsWithSpaceConstraints(extractionRequest);

    // Estimate space for each topic and subtopic
    const topicsWithSpaceEstimates = await this.addSpaceEstimates(topics, constraints);

    // Optimize space utilization
    const spaceOptimization = this.spaceCalculationService.optimizeSpaceUtilization(
      topicsWithSpaceEstimates,
      availableSpace,
      referenceAnalysis
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      topicsWithSpaceEstimates,
      constraints,
      availableSpace,
      referenceAnalysis
    );

    return {
      topics: topicsWithSpaceEstimates,
      spaceOptimization,
      availableSpace,
      recommendations
    };
  }

  /**
   * Extract topics considering space constraints in the AI prompt
   */
  private async extractTopicsWithSpaceConstraints(
    request: TopicExtractionRequest
  ): Promise<OrganizedTopic[]> {
    // Enhanced prompt that considers space constraints
    const spaceAwarePrompt = this.buildSpaceAwarePrompt(request);
    
    // Use the AI service with space-aware prompting
    return await this.aiContentService.extractTopicsWithPrompt(request.content, spaceAwarePrompt);
  }

  /**
   * Build a space-aware prompt for topic extraction
   */
  private buildSpaceAwarePrompt(request: TopicExtractionRequest): string {
    const { spaceConstraints, referenceAnalysis, userPreferences } = request;
    
    let prompt = `Extract and organize topics from the provided content with the following space considerations:

SPACE CONSTRAINTS:
- Available pages: ${spaceConstraints?.availablePages || 1}
- Page size: ${spaceConstraints?.pageSize || 'a4'}
- Font size: ${spaceConstraints?.fontSize || 'medium'}
- Columns: ${spaceConstraints?.columns || 1}
- Target utilization: ${(spaceConstraints?.targetUtilization || 0.85) * 100}%

EXTRACTION GUIDELINES:
- Maximum topics: ${userPreferences?.maxTopics || 'optimal based on space'}
- Focus on creating topics that fit well within the space constraints
- Prioritize high-value, essential information
- Create granular subtopics that can be individually selected
- Preserve original wording and terminology`;

    if (referenceAnalysis) {
      prompt += `

REFERENCE FORMAT GUIDANCE:
- Reference content density: ${referenceAnalysis.contentDensity} characters per page
- Reference topic count: ${referenceAnalysis.topicCount}
- Average topic length: ${referenceAnalysis.averageTopicLength} characters
- Organization style: ${referenceAnalysis.organizationStyle}
- Layout pattern: ${referenceAnalysis.layoutPattern}

Adapt the topic extraction to match the reference's content density and organization patterns.`;
    }

    if (userPreferences?.focusAreas && userPreferences.focusAreas.length > 0) {
      prompt += `

FOCUS AREAS: ${userPreferences.focusAreas.join(', ')}
Prioritize content related to these areas.`;
    }

    if (userPreferences?.excludePatterns && userPreferences.excludePatterns.length > 0) {
      prompt += `

EXCLUDE: ${userPreferences.excludePatterns.join(', ')}
Avoid including content matching these patterns.`;
    }

    prompt += `

OUTPUT FORMAT:
- Assign priority levels (high, medium, low) to each topic and subtopic
- Estimate content length for space planning
- Maintain hierarchical structure with selectable subtopics
- Preserve educational value while optimizing for space`;

    return prompt;
  }

  /**
   * Add space estimates to topics and subtopics
   */
  private async addSpaceEstimates(
    topics: OrganizedTopic[],
    constraints: SpaceConstraints
  ): Promise<OrganizedTopic[]> {
    return topics.map(topic => {
      // Estimate space for main topic content
      const topicSpace = this.spaceCalculationService.estimateContentSpace(topic.content, constraints);
      
      // Estimate space for subtopics
      const subtopicsWithEstimates = topic.subtopics.map(subtopic => ({
        ...subtopic,
        estimatedSpace: this.spaceCalculationService.estimateSubtopicSpace(subtopic, constraints)
      }));

      // Calculate total topic space including subtopics and examples
      const subtopicsSpace = subtopicsWithEstimates.reduce((sum, sub) => sum + (sub.estimatedSpace || 0), 0);
      const examplesSpace = topic.examples.length * 200; // Rough estimate for images
      const totalTopicSpace = topicSpace + subtopicsSpace + examplesSpace + 50; // Title overhead

      return {
        ...topic,
        subtopics: subtopicsWithEstimates,
        estimatedSpace: totalTopicSpace
      };
    });
  }

  /**
   * Generate space utilization recommendations
   */
  private generateRecommendations(
    topics: OrganizedTopic[],
    constraints: SpaceConstraints,
    availableSpace: number,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): {
    optimalTopicCount: number;
    suggestedConfiguration: SpaceConstraints;
    spaceUtilizationTips: string[];
  } {
    const optimalTopicCount = this.spaceCalculationService.calculateOptimalTopicCount(
      availableSpace,
      topics,
      referenceAnalysis
    );

    // Generate configuration suggestions
    const suggestedConfiguration = this.suggestOptimalConfiguration(constraints, topics, availableSpace);

    // Generate space utilization tips
    const spaceUtilizationTips = this.generateSpaceUtilizationTips(
      topics,
      constraints,
      availableSpace,
      referenceAnalysis
    );

    return {
      optimalTopicCount,
      suggestedConfiguration,
      spaceUtilizationTips
    };
  }

  /**
   * Suggest optimal configuration for better space utilization
   */
  private suggestOptimalConfiguration(
    currentConstraints: SpaceConstraints,
    topics: OrganizedTopic[],
    availableSpace: number
  ): SpaceConstraints {
    const totalContentSpace = topics.reduce((sum, topic) => sum + (topic.estimatedSpace || 0), 0);
    const utilizationRatio = totalContentSpace / availableSpace;

    let suggestedConstraints = { ...currentConstraints };

    // If content doesn't fit, suggest adjustments
    if (utilizationRatio > 0.95) {
      // Suggest smaller font or more pages
      if (currentConstraints.fontSize === 'large') {
        suggestedConstraints.fontSize = 'medium';
      } else if (currentConstraints.fontSize === 'medium') {
        suggestedConstraints.fontSize = 'small';
      } else {
        suggestedConstraints.availablePages = Math.ceil(currentConstraints.availablePages * 1.5);
      }
    }

    // If utilization is too low, suggest optimizations
    if (utilizationRatio < 0.6) {
      // Suggest larger font or fewer pages if possible
      if (currentConstraints.fontSize === 'small') {
        suggestedConstraints.fontSize = 'medium';
      } else if (currentConstraints.fontSize === 'medium' && currentConstraints.availablePages > 1) {
        suggestedConstraints.availablePages = Math.max(1, Math.floor(currentConstraints.availablePages * 0.8));
      }
    }

    return suggestedConstraints;
  }

  /**
   * Generate practical space utilization tips
   */
  private generateSpaceUtilizationTips(
    topics: OrganizedTopic[],
    constraints: SpaceConstraints,
    availableSpace: number,
    referenceAnalysis?: ReferenceFormatAnalysis
  ): string[] {
    const tips: string[] = [];
    const totalContentSpace = topics.reduce((sum, topic) => sum + (topic.estimatedSpace || 0), 0);
    const utilizationRatio = totalContentSpace / availableSpace;

    // General utilization tips
    if (utilizationRatio > 1.0) {
      tips.push('Content exceeds available space. Consider removing low-priority topics or increasing page count.');
      tips.push('Focus on high-priority topics and essential subtopics only.');
    } else if (utilizationRatio < 0.6) {
      tips.push('You have significant unused space. Consider adding more topics or expanding existing content.');
      tips.push('Include additional subtopics or examples to maximize learning value.');
    }

    // Priority-based tips
    const highPriorityTopics = topics.filter(t => t.priority === 'high').length;
    const lowPriorityTopics = topics.filter(t => t.priority === 'low').length;
    
    if (highPriorityTopics < topics.length * 0.3) {
      tips.push('Consider marking more essential topics as high priority for better space allocation.');
    }
    
    if (lowPriorityTopics > topics.length * 0.4) {
      tips.push('You have many low-priority topics. These will be used to fill remaining space optimally.');
    }

    // Configuration tips
    if (constraints.columns === 1 && availableSpace > 15000) {
      tips.push('Consider using 2 columns for better space utilization with this amount of content.');
    }

    if (constraints.fontSize === 'large' && utilizationRatio > 0.8) {
      tips.push('Consider using medium font size to fit more content comfortably.');
    }

    // Reference-based tips
    if (referenceAnalysis) {
      const referenceUtilization = referenceAnalysis.contentDensity / availableSpace;
      if (utilizationRatio < referenceUtilization * 0.7) {
        tips.push('Your content density is lower than the reference. Consider adding more detailed information.');
      } else if (utilizationRatio > referenceUtilization * 1.3) {
        tips.push('Your content is denser than the reference. Consider condensing or splitting across more pages.');
      }
    }

    return tips.slice(0, 5); // Limit to top 5 tips
  }

  /**
   * Validate and adjust topic selection based on space constraints
   */
  async validateTopicSelection(
    selectedTopicIds: string[],
    selectedSubtopicIds: { topicId: string; subtopicIds: string[] }[],
    allTopics: OrganizedTopic[],
    constraints: SpaceConstraints
  ): Promise<{
    isValid: boolean;
    utilizationInfo: {
      totalSpace: number;
      usedSpace: number;
      utilizationPercentage: number;
    };
    warnings: string[];
    suggestions: string[];
  }> {
    const availableSpace = this.spaceCalculationService.calculateAvailableSpace(constraints);
    
    // Calculate space for selected content
    let usedSpace = 0;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const topicId of selectedTopicIds) {
      const topic = allTopics.find(t => t.id === topicId);
      if (topic) {
        usedSpace += topic.estimatedSpace || 0;
        
        // Add selected subtopics
        const subtopicSelection = selectedSubtopicIds.find(s => s.topicId === topicId);
        if (subtopicSelection) {
          for (const subtopicId of subtopicSelection.subtopicIds) {
            const subtopic = topic.subtopics.find(s => s.id === subtopicId);
            if (subtopic) {
              usedSpace += subtopic.estimatedSpace || 0;
            }
          }
        }
      }
    }

    const utilizationPercentage = usedSpace / availableSpace;
    const isValid = utilizationPercentage <= 1.0;

    // Generate warnings
    if (utilizationPercentage > 1.0) {
      warnings.push(`Content exceeds available space by ${((utilizationPercentage - 1) * 100).toFixed(1)}%`);
    } else if (utilizationPercentage > 0.95) {
      warnings.push('Content is very close to space limit. Consider removing some low-priority items.');
    }

    if (utilizationPercentage < 0.5) {
      warnings.push('Space utilization is quite low. Consider adding more content.');
    }

    // Generate suggestions
    if (utilizationPercentage > 1.0) {
      suggestions.push('Remove some low-priority topics or subtopics');
      suggestions.push('Consider increasing page count or using smaller font size');
    } else if (utilizationPercentage < 0.7) {
      suggestions.push('Add more topics or subtopics to better utilize available space');
      suggestions.push('Consider expanding existing topics with more details');
    }

    return {
      isValid,
      utilizationInfo: {
        totalSpace: availableSpace,
        usedSpace,
        utilizationPercentage
      },
      warnings,
      suggestions
    };
  }
}

// Singleton instance
let spaceAwareTopicExtractionService: SpaceAwareTopicExtractionService | null = null;

export function getSpaceAwareTopicExtractionService(): SpaceAwareTopicExtractionService {
  if (!spaceAwareTopicExtractionService) {
    spaceAwareTopicExtractionService = new SpaceAwareTopicExtractionService();
  }
  return spaceAwareTopicExtractionService;
}