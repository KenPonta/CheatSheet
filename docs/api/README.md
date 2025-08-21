# Cheat Sheet Generator API Documentation

## Overview

The Cheat Sheet Generator provides a RESTful API for programmatic access to file processing, content extraction, and cheat sheet generation capabilities. This documentation covers all available endpoints, request/response formats, and integration examples.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Currently, the API uses session-based authentication. Future versions will support API keys for programmatic access.

## Rate Limits

- **File Upload**: 10 files per minute per session
- **Processing**: 5 concurrent processing jobs per session
- **Generation**: 3 cheat sheet generations per minute per session

## API Endpoints

### File Processing

#### Upload Files
```http
POST /api/upload
```

Upload files for content extraction and processing.

**Request:**
```typescript
// Form data with files
FormData {
  files: File[]
  options?: {
    ocrLanguage?: string
    preserveFormatting?: boolean
  }
}
```

**Response:**
```typescript
{
  success: boolean
  data: {
    uploadId: string
    files: Array<{
      id: string
      name: string
      size: number
      type: string
      status: 'uploaded' | 'processing' | 'completed' | 'error'
    }>
  }
  error?: string
}
```

**Example:**
```javascript
const formData = new FormData()
formData.append('files', file1)
formData.append('files', file2)

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

#### Get Processing Status
```http
GET /api/processing-status/{uploadId}
```

Check the status of file processing.

**Response:**
```typescript
{
  success: boolean
  data: {
    uploadId: string
    overallStatus: 'processing' | 'completed' | 'error'
    files: Array<{
      id: string
      status: 'pending' | 'processing' | 'completed' | 'error'
      progress: number // 0-100
      extractedContent?: ExtractedContent
      error?: string
    }>
  }
}
```

### Content Extraction

#### Extract Topics
```http
POST /api/extract-topics
```

Extract and organize topics from processed content.

**Request:**
```typescript
{
  uploadId: string
  options?: {
    maxTopics?: number
    focusAreas?: string[]
    excludePatterns?: string[]
  }
}
```

**Response:**
```typescript
{
  success: boolean
  data: {
    topics: Array<{
      id: string
      title: string
      content: string
      subtopics: SubTopic[]
      sourceFiles: string[]
      confidence: number
      examples: ExtractedImage[]
    }>
    metadata: {
      totalTopics: number
      processingTime: number
      confidence: number
    }
  }
}
```

### Cheat Sheet Generation

#### Generate Cheat Sheet
```http
POST /api/generate-cheatsheet
```

Generate a cheat sheet from selected topics and configuration.

**Request:**
```typescript
{
  uploadId: string
  selectedTopics: string[]
  config: {
    pageCount: number
    paperSize: 'a4' | 'letter' | 'legal' | 'a3'
    fontSize: 'small' | 'medium' | 'large'
    columns: 1 | 2 | 3
    orientation: 'portrait' | 'landscape'
  }
  referenceTemplate?: {
    fileId: string
    applyFormatting: boolean
  }
}
```

**Response:**
```typescript
{
  success: boolean
  data: {
    generationId: string
    status: 'processing' | 'completed' | 'error'
    htmlContent?: string
    pdfUrl?: string
    warnings: Array<{
      type: 'overflow' | 'quality' | 'missing'
      message: string
      severity: 'low' | 'medium' | 'high'
    }>
    metadata: {
      actualPageCount: number
      contentFit: number // percentage
      generationTime: number
    }
  }
}
```

#### Get Generation Status
```http
GET /api/generation-status/{generationId}
```

Check the status of cheat sheet generation.

**Response:**
```typescript
{
  success: boolean
  data: {
    generationId: string
    status: 'processing' | 'completed' | 'error'
    progress: number // 0-100
    currentStep: string
    estimatedTimeRemaining?: number
    result?: GenerationResult
  }
}
```

### Image Recreation

#### Recreate Images
```http
POST /api/recreate-images
```

Generate new versions of images using AI.

**Request:**
```typescript
{
  images: Array<{
    id: string
    context: string
    type: 'example' | 'diagram' | 'chart'
  }>
  options?: {
    style?: 'clean' | 'detailed' | 'minimal'
    format?: 'png' | 'jpg'
    size?: 'small' | 'medium' | 'large'
  }
}
```

**Response:**
```typescript
{
  success: boolean
  data: {
    recreatedImages: Array<{
      originalId: string
      recreatedUrl: string
      quality: number
      confidence: number
    }>
    processingTime: number
  }
}
```

### Health and Monitoring

#### Health Check
```http
GET /api/health
```

Check API health and service status.

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    fileProcessing: 'up' | 'down'
    aiService: 'up' | 'down'
    pdfGeneration: 'up' | 'down'
    imageRecreation: 'up' | 'down'
  }
  metrics: {
    activeProcessingJobs: number
    averageProcessingTime: number
    errorRate: number
  }
}
```

#### Get Statistics
```http
GET /api/monitoring/stats
```

Get usage statistics and performance metrics.

**Response:**
```typescript
{
  success: boolean
  data: {
    usage: {
      filesProcessed: number
      cheatsheetsGenerated: number
      totalUsers: number
    }
    performance: {
      averageProcessingTime: number
      averageGenerationTime: number
      successRate: number
    }
    resources: {
      cpuUsage: number
      memoryUsage: number
      diskUsage: number
    }
  }
}
```

## Data Types

### ExtractedContent
```typescript
interface ExtractedContent {
  text: string
  images: ExtractedImage[]
  tables: ExtractedTable[]
  metadata: FileMetadata
  structure: DocumentStructure
}
```

### ExtractedImage
```typescript
interface ExtractedImage {
  id: string
  base64: string
  ocrText?: string
  context: string
  isExample: boolean
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}
```

### SubTopic
```typescript
interface SubTopic {
  id: string
  title: string
  content: string
  examples: string[]
  sourceLocation: SourceLocation
}
```

### SourceLocation
```typescript
interface SourceLocation {
  fileId: string
  page?: number
  section?: string
  coordinates?: BoundingBox
}
```

## Error Handling

### Error Response Format
```typescript
{
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_FILE_FORMAT` | Unsupported file format | 400 |
| `FILE_TOO_LARGE` | File exceeds size limit | 413 |
| `PROCESSING_FAILED` | File processing error | 500 |
| `AI_SERVICE_ERROR` | AI service unavailable | 503 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INVALID_REQUEST` | Malformed request | 400 |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | 404 |

## SDK and Client Libraries

### JavaScript/TypeScript SDK

```bash
npm install @cheatsheet-generator/sdk
```

```typescript
import { CheatSheetClient } from '@cheatsheet-generator/sdk'

const client = new CheatSheetClient({
  baseUrl: 'https://your-domain.com/api',
  // apiKey: 'your-api-key' // Future feature
})

// Upload files
const upload = await client.uploadFiles([file1, file2])

// Extract topics
const topics = await client.extractTopics(upload.uploadId)

// Generate cheat sheet
const result = await client.generateCheatSheet({
  uploadId: upload.uploadId,
  selectedTopics: topics.data.topics.map(t => t.id),
  config: {
    pageCount: 2,
    paperSize: 'a4',
    fontSize: 'medium',
    columns: 2,
    orientation: 'portrait'
  }
})
```

### Python SDK

```bash
pip install cheatsheet-generator-sdk
```

```python
from cheatsheet_generator import CheatSheetClient

client = CheatSheetClient(
    base_url='https://your-domain.com/api'
    # api_key='your-api-key'  # Future feature
)

# Upload files
upload = client.upload_files(['file1.pdf', 'file2.docx'])

# Extract topics
topics = client.extract_topics(upload['uploadId'])

# Generate cheat sheet
result = client.generate_cheat_sheet(
    upload_id=upload['uploadId'],
    selected_topics=[t['id'] for t in topics['topics']],
    config={
        'pageCount': 2,
        'paperSize': 'a4',
        'fontSize': 'medium',
        'columns': 2,
        'orientation': 'portrait'
    }
)
```

## Webhooks (Future Feature)

### Webhook Events

- `file.processing.completed`
- `topic.extraction.completed`
- `cheatsheet.generation.completed`
- `image.recreation.completed`

### Webhook Payload
```typescript
{
  event: string
  timestamp: string
  data: {
    uploadId?: string
    generationId?: string
    status: string
    result?: any
  }
}
```

## Best Practices

### File Upload Optimization
- Compress images before upload
- Use supported formats for best results
- Upload files in batches of 5 or fewer
- Implement retry logic for failed uploads

### Content Processing
- Monitor processing status regularly
- Handle long-running operations asynchronously
- Implement timeout handling (max 10 minutes)
- Cache results when possible

### Error Handling
- Implement exponential backoff for retries
- Handle rate limits gracefully
- Provide meaningful error messages to users
- Log errors for debugging

### Performance
- Use pagination for large result sets
- Implement client-side caching
- Compress request/response data
- Monitor API response times

## Examples

### Complete Workflow Example

```typescript
async function createCheatSheet(files: File[]) {
  try {
    // 1. Upload files
    const upload = await fetch('/api/upload', {
      method: 'POST',
      body: createFormData(files)
    }).then(r => r.json())

    // 2. Wait for processing
    let status = await waitForProcessing(upload.data.uploadId)
    
    // 3. Extract topics
    const topics = await fetch('/api/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: upload.data.uploadId,
        options: { maxTopics: 20 }
      })
    }).then(r => r.json())

    // 4. Generate cheat sheet
    const generation = await fetch('/api/generate-cheatsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: upload.data.uploadId,
        selectedTopics: topics.data.topics.slice(0, 10).map(t => t.id),
        config: {
          pageCount: 2,
          paperSize: 'a4',
          fontSize: 'medium',
          columns: 2,
          orientation: 'portrait'
        }
      })
    }).then(r => r.json())

    // 5. Wait for generation and download
    const result = await waitForGeneration(generation.data.generationId)
    return result.data.pdfUrl

  } catch (error) {
    console.error('Cheat sheet creation failed:', error)
    throw error
  }
}

async function waitForProcessing(uploadId: string): Promise<any> {
  while (true) {
    const status = await fetch(`/api/processing-status/${uploadId}`)
      .then(r => r.json())
    
    if (status.data.overallStatus === 'completed') {
      return status
    } else if (status.data.overallStatus === 'error') {
      throw new Error('Processing failed')
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}
```

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- File upload and processing
- Topic extraction
- Cheat sheet generation
- Image recreation
- Health monitoring

### Planned Features
- API key authentication
- Webhook support
- Batch processing endpoints
- Advanced filtering options
- Template management API
- Usage analytics API