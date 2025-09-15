// Tests for content preservation validation system

import {
  ContentPreservationValidator,
  ValidationConfig,
  ContentValidationResult,
  FormulaValidationResult,
  ExampleValidationResult,
  CrossReferenceValidationResult,
  MathRenderingValidationResult,
  createContentPreservationValidator,
  DEFAULT_VALIDATION_CONFIG
} from '../content-preservation-validator';

import {
  EnhancedExtractedContent,
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  AcademicDocument,
  CrossReference,
  SolutionStep,
  SourceLocation,
  DocumentPart,
  AcademicSection
} from '../types';

describe('ContentPreservationValidator', () => {
  let validator: ContentPreservationValidator;
  let mockSourceContent: EnhancedExtractedContent;
  let mockProcessedDocument: AcademicDocument;

  beforeEach(() => {
    validator = new ContentPreservationValidator();
    
    // Create mock source content
    mockSourceContent = createMockSourceContent();
    
    // Create mock processed document
    mockProcessedDocument = createMockProcessedDocument();
  });

  describe('Constructor and Configuration', () => {
    it('should create validator with default configuration', () => {
      const defaultValidator = new ContentPreservationValidator();
      expect(defaultValidator).toBeInstanceOf(ContentPreservationValidator);
    });

    it('should create validator with custom configuration', () => {
      const customConfig: Partial<ValidationConfig> = {
        formulaPreservationThreshold: 0.9,
        strictMode: true
      };
      
      const customValidator = new ContentPreservationValidator(customConfig);
      expect(customValidator).toBeInstanceOf(ContentPreservationValidator);
    });

    it('should use factory function', () => {
      const factoryValidator = createContentPreservationValidator({
        enableDeepValidation: false
      });
      expect(factoryValidator).toBeInstanceOf(ContentPreservationValidator);
    });
  });

  describe('Formula Preservation Validation', () => {
    it('should validate formula preservation successfully', async () => {
      const result = await validator.validateContentPreservation(mockSourceContent);
      
      expect(result.formulaPreservation).toBeDefined();
      expect(result.formulaPreservation.type).toBe('formula_validation');
      expect(result.formulaPreservation.totalFormulasFound).toBeGreaterThan(0);
      expect(result.formulaPreservation.formulasPreserved).toBeGreaterThan(0);
      expect(result.formulaPreservation.preservationRate).toBeGreaterThan(0);
    });

    it('should detect missing formulas', async () => {
      // Create content with many source formulas but few extracted
      const contentWithMissingFormulas = {
        ...mockSourceContent,
        text: 'P(A) = 0.5, P(B|A) = 0.3, E[X] = μ, Var(X) = σ², ∑x²',
        mathematicalContent: {
          ...mockSourceContent.mathematicalContent,
          formulas: [mockSourceContent.mathematicalContent.formulas[0]] // Only one formula
        }
      };

      const result = await validator.validateContentPreservation(contentWithMissingFormulas);
      
      expect(result.formulaPreservation.preservationRate).toBeLessThan(1);
      expect(result.formulaPreservation.issues).toContainEqual(
        expect.objectContaining({
          type: 'formula_lost',
          severity: 'high'
        })
      );
    });

    it('should validate LaTeX syntax', async () => {
      // Create formula with invalid LaTeX
      const invalidLatexFormula: Formula = {
        id: 'invalid_formula',
        latex: '\\frac{1}{2', // Missing closing brace
        context: 'Invalid LaTeX example',
        type: 'display',
        sourceLocation: { fileId: 'test', page: 1 },
        isKeyFormula: true,
        confidence: 0.8
      };

      const contentWithInvalidLatex = {
        ...mockSourceContent,
        mathematicalContent: {
          ...mockSourceContent.mathematicalContent,
          formulas: [invalidLatexFormula]
        }
      };

      const result = await validator.validateContentPreservation(contentWithInvalidLatex);
      
      expect(result.formulaPreservation.formulasWithValidLatex).toBe(0);
      expect(result.formulaPreservation.issues).toContainEqual(
        expect.objectContaining({
          type: 'conversion_failed',
          formulaId: 'invalid_formula',
          latexError: 'Invalid LaTeX syntax'
        })
      );
    });

    it('should check context preservation', async () => {
      // Create formula without context
      const formulaWithoutContext: Formula = {
        id: 'no_context_formula',
        latex: 'P(A) = 0.5',
        context: '', // No context
        type: 'inline',
        sourceLocation: { fileId: 'test', page: 1 },
        isKeyFormula: false,
        confidence: 0.7
      };

      const contentWithoutContext = {
        ...mockSourceContent,
        mathematicalContent: {
          ...mockSourceContent.mathematicalContent,
          formulas: [formulaWithoutContext]
        }
      };

      const result = await validator.validateContentPreservation(contentWithoutContext);
      
      expect(result.formulaPreservation.formulasWithContext).toBe(0);
      expect(result.formulaPreservation.issues).toContainEqual(
        expect.objectContaining({
          type: 'context_missing',
          formulaId: 'no_context_formula'
        })
      );
    });
  });

  describe('Example Completeness Validation', () => {
    it('should validate example completeness successfully', async () => {
      const result = await validator.validateContentPreservation(mockSourceContent);
      
      expect(result.exampleCompleteness).toBeDefined();
      expect(result.exampleCompleteness.type).toBe('example_validation');
      expect(result.exampleCompleteness.totalExamplesFound).toBeGreaterThan(0);
      expect(result.exampleCompleteness.examplesPreserved).toBeGreaterThan(0);
    });

    it('should detect incomplete examples', async () => {
      // Create example without solution steps
      const incompleteExample: WorkedExample = {
        id: 'incomplete_example',
        title: 'Incomplete Example',
        problem: 'Find P(A ∩ B)',
        solution: [], // No solution steps
        sourceLocation: { fileId: 'test', page: 1 },
        subtopic: 'Probability',
        confidence: 0.8,
        isComplete: false
      };

      const contentWithIncompleteExample = {
        ...mockSourceContent,
        mathematicalContent: {
          ...mockSourceContent.mathematicalContent,
          workedExamples: [incompleteExample]
        }
      };

      const result = await validator.validateContentPreservation(contentWithIncompleteExample);
      
      expect(result.exampleCompleteness.completeExamples).toBe(0);
      expect(result.exampleCompleteness.issues).toContainEqual(
        expect.objectContaining({
          type: 'example_incomplete',
          exampleId: 'incomplete_example',
          incompleteSolution: true
        })
      );
    });

    it('should detect missing problem statements', async () => {
      const exampleWithoutProblem: WorkedExample = {
        id: 'no_problem_example',
        title: 'Example without problem',
        problem: '', // No problem statement
        solution: [
          {
            stepNumber: 1,
            description: 'Apply formula',
            explanation: 'Using the given formula'
          }
        ],
        sourceLocation: { fileId: 'test', page: 1 },
        subtopic: 'Probability',
        confidence: 0.8,
        isComplete: false
      };

      const contentWithoutProblem = {
        ...mockSourceContent,
        mathematicalContent: {
          ...mockSourceContent.mathematicalContent,
          workedExamples: [exampleWithoutProblem]
        }
      };

      const result = await validator.validateContentPreservation(contentWithoutProblem);
      
      expect(result.exampleCompleteness.issues).toContainEqual(
        expect.objectContaining({
          type: 'example_incomplete',
          exampleId: 'no_problem_example',
          missingProblemStatement: true
        })
      );
    });

    it('should validate solution step quality', async () => {
      const exampleWithPoorSteps: WorkedExample = {
        id: 'poor_steps_example',
        title: 'Example with poor steps',
        problem: 'Calculate probability',
        solution: [
          {
            stepNumber: 1,
            description: 'Do', // Very short description
            explanation: 'X'   // Very short explanation
          },
          {
            stepNumber: 2,
            description: '', // Empty description
            explanation: 'Apply the formula'
          }
        ],
        sourceLocation: { fileId: 'test', page: 1 },
        subtopic: 'Probability',
        confidence: 0.8,
        isComplete: true
      };

      const contentWithPoorSteps = {
        ...mockSourceContent,
        mathematicalContent: {
          ...mockSourceContent.mathematicalContent,
          workedExamples: [exampleWithPoorSteps]
        }
      };

      const result = await validator.validateContentPreservation(contentWithPoorSteps);
      
      expect(result.exampleCompleteness.issues).toContainEqual(
        expect.objectContaining({
          type: 'example_incomplete',
          exampleId: 'poor_steps_example',
          missingSteps: expect.any(Number)
        })
      );
    });
  });

  describe('Cross-Reference Integrity Validation', () => {
    it('should validate cross-references successfully', async () => {
      const result = await validator.validateContentPreservation(
        mockSourceContent, 
        mockProcessedDocument
      );
      
      expect(result.crossReferenceIntegrity).toBeDefined();
      expect(result.crossReferenceIntegrity.type).toBe('structure_validation');
      expect(result.crossReferenceIntegrity.totalReferences).toBeGreaterThan(0);
    });

    it('should detect broken cross-references', async () => {
      const brokenReference: CrossReference = {
        id: 'broken_ref',
        type: 'example',
        sourceId: 'valid_source',
        targetId: 'nonexistent_target', // This target doesn't exist
        displayText: 'see Ex. 999'
      };

      const documentWithBrokenRef = {
        ...mockProcessedDocument,
        crossReferences: [brokenReference]
      };

      const result = await validator.validateContentPreservation(
        mockSourceContent,
        documentWithBrokenRef
      );
      
      expect(result.crossReferenceIntegrity.brokenReferences).toBeGreaterThan(0);
      expect(result.crossReferenceIntegrity.issues).toContainEqual(
        expect.objectContaining({
          referenceId: 'broken_ref',
          targetId: 'nonexistent_target',
          brokenLink: true
        })
      );
    });

    it('should validate display text format', async () => {
      const invalidDisplayReference: CrossReference = {
        id: 'invalid_display_ref',
        type: 'example',
        sourceId: 'section_1_1',
        targetId: 'example_1',
        displayText: 'look at that thing' // Invalid format
      };

      const documentWithInvalidDisplay = {
        ...mockProcessedDocument,
        crossReferences: [invalidDisplayReference]
      };

      const result = await validator.validateContentPreservation(
        mockSourceContent,
        documentWithInvalidDisplay
      );
      
      expect(result.crossReferenceIntegrity.issues).toContainEqual(
        expect.objectContaining({
          referenceId: 'invalid_display_ref',
          type: 'context_missing'
        })
      );
    });

    it('should skip cross-reference validation when disabled', async () => {
      const validatorWithoutCrossRef = new ContentPreservationValidator({
        enableCrossReferenceValidation: false
      });

      const result = await validatorWithoutCrossRef.validateContentPreservation(
        mockSourceContent,
        mockProcessedDocument
      );
      
      expect(result.crossReferenceIntegrity.totalReferences).toBe(0);
      expect(result.crossReferenceIntegrity.passed).toBe(true);
      expect(result.crossReferenceIntegrity.details).toContain('disabled');
    });
  });

  describe('Mathematical Rendering Validation', () => {
    it('should validate math rendering successfully', async () => {
      const result = await validator.validateContentPreservation(mockSourceContent);
      
      expect(result.mathRenderingAccuracy).toBeDefined();
      expect(result.mathRenderingAccuracy.type).toBe('formula_validation');
      expect(result.mathRenderingAccuracy.totalMathElements).toBeGreaterThan(0);
    });

    it('should detect rendering issues', async () => {
      const unrenderableFormula: Formula = {
        id: 'unrenderable_formula',
        latex: '\\includegraphics{image.png}', // Graphics command not renderable
        context: 'Formula with graphics',
        type: 'display',
        sourceLocation: { fileId: 'test', page: 1 },
        isKeyFormula: false,
        confidence: 0.8
      };

      const contentWithUnrenderable = {
        ...mockSourceContent,
        mathematicalContent: {
          formulas: [unrenderableFormula], // Only the unrenderable formula
          workedExamples: [], // No examples
          definitions: [],
          theorems: []
        }
      };

      const result = await validator.validateContentPreservation(contentWithUnrenderable);
      
      expect(result.mathRenderingAccuracy.renderableElements).toBe(0);
      expect(result.mathRenderingAccuracy.issues).toContainEqual(
        expect.objectContaining({
          elementId: 'unrenderable_formula',
          type: 'conversion_failed'
        })
      );
    });

    it('should validate solution step math', async () => {
      const exampleWithMathSteps: WorkedExample = {
        id: 'math_steps_example',
        title: 'Example with math steps',
        problem: 'Calculate probability',
        solution: [
          {
            stepNumber: 1,
            description: 'Apply Bayes theorem',
            formula: '\\frac{P(A|B)P(B)}{P(A)}', // Valid LaTeX
            explanation: 'Using conditional probability'
          },
          {
            stepNumber: 2,
            description: 'Substitute values',
            formula: '\\frac{0.8 \\times 0.3}{', // Invalid LaTeX - missing closing brace
            explanation: 'Plugging in numbers'
          }
        ],
        sourceLocation: { fileId: 'test', page: 1 },
        subtopic: 'Probability',
        confidence: 0.8,
        isComplete: true
      };

      const contentWithMathSteps = {
        ...mockSourceContent,
        mathematicalContent: {
          formulas: [], // No formulas
          workedExamples: [exampleWithMathSteps], // Only this example
          definitions: [],
          theorems: []
        }
      };

      const result = await validator.validateContentPreservation(contentWithMathSteps);
      
      expect(result.mathRenderingAccuracy.totalMathElements).toBe(2);
      expect(result.mathRenderingAccuracy.validMathElements).toBe(1);
      expect(result.mathRenderingAccuracy.issues).toContainEqual(
        expect.objectContaining({
          elementId: 'math_steps_example_step_2',
          latexSyntaxError: true
        })
      );
    });

    it('should skip math rendering validation when disabled', async () => {
      const validatorWithoutMathRender = new ContentPreservationValidator({
        enableMathRenderingValidation: false
      });

      const result = await validatorWithoutMathRender.validateContentPreservation(mockSourceContent);
      
      expect(result.mathRenderingAccuracy.totalMathElements).toBe(0);
      expect(result.mathRenderingAccuracy.passed).toBe(true);
      expect(result.mathRenderingAccuracy.details).toContain('disabled');
    });
  });

  describe('Overall Validation and Recommendations', () => {
    it('should calculate overall validation result', async () => {
      const result = await validator.validateContentPreservation(
        mockSourceContent,
        mockProcessedDocument
      );
      
      expect(result.overall).toBeDefined();
      expect(result.overall.type).toBe('formula_validation');
      expect(typeof result.overall.passed).toBe('boolean');
      expect(result.overall.confidence).toBeGreaterThanOrEqual(0);
      expect(result.overall.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate recommendations for improvements', async () => {
      // Create content with various issues
      const problematicContent = {
        ...mockSourceContent,
        text: 'P(A) = 0.5, P(B|A) = 0.3, E[X] = μ, Var(X) = σ²', // Many formulas in source
        mathematicalContent: {
          formulas: [
            {
              id: 'formula_1',
              latex: '\\frac{1}{2', // Invalid LaTeX
              context: '',
              type: 'inline' as const,
              sourceLocation: { fileId: 'test', page: 1 },
              isKeyFormula: true,
              confidence: 0.5
            }
          ],
          workedExamples: [
            {
              id: 'example_1',
              title: 'Incomplete Example',
              problem: '',
              solution: [],
              sourceLocation: { fileId: 'test', page: 1 },
              subtopic: 'Probability',
              confidence: 0.6,
              isComplete: false
            }
          ],
          definitions: [],
          theorems: []
        },
        contentPreservation: {
          totalFormulasFound: 4,
          formulasPreserved: 1,
          totalExamplesFound: 2,
          examplesPreserved: 1,
          preservationScore: 0.5,
          issues: [],
          validationResults: []
        }
      };

      const result = await validator.validateContentPreservation(problematicContent);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should have recommendations for formula preservation
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'improvement',
          title: 'Improve Formula Preservation'
        })
      );
      
      // Should have recommendations for example completeness
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'improvement',
          title: 'Improve Example Completeness'
        })
      );
    });

    it('should calculate preservation score correctly', async () => {
      const result = await validator.validateContentPreservation(
        mockSourceContent,
        mockProcessedDocument
      );
      
      expect(result.preservationInfo).toBeDefined();
      expect(result.preservationInfo.preservationScore).toBeGreaterThanOrEqual(0);
      expect(result.preservationInfo.preservationScore).toBeLessThanOrEqual(1);
      expect(result.preservationInfo.totalFormulasFound).toBeGreaterThanOrEqual(0);
      expect(result.preservationInfo.formulasPreserved).toBeGreaterThanOrEqual(0);
      expect(result.preservationInfo.totalExamplesFound).toBeGreaterThanOrEqual(0);
      expect(result.preservationInfo.examplesPreserved).toBeGreaterThanOrEqual(0);
    });

    it('should handle strict mode validation', async () => {
      const strictValidator = new ContentPreservationValidator({
        strictMode: true,
        formulaPreservationThreshold: 0.95,
        exampleCompletenessThreshold: 0.95
      });

      // Create content that would pass normal validation but fail strict
      const result = await strictValidator.validateContentPreservation(mockSourceContent);
      
      // In strict mode, any critical issues should cause failure
      expect(result.overall).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Create malformed content
      const malformedContent = {
        ...mockSourceContent,
        mathematicalContent: null as any
      };

      await expect(
        validator.validateContentPreservation(malformedContent)
      ).rejects.toThrow('Content preservation validation failed');
    });

    it('should handle empty content', async () => {
      const emptyContent: EnhancedExtractedContent = {
        text: '',
        images: [],
        tables: [],
        metadata: {
          name: 'empty.pdf',
          size: 0,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [],
          sections: [],
          hierarchy: 0
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
          preservationScore: 1,
          issues: [],
          validationResults: []
        }
      };

      const result = await validator.validateContentPreservation(emptyContent);
      
      expect(result.overall.passed).toBe(true); // Empty content should pass
      expect(result.preservationInfo.preservationScore).toBe(1);
    });
  });

  describe('Configuration Validation', () => {
    it('should use default configuration values', () => {
      expect(DEFAULT_VALIDATION_CONFIG.formulaPreservationThreshold).toBe(0.85);
      expect(DEFAULT_VALIDATION_CONFIG.exampleCompletenessThreshold).toBe(0.80);
      expect(DEFAULT_VALIDATION_CONFIG.crossReferenceIntegrityThreshold).toBe(0.90);
      expect(DEFAULT_VALIDATION_CONFIG.mathRenderingAccuracyThreshold).toBe(0.85);
      expect(DEFAULT_VALIDATION_CONFIG.enableDeepValidation).toBe(true);
      expect(DEFAULT_VALIDATION_CONFIG.strictMode).toBe(false);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<ValidationConfig> = {
        formulaPreservationThreshold: 0.9,
        strictMode: true
      };

      const validator = new ContentPreservationValidator(customConfig);
      expect(validator).toBeInstanceOf(ContentPreservationValidator);
    });
  });
});

// Helper functions to create mock data
function createMockSourceContent(): EnhancedExtractedContent {
  const sourceLocation: SourceLocation = {
    fileId: 'test_document.pdf',
    page: 1,
    section: 'Introduction'
  };

  const mockFormulas: Formula[] = [
    {
      id: 'formula_1',
      latex: 'P(A \\cap B) = P(A) \\cdot P(B|A)',
      context: 'Conditional probability formula for intersection of events',
      type: 'display',
      sourceLocation,
      isKeyFormula: true,
      confidence: 0.9,
      originalText: 'P(A ∩ B) = P(A) · P(B|A)'
    },
    {
      id: 'formula_2',
      latex: 'E[X] = \\sum_{i} x_i P(X = x_i)',
      context: 'Expected value formula for discrete random variables',
      type: 'display',
      sourceLocation,
      isKeyFormula: true,
      confidence: 0.85
    }
  ];

  const mockSolutionSteps: SolutionStep[] = [
    {
      stepNumber: 1,
      description: 'Identify the given probabilities',
      explanation: 'We have P(A) = 0.6 and P(B|A) = 0.4',
      formula: 'P(A) = 0.6, P(B|A) = 0.4'
    },
    {
      stepNumber: 2,
      description: 'Apply the multiplication rule',
      explanation: 'Use the formula for conditional probability',
      formula: 'P(A \\cap B) = P(A) \\cdot P(B|A)'
    },
    {
      stepNumber: 3,
      description: 'Calculate the result',
      explanation: 'Substitute the values and compute',
      formula: 'P(A \\cap B) = 0.6 \\times 0.4 = 0.24'
    }
  ];

  const mockWorkedExamples: WorkedExample[] = [
    {
      id: 'example_1',
      title: 'Conditional Probability Example',
      problem: 'Find P(A ∩ B) given P(A) = 0.6 and P(B|A) = 0.4',
      solution: mockSolutionSteps,
      sourceLocation,
      subtopic: 'Conditional Probability',
      confidence: 0.9,
      isComplete: true
    }
  ];

  const mockDefinitions: Definition[] = [
    {
      id: 'definition_1',
      term: 'Conditional Probability',
      definition: 'The probability of event B occurring given that event A has occurred',
      context: 'Fundamental concept in probability theory',
      sourceLocation,
      relatedFormulas: ['formula_1'],
      confidence: 0.95
    }
  ];

  const mockTheorems: Theorem[] = [
    {
      id: 'theorem_1',
      name: 'Bayes\' Theorem',
      statement: 'P(A|B) = P(B|A) * P(A) / P(B)',
      conditions: ['P(B) > 0'],
      sourceLocation,
      relatedFormulas: ['formula_1'],
      confidence: 0.9
    }
  ];

  return {
    text: `
      Conditional Probability
      
      The conditional probability of event B given event A is defined as:
      P(B|A) = P(A ∩ B) / P(A)
      
      Example 1: Find P(A ∩ B) given P(A) = 0.6 and P(B|A) = 0.4
      
      Solution:
      Step 1: Identify the given probabilities
      We have P(A) = 0.6 and P(B|A) = 0.4
      
      Step 2: Apply the multiplication rule
      P(A ∩ B) = P(A) · P(B|A)
      
      Step 3: Calculate the result
      P(A ∩ B) = 0.6 × 0.4 = 0.24
      
      Expected Value
      
      For a discrete random variable X, the expected value is:
      E[X] = Σ xi P(X = xi)
    `,
    images: [],
    tables: [],
    metadata: {
      name: 'test_document.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 5,
      wordCount: 200,
      mathContentDensity: 0.8,
      hasWorkedExamples: true,
      academicLevel: 'undergraduate'
    },
    structure: {
      headings: [
        { level: 1, text: 'Conditional Probability', position: 0 },
        { level: 1, text: 'Expected Value', position: 500 }
      ],
      sections: [
        {
          title: 'Conditional Probability',
          content: 'Content about conditional probability...',
          startPosition: 0,
          endPosition: 400,
          sectionType: 'definition'
        }
      ],
      hierarchy: 2
    },
    mathematicalContent: {
      formulas: mockFormulas,
      workedExamples: mockWorkedExamples,
      definitions: mockDefinitions,
      theorems: mockTheorems
    },
    contentPreservation: {
      totalFormulasFound: 3,
      formulasPreserved: 2,
      totalExamplesFound: 2,
      examplesPreserved: 1,
      preservationScore: 0.85,
      issues: [],
      validationResults: []
    }
  };
}

function createMockProcessedDocument(): AcademicDocument {
  const mockCrossReferences: CrossReference[] = [
    {
      id: 'ref_1',
      type: 'example',
      sourceId: 'section_1_1',
      targetId: 'example_1',
      displayText: 'see Ex. 1.1'
    },
    {
      id: 'ref_2',
      type: 'formula',
      sourceId: 'section_1_2',
      targetId: 'formula_1',
      displayText: 'see Eq. 1.1'
    }
  ];

  const mockAcademicSections: AcademicSection[] = [
    {
      sectionNumber: '1.1',
      title: 'Conditional Probability',
      content: 'Content about conditional probability',
      formulas: [
        {
          id: 'formula_1',
          latex: 'P(A \\cap B) = P(A) \\cdot P(B|A)',
          context: 'Conditional probability formula',
          type: 'display',
          sourceLocation: { fileId: 'test', page: 1 },
          isKeyFormula: true,
          confidence: 0.9
        }
      ],
      examples: [
        {
          id: 'example_1',
          title: 'Conditional Probability Example',
          problem: 'Find P(A ∩ B)',
          solution: [],
          sourceLocation: { fileId: 'test', page: 1 },
          subtopic: 'Probability',
          confidence: 0.9,
          isComplete: true
        }
      ],
      subsections: []
    }
  ];

  const mockDocumentParts: DocumentPart[] = [
    {
      partNumber: 1,
      title: 'Discrete Probability',
      sections: mockAcademicSections
    }
  ];

  return {
    title: 'Compact Study Guide',
    tableOfContents: [
      {
        level: 1,
        title: 'Discrete Probability',
        sectionNumber: '1',
        pageAnchor: '#part1',
        children: [
          {
            level: 2,
            title: 'Conditional Probability',
            sectionNumber: '1.1',
            pageAnchor: '#section1_1',
            children: []
          }
        ]
      }
    ],
    parts: mockDocumentParts,
    crossReferences: mockCrossReferences,
    appendices: [],
    metadata: {
      generatedAt: new Date(),
      sourceFiles: ['test_document.pdf'],
      totalSections: 1,
      totalFormulas: 1,
      totalExamples: 1,
      preservationScore: 0.85
    }
  };
}