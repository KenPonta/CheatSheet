// Example usage of Academic Structure Organizer

import {
  getAcademicStructureOrganizer,
  AcademicStructureConfig
} from './academic-structure-organizer';
import {
  EnhancedExtractedContent,
  MathematicalContent,
  Formula,
  WorkedExample,
  SolutionStep
} from './types';

/**
 * Example: Organizing discrete probability and relations content
 */
export async function exampleAcademicStructureOrganization() {
  console.log('=== Academic Structure Organizer Example ===\n');

  // Create sample extracted content for probability
  const probabilityContent: EnhancedExtractedContent = {
    text: `
      Probability is the measure of the likelihood of an event occurring. 
      The probability of the union of two events A and B is P(A ∪ B) = P(A) + P(B) - P(A ∩ B).
      Conditional probability is defined as P(A|B) = P(A ∩ B)/P(B) when P(B) > 0.
      Bayes' theorem states that P(A|B) = P(B|A)P(A)/P(B).
      Two events are independent if P(A ∩ B) = P(A)P(B).
      For a random variable X, the expected value is E[X] = Σ x·P(X=x).
      The variance is Var(X) = E[X²] - (E[X])².
    `,
    images: [],
    tables: [],
    metadata: {
      name: 'discrete_probability.pdf',
      size: 2048,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 15,
      mathContentDensity: 0.8,
      hasWorkedExamples: true,
      academicLevel: 'undergraduate'
    },
    structure: {
      headings: [
        { level: 1, text: 'Discrete Probability', position: 0 },
        { level: 2, text: 'Basic Concepts', position: 100 },
        { level: 2, text: 'Conditional Probability', position: 500 }
      ],
      sections: [],
      hierarchy: 2
    },
    mathematicalContent: {
      formulas: [
        {
          id: 'prob-union',
          latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
          context: 'probability union rule',
          type: 'display',
          sourceLocation: { fileId: 'prob1', page: 3 },
          isKeyFormula: true,
          confidence: 0.98
        },
        {
          id: 'conditional-prob',
          latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
          context: 'conditional probability definition',
          type: 'display',
          sourceLocation: { fileId: 'prob1', page: 5 },
          isKeyFormula: true,
          confidence: 0.97
        },
        {
          id: 'bayes-theorem',
          latex: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}',
          context: 'Bayes theorem',
          type: 'display',
          sourceLocation: { fileId: 'prob1', page: 7 },
          isKeyFormula: true,
          confidence: 0.99
        },
        {
          id: 'expected-value',
          latex: 'E[X] = \\sum_{x} x \\cdot P(X = x)',
          context: 'expected value of discrete random variable',
          type: 'display',
          sourceLocation: { fileId: 'prob1', page: 12 },
          isKeyFormula: true,
          confidence: 0.96
        }
      ],
      workedExamples: [
        {
          id: 'conditional-example',
          title: 'Computing Conditional Probability',
          problem: 'In a deck of 52 cards, what is P(King|Red card)?',
          solution: [
            {
              stepNumber: 1,
              description: 'Identify the events',
              explanation: 'A = King, B = Red card'
            },
            {
              stepNumber: 2,
              description: 'Find P(A ∩ B)',
              formula: 'P(King ∩ Red) = 2/52',
              explanation: 'There are 2 red kings (hearts and diamonds)'
            },
            {
              stepNumber: 3,
              description: 'Find P(B)',
              formula: 'P(Red) = 26/52 = 1/2',
              explanation: 'Half the cards are red'
            },
            {
              stepNumber: 4,
              description: 'Apply conditional probability formula',
              formula: 'P(King|Red) = (2/52)/(26/52) = 2/26 = 1/13',
              explanation: 'Use P(A|B) = P(A∩B)/P(B)'
            }
          ],
          sourceLocation: { fileId: 'prob1', page: 6 },
          subtopic: 'conditional probability',
          confidence: 0.94,
          isComplete: true
        },
        {
          id: 'expected-value-example',
          title: 'Expected Value of Dice Roll',
          problem: 'Find the expected value of rolling a fair six-sided die',
          solution: [
            {
              stepNumber: 1,
              description: 'List all outcomes and probabilities',
              explanation: 'X can be 1,2,3,4,5,6 each with probability 1/6'
            },
            {
              stepNumber: 2,
              description: 'Apply expected value formula',
              formula: 'E[X] = 1·(1/6) + 2·(1/6) + 3·(1/6) + 4·(1/6) + 5·(1/6) + 6·(1/6)',
              explanation: 'Sum of x·P(X=x) for all x'
            },
            {
              stepNumber: 3,
              description: 'Calculate the result',
              formula: 'E[X] = (1+2+3+4+5+6)/6 = 21/6 = 3.5',
              explanation: 'The expected value is 3.5'
            }
          ],
          sourceLocation: { fileId: 'prob1', page: 13 },
          subtopic: 'expected value',
          confidence: 0.95,
          isComplete: true
        }
      ],
      definitions: [],
      theorems: []
    },
    contentPreservation: {
      totalFormulasFound: 4,
      formulasPreserved: 4,
      totalExamplesFound: 2,
      examplesPreserved: 2,
      preservationScore: 1.0,
      issues: [],
      validationResults: []
    }
  };

  // Create sample extracted content for relations
  const relationsContent: EnhancedExtractedContent = {
    text: `
      A relation R from set A to set B is a subset of the Cartesian product A × B.
      A relation R on set A is reflexive if (a,a) ∈ R for all a ∈ A.
      A relation R is symmetric if (a,b) ∈ R implies (b,a) ∈ R.
      A relation R is transitive if (a,b) ∈ R and (b,c) ∈ R implies (a,c) ∈ R.
      Relations can be combined using composition: (R ∘ S)(a,c) iff ∃b: (a,b) ∈ R and (b,c) ∈ S.
      SQL operations like SELECT, PROJECT, and JOIN are based on relational algebra.
    `,
    images: [],
    tables: [],
    metadata: {
      name: 'relations.pdf',
      size: 1536,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 10,
      mathContentDensity: 0.7,
      hasWorkedExamples: true,
      academicLevel: 'undergraduate'
    },
    structure: {
      headings: [
        { level: 1, text: 'Relations', position: 0 },
        { level: 2, text: 'Properties', position: 200 },
        { level: 2, text: 'Operations', position: 600 }
      ],
      sections: [],
      hierarchy: 2
    },
    mathematicalContent: {
      formulas: [
        {
          id: 'relation-def',
          latex: 'R \\subseteq A \\times B',
          context: 'relation definition',
          type: 'inline',
          sourceLocation: { fileId: 'rel1', page: 1 },
          isKeyFormula: true,
          confidence: 0.95
        },
        {
          id: 'composition',
          latex: '(R \\circ S)(a,c) \\iff \\exists b: (a,b) \\in R \\land (b,c) \\in S',
          context: 'relation composition',
          type: 'display',
          sourceLocation: { fileId: 'rel1', page: 7 },
          isKeyFormula: true,
          confidence: 0.92
        }
      ],
      workedExamples: [
        {
          id: 'reflexive-check',
          title: 'Checking Reflexivity',
          problem: 'Determine if R = {(1,1), (2,2), (3,3), (1,2)} on {1,2,3} is reflexive',
          solution: [
            {
              stepNumber: 1,
              description: 'Check definition of reflexive',
              explanation: 'R is reflexive if (a,a) ∈ R for all a in the domain'
            },
            {
              stepNumber: 2,
              description: 'Check each element',
              explanation: '(1,1) ∈ R ✓, (2,2) ∈ R ✓, (3,3) ∈ R ✓'
            },
            {
              stepNumber: 3,
              description: 'Conclusion',
              explanation: 'Since all required pairs are present, R is reflexive'
            }
          ],
          sourceLocation: { fileId: 'rel1', page: 3 },
          subtopic: 'reflexive relations',
          confidence: 0.91,
          isComplete: true
        }
      ],
      definitions: [],
      theorems: []
    },
    contentPreservation: {
      totalFormulasFound: 2,
      formulasPreserved: 2,
      totalExamplesFound: 1,
      examplesPreserved: 1,
      preservationScore: 1.0,
      issues: [],
      validationResults: []
    }
  };

  // Configure the academic structure organizer
  const config: Partial<AcademicStructureConfig> = {
    enableCrossReferences: true,
    generateTableOfContents: true,
    numberingScheme: {
      sections: true,
      examples: true,
      formulas: true,
      theorems: true,
      definitions: true
    },
    partTitles: {
      part1: 'Discrete Probability',
      part2: 'Relations'
    }
  };

  // Create the organizer
  const organizer = getAcademicStructureOrganizer(config);

  // Organize the content
  const academicDocument = organizer.organizeContent(
    [probabilityContent, relationsContent],
    'Compact Study Guide: Discrete Mathematics'
  );

  // Display results
  console.log('📚 Academic Document Generated:');
  console.log(`Title: ${academicDocument.title}`);
  console.log(`Generated: ${academicDocument.metadata.generatedAt.toISOString()}`);
  console.log(`Source Files: ${academicDocument.metadata.sourceFiles.join(', ')}`);
  console.log(`Preservation Score: ${academicDocument.metadata.preservationScore}`);
  console.log();

  console.log('📋 Table of Contents:');
  academicDocument.tableOfContents.forEach(entry => {
    console.log(`${entry.level === 1 ? '' : '  '}${entry.title} (${entry.pageAnchor})`);
    entry.children.forEach(child => {
      console.log(`    ${child.sectionNumber} ${child.title} (${child.pageAnchor})`);
    });
  });
  console.log();

  console.log('📖 Document Structure:');
  academicDocument.parts.forEach(part => {
    console.log(`Part ${part.partNumber}: ${part.title}`);
    part.sections.forEach(section => {
      console.log(`  ${section.sectionNumber} ${section.title}`);
      console.log(`    Formulas: ${section.formulas.length}`);
      console.log(`    Examples: ${section.examples.length}`);
      console.log(`    Content length: ${section.content.length} chars`);
    });
    console.log();
  });

  console.log('🔗 Cross References:');
  academicDocument.crossReferences.forEach(ref => {
    console.log(`${ref.sourceId} → ${ref.targetId}: "${ref.displayText}"`);
  });
  console.log();

  console.log('📊 Statistics:');
  console.log(`Total Sections: ${academicDocument.metadata.totalSections}`);
  console.log(`Total Formulas: ${academicDocument.metadata.totalFormulas}`);
  console.log(`Total Examples: ${academicDocument.metadata.totalExamples}`);
  console.log();

  // Example of accessing specific content
  console.log('🔍 Sample Content Access:');
  const firstProbabilitySection = academicDocument.parts[0].sections[0];
  console.log(`Section ${firstProbabilitySection.sectionNumber}: ${firstProbabilitySection.title}`);
  
  if (firstProbabilitySection.formulas.length > 0) {
    const firstFormula = firstProbabilitySection.formulas[0];
    console.log(`  Formula ${firstFormula.id}: ${firstFormula.latex}`);
  }
  
  if (firstProbabilitySection.examples.length > 0) {
    const firstExample = firstProbabilitySection.examples[0];
    console.log(`  Example ${firstExample.id}: ${firstExample.title}`);
    console.log(`    Problem: ${firstExample.problem}`);
    console.log(`    Steps: ${firstExample.solution.length}`);
  }

  return academicDocument;
}

/**
 * Example: Custom configuration for different academic styles
 */
export function exampleCustomConfiguration() {
  console.log('\n=== Custom Configuration Example ===\n');

  // Configuration for a more compact style
  const compactConfig: Partial<AcademicStructureConfig> = {
    enableCrossReferences: false, // Disable to save space
    generateTableOfContents: true,
    numberingScheme: {
      sections: true,
      examples: false, // Don't number examples to save space
      formulas: true,
      theorems: true,
      definitions: false
    },
    partTitles: {
      part1: 'Probability Theory',
      part2: 'Relation Theory'
    },
    sectionTitles: {
      probability: [
        'Fundamentals',
        'Set Operations',
        'Conditional Events',
        'Bayes Rule',
        'Independence',
        'Trials',
        'Variables',
        'Statistics'
      ],
      relations: [
        'Definitions',
        'Properties',
        'Composition',
        'N-ary',
        'Algebra'
      ]
    }
  };

  const organizer = getAcademicStructureOrganizer(compactConfig);
  console.log('✅ Compact organizer created with custom configuration');
  console.log('- Cross-references disabled');
  console.log('- Examples not numbered');
  console.log('- Custom section titles');
  console.log('- Custom part titles');

  return organizer;
}

// Run examples if this file is executed directly
if (require.main === module) {
  exampleAcademicStructureOrganization()
    .then(() => {
      exampleCustomConfiguration();
      console.log('\n✅ All examples completed successfully!');
    })
    .catch(error => {
      console.error('❌ Example failed:', error);
    });
}