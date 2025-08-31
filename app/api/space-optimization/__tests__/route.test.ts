import { SpaceCalculationService } from '@/backend/lib/ai/space-calculation-service';
import { OrganizedTopic, SpaceConstraints, ReferenceFormatAnalysis, TopicSelection } from '@/backend/lib/ai/types';

describe('Space Optimization Service Integration', () => {
  let service: SpaceCalculationService;

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

  const mockCurrentSelection: TopicSelection[] = [
    {
      topicId: 'topic-1',
      subtopicIds: ['sub-1'],
      priority: 'high',
      estimatedSpace: 400
    }
  ];

  beforeEach(() => {
    service = new SpaceCalculationService();
  });

  describe('Space Calculation Integration', () => {
    it('calculates available space correctly', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      
      expect(availableSpace).toBeGreaterThan(0);
      expect(typeof availableSpace).toBe('number');
    });

    it('estimates content space with formatting overhead', () => {
      const content = 'Test content for space estimation';
      const estimatedSpace = service.estimateContentSpace(content, mockConstraints);
      
      expect(estimatedSpace).toBeGreaterThan(content.length);
      expect(estimatedSpace).toBeGreaterThan(0);
    });
  });

  describe('Space Optimization', () => {
    it('optimizes space utilization without reference analysis', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimization = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      expect(optimization.recommendedTopics).toBeDefined();
      expect(Array.isArray(optimization.recommendedTopics)).toBe(true);
      expect(optimization.utilizationScore).toBeGreaterThanOrEqual(0);
      expect(optimization.utilizationScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(optimization.suggestions)).toBe(true);
    });

    it('optimizes space utilization with reference analysis', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimization = service.optimizeSpaceUtilization(mockTopics, availableSpace, mockReferenceAnalysis);

      expect(optimization.recommendedTopics).toBeDefined();
      expect(Array.isArray(optimization.recommendedTopics)).toBe(true);
      expect(optimization.utilizationScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(optimization.suggestions)).toBe(true);
    });

    it('prioritizes high priority topics', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimization = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      // High priority topic should be recommended
      expect(optimization.recommendedTopics).toContain('topic-1');
    });
  });

  describe('Space Utilization Calculation', () => {
    it('calculates current space utilization', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const utilization = service.calculateSpaceUtilization(mockCurrentSelection, availableSpace, mockTopics);

      expect(utilization.totalAvailableSpace).toBe(availableSpace);
      expect(utilization.usedSpace).toBeGreaterThan(0);
      expect(utilization.remainingSpace).toBeGreaterThanOrEqual(0);
      expect(utilization.utilizationPercentage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(utilization.suggestions)).toBe(true);
    });

    it('handles empty selection', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const utilization = service.calculateSpaceUtilization([], availableSpace, mockTopics);

      expect(utilization.usedSpace).toBe(0);
      expect(utilization.remainingSpace).toBe(availableSpace);
      expect(utilization.utilizationPercentage).toBe(0);
    });
  });

  describe('Suggestion Generation', () => {
    it('generates space utilization suggestions', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const suggestions = service.generateSpaceSuggestions(mockCurrentSelection, availableSpace, mockTopics);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        expect(suggestion.type).toBeDefined();
        expect(suggestion.targetId).toBeDefined();
        expect(suggestion.description).toBeDefined();
        expect(typeof suggestion.spaceImpact).toBe('number');
      }
    });

    it('suggests adding content when utilization is low', () => {
      const availableSpace = 10000; // Very large space
      const smallSelection: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 100
        }
      ];
      
      const suggestions = service.generateSpaceSuggestions(smallSelection, availableSpace, mockTopics);
      
      expect(suggestions.some(s => s.type === 'add_topic' || s.type === 'add_subtopic')).toBe(true);
    });
  });

  describe('Optimal Topic Count Calculation', () => {
    it('calculates optimal topic count without reference analysis', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimalCount = service.calculateOptimalTopicCount(availableSpace, mockTopics);

      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThanOrEqual(mockTopics.length);
    });

    it('calculates optimal topic count with reference analysis', () => {
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimalCount = service.calculateOptimalTopicCount(availableSpace, mockTopics, mockReferenceAnalysis);

      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThanOrEqual(mockTopics.length);
    });

    it('returns reasonable count for limited space', () => {
      const limitedSpace = 200;
      const optimalCount = service.calculateOptimalTopicCount(limitedSpace, mockTopics);

      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThan(mockTopics.length);
    });

    it('returns all topics for excessive space', () => {
      const excessiveSpace = 50000;
      const optimalCount = service.calculateOptimalTopicCount(excessiveSpace, mockTopics);

      expect(optimalCount).toBe(mockTopics.length);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles topics with no estimated space', () => {
      const topicsWithoutSpace = mockTopics.map(topic => ({
        ...topic,
        estimatedSpace: undefined
      }));

      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimization = service.optimizeSpaceUtilization(topicsWithoutSpace, availableSpace);

      expect(optimization.recommendedTopics).toBeDefined();
      expect(Array.isArray(optimization.recommendedTopics)).toBe(true);
    });

    it('handles zero available space', () => {
      const zeroConstraints: SpaceConstraints = {
        ...mockConstraints,
        availablePages: 0
      };

      const availableSpace = service.calculateAvailableSpace(zeroConstraints);
      expect(availableSpace).toBe(0);

      const optimization = service.optimizeSpaceUtilization(mockTopics, availableSpace);
      expect(optimization.recommendedTopics).toEqual([]);
    });

    it('handles topics with no priority', () => {
      const topicsWithoutPriority = mockTopics.map(topic => ({
        ...topic,
        priority: undefined
      }));

      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimization = service.optimizeSpaceUtilization(topicsWithoutPriority, availableSpace);

      expect(optimization.recommendedTopics).toBeDefined();
      expect(Array.isArray(optimization.recommendedTopics)).toBe(true);
    });

    it('handles complex reference analysis patterns', () => {
      const complexReference: ReferenceFormatAnalysis = {
        ...mockReferenceAnalysis,
        layoutPattern: 'multi-column',
        organizationStyle: 'flat'
      };

      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      const optimization = service.optimizeSpaceUtilization(mockTopics, availableSpace, complexReference);

      expect(optimization.recommendedTopics).toBeDefined();
      expect(optimization.utilizationScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('handles large number of topics efficiently', () => {
      const largeTopic: OrganizedTopic = {
        id: 'large-topic',
        title: 'Large Topic',
        content: 'Large content',
        subtopics: Array.from({ length: 50 }, (_, i) => ({
          id: `sub-${i}`,
          title: `Subtopic ${i}`,
          content: `Subtopic content ${i}`,
          confidence: 0.8,
          sourceLocation: { fileId: 'file1.pdf' },
          priority: 'medium' as const,
          estimatedSpace: 50,
          isSelected: false,
          parentTopicId: 'large-topic'
        })),
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Large content',
        priority: 'medium',
        estimatedSpace: 1000
      };

      const largeTopicSet = [largeTopic, ...mockTopics];
      const availableSpace = service.calculateAvailableSpace(mockConstraints);
      
      const startTime = Date.now();
      const optimization = service.optimizeSpaceUtilization(largeTopicSet, availableSpace);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(optimization.recommendedTopics).toBeDefined();
    });

    it('handles multiple page configurations', () => {
      const multiPageConstraints: SpaceConstraints = {
        ...mockConstraints,
        availablePages: 5,
        columns: 2
      };

      const availableSpace = service.calculateAvailableSpace(multiPageConstraints);
      const optimization = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      expect(availableSpace).toBeGreaterThan(service.calculateAvailableSpace(mockConstraints));
      expect(optimization.recommendedTopics).toBeDefined();
    });
  });
});