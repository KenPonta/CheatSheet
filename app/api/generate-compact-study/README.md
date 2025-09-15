# Compact Study Generation API

The `/api/generate-compact-study` endpoint transforms PDF study materials into dense, print-ready academic study handouts with compact typography and two-column layouts.

## Overview

This API processes discrete probability and relations PDFs, extracts all mathematical formulas and worked examples, then generates study_compact files in HTML, PDF, or Markdown formats optimized for print.

## Endpoint

```
POST /api/generate-compact-study
GET /api/generate-compact-study (health check)
```

## Request Format

### POST Request

```typescript
{
  files: Array<{
    name: string;
    type: 'probability' | 'relations' | 'general';
    content: string; // base64 encoded PDF content
  }>;
  config: {
    // Layout Configuration
    layout: 'compact' | 'standard';
    columns: 1 | 2 | 3;
    
    // Content Configuration
    equations: 'all' | 'key' | 'minimal';
    examples: 'full' | 'summary' | 'references';
    answers: 'inline' | 'appendix' | 'separate';
    
    // Typography Configuration
    fontSize: string; // '9pt', '10pt', '11pt', '12pt'
    margins: 'narrow' | 'normal' | 'wide';
    
    // Output Configuration
    outputFormat: 'html' | 'pdf' | 'markdown' | 'all';
    paperSize?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    
    // Metadata
    title?: string;
    
    // Processing Options
    enableProgressTracking?: boolean;
    enableErrorRecovery?: boolean;
  };
}
```

### GET Request (Health Check)

Returns service status and timestamp.

## Response Format

### Success Response

```typescript
{
  success: true;
  message: string;
  html?: string; // HTML output (if requested)
  pdf?: string; // base64 encoded PDF (if requested)
  markdown?: string; // Markdown output (if requested)
  metadata: {
    generatedAt: string; // ISO timestamp
    format: string;
    sourceFiles: string[];
    stats: {
      totalSections: number;
      totalFormulas: number;
      totalExamples: number;
      estimatedPrintPages: number;
    };
    preservationScore: number; // 0-1 content fidelity score
  };
  warnings?: string[];
  processingTime: number; // milliseconds
}
```

### Error Response

```typescript
{
  success: false;
  message: string;
  errors: string[];
  processingTime: number;
}
```

## Configuration Options

### Layout Options

- **`layout`**: 
  - `'compact'`: Dense typography with minimal spacing (line-height 1.15, paragraph spacing ≤0.25em)
  - `'standard'`: More readable spacing (line-height 1.25, paragraph spacing ≤0.35em)

- **`columns`**: Number of columns for layout (1-3, default: 2 for compact)

### Content Options

- **`equations`**:
  - `'all'`: Include all mathematical formulas found
  - `'key'`: Include only key formulas and identities
  - `'minimal'`: Include only essential formulas

- **`examples`**:
  - `'full'`: Complete worked examples with all solution steps
  - `'summary'`: Abbreviated examples with key steps
  - `'references'`: Example references only

- **`answers`**:
  - `'inline'`: Answers integrated with problems
  - `'appendix'`: Answers in separate appendix section
  - `'separate'`: Answers in separate document

### Typography Options

- **`fontSize`**: Font size in points ('9pt' to '12pt')
- **`margins`**: Page margins
  - `'narrow'`: 0.5 inch margins
  - `'normal'`: 0.75 inch margins  
  - `'wide'`: 1.0 inch margins

### Output Options

- **`outputFormat`**:
  - `'html'`: Web-ready HTML with CSS
  - `'pdf'`: Print-ready PDF via LaTeX
  - `'markdown'`: Pandoc-compatible Markdown
  - `'all'`: Generate all three formats

## File Types

The API recognizes three content types:

- **`probability`**: Discrete probability content (probability basics, Bayes' theorem, random variables, etc.)
- **`relations`**: Relations content (definitions, properties, SQL operations, etc.)
- **`general`**: General mathematical content

## Example Usage

### Basic Request

```javascript
const response = await fetch('/api/generate-compact-study', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    files: [
      {
        name: 'probability.pdf',
        type: 'probability',
        content: 'base64EncodedContent...'
      }
    ],
    config: {
      layout: 'compact',
      columns: 2,
      equations: 'all',
      examples: 'full',
      answers: 'inline',
      fontSize: '10pt',
      margins: 'narrow',
      outputFormat: 'pdf'
    }
  })
});

const result = await response.json();
```

### Multiple Files

```javascript
const files = [
  { name: 'discrete-probability.pdf', type: 'probability', content: '...' },
  { name: 'relations.pdf', type: 'relations', content: '...' }
];

const config = {
  layout: 'compact',
  columns: 2,
  equations: 'all',
  examples: 'full',
  answers: 'inline',
  fontSize: '10pt',
  margins: 'narrow',
  outputFormat: 'all',
  title: 'Discrete Math Study Guide'
};
```

### Configuration Presets

#### Maximum Density (Print)
```javascript
{
  layout: 'compact',
  columns: 2,
  equations: 'all',
  examples: 'full',
  fontSize: '9pt',
  margins: 'narrow',
  outputFormat: 'pdf'
}
```

#### Web Readable
```javascript
{
  layout: 'standard',
  columns: 1,
  equations: 'key',
  examples: 'summary',
  fontSize: '11pt',
  margins: 'normal',
  outputFormat: 'html'
}
```

## Processing Pipeline

The API follows this processing pipeline:

1. **File Processing**: Extract text and mathematical content from PDFs
2. **Mathematical Content Extraction**: Identify formulas, worked examples, definitions, and theorems
3. **Academic Structure Organization**: Organize content into numbered sections with cross-references
4. **Cross-Reference Generation**: Create "see Ex. 3.2" style references
5. **Layout Generation**: Apply compact typography and multi-column layout
6. **Output Generation**: Generate requested format(s) with mathematical rendering

## Error Handling

The API includes comprehensive error handling:

- **Validation Errors**: Invalid configuration or missing files (400)
- **Processing Errors**: Pipeline failures during content extraction (500)
- **Output Errors**: Format generation failures (500)

All errors include detailed error messages and processing time information.

## Performance

- **Processing Time**: Typically 1-5 seconds for standard PDFs
- **Memory Usage**: Optimized for large PDF files with memory management
- **Concurrent Processing**: Supports multiple document processing

## Content Preservation

The API maintains high content fidelity:

- **Formula Preservation**: All mathematical formulas are preserved with LaTeX conversion
- **Example Completeness**: Worked examples include all solution steps
- **Cross-Reference Integrity**: All internal references are validated and linked
- **Preservation Score**: Returned in metadata (0-1 scale)

## Output Formats

### HTML Output
- Responsive design with compact CSS
- MathJax integration for mathematical rendering
- Two-column layout with print media queries
- No card/box UI components (continuous text)

### PDF Output  
- LaTeX backend with article/scrartcl class
- Optimized for A4/Letter paper sizes
- Widow/orphan control
- Page break optimization

### Markdown Output
- Pandoc-compatible format
- LaTeX math delimiters
- Front matter with metadata
- Template support for further processing

## Health Check

```
GET /api/generate-compact-study
```

Returns:
```json
{
  "status": "healthy",
  "service": "compact-study-generator", 
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Requirements Satisfied

This API endpoint satisfies the following requirements:

- **1.5**: Generate study_compact.[pdf|html|md] with dense typography
- **5.4**: Support CLI-style configuration flags through API parameters
- **6.1**: HTML output with compact.css and density rules
- **6.2**: PDF output with LaTeX backend and compact spacing
- **6.3**: Markdown output targeting Pandoc pipeline

## Testing

The API includes comprehensive test coverage:

- Unit tests for request validation and response formatting
- Integration tests for configuration parameter handling
- Error handling tests for pipeline and output failures
- Mock tests for all output format combinations

Run tests with:
```bash
npm test -- app/api/generate-compact-study/__tests__/
```