// AI Service Types
export interface ExtractedContent {
  text: string;
  images: ExtractedImage[];
  tables: ExtractedTable[];
  metadata: FileMetadata;
  structure: DocumentStructure;
}

export interface ExtractedImage {
  id: string;
  base64: string;
  ocrText?: string;
  context: string;
  isExample: boolean;
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
}

export interface DocumentStructure {
  headings: Heading[];
  sections: Section[];
  hierarchy: number;
}

export interface Heading {
  level: number;
  text: string;
  position: number;
}

export interface Section {
  title: string;
  content: string;
  startPosition: number;
  endPosition: number;
}

export interface TopicExtractionRequest {
  content: ExtractedContent[];
  userPreferences: {
    maxTopics: number;
    focusAreas: string[];
    excludePatterns: string[];
  };
  spaceConstraints?: SpaceConstraints;
  referenceAnalysis?: ReferenceFormatAnalysis;
}

export interface SpaceConstraints {
  availablePages: number;
  referenceContentDensity?: number;
  targetUtilization: number; // 0.8-0.95 for optimal space usage
  pageSize: 'a4' | 'letter' | 'legal' | 'a3';
  fontSize: 'small' | 'medium' | 'large';
  columns: 1 | 2 | 3;
}

export interface OrganizedTopic {
  id: string;
  title: string;
  content: string;
  subtopics: EnhancedSubTopic[];
  sourceFiles: string[];
  confidence: number;
  examples: ExtractedImage[];
  originalWording: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedSpace?: number;
  isSelected?: boolean;
}

export interface SubTopic {
  id: string;
  title: string;
  content: string;
  confidence: number;
  sourceLocation: SourceLocation;
}

export interface EnhancedSubTopic extends SubTopic {
  priority?: 'high' | 'medium' | 'low';
  estimatedSpace?: number;
  isSelected?: boolean;
  parentTopicId?: string;
}

export interface SourceLocation {
  fileId: string;
  page?: number;
  section?: string;
  coordinates?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FidelityScore {
  score: number; // 0-1 scale
  issues: FidelityIssue[];
  recommendation: 'accept' | 'review' | 'reject';
}

export interface FidelityIssue {
  type: 'added_content' | 'changed_meaning' | 'lost_context' | 'terminology_change';
  severity: 'low' | 'medium' | 'high';
  description: string;
  originalText: string;
  processedText: string;
}

// Image generation and recreation types
export interface ImageGenerationRequest {
  description: string;
  style: 'diagram' | 'example' | 'chart' | 'illustration';
  context: string;
  originalImage?: ExtractedImage;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
}

export interface GeneratedImage {
  id: string;
  url: string;
  base64?: string;
  prompt: string;
  style: string;
  generationTime: number;
  metadata: {
    model: string;
    size: string;
    quality: string;
    revisedPrompt?: string;
  };
}

export interface ImageQualityAssessment {
  originalScore: number; // 0-1 scale
  recreatedScore: number; // 0-1 scale
  recommendation: 'use_original' | 'use_recreated' | 'needs_review';
  factors: {
    clarity: number;
    relevance: number;
    accuracy: number;
    readability: number;
  };
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'clarity' | 'accuracy' | 'relevance' | 'readability' | 'content_mismatch';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

export interface ImageRecreationResult {
  originalImage: ExtractedImage;
  generatedImage?: GeneratedImage;
  qualityAssessment: ImageQualityAssessment;
  userApprovalRequired: boolean;
  fallbackToOriginal: boolean;
  processingTime: number;
}

export interface ImageContextAnalysis {
  needsRecreation: boolean;
  recreationReason: string;
  contentType: 'diagram' | 'example' | 'chart' | 'formula' | 'illustration' | 'text' | 'other';
  educationalValue: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'moderate' | 'complex';
  extractedElements: string[];
  generationPrompt?: string;
}

export interface UserApprovalWorkflow {
  imageId: string;
  originalImage: ExtractedImage;
  recreatedImage?: GeneratedImage;
  qualityAssessment: ImageQualityAssessment;
  userChoice?: 'original' | 'recreated' | 'regenerate' | 'skip';
  feedback?: string;
  timestamp: Date;
}

// Space-aware topic extraction types
export interface ReferenceFormatAnalysis {
  contentDensity: number; // characters per page
  topicCount: number;
  averageTopicLength: number;
  layoutPattern: 'single-column' | 'multi-column' | 'mixed';
  visualElements: ReferenceVisualElements;
  organizationStyle: 'hierarchical' | 'flat' | 'mixed';
}

export interface ReferenceVisualElements {
  headerStyles: HeaderStyle[];
  bulletStyles: BulletStyle[];
  spacingPatterns: SpacingPattern[];
  colorScheme: ColorScheme;
  fontHierarchy: FontHierarchy[];
}

export interface HeaderStyle {
  level: number;
  fontSize: string;
  fontWeight: string;
  color: string;
  spacing: string;
}

export interface BulletStyle {
  type: 'bullet' | 'number' | 'dash' | 'custom';
  symbol: string;
  indentation: number;
}

export interface SpacingPattern {
  type: 'paragraph' | 'section' | 'topic' | 'subtopic';
  before: number;
  after: number;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

export interface FontHierarchy {
  level: number;
  fontSize: number;
  fontWeight: string;
  usage: string;
}

export interface SpaceOptimizationResult {
  recommendedTopics: string[];
  recommendedSubtopics: { topicId: string; subtopicIds: string[] }[];
  utilizationScore: number;
  suggestions: SpaceSuggestion[];
  estimatedFinalUtilization: number;
}

export interface SpaceSuggestion {
  type: 'add_topic' | 'add_subtopic' | 'expand_content' | 'reduce_content';
  targetId: string;
  description: string;
  spaceImpact: number;
}

export interface TopicSelection {
  topicId: string;
  subtopicIds: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedSpace: number;
}

export interface SpaceUtilizationInfo {
  totalAvailableSpace: number;
  usedSpace: number;
  remainingSpace: number;
  utilizationPercentage: number;
  suggestions: SpaceSuggestion[];
}

export class AIServiceError extends Error {
  public code: 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'CONTENT_VALIDATION_FAILED' | 'IMAGE_GENERATION_FAILED';
  public retryable: boolean;
  public details?: any;

  constructor(
    message: string,
    options: {
      code: 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'CONTENT_VALIDATION_FAILED' | 'IMAGE_GENERATION_FAILED';
      retryable: boolean;
      details?: any;
    }
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.details = options.details;
  }
}