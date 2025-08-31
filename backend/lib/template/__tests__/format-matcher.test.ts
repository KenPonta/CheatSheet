/**
 * Tests for ReferenceFormatMatcher
 */

import { ReferenceFormatMatcher } from '../format-matcher';
import { ContentDensityAnalyzer } from '../content-density-analyzer';
import { ExtractedContent, OrganizedTopic } from '../../ai/types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock dependencies
jest.mock('../analyzer');
jest.mock('../applicator');
jest.mock('../css-generator');

describe('ReferenceFormatMatcher', () => {
  let formatMatcher: ReferenceFormatMatcher;
  let densityAnalyzer: ContentDensityAnalyzer;
  let mockReferenceFile: File;
  let mockUserContent: ExtractedContent[];
  let mockUserTopics: OrganizedTopic[];

  beforeEach(() => {
    formatMatcher = new ReferenceFormatMatcher();
    densityAnalyzer = new ContentDensityAnalyzer();

    // Create mock reference file
    mockReferenceFile = new File(['mock pdf content'], 'reference-template.pdf', {
      type: 'application/pdf'
    });

    // Create mock user content
    mockUserContent = [
      {
        text: 'User content about mathematics including algebra calculus and geometry concepts with detailed explanations and examples for students learning mathematical principles.',
        images: [
          {
            id: 'img_1',
            base64: 'base64data',
            context: 'Mathematical diagram',
            isExample: true
          }
        ],
        tables: [
          {
            id: 'table_1',
            headers: ['Formula', 'Description'],
            rows: [['x = y + z', 'Linear equation']],
            context: 'Formula reference'
          }
        ],
        metadata: {
          name: 'user-math-content.pdf',
          size: 2048,
          type: 'application/pdf',
          lastModified: new Date(),
          wordCount: 25 // Actual word count
        },
        structure: {
          headings: [
            { level: 1, text: 'Mathematics Fundamentals', position: 0 },
            { level: 2, text: 'Algebra', position: 50 },
            { level: 2, text: 'Calculus', position: 100 }
          ],
          sections: [
            { title: 'Mathematics Fundamentals', content: 'Introduction to math', startPosition: 0, endPosition: 49 },
            { title: 'Algebra', content: 'Algebraic concepts', startPosition: 50, endPosition: 99 },
            { title: 'Calculus', content: 'Calculus principles', startPosition: 100, endPosition: 149 }
          ],
          hierarchy: 2
        }
      }
    ];

    // Create mock user topics
    mockUserTopics = [
      {
        id: 'topic_1',
        title: 'Algebra Fundamentals',
        content: 'Basic algebraic operations including addition, subtraction, multiplication, and division of variables and constants.',
        subtopics: [
          {
            id: 'subtopic_1_1',
            title: 'Linear Equations',
            content: 'Solving equations of the form ax + b = c',
            priority: 'high',
            estimatedSpace: 50,
            isSelected: true,
            sourceLocation: { fileId: 'file_1', page: 1 },
            parentTopicId: 'topic_1'
          }
        ],
        sourceFiles: ['user-math-content.pdf'],
        confidence: 0.9,
        priority: 'high',
        examples: [],
        originalWording: 'Basic algebraic operations including addition, subtraction, multiplication, and division of variables and constants.',
        estimatedSpace: 120,
        isSelected: true
      },
      {
        id: 'topic_2',
        title: 'Calculus Basics',
        content: 'Introduction to derivatives and integrals with practical applications in physics and engineering.',
        subtopics: [
          {
            id: 'subtopic_2_1',
            title: 'Derivatives',
            content: 'Rate of change calculations',
            priority: 'medium',
            estimatedSpace: 40,
            isSelected: true,
            sourceLocation: { fileId: 'file_1', page: 2 },
            parentTopicId: 'topic_2'
          }
        ],
        sourceFiles: ['user-math-content.pdf'],
        confidence: 0.8,
        priority: 'medium',
        examples: [],
        originalWording: 'Introduction to derivatives and integrals with practical applications in physics and engineering.',
        estimatedSpace: 100,
        isSelected: true
      },
      {
        id: 'topic_3',
        title: 'Geometry Concepts',
        content: 'Basic geometric shapes, area calculations, and spatial relationships.',
        subtopics: [],
        sourceFiles: ['user-math-content.pdf'],
        confidence: 0.7,
        priority: 'low',
        examples: [],
        originalWording: 'Basic geometric shapes, area calculations, and spatial relationships.',
        estimatedSpace: 80,
        isSelected: true
      }
    ];

    // Mock the analyzer to return a realistic template analysis
    const mockAnalyzer = require('../analyzer').TemplateAnalyzer;
    const mockAnalyzeTemplate = jest.fn().mockResolvedValue({
      id: 'template_123',
      name: 'reference-template.pdf',
      file: mockReferenceFile,
      analysis: {
        layout: {
          pageConfig: {
            paperSize: 'a4',
            orientation: 'portrait',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            columns: 2,
            columnGap: 15
          },
          columnStructure: {
            count: 2,
            widths: [50, 50],
            gaps: [15],
            alignment: 'left'
          },
          spacing: {
            lineHeight: 1.3,
            paragraphSpacing: 10,
            sectionSpacing: 20,
            headingSpacing: { before: 12, after: 6 }
          },
          margins: { top: 20, right: 20, bottom: 20, left: 20, unit: 'mm' },
          pageBreaks: []
        },
        typography: {
          fontFamilies: [
            { name: 'Arial', usage: 'body', fallbacks: ['Helvetica', 'sans-serif'] }
          ],
          headingStyles: [
            {
              level: 1,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'Arial Bold',
              color: '#000000',
              marginTop: 12,
              marginBottom: 6
            },
            {
              level: 2,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Arial Bold',
              color: '#333333',
              marginTop: 10,
              marginBottom: 4
            }
          ],
          bodyTextStyle: {
            fontSize: 10,
            fontWeight: 400,
            fontFamily: 'Arial',
            color: '#000000',
            lineHeight: 1.3,
            textAlign: 'left'
          },
          emphasisStyles: [],
          listStyles: []
        },
        organization: {
          structure: {
            sections: [],
            topicDistribution: {
              averageTopicsPerPage: 4,
              topicLengthVariation: 'varied',
              topicSeparation: 'spacing'
            },
            contentDensity: 400 // High density reference
          },
          hierarchy: {
            maxDepth: 2,
            levelIndicators: ['1.', '1.1'],
            indentationRules: []
          },
          grouping: [],
          flow: {
            direction: 'top-to-bottom',
            continuity: 'sectioned',
            breakPoints: []
          }
        },
        visual: {
          colorScheme: {
            primary: '#000000',
            secondary: '#333333',
            accent: '#0066cc',
            text: '#000000',
            background: '#ffffff',
            muted: '#f5f5f5'
          },
          borders: [],
          backgrounds: [],
          icons: [],
          emphasis: []
        },
        metadata: {
          pageCount: 1,
          wordCount: 400,
          topicCount: 4,
          complexity: 'moderate',
          domain: 'mathematics',
          quality: {
            score: 0.85,
            factors: {
              readability: 0.8,
              organization: 0.9,
              consistency: 0.8,
              density: 0.9
            },
            issues: []
          }
        }
      },
      extractedContent: {
        text: 'Reference template content with mathematical formulas and concepts',
        images: [],
        tables: [],
        metadata: {
          name: 'reference-template.pdf',
          size: 1024,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [
            { level: 1, text: 'Math Reference', position: 0 },
            { level: 2, text: 'Formulas', position: 50 }
          ],
          sections: [
            { title: 'Math Reference', content: 'Reference content', startPosition: 0, endPosition: 49 },
            { title: 'Formulas', content: 'Formula content', startPosition: 50, endPosition: 99 }
          ],
          hierarchy: 2
        }
      },
      createdAt: new Date()
    });
    mockAnalyzer.prototype.analyzeTemplate = mockAnalyzeTemplate;

    // Mock CSS generator
    const mockCSSGenerator = require('../css-generator').CSSGenerator;
    mockCSSGenerator.prototype.generateCSS = jest.fn().mockReturnValue({
      css: 'body { font-family: Arial; font-size: 10px; }',
      variables: {
        colors: { 'color-primary': '#000000' },
        typography: { 'font-size-base': '10px' },
        spacing: { 'spacing-md': '16px' },
        layout: { 'column-count': '2' }
      },
      classes: {
        layout: ['container', 'content'],
        typography: ['h1', 'h2'],
        components: ['topic', 'subtopic'],
        utilities: ['mb-1', 'mt-2']
      },
      mediaQueries: [
        { condition: 'screen and (max-width: 768px)', styles: '.content { columns: 1; }' }
      ],
      printStyles: '@media print { body { font-size: 9px; } }'
    });
  });

  describe('matchFormat', () => {
    it('should successfully match format with default options', async () => {
      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        mockUserTopics
      );

      expect(result).toBeDefined();
      expect(result.matchingScore).toBeGreaterThanOrEqual(0);
      expect(result.matchingScore).toBeLessThanOrEqual(1);
      expect(result.matchedTemplate).toBeDefined();
      expect(result.adaptedContent).toBeDefined();
      expect(result.generatedCSS).toBeDefined();
      expect(result.contentDensityMatch).toBeDefined();
      expect(result.layoutAdaptation).toBeDefined();
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should handle content density mismatch', async () => {
      // Create user content with much lower density than reference
      const lowDensityContent = [
        {
          ...mockUserContent[0],
          text: 'Short content',
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 50
          }
        }
      ];

      const lowDensityTopics = [mockUserTopics[0]]; // Only one topic

      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        lowDensityContent,
        lowDensityTopics
      );

      expect(result.contentDensityMatch.densityRatio).toBeLessThan(0.8);
      expect(result.contentDensityMatch.adjustmentsMade.length).toBeGreaterThan(0);
      expect(result.contentDensityMatch.adjustmentsMade[0].type).toBe('content-expansion');
    });

    it('should handle high density content requiring reduction', async () => {
      // Create user content with much higher density than reference (400 words per page)
      const highDensityContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 800 }, (_, i) => `word${i}`).join(' '), // 800 words
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 800
          }
        }
      ];

      const manyTopics = Array.from({ length: 10 }, (_, i) => ({
        ...mockUserTopics[0],
        id: `topic_${i}`,
        title: `Topic ${i + 1}`,
        content: Array.from({ length: 80 }, (_, j) => `word${j}`).join(' '), // 80 words each
        priority: i < 3 ? 'high' : i < 6 ? 'medium' : 'low'
      }));

      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        highDensityContent,
        manyTopics
      );

      // With 800 words on 1 page vs reference 400 words per page, ratio should be 2.0
      expect(result.contentDensityMatch.densityRatio).toBeGreaterThan(1.2);
      expect(result.contentDensityMatch.adjustmentsMade.length).toBeGreaterThan(0);
      expect(result.contentDensityMatch.adjustmentsMade[0].type).toBe('content-reduction');
      expect(result.adaptedContent.topicSelectionChanges.length).toBeGreaterThan(0);
    });

    it('should preserve high priority content during density matching', async () => {
      const highDensityTopics = Array.from({ length: 8 }, (_, i) => ({
        ...mockUserTopics[0],
        id: `topic_${i}`,
        title: `Topic ${i + 1}`,
        priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low'
      }));

      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        highDensityTopics
      );

      // High priority topics should be preserved
      const highPriorityTopics = result.adaptedContent.topics.filter(t => t.priority === 'high');
      expect(highPriorityTopics.length).toBe(2);

      // Low priority topics are more likely to be removed
      const removedTopics = result.adaptedContent.topicSelectionChanges.filter(c => c.action === 'removed');
      if (removedTopics.length > 0) {
        const removedTopicIds = removedTopics.map(c => c.topicId);
        const removedTopicPriorities = highDensityTopics
          .filter(t => removedTopicIds.includes(t.id))
          .map(t => t.priority);
        
        // Most removed topics should be low priority
        const lowPriorityRemoved = removedTopicPriorities.filter(p => p === 'low').length;
        expect(lowPriorityRemoved).toBeGreaterThanOrEqual(removedTopicPriorities.length / 2);
      }
    });

    it('should adapt layout while preserving structure when possible', async () => {
      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        mockUserTopics,
        { allowLayoutModifications: true }
      );

      expect(result.layoutAdaptation.structuralFidelity).toBeGreaterThanOrEqual(0);
      expect(result.layoutAdaptation.structuralFidelity).toBeLessThanOrEqual(1);
      expect(result.layoutAdaptation.preservedElements).toBeInstanceOf(Array);
      expect(result.layoutAdaptation.modifiedElements).toBeInstanceOf(Array);

      // Should preserve more elements than it modifies for good templates
      if (result.matchingScore > 0.7) {
        expect(result.layoutAdaptation.preservedElements.length)
          .toBeGreaterThanOrEqual(result.layoutAdaptation.modifiedElements.length);
      }
    });

    it('should generate CSS with high fidelity for compatible content', async () => {
      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        mockUserTopics
      );

      expect(result.generatedCSS.css).toBeDefined();
      expect(result.generatedCSS.css.length).toBeGreaterThan(0);
      expect(result.generatedCSS.matchFidelity).toBeGreaterThanOrEqual(0);
      expect(result.generatedCSS.matchFidelity).toBeLessThanOrEqual(1);
      expect(result.generatedCSS.variables).toBeDefined();
      expect(result.generatedCSS.classes).toBeInstanceOf(Array);
      expect(result.generatedCSS.mediaQueries).toBeInstanceOf(Array);
    });

    it('should generate appropriate warnings for problematic matches', async () => {
      // Create content that will cause multiple issues
      const problematicContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 2000 }, (_, i) => `word${i}`).join(' '), // Too much content
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 2000
          }
        }
      ];

      const manyTopics = Array.from({ length: 15 }, (_, i) => ({
        ...mockUserTopics[0],
        id: `topic_${i}`,
        priority: 'low' // All low priority
      }));

      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        problematicContent,
        manyTopics
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      
      const warningTypes = result.warnings.map(w => w.type);
      expect(warningTypes).toContain('density-mismatch');
      
      // Should have high severity warnings for major issues
      const highSeverityWarnings = result.warnings.filter(w => w.severity === 'high');
      expect(highSeverityWarnings.length).toBeGreaterThan(0);
    });

    it('should respect format matching options', async () => {
      const restrictiveOptions = {
        preserveContentFidelity: true,
        allowLayoutModifications: false,
        matchContentDensity: false,
        adaptTypography: false,
        maintainVisualHierarchy: true
      };

      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        mockUserTopics,
        restrictiveOptions
      );

      // With restrictive options, should have fewer modifications
      expect(result.layoutAdaptation.modifiedElements.length).toBeLessThanOrEqual(2);
      expect(result.adaptedContent.adjustedForDensity).toBe(false);
    });

    it('should calculate meaningful matching scores', async () => {
      // Test with well-matched content
      const wellMatchedResult = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        mockUserTopics
      );

      // Test with poorly matched content
      const poorContent = [
        {
          ...mockUserContent[0],
          text: 'Completely different domain content about cooking recipes',
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 50
          }
        }
      ];

      const poorTopics = [
        {
          ...mockUserTopics[0],
          title: 'Cooking Basics',
          content: 'How to cook pasta',
          priority: 'low'
        }
      ];

      const poorlyMatchedResult = await formatMatcher.matchFormat(
        mockReferenceFile,
        poorContent,
        poorTopics
      );

      // Well-matched content should have higher score
      expect(wellMatchedResult.matchingScore).toBeGreaterThan(poorlyMatchedResult.matchingScore);
    });
  });

  describe('error handling', () => {
    it('should handle invalid reference files gracefully', async () => {
      const invalidFile = new File([''], 'invalid.txt', { type: 'text/plain' });

      // Mock analyzer to throw error for invalid file
      const mockAnalyzer = require('../analyzer').TemplateAnalyzer;
      const originalMock = mockAnalyzer.prototype.analyzeTemplate;
      mockAnalyzer.prototype.analyzeTemplate = jest.fn().mockRejectedValueOnce(
        new Error('Unsupported file type')
      );

      await expect(formatMatcher.matchFormat(
        invalidFile,
        mockUserContent,
        mockUserTopics
      )).rejects.toThrow('Format matching failed');

      // Restore original mock
      mockAnalyzer.prototype.analyzeTemplate = originalMock;
    });

    it('should handle empty user content', async () => {
      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        [],
        []
      );

      expect(result).toBeDefined();
      expect(result.adaptedContent.topics).toHaveLength(0);
      expect(result.contentDensityMatch.userWordsPerPage).toBe(0);
    });

    it('should handle malformed user topics', async () => {
      const malformedTopics = [
        {
          id: 'topic_1',
          title: 'Valid Topic',
          content: 'Valid content',
          // Missing required fields
        } as any
      ];

      // Should not throw error but handle gracefully
      const result = await formatMatcher.matchFormat(
        mockReferenceFile,
        mockUserContent,
        malformedTopics
      );

      expect(result).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('ContentDensityAnalyzer', () => {
  let analyzer: ContentDensityAnalyzer;
  let mockTemplate: any;
  let mockUserContent: ExtractedContent[];
  let mockUserTopics: OrganizedTopic[];

  beforeEach(() => {
    analyzer = new ContentDensityAnalyzer();

    mockTemplate = {
      analysis: {
        metadata: {
          pageCount: 2,
          wordCount: 800,
          topicCount: 6
        },
        organization: {
          structure: {
            contentDensity: 400
          },
          hierarchy: {
            maxDepth: 2,
            indentationRules: [
              { level: 1, amount: 0, unit: 'px' },
              { level: 2, amount: 20, unit: 'px' }
            ]
          }
        },
        layout: {
          spacing: {
            lineHeight: 1.3,
            paragraphSpacing: 10,
            sectionSpacing: 20,
            headingSpacing: { before: 12, after: 6 }
          },
          margins: { top: 20, right: 20, bottom: 20, left: 20, unit: 'mm' }
        }
      },
      extractedContent: {
        text: 'Reference template content with detailed explanations and examples',
        images: [],
        tables: [],
        structure: {
          headings: [
            { level: 1, text: 'Main Topic', position: 0 },
            { level: 2, text: 'Subtopic', position: 50 }
          ],
          sections: []
        }
      }
    };

    mockUserContent = [
      {
        text: 'User content with mathematical concepts and detailed explanations for learning',
        images: [],
        tables: [],
        metadata: {
          name: 'user-content.pdf',
          size: 1024,
          type: 'application/pdf',
          lastModified: new Date(),
          wordCount: 11 // Actual word count
        },
        structure: {
          headings: [
            { level: 1, text: 'User Topic', position: 0 }
          ],
          sections: [
            { title: 'User Topic', content: 'User content', startPosition: 0, endPosition: 10 }
          ],
          hierarchy: 1
        }
      }
    ];

    mockUserTopics = [
      {
        id: 'topic_1',
        title: 'Mathematics',
        content: 'Mathematical concepts and formulas',
        subtopics: [],
        sourceFiles: ['user-content.pdf'],
        confidence: 0.9,
        priority: 'high',
        examples: [],
        originalWording: 'Mathematical concepts and formulas',
        estimatedSpace: 100,
        isSelected: true
      }
    ];
  });

  describe('analyzeReferenceDensity', () => {
    it('should analyze reference template density correctly', () => {
      const density = analyzer.analyzeReferenceDensity(mockTemplate);

      expect(density.wordsPerPage).toBeGreaterThan(0); // Should calculate based on actual text
      expect(density.topicsPerPage).toBe(3); // 6 topics / 2 pages
      expect(density.averageTopicLength).toBeGreaterThan(0); // Should be positive
      expect(density.contentDistribution).toBeDefined();
      expect(density.spacingPatterns).toBeDefined();
      expect(density.hierarchyDensity).toBeDefined();
      expect(density.visualDensity).toBeDefined();
    });
  });

  describe('analyzeUserContentDensity', () => {
    it('should analyze user content density correctly', () => {
      const density = analyzer.analyzeUserContentDensity(mockUserContent, mockUserTopics, 1);

      expect(density.wordsPerPage).toBeGreaterThan(0); // Should calculate based on actual text
      expect(density.topicsPerPage).toBe(1); // 1 topic / 1 page
      expect(density.averageTopicLength).toBeGreaterThan(0); // Should be positive
      expect(density.contentDistribution).toBeDefined();
      expect(density.spacingPatterns).toBeDefined();
      expect(density.hierarchyDensity).toBeDefined();
      expect(density.visualDensity).toBeDefined();
    });
  });

  describe('createDensityMatchingStrategy', () => {
    it('should create strategy for density matching', () => {
      const referenceDensity = analyzer.analyzeReferenceDensity(mockTemplate);
      const userDensity = analyzer.analyzeUserContentDensity(mockUserContent, mockUserTopics, 1);

      const strategy = analyzer.createDensityMatchingStrategy(
        referenceDensity,
        userDensity,
        mockUserTopics
      );

      expect(strategy.targetDensity).toBe(referenceDensity);
      expect(strategy.currentDensity).toBe(userDensity);
      expect(strategy.adjustmentPlan).toBeDefined();
      expect(strategy.feasibilityScore).toBeGreaterThanOrEqual(0);
      expect(strategy.feasibilityScore).toBeLessThanOrEqual(1);
    });

    it('should suggest content expansion for low density', () => {
      // Create low density user content
      const lowDensityContent = [
        {
          ...mockUserContent[0],
          text: 'Short content',
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 50
          }
        }
      ];

      const referenceDensity = analyzer.analyzeReferenceDensity(mockTemplate);
      const userDensity = analyzer.analyzeUserContentDensity(lowDensityContent, mockUserTopics, 1);

      const strategy = analyzer.createDensityMatchingStrategy(
        referenceDensity,
        userDensity,
        mockUserTopics
      );

      expect(strategy.adjustmentPlan.contentAdjustments.length).toBeGreaterThan(0);
      expect(strategy.adjustmentPlan.contentAdjustments[0].type).toBe('add-details');
    });

    it('should suggest content reduction for high density', () => {
      // Create high density user content
      const highDensityTopics = Array.from({ length: 10 }, (_, i) => ({
        ...mockUserTopics[0],
        id: `topic_${i}`,
        priority: i < 3 ? 'high' : i < 6 ? 'medium' : 'low'
      }));

      const referenceDensity = analyzer.analyzeReferenceDensity(mockTemplate);
      const userDensity = analyzer.analyzeUserContentDensity(mockUserContent, highDensityTopics, 1);

      const strategy = analyzer.createDensityMatchingStrategy(
        referenceDensity,
        userDensity,
        highDensityTopics
      );

      expect(strategy.adjustmentPlan.topicAdjustments.length).toBeGreaterThan(0);
      
      const reductionAdjustments = strategy.adjustmentPlan.topicAdjustments.filter(
        adj => adj.action === 'remove' || adj.action === 'condense'
      );
      expect(reductionAdjustments.length).toBeGreaterThan(0);
    });
  });

  describe('applyDensityAdjustments', () => {
    it('should apply topic removal adjustments', () => {
      const adjustmentPlan = {
        topicAdjustments: [
          {
            topicId: 'topic_1',
            action: 'remove' as const,
            reason: 'Test removal',
            densityImpact: -100,
            priority: 'high' as const
          }
        ],
        layoutAdjustments: [],
        contentAdjustments: [],
        estimatedFinalDensity: {} as any
      };

      const result = analyzer.applyDensityAdjustments(mockUserTopics, adjustmentPlan);

      expect(result).toHaveLength(0); // Topic should be removed
    });

    it('should apply content condensation adjustments', () => {
      const longContentTopic = {
        ...mockUserTopics[0],
        content: Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ')
      };

      const adjustmentPlan = {
        topicAdjustments: [
          {
            topicId: 'topic_1',
            action: 'condense' as const,
            reason: 'Test condensation',
            densityImpact: -50,
            priority: 'medium' as const
          }
        ],
        layoutAdjustments: [],
        contentAdjustments: [],
        estimatedFinalDensity: {} as any
      };

      const result = analyzer.applyDensityAdjustments([longContentTopic], adjustmentPlan);

      expect(result).toHaveLength(1);
      expect(result[0].content.length).toBeLessThan(longContentTopic.content.length);
    });

    it('should preserve topic priority order', () => {
      const mixedPriorityTopics = [
        { ...mockUserTopics[0], id: 'low', priority: 'low' as const },
        { ...mockUserTopics[0], id: 'high', priority: 'high' as const },
        { ...mockUserTopics[0], id: 'medium', priority: 'medium' as const }
      ];

      const adjustmentPlan = {
        topicAdjustments: [],
        layoutAdjustments: [],
        contentAdjustments: [],
        estimatedFinalDensity: {} as any
      };

      const result = analyzer.applyDensityAdjustments(mixedPriorityTopics, adjustmentPlan);

      expect(result[0].priority).toBe('high');
      expect(result[1].priority).toBe('medium');
      expect(result[2].priority).toBe('low');
    });
  });
});