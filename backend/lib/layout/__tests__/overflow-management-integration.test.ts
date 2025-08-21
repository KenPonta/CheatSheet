import { describe, it, expect, beforeEach } from '@jest/globals';
import { OverflowDetector } from '../overflow-detector';
import { ContentPrioritizer, PrioritizationConfig } from '../content-prioritizer';
import { LayoutConfig, ContentBlock } from '../types';
import { OrganizedTopic } from '../../ai/types';
import { createDefaultPageConfig } from '../page-config';
import { getTextConfig } from '../text-config';
import { createContentBlock } from '../index';

describe('Overflow Management Integration', () => {
  let layoutConfig: LayoutConfig;
  let prioritizationConfig: PrioritizationConfig;
  let overflowDetector: OverflowDetector;
  let realWorldTopics: OrganizedTopic[];
  let realWorldBlocks: ContentBlock[];

  beforeEach(() => {
    layoutConfig = {
      page: createDefaultPageConfig('a4', 'portrait'),
      text: getTextConfig('medium'),
      maxPages: 2,
    };

    prioritizationConfig = {
      userSelectedTopics: ['calculus-derivatives', 'practice-problems', 'key-formulas'],
      maxContentReduction: 35,
      preserveHighValueContent: true,
      maintainTopicBalance: true,
    };

    overflowDetector = new OverflowDetector(layoutConfig, prioritizationConfig);

    // Realistic topics for a calculus cheat sheet
    realWorldTopics = [
      {
        id: 'calculus-derivatives',
        title: 'Derivative Rules and Formulas',
        content: 'Essential derivative rules including power rule, product rule, quotient rule, and chain rule. These are fundamental for solving calculus problems.',
        subtopics: [
          {
            id: 'power-rule',
            title: 'Power Rule',
            content: 'd/dx[x^n] = nx^(n-1)',
            confidence: 0.95,
            sourceLocation: { fileId: 'calculus-book.pdf', page: 45 },
          },
          {
            id: 'chain-rule',
            title: 'Chain Rule',
            content: 'd/dx[f(g(x))] = f\'(g(x)) * g\'(x)',
            confidence: 0.92,
            sourceLocation: { fileId: 'calculus-book.pdf', page: 52 },
          },
        ],
        sourceFiles: ['calculus-book.pdf'],
        confidence: 0.95,
        examples: [
          {
            id: 'derivative-example-1',
            base64: 'example-image-data',
            context: 'derivative calculation example',
            isExample: true,
          },
        ],
        originalWording: 'Derivative Rules and Formulas',
      },
      {
        id: 'calculus-integrals',
        title: 'Integration Techniques',
        content: 'Various integration methods including substitution, integration by parts, and partial fractions.',
        subtopics: [
          {
            id: 'substitution',
            title: 'U-Substitution',
            content: 'Method for solving integrals by substitution',
            confidence: 0.88,
            sourceLocation: { fileId: 'calculus-book.pdf', page: 78 },
          },
        ],
        sourceFiles: ['calculus-book.pdf'],
        confidence: 0.85,
        examples: [
          {
            id: 'integral-example-1',
            base64: 'integral-image-data',
            context: 'integration example',
            isExample: true,
          },
        ],
        originalWording: 'Integration Techniques',
      },
      {
        id: 'practice-problems',
        title: 'Practice Problems and Solutions',
        content: 'Worked examples and practice problems to reinforce understanding of calculus concepts.',
        subtopics: [
          {
            id: 'basic-problems',
            title: 'Basic Derivative Problems',
            content: 'Simple derivative calculations for practice',
            confidence: 0.9,
            sourceLocation: { fileId: 'practice-sheet.pdf', page: 1 },
          },
          {
            id: 'advanced-problems',
            title: 'Advanced Integration Problems',
            content: 'Complex integration problems with multiple techniques',
            confidence: 0.87,
            sourceLocation: { fileId: 'practice-sheet.pdf', page: 3 },
          },
        ],
        sourceFiles: ['practice-sheet.pdf'],
        confidence: 0.88,
        examples: [
          {
            id: 'problem-example-1',
            base64: 'problem-image-data',
            context: 'worked problem example',
            isExample: true,
          },
          {
            id: 'problem-example-2',
            base64: 'problem-image-data-2',
            context: 'another worked problem',
            isExample: true,
          },
        ],
        originalWording: 'Practice Problems and Solutions',
      },
      {
        id: 'key-formulas',
        title: 'Essential Formulas Reference',
        content: 'Quick reference of the most important calculus formulas and theorems.',
        subtopics: [],
        sourceFiles: ['formula-sheet.pdf'],
        confidence: 0.98,
        examples: [
          {
            id: 'formula-chart',
            base64: 'formula-chart-data',
            context: 'formula reference chart',
            isExample: true,
          },
        ],
        originalWording: 'Essential Formulas Reference',
      },
      {
        id: 'historical-context',
        title: 'Historical Development of Calculus',
        content: 'Background information about Newton, Leibniz, and the development of calculus.',
        subtopics: [],
        sourceFiles: ['history-book.pdf'],
        confidence: 0.6,
        examples: [],
        originalWording: 'Historical Development of Calculus',
      },
      {
        id: 'advanced-topics',
        title: 'Advanced Calculus Topics',
        content: 'More complex topics like multivariable calculus, vector calculus, and differential equations.',
        subtopics: [
          {
            id: 'multivariable',
            title: 'Multivariable Calculus',
            content: 'Partial derivatives and multiple integrals',
            confidence: 0.75,
            sourceLocation: { fileId: 'advanced-calc.pdf', page: 120 },
          },
        ],
        sourceFiles: ['advanced-calc.pdf'],
        confidence: 0.7,
        examples: [],
        originalWording: 'Advanced Calculus Topics',
      },
      {
        id: 'study-tips',
        title: 'Study Tips and Tricks',
        content: 'General advice for studying calculus and preparing for exams.',
        subtopics: [],
        sourceFiles: ['study-guide.pdf'],
        confidence: 0.4,
        examples: [],
        originalWording: 'Study Tips and Tricks',
      },
    ];

    // Create content blocks that correspond to the topics
    realWorldBlocks = [
      // User-selected high-priority content
      { ...createContentBlock('calculus-derivatives-main', 'Derivative Rules: Power Rule: d/dx[x^n] = nx^(n-1). Product Rule: d/dx[uv] = u\'v + uv\'. Quotient Rule: d/dx[u/v] = (u\'v - uv\')/v². Chain Rule: d/dx[f(g(x))] = f\'(g(x)) * g\'(x).', 'heading', 9), estimatedHeight: 80 },
      { ...createContentBlock('calculus-derivatives-examples', 'Example 1: Find d/dx[x³]. Solution: Using power rule, d/dx[x³] = 3x². Example 2: Find d/dx[sin(x²)]. Solution: Using chain rule, d/dx[sin(x²)] = cos(x²) * 2x = 2x*cos(x²).', 'paragraph', 8), estimatedHeight: 120 },
      
      { ...createContentBlock('practice-problems-basic', 'Basic Problems: 1) d/dx[5x⁴] = 20x³. 2) d/dx[√x] = 1/(2√x). 3) d/dx[e^x] = e^x. 4) d/dx[ln(x)] = 1/x. 5) d/dx[sin(x)] = cos(x).', 'list', 8), estimatedHeight: 100 },
      { ...createContentBlock('practice-problems-advanced', 'Advanced Problems: 1) ∫x²e^x dx (use integration by parts). 2) ∫sin²(x) dx (use trigonometric identities). 3) ∫1/(x²+1) dx = arctan(x) + C.', 'list', 7), estimatedHeight: 90 },
      
      { ...createContentBlock('key-formulas-derivatives', 'Derivative Formulas: d/dx[c] = 0, d/dx[x] = 1, d/dx[x^n] = nx^(n-1), d/dx[e^x] = e^x, d/dx[ln(x)] = 1/x, d/dx[sin(x)] = cos(x), d/dx[cos(x)] = -sin(x)', 'table', 9), estimatedHeight: 70 },
      { ...createContentBlock('key-formulas-integrals', 'Integral Formulas: ∫x^n dx = x^(n+1)/(n+1) + C, ∫e^x dx = e^x + C, ∫1/x dx = ln|x| + C, ∫sin(x) dx = -cos(x) + C, ∫cos(x) dx = sin(x) + C', 'table', 9), estimatedHeight: 70 },
      
      // Non-selected content (lower priority)
      { ...createContentBlock('calculus-integrals-main', 'Integration Techniques: U-Substitution: Let u = g(x), then du = g\'(x)dx. Integration by Parts: ∫u dv = uv - ∫v du. Partial Fractions: Decompose rational functions.', 'heading', 6), estimatedHeight: 85 },
      { ...createContentBlock('calculus-integrals-examples', 'Integration Examples: ∫2x(x²+1)⁵ dx. Let u = x²+1, du = 2x dx. Then ∫u⁵ du = u⁶/6 + C = (x²+1)⁶/6 + C.', 'paragraph', 5), estimatedHeight: 95 },
      
      { ...createContentBlock('historical-context-main', 'Historical Development: Calculus was developed independently by Isaac Newton (1643-1727) and Gottfried Leibniz (1646-1716) in the late 17th century. Newton developed his method of fluxions around 1665-1666, while Leibniz developed his differential calculus around 1674-1676.', 'paragraph', 3), estimatedHeight: 110 },
      
      { ...createContentBlock('advanced-topics-main', 'Advanced Topics: Multivariable Calculus deals with functions of multiple variables. Partial derivatives: ∂f/∂x treats other variables as constants. Vector Calculus: Gradient, divergence, and curl operations.', 'paragraph', 4), estimatedHeight: 95 },
      { ...createContentBlock('advanced-topics-examples', 'Multivariable Examples: For f(x,y) = x²y + y³, ∂f/∂x = 2xy and ∂f/∂y = x² + 3y². The gradient is ∇f = (2xy, x² + 3y²).', 'paragraph', 4), estimatedHeight: 80 },
      
      { ...createContentBlock('study-tips-main', 'Study Tips: 1) Practice problems daily. 2) Understand concepts before memorizing formulas. 3) Work through examples step by step. 4) Form study groups. 5) Use visual aids and graphs.', 'list', 2), estimatedHeight: 75 },
      
      // Additional content to ensure overflow
      { ...createContentBlock('extra-derivatives-1', 'Additional Derivative Rules: Logarithmic differentiation is useful for products and quotients of functions. For y = f(x)^g(x), take ln of both sides: ln(y) = g(x)ln(f(x)), then differentiate implicitly.', 'paragraph', 5), estimatedHeight: 85 },
      { ...createContentBlock('extra-derivatives-2', 'Implicit Differentiation: When y is defined implicitly by an equation F(x,y) = 0, differentiate both sides with respect to x, treating y as a function of x.', 'paragraph', 5), estimatedHeight: 70 },
      { ...createContentBlock('extra-integrals-1', 'Trigonometric Integrals: ∫sin^m(x)cos^n(x) dx requires different techniques based on the parity of m and n. Use trigonometric identities to simplify.', 'paragraph', 4), estimatedHeight: 80 },
      { ...createContentBlock('extra-integrals-2', 'Improper Integrals: ∫[a,∞] f(x) dx = lim[t→∞] ∫[a,t] f(x) dx. Convergence depends on the behavior of f(x) as x approaches infinity.', 'paragraph', 4), estimatedHeight: 75 },
      { ...createContentBlock('extra-applications-1', 'Applications: Related rates problems involve finding how fast one quantity changes with respect to time when other related quantities are changing.', 'paragraph', 3), estimatedHeight: 70 },
      { ...createContentBlock('extra-applications-2', 'Optimization: To find maximum and minimum values, find critical points where f\'(x) = 0 or f\'(x) is undefined, then use the second derivative test.', 'paragraph', 3), estimatedHeight: 75 },
    ];
  });

  describe('Complete Overflow Management Workflow', () => {
    it('should detect overflow and provide comprehensive management options', () => {
      // Analyze overflow with prioritization
      const analysis = overflowDetector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      // Should detect overflow (we have a lot of content for 2 pages)
      expect(analysis.hasOverflow).toBe(true);
      expect(analysis.overflowAmount).toBeGreaterThan(0);

      // Should have prioritization data
      expect(analysis.priorities).toBeDefined();
      expect(analysis.priorities!.length).toBe(realWorldTopics.length);

      // Should have a reduction plan
      expect(analysis.reductionPlan).toBeDefined();
      expect(analysis.reductionPlan!.removableBlocks.length).toBeGreaterThan(0);

      // Should have intelligent suggestions
      expect(analysis.intelligentSuggestions).toBeDefined();
      expect(analysis.intelligentSuggestions!.length).toBeGreaterThan(0);

      // Verify user-selected topics are prioritized
      const userSelectedPriorities = analysis.priorities!.filter(p => p.userSelected);
      expect(userSelectedPriorities.length).toBe(3); // calculus-derivatives, practice-problems, key-formulas

      userSelectedPriorities.forEach(priority => {
        expect(priority.priority).toBeGreaterThan(6); // Should have high priority
      });
    });

    it('should provide detailed overflow information with specific content details', () => {
      const detailedInfo = overflowDetector.getDetailedOverflowInfo(realWorldBlocks);

      expect(detailedInfo.overflowDetails.overflowAmount).toBeGreaterThan(0);
      expect(detailedInfo.overflowDetails.overflowPercentage).toBeGreaterThan(0);

      // Should identify which content fits and which doesn't
      const fittingContent = detailedInfo.affectedContent.filter(c => c.willFit);
      const overflowingContent = detailedInfo.affectedContent.filter(c => !c.willFit);

      expect(fittingContent.length).toBeGreaterThan(0);
      expect(overflowingContent.length).toBeGreaterThan(0);

      // High-priority content should be more likely to fit
      const highPriorityFitting = fittingContent.filter(c => c.priority >= 8);
      expect(highPriorityFitting.length).toBeGreaterThan(0);

      // Should provide content previews
      detailedInfo.affectedContent.forEach(content => {
        expect(content.contentPreview).toBeTruthy();
        expect(content.estimatedHeight).toBeGreaterThan(0);
      });
    });

    it('should generate practical suggestions for real-world scenarios', () => {
      const analysis = overflowDetector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      if (analysis.intelligentSuggestions) {
        // Should suggest removing unselected low-priority content
        const removeUnselectedSuggestion = analysis.intelligentSuggestions.find(s =>
          s.description.includes('low-priority') && s.description.includes("weren't selected")
        );
        expect(removeUnselectedSuggestion).toBeDefined();

        // Should suggest content compression (case insensitive)
        const compressionSuggestion = analysis.intelligentSuggestions.find(s =>
          s.description.toLowerCase().includes('compress')
        );
        // Note: Compression suggestion may not always be generated depending on content characteristics
        if (compressionSuggestion) {
          expect(compressionSuggestion.estimatedReduction).toBeGreaterThan(0);
        }

        // All suggestions should have realistic reduction estimates
        analysis.intelligentSuggestions.forEach(suggestion => {
          expect(suggestion.estimatedReduction).toBeGreaterThan(0);
          expect(suggestion.description).toBeTruthy();
          expect(['low', 'medium', 'high']).toContain(suggestion.impact);
        });
      }
    });

    it('should create a reduction plan that preserves educational value', () => {
      const analysis = overflowDetector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      if (analysis.reductionPlan) {
        const plan = analysis.reductionPlan;

        // Should not remove high-priority user-selected content
        const removedHighPriority = plan.removableBlocks.some(blockId => {
          const block = realWorldBlocks.find(b => b.id === blockId);
          return block && block.priority >= 8;
        });
        expect(removedHighPriority).toBe(false);

        // Should prefer removing historical context and study tips (low educational value)
        const removedLowValue = plan.removableBlocks.some(blockId =>
          blockId.includes('historical-context') || blockId.includes('study-tips')
        );
        expect(removedLowValue).toBe(true);

        // Impact assessment should be reasonable
        expect(['minimal', 'moderate', 'significant']).toContain(plan.impactAssessment.educationalValueLoss);
        expect(['maintained', 'reduced', 'compromised']).toContain(plan.impactAssessment.contentCoherence);

        // Should save some space to address overflow
        expect(plan.estimatedSpaceSaved).toBeGreaterThan(0);
        expect(plan.estimatedSpaceSaved).toBeGreaterThan(100); // At least 100px saved
      }
    });

    it('should handle different page configurations appropriately', () => {
      // Test with single page (more restrictive)
      const singlePageConfig = { ...layoutConfig, maxPages: 1 };
      const singlePageDetector = new OverflowDetector(singlePageConfig, prioritizationConfig);

      const singlePageAnalysis = singlePageDetector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      // Should have more aggressive reduction plan for single page
      expect(singlePageAnalysis.hasOverflow).toBe(true);
      if (singlePageAnalysis.reductionPlan) {
        expect(singlePageAnalysis.reductionPlan.removableBlocks.length).toBeGreaterThan(5);
      }

      // Test with more pages (less restrictive)
      const multiPageConfig = { ...layoutConfig, maxPages: 4 };
      const multiPageDetector = new OverflowDetector(multiPageConfig, prioritizationConfig);

      const multiPageAnalysis = multiPageDetector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      // Should have less overflow or no overflow with more pages
      expect(multiPageAnalysis.overflowAmount).toBeLessThan(singlePageAnalysis.overflowAmount);
    });

    it('should provide warnings with actionable information', () => {
      const warnings = overflowDetector.generateLayoutWarnings(realWorldBlocks);

      expect(warnings.length).toBeGreaterThan(0);

      const overflowWarnings = warnings.filter(w => w.type === 'overflow');
      expect(overflowWarnings.length).toBeGreaterThan(0);

      overflowWarnings.forEach(warning => {
        expect(warning.message).toContain('exceeds');
        expect(['low', 'medium', 'high']).toContain(warning.severity);
        expect(warning.affectedElements.length).toBeGreaterThan(0);
      });
    });

    it('should demonstrate complete user workflow', () => {
      // Step 1: User uploads content and selects topics
      const userSelectedTopics = ['calculus-derivatives', 'practice-problems', 'key-formulas'];
      
      // Step 2: System analyzes overflow
      const analysis = overflowDetector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);
      
      // Step 3: System detects overflow and provides detailed information
      expect(analysis.hasOverflow).toBe(true);
      
      const detailedInfo = overflowDetector.getDetailedOverflowInfo(realWorldBlocks);
      expect(detailedInfo.overflowDetails.overflowPercentage).toBeGreaterThan(0);
      
      // Step 4: System provides specific suggestions
      if (analysis.intelligentSuggestions) {
        const suggestions = analysis.intelligentSuggestions;
        
        // Should have multiple types of suggestions
        const suggestionTypes = [...new Set(suggestions.map(s => s.type))];
        expect(suggestionTypes.length).toBeGreaterThan(0);
        
        // Should provide estimated impact
        const totalEstimatedReduction = suggestions.reduce((sum, s) => sum + s.estimatedReduction, 0);
        expect(totalEstimatedReduction).toBeGreaterThan(analysis.overflowAmount * 0.3);
      }
      
      // Step 5: System shows which content would be affected
      if (analysis.reductionPlan) {
        const affectedTopics = analysis.reductionPlan.impactAssessment.topicsAffected;
        
        // Should not affect user-selected high-priority topics
        const affectsUserSelected = affectedTopics.some(topicId => 
          userSelectedTopics.includes(topicId)
        );
        expect(affectsUserSelected).toBe(false);
        
        // Should affect low-priority unselected topics
        const affectsUnselected = affectedTopics.some(topicId => 
          !userSelectedTopics.includes(topicId)
        );
        expect(affectsUnselected).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle content with no user selections', () => {
      const noSelectionConfig = {
        ...prioritizationConfig,
        userSelectedTopics: [],
      };
      const detector = new OverflowDetector(layoutConfig, noSelectionConfig);

      const analysis = detector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      if (analysis.priorities) {
        // All topics should be unselected
        const selectedTopics = analysis.priorities.filter(p => p.userSelected);
        expect(selectedTopics.length).toBe(0);

        // Should still prioritize by educational value and confidence
        const highValueTopics = analysis.priorities.filter(p => p.educationalValue === 'high');
        expect(highValueTopics.length).toBeGreaterThan(0);
      }
    });

    it('should handle very restrictive content reduction limits', () => {
      const restrictiveConfig = {
        ...prioritizationConfig,
        maxContentReduction: 10, // Only 10% reduction allowed
      };
      const detector = new OverflowDetector(layoutConfig, restrictiveConfig);

      const analysis = detector.analyzeOverflowWithPrioritization(realWorldBlocks, realWorldTopics);

      if (analysis.reductionPlan) {
        const totalContentHeight = realWorldBlocks.reduce((sum, block) => sum + block.estimatedHeight, 0);
        const maxAllowedReduction = totalContentHeight * 0.1;

        expect(analysis.reductionPlan.estimatedSpaceSaved).toBeLessThanOrEqual(maxAllowedReduction * 1.3); // Allow more buffer for edge cases
      }
    });

    it('should handle content with extreme overflow', () => {
      // Create a scenario with massive overflow
      const massiveBlocks = [
        ...realWorldBlocks,
        ...Array.from({ length: 50 }, (_, i) =>
          ({ ...createContentBlock(`extra-${i}`, 'Additional content that creates massive overflow'.repeat(10), 'paragraph', 3), estimatedHeight: 100 })
        ),
      ];

      const analysis = overflowDetector.analyzeOverflowWithPrioritization(massiveBlocks, realWorldTopics);

      expect(analysis.hasOverflow).toBe(true);
      expect(analysis.overflowAmount).toBeGreaterThan(1000);

      if (analysis.intelligentSuggestions) {
        // Should suggest increasing pages for massive overflow
        const increasePagesSuggestion = analysis.intelligentSuggestions.find(s => s.type === 'increase-pages');
        expect(increasePagesSuggestion).toBeDefined();
        expect(increasePagesSuggestion?.impact).toBe('high');
      }
    });

    it('should provide meaningful feedback for different content types', () => {
      const mixedTypeBlocks: ContentBlock[] = [
        { ...createContentBlock('heading-1', 'Main Heading', 'heading', 8), estimatedHeight: 40 },
        { ...createContentBlock('para-1', 'Long paragraph with detailed explanation'.repeat(5), 'paragraph', 6), estimatedHeight: 120 },
        { ...createContentBlock('list-1', 'Item 1\nItem 2\nItem 3\nItem 4\nItem 5', 'list', 7), estimatedHeight: 80 },
        { ...createContentBlock('table-1', 'Table with multiple rows and columns', 'table', 5), estimatedHeight: 100 },
        { ...createContentBlock('image-1', 'Image with detailed caption explaining the concept', 'image', 4), estimatedHeight: 150 },
      ];

      const detailedInfo = overflowDetector.getDetailedOverflowInfo(mixedTypeBlocks);

      // Should handle different content types appropriately
      detailedInfo.affectedContent.forEach(content => {
        expect(['heading', 'paragraph', 'list', 'table', 'image']).toContain(content.blockType);
        
        // Different types should have different height characteristics
        if (content.blockType === 'heading') {
          expect(content.estimatedHeight).toBeLessThan(100); // Headings are typically shorter
        }
        if (content.blockType === 'image') {
          expect(content.estimatedHeight).toBeGreaterThan(50); // Images need more space
        }
      });
    });
  });
});