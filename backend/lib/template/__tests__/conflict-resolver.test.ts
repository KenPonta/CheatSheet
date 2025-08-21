/**
 * Tests for ConflictResolver
 */

import { ConflictResolver, ConflictResolutionOptions } from '../conflict-resolver';
import { TemplateConflict, ReferenceTemplate } from '../types';
import { ExtractedContent, OrganizedTopic } from '../../ai/types';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let mockTemplate: ReferenceTemplate;
  let mockUserContent: ExtractedContent[];
  let mockUserTopics: OrganizedTopic[];

  beforeEach(() => {
    const options: ConflictResolutionOptions = {
      prioritizeContent: true,
      allowTemplateModification: true,
      maxPageIncrease: 3,
      minTextSize: 8,
      acceptableQualityThreshold: 0.7
    };

    resolver = new ConflictResolver(options);

    // Create mock template (simplified for testing)
    mockTemplate = {
      id: 'template_123',
      name: 'test-template.pdf',
      file: new File([''], 'test-template.pdf'),
      analysis: {
        layout: {
          pageConfig: {
            paperSize: 'a4',
            orientation: 'portrait',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            columns: 1,
            columnGap: 20
          }
        },
        typography: {
          bodyTextStyle: {
            fontSize: 12,
            fontWeight: 400,
            fontFamily: 'Arial',
            color: '#000000',
            lineHeight: 1.4,
            textAlign: 'left'
          }
        },
        metadata: {
          pageCount: 2,
          wordCount: 300,
          topicCount: 3,
          complexity: 'moderate',
          domain: 'general',
          quality: { score: 0.8, factors: {}, issues: [] }
        }
      } as any,
      extractedContent: {} as any,
      createdAt: new Date()
    };

    mockUserContent = [
      {
        text: 'User content for testing',
        images: [],
        tables: [],
        metadata: {
          name: 'user-content.pdf',
          size: 1024,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [],
          sections: [],
          hierarchy: 1
        }
      }
    ];

    mockUserTopics = [
      {
        id: 'topic_1',
        title: 'Test Topic',
        content: 'Test content',
        subtopics: [],
        sourceFiles: ['user-content.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Test content'
      }
    ];
  });

  describe('resolveConflicts', () => {
    it('should resolve content overflow conflicts by prioritizing content', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'high',
          description: 'User content exceeds template capacity',
          affectedContent: ['all-content'],
          resolution: {
            strategy: 'prioritize-content',
            description: 'Increase pages and reduce text size',
            impact: 'Template will be modified',
            alternatives: []
          }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.resolvedConflicts).toHaveLength(1);
      expect(result.resolvedConflicts[0].resolution.strategy).toBe('prioritize-content');
      expect(result.modifiedLayout.maxPages).toBeGreaterThan(mockTemplate.analysis.metadata.pageCount);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should resolve structure incompatibility conflicts', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'structure-incompatible',
          severity: 'medium',
          description: 'User content has more heading levels than template supports',
          affectedContent: ['headings'],
          resolution: {
            strategy: 'adapt-template',
            description: 'Flatten heading hierarchy',
            impact: 'Some heading levels will be merged',
            alternatives: []
          }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.resolvedConflicts).toHaveLength(1);
      expect(result.recommendedActions.some(a => a.type === 'flatten-hierarchy')).toBe(true);
    });

    it('should resolve style mismatch conflicts', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'style-mismatch',
          severity: 'low',
          description: 'Template uses specialized fonts',
          affectedContent: ['typography'],
          resolution: {
            strategy: 'adapt-template',
            description: 'Use web-safe font alternatives',
            impact: 'Visual appearance may differ',
            alternatives: []
          }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.resolvedConflicts).toHaveLength(1);
      expect(result.recommendedActions.some(a => a.type === 'substitute-fonts')).toBe(true);
    });

    it('should resolve format unsupported conflicts', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'format-unsupported',
          severity: 'medium',
          description: 'User content contains tables but template doesn\'t support them',
          affectedContent: ['tables'],
          resolution: {
            strategy: 'prioritize-content',
            description: 'Convert tables to text',
            impact: 'Table structure will be simplified',
            alternatives: []
          }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.resolvedConflicts).toHaveLength(1);
      expect(result.recommendedActions.some(a => a.type === 'convert-tables')).toBe(true);
    });
  });

  describe('conflict prioritization', () => {
    it('should prioritize high severity conflicts first', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'style-mismatch',
          severity: 'low',
          description: 'Low priority conflict',
          affectedContent: [],
          resolution: { strategy: 'adapt-template', description: '', impact: '', alternatives: [] }
        },
        {
          type: 'content-overflow',
          severity: 'high',
          description: 'High priority conflict',
          affectedContent: [],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        },
        {
          type: 'structure-incompatible',
          severity: 'medium',
          description: 'Medium priority conflict',
          affectedContent: [],
          resolution: { strategy: 'adapt-template', description: '', impact: '', alternatives: [] }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      // High severity should be resolved first
      expect(result.resolvedConflicts[0].severity).toBe('high');
      expect(result.resolvedConflicts[1].severity).toBe('medium');
      expect(result.resolvedConflicts[2].severity).toBe('low');
    });
  });

  describe('quality impact assessment', () => {
    it('should assess quality impact correctly', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'high',
          description: 'Major content overflow',
          affectedContent: ['all-content'],
          resolution: {
            strategy: 'prioritize-content',
            description: 'Significantly modify template',
            impact: 'Major changes required',
            alternatives: []
          }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.qualityImpact).toBeDefined();
      expect(result.qualityImpact.overallQuality).toBeGreaterThanOrEqual(0);
      expect(result.qualityImpact.overallQuality).toBeLessThanOrEqual(1);
      expect(result.qualityImpact.fidelityLoss).toBeGreaterThanOrEqual(0);
      expect(result.qualityImpact.contentPreservation).toBeGreaterThanOrEqual(0);
      expect(result.qualityImpact.stylePreservation).toBeGreaterThanOrEqual(0);
      expect(result.qualityImpact.usabilityImpact).toMatch(/low|medium|high/);
      expect(result.qualityImpact.recommendation).toMatch(/accept|review|reject/);
    });

    it('should recommend rejection for very poor quality', async () => {
      // Create multiple high-severity conflicts
      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'high',
          description: 'Massive content overflow',
          affectedContent: ['all-content'],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        },
        {
          type: 'structure-incompatible',
          severity: 'high',
          description: 'Completely incompatible structure',
          affectedContent: ['structure'],
          resolution: { strategy: 'adapt-template', description: '', impact: '', alternatives: [] }
        },
        {
          type: 'format-unsupported',
          severity: 'high',
          description: 'Many unsupported formats',
          affectedContent: ['formats'],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.qualityImpact.overallQuality).toBeLessThan(0.5);
      expect(result.qualityImpact.recommendation).toBe('reject');
    });
  });

  describe('configuration options', () => {
    it('should respect prioritizeContent option', async () => {
      const contentPriorityResolver = new ConflictResolver({ prioritizeContent: true });
      const templatePriorityResolver = new ConflictResolver({ prioritizeContent: false });

      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'medium',
          description: 'Content overflow',
          affectedContent: ['content'],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        }
      ];

      const contentResult = await contentPriorityResolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      const templateResult = await templatePriorityResolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      // Content priority should increase pages, template priority should suggest content reduction
      expect(contentResult.modifiedLayout.maxPages).toBeGreaterThan(mockTemplate.analysis.metadata.pageCount);
      expect(templateResult.recommendedActions.some(a => a.type === 'reduce-content')).toBe(true);
    });

    it('should respect maxPageIncrease limit', async () => {
      const limitedResolver = new ConflictResolver({ maxPageIncrease: 1 });

      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'high',
          description: 'Massive content overflow requiring many pages',
          affectedContent: ['content'],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        }
      ];

      const result = await limitedResolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      const pageIncrease = result.modifiedLayout.maxPages - mockTemplate.analysis.metadata.pageCount;
      expect(pageIncrease).toBeLessThanOrEqual(1);
    });

    it('should respect minTextSize limit', async () => {
      const resolver = new ConflictResolver({ minTextSize: 10 });

      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'high',
          description: 'Content overflow requiring smaller text',
          affectedContent: ['content'],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.modifiedLayout.text.baseFontSize).toBeGreaterThanOrEqual(10);
    });
  });

  describe('recommended actions', () => {
    it('should generate appropriate automatic actions', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'content-overflow',
          severity: 'medium',
          description: 'Content overflow',
          affectedContent: ['content'],
          resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      const automaticActions = result.recommendedActions.filter(a => a.automatic);
      expect(automaticActions.length).toBeGreaterThan(0);
      expect(automaticActions.every(a => a.description)).toBe(true);
      expect(automaticActions.every(a => a.impact)).toBe(true);
    });

    it('should generate manual review actions for complex conflicts', async () => {
      const conflicts: TemplateConflict[] = [
        {
          type: 'format-unsupported',
          severity: 'medium',
          description: 'Images not supported',
          affectedContent: ['images'],
          resolution: { strategy: 'hybrid', description: '', impact: '', alternatives: [] }
        }
      ];

      const result = await resolver.resolveConflicts(
        conflicts,
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      const manualActions = result.recommendedActions.filter(a => !a.automatic);
      expect(manualActions.length).toBeGreaterThan(0);
    });
  });
});