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
      console.log(`🚀 Starting CPU-optimized processing for ${file.name}`);
      
      // Basic file validation first
      if (!file || !file.name) {
        throw new Error('Invalid file object');
      }
      
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      if (file.size > this.config.maxMemoryUsage) {
        throw new Error(`File size ${file.size} exceeds maximum allowed size ${this.config.maxMemoryUsage}`);
      }
      
      // Process file directly in memory with chunking
      const result = await this.processFileInChunks(file);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ CPU-optimized processing completed for ${file.name} in ${processingTime}ms`);
      
      return {
        ...result,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ CPU-optimized processing failed for ${file.name} after ${processingTime}ms:`, errorMessage);
      throw new Error(`CPU-optimized processing failed: ${errorMessage}`);
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
      console.log(`🔄 Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
      
      try {
        const result = await this.processFileStreaming(file);
        console.log(`✅ Successfully processed ${file.name}: ${result.content.length} characters extracted`);
        
        results.push({
          fileName: file.name,
          success: true,
          content: result.content,
          metadata: result.metadata,
          processingTime: result.processingTime
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process ${file.name}:`, errorMessage);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        results.push({
          fileName: file.name,
          success: false,
          error: errorMessage,
          processingTime: 0
        });
      }
      
      // Force garbage collection between files
      this.forceGarbageCollection();
    }
    
    console.log(`📊 Processing complete: ${results.filter(r => r.success).length}/${results.length} files successful`);
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
    const extension = file.name.toLowerCase().split('.').pop() || '';
    
    console.log(`🔍 Determining processing method for ${file.name}`);
    console.log(`   MIME type: ${mimeType}`);
    console.log(`   Extension: ${extension}`);
    
    // Use both MIME type and extension for better detection
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      console.log(`📄 Processing as PDF`);
      return this.processPDFChunked(file);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
      console.log(`📄 Processing as Word document`);
      return this.processWordChunked(file);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || extension === 'xlsx') {
      console.log(`📊 Processing as Excel spreadsheet`);
      return this.processExcelChunked(file);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || extension === 'pptx') {
      console.log(`📊 Processing as PowerPoint presentation`);
      return this.processPowerPointChunked(file);
    } else if (mimeType === 'text/plain' || extension === 'txt') {
      console.log(`📄 Processing as text file`);
      return this.processTextChunked(file);
    } else if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      console.log(`🖼️ Processing as image file`);
      return this.processImageChunked(file);
    } else {
      const errorMsg = `Unsupported file type: ${mimeType} (extension: .${extension})`;
      console.error(`❌ ${errorMsg}`);
      console.log(`📋 Supported types: PDF (.pdf), Word (.docx), Excel (.xlsx), PowerPoint (.pptx), Text (.txt), Images (.jpg, .png, etc.)`);
      throw new Error(errorMsg);
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
      console.log(`🔍 Attempting to import pdf-parse for ${file.name}`);
      
      let pdfParse;
      try {
        // Import pdf-parse with error handling for initialization issues
        pdfParse = require('pdf-parse');
        
        // Test if pdf-parse is actually functional by checking its main function
        if (typeof pdfParse !== 'function') {
          throw new Error('pdf-parse did not export a function');
        }
        
        console.log(`✅ pdf-parse imported successfully`);
      } catch (importError) {
        console.error(`❌ Failed to import pdf-parse:`, importError);
        
        // Check if it's the common test file issue
        if (importError.message.includes('test/data') || importError.message.includes('ENOENT')) {
          console.log(`🔄 Attempting alternative pdf-parse import...`);
          try {
            // Try dynamic import as fallback
            const pdfParseModule = await import('pdf-parse');
            pdfParse = pdfParseModule.default || pdfParseModule;
            console.log(`✅ pdf-parse imported via dynamic import`);
          } catch (dynamicImportError) {
            console.error(`❌ Dynamic import also failed:`, dynamicImportError);
            throw new Error(`PDF processing not available: Both require and dynamic import failed`);
          }
        } else {
          throw new Error(`PDF processing dependency not available: ${importError.message}`);
        }
      }
      
      console.log(`📄 Processing PDF file: ${file.name}, size: ${file.size} bytes`);
      
      // Read entire PDF file (pdf-parse needs complete file structure)
      console.log(`📖 Reading file as array buffer...`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`📦 PDF buffer created, length: ${buffer.length} bytes`);
      
      const options = {
        // Disable image extraction to save memory
        max: 0, // Process all pages
        version: 'v1.10.100',
        // Use minimal memory options
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      console.log(`🔄 Parsing PDF with options:`, options);
      const data = await pdfParse(buffer, options);
      console.log(`✅ PDF extraction completed, text length: ${data.text.length}, pages: ${data.numpages}`);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content extracted from PDF file - file may be scanned or corrupted');
      }
      
      return {
        content: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version,
          originalSize: file.size,
          bufferSize: buffer.length,
          wordCount: data.text.split(/\s+/).length
        }
      };
    } catch (error) {
      console.error(`❌ PDF processing failed for ${file.name}:`, error);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error stack:`, error.stack);
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
      console.log(`🔍 Attempting to import mammoth for ${file.name}`);
      
      let mammoth;
      try {
        mammoth = require('mammoth');
        console.log(`✅ mammoth imported successfully`);
      } catch (importError) {
        console.error(`❌ Failed to import mammoth:`, importError);
        throw new Error(`Word processing dependency not available: ${importError.message}`);
      }
      
      console.log(`📄 Processing DOCX file: ${file.name}, size: ${file.size} bytes`);
      
      // For DOCX files, read the entire file at once since they're usually not huge
      // and mammoth needs the complete file structure
      console.log(`📖 Reading file as array buffer...`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`📦 Buffer created directly, length: ${buffer.length} bytes`);
      
      // Use mammoth with minimal memory options
      const options = {
        convertImage: mammoth.images.ignoreImages, // Ignore images to save memory
        styleMap: [], // No style mapping to reduce processing
        includeDefaultStyleMap: false,
        includeEmbeddedStyleMap: false
      };
      
      console.log(`🔄 Extracting text with mammoth...`);
      const result = await mammoth.extractRawText({ buffer }, options);
      console.log(`✅ Mammoth extraction completed, text length: ${result.value.length}`);
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content extracted from DOCX file - file may be corrupted or password protected');
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
      console.error(`❌ DOCX processing failed for ${file.name}:`, error);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error stack:`, error.stack);
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
      console.log(`📄 Processing text file: ${file.name}, size: ${file.size} bytes`);
      
      // Read text file directly
      console.log(`📖 Reading file as text...`);
      const text = await file.text();
      
      console.log(`✅ Text extraction completed, length: ${text.length} characters`);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in file - file may be empty');
      }
      
      const lineCount = (text.match(/\n/g) || []).length;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        content: text,
        metadata: {
          lineCount,
          charCount: text.length,
          wordCount,
          originalSize: file.size,
          encoding: 'utf-8' // Assumption for text files
        }
      };
    } catch (error) {
      console.error(`❌ Text processing failed for ${file.name}:`, error);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error stack:`, error.stack);
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  /**
   * Excel spreadsheet processing
   */
  private async processExcelChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      console.log(`🔍 Attempting to import xlsx for ${file.name}`);
      
      let XLSX;
      try {
        XLSX = require('xlsx');
        console.log(`✅ xlsx imported successfully`);
      } catch (importError) {
        console.error(`❌ Failed to import xlsx:`, importError);
        throw new Error(`Excel processing dependency not available: ${importError.message}`);
      }
      
      console.log(`📊 Processing Excel file: ${file.name}, size: ${file.size} bytes`);
      
      // Read Excel file
      console.log(`📖 Reading file as array buffer...`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`📦 Buffer created, length: ${buffer.length} bytes`);
      
      // Parse workbook
      console.log(`🔄 Parsing Excel workbook...`);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      console.log(`📋 Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
      
      // Extract text from all sheets
      let allText = '';
      const sheetData: any = {};
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_txt(worksheet);
        allText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
        
        // Also get structured data
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        sheetData[sheetName] = {
          rowCount: jsonData.length,
          hasData: jsonData.length > 0
        };
      }
      
      console.log(`✅ Excel extraction completed, text length: ${allText.length}`);
      
      if (!allText || allText.trim().length === 0) {
        throw new Error('No text content extracted from Excel file - file may be empty or corrupted');
      }
      
      return {
        content: allText,
        metadata: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
          sheetData,
          originalSize: file.size,
          bufferSize: buffer.length,
          wordCount: allText.split(/\s+/).length
        }
      };
    } catch (error) {
      console.error(`❌ Excel processing failed for ${file.name}:`, error);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error stack:`, error.stack);
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  /**
   * PowerPoint presentation processing
   */
  private async processPowerPointChunked(file: File): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      console.log(`🔍 Attempting to import pizzip for ${file.name}`);
      
      let PizZip, JSZip;
      try {
        PizZip = require('pizzip');
        JSZip = require('jszip');
        console.log(`✅ PowerPoint processing libraries imported successfully`);
      } catch (importError) {
        console.error(`❌ Failed to import PowerPoint processing libraries:`, importError);
        throw new Error(`PowerPoint processing dependencies not available: ${importError.message}`);
      }
      
      console.log(`📊 Processing PowerPoint file: ${file.name}, size: ${file.size} bytes`);
      
      // Read PowerPoint file
      console.log(`📖 Reading file as array buffer...`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`📦 Buffer created, length: ${buffer.length} bytes`);
      
      // Parse PPTX file (it's a ZIP archive)
      console.log(`🔄 Parsing PowerPoint archive...`);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      let allText = '';
      let slideCount = 0;
      
      // Extract text from slides
      const slideFiles = Object.keys(zipContent.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      console.log(`📋 Found ${slideFiles.length} slides`);
      
      for (const slideFile of slideFiles) {
        try {
          const slideXml = await zipContent.files[slideFile].async('text');
          
          // Extract text from XML (basic text extraction)
          const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
          if (textMatches) {
            const slideText = textMatches
              .map(match => match.replace(/<[^>]*>/g, ''))
              .join(' ')
              .trim();
            
            if (slideText) {
              allText += `Slide ${slideCount + 1}: ${slideText}\n\n`;
              slideCount++;
            }
          }
        } catch (slideError) {
          console.warn(`Failed to process slide ${slideFile}:`, slideError);
        }
      }
      
      console.log(`✅ PowerPoint extraction completed, ${slideCount} slides processed, text length: ${allText.length}`);
      
      if (!allText || allText.trim().length === 0) {
        throw new Error('No text content extracted from PowerPoint file - file may be empty, corrupted, or contain only images');
      }
      
      return {
        content: allText,
        metadata: {
          slideCount,
          originalSize: file.size,
          bufferSize: buffer.length,
          wordCount: allText.split(/\s+/).length,
          hasSlides: slideCount > 0
        }
      };
    } catch (error) {
      console.error(`❌ PowerPoint processing failed for ${file.name}:`, error);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error stack:`, error.stack);
      throw new Error(`PowerPoint processing failed: ${error.message}`);
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
      console.log(`🔍 Attempting to import tesseract.js for ${file.name}`);
      
      let Tesseract;
      try {
        Tesseract = require('tesseract.js');
        console.log(`✅ tesseract.js imported successfully`);
      } catch (importError) {
        console.error(`❌ Failed to import tesseract.js:`, importError);
        throw new Error(`OCR processing dependency not available: ${importError.message}`);
      }
      
      console.log(`🖼️ Processing image file: ${file.name}, size: ${file.size} bytes`);
      
      // Convert file to buffer for Tesseract
      console.log(`📖 Reading file as array buffer...`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`📦 Image buffer created, length: ${buffer.length} bytes`);
      
      // Use Tesseract with CPU-optimized settings
      console.log(`🔄 Starting OCR recognition...`);
      const { data: { text, confidence } } = await Tesseract.recognize(
        buffer,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          // CPU-optimized settings
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
          // Reduce memory usage
          tessedit_do_invert: 0,
          textord_heavy_nr: 1
        }
      );
      
      console.log(`✅ OCR completed, text length: ${text.length}, confidence: ${confidence}%`);
      
      if (!text || text.trim().length === 0) {
        console.warn(`⚠️ No text extracted from image ${file.name} - image may not contain readable text`);
      }
      
      return {
        content: text || '',
        metadata: {
          confidence,
          ocrEngine: 'tesseract',
          originalSize: file.size,
          bufferSize: buffer.length,
          hasText: text && text.trim().length > 0
        }
      };
    } catch (error) {
      console.error(`❌ Image processing failed for ${file.name}:`, error);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error stack:`, error.stack);
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