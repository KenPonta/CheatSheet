// Content processing pipeline for compact study generator

import { 
  AcademicDocument, 
  DocumentPart,
  AcademicSection,
  CompactLayoutConfig, 
  EnhancedExtractedContent,
  MathematicalContent,
  ContentPreservationInfo,
  ValidationResult,
  MathContentExtractionError,
  LayoutError
} from './types';

// Processing Pipeline Interfaces
export interface ProcessingPipeline {
  input: SourceDocument[];
  stages: ProcessingStage[];
  output?: AcademicDocument;
  config: ProcessingPipelineConfig;
  status: PipelineStatus;
  errors: ProcessingError[];
  metrics: PipelineMetrics;
}

export interface SourceDocument {
  id: string;
  file: File;
  type: 'probability' | 'relations' | 'general';
  extractedContent?: EnhancedExtractedContent;
  mathematicalContent?: MathematicalContent;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errors: ProcessingError[];
}

export interface ProcessingStage {
  id: string;
  name: string;
  processor: ContentProcessor;
  config: any;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  errors: ProcessingError[];
  output?: any;
}

export interface ContentProcessor {
  name: string;
  version: string;
  process(input: any, config: any): Promise<ProcessingResult>;
  validate?(input: any, config: any): ValidationResult;
  recover?(error: ProcessingError, input: any, config: any): Promise<ProcessingResult>;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
  metrics: ProcessingMetrics;
}

export interface ProcessingError {
  id: string;
  stage: string;
  type: 'extraction' | 'validation' | 'transformation' | 'output' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
  sourceDocument?: string;
}

export interface ProcessingWarning {
  id: string;
  stage: string;
  type: 'content_loss' | 'quality_degradation' | 'format_issue' | 'performance';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ProcessingMetrics {
  processingTime: number;
  memoryUsage?: number;
  contentPreserved: number;
  qualityScore: number;
  itemsProcessed: number;
}

export interface ProcessingPipelineConfig {
  maxConcurrentStages: number;
  enableRecovery: boolean;
  failureThreshold: number; // Max failures before stopping
  timeoutMs: number;
  preservationThreshold: number; // Min preservation score required
  outputFormats: ('html' | 'pdf' | 'markdown')[];
  layoutConfig: CompactLayoutConfig;
}

export interface PipelineStatus {
  phase: 'initializing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currentStage?: string;
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
}

export interface PipelineMetrics {
  totalProcessingTime: number;
  stagesCompleted: number;
  stagesFailed: number;
  documentsProcessed: number;
  documentsFailed: number;
  totalErrors: number;
  totalWarnings: number;
  averagePreservationScore: number;
  averageQualityScore: number;
}

// Processing Pipeline Implementation
export class ContentProcessingPipeline {
  private pipeline: ProcessingPipeline;
  private processors: Map<string, ContentProcessor> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: ProcessingPipelineConfig) {
    this.pipeline = {
      input: [],
      stages: [],
      config,
      status: {
        phase: 'initializing',
        progress: 0,
        startTime: new Date()
      },
      errors: [],
      metrics: {
        totalProcessingTime: 0,
        stagesCompleted: 0,
        stagesFailed: 0,
        documentsProcessed: 0,
        documentsFailed: 0,
        totalErrors: 0,
        totalWarnings: 0,
        averagePreservationScore: 0,
        averageQualityScore: 0
      }
    };
  }

  // Add source documents to pipeline
  addSourceDocument(file: File, type: 'probability' | 'relations' | 'general'): string {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sourceDoc: SourceDocument = {
      id,
      file,
      type,
      processingStatus: 'pending',
      errors: []
    };
    
    this.pipeline.input.push(sourceDoc);
    this.emit('document_added', { documentId: id, type });
    
    return id;
  }

  // Register content processor
  registerProcessor(processor: ContentProcessor): void {
    this.processors.set(processor.name, processor);
    this.emit('processor_registered', { name: processor.name, version: processor.version });
  }

  // Add processing stage
  addStage(
    id: string,
    name: string,
    processorName: string,
    config: any = {},
    dependencies: string[] = []
  ): void {
    const processor = this.processors.get(processorName);
    if (!processor) {
      throw new Error(`Processor '${processorName}' not found. Register it first.`);
    }

    const stage: ProcessingStage = {
      id,
      name,
      processor,
      config,
      dependencies,
      status: 'pending',
      errors: []
    };

    this.pipeline.stages.push(stage);
    this.emit('stage_added', { stageId: id, name, dependencies });
  }

  // Execute the processing pipeline
  async execute(): Promise<AcademicDocument> {
    try {
      this.pipeline.status.phase = 'processing';
      this.pipeline.status.startTime = new Date();
      this.emit('pipeline_started');

      // Validate pipeline configuration
      this.validatePipeline();

      // Sort stages by dependencies
      const sortedStages = this.topologicalSort();

      // Execute stages in order
      for (let i = 0; i < sortedStages.length; i++) {
        const stage = sortedStages[i];
        
        try {
          await this.executeStage(stage);
          this.pipeline.metrics.stagesCompleted++;
          
          // Update progress
          this.pipeline.status.progress = Math.round(((i + 1) / sortedStages.length) * 100);
          this.emit('progress_updated', { progress: this.pipeline.status.progress });
          
        } catch (error) {
          await this.handleStageError(stage, error as Error);
          
          // Check if we should continue or fail
          if (!this.shouldContinueAfterError(stage, error as Error)) {
            throw error;
          }
        }
      }

      // Generate final output
      const output = await this.generateOutput();
      this.pipeline.output = output;
      
      this.pipeline.status.phase = 'completed';
      this.pipeline.status.endTime = new Date();
      this.pipeline.status.progress = 100;
      
      this.calculateFinalMetrics();
      this.emit('pipeline_completed', { output });
      
      return output;
      
    } catch (error) {
      this.pipeline.status.phase = 'failed';
      this.pipeline.status.endTime = new Date();
      
      const processingError: ProcessingError = {
        id: `error_${Date.now()}`,
        stage: 'pipeline',
        type: 'system',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Unknown pipeline error',
        recoverable: false,
        timestamp: new Date()
      };
      
      this.pipeline.errors.push(processingError);
      this.emit('pipeline_failed', { error: processingError });
      
      throw error;
    }
  }

  // Execute individual stage
  
  // PIPELINE_RESILIENCE_V2
  private async executeStageWithResilience(stage: ProcessingStage): Promise<void> {
    const maxRetries = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Executing stage '${stage.name}' - attempt ${attempt}/${maxRetries}`);
        
        await this.executeStage(stage);
        
        console.log(`✅ Stage '${stage.name}' completed successfully on attempt ${attempt}`);
        return;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Stage '${stage.name}' attempt ${attempt} failed: ${lastError.message}`);
        
        // If this is the last attempt and stage is not critical, continue
        if (attempt === maxRetries) {
          if (stage.optional) {
            console.log(`⏭️ Skipping optional stage '${stage.name}' after ${maxRetries} attempts`);
            stage.status = 'skipped';
            return;
          } else {
            console.error(`❌ Critical stage '${stage.name}' failed after ${maxRetries} attempts`);
            throw lastError;
          }
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private async executeStage(stage: ProcessingStage): Promise<void> {
    stage.status = 'running';
    stage.startTime = new Date();
    this.emit('stage_started', { stageId: stage.id, name: stage.name });

    try {
      // Prepare input for stage
      const input = await this.prepareStageInput(stage);
      
      // Validate input if processor supports it
      if (stage.processor.validate) {
        const validation = stage.processor.validate(input, stage.config);
        if (!validation.passed) {
          throw new Error(`Stage validation failed: ${validation.details}`);
        }
      }

      // Execute processor
      const result = await Promise.race([
        stage.processor.process(input, stage.config),
        this.createTimeoutPromise(stage.id)
      ]);

      // Handle result
      if (result.success) {
        stage.output = result.data;
        stage.status = 'completed';
        
        // Update pipeline metrics
        this.updateMetricsFromResult(result);
        
      } else {
        throw new Error(`Stage processing failed: ${result.errors.map(e => e.message).join(', ')}`);
      }

      stage.endTime = new Date();
      this.emit('stage_completed', { 
        stageId: stage.id, 
        name: stage.name, 
        metrics: result.metrics 
      });

    } catch (error) {
      stage.status = 'failed';
      stage.endTime = new Date();
      
      const processingError: ProcessingError = {
        id: `error_${Date.now()}`,
        stage: stage.id,
        type: 'system',
        severity: 'high',
        message: error instanceof Error ? error.message : 'Unknown stage error',
        recoverable: true,
        timestamp: new Date()
      };
      
      stage.errors.push(processingError);
      this.pipeline.errors.push(processingError);
      
      // Attempt recovery if enabled and processor supports it
      if (this.pipeline.config.enableRecovery && stage.processor.recover) {
        try {
          const input = await this.prepareStageInput(stage);
          const recoveryResult = await stage.processor.recover(processingError, input, stage.config);
          
          if (recoveryResult.success) {
            stage.output = recoveryResult.data;
            stage.status = 'completed';
            this.emit('stage_recovered', { stageId: stage.id, name: stage.name });
            return;
          }
        } catch (recoveryError) {
          // Recovery failed, continue with original error
        }
      }
      
      this.emit('stage_failed', { 
        stageId: stage.id, 
        name: stage.name, 
        error: processingError 
      });
      
      throw error;
    }
  }

  // Prepare input for a stage based on its dependencies
  private async prepareStageInput(stage: ProcessingStage): Promise<any> {
    if (stage.dependencies.length === 0) {
      // First stage - use source documents
      return this.pipeline.input;
    }

    // Collect outputs from dependency stages
    const dependencyOutputs: any[] = [];
    
    for (const depId of stage.dependencies) {
      const depStage = this.pipeline.stages.find(s => s.id === depId);
      if (!depStage) {
        throw new Error(`Dependency stage '${depId}' not found`);
      }
      
      // Check if dependency stage completed successfully
      if (depStage.status !== 'completed') {
        // If dependency failed but has output, use it with warning
        if (depStage.status === 'failed' && depStage.output) {
          console.warn(`Using output from failed dependency stage '${depId}'`);
          dependencyOutputs.push(depStage.output);
        } else {
          throw new Error(`Dependency stage '${depId}' not completed (status: ${depStage.status})`);
        }
      } else {
        dependencyOutputs.push(depStage.output);
      }
    }

    return dependencyOutputs.length === 1 ? dependencyOutputs[0] : dependencyOutputs;
  }

  // Topological sort for stage dependencies
  private topologicalSort(): ProcessingStage[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: ProcessingStage[] = [];

    const visit = (stageId: string) => {
      if (visiting.has(stageId)) {
        throw new Error(`Circular dependency detected involving stage '${stageId}'`);
      }
      
      if (visited.has(stageId)) {
        return;
      }

      const stage = this.pipeline.stages.find(s => s.id === stageId);
      if (!stage) {
        throw new Error(`Stage '${stageId}' not found`);
      }

      visiting.add(stageId);
      
      for (const depId of stage.dependencies) {
        visit(depId);
      }
      
      visiting.delete(stageId);
      visited.add(stageId);
      result.push(stage);
    };

    for (const stage of this.pipeline.stages) {
      if (!visited.has(stage.id)) {
        visit(stage.id);
      }
    }

    return result;
  }

  // Validate pipeline configuration
  private validatePipeline(): void {
    if (this.pipeline.input.length === 0) {
      throw new Error('No source documents provided');
    }

    if (this.pipeline.stages.length === 0) {
      throw new Error('No processing stages defined');
    }

    // Validate all dependencies exist
    const stageIds = new Set(this.pipeline.stages.map(s => s.id));
    for (const stage of this.pipeline.stages) {
      for (const depId of stage.dependencies) {
        if (!stageIds.has(depId)) {
          throw new Error(`Stage '${stage.id}' depends on non-existent stage '${depId}'`);
        }
      }
    }
  }

  // Create timeout promise for stage execution
  private createTimeoutPromise(stageId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Stage '${stageId}' timed out after ${this.pipeline.config.timeoutMs}ms`));
      }, this.pipeline.config.timeoutMs);
    });
  }

  // Handle stage execution error
  private async handleStageError(stage: ProcessingStage, error: Error): Promise<void> {
    this.pipeline.metrics.stagesFailed++;
    this.pipeline.metrics.totalErrors++;

    // Emit error event
    this.emit('stage_error', { 
      stageId: stage.id, 
      name: stage.name, 
      error: error.message 
    });
  }

  // Determine if pipeline should continue after error
  private shouldContinueAfterError(stage: ProcessingStage, error: Error): boolean {
    // Always continue if recovery is enabled and we have some output
    if (this.pipeline.config.enableRecovery && stage.output) {
      return true;
    }

    // Check failure threshold
    if (this.pipeline.metrics.stagesFailed >= this.pipeline.config.failureThreshold) {
      return false;
    }

    // Check if error is recoverable
    const lastError = stage.errors[stage.errors.length - 1];
    if (lastError && !lastError.recoverable) {
      return false;
    }

    // Continue for non-critical stages
    const criticalStages = ['file-processing'];
    if (!criticalStages.includes(stage.id)) {
      return true;
    }

    return true;
  }

  // Generate final output document
  private async generateOutput(): Promise<AcademicDocument> {
    // Find the final stage output
    const finalStage = this.pipeline.stages[this.pipeline.stages.length - 1];
    
    // Try to get output from the final stage
    if (finalStage && finalStage.output) {
      if (this.isAcademicDocument(finalStage.output)) {
        return finalStage.output;
      }
      return this.constructAcademicDocument(finalStage.output);
    }

    // If final stage failed, try to get output from any completed stage
    for (let i = this.pipeline.stages.length - 1; i >= 0; i--) {
      const stage = this.pipeline.stages[i];
      if (stage.status === 'completed' && stage.output) {
        if (this.isAcademicDocument(stage.output)) {
          return stage.output;
        }
        return this.constructAcademicDocument(stage.output);
      }
    }

    // If no stages completed successfully, create a minimal document from source files
    return this.createFallbackDocument();
  }

  // Type guard for AcademicDocument
  private isAcademicDocument(obj: any): obj is AcademicDocument {
    return obj && 
           typeof obj.title === 'string' &&
           Array.isArray(obj.parts) &&
           Array.isArray(obj.crossReferences) &&
           obj.metadata;
  }

  // Construct AcademicDocument from pipeline output
  private constructAcademicDocument(output: any): AcademicDocument {
    // Ensure we have valid parts array
    const parts = Array.isArray(output.parts) ? output.parts : 
                  Array.isArray(output) ? output : [];
    
    // Calculate totals from parts if not provided
    const totalSections = output.totalSections || 
      parts.reduce((sum: number, part: any) => sum + (part.sections?.length || 0), 0);
    
    const totalFormulas = output.totalFormulas || 
      parts.reduce((sum: number, part: any) => 
        sum + (part.sections?.reduce((sSum: number, section: any) => 
          sSum + (section.formulas?.length || 0), 0) || 0), 0);
    
    const totalExamples = output.totalExamples || 
      parts.reduce((sum: number, part: any) => 
        sum + (part.sections?.reduce((sSum: number, section: any) => 
          sSum + (section.examples?.length || 0), 0) || 0), 0);

    return {
      title: output.title || 'Compact Study Guide',
      tableOfContents: output.tableOfContents || [],
      parts,
      crossReferences: output.crossReferences || [],
      appendices: output.appendices || [],
      metadata: {
        generatedAt: new Date(),
        sourceFiles: this.pipeline.input.map(doc => doc.file.name),
        totalSections,
        totalFormulas,
        totalExamples,
        preservationScore: this.pipeline.metrics.averagePreservationScore || 0.8
      }
    };
  }

  // Create fallback document when all stages fail
  private createFallbackDocument(): AcademicDocument {
    const parts: DocumentPart[] = [];
    let partNumber = 1;

    for (const doc of this.pipeline.input) {
      const partTitle = doc.type === 'probability' 
        ? 'Part I: Discrete Probability'
        : doc.type === 'relations'
        ? 'Part II: Relations'
        : `Part ${partNumber}: ${doc.file.name.replace('.pdf', '')}`;

      const sections: AcademicSection[] = [{
        sectionNumber: `${partNumber}.1`,
        title: 'Content Overview',
        content: `Content from ${doc.file.name} (${doc.file.size} bytes)`,
        formulas: [],
        examples: [],
        subsections: []
      }];

      parts.push({
        partNumber,
        title: partTitle,
        sections
      });

      partNumber++;
    }

    return {
      title: 'Compact Study Guide',
      tableOfContents: parts.map((part, index) => ({
        id: `part${index + 1}`,
        title: part.title,
        level: 1,
        pageNumber: index + 1
      })),
      parts,
      crossReferences: [],
      appendices: [],
      metadata: {
        generatedAt: new Date(),
        sourceFiles: this.pipeline.input.map(doc => doc.file.name),
        totalSections: parts.reduce((sum, part) => sum + part.sections.length, 0),
        totalFormulas: 0,
        totalExamples: 0,
        preservationScore: 0.5
      }
    };
  }

  // Update pipeline metrics from stage result
  private updateMetricsFromResult(result: ProcessingResult): void {
    this.pipeline.metrics.totalErrors += result.errors.length;
    this.pipeline.metrics.totalWarnings += result.warnings.length;
    
    // Update quality and preservation scores (running average)
    const currentCount = this.pipeline.metrics.stagesCompleted;
    this.pipeline.metrics.averageQualityScore = 
      (this.pipeline.metrics.averageQualityScore * currentCount + result.metrics.qualityScore) / (currentCount + 1);
    
    this.pipeline.metrics.averagePreservationScore = 
      (this.pipeline.metrics.averagePreservationScore * currentCount + result.metrics.contentPreserved) / (currentCount + 1);
  }

  // Calculate final pipeline metrics
  private calculateFinalMetrics(): void {
    const endTime = this.pipeline.status.endTime || new Date();
    this.pipeline.metrics.totalProcessingTime = endTime.getTime() - this.pipeline.status.startTime.getTime();
    
    this.pipeline.metrics.documentsProcessed = this.pipeline.input.filter(
      doc => doc.processingStatus === 'completed'
    ).length;
    
    this.pipeline.metrics.documentsFailed = this.pipeline.input.filter(
      doc => doc.processingStatus === 'failed'
    ).length;
  }

  // Event system
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  // Get pipeline status
  getStatus(): PipelineStatus {
    return { ...this.pipeline.status };
  }

  // Get pipeline metrics
  getMetrics(): PipelineMetrics {
    return { ...this.pipeline.metrics };
  }

  // Get pipeline errors
  getErrors(): ProcessingError[] {
    return [...this.pipeline.errors];
  }

  // Cancel pipeline execution
  cancel(): void {
    this.pipeline.status.phase = 'cancelled';
    this.pipeline.status.endTime = new Date();
    this.emit('pipeline_cancelled');
  }
}

// Default pipeline configuration
export const DEFAULT_PIPELINE_CONFIG: ProcessingPipelineConfig = {
  maxConcurrentStages: 3,
  enableRecovery: true,
  failureThreshold: 3,
  timeoutMs: 300000, // 5 minutes
  preservationThreshold: 0.8,
  outputFormats: ['html', 'pdf'],
  layoutConfig: {
    paperSize: 'a4',
    columns: 2,
    typography: {
      fontSize: 10,
      lineHeight: 1.2,
      fontFamily: {
        body: 'Times New Roman, serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, serif',
        code: 'Courier New, monospace'
      }
    },
    spacing: {
      paragraphSpacing: 0.3,
      listSpacing: 0.2,
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
  }
};

// Factory function to create processing pipeline
export function createProcessingPipeline(
  config: Partial<ProcessingPipelineConfig> = {}
): ContentProcessingPipeline {
  const fullConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  return new ContentProcessingPipeline(fullConfig);
}

// Export types and classes
export type {
  ProcessingPipeline,
  SourceDocument,
  ProcessingStage,
  ContentProcessor,
  ProcessingResult,
  ProcessingError,
  ProcessingWarning,
  ProcessingMetrics,
  ProcessingPipelineConfig,
  PipelineStatus,
  PipelineMetrics
};