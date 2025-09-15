// Relations content processor for compact study generator

import { 
  ContentProcessor, 
  ProcessingResult, 
  ProcessingError, 
  ProcessingWarning,
  ProcessingMetrics,
  SourceDocument,
  ValidationResult
} from './processing-pipeline';
import { 
  EnhancedExtractedContent,
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  SolutionStep,
  SourceLocation,
  MathContentExtractionError
} from './types';
import { getOpenAIClient } from '../ai/client';

// Relations Content Processor
export class RelationsProcessor implements ContentProcessor {
  name = 'relations-processor';
  version = '1.0.0';
  
  private getClient() {
    return getOpenAIClient();
  }

  async process(input: SourceDocument[], config: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];
    const processedContent: MathematicalContent[] = [];

    try {
      // Filter documents that contain relations content
      const relationsDocs = input.filter(doc => 
        doc.type === 'relations' || this.containsRelationsContent(doc)
      );

      if (relationsDocs.length === 0) {
        const warning: ProcessingWarning = {
          id: `relations_warning_${Date.now()}`,
          stage: this.name,
          type: 'content_loss',
          message: 'No relations documents found for processing',
          timestamp: new Date()
        };
        warnings.push(warning);
      }

      for (const doc of relationsDocs) {
        if (!doc.extractedContent) {
          const warning: ProcessingWarning = {
            id: `relations_warning_${Date.now()}`,
            stage: this.name,
            type: 'content_loss',
            message: `Document ${doc.id} has no extracted content, skipping relations processing`,
            timestamp: new Date()
          };
          warnings.push(warning);
          continue;
        }

        try {
          const relationsContent = await this.extractRelationsContent(
            doc.extractedContent,
            doc.id,
            config
          );
          
          processedContent.push(relationsContent);

        } catch (error) {
          const processingError: ProcessingError = {
            id: `relations_error_${Date.now()}`,
            stage: this.name,
            type: 'extraction',
            severity: 'medium',
            message: `Failed to extract relations content from ${doc.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            recoverable: true,
            timestamp: new Date(),
            sourceDocument: doc.id
          };
          
          errors.push(processingError);
          doc.errors.push(processingError);
        }
      }

      const processingTime = Date.now() - startTime;
      const totalFormulas = processedContent.reduce((sum, content) => sum + content.formulas.length, 0);
      const totalExamples = processedContent.reduce((sum, content) => sum + content.workedExamples.length, 0);
      const totalDefinitions = processedContent.reduce((sum, content) => sum + content.definitions.length, 0);
      const totalTheorems = processedContent.reduce((sum, content) => sum + content.theorems.length, 0);

      const metrics: ProcessingMetrics = {
        processingTime,
        contentPreserved: processedContent.length / Math.max(relationsDocs.length, 1),
        qualityScore: totalFormulas > 0 || totalExamples > 0 ? 0.9 : 0.6,
        itemsProcessed: totalFormulas + totalExamples + totalDefinitions + totalTheorems
      };

      return {
        success: processedContent.length > 0,
        data: processedContent,
        errors,
        warnings,
        metrics
      };

    } catch (error) {
      const processingError: ProcessingError = {
        id: `relations_processor_error_${Date.now()}`,
        stage: this.name,
        type: 'system',
        severity: 'critical',
        message: `Relations processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: false,
        timestamp: new Date()
      };

      return {
        success: false,
        errors: [processingError],
        warnings,
        metrics: {
          processingTime: Date.now() - startTime,
          contentPreserved: 0,
          qualityScore: 0,
          itemsProcessed: 0
        }
      };
    }
  }

  /**
   * Check if document contains relations content
   */
  private containsRelationsContent(doc: SourceDocument): boolean {
    if (!doc.extractedContent) return false;
    
    const text = doc.extractedContent.text.toLowerCase();
    const relationsKeywords = [
      'relation', 'reflexive', 'symmetric', 'antisymmetric', 'transitive',
      'irreflexive', 'asymmetric', 'equivalence relation', 'partial order',
      'combining relations', 'n-ary relation', 'cartesian product',
      'domain', 'range', 'codomain', 'function', 'bijection', 'injection', 'surjection'
    ];
    
    return relationsKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extract comprehensive relations content from document
   */
  private async extractRelationsContent(
    extractedContent: EnhancedExtractedContent,
    fileId: string,
    config: any
  ): Promise<MathematicalContent> {
    const text = extractedContent.text;

    // Extract relations-specific content in parallel
    const results = await Promise.allSettled([
      this.extractRelationDefinitions(text, fileId),
      this.extractRelationProperties(text, fileId),
      this.extractCombiningRelations(text, fileId),
      this.extractNaryRelations(text, fileId),
      this.extractSQLOperations(text, fileId),
      this.extractRelationPropertyExamples(text, fileId)
    ]);

    const [
      relationDefinitions,
      relationProperties,
      combiningRelations,
      naryRelations,
      sqlOperations,
      propertyExamples
    ] = results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { formulas: [], examples: [], definitions: [], theorems: [] }
    );

    // Combine all extracted content
    const allFormulas = [
      ...relationDefinitions.formulas,
      ...relationProperties.formulas,
      ...combiningRelations.formulas,
      ...naryRelations.formulas,
      ...sqlOperations.formulas
    ];

    const allExamples = [
      ...relationDefinitions.examples,
      ...relationProperties.examples,
      ...combiningRelations.examples,
      ...naryRelations.examples,
      ...sqlOperations.examples,
      ...propertyExamples.examples
    ];

    const allDefinitions = [
      ...relationDefinitions.definitions,
      ...relationProperties.definitions,
      ...combiningRelations.definitions,
      ...naryRelations.definitions,
      ...sqlOperations.definitions
    ];

    const allTheorems = [
      ...relationDefinitions.theorems,
      ...relationProperties.theorems,
      ...combiningRelations.theorems,
      ...naryRelations.theorems,
      ...sqlOperations.theorems
    ];

    return {
      formulas: allFormulas,
      workedExamples: allExamples,
      definitions: allDefinitions,
      theorems: allTheorems
    };
  }

  /**
   * Extract relation definitions and basic concepts
   */
  private async extractRelationDefinitions(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract relation definitions and basic concepts from the following text. Focus on:

1. Definition of relation, binary relation, n-ary relation
2. Cartesian product notation: A × B = {(a,b) | a ∈ A, b ∈ B}
3. Domain, range, and codomain definitions
4. Relation notation: R ⊆ A × B, aRb, (a,b) ∈ R
5. Basic examples of relations

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to relation definitions.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in discrete mathematics and relations. Extract relation definitions including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      return this.parseAndProcessRelationsResponse(response, fileId, 'definitions');
    } catch (error) {
      console.warn('Relation definitions extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract relation properties (reflexive, symmetric, etc.)
   */
  private async extractRelationProperties(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract relation properties from the following text. Focus on:

1. Reflexive: ∀a ∈ A, aRa (every element is related to itself)
2. Irreflexive: ∀a ∈ A, ¬(aRa) (no element is related to itself)
3. Symmetric: ∀a,b ∈ A, aRb → bRa
4. Antisymmetric: ∀a,b ∈ A, (aRb ∧ bRa) → a = b
5. Asymmetric: ∀a,b ∈ A, aRb → ¬(bRa)
6. Transitive: ∀a,b,c ∈ A, (aRb ∧ bRc) → aRc
7. Examples checking these properties

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to relation properties.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in relation properties (reflexive, symmetric, transitive, etc.). Extract relation properties content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      return this.parseAndProcessRelationsResponse(response, fileId, 'properties');
    } catch (error) {
      console.warn('Relation properties extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract combining relations content
   */
  private async extractCombiningRelations(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract combining relations content from the following text. Focus on:

1. Union of relations: R₁ ∪ R₂ = {(a,b) | (a,b) ∈ R₁ ∨ (a,b) ∈ R₂}
2. Intersection of relations: R₁ ∩ R₂ = {(a,b) | (a,b) ∈ R₁ ∧ (a,b) ∈ R₂}
3. Complement of relation: R̄ = {(a,b) | (a,b) ∉ R}
4. Composition of relations: R₁ ∘ R₂ = {(a,c) | ∃b: (a,b) ∈ R₁ ∧ (b,c) ∈ R₂}
5. Inverse relation: R⁻¹ = {(b,a) | (a,b) ∈ R}
6. Worked examples combining relations

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to combining relations.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in combining relations (union, intersection, composition, etc.). Extract combining relations content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      return this.parseAndProcessRelationsResponse(response, fileId, 'combining');
    } catch (error) {
      console.warn('Combining relations extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract n-ary relations content
   */
  private async extractNaryRelations(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract n-ary relations content from the following text. Focus on:

1. n-ary relation definition: R ⊆ A₁ × A₂ × ... × Aₙ
2. Ternary relations (3-ary): R ⊆ A × B × C
3. Projection operations on n-ary relations
4. Selection operations on n-ary relations
5. Examples of n-ary relations in databases and mathematics
6. Worked examples with n-ary relation operations

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to n-ary relations.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in n-ary relations and relational algebra. Extract n-ary relations content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      return this.parseAndProcessRelationsResponse(response, fileId, 'nary');
    } catch (error) {
      console.warn('N-ary relations extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract SQL-style operations content
   */
  private async extractSQLOperations(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract SQL-style operations content from the following text. Focus on:

1. SELECT operation: σ_condition(R) = {t ∈ R | condition(t)}
2. PROJECT operation: π_attributes(R) = {t[attributes] | t ∈ R}
3. JOIN operations: R ⋈ S, R ⋈_condition S
4. UNION operation: R ∪ S
5. INTERSECTION operation: R ∩ S
6. DIFFERENCE operation: R - S
7. Code examples with proper SQL formatting
8. Relational algebra expressions

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to SQL-style operations. Format code blocks properly.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in relational algebra and SQL operations. Extract SQL-style operations content including formulas, worked examples, definitions, and theorems. Format code blocks properly with SQL syntax. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' }
      });

      return this.parseAndProcessRelationsResponse(response, fileId, 'sql_operations');
    } catch (error) {
      console.warn('SQL operations extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract relation property check examples and exercises
   */
  private async extractRelationPropertyExamples(text: string, fileId: string): Promise<{
    examples: WorkedExample[];
  }> {
    const prompt = `Extract relation property check examples and exercises from the following text. Focus on:

1. Complete examples checking if a relation is reflexive, symmetric, transitive, etc.
2. Step-by-step verification of relation properties
3. Counterexample demonstrations for properties that don't hold
4. Practice problems with complete solutions showing property verification
5. Examples with matrices, graphs, or set representations of relations

Text to analyze:
${text.substring(0, 10000)}

Respond with JSON containing worked examples that demonstrate relation property checking with complete solutions.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert at identifying and extracting relation property verification examples. Focus on complete problems that demonstrate checking reflexive, symmetric, transitive, and other relation properties with step-by-step solutions. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' }
      });

      const parsed = this.parseResponse(response);
      const examples = this.processExtractedExamples(parsed.examples || [], text, fileId, 'property_checks');
      
      return { examples };
    } catch (error) {
      console.warn('Relation property examples extraction failed:', error);
      return { examples: [] };
    }
  }

  /**
   * Parse and process AI response for relations content
   */
  private parseAndProcessRelationsResponse(
    response: string | null,
    fileId: string,
    subtopic: string
  ): {
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  } {
    if (!response) {
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }

    try {
      const parsed = this.parseResponse(response);
      
      return {
        formulas: this.processExtractedFormulas(parsed.formulas || [], fileId, subtopic),
        examples: this.processExtractedExamples(parsed.examples || [], '', fileId, subtopic),
        definitions: this.processExtractedDefinitions(parsed.definitions || [], fileId, subtopic),
        theorems: this.processExtractedTheorems(parsed.theorems || [], fileId, subtopic)
      };
    } catch (error) {
      console.warn(`Failed to parse ${subtopic} response:`, error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Parse AI response with error handling
   */
  private parseResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    }
  }

  /**
   * Process extracted formulas into Formula objects
   */
  private processExtractedFormulas(
    rawFormulas: any[],
    fileId: string,
    subtopic: string
  ): Formula[] {
    return rawFormulas.map((formula, index) => {
      const sourceLocation: SourceLocation = {
        fileId,
        textPosition: formula.textPosition || { start: 0, end: 0 }
      };

      return {
        id: `${fileId}_${subtopic}_formula_${index}`,
        latex: formula.latex || formula.formula || formula.originalText || '',
        context: formula.context || '',
        type: formula.type === 'display' ? 'display' : 'inline',
        sourceLocation,
        isKeyFormula: formula.isKeyFormula !== false, // Default to true for relations formulas
        confidence: formula.confidence || 0.8,
        originalText: formula.originalText || formula.latex
      };
    });
  }

  /**
   * Process extracted examples into WorkedExample objects
   */
  private processExtractedExamples(
    rawExamples: any[],
    sourceText: string,
    fileId: string,
    subtopic: string
  ): WorkedExample[] {
    return rawExamples.map((example, index) => {
      const sourceLocation: SourceLocation = {
        fileId,
        textPosition: example.textPosition || { start: 0, end: 0 }
      };

      const solution: SolutionStep[] = (example.solution || example.steps || []).map((step: any, stepIndex: number) => ({
        stepNumber: step.stepNumber || stepIndex + 1,
        description: step.description || step.step || '',
        formula: step.formula,
        explanation: step.explanation || step.reasoning || '',
        latex: step.latex
      }));

      return {
        id: `${fileId}_${subtopic}_example_${index}`,
        title: example.title || example.problem?.substring(0, 50) || `${subtopic} Example ${index + 1}`,
        problem: example.problem || example.question || '',
        solution,
        sourceLocation,
        subtopic: `Relations - ${subtopic}`,
        confidence: example.confidence || 0.8,
        isComplete: solution.length > 0 && (example.isComplete !== false)
      };
    });
  }

  /**
   * Process extracted definitions into Definition objects
   */
  private processExtractedDefinitions(
    rawDefinitions: any[],
    fileId: string,
    subtopic: string
  ): Definition[] {
    return rawDefinitions.map((def, index) => {
      const sourceLocation: SourceLocation = {
        fileId,
        textPosition: def.textPosition || { start: 0, end: 0 }
      };

      return {
        id: `${fileId}_${subtopic}_definition_${index}`,
        term: def.term || def.name || '',
        definition: def.definition || def.description || '',
        context: def.context || '',
        sourceLocation,
        relatedFormulas: [], // Will be populated by cross-reference analysis
        confidence: def.confidence || 0.8
      };
    });
  }

  /**
   * Process extracted theorems into Theorem objects
   */
  private processExtractedTheorems(
    rawTheorems: any[],
    fileId: string,
    subtopic: string
  ): Theorem[] {
    return rawTheorems.map((theorem, index) => {
      const sourceLocation: SourceLocation = {
        fileId,
        textPosition: theorem.textPosition || { start: 0, end: 0 }
      };

      return {
        id: `${fileId}_${subtopic}_theorem_${index}`,
        name: theorem.name || theorem.title || `${subtopic} Theorem ${index + 1}`,
        statement: theorem.statement || theorem.description || '',
        proof: theorem.proof,
        conditions: theorem.conditions || theorem.assumptions || [],
        sourceLocation,
        relatedFormulas: [], // Will be populated by cross-reference analysis
        confidence: theorem.confidence || 0.8
      };
    });
  }

  validate(input: SourceDocument[], config: any): ValidationResult {
    const relationsDocs = input.filter(doc => 
      doc.type === 'relations' || this.containsRelationsContent(doc)
    );
    
    if (relationsDocs.length === 0) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'No relations documents found for processing',
        confidence: 1.0
      };
    }

    const documentsWithContent = relationsDocs.filter(doc => doc.extractedContent);
    
    if (documentsWithContent.length === 0) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'No relations documents with extracted content found',
        confidence: 1.0
      };
    }

    return {
      type: 'formula_validation',
      passed: true,
      details: `${documentsWithContent.length} relations documents ready for processing`,
      confidence: 1.0
    };
  }

  async recover(error: ProcessingError, input: SourceDocument[], config: any): Promise<ProcessingResult> {
    // Attempt with simplified extraction and lower confidence thresholds
    const fallbackConfig = {
      ...config,
      confidenceThreshold: 0.3,
      enableLatexConversion: false,
      simplifiedExtraction: true
    };

    return this.process(input, fallbackConfig);
  }
}

// Factory function for creating relations processor
export function createRelationsProcessor(): RelationsProcessor {
  return new RelationsProcessor();
}

// Export the processor (already exported as class above)