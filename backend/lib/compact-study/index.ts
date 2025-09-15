// Main exports for compact study generator

// Core types
export type {
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  SolutionStep,
  EnhancedExtractedContent,
  SourceLocation,
  BoundingBox,
  ContentPreservationInfo,
  PreservationIssue,
  ValidationResult,
  MathExtractionConfig,
  AcademicStructure,
  DocumentPart,
  AcademicSection,
  CrossReference,
  NumberingScheme,
  AcademicDocument,
  TOCEntry,
  Appendix,
  DocumentMetadata,
  // Compact Layout Engine types
  CompactLayoutConfig,
  TypographyConfig,
  SpacingConfig,
  MarginConfig,
  MathRenderingConfig,
  LayoutCalculation,
  ColumnDistribution,
  ColumnContent,
  ContentBlock,
  // HTML Output Generator types
  HTMLOutput,
  HTMLGeneratorConfig,
  OutputMetadata
} from './types';

// Enhanced content extractor
export { 
  EnhancedContentExtractor,
  getEnhancedContentExtractor 
} from './enhanced-content-extractor';

// Mathematical pattern recognition
export {
  MathPatternRecognizer,
  getMathPatternRecognizer
} from './math-pattern-recognition';
export type {
  MathPattern,
  MathMatch
} from './math-pattern-recognition';

// Content preservation validator
export {
  ContentPreservationValidator,
  createContentPreservationValidator,
  DEFAULT_VALIDATION_CONFIG
} from './content-preservation-validator';
export type {
  ValidationConfig,
  ContentValidationResult,
  FormulaValidationResult,
  ExampleValidationResult,
  CrossReferenceValidationResult,
  MathRenderingValidationResult,
  ValidationRecommendation
} from './content-preservation-validator';

// Academic structure organizer
export {
  AcademicStructureOrganizer,
  getAcademicStructureOrganizer
} from './academic-structure-organizer';
export type {
  AcademicStructureConfig
} from './academic-structure-organizer';

// Cross-reference system
export {
  CrossReferenceSystem,
  createCrossReferenceSystem
} from './cross-reference-system';
export type {
  CrossReferenceConfig,
  ReferenceFormats,
  ReferenceTracker,
  ValidationResult as CrossRefValidationResult,
  ReferenceCandidate
} from './cross-reference-system';

// Compact layout engine
export {
  CompactLayoutEngine
} from './compact-layout-engine';

// Mathematical content renderer
export {
  MathContentRenderer,
  createMathRenderer,
  extractMathFromText
} from './math-renderer';
export type {
  MathRenderer,
  RenderedFormula,
  RenderedExample,
  RenderedStep,
  RenderedContent,
  ValidationResult as MathValidationResult,
  MathJaxConfig,
  KaTeXConfig
} from './math-renderer';

// HTML output generator
export {
  HTMLOutputGenerator,
  createHTMLOutputGenerator,
  generateCompactHTML
} from './html-output-generator';

// PDF output generator
export {
  PDFOutputGenerator
} from './pdf-output-generator';
export type {
  PDFOutput,
  LaTeXGenerationOptions
} from './pdf-output-generator';

// Markdown output generator
export {
  MarkdownOutputGenerator,
  createMarkdownOutputGenerator,
  generateCompactMarkdown
} from './markdown-output-generator';
export type {
  MarkdownOutput,
  MarkdownGeneratorConfig,
  PandocConfig
} from './types';

export type {
  HTMLOutput,
  HTMLGeneratorConfig,
  OutputMetadata
} from './types';

// Error types
export { MathContentExtractionError, LayoutError } from './types';

// Comprehensive Error Handling System
export {
  MathContentError,
  LayoutError as CompactLayoutError,
  CrossReferenceError,
  CompactStudyErrorHandler,
  errorHandler
} from './error-handling';
export type {
  RecoveryStrategy,
  ProcessingWarning,
  RecoveryResult,
  ErrorSummary
} from './error-handling';

// Error Handling Integration
export {
  EnhancedContentExtractorWithErrorHandling,
  CompactLayoutEngineWithErrorHandling,
  CrossReferenceSystemWithErrorHandling,
  CompactStudyProcessingPipeline
} from './error-handling-integration';

// Processing Pipeline
export {
  ContentProcessingPipeline,
  createProcessingPipeline,
  DEFAULT_PIPELINE_CONFIG
} from './processing-pipeline';
export type {
  ProcessingPipeline,
  SourceDocument,
  ProcessingStage,
  ContentProcessor,
  ProcessingResult,
  ProcessingError,
  ProcessingWarning,
  ProcessingMetrics,
  ProcessingPipelineConfig,
  PipelineStatus,
  PipelineMetrics
} from './processing-pipeline';

// Content Processors
export {
  CONTENT_PROCESSORS,
  createFileProcessor,
  createMathContentProcessor,
  createAcademicStructureProcessor,
  createCrossReferenceProcessor,
  createDiscreteProbabilityProcessor
} from './content-processors';

// Discrete Probability Processor
export {
  DiscreteProbabilityProcessor
} from './discrete-probability-processor';

// Relations Processor
export {
  RelationsProcessor,
  createRelationsProcessor
} from './relations-processor';

// Pipeline Orchestrator
export {
  PipelineOrchestrator,
  ProbabilityPipelineOrchestrator,
  RelationsPipelineOrchestrator,
  CompactStudyPipelineOrchestrator,
  createPipelineOrchestrator,
  createProbabilityPipeline,
  createRelationsPipeline,
  createCompactStudyPipeline,
  processCompactStudyDocuments,
  STANDARD_PIPELINE_STAGES
} from './pipeline-orchestrator';
export type {
  PipelineOrchestratorConfig
} from './pipeline-orchestrator';

// CLI Configuration System
export {
  ConfigValidator,
  CLIArgumentParser,
  DEFAULT_CLI_CONFIG
} from './cli-config';
export type {
  CLIConfig,
  ValidationResult as CLIValidationResult,
  ConfigFile
} from './cli-config';

export {
  ConfigFileManager
} from './config-file-manager';

export {
  CompactStudyCLI,
  ExtendedCLIArgumentParser
} from './cli-interface';
export type {
  CLIOptions
} from './cli-interface';

// Performance Optimization System
export {
  PerformanceOptimizer,
  createPerformanceOptimizer,
  DEFAULT_PERFORMANCE_CONFIG
} from './performance-optimizer';
export type {
  PerformanceConfig,
  PerformanceMetrics,
  OptimizationResult,
  ConcurrentProcessingTask,
  ContentDensityAnalysis,
  DensityRecommendation
} from './performance-optimizer';

// Convenience functions for common operations
import { getEnhancedContentExtractor } from './enhanced-content-extractor';
import { getMathPatternRecognizer } from './math-pattern-recognition';
import { createContentPreservationValidator } from './content-preservation-validator';
import { getAcademicStructureOrganizer } from './academic-structure-organizer';
import { createCrossReferenceSystem } from './cross-reference-system';
import { CompactLayoutEngine } from './compact-layout-engine';
import { createMathRenderer } from './math-renderer';
import { createHTMLOutputGenerator, generateCompactHTML } from './html-output-generator';
import { PDFOutputGenerator } from './pdf-output-generator';
import { createMarkdownOutputGenerator, generateCompactMarkdown } from './markdown-output-generator';
import { createPerformanceOptimizer } from './performance-optimizer';

export const CompactStudyGenerator = {
  // Extract mathematical content from files
  extractMathematicalContent: (file: File, config?: any) => 
    getEnhancedContentExtractor().extractMathematicalContent(file, config),
  
  // Find mathematical patterns in text
  findMathPatterns: (text: string) => 
    getMathPatternRecognizer().findMathPatterns(text),
  
  // Extract formulas with LaTeX conversion
  extractFormulasWithLatex: (text: string) => 
    getMathPatternRecognizer().extractFormulasWithLatex(text),
  
  // Detect worked examples
  detectWorkedExamples: (text: string) => 
    getMathPatternRecognizer().detectWorkedExamples(text),
  
  // Validate content preservation
  validatePreservation: (sourceText: string, extractedContent: any, config?: any) => 
    createContentPreservationValidator(config).validateContentPreservation(extractedContent),
  
  // Generate preservation report
  generatePreservationReport: (preservationInfo: any) => 
    createContentPreservationValidator().generatePreservationReport?.(preservationInfo),
  
  // Validate LaTeX syntax
  validateLatex: (latex: string) => 
    getMathPatternRecognizer().validateLatex(latex),
  
  // Organize content into academic structure
  organizeContent: (extractedContents: any[], title?: string) => 
    getAcademicStructureOrganizer().organizeContent(extractedContents, title),
  
  // Create academic structure organizer
  createAcademicOrganizer: (config?: any) => 
    getAcademicStructureOrganizer(config),
  
  // Create cross-reference system
  createCrossReferenceSystem: (config?: any) => 
    createCrossReferenceSystem(config),
  
  // Generate cross-references for document
  generateCrossReferences: (document: any, config?: any) => 
    createCrossReferenceSystem(config).generateCrossReferences(document),
  
  // Validate cross-references
  validateCrossReferences: (references: any[], referenceableItems: any, config?: any) => 
    createCrossReferenceSystem(config).validateReferences(references, referenceableItems),
  
  // Create compact layout engine
  createLayoutEngine: (config?: any) => 
    new CompactLayoutEngine(config),
  
  // Calculate layout dimensions
  calculateLayout: (config?: any) => 
    new CompactLayoutEngine(config).calculateLayout(),
  
  // Distribute content across columns
  distributeContent: (contentBlocks: any[], config?: any) => 
    new CompactLayoutEngine(config).distributeContent(contentBlocks),
  
  // Create content block
  createContentBlock: (id: string, content: string, type: any, options?: any, config?: any) => 
    new CompactLayoutEngine(config).createContentBlock(id, content, type, options),
  
  // Create math renderer
  createMathRenderer: (config?: any, renderer?: 'mathjax' | 'katex' | 'fallback') => 
    createMathRenderer(config, renderer),
  
  // Render mathematical formula
  renderFormula: (formula: any, config?: any, renderer?: 'mathjax' | 'katex' | 'fallback') => 
    createMathRenderer(config, renderer).renderFormula(formula),
  
  // Render worked example
  renderWorkedExample: (example: any, config?: any, renderer?: 'mathjax' | 'katex' | 'fallback') => 
    createMathRenderer(config, renderer).renderWorkedExample(example),
  
  // Generate HTML output
  generateHTML: (document: any, config?: any, layoutConfig?: any) => 
    generateCompactHTML(document, config, layoutConfig),
  
  // Create HTML output generator
  createHTMLGenerator: (config?: any, layoutConfig?: any) => 
    createHTMLOutputGenerator(config, layoutConfig),
  
  // Create PDF output generator
  createPDFGenerator: (tempDir?: string) => 
    new PDFOutputGenerator(tempDir),
  
  // Generate PDF output
  generatePDF: (document: any, config: any, options?: any, tempDir?: string) => 
    new PDFOutputGenerator(tempDir).generatePDF(document, config, options),
  
  // Generate Markdown output
  generateMarkdown: (document: any, config?: any, layoutConfig?: any, pandocConfig?: any) => 
    generateCompactMarkdown(document, config, layoutConfig, pandocConfig),
  
  // Create Markdown output generator
  createMarkdownGenerator: (config?: any, layoutConfig?: any, pandocConfig?: any) => 
    createMarkdownOutputGenerator(config, layoutConfig, pandocConfig),
  
  // Performance optimization
  createPerformanceOptimizer: (config?: any) => 
    createPerformanceOptimizer(config),
  
  // Process large PDF efficiently
  processLargePDFEfficiently: (document: any, processor: any, config?: any) => 
    createPerformanceOptimizer(config).processLargePDFEfficiently(document, processor),
  
  // Process documents concurrently
  processConcurrently: (documents: any[], processor: any, config?: any) => 
    createPerformanceOptimizer(config).processConcurrently(documents, processor),
  
  // Measure page count reduction
  measurePageCountReduction: (originalDoc: any, optimizedDoc: any, layoutConfig: any, config?: any) => 
    createPerformanceOptimizer(config).measurePageCountReduction(originalDoc, optimizedDoc, layoutConfig),
  
  // Optimize content density
  optimizeContentDensity: (document: any, layoutConfig: any, targetDensity?: number, config?: any) => 
    createPerformanceOptimizer(config).optimizeContentDensity(document, layoutConfig, targetDensity),
  
  // Get performance report
  getPerformanceReport: (config?: any) => 
    createPerformanceOptimizer(config).getPerformanceReport(),
  
  // Get optimization recommendations
  getOptimizationRecommendations: (document: any, layoutConfig: any, config?: any) => 
    createPerformanceOptimizer(config).getOptimizationRecommendations(document, layoutConfig)
};

// Default export for convenience
export default CompactStudyGenerator;