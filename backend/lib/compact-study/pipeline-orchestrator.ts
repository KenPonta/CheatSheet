// Pipeline orchestrator for compact study generation

import { 
  ContentProcessingPipeline,
  ProcessingPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  createProcessingPipeline
} from './processing-pipeline';
import {
  createFileProcessor,
  createMathContentProcessor,
  createAcademicStructureProcessor,
  createCrossReferenceProcessor
} from './content-processors';
import { AcademicDocument, CompactLayoutConfig } from './types';

// Pipeline orchestrator configuration
export interface PipelineOrchestratorConfig {
  processingConfig?: Partial<ProcessingPipelineConfig>;
  fileProcessingConfig?: any;
  mathExtractionConfig?: any;
  structureConfig?: any;
  crossReferenceConfig?: any;
  enableProgressTracking?: boolean;
  enableErrorRecovery?: boolean;
}

// Standard pipeline stages
export const STANDARD_PIPELINE_STAGES = {
  FILE_PROCESSING: 'file-processing',
  MATH_EXTRACTION: 'math-extraction', 
  STRUCTURE_ORGANIZATION: 'structure-organization',
  CROSS_REFERENCE_GENERATION: 'cross-reference-generation'
} as const;

// Pipeline orchestrator class
export class PipelineOrchestrator {
  private pipeline: ContentProcessingPipeline;
  private config: PipelineOrchestratorConfig;

  constructor(config: PipelineOrchestratorConfig = {}) {
    this.config = {
      enableProgressTracking: true,
      enableErrorRecovery: true,
      ...config
    };

    // Create processing pipeline with merged config
    const pipelineConfig: ProcessingPipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      ...config.processingConfig
    };

    this.pipeline = createProcessingPipeline(pipelineConfig);
    this.setupPipeline();
  }

  // Setup standard processing pipeline
  private setupPipeline(): void {
    // Register processors
    this.pipeline.registerProcessor(createFileProcessor());
    this.pipeline.registerProcessor(createMathContentProcessor());
    this.pipeline.registerProcessor(createAcademicStructureProcessor());
    this.pipeline.registerProcessor(createCrossReferenceProcessor());

    // Add processing stages in dependency order
    this.pipeline.addStage(
      STANDARD_PIPELINE_STAGES.FILE_PROCESSING,
      'File Processing',
      'file-processor',
      this.config.fileProcessingConfig || {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        enableDefinitionExtraction: true,
        enableTheoremExtraction: true,
        preservationThreshold: 0.8,
        confidenceThreshold: 0.6,
        fallbackToOCR: true,
        validateExtraction: true
      },
      [] // No dependencies - first stage
    );

    this.pipeline.addStage(
      STANDARD_PIPELINE_STAGES.MATH_EXTRACTION,
      'Mathematical Content Extraction',
      'math-content-processor',
      this.config.mathExtractionConfig || {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true
      },
      [STANDARD_PIPELINE_STAGES.FILE_PROCESSING]
    );

    this.pipeline.addStage(
      STANDARD_PIPELINE_STAGES.STRUCTURE_ORGANIZATION,
      'Academic Structure Organization',
      'academic-structure-processor',
      this.config.structureConfig || {
        title: 'Compact Study Guide',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          probability: 'Discrete Probability',
          relations: 'Relations'
        }
      },
      [STANDARD_PIPELINE_STAGES.MATH_EXTRACTION]
    );

    this.pipeline.addStage(
      STANDARD_PIPELINE_STAGES.CROSS_REFERENCE_GENERATION,
      'Cross-Reference Generation',
      'cross-reference-processor',
      this.config.crossReferenceConfig || {
        enableCrossReferences: true,
        referenceFormats: {
          example: 'Ex. {number}',
          formula: 'Eq. {number}',
          section: 'Section {number}',
          theorem: 'Thm. {number}',
          definition: 'Def. {number}'
        }
      },
      [STANDARD_PIPELINE_STAGES.STRUCTURE_ORGANIZATION]
    );

    // Setup event listeners if progress tracking is enabled
    if (this.config.enableProgressTracking) {
      this.setupProgressTracking();
    }
  }

  // Setup progress tracking event listeners
  private setupProgressTracking(): void {
    this.pipeline.on('pipeline_started', () => {
      console.log('📚 Starting compact study generation pipeline...');
    });

    this.pipeline.on('stage_started', (data: any) => {
      console.log(`🔄 Starting stage: ${data.name}`);
    });

    this.pipeline.on('stage_completed', (data: any) => {
      console.log(`✅ Completed stage: ${data.name} (${data.metrics.processingTime}ms)`);
    });

    this.pipeline.on('stage_failed', (data: any) => {
      console.error(`❌ Failed stage: ${data.name} - ${data.error.message}`);
    });

    this.pipeline.on('stage_recovered', (data: any) => {
      console.log(`🔧 Recovered stage: ${data.name}`);
    });

    this.pipeline.on('progress_updated', (data: any) => {
      console.log(`📊 Progress: ${data.progress}%`);
    });

    this.pipeline.on('pipeline_completed', () => {
      console.log('🎉 Pipeline completed successfully!');
    });

    this.pipeline.on('pipeline_failed', (data: any) => {
      console.error(`💥 Pipeline failed: ${data.error.message}`);
    });
  }

  // Add source document to pipeline
  addDocument(file: File, type: 'probability' | 'relations' | 'general' = 'general'): string {
    return this.pipeline.addSourceDocument(file, type);
  }

  // Add multiple documents
  addDocuments(files: { file: File; type: 'probability' | 'relations' | 'general' }[]): string[] {
    return files.map(({ file, type }) => this.addDocument(file, type));
  }

  // Execute the pipeline
  async execute(): Promise<AcademicDocument> {
    try {
      const result = await this.pipeline.execute();
      return result;
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      throw error;
    }
  }

  // Get pipeline status
  getStatus() {
    return this.pipeline.getStatus();
  }

  // Get pipeline metrics
  getMetrics() {
    return this.pipeline.getMetrics();
  }

  // Get pipeline errors
  getErrors() {
    return this.pipeline.getErrors();
  }

  // Cancel pipeline execution
  cancel(): void {
    this.pipeline.cancel();
  }

  // Add custom event listener
  on(event: string, listener: Function): void {
    this.pipeline.on(event, listener);
  }
}

// Specialized orchestrators for different content types

// Probability content pipeline orchestrator
export class ProbabilityPipelineOrchestrator extends PipelineOrchestrator {
  constructor(config: PipelineOrchestratorConfig = {}) {
    const probabilityConfig: PipelineOrchestratorConfig = {
      ...config,
      structureConfig: {
        title: 'Discrete Probability Study Guide',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          probability: 'Discrete Probability'
        },
        sections: [
          'Probability Basics',
          'Complements and Unions', 
          'Conditional Probability',
          'Bayes\' Theorem',
          'Independence',
          'Bernoulli Trials',
          'Random Variables',
          'Expected Value & Variance'
        ],
        ...config.structureConfig
      },
      mathExtractionConfig: {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true,
        probabilityPatterns: [
          /P\([^)]+\)/g,
          /E\[[^\]]+\]/g,
          /Var\([^)]+\)/g,
          /\bBayes\b/gi
        ],
        ...config.mathExtractionConfig
      }
    };

    super(probabilityConfig);
  }
}

// Relations content pipeline orchestrator  
export class RelationsPipelineOrchestrator extends PipelineOrchestrator {
  constructor(config: PipelineOrchestratorConfig = {}) {
    const relationsConfig: PipelineOrchestratorConfig = {
      ...config,
      structureConfig: {
        title: 'Relations Study Guide',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          relations: 'Relations'
        },
        sections: [
          'Definitions',
          'Properties (Reflexive, Symmetric, Transitive)',
          'Combining Relations',
          'N-ary Relations',
          'SQL-style Operations'
        ],
        ...config.structureConfig
      },
      mathExtractionConfig: {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true,
        relationsPatterns: [
          /\bR\s*⊆\s*[A-Z]\s*×\s*[A-Z]/g,
          /\b(reflexive|symmetric|transitive|antisymmetric)\b/gi,
          /\b(SELECT|FROM|WHERE|JOIN)\b/gi
        ],
        ...config.mathExtractionConfig
      }
    };

    super(relationsConfig);
  }
}

// Combined probability and relations pipeline orchestrator
export class CompactStudyPipelineOrchestrator extends PipelineOrchestrator {
  constructor(config: PipelineOrchestratorConfig = {}) {
    const combinedConfig: PipelineOrchestratorConfig = {
      ...config,
      structureConfig: {
        title: 'Compact Study Guide: Discrete Probability & Relations',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          probability: 'Part I: Discrete Probability',
          relations: 'Part II: Relations'
        },
        sections: {
          probability: [
            'Probability Basics',
            'Complements and Unions',
            'Conditional Probability', 
            'Bayes\' Theorem',
            'Independence',
            'Bernoulli Trials',
            'Random Variables',
            'Expected Value & Variance'
          ],
          relations: [
            'Definitions',
            'Properties (Reflexive, Symmetric, Transitive)',
            'Combining Relations',
            'N-ary Relations', 
            'SQL-style Operations'
          ]
        },
        ...config.structureConfig
      }
    };

    super(combinedConfig);
  }
}

// Factory functions
export function createPipelineOrchestrator(
  config: PipelineOrchestratorConfig = {}
): PipelineOrchestrator {
  return new PipelineOrchestrator(config);
}

export function createProbabilityPipeline(
  config: PipelineOrchestratorConfig = {}
): ProbabilityPipelineOrchestrator {
  return new ProbabilityPipelineOrchestrator(config);
}

export function createRelationsPipeline(
  config: PipelineOrchestratorConfig = {}
): RelationsPipelineOrchestrator {
  return new RelationsPipelineOrchestrator(config);
}

export function createCompactStudyPipeline(
  config: PipelineOrchestratorConfig = {}
): CompactStudyPipelineOrchestrator {
  return new CompactStudyPipelineOrchestrator(config);
}

// Convenience function for quick pipeline execution
export async function processCompactStudyDocuments(
  files: { file: File; type: 'probability' | 'relations' | 'general' }[],
  config: PipelineOrchestratorConfig = {}
): Promise<AcademicDocument> {
  const orchestrator = createCompactStudyPipeline(config);
  
  // Add all documents
  orchestrator.addDocuments(files);
  
  // Execute pipeline
  return await orchestrator.execute();
}

// Export types
export type {
  PipelineOrchestratorConfig
};