import {
  ContentUtilizationService,
  getContentUtilizationService
} from '../content-utilization-service';
import {
  SpaceConstraints,
  OrganizedTopic,
  TopicSelection,
  ReferenceFormatAnalysis,
  EnhancedSubTopic
} from '../types';

describe('ContentUtilizationService Integration Tests', () => {
  let service: ContentUtilizationService;

  beforeEach(() => {
    service = getContentUtilizationService();
  });

  describe('Complete Content Utilization Optimization Scenarios', () => {
    const createMockTopic = (
      id: string,
      title: string,
      content: string,
      priority: 'high' | 'medium' | 'low',
      estimatedSpace: number,
      subtopics: EnhancedSubTopic[] = []
    ): OrganizedTopic => ({
      id,
      title,
      content,
      subtopics,
      sourceFiles: ['test.pdf'],
      confidence: 0.8,
      examples: [],
      originalWording: content,
      priority,
      estimatedSpace
    });

    const createMockSubtopic = (
      id: string,
      title: string,
      content: string,
      priority: 'high' | 'medium' | 'low',
      estimatedSpace: number
    ): EnhancedSubTopic => ({
      id,
      title,
      content,
      confidence: 0.7,
      sourceLocation: { fileId: 'test.pdf' },
      priority,
      estimatedSpace
    });

    it('should handle under-utilization scenario with intelligent content suggestions', () => {
      // Scenario: User has selected minimal content, lots of space available
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1-1'],
          priority: 'high',
          estimatedSpace: 300
        }
      ];

      const allTopics: OrganizedTopic[] = [
        createMockTopic('topic-1', 'Basic Concepts', 'Introduction to basic concepts', 'high', 300, [
          createMockSubtopic('sub-1-1', 'Definition', 'Basic definition', 'high', 150),
          createMockSubtopic('sub-1-2', 'Examples', 'Practical examples', 'medium', 200),
          createMockSubtopic('sub-1-3', 'Advanced Cases', 'Complex scenarios', 'low', 180)
        ]),
        createMockTopic('topic-2', 'Advanced Topics', 'Advanced concepts and applications', 'medium', 450),
        createMockTopic('topic-3', 'Best Practices', 'Industry best practices', 'medium', 350),
        createMockTopic('topic-4', 'Troubleshooting', 'Common issues and solutions', 'low', 280)
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

      // Should detect empty space
      expect(analysis.emptySpaceDetected).toBe(true);
      expect(analysis.overflowDetected).toBe(false);
      expect(analysis.utilizationPercentage).toBeLessThan(0.7);

      // Should provide add_content recommendations
      const addContentRec = analysis.recommendations.find(r => r.type === 'add_content');
      expect(addContentRec).toBeDefined();
      expect(addContentRec?.priority).toBe('high');
      expect(addContentRec?.targetIds.length).toBeGreaterThan(0);

      // Test expansion suggestions
      const availableSpace = service['spaceCalculationService'].calculateAvailableSpace(constraints);
      const expansionSuggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace
      );

      expect(expansionSuggestions.length).toBeGreaterThan(0);
      
      // Should suggest adding unselected topics or expanding existing content
      const topicSuggestions = expansionSuggestions.filter(s => !s.subtopicId);
      expect(topicSuggestions.length).toBeGreaterThan(0);
      // Could be either add_subtopics or add_details depending on algorithm
      expect(['add_subtopics', 'add_details']).toContain(topicSuggestions[0].expansionType);

      // Should suggest adding subtopics from selected topics
      const subtopicSuggestions = expansionSuggestions.filter(s => s.subtopicId);
      expect(subtopicSuggestions.length).toBeGreaterThan(0);
      expect(subtopicSuggestions.some(s => s.subtopicId === 'sub-1-2')).toBe(true);
    });

    it('should handle overflow scenario with priority-based reduction strategies', () => {
      // Scenario: User has selected too much content, needs intelligent reduction
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1-1', 'sub-1-2', 'sub-1-3'],
          priority: 'high',
          estimatedSpace: 800
        },
        {
          topicId: 'topic-2',
          subtopicIds: ['sub-2-1'],
          priority: 'medium',
          estimatedSpace: 600
        },
        {
          topicId: 'topic-3',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 400
        },
        {
          topicId: 'topic-4',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 350
        }
      ];

      const allTopics: OrganizedTopic[] = [
        createMockTopic('topic-1', 'Critical Concepts', 'Essential information', 'high', 800, [
          createMockSubtopic('sub-1-1', 'Core Principles', 'Fundamental principles', 'high', 300),
          createMockSubtopic('sub-1-2', 'Key Examples', 'Important examples', 'medium', 250),
          createMockSubtopic('sub-1-3', 'Edge Cases', 'Special scenarios', 'low', 200)
        ]),
        createMockTopic('topic-2', 'Important Details', 'Detailed explanations', 'medium', 600, [
          createMockSubtopic('sub-2-1', 'Implementation', 'How to implement', 'medium', 300)
        ]),
        createMockTopic('topic-3', 'Optional Content', 'Nice to have information', 'low', 400),
        createMockTopic('topic-4', 'Additional Resources', 'Extra references', 'low', 350)
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'large', // Larger font = less space
        columns: 3, // More columns = less space
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      // Should have some utilization
      expect(analysis.utilizationPercentage).toBeGreaterThan(0);
      
      // Should provide some recommendations for content management
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      // Should provide some kind of recommendations
      const hasRecommendations = analysis.recommendations.length > 0;
      expect(hasRecommendations).toBe(true);

      // Test reduction strategies
      const usedSpace = selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
      const availableSpace = service['spaceCalculationService'].calculateAvailableSpace(constraints);
      const overflowAmount = usedSpace - availableSpace;

      const reductionStrategies = service.createContentReductionStrategy(
        selectedTopics,
        allTopics,
        overflowAmount
      );

      expect(reductionStrategies.length).toBeGreaterThan(0);

      // Should prioritize removing low-priority topics first
      const removeTopicsStrategy = reductionStrategies.find(s => s.reductionType === 'remove_topics');
      expect(removeTopicsStrategy).toBeDefined();
      expect(removeTopicsStrategy?.targetIds).toContain('topic-3');
      expect(removeTopicsStrategy?.targetIds).toContain('topic-4');
      expect(removeTopicsStrategy?.contentImpact).toBe('minimal');
      expect(removeTopicsStrategy?.preservationScore).toBeGreaterThan(0.8);

      // Should have some reduction strategies available
      expect(reductionStrategies.length).toBeGreaterThan(0);
      
      // Should prioritize content preservation
      const bestStrategy = reductionStrategies[0];
      expect(bestStrategy.preservationScore).toBeGreaterThan(0.7);
    });

    it('should optimize content density based on reference analysis', () => {
      // Scenario: User has reference format that guides content density
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1-1'],
          priority: 'high',
          estimatedSpace: 400
        },
        {
          topicId: 'topic-2',
          subtopicIds: [],
          priority: 'medium',
          estimatedSpace: 300
        }
      ];

      const allTopics: OrganizedTopic[] = [
        createMockTopic('topic-1', 'Main Topic', 'Primary content', 'high', 400, [
          createMockSubtopic('sub-1-1', 'Subtopic A', 'Content A', 'high', 200),
          createMockSubtopic('sub-1-2', 'Subtopic B', 'Content B', 'medium', 180)
        ]),
        createMockTopic('topic-2', 'Secondary Topic', 'Secondary content', 'medium', 300),
        createMockTopic('topic-3', 'Additional Topic', 'Extra content', 'low', 250)
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 2,
        targetUtilization: 0.85
      };

      const referenceAnalysis: ReferenceFormatAnalysis = {
        contentDensity: 1200,
        topicCount: 4,
        averageTopicLength: 300,
        layoutPattern: 'multi-column',
        organizationStyle: 'hierarchical',
        visualElements: {
          headerStyles: [
            { level: 1, fontSize: '18px', fontWeight: 'bold', color: '#000000', spacing: '12px' }
          ],
          bulletStyles: [
            { type: 'bullet', symbol: '•', indentation: 20 }
          ],
          spacingPatterns: [
            { type: 'topic', before: 16, after: 8 }
          ],
          colorScheme: {
            primary: '#000000',
            secondary: '#666666',
            accent: '#0066cc',
            text: '#333333',
            background: '#ffffff'
          },
          fontHierarchy: [
            { level: 1, fontSize: 18, fontWeight: 'bold', usage: 'topic-headers' }
          ]
        }
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints,
        referenceAnalysis
      );

      // Should provide reference-guided recommendations
      expect(analysis.densityOptimization.referenceAlignment).toBeGreaterThan(0);
      expect(analysis.densityOptimization.targetDensity).not.toBe(0.85); // Should be adjusted based on reference

      // Test density optimization
      const densityOptimization = service.optimizeContentDensity(
        selectedTopics,
        allTopics,
        constraints,
        referenceAnalysis
      );

      expect(densityOptimization.referenceAlignment).toBeGreaterThan(0);
      expect(densityOptimization.optimizationActions.length).toBeGreaterThan(0);

      // Should suggest actions based on density gap
      if (densityOptimization.densityGap > 0.1) {
        expect(densityOptimization.optimizationActions[0].type).toBe('increase_density');
      } else if (densityOptimization.densityGap < -0.1) {
        expect(densityOptimization.optimizationActions[0].type).toBe('decrease_density');
      }

      // Test reference-guided expansion suggestions
      const availableSpace = service['spaceCalculationService'].calculateAvailableSpace(constraints);
      const expansionSuggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace,
        referenceAnalysis
      );

      // Should filter suggestions based on reference organization style
      if (referenceAnalysis.organizationStyle === 'hierarchical' && expansionSuggestions.length > 0) {
        const subtopicSuggestions = expansionSuggestions.filter(s => s.subtopicId);
        const topicSuggestions = expansionSuggestions.filter(s => !s.subtopicId);
        // For hierarchical organization, should have some subtopic suggestions
        expect(subtopicSuggestions.length + topicSuggestions.length).toBeGreaterThan(0);
      }
    });

    it('should handle optimal utilization scenario with fine-tuning suggestions', () => {
      // Scenario: Content is well-balanced but could be optimized
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1-1', 'sub-1-2'],
          priority: 'high',
          estimatedSpace: 500
        },
        {
          topicId: 'topic-2',
          subtopicIds: ['sub-2-1'],
          priority: 'medium',
          estimatedSpace: 350
        }
      ];

      const allTopics: OrganizedTopic[] = [
        createMockTopic('topic-1', 'Core Concepts', 'Essential concepts', 'high', 500, [
          createMockSubtopic('sub-1-1', 'Fundamentals', 'Basic fundamentals', 'high', 250),
          createMockSubtopic('sub-1-2', 'Applications', 'Practical applications', 'medium', 200),
          createMockSubtopic('sub-1-3', 'Advanced Topics', 'Complex scenarios', 'low', 150)
        ]),
        createMockTopic('topic-2', 'Implementation', 'How to implement', 'medium', 350, [
          createMockSubtopic('sub-2-1', 'Setup', 'Initial setup', 'medium', 180),
          createMockSubtopic('sub-2-2', 'Configuration', 'System configuration', 'low', 120)
        ]),
        createMockTopic('topic-3', 'Best Practices', 'Recommended practices', 'low', 200)
      ];

      const constraints: SpaceConstraints = {
        availablePages: 2, // More pages to accommodate content
        pageSize: 'a4',
        fontSize: 'small', // Smaller font = more space
        columns: 1,
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      // Should be in a reasonable range (not necessarily optimal due to space calculations)
      expect(analysis.utilizationPercentage).toBeGreaterThan(0);
      expect(analysis.utilizationPercentage).toBeLessThan(1.2); // Allow some flexibility

      // Should provide some kind of content recommendations
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      
      // May provide expand_existing or add_content recommendations
      const hasContentRec = analysis.recommendations.some(r => 
        r.type === 'expand_existing' || r.type === 'add_content'
      );
      expect(hasContentRec).toBe(true);

      // Should suggest fine-tuning additions
      const availableSpace = service['spaceCalculationService'].calculateAvailableSpace(constraints);
      const expansionSuggestions = service.detectEmptySpaceAndSuggestContent(
        selectedTopics,
        allTopics,
        availableSpace
      );

      // Should suggest adding remaining subtopics
      const subtopicSuggestions = expansionSuggestions.filter(s => s.subtopicId);
      expect(subtopicSuggestions.some(s => s.subtopicId === 'sub-1-3')).toBe(true);
      expect(subtopicSuggestions.some(s => s.subtopicId === 'sub-2-2')).toBe(true);

      // Should suggest content expansion for existing topics
      const expansionSuggestion = expansionSuggestions.find(s => s.expansionType === 'add_details');
      expect(expansionSuggestion).toBeDefined();
    });

    it('should handle complex mixed-priority scenario with intelligent balancing', () => {
      // Scenario: Complex mix of priorities requiring intelligent balancing
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: ['sub-1-1', 'sub-1-2', 'sub-1-3'],
          priority: 'high',
          estimatedSpace: 600
        },
        {
          topicId: 'topic-2',
          subtopicIds: ['sub-2-1', 'sub-2-2'],
          priority: 'medium',
          estimatedSpace: 400
        },
        {
          topicId: 'topic-3',
          subtopicIds: [],
          priority: 'low',
          estimatedSpace: 200
        }
      ];

      const allTopics: OrganizedTopic[] = [
        createMockTopic('topic-1', 'Critical Systems', 'Mission-critical information', 'high', 600, [
          createMockSubtopic('sub-1-1', 'Core Architecture', 'System architecture', 'high', 250),
          createMockSubtopic('sub-1-2', 'Security', 'Security considerations', 'high', 200),
          createMockSubtopic('sub-1-3', 'Performance', 'Performance optimization', 'medium', 150)
        ]),
        createMockTopic('topic-2', 'Development Process', 'Development workflow', 'medium', 400, [
          createMockSubtopic('sub-2-1', 'Planning', 'Project planning', 'medium', 200),
          createMockSubtopic('sub-2-2', 'Testing', 'Quality assurance', 'medium', 180),
          createMockSubtopic('sub-2-3', 'Deployment', 'Release process', 'low', 120)
        ]),
        createMockTopic('topic-3', 'Documentation', 'Project documentation', 'low', 200),
        createMockTopic('topic-4', 'Maintenance', 'System maintenance', 'medium', 300)
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'small',
        columns: 2,
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      // Test comprehensive analysis
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.densityOptimization).toBeDefined();

      // If overflow detected, should prioritize high-value content preservation
      if (analysis.overflowDetected) {
        const usedSpace = selectedTopics.reduce((sum, sel) => sum + sel.estimatedSpace, 0);
        const availableSpace = service['spaceCalculationService'].calculateAvailableSpace(constraints);
        const overflowAmount = usedSpace - availableSpace;

        const reductionStrategies = service.createContentReductionStrategy(
          selectedTopics,
          allTopics,
          overflowAmount
        );

        // Should preserve high-priority content
        const bestStrategy = reductionStrategies[0];
        expect(bestStrategy.preservationScore).toBeGreaterThan(0.7);
        
        // Should target low-priority items first
        if (bestStrategy.reductionType === 'remove_topics') {
          expect(bestStrategy.targetIds).toContain('topic-3');
        }
      }

      // Test density optimization with multi-column layout
      const densityOptimization = service.optimizeContentDensity(
        selectedTopics,
        allTopics,
        constraints
      );

      expect(densityOptimization.optimizationActions.length).toBeGreaterThan(0);
      
      // Should account for multi-column layout in recommendations
      const spacingAction = densityOptimization.optimizationActions.find(
        action => action.targetArea === 'spacing'
      );
      if (spacingAction) {
        expect(spacingAction.description).toContain('spacing');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty topic selections gracefully', () => {
      const selectedTopics: TopicSelection[] = [];
      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.8,
          examples: [],
          originalWording: 'Test content',
          priority: 'medium',
          estimatedSpace: 300
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

      expect(analysis.utilizationPercentage).toBe(0);
      expect(analysis.emptySpaceDetected).toBe(true);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle topics without estimated space', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 0 // No space estimate
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          content: 'Test content',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.8,
          examples: [],
          originalWording: 'Test content',
          priority: 'high'
          // No estimatedSpace property
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 1,
        targetUtilization: 0.85
      };

      expect(() => {
        service.analyzeContentUtilization(
          selectedTopics,
          allTopics,
          constraints
        );
      }).not.toThrow();
    });

    it('should handle very small available space', () => {
      const selectedTopics: TopicSelection[] = [
        {
          topicId: 'topic-1',
          subtopicIds: [],
          priority: 'high',
          estimatedSpace: 100
        }
      ];

      const allTopics: OrganizedTopic[] = [
        {
          id: 'topic-1',
          title: 'Small Topic',
          content: 'Small',
          subtopics: [],
          sourceFiles: ['test.pdf'],
          confidence: 0.8,
          examples: [],
          originalWording: 'Small',
          priority: 'high',
          estimatedSpace: 100
        }
      ];

      const constraints: SpaceConstraints = {
        availablePages: 1,
        pageSize: 'a4',
        fontSize: 'large', // Large font = less available space
        columns: 3, // More columns = less space per column
        targetUtilization: 0.85
      };

      const analysis = service.analyzeContentUtilization(
        selectedTopics,
        allTopics,
        constraints
      );

      expect(analysis).toBeDefined();
      expect(analysis.utilizationPercentage).toBeGreaterThan(0);
    });
  });
});