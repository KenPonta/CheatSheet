// Frontend types for cheat sheet application

export interface ExtractedTopic {
  id: string
  topic: string
  content: string
  confidence: number
  source: string
  subtopics?: SubTopic[]
  examples?: ExtractedImage[]
  originalWording?: string
}

export interface SelectedTopic extends ExtractedTopic {
  selected: boolean
  customContent?: string
  originalContent: string
  isModified: boolean
}

export interface SubTopic {
  id: string
  title: string
  content: string
}

export interface ExtractedImage {
  id: string
  base64?: string
  ocrText?: string
  context: string
  isExample: boolean
  isRecreated?: boolean
}

export interface CheatSheetConfig {
  paperSize: 'a4' | 'letter' | 'legal' | 'a3'
  orientation: 'portrait' | 'landscape'
  columns: 1 | 2 | 3
  fontSize: 'small' | 'medium' | 'large'
  pageCount?: number
  referenceText: string
  referenceImage: File | null
  includeHeaders?: boolean
  includeFooters?: boolean
  customStyles?: string
}

export interface TopicExtractionResponse {
  topics: ExtractedTopic[]
  totalFiles: number
  successfulFiles: number
  failedFiles: number
  processingStats: {
    totalProcessingTime: number
    cacheHits: number
    memoryUsage: number
  }
  message: string
  warnings?: Array<{
    fileName: string
    error: string
    suggestion: string
  }>
}

export interface CheatSheetGenerationRequest {
  topics: Array<{
    id?: string
    topic: string
    content: string
    customContent?: string
    images?: Array<{
      id: string
      src: string
      alt: string
      caption?: string
      width?: number
      height?: number
      isRecreated?: boolean
    }>
    priority?: number
    subtopics?: SubTopic[]
    examples?: ExtractedImage[]
    originalWording?: string
  }>
  config: CheatSheetConfig
  title?: string
  subtitle?: string
  outputFormat?: 'html' | 'pdf' | 'both'
  enableImageRecreation?: boolean
  enableContentValidation?: boolean
}

export interface CheatSheetGenerationResponse {
  html: string
  success: boolean
  message: string
  warnings: string[]
  pageCount: number
  contentFit: {
    fitsInPages: boolean
    estimatedPages: number
    overflowContent?: string[]
  }
  pdf?: string // base64 encoded PDF
  imageRecreation?: {
    total: number
    recreated: number
    needsApproval: number
    fallbackToOriginal: number
  }
  fidelityValidation?: {
    checked: number
    warnings: number
  }
}

export interface FileUploadState {
  files: File[]
  isUploading: boolean
  uploadProgress: number
  errors: string[]
}

export interface ProcessingState {
  isExtracting: boolean
  extractionProgress: number
  isGenerating: boolean
  generationProgress: number
  currentStage: string
}

export interface AppState {
  // File upload
  uploadedFiles: File[]
  isDragOver: boolean
  
  // Topic extraction
  isExtracting: boolean
  extractedTopics: ExtractedTopic[]
  extractionComplete: boolean
  selectedTopics: SelectedTopic[]
  
  // UI state
  showTopicSelection: boolean
  showCustomization: boolean
  showCheatSheet: boolean
  editingTopic: string | null
  
  // Configuration
  cheatSheetConfig: CheatSheetConfig
  
  // Generation
  isGenerating: boolean
  generatedCheatSheet: string | null
  
  // Enhanced features
  processingStats?: {
    totalProcessingTime: number
    cacheHits: number
    memoryUsage: number
  }
  warnings: string[]
  imageApprovalWorkflows?: any[]
}

// Utility types for form handling
export type ConfigKey = keyof CheatSheetConfig
export type ConfigValue = CheatSheetConfig[ConfigKey]

// Error handling types
export interface ProcessingError {
  type: 'file_processing' | 'topic_extraction' | 'generation' | 'validation'
  message: string
  details?: string
  fileName?: string
  recoverable: boolean
  suggestions?: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Progress tracking types
export interface ProcessingProgress {
  stage: 'uploading' | 'processing' | 'extracting' | 'generating'
  progress: number
  message: string
  details?: string
}

// Enhanced topic selection types
export interface TopicFilter {
  searchQuery: string
  confidenceFilter: 'all' | 'high' | 'medium' | 'low'
  sourceFilter: string
  showModifiedOnly: boolean
}

export interface TopicSelectionState extends TopicFilter {
  editingTopic: string | null
  previewTopic: SelectedTopic | null
}

// Content fidelity types
export interface FidelityWarning {
  topicId: string
  topicTitle: string
  score: number
  issues: string[]
  suggestion: string
}

// Image recreation types
export interface ImageRecreationWorkflow {
  imageId: string
  originalImage: ExtractedImage
  recreatedImage?: {
    base64: string
    prompt: string
    quality: number
  }
  qualityAssessment: {
    originalScore: number
    recreatedScore: number
    recommendation: 'use_original' | 'use_recreated' | 'needs_review'
    factors: Record<string, number>
    issues: Array<{
      type: string
      severity: 'low' | 'medium' | 'high'
      description: string
      suggestion?: string
    }>
  }
  userApprovalRequired: boolean
}