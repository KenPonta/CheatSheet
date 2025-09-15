import {
  processCompactStudyDocuments,
  generateCompactHTML,
  PDFOutputGenerator,
  generateCompactMarkdown,
  CompactLayoutEngine,
  type CompactLayoutConfig,
  type PipelineOrchestratorConfig,
  type AcademicDocument,
  type HTMLOutput,
  type PDFOutput,
  type MarkdownOutput
} from '../index';

// Real-world test content that matches the requirements
const discreteProbabilityTestContent = `
# Discrete Probability Study Material

## 1.1 Probability Basics

The probability of an event A is defined as the ratio of favorable outcomes to total outcomes:

P(A) = |A| / |S|

where |A| is the number of elements in event A and |S| is the size of the sample space.

### Complement and Union Rules

For any events A and B:
- P(A^c) = 1 - P(A)
- P(A ∪ B) = P(A) + P(B) - P(A ∩ B)

### Example 1.1: Rolling Dice
Problem: What is the probability of rolling a sum of 7 with two fair dice?

Solution:
Step 1: Identify the sample space
S = {(1,1), (1,2), ..., (6,6)} with |S| = 36

Step 2: Identify favorable outcomes
A = {(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)} with |A| = 6

Step 3: Calculate probability
P(A) = 6/36 = 1/6

## 1.2 Conditional Probability

The conditional probability of A given B is:

P(A|B) = P(A ∩ B) / P(B)

provided P(B) > 0.

### Bayes' Theorem

For events A and B with P(B) > 0:

P(A|B) = P(B|A) × P(A) / P(B)

### Example 1.2: Medical Diagnosis
Problem: A medical test is 95% accurate. If 2% of the population has the disease, what is the probability that a person who tests positive actually has the disease?

Solution:
Step 1: Define events
- D = person has disease, P(D) = 0.02
- T = test is positive
- P(T|D) = 0.95 (sensitivity)
- P(T|D^c) = 0.05 (false positive rate)

Step 2: Calculate P(T) using law of total probability
P(T) = P(T|D)P(D) + P(T|D^c)P(D^c)
P(T) = 0.95 × 0.02 + 0.05 × 0.98 = 0.068

Step 3: Apply Bayes' theorem
P(D|T) = P(T|D) × P(D) / P(T) = 0.95 × 0.02 / 0.068 ≈ 0.279

## 1.3 Independence and Bernoulli Trials

Events A and B are independent if P(A ∩ B) = P(A) × P(B).

For Bernoulli trials with success probability p:
- P(X = k) = C(n,k) × p^k × (1-p)^(n-k)

### Example 1.3: Coin Flips
Problem: What is the probability of getting exactly 3 heads in 5 coin flips?

Solution:
P(X = 3) = C(5,3) × (1/2)^3 × (1/2)^2 = 10 × (1/2)^5 = 10/32 = 5/16

## 1.4 Random Variables and Expected Value

For a discrete random variable X:

E[X] = Σ x × P(X = x)

Variance: Var(X) = E[X^2] - (E[X])^2

Standard deviation: σ = √Var(X)

### Example 1.4: Expected Value Calculation
Problem: A game costs $2 to play. You win $10 with probability 0.1, $5 with probability 0.2, and $0 otherwise. What is the expected profit?

Solution:
Step 1: Define the profit random variable
X = winnings - cost = {8, 3, -2} with probabilities {0.1, 0.2, 0.7}

Step 2: Calculate expected value
E[X] = 8 × 0.1 + 3 × 0.2 + (-2) × 0.7 = 0.8 + 0.6 - 1.4 = 0

The game is fair (expected profit = 0).
`;

const relationsTestContent = `
# Relations Study Material

## 2.1 Relation Definitions

A relation R on a set A is a subset of the Cartesian product A × A.

For elements a, b ∈ A, we write aRb if (a,b) ∈ R.

### Basic Notation
- Domain: dom(R) = {a ∈ A | ∃b ∈ A: (a,b) ∈ R}
- Range: ran(R) = {b ∈ A | ∃a ∈ A: (a,b) ∈ R}

## 2.2 Relation Properties

### Reflexive
A relation R is reflexive if ∀a ∈ A: (a,a) ∈ R

### Irreflexive  
A relation R is irreflexive if ∀a ∈ A: (a,a) ∉ R

### Symmetric
A relation R is symmetric if ∀a,b ∈ A: (a,b) ∈ R → (b,a) ∈ R

### Antisymmetric
A relation R is antisymmetric if ∀a,b ∈ A: ((a,b) ∈ R ∧ (b,a) ∈ R) → a = b

### Transitive
A relation R is transitive if ∀a,b,c ∈ A: ((a,b) ∈ R ∧ (b,c) ∈ R) → (a,c) ∈ R

### Example 2.1: Property Analysis
Problem: Analyze the relation R = {(1,1), (2,2), (3,3), (1,2), (2,3), (1,3)} on A = {1,2,3}.

Solution:
Step 1: Check reflexivity
(1,1), (2,2), (3,3) ∈ R ✓ Reflexive

Step 2: Check symmetry  
(1,2) ∈ R but (2,1) ∉ R ✗ Not symmetric

Step 3: Check antisymmetry
No pairs (a,b) and (b,a) with a ≠ b ✓ Antisymmetric

Step 4: Check transitivity
(1,2) ∈ R, (2,3) ∈ R, and (1,3) ∈ R ✓ Transitive

Conclusion: R is reflexive, antisymmetric, and transitive (partial order).

## 2.3 Combining Relations

Given relations R and S on set A:

### Union
R ∪ S = {(a,b) | (a,b) ∈ R ∨ (a,b) ∈ S}

### Intersection  
R ∩ S = {(a,b) | (a,b) ∈ R ∧ (a,b) ∈ S}

### Composition
R ∘ S = {(a,c) | ∃b ∈ A: (a,b) ∈ S ∧ (b,c) ∈ R}

### Example 2.2: Relation Composition
Problem: Let R = {(1,2), (2,3), (3,1)} and S = {(1,3), (2,1), (3,2)} on A = {1,2,3}. Find R ∘ S.

Solution:
Step 1: For each (a,b) ∈ S, find (b,c) ∈ R
- (1,3) ∈ S, (3,1) ∈ R → (1,1) ∈ R ∘ S
- (2,1) ∈ S, (1,2) ∈ R → (2,2) ∈ R ∘ S  
- (3,2) ∈ S, (2,3) ∈ R → (3,3) ∈ R ∘ S

Therefore: R ∘ S = {(1,1), (2,2), (3,3)}

## 2.4 N-ary Relations and Database Operations

An n-ary relation is a subset of A₁ × A₂ × ... × Aₙ.

### SQL-Style Operations

Selection: σ_condition(R) = {t ∈ R | condition(t)}
Projection: π_attributes(R) = {(t.a₁, t.a₂, ...) | t ∈ R}
Join: R ⋈ S = {(r,s) | r ∈ R, s ∈ S, join_condition(r,s)}

### Example 2.3: Database Query
Problem: Given Student(ID, Name, Major) and Enrollment(StudentID, Course, Grade), find all Computer Science students with A grades.

Solution:
Step 1: Select CS students
CS_Students = σ_Major='CS'(Student)

Step 2: Select A grades  
A_Grades = σ_Grade='A'(Enrollment)

Step 3: Join on student ID
Result = π_Name,Course(CS_Students ⋈_ID=StudentID A_Grades)

## 2.5 Equivalence Relations and Partitions

An equivalence relation is reflexive, symmetric, and transitive.

Every equivalence relation induces a partition of the set into equivalence classes:
[a] = {b ∈ A | aRb}

### Example 2.4: Modular Arithmetic
Problem: Show that congruence modulo 3 is an equivalence relation on ℤ.

Solution:
Define aRb iff 3|(a-b)

Step 1: Reflexive
3|(a-a) = 3|0 ✓

Step 2: Symmetric  
If 3|(a-b), then 3|(b-a) ✓

Step 3: Transitive
If 3|(a-b) and 3|(b-c), then 3|(a-c) ✓

Equivalence classes: [0] = {...,-3,0,3,6,...}, [1] = {...,-2,1,4,7,...}, [2] = {...,-1,2,5,8,...}
`;

// Create mock File objects with realistic content
function createTestFile(name: string, content: string): File {
  const blob = new Blob([content], { type: 'application/pdf' });
  return new File([blob], name, { type: 'application/pdf' });
}

describe('Acceptance Criteria Validation Tests', () => {
  let compactLayoutConfig: CompactLayoutConfig;
  let standardLayoutConfig: CompactLayoutConfig;
  let pipelineConfig: PipelineOrchestratorConfig;

  beforeEach(() => {
    // Compact layout configuration (Requirements 3.1-3.6)
    compactLayoutConfig = {
      paperSize: 'a4',
      columns: 2,
      typography: {
        fontSize: 10,
        lineHeight: 1.15, // Requirement 3.2
        fontFamily: {
          body: 'Times, serif',
          heading: 'Times, serif',
          math: 'Computer Modern, serif',
          code: 'Courier, monospace'
        }
      },
      spacing: {
        paragraphSpacing: 0.25, // ≤ 0.35em (Requirement 3.3)
        listSpacing: 0.15, // ≤ 0.25em (Requirement 3.4)
        sectionSpacing: 0.5,
        headingMargins: {
          top: 0.5, // Compact H2/H3 headings (Requirement 3.6)
          bottom: 0.25
        }
      },
      margins: {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      },
      mathRendering: {
        displayEquations: {
          centered: true, // Requirement 3.5
          numbered: true,
          fullWidth: true // Allow full-width for overflow
        },
        inlineEquations: {
          preserveInline: true,
          maxHeight: 12
        }
      }
    };

    // Standard layout for comparison
    standardLayoutConfig = {
      ...compactLayoutConfig,
      columns: 1,
      typography: {
        ...compactLayoutConfig.typography,
        lineHeight: 1.5
      },
      spacing: {
        paragraphSpacing: 0.75,
        listSpacing: 0.5,
        sectionSpacing: 1.0,
        headingMargins: {
          top: 1.0,
          bottom: 0.75
        }
      }
    };

    // Pipeline configuration
    pipelineConfig = {
      enableProgressTracking: true,
      enableErrorRecovery: true,
      structureConfig: {
        title: 'Discrete Probability & Relations Study Guide',
        enableNumbering: true,
        enableTableOfContents: true,
        partTitles: {
          probability: 'Part I: Discrete Probability',
          relations: 'Part II: Relations'
        }
      },
      mathExtractionConfig: {
        enableLatexConversion: true,
        enableWorkedExampleDetection: true,
        confidenceThreshold: 0.5,
        preserveAllFormulas: true // Requirement 4.1
      }
    };
  });

  describe('Requirement 1: Mathematical Content Extraction and Preservation', () => {
    it('should extract all mathematical formulas, definitions, and worked examples (1.1)', async () => {
      const files = [
        {
          file: createTestFile('discrete-probability.pdf', discreteProbabilityTestContent),
          type: 'probability' as const
        },
        {
          file: createTestFile('relations.pdf', relationsTestContent),
          type: 'relations' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);

      // Validate extraction of mathematical content
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const totalFormulas = allSections.reduce((sum, section) => sum + section.formulas.length, 0);
      const totalExamples = allSections.reduce((sum, section) => sum + section.examples.length, 0);

      expect(totalFormulas).toBeGreaterThan(10); // Should extract key formulas
      expect(totalExamples).toBeGreaterThan(6); // Should extract worked examples

      // Check for specific formulas from test content
      const formulaTexts = allSections.flatMap(s => s.formulas.map(f => f.latex));
      expect(formulaTexts.some(f => f.includes('P(A)'))).toBe(true);
      expect(formulaTexts.some(f => f.includes('E[X]'))).toBe(true);
      expect(formulaTexts.some(f => f.includes('Var(X)'))).toBe(true);
    });

    it('should preserve every important formula found in source materials (1.2)', async () => {
      const files = [{
        file: createTestFile('probability-formulas.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      // Key formulas that should be preserved
      const expectedFormulas = [
        'P(A) = |A| / |S|',
        'P(A|B) = P(A ∩ B) / P(B)',
        'E[X] = Σ x × P(X = x)',
        'Var(X) = E[X^2] - (E[X])^2'
      ];

      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const extractedContent = allSections.map(s => s.content).join(' ');
      const formulaTexts = allSections.flatMap(s => s.formulas.map(f => f.latex));

      expectedFormulas.forEach(formula => {
        const isPreserved = extractedContent.includes(formula) || 
                           formulaTexts.some(f => f.includes(formula.replace(/[|×]/g, '')));
        expect(isPreserved).toBe(true);
      });
    });

    it('should include at least one fully worked example per subtopic (1.3)', async () => {
      const files = [{
        file: createTestFile('worked-examples.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const allExamples = allSections.flatMap(s => s.examples);

      // Each example should have complete solution steps
      allExamples.forEach(example => {
        expect(example.solution).toBeDefined();
        expect(example.solution.length).toBeGreaterThan(0);
        
        // Each step should have description and explanation
        example.solution.forEach(step => {
          expect(step.description).toBeDefined();
          expect(step.explanation).toBeDefined();
          expect(step.stepNumber).toBeGreaterThan(0);
        });
      });

      // Should have examples for different subtopics
      const subtopics = [...new Set(allExamples.map(e => e.subtopic))];
      expect(subtopics.length).toBeGreaterThan(3);
    });

    it('should eliminate all card/box UI elements (1.4)', async () => {
      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      // Check that no card/box styling is present
      expect(htmlOutput.html).not.toContain('card');
      expect(htmlOutput.html).not.toContain('box-shadow');
      expect(htmlOutput.css).not.toContain('border-radius');
      expect(htmlOutput.css).not.toContain('box-shadow');
      expect(htmlOutput.css).not.toContain('.card');
    });

    it('should generate study_compact files with dense typography (1.5)', async () => {
      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      // Test HTML output
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      expect(htmlOutput.html).toBeDefined();
      expect(htmlOutput.css).toContain('font-size: 10pt');
      expect(htmlOutput.css).toContain('line-height: 1.15');

      // Test PDF output
      const pdfGenerator = new PDFOutputGenerator();
      const pdfOutput = await pdfGenerator.generatePDF(academicDocument, compactLayoutConfig);
      expect(pdfOutput.buffer).toBeDefined();
      expect(pdfOutput.pageCount).toBeGreaterThan(0);

      // Test Markdown output
      const markdownOutput = await generateCompactMarkdown(academicDocument, {
        includeFrontMatter: true,
        includeTableOfContents: true,
        mathDelimiters: 'latex',
        codeBlocks: true,
        preserveLineBreaks: false,
        pandocCompatible: true,
        generateTemplate: true
      }, compactLayoutConfig);

      expect(markdownOutput.markdown).toBeDefined();
      expect(markdownOutput.pandocTemplate).toBeDefined();
    });
  });

  describe('Requirement 2: Academic Structure Organization', () => {
    it('should structure Part I as Discrete Probability with numbered subsections (2.1)', async () => {
      const files = [{
        file: createTestFile('discrete-probability.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const probabilityPart = academicDocument.parts.find(p => p.title.includes('Discrete Probability'));
      expect(probabilityPart).toBeDefined();
      expect(probabilityPart!.partNumber).toBe(1);
      expect(probabilityPart!.sections.length).toBeGreaterThan(3); // Should have multiple sections

      // Check section numbering
      probabilityPart!.sections.forEach((section, index) => {
        expect(section.sectionNumber).toMatch(/^1\.\d+$/); // Format: 1.1, 1.2, etc.
      });
    });

    it('should structure Part II as Relations with numbered subsections (2.2)', async () => {
      const files = [{
        file: createTestFile('relations.pdf', relationsTestContent),
        type: 'relations' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const relationsPart = academicDocument.parts.find(p => p.title.includes('Relations'));
      expect(relationsPart).toBeDefined();
      expect(relationsPart!.partNumber).toBe(2);
      expect(relationsPart!.sections.length).toBeGreaterThan(3);

      // Check section numbering
      relationsPart!.sections.forEach((section, index) => {
        expect(section.sectionNumber).toMatch(/^2\.\d+$/); // Format: 2.1, 2.2, etc.
      });
    });

    it('should include table of contents with page anchors (2.3)', async () => {
      const files = [
        {
          file: createTestFile('discrete-probability.pdf', discreteProbabilityTestContent),
          type: 'probability' as const
        },
        {
          file: createTestFile('relations.pdf', relationsTestContent),
          type: 'relations' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      expect(academicDocument.tableOfContents).toBeDefined();
      expect(academicDocument.tableOfContents.length).toBeGreaterThan(0);

      // Each TOC entry should have required properties
      academicDocument.tableOfContents.forEach(entry => {
        expect(entry.id).toBeDefined();
        expect(entry.title).toBeDefined();
        expect(entry.level).toBeGreaterThan(0);
        expect(entry.pageNumber).toBeGreaterThan(0);
      });
    });

    it('should provide numbered theorems, definitions, and examples (2.4)', async () => {
      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const allExamples = allSections.flatMap(s => s.examples);

      // Examples should have proper IDs and numbering
      allExamples.forEach(example => {
        expect(example.id).toBeDefined();
        expect(example.title).toBeDefined();
        expect(example.id).toMatch(/example\d+\.\d+/); // Format: example1.1, example2.3, etc.
      });
    });

    it('should include cross-references using "see Ex. X.Y" format (2.5)', async () => {
      const files = [
        {
          file: createTestFile('discrete-probability.pdf', discreteProbabilityTestContent),
          type: 'probability' as const
        },
        {
          file: createTestFile('relations.pdf', relationsTestContent),
          type: 'relations' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      expect(academicDocument.crossReferences).toBeDefined();
      
      // Cross-references should use proper format
      academicDocument.crossReferences.forEach(ref => {
        expect(ref.displayText).toMatch(/see (Ex\.|Eq\.|Sec\.) \d+\.\d+/);
        expect(ref.type).toMatch(/^(example|formula|section|theorem)$/);
      });
    });
  });

  describe('Requirement 3: Compact Typography and Layout', () => {
    it('should use two-column layout for A4/Letter paper (3.1)', async () => {
      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      expect(htmlOutput.css).toContain('column-count: 2');
      expect(compactLayoutConfig.columns).toBe(2);
      expect(compactLayoutConfig.paperSize).toBe('a4');
    });

    it('should use line-height between 1.15-1.25 (3.2)', async () => {
      expect(compactLayoutConfig.typography.lineHeight).toBeGreaterThanOrEqual(1.15);
      expect(compactLayoutConfig.typography.lineHeight).toBeLessThanOrEqual(1.25);

      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      expect(htmlOutput.css).toContain('line-height: 1.15');
    });

    it('should use paragraph spacing ≤ 0.35em (3.3)', async () => {
      expect(compactLayoutConfig.spacing.paragraphSpacing).toBeLessThanOrEqual(0.35);

      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      // CSS should reflect compact paragraph spacing
      expect(htmlOutput.css).toMatch(/margin.*0\.25em|padding.*0\.25em/);
    });

    it('should use list spacing ≤ 0.25em (3.4)', async () => {
      expect(compactLayoutConfig.spacing.listSpacing).toBeLessThanOrEqual(0.25);

      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      // Should have compact list styling
      expect(htmlOutput.css).toMatch(/li.*margin.*0\.(1|2)/);
    });

    it('should center display equations with numbering and allow full-width (3.5)', async () => {
      expect(compactLayoutConfig.mathRendering.displayEquations.centered).toBe(true);
      expect(compactLayoutConfig.mathRendering.displayEquations.numbered).toBe(true);
      expect(compactLayoutConfig.mathRendering.displayEquations.fullWidth).toBe(true);

      const files = [{
        file: createTestFile('math-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      expect(htmlOutput.css).toMatch(/\.formula.*text-align:\s*center/);
      expect(htmlOutput.html).toContain('$$'); // Display math blocks
    });

    it('should use compact H2/H3 headings with minimal top margin (3.6)', async () => {
      expect(compactLayoutConfig.spacing.headingMargins.top).toBeLessThanOrEqual(0.75);

      const files = [{
        file: createTestFile('test-content.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      expect(htmlOutput.css).toMatch(/h[23].*margin-top.*0\.[0-5]/);
    });
  });

  describe('Requirement 4: Mathematical Content Preservation and Formatting', () => {
    it('should never drop formulas, identities, or probability laws (4.1)', async () => {
      const files = [{
        file: createTestFile('comprehensive-math.pdf', discreteProbabilityTestContent + relationsTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const allFormulas = allSections.flatMap(s => s.formulas);

      // Should preserve key mathematical content
      const formulaTexts = allFormulas.map(f => f.latex).join(' ');
      const contentTexts = allSections.map(s => s.content).join(' ');
      const allText = formulaTexts + ' ' + contentTexts;

      // Key probability laws and identities
      const keyMathContent = [
        'P(A)', 'P(B)', 'E[X]', 'Var(X)', 'Bayes', 'conditional', 'independence'
      ];

      keyMathContent.forEach(content => {
        expect(allText.toLowerCase()).toContain(content.toLowerCase());
      });

      expect(allFormulas.length).toBeGreaterThan(5); // Should extract multiple formulas
    });

    it('should render equations using LaTeX/MathJax/KaTeX (4.2)', async () => {
      const files = [{
        file: createTestFile('math-heavy.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      // Should include MathJax configuration
      expect(htmlOutput.mathJaxConfig).toBeDefined();
      expect(htmlOutput.html).toContain('MathJax');
      
      // Should have LaTeX-style math delimiters
      expect(htmlOutput.html).toMatch(/\$\$.*\$\$|\\\[.*\\\]/);
    });

    it('should keep inline math inline and display math centered (4.3)', async () => {
      const files = [{
        file: createTestFile('mixed-math.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const allFormulas = allSections.flatMap(s => s.formulas);

      // Should have both inline and display formulas
      const inlineFormulas = allFormulas.filter(f => f.type === 'inline');
      const displayFormulas = allFormulas.filter(f => f.type === 'display');

      expect(inlineFormulas.length).toBeGreaterThan(0);
      expect(displayFormulas.length).toBeGreaterThan(0);

      // Configuration should preserve inline math
      expect(compactLayoutConfig.mathRendering.inlineEquations.preserveInline).toBe(true);
    });

    it('should show complete solution steps for each worked example (4.4)', async () => {
      const files = [{
        file: createTestFile('worked-examples.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      const allExamples = allSections.flatMap(s => s.examples);

      expect(allExamples.length).toBeGreaterThan(0);

      allExamples.forEach(example => {
        expect(example.solution).toBeDefined();
        expect(example.solution.length).toBeGreaterThan(0);
        
        // Each solution step should be complete
        example.solution.forEach((step, index) => {
          expect(step.stepNumber).toBe(index + 1);
          expect(step.description).toBeDefined();
          expect(step.explanation).toBeDefined();
          expect(step.description.length).toBeGreaterThan(0);
          expect(step.explanation.length).toBeGreaterThan(0);
        });
      });
    });

    it('should include one fully worked example and list others as exercises (4.5)', async () => {
      const files = [{
        file: createTestFile('multiple-examples.pdf', discreteProbabilityTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      const allSections = academicDocument.parts.flatMap(p => p.sections);
      
      // Each section should have at least one fully worked example
      allSections.forEach(section => {
        if (section.examples.length > 0) {
          const fullyWorkedExamples = section.examples.filter(ex => 
            ex.solution && ex.solution.length > 0
          );
          expect(fullyWorkedExamples.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Performance and Quality Validation', () => {
    it('should demonstrate page count reduction with compact layout', async () => {
      const files = [{
        file: createTestFile('large-content.pdf', discreteProbabilityTestContent + relationsTestContent),
        type: 'probability' as const
      }];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      
      // Generate both compact and standard layouts
      const compactPDF = await new PDFOutputGenerator().generatePDF(academicDocument, compactLayoutConfig);
      const standardPDF = await new PDFOutputGenerator().generatePDF(academicDocument, standardLayoutConfig);

      // Compact layout should use fewer pages
      expect(compactPDF.pageCount).toBeLessThanOrEqual(standardPDF.pageCount);
      expect(compactPDF.metadata.stats.estimatedPrintPages).toBeLessThanOrEqual(
        standardPDF.metadata.stats.estimatedPrintPages
      );
    });

    it('should maintain high content preservation scores', async () => {
      const files = [
        {
          file: createTestFile('discrete-probability.pdf', discreteProbabilityTestContent),
          type: 'probability' as const
        },
        {
          file: createTestFile('relations.pdf', relationsTestContent),
          type: 'relations' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const htmlOutput = await generateCompactHTML(academicDocument, {
        includeTableOfContents: true,
        includeMathJax: true,
        compactMode: true,
        removeCardComponents: true,
        generateResponsive: true
      }, compactLayoutConfig);

      expect(htmlOutput.metadata.preservationScore).toBeGreaterThan(0.85); // High preservation
    });

    it('should process documents efficiently within time limits', async () => {
      const startTime = Date.now();

      const files = [
        {
          file: createTestFile('discrete-probability.pdf', discreteProbabilityTestContent),
          type: 'probability' as const
        },
        {
          file: createTestFile('relations.pdf', relationsTestContent),
          type: 'relations' as const
        }
      ];

      const academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
      const processingTime = Date.now() - startTime;

      expect(academicDocument).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});