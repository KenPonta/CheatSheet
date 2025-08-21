import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContentPrioritizer, PrioritizationConfig, ContentPriority } from '../content-prioritizer';
import { ContentBlock } from '../types';
import { OrganizedTopic, SubTopic } from '../../ai/types';
import { createContentBlock } from '../index';

describe('ContentPrioritizer', () => {
  let prioritizer: ContentPrioritizer;
  let defaultConfig: PrioritizationConfig;
  let sampleTopics: OrganizedTopic[];
  let sampleBlocks: ContentBlock[];

  beforeEach(() => {
    defaultConfig = {
      userSelectedTopics: ['topic-1', 'topic-3'],
      maxContentReduction: 40,
      preserveHighValueContent: true,
      maintainTopicBalance: true,
    };

    prioritizer = new ContentPrioritizer(defaultConfig);

    sampleTopics = [
      {
        id: 'topic-1',
        title: 'Mathematical Formulas',
        content: 'Important mathematical formulas and equations for calculus. This includes derivatives, integrals, and key theorems.',
        subtopics: [
          {
            id: 'subtopic-1-1',
            title: 'Derivatives',
            content: 'Basic derivative rules and examples',
            confidence: 0.9,
            sourceLocation: { fileId: 'file1', page: 1 },
          },
        ],
        sourceFiles: ['file1.pdf'],
        confidence: 0.95,
        examples: [
          {
            id: 'img-1',
            base64: 'base64data',
            context: 'derivative example',
            isExample: true,
          },
        ],
        originalWording: 'Mathematical Formulas',
      },
      {
        id: 'topic-2',
        title: 'Historical Notes',
        content: 'Some historical background information about the development of calculus.',
        subtopics: [],
        sourceFiles: ['file2.pdf'],
        confidence: 0.6,
        examples: [],
        originalWording: 'Historical Notes',
      },
      {
        id: 'topic-3',
        title: 'Practice Problems',
        content: 'Example problems and solutions for practice. These are key for understanding the concepts.',
        subtopics: [
          {
            id: 'subtopic-3-1',
            title: 'Basic Problems',
            content: 'Simple practice problems',
            confidence: 0.8,
            sourceLocation: { fileId: 'file3', page: 2 },
          },
          {
            id: 'subtopic-3-2',
            title: 'Advanced Problems',
            content: 'Complex practice problems',
            confidence: 0.85,
            sourceLocation: { fileId: 'file3', page: 3 },
          },
        ],
        sourceFiles: ['file3.pdf'],
        confidence: 0.88,
        examples: [
          {
            id: 'img-2',
            base64: 'base64data2',
            context: 'problem example',
            isExample: true,
          },
        ],
        originalWording: 'Practice Problems',
      },
      {
        id: 'topic-4',
        title: 'Additional Tips',
        content: 'Some additional tips and tricks that might be helpful.',
        subtopics: [],
        sourceFiles: ['file4.pdf'],
        confidence: 0.4,
        examples: [],
        originalWording: 'Additional Tips',
      },
    ];

    sampleBlocks = [
      { ...createContentBlock('topic-1-block', 'Mathematical formulas content', 'heading', 8), estimatedHeight: 50 },
      { ...createContentBlock('topic-2-block', 'Historical background information', 'paragraph', 3), estimatedHeight: 30 },
      { ...createContentBlock('topic-3-block', 'Practice problems and examples', 'list', 7), estimatedHeight: 40 },
      { ...createContentBlock('topic-4-block', 'Additional tips and notes', 'paragraph', 2), estimatedHeight: 25 },
    ];
  });

  describe('Priority Analysis', () => {
    it('should prioritize user-selected topics higher', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const topic1Priority = priorities.find(p => p.topicId === 'topic-1');
      const topic2Priority = priorities.find(p => p.topicId === 'topic-2');

      expect(topic1Priority?.userSelected).toBe(true);
      expect(topic2Priority?.userSelected).toBe(false);
      expect(topic1Priority?.priority).toBeGreaterThan(topic2Priority?.priority || 0);
    });

    it('should assign higher priority to topics with high confidence', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const highConfidenceTopic = priorities.find(p => p.topicId === 'topic-1'); // confidence 0.95
      const lowConfidenceTopic = priorities.find(p => p.topicId === 'topic-4'); // confidence 0.4

      expect(highConfidenceTopic?.priority).toBeGreaterThan(lowConfidenceTopic?.priority || 0);
    });

    it('should assess educational value correctly', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const formulasTopic = priorities.find(p => p.topicId === 'topic-1');
      const practiceProblems = priorities.find(p => p.topicId === 'topic-3');
      const additionalTips = priorities.find(p => p.topicId === 'topic-4');

      // Topics with examples and formulas should have high educational value
      expect(formulasTopic?.educationalValue).toBe('high');
      expect(practiceProblems?.educationalValue).toBe('high');
      expect(additionalTips?.educationalValue).toBe('low');
    });

    it('should sort priorities correctly', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      // User-selected topics should come first
      const userSelectedPriorities = priorities.filter(p => p.userSelected);
      const nonUserSelectedPriorities = priorities.filter(p => !p.userSelected);

      expect(userSelectedPriorities.length).toBe(2);
      expect(nonUserSelectedPriorities.length).toBe(2);

      // Within user-selected, higher priority scores should come first
      if (userSelectedPriorities.length > 1) {
        expect(userSelectedPriorities[0].priority).toBeGreaterThanOrEqual(userSelectedPriorities[1].priority);
      }
    });

    it('should calculate content length correctly', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const topic3Priority = priorities.find(p => p.topicId === 'topic-3');
      const topic2Priority = priorities.find(p => p.topicId === 'topic-2');

      // Topic 3 has more content (main content + 2 subtopics)
      expect(topic3Priority?.contentLength).toBeGreaterThan(topic2Priority?.contentLength || 0);
    });

    it('should identify dependencies between topics', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      // Check that dependencies are identified (this is a simplified test)
      priorities.forEach(priority => {
        expect(Array.isArray(priority.dependencies)).toBe(true);
      });
    });
  });

  describe('Content Reduction Planning', () => {
    it('should create a reduction plan for overflow content', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const overflowAmount = 500; // Simulate 500px overflow

      const plan = prioritizer.createReductionPlan(overflowAmount, sampleBlocks, priorities);

      expect(plan.removableBlocks).toBeDefined();
      expect(plan.compressibleBlocks).toBeDefined();
      expect(plan.estimatedSpaceSaved).toBeGreaterThan(0);
      expect(plan.impactAssessment).toBeDefined();
    });

    it('should prioritize removing low-priority blocks first', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const overflowAmount = 200;

      const plan = prioritizer.createReductionPlan(overflowAmount, sampleBlocks, priorities);

      if (plan.removableBlocks.length > 0) {
        // Should not remove high-priority user-selected content
        const removedHighPriority = plan.removableBlocks.some(blockId => {
          const block = sampleBlocks.find(b => b.id === blockId);
          return block && block.priority >= 7;
        });
        expect(removedHighPriority).toBe(false);
      }
    });

    it('should suggest compression for medium priority content', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const overflowAmount = 300;

      const plan = prioritizer.createReductionPlan(overflowAmount, sampleBlocks, priorities);

      if (plan.compressibleBlocks.length > 0) {
        plan.compressibleBlocks.forEach(compressible => {
          expect(compressible.compressionRatio).toBeGreaterThan(0);
          expect(compressible.compressionRatio).toBeLessThanOrEqual(0.5); // Max 50% compression
          expect(compressible.targetLength).toBeLessThan(compressible.originalLength);
        });
      }
    });

    it('should assess impact correctly', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const overflowAmount = 400;

      const plan = prioritizer.createReductionPlan(overflowAmount, sampleBlocks, priorities);

      expect(['minimal', 'moderate', 'significant']).toContain(plan.impactAssessment.educationalValueLoss);
      expect(['maintained', 'reduced', 'compromised']).toContain(plan.impactAssessment.contentCoherence);
      expect(Array.isArray(plan.impactAssessment.topicsAffected)).toBe(true);
    });

    it('should respect maximum content reduction limit', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const overflowAmount = 1000; // Large overflow

      const plan = prioritizer.createReductionPlan(overflowAmount, sampleBlocks, priorities);

      const totalContentHeight = sampleBlocks.reduce((sum, block) => sum + block.estimatedHeight, 0);
      const maxAllowedReduction = (totalContentHeight * defaultConfig.maxContentReduction) / 100;

      expect(plan.estimatedSpaceSaved).toBeLessThanOrEqual(maxAllowedReduction * 1.1); // Allow small buffer
    });
  });

  describe('Intelligent Suggestions', () => {
    it('should generate suggestions based on prioritization', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const reductionPlan = prioritizer.createReductionPlan(300, sampleBlocks, priorities);

      const suggestions = prioritizer.generateIntelligentSuggestions(300, priorities, reductionPlan);

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(['reduce-content', 'increase-pages', 'smaller-text', 'more-columns']).toContain(suggestion.type);
        expect(['low', 'medium', 'high']).toContain(suggestion.impact);
        expect(suggestion.estimatedReduction).toBeGreaterThanOrEqual(0);
        expect(suggestion.description).toBeTruthy();
      });
    });

    it('should suggest removing unselected low-priority topics', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const reductionPlan = prioritizer.createReductionPlan(200, sampleBlocks, priorities);

      const suggestions = prioritizer.generateIntelligentSuggestions(200, priorities, reductionPlan);

      const removeUnselectedSuggestion = suggestions.find(s => 
        s.description.includes('low-priority topics') && s.description.includes("weren't selected")
      );

      expect(removeUnselectedSuggestion).toBeDefined();
    });

    it('should suggest topic consolidation when similar topics exist', () => {
      // Create topics with similar content for testing
      const similarTopics = [
        ...sampleTopics,
        {
          id: 'topic-5',
          title: 'More Mathematical Formulas',
          content: 'Additional mathematical formulas and equations',
          subtopics: [],
          sourceFiles: ['file5.pdf'],
          confidence: 0.7,
          examples: [],
          originalWording: 'More Mathematical Formulas',
        },
      ];

      const priorities = prioritizer.analyzePriorities(similarTopics, sampleBlocks);
      const reductionPlan = prioritizer.createReductionPlan(200, sampleBlocks, priorities);

      const suggestions = prioritizer.generateIntelligentSuggestions(200, priorities, reductionPlan);

      // Should suggest merging similar topics
      const mergeSuggestion = suggestions.find(s => 
        s.description.includes('similar topics') || s.description.includes('merge')
      );

      expect(mergeSuggestion).toBeDefined();
    });

    it('should suggest selective compression', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const reductionPlan = prioritizer.createReductionPlan(250, sampleBlocks, priorities);

      const suggestions = prioritizer.generateIntelligentSuggestions(250, priorities, reductionPlan);

      if (reductionPlan.compressibleBlocks.length > 0) {
        const compressionSuggestion = suggestions.find(s => 
          s.description.includes('Compress') && s.description.includes('content blocks')
        );

        expect(compressionSuggestion).toBeDefined();
        expect(compressionSuggestion?.estimatedReduction).toBeGreaterThan(0);
      }
    });

    it('should sort suggestions by impact', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const reductionPlan = prioritizer.createReductionPlan(300, sampleBlocks, priorities);

      const suggestions = prioritizer.generateIntelligentSuggestions(300, priorities, reductionPlan);

      if (suggestions.length > 1) {
        // Should be sorted by impact (low impact first for this implementation)
        const impacts = suggestions.map(s => s.impact);
        const impactOrder = { low: 1, medium: 2, high: 3 };
        
        for (let i = 0; i < impacts.length - 1; i++) {
          expect(impactOrder[impacts[i]]).toBeLessThanOrEqual(impactOrder[impacts[i + 1]]);
        }
      }
    });
  });

  describe('Educational Value Assessment', () => {
    it('should identify high-value content with examples and formulas', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const mathTopic = priorities.find(p => p.topicId === 'topic-1');
      const practiceTopic = priorities.find(p => p.topicId === 'topic-3');

      expect(mathTopic?.educationalValue).toBe('high');
      expect(practiceTopic?.educationalValue).toBe('high');
    });

    it('should identify low-value content without examples or key terms', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const tipsTopic = priorities.find(p => p.topicId === 'topic-4');
      expect(tipsTopic?.educationalValue).toBe('low');
    });

    it('should consider subtopics in educational value assessment', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      const topicWithSubtopics = priorities.find(p => p.topicId === 'topic-3'); // Has 2 subtopics
      const topicWithoutSubtopics = priorities.find(p => p.topicId === 'topic-2'); // Has 0 subtopics

      // Topics with subtopics should generally have higher or equal educational value
      const valueOrder = { low: 1, medium: 2, high: 3 };
      expect(valueOrder[topicWithSubtopics?.educationalValue || 'low'])
        .toBeGreaterThanOrEqual(valueOrder[topicWithoutSubtopics?.educationalValue || 'low']);
    });
  });

  describe('Configuration Impact', () => {
    it('should respect maxContentReduction setting', () => {
      const restrictiveConfig = {
        ...defaultConfig,
        maxContentReduction: 20, // Only allow 20% reduction
      };
      const restrictivePrioritizer = new ContentPrioritizer(restrictiveConfig);

      const priorities = restrictivePrioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const plan = restrictivePrioritizer.createReductionPlan(500, sampleBlocks, priorities);

      const totalContentHeight = sampleBlocks.reduce((sum, block) => sum + block.estimatedHeight, 0);
      const maxAllowedReduction = (totalContentHeight * 20) / 100;

      expect(plan.estimatedSpaceSaved).toBeLessThanOrEqual(maxAllowedReduction * 1.1);
    });

    it('should handle different user topic selections', () => {
      const differentConfig = {
        ...defaultConfig,
        userSelectedTopics: ['topic-2', 'topic-4'], // Different selection
      };
      const differentPrioritizer = new ContentPrioritizer(differentConfig);

      const priorities1 = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const priorities2 = differentPrioritizer.analyzePriorities(sampleTopics, sampleBlocks);

      // Different selections should result in different priorities
      const topic2Priority1 = priorities1.find(p => p.topicId === 'topic-2');
      const topic2Priority2 = priorities2.find(p => p.topicId === 'topic-2');

      expect(topic2Priority1?.userSelected).toBe(false);
      expect(topic2Priority2?.userSelected).toBe(true);
      expect(topic2Priority2?.priority).toBeGreaterThan(topic2Priority1?.priority || 0);
    });

    it('should handle preserveHighValueContent setting', () => {
      const config = {
        ...defaultConfig,
        preserveHighValueContent: false,
      };
      const prioritizer2 = new ContentPrioritizer(config);

      const priorities = prioritizer2.analyzePriorities(sampleTopics, sampleBlocks);
      const plan = prioritizer2.createReductionPlan(400, sampleBlocks, priorities);

      // Should still create a valid plan even without preserving high-value content
      expect(plan.removableBlocks).toBeDefined();
      expect(plan.compressibleBlocks).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty topics array', () => {
      const priorities = prioritizer.analyzePriorities([], sampleBlocks);
      expect(priorities).toEqual([]);
    });

    it('should handle empty blocks array', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, []);
      const plan = prioritizer.createReductionPlan(100, [], priorities);

      expect(plan.removableBlocks).toEqual([]);
      expect(plan.compressibleBlocks).toEqual([]);
      expect(plan.estimatedSpaceSaved).toBe(0);
    });

    it('should handle topics with no content', () => {
      const emptyTopics: OrganizedTopic[] = [
        {
          id: 'empty-topic',
          title: 'Empty Topic',
          content: '',
          subtopics: [],
          sourceFiles: [],
          confidence: 0.5,
          examples: [],
          originalWording: 'Empty Topic',
        },
      ];

      const priorities = prioritizer.analyzePriorities(emptyTopics, sampleBlocks);
      expect(priorities.length).toBe(1);
      expect(priorities[0].contentLength).toBe(0);
    });

    it('should handle very small overflow amounts', () => {
      const priorities = prioritizer.analyzePriorities(sampleTopics, sampleBlocks);
      const plan = prioritizer.createReductionPlan(1, sampleBlocks, priorities); // 1px overflow

      // Should handle gracefully without over-reducing
      expect(plan.estimatedSpaceSaved).toBeGreaterThanOrEqual(0);
    });

    it('should handle topics with very high confidence', () => {
      const highConfidenceTopics = sampleTopics.map(topic => ({
        ...topic,
        confidence: 1.0,
      }));

      const priorities = prioritizer.analyzePriorities(highConfidenceTopics, sampleBlocks);
      
      priorities.forEach(priority => {
        expect(priority.priority).toBeGreaterThanOrEqual(5); // Should get confidence boost
      });
    });
  });
});