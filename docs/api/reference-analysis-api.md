# Reference Analysis API Documentation

## Overview

The Reference Analysis API provides endpoints for analyzing reference cheat sheets, extracting visual formatting elements, and applying reference styles to user content.

## Base URL

```
/api/reference-analysis
```

## Endpoints

### Analyze Reference Format

Analyze a reference cheat sheet to extract visual formatting and layout patterns.

**Endpoint:** `POST /api/reference-analysis/analyze`

**Request Body:**
```typescript
interface ReferenceAnalysisRequest {
  referenceFile: File // Uploaded via multipart/form-data
  analysisOptions?: {
    extractColors: boolean
    extractFonts: boolean
    extractSpacing: boolean
    extractLayout: boolean
    extractContent: boolean
  }
}
```

**Response:**
```typescript
interface ReferenceAnalysisResponse {
  analysisId: string
  visualElements: {
    colorScheme: {
      primary: string
      secondary: string
      accent: string
      text: string
      background: string
    }
    typography: {
      fontFamilies: string[]
      fontSizes: {
        heading1: number
        heading2: number
        heading3: number
        body: number
        caption: number
      }
      fontWeights: Record<string, number>
    }
    spacing: {
      lineHeight: number
      paragraphSpacing: number
      sectionSpacing: number
      margins: {
        top: number
        right: number
        bottom: number
        left: number
      }
    }
    layout: {
      columns: number
      columnGap: number
      pageOrientation: 'portrait' | 'landscape'
      contentDensity: number
    }
  }
  contentAnalysis: {
    topicCount: number
    averageTopicLength: number
    organizationStyle: 'hierarchical' | 'flat' | 'mixed'
    contentTypes: Array<{
      type: 'text' | 'list' | 'table' | 'image' | 'formula'
      frequency: number
    }>
  }
  formatTemplate: {
    css: string
    layoutRules: Array<{
      selector: string
      properties: Record<string, string>
    }>
    contentGuidelines: Array<{
      element: string
      maxLength: number
      formatting: string
    }>
  }
  confidence: {
    overall: number
    colorExtraction: number
    layoutDetection: number
    contentAnalysis: number
  }
}
```

**Example:**
```javascript
const formData = new FormData()
formData.append('referenceFile', referenceFile)
formData.append('analysisOptions', JSON.stringify({
  extractColors: true,
  extractFonts: true,
  extractSpacing: true,
  extractLayout: true,
  extractContent: true
}))

const response = await fetch('/api/reference-analysis/analyze', {
  method: 'POST',
  body: formData
})
```

### Apply Reference Format

Apply analyzed reference formatting to user content.

**Endpoint:** `POST /api/reference-analysis/apply-format`

**Request Body:**
```typescript
interface FormatApplicationRequest {
  analysisId: string // From previous analysis
  content: {
    topics: Array<{
      id: string
      title: string
      content: string
      priority: 'high' | 'medium' | 'low'
      subtopics: Array<{
        id: string
        title: string
        content: string
      }>
    }>
    images?: Array<{
      id: string
      url: string
      caption?: string
    }>
  }
  applicationOptions?: {
    adaptContentLength: boolean
    preserveOriginalStructure: boolean
    matchContentDensity: boolean
    applyColorScheme: boolean
  }
}
```

**Response:**
```typescript
interface FormatApplicationResponse {
  formattedContent: {
    html: string
    css: string
    topics: Array<{
      id: string
      formattedHtml: string
      adaptations: Array<{
        type: 'length_adjustment' | 'structure_change' | 'style_application'
        description: string
        originalLength: number
        newLength: number
      }>
    }>
  }
  applicationReport: {
    successfulAdaptations: number
    partialAdaptations: number
    failedAdaptations: number
    warnings: Array<{
      type: 'content_overflow' | 'style_mismatch' | 'structure_conflict'
      message: string
      affectedTopics: string[]
      suggestions: string[]
    }>
  }
  spaceUtilization: {
    estimatedPages: number
    contentDensity: number
    utilizationPercentage: number
  }
}
```

### Generate Format Template

Create a reusable format template from reference analysis.

**Endpoint:** `POST /api/reference-analysis/generate-template`

**Request Body:**
```typescript
interface TemplateGenerationRequest {
  analysisId: string
  templateName: string
  templateOptions: {
    includeColors: boolean
    includeFonts: boolean
    includeSpacing: boolean
    includeLayout: boolean
    makeResponsive: boolean
  }
}
```

**Response:**
```typescript
interface TemplateGenerationResponse {
  templateId: string
  template: {
    name: string
    css: string
    htmlStructure: string
    variables: Record<string, string>
    mediaQueries: Array<{
      condition: string
      styles: string
    }>
  }
  usage: {
    instructions: string
    examples: Array<{
      scenario: string
      code: string
    }>
  }
}
```

### Compare Reference Formats

Compare multiple reference formats to identify common patterns.

**Endpoint:** `POST /api/reference-analysis/compare`

**Request Body:**
```typescript
interface FormatComparisonRequest {
  analysisIds: string[]
  comparisonCriteria: {
    colorSchemes: boolean
    typography: boolean
    layout: boolean
    contentDensity: boolean
  }
}
```

**Response:**
```typescript
interface FormatComparisonResponse {
  commonElements: {
    colors: Array<{
      color: string
      frequency: number
      usage: string[]
    }>
    fonts: Array<{
      family: string
      frequency: number
      contexts: string[]
    }>
    layoutPatterns: Array<{
      pattern: string
      frequency: number
      description: string
    }>
  }
  differences: Array<{
    aspect: string
    variations: Array<{
      analysisId: string
      value: any
      description: string
    }>
  }>
  recommendations: Array<{
    type: 'best_practice' | 'common_pattern' | 'optimization'
    description: string
    implementation: string
  }>
}
```

### Get Analysis Status

Check the status of a reference analysis operation.

**Endpoint:** `GET /api/reference-analysis/status/{analysisId}`

**Response:**
```typescript
interface AnalysisStatusResponse {
  analysisId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: {
    currentStep: string
    percentage: number
    estimatedTimeRemaining: number
  }
  result?: ReferenceAnalysisResponse
  error?: {
    code: string
    message: string
    details: any
  }
}
```

## Webhook Support

For long-running analysis operations, webhooks can be configured to receive status updates.

**Webhook Payload:**
```typescript
interface WebhookPayload {
  analysisId: string
  status: 'completed' | 'failed'
  timestamp: string
  result?: ReferenceAnalysisResponse
  error?: {
    code: string
    message: string
  }
}
```

## Error Handling

**Common Error Codes:**

- `INVALID_FILE_FORMAT`: Unsupported reference file format
- `FILE_TOO_LARGE`: Reference file exceeds size limits
- `ANALYSIS_FAILED`: Unable to analyze reference format
- `TEMPLATE_GENERATION_FAILED`: Error creating format template
- `APPLICATION_FAILED`: Error applying format to content
- `ANALYSIS_NOT_FOUND`: Invalid analysis ID

**Error Response Format:**
```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: {
      supportedFormats?: string[]
      maxFileSize?: number
      analysisSteps?: Array<{
        step: string
        status: 'completed' | 'failed'
        error?: string
      }>
    }
  }
  timestamp: string
  requestId: string
}
```

## Rate Limits

- **Analyze Reference**: 10 requests per hour per user
- **Apply Format**: 50 requests per hour per user
- **Generate Template**: 20 requests per hour per user
- **Compare Formats**: 30 requests per hour per user
- **Status Check**: 200 requests per hour per user

## Usage Examples

### Complete Reference Analysis Workflow

```javascript
// 1. Upload and analyze reference
const analyzeReference = async (referenceFile) => {
  const formData = new FormData()
  formData.append('referenceFile', referenceFile)
  
  const response = await fetch('/api/reference-analysis/analyze', {
    method: 'POST',
    body: formData
  })
  
  return await response.json()
}

// 2. Apply format to content
const applyReferenceFormat = async (analysisId, content) => {
  const response = await fetch('/api/reference-analysis/apply-format', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      content,
      applicationOptions: {
        adaptContentLength: true,
        matchContentDensity: true,
        applyColorScheme: true
      }
    })
  })
  
  return await response.json()
}

// 3. Complete workflow
const processWithReference = async (referenceFile, userContent) => {
  try {
    // Analyze reference
    const analysis = await analyzeReference(referenceFile)
    
    // Apply formatting
    const formatted = await applyReferenceFormat(analysis.analysisId, userContent)
    
    return {
      success: true,
      formattedContent: formatted.formattedContent,
      warnings: formatted.applicationReport.warnings
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

### Polling for Analysis Status

```javascript
const pollAnalysisStatus = async (analysisId) => {
  const poll = async () => {
    const response = await fetch(`/api/reference-analysis/status/${analysisId}`)
    const status = await response.json()
    
    if (status.status === 'completed') {
      return status.result
    } else if (status.status === 'failed') {
      throw new Error(status.error.message)
    } else {
      // Still processing, wait and poll again
      await new Promise(resolve => setTimeout(resolve, 2000))
      return poll()
    }
  }
  
  return poll()
}
```

## Integration Notes

### File Upload Requirements

- **Supported Formats**: PDF, PNG, JPG, JPEG, GIF, BMP
- **Maximum File Size**: 10MB
- **Resolution**: Minimum 300 DPI for best results
- **Content**: Must contain actual cheat sheet content

### Performance Optimization

- **Caching**: Analysis results are cached for 24 hours
- **Compression**: Large images are automatically compressed
- **Parallel Processing**: Multiple analysis steps run concurrently
- **Progressive Results**: Partial results available during processing

### Security Considerations

- **File Validation**: All uploaded files are validated and scanned
- **Content Sanitization**: Extracted content is sanitized
- **Access Control**: Analysis results are user-scoped
- **Data Retention**: Analysis data is automatically deleted after 30 days