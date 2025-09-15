/**
 * Integration Tests for Complete Workflow from Generation to Editing
 * Task 14: Create unit tests for new components
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3
 */

import { SimpleImageGenerator, FlatLineImageRequest } from '../ai/simple-image-generator';
import { ContentModificationService } from '../content-modification/content-modification-service';
import { StudyMaterial, ContentSection, GeneratedImage, ContentModificationRequest } from '../content-modification/types';

// Mock external dependencies
const mockStorageService = {
  load: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  list: jest.fn(),
  saveHistory: jest.fn(),
  loadHistory: jest.fn()
};

const mockLogger = {
  startPerformanceTracking: jest.fn().mockReturnValue('tracking-id'),
  endPerformanceTracking: jest.fn(),
  logContentModification: jest.fn(),
  logImageGeneration: jest.fn()
};

const mockErrorHandler = {
  validateOperation: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
  handleOperationError: jest.fn().mockResolvedValue({ success: false }),
  handleGenerationFailure: jest.fn()
};

jest.mock('../content-modification/validation-service', () => ({
  ContentValidationService: jest.fn().mockImplementation(() => ({
    validateOperation: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
    validateMaterial: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
  }))
}));

jest.mock('../content-modification/editor-error-handler', () => ({
  editorErrorHandler: mockErrorHandler
}));

jest.mock('../monitoring/comprehensive-logger', () => ({
  comprehensiveLogger: mockLogger
}));

jest.mock('../ai/image-generation-error-handler', () => ({
  imageErrorHandler: mockErrorHandler
}));

describe('Complete Workflow Integration Tests', () => {
  let imageGenerator: SimpleImageGenerator;
  let contentService: ContentModificationService;
  let baseMaterial: StudyMaterial;

  beforeEach(() => {
    jest.clearAllMocks();
    
    imageGenerator = new SimpleImageGenerator();
    contentService = new ContentModificationService(mockStorageService as any);
    
    baseMaterial = {
      id: 'integration-test-material',
      title: 'Integration Test Material',
      sections: [
        {
          id: 'section-1',
          type: 'heading',
          content: 'Mathematical Concepts',
          order: 0,
          editable: true,
          dependencies: [],
          parentId: undefined
        },
        {
          id: 'section-2',
          type: 'text',
          content: 'This section covers basic mathematical concepts including equations and formulas.',
          order: 1,
          editable: true,
          dependencies: [],
          parentId: undefined
        }
      ],
      images: [],
      metadata: {
        originalFiles: ['math-notes.pdf'],
        generationConfig: { format: 'compact' },
        preservationScore: 0.9,
        totalSections: 2,
        totalFormulas: 0,
        totalExamples: 0,
        estimatedPrintPages: 1
      },
      version: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    mockStorageService.load.mockResolvedValue(baseMaterial);
    mockStorageService.save.mockResolvedValue(undefined);
    mockStorageService.exists.mockResolvedValue(true);
  });

  describe('End-to-End Content Creation and Enhancement', () => {
    it('should create study material, add equations, generate images, and modify content', async () => {
      // Step 1: Create initial material
      const material = await contentService.createMaterial(
        'Physics Study Guide',
        [
          {
            type: 'heading',
            content: 'Energy and Motion',
            order: 0,
            editable: true,
            dependencies: [],
            parentId: undefined
          },
          {
            type: 'text',
            content: 'Understanding the relationship between energy and motion is fundamental to physics.',
            order: 1,
            editable: true,
            dependencies: [],
            parentId: undefined
          }
        ]
      );

      expect(material.title).toBe('Physics Study Guide');
      expect(material.sections).toHaveLength(2);

      // Step 2: Add an equation section
      const addEquationRequest: ContentModificationRequest = {
        materialId: material.id,
        operation: {
          type: 'add_section',
          data: {
            section: {
              type: 'equation',
              content: 'E = ½mv² + mgh',
              editable: true,
              dependencies: [],
              parentId: undefined
            },
            position: 2
          }
        },
        userId: 'test-user',
        sessionId: 'test-session'
      };

      mockStorageService.load.mockResolvedValue(material);
      const materialWithEquation = await contentService.modifyContent(addEquationRequest);
      
      expect(materialWithEquation.sections).toHaveLength(3);
      expect(materialWithEquation.sections[2].content).toBe('E = ½mv² + mgh');

      // Step 3: Generate image for the equation
      const imageRequest: FlatLineImageRequest = {
        type: 'equation',
        content: 'E = ½mv² + mgh',
        context: 'Total mechanical energy equation showing kinetic and potential energy components',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        },
        dimensions: { width: 500, height: 200 }
      };

      const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest, 'test-session');
      
      expect(generatedImage).toBeDefined();
      expect(generatedImage.svgContent).toContain('E = ½mv² + mgh');
      expect(generatedImage.metadata.type).toBe('equation');

      // Step 4: Add the generated image to the material
      const addImageRequest: ContentModificationRequest = {
        materialId: materialWithEquation.id,
        operation: {
          type: 'add_image',
          data: {
            image: {
              type: 'generated',
              source: {
                type: 'simple-generator',
                originalPrompt: imageRequest.content,
                generationParams: imageRequest.style
              },
              base64Data: generatedImage.base64,
              metadata: {
                width: generatedImage.dimensions.width,
                height: generatedImage.dimensions.height,
                format: 'svg',
                generatedAt: generatedImage.metadata.generatedAt,
                context: imageRequest.context
              },
              editable: true,
              regenerationOptions: {
                availableStyles: [imageRequest.style],
                contentHints: ['equation', 'energy', 'physics'],
                contextOptions: ['mechanics', 'conservation of energy']
              }
            },
            position: 0
          }
        },
        userId: 'test-user',
        sessionId: 'test-session'
      };

      mockStorageService.load.mockResolvedValue(materialWithEquation);
      const finalMaterial = await contentService.modifyContent(addImageRequest);

      expect(finalMaterial.images).toHaveLength(1);
      expect(finalMaterial.images[0].source.originalPrompt).toBe('E = ½mv² + mgh');
      expect(finalMaterial.version).toBe(4); // Created + equation + image + final save
    });

    it('should handle complex concept diagram creation and modification', async () => {
      // Step 1: Add a concept section
      const addConceptRequest: ContentModificationRequest = {
        materialId: baseMaterial.id,
        operation: {
          type: 'add_section',
          data: {
            section: {
              type: 'text',
              content: 'Data Structure Hierarchy\nLinear: Array, Linked List\nNon-Linear: Tree, Graph',
              editable: true,
              dependencies: [],
              parentId: undefined
            },
            position: 2
          }
        },
        userId: 'test-user'
      };

      const materialWithConcept = await contentService.modifyContent(addConceptRequest);

      // Step 2: Generate concept diagram
      const conceptRequest: FlatLineImageRequest = {
        type: 'concept',
        content: `Data Structure Hierarchy
        title: Computer Science Data Structures
        elements:
        - id: root, label: Data Structures, type: node, level: 0
        - id: linear, label: Linear Structures, type: node, level: 1
        - id: nonlinear, label: Non-Linear Structures, type: node, level: 1
        - id: array, label: Array, type: node, level: 2
        - id: list, label: Linked List, type: node, level: 2
        - id: tree, label: Tree, type: node, level: 2
        - id: graph, label: Graph, type: node, level: 2
        relationships:
        - from: root, to: linear, type: arrow
        - from: root, to: nonlinear, type: arrow
        - from: linear, to: array, type: arrow
        - from: linear, to: list, type: arrow
        - from: nonlinear, to: tree, type: arrow
        - from: nonlinear, to: graph, type: arrow`,
        context: 'Computer science data structures classification',
        style: {
          lineWeight: 'medium',
          colorScheme: 'minimal-color',
          layout: 'vertical',
          annotations: true
        },
        dimensions: { width: 600, height: 500 }
      };

      const conceptImage = await imageGenerator.generateFlatLineImage(conceptRequest);
      
      expect(conceptImage.svgContent).toContain('Data Structures');
      expect(conceptImage.svgContent).toContain('Linear Structures');
      expect(conceptImage.svgContent).toContain('Array');
      expect(conceptImage.metadata.type).toBe('concept');

      // Step 3: Modify the concept and regenerate
      const editConceptRequest: ContentModificationRequest = {
        materialId: materialWithConcept.id,
        operation: {
          type: 'edit_section',
          targetId: materialWithConcept.sections[2].id,
          data: {
            content: 'Enhanced Data Structure Hierarchy\nLinear: Array, Linked List, Stack, Queue\nNon-Linear: Tree, Graph, Heap'
          }
        },
        userId: 'test-user'
      };

      mockStorageService.load.mockResolvedValue(materialWithConcept);
      const updatedMaterial = await contentService.modifyContent(editConceptRequest);
      
      expect(updatedMaterial.sections[2].content).toContain('Stack, Queue');
      expect(updatedMaterial.sections[2].content).toContain('Heap');
    });

    it('should handle step-by-step example creation with visual elements', async () => {
      // Step 1: Add example problem section
      const addExampleRequest: ContentModificationRequest = {
        materialId: baseMaterial.id,
        operation: {
          type: 'add_section',
          data: {
            section: {
              type: 'example',
              content: `Problem: Solve the quadratic equation x² + 5x + 6 = 0
              Solution: x = -2 or x = -3
              Steps:
              1. Identify coefficients: a=1, b=5, c=6
              2. Use factoring method: (x + 2)(x + 3) = 0
              3. Set each factor to zero: x + 2 = 0 or x + 3 = 0
              4. Solve: x = -2 or x = -3`,
              editable: true,
              dependencies: [],
              parentId: undefined
            },
            position: 2
          }
        },
        userId: 'test-user'
      };

      const materialWithExample = await contentService.modifyContent(addExampleRequest);

      // Step 2: Generate example illustration
      const exampleRequest: FlatLineImageRequest = {
        type: 'example',
        content: `subject: mathematics
        template: step-by-step
        problem: Solve the quadratic equation x² + 5x + 6 = 0
        solution: x = -2 or x = -3
        steps:
        step 1: Identify coefficients
        description: In the equation ax² + bx + c = 0, identify a=1, b=5, c=6
        annotations: variable: a=1, variable: b=5, variable: c=6
        step 2: Factor the quadratic
        description: Find two numbers that multiply to 6 and add to 5
        formula: (x + 2)(x + 3) = 0
        annotations: operation: factoring
        step 3: Apply zero product property
        description: If AB = 0, then A = 0 or B = 0
        annotations: note: zero product property
        step 4: Solve each equation
        description: x + 2 = 0 gives x = -2, x + 3 = 0 gives x = -3
        result: x = -2 or x = -3
        annotations: result: final answer`,
        context: 'Quadratic equation solving using factoring method',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'vertical',
          annotations: true
        },
        dimensions: { width: 600, height: 700 }
      };

      const exampleImage = await imageGenerator.generateFlatLineImage(exampleRequest);
      
      expect(exampleImage.svgContent).toContain('Step-by-Step Solution');
      expect(exampleImage.svgContent).toContain('x² + 5x + 6 = 0');
      expect(exampleImage.svgContent).toContain('(x + 2)(x + 3) = 0');
      expect(exampleImage.svgContent).toContain('x = -2 or x = -3');
      expect(exampleImage.metadata.type).toBe('example');

      // Verify the complete workflow
      expect(materialWithExample.sections).toHaveLength(3);
      expect(exampleImage.dimensions.width).toBe(600);
      expect(exampleImage.dimensions.height).toBe(700);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from image generation failures during workflow', async () => {
      // Mock image generation failure
      const failingImageRequest: FlatLineImageRequest = {
        type: 'equation',
        content: 'invalid_equation_syntax_###',
        context: 'test',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        },
        dimensions: { width: 400, height: 300 }
      };

      // Should handle gracefully and provide fallback
      const result = await imageGenerator.generateFlatLineImage(failingImageRequest);
      
      // Even with invalid content, should generate something
      expect(result).toBeDefined();
      expect(result.svgContent).toContain('<svg');
    });

    it('should handle content modification failures with rollback', async () => {
      // Mock storage failure
      mockStorageService.save.mockRejectedValueOnce(new Error('Storage failure'));
      mockErrorHandler.handleOperationError.mockResolvedValueOnce({
        success: true,
        recoveredMaterial: baseMaterial
      });

      const failingRequest: ContentModificationRequest = {
        materialId: baseMaterial.id,
        operation: {
          type: 'add_section',
          data: {
            section: {
              type: 'text',
              content: 'This should fail to save',
              editable: true,
              dependencies: [],
              parentId: undefined
            },
            position: 2
          }
        },
        userId: 'test-user',
        sessionId: 'test-session'
      };

      const result = await contentService.modifyContent(failingRequest);
      
      // Should recover with original material
      expect(result).toEqual(baseMaterial);
      expect(mockErrorHandler.handleOperationError).toHaveBeenCalled();
    });

    it('should maintain data consistency during concurrent operations', async () => {
      // Simulate concurrent modifications
      const requests = [
        {
          materialId: baseMaterial.id,
          operation: {
            type: 'edit_section',
            targetId: 'section-1',
            data: { content: 'Updated by user 1' }
          },
          userId: 'user-1'
        },
        {
          materialId: baseMaterial.id,
          operation: {
            type: 'edit_section',
            targetId: 'section-2',
            data: { content: 'Updated by user 2' }
          },
          userId: 'user-2'
        }
      ];

      // Process requests sequentially (simulating proper concurrency handling)
      let currentMaterial = baseMaterial;
      for (const request of requests) {
        mockStorageService.load.mockResolvedValue(currentMaterial);
        currentMaterial = await contentService.modifyContent(request as any);
      }

      expect(currentMaterial.version).toBe(3); // Original + 2 modifications
      expect(currentMaterial.sections[0].content).toBe('Updated by user 1');
      expect(currentMaterial.sections[1].content).toBe('Updated by user 2');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large materials with many sections and images efficiently', async () => {
      // Create material with many sections
      const largeMaterial: StudyMaterial = {
        ...baseMaterial,
        sections: Array(50).fill(null).map((_, i) => ({
          id: `section-${i}`,
          type: 'text' as const,
          content: `Section ${i} content with mathematical formulas like E=mc² and F=ma`,
          order: i,
          editable: true,
          dependencies: [],
          parentId: undefined
        })),
        images: Array(20).fill(null).map((_, i) => ({
          id: `image-${i}`,
          type: 'generated' as const,
          source: {
            type: 'simple-generator',
            originalPrompt: `Formula ${i}`,
            generationParams: { style: 'equation' }
          },
          base64Data: 'mock-base64-data',
          metadata: {
            width: 400,
            height: 200,
            format: 'svg',
            generatedAt: new Date(),
            context: `Formula ${i} context`
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
            contextOptions: ['mathematics']
          }
        }))
      };

      mockStorageService.load.mockResolvedValue(largeMaterial);

      const startTime = Date.now();
      
      // Perform multiple operations
      const operations = [
        {
          type: 'add_section',
          data: {
            section: {
              type: 'text',
              content: 'New section',
              editable: true,
              dependencies: [],
              parentId: undefined
            },
            position: 25
          }
        },
        {
          type: 'reorder_sections',
          data: {
            sectionIds: largeMaterial.sections.map(s => s.id).reverse()
          }
        }
      ];

      for (const operation of operations) {
        const request: ContentModificationRequest = {
          materialId: largeMaterial.id,
          operation: operation as any,
          userId: 'test-user'
        };

        await contentService.modifyContent(request);
      }

      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should generate multiple images concurrently without conflicts', async () => {
      const imageRequests: FlatLineImageRequest[] = Array(10).fill(null).map((_, i) => ({
        type: 'equation',
        content: `equation_${i}: x^${i} + ${i}x + ${i}`,
        context: `Mathematical equation ${i}`,
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        },
        dimensions: { width: 400, height: 200 }
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        imageRequests.map((request, i) => 
          imageGenerator.generateFlatLineImage(request, `session-${i}`)
        )
      );

      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.metadata.content).toContain(`equation_${i}`);
        expect(result.id).toBeTruthy();
      });

      // All IDs should be unique
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Export Integration', () => {
    it('should export complete material with generated images', async () => {
      // Create material with content and images
      const completeRequest: ContentModificationRequest = {
        materialId: baseMaterial.id,
        operation: {
          type: 'add_image',
          data: {
            image: {
              type: 'generated',
              source: {
                type: 'simple-generator',
                originalPrompt: 'Test equation',
                generationParams: { style: 'flat-line' }
              },
              base64Data: 'mock-image-data',
              metadata: {
                width: 400,
                height: 300,
                format: 'svg',
                generatedAt: new Date(),
                context: 'test'
              },
              editable: true,
              regenerationOptions: {
                availableStyles: [],
                contentHints: [],
                contextOptions: []
              }
            },
            position: 0
          }
        },
        userId: 'test-user'
      };

      const materialWithImage = await contentService.modifyContent(completeRequest);

      // Export to different formats
      const formats: Array<'html' | 'markdown' | 'pdf'> = ['html', 'markdown', 'pdf'];
      
      for (const format of formats) {
        const exportResult = await contentService.exportMaterial(materialWithImage.id, {
          format,
          includeImages: true,
          includeMetadata: true
        });

        expect(exportResult.format).toBe(format);
        expect(exportResult.filename).toContain('Integration_Test_Material');
        expect(exportResult.metadata.sections).toBe(materialWithImage.sections.length);
        expect(exportResult.metadata.images).toBe(1);
      }
    });
  });
});