/**
 * Image Regeneration Service - Handles regeneration of images with different style options
 * Provides preview functionality and batch processing capabilities
 */

import { SimpleImageGenerator, FlatLineImageRequest, FlatLineStyle, ImageDimensions, GeneratedImage } from './simple-image-generator';
import { getImageRecreationService } from './image-recreation-service';

export interface RegenerationRequest {
  imageId: string;
  newStyle?: FlatLineStyle;
  newContent?: string;
  newContext?: string;
  newDimensions?: ImageDimensions;
  previewOnly?: boolean;
}

export interface BatchRegenerationRequest {
  imageIds: string[];
  style?: FlatLineStyle;
  options?: RegenerationOptions;
}

export interface RegenerationOptions {
  preserveContent?: boolean;
  preserveContext?: boolean;
  preserveDimensions?: boolean;
  qualityLevel?: 'standard' | 'high';
  generatePreview?: boolean;
}

export interface RegenerationResult {
  imageId: string;
  originalImage: GeneratedImage;
  regeneratedImage?: GeneratedImage;
  previewImage?: GeneratedImage;
  success: boolean;
  error?: string;
  processingTime: number;
}

export interface BatchRegenerationResult {
  results: RegenerationResult[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  totalProcessingTime: number;
}

export interface StylePreset {
  name: string;
  description: string;
  style: FlatLineStyle;
  recommendedFor: string[];
}

export interface RegenerationPreview {
  imageId: string;
  previewImage: GeneratedImage;
  estimatedQuality: number;
  styleComparison: StyleComparison;
}

export interface StyleComparison {
  originalStyle: FlatLineStyle;
  newStyle: FlatLineStyle;
  differences: StyleDifference[];
  impact: 'low' | 'medium' | 'high';
}

export interface StyleDifference {
  property: keyof FlatLineStyle;
  originalValue: any;
  newValue: any;
  description: string;
}

export class ImageRegenerationService {
  private simpleImageGenerator: SimpleImageGenerator;
  private imageRecreationService: any;
  private imageCache: Map<string, GeneratedImage> = new Map();
  private previewCache: Map<string, GeneratedImage> = new Map();

  constructor() {
    this.simpleImageGenerator = new SimpleImageGenerator();
    this.imageRecreationService = getImageRecreationService();
  }

  /**
   * Get available style presets for different content types
   */
  getStylePresets(): StylePreset[] {
    return [
      {
        name: 'Clean Minimal',
        description: 'Clean lines with minimal visual elements',
        style: {
          lineWeight: 'thin',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: false
        },
        recommendedFor: ['equation', 'diagram']
      },
      {
        name: 'Bold Educational',
        description: 'Thick lines with annotations for teaching',
        style: {
          lineWeight: 'thick',
          colorScheme: 'monochrome',
          layout: 'vertical',
          annotations: true
        },
        recommendedFor: ['example', 'concept']
      },
      {
        name: 'Balanced Standard',
        description: 'Medium weight lines with selective annotations',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        },
        recommendedFor: ['equation', 'concept', 'example', 'diagram']
      },
      {
        name: 'Colorful Concept',
        description: 'Minimal color with grid layout for complex concepts',
        style: {
          lineWeight: 'medium',
          colorScheme: 'minimal-color',
          layout: 'grid',
          annotations: true
        },
        recommendedFor: ['concept', 'diagram']
      },
      {
        name: 'Step-by-Step',
        description: 'Vertical layout optimized for sequential content',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'vertical',
          annotations: true
        },
        recommendedFor: ['example']
      }
    ];
  }

  /**
   * Generate preview of image with new style options
   */
  async generatePreview(request: RegenerationRequest): Promise<RegenerationPreview> {
    const startTime = Date.now();

    try {
      // Get original image from cache or storage
      const originalImage = await this.getOriginalImage(request.imageId);
      if (!originalImage) {
        throw new Error(`Image with ID ${request.imageId} not found`);
      }

      // Create preview request
      const previewRequest: FlatLineImageRequest = {
        type: this.extractImageType(originalImage),
        content: request.newContent || this.extractContent(originalImage),
        context: request.newContext || this.extractContext(originalImage),
        style: request.newStyle || this.extractStyle(originalImage),
        dimensions: request.newDimensions || originalImage.dimensions
      };

      // Generate preview image
      const previewImage = await this.simpleImageGenerator.generateFlatLineImage(previewRequest);

      // Cache the preview
      const cacheKey = `preview_${request.imageId}_${JSON.stringify(request.newStyle)}`;
      this.previewCache.set(cacheKey, previewImage);

      // Create style comparison
      const styleComparison = this.compareStyles(
        this.extractStyle(originalImage),
        previewRequest.style
      );

      // Estimate quality based on style changes
      const estimatedQuality = this.estimateQuality(styleComparison);

      return {
        imageId: request.imageId,
        previewImage,
        estimatedQuality,
        styleComparison
      };
    } catch (error) {
      throw new Error(`Preview generation failed: ${error.message}`);
    }
  }

  /**
   * Regenerate a single image with new parameters
   */
  async regenerateImage(request: RegenerationRequest): Promise<RegenerationResult> {
    const startTime = Date.now();

    try {
      // Get original image
      const originalImage = await this.getOriginalImage(request.imageId);
      if (!originalImage) {
        throw new Error(`Image with ID ${request.imageId} not found`);
      }

      let regeneratedImage: GeneratedImage | undefined;
      let previewImage: GeneratedImage | undefined;

      // Generate preview if requested
      if (request.previewOnly) {
        const preview = await this.generatePreview(request);
        previewImage = preview.previewImage;
      } else {
        // Create regeneration request
        const regenerationRequest: FlatLineImageRequest = {
          type: this.extractImageType(originalImage),
          content: request.newContent || this.extractContent(originalImage),
          context: request.newContext || this.extractContext(originalImage),
          style: request.newStyle || this.extractStyle(originalImage),
          dimensions: request.newDimensions || originalImage.dimensions
        };

        // Generate new image
        regeneratedImage = await this.simpleImageGenerator.generateFlatLineImage(regenerationRequest);

        // Update cache
        this.imageCache.set(request.imageId, regeneratedImage);
      }

      return {
        imageId: request.imageId,
        originalImage,
        regeneratedImage,
        previewImage,
        success: true,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        imageId: request.imageId,
        originalImage: await this.getOriginalImage(request.imageId)!,
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Regenerate multiple images in batch
   */
  async regenerateImagesBatch(request: BatchRegenerationRequest): Promise<BatchRegenerationResult> {
    const startTime = Date.now();
    const results: RegenerationResult[] = [];

    let successCount = 0;
    let failureCount = 0;

    // Process images sequentially to avoid overwhelming the system
    for (const imageId of request.imageIds) {
      try {
        const regenerationRequest: RegenerationRequest = {
          imageId,
          newStyle: request.style,
          previewOnly: request.options?.generatePreview || false
        };

        const result = await this.regenerateImage(regenerationRequest);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Small delay between requests to prevent system overload
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        const failedResult: RegenerationResult = {
          imageId,
          originalImage: await this.getOriginalImage(imageId)!,
          success: false,
          error: error.message,
          processingTime: 0
        };
        results.push(failedResult);
        failureCount++;
      }
    }

    return {
      results,
      totalProcessed: request.imageIds.length,
      successCount,
      failureCount,
      totalProcessingTime: Date.now() - startTime
    };
  }

  /**
   * Compare two styles and identify differences
   */
  private compareStyles(originalStyle: FlatLineStyle, newStyle: FlatLineStyle): StyleComparison {
    const differences: StyleDifference[] = [];

    // Compare each property
    if (originalStyle.lineWeight !== newStyle.lineWeight) {
      differences.push({
        property: 'lineWeight',
        originalValue: originalStyle.lineWeight,
        newValue: newStyle.lineWeight,
        description: `Line weight changed from ${originalStyle.lineWeight} to ${newStyle.lineWeight}`
      });
    }

    if (originalStyle.colorScheme !== newStyle.colorScheme) {
      differences.push({
        property: 'colorScheme',
        originalValue: originalStyle.colorScheme,
        newValue: newStyle.colorScheme,
        description: `Color scheme changed from ${originalStyle.colorScheme} to ${newStyle.colorScheme}`
      });
    }

    if (originalStyle.layout !== newStyle.layout) {
      differences.push({
        property: 'layout',
        originalValue: originalStyle.layout,
        newValue: newStyle.layout,
        description: `Layout changed from ${originalStyle.layout} to ${newStyle.layout}`
      });
    }

    if (originalStyle.annotations !== newStyle.annotations) {
      differences.push({
        property: 'annotations',
        originalValue: originalStyle.annotations,
        newValue: newStyle.annotations,
        description: `Annotations ${newStyle.annotations ? 'enabled' : 'disabled'}`
      });
    }

    // Determine impact level
    let impact: 'low' | 'medium' | 'high' = 'low';
    if (differences.length >= 3) {
      impact = 'high';
    } else if (differences.length >= 2) {
      impact = 'medium';
    } else if (differences.some(d => d.property === 'layout' || d.property === 'colorScheme')) {
      impact = 'medium';
    }

    return {
      originalStyle,
      newStyle,
      differences,
      impact
    };
  }

  /**
   * Estimate quality based on style changes
   */
  private estimateQuality(styleComparison: StyleComparison): number {
    let baseQuality = 0.8; // Start with good base quality

    // Adjust based on impact level
    switch (styleComparison.impact) {
      case 'low':
        baseQuality += 0.1;
        break;
      case 'medium':
        // No change
        break;
      case 'high':
        baseQuality -= 0.1;
        break;
    }

    // Adjust based on specific changes
    for (const difference of styleComparison.differences) {
      switch (difference.property) {
        case 'lineWeight':
          // Thicker lines generally improve readability
          if (difference.newValue === 'thick') baseQuality += 0.05;
          if (difference.newValue === 'thin') baseQuality -= 0.05;
          break;
        case 'annotations':
          // Annotations generally improve educational value
          if (difference.newValue === true) baseQuality += 0.1;
          if (difference.newValue === false) baseQuality -= 0.05;
          break;
        case 'colorScheme':
          // Minimal color can improve clarity for some content
          if (difference.newValue === 'minimal-color') baseQuality += 0.05;
          break;
      }
    }

    // Ensure quality is within bounds
    return Math.max(0, Math.min(1, baseQuality));
  }

  /**
   * Get original image from cache or storage
   */
  private async getOriginalImage(imageId: string): Promise<GeneratedImage | null> {
    // Check cache first
    if (this.imageCache.has(imageId)) {
      return this.imageCache.get(imageId)!;
    }

    // In a real implementation, this would fetch from storage
    // For now, return a mock image
    return {
      id: imageId,
      svgContent: '<svg></svg>',
      base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      dimensions: { width: 400, height: 300 },
      metadata: {
        type: 'equation',
        content: 'Sample equation',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        },
        generatedAt: new Date()
      }
    };
  }

  /**
   * Extract image type from generated image
   */
  private extractImageType(image: GeneratedImage): 'equation' | 'concept' | 'example' | 'diagram' {
    return image.metadata.type;
  }

  /**
   * Extract content from generated image
   */
  private extractContent(image: GeneratedImage): string {
    return image.metadata.content;
  }

  /**
   * Extract context from generated image
   */
  private extractContext(image: GeneratedImage): string {
    return image.metadata.content; // Fallback to content if no separate context
  }

  /**
   * Extract style from generated image
   */
  private extractStyle(image: GeneratedImage): FlatLineStyle {
    return image.metadata.style;
  }

  /**
   * Clear preview cache
   */
  clearPreviewCache(): void {
    this.previewCache.clear();
  }

  /**
   * Clear image cache
   */
  clearImageCache(): void {
    this.imageCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { imageCache: number; previewCache: number } {
    return {
      imageCache: this.imageCache.size,
      previewCache: this.previewCache.size
    };
  }
}

// Singleton instance
let imageRegenerationService: ImageRegenerationService | null = null;

export function getImageRegenerationService(): ImageRegenerationService {
  if (!imageRegenerationService) {
    imageRegenerationService = new ImageRegenerationService();
  }
  return imageRegenerationService;
}