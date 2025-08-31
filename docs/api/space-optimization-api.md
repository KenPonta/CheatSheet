# Space Optimization API Documentation

## Overview

The Space Optimization API provides endpoints for calculating space requirements, optimizing content selection, and managing space utilization in cheat sheet generation.

## Base URL

```
/api/space-optimization
```

## Endpoints

### Calculate Available Space

Calculate the total available space based on cheat sheet configuration.

**Endpoint:** `POST /api/space-optimization/calculate-space`

**Request Body:**
```typescript
interface SpaceCalculationRequest {
  config: {
    paperSize: 'a4' | 'letter' | 'legal' | 'a3'
    orientation: 'portrait' | 'landscape'
    pageCount: number
    fontSize: 'small' | 'medium' | 'large'
    columns: 1 | 2 | 3
    margins?: {
      top: number
      right: number
      bottom: number
      left: number
    }
  }
  referenceAnalysis?: {
    contentDensity: number
    layoutOverhead: number
  }
}
```

**Response:**
```typescript
interface SpaceCalculationResponse {
  availableSpace: number // in square units
  pageDetails: {
    width: number
    height: number
    contentArea: number
    marginArea: number
  }
  estimatedCapacity: {
    charactersPerPage: number
    wordsPerPage: number
    topicsPerPage: number
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/space-optimization/calculate-space', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: {
      paperSize: 'a4',
      orientation: 'portrait',
      pageCount: 2,
      fontSize: 'medium',
      columns: 2
    }
  })
})
```

### Estimate Content Space

Estimate space requirements for specific content.

**Endpoint:** `POST /api/space-optimization/estimate-content`

**Request Body:**
```typescript
interface ContentSpaceRequest {
  content: {
    topics: Array<{
      id: string
      title: string
      content: string
      subtopics: Array<{
        id: string
        content: string
      }>
    }>
    images?: Array<{
      id: string
      dimensions: { width: number; height: number }
    }>
  }
  config: CheatSheetConfig
}
```

**Response:**
```typescript
interface ContentSpaceResponse {
  totalSpace: number
  breakdown: {
    textSpace: number
    imageSpace: number
    layoutOverhead: number
  }
  topicEstimates: Array<{
    topicId: string
    estimatedSpace: number
    subtopicEstimates: Array<{
      subtopicId: string
      estimatedSpace: number
    }>
  }>
}
```

### Optimize Topic Selection

Get optimized topic selection based on space constraints and priorities.

**Endpoint:** `POST /api/space-optimization/optimize-selection`

**Request Body:**
```typescript
interface OptimizationRequest {
  topics: Array<{
    id: string
    title: string
    content: string
    priority: 'high' | 'medium' | 'low'
    estimatedSpace: number
    subtopics: Array<{
      id: string
      content: string
      priority: 'high' | 'medium' | 'low'
      estimatedSpace: number
    }>
  }>
  constraints: {
    availableSpace: number
    targetUtilization: number // 0.8-0.95
    mustIncludeTopics?: string[]
  }
  referenceGuidance?: {
    contentDensity: number
    topicCount: number
    organizationStyle: string
  }
}
```

**Response:**
```typescript
interface OptimizationResponse {
  selectedTopics: Array<{
    topicId: string
    selectedSubtopics: string[]
    reason: string
  }>
  spaceUtilization: {
    used: number
    available: number
    percentage: number
    efficiency: 'optimal' | 'under-utilized' | 'over-utilized'
  }
  suggestions: Array<{
    type: 'add_topic' | 'add_subtopic' | 'remove_content' | 'expand_content'
    targetId: string
    description: string
    spaceImpact: number
  }>
  warnings: Array<{
    type: 'overflow' | 'under-utilization' | 'priority-conflict'
    message: string
    affectedContent: string[]
  }>
}
```

### Generate Space Suggestions

Get intelligent suggestions for optimizing space utilization.

**Endpoint:** `POST /api/space-optimization/suggestions`

**Request Body:**
```typescript
interface SuggestionsRequest {
  currentSelection: {
    topicIds: string[]
    subtopicSelections: Record<string, string[]>
  }
  availableTopics: Array<{
    id: string
    title: string
    priority: 'high' | 'medium' | 'low'
    estimatedSpace: number
    subtopics: Array<{
      id: string
      title: string
      estimatedSpace: number
    }>
  }>
  spaceInfo: {
    available: number
    used: number
    target: number
  }
}
```

**Response:**
```typescript
interface SuggestionsResponse {
  suggestions: Array<{
    id: string
    type: 'add_topic' | 'add_subtopic' | 'remove_content' | 'expand_content'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    spaceImpact: number
    targetId: string
    confidence: number
  }>
  alternativeConfigurations: Array<{
    name: string
    description: string
    changes: Array<{
      type: 'page_count' | 'font_size' | 'layout'
      from: any
      to: any
      spaceGain: number
    }>
  }>
}
```

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
  requestId: string
}
```

**Common Error Codes:**

- `INVALID_CONFIG`: Invalid cheat sheet configuration
- `CONTENT_TOO_LARGE`: Content exceeds maximum processing limits
- `CALCULATION_ERROR`: Error in space calculation algorithms
- `OPTIMIZATION_FAILED`: Unable to find optimal solution
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limits

- **Calculate Space**: 100 requests per minute
- **Estimate Content**: 50 requests per minute
- **Optimize Selection**: 20 requests per minute
- **Generate Suggestions**: 30 requests per minute

## Usage Examples

### Basic Space Optimization Workflow

```javascript
// 1. Calculate available space
const spaceResponse = await fetch('/api/space-optimization/calculate-space', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ config: cheatSheetConfig })
})
const { availableSpace } = await spaceResponse.json()

// 2. Estimate content space requirements
const contentResponse = await fetch('/api/space-optimization/estimate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: extractedTopics, config: cheatSheetConfig })
})
const { totalSpace, topicEstimates } = await contentResponse.json()

// 3. Optimize topic selection
const optimizationResponse = await fetch('/api/space-optimization/optimize-selection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topics: topicsWithEstimates,
    constraints: {
      availableSpace,
      targetUtilization: 0.85
    }
  })
})
const { selectedTopics, suggestions } = await optimizationResponse.json()
```

### Real-time Space Monitoring

```javascript
// Monitor space utilization as user makes changes
const monitorSpaceUtilization = async (currentSelection) => {
  const response = await fetch('/api/space-optimization/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentSelection,
      availableTopics: allTopics,
      spaceInfo: currentSpaceInfo
    })
  })
  
  const { suggestions } = await response.json()
  updateUI(suggestions)
}
```

## Integration Notes

### Frontend Integration

The Space Optimization API is designed to work seamlessly with the frontend components:

- **Real-time Updates**: Use WebSocket connections for live space monitoring
- **Debounced Requests**: Implement request debouncing for frequent updates
- **Caching**: Cache space calculations for identical configurations
- **Error Handling**: Provide fallback calculations for API failures

### Performance Considerations

- **Batch Requests**: Combine multiple calculations when possible
- **Caching Strategy**: Cache results for identical inputs
- **Async Processing**: Use background processing for complex optimizations
- **Progressive Enhancement**: Provide basic functionality without API

### Security

- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Authentication**: Requires valid session for access
- **Data Privacy**: No content is stored permanently