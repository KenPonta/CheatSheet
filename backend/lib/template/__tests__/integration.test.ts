/**
 * Integration tests for the complete template processing workflow
 */

import { TemplateService } from '../service';
import { ExtractedContent, OrganizedTopic } from '../../ai/types';

// Mock file processing
jest.mock('../../file-processing/factory', () => ({
  FileProcessor: jest.fn().mockImplementation(() => ({
    processFile: jest.fn().mockResolvedValue({
      text: 'Sample template content with multiple sections and topics',
      images: [],
      tables: [],
      metadata: {
        name: 'template.pdf',
        size: 2048,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 2,
        wordCount: 200
      },
      structure: {
        headings: [
          { level: 1, text: 'Main Title', position: 0 },
          { level: 2, text: 'Section A', position: 50 },
          { level: 2, text: 'Section B', position: 100 }
        ],
        sections: [
          { title: 'Main Title', content: 'Introduction', startPosition: 0, endPosition: 49 },
          { title: 'Section A', content: 'First section content', startPosition: 50, endPosition: 99 },
          { title: 'Section B', content: 'Second section content', startPosition: 100, endPosition: 149 }
        ],
        hierarchy: 2
      }
    })
  }))
}));

describe('Template Processing Integration', () => {
  let service: TemplateService;
  let mockTemplateFile: File;
  let mockUserContent: ExtractedContent[];
  let mockUserTopics: OrganizedTopic[];

  beforeEach(() => {
    service = new TemplateService();
    
    mockTemplateFile = new File(['template content'], 'reference-template.pdf', { 
      type: 'application/pdf' 
    });

    mockUserContent = [
      {
        text: 'User study material with comprehensive content about various topics',
        images: [
          {
            id: 'img_1',
            base64: 'base64imagedata',
            ocrText: 'Example diagram text',
            context: 'Mathematical diagram',
            isExample: true
          }
        ],
        tables: [
          {
            id: 'table_1',
            headers: ['Concept', 'Definition', 'Example'],
            rows: [
              ['Concept A', 'Definition of A', 'Example A'],
              ['Concept B', 'Definition of B', 'Example B']
            ],
            context: 'Summary table'
          }
        ],
        metadata: {
          name: 'user-study-material.pdf',
          size: 4096,
          type: 'application/pdf',
          lastModified: new Date(),
          pageCount: 5,
          wordCount: 800
        },
        structure: {
          headings: [
            { level: 1, text: 'Study Guide', position: 0 },
            { level: 2, text: 'Topic 1: Fundamentals', position: 100 },
            { level: 3, text: 'Subtopic 1.1', position: 200 },
            { level: 2, text: 'Topic 2: Advanced Concepts', position: 400 },
            { level: 3, text: 'Subtopic 2.1', position: 500 },
            { level: 3, text: 'Subtopic 2.2', position: 600 }
          ],
          sections: [
            { title: 'Study Guide', content: 'Introduction to study guide', startPosition: 0, endPosition: 99 },
            { title: 'Topic 1: Fundamentals', content: 'Basic concepts and principles', startPosition: 100, endPosition: 399 },
            { title: 'Topic 2: Advanced Concepts', content: 'Complex topics and applications', startPosition: 400, endPosition: 799 }
          ],
          hierarchy: 3
        }
      }
    ];

    mockUserTopics = [
      {
        id: 'topic_1',
        title: 'Fundamentals',
        content: 'Basic concepts and principles that form the foundation of the subject',
        subtopics: [
          {
            id: 'subtopic_1_1',
            title: 'Core Principles',
            content: 'Essential principles that must be understood',
            confidence: 0.9,
            sourceLocation: {
              fileId: 'user-study-material.pdf',
              page: 1,
              section: 'Topic 1'
            }
          }
        ],
        sourceFiles: ['user-study-material.pdf'],
        confidence: 0.95,
        examples: [
          {
            id: 'img_1',
            base64: 'base64imagedata',
            ocrText: 'Example diagram text',
            context: 'Mathematical diagram',
            isExample: true
          }
        ],
        originalWording: 'Basic concepts and principles that form the foundation of the subject'
      },
      {
        id: 'topic_2',
        title: 'Advanced Concepts',
        content: 'Complex topics and applications for advanced understanding',
        subtopics: [
          {
            id: 'subtopic_2_1',
            title: 'Complex Applications',
            content: 'Real-world applications of advanced concepts',
            confidence: 0.85,
            sourceLocation: {
              fileId: 'user-study-material.pdf',
              page: 3,
              section: 'Topic 2'
            }
          },
          {
            id: 'subtopic_2_2',
            title: 'Integration Methods',
            content: 'Methods for integrating different concepts',
            confidence: 0.8,
            sourceLocation: {
              fileId: 'user-study-material.pdf',
              page: 4,
              section: 'Topic 2'
            }
          }
        ],
        sourceFiles: ['user-study-material.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'Complex topics and applications for advanced understanding'
      }
    ];
  });

  describe('Complete Workflow', () => {
    it('should complete the full template processing workflow', async () => {
      // Step 1: Analyze reference template
      const template = await service.analyzeTemplate(mockTemplateFile);
      
      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe('reference-template.pdf');
      expect(template.analysis).toBeDefined();
      expect(template.analysis.layout).toBeDefined();
      expect(template.analysis.typography).toBeDefined();
      expect(template.analysis.organization).toBeDefined();
      expect(template.analysis.visual).toBeDefined();
      expect(template.analysis.metadata).toBeDefined();

      // Step 2: Validate compatibility
      const compatibility = await service.validateTemplateCompatibility(
        template,
        mockUserContent,
        mockUserTopics
      );
      
      expect(compatibility).toBeDefined();
      expect(compatibility.score).toBeGreaterThanOrEqual(0);
      expect(compatibility.score).toBeLessThanOrEqual(1);
      expect(compatibility.issues).toBeInstanceOf(Array);
      expect(compatibility.recommendations).toBeInstanceOf(Array);

      // Step 3: Apply template with conflict resolution
      const application = await service.applyTemplateWithResolution(
        template,
        mockUserContent,
        mockUserTopics
      );
      
      expect(application).toBeDefined();
      expect(application.sourceTemplate).toBe(template);
      expect(application.userContent).toBe(mockUserContent);
      expect(application.adaptedLayout).toBeDefined();
      expect(application.conflicts).toBeInstanceOf(Array);
      expect(application.adaptations).toBeInstanceOf(Array);
      expect(application.preview).toBeDefined();

      // Step 4: Generate comparison
      const comparison = await service.compareTemplates(template, application);
      
      expect(comparison).toBeDefined();
      expect(comparison.original).toBe(template);
      expect(comparison.applied).toBe(application);
      expect(comparison.differences).toBeInstanceOf(Array);
      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(1);
      expect(comparison.recommendation).toMatch(/use-template|modify-template|create-custom/);

      // Step 5: Export final result
      const exported = await service.exportTemplateApplication(application);
      
      expect(exported).toBeDefined();
      expect(exported.html).toBeDefined();
      expect(exported.css).toBeDefined();
      expect(exported.metadata).toBeDefined();
      expect(exported.metadata.templateId).toBe(template.id);
      expect(exported.metadata.templateName).toBe(template.name);
    });

    it('should handle content overflow scenarios', async () => {
      // Create large user content that will cause overflow
      const largeUserContent = [
        {
          ...mockUserContent[0],
          text: 'A'.repeat(2000), // Much larger than template capacity
          metadata: {
            ...mockUserContent[0].metadata,
            wordCount: 2000
          }
        }
      ];

      const largeUserTopics = Array.from({ length: 15 }, (_, i) => ({
        id: `topic_${i}`,
        title: `Topic ${i + 1}`,
        content: 'A'.repeat(150),
        subtopics: [],
        sourceFiles: ['large-content.pdf'],
        confidence: 0.8,
        examples: [],
        originalWording: 'A'.repeat(150)
      }));

      const template = await service.analyzeTemplate(mockTemplateFile);
      const application = await service.applyTemplateWithResolution(
        template,
        largeUserContent,
        largeUserTopics
      );

      // Should identify and resolve overflow conflicts
      expect(application.conflicts.some(c => c.type === 'content-overflow')).toBe(true);
      expect(application.adaptedLayout.maxPages).toBeGreaterThan(template.analysis.metadata.pageCount);
      expect(application.preview.warnings.length).toBeGreaterThan(0);
    });

    it('should handle structure incompatibility', async () => {
      // Create user content with deeper hierarchy than template supports
      const deepUserContent = [
        {
          ...mockUserContent[0],
          structure: {
            ...mockUserContent[0].structure,
            headings: [
              { level: 1, text: 'Level 1', position: 0 },
              { level: 2, text: 'Level 2', position: 50 },
              { level: 3, text: 'Level 3', position: 100 },
              { level: 4, text: 'Level 4', position: 150 },
              { level: 5, text: 'Level 5', position: 200 } // Very deep hierarchy
            ],
            hierarchy: 5
          }
        }
      ];

      const template = await service.analyzeTemplate(mockTemplateFile);
      const application = await service.applyTemplateWithResolution(
        template,
        deepUserContent,
        mockUserTopics
      );

      // Should identify structure conflicts
      expect(application.conflicts.some(c => c.type === 'structure-incompatible')).toBe(true);
      expect(application.adaptations.length).toBeGreaterThan(0);
    });

    it('should handle unsupported formats', async () => {
      // Create user content with many tables and images
      const richUserContent = [
        {
          ...mockUserContent[0],
          images: Array.from({ length: 10 }, (_, i) => ({
            id: `img_${i}`,
            base64: 'base64data',
            ocrText: `Image ${i} text`,
            context: 'Diagram',
            isExample: true
          })),
          tables: Array.from({ length: 5 }, (_, i) => ({
            id: `table_${i}`,
            headers: ['Col1', 'Col2', 'Col3'],
            rows: [['A', 'B', 'C'], ['D', 'E', 'F']],
            context: `Table ${i}`
          }))
        }
      ];

      const template = await service.analyzeTemplate(mockTemplateFile);
      const application = await service.applyTemplateWithResolution(
        template,
        richUserContent,
        mockUserTopics
      );

      // Should handle format conflicts appropriately
      const formatConflicts = application.conflicts.filter(c => c.type === 'format-unsupported');
      if (formatConflicts.length > 0) {
        expect(formatConflicts.every(c => c.resolution.strategy)).toBe(true);
        expect(application.adaptations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Template Recommendations', () => {
    it('should recommend best template from multiple options', async () => {
      // Create multiple templates with different characteristics
      const templates = await Promise.all([
        service.analyzeTemplate(new File(['simple template'], 'simple.pdf')),
        service.analyzeTemplate(new File(['complex template'], 'complex.pdf')),
        service.analyzeTemplate(new File(['math template'], 'math.pdf'))
      ]);

      const recommendations = await service.getTemplateRecommendations(
        templates,
        mockUserContent,
        mockUserTopics
      );

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
      expect(recommendations[1].score).toBeGreaterThanOrEqual(recommendations[2].score);
      
      recommendations.forEach(rec => {
        expect(rec.template).toBeDefined();
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);
        expect(rec.reasons).toBeInstanceOf(Array);
        expect(rec.reasons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Preview Generation', () => {
    it('should generate comprehensive preview', async () => {
      const template = await service.analyzeTemplate(mockTemplateFile);
      const preview = await service.generatePreview(template, mockUserContent, mockUserTopics);

      expect(preview).toBeDefined();
      expect(preview.html).toBeDefined();
      expect(preview.html).toContain('cheat-sheet-preview');
      expect(preview.html).toContain(mockUserTopics[0].title);
      expect(preview.html).toContain(mockUserTopics[1].title);
      
      expect(preview.css).toBeDefined();
      expect(preview.css).toContain('.cheat-sheet-preview');
      expect(preview.css).toContain('font-family');
      
      expect(preview.fitAnalysis).toBeDefined();
      expect(preview.fitAnalysis.contentFit).toBeGreaterThanOrEqual(0);
      expect(preview.fitAnalysis.styleFidelity).toBeGreaterThanOrEqual(0);
      expect(preview.fitAnalysis.overallQuality).toBeGreaterThanOrEqual(0);
      
      expect(preview.warnings).toBeInstanceOf(Array);
    });

    it('should generate side-by-side comparison', async () => {
      const template = await service.analyzeTemplate(mockTemplateFile);
      const application = await service.applyTemplateWithResolution(
        template,
        mockUserContent,
        mockUserTopics
      );
      
      const comparison = await service.generateComparisonPreview(template, application);

      expect(comparison).toBeDefined();
      expect(comparison.originalPreview).toBeDefined();
      expect(comparison.appliedPreview).toBeDefined();
      expect(comparison.comparisonHTML).toBeDefined();
      expect(comparison.comparisonHTML).toContain('template-comparison');
      expect(comparison.comparisonHTML).toContain('Original Template');
      expect(comparison.comparisonHTML).toContain('Applied Template');
    });
  });

  describe('Error Handling', () => {
    it('should handle file processing errors gracefully', async () => {
      // Mock file processor to throw error
      const { FileProcessor } = require('../../file-processing/factory');
      FileProcessor.mockImplementation(() => ({
        processFile: jest.fn().mockRejectedValue(new Error('File processing failed'))
      }));

      await expect(service.analyzeTemplate(mockTemplateFile))
        .rejects.toThrow('Template analysis failed');
    });

    it('should handle invalid template data', async () => {
      const invalidTemplate = {
        id: 'invalid',
        name: 'invalid.pdf',
        file: mockTemplateFile,
        analysis: null as any, // Invalid analysis
        extractedContent: null as any,
        createdAt: new Date()
      };

      await expect(service.applyTemplateWithResolution(
        invalidTemplate,
        mockUserContent,
        mockUserTopics
      )).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large content efficiently', async () => {
      const startTime = Date.now();
      
      // Create large dataset
      const largeUserTopics = Array.from({ length: 50 }, (_, i) => ({
        id: `topic_${i}`,
        title: `Topic ${i + 1}`,
        content: 'A'.repeat(100),
        subtopics: Array.from({ length: 3 }, (_, j) => ({
          id: `subtopic_${i}_${j}`,
          title: `Subtopic ${i + 1}.${j + 1}`,
          content: 'B'.repeat(50),
          confidence: 0.8,
          sourceLocation: {
            fileId: 'large-content.pdf',
            page: i + 1,
            section: `Topic ${i + 1}`
          }
        })),
        sourceFiles: ['large-content.pdf'],
        confidence: 0.9,
        examples: [],
        originalWording: 'A'.repeat(100)
      }));

      const template = await service.analyzeTemplate(mockTemplateFile);
      const application = await service.applyTemplateWithResolution(
        template,
        mockUserContent,
        largeUserTopics
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(application).toBeDefined();
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});