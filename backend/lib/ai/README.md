# AI Content Service

This module provides AI-powered content analysis and organization for the cheat sheet generator. It uses OpenAI's GPT models to extract topics, organize content, and validate fidelity while preserving original wording from source materials.

## Features

- **Topic Extraction**: Automatically identify and categorize topics from educational content
- **Content Organization**: Remove duplicates and create logical hierarchies
- **Fidelity Validation**: Ensure processed content maintains accuracy and original meaning
- **Image Analysis**: Analyze visual content for educational value
- **Error Handling**: Robust retry logic and graceful error recovery
- **Content Sanitization**: Prevent injection attacks and ensure clean output

## Core Components

### AIContentService

The main service class that provides all AI functionality:

```typescript
import { getAIContentService } from '@/lib/ai';

const aiService = getAIContentService();

// Extract topics from content
const topics = await aiService.extractTopics(request);

// Organize and deduplicate topics
const organized = await aiService.organizeContent(topics);

// Validate content fidelity
const fidelity = await aiService.validateContentFidelity(original, processed);

// Analyze image context
const analysis = await aiService.analyzeImageContext(image);
```

### OpenAIClient

Low-level client for OpenAI API with built-in retry logic:

```typescript
import { getOpenAIClient } from '@/lib/ai';

const client = getOpenAIClient();
const response = await client.createChatCompletion(messages, options);
```

## Configuration

Set the required environment variable:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage Examples

### Basic Topic Extraction

```typescript
import { getAIContentService, TopicExtractionRequest } from '@/lib/ai';

const aiService = getAIContentService();

const request: TopicExtractionRequest = {
  content: [extractedContent], // From file processors
  userPreferences: {
    maxTopics: 10,
    focusAreas: ['mathematics', 'calculus'],
    excludePatterns: ['homework', 'exercises']
  }
};

const topics = await aiService.extractTopics(request);
```

### Content Organization

```typescript
// Remove duplicates and create logical structure
const organizedTopics = await aiService.organizeContent(rawTopics);

console.log(`Reduced from ${rawTopics.length} to ${organizedTopics.length} topics`);
```

### Fidelity Validation

```typescript
const fidelityScore = await aiService.validateContentFidelity(
  originalText,
  processedText
);

if (fidelityScore.recommendation === 'reject') {
  console.warn('Content fidelity issues detected:', fidelityScore.issues);
}
```

### Image Analysis

```typescript
const analysis = await aiService.analyzeImageContext(extractedImage);

if (analysis.includeInCheatSheet) {
  console.log(`Include ${analysis.contentType} with ${analysis.importance} importance`);
}
```

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const topics = await aiService.extractTopics(request);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Automatic retry with exponential backoff
    console.log('Rate limit hit, retrying...');
  } else if (error.code === 'API_ERROR' && error.retryable) {
    // Retryable server error
    console.log('Temporary API error, will retry');
  } else {
    // Permanent error
    console.error('AI processing failed:', error.message);
  }
}
```

## Key Design Principles

### 1. Content Fidelity
- Preserves original wording and terminology
- Never adds external information
- Maintains educational context and meaning

### 2. Robust Error Handling
- Automatic retry with exponential backoff
- Graceful degradation on failures
- Clear error categorization and messaging

### 3. Content Sanitization
- Removes HTML/script tags
- Normalizes whitespace
- Limits content length to prevent abuse

### 4. Performance Optimization
- Singleton pattern for service instances
- Efficient prompt templates
- Minimal API calls through smart batching

## Testing

The module includes comprehensive unit tests:

```bash
npm test -- lib/ai/__tests__
```

Tests cover:
- OpenAI client functionality and retry logic
- Content service methods with mocked responses
- Prompt template generation
- Error handling scenarios
- Content sanitization and validation

## API Reference

### Types

```typescript
interface TopicExtractionRequest {
  content: ExtractedContent[];
  userPreferences: {
    maxTopics: number;
    focusAreas: string[];
    excludePatterns: string[];
  };
}

interface OrganizedTopic {
  id: string;
  title: string;
  content: string;
  subtopics: SubTopic[];
  sourceFiles: string[];
  confidence: number;
  examples: ExtractedImage[];
  originalWording: string;
}

interface FidelityScore {
  score: number; // 0-1 scale
  issues: FidelityIssue[];
  recommendation: 'accept' | 'review' | 'reject';
}
```

### Error Codes

- `API_ERROR`: General OpenAI API error
- `RATE_LIMIT`: Rate limit exceeded (auto-retry)
- `INVALID_RESPONSE`: Malformed API response
- `CONTENT_VALIDATION_FAILED`: Fidelity validation error

## Integration with File Processing

The AI service is designed to work with the file processing system:

```typescript
// File processors extract content
const extractedContent = await fileProcessor.processFile(file);

// AI service analyzes and organizes content
const topics = await aiService.extractTopics({
  content: [extractedContent],
  userPreferences: userSettings
});

// Generate cheat sheet from organized topics
const cheatSheet = await generateCheatSheet(topics, layoutConfig);
```

## Performance Considerations

- **Rate Limits**: Built-in retry logic handles OpenAI rate limits
- **Token Usage**: Optimized prompts minimize token consumption
- **Caching**: Consider implementing response caching for repeated content
- **Batching**: Process multiple documents together for better correlation

## Security

- **Input Sanitization**: All text inputs are sanitized
- **API Key Management**: Secure environment variable handling
- **Content Validation**: Prevents injection of external content
- **Error Information**: Sensitive details not exposed in error messages