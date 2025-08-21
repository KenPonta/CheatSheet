// AI service fallback mechanisms for error recovery

import { OrganizedTopic } from '../ai/types';
import { ExtractedContent } from '../file-processing/types';

export interface AIFallbackResult {
  success: boolean;
  topics: OrganizedTopic[];
  method: 'primary' | 'fallback' | 'basic';
  confidence: number;
  warnings: string[];
}

export interface BasicTopicExtractionOptions {
  maxTopics?: number;
  minConfidence?: number;
  includeKeywords?: boolean;
  preserveStructure?: boolean;
}

export class AIFallbackService {
  private static instance: AIFallbackService;

  static getInstance(): AIFallbackService {
    if (!AIFallbackService.instance) {
      AIFallbackService.instance = new AIFallbackService();
    }
    return AIFallbackService.instance;
  }

  /**
   * Extract topics with fallback mechanisms
   */
  async extractTopicsWithFallback(
    content: ExtractedContent[],
    options: BasicTopicExtractionOptions = {}
  ): Promise<AIFallbackResult> {
    const warnings: string[] = [];

    try {
      // Try primary AI service first (this would be the actual GPT-5 call)
      const primaryResult = await this.tryPrimaryAIService(content);
      if (primaryResult.success) {
        return {
          success: true,
          topics: primaryResult.topics,
          method: 'primary',
          confidence: 0.9,
          warnings
        };
      }
      warnings.push('Primary AI service unavailable, using fallback method');
    } catch (error) {
      warnings.push(`Primary AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Try alternative AI service or local model
      const fallbackResult = await this.tryFallbackAIService(content);
      if (fallbackResult.success) {
        return {
          success: true,
          topics: fallbackResult.topics,
          method: 'fallback',
          confidence: 0.7,
          warnings
        };
      }
      warnings.push('Fallback AI service unavailable, using basic extraction');
    } catch (error) {
      warnings.push(`Fallback AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Use basic rule-based extraction as last resort
    const basicResult = await this.basicTopicExtraction(content, options);
    warnings.push('Using basic rule-based topic extraction');

    return {
      success: true,
      topics: basicResult,
      method: 'basic',
      confidence: 0.5,
      warnings
    };
  }

  /**
   * Primary AI service call (placeholder for actual GPT-5 integration)
   */
  private async tryPrimaryAIService(content: ExtractedContent[]): Promise<{ success: boolean; topics: OrganizedTopic[] }> {
    // This would be replaced with actual GPT-5 API call
    // For now, simulate a service that might fail
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('AI service temporarily unavailable');
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Return mock result - in real implementation, this would be actual AI processing
    return {
      success: true,
      topics: [] // Would contain actual AI-extracted topics
    };
  }

  /**
   * Fallback AI service (could be a different model or local processing)
   */
  private async tryFallbackAIService(content: ExtractedContent[]): Promise<{ success: boolean; topics: OrganizedTopic[] }> {
    // This could be a different AI service, local model, or simplified processing
    // For now, simulate a more reliable but less sophisticated service
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Fallback service unavailable');
    }

    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      success: true,
      topics: [] // Would contain fallback AI-extracted topics
    };
  }

  /**
   * Basic rule-based topic extraction as final fallback
   */
  private async basicTopicExtraction(
    content: ExtractedContent[],
    options: BasicTopicExtractionOptions = {}
  ): Promise<OrganizedTopic[]> {
    const {
      maxTopics = 10,
      minConfidence = 0.3,
      includeKeywords = true,
      preserveStructure = true
    } = options;

    const topics: OrganizedTopic[] = [];

    for (const fileContent of content) {
      // Extract topics from document structure
      if (preserveStructure && fileContent.structure.headings.length > 0) {
        const structureTopics = this.extractFromStructure(fileContent);
        topics.push(...structureTopics);
      }

      // Extract topics from text patterns
      const patternTopics = this.extractFromPatterns(fileContent.text, fileContent.metadata.name);
      topics.push(...patternTopics);

      // Extract topics from tables if present
      if (fileContent.tables.length > 0) {
        const tableTopics = this.extractFromTables(fileContent.tables, fileContent.metadata.name);
        topics.push(...tableTopics);
      }

      // Extract topics from images with OCR text
      if (fileContent.images.length > 0) {
        const imageTopics = this.extractFromImages(fileContent.images, fileContent.metadata.name);
        topics.push(...imageTopics);
      }
    }

    // Merge similar topics and filter by confidence
    const mergedTopics = this.mergeAndFilterTopics(topics, minConfidence);

    // Limit to max topics
    return mergedTopics.slice(0, maxTopics);
  }

  /**
   * Extract topics from document structure (headings)
   */
  private extractFromStructure(content: ExtractedContent): OrganizedTopic[] {
    const topics: OrganizedTopic[] = [];

    for (const heading of content.structure.headings) {
      if (heading.text && heading.text.length > 3 && heading.text.length < 100) {
        topics.push({
          id: `structure-${heading.level}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: heading.text,
          content: this.extractContentAroundHeading(content.text, heading.text),
          subtopics: [],
          sourceFiles: [content.metadata.name],
          confidence: Math.max(0.7 - (heading.level - 1) * 0.1, 0.4),
          examples: [],
          originalWording: heading.text
        });
      }
    }

    return topics;
  }

  /**
   * Extract content around a heading
   */
  private extractContentAroundHeading(fullText: string, heading: string): string {
    const headingIndex = fullText.indexOf(heading);
    if (headingIndex === -1) return heading;

    const start = headingIndex;
    const nextHeadingPattern = /\n\s*[A-Z][^.!?]*\n/g;
    nextHeadingPattern.lastIndex = start + heading.length;
    const nextMatch = nextHeadingPattern.exec(fullText);
    
    const end = nextMatch ? nextMatch.index : Math.min(start + 500, fullText.length);
    const content = fullText.substring(start, end).trim();
    
    return content.length > 50 ? content : heading;
  }

  /**
   * Extract topics using text patterns
   */
  private extractFromPatterns(text: string, fileName: string): OrganizedTopic[] {
    const topics: OrganizedTopic[] = [];

    // Common academic/professional topic patterns
    const patterns = [
      { pattern: /\b(introduction|overview|summary)\b[^.!?]*[.!?]/gi, topic: "Introduction & Overview" },
      { pattern: /\b(method|methodology|approach|process)\b[^.!?]*[.!?]/gi, topic: "Methods & Processes" },
      { pattern: /\b(result|finding|outcome|conclusion)\b[^.!?]*[.!?]/gi, topic: "Results & Conclusions" },
      { pattern: /\b(definition|concept|theory|principle)\b[^.!?]*[.!?]/gi, topic: "Key Concepts" },
      { pattern: /\b(formula|equation|calculation)\b[^.!?]*[.!?]/gi, topic: "Formulas & Calculations" },
      { pattern: /\b(example|case study|illustration)\b[^.!?]*[.!?]/gi, topic: "Examples" },
      { pattern: /\b(advantage|benefit|pro)\b[^.!?]*[.!?]/gi, topic: "Advantages" },
      { pattern: /\b(disadvantage|limitation|con)\b[^.!?]*[.!?]/gi, topic: "Limitations" },
      { pattern: /\b(step|procedure|instruction)\b[^.!?]*[.!?]/gi, topic: "Procedures" },
      { pattern: /\b(important|key|critical|essential)\b[^.!?]*[.!?]/gi, topic: "Key Points" }
    ];

    patterns.forEach(({ pattern, topic }) => {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        const content = matches
          .slice(0, 3)
          .map(match => match[0].trim())
          .join(' ');

        if (content.length > 20) {
          topics.push({
            id: `pattern-${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: topic,
            content,
            subtopics: [],
            sourceFiles: [fileName],
            confidence: Math.min(0.8, 0.4 + matches.length * 0.1),
            examples: [],
            originalWording: content
          });
        }
      }
    });

    return topics;
  }

  /**
   * Extract topics from tables
   */
  private extractFromTables(tables: any[], fileName: string): OrganizedTopic[] {
    const topics: OrganizedTopic[] = [];

    tables.forEach((table, index) => {
      if (table.headers && table.headers.length > 0) {
        const tableContent = `Table with columns: ${table.headers.join(', ')}. Contains ${table.rows?.length || 0} rows of data.`;
        
        topics.push({
          id: `table-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: `Data Table: ${table.headers[0]}`,
          content: tableContent,
          subtopics: [],
          sourceFiles: [fileName],
          confidence: 0.6,
          examples: [],
          originalWording: tableContent
        });
      }
    });

    return topics;
  }

  /**
   * Extract topics from images with OCR text
   */
  private extractFromImages(images: any[], fileName: string): OrganizedTopic[] {
    const topics: OrganizedTopic[] = [];

    images.forEach((image, index) => {
      if (image.ocrText && image.ocrText.length > 10) {
        const confidence = image.ocrConfidence || 0.5;
        
        topics.push({
          id: `image-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: image.context || `Visual Content ${index + 1}`,
          content: image.ocrText,
          subtopics: [],
          sourceFiles: [fileName],
          confidence: Math.min(confidence, 0.7),
          examples: [image],
          originalWording: image.ocrText
        });
      }
    });

    return topics;
  }

  /**
   * Merge similar topics and filter by confidence
   */
  private mergeAndFilterTopics(topics: OrganizedTopic[], minConfidence: number): OrganizedTopic[] {
    // Filter by confidence first
    const filteredTopics = topics.filter(topic => topic.confidence >= minConfidence);

    // Group similar topics by title similarity
    const groups = new Map<string, OrganizedTopic[]>();
    
    filteredTopics.forEach(topic => {
      const normalizedTitle = topic.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundGroup = false;

      for (const [groupKey, group] of groups.entries()) {
        const similarity = this.calculateSimilarity(normalizedTitle, groupKey);
        if (similarity > 0.7) {
          group.push(topic);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        groups.set(normalizedTitle, [topic]);
      }
    });

    // Merge groups and return best topic from each group
    const mergedTopics: OrganizedTopic[] = [];
    
    for (const group of groups.values()) {
      if (group.length === 1) {
        mergedTopics.push(group[0]);
      } else {
        // Merge multiple topics in the same group
        const bestTopic = group.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );

        // Combine content from all topics in group
        const combinedContent = group
          .map(t => t.content)
          .filter((content, index, arr) => arr.indexOf(content) === index)
          .join(' ');

        const combinedSources = Array.from(new Set(
          group.flatMap(t => t.sourceFiles)
        ));

        mergedTopics.push({
          ...bestTopic,
          content: combinedContent.length > bestTopic.content.length ? combinedContent : bestTopic.content,
          sourceFiles: combinedSources,
          confidence: Math.min(bestTopic.confidence + 0.1, 0.9)
        });
      }
    }

    return mergedTopics.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Test fallback mechanisms
   */
  async testFallbacks(): Promise<{
    primaryAvailable: boolean;
    fallbackAvailable: boolean;
    basicWorking: boolean;
  }> {
    const testContent: ExtractedContent[] = [{
      text: "This is a test document with some content for testing fallback mechanisms.",
      images: [],
      tables: [],
      metadata: {
        name: "test.txt",
        size: 100,
        type: "text/plain",
        lastModified: new Date()
      },
      structure: {
        headings: [{ level: 1, text: "Test Heading" }],
        sections: [],
        hierarchy: 1
      }
    }];

    let primaryAvailable = false;
    let fallbackAvailable = false;
    let basicWorking = false;

    try {
      await this.tryPrimaryAIService(testContent);
      primaryAvailable = true;
    } catch (error) {
      // Primary service not available
    }

    try {
      await this.tryFallbackAIService(testContent);
      fallbackAvailable = true;
    } catch (error) {
      // Fallback service not available
    }

    try {
      const result = await this.basicTopicExtraction(testContent);
      basicWorking = result.length > 0;
    } catch (error) {
      // Basic extraction failed
    }

    return {
      primaryAvailable,
      fallbackAvailable,
      basicWorking
    };
  }
}

export const aiFallbackService = AIFallbackService.getInstance();