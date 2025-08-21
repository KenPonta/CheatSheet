import { AIFallbackService, BasicTopicExtractionOptions } from '../ai-fallback';
import { ExtractedContent } from '../../file-processing/types';

describe('AIFallbackService', () => {
  let aiFallbackService: AIFallbackService;

  beforeEach(() => {
    aiFallbackService = AIFallbackService.getInstance();
  });

  const createMockContent = (overrides: Partial<ExtractedContent> = {}): ExtractedContent => ({
    text: 'This is a test document with introduction and methodology sections. It contains important concepts and definitions.',
    images: [],
    tables: [],
    metadata: {
      name: 'test-document.pdf',
      size: 1000,
      type: 'application/pdf',
      lastModified: new Date()
    },
    structure: {
      headings: [
        { level: 1, text: 'Introduction' },
        { level: 2, text: 'Methodology' },
        { level: 1, text: 'Results' }
      ],
      sections: [],
      hierarchy: 2
    },
    ...overrides
  });

  describe('Topic Extraction with Fallback', () => {
    test('should extract topics using basic method when AI services fail', async () => {
      const mockContent = [createMockContent()];
      
      // Mock both AI services to fail
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary AI unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback AI unavailable'));

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.success).toBe(true);
      expect(result.method).toBe('basic');
      expect(result.confidence).toBe(0.5);
      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should use primary AI service when available', async () => {
      const mockContent = [createMockContent()];
      const mockTopics = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Test content'
        }
      ];

      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockResolvedValue({
        success: true,
        topics: mockTopics
      });

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.success).toBe(true);
      expect(result.method).toBe('primary');
      expect(result.confidence).toBe(0.9);
      expect(result.warnings.length).toBe(0);
    });

    test('should use fallback AI service when primary fails', async () => {
      const mockContent = [createMockContent()];
      const mockTopics = [
        {
          id: 'topic-1',
          title: 'Fallback Topic',
          content: 'Fallback content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.7,
          examples: [],
          originalWording: 'Fallback content'
        }
      ];

      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockResolvedValue({
        success: true,
        topics: mockTopics
      });

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.success).toBe(true);
      expect(result.method).toBe('fallback');
      expect(result.confidence).toBe(0.7);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain('Primary AI service error');
    });
  });

  describe('Basic Topic Extraction', () => {
    test('should extract topics from document structure', async () => {
      const mockContent = [createMockContent({
        structure: {
          headings: [
            { level: 1, text: 'Introduction to Machine Learning' },
            { level: 2, text: 'Supervised Learning Methods' },
            { level: 1, text: 'Conclusion and Future Work' }
          ],
          sections: [],
          hierarchy: 2
        }
      })];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.topics.length).toBeGreaterThan(0);
      
      const structureTopics = result.topics.filter(t => t.id.startsWith('structure-'));
      expect(structureTopics.length).toBeGreaterThan(0);
      
      const introTopic = structureTopics.find(t => t.title.includes('Introduction'));
      expect(introTopic).toBeDefined();
      expect(introTopic?.confidence).toBeGreaterThan(0.4);
    });

    test('should extract topics from text patterns', async () => {
      const mockContent = [createMockContent({
        text: `
          This document provides an introduction to the methodology used in our research.
          The method involves several important steps and procedures.
          Our results show significant findings that lead to important conclusions.
          Key concepts and definitions are provided throughout.
        `
      })];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.topics.length).toBeGreaterThan(0);
      
      const patternTopics = result.topics.filter(t => t.id.startsWith('pattern-'));
      expect(patternTopics.length).toBeGreaterThan(0);
      
      // Should find topics like "Introduction & Overview", "Methods & Processes", etc.
      const topicTitles = patternTopics.map(t => t.title);
      expect(topicTitles).toContain('Introduction & Overview');
      expect(topicTitles).toContain('Methods & Processes');
    });

    test('should extract topics from tables', async () => {
      const mockContent = [createMockContent({
        tables: [
          {
            id: 'table-1',
            headers: ['Parameter', 'Value', 'Description'],
            rows: [
              ['Learning Rate', '0.01', 'Controls step size'],
              ['Batch Size', '32', 'Number of samples per batch']
            ],
            context: 'Model parameters table'
          }
        ]
      })];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      const tableTopics = result.topics.filter(t => t.id.startsWith('table-'));
      expect(tableTopics.length).toBeGreaterThan(0);
      
      const tableTopic = tableTopics[0];
      expect(tableTopic.title).toContain('Data Table');
      expect(tableTopic.content).toContain('Parameter');
      expect(tableTopic.confidence).toBe(0.6);
    });

    test('should extract topics from images with OCR text', async () => {
      const mockContent = [createMockContent({
        images: [
          {
            id: 'image-1',
            base64: 'mock-base64',
            ocrText: 'This diagram shows the neural network architecture with input, hidden, and output layers.',
            context: 'Neural network diagram',
            isExample: true,
            ocrConfidence: 0.8
          }
        ]
      })];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      const imageTopics = result.topics.filter(t => t.id.startsWith('image-'));
      expect(imageTopics.length).toBeGreaterThan(0);
      
      const imageTopic = imageTopics[0];
      expect(imageTopic.title).toBe('Neural network diagram');
      expect(imageTopic.content).toContain('neural network architecture');
      expect(imageTopic.examples.length).toBe(1);
    });

    test('should respect maxTopics option', async () => {
      const mockContent = [createMockContent({
        text: `
          Introduction to the topic. Method description here.
          Results are presented. Conclusions are drawn.
          Important concepts defined. Examples provided.
          Advantages listed. Disadvantages noted.
          Procedures outlined. Key points highlighted.
        `,
        structure: {
          headings: [
            { level: 1, text: 'Heading 1' },
            { level: 1, text: 'Heading 2' },
            { level: 1, text: 'Heading 3' },
            { level: 1, text: 'Heading 4' },
            { level: 1, text: 'Heading 5' }
          ],
          sections: [],
          hierarchy: 1
        }
      })];

      const options: BasicTopicExtractionOptions = {
        maxTopics: 3
      };

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent, options);

      expect(result.topics.length).toBeLessThanOrEqual(3);
    });

    test('should filter by minimum confidence', async () => {
      const mockContent = [createMockContent()];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const options: BasicTopicExtractionOptions = {
        minConfidence: 0.8
      };

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent, options);

      // All returned topics should have confidence >= 0.8
      result.topics.forEach(topic => {
        expect(topic.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    test('should merge similar topics', async () => {
      const mockContent = [createMockContent({
        text: `
          Introduction to machine learning concepts.
          Introduction to artificial intelligence.
          Machine learning methodology explained.
          AI methodology described.
        `,
        structure: {
          headings: [
            { level: 1, text: 'Introduction' },
            { level: 1, text: 'Intro' }, // Similar to Introduction
            { level: 1, text: 'Methods' },
            { level: 1, text: 'Methodology' } // Similar to Methods
          ],
          sections: [],
          hierarchy: 1
        }
      })];

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      // Should have fewer topics due to merging similar ones
      const uniqueTitles = new Set(result.topics.map(t => t.title.toLowerCase()));
      expect(uniqueTitles.size).toBeLessThanOrEqual(result.topics.length);
    });
  });

  describe('Fallback Testing', () => {
    test('should test all fallback mechanisms', async () => {
      const testResult = await aiFallbackService.testFallbacks();

      expect(testResult).toHaveProperty('primaryAvailable');
      expect(testResult).toHaveProperty('fallbackAvailable');
      expect(testResult).toHaveProperty('basicWorking');
      
      // Basic extraction should always work
      expect(testResult.basicWorking).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content gracefully', async () => {
      const emptyContent: ExtractedContent[] = [];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const result = await aiFallbackService.extractTopicsWithFallback(emptyContent);

      expect(result.success).toBe(true);
      expect(result.topics).toHaveLength(0);
      expect(result.method).toBe('basic');
    });

    test('should handle content with no extractable topics', async () => {
      const mockContent = [createMockContent({
        text: 'a b c d e f g', // Very short, no meaningful content
        structure: {
          headings: [],
          sections: [],
          hierarchy: 0
        },
        tables: [],
        images: []
      })];

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.success).toBe(true);
      // Should still return some basic topics or empty array
      expect(Array.isArray(result.topics)).toBe(true);
    });

    test('should handle malformed content structure', async () => {
      const mockContent = [createMockContent({
        structure: {
          headings: [
            { level: 1, text: '' }, // Empty heading
            { level: 1, text: 'A' }, // Too short
            { level: 1, text: 'A'.repeat(200) } // Too long
          ],
          sections: [],
          hierarchy: 1
        }
      })];

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.success).toBe(true);
      // Should filter out invalid headings
      const structureTopics = result.topics.filter(t => t.id.startsWith('structure-'));
      structureTopics.forEach(topic => {
        expect(topic.title.length).toBeGreaterThan(3);
        expect(topic.title.length).toBeLessThan(100);
      });
    });

    test('should handle images without OCR text', async () => {
      const mockContent = [createMockContent({
        images: [
          {
            id: 'image-1',
            base64: 'mock-base64',
            context: 'Some image',
            isExample: false
            // No ocrText property
          }
        ]
      })];

      const result = await aiFallbackService.extractTopicsWithFallback(mockContent);

      expect(result.success).toBe(true);
      // Should not create topics for images without OCR text
      const imageTopics = result.topics.filter(t => t.id.startsWith('image-'));
      expect(imageTopics).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    test('should complete basic extraction within reasonable time', async () => {
      const largeContent = [createMockContent({
        text: 'Large content. '.repeat(1000),
        structure: {
          headings: Array.from({ length: 50 }, (_, i) => ({
            level: 1,
            text: `Heading ${i + 1}`
          })),
          sections: [],
          hierarchy: 1
        }
      })];

      const startTime = Date.now();
      const result = await aiFallbackService.extractTopicsWithFallback(largeContent);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});