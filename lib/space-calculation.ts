// Frontend space calculation utilities for priority-based topic selection

export interface SpaceConstraints {
  availablePages: number
  referenceContentDensity?: number
  targetUtilization: number // 0.8-0.95 for optimal space usage
  pageSize: 'a4' | 'letter' | 'legal' | 'a3'
  fontSize: 'small' | 'medium' | 'large'
  columns: 1 | 2 | 3
}

export interface SpaceUtilizationInfo {
  totalAvailableSpace: number
  usedSpace: number
  remainingSpace: number
  utilizationPercentage: number
  suggestions: SpaceSuggestion[]
}

export interface SpaceSuggestion {
  type: 'add_topic' | 'add_subtopic' | 'expand_content' | 'reduce_content'
  targetId: string
  description: string
  spaceImpact: number
}

export interface TopicSelection {
  topicId: string
  subtopicIds: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedSpace: number
}

export interface EnhancedTopic {
  id: string
  topic: string
  content: string
  confidence: number
  source: string
  selected: boolean
  customContent?: string
  originalContent: string
  isModified: boolean
  priority: 'high' | 'medium' | 'low'
  estimatedSpace: number
  subtopics: EnhancedSubTopic[]
  examples: any[]
}

export interface EnhancedSubTopic {
  id: string
  title: string
  content: string
  priority: 'high' | 'medium' | 'low'
  estimatedSpace: number
  isSelected: boolean
  parentTopicId: string
  confidence: number
}

export class SpaceCalculationService {
  // Base space calculations for different page sizes (in square inches)
  private readonly PAGE_SIZES = {
    a4: { width: 8.27, height: 11.69 },
    letter: { width: 8.5, height: 11 },
    legal: { width: 8.5, height: 14 },
    a3: { width: 11.69, height: 16.54 }
  }

  // Character density estimates per square inch for different font sizes
  private readonly FONT_DENSITIES = {
    small: 180,   // characters per square inch
    medium: 140,  // characters per square inch
    large: 100    // characters per square inch
  }

  // Margin and spacing factors
  private readonly MARGIN_FACTOR = 0.85 // 15% margin
  private readonly COLUMN_SPACING_FACTOR = 0.95 // 5% spacing between columns

  /**
   * Calculate available space for content based on page configuration
   */
  calculateAvailableSpace(constraints: SpaceConstraints): number {
    const pageSize = this.PAGE_SIZES[constraints.pageSize]
    const totalPageArea = pageSize.width * pageSize.height * constraints.availablePages
    const usableArea = totalPageArea * this.MARGIN_FACTOR
    const columnAdjustedArea = usableArea * Math.pow(this.COLUMN_SPACING_FACTOR, constraints.columns - 1)
    const fontDensity = this.FONT_DENSITIES[constraints.fontSize]
    
    return Math.floor(columnAdjustedArea * fontDensity)
  }

  /**
   * Estimate space required for a piece of content
   */
  estimateContentSpace(content: string, constraints: SpaceConstraints): number {
    // Base character count
    let characterCount = content.length
    
    // Add overhead for formatting (headers, bullets, spacing)
    const formattingOverhead = 1.2
    characterCount *= formattingOverhead
    
    // Adjust for column layout (multi-column requires more space due to breaks)
    if (constraints.columns > 1) {
      characterCount *= 1.1
    }
    
    return Math.ceil(characterCount)
  }

  /**
   * Calculate space utilization for selected topics and subtopics
   */
  calculateSpaceUtilization(
    topics: EnhancedTopic[],
    constraints: SpaceConstraints
  ): SpaceUtilizationInfo {
    const totalAvailableSpace = this.calculateAvailableSpace(constraints)
    
    // Calculate used space from selected topics and subtopics
    let usedSpace = 0
    topics.forEach(topic => {
      if (topic.selected) {
        usedSpace += topic.estimatedSpace || this.estimateContentSpace(topic.content, constraints)
        
        topic.subtopics.forEach(subtopic => {
          if (subtopic.isSelected) {
            usedSpace += subtopic.estimatedSpace || this.estimateContentSpace(subtopic.content, constraints)
          }
        })
      }
    })

    const remainingSpace = Math.max(0, totalAvailableSpace - usedSpace)
    const utilizationPercentage = Math.min(1.0, usedSpace / totalAvailableSpace)

    // Generate suggestions
    const suggestions = this.generateSpaceSuggestions(topics, totalAvailableSpace, usedSpace, utilizationPercentage)

    return {
      totalAvailableSpace,
      usedSpace,
      remainingSpace,
      utilizationPercentage,
      suggestions
    }
  }

  /**
   * Generate space utilization suggestions
   */
  private generateSpaceSuggestions(
    topics: EnhancedTopic[],
    totalAvailableSpace: number,
    usedSpace: number,
    utilizationPercentage: number
  ): SpaceSuggestion[] {
    const suggestions: SpaceSuggestion[] = []
    const remainingSpace = totalAvailableSpace - usedSpace
    
    if (utilizationPercentage < 0.7) {
      // Suggest adding more content
      const unselectedTopics = topics.filter(t => !t.selected && t.priority !== 'low')
      if (unselectedTopics.length > 0) {
        const topic = unselectedTopics[0]
        suggestions.push({
          type: 'add_topic',
          targetId: topic.id,
          description: `Consider adding "${topic.topic}" to better utilize available space`,
          spaceImpact: topic.estimatedSpace || topic.content.length * 1.2
        })
      }

      // Suggest adding subtopics from selected topics
      topics.forEach(topic => {
        if (topic.selected) {
          const unselectedSubtopics = topic.subtopics.filter(sub => !sub.isSelected)
          unselectedSubtopics.forEach(subtopic => {
            const estimatedSpace = subtopic.estimatedSpace || subtopic.content.length * 1.1
            if (estimatedSpace <= remainingSpace && suggestions.length < 3) {
              suggestions.push({
                type: 'add_subtopic',
                targetId: subtopic.id,
                description: `Add subtopic "${subtopic.title}" from ${topic.topic}`,
                spaceImpact: estimatedSpace
              })
            }
          })
        }
      })
    } else if (utilizationPercentage > 0.95) {
      // Suggest reducing content
      const lowPriorityTopics = topics.filter(t => t.selected && t.priority === 'low')
      if (lowPriorityTopics.length > 0) {
        const topic = lowPriorityTopics[0]
        suggestions.push({
          type: 'reduce_content',
          targetId: topic.id,
          description: `Consider removing low-priority topic "${topic.topic}" to prevent overflow`,
          spaceImpact: -(topic.estimatedSpace || topic.content.length * 1.2)
        })
      }

      // Suggest removing low-priority subtopics
      topics.forEach(topic => {
        if (topic.selected) {
          const lowPrioritySubtopics = topic.subtopics.filter(sub => sub.isSelected && sub.priority === 'low')
          lowPrioritySubtopics.forEach(subtopic => {
            if (suggestions.length < 3) {
              suggestions.push({
                type: 'reduce_content',
                targetId: subtopic.id,
                description: `Remove low-priority subtopic "${subtopic.title}" to prevent overflow`,
                spaceImpact: -(subtopic.estimatedSpace || subtopic.content.length * 1.1)
              })
            }
          })
        }
      })
    }

    return suggestions.slice(0, 5) // Limit to top 5 suggestions
  }

  /**
   * Auto-fill topics based on priority and available space
   */
  autoFillTopics(
    topics: EnhancedTopic[],
    constraints: SpaceConstraints
  ): {
    recommendedTopics: string[]
    recommendedSubtopics: { topicId: string; subtopicIds: string[] }[]
    utilizationScore: number
  } {
    const availableSpace = this.calculateAvailableSpace(constraints)
    const recommendedTopics: string[] = []
    const recommendedSubtopics: { topicId: string; subtopicIds: string[] }[] = []
    let usedSpace = 0

    // Sort topics by priority (high -> medium -> low)
    const prioritizedTopics = [...topics].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority || 'medium']
      const bPriority = priorityOrder[b.priority || 'medium']
      return bPriority - aPriority
    })

    // First pass: Add high-priority topics
    for (const topic of prioritizedTopics) {
      if (topic.priority === 'high') {
        const topicSpace = topic.estimatedSpace || this.estimateContentSpace(topic.content, constraints)
        if (usedSpace + topicSpace <= availableSpace * 0.9) { // Leave 10% buffer
          recommendedTopics.push(topic.id)
          
          // Add all high-priority subtopics
          const highPrioritySubtopics = topic.subtopics
            .filter(sub => sub.priority === 'high')
            .map(sub => sub.id)
          
          recommendedSubtopics.push({
            topicId: topic.id,
            subtopicIds: highPrioritySubtopics
          })
          
          usedSpace += topicSpace
        }
      }
    }

    // Second pass: Add medium-priority content
    for (const topic of prioritizedTopics) {
      if (topic.priority === 'medium' || !topic.priority) {
        const topicSpace = topic.estimatedSpace || this.estimateContentSpace(topic.content, constraints)
        if (usedSpace + topicSpace <= availableSpace * 0.85) {
          recommendedTopics.push(topic.id)
          
          const mediumPrioritySubtopics = topic.subtopics
            .filter(sub => sub.priority === 'medium' || !sub.priority)
            .map(sub => sub.id)
          
          recommendedSubtopics.push({
            topicId: topic.id,
            subtopicIds: mediumPrioritySubtopics
          })
          
          usedSpace += topicSpace
        }
      }
    }

    // Third pass: Fill remaining space with low-priority content
    const remainingSpace = availableSpace - usedSpace
    if (remainingSpace > 100) { // Only if significant space remains
      for (const topic of prioritizedTopics) {
        if (topic.priority === 'low') {
          const topicSpace = topic.estimatedSpace || this.estimateContentSpace(topic.content, constraints)
          if (topicSpace <= remainingSpace) {
            recommendedTopics.push(topic.id)
            
            const lowPrioritySubtopics = topic.subtopics
              .filter(sub => sub.priority === 'low')
              .map(sub => sub.id)
            
            recommendedSubtopics.push({
              topicId: topic.id,
              subtopicIds: lowPrioritySubtopics
            })
            
            usedSpace += topicSpace
            break // Only add one low-priority topic at a time
          }
        }
      }
    }

    const utilizationScore = usedSpace / availableSpace

    return {
      recommendedTopics,
      recommendedSubtopics,
      utilizationScore: Math.min(utilizationScore, 1.0)
    }
  }
}

// Singleton instance for frontend use
let spaceCalculationService: SpaceCalculationService | null = null

export function getSpaceCalculationService(): SpaceCalculationService {
  if (!spaceCalculationService) {
    spaceCalculationService = new SpaceCalculationService()
  }
  return spaceCalculationService
}

// Utility functions for easy use in components
export function calculateSpaceUtilization(
  topics: EnhancedTopic[],
  config: {
    paperSize: 'a4' | 'letter' | 'legal' | 'a3'
    orientation: 'portrait' | 'landscape'
    columns: 1 | 2 | 3
    fontSize: 'small' | 'medium' | 'large'
    pageCount?: number
  }
): SpaceUtilizationInfo {
  const service = getSpaceCalculationService()
  const constraints: SpaceConstraints = {
    availablePages: config.pageCount || 1,
    targetUtilization: 0.85,
    pageSize: config.paperSize,
    fontSize: config.fontSize,
    columns: config.columns
  }
  
  return service.calculateSpaceUtilization(topics, constraints)
}

export function autoFillTopics(
  topics: EnhancedTopic[],
  config: {
    paperSize: 'a4' | 'letter' | 'legal' | 'a3'
    orientation: 'portrait' | 'landscape'
    columns: 1 | 2 | 3
    fontSize: 'small' | 'medium' | 'large'
    pageCount?: number
  }
) {
  const service = getSpaceCalculationService()
  const constraints: SpaceConstraints = {
    availablePages: config.pageCount || 1,
    targetUtilization: 0.85,
    pageSize: config.paperSize,
    fontSize: config.fontSize,
    columns: config.columns
  }
  
  return service.autoFillTopics(topics, constraints)
}