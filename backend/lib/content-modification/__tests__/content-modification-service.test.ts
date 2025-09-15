/**
 * Comprehensive Tests for ContentModificationService
 * Task 14: Create unit tests for new components
 * Requirements: 4.1, 4.2, 4.3
 */

import { ContentModificationService } from '../content-modification-service';
import { 
  StudyMaterial, 
  ContentSection, 
  GeneratedImage, 
  ContentModificationRequest,
  AddSectionOperation,
  RemoveSectionOperation,
  EditSectionOperation,
  ReorderSectionsOperation,
  AddImageOperation,
  RemoveImageOperation,
  RegenerateImageOperation,
  ExportOptions,
  ContentModificationError
} from '../types';

// Mock the storage service
const mockStorageService = {
  load: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  list: jest.fn(),
  saveHistory: jest.fn(),
  loadHistory: jest.fn()
};

// Mock the validation service
jest.mock('../validation-service', () => ({
  ContentValidationService: jest.fn().mockImplementation(() => ({
    validateOperation: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
    validateMaterial: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
  }))
}));

// Mock the error handler
const mockErrorHandler = {
  validateOperation: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
  handleOperationError: jest.fn().mockResolvedValue({ success: false })
};

jest.mock('../editor-error-handler', () => ({
  editorErrorHandler: mockErrorHandler
}));

// Mock the logger
const mockLogger = {
  startPerformanceTracking: jest.fn().mockReturnValue('tracking-id'),
  endPerformanceTracking: jest.fn(),
  logContentModification: jest.fn()
};

jest.mock('../../monitoring/comprehensive-logger', () => ({
  comprehensiveLogger: mockLogger
}));

describe('ContentModificationService', () => {
  let service: ContentModificationService;
  let mockMaterial: StudyMaterial;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContentModificationService(mockStorageService as any);
    
    mockMaterial = {
      id: 'test-material-1',
      title: 'Test Study Material',
      sections: [
        {
          id: 'section-1',
          type: 'text',
          content: 'Introduction text',
          order: 0,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-2',
          type: 'equation',
          content: 'E = mc²',
          order: 1,
          editable: true,
          dependencies: [],
          parentId: undefined
        }
      ],
      images: [
        {
          id: 'image-1',
          type: 'generated',
          source: {
            type: 'simple-generator',
            originalPrompt: 'Energy equation',
            generationParams: { style: 'flat-line' }
          },
          base64Data: 'mock-base64-data',
          metadata: {
            width: 400,
            height: 300,
            format: 'svg',
            generatedAt: new Date(),
            context: 'physics'
          },
          editable: true,
          regenerationOptions: {
            availableStyles: [{
              lineWeight: 'medium',
              colorScheme: 'monochrome',
              layout: 'horizontal',
              annotations: true
            }],
            contentHints: ['equation'],
            contextOptions: ['physics']
          }
        }
      ],
      metadata: {
        originalFiles: ['test.pdf'],
        generationConfig: {},
        preservationScore: 0.95,
        totalSections: 2,
        totalFormulas: 1,
        totalExamples: 0,
        estimatedPrintPages: 1
      },
      version: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    mockStorageService.load.mockResolvedValue(mockMaterial);
    mockStorageService.save.mockResolvedValue(undefined);
    mockStorageService.exists.mockResolvedValue(true);
  });

  describe('Material Loading and Creation - Requirement 4.1', () => {
    it('should load existing material successfully', async () => {
      const result = await service.loadMaterial('test-material-1');
      
      expect(mockStorageService.load).toHaveBeenCalledWith('test-material-1');
      expect(result).toEqual(mockMaterial);
    });

    it('should throw error when material not found', async () => {
      mockStorageService.load.mockResolvedValue(null);
      
      await expect(service.loadMaterial('non-existent'))
        .rejects.toThrow('Study material with ID non-existent not found');
    });

    it('should create new material with default values', async () => {
      const newMaterial = await service.createMaterial('New Material');
      
      expect(newMaterial.title).toBe('New Material');
      expect(newMaterial.sections).toHaveLength(0);
      expect(newMaterial.images).toHaveLength(0);
      expect(newMaterial.version).toBe(1);
      expect(mockStorageService.save).toHaveBeenCalled();
    });

    it('should create material with initial sections and images', async () => {
      const initialSections = [
        { type: 'text', content: 'Initial text', order: 0, editable: true, dependencies: [], parentId: undefined }
      ];
      const initialImages = [
        {
          type: 'generated' as const,
          source: { type: 'simple-generator', originalPrompt: 'test', generationParams: {} },
          base64Data: 'test-data',
          metadata: { width: 100, height: 100, format: 'svg', generatedAt: new Date(), context: 'test' },
          editable: true,
          regenerationOptions: { availableStyles: [], contentHints: [], contextOptions: [] }
        }
      ];

      const newMaterial = await service.createMaterial('New Material', initialSections, initialImages);
      
      expect(newMaterial.sections).toHaveLength(1);
      expect(newMaterial.images).toHaveLength(1);
      expect(newMaterial.sections[0].id).toBeTruthy();
      expect(newMaterial.images[0].id).toBeTruthy();
    });
  });

  describe('Content Section Operations - Requirement 4.1, 4.2', () => {
    it('should add new section successfully', async () => {
      const addOperation: AddSectionOperation = {
        type: 'add_section',
        data: {
          section: {
            type: 'text',
            content: 'New section content',
            editable: true,
            dependencies: [],
            parentId: undefined
          },
          position: 1
        }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: addOperation,
        userId: 'user-1',
        sessionId: 'session-1'
      };

      const result = await service.modifyContent(request);
      
      expect(result.sections).toHaveLength(3);
      expect(result.sections[1].content).toBe('New section content');
      expect(result.sections[1].order).toBe(1);
      expect(result.version).toBe(2);
      expect(mockStorageService.save).toHaveBeenCalled();
    });

    it('should remove section and update dependencies', async () => {
      // Add a section with dependency first
      mockMaterial.sections.push({
        id: 'section-3',
        type: 'text',
        content: 'Dependent section',
        order: 2,
        editable: true,
        dependencies: ['section-1'],
        parentId: undefined
      });

      const removeOperation: RemoveSectionOperation = {
        type: 'remove_section',
        targetId: 'section-1'
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: removeOperation,
        userId: 'user-1'
      };

      const result = await service.modifyContent(request);
      
      expect(result.sections).toHaveLength(2);
      expect(result.sections.find(s => s.id === 'section-1')).toBeUndefined();
      expect(result.sections.find(s => s.id === 'section-3')?.dependencies).toEqual([]);
    });

    it('should edit section content', async () => {
      const editOperation: EditSectionOperation = {
        type: 'edit_section',
        targetId: 'section-1',
        data: {
          content: 'Updated introduction text',
          type: 'text'
        }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: editOperation,
        userId: 'user-1'
      };

      const result = await service.modifyContent(request);
      
      const updatedSection = result.sections.find(s => s.id === 'section-1');
      expect(updatedSection?.content).toBe('Updated introduction text');
      expect(result.version).toBe(2);
    });

    it('should reorder sections correctly', async () => {
      const reorderOperation: ReorderSectionsOperation = {
        type: 'reorder_sections',
        data: {
          sectionIds: ['section-2', 'section-1'] // Reverse order
        }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: reorderOperation,
        userId: 'user-1'
      };

      const result = await service.modifyContent(request);
      
      expect(result.sections[0].id).toBe('section-2');
      expect(result.sections[0].order).toBe(0);
      expect(result.sections[1].id).toBe('section-1');
      expect(result.sections[1].order).toBe(1);
    });
  });

  describe('Image Management Operations - Requirement 4.4', () => {
    it('should add new image successfully', async () => {
      const newImage = {
        type: 'generated' as const,
        source: {
          type: 'simple-generator',
          originalPrompt: 'New diagram',
          generationParams: { style: 'concept' }
        },
        base64Data: 'new-image-data',
        metadata: {
          width: 500,
          height: 400,
          format: 'svg',
          generatedAt: new Date(),
          context: 'mathematics'
        },
        editable: true,
        regenerationOptions: {
          availableStyles: [{
            lineWeight: 'thin',
            colorScheme: 'minimal-color',
            layout: 'vertical',
            annotations: false
          }],
          contentHints: ['concept'],
          contextOptions: ['mathematics']
        }
      };

      const addImageOperation: AddImageOperation = {
        type: 'add_image',
        data: {
          image: newImage,
          position: 0
        }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: addImageOperation,
        userId: 'user-1'
      };

      const result = await service.modifyContent(request);
      
      expect(result.images).toHaveLength(2);
      expect(result.images[0].source.originalPrompt).toBe('New diagram');
      expect(result.images[0].id).toBeTruthy();
    });

    it('should remove image successfully', async () => {
      const removeImageOperation: RemoveImageOperation = {
        type: 'remove_image',
        targetId: 'image-1'
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: removeImageOperation,
        userId: 'user-1'
      };

      const result = await service.modifyContent(request);
      
      expect(result.images).toHaveLength(0);
      expect(result.images.find(i => i.id === 'image-1')).toBeUndefined();
    });

    it('should regenerate image with new parameters', async () => {
      const regenerateOperation: RegenerateImageOperation = {
        type: 'regenerate_image',
        targetId: 'image-1',
        data: {
          style: 'enhanced',
          parameters: { lineWeight: 'thick', colorScheme: 'minimal-color' }
        }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: regenerateOperation,
        userId: 'user-1'
      };

      const result = await service.modifyContent(request);
      
      const regeneratedImage = result.images.find(i => i.id === 'image-1');
      expect(regeneratedImage?.source.generationParams).toEqual({
        style: 'enhanced',
        parameters: { lineWeight: 'thick', colorScheme: 'minimal-color' }
      });
      expect(regeneratedImage?.metadata.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Validation and Error Handling - Requirement 4.3', () => {
    it('should handle validation failures', async () => {
      mockErrorHandler.validateOperation.mockResolvedValueOnce({
        valid: false,
        errors: [{ code: 'INVALID_CONTENT', message: 'Content is invalid', severity: 'error' }],
        warnings: []
      });

      const invalidOperation: AddSectionOperation = {
        type: 'add_section',
        data: {
          section: {
            type: 'text',
            content: '', // Invalid empty content
            editable: true,
            dependencies: [],
            parentId: undefined
          },
          position: 0
        }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: invalidOperation,
        userId: 'user-1'
      };

      await expect(service.modifyContent(request))
        .rejects.toThrow('Validation failed: Content is invalid');
    });

    it('should handle operation errors with recovery', async () => {
      mockStorageService.save.mockRejectedValueOnce(new Error('Storage failed'));
      mockErrorHandler.handleOperationError.mockResolvedValueOnce({
        success: true,
        recoveredMaterial: mockMaterial
      });

      const operation: EditSectionOperation = {
        type: 'edit_section',
        targetId: 'section-1',
        data: { content: 'Updated content' }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation,
        userId: 'user-1',
        sessionId: 'session-1'
      };

      const result = await service.modifyContent(request);
      
      expect(result).toEqual(mockMaterial);
      expect(mockErrorHandler.handleOperationError).toHaveBeenCalled();
    });

    it('should throw error for unknown operation type', async () => {
      const unknownOperation = {
        type: 'unknown_operation' as any
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation: unknownOperation,
        userId: 'user-1'
      };

      await expect(service.modifyContent(request))
        .rejects.toThrow('Unknown operation type: unknown_operation');
    });
  });

  describe('History and Versioning', () => {
    it('should save modification history', async () => {
      const operation: EditSectionOperation = {
        type: 'edit_section',
        targetId: 'section-1',
        data: { content: 'New content' }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation,
        userId: 'user-1'
      };

      await service.modifyContent(request);
      
      expect(mockStorageService.saveHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: 'test-material-1',
          operation,
          userId: 'user-1',
          previousState: expect.any(Object),
          newState: expect.any(Object)
        })
      );
    });

    it('should retrieve modification history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          materialId: 'test-material-1',
          operation: { type: 'edit_section', targetId: 'section-1', data: {} },
          timestamp: new Date(),
          userId: 'user-1'
        }
      ];

      mockStorageService.loadHistory.mockResolvedValue(mockHistory);
      
      const history = await service.getHistory('test-material-1');
      
      expect(history).toEqual(mockHistory);
      expect(mockStorageService.loadHistory).toHaveBeenCalledWith('test-material-1');
    });

    it('should increment version on each modification', async () => {
      const operations = [
        { type: 'edit_section', targetId: 'section-1', data: { content: 'Edit 1' } },
        { type: 'edit_section', targetId: 'section-2', data: { content: 'Edit 2' } }
      ];

      let currentMaterial = mockMaterial;
      
      for (const operation of operations) {
        mockStorageService.load.mockResolvedValue(currentMaterial);
        
        const request: ContentModificationRequest = {
          materialId: 'test-material-1',
          operation: operation as any,
          userId: 'user-1'
        };

        currentMaterial = await service.modifyContent(request);
      }
      
      expect(currentMaterial.version).toBe(3); // Started at 1, incremented twice
    });
  });

  describe('Export Functionality - Requirement 4.6', () => {
    it('should export to HTML format', async () => {
      const options: ExportOptions = {
        format: 'html',
        includeImages: true,
        includeMetadata: true
      };

      const result = await service.exportMaterial('test-material-1', options);
      
      expect(result.format).toBe('html');
      expect(result.filename).toBe('Test_Study_Material.html');
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('Test Study Material');
      expect(result.content).toContain('Introduction text');
      expect(result.content).toContain('E = mc²');
    });

    it('should export to Markdown format', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeImages: false,
        includeMetadata: true
      };

      const result = await service.exportMaterial('test-material-1', options);
      
      expect(result.format).toBe('markdown');
      expect(result.filename).toBe('Test_Study_Material.md');
      expect(result.content).toContain('# Test Study Material');
      expect(result.content).toContain('Introduction text');
      expect(result.content).toContain('$E = mc²$');
    });

    it('should export to PDF format (placeholder)', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeImages: true,
        includeMetadata: false
      };

      const result = await service.exportMaterial('test-material-1', options);
      
      expect(result.format).toBe('pdf');
      expect(result.filename).toBe('Test_Study_Material.pdf');
      expect(Buffer.isBuffer(result.content)).toBe(true);
    });

    it('should handle unsupported export format', async () => {
      const options: ExportOptions = {
        format: 'xml' as any,
        includeImages: true,
        includeMetadata: true
      };

      await expect(service.exportMaterial('test-material-1', options))
        .rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('Material Management', () => {
    it('should list all materials', async () => {
      const mockMaterials = [mockMaterial];
      mockStorageService.list.mockResolvedValue(mockMaterials);
      
      const materials = await service.listMaterials();
      
      expect(materials).toEqual(mockMaterials);
      expect(mockStorageService.list).toHaveBeenCalledWith(undefined);
    });

    it('should list materials for specific user', async () => {
      const mockMaterials = [mockMaterial];
      mockStorageService.list.mockResolvedValue(mockMaterials);
      
      const materials = await service.listMaterials('user-1');
      
      expect(materials).toEqual(mockMaterials);
      expect(mockStorageService.list).toHaveBeenCalledWith('user-1');
    });

    it('should delete material successfully', async () => {
      await service.deleteMaterial('test-material-1');
      
      expect(mockStorageService.exists).toHaveBeenCalledWith('test-material-1');
      expect(mockStorageService.delete).toHaveBeenCalledWith('test-material-1');
    });

    it('should throw error when deleting non-existent material', async () => {
      mockStorageService.exists.mockResolvedValue(false);
      
      await expect(service.deleteMaterial('non-existent'))
        .rejects.toThrow('Study material with ID non-existent not found');
    });
  });

  describe('Material Validation', () => {
    it('should validate material integrity', async () => {
      const result = await service.validateMaterial('test-material-1');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect duplicate section IDs', async () => {
      const invalidMaterial = {
        ...mockMaterial,
        sections: [
          ...mockMaterial.sections,
          { ...mockMaterial.sections[0] } // Duplicate section
        ]
      };

      mockStorageService.load.mockResolvedValue(invalidMaterial);
      
      const result = await service.validateMaterial('test-material-1');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DUPLICATE_SECTION_ID',
          message: expect.stringContaining('Duplicate section ID found')
        })
      );
    });

    it('should detect broken dependencies', async () => {
      const invalidMaterial = {
        ...mockMaterial,
        sections: [
          {
            ...mockMaterial.sections[0],
            dependencies: ['non-existent-section']
          }
        ]
      };

      mockStorageService.load.mockResolvedValue(invalidMaterial);
      
      const result = await service.validateMaterial('test-material-1');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'BROKEN_DEPENDENCY',
          message: expect.stringContaining('depends on non-existent section')
        })
      );
    });

    it('should warn about inconsistent section order', async () => {
      const invalidMaterial = {
        ...mockMaterial,
        sections: [
          { ...mockMaterial.sections[0], order: 0 },
          { ...mockMaterial.sections[1], order: 5 } // Gap in order
        ]
      };

      mockStorageService.load.mockResolvedValue(invalidMaterial);
      
      const result = await service.validateMaterial('test-material-1');
      
      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'INCONSISTENT_ORDER',
          message: 'Section order values are not consecutive'
        })
      );
    });
  });

  describe('Performance and Logging', () => {
    it('should track performance metrics', async () => {
      const operation: EditSectionOperation = {
        type: 'edit_section',
        targetId: 'section-1',
        data: { content: 'Updated content' }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation,
        userId: 'user-1',
        sessionId: 'session-1'
      };

      await service.modifyContent(request);
      
      expect(mockLogger.startPerformanceTracking).toHaveBeenCalledWith(
        'modify-content',
        expect.objectContaining({
          operationType: 'edit_section',
          materialId: 'test-material-1',
          userId: 'user-1'
        })
      );
      
      expect(mockLogger.endPerformanceTracking).toHaveBeenCalledWith(
        'tracking-id',
        true,
        0,
        expect.any(Object)
      );
    });

    it('should log successful operations', async () => {
      const operation: EditSectionOperation = {
        type: 'edit_section',
        targetId: 'section-1',
        data: { content: 'Updated content' }
      };

      const request: ContentModificationRequest = {
        materialId: 'test-material-1',
        operation,
        userId: 'user-1',
        sessionId: 'session-1'
      };

      await service.modifyContent(request);
      
      expect(mockLogger.logContentModification).toHaveBeenCalledWith(
        'info',
        'Content modification completed successfully',
        'edit_section',
        'test-material-1',
        true,
        undefined,
        undefined,
        expect.objectContaining({ version: 2 }),
        'session-1',
        'user-1'
      );
    });
  });
});