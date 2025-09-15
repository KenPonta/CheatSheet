// Performance optimization system for compact study generator

import { MemoryManager, getGlobalMemoryManager } from '../file-processing/memory-manager';
import { 
  AcademicDocument, 
  CompactLayoutConfig, 
  ProcessingMetrics,
  SourceDocument,
  ProcessingResult,
  ProcessingError,
  ProcessingWarning
} from './types';

// Performance optimization interfaces
export interface PerformanceConfig {
  maxConcurrentDocuments: number;
  memoryThresholdMB: number;
  chunkSizeMB: number;
  enableCaching: boolean;
  enableCompression: boolean;
  optimizationLevel: 'fast' | 'balanced' | 'maximum';
  pageCountTarget?: number;
  contentDensityTarget?: number;
}

export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: {
    peak: number;
    average: number;
    current: number;
  };
  pageCountReduction: {
    original: number;
    optimized: number;
    reductionPercentage: number;
  };
  contentDensity: {
    charactersPerPage: number;
    formulasPerPage: number;
    examplesPerPage: number;
    densityScore: number;
  };
  concurrencyStats: {
    documentsProcessed: number;
    averageProcessingTime: number;
    parallelEfficiency: number;
  };
  optimizationResults: OptimizationResult[];
}

export interface OptimizationResult {
  type: 'memory' | 'layout' | 'content' | 'concurrency';
  description: string;
  impact: 'low' | 'medium' | 'high';
  metrics: {
    before: number;
    after: number;
    improvement: number;
  };
}

export interface ConcurrentProcessingTask {
  id: string;
  document: SourceDocument;
  priority: number;
  estimatedMemoryUsage: number;
  estimatedProcessingTime: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: ProcessingResult;
  error?: ProcessingError;
}

export interface ContentDensityAnalysis {
  currentDensity: {
    textDensity: number;
    mathDensity: number;
    whitespaceRatio: number;
    contentUtilization: number;
  };
  optimizationOpportunities: {
    spacingReduction: number;
    fontSizeOptimization: number;
    layoutImprovement: number;
    contentReorganization: number;
  };
  recommendations: DensityRecommendation[];
}

export interface DensityRecommendation {
  type: 'spacing' | 'typography' | 'layout' | 'content';
  description: string;
  expectedImprovement: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  config: Partial<CompactLayoutConfig>;
}

// Performance Optimizer Implementation
export class PerformanceOptimizer {
  private memoryManager: MemoryManager;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private processingQueue: ConcurrentProcessingTask[] = [];
  private activeProcessing = new Map<string, ConcurrentProcessingTask>();
  private processingHistory: PerformanceMetrics[] = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      maxConcurrentDocuments: 3,
      memoryThresholdMB: 512,
      chunkSizeMB: 10,
      enableCaching: true,
      enableCompression: true,
      optimizationLevel: 'balanced',
      ...config
    };

    this.memoryManager = getGlobalMemoryManager();
    this.metrics = this.initializeMetrics();
  }

  // Memory-efficient processing for large PDF files
  async processLargePDFEfficiently(
    document: SourceDocument,
    processor: (chunk: ArrayBuffer) => Promise<any>
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const memoryBefore = this.memoryManager.getMemoryUsage();

    try {
      // Check if file can be processed
      const canProcess = this.memoryManager.canProcessFile(document.file.size);
      if (!canProcess.canProcess) {
        const processingError: ProcessingError = {
          id: `memory_error_${Date.now()}`,
          stage: 'memory_check',
          type: 'system',
          severity: 'high',
          message: `Cannot process file: ${canProcess.reason}`,
          recoverable: false,
          timestamp: new Date(),
          sourceDocument: document.id
        };

        return {
          success: false,
          data: null,
          errors: [processingError],
          warnings: [],
          metrics: {
            processingTime: Date.now() - startTime,
            memoryUsage: this.memoryManager.getMemoryUsage().used,
            contentPreserved: 0,
            qualityScore: 0,
            itemsProcessed: 0
          }
        };
      }

      // Register processing start
      this.memoryManager.startProcessing(document.id);

      // Determine optimal chunk size based on available memory
      const chunkSize = this.calculateOptimalChunkSize(document.file.size);
      
      // Process file in chunks
      const results: any[] = [];
      const chunkReader = this.memoryManager.createChunkedReader(document.file, chunkSize);

      let chunkIndex = 0;
      for await (const chunk of chunkReader) {
        // Monitor memory usage
        const currentMemory = this.memoryManager.getMemoryUsage();
        if (currentMemory.percentage > 85) {
          // Force garbage collection and wait
          this.memoryManager.forceGarbageCollection();
          await this.waitForMemoryRelease();
        }

        // Process chunk
        const chunkResult = await processor(chunk);
        results.push(chunkResult);

        chunkIndex++;
        
        // Update progress
        const progress = Math.min(100, Math.round((chunkIndex * chunkSize / document.file.size) * 100));
        this.emitProgress(document.id, progress);
      }

      // Combine results
      const combinedResult = this.combineChunkResults(results);
      
      // Calculate metrics
      const processingTime = Date.now() - startTime;
      const memoryAfter = this.memoryManager.getMemoryUsage();
      
      this.updateMemoryMetrics(memoryBefore, memoryAfter, processingTime);

      return {
        success: true,
        data: combinedResult,
        errors: [],
        warnings: [],
        metrics: {
          processingTime,
          memoryUsage: memoryAfter.used,
          contentPreserved: 1.0,
          qualityScore: 0.95,
          itemsProcessed: results.length
        }
      };

    } catch (error) {
      const processingError: ProcessingError = {
        id: `perf_error_${Date.now()}`,
        stage: 'memory_optimization',
        type: 'system',
        severity: 'high',
        message: error instanceof Error ? error.message : 'Memory processing failed',
        recoverable: true,
        timestamp: new Date(),
        sourceDocument: document.id
      };

      return {
        success: false,
        data: null,
        errors: [processingError],
        warnings: [],
        metrics: {
          processingTime: Date.now() - startTime,
          memoryUsage: this.memoryManager.getMemoryUsage().used,
          contentPreserved: 0,
          qualityScore: 0,
          itemsProcessed: 0
        }
      };

    } finally {
      this.memoryManager.finishProcessing(document.id);
    }
  }

  // Concurrent processing capabilities for multiple documents
  async processConcurrently(
    documents: SourceDocument[],
    processor: (doc: SourceDocument) => Promise<ProcessingResult>
  ): Promise<ProcessingResult[]> {
    const startTime = Date.now();

    if (!documents || documents.length === 0) {
      return [];
    }

    // Create processing tasks
    const tasks = documents.map((doc, index) => this.createProcessingTask(doc, index, processor));
    
    // Sort by priority and estimated resource usage
    tasks.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.estimatedMemoryUsage - b.estimatedMemoryUsage;
    });

    // Process tasks with concurrency control
    const results: ProcessingResult[] = [];
    const activePromises = new Set<Promise<void>>();

    for (const task of tasks) {
      // Wait if we've reached the concurrency limit
      while (activePromises.size >= this.config.maxConcurrentDocuments) {
        await Promise.race(activePromises);
      }

      // Start processing the task
      const promise = this.processTaskDirectly(task, processor).then(result => {
        results.push(result);
        activePromises.delete(promise);
      });
      
      activePromises.add(promise);
    }

    // Wait for all remaining tasks to complete
    await Promise.all(activePromises);

    // Calculate concurrency metrics
    const totalTime = Date.now() - startTime;
    const averageTime = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.metrics.processingTime, 0) / results.length : 0;
    const sequentialTime = results.reduce((sum, r) => sum + r.metrics.processingTime, 0);
    const parallelEfficiency = totalTime > 0 ? sequentialTime / totalTime : 1;

    this.updateConcurrencyMetrics(documents.length, averageTime, parallelEfficiency);

    return results;
  }

  // Page count reduction measurement and reporting
  measurePageCountReduction(
    originalDocument: AcademicDocument,
    optimizedDocument: AcademicDocument,
    layoutConfig: CompactLayoutConfig
  ): { original: number; optimized: number; reductionPercentage: number } {
    // Estimate page count based on content and layout
    const originalPages = this.estimatePageCount(originalDocument, this.getStandardLayoutConfig());
    const optimizedPages = this.estimatePageCount(optimizedDocument, layoutConfig);
    
    const reductionPercentage = ((originalPages - optimizedPages) / originalPages) * 100;

    // Update metrics
    this.metrics.pageCountReduction = {
      original: originalPages,
      optimized: optimizedPages,
      reductionPercentage
    };

    // Add optimization result
    this.metrics.optimizationResults.push({
      type: 'layout',
      description: `Page count reduced from ${originalPages} to ${optimizedPages} pages`,
      impact: reductionPercentage > 30 ? 'high' : reductionPercentage > 15 ? 'medium' : 'low',
      metrics: {
        before: originalPages,
        after: optimizedPages,
        improvement: reductionPercentage
      }
    });

    return {
      original: originalPages,
      optimized: optimizedPages,
      reductionPercentage
    };
  }

  // Content density optimization algorithms
  optimizeContentDensity(
    document: AcademicDocument,
    layoutConfig: CompactLayoutConfig,
    targetDensity?: number
  ): { optimizedConfig: CompactLayoutConfig; densityAnalysis: ContentDensityAnalysis } {
    // Analyze current content density
    const densityAnalysis = this.analyzeContentDensity(document, layoutConfig);
    
    // Create optimized configuration
    const optimizedConfig = this.createOptimizedLayoutConfig(
      layoutConfig,
      densityAnalysis,
      targetDensity
    );

    // Calculate density improvements
    const optimizedDensity = this.calculateContentDensity(document, optimizedConfig);
    const densityImprovement = ((optimizedDensity - densityAnalysis.currentDensity.contentUtilization) / 
                               densityAnalysis.currentDensity.contentUtilization) * 100;

    // Update metrics
    this.metrics.contentDensity = {
      charactersPerPage: this.calculateCharactersPerPage(document, optimizedConfig),
      formulasPerPage: this.calculateFormulasPerPage(document, optimizedConfig),
      examplesPerPage: this.calculateExamplesPerPage(document, optimizedConfig),
      densityScore: optimizedDensity
    };

    // Add optimization result
    this.metrics.optimizationResults.push({
      type: 'content',
      description: `Content density improved by ${densityImprovement.toFixed(1)}%`,
      impact: densityImprovement > 20 ? 'high' : densityImprovement > 10 ? 'medium' : 'low',
      metrics: {
        before: densityAnalysis.currentDensity.contentUtilization,
        after: optimizedDensity,
        improvement: densityImprovement
      }
    });

    return { optimizedConfig, densityAnalysis };
  }

  // Get comprehensive performance report
  getPerformanceReport(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get optimization recommendations
  getOptimizationRecommendations(
    document: AcademicDocument,
    layoutConfig: CompactLayoutConfig
  ): DensityRecommendation[] {
    const densityAnalysis = this.analyzeContentDensity(document, layoutConfig);
    return densityAnalysis.recommendations;
  }

  // Private helper methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      processingTime: 0,
      memoryUsage: {
        peak: 0,
        average: 0,
        current: 0
      },
      pageCountReduction: {
        original: 0,
        optimized: 0,
        reductionPercentage: 0
      },
      contentDensity: {
        charactersPerPage: 0,
        formulasPerPage: 0,
        examplesPerPage: 0,
        densityScore: 0
      },
      concurrencyStats: {
        documentsProcessed: 0,
        averageProcessingTime: 0,
        parallelEfficiency: 0
      },
      optimizationResults: []
    };
  }

  private calculateOptimalChunkSize(fileSize: number): number {
    const memoryUsage = this.memoryManager.getMemoryUsage();
    const availableMemory = memoryUsage.available;
    
    // Use 10% of available memory or configured chunk size, whichever is smaller
    const maxChunkSize = Math.min(
      this.config.chunkSizeMB * 1024 * 1024,
      availableMemory * 0.1
    );
    
    // Ensure minimum chunk size of 1MB
    return Math.max(maxChunkSize, 1024 * 1024);
  }

  private async waitForMemoryRelease(): Promise<void> {
    return new Promise(resolve => {
      const checkMemory = () => {
        const usage = this.memoryManager.getMemoryUsage();
        if (usage.percentage < 85) {
          resolve();
        } else {
          setTimeout(checkMemory, 100);
        }
      };
      checkMemory();
    });
  }

  private combineChunkResults(results: any[]): any {
    // Combine chunk processing results into a single result
    // This is a simplified implementation - real implementation would depend on data structure
    if (!results || results.length === 0) {
      return {
        combinedContent: [],
        totalItems: 0,
        metadata: {
          chunksProcessed: 0,
          combinedAt: new Date()
        }
      };
    }

    return {
      combinedContent: results.flatMap(r => (r && r.content) ? r.content : []),
      totalItems: results.reduce((sum, r) => sum + ((r && r.itemCount) || 0), 0),
      metadata: {
        chunksProcessed: results.length,
        combinedAt: new Date()
      }
    };
  }

  private createProcessingTask(
    document: SourceDocument,
    index: number,
    processor: (doc: SourceDocument) => Promise<ProcessingResult>
  ): ConcurrentProcessingTask {
    return {
      id: `task_${document.id}_${index}`,
      document,
      priority: this.calculateTaskPriority(document),
      estimatedMemoryUsage: this.estimateMemoryUsage(document),
      estimatedProcessingTime: this.estimateProcessingTime(document),
      status: 'queued'
    };
  }

  private async processTaskDirectly(
    task: ConcurrentProcessingTask,
    processor: (doc: SourceDocument) => Promise<ProcessingResult>
  ): Promise<ProcessingResult> {
    task.status = 'processing';
    task.startTime = new Date();

    try {
      const result = await processor(task.document);
      task.result = result;
      task.status = 'completed';
      task.endTime = new Date();
      return result;
    } catch (error) {
      const processingError: ProcessingError = {
        id: `task_error_${Date.now()}`,
        stage: 'concurrent_processing',
        type: 'system',
        severity: 'medium',
        message: error instanceof Error ? error.message : 'Task processing failed',
        recoverable: true,
        timestamp: new Date(),
        sourceDocument: task.document.id
      };

      task.error = processingError;
      task.status = 'failed';
      task.endTime = new Date();

      const failedResult: ProcessingResult = {
        success: false,
        data: null,
        errors: [processingError],
        warnings: [],
        metrics: {
          processingTime: Date.now() - (task.startTime?.getTime() || Date.now()),
          memoryUsage: this.memoryManager.getMemoryUsage().used,
          contentPreserved: 0,
          qualityScore: 0,
          itemsProcessed: 0
        }
      };

      return failedResult;
    }
  }

  private calculateTaskPriority(document: SourceDocument): number {
    // Higher priority for smaller files and specific document types
    let priority = 100;
    
    // Prioritize smaller files
    if (document.file.size < 5 * 1024 * 1024) priority += 20; // < 5MB
    else if (document.file.size < 20 * 1024 * 1024) priority += 10; // < 20MB
    
    // Prioritize specific document types
    if (document.type === 'probability') priority += 15;
    else if (document.type === 'relations') priority += 10;
    
    return priority;
  }

  private estimateMemoryUsage(document: SourceDocument): number {
    // Estimate memory usage based on file size and type
    const baseUsage = document.file.size * 2.5; // 2.5x file size for processing
    
    // Add overhead for specific document types
    if (document.type === 'probability') return baseUsage * 1.2;
    if (document.type === 'relations') return baseUsage * 1.1;
    
    return baseUsage;
  }

  private estimateProcessingTime(document: SourceDocument): number {
    // Estimate processing time based on file size and complexity
    const baseTime = document.file.size / (1024 * 1024) * 2000; // 2 seconds per MB
    
    // Add overhead for mathematical content
    if (document.type === 'probability' || document.type === 'relations') {
      return baseTime * 1.5;
    }
    
    return baseTime;
  }

  private async processNextTask(results: ProcessingResult[]): Promise<void> {
    while (this.processingQueue.length > 0) {
      // Check if we can start another task
      if (this.activeProcessing.size >= this.config.maxConcurrentDocuments) {
        await this.waitForTaskCompletion();
        continue;
      }

      // Get next task
      const task = this.processingQueue.shift();
      if (!task) break;

      // Check memory constraints
      const memoryUsage = this.memoryManager.getMemoryUsage();
      if (memoryUsage.percentage > 80) {
        // Put task back and wait
        this.processingQueue.unshift(task);
        await this.waitForMemoryRelease();
        continue;
      }

      // Start processing task
      this.activeProcessing.set(task.id, task);
      task.status = 'processing';
      task.startTime = new Date();

      // Process asynchronously
      this.processTaskAsync(task, results);
    }
  }

  private async processTaskAsync(task: ConcurrentProcessingTask, results: ProcessingResult[]): Promise<void> {
    try {
      // Simulate processing - in real implementation, this would call the actual processor
      await new Promise(resolve => setTimeout(resolve, Math.min(task.estimatedProcessingTime, 1000)));
      
      const result: ProcessingResult = {
        success: true,
        data: { documentId: task.document.id, processed: true },
        errors: [],
        warnings: [],
        metrics: {
          processingTime: Date.now() - (task.startTime?.getTime() || Date.now()),
          memoryUsage: this.memoryManager.getMemoryUsage().used,
          contentPreserved: 0.95,
          qualityScore: 0.9,
          itemsProcessed: 1
        }
      };

      task.result = result;
      task.status = 'completed';
      task.endTime = new Date();
      
      results.push(result);

    } catch (error) {
      const processingError: ProcessingError = {
        id: `task_error_${Date.now()}`,
        stage: 'concurrent_processing',
        type: 'system',
        severity: 'medium',
        message: error instanceof Error ? error.message : 'Task processing failed',
        recoverable: true,
        timestamp: new Date(),
        sourceDocument: task.document.id
      };

      task.error = processingError;
      task.status = 'failed';
      task.endTime = new Date();

      const failedResult: ProcessingResult = {
        success: false,
        data: null,
        errors: [processingError],
        warnings: [],
        metrics: {
          processingTime: Date.now() - (task.startTime?.getTime() || Date.now()),
          memoryUsage: this.memoryManager.getMemoryUsage().used,
          contentPreserved: 0,
          qualityScore: 0,
          itemsProcessed: 0
        }
      };

      results.push(failedResult);

    } finally {
      this.activeProcessing.delete(task.id);
    }
  }

  private async waitForTaskCompletion(): Promise<void> {
    return new Promise(resolve => {
      const checkTasks = () => {
        if (this.activeProcessing.size < this.config.maxConcurrentDocuments) {
          resolve();
        } else {
          setTimeout(checkTasks, 100);
        }
      };
      checkTasks();
    });
  }

  private estimatePageCount(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    // Estimate page count based on content and layout configuration
    const totalContent = this.calculateTotalContentLength(document);
    const charactersPerPage = this.calculateCharactersPerPage(document, layoutConfig);
    
    return Math.ceil(totalContent / charactersPerPage);
  }

  private calculateTotalContentLength(document: AcademicDocument): number {
    let totalLength = 0;
    
    // Count characters in all parts and sections
    for (const part of document.parts) {
      for (const section of part.sections) {
        totalLength += section.content.length;
        
        // Add formula content
        for (const formula of section.formulas) {
          totalLength += formula.latex.length * 2; // Formulas take more space
        }
        
        // Add example content
        for (const example of section.examples) {
          totalLength += example.problem.length;
          for (const step of example.solution) {
            totalLength += step.description.length + (step.formula?.length || 0);
          }
        }
      }
    }
    
    return totalLength;
  }

  private calculateCharactersPerPage(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    // Calculate characters per page based on layout configuration
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    
    const contentWidth = pageWidth - layoutConfig.margins.left - layoutConfig.margins.right;
    const contentHeight = pageHeight - layoutConfig.margins.top - layoutConfig.margins.bottom;
    
    // Adjust for columns
    const columnWidth = layoutConfig.columns === 2 ? 
      (contentWidth - (layoutConfig.margins.columnGap || 10)) / 2 : contentWidth;
    
    // Estimate characters based on font size and spacing
    const charWidth = layoutConfig.typography.fontSize * 0.6; // Approximate character width
    const lineHeight = layoutConfig.typography.fontSize * layoutConfig.typography.lineHeight;
    
    const charsPerLine = Math.floor(Math.max(1, columnWidth / charWidth));
    const linesPerPage = Math.floor(Math.max(1, contentHeight / lineHeight));
    
    return charsPerLine * linesPerPage * Math.max(1, layoutConfig.columns);
  }

  private calculateFormulasPerPage(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    const totalFormulas = document.parts.reduce((sum, part) => 
      sum + part.sections.reduce((sectionSum, section) => 
        sectionSum + section.formulas.length, 0), 0);
    
    const totalPages = this.estimatePageCount(document, layoutConfig);
    return totalFormulas / totalPages;
  }

  private calculateExamplesPerPage(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    const totalExamples = document.parts.reduce((sum, part) => 
      sum + part.sections.reduce((sectionSum, section) => 
        sectionSum + section.examples.length, 0), 0);
    
    const totalPages = this.estimatePageCount(document, layoutConfig);
    return totalExamples / totalPages;
  }

  private analyzeContentDensity(
    document: AcademicDocument,
    layoutConfig: CompactLayoutConfig
  ): ContentDensityAnalysis {
    const currentDensity = {
      textDensity: this.calculateTextDensity(document, layoutConfig),
      mathDensity: this.calculateMathDensity(document, layoutConfig),
      whitespaceRatio: this.calculateWhitespaceRatio(layoutConfig),
      contentUtilization: this.calculateContentDensity(document, layoutConfig)
    };

    const optimizationOpportunities = {
      spacingReduction: this.calculateSpacingReductionPotential(layoutConfig),
      fontSizeOptimization: this.calculateFontOptimizationPotential(layoutConfig),
      layoutImprovement: this.calculateLayoutImprovementPotential(layoutConfig),
      contentReorganization: this.calculateReorganizationPotential(document)
    };

    const recommendations = this.generateDensityRecommendations(
      currentDensity,
      optimizationOpportunities,
      layoutConfig
    );

    return {
      currentDensity,
      optimizationOpportunities,
      recommendations
    };
  }

  private calculateTextDensity(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    const totalText = this.calculateTotalContentLength(document);
    const totalPages = this.estimatePageCount(document, layoutConfig);
    return totalText / totalPages;
  }

  private calculateMathDensity(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    const totalFormulas = document.parts.reduce((sum, part) => 
      sum + part.sections.reduce((sectionSum, section) => 
        sectionSum + section.formulas.length, 0), 0);
    
    const totalPages = this.estimatePageCount(document, layoutConfig);
    return totalFormulas / totalPages;
  }

  private calculateWhitespaceRatio(layoutConfig: CompactLayoutConfig): number {
    // Calculate ratio of whitespace to content based on spacing settings
    const totalSpacing = layoutConfig.spacing.paragraphSpacing + 
                        layoutConfig.spacing.listSpacing + 
                        layoutConfig.spacing.sectionSpacing;
    
    // Normalize to 0-1 scale (lower is better for density)
    return Math.min(totalSpacing / 2.0, 1.0);
  }

  private calculateContentDensity(document: AcademicDocument, layoutConfig: CompactLayoutConfig): number {
    const textDensity = this.calculateTextDensity(document, layoutConfig);
    const mathDensity = this.calculateMathDensity(document, layoutConfig);
    const whitespaceRatio = this.calculateWhitespaceRatio(layoutConfig);
    
    // Combine metrics into overall density score (0-1, higher is better)
    return (textDensity / 3000 + mathDensity / 10) * (1 - whitespaceRatio * 0.5);
  }

  private calculateSpacingReductionPotential(layoutConfig: CompactLayoutConfig): number {
    // Calculate how much spacing can be reduced
    const currentSpacing = layoutConfig.spacing.paragraphSpacing + layoutConfig.spacing.listSpacing;
    const minSpacing = 0.4; // Minimum readable spacing
    return Math.max(0, (currentSpacing - minSpacing) / currentSpacing * 100);
  }

  private calculateFontOptimizationPotential(layoutConfig: CompactLayoutConfig): number {
    // Calculate font size optimization potential
    const currentSize = layoutConfig.typography.fontSize;
    const minSize = 9; // Minimum readable font size
    return Math.max(0, (currentSize - minSize) / currentSize * 100);
  }

  private calculateLayoutImprovementPotential(layoutConfig: CompactLayoutConfig): number {
    // Calculate layout improvement potential
    let potential = 0;
    
    if (layoutConfig.columns < 2) potential += 25; // Two-column layout improvement
    if (layoutConfig.margins.left + layoutConfig.margins.right > 30) potential += 15; // Margin reduction
    if (layoutConfig.typography.lineHeight > 1.3) potential += 10; // Line height reduction
    
    return potential;
  }

  private calculateReorganizationPotential(document: AcademicDocument): number {
    // Calculate content reorganization potential
    let potential = 0;
    
    // Check for redundant content
    const totalSections = document.parts.reduce((sum, part) => sum + part.sections.length, 0);
    if (totalSections > 15) potential += 20; // Too many sections
    
    // Check for long examples that could be shortened
    const longExamples = document.parts.reduce((sum, part) => 
      sum + part.sections.reduce((sectionSum, section) => 
        sectionSum + section.examples.filter(ex => ex.solution.length > 5).length, 0), 0);
    
    if (longExamples > 5) potential += 15;
    
    return potential;
  }

  private generateDensityRecommendations(
    currentDensity: any,
    opportunities: any,
    layoutConfig: CompactLayoutConfig
  ): DensityRecommendation[] {
    const recommendations: DensityRecommendation[] = [];

    // Spacing recommendations
    if (opportunities.spacingReduction > 10) {
      recommendations.push({
        type: 'spacing',
        description: `Reduce paragraph spacing from ${layoutConfig.spacing.paragraphSpacing}em to 0.25em`,
        expectedImprovement: opportunities.spacingReduction,
        implementationComplexity: 'low',
        config: {
          spacing: {
            ...layoutConfig.spacing,
            paragraphSpacing: 0.25,
            listSpacing: 0.2
          }
        }
      });
    }

    // Typography recommendations
    if (opportunities.fontSizeOptimization > 5) {
      recommendations.push({
        type: 'typography',
        description: `Reduce font size from ${layoutConfig.typography.fontSize}pt to ${layoutConfig.typography.fontSize - 1}pt`,
        expectedImprovement: opportunities.fontSizeOptimization,
        implementationComplexity: 'low',
        config: {
          typography: {
            ...layoutConfig.typography,
            fontSize: layoutConfig.typography.fontSize - 1,
            lineHeight: Math.max(1.15, layoutConfig.typography.lineHeight - 0.05)
          }
        }
      });
    }

    // Layout recommendations
    if (layoutConfig.columns < 2) {
      recommendations.push({
        type: 'layout',
        description: 'Switch to two-column layout for better space utilization',
        expectedImprovement: 25,
        implementationComplexity: 'medium',
        config: {
          columns: 2,
          margins: {
            ...layoutConfig.margins,
            columnGap: 10
          }
        }
      });
    }

    return recommendations;
  }

  private createOptimizedLayoutConfig(
    baseConfig: CompactLayoutConfig,
    densityAnalysis: ContentDensityAnalysis,
    targetDensity?: number
  ): CompactLayoutConfig {
    let optimizedConfig = { ...baseConfig };

    // Apply high-impact, low-complexity recommendations first
    for (const recommendation of densityAnalysis.recommendations) {
      if (recommendation.implementationComplexity === 'low' && 
          recommendation.expectedImprovement > 10) {
        optimizedConfig = {
          ...optimizedConfig,
          ...recommendation.config
        };
      }
    }

    // Apply medium-complexity recommendations if target density is set
    if (targetDensity && targetDensity > densityAnalysis.currentDensity.contentUtilization) {
      for (const recommendation of densityAnalysis.recommendations) {
        if (recommendation.implementationComplexity === 'medium') {
          optimizedConfig = {
            ...optimizedConfig,
            ...recommendation.config
          };
        }
      }
    }

    return optimizedConfig;
  }

  private getStandardLayoutConfig(): CompactLayoutConfig {
    // Return a standard layout configuration for comparison
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

  private updateMemoryMetrics(
    memoryBefore: any,
    memoryAfter: any,
    processingTime: number
  ): void {
    const peakUsage = Math.max(memoryBefore.used, memoryAfter.used);
    const averageUsage = (memoryBefore.used + memoryAfter.used) / 2;

    this.metrics.memoryUsage = {
      peak: Math.max(this.metrics.memoryUsage.peak, peakUsage),
      average: (this.metrics.memoryUsage.average + averageUsage) / 2,
      current: memoryAfter.used
    };

    this.metrics.processingTime += processingTime;
  }

  private updateConcurrencyMetrics(
    documentsProcessed: number,
    averageTime: number,
    parallelEfficiency: number
  ): void {
    this.metrics.concurrencyStats = {
      documentsProcessed,
      averageProcessingTime: averageTime,
      parallelEfficiency
    };
  }

  private emitProgress(documentId: string, progress: number): void {
    // Emit progress event - in real implementation, this would use an event system
    console.log(`Document ${documentId}: ${progress}% complete`);
  }
}

// Factory function to create performance optimizer
export function createPerformanceOptimizer(config?: Partial<PerformanceConfig>): PerformanceOptimizer {
  return new PerformanceOptimizer(config);
}

// Default performance configuration
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxConcurrentDocuments: 3,
  memoryThresholdMB: 512,
  chunkSizeMB: 10,
  enableCaching: true,
  enableCompression: true,
  optimizationLevel: 'balanced'
};

// Export types and classes
export type {
  PerformanceConfig,
  PerformanceMetrics,
  OptimizationResult,
  ConcurrentProcessingTask,
  ContentDensityAnalysis,
  DensityRecommendation
};