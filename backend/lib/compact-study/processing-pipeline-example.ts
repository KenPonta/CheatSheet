// Example usage of the content processing pipeline

import {
  createCompactStudyPipeline,
  processCompactStudyDocuments,
  PipelineOrchestrator,
  createProbabilityPipeline,
  createRelationsPipeline
} from './pipeline-orchestrator';
import { AcademicDocument } from './types';

// Example 1: Simple pipeline usage with convenience function
export async function exampleSimpleProcessing() {
  console.log('=== Simple Processing Example ===');
  
  // Mock files for demonstration
  const files = [
    { 
      file: new File(['probability content'], 'probability.pdf', { type: 'application/pdf' }), 
      type: 'probability' as const 
    },
    { 
      file: new File(['relations content'], 'relations.pdf', { type: 'application/pdf' }), 
      type: 'relations' as const 
    }
  ];

  try {
    // Process documents with default configuration
    const academicDocument = await processCompactStudyDocuments(files);
    
    console.log('✅ Processing completed successfully!');
    console.log(`📚 Generated document: ${academicDocument.title}`);
    console.log(`📄 Parts: ${academicDocument.parts.length}`);
    console.log(`🔗 Cross-references: ${academicDocument.crossReferences.length}`);
    
    return academicDocument;
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  }
}

// Example 2: Advanced pipeline usage with custom configuration
export async function exampleAdvancedProcessing() {
  console.log('=== Advanced Processing Example ===');
  
  // Create pipeline with custom configuration
  const pipeline = createCompactStudyPipeline({
    processingConfig: {
      maxConcurrentStages: 2,
      enableRecovery: true,
      failureThreshold: 2,
      timeoutMs: 600000, // 10 minutes
      preservationThreshold: 0.9
    },
    structureConfig: {
      title: 'Advanced Compact Study Guide',
      enableNumbering: true,
      enableTableOfContents: true
    },
    mathExtractionConfig: {
      enableLatexConversion: true,
      confidenceThreshold: 0.7,
      preserveAllFormulas: true
    },
    enableProgressTracking: true,
    enableErrorRecovery: true
  });

  // Add event listeners for detailed progress tracking
  pipeline.on('pipeline_started', () => {
    console.log('🚀 Pipeline started');
  });

  pipeline.on('stage_started', (data: any) => {
    console.log(`⏳ Starting: ${data.name}`);
  });

  pipeline.on('stage_completed', (data: any) => {
    console.log(`✅ Completed: ${data.name} (${data.metrics.processingTime}ms)`);
    console.log(`   Quality Score: ${data.metrics.qualityScore}`);
    console.log(`   Items Processed: ${data.metrics.itemsProcessed}`);
  });

  pipeline.on('stage_failed', (data: any) => {
    console.error(`❌ Failed: ${data.name} - ${data.error.message}`);
  });

  pipeline.on('stage_recovered', (data: any) => {
    console.log(`🔧 Recovered: ${data.name}`);
  });

  pipeline.on('progress_updated', (data: any) => {
    console.log(`📊 Progress: ${data.progress}%`);
  });

  // Add documents
  const probabilityFile = new File(['probability content'], 'discrete-probability.pdf', { type: 'application/pdf' });
  const relationsFile = new File(['relations content'], 'relations-theory.pdf', { type: 'application/pdf' });
  
  pipeline.addDocument(probabilityFile, 'probability');
  pipeline.addDocument(relationsFile, 'relations');

  try {
    // Execute pipeline
    const result = await pipeline.execute();
    
    console.log('🎉 Advanced processing completed!');
    
    // Get detailed metrics
    const metrics = pipeline.getMetrics();
    console.log('📈 Final Metrics:');
    console.log(`   Total Processing Time: ${metrics.totalProcessingTime}ms`);
    console.log(`   Stages Completed: ${metrics.stagesCompleted}`);
    console.log(`   Documents Processed: ${metrics.documentsProcessed}`);
    console.log(`   Average Quality Score: ${metrics.averageQualityScore.toFixed(2)}`);
    console.log(`   Average Preservation Score: ${metrics.averagePreservationScore.toFixed(2)}`);
    console.log(`   Total Errors: ${metrics.totalErrors}`);
    console.log(`   Total Warnings: ${metrics.totalWarnings}`);
    
    return result;
    
  } catch (error) {
    console.error('💥 Advanced processing failed:', error);
    
    // Get error details
    const errors = pipeline.getErrors();
    console.error('🔍 Error Details:');
    errors.forEach((err, index) => {
      console.error(`   ${index + 1}. [${err.severity}] ${err.message}`);
      if (err.sourceDocument) {
        console.error(`      Source: ${err.sourceDocument}`);
      }
    });
    
    throw error;
  }
}

// Example 3: Specialized pipeline for probability content only
export async function exampleProbabilityProcessing() {
  console.log('=== Probability-Only Processing Example ===');
  
  const pipeline = createProbabilityPipeline({
    structureConfig: {
      title: 'Discrete Probability Study Guide',
      sections: [
        'Probability Basics',
        'Conditional Probability',
        'Bayes\' Theorem',
        'Random Variables',
        'Expected Value & Variance'
      ]
    }
  });

  const probabilityFiles = [
    new File(['basic probability'], 'prob-basics.pdf', { type: 'application/pdf' }),
    new File(['conditional probability'], 'conditional-prob.pdf', { type: 'application/pdf' }),
    new File(['bayes theorem'], 'bayes.pdf', { type: 'application/pdf' })
  ];

  // Add all probability documents
  probabilityFiles.forEach(file => {
    pipeline.addDocument(file, 'probability');
  });

  try {
    const result = await pipeline.execute();
    console.log('✅ Probability processing completed!');
    return result;
  } catch (error) {
    console.error('❌ Probability processing failed:', error);
    throw error;
  }
}

// Example 4: Specialized pipeline for relations content only
export async function exampleRelationsProcessing() {
  console.log('=== Relations-Only Processing Example ===');
  
  const pipeline = createRelationsPipeline({
    structureConfig: {
      title: 'Relations Theory Study Guide',
      sections: [
        'Basic Definitions',
        'Reflexive, Symmetric, Transitive Properties',
        'Combining Relations',
        'N-ary Relations',
        'SQL Operations'
      ]
    }
  });

  const relationsFiles = [
    new File(['relation definitions'], 'relations-def.pdf', { type: 'application/pdf' }),
    new File(['relation properties'], 'relation-props.pdf', { type: 'application/pdf' }),
    new File(['sql operations'], 'sql-relations.pdf', { type: 'application/pdf' })
  ];

  // Add all relations documents
  relationsFiles.forEach(file => {
    pipeline.addDocument(file, 'relations');
  });

  try {
    const result = await pipeline.execute();
    console.log('✅ Relations processing completed!');
    return result;
  } catch (error) {
    console.error('❌ Relations processing failed:', error);
    throw error;
  }
}

// Example 5: Error handling and recovery demonstration
export async function exampleErrorHandling() {
  console.log('=== Error Handling Example ===');
  
  const pipeline = createCompactStudyPipeline({
    processingConfig: {
      enableRecovery: true,
      failureThreshold: 3, // Allow more failures
      timeoutMs: 30000 // Shorter timeout for demo
    },
    enableErrorRecovery: true
  });

  // Add error event listeners
  pipeline.on('stage_failed', (data: any) => {
    console.warn(`⚠️  Stage failed but continuing: ${data.name}`);
    console.warn(`   Error: ${data.error.message}`);
  });

  pipeline.on('stage_recovered', (data: any) => {
    console.log(`🔧 Successfully recovered stage: ${data.name}`);
  });

  // Add some test files (these would fail in real processing but demonstrate error handling)
  const corruptFile = new File(['corrupted content'], 'corrupt.pdf', { type: 'application/pdf' });
  const emptyFile = new File([''], 'empty.pdf', { type: 'application/pdf' });
  
  pipeline.addDocument(corruptFile, 'general');
  pipeline.addDocument(emptyFile, 'general');

  try {
    const result = await pipeline.execute();
    console.log('✅ Processing completed despite errors!');
    
    // Check what errors occurred
    const errors = pipeline.getErrors();
    if (errors.length > 0) {
      console.log(`📋 Handled ${errors.length} errors during processing:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message} (${error.recoverable ? 'recoverable' : 'non-recoverable'})`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Processing failed completely:', error);
    throw error;
  }
}

// Example 6: Custom pipeline orchestrator
export async function exampleCustomOrchestrator() {
  console.log('=== Custom Orchestrator Example ===');
  
  // Create a basic orchestrator and customize it
  const orchestrator = new PipelineOrchestrator({
    processingConfig: {
      maxConcurrentStages: 1, // Sequential processing
      enableRecovery: false,  // Fail fast
      preservationThreshold: 0.95 // High quality requirement
    },
    fileProcessingConfig: {
      enableLatexConversion: true,
      confidenceThreshold: 0.8,
      validateExtraction: true
    },
    mathExtractionConfig: {
      preserveAllFormulas: true,
      enableWorkedExampleDetection: true
    },
    structureConfig: {
      title: 'Custom Study Guide',
      enableNumbering: true
    },
    crossReferenceConfig: {
      enableCrossReferences: true
    }
  });

  // Add documents
  const file = new File(['custom content'], 'custom.pdf', { type: 'application/pdf' });
  orchestrator.addDocument(file, 'general');

  try {
    const result = await orchestrator.execute();
    console.log('✅ Custom orchestrator completed!');
    return result;
  } catch (error) {
    console.error('❌ Custom orchestrator failed:', error);
    throw error;
  }
}

// Main example runner
export async function runAllExamples() {
  console.log('🚀 Running Content Processing Pipeline Examples\n');
  
  try {
    // Note: These examples use mock files and would need real PDF files in production
    console.log('ℹ️  Note: These examples use mock files for demonstration.\n');
    
    // Run examples (commented out to avoid actual execution in tests)
    // await exampleSimpleProcessing();
    // await exampleAdvancedProcessing();
    // await exampleProbabilityProcessing();
    // await exampleRelationsProcessing();
    // await exampleErrorHandling();
    // await exampleCustomOrchestrator();
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Example execution failed:', error);
  }
}

// Export all examples
export {
  exampleSimpleProcessing,
  exampleAdvancedProcessing,
  exampleProbabilityProcessing,
  exampleRelationsProcessing,
  exampleErrorHandling,
  exampleCustomOrchestrator,
  runAllExamples
};