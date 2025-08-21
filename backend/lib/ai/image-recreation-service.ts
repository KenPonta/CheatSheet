import { getOpenAIClient } from './client';
import { PromptTemplates } from './prompts';
import {
  ExtractedImage,
  ImageGenerationRequest,
  GeneratedImage,
  ImageQualityAssessment,
  ImageRecreationResult,
  ImageContextAnalysis,
  UserApprovalWorkflow,
  AIServiceError
} from './types';

export class ImageRecreationService {
  private client = getOpenAIClient();
  private maxRetries = 2;

  /**
   * Analyze image context to determine if recreation is needed
   */
  async analyzeImageContext(image: ExtractedImage): Promise<ImageContextAnalysis> {
    try {
      const prompt = PromptTemplates.createImageRecreationAnalysisPrompt(
        image.context,
        image.ocrText || '',
        image.isExample
      );

      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in educational visual content analysis. Determine if images need recreation for cheat sheets.'
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
        needsRecreation: parsed.needsRecreation || false,
        recreationReason: parsed.recreationReason || '',
        contentType: parsed.contentType || 'other',
        educationalValue: parsed.educationalValue || 'low',
        complexity: parsed.complexity || 'moderate',
        extractedElements: parsed.extractedElements || [],
        generationPrompt: parsed.generationPrompt
      };
    } catch (error) {
      console.warn('Image context analysis failed:', error);
      return {
        needsRecreation: false,
        recreationReason: 'Analysis failed',
        contentType: 'other',
        educationalValue: 'low',
        complexity: 'moderate',
        extractedElements: []
      };
    }
  }

  /**
   * Generate a new image based on the analysis and context
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const startTime = Date.now();
    
    try {
      // Create optimized prompt for DALL-E
      const optimizedPrompt = this.optimizePromptForGeneration(
        request.description,
        request.style,
        request.context
      );

      const response = await this.client.client.images.generate({
        model: 'dall-e-3',
        prompt: optimizedPrompt,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        n: 1,
        response_format: 'url'
      });

      const imageData = response.data[0];
      if (!imageData?.url) {
        throw new AIServiceError('No image generated', {
          code: 'IMAGE_GENERATION_FAILED',
          retryable: true
        });
      }

      // Convert URL to base64 for storage
      const base64 = await this.urlToBase64(imageData.url);

      return {
        id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: imageData.url,
        base64,
        prompt: optimizedPrompt,
        style: request.style,
        generationTime: Date.now() - startTime,
        metadata: {
          model: 'dall-e-3',
          size: request.size || '1024x1024',
          quality: request.quality || 'standard',
          revisedPrompt: imageData.revised_prompt
        }
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Image generation failed: ${error.message}`, {
        code: 'IMAGE_GENERATION_FAILED',
        retryable: true,
        details: error
      });
    }
  }

  /**
   * Assess quality of original vs recreated image
   */
  async assessImageQuality(
    originalImage: ExtractedImage,
    recreatedImage?: GeneratedImage
  ): Promise<ImageQualityAssessment> {
    try {
      const prompt = PromptTemplates.createImageQualityAssessmentPrompt(
        originalImage,
        recreatedImage
      );

      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in visual content quality assessment for educational materials.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 1500,
        responseFormat: { type: 'json_object' }
      });

      const parsed = JSON.parse(response);
      
      return {
        originalScore: Math.max(0, Math.min(1, parsed.originalScore || 0.5)),
        recreatedScore: Math.max(0, Math.min(1, parsed.recreatedScore || 0.5)),
        recommendation: parsed.recommendation || 'needs_review',
        factors: {
          clarity: Math.max(0, Math.min(1, parsed.factors?.clarity || 0.5)),
          relevance: Math.max(0, Math.min(1, parsed.factors?.relevance || 0.5)),
          accuracy: Math.max(0, Math.min(1, parsed.factors?.accuracy || 0.5)),
          readability: Math.max(0, Math.min(1, parsed.factors?.readability || 0.5))
        },
        issues: parsed.issues || []
      };
    } catch (error) {
      console.warn('Image quality assessment failed:', error);
      // Return conservative assessment if analysis fails
      return {
        originalScore: 0.7,
        recreatedScore: recreatedImage ? 0.6 : 0,
        recommendation: 'use_original',
        factors: {
          clarity: 0.7,
          relevance: 0.7,
          accuracy: 0.7,
          readability: 0.7
        },
        issues: [{
          type: 'accuracy',
          severity: 'medium',
          description: 'Quality assessment failed, defaulting to original image'
        }]
      };
    }
  }

  /**
   * Complete image recreation pipeline
   */
  async recreateImage(image: ExtractedImage): Promise<ImageRecreationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Analyze if recreation is needed
      const contextAnalysis = await this.analyzeImageContext(image);
      
      if (!contextAnalysis.needsRecreation) {
        const qualityAssessment = await this.assessImageQuality(image);
        return {
          originalImage: image,
          qualityAssessment,
          userApprovalRequired: false,
          fallbackToOriginal: true,
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Generate new image if needed
      let generatedImage: GeneratedImage | undefined;
      let retryCount = 0;
      
      while (retryCount < this.maxRetries && !generatedImage) {
        try {
          const generationRequest: ImageGenerationRequest = {
            description: contextAnalysis.generationPrompt || image.context,
            style: contextAnalysis.contentType,
            context: image.context,
            originalImage: image,
            size: this.selectOptimalSize(contextAnalysis.complexity),
            quality: contextAnalysis.educationalValue === 'high' ? 'hd' : 'standard'
          };

          generatedImage = await this.generateImage(generationRequest);
        } catch (error) {
          retryCount++;
          if (retryCount >= this.maxRetries) {
            console.warn(`Image generation failed after ${this.maxRetries} attempts:`, error);
            break;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Step 3: Assess quality
      const qualityAssessment = await this.assessImageQuality(image, generatedImage);
      
      // Step 4: Determine if user approval is needed
      const userApprovalRequired = this.requiresUserApproval(qualityAssessment, contextAnalysis);
      
      return {
        originalImage: image,
        generatedImage,
        qualityAssessment,
        userApprovalRequired,
        fallbackToOriginal: !generatedImage || qualityAssessment.recommendation === 'use_original',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Image recreation pipeline failed:', error);
      
      // Fallback to original image with basic quality assessment
      const fallbackAssessment = await this.assessImageQuality(image);
      
      return {
        originalImage: image,
        qualityAssessment: fallbackAssessment,
        userApprovalRequired: false,
        fallbackToOriginal: true,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Process multiple images in batch
   */
  async recreateImages(images: ExtractedImage[]): Promise<ImageRecreationResult[]> {
    const results: ImageRecreationResult[] = [];
    
    // Process images sequentially to avoid rate limits
    for (const image of images) {
      try {
        const result = await this.recreateImage(image);
        results.push(result);
        
        // Small delay between requests to be respectful to API limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to process image ${image.id}:`, error);
        
        // Add failed result with fallback
        const fallbackAssessment = await this.assessImageQuality(image);
        results.push({
          originalImage: image,
          qualityAssessment: fallbackAssessment,
          userApprovalRequired: false,
          fallbackToOriginal: true,
          processingTime: 0
        });
      }
    }
    
    return results;
  }

  /**
   * Create user approval workflow item
   */
  createApprovalWorkflow(result: ImageRecreationResult): UserApprovalWorkflow {
    return {
      imageId: result.originalImage.id,
      originalImage: result.originalImage,
      recreatedImage: result.generatedImage,
      qualityAssessment: result.qualityAssessment,
      timestamp: new Date()
    };
  }

  /**
   * Optimize prompt for DALL-E generation
   */
  private optimizePromptForGeneration(
    description: string,
    style: string,
    context: string
  ): string {
    const stylePrompts = {
      diagram: 'Clean, simple diagram with clear labels and minimal colors. Educational style, black lines on white background.',
      example: 'Clear example problem or solution, step-by-step format, easy to read text and numbers.',
      chart: 'Simple chart or graph with clear axes, labels, and data points. Professional educational style.',
      illustration: 'Simple, clear illustration for educational purposes. Minimal colors, clean lines.',
      formula: 'Mathematical formula or equation, clearly written with proper notation.'
    };

    const basePrompt = `${description}. ${stylePrompts[style] || stylePrompts.diagram}`;
    
    // Add context if it provides useful information
    const contextInfo = context.length > 0 && context.length < 200 
      ? ` Context: ${context}` 
      : '';
    
    return `${basePrompt}${contextInfo}. High contrast, suitable for printing in black and white.`;
  }

  /**
   * Convert image URL to base64
   */
  private async urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.warn('Failed to convert URL to base64:', error);
      return '';
    }
  }

  /**
   * Select optimal image size based on complexity
   */
  private selectOptimalSize(complexity: string): '256x256' | '512x512' | '1024x1024' {
    switch (complexity) {
      case 'simple':
        return '512x512';
      case 'complex':
        return '1024x1024';
      default:
        return '512x512';
    }
  }

  /**
   * Determine if user approval is required
   */
  private requiresUserApproval(
    assessment: ImageQualityAssessment,
    analysis: ImageContextAnalysis
  ): boolean {
    // Require approval for high-value content
    if (analysis.educationalValue === 'high') {
      return true;
    }
    
    // Require approval if quality is questionable
    if (assessment.recommendation === 'needs_review') {
      return true;
    }
    
    // Require approval if there are high-severity issues
    const hasHighSeverityIssues = assessment.issues.some(issue => issue.severity === 'high');
    if (hasHighSeverityIssues) {
      return true;
    }
    
    // Require approval if recreated score is significantly lower than original
    if (assessment.recreatedScore < assessment.originalScore - 0.2) {
      return true;
    }
    
    return false;
  }
}

// Singleton instance
let imageRecreationService: ImageRecreationService | null = null;

export function getImageRecreationService(): ImageRecreationService {
  if (!imageRecreationService) {
    imageRecreationService = new ImageRecreationService();
  }
  return imageRecreationService;
}