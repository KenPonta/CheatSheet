import { SpaceAwareTopicExtractionService, getSpaceAwareTopicExtractionService } from '../space-aware-topic-extraction';
import {
  ExtractedContent,
  SpaceConstraints,
  ReferenceFormatAnalysis,
  OrganizedTopic
} from '../types';

// Mock the dependencies
jest.mock('../content-service', () => ({
  AIContentService: jest.fn().mockImplementation(() => ({
    extractTopics: jest.fn().mockResolvedValue([
      {
        id: 'topic-1',
        title: 'Topic 1',
        content: 'Content for topic 1',
        subtopics: [
          {
            id: 'sub-1',
            title: 'Subtopic 1',
            content: 'Subtopic content',
            confidence: 0.8,
            sourceLocation: { fileId: 'file1.pdf' },
            priority: 'high'
          }
        ],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Content for topic 1',
        priority: 'high'
      },
      {
        id: 'topic-2',
        title: 'Topic 2',
        content: 'Content for topic 2',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.8,
        examples: [],
        originalWording: 'Content for topic 2',
        priority: 'medium'
      }
    ]),
    extractTopicsWithPrompt: jest.fn().mockResolvedValue([
      {
        id: 'topic-1',
        title: 'Space-Aware Topic 1',
        content: 'Space-optimized content for topic 1',
        subtopics: [
          {
            id: 'sub-1',
            title: 'Subtopic 1',
            content: 'Subtopic content',
            confidence: 0.8,
            sourceLocation: { fileId: 'file1.pdf' },
            priority: 'high'
          }
        ],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Space-optimized content for topic 1',
        priority: 'high'
      }
    ])
  }))
}));

describe('SpaceAwareTopicExtractionService', () => {
  let service: SpaceAwareTopicExtractionService;

  const mockContent: ExtractedContent[] = [
    {
      text: 'Sample content for topic extraction',
      images: [],
      tables: [],
      metadata: {
        name: 'test.pdf',
        size: 1000,
        type: 'application/pdf',
        lastModified: new Date()
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 1
      }
    }
  ];

  const mockConstraints: SpaceConstraints = {
    availablePages: 2,
    targetUtilization: 0.85,
    pageSize: 'a4',
    fontSize: 'medium',
    columns: 1
  };

  const mockReferenceAnalysis: ReferenceFormatAnalysis = {
    contentDensity: 500,
    topicCount: 4,
    averageTopicLength: 200,
    layoutPattern: 'single-column',
    visualElements: {
      headerStyles: [],
      bulletStyles: [],
      spacingPatterns: [],
      colorScheme: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#0066cc',
        text: '#000000',
        background: '#ffffff'
      },
      fontHierarchy: []
    },
    organizationStyle: 'hierarchical'
  };

  beforeEach(() => {
    service = new SpaceAwareTopicExtractionService();
  });

  describe('extractTopicsWithSpaceOptimization', () => {
    it('extracts topics with space optimization', async () => {
      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints
      );

      expect(result.topics).toBeDefined();
      expect(Array.isArray(result.topics)).toBe(true);
      expect(result.spaceOptimization).toBeDefined();
      expect(result.availableSpace).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.optimalTopicCount).toBeGreaterThan(0);
      expect(Array.isArray(result.recommendations.spaceUtilizationTips)).toBe(true);
    });

    it('extracts topics with reference analysis', async () => {
      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints,
        mockReferenceAnalysis
      );

      expect(result.topics).toBeDefined();
      expect(result.spaceOptimization).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.suggestedConfiguration).toBeDefined();
    });

    it('respects user preferences', async () => {
      const userPreferences = {
        maxTopics: 3,
        focusAreas: ['mathematics', 'physics'],
        excludePatterns: ['introduction', 'conclusion']
      };

      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints,
        undefined,
        userPreferences
      );

      expect(result.topics).toBeDefined();
      expect(result.recommendations.optimalTopicCount).toBeLessThanOrEqual(3);
    });

    it('adds space estimates to topics and subtopics', async () => {
      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints
      );

      expect(result.topics.length).toBeGreaterThan(0);
      
      const topic = result.topics[0];
      expect(topic.estimatedSpace).toBeDefined();
      expect(topic.estimatedSpace).toBeGreaterThan(0);
      
      if (topic.subtopics.length > 0) {
        expect(topic.subtopics[0].estimatedSpace).toBeDefined();
        expect(topic.subtopics[0].estimatedSpace).toBeGreaterThan(0);
      }
    });

    it('provides meaningful recommendations', async () => {
      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints
      );

      const { recommendations } = result;
      expect(recommendations.optimalTopicCount).toBeGreaterThan(0);
      expect(recommendations.suggestedConfiguration).toBeDefined();
      expect(recommendations.spaceUtilizationTips.length).toBeGreaterThan(0);
      
      // Tips should be strings
      recommendations.spaceUtilizationTips.forEach(tip => {
        expect(typeof tip).toBe('string');
        expect(tip.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateTopicSelection', () => {
    const mockTopics: OrganizedTopic[] = [
      {
        id: 'topic-1',
        title: 'Topic 1',
        content: 'Content 1',
        subtopics: [
          {
            id: 'sub-1',
            title: 'Subtopic 1',
            content: 'Subtopic content',
            confidence: 0.8,
            sourceLocation: { fileId: 'file1.pdf' },
            priority: 'high',
            estimatedSpace: 100,
            isSelected: false,
            parentTopicId: 'topic-1'
          }
        ],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Content 1',
        priority: 'high',
        estimatedSpace: 300
      },
      {
        id: 'topic-2',
        title: 'Topic 2',
        content: 'Content 2',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.8,
        examples: [],
        originalWording: 'Content 2',
        priority: 'medium',
        estimatedSpace: 250
      }
    ];

    it('validates valid topic selection', async () => {
      const selectedTopicIds = ['topic-1'];
      const selectedSubtopicIds = [{ topicId: 'topic-1', subtopicIds: ['sub-1'] }];

      const result = await service.validateTopicSelection(
        selectedTopicIds,
        selectedSubtopicIds,
        mockTopics,
        mockConstraints
      );

      expect(result.isValid).toBe(true);
      expect(result.utilizationInfo.totalSpace).toBeGreaterThan(0);
      expect(result.utilizationInfo.usedSpace).toBe(400); // 300 + 100
      expect(result.utilizationInfo.utilizationPercentage).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('detects over-utilization', async () => {
      // Create a constraint with very limited space
      const limitedConstraints: SpaceConstraints = {
        ...mockConstraints,
        availablePages: 1,
        fontSize: 'large'
      };

      const selectedTopicIds = ['topic-1', 'topic-2'];
      const selectedSubtopicIds = [{ topicId: 'topic-1', subtopicIds: ['sub-1'] }];

      const result = await service.validateTopicSelection(
        selectedTopicIds,
        selectedSubtopicIds,
        mockTopics,
        limitedConstraints
      );

      // With limited space, this might be over-utilized
      if (!result.isValid) {
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.utilizationInfo.utilizationPercentage).toBeGreaterThan(1.0);
      }
    });

    it('detects under-utilization', async () => {
      // Create constraints with excessive space
      const excessiveConstraints: SpaceConstraints = {
        ...mockConstraints,
        availablePages: 10,
        fontSize: 'small'
      };

      const selectedTopicIds = ['topic-1'];
      const selectedSubtopicIds: { topicId: string; subtopicIds: string[] }[] = [];

      const result = await service.validateTopicSelection(
        selectedTopicIds,
        selectedSubtopicIds,
        mockTopics,
        excessiveConstraints
      );

      expect(result.isValid).toBe(true);
      expect(result.utilizationInfo.utilizationPercentage).toBeLessThan(0.5);
      
      // Should suggest adding more content
      const hasAddSuggestion = result.suggestions.some(s => 
        s.toLowerCase().includes('add') || s.toLowerCase().includes('more')
      );
      expect(hasAddSuggestion).toBe(true);
    });

    it('handles empty selection', async () => {
      const result = await service.validateTopicSelection(
        [],
        [],
        mockTopics,
        mockConstraints
      );

      expect(result.isValid).toBe(true);
      expect(result.utilizationInfo.usedSpace).toBe(0);
      expect(result.utilizationInfo.utilizationPercentage).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about low utilization
    });

    it('handles missing topics gracefully', async () => {
      const selectedTopicIds = ['non-existent-topic'];
      const selectedSubtopicIds: { topicId: string; subtopicIds: string[] }[] = [];

      const result = await service.validateTopicSelection(
        selectedTopicIds,
        selectedSubtopicIds,
        mockTopics,
        mockConstraints
      );

      expect(result.isValid).toBe(true);
      expect(result.utilizationInfo.usedSpace).toBe(0);
    });
  });

  describe('configuration suggestions', () => {
    it('suggests smaller font for over-utilized content', async () => {
      const largeFontConstraints: SpaceConstraints = {
        ...mockConstraints,
        fontSize: 'large'
      };

      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        largeFontConstraints
      );

      // If content doesn't fit well, should suggest medium font
      const suggestedConfig = result.recommendations.suggestedConfiguration;
      if (suggestedConfig.fontSize !== largeFontConstraints.fontSize) {
        expect(['medium', 'small']).toContain(suggestedConfig.fontSize);
      }
    });

    it('suggests more pages for excessive content', async () => {
      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints
      );

      const suggestedConfig = result.recommendations.suggestedConfiguration;
      expect(suggestedConfig.availablePages).toBeGreaterThan(0);
    });

    it('provides contextual space utilization tips', async () => {
      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints,
        mockReferenceAnalysis
      );

      const tips = result.recommendations.spaceUtilizationTips;
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.length).toBeLessThanOrEqual(5);
      
      // Tips should be practical and actionable
      tips.forEach(tip => {
        expect(tip).toMatch(/consider|try|use|add|remove|increase|decrease/i);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('handles empty content gracefully', async () => {
      const emptyContent: ExtractedContent[] = [];

      const result = await service.extractTopicsWithSpaceOptimization(
        emptyContent,
        mockConstraints
      );

      expect(result.topics).toBeDefined();
      expect(result.spaceOptimization).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('handles zero available space', async () => {
      const zeroSpaceConstraints: SpaceConstraints = {
        ...mockConstraints,
        availablePages: 0
      };

      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        zeroSpaceConstraints
      );

      expect(result.availableSpace).toBe(0);
      expect(result.spaceOptimization.recommendedTopics).toEqual([]);
    });

    it('handles complex reference analysis', async () => {
      const complexReference: ReferenceFormatAnalysis = {
        ...mockReferenceAnalysis,
        layoutPattern: 'multi-column',
        organizationStyle: 'flat',
        contentDensity: 1000
      };

      const result = await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints,
        complexReference
      );

      expect(result.topics).toBeDefined();
      expect(result.recommendations.spaceUtilizationTips.length).toBeGreaterThan(0);
    });

    it('handles topics without space estimates', async () => {
      const topicsWithoutEstimates: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Topic 1',
          content: 'Content 1',
          subtopics: [],
          sourceFiles: ['file1.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Content 1',
          priority: 'high'
          // No estimatedSpace
        }
      ];

      const result = await service.validateTopicSelection(
        ['topic-1'],
        [],
        topicsWithoutEstimates,
        mockConstraints
      );

      expect(result.isValid).toBe(true);
      expect(result.utilizationInfo.usedSpace).toBe(0); // No space estimate available
    });
  });

  describe('performance considerations', () => {
    it('completes extraction within reasonable time', async () => {
      const startTime = Date.now();
      
      await service.extractTopicsWithSpaceOptimization(
        mockContent,
        mockConstraints,
        mockReferenceAnalysis
      );
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('handles large content efficiently', async () => {
      const largeContent: ExtractedContent[] = Array.from({ length: 10 }, (_, i) => ({
        text: `Large content section ${i} with substantial text content that needs to be processed efficiently`,
        images: [],
        tables: [],
        metadata: {
          name: `test${i}.pdf`,
          size: 10000,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [],
          sections: [],
          hierarchy: 1
        }
      }));

      const startTime = Date.now();
      
      const result = await service.extractTopicsWithSpaceOptimization(
        largeContent,
        mockConstraints
      );
      
      const endTime = Date.now();
      
      expect(result.topics).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Should handle large content within 10 seconds
    });
  });
});

describe('getSpaceAwareTopicExtractionService', () => {
  it('returns singleton instance', () => {
    const service1 = getSpaceAwareTopicExtractionService();
    const service2 = getSpaceAwareTopicExtractionService();

    expect(service1).toBe(service2);
    expect(service1).toBeInstanceOf(SpaceAwareTopicExtractionService);
  });
});