// Example usage of the Relations Content Processor

import { RelationsProcessor } from './relations-processor';
import { SourceDocument, ProcessingResult } from './processing-pipeline';
import { EnhancedExtractedContent, MathematicalContent } from './types';

/**
 * Example demonstrating relations content processing
 */
export async function demonstrateRelationsProcessing(): Promise<void> {
  console.log('=== Relations Content Processing Example ===\n');

  // Create relations processor
  const processor = new RelationsProcessor();

  // Sample relations document content
  const sampleRelationsText = `
# Relations and Their Properties

## 1. Basic Definitions

A **relation** R from set A to set B is a subset of the Cartesian product A × B.
We write R ⊆ A × B, and if (a,b) ∈ R, we say "a is related to b" and write aRb.

The **domain** of R is Dom(R) = {a ∈ A | ∃b ∈ B, (a,b) ∈ R}
The **range** of R is Ran(R) = {b ∈ B | ∃a ∈ A, (a,b) ∈ R}

## 2. Relation Properties

### 2.1 Reflexive Property
A relation R on set A is **reflexive** if ∀a ∈ A, aRa.
In other words, every element is related to itself.

### 2.2 Symmetric Property  
A relation R on set A is **symmetric** if ∀a,b ∈ A, aRb → bRa.
If a is related to b, then b is related to a.

### 2.3 Transitive Property
A relation R on set A is **transitive** if ∀a,b,c ∈ A, (aRb ∧ bRc) → aRc.
If a is related to b and b is related to c, then a is related to c.

### 2.4 Antisymmetric Property
A relation R on set A is **antisymmetric** if ∀a,b ∈ A, (aRb ∧ bRa) → a = b.

## 3. Combining Relations

### 3.1 Union of Relations
R₁ ∪ R₂ = {(a,b) | (a,b) ∈ R₁ ∨ (a,b) ∈ R₂}

### 3.2 Intersection of Relations
R₁ ∩ R₂ = {(a,b) | (a,b) ∈ R₁ ∧ (a,b) ∈ R₂}

### 3.3 Composition of Relations
R₁ ∘ R₂ = {(a,c) | ∃b: (a,b) ∈ R₁ ∧ (b,c) ∈ R₂}

## 4. Example: Checking Relation Properties

**Example 4.1:** Let A = {1, 2, 3} and R = {(1,1), (2,2), (3,3), (1,2), (2,1)}.
Check if R is reflexive, symmetric, and transitive.

**Solution:**
Step 1: Check reflexive property
- Need (1,1) ∈ R ✓
- Need (2,2) ∈ R ✓  
- Need (3,3) ∈ R ✓
Therefore, R is reflexive.

Step 2: Check symmetric property
- (1,2) ∈ R and (2,1) ∈ R ✓
- All other pairs are symmetric
Therefore, R is symmetric.

Step 3: Check transitive property
- (1,2) ∈ R and (2,1) ∈ R, so we need (1,1) ∈ R ✓
- (2,1) ∈ R and (1,2) ∈ R, so we need (2,2) ∈ R ✓
Therefore, R is transitive.

## 5. SQL-Style Operations

### 5.1 Selection Operation
σ_condition(R) = {t ∈ R | condition(t)}

Example: σ_age>25(Employee) selects all employees older than 25.

### 5.2 Projection Operation  
π_attributes(R) = {t[attributes] | t ∈ R}

Example: π_name,salary(Employee) projects only name and salary columns.

### 5.3 Join Operation
R ⋈ S = {t₁ ∪ t₂ | t₁ ∈ R ∧ t₂ ∈ S ∧ compatible(t₁,t₂)}

SQL Example:
SELECT * FROM Employee E JOIN Department D ON E.dept_id = D.id;
`;

  // Create mock extracted content
  const extractedContent: EnhancedExtractedContent = {
    text: sampleRelationsText,
    images: [],
    tables: [],
    metadata: {
      name: 'relations_sample.pdf',
      size: 50000,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 5,
      wordCount: 800,
      mathContentDensity: 0.7,
      hasWorkedExamples: true,
      academicLevel: 'undergraduate'
    },
    structure: {
      headings: [
        { level: 1, text: 'Relations and Their Properties', position: 0 },
        { level: 2, text: 'Basic Definitions', position: 100 },
        { level: 2, text: 'Relation Properties', position: 300 },
        { level: 2, text: 'Combining Relations', position: 600 },
        { level: 2, text: 'Example: Checking Relation Properties', position: 800 },
        { level: 2, text: 'SQL-Style Operations', position: 1200 }
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
      totalFormulasFound: 0,
      formulasPreserved: 0,
      totalExamplesFound: 0,
      examplesPreserved: 0,
      preservationScore: 1.0,
      issues: [],
      validationResults: []
    }
  };

  // Create mock source document
  const sourceDoc: SourceDocument = {
    id: 'relations_sample_001',
    file: new File([''], 'relations_sample.pdf', { type: 'application/pdf' }),
    type: 'relations',
    extractedContent,
    errors: [],
    warnings: [],
    processingStages: []
  };

  // Process the document
  console.log('Processing relations document...');
  const result: ProcessingResult = await processor.process([sourceDoc], {
    confidenceThreshold: 0.7,
    enableLatexConversion: true,
    enableWorkedExampleDetection: true,
    enableDefinitionExtraction: true,
    enableTheoremExtraction: true
  });

  // Display results
  if (result.success && result.data) {
    const content = result.data[0] as MathematicalContent;
    
    console.log(`✅ Processing successful!`);
    console.log(`📊 Processing metrics:`);
    console.log(`   - Processing time: ${result.metrics.processingTime}ms`);
    console.log(`   - Content preserved: ${(result.metrics.contentPreserved * 100).toFixed(1)}%`);
    console.log(`   - Quality score: ${(result.metrics.qualityScore * 100).toFixed(1)}%`);
    console.log(`   - Items processed: ${result.metrics.itemsProcessed}`);
    
    console.log(`\n📚 Extracted content:`);
    console.log(`   - Formulas: ${content.formulas.length}`);
    console.log(`   - Worked examples: ${content.workedExamples.length}`);
    console.log(`   - Definitions: ${content.definitions.length}`);
    console.log(`   - Theorems: ${content.theorems.length}`);

    // Show sample extracted content
    if (content.definitions.length > 0) {
      console.log(`\n🔍 Sample definition:`);
      const def = content.definitions[0];
      console.log(`   Term: ${def.term}`);
      console.log(`   Definition: ${def.definition.substring(0, 100)}...`);
    }

    if (content.formulas.length > 0) {
      console.log(`\n🧮 Sample formula:`);
      const formula = content.formulas[0];
      console.log(`   LaTeX: ${formula.latex}`);
      console.log(`   Context: ${formula.context.substring(0, 80)}...`);
      console.log(`   Type: ${formula.type}`);
    }

    if (content.workedExamples.length > 0) {
      console.log(`\n📝 Sample worked example:`);
      const example = content.workedExamples[0];
      console.log(`   Title: ${example.title}`);
      console.log(`   Problem: ${example.problem.substring(0, 100)}...`);
      console.log(`   Solution steps: ${example.solution.length}`);
      if (example.solution.length > 0) {
        console.log(`   First step: ${example.solution[0].description.substring(0, 80)}...`);
      }
    }

    // Show any warnings or errors
    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => {
        console.log(`   - ${warning.message}`);
      });
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(error => {
        console.log(`   - ${error.message}`);
      });
    }

  } else {
    console.log('❌ Processing failed');
    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach(error => {
        console.log(`   - ${error.message}`);
      });
    }
  }

  console.log('\n=== Relations Processing Example Complete ===');
}

/**
 * Example demonstrating specific relation property extraction
 */
export async function demonstrateRelationPropertyExtraction(): Promise<void> {
  console.log('\n=== Relation Property Extraction Example ===\n');

  const processor = new RelationsProcessor();

  const propertyExampleText = `
## Relation Property Verification

**Example:** Let A = {a, b, c, d} and R = {(a,a), (b,b), (c,c), (d,d), (a,b), (b,c), (a,c)}.
Determine which properties R satisfies.

**Solution:**

**Reflexive Check:**
- (a,a) ∈ R ✓
- (b,b) ∈ R ✓  
- (c,c) ∈ R ✓
- (d,d) ∈ R ✓
Since all elements are related to themselves, R is reflexive.

**Symmetric Check:**
- (a,b) ∈ R but (b,a) ∉ R ✗
Since not all pairs are symmetric, R is not symmetric.

**Transitive Check:**
- (a,b) ∈ R and (b,c) ∈ R, and (a,c) ∈ R ✓
- All other transitive requirements are satisfied
Therefore, R is transitive.

**Antisymmetric Check:**
- For (a,b) ∈ R, we have (b,a) ∉ R, so no contradiction
- For all other pairs, the antisymmetric condition holds
Therefore, R is antisymmetric.

**Conclusion:** R is reflexive, transitive, and antisymmetric, but not symmetric.
`;

  const extractedContent: EnhancedExtractedContent = {
    text: propertyExampleText,
    images: [],
    tables: [],
    metadata: {
      name: 'relation_properties.pdf',
      size: 25000,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 2,
      wordCount: 300,
      mathContentDensity: 0.8,
      hasWorkedExamples: true,
      academicLevel: 'undergraduate'
    },
    structure: {
      headings: [
        { level: 2, text: 'Relation Property Verification', position: 0 }
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
      totalFormulasFound: 0,
      formulasPreserved: 0,
      totalExamplesFound: 0,
      examplesPreserved: 0,
      preservationScore: 1.0,
      issues: [],
      validationResults: []
    }
  };

  const sourceDoc: SourceDocument = {
    id: 'relation_properties_001',
    file: new File([''], 'relation_properties.pdf', { type: 'application/pdf' }),
    type: 'relations',
    extractedContent,
    errors: [],
    warnings: [],
    processingStages: []
  };

  console.log('Processing relation property verification example...');
  const result = await processor.process([sourceDoc], {
    confidenceThreshold: 0.7,
    enableWorkedExampleDetection: true
  });

  if (result.success && result.data) {
    const content = result.data[0] as MathematicalContent;
    console.log(`✅ Extracted ${content.workedExamples.length} worked examples`);
    
    if (content.workedExamples.length > 0) {
      const example = content.workedExamples[0];
      console.log(`\n📝 Property verification example:`);
      console.log(`   Title: ${example.title}`);
      console.log(`   Steps: ${example.solution.length}`);
      
      example.solution.forEach((step, index) => {
        console.log(`   Step ${step.stepNumber}: ${step.description.substring(0, 60)}...`);
      });
    }
  }

  console.log('\n=== Property Extraction Example Complete ===');
}

// Export demonstration functions
export { demonstrateRelationsProcessing, demonstrateRelationPropertyExtraction };

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await demonstrateRelationsProcessing();
      await demonstrateRelationPropertyExtraction();
    } catch (error) {
      console.error('Example execution failed:', error);
    }
  })();
}