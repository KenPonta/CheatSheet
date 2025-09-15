/**
 * Enhanced error handling for image generation failures with fallbacks
 */

import { FlatLineImageRequest, GeneratedImage, FlatLineStyle, ImageDimensions } from './simple-image-generator';
import { errorService, UserNotification, ProcessingStage } from '../error-handling/error-service';

export interface ImageGenerationError extends Error {
  code: ImageErrorCode;
  severity: 'low' | 'medium' | 'high';
  context: ImageGenerationContext;
  recoverable: boolean;
  fallbackOptions: FallbackOption[];
}

export type ImageErrorCode = 
  | 'CONTENT_PARSING_ERROR'
  | 'SVG_GENERATION_ERROR'
  | 'STYLE_CONFLICT_ERROR'
  | 'DIMENSION_ERROR'
  | 'TEMPLATE_ERROR'
  | 'MATH_RENDERING_ERROR'
  | 'MEMORY_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INVALID_REQUEST_ERROR';

export interface ImageGenerationContext {
  request: FlatLineImageRequest;
  sessionId?: string;
  attemptNumber: number;
  previousErrors: ImageGenerationError[];
  fallbacksUsed: string[];
}

export interface FallbackOption {
  type: 'simplified-style' | 'basic-template' | 'text-only' | 'placeholder' | 'retry-with-timeout';
  description: string;
  automated: boolean;
  priority: number;
  estimatedSuccess: number; // 0-1 probability
  parameters?: any;
}

export interface FallbackImage extends GeneratedImage {
  isFallback: true;
  fallbackType: string;
  originalError: ImageGenerationError;
  userMessage: string;
}

export class ImageGenerationErrorHandler {
  private static instance: ImageGenerationErrorHandler;
  private maxRetries = 3;
  private timeoutMs = 30000; // 30 seconds
  private fallbackCache = new Map<string, FallbackImage>();

  static getInstance(): ImageGenerationErrorHandler {
    if (!ImageGenerationErrorHandler.instance) {
      ImageGenerationErrorHandler.instance = new ImageGenerationErrorHandler();
    }
    return ImageGenerationErrorHandler.instance;
  }

  /**
   * Handle image generation failure with progressive fallback strategy
   */
  async handleGenerationFailure(
    error: Error,
    context: ImageGenerationContext,
    sessionId?: string
  ): Promise<FallbackImage> {
    const imageError = this.createImageGenerationError(error, context);
    
    // Log error for monitoring
    this.logError(imageError, sessionId);
    
    // Determine fallback strategy
    const fallbackOptions = this.determineFallbackOptions(imageError, context);
    
    // Try fallback options in order of priority
    for (const option of fallbackOptions.sort((a, b) => b.priority - a.priority)) {
      try {
        const fallbackImage = await this.executeFallback(option, context, imageError);
        
        // Notify user of fallback
        if (sessionId) {
          this.notifyFallbackUsed(sessionId, option, imageError);
        }
        
        return fallbackImage;
      } catch (fallbackError) {
        console.warn(`Fallback ${option.type} failed:`, fallbackError);
        continue;
      }
    }
    
    // If all fallbacks fail, create a basic placeholder
    return this.createPlaceholderImage(context, imageError);
  }

  /**
   * Create structured image generation error
   */
  private createImageGenerationError(error: Error, context: ImageGenerationContext): ImageGenerationError {
    let code: ImageErrorCode = 'SVG_GENERATION_ERROR';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let recoverable = true;

    // Determine error code and severity based on error message and context
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      code = 'TIMEOUT_ERROR';
      severity = 'medium';
    } else if (error.message.includes('memory') || error.message.includes('MEMORY')) {
      code = 'MEMORY_LIMIT_ERROR';
      severity = 'high';
    } else if (error.message.includes('parse') || error.message.includes('invalid content')) {
      code = 'CONTENT_PARSING_ERROR';
      severity = 'low';
    } else if (error.message.includes('style') || error.message.includes('STYLE')) {
      code = 'STYLE_CONFLICT_ERROR';
      severity = 'low';
    } else if (error.message.includes('dimension') || error.message.includes('size')) {
      code = 'DIMENSION_ERROR';
      severity = 'low';
    } else if (error.message.includes('math') || error.message.includes('equation')) {
      code = 'MATH_RENDERING_ERROR';
      severity = 'medium';
    } else if (error.message.includes('template')) {
      code = 'TEMPLATE_ERROR';
      severity = 'low';
    } else if (error.message.includes('invalid') || error.message.includes('validation')) {
      code = 'INVALID_REQUEST_ERROR';
      severity = 'high';
      recoverable = false;
    }

    const fallbackOptions = this.determineFallbackOptions({
      code,
      severity,
      recoverable
    } as ImageGenerationError, context);

    const imageError = Object.assign(new Error(error.message), {
      code,
      severity,
      context,
      recoverable,
      fallbackOptions,
      name: 'ImageGenerationError'
    }) as ImageGenerationError;

    return imageError;
  }

  /**
   * Determine appropriate fallback options based on error type and context
   */
  private determineFallbackOptions(
    error: ImageGenerationError,
    context: ImageGenerationContext
  ): FallbackOption[] {
    const options: FallbackOption[] = [];
    const { request, attemptNumber, fallbacksUsed } = context;

    switch (error.code) {
      case 'TIMEOUT_ERROR':
        if (attemptNumber < this.maxRetries) {
          options.push({
            type: 'retry-with-timeout',
            description: 'Retry with extended timeout',
            automated: true,
            priority: 8,
            estimatedSuccess: 0.7,
            parameters: { timeoutMs: this.timeoutMs * 2 }
          });
        }
        options.push({
          type: 'simplified-style',
          description: 'Use simplified rendering style',
          automated: true,
          priority: 6,
          estimatedSuccess: 0.8
        });
        break;

      case 'MEMORY_LIMIT_ERROR':
        options.push({
          type: 'simplified-style',
          description: 'Reduce complexity to save memory',
          automated: true,
          priority: 9,
          estimatedSuccess: 0.9,
          parameters: { 
            maxElements: 10,
            simplifiedText: true,
            reducedDimensions: true
          }
        });
        break;

      case 'CONTENT_PARSING_ERROR':
        options.push({
          type: 'basic-template',
          description: 'Use basic template with parsed content',
          automated: true,
          priority: 7,
          estimatedSuccess: 0.8
        });
        options.push({
          type: 'text-only',
          description: 'Create text-based representation',
          automated: true,
          priority: 5,
          estimatedSuccess: 0.95
        });
        break;

      case 'STYLE_CONFLICT_ERROR':
        options.push({
          type: 'simplified-style',
          description: 'Use default style settings',
          automated: true,
          priority: 8,
          estimatedSuccess: 0.9,
          parameters: { useDefaultStyle: true }
        });
        break;

      case 'DIMENSION_ERROR':
        options.push({
          type: 'simplified-style',
          description: 'Use standard dimensions',
          automated: true,
          priority: 8,
          estimatedSuccess: 0.9,
          parameters: { 
            dimensions: { width: 400, height: 300 }
          }
        });
        break;

      case 'MATH_RENDERING_ERROR':
        options.push({
          type: 'basic-template',
          description: 'Use simplified math rendering',
          automated: true,
          priority: 7,
          estimatedSuccess: 0.8,
          parameters: { simplifiedMath: true }
        });
        options.push({
          type: 'text-only',
          description: 'Display equation as formatted text',
          automated: true,
          priority: 6,
          estimatedSuccess: 0.95
        });
        break;

      case 'TEMPLATE_ERROR':
        options.push({
          type: 'basic-template',
          description: 'Use generic template',
          automated: true,
          priority: 8,
          estimatedSuccess: 0.85
        });
        break;

      case 'INVALID_REQUEST_ERROR':
        options.push({
          type: 'text-only',
          description: 'Create text representation of content',
          automated: true,
          priority: 6,
          estimatedSuccess: 0.9
        });
        break;

      default:
        // Generic fallback options
        if (attemptNumber < this.maxRetries && !fallbacksUsed.includes('retry-with-timeout')) {
          options.push({
            type: 'retry-with-timeout',
            description: 'Retry with default settings',
            automated: true,
            priority: 5,
            estimatedSuccess: 0.5
          });
        }
        break;
    }

    // Always add placeholder as last resort
    options.push({
      type: 'placeholder',
      description: 'Use placeholder image',
      automated: true,
      priority: 1,
      estimatedSuccess: 1.0
    });

    // Filter out already used fallbacks (except placeholder)
    return options.filter(option => 
      option.type === 'placeholder' || !fallbacksUsed.includes(option.type)
    );
  }

  /**
   * Execute a specific fallback option
   */
  private async executeFallback(
    option: FallbackOption,
    context: ImageGenerationContext,
    originalError: ImageGenerationError
  ): Promise<FallbackImage> {
    const { request } = context;
    
    switch (option.type) {
      case 'simplified-style':
        return this.createSimplifiedStyleImage(request, option.parameters, originalError);
      
      case 'basic-template':
        return this.createBasicTemplateImage(request, option.parameters, originalError);
      
      case 'text-only':
        return this.createTextOnlyImage(request, originalError);
      
      case 'placeholder':
        return this.createPlaceholderImage(context, originalError);
      
      case 'retry-with-timeout':
        // This would trigger a retry with modified parameters
        throw new Error('Retry fallback should be handled by the caller');
      
      default:
        throw new Error(`Unknown fallback type: ${option.type}`);
    }
  }

  /**
   * Create image with simplified style
   */
  private async createSimplifiedStyleImage(
    request: FlatLineImageRequest,
    parameters: any = {},
    originalError: ImageGenerationError
  ): Promise<FallbackImage> {
    const simplifiedStyle: FlatLineStyle = {
      lineWeight: 'thin',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: false,
      ...request.style,
      ...(parameters.useDefaultStyle ? {} : request.style)
    };

    const dimensions: ImageDimensions = parameters.dimensions || request.dimensions;
    
    // Create a very basic SVG
    const svgContent = this.createBasicSVG(
      request.content,
      request.type,
      dimensions,
      simplifiedStyle,
      parameters
    );

    return this.createFallbackImageResult(
      svgContent,
      dimensions,
      'simplified-style',
      originalError,
      'Generated with simplified styling due to rendering complexity'
    );
  }

  /**
   * Create image using basic template
   */
  private async createBasicTemplateImage(
    request: FlatLineImageRequest,
    parameters: any = {},
    originalError: ImageGenerationError
  ): Promise<FallbackImage> {
    const dimensions = request.dimensions;
    
    let svgContent: string;
    
    switch (request.type) {
      case 'equation':
        svgContent = this.createBasicEquationSVG(request.content, dimensions, parameters);
        break;
      case 'concept':
        svgContent = this.createBasicConceptSVG(request.content, dimensions, parameters);
        break;
      case 'example':
        svgContent = this.createBasicExampleSVG(request.content, dimensions, parameters);
        break;
      default:
        svgContent = this.createBasicDiagramSVG(request.content, dimensions, parameters);
    }

    return this.createFallbackImageResult(
      svgContent,
      dimensions,
      'basic-template',
      originalError,
      'Generated using basic template due to content complexity'
    );
  }

  /**
   * Create text-only representation
   */
  private async createTextOnlyImage(
    request: FlatLineImageRequest,
    originalError: ImageGenerationError
  ): Promise<FallbackImage> {
    const dimensions = request.dimensions;
    const maxCharsPerLine = Math.floor(dimensions.width / 8); // Approximate character width
    const maxLines = Math.floor(dimensions.height / 20); // Approximate line height
    
    // Wrap text to fit dimensions
    const wrappedText = this.wrapText(request.content, maxCharsPerLine, maxLines);
    
    const svgContent = `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="#ccc" stroke-width="1"/>
        <text x="10" y="20" font-family="monospace" font-size="12" fill="#333">
          ${wrappedText.map((line, i) => 
            `<tspan x="10" dy="${i === 0 ? 0 : 16}">${this.escapeXML(line)}</tspan>`
          ).join('')}
        </text>
      </svg>
    `.trim();

    return this.createFallbackImageResult(
      svgContent,
      dimensions,
      'text-only',
      originalError,
      'Displayed as text due to rendering limitations'
    );
  }

  /**
   * Create placeholder image
   */
  private createPlaceholderImage(
    context: ImageGenerationContext,
    originalError: ImageGenerationError
  ): FallbackImage {
    const { request } = context;
    const dimensions = request.dimensions;
    
    const svgContent = `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f5f5f5" stroke="#ddd" stroke-width="2"/>
        <text x="${dimensions.width / 2}" y="${dimensions.height / 2 - 10}" 
              font-family="sans-serif" font-size="14" fill="#666" text-anchor="middle">
          Image Generation Failed
        </text>
        <text x="${dimensions.width / 2}" y="${dimensions.height / 2 + 10}" 
              font-family="sans-serif" font-size="10" fill="#999" text-anchor="middle">
          ${request.type.toUpperCase()} content
        </text>
      </svg>
    `.trim();

    return this.createFallbackImageResult(
      svgContent,
      dimensions,
      'placeholder',
      originalError,
      'Placeholder image - original content could not be rendered'
    );
  }

  /**
   * Create basic SVG with minimal complexity
   */
  private createBasicSVG(
    content: string,
    type: string,
    dimensions: ImageDimensions,
    style: FlatLineStyle,
    parameters: any = {}
  ): string {
    const strokeWidth = style.lineWeight === 'thin' ? 1 : style.lineWeight === 'thick' ? 3 : 2;
    const color = style.colorScheme === 'monochrome' ? '#333' : '#007acc';
    
    let svg = `<svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    
    // Add simple content based on type
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    switch (type) {
      case 'equation':
        svg += `<text x="${centerX}" y="${centerY}" font-family="serif" font-size="16" fill="${color}" text-anchor="middle">${this.escapeXML(content.substring(0, 50))}</text>`;
        break;
      case 'concept':
        svg += `<circle cx="${centerX}" cy="${centerY}" r="30" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        svg += `<text x="${centerX}" y="${centerY + 5}" font-family="sans-serif" font-size="12" fill="${color}" text-anchor="middle">Concept</text>`;
        break;
      case 'example':
        svg += `<rect x="${centerX - 40}" y="${centerY - 20}" width="80" height="40" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        svg += `<text x="${centerX}" y="${centerY + 5}" font-family="sans-serif" font-size="12" fill="${color}" text-anchor="middle">Example</text>`;
        break;
      default:
        svg += `<text x="${centerX}" y="${centerY}" font-family="sans-serif" font-size="14" fill="${color}" text-anchor="middle">Diagram</text>`;
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Create basic equation SVG
   */
  private createBasicEquationSVG(content: string, dimensions: ImageDimensions, parameters: any = {}): string {
    const equation = parameters.simplifiedMath ? 
      content.replace(/[{}\\]/g, '').substring(0, 30) : 
      content.substring(0, 50);
    
    return `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="#eee" stroke-width="1"/>
        <text x="${dimensions.width / 2}" y="${dimensions.height / 2}" 
              font-family="serif" font-size="18" fill="#333" text-anchor="middle">
          ${this.escapeXML(equation)}
        </text>
      </svg>
    `.trim();
  }

  /**
   * Create basic concept SVG
   */
  private createBasicConceptSVG(content: string, dimensions: ImageDimensions, parameters: any = {}): string {
    const title = content.split('\n')[0].substring(0, 20);
    
    return `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="#eee" stroke-width="1"/>
        <circle cx="${dimensions.width / 2}" cy="${dimensions.height / 2}" r="40" 
                fill="none" stroke="#007acc" stroke-width="2"/>
        <text x="${dimensions.width / 2}" y="${dimensions.height / 2 + 5}" 
              font-family="sans-serif" font-size="12" fill="#333" text-anchor="middle">
          ${this.escapeXML(title)}
        </text>
      </svg>
    `.trim();
  }

  /**
   * Create basic example SVG
   */
  private createBasicExampleSVG(content: string, dimensions: ImageDimensions, parameters: any = {}): string {
    const lines = content.split('\n').slice(0, 3);
    
    return `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="#eee" stroke-width="1"/>
        <rect x="20" y="20" width="${dimensions.width - 40}" height="${dimensions.height - 40}" 
              fill="none" stroke="#007acc" stroke-width="1"/>
        ${lines.map((line, i) => 
          `<text x="30" y="${40 + i * 20}" font-family="sans-serif" font-size="11" fill="#333">
            ${this.escapeXML(line.substring(0, 40))}
          </text>`
        ).join('')}
      </svg>
    `.trim();
  }

  /**
   * Create basic diagram SVG
   */
  private createBasicDiagramSVG(content: string, dimensions: ImageDimensions, parameters: any = {}): string {
    return `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="#eee" stroke-width="1"/>
        <rect x="${dimensions.width / 4}" y="${dimensions.height / 4}" 
              width="${dimensions.width / 2}" height="${dimensions.height / 2}" 
              fill="none" stroke="#007acc" stroke-width="2"/>
        <text x="${dimensions.width / 2}" y="${dimensions.height / 2 + 5}" 
              font-family="sans-serif" font-size="12" fill="#333" text-anchor="middle">
          Diagram
        </text>
      </svg>
    `.trim();
  }

  /**
   * Create fallback image result
   */
  private createFallbackImageResult(
    svgContent: string,
    dimensions: ImageDimensions,
    fallbackType: string,
    originalError: ImageGenerationError,
    userMessage: string
  ): FallbackImage {
    const base64 = Buffer.from(svgContent).toString('base64');
    
    return {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      svgContent,
      base64,
      dimensions,
      metadata: {
        type: originalError.context.request.type,
        content: originalError.context.request.content,
        style: originalError.context.request.style,
        generatedAt: new Date()
      },
      isFallback: true,
      fallbackType,
      originalError,
      userMessage
    };
  }

  /**
   * Wrap text to fit within specified dimensions
   */
  private wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (lines.length >= maxLines) break;
      
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, truncate it
          lines.push(word.substring(0, maxCharsPerLine));
        }
      }
    }
    
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(error: ImageGenerationError, sessionId?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      sessionId,
      errorCode: error.code,
      severity: error.severity,
      message: error.message,
      context: {
        requestType: error.context.request.type,
        attemptNumber: error.context.attemptNumber,
        fallbacksUsed: error.context.fallbacksUsed
      }
    };
    
    console.error('Image Generation Error:', logData);
    
    // In a production environment, you would send this to a logging service
    // Example: await loggingService.logError('image-generation', logData);
  }

  /**
   * Notify user about fallback usage
   */
  private notifyFallbackUsed(
    sessionId: string,
    option: FallbackOption,
    error: ImageGenerationError
  ): void {
    const notification: UserNotification = {
      id: `fallback_${Date.now()}`,
      type: 'warning',
      title: 'Image Generation Fallback Used',
      message: `${option.description}. The original image could not be generated due to: ${error.message}`,
      stage: 'ai-processing' as ProcessingStage,
      timestamp: new Date(),
      dismissible: true,
      autoHide: true,
      duration: 8000,
      actions: [
        {
          label: 'Retry Original',
          action: 'retry'
        },
        {
          label: 'Accept Fallback',
          action: 'continue'
        }
      ]
    };
    
    errorService.addNotification(sessionId, notification);
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<ImageErrorCode, number>;
    fallbackSuccessRate: number;
    mostCommonFallbacks: string[];
  } {
    // This would be implemented with proper error tracking
    // For now, return mock data
    return {
      totalErrors: 0,
      errorsByCode: {} as Record<ImageErrorCode, number>,
      fallbackSuccessRate: 0.95,
      mostCommonFallbacks: ['simplified-style', 'text-only', 'basic-template']
    };
  }

  /**
   * Clear fallback cache
   */
  clearCache(): void {
    this.fallbackCache.clear();
  }
}

// Export singleton instance
export const imageErrorHandler = ImageGenerationErrorHandler.getInstance();