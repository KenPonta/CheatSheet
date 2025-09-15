// Content processors for probability and relations content

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
  AcademicDocument,
  DocumentPart,
  AcademicSection,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  CrossReference,
  MathContentExtractionError
} from './types';
import { getEnhancedContentExtractor } from './enhanced-content-extractor';
import { getMathPatternRecognizer } from './math-pattern-recognition';
import { getAcademicStructureOrganizer } from './academic-structure-organizer';
import { createCrossReferenceSystem } from './cross-reference-system';
import { DiscreteProbabilityProcessor } from './discrete-probability-processor';
import { RelationsProcessor } from './relations-processor';

// File Processing Processor
export class FileProcessingProcessor implements ContentProcessor {
  name = 'file-processor';
  version = '1.0.0';

  async process(input: SourceDocument[], config: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];
    const processedDocuments: SourceDocument[] = [];

    try {
      const extractor = getEnhancedContentExtractor();

      for (const doc of input) {
        try {
          doc.processingStatus = 'processing';
          console.log(`🔄 Processing document: ${doc.file.name}`);
          
          // Extract content from file
          const extractedContent = await extractor.extractMathematicalContent(doc.file, config);
          doc.extractedContent = extractedContent;
          doc.processingStatus = 'completed';
          
          console.log(`✅ Successfully processed: ${doc.file.name}`);
          processedDocuments.push(doc);

        } catch (error) {
          console.error(`❌ Failed to process ${doc.file.name}:`, error);
          
          const processingError: ProcessingError = {
            id: `file_error_${Date.now()}`,
            stage: this.name,
            type: 'extraction',
            severity: 'medium', // Reduced severity to allow continuation
            message: `Failed to process file ${doc.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            recoverable: true,
            timestamp: new Date(),
            sourceDocument: doc.id
          };
          
          errors.push(processingError);
          doc.errors.push(processingError);
          doc.processingStatus = 'failed';
          
          // Still add the document to processed list with minimal content if it has some extracted content
          if (doc.extractedContent) {
            console.log(`⚠️ Adding partially processed document: ${doc.file.name}`);
            processedDocuments.push(doc);
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const metrics: ProcessingMetrics = {
        processingTime,
        contentPreserved: processedDocuments.length / input.length,
        qualityScore: processedDocuments.length > 0 ? 0.9 : 0,
        itemsProcessed: processedDocuments.length
      };

      return {
        success: processedDocuments.length > 0,
        data: processedDocuments,
        errors,
        warnings,
        metrics
      };

    } catch (error) {
      const processingError: ProcessingError = {
        id: `processor_error_${Date.now()}`,
        stage: this.name,
        type: 'system',
        severity: 'critical',
        message: `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  validate(input: SourceDocument[], config: any): ValidationResult {
    if (!Array.isArray(input)) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'Input must be an array of SourceDocument objects',
        confidence: 1.0
      };
    }

    if (input.length === 0) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'No source documents provided',
        confidence: 1.0
      };
    }

    for (const doc of input) {
      if (!doc.file) {
        return {
          type: 'formula_validation',
          passed: false,
          details: `Document ${doc.id} missing file`,
          confidence: 1.0
        };
      }
    }

    return {
      type: 'formula_validation',
      passed: true,
      details: 'All source documents valid',
      confidence: 1.0
    };
  }

  async recover(error: ProcessingError, input: SourceDocument[], config: any): Promise<ProcessingResult> {
    // Attempt to process documents individually with fallback settings
    const fallbackConfig = {
      ...config,
      enableLatexConversion: false,
      fallbackToOCR: true,
      confidenceThreshold: 0.3
    };

    return this.process(input, fallbackConfig);
  }
}

// Mathematical Content Extraction Processor
export class MathContentProcessor implements ContentProcessor {
  name = 'math-content-processor';
  version = '1.0.0';

  async process(input: SourceDocument[], config: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];
    const processedDocuments: SourceDocument[] = [];

    try {
      const mathRecognizer = getMathPatternRecognizer();

      for (const doc of input) {
        if (!doc.extractedContent) {
          const warning: ProcessingWarning = {
            id: `math_warning_${Date.now()}`,
            stage: this.name,
            type: 'content_loss',
            message: `Document ${doc.id} has no extracted content, skipping math processing`,
            timestamp: new Date()
          };
          warnings.push(warning);
          continue;
        }

        try {
          console.log(`🔄 Extracting math content from: ${doc.file.name}`);
          
          // Extract mathematical content
          const mathContent = await this.extractMathematicalContent(
            doc.extractedContent, 
            doc.type, 
            mathRecognizer,
            config
          );
          
          doc.mathematicalContent = mathContent;
          console.log(`✅ Math extraction completed for: ${doc.file.name} (${mathContent.formulas.length} formulas, ${mathContent.workedExamples.length} examples)`);
          processedDocuments.push(doc);

        } catch (error) {
          console.error(`❌ Math extraction failed for ${doc.file.name}:`, error);
          
          const processingError: ProcessingError = {
            id: `math_error_${Date.now()}`,
            stage: this.name,
            type: 'extraction',
            severity: 'low', // Reduced severity - math extraction failure shouldn't stop the pipeline
            message: `Failed to extract math content from ${doc.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            recoverable: true,
            timestamp: new Date(),
            sourceDocument: doc.id
          };
          
          errors.push(processingError);
          doc.errors.push(processingError);
          
          // Create minimal math content and continue
          doc.mathematicalContent = {
            formulas: [],
            workedExamples: [],
            definitions: [],
            theorems: []
          };
          
          console.log(`⚠️ Added document with empty math content: ${doc.file.name}`);
          processedDocuments.push(doc);
        }
      }

      const processingTime = Date.now() - startTime;
      const totalFormulas = processedDocuments.reduce((sum, doc) => 
        sum + (doc.mathematicalContent?.formulas.length || 0), 0);
      const totalExamples = processedDocuments.reduce((sum, doc) => 
        sum + (doc.mathematicalContent?.workedExamples.length || 0), 0);

      const metrics: ProcessingMetrics = {
        processingTime,
        contentPreserved: processedDocuments.length / input.length,
        qualityScore: totalFormulas > 0 || totalExamples > 0 ? 0.85 : 0.5,
        itemsProcessed: totalFormulas + totalExamples
      };

      return {
        success: processedDocuments.length > 0,
        data: processedDocuments,
        errors,
        warnings,
        metrics
      };

    } catch (error) {
      const processingError: ProcessingError = {
        id: `math_processor_error_${Date.now()}`,
        stage: this.name,
        type: 'system',
        severity: 'critical',
        message: `Math content processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  private async extractMathematicalContent(
    extractedContent: EnhancedExtractedContent,
    docType: 'probability' | 'relations' | 'general',
    mathRecognizer: any,
    config: any
  ): Promise<MathematicalContent> {
    const text = extractedContent.text;
    
    // Extract formulas
    const formulas = await mathRecognizer.extractFormulasWithLatex(text);
    
    // Extract worked examples
    const workedExamples = await mathRecognizer.detectWorkedExamples(text);
    
    // Extract definitions and theorems based on document type
    const definitions = await this.extractDefinitions(text, docType);
    const theorems = await this.extractTheorems(text, docType);

    return {
      formulas,
      workedExamples,
      definitions,
      theorems
    };
  }

  private async extractDefinitions(text: string, docType: string): Promise<Definition[]> {
    const definitions: Definition[] = [];
    
    // Define patterns based on document type
    const patterns = docType === 'probability' 
      ? [
          /Definition\s*\d*\.?\s*([^.]+)\.\s*([^.]+(?:\.[^.]*)*)/gi,
          /(?:^|\n)\s*([A-Z][^:]+):\s*([^.]+(?:\.[^.]*)*)/gm
        ]
      : [
          /Definition\s*\d*\.?\s*([^.]+)\.\s*([^.]+(?:\.[^.]*)*)/gi,
          /A\s+relation\s+([^.]+)\s+is\s+([^.]+(?:\.[^.]*)*)/gi
        ];

    let id = 1;
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        definitions.push({
          id: `def_${id++}`,
          term: match[1].trim(),
          definition: match[2].trim(),
          context: this.getContext(text, match.index!, 100),
          sourceLocation: {
            fileId: 'current',
            textPosition: {
              start: match.index!,
              end: match.index! + match[0].length
            }
          },
          relatedFormulas: [],
          confidence: 0.8
        });
      }
    }

    return definitions;
  }

  private async extractTheorems(text: string, docType: string): Promise<Theorem[]> {
    const theorems: Theorem[] = [];
    
    // Define patterns based on document type
    const patterns = docType === 'probability'
      ? [
          /(?:Theorem|Law|Rule)\s*\d*\.?\s*([^.]+)\.\s*([^.]+(?:\.[^.]*)*)/gi,
          /(Bayes['\s]*(?:Theorem|Rule|Law))\s*[:.]\s*([^.]+(?:\.[^.]*)*)/gi
        ]
      : [
          /(?:Theorem|Property|Lemma)\s*\d*\.?\s*([^.]+)\.\s*([^.]+(?:\.[^.]*)*)/gi
        ];

    let id = 1;
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        theorems.push({
          id: `thm_${id++}`,
          name: match[1].trim(),
          statement: match[2].trim(),
          conditions: [],
          sourceLocation: {
            fileId: 'current',
            textPosition: {
              start: match.index!,
              end: match.index! + match[0].length
            }
          },
          relatedFormulas: [],
          confidence: 0.8
        });
      }
    }

    return theorems;
  }

  private getContext(text: string, position: number, contextLength: number): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end);
  }

  validate(input: SourceDocument[], config: any): ValidationResult {
    const documentsWithContent = input.filter(doc => doc.extractedContent);
    
    if (documentsWithContent.length === 0) {
      return {
        type: 'formula_validation',
        passed: false,
        details: 'No documents with extracted content found',
        confidence: 1.0
      };
    }

    return {
      type: 'formula_validation',
      passed: true,
      details: `${documentsWithContent.length} documents ready for math processing`,
      confidence: 1.0
    };
  }
}

// Academic Structure Organization Processor
export class AcademicStructureProcessor implements ContentProcessor {
  name = 'academic-structure-processor';
  version = '1.0.0';

  async process(input: SourceDocument[], config: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];

    try {
      console.log(`🔄 Organizing academic structure for ${input.length} documents`);
      
      const organizer = getAcademicStructureOrganizer();
      
      // Prepare extracted contents for organization
      const extractedContents = input
        .filter(doc => doc.extractedContent)
        .map(doc => doc.extractedContent!);

      if (extractedContents.length === 0) {
        console.warn('⚠️ No extracted content available, creating minimal structure');
        // Create a minimal academic document structure
        const academicDocument = this.createMinimalAcademicDocument(input, config);
        
        const processingTime = Date.now() - startTime;
        const metrics: ProcessingMetrics = {
          processingTime,
          contentPreserved: 0.5,
          qualityScore: 0.3,
          itemsProcessed: academicDocument.parts.length
        };

        const warning: ProcessingWarning = {
          id: `structure_warning_${Date.now()}`,
          stage: this.name,
          type: 'content_loss',
          message: 'No extracted content available, created minimal structure',
          timestamp: new Date()
        };
        warnings.push(warning);

        return {
          success: true,
          data: academicDocument,
          errors,
          warnings,
          metrics
        };
      }

      console.log(`📚 Organizing ${extractedContents.length} extracted contents`);
      
      // Organize content into academic structure
      const academicDocument = await organizer.organizeContent(
        extractedContents,
        config.title || 'Compact Study Guide'
      );
      
      console.log(`✅ Academic structure created: ${academicDocument.parts.length} parts, ${academicDocument.parts.reduce((sum, part) => sum + part.sections.length, 0)} sections`);

      const processingTime = Date.now() - startTime;
      const metrics: ProcessingMetrics = {
        processingTime,
        contentPreserved: 1.0,
        qualityScore: 0.9,
        itemsProcessed: academicDocument.parts.length
      };

      return {
        success: true,
        data: academicDocument,
        errors,
        warnings,
        metrics
      };

    } catch (error) {
      const processingError: ProcessingError = {
        id: `structure_error_${Date.now()}`,
        stage: this.name,
        type: 'transformation',
        severity: 'high',
        message: `Academic structure organization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
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

  private createMinimalAcademicDocument(input: SourceDocument[], config: any): AcademicDocument {
    const parts: DocumentPart[] = [];
    let partNumber = 1;

    for (const doc of input) {
      const partTitle = doc.type === 'probability' 
        ? 'Part I: Discrete Probability'
        : doc.type === 'relations'
        ? 'Part II: Relations'
        : `Part ${partNumber}: ${doc.file.name.replace('.pdf', '')}`;

      const sections: AcademicSection[] = [{
        sectionNumber: `${partNumber}.1`,
        title: 'Content Overview',
        content: doc.extractedContent?.text || `Content from ${doc.file.name} (${doc.file.size} bytes)`,
        formulas: doc.mathematicalContent?.formulas || [],
        examples: doc.mathematicalContent?.workedExamples || [],
        subsections: []
      }];

      parts.push({
        partNumber,
        title: partTitle,
        sections
      });

      partNumber++;
    }

    return {
      title: config.title || 'Compact Study Guide',
      tableOfContents: parts.map((part, index) => ({
        id: `part${index + 1}`,
        title: part.title,
        level: 1,
        pageNumber: index + 1
      })),
      parts,
      crossReferences: [],
      appendices: [],
      metadata: {
        generatedAt: new Date(),
        sourceFiles: input.map(doc => doc.file.name),
        totalSections: parts.reduce((sum, part) => sum + part.sections.length, 0),
        totalFormulas: parts.reduce((sum, part) => 
          sum + part.sections.reduce((sSum, section) => sSum + section.formulas.length, 0), 0),
        totalExamples: parts.reduce((sum, part) => 
          sum + part.sections.reduce((sSum, section) => sSum + section.examples.length, 0), 0),
        preservationScore: 0.5
      }
    };
  }

  validate(input: SourceDocument[], config: any): ValidationResult {
    const documentsWithMathContent = input.filter(doc => doc.mathematicalContent);
    
    if (documentsWithMathContent.length === 0) {
      return {
        type: 'structure_validation',
        passed: false,
        details: 'No documents with mathematical content found',
        confidence: 1.0
      };
    }

    return {
      type: 'structure_validation',
      passed: true,
      details: `${documentsWithMathContent.length} documents ready for structure organization`,
      confidence: 1.0
    };
  }

  async recover(error: ProcessingError, input: SourceDocument[], config: any): Promise<ProcessingResult> {
    // Attempt with simplified structure
    const fallbackConfig = {
      ...config,
      enableCrossReferences: false,
      simplifiedStructure: true
    };

    return this.process(input, fallbackConfig);
  }
}

// Cross-Reference Generation Processor
export class CrossReferenceProcessor implements ContentProcessor {
  name = 'cross-reference-processor';
  version = '1.0.0';

  async process(input: AcademicDocument, config: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];

    try {
      const crossRefSystem = createCrossReferenceSystem(config);
      
      // Generate cross-references for the document
      const crossReferences = await crossRefSystem.generateCrossReferences(input);
      
      // Update document with cross-references
      const updatedDocument: AcademicDocument = {
        ...input,
        crossReferences
      };

      const processingTime = Date.now() - startTime;
      const metrics: ProcessingMetrics = {
        processingTime,
        contentPreserved: 1.0,
        qualityScore: crossReferences.length > 0 ? 0.95 : 0.7,
        itemsProcessed: crossReferences.length
      };

      return {
        success: true,
        data: updatedDocument,
        errors,
        warnings,
        metrics
      };

    } catch (error) {
      const processingError: ProcessingError = {
        id: `crossref_error_${Date.now()}`,
        stage: this.name,
        type: 'transformation',
        severity: 'medium',
        message: `Cross-reference generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: true,
        timestamp: new Date()
      };

      return {
        success: false,
        data: input, // Return original document without cross-references
        errors: [processingError],
        warnings,
        metrics: {
          processingTime: Date.now() - startTime,
          contentPreserved: 1.0,
          qualityScore: 0.7,
          itemsProcessed: 0
        }
      };
    }
  }

  validate(input: AcademicDocument, config: any): ValidationResult {
    if (!input.parts || input.parts.length === 0) {
      return {
        type: 'structure_validation',
        passed: false,
        details: 'Document has no parts to cross-reference',
        confidence: 1.0
      };
    }

    return {
      type: 'structure_validation',
      passed: true,
      details: 'Document ready for cross-reference generation',
      confidence: 1.0
    };
  }

  async recover(error: ProcessingError, input: AcademicDocument, config: any): Promise<ProcessingResult> {
    // Return document without cross-references as fallback
    const warning: ProcessingWarning = {
      id: `crossref_warning_${Date.now()}`,
      stage: this.name,
      type: 'quality_degradation',
      message: 'Cross-references disabled due to processing error',
      timestamp: new Date()
    };

    return {
      success: true,
      data: input,
      errors: [],
      warnings: [warning],
      metrics: {
        processingTime: 0,
        contentPreserved: 1.0,
        qualityScore: 0.7,
        itemsProcessed: 0
      }
    };
  }
}

// Export all processors
export const CONTENT_PROCESSORS = {
  FileProcessingProcessor,
  MathContentProcessor,
  AcademicStructureProcessor,
  CrossReferenceProcessor,
  DiscreteProbabilityProcessor,
  RelationsProcessor
};

// Factory functions for creating processors
export function createFileProcessor(): FileProcessingProcessor {
  return new FileProcessingProcessor();
}

export function createMathContentProcessor(): MathContentProcessor {
  return new MathContentProcessor();
}

export function createAcademicStructureProcessor(): AcademicStructureProcessor {
  return new AcademicStructureProcessor();
}

export function createCrossReferenceProcessor(): CrossReferenceProcessor {
  return new CrossReferenceProcessor();
}

export function createDiscreteProbabilityProcessor(): DiscreteProbabilityProcessor {
  return new DiscreteProbabilityProcessor();
}

export function createRelationsProcessor(): RelationsProcessor {
  return new RelationsProcessor();
}