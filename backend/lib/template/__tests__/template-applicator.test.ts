/**
 * Tests for TemplateApplicator
 */

import { TemplateApplicator } from '../applicator';
import { ReferenceTemplate, TemplateAnalysis } from '../types';
import { ExtractedContent, OrganizedTopic } from '../../ai/types';

describe('TemplateApplicator', () => {
  let applicator: TemplateApplicator;
  let mockTemplate: ReferenceTemplate;
  let mockUserContent: ExtractedContent[];
  let mockUserTopics: OrganizedTopic[];

  beforeEach(() => {
    applicator = new TemplateApplicator();

    const mockAnalysis: TemplateAnalysis = {
      layout: {
        pageConfig: {
          paperSize: 'a4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          columns: 1,
          columnGap: 20
        },
        columnStructure: {
          count: 1,
          widths: [100],
          gaps: [],
          alignment: 'left'
        },
        spacing: {
          lineHeight: 1.4,
          paragraphSpacing: 12,
          sectionSpacing: 24,
          headingSpacing: { before: 16, after: 8 }
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
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'Arial Bold',
            color: '#000000',
            marginTop: 16,
            marginBottom: 8
          }
        ],
        bodyTextStyle: {
          fontSize: 12,
          fontWeight: 400,
          fontFamily: 'Arial',
          color: '#000000',
          lineHeight: 1.4,
          textAlign: 'left'
        },
        emphasisStyles: [],
        listStyles: []
      },
      organization: {
        structure: {
          sections: [],
          topicDistribution: {
            averageTopicsPerPage: 3,
            topicLengthVariation: 'varied',
            topicSeparation: 'spacing'
          },
          contentDensity: 300
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
          secondary: '#666666',
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
        pageCount: 2,
        wordCount: 300,
        topicCount: 3,
        complexity: 'moderate',
        domain: 'general',
        quality: {
          score: 0.8,
          factors: {
            readability: 0.8,
            organization: 0.8,
            consistency: 0.8,
            density: 0.8
          },
          issues: []
        }
      }
    };

    mockTemplate = {
      id: 'template_123',
      name: 'test-template.pdf',
      file: new File([''], 'test-template.pdf'),
      analysis: mockAnalysis,
      extractedContent: {
        text: 'Template content',
        images: [],
        tables: [],
        metadata: {
          name: 'test-template.pdf',
          size: 1024,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [],
          sections: [],
          hierarchy: 1
        }
      },
      createdAt: new Date()
    };

    mockUserContent = [
      {
        text: 'User content for testing template application',
        images: [],
        tables: [],
        metadata: {
          name: 'user-content.pdf',
          size: 2048,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [
            { level: 1, text: 'User Topic 1', position: 0 }
          ],
          sections: [
            { title: 'User Topic 1', content: 'Content for topic 1', startPosition: 0, endPosition: 50 }
          ],
          hierarchy: 1
        }
      }
    ];

    mockUserTopics = [
      {
        id: 'topic_1',
        title: 'User Topic 1',
        content: 'Content for topic 1',
        subtopics: [],
        sourceFiles: ['user-content.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Content for topic 1'
      }
    ];
  });

  describe('applyTemplate', () => {
    it('should apply template successfully with no conflicts', async () => {
      const result = await applicator.applyTemplate(mockTemplate, mockUserContent, mockUserTopics);

      expect(result).toBeDefined();
      expect(result.sourceTemplate).toBe(mockTemplate);
      expect(result.userContent).toBe(mockUserContent);
      expect(result.adaptedLayout).toBeDefined();
      expect(result.conflicts).toBeInstanceOf(Array);
      expect(result.adaptations).toBeInstanceOf(Array);
      expect(result.preview).toBeDefined();
    });

    it('should identify content overflow conflicts', async () => {
      // Create user content with much more content than template
      const largeUserContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 2000 }, (_, i) => `word${i}`).join(' '), // 2000 actual words
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 2000
          }
        }
      ];

      const largeUserTopics = Array.from({ length: 10 }, (_, i) => ({
        id: `topic_${i}`,
        title: `Topic ${i + 1}`,
        content: Array.from({ length: 200 }, (_, j) => `word${j}`).join(' '), // 200 actual words
        subtopics: [],
        sourceFiles: ['user-content.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: Array.from({ length: 200 }, (_, j) => `word${j}`).join(' ')
      }));

      const result = await applicator.applyTemplate(mockTemplate, largeUserContent, largeUserTopics);

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some(c => c.type === 'content-overflow')).toBe(true);
    });

    it('should identify structure incompatibility conflicts', async () => {
      // Create user content with deeper heading hierarchy
      const deepUserContent = [
        {
          ...mockUserContent[0],
          structure: {
            headings: [
              { level: 1, text: 'Level 1', position: 0 },
              { level: 2, text: 'Level 2', position: 20 },
              { level: 3, text: 'Level 3', position: 40 },
              { level: 4, text: 'Level 4', position: 60 } // Deeper than template's maxDepth of 2
            ],
            sections: [],
            hierarchy: 4
          }
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, deepUserContent, mockUserTopics);

      expect(result.conflicts.some(c => c.type === 'structure-incompatible')).toBe(true);
    });

    it('should identify format unsupported conflicts', async () => {
      // Create user content with tables when template doesn't support them
      const contentWithTables = [
        {
          ...mockUserContent[0],
          tables: [
            {
              id: 'table_1',
              headers: ['Col1', 'Col2'],
              rows: [['A', 'B'], ['C', 'D']],
              context: 'test table'
            }
          ]
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, contentWithTables, mockUserTopics);

      expect(result.conflicts.some(c => c.type === 'format-unsupported')).toBe(true);
    });
  });

  describe('conflict resolution', () => {
    it('should create appropriate resolution for content overflow', async () => {
      const largeUserContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 1000 }, (_, i) => `word${i}`).join(' '), // 1000 actual words
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 1000
          }
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, largeUserContent, mockUserTopics);
      const overflowConflict = result.conflicts.find(c => c.type === 'content-overflow');

      expect(overflowConflict).toBeDefined();
      expect(overflowConflict!.resolution.strategy).toMatch(/prioritize-content|hybrid|adapt-template/);
      expect(overflowConflict!.resolution.description).toBeDefined();
      expect(overflowConflict!.resolution.alternatives).toBeInstanceOf(Array);
    });

    it('should adapt layout based on conflicts', async () => {
      const largeUserContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 800 }, (_, i) => `word${i}`).join(' '),
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 800
          }
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, largeUserContent, mockUserTopics);

      // Layout should be adapted to accommodate more content
      expect(result.adaptedLayout.maxPages).toBeGreaterThanOrEqual(mockTemplate.analysis.metadata.pageCount);
    });
  });

  describe('preview generation', () => {
    it('should generate HTML preview', async () => {
      const result = await applicator.applyTemplate(mockTemplate, mockUserContent, mockUserTopics);

      expect(result.preview.html).toBeDefined();
      expect(result.preview.html).toContain('cheat-sheet-preview');
      expect(result.preview.html).toContain(mockUserTopics[0].title);
      expect(result.preview.html).toContain(mockUserTopics[0].content);
    });

    it('should generate CSS styles', async () => {
      const result = await applicator.applyTemplate(mockTemplate, mockUserContent, mockUserTopics);

      expect(result.preview.css).toBeDefined();
      expect(result.preview.css).toContain('.cheat-sheet-preview');
      expect(result.preview.css).toContain('font-family');
      expect(result.preview.css).toContain('font-size');
    });

    it('should include fit analysis', async () => {
      const result = await applicator.applyTemplate(mockTemplate, mockUserContent, mockUserTopics);

      expect(result.preview.fitAnalysis).toBeDefined();
      expect(result.preview.fitAnalysis.contentFit).toBeGreaterThanOrEqual(0);
      expect(result.preview.fitAnalysis.contentFit).toBeLessThanOrEqual(1);
      expect(result.preview.fitAnalysis.styleFidelity).toBeGreaterThanOrEqual(0);
      expect(result.preview.fitAnalysis.styleFidelity).toBeLessThanOrEqual(1);
      expect(result.preview.fitAnalysis.overallQuality).toBeGreaterThanOrEqual(0);
      expect(result.preview.fitAnalysis.overallQuality).toBeLessThanOrEqual(1);
    });

    it('should generate warnings for poor fit', async () => {
      const largeUserContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 2000 }, (_, i) => `word${i}`).join(' '),
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 2000
          }
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, largeUserContent, mockUserTopics);

      expect(result.preview.warnings.length).toBeGreaterThan(0);
      expect(result.preview.warnings.some(w => w.type === 'content-modified')).toBe(true);
    });
  });

  describe('adaptations tracking', () => {
    it('should track layout adaptations', async () => {
      const largeUserContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 800 }, (_, i) => `word${i}`).join(' '),
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 800
          }
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, largeUserContent, mockUserTopics);

      expect(result.adaptations.length).toBeGreaterThan(0);
      
      const layoutAdaptation = result.adaptations.find(a => a.type === 'layout');
      if (layoutAdaptation) {
        expect(layoutAdaptation.reason).toBeDefined();
        expect(layoutAdaptation.confidence).toBeGreaterThanOrEqual(0);
        expect(layoutAdaptation.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should track typography adaptations', async () => {
      // Force typography changes by creating content that requires smaller text
      const veryLargeUserContent = [
        {
          ...mockUserContent[0],
          text: Array.from({ length: 1500 }, (_, i) => `word${i}`).join(' '),
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 1500
          }
        }
      ];

      const result = await applicator.applyTemplate(mockTemplate, veryLargeUserContent, mockUserTopics);

      const typographyAdaptation = result.adaptations.find(a => a.type === 'typography');
      if (typographyAdaptation) {
        expect(typographyAdaptation.reason).toContain('text size');
        expect(typographyAdaptation.original).toBeDefined();
        expect(typographyAdaptation.adapted).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should handle template application errors gracefully', async () => {
      // Create invalid template that might cause errors
      const invalidTemplate = {
        ...mockTemplate,
        analysis: null as any
      };

      await expect(applicator.applyTemplate(invalidTemplate, mockUserContent, mockUserTopics))
        .rejects.toThrow('Failed to apply template');
    });
  });
});