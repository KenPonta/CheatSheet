// Example usage of comprehensive error handling system

import {
  CompactStudyProcessingPipeline,
  CompactStudyErrorHandler,
  MathContentError,
  LayoutError,
  CrossReferenceError
} from './error-handling-integration';
import { CompactLayoutConfig, SourceLocation } from './types';

// Example: Processing a document with comprehensive error handling
export async function processDocumentWithErrorHandling() {
  console.log('=== Compact Study Generator - Error Handling Example ===\n');

  // Create processing pipeline with error handling
  const pipeline = new CompactStudyProcessingPipeline();

  // Sample document text with potential issues
  const sampleText = `
    Discrete Probability Theory - Study Guide
    
    Part I: Basic Probability
    
    1.1 Probability Basics
    The probability of an event A is denoted as P(A) and satisfies 0 ≤ P(A) ≤ 1.
    
    Example 1.1: Calculate P(A ∪ B) using the inclusion-exclusion principle.
    Solution: P(A ∪ B) = P(A) + P(B) - P(A ∩ B)
    
    1.2 Conditional Probability
    The conditional probability P(A|B) = P(A ∩ B) / P(B) when P(B) > 0.
    
    Example 1.2: For independent events, P(A|B) = P(A).
    
    1.3 Expected Value
    For a discrete random variable X: E[X] = ∑ x P(X = x)
    
    Example 1.3: Calculate E[X] for X ~ Bernoulli(p).
    Solution: E[X] = 0 × (1-p) + 1 × p = p
    
    Part II: Relations
    
    2.1 Relation Properties
    A relation R on set A is:
    - Reflexive if ∀x ∈ A: (x,x) ∈ R
    - Symmetric if ∀x,y ∈ A: (x,y) ∈ R → (y,x) ∈ R
    - Transitive if ∀x,y,z ∈ A: (x,y) ∈ R ∧ (y,z) ∈ R → (x,z) ∈ R
    
    Example 2.1: Check if R = {(1,1), (2,2), (1,2)} is reflexive on A = {1,2}.
    Solution: R is not reflexive because (2,2) ∉ R. Wait, (2,2) ∈ R, so it is reflexive.
  `;

  // Configuration that might cause layout issues
  const config: CompactLayoutConfig = {
    paperSize: 'a4',
    columns: 2,
    typography: {
      fontSize: 10,
      lineHeight: 1.15,
      fontFamily: {
        body: 'Times New Roman',
        heading: 'Times New Roman Bold',
        math: 'Computer Modern',
        code: 'Courier New'
      }
    },
    spacing: {
      paragraphSpacing: 0.25,
      listSpacing: 0.2,
      sectionSpacing: 0.4,
      headingMargins: {
        top: 0.3,
        bottom: 0.2
      }
    },
    margins: {
      top: 0.75,
      bottom: 0.75,
      left: 0.75,
      right: 0.75,
      columnGap: 0.5
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: false
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 18
      }
    }
  };

  const sourceLocation: SourceLocation = {
    fileId: 'discrete-probability-relations.pdf',
    page: 1,
    section: 'complete-document'
  };

  try {
    console.log('Processing document with error handling...\n');

    // Process the document
    const result = await pipeline.processDocument(sampleText, config, sourceLocation);

    // Display processing results
    console.log('📊 Processing Results:');
    console.log(`- Formulas extracted: ${result.content.formulas.length}`);
    console.log(`- Worked examples: ${result.content.workedExamples.length}`);
    console.log(`- Definitions: ${result.content.definitions.length}`);
    console.log(`- Theorems: ${result.content.theorems.length}`);
    console.log(`- Cross-references: ${result.crossReferences.length}`);
    console.log(`- Layout columns: ${result.layout.columns}`);
    console.log(`- Total warnings: ${result.allWarnings.length}\n`);

    // Display warnings by type
    if (result.allWarnings.length > 0) {
      console.log('⚠️  Processing Warnings:');
      
      const warningsByType = result.allWarnings.reduce((acc, warning) => {
        acc[warning.type] = (acc[warning.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(warningsByType).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} warning(s)`);
      });

      console.log('\nDetailed Warnings:');
      result.allWarnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.severity.toUpperCase()}] ${warning.type}: ${warning.message}`);
        if (warning.suggestion) {
          console.log(`   Suggestion: ${warning.suggestion}`);
        }
        if (warning.recoveryAction) {
          console.log(`   Recovery: ${warning.recoveryAction}`);
        }
      });
      console.log();
    }

    // Display error summary
    console.log('📋 Error Summary:');
    console.log(`- Processing successful: ${result.errorSummary.overall.processingSuccess}`);
    console.log(`- Has errors: ${result.errorSummary.overall.hasErrors}`);
    console.log(`- Total warnings: ${result.errorSummary.overall.totalWarnings}`);

    if (result.errorSummary.extraction.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.errorSummary.extraction.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Display recovered content
    const recoveredFormulas = result.content.formulas.filter(f => f.id.includes('recovered'));
    const recoveredExamples = result.content.workedExamples.filter(e => e.id.includes('recovered'));

    if (recoveredFormulas.length > 0 || recoveredExamples.length > 0) {
      console.log('\n🔧 Recovered Content:');
      if (recoveredFormulas.length > 0) {
        console.log(`- Recovered formulas: ${recoveredFormulas.length}`);
        recoveredFormulas.forEach(formula => {
          console.log(`  • ${formula.latex} (confidence: ${formula.confidence})`);
        });
      }
      if (recoveredExamples.length > 0) {
        console.log(`- Recovered examples: ${recoveredExamples.length}`);
        recoveredExamples.forEach(example => {
          console.log(`  • ${example.title} (complete: ${example.isComplete})`);
        });
      }
    }

    return result;

  } catch (error) {
    console.error('❌ Fatal processing error:', error.message);
    throw error;
  }
}

// Example: Demonstrating specific error handling scenarios
export async function demonstrateErrorHandlingScenarios() {
  console.log('\n=== Error Handling Scenarios Demo ===\n');

  const errorHandler = new CompactStudyErrorHandler();

  // Scenario 1: Formula extraction error with OCR fallback
  console.log('1. Formula Extraction Error with OCR Fallback:');
  try {
    const mathError = new MathContentError(
      'Complex integral formula extraction failed',
      'FORMULA_EXTRACTION_FAILED',
      { fileId: 'test.pdf', page: 1 },
      true,
      '∫∫∫ f(x,y,z) dx dy dz'
    );

    const recovery = await errorHandler.handleFormulaExtractionError(
      mathError,
      '∫∫∫ f(x,y,z) dx dy dz',
      { fileId: 'test.pdf', page: 1 }
    );

    console.log(`   Recovery successful: ${recovery.success}`);
    console.log(`   Fallback used: ${recovery.fallbackUsed}`);
    console.log(`   Recovered content: ${JSON.stringify(recovery.recoveredContent, null, 2)}`);
    console.log(`   Warnings generated: ${recovery.warnings.length}\n`);

  } catch (error) {
    console.error('   Error in scenario 1:', error.message);
  }

  // Scenario 2: Layout overflow with automatic adjustment
  console.log('2. Layout Overflow with Automatic Adjustment:');
  try {
    const layoutError = new LayoutError(
      'Content exceeds column height',
      'COLUMN_OVERFLOW',
      'section-2.1',
      'worked-examples'
    );

    const config = {
      spacing: { paragraphSpacing: 0.35, listSpacing: 0.25 },
      typography: { lineHeight: 1.25, fontSize: 11 },
      columns: 2
    };

    const recovery = await errorHandler.handleLayoutOverflow(
      layoutError,
      config,
      []
    );

    console.log(`   Recovery successful: ${recovery.success}`);
    console.log(`   Fallback used: ${recovery.fallbackUsed}`);
    console.log(`   Adjusted config: ${JSON.stringify(recovery.recoveredContent, null, 2)}`);
    console.log(`   Warnings generated: ${recovery.warnings.length}\n`);

  } catch (error) {
    console.error('   Error in scenario 2:', error.message);
  }

  // Scenario 3: Cross-reference error with plain text fallback
  console.log('3. Cross-Reference Error with Plain Text Fallback:');
  try {
    const crossRefError = new CrossReferenceError(
      'Reference target not found',
      'REFERENCE_NOT_FOUND',
      'ref-example-5.5',
      { fileId: 'test.pdf', page: 2 },
      'example-5.5'
    );

    const crossRef = {
      id: 'ref-example-5.5',
      type: 'example' as const,
      sourceId: 'section-2.1',
      targetId: 'example-5.5',
      displayText: 'see Example 5.5'
    };

    const availableRefs = new Map([
      ['example-5.1', { type: 'example', title: 'Basic Example' }],
      ['example-5.3', { type: 'example', title: 'Advanced Example' }]
    ]);

    const recovery = await errorHandler.handleCrossReferenceError(
      crossRefError,
      crossRef,
      availableRefs
    );

    console.log(`   Recovery successful: ${recovery.success}`);
    console.log(`   Fallback used: ${recovery.fallbackUsed}`);
    console.log(`   Recovered content: ${JSON.stringify(recovery.recoveredContent, null, 2)}`);
    console.log(`   Warnings generated: ${recovery.warnings.length}\n`);

  } catch (error) {
    console.error('   Error in scenario 3:', error.message);
  }

  // Display comprehensive error summary
  const summary = errorHandler.generateErrorSummary();
  console.log('📊 Overall Error Summary:');
  console.log(`   Total warnings: ${summary.totalWarnings}`);
  console.log(`   Has errors: ${summary.hasErrors}`);
  console.log(`   Has recovery failures: ${summary.hasRecoveryFailures}`);
  console.log(`   Warnings by type:`, summary.byType);
  console.log(`   Warnings by severity:`, summary.bySeverity);
  
  if (summary.recommendations.length > 0) {
    console.log('   Recommendations:');
    summary.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
}

// Main example function
export async function runErrorHandlingExample() {
  try {
    // Run document processing example
    await processDocumentWithErrorHandling();
    
    // Run specific error scenarios
    await demonstrateErrorHandlingScenarios();
    
    console.log('\n✅ Error handling example completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
    console.error(error.stack);
  }
}

// Export for direct execution
if (require.main === module) {
  runErrorHandlingExample();
}