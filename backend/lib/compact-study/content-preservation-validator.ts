// Content preservation validation system for compact study generator

import {
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  CrossReference,
  AcademicDocument,
  EnhancedExtractedContent,
  ValidationResult,
  PreservationIssue,
  ContentPreservationInfo,
  SourceLocation,
  MathContentExtractionError
} from './types';

// Validation Configuration
export interface ValidationConfig {
  formulaPreservationThreshold: number; // Minimum percentage of formulas that must be preserved
  exampleCompletenessThreshold: number; // Minimum percentage of examples that must be complete
  crossReferenceIntegrityThreshold: number; // Minimum percentage of cross-references that must be valid
  mathRenderingAccuracyThreshold: number; // Minimum accuracy for mathematical rendering
  enableDeepValidation: boolean; // Enable comprehensive content analysis
  enableCrossReferenceValidation: boolean; // Validate cross-reference links
  enableMathRenderingValidation: boolean; // Validate mathematical content rendering
  strictMode: boolean; // Fail validation on any critical issues
}

// Validation Results
export interface ContentValidationResult {
  overall: ValidationResult;
  formulaPreservation: FormulaValidationResult;
  exampleCompleteness: ExampleValidationResult;
  crossReferenceIntegrity: CrossReferenceValidationResult;
  mathRenderingAccuracy: MathRenderingValidationResult;
  preservationInfo: ContentPreservationInfo;
  recommendations: ValidationRecommendation[];
}

export interface FormulaValidationResult extends ValidationResult {
  totalFormulasFound: number;
  formulasPreserved: number;
  formulasWithValidLatex: number;
  formulasWithContext: number;
  keyFormulasPreserved: number;
  preservationRate: number;
  issues: FormulaValidationIssue[];
}

export interface ExampleValidationResult extends ValidationResult {
  totalExamplesFound: number;
  examplesPreserved: number;
  completeExamples: number;
  examplesWithSolutions: number;
  examplesWithSteps: number;
  completenessRate: number;
  issues: ExampleValidationIssue[];
}

export interface CrossReferenceValidationResult extends ValidationResult {
  totalReferences: number;
  validReferences: number;
  brokenReferences: number;
  missingTargets: number;
  integrityRate: number;
  issues: CrossReferenceValidationIssue[];
}

export interface MathRenderingValidationResult extends ValidationResult {
  totalMathElements: number;
  validMathElements: number;
  renderableElements: number;
  latexValidElements: number;
  accuracyRate: number;
  issues: MathRenderingValidationIssue[];
}

// Validation Issues
export interface FormulaValidationIssue extends PreservationIssue {
  formulaId?: string;
  latexError?: string;
  contextMissing?: boolean;
  isKeyFormula?: boolean;
}

export interface ExampleValidationIssue extends PreservationIssue {
  exampleId?: string;
  missingSteps?: number;
  incompleteSolution?: boolean;
  missingProblemStatement?: boolean;
}

export interface CrossReferenceValidationIssue extends PreservationIssue {
  referenceId?: string;
  targetId?: string;
  referenceType?: string;
  brokenLink?: boolean;
}

export interface MathRenderingValidationIssue extends PreservationIssue {
  elementId?: string;
  renderingError?: string;
  latexSyntaxError?: boolean;
  displayIssue?: boolean;
}

export interface ValidationRecommendation {
  type: 'improvement' | 'fix' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  impact: string;
}

// Content Preservation Validator Implementation
export class ContentPreservationValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      formulaPreservationThreshold: 0.85,
      exampleCompletenessThreshold: 0.80,
      crossReferenceIntegrityThreshold: 0.90,
      mathRenderingAccuracyThreshold: 0.85,
      enableDeepValidation: true,
      enableCrossReferenceValidation: true,
      enableMathRenderingValidation: true,
      strictMode: false,
      ...config
    };
  }

  /**
   * Validate content preservation for extracted mathematical content
   */
  async validateContentPreservation(
    sourceContent: EnhancedExtractedContent,
    processedDocument?: AcademicDocument
  ): Promise<ContentValidationResult> {
    try {
      // Validate formula preservation
      const formulaValidation = await this.validateFormulaPreservation(
        sourceContent.text,
        sourceContent.mathematicalContent.formulas
      );

      // Validate example completeness
      const exampleValidation = await this.validateExampleCompleteness(
        sourceContent.text,
        sourceContent.mathematicalContent.workedExamples
      );

      // Validate cross-reference integrity
      const crossReferenceValidation = this.config.enableCrossReferenceValidation && processedDocument
        ? await this.validateCrossReferenceIntegrity(processedDocument.crossReferences, processedDocument)
        : this.createEmptyCrossReferenceValidation();

      // Validate mathematical rendering accuracy
      const mathRenderingValidation = this.config.enableMathRenderingValidation
        ? await this.validateMathRenderingAccuracy(sourceContent.mathematicalContent)
        : this.createEmptyMathRenderingValidation();

      // Calculate overall preservation info
      const preservationInfo = this.calculatePreservationInfo(
        formulaValidation,
        exampleValidation,
        crossReferenceValidation,
        mathRenderingValidation
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        formulaValidation,
        exampleValidation,
        crossReferenceValidation,
        mathRenderingValidation
      );

      // Determine overall validation result
      const overall = this.calculateOverallValidation(
        formulaValidation,
        exampleValidation,
        crossReferenceValidation,
        mathRenderingValidation
      );

      return {
        overall,
        formulaPreservation: formulaValidation,
        exampleCompleteness: exampleValidation,
        crossReferenceIntegrity: crossReferenceValidation,
        mathRenderingAccuracy: mathRenderingValidation,
        preservationInfo,
        recommendations
      };

    } catch (error) {
      throw new MathContentExtractionError(
        `Content preservation validation failed: ${error.message}`,
        'VALIDATION_FAILED',
        undefined,
        true
      );
    }
  }

  /**
   * Validate that all source formulas are preserved
   */
  private async validateFormulaPreservation(
    sourceText: string,
    extractedFormulas: Formula[]
  ): Promise<FormulaValidationResult> {
    const issues: FormulaValidationIssue[] = [];

    // Count formulas in source text using multiple detection methods
    const sourceFormulas = this.detectFormulasInSource(sourceText);
    const totalFormulasFound = sourceFormulas.length;
    const formulasPreserved = extractedFormulas.length;

    // Validate each extracted formula
    let formulasWithValidLatex = 0;
    let formulasWithContext = 0;
    let keyFormulasPreserved = 0;

    for (const formula of extractedFormulas) {
      // Check LaTeX validity
      if (this.isValidLatex(formula.latex)) {
        formulasWithValidLatex++;
      } else {
        issues.push({
          type: 'conversion_failed',
          severity: 'medium',
          description: `Formula ${formula.id} has invalid LaTeX: ${formula.latex}`,
          formulaId: formula.id,
          latexError: 'Invalid LaTeX syntax',
          sourceLocation: formula.sourceLocation,
          suggestion: 'Review LaTeX conversion or use original text as fallback'
        });
      }

      // Check context preservation
      if (formula.context && formula.context.length > 10) {
        formulasWithContext++;
      } else {
        issues.push({
          type: 'context_missing',
          severity: 'low',
          description: `Formula ${formula.id} missing sufficient context`,
          formulaId: formula.id,
          contextMissing: true,
          sourceLocation: formula.sourceLocation,
          suggestion: 'Extract more surrounding text for context'
        });
      }

      // Check key formula preservation
      if (formula.isKeyFormula) {
        keyFormulasPreserved++;
      }
    }

    // Check for missing formulas
    const preservationRate = totalFormulasFound > 0 ? formulasPreserved / totalFormulasFound : 1;
    
    if (preservationRate < this.config.formulaPreservationThreshold) {
      issues.push({
        type: 'formula_lost',
        severity: 'high',
        description: `Only ${formulasPreserved}/${totalFormulasFound} formulas preserved (${Math.round(preservationRate * 100)}%)`,
        suggestion: 'Lower confidence threshold or improve formula detection patterns'
      });
    }

    // Validate formula matching with source
    const matchingIssues = await this.validateFormulaMatching(sourceFormulas, extractedFormulas);
    issues.push(...matchingIssues);

    const passed = preservationRate >= this.config.formulaPreservationThreshold &&
                   formulasWithValidLatex >= extractedFormulas.length * 0.8;

    return {
      type: 'formula_validation',
      passed,
      details: `${formulasPreserved}/${totalFormulasFound} formulas preserved, ${formulasWithValidLatex} with valid LaTeX`,
      confidence: preservationRate,
      totalFormulasFound,
      formulasPreserved,
      formulasWithValidLatex,
      formulasWithContext,
      keyFormulasPreserved,
      preservationRate,
      issues
    };
  }

  /**
   * Validate worked example completeness
   */
  private async validateExampleCompleteness(
    sourceText: string,
    extractedExamples: WorkedExample[]
  ): Promise<ExampleValidationResult> {
    const issues: ExampleValidationIssue[] = [];

    // Count examples in source text
    const sourceExamples = this.detectExamplesInSource(sourceText);
    const totalExamplesFound = sourceExamples.length;
    const examplesPreserved = extractedExamples.length;

    // Validate each extracted example
    let completeExamples = 0;
    let examplesWithSolutions = 0;
    let examplesWithSteps = 0;

    for (const example of extractedExamples) {
      let isComplete = true;
      let issueCount = 0;

      // Check problem statement
      if (!example.problem || example.problem.length < 10) {
        issues.push({
          type: 'example_incomplete',
          severity: 'medium',
          description: `Example ${example.id} missing or insufficient problem statement`,
          exampleId: example.id,
          missingProblemStatement: true,
          sourceLocation: example.sourceLocation,
          suggestion: 'Extract complete problem statement from source'
        });
        isComplete = false;
        issueCount++;
      }

      // Check solution steps
      if (!example.solution || example.solution.length === 0) {
        issues.push({
          type: 'example_incomplete',
          severity: 'high',
          description: `Example ${example.id} has no solution steps`,
          exampleId: example.id,
          incompleteSolution: true,
          sourceLocation: example.sourceLocation,
          suggestion: 'Extract step-by-step solution from source'
        });
        isComplete = false;
        issueCount++;
      } else {
        examplesWithSolutions++;
        
        // Validate solution steps
        const validSteps = example.solution.filter(step => 
          step.description && step.description.length > 5
        );
        
        if (validSteps.length < example.solution.length * 0.8) {
          issues.push({
            type: 'example_incomplete',
            severity: 'medium',
            description: `Example ${example.id} has incomplete solution steps`,
            exampleId: example.id,
            missingSteps: example.solution.length - validSteps.length,
            sourceLocation: example.sourceLocation,
            suggestion: 'Improve step extraction to capture complete descriptions'
          });
          isComplete = false;
          issueCount++;
        }

        if (example.solution.length >= 2) {
          examplesWithSteps++;
        }
      }

      // Check overall completeness
      if (isComplete && example.isComplete) {
        completeExamples++;
      }
    }

    const completenessRate = examplesPreserved > 0 ? completeExamples / examplesPreserved : 1;
    const preservationRate = totalExamplesFound > 0 ? examplesPreserved / totalExamplesFound : 1;

    const passed = preservationRate >= this.config.exampleCompletenessThreshold &&
                   completenessRate >= 0.7;

    return {
      type: 'example_validation',
      passed,
      details: `${completeExamples}/${examplesPreserved} examples complete, ${examplesWithSolutions} with solutions`,
      confidence: completenessRate,
      totalExamplesFound,
      examplesPreserved,
      completeExamples,
      examplesWithSolutions,
      examplesWithSteps,
      completenessRate,
      issues
    };
  }

  /**
   * Validate cross-reference link integrity
   */
  private async validateCrossReferenceIntegrity(
    crossReferences: CrossReference[],
    document: AcademicDocument
  ): Promise<CrossReferenceValidationResult> {
    const issues: CrossReferenceValidationIssue[] = [];
    const totalReferences = crossReferences.length;
    let validReferences = 0;
    let brokenReferences = 0;
    let missingTargets = 0;

    // Create lookup maps for validation
    const elementIds = this.createElementIdMap(document);

    for (const reference of crossReferences) {
      let isValid = true;

      // Check if target exists
      if (!elementIds.has(reference.targetId)) {
        issues.push({
          type: 'formula_lost', // Using existing type, could be extended
          severity: 'medium',
          description: `Cross-reference ${reference.id} points to non-existent target ${reference.targetId}`,
          referenceId: reference.id,
          targetId: reference.targetId,
          referenceType: reference.type,
          brokenLink: true,
          suggestion: 'Update target ID or remove invalid reference'
        });
        missingTargets++;
        isValid = false;
      }

      // Check if source exists
      if (!elementIds.has(reference.sourceId)) {
        issues.push({
          type: 'formula_lost',
          severity: 'low',
          description: `Cross-reference ${reference.id} has invalid source ${reference.sourceId}`,
          referenceId: reference.id,
          targetId: reference.targetId,
          referenceType: reference.type,
          suggestion: 'Update source ID or remove invalid reference'
        });
        isValid = false;
      }

      // Validate display text format
      if (!this.isValidDisplayText(reference.displayText, reference.type)) {
        issues.push({
          type: 'context_missing',
          severity: 'low',
          description: `Cross-reference ${reference.id} has invalid display text format: ${reference.displayText}`,
          referenceId: reference.id,
          suggestion: 'Use standard academic reference format (e.g., "see Ex. 3.2")'
        });
      }

      if (isValid) {
        validReferences++;
      } else {
        brokenReferences++;
      }
    }

    const integrityRate = totalReferences > 0 ? validReferences / totalReferences : 1;
    const passed = integrityRate >= this.config.crossReferenceIntegrityThreshold;

    return {
      type: 'structure_validation',
      passed,
      details: `${validReferences}/${totalReferences} cross-references valid, ${brokenReferences} broken`,
      confidence: integrityRate,
      totalReferences,
      validReferences,
      brokenReferences,
      missingTargets,
      integrityRate,
      issues
    };
  }

  /**
   * Validate mathematical content rendering accuracy
   */
  private async validateMathRenderingAccuracy(
    mathematicalContent: MathematicalContent
  ): Promise<MathRenderingValidationResult> {
    const issues: MathRenderingValidationIssue[] = [];
    
    // Collect all mathematical elements
    const allMathElements = [
      ...mathematicalContent.formulas,
      ...mathematicalContent.workedExamples.flatMap(ex => 
        ex.solution.filter(step => step.formula || step.latex)
      ),
      ...mathematicalContent.theorems,
      ...mathematicalContent.definitions
    ];

    const totalMathElements = allMathElements.length;
    let validMathElements = 0;
    let renderableElements = 0;
    let latexValidElements = 0;

    // Validate formulas
    for (const formula of mathematicalContent.formulas) {
      const validation = await this.validateMathElement(formula, 'formula');
      if (validation.isValid) validMathElements++;
      if (validation.isRenderable) renderableElements++;
      if (validation.hasValidLatex) latexValidElements++;
      
      if (!validation.isValid) {
        issues.push({
          type: 'conversion_failed',
          severity: validation.severity,
          description: validation.description,
          elementId: formula.id,
          renderingError: validation.error,
          latexSyntaxError: !validation.hasValidLatex,
          sourceLocation: formula.sourceLocation,
          suggestion: validation.suggestion
        });
      }
    }

    // Validate solution steps with math
    for (const example of mathematicalContent.workedExamples) {
      for (const step of example.solution) {
        if (step.formula || step.latex) {
          const validation = await this.validateMathElement(step, 'step');
          if (validation.isValid) validMathElements++;
          if (validation.isRenderable) renderableElements++;
          if (validation.hasValidLatex) latexValidElements++;
          
          if (!validation.isValid) {
            issues.push({
              type: 'conversion_failed',
              severity: validation.severity,
              description: validation.description,
              elementId: `${example.id}_step_${step.stepNumber}`,
              renderingError: validation.error,
              latexSyntaxError: !validation.hasValidLatex,
              suggestion: validation.suggestion
            });
          }
        }
      }
    }

    const accuracyRate = totalMathElements > 0 ? validMathElements / totalMathElements : 1;
    const passed = accuracyRate >= this.config.mathRenderingAccuracyThreshold;

    return {
      type: 'formula_validation',
      passed,
      details: `${validMathElements}/${totalMathElements} math elements valid, ${renderableElements} renderable`,
      confidence: accuracyRate,
      totalMathElements,
      validMathElements,
      renderableElements,
      latexValidElements,
      accuracyRate,
      issues
    };
  }

  /**
   * Detect formulas in source text using pattern matching
   */
  private detectFormulasInSource(text: string): string[] {
    const formulaPatterns = [
      /\$[^$]+\$/g, // LaTeX inline math
      /\\\([^)]+\\\)/g, // LaTeX inline math alternative
      /\\\[[^\]]+\\\]/g, // LaTeX display math
      /[∑∏∫√±≤≥≠∞αβγδεζηθικλμνξοπρστυφχψω]/g, // Mathematical symbols
      /\b\d+\s*[+\-*/=]\s*\d+\b/g, // Simple equations
      /\b[a-zA-Z]\s*=\s*[^,\s.]+/g, // Variable assignments
      /\b(sin|cos|tan|log|ln|exp|sqrt|sum|prod|int)\s*\(/gi, // Mathematical functions
      /P\([^)]+\)/g, // Probability notation
      /E\[[^\]]+\]/g, // Expected value notation
      /Var\([^)]+\)/g, // Variance notation
    ];

    const foundFormulas = new Set<string>();
    
    for (const pattern of formulaPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.trim();
          if (cleaned.length > 1) {
            foundFormulas.add(cleaned);
          }
        });
      }
    }

    return Array.from(foundFormulas);
  }

  /**
   * Detect examples in source text using pattern matching
   */
  private detectExamplesInSource(text: string): string[] {
    const examplePatterns = [
      /Example\s+\d+[:.]/gi,
      /Problem\s+\d+[:.]/gi,
      /Exercise\s+\d+[:.]/gi,
      /Solution[:.]/gi,
      /Step\s+\d+[:.]/gi,
      /\b\d+\.\s+[A-Z][^.]*\?/g, // Numbered questions
    ];

    const foundExamples = new Set<string>();
    
    for (const pattern of examplePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => foundExamples.add(match.toLowerCase()));
      }
    }

    return Array.from(foundExamples);
  }

  /**
   * Validate formula matching between source and extracted
   */
  private async validateFormulaMatching(
    sourceFormulas: string[],
    extractedFormulas: Formula[]
  ): Promise<FormulaValidationIssue[]> {
    const issues: FormulaValidationIssue[] = [];
    const extractedTexts = new Set(extractedFormulas.map(f => f.originalText || f.latex));

    // Check for missing formulas
    for (const sourceFormula of sourceFormulas) {
      const found = Array.from(extractedTexts).some(extracted => 
        this.isSimilarFormula(sourceFormula, extracted)
      );
      
      if (!found) {
        issues.push({
          type: 'formula_lost',
          severity: 'medium',
          description: `Source formula not found in extracted content: ${sourceFormula}`,
          suggestion: 'Review formula detection patterns or extraction confidence threshold'
        });
      }
    }

    return issues;
  }

  /**
   * Check if two formulas are similar (accounting for formatting differences)
   */
  private isSimilarFormula(formula1: string, formula2: string): boolean {
    // Normalize formulas for comparison
    const normalize = (f: string) => f
      .replace(/\s+/g, '')
      .replace(/[{}]/g, '')
      .toLowerCase();
    
    const norm1 = normalize(formula1);
    const norm2 = normalize(formula2);
    
    // Check exact match
    if (norm1 === norm2) return true;
    
    // Check if one contains the other (for partial matches)
    if (norm1.length > 3 && norm2.length > 3) {
      return norm1.includes(norm2) || norm2.includes(norm1);
    }
    
    return false;
  }

  /**
   * Validate individual mathematical element
   */
  private async validateMathElement(
    element: any,
    type: 'formula' | 'step'
  ): Promise<{
    isValid: boolean;
    isRenderable: boolean;
    hasValidLatex: boolean;
    error?: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }> {
    const latex = type === 'formula' ? element.latex : (element.latex || element.formula);
    
    if (!latex) {
      return {
        isValid: false,
        isRenderable: false,
        hasValidLatex: false,
        error: 'No LaTeX content',
        severity: 'medium',
        description: `${type} has no LaTeX content`,
        suggestion: 'Extract mathematical content or provide fallback text'
      };
    }

    const hasValidLatex = this.isValidLatex(latex);
    const isRenderable = hasValidLatex && this.isRenderableLatex(latex);

    return {
      isValid: hasValidLatex && isRenderable,
      isRenderable,
      hasValidLatex,
      error: hasValidLatex ? undefined : 'Invalid LaTeX syntax',
      severity: hasValidLatex ? 'low' : 'medium',
      description: hasValidLatex 
        ? `${type} has valid LaTeX` 
        : `${type} has invalid LaTeX: ${latex}`,
      suggestion: hasValidLatex 
        ? 'Content is valid' 
        : 'Review LaTeX syntax or use original text as fallback'
    };
  }

  /**
   * Check if LaTeX is syntactically valid
   */
  private isValidLatex(latex: string): boolean {
    if (!latex || latex.length === 0) return false;
    
    // Basic LaTeX validation
    const invalidPatterns = [
      /\\[a-zA-Z]+\s*{[^}]*$/,  // Unclosed braces
      /\$[^$]*$/,               // Unclosed math delimiters
      /\\[^a-zA-Z\s\\]/,        // Invalid escape sequences
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(latex)) return false;
    }

    // Check balanced braces
    let braceCount = 0;
    for (const char of latex) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount < 0) return false;
    }
    
    return braceCount === 0;
  }

  /**
   * Check if LaTeX can be rendered
   */
  private isRenderableLatex(latex: string): boolean {
    // Check for common rendering issues
    const renderingIssues = [
      /\\[a-zA-Z]+\s*\{[^}]{100,}\}/, // Overly long commands
      /\\includegraphics/,             // Graphics commands
      /\\newcommand/,                  // Command definitions
      /\\documentclass/,               // Document structure
    ];

    return !renderingIssues.some(pattern => pattern.test(latex));
  }

  /**
   * Create element ID map for cross-reference validation
   */
  private createElementIdMap(document: AcademicDocument): Set<string> {
    const ids = new Set<string>();

    // Add section IDs
    for (const part of document.parts) {
      for (const section of part.sections) {
        ids.add(section.sectionNumber);
        
        // Add formula IDs
        for (const formula of section.formulas) {
          ids.add(formula.id);
        }
        
        // Add example IDs
        for (const example of section.examples) {
          ids.add(example.id);
        }
        
        // Add subsection IDs
        for (const subsection of section.subsections) {
          ids.add(subsection.sectionNumber);
        }
      }
    }

    return ids;
  }

  /**
   * Validate cross-reference display text format
   */
  private isValidDisplayText(displayText: string, type: string): boolean {
    const patterns = {
      example: /^(see\s+)?(Ex\.|Example)\s+\d+(\.\d+)?$/i,
      formula: /^(see\s+)?(Eq\.|Equation|Formula)\s+\d+(\.\d+)?$/i,
      section: /^(see\s+)?(Sec\.|Section)\s+\d+(\.\d+)?$/i,
      theorem: /^(see\s+)?(Thm\.|Theorem)\s+\d+(\.\d+)?$/i,
      definition: /^(see\s+)?(Def\.|Definition)\s+\d+(\.\d+)?$/i
    };

    const pattern = patterns[type as keyof typeof patterns];
    return pattern ? pattern.test(displayText) : true;
  }

  /**
   * Calculate overall preservation information
   */
  private calculatePreservationInfo(
    formulaValidation: FormulaValidationResult,
    exampleValidation: ExampleValidationResult,
    crossReferenceValidation: CrossReferenceValidationResult,
    mathRenderingValidation: MathRenderingValidationResult
  ): ContentPreservationInfo {
    const allIssues: PreservationIssue[] = [
      ...formulaValidation.issues,
      ...exampleValidation.issues,
      ...crossReferenceValidation.issues,
      ...mathRenderingValidation.issues
    ];

    const allValidationResults: ValidationResult[] = [
      formulaValidation,
      exampleValidation,
      crossReferenceValidation,
      mathRenderingValidation
    ];

    // Calculate weighted preservation score
    const weights = { formula: 0.4, example: 0.3, crossRef: 0.15, mathRender: 0.15 };
    const preservationScore = 
      formulaValidation.preservationRate * weights.formula +
      exampleValidation.completenessRate * weights.example +
      crossReferenceValidation.integrityRate * weights.crossRef +
      mathRenderingValidation.accuracyRate * weights.mathRender;

    return {
      totalFormulasFound: formulaValidation.totalFormulasFound,
      formulasPreserved: formulaValidation.formulasPreserved,
      totalExamplesFound: exampleValidation.totalExamplesFound,
      examplesPreserved: exampleValidation.examplesPreserved,
      preservationScore,
      issues: allIssues,
      validationResults: allValidationResults
    };
  }

  /**
   * Generate validation recommendations
   */
  private generateRecommendations(
    formulaValidation: FormulaValidationResult,
    exampleValidation: ExampleValidationResult,
    crossReferenceValidation: CrossReferenceValidationResult,
    mathRenderingValidation: MathRenderingValidationResult
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];

    // Formula preservation recommendations
    if (formulaValidation.preservationRate < 0.9) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        title: 'Improve Formula Preservation',
        description: `Only ${Math.round(formulaValidation.preservationRate * 100)}% of formulas preserved`,
        action: 'Lower confidence threshold or improve detection patterns',
        impact: 'Better mathematical content coverage'
      });
    }

    // Example completeness recommendations
    if (exampleValidation.completenessRate < 0.8) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        title: 'Improve Example Completeness',
        description: `Only ${Math.round(exampleValidation.completenessRate * 100)}% of examples are complete`,
        action: 'Enhance solution step extraction and validation',
        impact: 'More comprehensive worked examples'
      });
    }

    // Cross-reference recommendations
    if (crossReferenceValidation.integrityRate < 0.95) {
      recommendations.push({
        type: 'fix',
        priority: 'medium',
        title: 'Fix Cross-Reference Links',
        description: `${crossReferenceValidation.brokenReferences} broken cross-references found`,
        action: 'Update target IDs and validate reference integrity',
        impact: 'Better document navigation and coherence'
      });
    }

    // Math rendering recommendations
    if (mathRenderingValidation.accuracyRate < 0.9) {
      recommendations.push({
        type: 'fix',
        priority: 'high',
        title: 'Fix Mathematical Rendering',
        description: `${mathRenderingValidation.totalMathElements - mathRenderingValidation.validMathElements} math elements have rendering issues`,
        action: 'Review LaTeX syntax and provide fallback text',
        impact: 'Proper mathematical content display'
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall validation result
   */
  private calculateOverallValidation(
    formulaValidation: FormulaValidationResult,
    exampleValidation: ExampleValidationResult,
    crossReferenceValidation: CrossReferenceValidationResult,
    mathRenderingValidation: MathRenderingValidationResult
  ): ValidationResult {
    const allPassed = formulaValidation.passed && 
                     exampleValidation.passed && 
                     crossReferenceValidation.passed && 
                     mathRenderingValidation.passed;

    const averageConfidence = (
      formulaValidation.confidence +
      exampleValidation.confidence +
      crossReferenceValidation.confidence +
      mathRenderingValidation.confidence
    ) / 4;

    const criticalIssues = [
      ...formulaValidation.issues,
      ...exampleValidation.issues,
      ...crossReferenceValidation.issues,
      ...mathRenderingValidation.issues
    ].filter(issue => issue.severity === 'high' || issue.severity === 'critical');

    const passed = this.config.strictMode ? 
      (allPassed && criticalIssues.length === 0) : 
      (averageConfidence >= 0.7 && criticalIssues.length < 3);

    return {
      type: 'formula_validation',
      passed,
      details: `Overall validation ${passed ? 'passed' : 'failed'}: ${Math.round(averageConfidence * 100)}% confidence, ${criticalIssues.length} critical issues`,
      confidence: averageConfidence
    };
  }

  /**
   * Create empty cross-reference validation (when disabled)
   */
  private createEmptyCrossReferenceValidation(): CrossReferenceValidationResult {
    return {
      type: 'structure_validation',
      passed: true,
      details: 'Cross-reference validation disabled',
      confidence: 1,
      totalReferences: 0,
      validReferences: 0,
      brokenReferences: 0,
      missingTargets: 0,
      integrityRate: 1,
      issues: []
    };
  }

  /**
   * Create empty math rendering validation (when disabled)
   */
  private createEmptyMathRenderingValidation(): MathRenderingValidationResult {
    return {
      type: 'formula_validation',
      passed: true,
      details: 'Math rendering validation disabled',
      confidence: 1,
      totalMathElements: 0,
      validMathElements: 0,
      renderableElements: 0,
      latexValidElements: 0,
      accuracyRate: 1,
      issues: []
    };
  }
}

// Default validation configuration
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  formulaPreservationThreshold: 0.85,
  exampleCompletenessThreshold: 0.80,
  crossReferenceIntegrityThreshold: 0.90,
  mathRenderingAccuracyThreshold: 0.85,
  enableDeepValidation: true,
  enableCrossReferenceValidation: true,
  enableMathRenderingValidation: true,
  strictMode: false
};

// Factory function
export function createContentPreservationValidator(
  config: Partial<ValidationConfig> = {}
): ContentPreservationValidator {
  return new ContentPreservationValidator(config);
}

// Export types
export type {
  ValidationConfig,
  ContentValidationResult,
  FormulaValidationResult,
  ExampleValidationResult,
  CrossReferenceValidationResult,
  MathRenderingValidationResult,
  FormulaValidationIssue,
  ExampleValidationIssue,
  CrossReferenceValidationIssue,
  MathRenderingValidationIssue,
  ValidationRecommendation
};