// Example usage of discrete probability content processor

import { DiscreteProbabilityProcessor, createDiscreteProbabilityProcessor } from './discrete-probability-processor';
import { SourceDocument, ProcessingResult } from './processing-pipeline';
import { EnhancedExtractedContent, MathematicalContent } from './types';

/**
 * Example: Processing probability documents with the discrete probability processor
 */
async function exampleDiscreteProbabilityProcessing() {
  console.log('=== Discrete Probability Content Processing Example ===\n');

  // Create the processor
  const processor = createDiscreteProbabilityProcessor();
  console.log(`Created processor: ${processor.name} v${processor.version}`);

  // Example probability document content
  const probabilityText = `
    Probability Basics
    
    The probability of an event A is denoted as P(A) and represents the likelihood of A occurring.
    
    Basic Rules:
    1. P(A ∪ B) = P(A) + P(B) - P(A ∩ B) (Addition rule)
    2. P(A') = 1 - P(A) (Complement rule)
    
    Conditional Probability:
    The conditional probability of A given B is P(A|B) = P(A ∩ B) / P(B) when P(B) > 0.
    
    Bayes' Theorem:
    P(A|B) = P(B|A) × P(A) / P(B)
    
    Example 1: Coin Flip
    Problem: What is the probability of getting heads on a fair coin?
    Solution:
    Step 1: Identify the sample space S = {H, T}
    Step 2: Count favorable outcomes: |A| = 1 (heads)
    Step 3: Apply formula: P(H) = 1/2 = 0.5
    
    Bernoulli Trials:
    A Bernoulli trial is an experiment with exactly two outcomes: success (p) and failure (1-p).
    
    Binomial Distribution:
    For n independent Bernoulli trials, P(X = k) = C(n,k) × p^k × (1-p)^(n-k)
    
    Random Variables:
    Expected Value: E[X] = Σ x × P(X = x)
    Variance: Var(X) = E[X²] - (E[X])²
    Standard Deviation: σ = √Var(X)
  `;

  // Create mock source document
  const sourceDoc: SourceDocument = {
    id: 'probability_doc_1',
    file: new File([probabilityText], 'probability_basics.pdf', { type: 'application/pdf' }),
    type: 'probability',
    extractedContent: {
      text: probabilityText,
      images: [],
      tables: [],
      metadata: {
        name: 'probability_basics.pdf',
        size: probabilityText.length,
        type: 'application/pdf',
        lastModified: new Date()
      },
      structure: {
        headings: [
          { level: 1, text: 'Probability Basics', position: 0 },
          { level: 2, text: 'Conditional Probability', position: 200 },
          { level: 2, text: 'Bayes\' Theorem', position: 350 }
        ],
        sections: [],
        hierarchy: 2
      },
      mathematicalContent: {
        formulas: [],
        workedExamples: [],
        definitions: [],
        theorems: []
      },
      contentPreservation: {
        totalFormulasFound: 5,
        formulasPreserved: 5,
        totalExamplesFound: 1,
        examplesPreserved: 1,
        preservationScore: 1.0,
        issues: [],
        validationResults: []
      }
    } as EnhancedExtractedContent,
    processingStatus: 'pending',
    errors: []
  };

  try {
    // Validate input
    console.log('\n--- Validation ---');
    const validation = processor.validate([sourceDoc], {});
    console.log(`Validation result: ${validation.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Details: ${validation.details}`);

    if (!validation.passed) {
      console.log('Validation failed, cannot proceed with processing.');
      return;
    }

    // Process the document
    console.log('\n--- Processing ---');
    console.log('Processing probability document...');
    
    const result: ProcessingResult = await processor.process([sourceDoc], {
      confidenceThreshold: 0.7,
      enableLatexConversion: true,
      preservationThreshold: 0.8
    });

    console.log(`Processing result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Processing time: ${result.metrics.processingTime}ms`);
    console.log(`Items processed: ${result.metrics.itemsProcessed}`);
    console.log(`Quality score: ${result.metrics.qualityScore.toFixed(2)}`);
    console.log(`Content preserved: ${(result.metrics.contentPreserved * 100).toFixed(1)}%`);

    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.severity.toUpperCase()}] ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.message}`);
      });
    }

    if (result.success && result.data && result.data.length > 0) {
      const content = result.data[0] as MathematicalContent;
      
      console.log('\n--- Extracted Content Summary ---');
      console.log(`Formulas extracted: ${content.formulas.length}`);
      console.log(`Worked examples: ${content.workedExamples.length}`);
      console.log(`Definitions: ${content.definitions.length}`);
      console.log(`Theorems: ${content.theorems.length}`);

      // Display some extracted formulas
      if (content.formulas.length > 0) {
        console.log('\n--- Sample Formulas ---');
        content.formulas.slice(0, 3).forEach((formula, index) => {
          console.log(`${index + 1}. ${formula.latex}`);
          console.log(`   Context: ${formula.context}`);
          console.log(`   Type: ${formula.type}, Key: ${formula.isKeyFormula}, Confidence: ${formula.confidence}`);
        });
      }

      // Display worked examples
      if (content.workedExamples.length > 0) {
        console.log('\n--- Sample Worked Examples ---');
        content.workedExamples.slice(0, 2).forEach((example, index) => {
          console.log(`${index + 1}. ${example.title}`);
          console.log(`   Problem: ${example.problem.substring(0, 100)}...`);
          console.log(`   Solution steps: ${example.solution.length}`);
          console.log(`   Subtopic: ${example.subtopic}`);
          console.log(`   Complete: ${example.isComplete}, Confidence: ${example.confidence}`);
        });
      }

      // Display definitions
      if (content.definitions.length > 0) {
        console.log('\n--- Sample Definitions ---');
        content.definitions.slice(0, 3).forEach((definition, index) => {
          console.log(`${index + 1}. ${definition.term}`);
          console.log(`   Definition: ${definition.definition.substring(0, 100)}...`);
          console.log(`   Confidence: ${definition.confidence}`);
        });
      }

      // Display theorems
      if (content.theorems.length > 0) {
        console.log('\n--- Sample Theorems ---');
        content.theorems.slice(0, 2).forEach((theorem, index) => {
          console.log(`${index + 1}. ${theorem.name}`);
          console.log(`   Statement: ${theorem.statement.substring(0, 100)}...`);
          console.log(`   Conditions: ${theorem.conditions.length}`);
          console.log(`   Confidence: ${theorem.confidence}`);
        });
      }
    }

    // Demonstrate recovery mechanism
    console.log('\n--- Recovery Mechanism Demo ---');
    const mockError = {
      id: 'test_error',
      stage: 'test',
      type: 'extraction' as const,
      severity: 'medium' as const,
      message: 'Simulated processing error',
      recoverable: true,
      timestamp: new Date()
    };

    const recoveryResult = await processor.recover(mockError, [sourceDoc], {
      confidenceThreshold: 0.3,
      enableLatexConversion: false,
      simplifiedExtraction: true
    });

    console.log(`Recovery result: ${recoveryResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Recovery processing time: ${recoveryResult.metrics.processingTime}ms`);

  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

/**
 * Example: Processing multiple probability documents
 */
async function exampleMultipleDocumentProcessing() {
  console.log('\n\n=== Multiple Document Processing Example ===\n');

  const processor = createDiscreteProbabilityProcessor();

  // Create multiple source documents
  const docs: SourceDocument[] = [
    {
      id: 'basics_doc',
      file: new File(['Basic probability content'], 'basics.pdf'),
      type: 'probability',
      extractedContent: {
        text: 'Probability basics: P(A), sample space, events, basic rules',
        images: [], tables: [],
        metadata: { name: 'basics.pdf', size: 100, type: 'pdf', lastModified: new Date() },
        structure: { headings: [], sections: [], hierarchy: 0 },
        mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
        contentPreservation: { totalFormulasFound: 0, formulasPreserved: 0, totalExamplesFound: 0, examplesPreserved: 0, preservationScore: 1, issues: [], validationResults: [] }
      } as EnhancedExtractedContent,
      processingStatus: 'pending',
      errors: []
    },
    {
      id: 'advanced_doc',
      file: new File(['Advanced probability content'], 'advanced.pdf'),
      type: 'probability',
      extractedContent: {
        text: 'Advanced topics: Bayes theorem, conditional probability, random variables, expected value',
        images: [], tables: [],
        metadata: { name: 'advanced.pdf', size: 100, type: 'pdf', lastModified: new Date() },
        structure: { headings: [], sections: [], hierarchy: 0 },
        mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
        contentPreservation: { totalFormulasFound: 0, formulasPreserved: 0, totalExamplesFound: 0, examplesPreserved: 0, preservationScore: 1, issues: [], validationResults: [] }
      } as EnhancedExtractedContent,
      processingStatus: 'pending',
      errors: []
    }
  ];

  try {
    const result = await processor.process(docs, {
      confidenceThreshold: 0.6,
      enableLatexConversion: true
    });

    console.log(`Processed ${docs.length} documents`);
    console.log(`Success: ${result.success}`);
    console.log(`Total processing time: ${result.metrics.processingTime}ms`);
    console.log(`Total items processed: ${result.metrics.itemsProcessed}`);
    console.log(`Average quality score: ${result.metrics.qualityScore.toFixed(2)}`);

    if (result.success && result.data) {
      console.log(`\nExtracted content from ${result.data.length} documents:`);
      result.data.forEach((content: MathematicalContent, index: number) => {
        console.log(`  Document ${index + 1}: ${content.formulas.length} formulas, ${content.workedExamples.length} examples`);
      });
    }

  } catch (error) {
    console.error('Multiple document processing failed:', error);
  }
}

/**
 * Example: Content type detection
 */
function exampleContentDetection() {
  console.log('\n\n=== Content Detection Example ===\n');

  const processor = createDiscreteProbabilityProcessor();

  // Test different document types
  const testDocs = [
    {
      id: 'prob_doc',
      type: 'probability' as const,
      text: 'General content without probability keywords'
    },
    {
      id: 'general_doc',
      type: 'general' as const,
      text: 'This document discusses probability and conditional probability concepts'
    },
    {
      id: 'relations_doc',
      type: 'relations' as const,
      text: 'Relations and functions in mathematics'
    },
    {
      id: 'keyword_doc',
      type: 'general' as const,
      text: 'Expected value and variance calculations for random variables'
    }
  ];

  console.log('Testing content detection:');
  testDocs.forEach(doc => {
    const mockDoc: SourceDocument = {
      id: doc.id,
      file: new File([doc.text], `${doc.id}.pdf`),
      type: doc.type,
      extractedContent: {
        text: doc.text,
        images: [], tables: [],
        metadata: { name: `${doc.id}.pdf`, size: 100, type: 'pdf', lastModified: new Date() },
        structure: { headings: [], sections: [], hierarchy: 0 },
        mathematicalContent: { formulas: [], workedExamples: [], definitions: [], theorems: [] },
        contentPreservation: { totalFormulasFound: 0, formulasPreserved: 0, totalExamplesFound: 0, examplesPreserved: 0, preservationScore: 1, issues: [], validationResults: [] }
      } as EnhancedExtractedContent,
      processingStatus: 'pending',
      errors: []
    };

    // Use the private method through validation (which calls containsProbabilityContent)
    const validation = processor.validate([mockDoc], {});
    const wouldProcess = validation.passed;
    
    console.log(`  ${doc.id} (${doc.type}): ${wouldProcess ? 'WOULD PROCESS' : 'WOULD SKIP'}`);
    console.log(`    Text: "${doc.text.substring(0, 50)}..."`);
  });
}

// Run examples if this file is executed directly
if (require.main === module) {
  async function runExamples() {
    try {
      await exampleDiscreteProbabilityProcessing();
      await exampleMultipleDocumentProcessing();
      exampleContentDetection();
      
      console.log('\n=== All Examples Completed Successfully ===');
    } catch (error) {
      console.error('Example execution failed:', error);
      process.exit(1);
    }
  }

  runExamples();
}

// Export examples for use in other files
export {
  exampleDiscreteProbabilityProcessing,
  exampleMultipleDocumentProcessing,
  exampleContentDetection
};