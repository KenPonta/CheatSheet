import { PromptTemplates } from '../prompts';
import { ExtractedContent, TopicExtractionRequest } from '../types';

describe('PromptTemplates', () => {
  const mockExtractedContent: ExtractedContent = {
    text: 'Sample educational content about calculus and derivatives. This content includes formulas and examples.',
    images: [
      { id: 'img1', base64: 'data', ocrText: 'f(x) = x²', context: 'derivative example', isExample: true }
    ],
    tables: [
      { id: 'table1', headers: ['x', 'f(x)'], rows: [['1', '1'], ['2', '4']], context: 'function values' }
    ],
    metadata: {
      name: 'calculus-notes.pdf',
      size: 2048,
      type: 'application/pdf',
      lastModified: new Date('2024-01-01'),
      pageCount: 10,
      wordCount: 500
    },
    structure: {
      headings: [
        { level: 1, text: 'Calculus Fundamentals', position: 0 },
        { level: 2, text: 'Derivatives', position: 100 }
      ],
      sections: [
        { title: 'Introduction', content: 'Basic concepts', startPosition: 0, endPosition: 50 },
        { title: 'Examples', content: 'Practice problems', startPosition: 51, endPosition: 100 }
      ],
      hierarchy: 2
    }
  };

  describe('createTopicExtractionPrompt', () => {
    it('should create a comprehensive topic extraction prompt', () => {
      const request: TopicExtractionRequest = {
        content: [mockExtractedContent],
        userPreferences: {
          maxTopics: 5,
          focusAreas: ['calculus', 'derivatives'],
          excludePatterns: ['homework', 'assignments']
        }
      };

      const prompt = PromptTemplates.createTopicExtractionPrompt(request);

      // Check that prompt includes key requirements
      expect(prompt).toContain('PRESERVE ORIGINAL WORDING');
      expect(prompt).toContain('NO EXTERNAL CONTENT');
      expect(prompt).toContain('MAINTAIN CONTEXT');
      expect(prompt).toContain('HIERARCHICAL ORGANIZATION');

      // Check that document information is included
      expect(prompt).toContain('calculus-notes.pdf');
      expect(prompt).toContain('Text length: 103 characters');
      expect(prompt).toContain('Images: 1');
      expect(prompt).toContain('Tables: 1');
      expect(prompt).toContain('2 headings, 2 sections');

      // Check that user preferences are included
      expect(prompt).toContain('Maximum topics: 5');
      expect(prompt).toContain('Focus on these areas: calculus, derivatives');
      expect(prompt).toContain('Exclude content matching: homework, assignments');

      // Check that content preview is included
      expect(prompt).toContain('Sample educational content about calculus');

      // Check JSON structure is specified
      expect(prompt).toContain('"topics"');
      expect(prompt).toContain('"id"');
      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"originalWording"');
      expect(prompt).toContain('"subtopics"');
    });

    it('should handle empty focus areas and exclude patterns', () => {
      const request: TopicExtractionRequest = {
        content: [mockExtractedContent],
        userPreferences: {
          maxTopics: 3,
          focusAreas: [],
          excludePatterns: []
        }
      };

      const prompt = PromptTemplates.createTopicExtractionPrompt(request);

      expect(prompt).toContain('Maximum topics: 3');
      expect(prompt).not.toContain('Focus on these areas:');
      expect(prompt).not.toContain('Exclude content matching:');
    });

    it('should handle multiple documents', () => {
      const secondContent: ExtractedContent = {
        ...mockExtractedContent,
        text: 'Physics content about motion and forces',
        metadata: { ...mockExtractedContent.metadata, name: 'physics-notes.pdf' }
      };

      const request: TopicExtractionRequest = {
        content: [mockExtractedContent, secondContent],
        userPreferences: {
          maxTopics: 10,
          focusAreas: [],
          excludePatterns: []
        }
      };

      const prompt = PromptTemplates.createTopicExtractionPrompt(request);

      expect(prompt).toContain('Document 1 (calculus-notes.pdf)');
      expect(prompt).toContain('Document 2 (physics-notes.pdf)');
      expect(prompt).toContain('Sample educational content about calculus');
      expect(prompt).toContain('Physics content about motion');
    });
  });

  describe('createContentOrganizationPrompt', () => {
    it('should create a content organization prompt', () => {
      const topics = [
        {
          id: 'topic1',
          title: 'Calculus Basics',
          content: 'Introduction to calculus',
          confidence: 0.9
        },
        {
          id: 'topic2',
          title: 'Derivative Rules',
          content: 'Rules for finding derivatives',
          confidence: 0.8
        }
      ];

      const prompt = PromptTemplates.createContentOrganizationPrompt(topics);

      expect(prompt).toContain('organizing extracted topics');
      expect(prompt).toContain('Eliminate duplicate or highly overlapping topics');
      expect(prompt).toContain('Preserve all original wording');
      expect(prompt).toContain('educational flow from basic to advanced');

      // Check that topics are included in the prompt
      expect(prompt).toContain('Calculus Basics');
      expect(prompt).toContain('Derivative Rules');

      // Check JSON structure
      expect(prompt).toContain('"organizedTopics"');
      expect(prompt).toContain('"duplicatesRemoved"');
    });
  });

  describe('createContentValidationPrompt', () => {
    it('should create a content validation prompt', () => {
      const originalText = 'The derivative of x² is 2x';
      const processedText = 'The derivative of x squared equals 2x';

      const prompt = PromptTemplates.createContentValidationPrompt(originalText, processedText);

      expect(prompt).toContain('content fidelity validator');
      expect(prompt).toContain('ORIGINAL TEXT:');
      expect(prompt).toContain('PROCESSED TEXT:');
      expect(prompt).toContain(originalText);
      expect(prompt).toContain(processedText);

      // Check validation criteria
      expect(prompt).toContain('Added information not in the original');
      expect(prompt).toContain('Changed meanings or interpretations');
      expect(prompt).toContain('Lost important context');
      expect(prompt).toContain('Terminology changes');

      // Check JSON structure
      expect(prompt).toContain('"fidelityScore"');
      expect(prompt).toContain('"recommendation"');
      expect(prompt).toContain('"issues"');

      // Check scoring scale
      expect(prompt).toContain('0.9-1.0: Excellent preservation');
      expect(prompt).toContain('0.7-0.89: Good preservation');
      expect(prompt).toContain('0.5-0.69: Moderate issues');
      expect(prompt).toContain('0.0-0.49: Significant issues');
    });
  });

  describe('createImageContextAnalysisPrompt', () => {
    it('should create an image context analysis prompt', () => {
      const imageContext = 'Mathematical formula from chapter 5';
      const ocrText = 'E = mc²';

      const prompt = PromptTemplates.createImageContextAnalysisPrompt(imageContext, ocrText);

      expect(prompt).toContain('Analyze this image context and OCR text');
      expect(prompt).toContain('IMAGE CONTEXT: Mathematical formula from chapter 5');
      expect(prompt).toContain('OCR TEXT: E = mc²');

      // Check analysis criteria
      expect(prompt).toContain('Is this an educational example or diagram?');
      expect(prompt).toContain('Does it contain important information for studying?');
      expect(prompt).toContain('What type of content is it');
      expect(prompt).toContain('Should it be included in a cheat sheet?');

      // Check JSON structure
      expect(prompt).toContain('"isEducational"');
      expect(prompt).toContain('"contentType"');
      expect(prompt).toContain('"importance"');
      expect(prompt).toContain('"includeInCheatSheet"');
      expect(prompt).toContain('"extractedConcepts"');

      // Check content types and importance levels
      expect(prompt).toContain('formula", "diagram", "example_problem"');
      expect(prompt).toContain('high", "medium", "low"');
    });

    it('should handle empty OCR text', () => {
      const imageContext = 'Diagram showing process flow';
      const ocrText = '';

      const prompt = PromptTemplates.createImageContextAnalysisPrompt(imageContext, ocrText);

      expect(prompt).toContain('IMAGE CONTEXT: Diagram showing process flow');
      expect(prompt).toContain('OCR TEXT: ');
    });
  });
});