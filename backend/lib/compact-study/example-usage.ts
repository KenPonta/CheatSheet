// Example usage of the enhanced mathematical content extractor

import { getEnhancedContentExtractor, CompactStudyGenerator } from './index';

/**
 * Example: Extract mathematical content from a PDF file
 */
async function extractMathContentExample() {
  console.log('Enhanced Mathematical Content Extractor Example');
  console.log('==============================================');

  // Create a mock PDF file for demonstration
  const mockPdfContent = `
    Discrete Probability Theory
    
    Definition: The probability of an event A is defined as P(A) = favorable outcomes / total outcomes.
    
    Example 1: Calculate P(A|B) given P(A) = 0.3, P(B) = 0.5, P(A∩B) = 0.1
    Solution:
    Step 1: Apply the conditional probability formula P(A|B) = P(A∩B)/P(B)
    Step 2: Substitute values: P(A|B) = 0.1/0.5 = 0.2
    
    Theorem (Bayes' Theorem): P(A|B) = P(B|A) × P(A) / P(B)
    
    Relations Theory
    
    Definition: A relation R on set A is a subset of A × A.
    
    Example 2: Determine if relation R = {(1,1), (2,2), (3,3)} is reflexive.
    Solution: Check if (a,a) ∈ R for all a ∈ A.
  `;

  const mockFile = new File([mockPdfContent], 'probability-relations.pdf', {
    type: 'application/pdf'
  });

  try {
    // Extract mathematical content with default configuration
    const extractor = getEnhancedContentExtractor();
    const result = await extractor.extractMathematicalContent(mockFile);

    console.log('\n📊 Extraction Results:');
    console.log(`- Formulas found: ${result.mathematicalContent.formulas.length}`);
    console.log(`- Worked examples: ${result.mathematicalContent.workedExamples.length}`);
    console.log(`- Definitions: ${result.mathematicalContent.definitions.length}`);
    console.log(`- Theorems: ${result.mathematicalContent.theorems.length}`);

    console.log('\n🔍 Content Preservation:');
    console.log(`- Preservation score: ${(result.contentPreservation.preservationScore * 100).toFixed(1)}%`);
    console.log(`- Formulas preserved: ${result.contentPreservation.formulasPreserved}/${result.contentPreservation.totalFormulasFound}`);
    console.log(`- Examples preserved: ${result.contentPreservation.examplesPreserved}/${result.contentPreservation.totalExamplesFound}`);

    // Display extracted formulas
    if (result.mathematicalContent.formulas.length > 0) {
      console.log('\n📐 Extracted Formulas:');
      result.mathematicalContent.formulas.forEach((formula, index) => {
        console.log(`  ${index + 1}. ${formula.originalText || formula.latex}`);
        console.log(`     LaTeX: ${formula.latex}`);
        console.log(`     Type: ${formula.type}, Confidence: ${(formula.confidence * 100).toFixed(1)}%`);
        console.log(`     Key Formula: ${formula.isKeyFormula ? 'Yes' : 'No'}`);
      });
    }

    // Display worked examples
    if (result.mathematicalContent.workedExamples.length > 0) {
      console.log('\n📝 Worked Examples:');
      result.mathematicalContent.workedExamples.forEach((example, index) => {
        console.log(`  ${index + 1}. ${example.title}`);
        console.log(`     Problem: ${example.problem}`);
        console.log(`     Subtopic: ${example.subtopic}`);
        console.log(`     Steps: ${example.solution.length}`);
        console.log(`     Complete: ${example.isComplete ? 'Yes' : 'No'}`);
      });
    }

    // Display any issues found
    if (result.contentPreservation.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      result.contentPreservation.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.type}: ${issue.description}`);
        if (issue.suggestion) {
          console.log(`     Suggestion: ${issue.suggestion}`);
        }
      });
    }

    return result;

  } catch (error) {
    console.error('❌ Error extracting mathematical content:', error.message);
    throw error;
  }
}

/**
 * Example: Use pattern recognition to find mathematical content in text
 */
function patternRecognitionExample() {
  console.log('\n\nMathematical Pattern Recognition Example');
  console.log('=======================================');

  const sampleText = `
    The conditional probability formula P(A|B) = P(A∩B)/P(B) is fundamental.
    We can also use Bayes' theorem: P(A|B) = P(B|A) × P(A) / P(B).
    
    For sets, we have operations like A ∪ B and A ∩ B.
    The expected value is calculated as E[X] = Σ x_i × p_i.
    
    Example: Calculate ∫₀¹ x² dx = [x³/3]₀¹ = 1/3.
  `;

  // Find mathematical patterns
  const patterns = CompactStudyGenerator.findMathPatterns(sampleText);
  
  console.log(`\n🔍 Found ${patterns.length} mathematical patterns:`);
  patterns.forEach((pattern, index) => {
    console.log(`  ${index + 1}. "${pattern.text}"`);
    console.log(`     Type: ${pattern.type}, Priority: ${pattern.priority}`);
    console.log(`     Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
  });

  // Extract formulas with LaTeX conversion
  const formulas = CompactStudyGenerator.extractFormulasWithLatex(sampleText);
  
  console.log(`\n📐 Extracted ${formulas.length} formulas with LaTeX:`);
  formulas.forEach((formula, index) => {
    console.log(`  ${index + 1}. Original: "${formula.original}"`);
    console.log(`     LaTeX: ${formula.latex}`);
    console.log(`     Type: ${formula.type}`);
  });

  // Detect worked examples
  const examples = CompactStudyGenerator.detectWorkedExamples(sampleText);
  
  console.log(`\n📝 Detected ${examples.length} worked examples:`);
  examples.forEach((example, index) => {
    console.log(`  ${index + 1}. "${example.text.substring(0, 50)}..."`);
    console.log(`     Type: ${example.type}`);
    console.log(`     Confidence: ${(example.confidence * 100).toFixed(1)}%`);
  });
}

/**
 * Example: Validate LaTeX syntax
 */
function latexValidationExample() {
  console.log('\n\nLaTeX Validation Example');
  console.log('========================');

  const latexExamples = [
    '\\frac{P(A \\cap B)}{P(B)}',
    '\\sum_{i=1}^{n} x_i',
    '\\int_0^1 x^2 dx',
    '\\frac{P(A \\cap B}{P(B)}', // Invalid - missing closing brace
    '\\unknowncommand{x}' // Invalid - unknown command
  ];

  latexExamples.forEach((latex, index) => {
    const validation = CompactStudyGenerator.validateLatex(latex);
    console.log(`\n${index + 1}. "${latex}"`);
    console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
    if (!validation.isValid) {
      console.log(`   Errors: ${validation.errors.join(', ')}`);
    }
  });
}

// Export examples for use in other files
export {
  extractMathContentExample,
  patternRecognitionExample,
  latexValidationExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('🚀 Running Enhanced Mathematical Content Extractor Examples\n');
  
  // Note: In a real environment, you would need proper AI client setup
  // and file processing infrastructure. These examples show the API usage.
  
  patternRecognitionExample();
  latexValidationExample();
  
  console.log('\n✨ Examples completed! Check the implementation for full functionality.');
}