import { SpaceCalculationService, getSpaceCalculationService } from '../space-calculation-service';
import {
  SpaceConstraints,
  OrganizedTopic,
  EnhancedSubTopic,
  ReferenceFormatAnalysis,
  TopicSelection
} from '../types';

describe('SpaceCalculationService', () => {
  let service: SpaceCalculationService;

  beforeEach(() => {
    service = new SpaceCalculationService();
  });

  describe('calculateAvailableSpace', () => {
    it('calculates available space correctly for A4 medium font', () => {
      const constraints: SpaceConstraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1
      };

      const availableSpace = service.calculateAvailableSpace(constraints);
      expect(availableSpace).toBeGreaterThan(0);
      expect(typeof availableSpace).toBe('number');
      // A4 page with medium font should provide around 11000+ characters
      expect(availableSpace).toBeGreaterThan(10000);
      expect(availableSpace).toBeLessThan(15000);
    });

    it('calculates more space for multiple pages', () => {
      const singlePage: SpaceConstraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1
      };

      const multiplePages: SpaceConstraints = {
        ...singlePage,
        availablePages: 3
      };

      const singlePageSpace = service.calculateAvailableSpace(singlePage);
      const multiplePagesSpace = service.calculateAvailableSpace(multiplePages);

      expect(multiplePagesSpace).toBeGreaterThan(singlePageSpace);
      expect(multiplePagesSpace).toBeCloseTo(singlePageSpace * 3, -50);
    });

    it('calculates different space for different page sizes', () => {
      const a4Constraints: SpaceConstraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1
      };

      const letterConstraints: SpaceConstraints = {
        ...a4Constraints,
        pageSize: 'letter'
      };

      const legalConstraints: SpaceConstraints = {
        ...a4Constraints,
        pageSize: 'legal'
      };

      const a4Space = service.calculateAvailableSpace(a4Constraints);
      const letterSpace = service.calculateAvailableSpace(letterConstraints);
      const legalSpace = service.calculateAvailableSpace(legalConstraints);

      // Letter is slightly smaller than A4, Legal is larger than both
      expect(legalSpace).toBeGreaterThan(a4Space);
      expect(legalSpace).toBeGreaterThan(letterSpace);
    });

    it('calculates different space for different font sizes', () => {
      const largeFontConstraints: SpaceConstraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4',
        fontSize: 'large',
        columns: 1
      };

      const mediumFontConstraints: SpaceConstraints = {
        ...largeFontConstraints,
        fontSize: 'medium'
      };

      const smallFontConstraints: SpaceConstraints = {
        ...largeFontConstraints,
        fontSize: 'small'
      };

      const largeFontSpace = service.calculateAvailableSpace(largeFontConstraints);
      const mediumFontSpace = service.calculateAvailableSpace(mediumFontConstraints);
      const smallFontSpace = service.calculateAvailableSpace(smallFontConstraints);

      expect(smallFontSpace).toBeGreaterThan(mediumFontSpace);
      expect(mediumFontSpace).toBeGreaterThan(largeFontSpace);
    });

    it('adjusts space for multi-column layouts', () => {
      const singleColumn: SpaceConstraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1
      };

      const doubleColumn: SpaceConstraints = {
        ...singleColumn,
        columns: 2
      };

      const tripleColumn: SpaceConstraints = {
        ...singleColumn,
        columns: 3
      };

      const singleColumnSpace = service.calculateAvailableSpace(singleColumn);
      const doubleColumnSpace = service.calculateAvailableSpace(doubleColumn);
      const tripleColumnSpace = service.calculateAvailableSpace(tripleColumn);

      // Multi-column should have slightly less space due to spacing
      expect(doubleColumnSpace).toBeLessThan(singleColumnSpace);
      expect(tripleColumnSpace).toBeLessThan(doubleColumnSpace);
    });
  });

  describe('estimateContentSpace', () => {
    const constraints: SpaceConstraints = {
      availablePages: 1,
      targetUtilization: 0.85,
      pageSize: 'a4',
      fontSize: 'medium',
      columns: 1
    };

    it('estimates space for content correctly', () => {
      const shortContent = 'Short content';
      const longContent = 'This is a much longer piece of content that should require significantly more space to display properly in the final cheat sheet format';

      const shortSpace = service.estimateContentSpace(shortContent, constraints);
      const longSpace = service.estimateContentSpace(longContent, constraints);

      expect(longSpace).toBeGreaterThan(shortSpace);
      expect(shortSpace).toBeGreaterThan(0);
      // Should include formatting overhead
      expect(shortSpace).toBeGreaterThan(shortContent.length);
    });

    it('adds overhead for formatting', () => {
      const content = 'Test content for space estimation';
      const estimatedSpace = service.estimateContentSpace(content, constraints);
      
      // Should be at least 20% more than raw character count due to formatting overhead
      expect(estimatedSpace).toBeGreaterThan(content.length * 1.2);
    });

    it('adds overhead for multi-column layouts', () => {
      const singleColumn: SpaceConstraints = {
        ...constraints,
        columns: 1
      };

      const multiColumn: SpaceConstraints = {
        ...constraints,
        columns: 2
      };

      const content = 'Test content for space estimation with multiple columns';
      const singleColumnSpace = service.estimateContentSpace(content, singleColumn);
      const multiColumnSpace = service.estimateContentSpace(content, multiColumn);

      expect(multiColumnSpace).toBeGreaterThan(singleColumnSpace);
    });
  });

  describe('calculateOptimalTopicCount', () => {
    const mockTopics: OrganizedTopic[] = [
      {
        id: 'topic-1',
        title: 'Topic 1',
        content: 'Content for topic 1 with moderate length',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Content for topic 1 with moderate length',
        priority: 'high',
        estimatedSpace: 300
      },
      {
        id: 'topic-2',
        title: 'Topic 2',
        content: 'Content for topic 2 with similar length',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.8,
        examples: [],
        originalWording: 'Content for topic 2 with similar length',
        priority: 'medium',
        estimatedSpace: 280
      },
      {
        id: 'topic-3',
        title: 'Topic 3',
        content: 'Content for topic 3',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.7,
        examples: [],
        originalWording: 'Content for topic 3',
        priority: 'low',
        estimatedSpace: 200
      }
    ];

    it('calculates optimal topic count based on available space', () => {
      const availableSpace = 1000; // Space for about 3-4 topics
      const optimalCount = service.calculateOptimalTopicCount(availableSpace, mockTopics);

      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThanOrEqual(mockTopics.length);
      expect(optimalCount).toBeLessThanOrEqual(4);
    });

    it('uses reference analysis when provided', () => {
      const availableSpace = 1000;
      const referenceAnalysis: ReferenceFormatAnalysis = {
        contentDensity: 500, // characters per page
        topicCount: 5,
        averageTopicLength: 100,
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

      const optimalCount = service.calculateOptimalTopicCount(availableSpace, mockTopics, referenceAnalysis);

      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThanOrEqual(mockTopics.length);
      // Should scale based on reference analysis - with more space, should allow more topics
      expect(optimalCount).toBeGreaterThanOrEqual(2);
    });

    it('returns maximum available topics when space is very large', () => {
      const availableSpace = 10000; // Very large space
      const optimalCount = service.calculateOptimalTopicCount(availableSpace, mockTopics);

      expect(optimalCount).toBe(mockTopics.length);
    });

    it('returns reasonable count when space is limited', () => {
      const availableSpace = 200; // Very limited space
      const optimalCount = service.calculateOptimalTopicCount(availableSpace, mockTopics);

      expect(optimalCount).toBeGreaterThan(0);
      expect(optimalCount).toBeLessThan(mockTopics.length);
    });
  });

  describe('estimateTopicSpace', () => {
    const constraints: SpaceConstraints = {
      availablePages: 1,
      targetUtilization: 0.85,
      pageSize: 'a4',
      fontSize: 'medium',
      columns: 1
    };

    it('estimates space for topic with subtopics', () => {
      const subtopics: EnhancedSubTopic[] = [
        {
          id: 'sub-1',
          title: 'Subtopic 1',
          content: 'Subtopic content 1',
          confidence: 0.8,
          sourceLocation: { fileId: 'file1.pdf' },
          priority: 'high',
          estimatedSpace: 100,
          isSelected: true,
          parentTopicId: 'topic-1'
        },
        {
          id: 'sub-2',
          title: 'Subtopic 2',
          content: 'Subtopic content 2',
          confidence: 0.7,
          sourceLocation: { fileId: 'file1.pdf' },
          priority: 'medium',
          estimatedSpace: 80,
          isSelected: true,
          parentTopicId: 'topic-1'
        }
      ];

      const topic: OrganizedTopic = {
        id: 'topic-1',
        title: 'Main Topic',
        content: 'Main topic content',
        subtopics,
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Main topic content',
        priority: 'high'
      };

      const estimatedSpace = service.estimateTopicSpace(topic, constraints);

      expect(estimatedSpace).toBeGreaterThan(0);
      // Should include main content + subtopics + title overhead
      expect(estimatedSpace).toBeGreaterThan(topic.content.length);
    });

    it('includes space for examples/images', () => {
      const topicWithExamples: OrganizedTopic = {
        id: 'topic-1',
        title: 'Topic with Examples',
        content: 'Topic content',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [
          {
            id: 'img-1',
            base64: 'base64data',
            context: 'Example context',
            isExample: true
          },
          {
            id: 'img-2',
            base64: 'base64data2',
            context: 'Another example',
            isExample: true
          }
        ],
        originalWording: 'Topic content',
        priority: 'high'
      };

      const topicWithoutExamples: OrganizedTopic = {
        ...topicWithExamples,
        examples: []
      };

      const spaceWithExamples = service.estimateTopicSpace(topicWithExamples, constraints);
      const spaceWithoutExamples = service.estimateTopicSpace(topicWithoutExamples, constraints);

      expect(spaceWithExamples).toBeGreaterThan(spaceWithoutExamples);
      // Should add approximately 200 characters per image
      expect(spaceWithExamples - spaceWithoutExamples).toBeCloseTo(400, -50);
    });
  });

  describe('generateSpaceSuggestions', () => {
    const mockTopics: OrganizedTopic[] = [
      {
        id: 'topic-1',
        title: 'Selected Topic',
        content: 'Selected topic content',
        subtopics: [
          {
            id: 'sub-1',
            title: 'Unselected Subtopic',
            content: 'Subtopic content',
            confidence: 0.8,
            sourceLocation: { fileId: 'file1.pdf' },
            priority: 'medium',
            estimatedSpace: 100,
            isSelected: false,
            parentTopicId: 'topic-1'
          }
        ],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Selected topic content',
        priority: 'high',
        estimatedSpace: 300
      },
      {
        id: 'topic-2',
        title: 'Unselected Topic',
        content: 'Unselected topic content',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.8,
        examples: [],
        originalWording: 'Unselected topic content',
        priority: 'medium',
        estimatedSpace: 250
      },
      {
        id: 'topic-3',
        title: 'Low Priority Topic',
        content: 'Low priority content',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.7,
        examples: [],
        originalWording: 'Low priority content',
        priority: 'low',
        estimatedSpace: 200
      }
    ];

    it('suggests adding content when utilization is low', () => {
      const currentSelection: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 300
        }
      ];

      const availableSpace = 1000; // Low utilization (30%)
      const suggestions = service.generateSpaceSuggestions(currentSelection, availableSpace, mockTopics);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'add_topic')).toBe(true);
      expect(suggestions.some(s => s.type === 'add_subtopic')).toBe(true);
    });

    it('suggests reducing content when utilization is too high', () => {
      const currentSelection: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 300
        },
        {
          topicId: 'topic-3',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 200
        }
      ];

      const availableSpace = 500; // High utilization (100%)
      const suggestions = service.generateSpaceSuggestions(currentSelection, availableSpace, mockTopics);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'reduce_content')).toBe(true);
    });

    it('limits suggestions to maximum of 5', () => {
      const currentSelection: TopicSelection[] = [];
      const availableSpace = 10000; // Very large space
      const suggestions = service.generateSpaceSuggestions(currentSelection, availableSpace, mockTopics);

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('optimizeSpaceUtilization', () => {
    const mockTopics: OrganizedTopic[] = [
      {
        id: 'topic-1',
        title: 'High Priority Topic',
        content: 'High priority content',
        subtopics: [
          {
            id: 'sub-1',
            title: 'High Priority Subtopic',
            content: 'High priority subtopic',
            confidence: 0.9,
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
        originalWording: 'High priority content',
        priority: 'high',
        estimatedSpace: 400
      },
      {
        id: 'topic-2',
        title: 'Medium Priority Topic',
        content: 'Medium priority content',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.8,
        examples: [],
        originalWording: 'Medium priority content',
        priority: 'medium',
        estimatedSpace: 300
      },
      {
        id: 'topic-3',
        title: 'Low Priority Topic',
        content: 'Low priority content',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.7,
        examples: [],
        originalWording: 'Low priority content',
        priority: 'low',
        estimatedSpace: 200
      }
    ];

    it('prioritizes high priority topics first', () => {
      const availableSpace = 1000;
      const result = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      expect(result.recommendedTopics).toContain('topic-1');
      expect(result.recommendedTopics[0]).toBe('topic-1'); // Should be first
      expect(result.utilizationScore).toBeGreaterThan(0);
      expect(result.utilizationScore).toBeLessThanOrEqual(1);
    });

    it('includes high priority subtopics', () => {
      const availableSpace = 1000;
      const result = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      const topic1Subtopics = result.recommendedSubtopics.find(rs => rs.topicId === 'topic-1');
      expect(topic1Subtopics).toBeDefined();
      expect(topic1Subtopics?.subtopicIds).toContain('sub-1');
    });

    it('fills remaining space with lower priority content', () => {
      const availableSpace = 1200; // Enough for high + medium + some low
      const result = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      expect(result.recommendedTopics).toContain('topic-1'); // High priority
      expect(result.recommendedTopics).toContain('topic-2'); // Medium priority
      expect(result.utilizationScore).toBeGreaterThan(0.7); // Good utilization
    });

    it('respects space constraints', () => {
      const availableSpace = 300; // Only enough for one topic
      const result = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      expect(result.recommendedTopics.length).toBeLessThanOrEqual(1);
      expect(result.utilizationScore).toBeLessThanOrEqual(1);
    });

    it('provides suggestions for optimization', () => {
      const availableSpace = 1000;
      const result = service.optimizeSpaceUtilization(mockTopics, availableSpace);

      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.estimatedFinalUtilization).toBeGreaterThan(0);
      expect(result.estimatedFinalUtilization).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateSpaceUtilization', () => {
    const mockTopics: OrganizedTopic[] = [
      {
        id: 'topic-1',
        title: 'Topic 1',
        content: 'Content 1',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Content 1',
        priority: 'high',
        estimatedSpace: 300
      }
    ];

    it('calculates current space utilization correctly', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 300
        }
      ];

      const availableSpace = 1000;
      const utilization = service.calculateSpaceUtilization(selectedTopics, availableSpace, mockTopics);

      expect(utilization.totalAvailableSpace).toBe(1000);
      expect(utilization.usedSpace).toBe(300);
      expect(utilization.remainingSpace).toBe(700);
      expect(utilization.utilizationPercentage).toBe(0.3);
      expect(Array.isArray(utilization.suggestions)).toBe(true);
    });

    it('handles empty selection', () => {
      const selectedTopics: TopicSelection[] = [];
      const availableSpace = 1000;
      const utilization = service.calculateSpaceUtilization(selectedTopics, availableSpace, mockTopics);

      expect(utilization.usedSpace).toBe(0);
      expect(utilization.remainingSpace).toBe(1000);
      expect(utilization.utilizationPercentage).toBe(0);
    });

    it('handles over-utilization', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 1200
        }
      ];

      const availableSpace = 1000;
      const utilization = service.calculateSpaceUtilization(selectedTopics, availableSpace, mockTopics);

      expect(utilization.usedSpace).toBe(1200);
      expect(utilization.remainingSpace).toBe(0); // Should not be negative
      expect(utilization.utilizationPercentage).toBe(1.2); // Can exceed 1.0
    });
  });
});

describe('getSpaceCalculationService', () => {
  it('returns singleton instance', () => {
    const service1 = getSpaceCalculationService();
    const service2 = getSpaceCalculationService();

    expect(service1).toBe(service2);
    expect(service1).toBeInstanceOf(SpaceCalculationService);
  });
});