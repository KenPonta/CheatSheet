// Example usage of Cross-Reference System for Compact Study Generator

import { createCrossReferenceSystem } from './cross-reference-system';
import { AcademicDocument, DocumentPart, AcademicSection, Formula, WorkedExample, SourceLocation } from './types';

// Example: Creating and using the cross-reference system
export function demonstrateCrossReferenceSystem() {
  console.log('=== Cross-Reference System Demo ===\n');

  // Create cross-reference system with custom configuration
  const crossRefSystem = createCrossReferenceSystem({
    enableAutoGeneration: true,
    referenceFormats: {
      example: 'see Ex. {id}',
      formula: 'see Formula {id}',
      section: 'see Section {id}',
      theorem: 'see Theorem {id}',
      definition: 'see Definition {id}'
    },
    confidenceThreshold: 0.6,
    maxDistance: 3,
    validationEnabled: true
  });

  // Create sample academic document
  const sampleDocument = createSampleDocument();

  // Generate cross-references
  console.log('1. Generating cross-references...');
  const references = crossRefSystem.generateCrossReferences(sampleDocument);
  
  console.log(`Generated ${references.length} cross-references:`);
  references.forEach(ref => {
    console.log(`  - ${ref.displayText} (${ref.sourceId} → ${ref.targetId})`);
  });

  // Validate references
  console.log('\n2. Validating cross-references...');
  const validationResults = crossRefSystem.getValidationResults();
  
  const validRefs = validationResults.filter(result => result.isValid);
  const invalidRefs = validationResults.filter(result => !result.isValid);
  
  console.log(`Valid references: ${validRefs.length}`);
  console.log(`Invalid references: ${invalidRefs.length}`);
  
  if (invalidRefs.length > 0) {
    console.log('Invalid reference details:');
    invalidRefs.forEach(result => {
      console.log(`  - ${result.referenceId}: ${result.message}`);
    });
  }

  // Find references to specific targets
  console.log('\n3. Finding references to specific targets...');
  const exampleRefs = crossRefSystem.findReferencesToTarget('Ex.1.1.1');
  console.log(`References pointing to Ex.1.1.1: ${exampleRefs.length}`);
  
  // Format individual references
  console.log('\n4. Reference formatting examples:');
  references.slice(0, 3).forEach(ref => {
    const formatted = crossRefSystem.formatReference(ref);
    console.log(`  - Original: "${ref.displayText}" → Formatted: "${formatted}"`);
  });

  console.log('\n=== Demo Complete ===');
  return {
    references,
    validationResults,
    crossRefSystem
  };
}

// Helper function to create sample document
function createSampleDocument(): AcademicDocument {
  const mockSourceLocation: SourceLocation = {
    fileId: 'sample-document',
    page: 1,
    section: 'probability-basics'
  };

  // Sample formulas
  const unionFormula: Formula = {
    id: '1.1.1',
    latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
    context: 'Union of events probability formula',
    type: 'display',
    sourceLocation: mockSourceLocation,
    isKeyFormula: true,
    confidence: 0.95
  };

  const conditionalFormula: Formula = {
    id: '1.2.1',
    latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
    context: 'Conditional probability formula',
    type: 'display',
    sourceLocation: mockSourceLocation,
    isKeyFormula: true,
    confidence: 0.9
  };

  // Sample worked examples
  const unionExample: WorkedExample = {
    id: 'Ex.1.1.1',
    title: 'Union Probability Calculation',
    problem: 'Find P(A ∪ B) given P(A) = 0.3, P(B) = 0.4, P(A ∩ B) = 0.1',
    solution: [
      {
        stepNumber: 1,
        description: 'Apply the union formula P(A ∪ B) = P(A) + P(B) - P(A ∩ B)',
        formula: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
        explanation: 'Use the basic union probability formula'
      },
      {
        stepNumber: 2,
        description: 'Substitute values: P(A ∪ B) = 0.3 + 0.4 - 0.1 = 0.6',
        explanation: 'Calculate the final result'
      }
    ],
    sourceLocation: mockSourceLocation,
    subtopic: 'probability unions',
    confidence: 0.95,
    isComplete: true
  };

  const conditionalExample: WorkedExample = {
    id: 'Ex.1.2.1',
    title: 'Conditional Probability Example',
    problem: 'Find P(A|B) given P(A ∩ B) = 0.2 and P(B) = 0.5',
    solution: [
      {
        stepNumber: 1,
        description: 'Apply conditional probability formula P(A|B) = P(A ∩ B) / P(B)',
        formula: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
        explanation: 'Use the definition of conditional probability'
      },
      {
        stepNumber: 2,
        description: 'Substitute: P(A|B) = 0.2 / 0.5 = 0.4',
        explanation: 'Calculate the conditional probability'
      }
    ],
    sourceLocation: mockSourceLocation,
    subtopic: 'conditional probability',
    confidence: 0.9,
    isComplete: true
  };

  // Create sections with cross-reference opportunities
  const probabilityBasics: AcademicSection = {
    sectionNumber: '1.1',
    title: 'Probability Basics',
    content: 'This section covers fundamental probability concepts. The Union Probability Calculation example demonstrates the application of the union formula.',
    formulas: [unionFormula],
    examples: [unionExample],
    subsections: []
  };

  const conditionalProbability: AcademicSection = {
    sectionNumber: '1.2',
    title: 'Conditional Probability',
    content: 'Conditional probability builds on basic probability concepts from Section 1.1. See the Conditional Probability Example for practical applications.',
    formulas: [conditionalFormula],
    examples: [conditionalExample],
    subsections: []
  };

  const probabilityPart: DocumentPart = {
    partNumber: 1,
    title: 'Discrete Probability',
    sections: [probabilityBasics, conditionalProbability]
  };

  return {
    title: 'Sample Academic Document',
    tableOfContents: [],
    parts: [probabilityPart],
    crossReferences: [],
    appendices: [],
    metadata: {
      generatedAt: new Date(),
      sourceFiles: ['sample.pdf'],
      totalSections: 2,
      totalFormulas: 2,
      totalExamples: 2,
      preservationScore: 0.95
    }
  };
}

// Export for use in other modules
export { createSampleDocument };