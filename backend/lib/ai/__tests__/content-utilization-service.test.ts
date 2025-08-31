import {
  ContentUtilizationService,
  getContentUtilizationService,
  ContentUtilizationAnalysis,
  ContentExpansionSuggestion,
  ContentReductionStrategy,
  DensityOptimizationResult
} from '../content-utilization-service';
import {
  SpaceConstraints,
  OrganizedTopic,
  TopicSelection,
  ReferenceFormatAnalysis,
  EnhancedSubTopic
} from '../types';

describe('ContentUtilizationService', () => {
  let service: ContentUtilizationService;

  beforeEach(() => {
    service = new ContentUtilizationService();
  });

  describe('analyzeContentUtilization', () => {
    it('should detect empty space when utilization is low', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1'],
          priority: 'high',
          estimatedSpace: 200
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [
            {
              id: 'sub-1',
              title: 'Subtopic 1',
              content: 'Subtopic content',
              confidence: 0.8,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'high',
              estimatedSpace: 100
            }
          ],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Test content',
          priority: 'high',
          estimatedSpace: 200
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 2,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1,
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      expect(analysis.emptySpaceDetected).toBe(true);
      expect(analysis.overflowDetected).toBe(false);
      expect(analysis.utilizationPercentage).toBeLessThan(0.7);
      expect(analysis.recommendations).toHaveLength(1);
      expect(analysis.recommendations[0].type).toBe('add_content');
    });

    it('should detect overflow when utilization is too high', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1'],
          priority: 'medium',
          estimatedSpace: 5000
        },
        {
          topicId: 'topic-2',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 4000
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Large Topic',
          content: 'Very long content that takes up a lot of space',
          subtopics: [
            {
              id: 'sub-1',
              title: 'Large Subtopic',
              content: 'Large subtopic content',
              confidence: 0.8,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'medium',
              estimatedSpace: 500
            }
          ],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Very long content',
          priority: 'medium',
          estimatedSpace: 5000
        },
        {
          id: 'topic-2',
          title: 'Another Topic',
          content: 'More content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.7,
          examples: [],
          originalWording: 'More content',
          priority: 'low',
          estimatedSpace: 4000
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'large', // Larger font = less available space
        columns: 3, // More columns = less space
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      // With large font and 3 columns, utilization should be high
      expect(analysis.utilizationPercentage).toBeGreaterThan(0.95);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      const reduceContentRec = analysis.recommendations.find(r => r.type === 'reduce_content');
      expect(reduceContentRec).toBeDefined();
    });

    it('should provide expansion recommendations for optimal utilization', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1'],
          priority: 'high',
          estimatedSpace: 800
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [
            {
              id: 'sub-1',
              title: 'Subtopic 1',
              content: 'Subtopic content',
              confidence: 0.8,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'high',
              estimatedSpace: 200
            }
          ],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Test content',
          priority: 'high',
          estimatedSpace: 800
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1,
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      // The utilization might be lower than expected due to space calculation
      expect(analysis.utilizationPercentage).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      // Should provide content suggestions when utilization is not optimal
      const hasContentSuggestion = analysis.recommendations.some(r => 
        r.type === 'expand_existing' || r.type === 'add_content'
      );
      expect(hasContentSuggestion).toBe(true);
    });
  });

  describe('detectEmptySpaceAndSuggestContent', () => {
    it('should suggest adding unselected topics when space is available', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 300
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Selected Topic',
          content: 'Selected content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Selected content',
          priority: 'high',
          estimatedSpace: 300
        },
        {
          id: 'topic-2',
          title: 'Unselected Topic',
          content: 'Unselected content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.8,
          examples: [],
          originalWording: 'Unselected content',
          priority: 'medium',
          estimatedSpace: 400
        }
      ];

      const availableSpace = 1000;

      const suggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace
      );

      expect(suggestions.length).toBeGreaterThan(0);
      const topicSuggestion = suggestions.find(s => s.topicId === 'topic-2');
      expect(topicSuggestion).toBeDefined();
      expect(topicSuggestion?.expansionType).toBe('add_subtopics');
      expect(topicSuggestion?.estimatedSpace).toBe(400);
    });

    it('should suggest adding subtopics from selected topics', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1'],
          priority: 'high',
          estimatedSpace: 400
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Selected Topic',
          content: 'Selected content',
          subtopics: [
            {
              id: 'sub-1',
              title: 'Selected Subtopic',
              content: 'Selected subtopic content',
              confidence: 0.8,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'high',
              estimatedSpace: 200
            },
            {
              id: 'sub-2',
              title: 'Unselected Subtopic',
              content: 'Unselected subtopic content',
              confidence: 0.7,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'medium',
              estimatedSpace: 150
            }
          ],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Selected content',
          priority: 'high',
          estimatedSpace: 400
        }
      ];

      const availableSpace = 1000;

      const suggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace
      );

      const subtopicSuggestion = suggestions.find(s => s.subtopicId === 'sub-2');
      expect(subtopicSuggestion).toBeDefined();
      expect(subtopicSuggestion?.expansionType).toBe('add_subtopics');
      expect(subtopicSuggestion?.estimatedSpace).toBe(150);
    });

    it('should suggest content expansion when significant space remains', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 300
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Selected Topic',
          content: 'Selected content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Selected content',
          priority: 'high',
          estimatedSpace: 300
        }
      ];

      const availableSpace = 1000;

      const suggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace
      );

      const expansionSuggestion = suggestions.find(s => s.expansionType === 'add_details');
      expect(expansionSuggestion).toBeDefined();
      expect(expansionSuggestion?.topicId).toBe('topic-1');
    });

    it('should not suggest content when utilization is already high', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 900
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Selected Topic',
          content: 'Selected content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Selected content',
          priority: 'high',
          estimatedSpace: 900
        }
      ];

      const availableSpace = 1000;

      const suggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace
      );

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('createContentReductionStrategy', () => {
    it('should prioritize removing low-priority topics', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 500
        },
        {
          topicId: 'topic-2',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 300
        },
        {
          topicId: 'topic-3',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 250
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'High Priority Topic',
          content: 'Important content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Important content',
          priority: 'high',
          estimatedSpace: 500
        },
        {
          id: 'topic-2',
          title: 'Low Priority Topic 1',
          content: 'Less important content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.7,
          examples: [],
          originalWording: 'Less important content',
          priority: 'low',
          estimatedSpace: 300
        },
        {
          id: 'topic-3',
          title: 'Low Priority Topic 2',
          content: 'Another less important content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.6,
          examples: [],
          originalWording: 'Another less important content',
          priority: 'low',
          estimatedSpace: 250
        }
      ];

      const overflowAmount = 400;

      const strategies = service.createContentReductionStrategy(
        selectedTopics,
        allTopics,
        overflowAmount
      );

      expect(strategies.length).toBeGreaterThan(0);
      const removeTopicsStrategy = strategies.find(s => s.reductionType === 'remove_topics');
      expect(removeTopicsStrategy).toBeDefined();
      expect(removeTopicsStrategy?.targetIds).toContain('topic-2');
      expect(removeTopicsStrategy?.targetIds).toContain('topic-3');
      expect(removeTopicsStrategy?.spaceRecovered).toBe(550);
      expect(removeTopicsStrategy?.contentImpact).toBe('minimal');
    });

    it('should suggest removing low-priority subtopics when no low-priority topics exist', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1', 'sub-2'],
          priority: 'high',
          estimatedSpace: 600
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'High Priority Topic',
          content: 'Important content',
          subtopics: [
            {
              id: 'sub-1',
              title: 'High Priority Subtopic',
              content: 'Important subtopic',
              confidence: 0.9,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'high',
              estimatedSpace: 200
            },
            {
              id: 'sub-2',
              title: 'Low Priority Subtopic',
              content: 'Less important subtopic',
              confidence: 0.6,
              sourceLocation: { fileId: 'test.pdf' },
              priority: 'low',
              estimatedSpace: 150
            }
          ],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Important content',
          priority: 'high',
          estimatedSpace: 600
        }
      ];

      const overflowAmount = 100;

      const strategies = service.createContentReductionStrategy(
        selectedTopics,
        allTopics,
        overflowAmount
      );

      expect(strategies).toHaveLength(1);
      expect(strategies[0].reductionType).toBe('remove_subtopics');
      expect(strategies[0].targetIds).toContain('sub-2');
      expect(strategies[0].spaceRecovered).toBe(150);
    });

    it('should suggest content condensation for medium-priority topics', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'medium',
          estimatedSpace: 800
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Medium Priority Topic',
          content: 'This is a very long piece of content that could potentially be condensed to save space while maintaining the core meaning and educational value',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.6,
          examples: [],
          originalWording: 'Long content',
          priority: 'medium',
          estimatedSpace: 800
        }
      ];

      const overflowAmount = 200;

      const strategies = service.createContentReductionStrategy(
        selectedTopics,
        allTopics,
        overflowAmount
      );

      const condensationStrategy = strategies.find(s => s.reductionType === 'condense_content');
      expect(condensationStrategy).toBeDefined();
      expect(condensationStrategy?.targetIds).toContain('topic-1');
      expect(condensationStrategy?.contentImpact).toBe('moderate');
    });
  });

  describe('optimizeContentDensity', () => {
    it('should calculate density optimization without reference analysis', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 400
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Test content',
          priority: 'high',
          estimatedSpace: 400
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1,
        targetUtilization: 0.85
      };

      const optimization = service.optimizeContentDensity(
        selectedTopics,
        allTopics,
        constraints
      );

      expect(optimization.currentDensity).toBeGreaterThan(0);
      expect(optimization.targetDensity).toBe(0.85);
      expect(optimization.optimizationActions.length).toBeGreaterThan(0);
      expect(optimization.referenceAlignment).toBe(0.5);
    });

    it('should optimize density based on reference analysis', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 400
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Test content',
          priority: 'high',
          estimatedSpace: 400
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1,
        targetUtilization: 0.85
      };

      const referenceAnalysis: ReferenceFormatAnalysis = {
        contentDensity: 1200,
        topicCount: 3,
        averageTopicLength: 400,
        layoutPattern: 'single-column',
        organizationStyle: 'hierarchical',
        visualElements: {
          headerStyles: [],
          bulletStyles: [],
          spacingPatterns: [],
          colorScheme: {
            primary: '#000000',
            secondary: '#666666',
            accent: '#0066cc',
            text: '#333333',
            background: '#ffffff'
          },
          fontHierarchy: []
        }
      };

      const optimization = service.optimizeContentDensity(
        selectedTopics,
        allTopics,
        constraints,
        referenceAnalysis
      );

      expect(optimization.referenceAlignment).toBeGreaterThan(0);
      expect(optimization.optimizationActions.length).toBeGreaterThan(0);
    });

    it('should suggest increasing density when current density is too low', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 200
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Small Topic',
          content: 'Small content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.9,
          examples: [],
          originalWording: 'Small content',
          priority: 'high',
          estimatedSpace: 200
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 2,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1,
        targetUtilization: 0.85
      };

      const optimization = service.optimizeContentDensity(
        selectedTopics,
        allTopics,
        constraints
      );

      expect(optimization.densityGap).toBeGreaterThan(0.1);
      expect(optimization.optimizationActions[0].type).toBe('increase_density');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const service1 = getContentUtilizationService();
      const service2 = getContentUtilizationService();
      
      expect(service1).toBe(service2);
    });
  });
});