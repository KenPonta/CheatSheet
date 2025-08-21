// Core types for file processing system

export interface ExtractedImage {
  id: string;
  base64: string;
  ocrText?: string;
  context: string;
  isExample: boolean;
  // Enhanced OCR properties
  ocrConfidence?: number;
  preprocessedImage?: string; // base64 of preprocessed image
  detectedLanguages?: string[];
  boundingBoxes?: TextBoundingBox[];
  imageAnalysis?: ImageAnalysis;
}

export interface TextBoundingBox {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface ImageAnalysis {
  hasText: boolean;
  hasDiagrams: boolean;
  hasCharts: boolean;
  hasFormulas: boolean;
  hasExamples: boolean;
  contentType: 'diagram' | 'text' | 'chart' | 'formula' | 'example' | 'mixed' | 'unknown';
  confidence: number;
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: string[][];
  context: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  pageCount?: number;
  wordCount?: number;
  
  // Enhanced content metrics
  characterCount?: number;
  lineCount?: number;
  estimatedReadingTime?: number;
  textDensityPerPage?: number;
  
  // Content analysis
  hasStructuredContent?: boolean;
  hasNumberedSections?: boolean;
  hasBulletPoints?: boolean;
  hasCodeBlocks?: boolean;
  hasMathematicalContent?: boolean;
  hasTabularData?: boolean;
  
  // Language and complexity analysis
  primaryLanguage?: string;
  complexityScore?: number;
  technicalTermDensity?: number;
  
  // PDF-specific metadata
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pdfVersion?: string;
  isEncrypted?: boolean;
  
  // Processing metadata
  processingTimestamp?: Date;
  extractionMethod?: string;
  ocrRequired?: boolean;
}

export interface DocumentStructure {
  headings: Heading[];
  sections: Section[];
  hierarchy: number;
}

export interface Heading {
  level: number;
  text: string;
  page?: number;
}

export interface Section {
  title: string;
  content: string;
  page?: number;
  subsections?: Section[];
}

export interface ExtractedContent {
  text: string;
  images: ExtractedImage[];
  tables: ExtractedTable[];
  metadata: FileMetadata;
  structure: DocumentStructure;
}

export interface ProcessingError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  context?: string;
}

export interface ProcessingResult {
  fileId: string;
  status: 'success' | 'partial' | 'failed';
  content?: ExtractedContent;
  errors: ProcessingError[];
  processingTime: number;
}

export type SupportedFileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'image' | 'txt';

export interface FileValidationResult {
  isValid: boolean;
  fileType?: SupportedFileType;
  errors: string[];
}