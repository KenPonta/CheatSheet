// Integration tests for performance optimization system with processing pipeline

import { 
  PerformanceOptimizer,
  createPerformanceOptimizer,
  PerformanceConfig,
  PerformanceMetrics
} from '../performance-optimizer';
import { 
  ContentProcessingPipeline,
  createProcessingPipeline,
  ProcessingPipelineConfig
} from '../processing-pipeline';
import { 
  AcademicDocument,
  CompactLayoutConfig,
  SourceDocument,
  ProcessingResult,
  ContentProcessor
} from '../types';

// Mock processors for testing
class MockContentProcessor implements ContentProcessor {
  name = 'mock-processor';
  version = '1.0.0';

  async process(input: any, config: any): Promise<ProcessingResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      data: {
        processedContent: input,
        timestamp: new Date()
      },
      errors: [],
      warnings: [],
      metrics: {
        processingTime: 50,
        memoryUsage: 25 * 1024 * 1024, // 25MB
        contentPreserved: 0.95,
        qualityScore: 0.9,
        itemsProcessed: Array.isArray(input) ? input.length : 1
      }
    };
  }
}

class MockMathProcessor implements ContentProcessor {
  name = 'math-processor';
  version = '1.0.0';

  async process(input: any, config: any): Promise<ProcessingResult> {
    // Simulate math processing with higher memory usage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      data: {
        extractedFormulas: ['P(A) = 0.5', 'P(B|A) = 0.3'],
        workedExamples: ['Example 1: Basic probability'],
        processedAt: new Date()
      },
      errors: [],
      warnings: [],
      metrics: {
        processingTime: 100,
        memoryUsage: 50 * 1024 * 1024, // 50MB
        contentPreserved: 0.98,
        qualityScore: 0.95,
        itemsProcessed: 2
      }
    };
  }
}

class MockLayoutProcessor implements ContentProcessor {
  name = 'layout-processor';
  version = '1.0.0';

  async process(input: any, config: any): Promise<ProcessingResult> {
    // Simulate layout processing
    await new Promise(resolve => setTimeout(resolve, 75));
    
    const mockDocument: AcademicDocument = {
      title: 'Optimized Study Guide',
      tableOfContents: [
        { title: 'Part I: Discrete Probability', pageNumber: 1, anchor: 'part1' }
      ],
      parts: [
        {
          partNumber: 1,
          title: 'Discrete Probability',
          sections: [
            {
              sectionNumber: '1.1',
              title: 'Basic Probability',
              content: 'Probability content here',
              formulas: [
                {
                  id: 'formula1',
                  latex: 'P(A) = \\frac{|A|}{|S|}',
                  context: 'Basic probability',
                  type: 'display',
                  sourceLocation: { page: 1, x: 0, y: 0, width: 100, height: 20 },
                  isKeyFormula: true
                }
              ],
              examples: [
                {
                  id: 'example1',
                  title: 'Coin Flip',
                  problem: 'What is the probability of heads?',
                  solution: [
                    {
                      stepNumber: 1,
                      description: 'Identify sample space',
                      explanation: 'S = {H, T}'
                    }
                  ],
                  sourceLocation: { page: 1, x: 0, y: 50, width: 200, height: 100 },
                  subtopic: 'basic'
                }
              ],
              subsections: []
            }
          ]
        }
      ],
      crossReferences: [],
      appendices: [],
      metadata: {
        generatedAt: new Date(),
        sourceFiles: ['test.pdf'],
        totalSections: 1,
        totalFormulas: 1,
        totalExamples: 1,
        preservationScore: 0.95
      }
    };
    
    return {
      success: true,
      data: mockDocument,
      errors: [],
      warnings: [],
      metrics: {
        processingTime: 75,
        memoryUsage: 30 * 1024 * 1024, // 30MB
        contentPreserved: 0.92,
        qualityScore: 0.88,
        itemsProcessed: 1
      }
    };
  }
}

describe('Performance Optimization Integration', () => {
  let optimizer: PerformanceOptimizer;
  let pipeline: ContentProcessingPipeline;
  let mockSourceDocuments: SourceDocument[];

  beforeEach(() => {
    // Create performance optimizer with test configuration
    const perfConfig: Partial<PerformanceConfig> = {
      maxConcurrentDocuments: 2,
      memoryThresholdMB: 256,
      chunkSizeMB: 5,
      optimizationLevel: 'balanced'
    };
    optimizer = createPerformanceOptimizer(perfConfig);

    // Create processing pipeline with test configuration
    const pipelineConfig: Partial<ProcessingPipelineConfig> = {
      maxConcurrentStages: 2,
      enableRecovery: true,
      failureThreshold: 2,
      timeoutMs: 10000
    };
    pipeline = createProcessingPipeline(pipelineConfig);

    // Register processors
    pipeline.registerProcessor(new MockContentProcessor());
    pipeline.registerProcessor(new MockMathProcessor());
    pipeline.registerProcessor(new MockLayoutProcessor());

    // Create mock source documents
    mockSourceDocuments = [
      createMockSourceDocument('doc1', 'probability'),
      createMockSourceDocument('doc2', 'relations'),
      createMockSourceDocument('doc3', 'general')
    ];
  });

  describe('Pipeline with Performance Optimization', () => {
    it('should integrate performance optimization with processing pipeline', async () => {
      // Add source documents to pipeline
      mockSourceDocuments.forEach(doc => {
        pipeline.addSourceDocument(doc.file, doc.type);
      });

      // Add processing stages
      pipeline.addStage('content-extraction', 'Content Extraction', 'mock-processor');
      pipeline.addStage('math-processing', 'Math Processing', 'math-processor', {}, ['content-extraction']);
      pipeline.addStage('layout-generation', 'Layout Generation', 'layout-processor', {}, ['math-processing']);

      // Execute pipeline with performance monitoring
      const startTime = Date.now();
      const result = await pipeline.execute();
      const endTime = Date.now();

      // Verify pipeline completed successfully
      expect(result).toBeDefined();
      expect(result.title).toBe('Optimized Study Guide');

      // Check pipeline metrics
      const pipelineMetrics = pipeline.getMetrics();
      expect(pipelineMetrics.stagesCompleted).toBe(3);
      expect(pipelineMetrics.documentsProcessed).toBeGreaterThanOrEqual(0);
      expect(pipelineMetrics.totalProcessingTime).toBeGreaterThanOrEqual(0);

      // Verify performance optimization can analyze the result
      const layoutConfig = createTestLayoutConfig();
      const densityOptimization = optimizer.optimizeContentDensity(result, layoutConfig);
      
      expect(densityOptimization.optimizedConfig).toBeDefined();
      expect(densityOptimization.densityAnalysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle concurrent document processing with memory constraints', async () => {
      // Create multiple large documents
      const largeDocuments = Array.from({ length: 5 }, (_, i) => 
        createMockSourceDocument(`large_doc_${i}`, 'probability', 10 * 1024 * 1024) // 10MB each
      );

      // Process documents concurrently with performance optimization
      const mockProcessor = jest.fn().mockImplementation(async (doc: SourceDocument) => {
        // Simulate processing that respects memory constraints
        const memoryUsage = optimizer.getPerformanceReport().memoryUsage.current;
        if (memoryUsage > 200 * 1024 * 1024) { // 200MB threshold
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait for memory to free up
        }

        return {
          success: true,
          data: { documentId: doc.id, processed: true },
          errors: [],
          warnings: [],
          metrics: {
            processingTime: 150,
            memoryUsage: 40 * 1024 * 1024,
            contentPreserved: 0.95,
            qualityScore: 0.9,
            itemsProcessed: 1
          }
        };
      });

      const results = await optimizer.processConcurrently(largeDocuments, mockProcessor);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);

      // Check concurrency metrics
      const perfMetrics = optimizer.getPerformanceReport();
      expect(perfMetrics.concurrencyStats.documentsProcessed).toBe(5);
      expect(perfMetrics.concurrencyStats.parallelEfficiency).toBeGreaterThan(0);
    });

    it('should optimize page count and content density for pipeline output', async () => {
      // Set up pipeline to generate a document
      pipeline.addSourceDocument(mockSourceDocuments[0].file, mockSourceDocuments[0].type);
      pipeline.addStage('content-extraction', 'Content Extraction', 'mock-processor');
      pipeline.addStage('layout-generation', 'Layout Generation', 'layout-processor', {}, ['content-extraction']);

      const document = await pipeline.execute();

      // Test page count reduction
      const standardConfig = createStandardLayoutConfig();
      const compactConfig = createCompactLayoutConfig();

      const pageReduction = optimizer.measurePageCountReduction(
        document,
        document,
        compactConfig
      );

      expect(pageReduction.reductionPercentage).toBeGreaterThanOrEqual(0);

      // Test content density optimization
      const densityResult = optimizer.optimizeContentDensity(document, standardConfig, 0.8);

      expect(densityResult.optimizedConfig.spacing.paragraphSpacing)
        .toBeLessThan(standardConfig.spacing.paragraphSpacing);
      expect(densityResult.densityAnalysis.recommendations.length).toBeGreaterThan(0);

      // Verify optimization results are tracked
      const perfMetrics = optimizer.getPerformanceReport();
      expect(perfMetrics.optimizationResults.length).toBeGreaterThan(0);
      expect(perfMetrics.pageCountReduction.reductionPercentage).toBeGreaterThanOrEqual(0);
      expect(perfMetrics.contentDensity.densityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle memory-efficient processing of large PDF files', async () => {
      // Create a large PDF file
      const largeContent = 'x'.repeat(50 * 1024 * 1024); // 50MB
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const largeDoc: SourceDocument = {
        id: 'large_pdf',
        file: largeFile,
        type: 'probability',
        processingStatus: 'pending',
        errors: []
      };

      // Mock chunk processor
      const chunkProcessor = jest.fn().mockResolvedValue({
        content: ['processed chunk'],
        itemCount: 1
      });

      // Process large PDF efficiently
      const result = await optimizer.processLargePDFEfficiently(largeDoc, chunkProcessor);

      // The result should either succeed or fail gracefully
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(chunkProcessor).toHaveBeenCalled();
      } else {
        expect(result.errors.length).toBeGreaterThan(0);
      }

      // Verify memory metrics were updated
      const perfMetrics = optimizer.getPerformanceReport();
      expect(perfMetrics.memoryUsage.peak).toBeGreaterThanOrEqual(0);
      expect(perfMetrics.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should provide comprehensive performance reporting', async () => {
      // Perform various operations to generate metrics
      const document = createMockAcademicDocument();
      const layoutConfig = createTestLayoutConfig();

      // Measure page count reduction
      optimizer.measurePageCountReduction(document, document, layoutConfig);

      // Optimize content density
      optimizer.optimizeContentDensity(document, layoutConfig);

      // Process documents concurrently
      const mockProcessor = jest.fn().mockResolvedValue({
        success: true,
        data: {},
        errors: [],
        warnings: [],
        metrics: {
          processingTime: 100,
          memoryUsage: 25 * 1024 * 1024,
          contentPreserved: 0.95,
          qualityScore: 0.9,
          itemsProcessed: 1
        }
      });

      await optimizer.processConcurrently([mockSourceDocuments[0]], mockProcessor);

      // Get comprehensive performance report
      const report = optimizer.getPerformanceReport();

      expect(report.processingTime).toBeGreaterThanOrEqual(0);
      expect(report.memoryUsage.current).toBeGreaterThanOrEqual(0);
      expect(report.pageCountReduction.reductionPercentage).toBeGreaterThanOrEqual(0);
      expect(report.contentDensity.densityScore).toBeGreaterThanOrEqual(0);
      expect(report.concurrencyStats.documentsProcessed).toBeGreaterThanOrEqual(0);
      expect(report.optimizationResults.length).toBeGreaterThan(0);

      // Verify optimization recommendations
      const recommendations = optimizer.getOptimizationRecommendations(document, layoutConfig);
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(rec => {
        expect(rec.type).toMatch(/spacing|typography|layout|content/);
        expect(rec.expectedImprovement).toBeGreaterThan(0);
        expect(rec.implementationComplexity).toMatch(/low|medium|high/);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle processing failures gracefully', async () => {
      const failingProcessor = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const result = await optimizer.processConcurrently([mockSourceDocuments[0]], failingProcessor);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(false);
      expect(result[0].errors).toHaveLength(1);
      expect(result[0].errors[0].message).toContain('Processing failed');
    });

    it('should handle memory constraints during concurrent processing', async () => {
      // Mock memory manager to simulate high memory usage
      const mockMemoryManager = require('../../file-processing/memory-manager').getGlobalMemoryManager();
      let callCount = 0;
      mockMemoryManager.getMemoryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        return {
          used: callCount > 3 ? 800 * 1024 * 1024 : 100 * 1024 * 1024, // High memory after 3 calls
          total: 1024 * 1024 * 1024,
          percentage: callCount > 3 ? 78 : 10,
          available: callCount > 3 ? 224 * 1024 * 1024 : 924 * 1024 * 1024
        };
      });

      const mockProcessor = jest.fn().mockResolvedValue({
        success: true,
        data: {},
        errors: [],
        warnings: [],
        metrics: {
          processingTime: 100,
          memoryUsage: 50 * 1024 * 1024,
          contentPreserved: 0.95,
          qualityScore: 0.9,
          itemsProcessed: 1
        }
      });

      const results = await optimizer.processConcurrently(mockSourceDocuments, mockProcessor);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});

// Helper functions

function createMockSourceDocument(
  id: string, 
  type: 'probability' | 'relations' | 'general' = 'general',
  size: number = 1024 * 1024 // 1MB default
): SourceDocument {
  const content = 'x'.repeat(size);
  return {
    id,
    file: new File([content], `${id}.pdf`, { type: 'application/pdf' }),
    type,
    processingStatus: 'pending',
    errors: []
  };
}

function createMockAcademicDocument(): AcademicDocument {
  return {
    title: 'Test Study Guide',
    tableOfContents: [
      { title: 'Part I: Discrete Probability', pageNumber: 1, anchor: 'part1' }
    ],
    parts: [
      {
        partNumber: 1,
        title: 'Discrete Probability',
        sections: [
          {
            sectionNumber: '1.1',
            title: 'Basic Probability',
            content: 'Probability is the measure of the likelihood of an event occurring. '.repeat(20),
            formulas: [
              {
                id: 'formula1',
                latex: 'P(A) = \\frac{|A|}{|S|}',
                context: 'Basic probability formula',
                type: 'display',
                sourceLocation: { page: 1, x: 0, y: 0, width: 100, height: 20 },
                isKeyFormula: true
              }
            ],
            examples: [
              {
                id: 'example1',
                title: 'Coin Flip Example',
                problem: 'What is the probability of getting heads when flipping a fair coin?',
                solution: [
                  {
                    stepNumber: 1,
                    description: 'Identify the sample space',
                    explanation: 'S = {H, T}'
                  },
                  {
                    stepNumber: 2,
                    description: 'Calculate probability',
                    formula: 'P(H) = 1/2',
                    explanation: 'One favorable outcome out of two possible'
                  }
                ],
                sourceLocation: { page: 1, x: 0, y: 50, width: 200, height: 100 },
                subtopic: 'basic'
              }
            ],
            subsections: []
          }
        ]
      }
    ],
    crossReferences: [],
    appendices: [],
    metadata: {
      generatedAt: new Date(),
      sourceFiles: ['test.pdf'],
      totalSections: 1,
      totalFormulas: 1,
      totalExamples: 1,
      preservationScore: 0.95
    }
  };
}

function createTestLayoutConfig(): CompactLayoutConfig {
  return {
    paperSize: 'a4',
    columns: 2,
    typography: {
      fontSize: 11,
      lineHeight: 1.25,
      fontFamily: {
        body: 'Times New Roman, serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Courier New, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 0.35,
      listSpacing: 0.25,
      sectionSpacing: 0.5,
      headingMargins: {
        top: 0.4,
        bottom: 0.2
      }
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 15,
      right: 15,
      columnGap: 10
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 1.5
      }
    }
  };
}

function createStandardLayoutConfig(): CompactLayoutConfig {
  return {
    paperSize: 'a4',
    columns: 1,
    typography: {
      fontSize: 12,
      lineHeight: 1.5,
      fontFamily: {
        body: 'Times New Roman, serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Courier New, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 1.0,
      listSpacing: 0.5,
      sectionSpacing: 1.5,
      headingMargins: {
        top: 1.0,
        bottom: 0.5
      }
    },
    margins: {
      top: 25,
      bottom: 25,
      left: 25,
      right: 25,
      columnGap: 15
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: false
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 2.0
      }
    }
  };
}

function createCompactLayoutConfig(): CompactLayoutConfig {
  return {
    paperSize: 'a4',
    columns: 2,
    typography: {
      fontSize: 10,
      lineHeight: 1.15,
      fontFamily: {
        body: 'Times New Roman, serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Courier New, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 0.25,
      listSpacing: 0.2,
      sectionSpacing: 0.3,
      headingMargins: {
        top: 0.3,
        bottom: 0.15
      }
    },
    margins: {
      top: 15,
      bottom: 15,
      left: 12,
      right: 12,
      columnGap: 8
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 1.3
      }
    }
  };
}