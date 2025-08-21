import { getAIContentService } from './content-service';
import {
  ExtractedContent,
  TopicExtractionRequest,
  OrganizedTopic,
  SubTopic,
  SourceLocation,
  AIServiceError
} from './types';

export interface TopicAnalysis {
  mainTopics: OrganizedTopic[];
  duplicatesFound: DuplicateGroup[];
  confidenceMetrics: ConfidenceMetrics;
  processingStats: ProcessingStats;
}

export interface DuplicateGroup {
  id: string;
  duplicateTopics: string[]; // Topic IDs
  mergedIntoId: string;
  similarity: number;
  reason: string;
}

export interface ConfidenceMetrics {
  averageConfidence: number;
  highConfidenceTopics: number;
  mediumConfidenceTopics: number;
  lowConfidenceTopics: number;
  totalTopics: number;
}

export interface ProcessingStats {
  totalContentLength: number;
  sourceFileCount: number;
  extractedTopicCount: number;
  finalTopicCount: number;
  processingTimeMs: number;
}

export interface TopicExtractionConfig {
  maxTopics?: number;
  minConfidenceThreshold?: number;
  duplicateSimilarityThreshold?: number;
  preserveOriginalWording?: boolean;
  enableHierarchicalOrganization?: boolean;
}

export class TopicExtractionService {
  private aiService = getAIContentService();
  private defaultConfig: TopicExtractionConfig = {
    maxTopics: 20,
    minConfidenceThreshold: 0.3,
    duplicateSimilarityThreshold: 0.8,
    preserveOriginalWording: true,
    enableHierarchicalOrganization: true
  };

  /**
   * Main method to extract and organize topics from content
   */
  async extractAndOrganizeTopics(
    content: ExtractedContent[],
    userPreferences: TopicExtractionRequest['userPreferences'],
    config: TopicExtractionConfig = {}
  ): Promise<TopicAnalysis> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Step 1: Extract raw topics from content
      const extractionRequest: TopicExtractionRequest = {
        content,
        userPreferences: {
          ...userPreferences,
          maxTopics: userPreferences.maxTopics || finalConfig.maxTopics || 20
        }
      };

      const rawTopics = await this.aiService.extractTopics(extractionRequest);
      
      // Step 2: Analyze content structure for better organization
      const structureAnalysis = this.analyzeContentStructure(content);
      
      // Step 3: Enhance topics with structure information
      const enhancedTopics = this.enhanceTopicsWithStructure(rawTopics, structureAnalysis);
      
      // Step 4: Detect and handle duplicates
      const { uniqueTopics, duplicates } = await this.detectAndMergeDuplicates(
        enhancedTopics,
        finalConfig.duplicateSimilarityThreshold || 0.8
      );
      
      // Step 5: Apply confidence filtering
      const filteredTopics = this.filterByConfidence(
        uniqueTopics,
        finalConfig.minConfidenceThreshold || 0.3
      );
      
      // Step 6: Organize hierarchically if enabled
      const organizedTopics = finalConfig.enableHierarchicalOrganization
        ? await this.organizeHierarchically(filteredTopics)
        : filteredTopics;
      
      // Step 7: Calculate metrics
      const confidenceMetrics = this.calculateConfidenceMetrics(organizedTopics);
      const processingStats: ProcessingStats = {
        totalContentLength: content.reduce((sum, c) => sum + c.text.length, 0),
        sourceFileCount: content.length,
        extractedTopicCount: rawTopics.length,
        finalTopicCount: organizedTopics.length,
        processingTimeMs: Date.now() - startTime
      };

      return {
        mainTopics: organizedTopics,
        duplicatesFound: duplicates,
        confidenceMetrics,
        processingStats
      };
    } catch (error) {
      throw new AIServiceError(
        `Topic extraction and organization failed: ${error.message}`,
        {
          code: 'API_ERROR',
          retryable: true,
          details: { originalError: error, processingTimeMs: Date.now() - startTime }
        }
      );
    }
  }

  /**
   * Analyze content structure to identify patterns and hierarchies
   */
  private analyzeContentStructure(content: ExtractedContent[]): ContentStructureAnalysis {
    const analysis: ContentStructureAnalysis = {
      headingPatterns: [],
      sectionBoundaries: [],
      topicIndicators: [],
      contentDensity: {}
    };

    content.forEach((doc, docIndex) => {
      // Analyze heading patterns
      const headings = doc.structure.headings.sort((a, b) => a.position - b.position);
      headings.forEach(heading => {
        analysis.headingPatterns.push({
          level: heading.level,
          text: heading.text,
          position: heading.position,
          sourceFile: doc.metadata.name,
          docIndex
        });
      });

      // Identify section boundaries
      doc.structure.sections.forEach(section => {
        analysis.sectionBoundaries.push({
          title: section.title,
          startPosition: section.startPosition,
          endPosition: section.endPosition,
          length: section.endPosition - section.startPosition,
          sourceFile: doc.metadata.name,
          docIndex
        });
      });

      // Calculate content density
      analysis.contentDensity[doc.metadata.name] = {
        textLength: doc.text.length,
        imageCount: doc.images.length,
        tableCount: doc.tables.length,
        headingCount: doc.structure.headings.length,
        sectionCount: doc.structure.sections.length
      };
    });

    return analysis;
  }

  /**
   * Enhance topics with structural information from content analysis
   */
  private enhanceTopicsWithStructure(
    topics: OrganizedTopic[],
    structure: ContentStructureAnalysis
  ): OrganizedTopic[] {
    return topics.map(topic => {
      // Find relevant headings for this topic
      const relevantHeadings = structure.headingPatterns.filter(heading =>
        topic.content.toLowerCase().includes(heading.text.toLowerCase()) ||
        heading.text.toLowerCase().includes(topic.title.toLowerCase())
      );

      // Find relevant sections
      const relevantSections = structure.sectionBoundaries.filter(section =>
        topic.content.toLowerCase().includes(section.title.toLowerCase()) ||
        section.title.toLowerCase().includes(topic.title.toLowerCase())
      );

      // Enhance subtopics with better source locations
      const enhancedSubtopics = topic.subtopics.map(subtopic => {
        const matchingHeading = relevantHeadings.find(h =>
          subtopic.content.toLowerCase().includes(h.text.toLowerCase())
        );

        const enhancedSourceLocation: SourceLocation = {
          ...subtopic.sourceLocation,
          section: matchingHeading?.text || subtopic.sourceLocation.section,
          coordinates: matchingHeading ? {
            x: 0,
            y: matchingHeading.position,
            width: 0,
            height: 0
          } : undefined
        };

        return {
          ...subtopic,
          sourceLocation: enhancedSourceLocation
        };
      });

      return {
        ...topic,
        subtopics: enhancedSubtopics
      };
    });
  }

  /**
   * Detect duplicate topics and merge them intelligently
   */
  private async detectAndMergeDuplicates(
    topics: OrganizedTopic[],
    similarityThreshold: number
  ): Promise<{ uniqueTopics: OrganizedTopic[]; duplicates: DuplicateGroup[] }> {
    const duplicates: DuplicateGroup[] = [];
    const uniqueTopics: OrganizedTopic[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < topics.length; i++) {
      if (processedIds.has(topics[i].id)) continue;

      const currentTopic = topics[i];
      const similarTopics: OrganizedTopic[] = [currentTopic];

      // Find similar topics
      for (let j = i + 1; j < topics.length; j++) {
        if (processedIds.has(topics[j].id)) continue;

        const similarity = this.calculateTopicSimilarity(currentTopic, topics[j]);
        if (similarity >= similarityThreshold) {
          similarTopics.push(topics[j]);
          processedIds.add(topics[j].id);
        }
      }

      processedIds.add(currentTopic.id);

      if (similarTopics.length > 1) {
        // Merge similar topics
        const mergedTopic = this.mergeTopics(similarTopics);
        uniqueTopics.push(mergedTopic);

        // Record the duplicate group
        duplicates.push({
          id: `duplicate_group_${duplicates.length}`,
          duplicateTopics: similarTopics.slice(1).map(t => t.id),
          mergedIntoId: mergedTopic.id,
          similarity: similarTopics.reduce((sum, topic, idx) => {
            if (idx === 0) return 0;
            return sum + this.calculateTopicSimilarity(currentTopic, topic);
          }, 0) / (similarTopics.length - 1),
          reason: `Topics merged due to ${Math.round(similarityThreshold * 100)}%+ similarity in content and title`
        });
      } else {
        uniqueTopics.push(currentTopic);
      }
    }

    return { uniqueTopics, duplicates };
  }

  /**
   * Calculate similarity between two topics
   */
  private calculateTopicSimilarity(topic1: OrganizedTopic, topic2: OrganizedTopic): number {
    // Title similarity (weighted 40%)
    const titleSimilarity = this.calculateTextSimilarity(topic1.title, topic2.title);
    
    // Content similarity (weighted 50%)
    const contentSimilarity = this.calculateTextSimilarity(topic1.content, topic2.content);
    
    // Source file overlap (weighted 10%)
    const sourceOverlap = this.calculateSourceOverlap(topic1.sourceFiles, topic2.sourceFiles);

    return (titleSimilarity * 0.4) + (contentSimilarity * 0.5) + (sourceOverlap * 0.1);
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate source file overlap between topics
   */
  private calculateSourceOverlap(sources1: string[], sources2: string[]): number {
    const set1 = new Set(sources1);
    const set2 = new Set(sources2);
    const intersection = new Set([...set1].filter(s => set2.has(s)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Merge multiple similar topics into one comprehensive topic
   */
  private mergeTopics(topics: OrganizedTopic[]): OrganizedTopic {
    const primaryTopic = topics[0];
    
    // Combine content while preserving original wording
    const combinedContent = topics
      .map(t => t.content)
      .filter((content, index, arr) => arr.indexOf(content) === index) // Remove exact duplicates
      .join(' ');

    // Combine original wording
    const combinedOriginalWording = topics
      .map(t => t.originalWording)
      .filter((wording, index, arr) => arr.indexOf(wording) === index)
      .join(' ');

    // Merge source files
    const allSourceFiles = [...new Set(topics.flatMap(t => t.sourceFiles))];

    // Merge subtopics and remove duplicates
    const allSubtopics = topics.flatMap(t => t.subtopics);
    const uniqueSubtopics = this.deduplicateSubtopics(allSubtopics);

    // Calculate average confidence
    const averageConfidence = topics.reduce((sum, t) => sum + t.confidence, 0) / topics.length;

    return {
      ...primaryTopic,
      content: combinedContent,
      originalWording: combinedOriginalWording,
      sourceFiles: allSourceFiles,
      subtopics: uniqueSubtopics,
      confidence: averageConfidence,
      examples: [...new Set(topics.flatMap(t => t.examples))] // Remove duplicate examples
    };
  }

  /**
   * Remove duplicate subtopics
   */
  private deduplicateSubtopics(subtopics: SubTopic[]): SubTopic[] {
    const unique: SubTopic[] = [];
    const seen = new Set<string>();

    for (const subtopic of subtopics) {
      const key = `${subtopic.title.toLowerCase()}_${subtopic.content.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(subtopic);
      }
    }

    return unique;
  }

  /**
   * Filter topics by confidence threshold
   */
  private filterByConfidence(topics: OrganizedTopic[], threshold: number): OrganizedTopic[] {
    return topics.filter(topic => topic.confidence >= threshold);
  }

  /**
   * Organize topics hierarchically using AI
   */
  private async organizeHierarchically(topics: OrganizedTopic[]): Promise<OrganizedTopic[]> {
    if (topics.length <= 1) return topics;

    try {
      return await this.aiService.organizeContent(topics);
    } catch (error) {
      console.warn('Hierarchical organization failed, returning original topics:', error);
      return topics;
    }
  }

  /**
   * Calculate confidence metrics for the extracted topics
   */
  private calculateConfidenceMetrics(topics: OrganizedTopic[]): ConfidenceMetrics {
    if (topics.length === 0) {
      return {
        averageConfidence: 0,
        highConfidenceTopics: 0,
        mediumConfidenceTopics: 0,
        lowConfidenceTopics: 0,
        totalTopics: 0
      };
    }

    const confidences = topics.map(t => t.confidence);
    const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    const highConfidenceTopics = topics.filter(t => t.confidence >= 0.8).length;
    const mediumConfidenceTopics = topics.filter(t => t.confidence >= 0.5 && t.confidence < 0.8).length;
    const lowConfidenceTopics = topics.filter(t => t.confidence < 0.5).length;

    return {
      averageConfidence,
      highConfidenceTopics,
      mediumConfidenceTopics,
      lowConfidenceTopics,
      totalTopics: topics.length
    };
  }
}

// Supporting interfaces
interface ContentStructureAnalysis {
  headingPatterns: HeadingPattern[];
  sectionBoundaries: SectionBoundary[];
  topicIndicators: string[];
  contentDensity: Record<string, ContentDensityMetrics>;
}

interface HeadingPattern {
  level: number;
  text: string;
  position: number;
  sourceFile: string;
  docIndex: number;
}

interface SectionBoundary {
  title: string;
  startPosition: number;
  endPosition: number;
  length: number;
  sourceFile: string;
  docIndex: number;
}

interface ContentDensityMetrics {
  textLength: number;
  imageCount: number;
  tableCount: number;
  headingCount: number;
  sectionCount: number;
}

// Singleton instance
let topicExtractionService: TopicExtractionService | null = null;

export function getTopicExtractionService(): TopicExtractionService {
  if (!topicExtractionService) {
    topicExtractionService = new TopicExtractionService();
  }
  return topicExtractionService;
}