import { ContentModificationService } from '../content-modification-service';
import { EnhancedExportService, EnhancedExportOptions } from '../export-service';
import { InMemoryStorageService } from '../storage-service';
import { StudyMaterial } from '../types';

describe('Export Integration Tests', () => {
  let contentService: ContentModificationService;
  let exportService: EnhancedExportService;
  let storageService: InMemoryStorageService;

  beforeEach(() => {
    storageService = new InMemoryStorageService();
    contentService = new ContentModificationService(storageService);
    exportService = new EnhancedExportService();
  });

  afterEach(async () => {
    await exportService.cleanup();
    storageService.clear();
  });

  it('should create, modify, and export a study material', async () => {
    // Create a new study material
    const material = await contentService.createMaterial(
      'Integration Test Material',
      [
        {
          type: 'heading',
          content: 'Chapter 1: Introduction',
          order: 0,
          editable: true,
          dependencies: []
        },
        {
          type: 'text',
          content: 'This is the introduction to our study material.',
          order: 1,
          editable: true,
          dependencies: []
        },
        {
          type: 'equation',
          content: 'F = ma',
          order: 2,
          editable: true,
          dependencies: []
        }
      ],
      [],
      {
        originalFiles: ['physics-notes.pdf'],
        generationConfig: { format: 'compact' },
        preservationScore: 0.9,
        totalSections: 3,
        totalFormulas: 1,
        totalExamples: 0,
        estimatedPrintPages: 1
      }
    );

    expect(material.id).toBeDefined();
    expect(material.sections).toHaveLength(3);

    // Modify the material - add a new section
    const modifiedMaterial = await contentService.modifyContent({
      materialId: material.id,
      operation: {
        type: 'add_section',
        data: {
          section: {
            type: 'example',
            content: 'Example: A 10kg object accelerates at 2 m/s²',
            order: 3,
            editable: true,
            dependencies: []
          },
          position: 3
        }
      },
      timestamp: new Date()
    });

    expect(modifiedMaterial.sections).toHaveLength(4);

    // Export to HTML
    const htmlOptions: EnhancedExportOptions = {
      format: 'html',
      includeImages: false,
      includeMetadata: true,
      htmlConfig: {
        theme: 'light',
        embedSVG: true,
        includeCSS: true,
        responsive: true
      }
    };

    const htmlResult = await exportService.exportMaterial(modifiedMaterial, htmlOptions);

    expect(htmlResult.format).toBe('html');
    expect(htmlResult.filename).toBe('Integration_Test_Material.html');
    expect(htmlResult.content).toContain('Chapter 1: Introduction');
    expect(htmlResult.content).toContain('F = ma');
    expect(htmlResult.content).toContain('Example: A 10kg object');
    expect(htmlResult.metadata.sections).toBe(4);

    // Export to Markdown
    const markdownOptions: EnhancedExportOptions = {
      format: 'markdown',
      includeImages: false,
      includeMetadata: true,
      markdownConfig: {
        mathFormat: 'latex',
        includeTableOfContents: true,
        imageFormat: 'base64'
      }
    };

    const markdownResult = await exportService.exportMaterial(modifiedMaterial, markdownOptions);

    expect(markdownResult.format).toBe('markdown');
    expect(markdownResult.filename).toBe('Integration_Test_Material.md');
    expect(markdownResult.content).toContain('# Integration Test Material');
    expect(markdownResult.content).toContain('## Chapter 1: Introduction');
    expect(markdownResult.content).toContain('$$F = ma$$');
    expect(markdownResult.content).toContain('> **Example:**');
    expect(markdownResult.content).toContain('## Table of Contents');

    // Verify modification history
    const history = await contentService.getHistory(material.id);
    expect(history).toHaveLength(2); // Creation + modification
    expect(history[1].operation.type).toBe('add_section');
  });

  it('should handle export with images', async () => {
    // Create material with images
    const material = await contentService.createMaterial(
      'Material with Images',
      [
        {
          type: 'heading',
          content: 'Visual Examples',
          order: 0,
          editable: true,
          dependencies: []
        }
      ],
      [
        {
          type: 'generated',
          source: {
            type: 'simple-generator',
            originalPrompt: 'Test diagram',
            generationParams: {}
          },
          base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          metadata: {
            width: 100,
            height: 100,
            format: 'png',
            generatedAt: new Date(),
            context: 'Test diagram'
          },
          editable: true,
          regenerationOptions: {
            availableStyles: [],
            contentHints: [],
            contextOptions: []
          }
        }
      ]
    );

    // Export with images
    const options: EnhancedExportOptions = {
      format: 'html',
      includeImages: true,
      includeMetadata: false
    };

    const result = await exportService.exportMaterial(material, options);

    expect(result.content).toContain('<section class="images-section">');
    expect(result.content).toContain('Generated Images');
    expect(result.content).toContain('data:image/png;base64,');
    expect(result.metadata.images).toBe(1);
  });

  it('should validate material integrity before export', async () => {
    // Create material with broken dependencies
    const material = await contentService.createMaterial(
      'Broken Material',
      [
        {
          type: 'text',
          content: 'This section depends on a non-existent section',
          order: 0,
          editable: true,
          dependencies: ['non-existent-section-id']
        }
      ]
    );

    // Validation should detect the broken dependency
    const validation = await contentService.validateMaterial(material.id);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0].code).toBe('BROKEN_DEPENDENCY');

    // Export should still work despite validation issues
    const options: EnhancedExportOptions = {
      format: 'markdown',
      includeImages: false,
      includeMetadata: false
    };

    const result = await exportService.exportMaterial(material, options);
    expect(result.format).toBe('markdown');
    expect(result.content).toContain('# Broken Material');
  });

  it('should handle large materials efficiently', async () => {
    // Create a material with many sections
    const sections = Array.from({ length: 50 }, (_, i) => ({
      type: 'text' as const,
      content: `This is section ${i + 1} with some content to test performance.`,
      order: i,
      editable: true,
      dependencies: []
    }));

    const material = await contentService.createMaterial(
      'Large Material',
      sections
    );

    const startTime = Date.now();

    const options: EnhancedExportOptions = {
      format: 'html',
      includeImages: false,
      includeMetadata: true
    };

    const result = await exportService.exportMaterial(material, options);

    const exportTime = Date.now() - startTime;

    expect(result.format).toBe('html');
    expect(result.metadata.sections).toBe(50);
    expect(exportTime).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.content).toContain('This is section 1');
    expect(result.content).toContain('This is section 50');
  });
});