/**
 * Example usage of the content fidelity validation system
 */

import { 
  FidelityValidator, 
  ManualReviewManager,
  createFidelityValidator,
  createManualReviewManager,
  DEFAULT_FIDELITY_CONFIG
} from './index';

/**
 * Example: Basic content validation workflow
 */
export async function basicValidationExample() {
  // Create validator with default configuration
  const validator = createFidelityValidator();
  
  const originalContent = `
    # Machine Learning Fundamentals
    
    Machine learning is a subset of artificial intelligence that focuses on algorithms 
    that can learn and make decisions from data without being explicitly programmed.
    
    ## Key Concepts
    - Supervised learning uses labeled training data
    - Unsupervised learning finds patterns in unlabeled data
    - Reinforcement learning learns through trial and error
  `;
  
  const processedContent = `
    # ML Basics
    
    ML is part of AI that uses algorithms to learn from data and make automatic decisions.
    
    ## Important Ideas
    - Supervised methods use training examples with answers
    - Unsupervised methods find hidden patterns
    - Reinforcement approaches learn by trying different actions
  `;
  
  // Validate content fidelity
  const validationResult = await validator.validateContent(originalContent, processedContent);
  
  console.log('Validation Results:');
  console.log('- Is Valid:', validationResult.isValid);
  console.log('- Overall Score:', (validationResult.score.overall * 100).toFixed(1) + '%');
  console.log('- Wording Preservation:', (validationResult.score.wordingPreservation * 100).toFixed(1) + '%');
  console.log('- Requires Manual Review:', validationResult.requiresManualReview);
  console.log('- Warnings:', validationResult.warnings.length);
  
  return validationResult;
}

/**
 * Example: Manual review workflow
 */
export async function manualReviewWorkflowExample() {
  const validator = createFidelityValidator();
  const reviewManager = createManualReviewManager();
  
  // Content that will likely require manual review
  const originalContent = 'TCP/IP protocol implementation requires careful consideration of network topology.';
  const processedContent = 'Network communication systems need thoughtful design approaches.';
  
  // Step 1: Validate content
  const validationResult = await validator.validateContent(originalContent, processedContent);
  
  if (validationResult.requiresManualReview) {
    // Step 2: Add to manual review queue
    const comparison = await validator.compareContent(originalContent, processedContent);
    const reviewId = reviewManager.addForReview(comparison, validationResult);
    
    console.log('Added to manual review queue:', reviewId);
    
    // Step 3: Generate review summary
    const summary = reviewManager.generateReviewSummary(reviewId);
    console.log('Review Summary:', summary);
    
    // Step 4: Simulate manual review decision
    if (summary && summary.recommendedAction === 'reject') {
      reviewManager.rejectReview(reviewId, 'Too many terminology changes detected');
      console.log('Review rejected due to significant content changes');
    } else {
      reviewManager.approveReview(reviewId, 'Minor changes acceptable');
      console.log('Review approved with notes');
    }
    
    // Step 5: Get final statistics
    const stats = reviewManager.getReviewStats();
    console.log('Review Statistics:', stats);
  }
  
  return { validationResult, reviewManager };
}

/**
 * Example: Batch processing with different configurations
 */
export async function batchProcessingExample() {
  // Create validators with different configurations
  const standardValidator = createFidelityValidator();
  const strictValidator = createFidelityValidator({
    minAcceptableScore: 0.95,
    wordingThreshold: 0.98,
    enableStrictMode: true,
    ignoreMinorChanges: false
  });
  
  const testCases = [
    {
      name: 'Technical Documentation',
      original: 'The REST API uses OAuth 2.0 for authentication.',
      processed: 'The REST API uses OAuth 2.0 for user verification.'
    },
    {
      name: 'Code Example',
      original: 'function calculateSum(a, b) { return a + b; }',
      processed: 'function sum(a, b) { return a + b; }'
    },
    {
      name: 'Academic Content',
      original: 'According to Smith et al. (2023), the results show significant improvement.',
      processed: 'Research by Smith and colleagues (2023) demonstrates notable enhancement.'
    }
  ];
  
  console.log('Batch Processing Results:');
  console.log('========================');
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}:`);
    
    // Standard validation
    const standardResult = await standardValidator.validateContent(
      testCase.original, 
      testCase.processed
    );
    
    // Strict validation
    const strictResult = await strictValidator.validateContent(
      testCase.original, 
      testCase.processed
    );
    
    console.log('  Standard Mode:');
    console.log('    - Valid:', standardResult.isValid);
    console.log('    - Score:', (standardResult.score.overall * 100).toFixed(1) + '%');
    console.log('    - Warnings:', standardResult.warnings.length);
    
    console.log('  Strict Mode:');
    console.log('    - Valid:', strictResult.isValid);
    console.log('    - Score:', (strictResult.score.overall * 100).toFixed(1) + '%');
    console.log('    - Warnings:', strictResult.warnings.length);
  }
}

/**
 * Example: Integration with cheat sheet generation workflow
 */
export async function cheatSheetIntegrationExample() {
  const validator = createFidelityValidator({
    // Configuration optimized for cheat sheet generation
    minAcceptableScore: 0.75, // Slightly more lenient for condensed content
    wordingThreshold: 0.80,   // Allow some paraphrasing for space
    semanticThreshold: 0.85,  // Prioritize meaning preservation
    ignoreMinorChanges: true  // Focus on significant issues
  });
  
  const reviewManager = createManualReviewManager();
  
  // Simulate cheat sheet content processing
  const originalSections = [
    {
      title: 'Database Normalization',
      content: 'Database normalization is the process of organizing data in a database to reduce redundancy and improve data integrity.'
    },
    {
      title: 'SQL Joins',
      content: 'SQL joins are used to combine rows from two or more tables based on a related column between them.'
    }
  ];
  
  const processedSections = [
    {
      title: 'DB Normalization',
      content: 'DB normalization organizes data to reduce redundancy and improve integrity.'
    },
    {
      title: 'SQL Joins',
      content: 'Joins combine table rows based on related columns.'
    }
  ];
  
  const validationResults = [];
  const reviewIds = [];
  
  for (let i = 0; i < originalSections.length; i++) {
    const original = `${originalSections[i].title}\n${originalSections[i].content}`;
    const processed = `${processedSections[i].title}\n${processedSections[i].content}`;
    
    const result = await validator.validateContent(original, processed);
    validationResults.push(result);
    
    if (result.requiresManualReview) {
      const comparison = await validator.compareContent(original, processed);
      const reviewId = reviewManager.addForReview(comparison, result);
      reviewIds.push(reviewId);
    }
  }
  
  console.log('Cheat Sheet Validation Results:');
  console.log('===============================');
  console.log('Total sections processed:', originalSections.length);
  console.log('Sections requiring review:', reviewIds.length);
  console.log('Average fidelity score:', 
    (validationResults.reduce((sum, r) => sum + r.score.overall, 0) / validationResults.length * 100).toFixed(1) + '%'
  );
  
  // Process manual reviews
  for (const reviewId of reviewIds) {
    const summary = reviewManager.generateReviewSummary(reviewId);
    if (summary) {
      console.log(`\nReview ${reviewId.slice(-8)}:`);
      console.log('  - Overall Score:', (summary.overallScore * 100).toFixed(1) + '%');
      console.log('  - Critical Issues:', summary.criticalIssues);
      console.log('  - Recommended Action:', summary.recommendedAction);
      
      // Auto-approve if score is acceptable and no critical issues
      if (summary.overallScore >= 0.7 && summary.criticalIssues === 0) {
        reviewManager.approveReview(reviewId, 'Auto-approved: acceptable condensation for cheat sheet');
      }
    }
  }
  
  const finalStats = reviewManager.getReviewStats();
  console.log('\nFinal Review Statistics:', finalStats);
  
  return {
    validationResults,
    reviewStats: finalStats,
    approvedSections: finalStats.approved,
    rejectedSections: finalStats.rejected
  };
}

/**
 * Example: Custom validation rules for specific content types
 */
export async function customValidationRulesExample() {
  // Validator for code content - strict about syntax preservation
  const codeValidator = createFidelityValidator({
    minAcceptableScore: 0.95,
    wordingThreshold: 0.98,
    enableStrictMode: true,
    ignoreMinorChanges: false
  });
  
  // Validator for explanatory text - more lenient for readability
  const textValidator = createFidelityValidator({
    minAcceptableScore: 0.70,
    wordingThreshold: 0.75,
    semanticThreshold: 0.85,
    ignoreMinorChanges: true
  });
  
  const codeExample = {
    original: 'const result = array.map(item => item.value * 2);',
    processed: 'const result = array.map(x => x.value * 2);'
  };
  
  const textExample = {
    original: 'This function iterates through each element in the array and multiplies its value by two.',
    processed: 'This function goes through every item in the array and doubles its value.'
  };
  
  const codeResult = await codeValidator.validateContent(codeExample.original, codeExample.processed);
  const textResult = await textValidator.validateContent(textExample.original, textExample.processed);
  
  console.log('Custom Validation Rules Example:');
  console.log('================================');
  console.log('Code Validation (Strict):');
  console.log('  - Valid:', codeResult.isValid);
  console.log('  - Score:', (codeResult.score.overall * 100).toFixed(1) + '%');
  console.log('  - Warnings:', codeResult.warnings.length);
  
  console.log('Text Validation (Lenient):');
  console.log('  - Valid:', textResult.isValid);
  console.log('  - Score:', (textResult.score.overall * 100).toFixed(1) + '%');
  console.log('  - Warnings:', textResult.warnings.length);
  
  return { codeResult, textResult };
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('Content Fidelity Validation System Examples');
  console.log('===========================================\n');
  
  try {
    await basicValidationExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await manualReviewWorkflowExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await batchProcessingExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await cheatSheetIntegrationExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await customValidationRulesExample();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export for use in other modules
export {
  DEFAULT_FIDELITY_CONFIG,
  createFidelityValidator,
  createManualReviewManager
};