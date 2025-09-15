import { AIContentService } from '../content-service';
import { getOpenAIClient } from '../client';
import { 
  ExtractedContent, 
  TopicExtractionRequest, 
  OrganizedTopic,
  AIServiceError 
} from '../types';

// Mock the OpenAI client
jest.mock('../client');

describe('AIContentService', () => {
  let service: AIContentService;
  let mockClient: jest.Mocked<ReturnType<typeof getOpenAIClient>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      createChatCompletion: jest.fn()
    } as any;
    
    (getOpenAIClient as jest.Mock).mockReturnValue(mockClient);
    service = new AIContentService();
  });

  describe('extractTopics', () => {
    const mockExtractedContent: ExtractedContent = {
      text: 'Sample educational content about mathematics and physics concepts.',
      images: [],
      tables: [],
      metadata: {
        name: 'test-document.pdf',
        size: 1024,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 5,
        wordCount: 100
      },
      structure: {
        headings: [{ level: 1, text: 'Mathematics', position: 0 }],
        sections: [{ title: 'Introduction', content: 'Sample content', startPosition: 0, endPosition: 100 }],
        hierarchy: 1
      }
    };

    const mockRequest: TopicExtractionRequest = {
      content: [mockExtractedContent],
      userPreferences: {
        maxTopics: 10,
        focusAreas: ['mathematics'],
        excludePatterns: []
      }
    };

    it('should extract topics successfully', async () => {
      const mockResponse = JSON.stringify({
        topics: [
          {
            id: 'topic_1',
            title: 'Mathematics Fundamentals',
            content: 'Basic mathematical concepts and formulas',
            originalWording: 'mathematics and physics concepts',
            confidence: 0.95,
            sourceFiles: ['test-document.pdf'],
            subtopics: [
              {
                id: 'subtopic_1',
                title: 'Algebra',
                content: 'Algebraic equations and solutions',
                confidence: 0.90,
                sourceLocation: {
                  fileId: 'test-document.pdf',
                  section: 'Introduction'
                }
              }
            ]
          }
        ]
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.extractTopics(mockRequest);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Mathematics Fundamentals');
      expect(result[0].subtopics).toHaveLength(1);
      expect(result[0].subtopics[0].title).toBe('Algebra');
      
      expect(mockClient.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.objectContaining({
          temperature: 0.1,
          maxTokens: 4000,
          responseFormat: { type: 'json_object' }
        })
      );
    });

    it('should handle invalid JSON response', async () => {
      mockClient.createChatCompletion.mockResolvedValueOnce('Invalid JSON');

      await expect(service.extractTopics(mockRequest)).rejects.toThrow(AIServiceError);
    });

    it('should handle missing topics array in response', async () => {
      const mockResponse = JSON.stringify({ invalid: 'response' });
      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      await expect(service.extractTopics(mockRequest)).rejects.toThrow(AIServiceError);
    });

    it('should sanitize and validate topic data', async () => {
      const mockResponse = JSON.stringify({
        topics: [
          {
            id: 'topic_1',
            title: '<script>alert("xss")</script>Mathematics',
            content: 'Content with   excessive   whitespace',
            confidence: 1.5, // Invalid confidence > 1
            sourceFiles: 'not_an_array', // Invalid type
            subtopics: [
              {
                title: 'Subtopic with <b>HTML</b>',
                content: 'Clean content',
                confidence: -0.1 // Invalid confidence < 0
              }
            ]
          }
        ]
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.extractTopics(mockRequest);

      expect(result[0].title).toBe('Mathematics'); // HTML removed
      expect(result[0].content).toBe('Content with excessive whitespace'); // Whitespace normalized
      expect(result[0].confidence).toBe(1); // Clamped to valid range
      expect(result[0].sourceFiles).toEqual([]); // Invalid type converted to empty array
      expect(result[0].subtopics[0].title).toBe('Subtopic with HTML'); // HTML removed
      expect(result[0].subtopics[0].confidence).toBe(0); // Clamped to valid range
    });
  });

  describe('organizeContent', () => {
    const mockTopics: OrganizedTopic[] = [
      {
        id: 'topic_1',
        title: 'Mathematics',
        content: 'Math content',
        originalWording: 'mathematics',
        confidence: 0.9,
        sourceFiles: ['doc1.pdf'],
        subtopics: [],
        examples: []
      },
      {
        id: 'topic_2',
        title: 'Math Fundamentals', // Similar to topic_1
        content: 'Basic math content',
        originalWording: 'math fundamentals',
        confidence: 0.8,
        sourceFiles: ['doc2.pdf'],
        subtopics: [],
        examples: []
      }
    ];

    it('should organize content and remove duplicates', async () => {
      const mockResponse = JSON.stringify({
        organizedTopics: [
          {
            id: 'merged_topic_1',
            title: 'Mathematics Fundamentals',
            content: 'Comprehensive math content covering fundamentals',
            originalWording: 'mathematics and math fundamentals',
            confidence: 0.95,
            sourceFiles: ['doc1.pdf', 'doc2.pdf'],
            subtopics: []
          }
        ],
        duplicatesRemoved: [
          {
            removedTopicId: 'topic_2',
            mergedIntoId: 'merged_topic_1',
            reason: 'Similar content about mathematics fundamentals'
          }
        ]
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.organizeContent(mockTopics);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Mathematics Fundamentals');
      expect(result[0].sourceFiles).toEqual(['doc1.pdf', 'doc2.pdf']);
    });

    it('should handle organization errors gracefully', async () => {
      mockClient.createChatCompletion.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.organizeContent(mockTopics)).rejects.toThrow(AIServiceError);
    });
  });

  describe('validateContentFidelity', () => {
    const originalText = 'The quadratic formula is x = (-b ± √(b²-4ac)) / 2a';
    const processedText = 'The quadratic formula: x = (-b ± √(b²-4ac)) / 2a';

    it('should validate content fidelity successfully', async () => {
      const mockResponse = JSON.stringify({
        fidelityScore: 0.95,
        recommendation: 'accept',
        issues: []
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.validateContentFidelity(originalText, processedText);

      expect(result.score).toBe(0.95);
      expect(result.recommendation).toBe('accept');
      expect(result.issues).toEqual([]);
    });

    it('should identify fidelity issues', async () => {
      const mockResponse = JSON.stringify({
        fidelityScore: 0.7,
        recommendation: 'review',
        issues: [
          {
            type: 'changed_meaning',
            severity: 'medium',
            description: 'Minor formatting change that could affect readability',
            originalText: 'The quadratic formula is',
            processedText: 'The quadratic formula:'
          }
        ]
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.validateContentFidelity(originalText, processedText);

      expect(result.score).toBe(0.7);
      expect(result.recommendation).toBe('review');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('changed_meaning');
    });

    it('should clamp fidelity score to valid range', async () => {
      const mockResponse = JSON.stringify({
        fidelityScore: 1.5, // Invalid score > 1
        recommendation: 'accept',
        issues: []
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.validateContentFidelity(originalText, processedText);

      expect(result.score).toBe(1); // Clamped to 1
    });

    it('should handle validation errors', async () => {
      mockClient.createChatCompletion.mockRejectedValueOnce(new Error('Validation failed'));

      await expect(service.validateContentFidelity(originalText, processedText))
        .rejects.toThrow(AIServiceError);
    });
  });

  describe('analyzeImageContext', () => {
    const mockImage = {
      id: 'img_1',
      base64: 'base64data',
      ocrText: 'Formula: E = mc²',
      context: 'Physics equation from textbook chapter 3',
      isExample: true
    };

    it('should analyze image context successfully', async () => {
      const mockResponse = JSON.stringify({
        isEducational: true,
        contentType: 'formula',
        importance: 'high',
        description: 'Einstein\'s mass-energy equivalence formula',
        includeInCheatSheet: true,
        extractedConcepts: ['energy', 'mass', 'physics', 'relativity']
      });

      mockClient.createChatCompletion.mockResolvedValueOnce(mockResponse);

      const result = await service.analyzeImageContext(mockImage);

      expect(result.isEducational).toBe(true);
      expect(result.contentType).toBe('formula');
      expect(result.importance).toBe('high');
      expect(result.includeInCheatSheet).toBe(true);
      expect(result.extractedConcepts).toEqual(['energy', 'mass', 'physics', 'relativity']);
    });

    it('should return safe defaults on analysis failure', async () => {
      mockClient.createChatCompletion.mockRejectedValueOnce(new Error('Analysis failed'));

      const result = await service.analyzeImageContext(mockImage);

      expect(result.isEducational).toBe(false);
      expect(result.contentType).toBe('other');
      expect(result.importance).toBe('low');
      expect(result.includeInCheatSheet).toBe(false);
      expect(result.extractedConcepts).toEqual([]);
    });
  });
});