# PDF Generation in Compact Study Generator

The Compact Study Generator supports high-quality PDF output through multiple generation methods with automatic fallback mechanisms.

## Generation Methods

### 1. LaTeX (Recommended)
- **Best Quality**: Professional typography and mathematical rendering
- **Requirements**: LaTeX installation (see [LaTeX Setup Guide](./LATEX_SETUP.md))
- **Output**: High-quality academic PDFs with proper formatting

### 2. Puppeteer (Fallback)
- **Good Quality**: HTML-to-PDF conversion using Chrome/Chromium
- **Requirements**: Puppeteer (included in dependencies)
- **Output**: Good quality PDFs with web-based rendering

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# LaTeX Configuration
LATEX_ENGINE=pdflatex          # Options: pdflatex, xelatex, lualatex
LATEX_TIMEOUT=60000            # Timeout in milliseconds
LATEX_TEMP_DIR=/tmp/latex      # Temporary directory for LaTeX files
ENABLE_LATEX_PDF=true          # Enable/disable LaTeX PDF generation

# Fallback Configuration
ENABLE_PUPPETEER_FALLBACK=true # Enable/disable Puppeteer fallback
PDF_GENERATION_TIMEOUT=90000   # Overall PDF generation timeout
```

### LaTeX Engines

- **pdflatex** (default): Fast, good for most documents
- **xelatex**: Better Unicode support, slower
- **lualatex**: Modern engine with Lua scripting, slower

## Usage

### API Request

```javascript
const response = await fetch('/api/generate-compact-study', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    files: [
      {
        name: 'probability.pdf',
        type: 'probability',
        content: base64Content
      }
    ],
    config: {
      outputFormat: 'pdf', // or 'all' for multiple formats
      layout: 'compact',
      columns: 2,
      fontSize: '10pt',
      margins: 'narrow'
    }
  })
});

const result = await response.json();
if (result.success && result.pdf) {
  // result.pdf contains base64-encoded PDF
  const pdfBlob = new Blob([
    Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0))
  ], { type: 'application/pdf' });
}
```

### Programmatic Usage

```typescript
import { PDFOutputGenerator } from '@/backend/lib/compact-study';

const generator = new PDFOutputGenerator();
const pdfOutput = await generator.generatePDF(
  academicDocument,
  layoutConfig,
  {
    includeSource: false,
    timeout: 60000,
    engine: 'pdflatex'
  }
);

// pdfOutput.buffer contains the PDF data
// pdfOutput.pageCount contains the number of pages
// pdfOutput.metadata contains generation metadata
```

## Error Handling

The system provides comprehensive error handling with automatic fallbacks:

1. **LaTeX Available**: Uses LaTeX for best quality
2. **LaTeX Fails**: Falls back to Puppeteer
3. **Both Fail**: Returns detailed error message

### Common Error Messages

- **"LaTeX not installed"**: Install LaTeX using the setup guide
- **"Puppeteer browser launch failed"**: Check Chrome/Chromium installation
- **"PDF generation timeout"**: Increase timeout values
- **"All methods exhausted"**: Both LaTeX and Puppeteer failed

## Quality Comparison

| Method | Quality | Speed | Requirements | Best For |
|--------|---------|-------|--------------|----------|
| LaTeX | Excellent | Medium | LaTeX installation | Academic documents, mathematical content |
| Puppeteer | Good | Fast | Chrome/Chromium | General documents, quick generation |

## Troubleshooting

### LaTeX Issues

1. **Installation**: Follow the [LaTeX Setup Guide](./LATEX_SETUP.md)
2. **Missing Packages**: Install required LaTeX packages
3. **Permissions**: Ensure write access to temp directory
4. **Memory**: LaTeX compilation can be memory-intensive

### Puppeteer Issues

1. **Browser Launch**: Check Chrome/Chromium installation
2. **Permissions**: Ensure proper sandbox permissions
3. **Memory**: Browser instances require significant memory
4. **Timeout**: Increase timeout for complex documents

### Performance Optimization

1. **Use LaTeX** for best quality and performance
2. **Limit concurrent generations** to avoid resource exhaustion
3. **Monitor memory usage** during PDF generation
4. **Use SSD storage** for temporary files
5. **Cache results** when possible

## Development

### Testing PDF Generation

```bash
# Test LaTeX installation
pdflatex --version

# Test Puppeteer
node -e "require('puppeteer').launch().then(b => b.close())"

# Test API endpoint
curl -X POST http://localhost:3000/api/generate-compact-study \
  -H "Content-Type: application/json" \
  -d '{"files":[{"name":"test.pdf","type":"general","content":"..."}],"config":{"outputFormat":"pdf"}}'
```

### Custom LaTeX Templates

You can customize the LaTeX template by modifying the `generateLaTeXSource` method in `PDFOutputGenerator`:

```typescript
private generateLaTeXSource(document: AcademicDocument, config: CompactLayoutConfig): string {
  // Custom LaTeX template generation
  return `\\documentclass[10pt,a4paper,twocolumn]{article}
    % Your custom packages and settings
    \\begin{document}
    % Your custom content generation
    \\end{document}`;
}
```

## Support

For PDF generation issues:

1. Check the application logs for specific error messages
2. Verify LaTeX installation (if using LaTeX)
3. Test Puppeteer functionality
4. Check environment variable configuration
5. Monitor system resources during generation

The system is designed to be resilient and will automatically choose the best available method for PDF generation.