import { getOpenAIClient } from './client';
import { PromptTemplates } from './prompts';
import {
  ExtractedContent,
  TopicExtractionRequest,
  OrganizedTopic,
  FidelityScore,
  AIServiceError,
  ExtractedImage
} from './types';

export class AIContentService {
  private client = getOpenAIClient();

  /**
   * Extract topics from content while preserving original wording
   */
  async extractTopics(request: TopicExtractionRequest): Promise<OrganizedTopic[]> {
    try {
      const prompt = PromptTemplates.createTopicExtractionPrompt(request);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert educational content analyzer. Always respond with valid JSON and preserve original wording from source materials.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1, // Low temperature for consistency
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      const parsed = JSON.parse(response);
      
      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        throw new AIServiceError('Invalid response format: missing topics array', {
          code: 'INVALID_RESPONSE',
          retryable: false
        });
      }

      // Validate and clean the extracted topics
      return this.validateAndCleanTopics(parsed.topics, request.content);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Topic extraction failed: ${error.message}`, {
        code: 'API_ERROR',
        retryable: true,
        details: error
      });
    }
  }

  /**
   * Organize topics to eliminate duplicates and create logical structure
   */
  async organizeContent(topics: OrganizedTopic[]): Promise<OrganizedTopic[]> {
    try {
      const prompt = PromptTemplates.createContentOrganizationPrompt(topics);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert content organizer. Eliminate duplicates while preserving all unique information and original wording.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      const parsed = JSON.parse(response);
      
      if (!parsed.organizedTopics || !Array.isArray(parsed.organizedTopics)) {
        throw new AIServiceError('Invalid response format: missing organizedTopics array', {
          code: 'INVALID_RESPONSE',
          retryable: false
        });
      }

      return this.validateAndCleanTopics(parsed.organizedTopics, []);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Content organization failed: ${error.message}`, {
        code: 'API_ERROR',
        retryable: true,
        details: error
      });
    }
  }

  /**
   * Validate content fidelity to ensure no external content is added
   */
  async validateContentFidelity(originalText: string, processedText: string): Promise<FidelityScore> {
    try {
      const prompt = PromptTemplates.createContentValidationPrompt(originalText, processedText);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are a content fidelity validator. Strictly check for added content, changed meanings, and lost context.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' }
      });

      const parsed = JSON.parse(response);
      
      if (typeof parsed.fidelityScore !== 'number' || !parsed.recommendation) {
        throw new AIServiceError('Invalid fidelity validation response format', {
          code: 'INVALID_RESPONSE',
          retryable: false
        });
      }

      return {
        score: Math.max(0, Math.min(1, parsed.fidelityScore)), // Clamp to 0-1
        issues: parsed.issues || [],
        recommendation: parsed.recommendation
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Content validation failed: ${error.message}`, {
        code: 'CONTENT_VALIDATION_FAILED',
        retryable: true,
        details: error
      });
    }
  }

  /**
   * Analyze image context to determine educational value
   */
  async analyzeImageContext(image: ExtractedImage): Promise<{
    isEducational: boolean;
    contentType: string;
    importance: 'high' | 'medium' | 'low';
    description: string;
    includeInCheatSheet: boolean;
    extractedConcepts: string[];
  }> {
    try {
      const prompt = PromptTemplates.createImageContextAnalysisPrompt(
        image.context,
        image.ocrText || ''
      );
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an educational content analyzer specializing in visual materials for study aids.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.2,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' }
      });

      const parsed = JSON.parse(response);
      
      return {
        isEducational: parsed.isEducational || false,
        contentType: parsed.contentType || 'other',
        importance: parsed.importance || 'low',
        description: parsed.description || '',
        includeInCheatSheet: parsed.includeInCheatSheet || false,
        extractedConcepts: parsed.extractedConcepts || []
      };
    } catch (error) {
      // Return safe defaults if analysis fails
      console.warn('Image context analysis failed:', error);
      return {
        isEducational: false,
        contentType: 'other',
        importance: 'low',
        description: 'Analysis failed',
        includeInCheatSheet: false,
        extractedConcepts: []
      };
    }
  }

  /**
   * Recreate visual examples using AI image generation
   */
  async recreateExamples(images: ExtractedImage[]): Promise<{
    originalImage: ExtractedImage;
    recreatedImage?: any;
    shouldUseRecreated: boolean;
    qualityScore: number;
  }[]> {
    // This method provides a simplified interface for backward compatibility
    // The full functionality is available through ImageRecreationService
    const { getImageRecreationService } = await import('./image-recreation-service');
    const imageService = getImageRecreationService();
    
    const results = await imageService.recreateImages(images);
    
    return results.map(result => ({
      originalImage: result.originalImage,
      recreatedImage: result.generatedImage,
      shouldUseRecreated: !result.fallbackToOriginal && result.generatedImage !== undefined,
      qualityScore: result.qualityAssessment.recreatedScore || result.qualityAssessment.originalScore
    }));
  }

  /**
   * Validate and clean extracted topics to ensure data integrity
   */
  private validateAndCleanTopics(topics: any[], sourceContent: ExtractedContent[]): OrganizedTopic[] {
    return topics.map((topic, index) => {
      // Ensure required fields exist
      const cleanTopic: OrganizedTopic = {
        id: topic.id || `topic_${index}`,
        title: this.sanitizeText(topic.title || 'Untitled Topic'),
        content: this.sanitizeText(topic.content || ''),
        originalWording: this.sanitizeText(topic.originalWording || topic.content || ''),
        confidence: Math.max(0, Math.min(1, topic.confidence || 0.5)),
        sourceFiles: Array.isArray(topic.sourceFiles) ? topic.sourceFiles : [],
        subtopics: [],
        examples: []
      };

      // Clean subtopics
      if (Array.isArray(topic.subtopics)) {
        cleanTopic.subtopics = topic.subtopics.map((subtopic, subIndex) => ({
          id: subtopic.id || `${cleanTopic.id}_sub_${subIndex}`,
          title: this.sanitizeText(subtopic.title || 'Untitled Subtopic'),
          content: this.sanitizeText(subtopic.content || ''),
          confidence: Math.max(0, Math.min(1, subtopic.confidence || 0.5)),
          sourceLocation: subtopic.sourceLocation || {
            fileId: 'unknown',
            section: 'unknown'
          }
        }));
      }

      return cleanTopic;
    });
  }

  /**
   * Sanitize text to prevent injection and ensure clean content
   */
  private sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }
    
    // Remove potential HTML/script tags and normalize whitespace
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 5000); // Limit length to prevent excessive content
  }
}

// Singleton instance
let aiContentService: AIContentService | null = null;

export function getAIContentService(): AIContentService {
  if (!aiContentService) {
    aiContentService = new AIContentService();
  }
  return aiContentService;
}