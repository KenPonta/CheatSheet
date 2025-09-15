export interface CheatSheetConfig {
  paperSize: 'a4' | 'letter' | 'legal' | 'a3'
  orientation: 'portrait' | 'landscape'
  columns: 1 | 2 | 3
  fontSize: 'small' | 'medium' | 'large'
  pageCount?: number
  includeHeaders?: boolean
  includeFooters?: boolean
  customStyles?: string
}

export interface CheatSheetTopic {
  id: string
  topic: string
  content: string
  customContent?: string
  images?: CheatSheetImage[]
  priority?: number
}

export interface CheatSheetImage {
  id: string
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
  isRecreated?: boolean
}

export interface GenerationRequest {
  topics: CheatSheetTopic[]
  config: CheatSheetConfig
  referenceText?: string
  title?: string
  subtitle?: string
}

export interface GenerationResult {
  html: string
  pdf?: Buffer
  warnings: ContentWarning[]
  pageCount: number
  contentFit: ContentFitAnalysis
  success: boolean
  metadata?: GenerationMetadata
}

export interface GenerationMetadata {
  fileSize: number
  generationTime: number
  optimization: 'enhanced' | 'standard' | 'fallback'
  error?: string
}

export interface ContentWarning {
  type: 'overflow' | 'quality' | 'missing' | 'layout'
  severity: 'low' | 'medium' | 'high'
  message: string
  affectedContent: string[]
  suggestions: string[]
}

export interface ContentFitAnalysis {
  totalContent: number
  fittedContent: number
  overflowContent: number
  estimatedPages: number
  contentUtilization: number
}

export interface PaperDimensions {
  width: string
  height: string
  marginTop: string
  marginRight: string
  marginBottom: string
  marginLeft: string
}

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal' | 'A3'
  landscape?: boolean
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  printBackground?: boolean
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  preferCSSPageSize?: boolean
  tagged?: boolean
  outline?: boolean
  width?: string | number
  height?: string | number
  pageRanges?: string
  omitBackground?: boolean
  timeout?: number
}

export interface PageBreakStrategy {
  avoidOrphans: boolean
  avoidWidows: boolean
  keepTopicsTogether: boolean
  distributeEvenly: boolean
}

export interface PrintOptimizationOptions {
  enhancedImageHandling: boolean
  optimizeForPrint: boolean
  validateQuality: boolean
  fallbackOnError: boolean
}