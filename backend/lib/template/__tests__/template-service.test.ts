/**
 * Tests for TemplateService
 */

import { TemplateService } from '../service';
import { ReferenceTemplate } from '../types';
import { ExtractedContent, OrganizedTopic } from '../../ai/types';

// Mock the individual components
jest.mock('../analyzer', () => ({
  TemplateAnalyzer: jest.fn()
}));
jest.mock('../applicator', () => ({
  TemplateApplicator: jest.fn()
}));
jest.mock('../conflict-resolver', () => ({
  ConflictResolver: jest.fn()
}));
jest.mock('../preview', () => ({
  TemplatePreviewGenerator: jest.fn()
}));

describe('TemplateService', () => {
  let service: TemplateService;
  let mockFile: File;
  let mockTemplate: ReferenceTemplate;
  let mockUserContent: ExtractedContent[];
  let mockUserTopics: OrganizedTopic[];

  beforeEach(() => {
    // Set up mocks
    const { TemplateAnalyzer } = require('../analyzer');
    const { TemplateApplicator } = require('../applicator');
    const { ConflictResolver } = require('../conflict-resolver');
    const { TemplatePreviewGenerator } = require('../preview');

    TemplateAnalyzer.mockImplementation(() => ({
      analyzeTemplate: jest.fn()
    }));

    TemplateApplicator.mockImplementation(() => ({
      applyTemplate: jest.fn()
    }));

    ConflictResolver.mockImplementation(() => ({
      resolveConflicts: jest.fn()
    }));

    TemplatePreviewGenerator.mockImplementation(() => ({
      generatePreview: jest.fn(),
      compareTemplates: jest.fn(),
      generateComparisonPreview: jest.fn()
    }));

    service = new TemplateService();
    
    mockFile = new File(['test content'], 'test-template.pdf', { type: 'application/pdf' });
    
    mockTemplate = {
      id: 'template_123',
      name: 'test-template.pdf',
      file: mockFile,
      analysis: {
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

  describe('analyzeTemplate', () => {
    it('should analyze template successfully', async () => {
      // Access the mocked instance
      const analyzerInstance = (service as any).analyzer;
      analyzerInstance.analyzeTemplate.mockResolvedValue(mockTemplate);

      const result = await service.analyzeTemplate(mockFile);

      expect(result).toBe(mockTemplate);
      expect(analyzerInstance.analyzeTemplate).toHaveBeenCalledWith(mockFile);
    });

    it('should handle analysis errors', async () => {
      const analyzerInstance = (service as any).analyzer;
      analyzerInstance.analyzeTemplate.mockRejectedValue(new Error('Analysis failed'));

      await expect(service.analyzeTemplate(mockFile)).rejects.toThrow('Template analysis failed');
    });
  });

  describe('applyTemplateWithResolution', () => {
    it('should apply template with conflict resolution', async () => {
      const mockApplication = {
        sourceTemplate: mockTemplate,
        userContent: mockUserContent,
        adaptedLayout: {} as any,
        conflicts: [
          {
            type: 'content-overflow',
            severity: 'medium',
            description: 'Content overflow',
            affectedContent: ['content'],
            resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
          }
        ],
        adaptations: [],
        preview: {
          html: '<div>Preview</div>',
          css: '.preview {}',
          warnings: [],
          fitAnalysis: {
            contentFit: 0.8,
            styleFidelity: 0.9,
            overallQuality: 0.85,
            recommendations: []
          }
        }
      };

      const mockResolution = {
        resolvedConflicts: mockApplication.conflicts,
        recommendedActions: [],
        modifiedLayout: {} as any,
        qualityImpact: {
          overallQuality: 0.8,
          fidelityLoss: 0.2,
          contentPreservation: 0.9,
          stylePreservation: 0.8,
          usabilityImpact: 'low' as const,
          recommendation: 'accept' as const
        }
      };

      const { TemplateApplicator } = require('../applicator');
      const { ConflictResolver } = require('../conflict-resolver');
      const { TemplatePreviewGenerator } = require('../preview');

      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockResolvedValue(mockApplication)
      }));

      ConflictResolver.mockImplementation(() => ({
        resolveConflicts: jest.fn().mockResolvedValue(mockResolution)
      }));

      TemplatePreviewGenerator.mockImplementation(() => ({
        generatePreview: jest.fn().mockResolvedValue(mockApplication.preview)
      }));

      const result = await service.applyTemplateWithResolution(
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result).toBeDefined();
      expect(result.sourceTemplate).toBe(mockTemplate);
      expect(result.conflicts).toBe(mockResolution.resolvedConflicts);
    });

    it('should handle application without conflicts', async () => {
      const mockApplication = {
        sourceTemplate: mockTemplate,
        userContent: mockUserContent,
        adaptedLayout: {} as any,
        conflicts: [], // No conflicts
        adaptations: [],
        preview: {
          html: '<div>Preview</div>',
          css: '.preview {}',
          warnings: [],
          fitAnalysis: {
            contentFit: 1.0,
            styleFidelity: 1.0,
            overallQuality: 1.0,
            recommendations: []
          }
        }
      };

      const { TemplateApplicator } = require('../applicator');
      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockResolvedValue(mockApplication)
      }));

      const result = await service.applyTemplateWithResolution(
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result).toBe(mockApplication);
    });
  });

  describe('validateTemplateCompatibility', () => {
    it('should validate compatible template', async () => {
      const mockApplication = {
        conflicts: [
          {
            type: 'style-mismatch',
            severity: 'low',
            description: 'Minor style issue',
            affectedContent: ['fonts'],
            resolution: { strategy: 'adapt-template', description: '', impact: '', alternatives: [] }
          }
        ],
        preview: {
          fitAnalysis: {
            overallQuality: 0.85
          }
        }
      };

      const { TemplateApplicator } = require('../applicator');
      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockResolvedValue(mockApplication)
      }));

      const result = await service.validateTemplateCompatibility(
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.compatible).toBe(true);
      expect(result.score).toBeGreaterThan(0.6);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations).toContain('Template is well-suited for your content');
    });

    it('should identify incompatible template', async () => {
      const mockApplication = {
        conflicts: [
          {
            type: 'content-overflow',
            severity: 'high',
            description: 'Major content overflow',
            affectedContent: ['content'],
            resolution: { strategy: 'prioritize-content', description: '', impact: '', alternatives: [] }
          },
          {
            type: 'structure-incompatible',
            severity: 'high',
            description: 'Structure mismatch',
            affectedContent: ['structure'],
            resolution: { strategy: 'adapt-template', description: '', impact: '', alternatives: [] }
          }
        ],
        preview: {
          fitAnalysis: {
            overallQuality: 0.4
          }
        }
      };

      const { TemplateApplicator } = require('../applicator');
      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockResolvedValue(mockApplication)
      }));

      const result = await service.validateTemplateCompatibility(
        mockTemplate,
        mockUserContent,
        mockUserTopics
      );

      expect(result.compatible).toBe(false);
      expect(result.score).toBeLessThan(0.6);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.includes('high-severity'))).toBe(true);
    });
  });

  describe('getTemplateRecommendations', () => {
    it('should rank templates by compatibility', async () => {
      const templates = [
        { ...mockTemplate, id: 'template_1', name: 'Template 1' },
        { ...mockTemplate, id: 'template_2', name: 'Template 2' },
        { ...mockTemplate, id: 'template_3', name: 'Template 3' }
      ];

      // Mock different compatibility scores
      const { TemplateApplicator } = require('../applicator');
      let callCount = 0;
      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            conflicts: callCount === 1 ? [] : [{ severity: 'medium' }], // First template has no conflicts
            preview: {
              fitAnalysis: {
                overallQuality: callCount === 1 ? 0.95 : 0.7 // First template has better quality
              }
            }
          });
        })
      }));

      const result = await service.getTemplateRecommendations(
        templates,
        mockUserContent,
        mockUserTopics
      );

      expect(result).toHaveLength(3);
      expect(result[0].score).toBeGreaterThan(result[1].score); // Best template first
      expect(result[0].template.id).toBe('template_1');
      expect(result[0].reasons).toBeInstanceOf(Array);
      expect(result[0].reasons.length).toBeGreaterThan(0);
    });

    it('should provide domain-specific recommendations', async () => {
      const mathTemplate = {
        ...mockTemplate,
        analysis: {
          ...mockTemplate.analysis,
          metadata: {
            ...mockTemplate.analysis.metadata,
            domain: 'mathematics'
          }
        }
      };

      const mathUserContent = [
        {
          ...mockUserContent[0],
          text: 'Mathematical equations and formulas for calculus'
        }
      ];

      const { TemplateApplicator } = require('../applicator');
      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockResolvedValue({
          conflicts: [],
          preview: { fitAnalysis: { overallQuality: 0.9 } }
        })
      }));

      const result = await service.getTemplateRecommendations(
        [mathTemplate],
        mathUserContent,
        mockUserTopics
      );

      expect(result[0].reasons.some(reason => reason.includes('mathematics'))).toBe(true);
    });
  });

  describe('exportTemplateApplication', () => {
    it('should export template application correctly', async () => {
      const mockApplication = {
        sourceTemplate: mockTemplate,
        adaptedLayout: { maxPages: 3 } as any,
        conflicts: [{ type: 'content-overflow' }],
        preview: {
          html: '<div>Exported HTML</div>',
          css: '.exported { color: blue; }',
          fitAnalysis: { overallQuality: 0.8 }
        }
      };

      const result = await service.exportTemplateApplication(mockApplication as any);

      expect(result.html).toBe(mockApplication.preview.html);
      expect(result.css).toBe(mockApplication.preview.css);
      expect(result.metadata.templateId).toBe(mockTemplate.id);
      expect(result.metadata.templateName).toBe(mockTemplate.name);
      expect(result.metadata.pageCount).toBe(3);
      expect(result.metadata.conflicts).toBe(1);
      expect(result.metadata.quality).toBe(0.8);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const { TemplateApplicator } = require('../applicator');
      TemplateApplicator.mockImplementation(() => ({
        applyTemplate: jest.fn().mockRejectedValue(new Error('Service error'))
      }));

      await expect(service.applyTemplateWithResolution(
        mockTemplate,
        mockUserContent,
        mockUserTopics
      )).rejects.toThrow('Template application failed');
    });
  });

  describe('convenience functions', () => {
    it('should export convenience functions', async () => {
      const {
        analyzeReferenceTemplate,
        applyTemplateToContent,
        validateTemplateCompatibility,
        getTemplateRecommendations
      } = require('../service');

      expect(typeof analyzeReferenceTemplate).toBe('function');
      expect(typeof applyTemplateToContent).toBe('function');
      expect(typeof validateTemplateCompatibility).toBe('function');
      expect(typeof getTemplateRecommendations).toBe('function');
    });
  });
});