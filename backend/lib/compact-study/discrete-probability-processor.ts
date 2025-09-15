// Discrete probability content processor for compact study generator

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

// Discrete Probability Content Processor
export class DiscreteProbabilityProcessor implements ContentProcessor {
  name = 'discrete-probability-processor';
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
      // Filter documents that contain probability content
      const probabilityDocs = input.filter(doc => 
        doc.type === 'probability' || this.containsProbabilityContent(doc)
      );

      if (probabilityDocs.length === 0) {
        const warning: ProcessingWarning = {
          id: `prob_warning_${Date.now()}`,
          stage: this.name,
          type: 'content_loss',
          message: 'No probability documents found for processing',
          timestamp: new Date()
        };
        warnings.push(warning);
      }

      for (const doc of probabilityDocs) {
        if (!doc.extractedContent) {
          const warning: ProcessingWarning = {
            id: `prob_warning_${Date.now()}`,
            stage: this.name,
            type: 'content_loss',
            message: `Document ${doc.id} has no extracted content, skipping probability processing`,
            timestamp: new Date()
          };
          warnings.push(warning);
          continue;
        }

        try {
          const probabilityContent = await this.extractProbabilityContent(
            doc.extractedContent,
            doc.id,
            config
          );
          
          processedContent.push(probabilityContent);

        } catch (error) {
          const processingError: ProcessingError = {
            id: `prob_error_${Date.now()}`,
            stage: this.name,
            type: 'extraction',
            severity: 'medium',
            message: `Failed to extract probability content from ${doc.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        contentPreserved: processedContent.length / Math.max(probabilityDocs.length, 1),
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
        id: `prob_processor_error_${Date.now()}`,
        stage: this.name,
        type: 'system',
        severity: 'critical',
        message: `Discrete probability processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Check if document contains probability content
   */
  private containsProbabilityContent(doc: SourceDocument): boolean {
    if (!doc.extractedContent) return false;
    
    const text = doc.extractedContent.text.toLowerCase();
    const probabilityKeywords = [
      'probability', 'conditional probability', 'bayes', 'bernoulli', 
      'random variable', 'expected value', 'variance', 'standard deviation',
      'sample space', 'event', 'independence', 'distribution'
    ];
    
    return probabilityKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extract comprehensive probability content from document
   */
  private async extractProbabilityContent(
    extractedContent: EnhancedExtractedContent,
    fileId: string,
    config: any
  ): Promise<MathematicalContent> {
    const text = extractedContent.text;

    // Extract probability-specific content in parallel
    const results = await Promise.allSettled([
      this.extractProbabilityBasics(text, fileId),
      this.extractConditionalProbability(text, fileId),
      this.extractBayesTheorem(text, fileId),
      this.extractBernoulliTrials(text, fileId),
      this.extractRandomVariables(text, fileId),
      this.extractExpectedValueVariance(text, fileId),
      this.extractPracticeProblems(text, fileId)
    ]);

    const [
      probabilityBasics,
      conditionalProbability,
      bayesTheorem,
      bernoulliTrials,
      randomVariables,
      expectedValueVariance,
      practiceProblems
    ] = results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { formulas: [], examples: [], definitions: [], theorems: [] }
    );

    // Combine all extracted content
    const allFormulas = [
      ...probabilityBasics.formulas,
      ...conditionalProbability.formulas,
      ...bayesTheorem.formulas,
      ...bernoulliTrials.formulas,
      ...randomVariables.formulas,
      ...expectedValueVariance.formulas
    ];

    const allExamples = [
      ...probabilityBasics.examples,
      ...conditionalProbability.examples,
      ...bayesTheorem.examples,
      ...bernoulliTrials.examples,
      ...randomVariables.examples,
      ...expectedValueVariance.examples,
      ...practiceProblems.examples
    ];

    const allDefinitions = [
      ...probabilityBasics.definitions,
      ...conditionalProbability.definitions,
      ...bayesTheorem.definitions,
      ...bernoulliTrials.definitions,
      ...randomVariables.definitions,
      ...expectedValueVariance.definitions
    ];

    const allTheorems = [
      ...probabilityBasics.theorems,
      ...conditionalProbability.theorems,
      ...bayesTheorem.theorems,
      ...bernoulliTrials.theorems,
      ...randomVariables.theorems,
      ...expectedValueVariance.theorems
    ];

    return {
      formulas: allFormulas,
      workedExamples: allExamples,
      definitions: allDefinitions,
      theorems: allTheorems
    };
  }

  /**
   * Extract probability basics content
   */
  private async extractProbabilityBasics(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract probability basics content from the following text. Focus on:

1. Basic probability formulas (P(A), P(A ∪ B), P(A ∩ B), complements)
2. Sample space and event definitions
3. Basic probability rules and properties
4. Simple probability calculations

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to probability basics.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in discrete probability. Extract probability basics content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
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

      return this.parseAndProcessProbabilityResponse(response, fileId, 'basics');
    } catch (error) {
      console.warn('Probability basics extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract conditional probability content
   */
  private async extractConditionalProbability(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract conditional probability content from the following text. Focus on:

1. Conditional probability formula P(A|B) = P(A ∩ B) / P(B)
2. Independence definition and formulas
3. Multiplication rule for conditional probability
4. Worked examples with conditional probability calculations

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to conditional probability.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in conditional probability. Extract conditional probability content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
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

      return this.parseAndProcessProbabilityResponse(response, fileId, 'conditional');
    } catch (error) {
      console.warn('Conditional probability extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract Bayes' theorem content
   */
  private async extractBayesTheorem(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract Bayes' theorem content from the following text. Focus on:

1. Bayes' theorem formula: P(A|B) = P(B|A) × P(A) / P(B)
2. Law of total probability
3. Prior and posterior probabilities
4. Worked examples applying Bayes' theorem

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to Bayes' theorem.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in Bayes\' theorem and Bayesian probability. Extract Bayes\' theorem content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
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

      return this.parseAndProcessProbabilityResponse(response, fileId, 'bayes');
    } catch (error) {
      console.warn('Bayes theorem extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract Bernoulli trials content
   */
  private async extractBernoulliTrials(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract Bernoulli trials content from the following text. Focus on:

1. Bernoulli trial definition and properties
2. Binomial probability formula: P(X = k) = C(n,k) × p^k × (1-p)^(n-k)
3. Binomial distribution properties
4. Worked examples with Bernoulli trials and binomial calculations

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to Bernoulli trials.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in Bernoulli trials and binomial distributions. Extract Bernoulli trials content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
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

      return this.parseAndProcessProbabilityResponse(response, fileId, 'bernoulli');
    } catch (error) {
      console.warn('Bernoulli trials extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract random variables content
   */
  private async extractRandomVariables(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract random variables content from the following text. Focus on:

1. Random variable definition and notation
2. Discrete random variable properties
3. Probability mass function (PMF)
4. Cumulative distribution function (CDF)
5. Worked examples with random variables

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to random variables.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in random variables and probability distributions. Extract random variables content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
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

      return this.parseAndProcessProbabilityResponse(response, fileId, 'random_variables');
    } catch (error) {
      console.warn('Random variables extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract expected value, variance, and standard deviation content
   */
  private async extractExpectedValueVariance(text: string, fileId: string): Promise<{
    formulas: Formula[];
    examples: WorkedExample[];
    definitions: Definition[];
    theorems: Theorem[];
  }> {
    const prompt = `Extract expected value, variance, and standard deviation content from the following text. Focus on:

1. Expected value formula: E[X] = Σ x × P(X = x)
2. Variance formula: Var(X) = E[X²] - (E[X])²
3. Standard deviation formula: σ = √Var(X)
4. Properties of expectation and variance
5. Worked examples calculating E[X], Var(X), and σ

Text to analyze:
${text.substring(0, 8000)}

Respond with JSON containing formulas, examples, definitions, and theorems related to expected value, variance, and standard deviation.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert in expected value, variance, and standard deviation. Extract content including formulas, worked examples, definitions, and theorems. Always respond with valid JSON.'
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

      return this.parseAndProcessProbabilityResponse(response, fileId, 'expected_value');
    } catch (error) {
      console.warn('Expected value/variance extraction failed:', error);
      return { formulas: [], examples: [], definitions: [], theorems: [] };
    }
  }

  /**
   * Extract practice problems and worked solutions
   */
  private async extractPracticeProblems(text: string, fileId: string): Promise<{
    examples: WorkedExample[];
  }> {
    const prompt = `Extract practice problems and worked solutions from the following text. Focus on:

1. Complete probability problems with step-by-step solutions
2. Practice exercises with detailed explanations
3. Application problems demonstrating probability concepts
4. Problems that show complete solution methodology

Text to analyze:
${text.substring(0, 10000)}

Respond with JSON containing worked examples that represent practice problems with complete solutions.`;

    try {
      const response = await this.getClient().createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert at identifying and extracting practice problems with worked solutions. Focus on complete problems that demonstrate probability concepts with step-by-step solutions. Always respond with valid JSON.'
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
      const examples = this.processExtractedExamples(parsed.examples || [], text, fileId, 'practice');
      
      return { examples };
    } catch (error) {
      console.warn('Practice problems extraction failed:', error);
      return { examples: [] };
    }
  }

  /**
   * Parse and process AI response for probability content
   */
  private parseAndProcessProbabilityResponse(
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
        isKeyFormula: formula.isKeyFormula !== false, // Default to true for probability formulas
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
        subtopic: `Probability - ${subtopic}`,
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
    const probabilityDocs = input.filter(doc => 
      doc.type === 'probability' || this.containsProbabilityContent(doc)
    );
    
    if (probabilityDocs.length === 0) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'No probability documents found for processing',
        confidence: 1.0
      };
    }

    const documentsWithContent = probabilityDocs.filter(doc => doc.extractedContent);
    
    if (documentsWithContent.length === 0) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'No probability documents with extracted content found',
        confidence: 1.0
      };
    }

    return {
      type: 'formula_validation',
      passed: true,
      details: `${documentsWithContent.length} probability documents ready for processing`,
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

// Factory function for creating discrete probability processor
export function createDiscreteProbabilityProcessor(): DiscreteProbabilityProcessor {
  return new DiscreteProbabilityProcessor();
}

// Export the processor (already exported as class above)