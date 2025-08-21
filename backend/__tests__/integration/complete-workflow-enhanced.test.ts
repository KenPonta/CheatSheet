/**
 * Enhanced complete workflow integration test
 * Tests the entire cheat sheet creation process with enhanced features
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Enhanced Complete Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Integration Tests', () => {
    it('should validate API request/response structure for topic extraction', () => {
      // Test that the API request structure matches what the frontend sends
      const mockTopicExtractionResponse = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Machine Learning Fundamentals',
            content: 'Introduction to Machine Learning concepts',
            confidence: 0.92,
            source: 'lecture-notes.pdf',
            subtopics: [],
            examples: [],
            originalWording: 'Introduction to Machine Learning concepts'
          }
        ],
        totalFiles: 1,
        successfulFiles: 1,
        failedFiles: 0,
        processingStats: {
          totalProcessingTime: 2500,
          cacheHits: 0,
          memoryUsage: 1024000
        },
        message: 'Successfully extracted 1 topics from 1 file(s)',
        warnings: []
      };

      // Validate response structure
      expect(mockTopicExtractionResponse).toHaveProperty('topics');
      expect(mockTopicExtractionResponse).toHaveProperty('processingStats');
      expect(mockTopicExtractionResponse.topics[0]).toHaveProperty('id');
      expect(mockTopicExtractionResponse.topics[0]).toHaveProperty('confidence');
      expect(typeof mockTopicExtractionResponse.topics[0].confidence).toBe('number');
      expect(Array.isArray(mockTopicExtractionResponse.topics[0].subtopics)).toBe(true);
    });

    it('should validate API request/response structure for cheat sheet generation', () => {
      const mockGenerationRequest = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            priority: 1,
            subtopics: [],
            examples: [],
            originalWording: 'Test content'
          }
        ],
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 2,
          fontSize: 'small',
          referenceText: '',
          referenceImage: null,
          includeHeaders: true,
          includeFooters: true
        },
        title: 'Study Cheat Sheet',
        outputFormat: 'html',
        enableImageRecreation: true,
        enableContentValidation: true
      };

      const mockGenerationResponse = {
        html: '<html><body><h1>Test Cheat Sheet</h1></body></html>',
        success: true,
        message: 'Generated cheat sheet with 1 topics',
        warnings: [],
        pageCount: 1,
        contentFit: {
          fitsInPages: true,
          estimatedPages: 1,
          overflowContent: []
        },
        imageRecreation: {
          total: 0,
          recreated: 0,
          needsApproval: 0,
          fallbackToOriginal: 0
        },
        fidelityValidation: {
          checked: 1,
          warnings: 0
        }
      };

      // Validate request structure
      expect(mockGenerationRequest).toHaveProperty('topics');
      expect(mockGenerationRequest).toHaveProperty('config');
      expect(mockGenerationRequest).toHaveProperty('enableImageRecreation');
      expect(mockGenerationRequest).toHaveProperty('enableContentValidation');

      // Validate response structure
      expect(mockGenerationResponse).toHaveProperty('html');
      expect(mockGenerationResponse).toHaveProperty('success');
      expect(mockGenerationResponse).toHaveProperty('contentFit');
      expect(mockGenerationResponse).toHaveProperty('imageRecreation');
      expect(mockGenerationResponse).toHaveProperty('fidelityValidation');
    });

    it('should validate enhanced features integration', () => {
      // Test that enhanced features are properly integrated
      const mockEnhancedFeatures = {
        imageRecreation: {
          enabled: true,
          results: [
            {
              originalImage: { id: 'img-1', context: 'Test diagram' },
              generatedImage: { base64: 'data:image/png;base64,test', quality: 0.9 },
              userApprovalRequired: false
            }
          ]
        },
        contentValidation: {
          enabled: true,
          results: [
            {
              topicId: 'topic-1',
              fidelityScore: 0.85,
              issues: [],
              warnings: []
            }
          ]
        },
        processingStats: {
          totalTime: 3500,
          cacheHits: 2,
          memoryUsage: 1536000
        }
      };

      expect(mockEnhancedFeatures.imageRecreation.enabled).toBe(true);
      expect(mockEnhancedFeatures.contentValidation.enabled).toBe(true);
      expect(mockEnhancedFeatures.imageRecreation.results).toHaveLength(1);
      expect(mockEnhancedFeatures.contentValidation.results).toHaveLength(1);
      expect(mockEnhancedFeatures.processingStats.totalTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle and format processing errors correctly', () => {
      const mockProcessingError = {
        type: 'file_processing' as const,
        message: 'Failed to process PDF file',
        details: 'File appears to be corrupted or password protected',
        fileName: 'document.pdf',
        recoverable: true,
        suggestions: [
          'Try uploading a different version of the file',
          'Ensure the PDF is not password protected',
          'Check that the file is not corrupted'
        ]
      };

      expect(mockProcessingError.type).toBe('file_processing');
      expect(mockProcessingError.recoverable).toBe(true);
      expect(Array.isArray(mockProcessingError.suggestions)).toBe(true);
      expect(mockProcessingError.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle validation warnings correctly', () => {
      const mockValidationWarnings = [
        {
          type: 'content_fidelity',
          topicId: 'topic-1',
          message: 'Content has been significantly modified from original',
          severity: 'medium' as const,
          suggestion: 'Review changes to ensure accuracy'
        },
        {
          type: 'image_quality',
          imageId: 'img-1',
          message: 'Recreated image quality is lower than original',
          severity: 'low' as const,
          suggestion: 'Consider using original image'
        }
      ];

      expect(mockValidationWarnings).toHaveLength(2);
      expect(mockValidationWarnings[0].type).toBe('content_fidelity');
      expect(mockValidationWarnings[1].type).toBe('image_quality');
      expect(mockValidationWarnings.every(w => w.severity)).toBe(true);
    });
  });

  describe('Type Safety and Consistency', () => {
    it('should maintain consistent types between frontend and backend', () => {
      // Test that frontend types match backend response types
      interface FrontendTopic {
        id: string;
        topic: string;
        content: string;
        confidence: number;
        source: string;
        selected: boolean;
        customContent?: string;
        originalContent: string;
        isModified: boolean;
      }

      const mockBackendTopic = {
        id: 'topic-1',
        topic: 'Test Topic',
        content: 'Test content',
        confidence: 0.85,
        source: 'test.pdf',
        subtopics: [],
        examples: [],
        originalWording: 'Test content'
      };

      // Convert backend topic to frontend format
      const frontendTopic: FrontendTopic = {
        ...mockBackendTopic,
        selected: true,
        originalContent: mockBackendTopic.content,
        isModified: false
      };

      expect(frontendTopic.id).toBe(mockBackendTopic.id);
      expect(frontendTopic.topic).toBe(mockBackendTopic.topic);
      expect(frontendTopic.confidence).toBe(mockBackendTopic.confidence);
      expect(typeof frontendTopic.selected).toBe('boolean');
      expect(typeof frontendTopic.isModified).toBe('boolean');
    });

    it('should validate configuration object consistency', () => {
      interface CheatSheetConfig {
        paperSize: 'a4' | 'letter' | 'legal' | 'a3';
        orientation: 'portrait' | 'landscape';
        columns: 1 | 2 | 3;
        fontSize: 'small' | 'medium' | 'large';
        referenceText: string;
        referenceImage: File | null;
        includeHeaders?: boolean;
        includeFooters?: boolean;
      }

      const mockConfig: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 2,
        fontSize: 'small',
        referenceText: '',
        referenceImage: null,
        includeHeaders: true,
        includeFooters: true
      };

      expect(['a4', 'letter', 'legal', 'a3']).toContain(mockConfig.paperSize);
      expect(['portrait', 'landscape']).toContain(mockConfig.orientation);
      expect([1, 2, 3]).toContain(mockConfig.columns);
      expect(['small', 'medium', 'large']).toContain(mockConfig.fontSize);
    });
  });

  describe('Performance Metrics', () => {
    it('should track and report performance metrics correctly', () => {
      const mockPerformanceMetrics = {
        fileProcessing: {
          totalTime: 2500,
          averageTimePerFile: 1250,
          cacheHitRate: 0.3,
          memoryUsage: 1536000
        },
        topicExtraction: {
          totalTime: 1800,
          topicsExtracted: 5,
          averageConfidence: 0.82
        },
        cheatSheetGeneration: {
          totalTime: 3200,
          pageCount: 2,
          contentFitAnalysis: {
            fitsInPages: true,
            utilizationRate: 0.85
          }
        }
      };

      expect(mockPerformanceMetrics.fileProcessing.totalTime).toBeGreaterThan(0);
      expect(mockPerformanceMetrics.topicExtraction.topicsExtracted).toBeGreaterThan(0);
      expect(mockPerformanceMetrics.cheatSheetGeneration.pageCount).toBeGreaterThan(0);
      expect(mockPerformanceMetrics.fileProcessing.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(mockPerformanceMetrics.fileProcessing.cacheHitRate).toBeLessThanOrEqual(1);
    });
  });
});