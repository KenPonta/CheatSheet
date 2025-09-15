import { getOpenAIClient } from './client';
import { PromptTemplates } from './prompts';
import { SimpleImageGenerator, FlatLineImageRequest, FlatLineStyle, ImageDimensions } from './simple-image-generator';
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
  private simpleImageGenerator = new SimpleImageGenerator();
  private maxRetries = 2;

  /**
   * Analyze image context to determine if recreation is needed and appropriate flat-line visualization type
   */
  async analyzeImageContext(image: ExtractedImage): Promise<ImageContextAnalysis> {
    try {
      const prompt = this.createFlatLineAnalysisPrompt(
        image.context,
        image.ocrText || '',
        image.isExample
      );

      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in educational visual content analysis. Determine if images need recreation as simple flat-line visualizations and what type would be most appropriate.'
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
        contentType: this.mapToFlatLineType(parsed.contentType || 'other'),
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
   * Generate a new image using SimpleImageGenerator based on the analysis and context
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const startTime = Date.now();
    
    try {
      // Create flat-line image request
      const flatLineRequest: FlatLineImageRequest = {
        type: this.mapStyleToFlatLineType(request.style),
        content: request.description,
        context: request.context,
        style: this.createFlatLineStyle(request.style, request.quality),
        dimensions: this.mapSizeToFlatLineDimensions(request.size)
      };

      const generatedImage = await this.simpleImageGenerator.generateFlatLineImage(flatLineRequest);

      // Convert to the expected GeneratedImage format for backward compatibility
      return {
        id: generatedImage.id,
        url: generatedImage.base64, // Use base64 as URL for flat-line images
        base64: generatedImage.base64,
        prompt: request.description,
        style: request.style,
        generationTime: Date.now() - startTime,
        metadata: {
          model: 'simple-flat-line-generator',
          size: `${generatedImage.dimensions.width}x${generatedImage.dimensions.height}`,
          quality: request.quality || 'standard',
          revisedPrompt: request.description,
          flatLineType: flatLineRequest.type,
          flatLineStyle: flatLineRequest.style
        }
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(`Flat-line image generation failed: ${error.message}`, {
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
   * Create flat-line analysis prompt for determining visualization type
   */
  private createFlatLineAnalysisPrompt(context: string, ocrText: string, isExample: boolean): string {
    return `
Analyze this educational content to determine if it should be recreated as a simple flat-line visualization:

Context: ${context}
OCR Text: ${ocrText}
Is Example: ${isExample}

Determine:
1. Does this content benefit from a simple flat-line visual representation?
2. What type of flat-line visualization would be most appropriate?
3. What are the key elements that should be visualized?

Available flat-line visualization types:
- equation: Mathematical formulas and equations
- concept: Concept diagrams, flowcharts, hierarchies
- example: Step-by-step problem solutions
- diagram: Generic diagrams and illustrations

Return JSON with:
{
  "needsRecreation": boolean,
  "recreationReason": "string explaining why recreation is beneficial",
  "contentType": "equation|concept|example|diagram|other",
  "educationalValue": "high|medium|low",
  "complexity": "simple|moderate|complex",
  "extractedElements": ["list of key elements to visualize"],
  "generationPrompt": "optimized description for flat-line generation"
}
    `;
  }

  /**
   * Map content type to flat-line visualization type
   */
  private mapToFlatLineType(contentType: string): 'diagram' | 'example' | 'chart' | 'formula' | 'illustration' | 'text' | 'other' {
    const mapping: Record<string, 'diagram' | 'example' | 'chart' | 'formula' | 'illustration' | 'text' | 'other'> = {
      'equation': 'formula',
      'concept': 'diagram',
      'example': 'example',
      'diagram': 'diagram',
      'chart': 'chart',
      'illustration': 'illustration',
      'formula': 'formula',
      'text': 'text'
    };
    
    return mapping[contentType] || 'other';
  }

  /**
   * Map style to flat-line image type
   */
  private mapStyleToFlatLineType(style: string): 'equation' | 'concept' | 'example' | 'diagram' {
    const mapping: Record<string, 'equation' | 'concept' | 'example' | 'diagram'> = {
      'diagram': 'diagram',
      'example': 'example',
      'chart': 'diagram',
      'illustration': 'concept',
      'formula': 'equation'
    };
    
    return mapping[style] || 'diagram';
  }

  /**
   * Create flat-line style based on original request parameters
   */
  private createFlatLineStyle(style: string, quality?: string): FlatLineStyle {
    const baseStyle: FlatLineStyle = {
      lineWeight: quality === 'hd' ? 'medium' : 'thin',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    };

    // Adjust style based on content type
    switch (style) {
      case 'diagram':
        return { ...baseStyle, layout: 'grid' };
      case 'example':
        return { ...baseStyle, layout: 'vertical', annotations: true };
      case 'chart':
        return { ...baseStyle, layout: 'grid', lineWeight: 'medium' };
      case 'formula':
        return { ...baseStyle, layout: 'horizontal', annotations: false };
      default:
        return baseStyle;
    }
  }

  /**
   * Map size to flat-line dimensions
   */
  private mapSizeToFlatLineDimensions(size?: string): ImageDimensions {
    const sizeMapping: Record<string, ImageDimensions> = {
      '256x256': { width: 256, height: 256 },
      '512x512': { width: 512, height: 512 },
      '1024x1024': { width: 1024, height: 1024 },
      '1024x1792': { width: 1024, height: 1792 },
      '1792x1024': { width: 1792, height: 1024 }
    };
    
    return sizeMapping[size || '1024x1024'] || { width: 1024, height: 1024 };
  }



  /**
   * Select optimal image size based on complexity for flat-line generation
   */
  private selectOptimalSize(complexity: string): '1024x1024' | '1024x1792' | '1792x1024' {
    switch (complexity) {
      case 'simple':
        return '1024x1024';
      case 'complex':
        return '1024x1792'; // Taller format for complex diagrams and step-by-step examples
      default:
        return '1024x1024';
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