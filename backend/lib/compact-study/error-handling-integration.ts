// Integration example for error handling system with compact study generator

import { 
  CompactStudyErrorHandler, 
  MathContentError, 
  LayoutError, 
  CrossReferenceError,
  ProcessingWarning 
} from './error-handling';
import { 
  MathematicalContent, 
  Formula, 
  WorkedExample, 
  CompactLayoutConfig,
  CrossReference,
  SourceLocation 
} from './types';

// Enhanced content extractor with error handling
export class EnhancedContentExtractorWithErrorHandling {
  private errorHandler: CompactStudyErrorHandler;

  constructor() {
    this.errorHandler = new CompactStudyErrorHandler();
  }

  async extractMathematicalContent(
    text: string, 
    sourceLocation: SourceLocation
  ): Promise<{ content: MathematicalContent; warnings: ProcessingWarning[] }> {
    const content: MathematicalContent = {
      formulas: [],
      workedExamples: [],
      definitions: [],
      theorems: []
    };

    try {
      // Attempt formula extraction
      const formulas = await this.extractFormulas(text, sourceLocation);
      content.formulas = formulas;
    } catch (error) {
      if (error instanceof MathContentError) {
        const recovery = await this.errorHandler.handleFormulaExtractionError(
          error,
          text,
          sourceLocation
        );
        
        if (recovery.success && recovery.recoveredContent) {
          // Add recovered content as a special formula entry
          content.formulas.push({
            id: `recovered-${Date.now()}`,
            latex: recovery.recoveredContent.content,
            context: 'Recovered from error',
            type: 'display',
            sourceLocation,
            isKeyFormula: false,
            confidence: 0.5,
            originalText: text
          });
        }
      }
    }

    try {
      // Attempt worked example extraction
      const examples = await this.extractWorkedExamples(text, sourceLocation);
      content.workedExamples = examples;
    } catch (error) {
      if (error instanceof MathContentError) {
        const recovery = await this.errorHandler.handleFormulaExtractionError(
          error,
          text,
          sourceLocation
        );
        
        if (recovery.success && recovery.recoveredContent) {
          // Add recovered content as incomplete example
          content.workedExamples.push({
            id: `recovered-example-${Date.now()}`,
            title: 'Recovered Example',
            problem: recovery.recoveredContent.content,
            solution: [{
              stepNumber: 1,
              description: 'Content recovered from extraction error',
              explanation: 'Manual review recommended'
            }],
            sourceLocation,
            subtopic: 'recovered',
            confidence: 0.3,
            isComplete: false
          });
        }
      }
    }

    return {
      content,
      warnings: this.errorHandler.getWarnings()
    };
  }

  private async extractFormulas(text: string, sourceLocation: SourceLocation): Promise<Formula[]> {
    // Simulate formula extraction that might fail
    const formulaPatterns = [
      /E\[.*?\]/g,
      /P\(.*?\)/g,
      /∑.*?/g,
      /∫.*?dx/g
    ];

    const formulas: Formula[] = [];
    
    for (const pattern of formulaPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Simulate potential extraction failure
          if (Math.random() < 0.1) { // 10% failure rate for testing
            throw new MathContentError(
              `Failed to extract formula: ${match}`,
              'FORMULA_EXTRACTION_FAILED',
              sourceLocation,
              true,
              match
            );
          }

          formulas.push({
            id: `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            latex: match,
            context: 'Extracted from text',
            type: 'inline',
            sourceLocation,
            isKeyFormula: true,
            confidence: 0.9
          });
        }
      }
    }

    return formulas;
  }

  private async extractWorkedExamples(text: string, sourceLocation: SourceLocation): Promise<WorkedExample[]> {
    // Simulate worked example extraction
    const examplePattern = /Example \d+\.?\d*:?(.*?)(?=Example|\n\n|$)/gs;
    const matches = text.match(examplePattern);
    
    if (!matches) return [];

    const examples: WorkedExample[] = [];
    
    for (const match of matches) {
      // Simulate potential parsing failure
      if (Math.random() < 0.05) { // 5% failure rate
        throw new MathContentError(
          `Failed to parse worked example: ${match.substring(0, 50)}...`,
          'EXAMPLE_PARSING_FAILED',
          sourceLocation,
          true,
          match
        );
      }

      examples.push({
        id: `example-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Extracted Example',
        problem: match,
        solution: [{
          stepNumber: 1,
          description: 'Solution extracted from text',
          explanation: 'Parsed automatically'
        }],
        sourceLocation,
        subtopic: 'general',
        confidence: 0.8,
        isComplete: true
      });
    }

    return examples;
  }

  getErrorSummary() {
    return this.errorHandler.generateErrorSummary();
  }

  clearWarnings() {
    this.errorHandler.clearWarnings();
  }
}

// Enhanced layout engine with error handling
export class CompactLayoutEngineWithErrorHandling {
  private errorHandler: CompactStudyErrorHandler;

  constructor() {
    this.errorHandler = new CompactStudyErrorHandler();
  }

  async generateLayout(
    content: MathematicalContent,
    config: CompactLayoutConfig
  ): Promise<{ layout: any; warnings: ProcessingWarning[] }> {
    try {
      // Simulate layout calculation
      const layout = await this.calculateLayout(content, config);
      
      // Check for overflow
      if (layout.estimatedHeight > layout.maxHeight) {
        throw new LayoutError(
          'Content overflows available space',
          'COLUMN_OVERFLOW',
          'main-content',
          'mathematical-formulas',
          'Reduce content density or adjust spacing'
        );
      }

      return {
        layout,
        warnings: this.errorHandler.getWarnings()
      };

    } catch (error) {
      if (error instanceof LayoutError) {
        const recovery = await this.errorHandler.handleLayoutOverflow(
          error,
          config,
          this.convertContentToBlocks(content)
        );

        if (recovery.success) {
          // Recalculate with adjusted config
          const adjustedLayout = await this.calculateLayout(content, recovery.recoveredContent);
          return {
            layout: adjustedLayout,
            warnings: this.errorHandler.getWarnings()
          };
        }
      }

      // If recovery fails, return minimal layout
      return {
        layout: this.createMinimalLayout(content),
        warnings: this.errorHandler.getWarnings()
      };
    }
  }

  private async calculateLayout(content: MathematicalContent, config: CompactLayoutConfig): Promise<any> {
    // Simulate layout calculation
    const totalFormulas = content.formulas.length;
    const totalExamples = content.workedExamples.length;
    
    const estimatedHeight = (totalFormulas * 30) + (totalExamples * 100); // Rough estimation
    const maxHeight = config.paperSize === 'a4' ? 800 : 900;

    return {
      columns: config.columns,
      estimatedHeight,
      maxHeight,
      formulas: content.formulas,
      examples: content.workedExamples,
      config
    };
  }

  private convertContentToBlocks(content: MathematicalContent): any[] {
    const blocks = [];
    
    content.formulas.forEach(formula => {
      blocks.push({
        id: formula.id,
        type: 'formula',
        content: formula.latex,
        estimatedHeight: 30,
        breakable: false,
        priority: formula.isKeyFormula ? 3 : 2
      });
    });

    content.workedExamples.forEach(example => {
      blocks.push({
        id: example.id,
        type: 'example',
        content: example.problem,
        estimatedHeight: 100,
        breakable: true,
        priority: 3
      });
    });

    return blocks;
  }

  private createMinimalLayout(content: MathematicalContent): any {
    return {
      columns: 1,
      estimatedHeight: 0,
      maxHeight: 1000,
      formulas: content.formulas.slice(0, 5), // Limit content
      examples: content.workedExamples.slice(0, 3),
      isMinimal: true,
      warning: 'Minimal layout used due to processing errors'
    };
  }

  getErrorSummary() {
    return this.errorHandler.generateErrorSummary();
  }
}

// Enhanced cross-reference system with error handling
export class CrossReferenceSystemWithErrorHandling {
  private errorHandler: CompactStudyErrorHandler;
  private availableReferences: Map<string, any> = new Map();

  constructor() {
    this.errorHandler = new CompactStudyErrorHandler();
  }

  async processCrossReferences(
    references: CrossReference[],
    content: MathematicalContent
  ): Promise<{ processedReferences: any[]; warnings: ProcessingWarning[] }> {
    // Build available references map
    this.buildAvailableReferences(content);

    const processedReferences: any[] = [];

    for (const ref of references) {
      try {
        const processedRef = await this.processReference(ref);
        processedReferences.push(processedRef);
      } catch (error) {
        if (error instanceof CrossReferenceError) {
          const recovery = await this.errorHandler.handleCrossReferenceError(
            error,
            ref,
            this.availableReferences
          );

          if (recovery.success) {
            processedReferences.push(recovery.recoveredContent);
          }
        }
      }
    }

    return {
      processedReferences,
      warnings: this.errorHandler.getWarnings()
    };
  }

  private buildAvailableReferences(content: MathematicalContent): void {
    content.formulas.forEach(formula => {
      this.availableReferences.set(formula.id, {
        type: 'formula',
        content: formula.latex,
        context: formula.context
      });
    });

    content.workedExamples.forEach(example => {
      this.availableReferences.set(example.id, {
        type: 'example',
        title: example.title,
        problem: example.problem
      });
    });

    content.definitions.forEach(def => {
      this.availableReferences.set(def.id, {
        type: 'definition',
        term: def.term,
        definition: def.definition
      });
    });

    content.theorems.forEach(theorem => {
      this.availableReferences.set(theorem.id, {
        type: 'theorem',
        name: theorem.name,
        statement: theorem.statement
      });
    });
  }

  private async processReference(ref: CrossReference): Promise<any> {
    // Check if target exists
    if (!this.availableReferences.has(ref.targetId)) {
      throw new CrossReferenceError(
        `Reference target "${ref.targetId}" not found`,
        'REFERENCE_NOT_FOUND',
        ref.id,
        undefined,
        ref.targetId
      );
    }

    // Simulate processing
    const target = this.availableReferences.get(ref.targetId);
    
    return {
      id: ref.id,
      type: ref.type,
      sourceId: ref.sourceId,
      targetId: ref.targetId,
      displayText: ref.displayText,
      target,
      isProcessed: true
    };
  }

  getErrorSummary() {
    return this.errorHandler.generateErrorSummary();
  }
}

// Complete processing pipeline with comprehensive error handling
export class CompactStudyProcessingPipeline {
  private contentExtractor: EnhancedContentExtractorWithErrorHandling;
  private layoutEngine: CompactLayoutEngineWithErrorHandling;
  private crossRefSystem: CrossReferenceSystemWithErrorHandling;

  constructor() {
    this.contentExtractor = new EnhancedContentExtractorWithErrorHandling();
    this.layoutEngine = new CompactLayoutEngineWithErrorHandling();
    this.crossRefSystem = new CrossReferenceSystemWithErrorHandling();
  }

  async processDocument(
    text: string,
    config: CompactLayoutConfig,
    sourceLocation: SourceLocation
  ): Promise<{
    content: MathematicalContent;
    layout: any;
    crossReferences: any[];
    allWarnings: ProcessingWarning[];
    errorSummary: any;
  }> {
    // Extract content with error handling
    const { content, warnings: extractionWarnings } = await this.contentExtractor.extractMathematicalContent(
      text,
      sourceLocation
    );

    // Generate layout with error handling
    const { layout, warnings: layoutWarnings } = await this.layoutEngine.generateLayout(
      content,
      config
    );

    // Process cross-references with error handling
    const mockCrossRefs: CrossReference[] = [
      {
        id: 'ref-1',
        type: 'formula',
        sourceId: 'source-1',
        targetId: content.formulas[0]?.id || 'missing-formula',
        displayText: 'see Formula 1'
      }
    ];

    const { processedReferences, warnings: crossRefWarnings } = await this.crossRefSystem.processCrossReferences(
      mockCrossRefs,
      content
    );

    // Combine all warnings
    const allWarnings = [
      ...extractionWarnings,
      ...layoutWarnings,
      ...crossRefWarnings
    ];

    // Generate comprehensive error summary
    const errorSummary = {
      extraction: this.contentExtractor.getErrorSummary(),
      layout: this.layoutEngine.getErrorSummary(),
      crossReferences: this.crossRefSystem.getErrorSummary(),
      overall: {
        totalWarnings: allWarnings.length,
        hasErrors: allWarnings.some(w => w.severity === 'error'),
        processingSuccess: allWarnings.filter(w => w.severity === 'error').length === 0
      }
    };

    return {
      content,
      layout,
      crossReferences: processedReferences,
      allWarnings,
      errorSummary
    };
  }

  clearAllWarnings(): void {
    this.contentExtractor.clearWarnings();
    // Layout engine and cross-ref system would need similar methods
  }
}

// Export for use in other modules
export {
  CompactStudyErrorHandler,
  MathContentError,
  LayoutError,
  CrossReferenceError
} from './error-handling';