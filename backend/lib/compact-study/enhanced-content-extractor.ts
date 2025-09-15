// Enhanced content extractor for mathematical content in compact study generator

import { getOpenAIClient } from '../ai/client';
import { FileProcessing } from '../file-processing';
import {
  EnhancedExtractedContent,
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  MathExtractionConfig,
  ContentPreservationInfo,
  PreservationIssue,
  ValidationResult,
  MathContentExtractionError,
  SourceLocation,
  SolutionStep
} from './types';
import { 
  ContentPreservationValidator,
  createContentPreservationValidator,
  ValidationConfig 
} from './content-preservation-validator';
import { ExtractedContent } from '../file-processing/types';

export class EnhancedContentExtractor {
  private client = getOpenAIClient();
  private validator: ContentPreservationValidator;
  private defaultConfig: MathExtractionConfig = {
    enableLatexConversion: true,
    enableWorkedExampleDetection: true,
    enableDefinitionExtraction: true,
    enableTheoremExtraction: true,
    preservationThreshold: 0.85,
    confidenceThreshold: 0.7,
    fallbackToOCR: true,
    validateExtraction: true
  };

  constructor(validationConfig?: Partial<ValidationConfig>) {
    this.validator = createContentPreservationValidator(validationConfig);
  }

  /**
   * Extract mathematical content from PDF files with enhanced preservation
   */
  async extractMathematicalContent(
    file: File,
    config: Partial<MathExtractionConfig> = {}
  ): Promise<EnhancedExtractedContent> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // First, extract basic content using existing file processing
      const basicContent = await this.extractBasicContent(file);
      
      // Extract mathematical formulas
      const formulas = await this.extractFormulas(basicContent.text, basicContent.metadata.name, finalConfig);
      
      // Extract worked examples
      const workedExamples = await this.extractWorkedExamples(basicContent.text, basicContent.metadata.name, finalConfig);
      
      // Extract definitions
      const definitions = await this.extractDefinitions(basicContent.text, basicContent.metadata.name, finalConfig);
      
      // Extract theorems
      const theorems = await this.extractTheorems(basicContent.text, basicContent.metadata.name, finalConfig);
      
      // Enhance images with mathematical content detection
      const enhancedImages = await this.enhanceImagesWithMathDetection(basicContent.images);
      
      // Create mathematical content object
      const mathematicalContent: MathematicalContent = {
        formulas,
        workedExamples,
        definitions,
        theorems
      };
      
      // Create enhanced extracted content first
      const enhancedContent: EnhancedExtractedContent = {
        ...basicContent,
        images: enhancedImages,
        mathematicalContent,
        contentPreservation: {
          totalFormulasFound: 0,
          formulasPreserved: mathematicalContent.formulas.length,
          totalExamplesFound: 0,
          examplesPreserved: mathematicalContent.workedExamples.length,
          preservationScore: 0,
          issues: [],
          validationResults: []
        }
      };

      // Validate content preservation using the new validator
      const validationResult = await this.validator.validateContentPreservation(enhancedContent);
      
      // Update content preservation info with validation results
      const contentPreservation = validationResult.preservationInfo;
      
      // Update the enhanced content with final preservation info
      enhancedContent.contentPreservation = contentPreservation;
      
      // Run final validation if enabled
      if (finalConfig.validateExtraction) {
        await this.runFinalValidation(enhancedContent, finalConfig, validationResult);
      }
      
      return enhancedContent;
      
    } catch (error) {
      if (error instanceof MathContentExtractionError) {
        throw error;
      }
      throw new MathContentExtractionError(
        `Mathematical content extraction failed: ${error.message}`,
        'FORMULA_EXTRACTION_FAILED',
        undefined,
        true
      );
    }
  }

  /**
   * Extract basic content using existing file processing infrastructure
   */
  // ENHANCED_ERROR_HANDLING_V2
  private async safeExtractContent(file: File): Promise<ExtractedContent> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Content extraction attempt ${attempt}/${maxRetries} for ${file.name}`);
        
        // Try main extraction
        const result = await this.extractBasicContent(file);
        
        // Validate result
        if (!result || !result.text || result.text.trim().length === 0) {
          throw new Error('Empty or invalid content extracted');
        }
        
        console.log(`✅ Successfully extracted ${result.text.length} characters on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt} failed: ${lastError.message}`);
        
        // If this is the last attempt, try fallback
        if (attempt === maxRetries) {
          console.log('🔧 All attempts failed, using fallback content...');
          try {
            return await this.createFallbackContent(file);
          } catch (fallbackError) {
            console.error('❌ Fallback content creation also failed:', fallbackError);
            throw new MathContentExtractionError(
              `Content extraction failed after ${maxRetries} attempts: ${lastError.message}`,
              'EXTRACTION_FAILED_ALL_ATTEMPTS',
              undefined,
              false
            );
          }
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError || new Error('Unknown extraction error');
  }

  async extractBasicContent(file: File): Promise<ExtractedContent> {
    try {
      console.log(`🔄 Processing file: ${file.name} (${file.size} bytes, ${file.type})`);
      
      // Use enhanced processing with cache disabled to ensure fresh content extraction
      const result = await FileProcessing.processFileEnhanced(file, {
        useCache: false, // Disable cache to ensure each file is processed fresh
        trackProgress: true,
        manageMemory: true,
        priority: 'high'
      });
      
      console.log(`📄 File processing result: ${result.status}`);
      
      if (result.status === 'failed') {
        const errorMessages = result.errors?.map(e => e.message).join(', ') || 'Unknown error';
        console.error(`❌ File processing failed: ${errorMessages}`);
        
        // Try to create a fallback content if possible
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          console.log('🔧 Attempting fallback content extraction...');
          return this.createFallbackContent(file);
        }
        
        throw new MathContentExtractionError(
          `File processing failed: ${errorMessages}`,
          'FORMULA_EXTRACTION_FAILED',
          undefined,
          true // Make it recoverable
        );
      }
      
      if (!result.content) {
        console.warn('⚠️ No content extracted from file, creating fallback...');
        return this.createFallbackContent(file);
      }
      
      console.log(`✅ Successfully extracted content: ${result.content.text.length} characters`);
      return result.content;
      
    } catch (error) {
      console.error(`💥 Error in extractBasicContent:`, error);
      
      // If it's already our custom error, re-throw it
      if (error instanceof MathContentExtractionError) {
        throw error;
      }
      
      // For any other error, try fallback
      console.log('🔧 Attempting fallback due to processing error...');
      try {
        return await this.createFallbackContent(file);
      } catch (fallbackError) {
        throw new MathContentExtractionError(
          `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'FORMULA_EXTRACTION_FAILED',
          undefined,
          true
        );
      }
    }
  }

  /**
   * Create fallback content when file processing fails - Enhanced to extract actual PDF text
   */
  private async createFallbackContent(file: File): Promise<ExtractedContent> {
    console.log(`🔧 Creating fallback content for ${file.name}`);
    
    let extractedText = `Content from ${file.name}\n\nThis document could not be fully processed, but has been included in the study guide. The file contains ${file.size} bytes of data.`;
    
    // Try to extract actual PDF text using pdf-parse directly
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(buffer);
        
        if (pdfData.text && pdfData.text.length > 0) {
          extractedText = pdfData.text;
          console.log(`✅ Fallback PDF extraction successful: ${pdfData.text.length} characters from ${pdfData.numpages} pages`);
        } else {
          console.log(`⚠️ PDF text extraction returned empty content`);
        }
      } catch (pdfError) {
        console.warn(`⚠️ Fallback PDF extraction failed:`, pdfError);
        // Keep the generic fallback text
      }
    }
    
    return {
      text: extractedText,
      images: [],
      tables: [],
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        pageCount: 1,
        wordCount: 20,
        language: 'en'
      },
      structure: {
        headings: [{
          level: 1,
          text: file.name.replace('.pdf', ''),
          id: 'fallback-heading'
        }],
        sections: [{
          id: 'fallback-section',
          title: 'Content Overview',
          level: 1,
          startPage: 1,
          endPage: 1
        }]
      }
    };
  }

  /**
   * Extract mathematical formulas with LaTeX conversion
   */
  private async extractFormulas(
    text: string,
    fileId: string,
    config: MathExtractionConfig
  ): Promise<Formula[]> {
    try {
      const prompt = this.createFormulaExtractionPrompt(text);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert mathematical content extractor. Extract all mathematical formulas, equations, and expressions from the text. Convert them to LaTeX format when possible and preserve their context. Always respond with valid JSON.'
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

      if (!response || typeof response !== 'string') {
        throw new MathContentExtractionError(
          'Invalid AI response format',
          'FORMULA_EXTRACTION_FAILED'
        );
      }

      const parsed = JSON.parse(response);
      
      if (!parsed.formulas || !Array.isArray(parsed.formulas)) {
        throw new MathContentExtractionError(
          'Invalid formula extraction response format',
          'FORMULA_EXTRACTION_FAILED'
        );
      }

      return this.processExtractedFormulas(parsed.formulas, text, fileId, config);
      
    } catch (error) {
      if (error instanceof MathContentExtractionError) {
        throw error;
      }
      throw new MathContentExtractionError(
        `Formula extraction failed: ${error.message}`,
        'FORMULA_EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Extract worked examples with step-by-step solutions
   */
  private async extractWorkedExamples(
    text: string,
    fileId: string,
    config: MathExtractionConfig
  ): Promise<WorkedExample[]> {
    if (!config.enableWorkedExampleDetection) {
      return [];
    }

    try {
      const prompt = this.createWorkedExampleExtractionPrompt(text);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert at identifying and extracting worked examples from academic texts. Focus on complete examples with step-by-step solutions. Always respond with valid JSON.'
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

      if (!response || typeof response !== 'string') {
        return []; // Return empty array on invalid response
      }

      const parsed = JSON.parse(response);
      
      if (!parsed.examples || !Array.isArray(parsed.examples)) {
        return []; // Return empty array if no examples found
      }

      return this.processExtractedExamples(parsed.examples, text, fileId, config);
      
    } catch (error) {
      console.warn('Worked example extraction failed:', error);
      return []; // Return empty array on failure rather than throwing
    }
  }

  /**
   * Extract definitions with context
   */
  private async extractDefinitions(
    text: string,
    fileId: string,
    config: MathExtractionConfig
  ): Promise<Definition[]> {
    if (!config.enableDefinitionExtraction) {
      return [];
    }

    try {
      const prompt = this.createDefinitionExtractionPrompt(text);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert at extracting mathematical and academic definitions from texts. Focus on formal definitions and their context. Always respond with valid JSON.'
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

      if (!response || typeof response !== 'string') {
        return []; // Return empty array on invalid response
      }

      const parsed = JSON.parse(response);
      
      if (!parsed.definitions || !Array.isArray(parsed.definitions)) {
        return [];
      }

      return this.processExtractedDefinitions(parsed.definitions, text, fileId, config);
      
    } catch (error) {
      console.warn('Definition extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract theorems and mathematical statements
   */
  private async extractTheorems(
    text: string,
    fileId: string,
    config: MathExtractionConfig
  ): Promise<Theorem[]> {
    if (!config.enableTheoremExtraction) {
      return [];
    }

    try {
      const prompt = this.createTheoremExtractionPrompt(text);
      
      const response = await this.client.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert at extracting mathematical theorems, lemmas, and propositions from academic texts. Focus on formal statements and their conditions. Always respond with valid JSON.'
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

      if (!response || typeof response !== 'string') {
        return []; // Return empty array on invalid response
      }

      const parsed = JSON.parse(response);
      
      if (!parsed.theorems || !Array.isArray(parsed.theorems)) {
        return [];
      }

      return this.processExtractedTheorems(parsed.theorems, text, fileId, config);
      
    } catch (error) {
      console.warn('Theorem extraction failed:', error);
      return [];
    }
  }

  /**
   * Create prompt for formula extraction
   */
  private createFormulaExtractionPrompt(text: string): string {
    return `Extract all mathematical formulas, equations, and expressions from the following text. For each formula:

1. Identify the mathematical content
2. Convert to LaTeX format if possible
3. Determine if it's inline or display math
4. Extract surrounding context
5. Assess if it's a key formula (fundamental to the topic)

Text to analyze:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Respond with JSON in this format:
{
  "formulas": [
    {
      "originalText": "the exact text as it appears",
      "latex": "LaTeX representation",
      "context": "surrounding text for context",
      "type": "inline" or "display",
      "isKeyFormula": boolean,
      "confidence": number between 0 and 1,
      "textPosition": {
        "start": number,
        "end": number
      }
    }
  ]
}`;
  }

  /**
   * Create prompt for worked example extraction
   */
  private createWorkedExampleExtractionPrompt(text: string): string {
    return `Extract all worked examples from the following text. Look for:

1. Complete problems with step-by-step solutions
2. Examples that demonstrate concepts or methods
3. Practice problems with detailed solutions
4. Case studies with mathematical content

For each example, extract:
- The problem statement
- Each solution step with explanation
- The subtopic it relates to

Text to analyze:
${text.substring(0, 10000)} ${text.length > 10000 ? '...' : ''}

Respond with JSON in this format:
{
  "examples": [
    {
      "title": "example title or identifier",
      "problem": "the problem statement",
      "subtopic": "the mathematical subtopic",
      "solution": [
        {
          "stepNumber": 1,
          "description": "what is being done in this step",
          "formula": "any formula used (optional)",
          "explanation": "why this step is taken"
        }
      ],
      "confidence": number between 0 and 1,
      "isComplete": boolean,
      "textPosition": {
        "start": number,
        "end": number
      }
    }
  ]
}`;
  }

  /**
   * Create prompt for definition extraction
   */
  private createDefinitionExtractionPrompt(text: string): string {
    return `Extract all mathematical and academic definitions from the following text. Look for:

1. Formal definitions of terms and concepts
2. Mathematical definitions with precise language
3. Key terminology explanations
4. Conceptual definitions

Text to analyze:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Respond with JSON in this format:
{
  "definitions": [
    {
      "term": "the term being defined",
      "definition": "the complete definition",
      "context": "surrounding context",
      "confidence": number between 0 and 1,
      "textPosition": {
        "start": number,
        "end": number
      }
    }
  ]
}`;
  }

  /**
   * Create prompt for theorem extraction
   */
  private createTheoremExtractionPrompt(text: string): string {
    return `Extract all theorems, lemmas, propositions, and mathematical statements from the following text. Look for:

1. Formal theorem statements
2. Lemmas and propositions
3. Mathematical laws and principles
4. Conditional statements and their conditions

Text to analyze:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Respond with JSON in this format:
{
  "theorems": [
    {
      "name": "theorem name or identifier",
      "statement": "the complete theorem statement",
      "conditions": ["condition 1", "condition 2"],
      "proof": "proof if provided (optional)",
      "confidence": number between 0 and 1,
      "textPosition": {
        "start": number,
        "end": number
      }
    }
  ]
}`;
  }

  /**
   * Process extracted formulas and create Formula objects
   */
  private processExtractedFormulas(
    rawFormulas: any[],
    sourceText: string,
    fileId: string,
    config: MathExtractionConfig
  ): Formula[] {
    return rawFormulas
      .filter(formula => formula.confidence >= config.confidenceThreshold)
      .map((formula, index) => {
        const sourceLocation: SourceLocation = {
          fileId,
          textPosition: formula.textPosition || { start: 0, end: 0 }
        };

        return {
          id: `${fileId}_formula_${index}`,
          latex: formula.latex || formula.originalText,
          context: formula.context || '',
          type: formula.type === 'display' ? 'display' : 'inline',
          sourceLocation,
          isKeyFormula: formula.isKeyFormula || false,
          confidence: formula.confidence || 0.5,
          originalText: formula.originalText
        };
      });
  }

  /**
   * Process extracted examples and create WorkedExample objects
   */
  private processExtractedExamples(
    rawExamples: any[],
    sourceText: string,
    fileId: string,
    config: MathExtractionConfig
  ): WorkedExample[] {
    return rawExamples
      .filter(example => example.confidence >= config.confidenceThreshold)
      .map((example, index) => {
        const sourceLocation: SourceLocation = {
          fileId,
          textPosition: example.textPosition || { start: 0, end: 0 }
        };

        const solution: SolutionStep[] = (example.solution || []).map((step: any, stepIndex: number) => ({
          stepNumber: step.stepNumber || stepIndex + 1,
          description: step.description || '',
          formula: step.formula,
          explanation: step.explanation || '',
          latex: step.latex
        }));

        return {
          id: `${fileId}_example_${index}`,
          title: example.title || `Example ${index + 1}`,
          problem: example.problem || '',
          solution,
          sourceLocation,
          subtopic: example.subtopic || 'General',
          confidence: example.confidence || 0.5,
          isComplete: example.isComplete !== false && solution.length > 0
        };
      });
  }

  /**
   * Process extracted definitions and create Definition objects
   */
  private processExtractedDefinitions(
    rawDefinitions: any[],
    sourceText: string,
    fileId: string,
    config: MathExtractionConfig
  ): Definition[] {
    return rawDefinitions
      .filter(def => def.confidence >= config.confidenceThreshold)
      .map((def, index) => {
        const sourceLocation: SourceLocation = {
          fileId,
          textPosition: def.textPosition || { start: 0, end: 0 }
        };

        return {
          id: `${fileId}_definition_${index}`,
          term: def.term || '',
          definition: def.definition || '',
          context: def.context || '',
          sourceLocation,
          relatedFormulas: [], // Will be populated by cross-reference analysis
          confidence: def.confidence || 0.5
        };
      });
  }

  /**
   * Process extracted theorems and create Theorem objects
   */
  private processExtractedTheorems(
    rawTheorems: any[],
    sourceText: string,
    fileId: string,
    config: MathExtractionConfig
  ): Theorem[] {
    return rawTheorems
      .filter(theorem => theorem.confidence >= config.confidenceThreshold)
      .map((theorem, index) => {
        const sourceLocation: SourceLocation = {
          fileId,
          textPosition: theorem.textPosition || { start: 0, end: 0 }
        };

        return {
          id: `${fileId}_theorem_${index}`,
          name: theorem.name || `Theorem ${index + 1}`,
          statement: theorem.statement || '',
          proof: theorem.proof,
          conditions: theorem.conditions || [],
          sourceLocation,
          relatedFormulas: [], // Will be populated by cross-reference analysis
          confidence: theorem.confidence || 0.5
        };
      });
  }

  /**
   * Enhance images with mathematical content detection
   */
  private async enhanceImagesWithMathDetection(images: any[]): Promise<any[]> {
    return Promise.all(images.map(async (image) => {
      try {
        const mathContent = await this.detectMathInImage(image);
        return {
          ...image,
          containsMath: mathContent.length > 0,
          mathContent
        };
      } catch (error) {
        console.warn(`Math detection failed for image ${image.id}:`, error);
        return {
          ...image,
          containsMath: false,
          mathContent: []
        };
      }
    }));
  }

  /**
   * Detect mathematical content in images using OCR text
   */
  private async detectMathInImage(image: any): Promise<string[]> {
    if (!image.ocrText) {
      return [];
    }

    // Simple pattern matching for mathematical content
    const mathPatterns = [
      /[∑∏∫√±≤≥≠∞]/g, // Mathematical symbols
      /\$.*?\$/g, // LaTeX inline math
      /\\\(.*?\\\)/g, // LaTeX inline math alternative
      /\\\[.*?\\\]/g, // LaTeX display math
      /\b\d+\s*[+\-*/=]\s*\d+\b/g, // Simple equations
      /\b[a-zA-Z]\s*=\s*[^,\s]+/g, // Variable assignments
      /\b(sin|cos|tan|log|ln|exp)\s*\(/g, // Mathematical functions
    ];

    const mathContent: string[] = [];
    
    for (const pattern of mathPatterns) {
      const matches = image.ocrText.match(pattern);
      if (matches) {
        mathContent.push(...matches);
      }
    }

    return [...new Set(mathContent)]; // Remove duplicates
  }



  /**
   * Run final validation on extracted content
   */
  private async runFinalValidation(
    content: EnhancedExtractedContent,
    config: MathExtractionConfig,
    validationResult: any
  ): Promise<void> {
    if (content.contentPreservation.preservationScore < config.preservationThreshold) {
      throw new MathContentExtractionError(
        `Content preservation score ${content.contentPreservation.preservationScore.toFixed(2)} below threshold ${config.preservationThreshold}`,
        'VALIDATION_FAILED',
        undefined,
        true
      );
    }

    // Check overall validation result
    if (!validationResult.overall.passed) {
      const criticalIssues = content.contentPreservation.issues.filter(
        issue => issue.severity === 'high' || issue.severity === 'critical'
      );
      
      if (criticalIssues.length > 0) {
        throw new MathContentExtractionError(
          `Content validation failed with ${criticalIssues.length} critical issues: ${criticalIssues.map(i => i.description).join(', ')}`,
          'VALIDATION_FAILED',
          undefined,
          true
        );
      }
    }

    const failedValidations = content.contentPreservation.validationResults.filter(v => !v.passed);
    if (failedValidations.length > 0) {
      console.warn('Some validations failed:', failedValidations.map(v => v.details).join(', '));
    }
  }
}

// Singleton instance
let enhancedContentExtractor: EnhancedContentExtractor | null = null;

export function getEnhancedContentExtractor(validationConfig?: Partial<ValidationConfig>): EnhancedContentExtractor {
  if (!enhancedContentExtractor) {
    enhancedContentExtractor = new EnhancedContentExtractor(validationConfig);
  }
  return enhancedContentExtractor;
}