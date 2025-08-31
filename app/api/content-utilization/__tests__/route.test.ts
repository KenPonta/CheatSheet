import { getContentUtilizationService } from '@/backend/lib/ai';
import {
  SpaceConstraints,
  OrganizedTopic,
  TopicSelection,
  ReferenceFormatAnalysis
} from '@/backend/lib/ai/types';

// Mock the content utilization service
jest.mock('@/backend/lib/ai', () => ({
  getContentUtilizationService: jest.fn(() => ({
    analyzeContentUtilization: jest.fn(),
    detectEmptySpaceAndSuggestContent: jest.fn(),
    createContentReductionStrategy: jest.fn(),
    optimizeContentDensity: jest.fn(),
    spaceCalculationService: {
      calculateAvailableSpace: jest.fn(() => 1000)
    }
  }))
}));

describe('Content Utilization Service Integration', () => {
  const mockSelectedTopics: TopicSelection[] = [
    {
      topicId: 'topic-1',
      subtopicIds: ['sub-1'],
      priority: 'high',
      estimatedSpace: 400
    }
  ];

  const mockAllTopics: OrganizedTopic[] = [
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
      estimatedSpace: 400
    }
  ];

  const mockConstraints: SpaceConstraints = {
    availablePages: 1,
    pageSize: 'a4',
    fontSize: 'medium',
    columns: 1,
    targetUtilization: 0.85
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Utilization Analysis', () => {
    it('should analyze content utilization', async () => {
      const service = getContentUtilizationService();
      
      const mockAnalysis = {
        utilizationPercentage: 0.6,
        emptySpaceDetected: true,
        overflowDetected: false,
        recommendations: [
          {
            type: 'add_content',
            priority: 'high',
            description: 'Add more content',
            targetIds: ['topic-2'],
            expectedSpaceImpact: 300,
            confidenceScore: 0.8,
            implementationSteps: ['Step 1', 'Step 2']
          }
        ],
        densityOptimization: {
          currentDensity: 0.6,
          targetDensity: 0.85,
          densityGap: 0.25,
          optimizationActions: [],
          referenceAlignment: 0.7
        }
      };

      (service.analyzeContentUtilization as jest.Mock).mockReturnValue(mockAnalysis);

      const result = service.analyzeContentUtilization(
        mockSelectedTopics,
        mockAllTopics,
        mockConstraints
      );

      expect(result).toEqual(mockAnalysis);
      expect(service.analyzeContentUtilization).toHaveBeenCalledWith(
        mockSelectedTopics,
        mockAllTopics,
        mockConstraints
      );
    });

    it('should suggest content expansion', async () => {
      const service = getContentUtilizationService();
      
      const mockSuggestions = [
        {
          topicId: 'topic-2',
          expansionType: 'add_subtopics',
          suggestedContent: 'Add topic: New Topic',
          estimatedSpace: 300,
          relevanceScore: 0.8
        }
      ];

      (service.detectEmptySpaceAndSuggestContent as jest.Mock).mockReturnValue(mockSuggestions);

      const result = service.detectEmptySpaceAndSuggestContent(
        mockSelectedTopics,
        mockAllTopics,
        1000
      );

      expect(result).toEqual(mockSuggestions);
      expect(service.detectEmptySpaceAndSuggestContent).toHaveBeenCalledWith(
        mockSelectedTopics,
        mockAllTopics,
        1000
      );
    });

    it('should suggest content reduction', async () => {
      const service = getContentUtilizationService();
      
      const mockStrategies = [
        {
          reductionType: 'remove_topics',
          targetIds: ['topic-2'],
          spaceRecovered: 300,
          contentImpact: 'minimal',
          preservationScore: 0.9
        }
      ];

      (service.createContentReductionStrategy as jest.Mock).mockReturnValue(mockStrategies);

      const result = service.createContentReductionStrategy(
        mockSelectedTopics,
        mockAllTopics,
        200
      );

      expect(result).toEqual(mockStrategies);
      expect(service.createContentReductionStrategy).toHaveBeenCalledWith(
        mockSelectedTopics,
        mockAllTopics,
        200
      );
    });

    it('should optimize content density', async () => {
      const service = getContentUtilizationService();
      
      const mockOptimization = {
        currentDensity: 0.6,
        targetDensity: 0.85,
        densityGap: 0.25,
        optimizationActions: [
          {
            type: 'increase_density',
            targetArea: 'topics',
            description: 'Add more topics',
            impact: 0.15
          }
        ],
        referenceAlignment: 0.7
      };

      (service.optimizeContentDensity as jest.Mock).mockReturnValue(mockOptimization);

      const result = service.optimizeContentDensity(
        mockSelectedTopics,
        mockAllTopics,
        mockConstraints
      );

      expect(result).toEqual(mockOptimization);
      expect(service.optimizeContentDensity).toHaveBeenCalledWith(
        mockSelectedTopics,
        mockAllTopics,
        mockConstraints
      );
    });
  });

  describe('Service Integration', () => {
    it('should handle complex scenarios with multiple recommendations', async () => {
      const service = getContentUtilizationService();
      
      // Mock a complex analysis result
      const complexAnalysis = {
        utilizationPercentage: 0.75,
        emptySpaceDetected: false,
        overflowDetected: false,
        recommendations: [
          {
            type: 'expand_existing',
            priority: 'medium',
            description: 'Expand existing topics',
            targetIds: ['topic-1'],
            expectedSpaceImpact: 150,
            confidenceScore: 0.7,
            implementationSteps: ['Review content', 'Add details']
          },
          {
            type: 'add_content',
            priority: 'low',
            description: 'Add supplementary content',
            targetIds: ['topic-3'],
            expectedSpaceImpact: 200,
            confidenceScore: 0.6,
            implementationSteps: ['Identify gaps', 'Add content']
          }
        ],
        densityOptimization: {
          currentDensity: 0.75,
          targetDensity: 0.85,
          densityGap: 0.1,
          optimizationActions: [
            {
              type: 'increase_density',
              targetArea: 'subtopics',
              description: 'Add more subtopics',
              impact: 0.1
            }
          ],
          referenceAlignment: 0.8
        }
      };

      (service.analyzeContentUtilization as jest.Mock).mockReturnValue(complexAnalysis);

      const result = service.analyzeContentUtilization(
        mockSelectedTopics,
        mockAllTopics,
        mockConstraints
      );

      expect(result.recommendations.length).toBe(2);
      expect(result.densityOptimization.optimizationActions.length).toBe(1);
      expect(result.utilizationPercentage).toBe(0.75);
    });

    it('should handle edge cases gracefully', async () => {
      const service = getContentUtilizationService();
      
      // Test with empty selections
      const emptyAnalysis = {
        utilizationPercentage: 0,
        emptySpaceDetected: true,
        overflowDetected: false,
        recommendations: [
          {
            type: 'add_content',
            priority: 'high',
            description: 'No content selected, add topics',
            targetIds: [],
            expectedSpaceImpact: 0,
            confidenceScore: 1.0,
            implementationSteps: ['Select topics']
          }
        ],
        densityOptimization: {
          currentDensity: 0,
          targetDensity: 0.85,
          densityGap: 0.85,
          optimizationActions: [],
          referenceAlignment: 0.5
        }
      };

      (service.analyzeContentUtilization as jest.Mock).mockReturnValue(emptyAnalysis);

      const result = service.analyzeContentUtilization(
        [],
        mockAllTopics,
        mockConstraints
      );

      expect(result.utilizationPercentage).toBe(0);
      expect(result.emptySpaceDetected).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});