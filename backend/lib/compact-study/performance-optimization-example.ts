// Example usage of the performance optimization system for compact study generator

import { 
  createPerformanceOptimizer,
  PerformanceConfig,
  PerformanceOptimizer
} from './performance-optimizer';
import { 
  createProcessingPipeline,
  ContentProcessingPipeline
} from './processing-pipeline';
import { 
  AcademicDocument,
  CompactLayoutConfig,
  SourceDocument,
  ProcessingResult
} from './types';

/**
 * Example 1: Basic performance optimization setup
 */
export async function basicPerformanceOptimization() {
  console.log('=== Basic Performance Optimization Example ===');
  
  // Create performance optimizer with custom configuration
  const perfConfig: Partial<PerformanceConfig> = {
    maxConcurrentDocuments: 3,
    memoryThresholdMB: 512,
    chunkSizeMB: 10,
    optimizationLevel: 'balanced'
  };
  
  const optimizer = createPerformanceOptimizer(perfConfig);
  
  // Create mock documents
  const documents = createMockDocuments(3);
  
  // Process documents concurrently with performance optimization
  const mockProcessor = async (doc: SourceDocument): Promise<ProcessingResult> => {
    console.log(`Processing document: ${doc.id}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      data: { documentId: doc.id, processed: true },
      errors: [],
      warnings: [],
      metrics: {
        processingTime: 100,
        memoryUsage: 25 * 1024 * 1024, // 25MB
        contentPreserved: 0.95,
        qualityScore: 0.9,
        itemsProcessed: 1
      }
    };
  };
  
  const results = await optimizer.processConcurrently(documents, mockProcessor);
  
  console.log(`Processed ${results.length} documents`);
  console.log(`Success rate: ${results.filter(r => r.success).length}/${results.length}`);
  
  // Get performance report
  const report = optimizer.getPerformanceReport();
  console.log('Performance Report:', {
    concurrentDocuments: report.concurrencyStats.documentsProcessed,
    averageProcessingTime: `${report.concurrencyStats.averageProcessingTime}ms`,
    parallelEfficiency: `${(report.concurrencyStats.parallelEfficiency * 100).toFixed(1)}%`,
    memoryUsage: `${(report.memoryUsage.current / 1024 / 1024).toFixed(1)}MB`
  });
  
  return report;
}

/**
 * Example 2: Memory-efficient large file processing
 */
export async function memoryEfficientProcessing() {
  console.log('\n=== Memory-Efficient Processing Example ===');
  
  const optimizer = createPerformanceOptimizer({
    maxConcurrentDocuments: 2,
    memoryThresholdMB: 256,
    chunkSizeMB: 5,
    optimizationLevel: 'maximum'
  });
  
  // Create a large document
  const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
  const largeDocument: SourceDocument = {
    id: 'large_pdf',
    file: new File([largeContent], 'large.pdf', { type: 'application/pdf' }),
    type: 'probability',
    processingStatus: 'pending',
    errors: []
  };
  
  // Chunk processor that handles individual chunks
  const chunkProcessor = async (chunk: ArrayBuffer): Promise<any> => {
    console.log(`Processing chunk of size: ${(chunk.byteLength / 1024).toFixed(1)}KB`);
    
    // Simulate chunk processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      content: [`Processed chunk of ${chunk.byteLength} bytes`],
      itemCount: 1
    };
  };
  
  const result = await optimizer.processLargePDFEfficiently(largeDocument, chunkProcessor);
  
  if (result.success) {
    console.log('Large file processed successfully');
    console.log(`Processing time: ${result.metrics.processingTime}ms`);
    console.log(`Memory usage: ${(result.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
  } else {
    console.log('Large file processing failed:', result.errors[0]?.message);
  }
  
  return result;
}

/**
 * Example 3: Page count reduction optimization
 */
export async function pageCountOptimization() {
  console.log('\n=== Page Count Reduction Example ===');
  
  const optimizer = createPerformanceOptimizer();
  
  // Create mock academic documents
  const originalDocument = createMockAcademicDocument('Original Study Guide', 10);
  const optimizedDocument = createMockAcademicDocument('Optimized Study Guide', 8);
  
  // Create layout configurations
  const standardLayout = createStandardLayoutConfig();
  const compactLayout = createCompactLayoutConfig();
  
  // Measure page count reduction
  const reduction = optimizer.measurePageCountReduction(
    originalDocument,
    optimizedDocument,
    compactLayout
  );
  
  console.log('Page Count Reduction Results:', {
    originalPages: reduction.original,
    optimizedPages: reduction.optimized,
    reductionPercentage: `${reduction.reductionPercentage.toFixed(1)}%`,
    pagesSaved: reduction.original - reduction.optimized
  });
  
  return reduction;
}

/**
 * Example 4: Content density optimization
 */
export async function contentDensityOptimization() {
  console.log('\n=== Content Density Optimization Example ===');
  
  const optimizer = createPerformanceOptimizer();
  
  // Create mock document and inefficient layout
  const document = createMockAcademicDocument('Study Guide', 5);
  const inefficientLayout = createInefficientLayoutConfig();
  
  // Optimize content density
  const result = optimizer.optimizeContentDensity(
    document,
    inefficientLayout,
    0.8 // Target density score
  );
  
  console.log('Content Density Analysis:');
  console.log('Current Density:', {
    textDensity: result.densityAnalysis.currentDensity.textDensity.toFixed(1),
    mathDensity: result.densityAnalysis.currentDensity.mathDensity.toFixed(1),
    whitespaceRatio: `${(result.densityAnalysis.currentDensity.whitespaceRatio * 100).toFixed(1)}%`,
    contentUtilization: `${(result.densityAnalysis.currentDensity.contentUtilization * 100).toFixed(1)}%`
  });
  
  console.log('\nOptimization Recommendations:');
  result.densityAnalysis.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.type}: ${rec.description}`);
    console.log(`   Expected improvement: ${rec.expectedImprovement.toFixed(1)}%`);
    console.log(`   Complexity: ${rec.implementationComplexity}`);
  });
  
  console.log('\nOptimized Layout Changes:');
  console.log('Font size:', `${inefficientLayout.typography.fontSize}pt → ${result.optimizedConfig.typography.fontSize}pt`);
  console.log('Line height:', `${inefficientLayout.typography.lineHeight} → ${result.optimizedConfig.typography.lineHeight}`);
  console.log('Paragraph spacing:', `${inefficientLayout.spacing.paragraphSpacing}em → ${result.optimizedConfig.spacing.paragraphSpacing}em`);
  console.log('Columns:', `${inefficientLayout.columns} → ${result.optimizedConfig.columns}`);
  
  return result;
}

/**
 * Example 5: Comprehensive performance monitoring
 */
export async function comprehensivePerformanceMonitoring() {
  console.log('\n=== Comprehensive Performance Monitoring Example ===');
  
  const optimizer = createPerformanceOptimizer({
    optimizationLevel: 'balanced'
  });
  
  // Perform various operations to generate comprehensive metrics
  const documents = createMockDocuments(5);
  const mockDocument = createMockAcademicDocument('Test Document', 3);
  const layoutConfig = createStandardLayoutConfig();
  
  console.log('Running performance tests...');
  
  // 1. Concurrent processing
  const mockProcessor = async (doc: SourceDocument) => ({
    success: true,
    data: { documentId: doc.id },
    errors: [],
    warnings: [],
    metrics: {
      processingTime: Math.random() * 200 + 50,
      memoryUsage: Math.random() * 50 * 1024 * 1024 + 10 * 1024 * 1024,
      contentPreserved: 0.9 + Math.random() * 0.1,
      qualityScore: 0.85 + Math.random() * 0.15,
      itemsProcessed: 1
    }
  });
  
  await optimizer.processConcurrently(documents, mockProcessor);
  
  // 2. Page count optimization
  optimizer.measurePageCountReduction(mockDocument, mockDocument, createCompactLayoutConfig());
  
  // 3. Content density optimization
  optimizer.optimizeContentDensity(mockDocument, layoutConfig);
  
  // Get comprehensive report
  const report = optimizer.getPerformanceReport();
  
  console.log('\n=== COMPREHENSIVE PERFORMANCE REPORT ===');
  console.log('Processing Performance:', {
    totalProcessingTime: `${report.processingTime}ms`,
    documentsProcessed: report.concurrencyStats.documentsProcessed,
    averageProcessingTime: `${report.concurrencyStats.averageProcessingTime.toFixed(1)}ms`,
    parallelEfficiency: `${(report.concurrencyStats.parallelEfficiency * 100).toFixed(1)}%`
  });
  
  console.log('\nMemory Usage:', {
    current: `${(report.memoryUsage.current / 1024 / 1024).toFixed(1)}MB`,
    peak: `${(report.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB`,
    average: `${(report.memoryUsage.average / 1024 / 1024).toFixed(1)}MB`
  });
  
  console.log('\nPage Count Optimization:', {
    originalPages: report.pageCountReduction.original,
    optimizedPages: report.pageCountReduction.optimized,
    reductionPercentage: `${report.pageCountReduction.reductionPercentage.toFixed(1)}%`
  });
  
  console.log('\nContent Density:', {
    charactersPerPage: report.contentDensity.charactersPerPage.toFixed(0),
    formulasPerPage: report.contentDensity.formulasPerPage.toFixed(1),
    examplesPerPage: report.contentDensity.examplesPerPage.toFixed(1),
    densityScore: `${(report.contentDensity.densityScore * 100).toFixed(1)}%`
  });
  
  console.log('\nOptimization Results:');
  report.optimizationResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.type}: ${result.description}`);
    console.log(`   Impact: ${result.impact}, Improvement: ${result.metrics.improvement.toFixed(1)}%`);
  });
  
  // Get optimization recommendations
  const recommendations = optimizer.getOptimizationRecommendations(mockDocument, layoutConfig);
  console.log('\nRecommendations for Further Optimization:');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.description} (${rec.expectedImprovement.toFixed(1)}% improvement)`);
  });
  
  return report;
}

/**
 * Example 6: Integration with processing pipeline
 */
export async function pipelineIntegration() {
  console.log('\n=== Pipeline Integration Example ===');
  
  const optimizer = createPerformanceOptimizer();
  const pipeline = createProcessingPipeline({
    maxConcurrentStages: 2,
    enableRecovery: true,
    timeoutMs: 30000
  });
  
  // Mock processor for demonstration
  class MockProcessor {
    name = 'mock-processor';
    version = '1.0.0';
    
    async process(input: any): Promise<ProcessingResult> {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        data: createMockAcademicDocument('Pipeline Output', 3),
        errors: [],
        warnings: [],
        metrics: {
          processingTime: 100,
          memoryUsage: 30 * 1024 * 1024,
          contentPreserved: 0.95,
          qualityScore: 0.9,
          itemsProcessed: 1
        }
      };
    }
  }
  
  // Register processor and add stages
  pipeline.registerProcessor(new MockProcessor());
  pipeline.addSourceDocument(
    new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
    'probability'
  );
  pipeline.addStage('processing', 'Document Processing', 'mock-processor');
  
  // Execute pipeline
  console.log('Executing processing pipeline...');
  const document = await pipeline.execute();
  
  // Analyze pipeline output with performance optimizer
  const layoutConfig = createStandardLayoutConfig();
  const compactConfig = createCompactLayoutConfig();
  
  // Measure optimization potential
  const pageReduction = optimizer.measurePageCountReduction(document, document, compactConfig);
  const densityResult = optimizer.optimizeContentDensity(document, layoutConfig);
  
  console.log('Pipeline Integration Results:', {
    documentTitle: document.title,
    pipelineTime: pipeline.getMetrics().totalProcessingTime,
    pageReduction: `${pageReduction.reductionPercentage.toFixed(1)}%`,
    densityOptimizations: densityResult.densityAnalysis.recommendations.length
  });
  
  return {
    document,
    pageReduction,
    densityResult,
    pipelineMetrics: pipeline.getMetrics()
  };
}

// Helper functions to create mock data

function createMockDocuments(count: number): SourceDocument[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `doc_${i}`,
    file: new File([`content for document ${i}`], `doc${i}.pdf`, { type: 'application/pdf' }),
    type: i % 2 === 0 ? 'probability' : 'relations',
    processingStatus: 'pending',
    errors: []
  }));
}

function createMockAcademicDocument(title: string, sectionCount: number): AcademicDocument {
  const sections = Array.from({ length: sectionCount }, (_, i) => ({
    sectionNumber: `${Math.floor(i / 3) + 1}.${(i % 3) + 1}`,
    title: `Section ${i + 1}`,
    content: `This is the content for section ${i + 1}. `.repeat(100),
    formulas: [
      {
        id: `formula_${i}`,
        latex: 'P(A \\cap B) = P(A) \\cdot P(B|A)',
        context: 'Conditional probability',
        type: 'display' as const,
        sourceLocation: { page: 1, x: 0, y: 0, width: 100, height: 20 },
        isKeyFormula: true
      }
    ],
    examples: [
      {
        id: `example_${i}`,
        title: `Example ${i + 1}`,
        problem: `Solve this problem for section ${i + 1}`,
        solution: [
          {
            stepNumber: 1,
            description: 'First step',
            formula: 'P(A) = 0.5',
            explanation: 'Given probability'
          }
        ],
        sourceLocation: { page: 1, x: 0, y: 50, width: 200, height: 100 },
        subtopic: 'probability'
      }
    ],
    subsections: []
  }));

  return {
    title,
    tableOfContents: [
      { title: 'Part I: Content', pageNumber: 1, anchor: 'part1' }
    ],
    parts: [
      {
        partNumber: 1,
        title: 'Main Content',
        sections
      }
    ],
    crossReferences: [],
    appendices: [],
    metadata: {
      generatedAt: new Date(),
      sourceFiles: ['test.pdf'],
      totalSections: sectionCount,
      totalFormulas: sectionCount,
      totalExamples: sectionCount,
      preservationScore: 0.95
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

function createInefficientLayoutConfig(): CompactLayoutConfig {
  return {
    paperSize: 'a4',
    columns: 1,
    typography: {
      fontSize: 14,
      lineHeight: 1.8,
      fontFamily: {
        body: 'Times New Roman, serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Courier New, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 1.5,
      listSpacing: 1.0,
      sectionSpacing: 2.0,
      headingMargins: {
        top: 1.5,
        bottom: 1.0
      }
    },
    margins: {
      top: 30,
      bottom: 30,
      left: 30,
      right: 30,
      columnGap: 20
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: false
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 2.5
      }
    }
  };
}

// Export all examples for easy testing
export const performanceExamples = {
  basicPerformanceOptimization,
  memoryEfficientProcessing,
  pageCountOptimization,
  contentDensityOptimization,
  comprehensivePerformanceMonitoring,
  pipelineIntegration
};

// Main function to run all examples
export async function runAllPerformanceExamples() {
  console.log('🚀 Running Performance Optimization Examples\n');
  
  try {
    await basicPerformanceOptimization();
    await memoryEfficientProcessing();
    await pageCountOptimization();
    await contentDensityOptimization();
    await comprehensivePerformanceMonitoring();
    await pipelineIntegration();
    
    console.log('\n✅ All performance optimization examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running performance examples:', error);
    throw error;
  }
}

// Export default for convenience
export default performanceExamples;