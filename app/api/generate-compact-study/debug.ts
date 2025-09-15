// Debug utilities for compact study generator

export interface DebugInfo {
  timestamp: string;
  stage: string;
  details: any;
  error?: string;
}

export class CompactStudyDebugger {
  private logs: DebugInfo[] = [];
  private enabled: boolean;

  constructor(enabled: boolean = process.env.NODE_ENV === 'development') {
    this.enabled = enabled;
  }

  log(stage: string, details: any, error?: Error) {
    if (!this.enabled) return;

    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      stage,
      details,
      error: error?.message
    };

    this.logs.push(debugInfo);
    console.log(`🔍 [${stage}]`, details, error ? `Error: ${error.message}` : '');
  }

  getLogs(): DebugInfo[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }

  getErrorSummary(): string[] {
    return this.logs
      .filter(log => log.error)
      .map(log => `${log.stage}: ${log.error}`);
  }
}

export function validateRequest(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check files
  if (!data.files || !Array.isArray(data.files)) {
    errors.push('Files array is required');
  } else if (data.files.length === 0) {
    errors.push('At least one file is required');
  } else {
    data.files.forEach((file: any, index: number) => {
      if (!file.name) {
        errors.push(`File ${index + 1}: name is required`);
      }
      if (!file.content) {
        errors.push(`File ${index + 1}: content is required`);
      }
      if (!file.type || !['probability', 'relations', 'general'].includes(file.type)) {
        errors.push(`File ${index + 1}: type must be 'probability', 'relations', or 'general'`);
      }
      
      // Validate base64 content
      try {
        if (file.content && typeof file.content === 'string') {
          Buffer.from(file.content, 'base64');
        }
      } catch (e) {
        errors.push(`File ${index + 1}: invalid base64 content`);
      }
    });
  }

  // Check config
  if (!data.config) {
    errors.push('Configuration is required');
  } else {
    const config = data.config;
    
    if (!['compact', 'standard'].includes(config.layout)) {
      errors.push('Layout must be "compact" or "standard"');
    }
    
    if (!['html', 'pdf', 'markdown', 'all'].includes(config.outputFormat)) {
      errors.push('Output format must be "html", "pdf", "markdown", or "all"');
    }
    
    if (config.columns && ![1, 2, 3].includes(config.columns)) {
      errors.push('Columns must be 1, 2, or 3');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function createSafeFileProcessor() {
  return {
    async processFile(file: File): Promise<{ success: boolean; data?: any; error?: string }> {
      try {
        // Basic file validation
        if (!file || file.size === 0) {
          return { success: false, error: 'Empty or invalid file' };
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          return { success: false, error: 'File too large (max 50MB)' };
        }

        let extractedText = '';
        
        // Handle PDF files properly
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const pdfParse = (await import('pdf-parse')).default;
            const pdfData = await pdfParse(buffer);
            
            if (pdfData.text && pdfData.text.length > 0) {
              extractedText = pdfData.text;
              console.log(`✅ Safe PDF extraction successful: ${pdfData.text.length} characters from ${pdfData.numpages} pages for ${file.name}`);
            } else {
              console.log(`⚠️ PDF text extraction returned empty content for ${file.name}`);
              extractedText = `PDF file ${file.name} processed but no text content found. File size: ${file.size} bytes.`;
            }
          } catch (pdfError) {
            console.warn(`⚠️ Safe PDF extraction failed for ${file.name}:`, pdfError);
            extractedText = `PDF processing failed for ${file.name}. Error: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`;
          }
        } else {
          // Handle text files
          try {
            const arrayBuffer = await file.arrayBuffer();
            extractedText = new TextDecoder().decode(arrayBuffer);
          } catch (textError) {
            extractedText = `Text extraction failed for ${file.name}. Error: ${textError instanceof Error ? textError.message : 'Unknown error'}`;
          }
        }

        // Ensure we have some content
        if (!extractedText || extractedText.trim().length === 0) {
          extractedText = `File ${file.name} was processed but no readable content was extracted. File size: ${file.size} bytes, type: ${file.type}`;
        }

        return {
          success: true,
          data: {
            text: extractedText,
            metadata: {
              pageCount: 1,
              wordCount: extractedText.split(/\s+/).length,
              hasImages: false,
              hasTables: false,
              language: 'en'
            }
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown file processing error'
        };
      }
    }
  };
}

export function createFallbackMathExtractor() {
  return {
    extractMathContent(text: string): any {
      // Simple regex-based math extraction as fallback
      const formulas = [];
      const examples = [];
      
      // Look for common math patterns
      const mathPatterns = [
        /P\([^)]+\)\s*=\s*[^,\n]+/g,
        /E\[[^\]]+\]\s*=\s*[^,\n]+/g,
        /Var\([^)]+\)\s*=\s*[^,\n]+/g,
        /\b\d+\/\d+\b/g
      ];

      mathPatterns.forEach((pattern, index) => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach((match, matchIndex) => {
            formulas.push({
              id: `formula_${index}_${matchIndex}`,
              latex: match,
              context: 'Extracted formula',
              type: 'inline' as const,
              sourceLocation: { page: 1, line: 1 },
              isKeyFormula: true
            });
          });
        }
      });

      // Look for example patterns
      const examplePattern = /Example\s+\d+[:.]\s*([^.]+\.)/gi;
      const exampleMatches = text.match(examplePattern);
      
      if (exampleMatches) {
        exampleMatches.forEach((match, index) => {
          examples.push({
            id: `example_${index}`,
            title: `Example ${index + 1}`,
            problem: match,
            solution: [{
              stepNumber: 1,
              description: 'Solution step',
              formula: '',
              explanation: 'Basic solution'
            }],
            sourceLocation: { page: 1, line: 1 },
            subtopic: 'General'
          });
        });
      }

      return {
        formulas,
        workedExamples: examples,
        definitions: [],
        theorems: []
      };
    }
  };
}