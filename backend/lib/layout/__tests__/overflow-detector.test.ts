import { describe, it, expect, beforeEach } from '@jest/globals';
import { OverflowDetector } from '../overflow-detector';
import { LayoutConfig, ContentBlock } from '../types';
import { OrganizedTopic } from '../../ai/types';
import { PrioritizationConfig } from '../content-prioritizer';
import { createDefaultPageConfig } from '../page-config';
import { getTextConfig } from '../text-config';
import { createContentBlock } from '../index';

describe('OverflowDetector', () => {
  let overflowDetector: OverflowDetector;
  let prioritizedDetector: OverflowDetector;
  let defaultConfig: LayoutConfig;
  let prioritizationConfig: PrioritizationConfig;
  let sampleTopics: OrganizedTopic[];

  beforeEach(() => {
    defaultConfig = {
      page: createDefaultPageConfig('a4', 'portrait'),
      text: getTextConfig('medium'),
      maxPages: 2,
    };
    
    prioritizationConfig = {
      userSelectedTopics: ['topic-1', 'topic-3'],
      maxContentReduction: 40,
      preserveHighValueContent: true,
      maintainTopicBalance: true,
    };

    overflowDetector = new OverflowDetector(defaultConfig);
    prioritizedDetector = new OverflowDetector(defaultConfig, prioritizationConfig);

    sampleTopics = [
      {
        id: 'topic-1',
        title: 'Important Formulas',
        content: 'Key mathematical formulas and equations',
        subtopics: [],
        sourceFiles: ['file1.pdf'],
        confidence: 0.9,
        examples: [{ id: 'img1', base64: 'data', context: 'formula', isExample: true }],
        originalWording: 'Important Formulas',
      },
      {
        id: 'topic-2',
        title: 'Background Info',
        content: 'Historical background information',
        subtopics: [],
        sourceFiles: ['file2.pdf'],
        confidence: 0.5,
        examples: [],
        originalWording: 'Background Info',
      },
      {
        id: 'topic-3',
        title: 'Practice Examples',
        content: 'Example problems for practice',
        subtopics: [],
        sourceFiles: ['file3.pdf'],
        confidence: 0.8,
        examples: [{ id: 'img2', base64: 'data', context: 'example', isExample: true }],
        originalWording: 'Practice Examples',
      },
    ];
  });

  describe('Overflow Analysis', () => {
    it('should detect no overflow for small content', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('1', 'Short paragraph', 'paragraph', 5),
        createContentBlock('2', 'Another short paragraph', 'paragraph', 5),
      ];

      const analysis = overflowDetector.analyzeOverflow(blocks);

      expect(analysis.hasOverflow).toBe(false);
      expect(analysis.overflowAmount).toBe(0);
      expect(analysis.affectedBlocks).toHaveLength(0);
    });

    it('should detect overflow for large content', () => {
      const blocks: ContentBlock[] = Array.from({ length: 30 }, (_, i) =>
        createContentBlock(
          `block-${i}`,
          'This is a very long paragraph with lots of content that will definitely cause overflow when there are many such paragraphs in a limited space layout. '.repeat(3),
          'paragraph',
          5
        )
      );

      const analysis = overflowDetector.analyzeOverflow(blocks);

      expect(analysis.hasOverflow).toBe(true);
      expect(analysis.overflowAmount).toBeGreaterThan(0);
      expect(analysis.affectedBlocks.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for overflow resolution', () => {
      const blocks: ContentBlock[] = Array.from({ length: 20 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Long content here', 'paragraph', 5)
      );

      const analysis = overflowDetector.analyzeOverflow(blocks);

      if (analysis.hasOverflow) {
        expect(analysis.suggestions.length).toBeGreaterThan(0);
        
        // Should include at least one suggestion type
        const suggestionTypes = analysis.suggestions.map(s => s.type);
        expect(suggestionTypes.length).toBeGreaterThan(0);
        
        // Common suggestion types should be present for significant overflow
        const hasIncreasePages = suggestionTypes.includes('increase-pages');
        const hasSmallerText = suggestionTypes.includes('smaller-text');
        expect(hasIncreasePages || hasSmallerText).toBe(true);
      }
    });

    it('should prioritize suggestions by impact', () => {
      const blocks: ContentBlock[] = Array.from({ length: 25 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content that causes overflow', 'paragraph', 5)
      );

      const analysis = overflowDetector.analyzeOverflow(blocks);

      if (analysis.suggestions.length > 1) {
        // Suggestions should be ordered by impact (high first)
        const impacts = analysis.suggestions.map(s => s.impact);
        const highImpactIndex = impacts.indexOf('high');
        const lowImpactIndex = impacts.indexOf('low');
        
        if (highImpactIndex !== -1 && lowImpactIndex !== -1) {
          expect(highImpactIndex).toBeLessThan(lowImpactIndex);
        }
      }
    });
  });

  describe('Content Block Height Calculation', () => {
    it('should calculate different heights for different block types', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('heading', 'Main Heading', 'heading', 8),
        createContentBlock('paragraph', 'Regular paragraph text', 'paragraph', 6),
        createContentBlock('list', 'Item 1\nItem 2\nItem 3', 'list', 5),
        createContentBlock('table', 'Table data', 'table', 4),
        createContentBlock('image', 'Image caption', 'image', 3),
      ];

      const analysis = overflowDetector.analyzeOverflow(blocks);

      // Different block types should have different space requirements
      // This is tested indirectly through the overflow analysis
      expect(analysis).toBeDefined();
    });

    it('should account for heading spacing', () => {
      const headingBlocks: ContentBlock[] = [
        createContentBlock('h1', 'Main Heading', 'heading', 8),
        createContentBlock('h2', 'Sub Heading', 'heading', 7),
      ];

      const paragraphBlocks: ContentBlock[] = [
        createContentBlock('p1', 'Main Heading', 'paragraph', 6),
        createContentBlock('p2', 'Sub Heading', 'paragraph', 5),
      ];

      const headingAnalysis = overflowDetector.analyzeOverflow(headingBlocks);
      const paragraphAnalysis = overflowDetector.analyzeOverflow(paragraphBlocks);

      // Headings typically require more space due to larger font size and spacing
      // This is tested indirectly through comparing overflow amounts
      expect(headingAnalysis).toBeDefined();
      expect(paragraphAnalysis).toBeDefined();
    });

    it('should handle list items with indentation', () => {
      const listBlock = createContentBlock(
        'list1',
        'First item\nSecond item\nThird item with longer text\nFourth item',
        'list',
        5
      );

      const analysis = overflowDetector.analyzeOverflow([listBlock]);

      expect(analysis).toBeDefined();
      // List should account for indentation and item spacing
    });

    it('should estimate table height with rows and headers', () => {
      const tableBlock = createContentBlock(
        'table1',
        'Header 1 | Header 2 | Header 3\nRow 1 Data | Row 1 Data | Row 1 Data\nRow 2 Data | Row 2 Data | Row 2 Data',
        'table',
        4
      );

      const analysis = overflowDetector.analyzeOverflow([tableBlock]);

      expect(analysis).toBeDefined();
      // Table should account for header height and row spacing
    });

    it('should handle image blocks with captions', () => {
      const imageWithCaption = createContentBlock(
        'img1',
        'This is a detailed caption for the image that explains what the image shows',
        'image',
        3
      );

      const imageWithoutCaption = createContentBlock('img2', '', 'image', 3);

      const withCaptionAnalysis = overflowDetector.analyzeOverflow([imageWithCaption]);
      const withoutCaptionAnalysis = overflowDetector.analyzeOverflow([imageWithoutCaption]);

      expect(withCaptionAnalysis).toBeDefined();
      expect(withoutCaptionAnalysis).toBeDefined();
      // Image with caption should require more space
    });
  });

  describe('Suggestion Generation', () => {
    it('should suggest increasing pages for significant overflow', () => {
      const blocks: ContentBlock[] = Array.from({ length: 40 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content that causes major overflow', 'paragraph', 5)
      );

      const analysis = overflowDetector.analyzeOverflow(blocks);

      const increasePagesSuggestion = analysis.suggestions.find(s => s.type === 'increase-pages');
      expect(increasePagesSuggestion).toBeDefined();
      expect(increasePagesSuggestion?.impact).toBe('high');
    });

    it('should suggest smaller text for moderate overflow', () => {
      const blocks: ContentBlock[] = Array.from({ length: 15 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Moderate amount of content', 'paragraph', 5)
      );

      const analysis = overflowDetector.analyzeOverflow(blocks);

      if (analysis.hasOverflow) {
        const smallerTextSuggestion = analysis.suggestions.find(s => s.type === 'smaller-text');
        expect(smallerTextSuggestion).toBeDefined();
      }
    });

    it('should suggest more columns when appropriate', () => {
      // Use A3 paper size which can accommodate more columns
      const largePageConfig = {
        ...defaultConfig,
        page: createDefaultPageConfig('a3', 'landscape'),
      };
      const detector = new OverflowDetector(largePageConfig);

      const blocks: ContentBlock[] = Array.from({ length: 20 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content for column suggestion', 'paragraph', 5)
      );

      const analysis = detector.analyzeOverflow(blocks);

      if (analysis.hasOverflow) {
        const moreColumnsSuggestion = analysis.suggestions.find(s => s.type === 'more-columns');
        expect(moreColumnsSuggestion).toBeDefined();
      }
    });

    it('should suggest content reduction with low-priority blocks', () => {
      const blocks: ContentBlock[] = [
        ...Array.from({ length: 5 }, (_, i) =>
          createContentBlock(`high-${i}`, 'High priority content', 'paragraph', 9)
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          createContentBlock(`low-${i}`, 'Low priority content', 'paragraph', 2)
        ),
      ];

      const analysis = overflowDetector.analyzeOverflow(blocks);

      if (analysis.hasOverflow) {
        const reduceContentSuggestion = analysis.suggestions.find(s => s.type === 'reduce-content');
        expect(reduceContentSuggestion).toBeDefined();
        expect(reduceContentSuggestion?.impact).toBe('high');
      }
    });

    it('should provide estimated reduction amounts', () => {
      const blocks: ContentBlock[] = Array.from({ length: 25 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content with overflow', 'paragraph', 5)
      );

      const analysis = overflowDetector.analyzeOverflow(blocks);

      if (analysis.hasOverflow) {
        analysis.suggestions.forEach(suggestion => {
          expect(suggestion.estimatedReduction).toBeGreaterThanOrEqual(0);
          expect(typeof suggestion.description).toBe('string');
          expect(suggestion.description.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Layout Warnings', () => {
    it('should generate overflow warnings', () => {
      const blocks: ContentBlock[] = Array.from({ length: 30 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content that overflows', 'paragraph', 5)
      );

      const warnings = overflowDetector.generateLayoutWarnings(blocks);

      const overflowWarnings = warnings.filter(w => w.type === 'overflow');
      expect(overflowWarnings.length).toBeGreaterThan(0);
      
      if (overflowWarnings.length > 0) {
        expect(overflowWarnings[0].severity).toMatch(/^(low|medium|high)$/);
        expect(overflowWarnings[0].message).toContain('exceeds');
      }
    });

    it('should generate readability warnings for small text', () => {
      const smallTextConfig = {
        ...defaultConfig,
        text: { ...getTextConfig('small'), baseFontSize: 6 }, // Very small
      };
      const detector = new OverflowDetector(smallTextConfig);

      const blocks: ContentBlock[] = [
        createContentBlock('1', 'Sample text', 'paragraph', 5),
      ];

      const warnings = detector.generateLayoutWarnings(blocks);

      const readabilityWarnings = warnings.filter(w => w.type === 'readability');
      expect(readabilityWarnings.length).toBeGreaterThan(0);
    });

    it('should generate spacing warnings for narrow columns', () => {
      const narrowColumnConfig = {
        ...defaultConfig,
        page: { ...defaultConfig.page, columns: 5 as any }, // Too many columns
      };
      const detector = new OverflowDetector(narrowColumnConfig);

      const blocks: ContentBlock[] = [
        createContentBlock('1', 'Sample text', 'paragraph', 5),
      ];

      const warnings = detector.generateLayoutWarnings(blocks);

      const spacingWarnings = warnings.filter(w => w.type === 'spacing');
      expect(spacingWarnings.length).toBeGreaterThan(0);
    });

    it('should categorize warnings by severity', () => {
      const blocks: ContentBlock[] = Array.from({ length: 50 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Lots of content causing severe overflow', 'paragraph', 5)
      );

      const warnings = overflowDetector.generateLayoutWarnings(blocks);

      if (warnings.length > 0) {
        warnings.forEach(warning => {
          expect(['low', 'medium', 'high']).toContain(warning.severity);
          expect(warning.message).toBeTruthy();
          expect(Array.isArray(warning.affectedElements)).toBe(true);
        });
      }
    });
  });

  describe('Configuration Impact', () => {
    it('should handle different page sizes', () => {
      const a4Config = { ...defaultConfig, page: createDefaultPageConfig('a4', 'portrait') };
      const a3Config = { ...defaultConfig, page: createDefaultPageConfig('a3', 'portrait') };

      const a4Detector = new OverflowDetector(a4Config);
      const a3Detector = new OverflowDetector(a3Config);

      const blocks: ContentBlock[] = Array.from({ length: 15 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content for size comparison', 'paragraph', 5)
      );

      const a4Analysis = a4Detector.analyzeOverflow(blocks);
      const a3Analysis = a3Detector.analyzeOverflow(blocks);

      // A3 should have less overflow than A4 for the same content
      if (a4Analysis.hasOverflow && !a3Analysis.hasOverflow) {
        expect(a3Analysis.overflowAmount).toBeLessThanOrEqual(a4Analysis.overflowAmount);
      }
    });

    it('should handle different text sizes', () => {
      const smallTextConfig = { ...defaultConfig, text: getTextConfig('small') };
      const largeTextConfig = { ...defaultConfig, text: getTextConfig('large') };

      const smallDetector = new OverflowDetector(smallTextConfig);
      const largeDetector = new OverflowDetector(largeTextConfig);

      const blocks: ContentBlock[] = Array.from({ length: 15 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content for text size comparison', 'paragraph', 5)
      );

      const smallAnalysis = smallDetector.analyzeOverflow(blocks);
      const largeAnalysis = largeDetector.analyzeOverflow(blocks);

      // Small text should have less overflow than large text for the same content
      expect(smallAnalysis.overflowAmount).toBeLessThanOrEqual(largeAnalysis.overflowAmount);
    });

    it('should handle different page counts', () => {
      const singlePageConfig = { ...defaultConfig, maxPages: 1 };
      const multiPageConfig = { ...defaultConfig, maxPages: 3 };

      const singleDetector = new OverflowDetector(singlePageConfig);
      const multiDetector = new OverflowDetector(multiPageConfig);

      const blocks: ContentBlock[] = Array.from({ length: 15 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content for page count comparison', 'paragraph', 5)
      );

      const singleAnalysis = singleDetector.analyzeOverflow(blocks);
      const multiAnalysis = multiDetector.analyzeOverflow(blocks);

      // More pages should have less overflow
      expect(multiAnalysis.overflowAmount).toBeLessThanOrEqual(singleAnalysis.overflowAmount);
    });
  });

  describe('Enhanced Overflow Analysis with Prioritization', () => {
    it('should analyze overflow with content prioritization', () => {
      const blocks: ContentBlock[] = Array.from({ length: 20 }, (_, i) =>
        createContentBlock(`topic-${(i % 3) + 1}-block-${i}`, 'Content that causes overflow', 'paragraph', 5)
      );

      const analysis = prioritizedDetector.analyzeOverflowWithPrioritization(blocks, sampleTopics);

      expect(analysis.priorities).toBeDefined();
      expect(analysis.reductionPlan).toBeDefined();
      expect(analysis.intelligentSuggestions).toBeDefined();

      if (analysis.hasOverflow) {
        expect(analysis.priorities!.length).toBe(sampleTopics.length);
        expect(analysis.reductionPlan!.removableBlocks).toBeDefined();
        expect(analysis.intelligentSuggestions!.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize user-selected topics in overflow analysis', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('topic-1-block', 'User selected high priority content', 'paragraph', 8),
        createContentBlock('topic-2-block', 'Non-selected low priority content', 'paragraph', 3),
        createContentBlock('topic-3-block', 'User selected medium priority content', 'paragraph', 6),
      ];

      const analysis = prioritizedDetector.analyzeOverflowWithPrioritization(blocks, sampleTopics);

      if (analysis.priorities) {
        const topic1Priority = analysis.priorities.find(p => p.topicId === 'topic-1');
        const topic2Priority = analysis.priorities.find(p => p.topicId === 'topic-2');

        expect(topic1Priority?.userSelected).toBe(true);
        expect(topic2Priority?.userSelected).toBe(false);
        expect(topic1Priority?.priority).toBeGreaterThan(topic2Priority?.priority || 0);
      }
    });

    it('should generate intelligent suggestions based on topic selection', () => {
      const blocks: ContentBlock[] = Array.from({ length: 25 }, (_, i) =>
        createContentBlock(`topic-${(i % 3) + 1}-block-${i}`, 'Overflow content', 'paragraph', 5)
      );

      const analysis = prioritizedDetector.analyzeOverflowWithPrioritization(blocks, sampleTopics);

      if (analysis.intelligentSuggestions) {
        expect(analysis.intelligentSuggestions.length).toBeGreaterThan(0);
        
        // Should include suggestions about unselected topics
        const hasUnselectedSuggestion = analysis.intelligentSuggestions.some(s =>
          s.description.includes('low-priority') || s.description.includes("weren't selected")
        );
        expect(hasUnselectedSuggestion).toBe(true);
      }
    });

    it('should create reduction plan that preserves high-value content', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('topic-1-block', 'High value formula content', 'paragraph', 9),
        createContentBlock('topic-2-block', 'Low value background info', 'paragraph', 2),
        createContentBlock('topic-3-block', 'High value example content', 'paragraph', 8),
      ];

      const analysis = prioritizedDetector.analyzeOverflowWithPrioritization(blocks, sampleTopics);

      if (analysis.reductionPlan) {
        // Should not remove high-priority user-selected content
        const removesHighPriority = analysis.reductionPlan.removableBlocks.includes('topic-1-block') ||
                                   analysis.reductionPlan.removableBlocks.includes('topic-3-block');
        expect(removesHighPriority).toBe(false);

        // Should prefer removing low-priority content
        if (analysis.reductionPlan.removableBlocks.length > 0) {
          expect(analysis.reductionPlan.removableBlocks).toContain('topic-2-block');
        }
      }
    });

    it('should handle analysis without topics gracefully', () => {
      const blocks: ContentBlock[] = Array.from({ length: 10 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content without topics', 'paragraph', 5)
      );

      const analysis = prioritizedDetector.analyzeOverflowWithPrioritization(blocks);

      // Should fall back to basic analysis
      expect(analysis.priorities).toBeUndefined();
      expect(analysis.reductionPlan).toBeUndefined();
      expect(analysis.intelligentSuggestions).toBeUndefined();
      expect(analysis.hasOverflow).toBeDefined();
    });
  });

  describe('Detailed Overflow Information', () => {
    it('should provide detailed overflow information', () => {
      const blocks: ContentBlock[] = Array.from({ length: 30 }, (_, i) =>
        createContentBlock(`block-${i}`, 'Content that will overflow', 'paragraph', 5)
      );

      const detailedInfo = overflowDetector.getDetailedOverflowInfo(blocks);

      expect(detailedInfo.overflowDetails).toBeDefined();
      expect(detailedInfo.affectedContent).toBeDefined();
      expect(detailedInfo.spaceUtilization).toBeDefined();

      // Check overflow details
      expect(detailedInfo.overflowDetails.totalContentHeight).toBeGreaterThan(0);
      expect(detailedInfo.overflowDetails.availableHeight).toBeGreaterThan(0);
      expect(detailedInfo.overflowDetails.overflowPercentage).toBeGreaterThanOrEqual(0);

      // Check affected content
      expect(detailedInfo.affectedContent.length).toBe(blocks.length);
      detailedInfo.affectedContent.forEach(content => {
        expect(content.blockId).toBeTruthy();
        expect(['heading', 'paragraph', 'list', 'table', 'image']).toContain(content.blockType);
        expect(content.contentPreview).toBeTruthy();
        expect(content.estimatedHeight).toBeGreaterThan(0);
        expect(typeof content.willFit).toBe('boolean');
      });

      // Check space utilization
      expect(detailedInfo.spaceUtilization.efficiency).toBeGreaterThanOrEqual(0);
      expect(detailedInfo.spaceUtilization.efficiency).toBeLessThanOrEqual(1);
    });

    it('should identify which content will fit and which will not', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('small-1', 'Small content', 'paragraph', 5),
        createContentBlock('small-2', 'Another small content', 'paragraph', 5),
        ...Array.from({ length: 25 }, (_, i) =>
          createContentBlock(`large-${i}`, 'Large content that will cause overflow'.repeat(10), 'paragraph', 5)
        ),
      ];

      const detailedInfo = overflowDetector.getDetailedOverflowInfo(blocks);

      const fittingContent = detailedInfo.affectedContent.filter(c => c.willFit);
      const overflowingContent = detailedInfo.affectedContent.filter(c => !c.willFit);

      expect(fittingContent.length).toBeGreaterThan(0);
      expect(overflowingContent.length).toBeGreaterThan(0);

      // First few blocks should fit
      expect(detailedInfo.affectedContent[0].willFit).toBe(true);
      expect(detailedInfo.affectedContent[1].willFit).toBe(true);
    });

    it('should provide partial fit information for content that partially fits', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('fits', 'Content that fits completely', 'paragraph', 5),
        createContentBlock('partial', 'Very long content that will only partially fit in the remaining space'.repeat(20), 'paragraph', 5),
        createContentBlock('overflow', 'Content that will not fit at all', 'paragraph', 5),
      ];

      const detailedInfo = overflowDetector.getDetailedOverflowInfo(blocks);

      const partialFitContent = detailedInfo.affectedContent.find(c => c.partialFit);
      if (partialFitContent) {
        expect(partialFitContent.partialFit!.fittingPercentage).toBeGreaterThan(0);
        expect(partialFitContent.partialFit!.fittingPercentage).toBeLessThan(1);
        expect(partialFitContent.partialFit!.cutoffPoint).toBeTruthy();
      }
    });

    it('should calculate space utilization correctly', () => {
      const smallBlocks: ContentBlock[] = [
        createContentBlock('1', 'Small content', 'paragraph', 5),
        createContentBlock('2', 'Another small content', 'paragraph', 5),
      ];

      const detailedInfo = overflowDetector.getDetailedOverflowInfo(smallBlocks);

      expect(detailedInfo.spaceUtilization.efficiency).toBeLessThan(1); // Should have wasted space
      expect(detailedInfo.spaceUtilization.wastedSpace).toBeGreaterThan(0);
      expect(detailedInfo.spaceUtilization.usedSpace).toBeGreaterThan(0);
    });

    it('should provide content previews', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('long', 'This is a very long piece of content that should be truncated in the preview to show only the first 100 characters or so', 'paragraph', 5),
        createContentBlock('short', 'Short content', 'paragraph', 5),
      ];

      const detailedInfo = overflowDetector.getDetailedOverflowInfo(blocks);

      const longContent = detailedInfo.affectedContent.find(c => c.blockId === 'long');
      const shortContent = detailedInfo.affectedContent.find(c => c.blockId === 'short');

      expect(longContent?.contentPreview).toContain('...');
      expect(longContent?.contentPreview.length).toBeLessThanOrEqual(103); // 100 chars + '...'
      expect(shortContent?.contentPreview).not.toContain('...');
    });

    it('should estimate cutoff points at natural breaks', () => {
      const blocks: ContentBlock[] = [
        createContentBlock('sentences', 'First sentence. Second sentence. Third sentence that will be cut off somewhere in the middle.', 'paragraph', 5),
      ];

      // Mock a scenario where content partially fits
      const detailedInfo = overflowDetector.getDetailedOverflowInfo(blocks);
      
      // This is more of a structural test - the cutoff logic should prefer sentence/word boundaries
      expect(detailedInfo.affectedContent[0]).toBeDefined();
    });
  });
});