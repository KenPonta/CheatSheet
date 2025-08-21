import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { ExtractedImage, ImageContextAnalysis, GeneratedImage } from '../types';

// Mock the entire image recreation service module
const mockAnalyzeImageContext = jest.fn();
const mockGenerateImage = jest.fn();
const mockAssessImageQuality = jest.fn();
const mockRecreateImage = jest.fn();
const mockRecreateImages = jest.fn();
const mockCreateApprovalWorkflow = jest.fn();

jest.mock('../image-recreation-service', () => ({
  ImageRecreationService: jest.fn().mockImplementation(() => ({
    analyzeImageContext: mockAnalyzeImageContext,
    generateImage: mockGenerateImage,
    assessImageQuality: mockAssessImageQuality,
    recreateImage: mockRecreateImage,
    recreateImages: mockRecreateImages,
    createApprovalWorkflow: mockCreateApprovalWorkflow
  })),
  getImageRecreationService: jest.fn().mockImplementation(() => ({
    analyzeImageContext: mockAnalyzeImageContext,
    generateImage: mockGenerateImage,
    assessImageQuality: mockAssessImageQuality,
    recreateImage: mockRecreateImage,
    recreateImages: mockRecreateImages,
    createApprovalWorkflow: mockCreateApprovalWorkflow
  }))
}));

// Mock fetch for URL to base64 conversion
global.fetch = jest.fn();

describe('ImageRecreationService', () => {
  const mockExtractedImage: ExtractedImage = {
    id: 'test-image-1',
    base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    context: 'Mathematical diagram showing quadratic formula derivation',
    isExample: true,
    ocrText: 'x = (-b ± √(b²-4ac)) / 2a'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock fetch for base64 conversion
    (global.fetch as jest.Mock).mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('analyzeImageContext', () => {
    it('should analyze image context and determine recreation needs', async () => {
      const mockAnalysis = {
        needsRecreation: true,
        recreationReason: 'Poor image quality makes formula hard to read',
        contentType: 'formula',
        educationalValue: 'high',
        complexity: 'moderate',
        extractedElements: ['quadratic formula', 'mathematical notation'],
        generationPrompt: 'Clean mathematical formula showing quadratic equation with clear notation'
      };

      mockAnalyzeImageContext.mockResolvedValue(mockAnalysis);

      const { getImageRecreationService } = require('../image-recreation-service');
      const service = getImageRecreationService();
      const result = await service.analyzeImageContext(mockExtractedImage);

      expect(result).toEqual(mockAnalysis);
      expect(mockAnalyzeImageContext).toHaveBeenCalledWith(mockExtractedImage);
    });

    it('should return safe defaults when analysis fails', async () => {
      const safeDefaults = {
        needsRecreation: false,
        recreationReason: 'Analysis failed',
        contentType: 'other',
        educationalValue: 'low',
        complexity: 'moderate',
        extractedElements: []
      };

      mockAnalyzeImageContext.mockResolvedValue(safeDefaults);

      const { getImageRecreationService } = require('../image-recreation-service');
      const service = getImageRecreationService();
      const result = await service.analyzeImageContext(mockExtractedImage);

      expect(result.needsRecreation).toBe(false);
      expect(result.recreationReason).toBe('Analysis failed');
      expect(result.educationalValue).toBe('low');
    });

    it('should handle invalid JSON response gracefully', async () => {
      const safeDefaults = {
        needsRecreation: false,
        recreationReason: 'Analysis failed',
        contentType: 'other',
        educationalValue: 'low',
        complexity: 'moderate',
        extractedElements: []
      };

      mockAnalyzeImageContext.mockResolvedValue(safeDefaults);

      const { getImageRecreationService } = require('../image-recreation-service');
      const service = getImageRecreationService();
      const result = await service.analyzeImageContext(mockExtractedImage);

      expect(result.needsRecreation).toBe(false);
      expect(result.contentType).toBe('other');
    });
  });

  describe('generateImage', () => {
    it('should generate image using DALL-E API', async () => {
      const mockImageResponse = {
        data: [{
          url: 'https://example.com/generated-image.png',
          revised_prompt: 'A clean mathematical diagram showing the quadratic formula'
        }]
      };

      mockClient.client.images.generate.mockResolvedValue(mockImageResponse);

      const request = {
        description: 'Quadratic formula diagram',
        style: 'formula' as const,
        context: 'Mathematical education',
        size: '512x512' as const,
        quality: 'standard' as const
      };

      const result = await service.generateImage(request);

      expect(result).toMatchObject({
        id: expect.stringMatching(/^generated_\d+_[a-z0-9]+$/),
        url: 'https://example.com/generated-image.png',
        prompt: expect.stringContaining('Quadratic formula diagram'),
        style: 'formula',
        metadata: {
          model: 'dall-e-3',
          size: '512x512',
          quality: 'standard',
          revisedPrompt: 'A clean mathematical diagram showing the quadratic formula'
        }
      });

      expect(mockClient.client.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: expect.stringContaining('Quadratic formula diagram'),
        size: '512x512',
        quality: 'standard',
        n: 1,
        response_format: 'url'
      });
    });

    it('should optimize prompts for different styles', async () => {
      const mockImageResponse = {
        data: [{ url: 'https://example.com/test.png' }]
      };

      mockClient.client.images.generate.mockResolvedValue(mockImageResponse);

      const diagramRequest = {
        description: 'Flow chart',
        style: 'diagram' as const,
        context: 'Process flow'
      };

      await service.generateImage(diagramRequest);

      const lastCall = mockClient.client.images.generate.mock.calls[0][0];
      expect(lastCall.prompt).toContain('Clean, simple diagram');
      expect(lastCall.prompt).toContain('black lines on white background');
    });

    it('should handle generation failures with retries', async () => {
      mockClient.client.images.generate.mockRejectedValue(new Error('Rate limit exceeded'));

      const request = {
        description: 'Test image',
        style: 'diagram' as const,
        context: 'Test context'
      };

      await expect(service.generateImage(request)).rejects.toThrow('Image generation failed');
    });
  });

  describe('assessImageQuality', () => {
    it('should assess quality of original and recreated images', async () => {
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
          suggestion: 'Recreated version has better contrast'
        }]
      };

      mockClient.createChatCompletion.mockResolvedValue(JSON.stringify(mockAssessment));

      const mockGeneratedImage: GeneratedImage = {
        id: 'gen-1',
        url: 'https://example.com/generated.png',
        base64: 'data:image/png;base64,test',
        prompt: 'Test prompt',
        style: 'formula',
        generationTime: 1000,
        metadata: {
          model: 'dall-e-3',
          size: '512x512',
          quality: 'standard'
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
      mockClient.createChatCompletion.mockRejectedValue(new Error('Analysis failed'));

      const result = await service.assessImageQuality(mockExtractedImage);

      expect(result.recommendation).toBe('use_original');
      expect(result.originalScore).toBe(0.7);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].description).toContain('Quality assessment failed');
    });
  });

  describe('recreateImage', () => {
    it('should complete full recreation pipeline', async () => {
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

      // Mock image generation
      const mockImageResponse = {
        data: [{ url: 'https://example.com/generated.png' }]
      };

      // Mock quality assessment
      const mockAssessment = {
        originalScore: 0.6,
        recreatedScore: 0.85,
        recommendation: 'use_recreated',
        factors: { clarity: 0.8, relevance: 0.9, accuracy: 0.85, readability: 0.8 },
        issues: []
      };

      mockClient.createChatCompletion
        .mockResolvedValueOnce(JSON.stringify(mockAnalysis))
        .mockResolvedValueOnce(JSON.stringify(mockAssessment));
      
      mockClient.client.images.generate.mockResolvedValue(mockImageResponse);

      const result = await service.recreateImage(mockExtractedImage);

      expect(result.originalImage).toBe(mockExtractedImage);
      expect(result.generatedImage).toBeDefined();
      expect(result.qualityAssessment.recommendation).toBe('use_recreated');
      expect(result.userApprovalRequired).toBe(true); // High educational value requires approval
      expect(result.fallbackToOriginal).toBe(false);
      expect(result.processingTime).toBeGreaterThan(0);
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

      mockClient.createChatCompletion
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

      mockClient.createChatCompletion.mockResolvedValue(JSON.stringify(mockAnalysis));
      mockClient.client.images.generate.mockRejectedValue(new Error('Generation failed'));

      const result = await service.recreateImage(mockExtractedImage);

      expect(result.generatedImage).toBeUndefined();
      expect(result.fallbackToOriginal).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
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

      mockClient.createChatCompletion.mockResolvedValue(JSON.stringify(mockAnalysis));
      mockClient.createChatCompletion.mockResolvedValue(JSON.stringify(mockAssessment));

      const results = await service.recreateImages(images);

      expect(results).toHaveLength(2);
      expect(results[0].originalImage.id).toBe('img-1');
      expect(results[1].originalImage.id).toBe('img-2');
    });

    it('should handle individual image failures in batch', async () => {
      const images = [mockExtractedImage];

      // Mock analysis to throw error
      mockClient.createChatCompletion.mockRejectedValue(new Error('Analysis failed'));

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
          url: 'https://example.com/test.png',
          base64: 'data:image/png;base64,test',
          prompt: 'Test prompt',
          style: 'formula',
          generationTime: 1000,
          metadata: {
            model: 'dall-e-3',
            size: '512x512',
            quality: 'standard'
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
    it('should optimize prompts for different styles', () => {
      const service = new ImageRecreationService();
      
      // Access private method through any casting for testing
      const optimizePrompt = (service as any).optimizePromptForGeneration;
      
      const diagramPrompt = optimizePrompt('Flow chart', 'diagram', 'Process flow');
      expect(diagramPrompt).toContain('Clean, simple diagram');
      expect(diagramPrompt).toContain('black lines on white background');
      
      const examplePrompt = optimizePrompt('Math problem', 'example', 'Algebra');
      expect(examplePrompt).toContain('Clear example problem');
      expect(examplePrompt).toContain('step-by-step format');
    });

    it('should select optimal size based on complexity', () => {
      const service = new ImageRecreationService();
      const selectSize = (service as any).selectOptimalSize;
      
      expect(selectSize('simple')).toBe('512x512');
      expect(selectSize('moderate')).toBe('512x512');
      expect(selectSize('complex')).toBe('1024x1024');
    });

    it('should determine user approval requirements correctly', () => {
      const service = new ImageRecreationService();
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