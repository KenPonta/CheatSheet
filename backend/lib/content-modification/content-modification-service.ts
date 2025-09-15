import { v4 as uuidv4 } from 'uuid';
import {
  StudyMaterial,
  ContentSection,
  GeneratedImage,
  ContentOperation,
  ContentModificationRequest,
  ValidationResult,
  MaterialStorage,
  ModificationHistory,
  ContentModificationError,
  AddSectionOperation,
  EditSectionOperation,
  RemoveSectionOperation,
  ReorderSectionsOperation,
  AddImageOperation,
  RemoveImageOperation,
  RegenerateImageOperation,
  ExportOptions,
  ExportResult
} from './types';
import { ContentValidationService } from './validation-service';
import { FileSystemStorageService } from './storage-service';

export class ContentModificationService {
  private validationService: ContentValidationService;
  private storageService: MaterialStorage;

  constructor(storageService?: MaterialStorage) {
    this.validationService = new ContentValidationService();
    this.storageService = storageService || new FileSystemStorageService();
  }

  /**
   * Load a study material by ID
   */
  async loadMaterial(materialId: string): Promise<StudyMaterial> {
    const material = await this.storageService.load(materialId);
    if (!material) {
      throw new ContentModificationError(
        `Study material with ID ${materialId} not found`,
        'MATERIAL_NOT_FOUND'
      );
    }
    return material;
  }

  /**
   * Create a new study material
   */
  async createMaterial(
    title: string,
    sections: Omit<ContentSection, 'id'>[] = [],
    images: Omit<GeneratedImage, 'id'>[] = [],
    metadata: any = {}
  ): Promise<StudyMaterial> {
    const materialId = uuidv4();
    const now = new Date();

    const material: StudyMaterial = {
      id: materialId,
      title,
      sections: sections.map((section, index) => ({
        ...section,
        id: uuidv4(),
        order: index
      })),
      images: images.map(image => ({
        ...image,
        id: uuidv4()
      })),
      metadata: {
        originalFiles: [],
        generationConfig: {},
        preservationScore: 1.0,
        totalSections: sections.length,
        totalFormulas: 0,
        totalExamples: 0,
        estimatedPrintPages: 1,
        ...metadata
      },
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    await this.storageService.save(material);
    
    // Save creation history
    await this.saveHistory(materialId, {
      type: 'edit_metadata',
      data: { action: 'created' }
    }, undefined, material);

    return material;
  }

  /**
   * Apply a content modification operation
   */
  async modifyContent(request: ContentModificationRequest): Promise<StudyMaterial> {
    const { editorErrorHandler } = await import('./editor-error-handler');
    const { comprehensiveLogger } = await import('../monitoring/comprehensive-logger');
    
    const trackingId = comprehensiveLogger.startPerformanceTracking(
      'modify-content',
      { 
        operationType: request.operation.type, 
        materialId: request.materialId,
        userId: request.userId 
      }
    );

    try {
      // Load the material
      const material = await this.loadMaterial(request.materialId);

      // Enhanced validation with error handling
      const validation = await editorErrorHandler.validateOperation(
        material, 
        request.operation,
        {
          materialId: request.materialId,
          userId: request.userId,
          sessionId: request.sessionId
        }
      );

      if (!validation.valid) {
        const validationError = new ContentModificationError(
          `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_FAILED',
          validation.errors
        );

        comprehensiveLogger.logContentModification(
          'error',
          'Content modification validation failed',
          request.operation.type,
          request.materialId,
          false,
          undefined,
          'VALIDATION_FAILED',
          { validationErrors: validation.errors },
          request.sessionId,
          request.userId
        );

        throw validationError;
      }

      // Store previous state for history
      const previousState = JSON.parse(JSON.stringify(material));

      // Apply the operation
      const modifiedMaterial = await this.applyOperation(material, request.operation);

      // Update version and timestamp
      modifiedMaterial.version += 1;
      modifiedMaterial.updatedAt = new Date();

      // Save the modified material
      await this.storageService.save(modifiedMaterial);

      // Save modification history
      await this.saveHistory(
        request.materialId,
        request.operation,
        previousState,
        modifiedMaterial,
        request.userId
      );

      comprehensiveLogger.logContentModification(
        'info',
        'Content modification completed successfully',
        request.operation.type,
        request.materialId,
        true,
        undefined,
        undefined,
        { version: modifiedMaterial.version },
        request.sessionId,
        request.userId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, true, 0, {
        newVersion: modifiedMaterial.version,
        sectionsCount: modifiedMaterial.sections.length
      });

      return modifiedMaterial;

    } catch (error) {
      comprehensiveLogger.logContentModification(
        'error',
        `Content modification failed: ${error.message}`,
        request.operation.type,
        request.materialId,
        false,
        undefined,
        error.name,
        { error: error.message },
        request.sessionId,
        request.userId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1);

      // Use error handler for recovery
      if (request.sessionId) {
        const material = await this.loadMaterial(request.materialId).catch(() => null);
        if (material) {
          const context = {
            operation: request.operation,
            materialId: request.materialId,
            userId: request.userId,
            sessionId: request.sessionId,
            materialState: material,
            attemptNumber: 1,
            previousErrors: []
          };

          const recoveryResult = await editorErrorHandler.handleOperationError(error, context);
          
          if (recoveryResult.success && recoveryResult.recoveredMaterial) {
            return recoveryResult.recoveredMaterial;
          }
        }
      }

      throw error;
    }
  }

  /**
   * Apply a specific operation to the material
   */
  private async applyOperation(
    material: StudyMaterial,
    operation: ContentOperation
  ): Promise<StudyMaterial> {
    const modifiedMaterial = { ...material };

    switch (operation.type) {
      case 'add_section':
        return this.applyAddSection(modifiedMaterial, operation as AddSectionOperation);
      
      case 'remove_section':
        return this.applyRemoveSection(modifiedMaterial, operation as RemoveSectionOperation);
      
      case 'edit_section':
        return this.applyEditSection(modifiedMaterial, operation as EditSectionOperation);
      
      case 'reorder_sections':
        return this.applyReorderSections(modifiedMaterial, operation as ReorderSectionsOperation);
      
      case 'add_image':
        return this.applyAddImage(modifiedMaterial, operation as AddImageOperation);
      
      case 'remove_image':
        return this.applyRemoveImage(modifiedMaterial, operation as RemoveImageOperation);
      
      case 'regenerate_image':
        return this.applyRegenerateImage(modifiedMaterial, operation as RegenerateImageOperation);
      
      default:
        throw new ContentModificationError(
          `Unknown operation type: ${operation.type}`,
          'INVALID_OPERATION'
        );
    }
  }

  /**
   * Apply add section operation
   */
  private applyAddSection(
    material: StudyMaterial,
    operation: AddSectionOperation
  ): StudyMaterial {
    const { section, position } = operation.data;
    
    const newSection: ContentSection = {
      ...section,
      id: uuidv4(),
      order: position
    };

    // Insert section at specified position
    const sections = [...material.sections];
    sections.splice(position, 0, newSection);

    // Update order for subsequent sections
    sections.forEach((s, index) => {
      s.order = index;
    });

    return {
      ...material,
      sections,
      metadata: {
        ...material.metadata,
        totalSections: sections.length
      }
    };
  }

  /**
   * Apply remove section operation
   */
  private applyRemoveSection(
    material: StudyMaterial,
    operation: RemoveSectionOperation
  ): StudyMaterial {
    const sections = material.sections.filter(s => s.id !== operation.targetId);
    
    // Update order for remaining sections
    sections.forEach((s, index) => {
      s.order = index;
    });

    // Remove dependencies on the deleted section
    sections.forEach(section => {
      section.dependencies = section.dependencies.filter(dep => dep !== operation.targetId);
    });

    return {
      ...material,
      sections,
      metadata: {
        ...material.metadata,
        totalSections: sections.length
      }
    };
  }

  /**
   * Apply edit section operation
   */
  private applyEditSection(
    material: StudyMaterial,
    operation: EditSectionOperation
  ): StudyMaterial {
    const sections = material.sections.map(section => {
      if (section.id === operation.targetId) {
        return {
          ...section,
          ...operation.data
        };
      }
      return section;
    });

    return {
      ...material,
      sections
    };
  }

  /**
   * Apply reorder sections operation
   */
  private applyReorderSections(
    material: StudyMaterial,
    operation: ReorderSectionsOperation
  ): StudyMaterial {
    const { sectionIds } = operation.data;
    
    // Create a map for quick lookup
    const sectionMap = new Map(material.sections.map(s => [s.id, s]));
    
    // Reorder sections according to the new order
    const sections = sectionIds.map((id, index) => {
      const section = sectionMap.get(id)!;
      return {
        ...section,
        order: index
      };
    });

    return {
      ...material,
      sections
    };
  }

  /**
   * Apply add image operation
   */
  private applyAddImage(
    material: StudyMaterial,
    operation: AddImageOperation
  ): StudyMaterial {
    const { image, position } = operation.data;
    
    const newImage: GeneratedImage = {
      ...image,
      id: uuidv4()
    };

    // Insert image at specified position
    const images = [...material.images];
    images.splice(position, 0, newImage);

    return {
      ...material,
      images
    };
  }

  /**
   * Apply remove image operation
   */
  private applyRemoveImage(
    material: StudyMaterial,
    operation: RemoveImageOperation
  ): StudyMaterial {
    const images = material.images.filter(i => i.id !== operation.targetId);

    return {
      ...material,
      images
    };
  }

  /**
   * Apply regenerate image operation
   */
  private applyRegenerateImage(
    material: StudyMaterial,
    operation: RegenerateImageOperation
  ): StudyMaterial {
    const images = material.images.map(image => {
      if (image.id === operation.targetId) {
        // In a real implementation, this would call the image generation service
        // For now, we'll just update the metadata to indicate regeneration
        return {
          ...image,
          metadata: {
            ...image.metadata,
            generatedAt: new Date()
          },
          source: {
            ...image.source,
            generationParams: operation.data
          }
        };
      }
      return image;
    });

    return {
      ...material,
      images
    };
  }

  /**
   * Save modification history
   */
  private async saveHistory(
    materialId: string,
    operation: ContentOperation,
    previousState?: any,
    newState?: any,
    userId?: string
  ): Promise<void> {
    const history: ModificationHistory = {
      id: uuidv4(),
      materialId,
      operation,
      timestamp: new Date(),
      userId,
      previousState,
      newState
    };

    await this.storageService.saveHistory(history);
  }

  /**
   * Get modification history for a material
   */
  async getHistory(materialId: string): Promise<ModificationHistory[]> {
    return await this.storageService.loadHistory(materialId);
  }

  /**
   * List all materials
   */
  async listMaterials(userId?: string): Promise<StudyMaterial[]> {
    return await this.storageService.list(userId);
  }

  /**
   * Delete a material
   */
  async deleteMaterial(materialId: string): Promise<void> {
    const exists = await this.storageService.exists(materialId);
    if (!exists) {
      throw new ContentModificationError(
        `Study material with ID ${materialId} not found`,
        'MATERIAL_NOT_FOUND'
      );
    }

    await this.storageService.delete(materialId);
  }

  /**
   * Export material in specified format (legacy method - use EnhancedExportService for new features)
   */
  async exportMaterial(
    materialId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const material = await this.loadMaterial(materialId);

    let content: string | Buffer;
    let filename: string;

    switch (options.format) {
      case 'html':
        content = await this.exportToHTML(material, options);
        filename = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
        break;
      
      case 'markdown':
        content = await this.exportToMarkdown(material, options);
        filename = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        break;
      
      case 'pdf':
        content = await this.exportToPDF(material, options);
        filename = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        break;
      
      default:
        throw new ContentModificationError(
          `Unsupported export format: ${options.format}`,
          'INVALID_OPERATION'
        );
    }

    return {
      content,
      format: options.format,
      filename,
      metadata: {
        exportedAt: new Date(),
        sections: material.sections.length,
        images: options.includeImages ? material.images.length : 0,
        size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8')
      }
    };
  }

  /**
   * Export to HTML format
   */
  private async exportToHTML(material: StudyMaterial, options: ExportOptions): Promise<string> {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>${material.title}</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .section { margin: 20px 0; }
    .equation { text-align: center; margin: 15px 0; font-style: italic; }
    .example { background: #f5f5f5; padding: 15px; border-left: 4px solid #007acc; }
    .image { text-align: center; margin: 20px 0; }
    .metadata { background: #f9f9f9; padding: 10px; border: 1px solid #ddd; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>${material.title}</h1>`;

    // Add sections
    for (const section of material.sections.sort((a, b) => a.order - b.order)) {
      html += `\n  <div class="section ${section.type}">`;
      
      if (section.type === 'heading') {
        html += `\n    <h2>${section.content}</h2>`;
      } else if (section.type === 'equation') {
        html += `\n    <div class="equation">${section.content}</div>`;
      } else if (section.type === 'example') {
        html += `\n    <div class="example">${section.content}</div>`;
      } else {
        html += `\n    <p>${section.content}</p>`;
      }
      
      html += `\n  </div>`;
    }

    // Add images if requested
    if (options.includeImages) {
      for (const image of material.images) {
        html += `\n  <div class="image">`;
        html += `\n    <img src="data:image/${image.metadata.format};base64,${image.base64Data}" alt="Generated image" />`;
        html += `\n  </div>`;
      }
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      html += `\n  <div class="metadata">`;
      html += `\n    <h3>Metadata</h3>`;
      html += `\n    <p><strong>Created:</strong> ${material.createdAt.toISOString()}</p>`;
      html += `\n    <p><strong>Updated:</strong> ${material.updatedAt.toISOString()}</p>`;
      html += `\n    <p><strong>Version:</strong> ${material.version}</p>`;
      html += `\n    <p><strong>Sections:</strong> ${material.sections.length}</p>`;
      html += `\n    <p><strong>Images:</strong> ${material.images.length}</p>`;
      html += `\n  </div>`;
    }

    html += `\n</body>\n</html>`;
    return html;
  }

  /**
   * Export to Markdown format
   */
  private async exportToMarkdown(material: StudyMaterial, options: ExportOptions): Promise<string> {
    let markdown = `# ${material.title}\n\n`;

    // Add sections
    for (const section of material.sections.sort((a, b) => a.order - b.order)) {
      if (section.type === 'heading') {
        markdown += `## ${section.content}\n\n`;
      } else if (section.type === 'equation') {
        markdown += `$$${section.content}$$\n\n`;
      } else if (section.type === 'example') {
        markdown += `> **Example:** ${section.content}\n\n`;
      } else {
        markdown += `${section.content}\n\n`;
      }
    }

    // Add images if requested
    if (options.includeImages) {
      markdown += `## Images\n\n`;
      for (let i = 0; i < material.images.length; i++) {
        const image = material.images[i];
        markdown += `![Generated Image ${i + 1}](data:image/${image.metadata.format};base64,${image.base64Data})\n\n`;
      }
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      markdown += `## Metadata\n\n`;
      markdown += `- **Created:** ${material.createdAt.toISOString()}\n`;
      markdown += `- **Updated:** ${material.updatedAt.toISOString()}\n`;
      markdown += `- **Version:** ${material.version}\n`;
      markdown += `- **Sections:** ${material.sections.length}\n`;
      markdown += `- **Images:** ${material.images.length}\n\n`;
    }

    return markdown;
  }

  /**
   * Export to PDF format (placeholder - would need PDF generation library)
   */
  private async exportToPDF(material: StudyMaterial, options: ExportOptions): Promise<Buffer> {
    // This is a placeholder implementation
    // In a real implementation, you would use a library like puppeteer or pdfkit
    const html = await this.exportToHTML(material, options);
    
    // For now, return the HTML as a buffer with a note
    const pdfNote = `<!-- PDF Export Not Implemented -->\n${html}`;
    return Buffer.from(pdfNote, 'utf8');
  }

  /**
   * Validate material integrity
   */
  async validateMaterial(materialId: string): Promise<ValidationResult> {
    const material = await this.loadMaterial(materialId);
    
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for duplicate section IDs
    const sectionIds = new Set();
    for (const section of material.sections) {
      if (sectionIds.has(section.id)) {
        errors.push({
          code: 'DUPLICATE_SECTION_ID',
          message: `Duplicate section ID found: ${section.id}`,
          severity: 'error'
        });
      }
      sectionIds.add(section.id);
    }

    // Check for broken dependencies
    const validSectionIds = new Set(material.sections.map(s => s.id));
    for (const section of material.sections) {
      for (const depId of section.dependencies) {
        if (!validSectionIds.has(depId)) {
          errors.push({
            code: 'BROKEN_DEPENDENCY',
            message: `Section ${section.id} depends on non-existent section ${depId}`,
            severity: 'error'
          });
        }
      }
    }

    // Check section order consistency
    const orders = material.sections.map(s => s.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i) {
        warnings.push({
          code: 'INCONSISTENT_ORDER',
          message: 'Section order values are not consecutive',
          suggestion: 'Consider reordering sections to fix order consistency'
        });
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}