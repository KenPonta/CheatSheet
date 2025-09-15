// Tests for content processing pipeline

import { 
  ContentProcessingPipeline,
  createProcessingPipeline,
  DEFAULT_PIPELINE_CONFIG,
  ProcessingPipelineConfig,
  ContentProcessor,
  ProcessingResult,
  ProcessingError,
  SourceDocument
} from '../processing-pipeline';
import { 
  createFileProcessor,
  createMathContentProcessor,
  createAcademicStructureProcessor,
  createCrossReferenceProcessor
} from '../content-processors';
import {
  PipelineOrchestrator,
  createProbabilityPipeline,
  createRelationsPipeline,
  createCompactStudyPipeline,
  processCompactStudyDocuments,
  STANDARD_PIPELINE_STAGES
} from '../pipeline-orchestrator';

// Mock processors for testing
class MockSuccessProcessor implements ContentProcessor {
  name = 'mock-success';
  version = '1.0.0';

  async process(input: any, config: any): Promise<ProcessingResult> {
    return {
      success: true,
      data: { processed: true, input },
      errors: [],
      warnings: [],
      metrics: {
        processingTime: 100,
        contentPreserved: 1.0,
        qualityScore: 0.9,
        itemsProcessed: 1
      }
    };
  }
}

class MockFailureProcessor implements ContentProcessor {
  name = 'mock-failure';
  version = '1.0.0';

  async process(input: any, config: any): Promise<ProcessingResult> {
    const error: ProcessingError = {
      id: 'test_error',
      stage: this.name,
      type: 'system',
      severity: 'high',
      message: 'Mock processing failure',
      recoverable: true,
      timestamp: new Date()
    };

    return {
      success: false,
      errors: [error],
      warnings: [],
      metrics: {
        processingTime: 50,
        contentPreserved: 0,
        qualityScore: 0,
        itemsProcessed: 0
      }
    };
  }

  async recover(error: ProcessingError, input: any, config: any): Promise<ProcessingResult> {
    return {
      success: true,
      data: { recovered: true, input },
      errors: [],
      warnings: [],
      metrics: {
        processingTime: 75,
        contentPreserved: 0.8,
        qualityScore: 0.7,
        itemsProcessed: 1
      }
    };
  }
}

// Mock File class for testing
class MockFile implements File {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string = '';

  constructor(name: string, content: string = '', type: string = 'application/pdf') {
    this.name = name;
    this.size = content.length;
    this.type = type;
    this.lastModified = Date.now();
  }

  slice(): Blob { return new Blob(); }
  stream(): ReadableStream<Uint8Array> { throw new Error('Not implemented'); }
  text(): Promise<string> { return Promise.resolve(''); }
  arrayBuffer(): Promise<ArrayBuffer> { return Promise.resolve(new ArrayBuffer(0)); }
}

describe('ContentProcessingPipeline', () => {
  let pipeline: ContentProcessingPipeline;
  let config: ProcessingPipelineConfig;

  beforeEach(() => {
    config = {
      ...DEFAULT_PIPELINE_CONFIG,
      timeoutMs: 5000,
      failureThreshold: 2
    };
    pipeline = createProcessingPipeline(config);
  });

  describe('Pipeline Creation', () => {
    test('should create pipeline with default config', () => {
      const defaultPipeline = createProcessingPipeline();
      expect(defaultPipeline).toBeInstanceOf(ContentProcessingPipeline);
      expect(defaultPipeline.getStatus().phase).toBe('initializing');
    });

    test('should create pipeline with custom config', () => {
      const customConfig = { ...DEFAULT_PIPELINE_CONFIG, timeoutMs: 10000 };
      const customPipeline = createProcessingPipeline(customConfig);
      expect(customPipeline).toBeInstanceOf(ContentProcessingPipeline);
    });
  });

  describe('Document Management', () => {
    test('should add source document', () => {
      const file = new MockFile('test.pdf');
      const docId = pipeline.addSourceDocument(file, 'probability');
      
      expect(docId).toBeDefined();
      expect(docId).toMatch(/^doc_\d+_[a-z0-9]+$/);
    });

    test('should add multiple documents', () => {
      const file1 = new MockFile('prob.pdf');
      const file2 = new MockFile('relations.pdf');
      
      const id1 = pipeline.addSourceDocument(file1, 'probability');
      const id2 = pipeline.addSourceDocument(file2, 'relations');
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Processor Registration', () => {
    test('should register processor', () => {
      const processor = new MockSuccessProcessor();
      
      expect(() => {
        pipeline.registerProcessor(processor);
      }).not.toThrow();
    });

    test('should add stage with registered processor', () => {
      const processor = new MockSuccessProcessor();
      pipeline.registerProcessor(processor);
      
      expect(() => {
        pipeline.addStage('test-stage', 'Test Stage', 'mock-success');
      }).not.toThrow();
    });

    test('should throw error for unregistered processor', () => {
      expect(() => {
        pipeline.addStage('test-stage', 'Test Stage', 'non-existent');
      }).toThrow('Processor \'non-existent\' not found');
    });
  });

  describe('Pipeline Execution', () => {
    test('should execute simple pipeline successfully', async () => {
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      const processor = new MockSuccessProcessor();
      pipeline.registerProcessor(processor);
      pipeline.addStage('stage1', 'Stage 1', 'mock-success');
      
      const result = await pipeline.execute();
      
      expect(result).toBeDefined();
      expect(pipeline.getStatus().phase).toBe('completed');
      expect(pipeline.getMetrics().stagesCompleted).toBe(1);
    });

    test('should handle stage dependencies', async () => {
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      const processor = new MockSuccessProcessor();
      pipeline.registerProcessor(processor);
      
      pipeline.addStage('stage1', 'Stage 1', 'mock-success');
      pipeline.addStage('stage2', 'Stage 2', 'mock-success', {}, ['stage1']);
      
      const result = await pipeline.execute();
      
      expect(result).toBeDefined();
      expect(pipeline.getStatus().phase).toBe('completed');
      expect(pipeline.getMetrics().stagesCompleted).toBe(2);
    });

    test('should detect circular dependencies', async () => {
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      const processor = new MockSuccessProcessor();
      pipeline.registerProcessor(processor);
      
      pipeline.addStage('stage1', 'Stage 1', 'mock-success', {}, ['stage2']);
      pipeline.addStage('stage2', 'Stage 2', 'mock-success', {}, ['stage1']);
      
      await expect(pipeline.execute()).rejects.toThrow('Circular dependency detected');
    });

    test('should handle processor failures with recovery', async () => {
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      const failureProcessor = new MockFailureProcessor();
      pipeline.registerProcessor(failureProcessor);
      pipeline.addStage('failing-stage', 'Failing Stage', 'mock-failure');
      
      const result = await pipeline.execute();
      
      expect(result).toBeDefined();
      expect(pipeline.getStatus().phase).toBe('completed');
      expect(pipeline.getErrors().length).toBeGreaterThan(0);
    });

    test('should fail pipeline when failure threshold exceeded', async () => {
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      // Create processor that always fails without recovery
      class AlwaysFailProcessor implements ContentProcessor {
        name = 'always-fail';
        version = '1.0.0';
        
        async process(): Promise<ProcessingResult> {
          throw new Error('Always fails');
        }
      }
      
      const failProcessor = new AlwaysFailProcessor();
      pipeline.registerProcessor(failProcessor);
      
      // Add more stages than failure threshold
      pipeline.addStage('fail1', 'Fail 1', 'always-fail');
      pipeline.addStage('fail2', 'Fail 2', 'always-fail');
      pipeline.addStage('fail3', 'Fail 3', 'always-fail');
      
      await expect(pipeline.execute()).rejects.toThrow();
      expect(pipeline.getStatus().phase).toBe('failed');
    });
  });

  describe('Event System', () => {
    test('should emit events during execution', async () => {
      const events: string[] = [];
      
      pipeline.on('pipeline_started', () => events.push('started'));
      pipeline.on('stage_started', () => events.push('stage_started'));
      pipeline.on('stage_completed', () => events.push('stage_completed'));
      pipeline.on('pipeline_completed', () => events.push('completed'));
      
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      const processor = new MockSuccessProcessor();
      pipeline.registerProcessor(processor);
      pipeline.addStage('stage1', 'Stage 1', 'mock-success');
      
      await pipeline.execute();
      
      expect(events).toContain('started');
      expect(events).toContain('stage_started');
      expect(events).toContain('stage_completed');
      expect(events).toContain('completed');
    });
  });

  describe('Pipeline Validation', () => {
    test('should validate pipeline before execution', async () => {
      // No documents or stages
      await expect(pipeline.execute()).rejects.toThrow('No source documents provided');
      
      // Add document but no stages
      const file = new MockFile('test.pdf');
      pipeline.addSourceDocument(file, 'general');
      
      await expect(pipeline.execute()).rejects.toThrow('No processing stages defined');
    });
  });
});

describe('Content Processors', () => {
  describe('FileProcessingProcessor', () => {
    test('should create file processor', () => {
      const processor = createFileProcessor();
      expect(processor.name).toBe('file-processor');
      expect(processor.version).toBe('1.0.0');
    });

    test('should validate input documents', () => {
      const processor = createFileProcessor();
      const file = new MockFile('test.pdf');
      const docs: SourceDocument[] = [{
        id: 'test',
        file,
        type: 'general',
        processingStatus: 'pending',
        errors: []
      }];
      
      const result = processor.validate(docs, {});
      expect(result.passed).toBe(true);
    });

    test('should reject invalid input', () => {
      const processor = createFileProcessor();
      
      const result = processor.validate([], {});
      expect(result.passed).toBe(false);
      expect(result.details).toContain('No source documents provided');
    });
  });

  describe('MathContentProcessor', () => {
    test('should create math content processor', () => {
      const processor = createMathContentProcessor();
      expect(processor.name).toBe('math-content-processor');
      expect(processor.version).toBe('1.0.0');
    });
  });

  describe('AcademicStructureProcessor', () => {
    test('should create academic structure processor', () => {
      const processor = createAcademicStructureProcessor();
      expect(processor.name).toBe('academic-structure-processor');
      expect(processor.version).toBe('1.0.0');
    });
  });

  describe('CrossReferenceProcessor', () => {
    test('should create cross reference processor', () => {
      const processor = createCrossReferenceProcessor();
      expect(processor.name).toBe('cross-reference-processor');
      expect(processor.version).toBe('1.0.0');
    });
  });
});

describe('Pipeline Orchestrator', () => {
  describe('Basic Orchestrator', () => {
    test('should create pipeline orchestrator', () => {
      const orchestrator = new PipelineOrchestrator();
      expect(orchestrator).toBeInstanceOf(PipelineOrchestrator);
      expect(orchestrator.getStatus().phase).toBe('initializing');
    });

    test('should add documents to orchestrator', () => {
      const orchestrator = new PipelineOrchestrator();
      const file = new MockFile('test.pdf');
      
      const docId = orchestrator.addDocument(file, 'probability');
      expect(docId).toBeDefined();
    });

    test('should add multiple documents', () => {
      const orchestrator = new PipelineOrchestrator();
      const files = [
        { file: new MockFile('prob.pdf'), type: 'probability' as const },
        { file: new MockFile('rel.pdf'), type: 'relations' as const }
      ];
      
      const docIds = orchestrator.addDocuments(files);
      expect(docIds).toHaveLength(2);
      expect(docIds[0]).not.toBe(docIds[1]);
    });
  });

  describe('Specialized Orchestrators', () => {
    test('should create probability pipeline', () => {
      const pipeline = createProbabilityPipeline();
      expect(pipeline).toBeInstanceOf(PipelineOrchestrator);
    });

    test('should create relations pipeline', () => {
      const pipeline = createRelationsPipeline();
      expect(pipeline).toBeInstanceOf(PipelineOrchestrator);
    });

    test('should create compact study pipeline', () => {
      const pipeline = createCompactStudyPipeline();
      expect(pipeline).toBeInstanceOf(PipelineOrchestrator);
    });
  });

  describe('Pipeline Stages', () => {
    test('should have standard pipeline stages defined', () => {
      expect(STANDARD_PIPELINE_STAGES.FILE_PROCESSING).toBe('file-processing');
      expect(STANDARD_PIPELINE_STAGES.MATH_EXTRACTION).toBe('math-extraction');
      expect(STANDARD_PIPELINE_STAGES.STRUCTURE_ORGANIZATION).toBe('structure-organization');
      expect(STANDARD_PIPELINE_STAGES.CROSS_REFERENCE_GENERATION).toBe('cross-reference-generation');
    });
  });
});

describe('Integration Tests', () => {
  test('should process documents end-to-end (mocked)', async () => {
    // This test would require mocking the actual file processing components
    // For now, we'll test the pipeline structure
    
    const files = [
      { file: new MockFile('probability.pdf'), type: 'probability' as const },
      { file: new MockFile('relations.pdf'), type: 'relations' as const }
    ];
    
    // This would fail in real execution due to missing implementations
    // but tests the pipeline structure
    expect(() => {
      const orchestrator = createCompactStudyPipeline();
      orchestrator.addDocuments(files);
    }).not.toThrow();
  });
});

describe('Error Handling', () => {
  test('should handle processing errors gracefully', async () => {
    const pipeline = createProcessingPipeline({
      ...DEFAULT_PIPELINE_CONFIG,
      enableRecovery: true,
      failureThreshold: 1
    });
    
    const file = new MockFile('test.pdf');
    pipeline.addSourceDocument(file, 'general');
    
    const failureProcessor = new MockFailureProcessor();
    pipeline.registerProcessor(failureProcessor);
    pipeline.addStage('failing-stage', 'Failing Stage', 'mock-failure');
    
    // Should recover and complete
    const result = await pipeline.execute();
    expect(result).toBeDefined();
    expect(pipeline.getStatus().phase).toBe('completed');
  });

  test('should track error metrics', async () => {
    const pipeline = createProcessingPipeline();
    const file = new MockFile('test.pdf');
    pipeline.addSourceDocument(file, 'general');
    
    const failureProcessor = new MockFailureProcessor();
    pipeline.registerProcessor(failureProcessor);
    pipeline.addStage('failing-stage', 'Failing Stage', 'mock-failure');
    
    await pipeline.execute();
    
    const errors = pipeline.getErrors();
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('Performance and Metrics', () => {
  test('should track processing metrics', async () => {
    const pipeline = createProcessingPipeline();
    const file = new MockFile('test.pdf');
    pipeline.addSourceDocument(file, 'general');
    
    const processor = new MockSuccessProcessor();
    pipeline.registerProcessor(processor);
    pipeline.addStage('stage1', 'Stage 1', 'mock-success');
    
    await pipeline.execute();
    
    const metrics = pipeline.getMetrics();
    expect(metrics.totalProcessingTime).toBeGreaterThanOrEqual(0);
    expect(metrics.stagesCompleted).toBe(1);
    expect(metrics.documentsProcessed).toBeGreaterThanOrEqual(0);
    expect(metrics.averageQualityScore).toBeGreaterThan(0);
  });

  test('should calculate preservation scores', async () => {
    const pipeline = createProcessingPipeline();
    const file = new MockFile('test.pdf');
    pipeline.addSourceDocument(file, 'general');
    
    const processor = new MockSuccessProcessor();
    pipeline.registerProcessor(processor);
    pipeline.addStage('stage1', 'Stage 1', 'mock-success');
    
    await pipeline.execute();
    
    const metrics = pipeline.getMetrics();
    expect(metrics.averagePreservationScore).toBeGreaterThanOrEqual(0);
    expect(metrics.averagePreservationScore).toBeLessThanOrEqual(1);
  });
});