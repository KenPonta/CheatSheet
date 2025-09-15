import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { ExtractedImage, ImageContextAnalysis, GeneratedImage } from '../types';

// Mock SimpleImageGenerator
const mockGenerateFlatLineImage = jest.fn();
jest.mock('../simple-image-generator', () => ({
  SimpleImageGenerator: jest.fn().mockImplementation(() => ({
    generateFlatLineImage: mockGenerateFlatLineImage
  }))
}));

// Mock OpenAI client
const mockCreateChatCompletion = jest.fn();
const mockClient = {
  createChatCompletion: mockCreateChatCompletion,
  client: {
    images: {
      generate: jest.fn()
    }
  }
};

jest.mock('../client', () => ({
  getOpenAIClient: () => mockClient
}));

describe('ImageRecreationService', () => {
  let service: any;

  const mockExtractedImage: ExtractedImage = {
    id: 'test-image-1',
    base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    context: 'Mathematical diagram showing quadratic formula derivation',
    isExample: true,
    ocrText: 'x = (-b ± √(b²-4ac)) / 2a'
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Import service after mocks are set up
    const { ImageRecreationService } = await import('../image-recreation-service');
    service = new ImageRecreationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('analyzeImageContext', () => {
    it('should analyze image context and determine flat-line visualization type', async () => {
      const mockAnalysis = {
        needsRecreation: true,
        recreationReason: 'Poor image quality makes formula hard to read',
        contentType: 'equation',
        educationalValue: 'high',
        complexity: 'moderate',
        extractedElements: ['quadratic formula', 'mathematical notation'],
        generationPrompt: 'Clean mathematical formula showing quadratic equation with clear notation'
      };

      mockCreateChatCompletion.mockResolvedValue(JSON.stringify(mockAnalysis));

      const result = await service.analyzeImageContext(mockExtractedImage);

      expect(result.needsRecreation).toBe(true);
      expect(result.contentType).toBe('formula'); // Mapped from 'equation'
      expect(result.educationalValue).toBe('high');
      expect(mockCreateChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('flat-line visualizations')
          })
        ]),
        expect.any(Object)
      );
    });

    it('should return safe defaults when analysis fails', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await service.analyzeImageContext(mockExtractedImage);

      expect(result.needsRecreation).toBe(false);
      expect(result.recreationReason).toBe('Analysis failed');
      expect(result.contentType).toBe('other');
      expect(result.educationalValue).toBe('low');
    });

    it('should handle invalid JSON response gracefully', async () => {
      mockCreateChatCompletion.mockResolvedValue('invalid json');

      const result = await service.analyzeImageContext(mockExtractedImage);

      expect(result.needsRecreation).toBe(false);
      expect(result.contentType).toBe('other');
    });
  });

  describe('generateImage', () => {
    it('should generate image using SimpleImageGenerator', async () => {
      const mockFlatLineImage = {
        id: 'flat-line-123',
        svgContent: '<svg>...</svg>',
        base64: 'data:image/svg+xml;base64,PHN2Zz4uLi48L3N2Zz4=',
        dimensions: { width: 1024, height: 1024 },
        metadata: {
          type: 'equation' as const,
          content: 'Quadratic formula diagram',
          style: {
            lineWeight: 'medium' as const,
            colorScheme: 'monochrome' as const,
            layout: 'horizontal' as const,
            annotations: false
          },
          generatedAt: new Date()
        }
      };

      mockGenerateFlatLineImage.mockResolvedValue(mockFlatLineImage);

      const request = {
        description: 'Quadratic formula diagram',
        style: 'formula' as const,
        context: 'Mathematical education',
        size: '1024x1024' as const,
        quality: 'standard' as const
      };

      const result = await service.generateImage(request);

      expect(result).toMatchObject({
        id: 'flat-line-123',
        url: 'data:image/svg+xml;base64,PHN2Zz4uLi48L3N2Zz4=',
        base64: 'data:image/svg+xml;base64,PHN2Zz4uLi48L3N2Zz4=',
        prompt: 'Quadratic formula diagram',
        style: 'formula',
        metadata: {
          model: 'simple-flat-line-generator',
          size: '1024x1024',
          quality: 'standard',
          flatLineType: 'equation',
          flatLineStyle: expect.any(Object)
        }
      });

      expect(mockGenerateFlatLineImage).toHaveBeenCalledWith({
        type: 'equation',
        content: 'Quadratic formula diagram',
        context: 'Mathematical education',
        style: expect.objectContaining({
          lineWeight: expect.any(String),
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: false
        }),
        dimensions: { width: 1024, height: 1024 }
      });
    });

    it('should create appropriate flat-line styles for different content types', async () => {
      const mockFlatLineImage = {
        id: 'flat-line-456',
        svgContent: '<svg>...</svg>',
        base64: 'data:image/svg+xml;base64,test',
        dimensions: { width: 1024, height: 1024 },
        metadata: {
          type: 'diagram' as const,
          content: 'Flow chart',
          style: {
            lineWeight: 'thin' as const,
            colorScheme: 'monochrome' as const,
            layout: 'grid' as const,
            annotations: true
          },
          generatedAt: new Date()
        }
      };

      mockGenerateFlatLineImage.mockResolvedValue(mockFlatLineImage);

      const diagramRequest = {
        description: 'Flow chart',
        style: 'diagram' as const,
        context: 'Process flow'
      };

      await service.generateImage(diagramRequest);

      const lastCall = mockGenerateFlatLineImage.mock.calls[0][0];
      expect(lastCall.type).toBe('diagram');
      expect(lastCall.style.layout).toBe('grid');
      expect(lastCall.style.colorScheme).toBe('monochrome');
    });

    it('should handle generation failures with retries', async () => {
      mockGenerateFlatLineImage.mockRejectedValue(new Error('Generation failed'));

      const request = {
        description: 'Test image',
        style: 'diagram' as const,
        context: 'Test context'
      };

      await expect(service.generateImage(request)).rejects.toThrow('Flat-line image generation failed');
    });
  });

  describe('assessImageQuality', () => {
    it('should assess quality of original and recreated flat-line images', async () => {
      const mockAssessment = {
        originalScore: 0.6,
        recreatedScore: 0.85,
        recommendation: 'use_recreated',
        factors: {
          clarity: 0.8,
          relevance: 0.9,
          accuracy: 0.85,
          readability: 0.8
        },
        issues: [{
          type: 'clarity',
          severity: 'low',
          description: 'Original image has slight blur',
          suggestion: 'Flat-line version has better contrast'
        }]
      };

      mockCreateChatCompletion.mockResolvedValue(JSON.stringify(mockAssessment));

      const mockGeneratedImage: GeneratedImage = {
        id: 'gen-1',
        url: 'data:image/svg+xml;base64,test',
        base64: 'data:image/svg+xml;base64,test',
        prompt: 'Test prompt',
        style: 'formula',
        generationTime: 1000,
        metadata: {
          model: 'simple-flat-line-generator',
          size: '1024x1024',
          quality: 'standard',
          flatLineType: 'equation'
        }
      };

      const result = await service.assessImageQuality(mockExtractedImage, mockGeneratedImage);

      expect(result).toEqual(mockAssessment);
      expect(result.originalScore).toBeGreaterThanOrEqual(0);
      expect(result.originalScore).toBeLessThanOrEqual(1);
      expect(result.recreatedScore).toBeGreaterThanOrEqual(0);
      expect(result.recreatedScore).toBeLessThanOrEqual(1);
    });

    it('should return conservative assessment when analysis fails', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('Analysis failed'));

      const result = await service.assessImageQuality(mockExtractedImage);

      expect(result.recommendation).toBe('use_original');
      expect(result.originalScore).toBe(0.7);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].description).toContain('Quality assessment failed');
    });
  });

  describe('recreateImage', () => {
    it('should complete full recreation pipeline with flat-line generation', async () => {
      // Mock context analysis
      const mockAnalysis: ImageContextAnalysis = {
        needsRecreation: true,
        recreationReason: 'Poor quality',
        contentType: 'formula',
        educationalValue: 'high',
        complexity: 'moderate',
        extractedElements: ['formula'],
        generationPrompt: 'Clean formula diagram'
      };

      // Mock flat-line image generation
      const mockFlatLineImage = {
        id: 'flat-line-789',
        svgContent: '<svg>...</svg>',
        base64: 'data:image/svg+xml;base64,test',
        dimensions: { width: 1024, height: 1024 },
        metadata: {
          type: 'equation' as const,
          content: 'Clean formula diagram',
          style: {
            lineWeight: 'medium' as const,
            colorScheme: 'monochrome' as const,
            layout: 'horizontal' as const,
            annotations: false
          },
          generatedAt: new Date()
        }
      };

      // Mock quality assessment
      const mockAssessment = {
        originalScore: 0.6,
        recreatedScore: 0.85,
        recommendation: 'use_recreated',
        factors: { clarity: 0.8, relevance: 0.9, accuracy: 0.85, readability: 0.8 },
        issues: []
      };

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify(mockAnalysis))
        .mockResolvedValueOnce(JSON.stringify(mockAssessment));
      
      mockGenerateFlatLineImage.mockResolvedValue(mockFlatLineImage);

      const result = await service.recreateImage(mockExtractedImage);

      expect(result.originalImage).toBe(mockExtractedImage);
      expect(result.generatedImage).toBeDefined();
      expect(result.generatedImage?.metadata.model).toBe('simple-flat-line-generator');
      expect(result.qualityAssessment.recommendation).toBe('use_recreated');
      expect(result.userApprovalRequired).toBe(true); // High educational value requires approval
      expect(result.fallbackToOriginal).toBe(false);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should fallback to original when recreation is not needed', async () => {
      const mockAnalysis: ImageContextAnalysis = {
        needsRecreation: false,
        recreationReason: 'Image quality is sufficient',
        contentType: 'other',
        educationalValue: 'low',
        complexity: 'simple',
        extractedElements: []
      };

      const mockAssessment = {
        originalScore: 0.8,
        recreatedScore: 0,
        recommendation: 'use_original',
        factors: { clarity: 0.8, relevance: 0.8, accuracy: 0.8, readability: 0.8 },
        issues: []
      };

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify(mockAnalysis))
        .mockResolvedValueOnce(JSON.stringify(mockAssessment));

      const result = await service.recreateImage(mockExtractedImage);

      expect(result.generatedImage).toBeUndefined();
      expect(result.fallbackToOriginal).toBe(true);
      expect(result.userApprovalRequired).toBe(false);
    });

    it('should handle generation failures gracefully', async () => {
      const mockAnalysis: ImageContextAnalysis = {
        needsRecreation: true,
        recreationReason: 'Poor quality',
        contentType: 'formula',
        educationalValue: 'medium',
        complexity: 'moderate',
        extractedElements: ['formula'],
        generationPrompt: 'Clean formula'
      };

      mockCreateChatCompletion.mockResolvedValue(JSON.stringify(mockAnalysis));
      mockGenerateFlatLineImage.mockRejectedValue(new Error('Generation failed'));

      const result = await service.recreateImage(mockExtractedImage);

      expect(result.generatedImage).toBeUndefined();
      expect(result.fallbackToOriginal).toBe(true);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recreateImages', () => {
    it('should process multiple images in batch', async () => {
      const images = [
        { ...mockExtractedImage, id: 'img-1' },
        { ...mockExtractedImage, id: 'img-2' }
      ];

      // Mock responses for both images
      const mockAnalysis = {
        needsRecreation: false,
        recreationReason: 'Good quality',
        contentType: 'other',
        educationalValue: 'low',
        complexity: 'simple',
        extractedElements: []
      };

      const mockAssessment = {
        originalScore: 0.8,
        recreatedScore: 0,
        recommendation: 'use_original',
        factors: { clarity: 0.8, relevance: 0.8, accuracy: 0.8, readability: 0.8 },
        issues: []
      };

      mockCreateChatCompletion
        .mockResolvedValueOnce(JSON.stringify(mockAnalysis))
        .mockResolvedValueOnce(JSON.stringify(mockAssessment))
        .mockResolvedValueOnce(JSON.stringify(mockAnalysis))
        .mockResolvedValueOnce(JSON.stringify(mockAssessment));

      const results = await service.recreateImages(images);

      expect(results).toHaveLength(2);
      expect(results[0].originalImage.id).toBe('img-1');
      expect(results[1].originalImage.id).toBe('img-2');
    });

    it('should handle individual image failures in batch', async () => {
      const images = [mockExtractedImage];

      // Mock analysis to throw error
      mockCreateChatCompletion.mockRejectedValue(new Error('Analysis failed'));

      const results = await service.recreateImages(images);

      expect(results).toHaveLength(1);
      expect(results[0].fallbackToOriginal).toBe(true);
    });
  });

  describe('createApprovalWorkflow', () => {
    it('should create approval workflow from recreation result', () => {
      const mockResult = {
        originalImage: mockExtractedImage,
        generatedImage: {
          id: 'gen-1',
          url: 'data:image/svg+xml;base64,test',
          base64: 'data:image/svg+xml;base64,test',
          prompt: 'Test prompt',
          style: 'formula',
          generationTime: 1000,
          metadata: {
            model: 'simple-flat-line-generator',
            size: '1024x1024',
            quality: 'standard',
            flatLineType: 'equation'
          }
        },
        qualityAssessment: {
          originalScore: 0.6,
          recreatedScore: 0.85,
          recommendation: 'use_recreated' as const,
          factors: { clarity: 0.8, relevance: 0.9, accuracy: 0.85, readability: 0.8 },
          issues: []
        },
        userApprovalRequired: true,
        fallbackToOriginal: false,
        processingTime: 1000
      };

      const workflow = service.createApprovalWorkflow(mockResult);

      expect(workflow.imageId).toBe(mockExtractedImage.id);
      expect(workflow.originalImage).toBe(mockExtractedImage);
      expect(workflow.recreatedImage).toBe(mockResult.generatedImage);
      expect(workflow.qualityAssessment).toBe(mockResult.qualityAssessment);
      expect(workflow.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('private methods', () => {
    it('should map content types to flat-line types correctly', () => {
      // Access private method through any casting for testing
      const mapToFlatLineType = (service as any).mapToFlatLineType;
      
      expect(mapToFlatLineType('equation')).toBe('formula');
      expect(mapToFlatLineType('concept')).toBe('diagram');
      expect(mapToFlatLineType('example')).toBe('example');
      expect(mapToFlatLineType('unknown')).toBe('other');
    });

    it('should map styles to flat-line types correctly', () => {
      const mapStyleToFlatLineType = (service as any).mapStyleToFlatLineType;
      
      expect(mapStyleToFlatLineType('formula')).toBe('equation');
      expect(mapStyleToFlatLineType('diagram')).toBe('diagram');
      expect(mapStyleToFlatLineType('example')).toBe('example');
      expect(mapStyleToFlatLineType('illustration')).toBe('concept');
    });

    it('should create appropriate flat-line styles', () => {
      const createFlatLineStyle = (service as any).createFlatLineStyle;
      
      const diagramStyle = createFlatLineStyle('diagram', 'hd');
      expect(diagramStyle.layout).toBe('grid');
      expect(diagramStyle.lineWeight).toBe('medium');
      
      const exampleStyle = createFlatLineStyle('example', 'standard');
      expect(exampleStyle.layout).toBe('vertical');
      expect(exampleStyle.annotations).toBe(true);
      expect(exampleStyle.lineWeight).toBe('thin');
      
      const formulaStyle = createFlatLineStyle('formula');
      expect(formulaStyle.layout).toBe('horizontal');
      expect(formulaStyle.annotations).toBe(false);
    });

    it('should map sizes to flat-line dimensions correctly', () => {
      const mapSizeToFlatLineDimensions = (service as any).mapSizeToFlatLineDimensions;
      
      expect(mapSizeToFlatLineDimensions('512x512')).toEqual({ width: 512, height: 512 });
      expect(mapSizeToFlatLineDimensions('1024x1024')).toEqual({ width: 1024, height: 1024 });
      expect(mapSizeToFlatLineDimensions('1024x1792')).toEqual({ width: 1024, height: 1792 });
      expect(mapSizeToFlatLineDimensions()).toEqual({ width: 1024, height: 1024 }); // default
    });

    it('should select optimal size based on complexity', () => {
      const selectSize = (service as any).selectOptimalSize;
      
      expect(selectSize('simple')).toBe('1024x1024');
      expect(selectSize('moderate')).toBe('1024x1024');
      expect(selectSize('complex')).toBe('1024x1792');
    });

    it('should determine user approval requirements correctly', () => {
      const requiresApproval = (service as any).requiresUserApproval;
      
      // High educational value requires approval
      const highValueAssessment = {
        originalScore: 0.8,
        recreatedScore: 0.9,
        recommendation: 'use_recreated',
        factors: { clarity: 0.9, relevance: 0.9, accuracy: 0.9, readability: 0.9 },
        issues: []
      };
      
      const highValueAnalysis = { educationalValue: 'high' };
      expect(requiresApproval(highValueAssessment, highValueAnalysis)).toBe(true);
      
      // Needs review recommendation requires approval
      const reviewAssessment = { ...highValueAssessment, recommendation: 'needs_review' };
      const lowValueAnalysis = { educationalValue: 'low' };
      expect(requiresApproval(reviewAssessment, lowValueAnalysis)).toBe(true);
      
      // High severity issues require approval
      const issueAssessment = {
        ...highValueAssessment,
        recommendation: 'use_recreated',
        issues: [{ severity: 'high', type: 'accuracy', description: 'Major issue' }]
      };
      expect(requiresApproval(issueAssessment, lowValueAnalysis)).toBe(true);
      
      // Low quality recreated image requires approval
      const lowQualityAssessment = {
        originalScore: 0.8,
        recreatedScore: 0.5, // Significantly lower
        recommendation: 'use_recreated',
        factors: { clarity: 0.5, relevance: 0.5, accuracy: 0.5, readability: 0.5 },
        issues: []
      };
      expect(requiresApproval(lowQualityAssessment, lowValueAnalysis)).toBe(true);
      
      // Normal case should not require approval
      const normalAssessment = {
        originalScore: 0.7,
        recreatedScore: 0.8,
        recommendation: 'use_recreated',
        factors: { clarity: 0.8, relevance: 0.8, accuracy: 0.8, readability: 0.8 },
        issues: []
      };
      expect(requiresApproval(normalAssessment, lowValueAnalysis)).toBe(false);
    });
  });
});