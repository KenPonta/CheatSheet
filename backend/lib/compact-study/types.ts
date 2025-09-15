// Types for compact study generator mathematical content extraction

export interface MathematicalContent {
  formulas: Formula[];
  workedExamples: WorkedExample[];
  definitions: Definition[];
  theorems: Theorem[];
}

export interface Formula {
  id: string;
  latex: string;
  context: string;
  type: 'inline' | 'display';
  sourceLocation: SourceLocation;
  isKeyFormula: boolean;
  confidence: number;
  originalText?: string; // Fallback if LaTeX conversion fails
}

export interface WorkedExample {
  id: string;
  title: string;
  problem: string;
  solution: SolutionStep[];
  sourceLocation: SourceLocation;
  subtopic: string;
  confidence: number;
  isComplete: boolean;
}

export interface SolutionStep {
  stepNumber: number;
  description: string;
  formula?: string;
  explanation: string;
  latex?: string;
}

export interface Definition {
  id: string;
  term: string;
  definition: string;
  context: string;
  sourceLocation: SourceLocation;
  relatedFormulas: string[]; // Formula IDs
  confidence: number;
}

export interface Theorem {
  id: string;
  name: string;
  statement: string;
  proof?: string;
  conditions: string[];
  sourceLocation: SourceLocation;
  relatedFormulas: string[]; // Formula IDs
  confidence: number;
}

export interface SourceLocation {
  fileId: string;
  page?: number;
  section?: string;
  coordinates?: BoundingBox;
  textPosition?: {
    start: number;
    end: number;
  };
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Enhanced content extraction result
export interface EnhancedExtractedContent {
  text: string;
  images: ExtractedImage[];
  tables: ExtractedTable[];
  metadata: FileMetadata;
  structure: DocumentStructure;
  mathematicalContent: MathematicalContent;
  contentPreservation: ContentPreservationInfo;
}

export interface ExtractedImage {
  id: string;
  base64: string;
  ocrText?: string;
  context: string;
  isExample: boolean;
  containsMath?: boolean;
  mathContent?: string[];
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: string[][];
  context: string;
  containsMath?: boolean;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  pageCount?: number;
  wordCount?: number;
  mathContentDensity?: number;
  hasWorkedExamples?: boolean;
  academicLevel?: 'undergraduate' | 'graduate' | 'advanced';
}

export interface DocumentStructure {
  headings: Heading[];
  sections: Section[];
  hierarchy: number;
  academicStructure?: AcademicStructure;
}

export interface Heading {
  level: number;
  text: string;
  position: number;
  containsMath?: boolean;
}

export interface Section {
  title: string;
  content: string;
  startPosition: number;
  endPosition: number;
  mathematicalContent?: MathematicalContent;
  sectionType?: 'definition' | 'theorem' | 'example' | 'exercise' | 'general';
}

export interface AcademicStructure {
  parts: DocumentPart[];
  crossReferences: CrossReference[];
  numbering: NumberingScheme;
}

export interface DocumentPart {
  partNumber: number;
  title: string;
  sections: AcademicSection[];
}

export interface AcademicSection {
  sectionNumber: string; // e.g., "1.1", "2.3"
  title: string;
  content: string;
  formulas: Formula[];
  examples: WorkedExample[];
  subsections: AcademicSection[];
}

export interface CrossReference {
  id: string;
  type: 'example' | 'formula' | 'section' | 'theorem' | 'definition';
  sourceId: string;
  targetId: string;
  displayText: string; // e.g., "see Ex. 3.2"
}

export interface NumberingScheme {
  sections: boolean;
  examples: boolean;
  formulas: boolean;
  theorems: boolean;
  definitions: boolean;
}

// Additional interfaces for academic document structure
export interface AcademicDocument {
  title: string;
  tableOfContents: TOCEntry[];
  parts: DocumentPart[];
  crossReferences: CrossReference[];
  appendices: Appendix[];
  metadata: DocumentMetadata;
}

export interface TOCEntry {
  level: number;
  title: string;
  sectionNumber?: string;
  pageAnchor: string;
  children: TOCEntry[];
}

export interface Appendix {
  id: string;
  title: string;
  content: string;
  type: 'exercises' | 'answers' | 'references' | 'formulas';
}

export interface DocumentMetadata {
  generatedAt: Date;
  sourceFiles: string[];
  totalSections: number;
  totalFormulas: number;
  totalExamples: number;
  preservationScore: number;
}

export interface ContentPreservationInfo {
  totalFormulasFound: number;
  formulasPreserved: number;
  totalExamplesFound: number;
  examplesPreserved: number;
  preservationScore: number; // 0-1 scale
  issues: PreservationIssue[];
  validationResults: ValidationResult[];
}

export interface PreservationIssue {
  type: 'formula_lost' | 'example_incomplete' | 'context_missing' | 'conversion_failed';
  severity: 'low' | 'medium' | 'high';
  description: string;
  sourceLocation?: SourceLocation;
  suggestion?: string;
}

export interface ValidationResult {
  type: 'formula_validation' | 'example_validation' | 'structure_validation';
  passed: boolean;
  details: string;
  confidence: number;
}

// Mathematical content extraction configuration
export interface MathExtractionConfig {
  enableLatexConversion: boolean;
  enableWorkedExampleDetection: boolean;
  enableDefinitionExtraction: boolean;
  enableTheoremExtraction: boolean;
  preservationThreshold: number; // Minimum preservation score required
  confidenceThreshold: number; // Minimum confidence for inclusion
  fallbackToOCR: boolean; // Use OCR if text extraction fails
  validateExtraction: boolean; // Run validation after extraction
}

// Compact Layout Engine Types
export interface CompactLayoutConfig {
  paperSize: 'a4' | 'letter' | 'legal';
  columns: 1 | 2 | 3;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  margins: MarginConfig;
  mathRendering: MathRenderingConfig;
}

export interface TypographyConfig {
  fontSize: number; // 10-11pt default
  lineHeight: number; // 1.15-1.25
  fontFamily: {
    body: string;
    heading: string;
    math: string;
    code: string;
  };
}

export interface SpacingConfig {
  paragraphSpacing: number; // ≤ 0.35em
  listSpacing: number; // ≤ 0.25em
  sectionSpacing: number;
  headingMargins: {
    top: number;
    bottom: number;
  };
}

export interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
  columnGap: number;
}

export interface MathRenderingConfig {
  displayEquations: {
    centered: boolean;
    numbered: boolean;
    fullWidth: boolean; // for column overflow
  };
  inlineEquations: {
    preserveInline: boolean;
    maxHeight: number;
  };
}

export interface LayoutCalculation {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
  columnWidth: number;
  columnCount: number;
  effectiveLineHeight: number;
  linesPerColumn: number;
  charactersPerLine: number;
  estimatedContentDensity: number;
}

export interface ColumnDistribution {
  columns: ColumnContent[];
  totalHeight: number;
  balanceScore: number; // 0-1, higher is better balanced
  overflowRisk: number; // 0-1, higher means more likely to overflow
}

export interface ColumnContent {
  columnIndex: number;
  content: ContentBlock[];
  estimatedHeight: number;
  actualHeight?: number;
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'formula' | 'example' | 'heading' | 'list';
  content: string;
  estimatedHeight: number;
  breakable: boolean; // Can this block be split across columns?
  priority: number; // Higher priority content should be kept together
}

// Error types for mathematical content extraction
export class MathContentExtractionError extends Error {
  public code: 'FORMULA_EXTRACTION_FAILED' | 'EXAMPLE_PARSING_FAILED' | 'LATEX_CONVERSION_FAILED' | 'VALIDATION_FAILED';
  public sourceLocation?: SourceLocation;
  public recoverable: boolean;

  constructor(
    message: string,
    code: 'FORMULA_EXTRACTION_FAILED' | 'EXAMPLE_PARSING_FAILED' | 'LATEX_CONVERSION_FAILED' | 'VALIDATION_FAILED',
    sourceLocation?: SourceLocation,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'MathContentExtractionError';
    this.code = code;
    this.sourceLocation = sourceLocation;
    this.recoverable = recoverable;
  }
}

// HTML Output Generator Types
export interface HTMLOutput {
  html: string;
  css: string;
  mathJaxConfig: MathJaxConfig;
  metadata: OutputMetadata;
}

export interface MathJaxConfig {
  tex: {
    inlineMath: string[][];
    displayMath: string[][];
    processEscapes: boolean;
    processEnvironments: boolean;
    tags: 'ams' | 'all' | 'none';
  };
  svg: {
    fontCache: 'global' | 'local' | 'none';
    displayAlign: 'left' | 'center' | 'right';
    displayIndent: string;
  };
  options: {
    skipHtmlTags: string[];
    includeHtmlTags: string[];
    processHtmlClass: string;
    ignoreHtmlClass: string;
  };
}

export interface OutputMetadata {
  generatedAt: Date;
  format: 'html' | 'pdf' | 'markdown';
  sourceFiles: string[];
  config: CompactLayoutConfig;
  stats: {
    totalPages?: number;
    totalSections: number;
    totalFormulas: number;
    totalExamples: number;
    estimatedPrintPages: number;
  };
  preservationScore: number;
}

// Markdown Output Generator Types
export interface MarkdownOutput {
  markdown: string;
  pandocTemplate: string;
  metadata: OutputMetadata;
  frontMatter: string;
}

export interface PandocConfig {
  template: 'compact' | 'academic' | 'custom';
  mathRenderer: 'mathjax' | 'katex' | 'webtex' | 'mathml';
  citationStyle?: string;
  bibliography?: string;
  customTemplate?: string;
  variables: Record<string, any>;
}

export interface MarkdownGeneratorConfig {
  includeFrontMatter: boolean;
  includeTableOfContents: boolean;
  mathDelimiters: 'latex' | 'pandoc' | 'github';
  codeBlocks: boolean;
  preserveLineBreaks: boolean;
  pandocCompatible: boolean;
  generateTemplate: boolean;
}

export interface HTMLGeneratorConfig {
  includeTableOfContents: boolean;
  includeMathJax: boolean;
  compactMode: boolean;
  removeCardComponents: boolean;
  generateResponsive: boolean;
  customCSS?: string;
}

// Layout Engine Error Types
export class LayoutError extends Error {
  public code: 'COLUMN_OVERFLOW' | 'CONTENT_TOO_LARGE' | 'INVALID_CONFIG' | 'CALCULATION_FAILED';
  public section?: string;
  public contentType?: string;
  public suggestion?: string;

  constructor(
    message: string,
    code: 'COLUMN_OVERFLOW' | 'CONTENT_TOO_LARGE' | 'INVALID_CONFIG' | 'CALCULATION_FAILED',
    section?: string,
    contentType?: string,
    suggestion?: string
  ) {
    super(message);
    this.name = 'LayoutError';
    this.code = code;
    this.section = section;
    this.contentType = contentType;
    this.suggestion = suggestion;
  }
}