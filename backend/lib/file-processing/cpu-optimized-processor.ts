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
   * CPU-intensive PDF processing
   */
  private async processPDFChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      const pdfParse = require('pdf-parse');
      
      console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes`);
      
      // Read entire PDF file (pdf-parse needs complete file structure)
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`PDF buffer created, length: ${buffer.length} bytes`);
      
      const options = {
        // Disable image extraction to save memory
        max: 0, // Process all pages
        version: 'v1.10.100',
        // Use minimal memory options
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      const data = await pdfParse(buffer, options);
      console.log(`PDF extraction completed, text length: ${data.text.length}, pages: ${data.numpages}`);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content extracted from PDF file');
      }
      
      return {
        content: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version,
          originalSize: file.size,
          bufferSize: buffer.length
        }
      };
    } catch (error) {
      console.error(`PDF processing failed for ${file.name}:`, error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * CPU-intensive Word document processing
   */
  private async processWordChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      const mammoth = require('mammoth');
      
      console.log(`Processing DOCX file: ${file.name}, size: ${file.size} bytes`);
      
      // For DOCX files, read the entire file at once since they're usually not huge
      // and mammoth needs the complete file structure
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`Buffer created directly, length: ${buffer.length} bytes`);
      
      // Use mammoth with minimal memory options
      const options = {
        convertImage: mammoth.images.ignoreImages, // Ignore images to save memory
        styleMap: [], // No style mapping to reduce processing
        includeDefaultStyleMap: false,
        includeEmbeddedStyleMap: false
      };
      
      const result = await mammoth.extractRawText({ buffer }, options);
      console.log(`Mammoth extraction completed, text length: ${result.value.length}`);
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content extracted from DOCX file');
      }
      
      return {
        content: result.value,
        metadata: {
          messages: result.messages,
          wordCount: result.value.split(/\s+/).length,
          originalSize: file.size,
          bufferSize: buffer.length
        }
      };
    } catch (error) {
      console.error(`DOCX processing failed for ${file.name}:`, error);
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  /**
   * Text file processing
   */
  private async processTextChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      console.log(`Processing text file: ${file.name}, size: ${file.size} bytes`);
      
      // Read text file directly
      const text = await file.text();
      
      console.log(`Text extraction completed, length: ${text.length} characters`);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in file');
      }
      
      const lineCount = (text.match(/\n/g) || []).length;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        content: text,
        metadata: {
          lineCount,
          charCount: text.length,
          wordCount,
          originalSize: file.size
        }
      };
    } catch (error) {
      console.error(`Text processing failed for ${file.name}:`, error);
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  /**
   * CPU-intensive image processing with OCR
   */
  private async processImageChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      const Tesseract = require('tesseract.js');
      
      console.log(`Processing image file: ${file.name}, size: ${file.size} bytes`);
      
      // Convert file to buffer for Tesseract
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`Image buffer created, length: ${buffer.length} bytes`);
      
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
      
      console.log(`OCR completed, text length: ${text.length}, confidence: ${confidence}%`);
      
      return {
        content: text,
        metadata: {
          confidence,
          ocrEngine: 'tesseract',
          originalSize: file.size,
          bufferSize: buffer.length
        }
      };
    } catch (error) {
      console.error(`Image processing failed for ${file.name}:`, error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Read file in small chunks to minimize memory usage
   */
  private async readFileInChunks(file: File): Promise<Buffer> {
    try {
      console.log(`Reading file in chunks: ${file.name}, total size: ${file.size}, chunk size: ${this.config.chunkSize}`);
      
      const chunks: Uint8Array[] = [];
      let offset = 0;
      let chunkCount = 0;
      
      while (offset < file.size) {
        const chunkEnd = Math.min(offset + this.config.chunkSize, file.size);
        const chunk = file.slice(offset, chunkEnd);
        const arrayBuffer = await chunk.arrayBuffer();
        chunks.push(new Uint8Array(arrayBuffer));
        offset = chunkEnd;
        chunkCount++;
        
        // Log progress every 10 chunks
        if (chunkCount % 10 === 0) {
          console.log(`Processed ${chunkCount} chunks, ${offset}/${file.size} bytes (${Math.round(offset/file.size*100)}%)`);
        }
        
        // Check memory usage and force GC if needed
        if (this.getMemoryUsage() > this.config.maxMemoryUsage) {
          this.forceGarbageCollection();
          // Small delay to allow GC to complete
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      console.log(`File reading completed: ${chunkCount} chunks processed`);
      
      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`Combining chunks: expected ${file.size} bytes, actual ${totalLength} bytes`);
      
      if (totalLength !== file.size) {
        console.warn(`Size mismatch: expected ${file.size}, got ${totalLength}`);
      }
      
      const result = new Uint8Array(totalLength);
      let position = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, position);
        position += chunk.length;
      }
      
      const buffer = Buffer.from(result);
      console.log(`Buffer creation completed: ${buffer.length} bytes`);
      
      return buffer;
    } catch (error) {
      console.error(`Error reading file in chunks:`, error);
      throw new Error(`Failed to read file in chunks: ${error.message}`);
    }
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