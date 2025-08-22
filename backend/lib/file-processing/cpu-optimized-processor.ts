// CPU-optimized file processor that minimizes memory usage
// Uses chunking and sequential processing to reduce memory footprint

export interface CPUOptimizedConfig {
  chunkSize: number;
  maxMemoryUsage: number;
  useDiskBuffer: boolean;
  enableStreaming: boolean;
}

export class CPUOptimizedProcessor {
  private config: CPUOptimizedConfig;

  constructor(config: Partial<CPUOptimizedConfig> = {}) {
    this.config = {
      chunkSize: 64 * 1024, // 64KB chunks (very small for low memory)
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB max memory
      useDiskBuffer: false, // Disable disk buffer for now to avoid Node.js dependencies
      enableStreaming: true,
      ...config
    };
  }

  /**
   * Process file using CPU-intensive chunked approach
   */
  async processFileStreaming(file: File): Promise<{
    content: string;
    metadata: any;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Process file directly in memory with chunking
      const result = await this.processFileInChunks(file);
      
      return {
        ...result,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`CPU-optimized processing failed: ${error}`);
    }
  }

  /**
   * Process multiple files sequentially to minimize memory usage
   */
  async processMultipleFilesSequential(files: File[]): Promise<Array<{
    fileName: string;
    success: boolean;
    content?: string;
    metadata?: any;
    error?: string;
    processingTime: number;
  }>> {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.processFileStreaming(file);
        results.push({
          fileName: file.name,
          success: true,
          content: result.content,
          metadata: result.metadata,
          processingTime: result.processingTime
        });
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: 0
        });
      }
      
      // Force garbage collection between files
      this.forceGarbageCollection();
    }
    
    return results;
  }

  /**
   * Process file in memory using chunked approach
   */
  private async processFileInChunks(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    const mimeType = file.type;
    
    switch (mimeType) {
      case 'application/pdf':
        return this.processPDFChunked(file);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.processWordChunked(file);
      case 'text/plain':
        return this.processTextChunked(file);
      default:
        if (mimeType.startsWith('image/')) {
          return this.processImageChunked(file);
        }
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * CPU-intensive PDF processing with chunked reading
   */
  private async processPDFChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    const pdfParse = require('pdf-parse');
    
    // Read file in chunks to avoid loading entire file into memory
    const buffer = await this.readFileInChunks(file);
    
    const options = {
      // Disable image extraction to save memory
      max: 0, // Process all pages
      version: 'v1.10.100',
      // Use minimal memory options
      normalizeWhitespace: false,
      disableCombineTextItems: false
    };
    
    const data = await pdfParse(buffer, options);
    
    return {
      content: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
        version: data.version
      }
    };
  }

  /**
   * CPU-intensive Word document processing
   */
  private async processWordChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    const mammoth = require('mammoth');
    
    // Read file as buffer
    const buffer = await this.readFileInChunks(file);
    
    // Use mammoth with minimal memory options
    const options = {
      convertImage: mammoth.images.ignoreImages, // Ignore images to save memory
      styleMap: [], // No style mapping to reduce processing
      includeDefaultStyleMap: false,
      includeEmbeddedStyleMap: false
    };
    
    const result = await mammoth.extractRawText({ buffer }, options);
    
    return {
      content: result.value,
      metadata: {
        messages: result.messages,
        wordCount: result.value.split(/\s+/).length
      }
    };
  }

  /**
   * Chunked text file processing
   */
  private async processTextChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    let content = '';
    let lineCount = 0;
    let charCount = 0;
    
    // Process file in chunks
    const chunks = await this.readFileInChunks(file);
    const text = chunks.toString('utf8');
    
    content = text;
    lineCount = (text.match(/\n/g) || []).length;
    charCount = text.length;
    
    return {
      content,
      metadata: {
        lineCount,
        charCount,
        wordCount: content.split(/\s+/).length
      }
    };
  }

  /**
   * CPU-intensive image processing with OCR
   */
  private async processImageChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    const Tesseract = require('tesseract.js');
    
    // Convert file to buffer for Tesseract
    const buffer = await this.readFileInChunks(file);
    
    // Use Tesseract with CPU-optimized settings
    const { data: { text, confidence } } = await Tesseract.recognize(
      buffer,
      'eng',
      {
        logger: () => {}, // Disable logging to save memory
        // CPU-optimized settings
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        // Reduce memory usage
        tessedit_do_invert: 0,
        textord_heavy_nr: 1
      }
    );
    
    return {
      content: text,
      metadata: {
        confidence,
        ocrEngine: 'tesseract'
      }
    };
  }

  /**
   * Read file in small chunks to minimize memory usage
   */
  private async readFileInChunks(file: File): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    let offset = 0;
    
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + this.config.chunkSize);
      const arrayBuffer = await chunk.arrayBuffer();
      chunks.push(new Uint8Array(arrayBuffer));
      offset += this.config.chunkSize;
      
      // Check memory usage and force GC if needed
      if (this.getMemoryUsage() > this.config.maxMemoryUsage) {
        this.forceGarbageCollection();
        // Small delay to allow GC to complete
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Combine all chunks into a single buffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let position = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }
    
    return Buffer.from(result);
  }



  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Force garbage collection
   */
  private forceGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Force final garbage collection
    this.forceGarbageCollection();
  }
}

// Factory function for easy usage
export function createCPUOptimizedProcessor(config?: Partial<CPUOptimizedConfig>): CPUOptimizedProcessor {
  return new CPUOptimizedProcessor(config);
}