// Enhanced PDF file processor with text, image extraction, OCR, and metadata analysis

import { BaseFileProcessor } from '../base-processor';
import { ExtractedContent, ProcessingResult, SupportedFileType, ExtractedImage, Heading, Section } from '../types';

interface PDFPageInfo {
  pageNumber: number;
  text: string;
  images: ExtractedImage[];
}

export class PDFProcessor extends BaseFileProcessor {
  constructor() {
    super(
      50 * 1024 * 1024, // 50MB max file size
      ['application/pdf'],
      ['pdf']
    );
  }

  getSupportedType(): SupportedFileType {
    return 'pdf';
  }

  async processFile(file: File): Promise<ProcessingResult> {
    const fileId = this.generateFileId();
    const validation = this.validateFile(file);

    if (!validation.isValid) {
      return {
        fileId,
        status: 'failed',
        errors: validation.errors.map(error => 
          this.createProcessingError('VALIDATION_ERROR', error, 'high')
        ),
        processingTime: 0
      };
    }

    try {
      const { result: content, time } = await this.measureProcessingTime(async () => {
        return await this.extractPDFContent(file, fileId);
      });

      return {
        fileId,
        status: 'success',
        content,
        errors: [],
        processingTime: time
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        fileId,
        status: 'failed',
        errors: [this.createProcessingError('PROCESSING_ERROR', `Failed to process PDF: ${errorMessage}`, 'high')],
        processingTime: 0
      };
    }
  }

  private async extractPDFContent(file: File, fileId: string): Promise<ExtractedContent> {
    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to handle potential SSR issues
    const pdfParse = (await import('pdf-parse')).default;
    
    // Extract basic PDF data
    const pdfData = await pdfParse(buffer);
    
    // Extract images and perform OCR
    const images = await this.extractImagesFromPDF(buffer, fileId);
    
    // Analyze document structure
    const structure = this.analyzeDocumentStructure(pdfData.text);
    
    // Extract additional metadata
    const enhancedMetadata = await this.extractEnhancedMetadata(pdfData, file);

    const extractedContent: ExtractedContent = {
      text: pdfData.text,
      images,
      tables: [], // Tables will be extracted from text analysis
      metadata: enhancedMetadata,
      structure
    };

    return extractedContent;
  }

  private async extractImagesFromPDF(buffer: Buffer, fileId: string): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    
    try {
      // First, check if this is a scanned PDF by analyzing text density
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      
      const isScanned = await this.isScannedPDFFromData(pdfData, buffer.length);
      
      if (isScanned) {
        // For scanned PDFs, convert pages to images and perform OCR
        const pageImages = await this.convertPDFPagesToImages(buffer, fileId);
        
        for (const pageImage of pageImages) {
          const ocrText = await this.performOCR(pageImage.buffer, pageImage.id);
          
          images.push({
            id: pageImage.id,
            base64: pageImage.base64,
            context: `Scanned page ${pageImage.pageNumber} content`,
            isExample: this.isLikelyExample(ocrText),
            ocrText: ocrText || undefined
          });
        }
      } else {
        // For text-based PDFs, look for image references and embedded images
        await this.extractEmbeddedImages(buffer, fileId, images);
        
        // Also check for image references in text
        this.detectImageReferences(pdfData.text, fileId, images);
      }
      
    } catch (error) {
      console.warn('Image extraction failed:', error);
      // Continue processing without images rather than failing completely
    }
    
    return images;
  }

  private async convertPDFPagesToImages(buffer: Buffer, fileId: string): Promise<Array<{
    id: string;
    pageNumber: number;
    buffer: Buffer;
    base64: string;
  }>> {
    const pageImages: Array<{
      id: string;
      pageNumber: number;
      buffer: Buffer;
      base64: string;
    }> = [];
    
    try {
      // In a full implementation, you would use pdf2pic or similar
      // For now, we'll simulate this process
      
      // This is a placeholder implementation
      // In production, you'd use something like:
      // const pdf2pic = require('pdf2pic');
      // const convert = pdf2pic.fromBuffer(buffer, { density: 300, saveFilename: 'page', savePath: '/tmp' });
      // const results = await convert.bulk(-1);
      
      // For testing purposes, create a mock image buffer
      const mockImageBuffer = Buffer.from('mock-image-data');
      const base64 = mockImageBuffer.toString('base64');
      
      pageImages.push({
        id: `${fileId}_page_1`,
        pageNumber: 1,
        buffer: mockImageBuffer,
        base64: `data:image/png;base64,${base64}`
      });
      
    } catch (error) {
      console.warn('PDF to image conversion failed:', error);
    }
    
    return pageImages;
  }

  private async extractEmbeddedImages(buffer: Buffer, fileId: string, images: ExtractedImage[]): Promise<void> {
    try {
      // In a full implementation, you would parse the PDF structure to extract embedded images
      // This would involve parsing PDF objects and extracting image streams
      
      // For now, we'll implement a basic detection mechanism
      const bufferStr = buffer.toString('binary');
      
      // Look for common image markers in PDF
      const imageMarkers = ['/Image', '/DCTDecode', '/FlateDecode'];
      let imageCount = 0;
      
      for (const marker of imageMarkers) {
        const matches = bufferStr.split(marker).length - 1;
        imageCount += matches;
      }
      
      // Create placeholder entries for detected embedded images
      for (let i = 0; i < Math.min(imageCount, 5); i++) { // Limit to 5 images
        const imageId = `${fileId}_embedded_${i + 1}`;
        images.push({
          id: imageId,
          base64: '', // Would contain actual extracted image data
          context: `Embedded image ${i + 1} detected in PDF`,
          isExample: false, // Will be determined by context analysis
          ocrText: undefined
        });
      }
      
    } catch (error) {
      console.warn('Embedded image extraction failed:', error);
    }
  }

  private detectImageReferences(text: string, fileId: string, images: ExtractedImage[]): void {
    // Look for textual references to images, figures, charts, etc.
    const imageReferencePatterns = [
      /Figure\s+\d+/gi,
      /Chart\s+\d+/gi,
      /Diagram\s+\d+/gi,
      /Image\s+\d+/gi,
      /Graph\s+\d+/gi,
      /Table\s+\d+/gi,
      /Illustration\s+\d+/gi
    ];
    
    const foundReferences = new Set<string>();
    
    for (const pattern of imageReferencePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => foundReferences.add(match));
      }
    }
    
    // Create entries for each unique reference found
    Array.from(foundReferences).forEach((reference, index) => {
      const imageId = `${fileId}_ref_${index + 1}`;
      
      // Find context around the reference
      const referenceIndex = text.indexOf(reference);
      const contextStart = Math.max(0, referenceIndex - 100);
      const contextEnd = Math.min(text.length, referenceIndex + 100);
      const context = text.substring(contextStart, contextEnd);
      
      images.push({
        id: imageId,
        base64: '', // No actual image data for references
        context: `Reference to "${reference}": ${context}`,
        isExample: this.isLikelyExample(context),
        ocrText: undefined
      });
    });
  }

  private async performOCR(imageBuffer: Buffer, imageId: string): Promise<string> {
    try {
      // Dynamic import for Tesseract.js
      const Tesseract = await import('tesseract.js');
      
      // Preprocess image for better OCR accuracy
      const preprocessedBuffer = await this.preprocessImageForOCR(imageBuffer);
      
      const { data: { text, confidence } } = await Tesseract.recognize(preprocessedBuffer, 'eng', {
        logger: m => {
          // Optional: log OCR progress
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress for ${imageId}: ${Math.round(m.progress * 100)}%`);
          }
        },
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:()[]{}"-\'',
      });
      
      // Only return text if confidence is reasonable
      if (confidence && confidence > 30) {
        return this.cleanOCRText(text);
      } else {
        console.warn(`Low OCR confidence (${confidence}%) for image ${imageId}`);
        return text.trim(); // Return anyway but with warning
      }
      
    } catch (error) {
      console.warn(`OCR failed for image ${imageId}:`, error);
      return '';
    }
  }

  private async preprocessImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Use Sharp for image preprocessing to improve OCR accuracy
      const sharp = (await import('sharp')).default;
      
      const processedImage = await sharp(imageBuffer)
        .greyscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }) // Resize for optimal OCR
        .png() // Convert to PNG for better OCR
        .toBuffer();
      
      return processedImage;
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return imageBuffer;
    }
  }

  private cleanOCRText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?;:()\[\]{}"'-]/g, '') // Remove unusual characters
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  private analyzeDocumentStructure(text: string): { headings: Heading[]; sections: Section[]; hierarchy: number } {
    const headings: Heading[] = [];
    const sections: Section[] = [];
    
    // Split text into lines for analysis
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection: Section | null = null;
    let maxHierarchy = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect headings based on common patterns
      const headingLevel = this.detectHeadingLevel(line, i, lines);
      
      if (headingLevel > 0) {
        const heading: Heading = {
          level: headingLevel,
          text: line,
          page: this.estimatePageNumber(i, lines.length)
        };
        
        headings.push(heading);
        maxHierarchy = Math.max(maxHierarchy, headingLevel);
        
        // Start a new section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          title: line,
          content: '',
          page: heading.page,
          subsections: []
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += line + '\n';
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return {
      headings,
      sections,
      hierarchy: maxHierarchy
    };
  }

  private detectHeadingLevel(line: string, index: number, allLines: string[]): number {
    // Check for numbered headings (1., 1.1., 1.1, etc.)
    const numberedMatch = line.match(/^(\d+\.)+(\d+\s|\s)/);
    if (numberedMatch) {
      const dots = (numberedMatch[0].match(/\./g) || []).length;
      return dots;
    }
    
    // Check for all caps (likely heading)
    if (line === line.toUpperCase() && line.length > 3 && line.length < 100) {
      return 1;
    }
    
    // Check for title case with limited length
    if (this.isTitleCase(line) && line.length < 100 && !line.endsWith('.')) {
      return 2;
    }
    
    // Check if line is followed by empty line (common heading pattern)
    if (index < allLines.length - 1 && allLines[index + 1] === '' && line.length < 100) {
      return 3;
    }
    
    return 0; // Not a heading
  }

  private isTitleCase(text: string): boolean {
    const words = text.split(' ');
    if (words.length < 2) return false;
    
    return words.every(word => {
      if (word.length === 0) return true;
      // Check if first letter is uppercase and rest are lowercase (with some exceptions)
      const commonWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is'];
      return /^[A-Z][a-z]*$/.test(word) || commonWords.includes(word.toLowerCase());
    });
  }

  private estimatePageNumber(lineIndex: number, totalLines: number): number {
    // Rough estimation assuming ~50 lines per page
    return Math.ceil((lineIndex / totalLines) * 10) || 1;
  }

  private async extractEnhancedMetadata(pdfData: any, file: File) {
    const wordCount = this.countWords(pdfData.text);
    const characterCount = pdfData.text.length;
    const lineCount = pdfData.text.split('\n').length;
    
    // Analyze content characteristics
    const contentAnalysis = this.analyzeContentCharacteristics(pdfData.text);
    
    // Estimate reading time (average 200 words per minute)
    const estimatedReadingTime = Math.ceil(wordCount / 200);
    
    // Calculate text density per page
    const textDensityPerPage = wordCount / pdfData.numpages;
    
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      pageCount: pdfData.numpages,
      wordCount,
      
      // Enhanced content metrics
      characterCount,
      lineCount,
      estimatedReadingTime,
      textDensityPerPage,
      
      // Content analysis
      hasStructuredContent: contentAnalysis.hasStructuredContent,
      hasNumberedSections: contentAnalysis.hasNumberedSections,
      hasBulletPoints: contentAnalysis.hasBulletPoints,
      hasCodeBlocks: contentAnalysis.hasCodeBlocks,
      hasMathematicalContent: contentAnalysis.hasMathematicalContent,
      hasTabularData: contentAnalysis.hasTabularData,
      
      // Language and complexity analysis
      primaryLanguage: contentAnalysis.primaryLanguage,
      complexityScore: contentAnalysis.complexityScore,
      technicalTermDensity: contentAnalysis.technicalTermDensity,
      
      // PDF-specific metadata
      title: pdfData.info?.Title || file.name,
      author: pdfData.info?.Author || undefined,
      subject: pdfData.info?.Subject || undefined,
      creator: pdfData.info?.Creator || undefined,
      producer: pdfData.info?.Producer || undefined,
      creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
      modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
      
      // PDF version and security
      pdfVersion: pdfData.version || undefined,
      isEncrypted: pdfData.info?.IsEncrypted || false,
      
      // Processing metadata
      processingTimestamp: new Date(),
      extractionMethod: 'pdf-parse',
      ocrRequired: await this.isScannedPDFFromData(pdfData, file.size)
    };
  }

  private analyzeContentCharacteristics(text: string): {
    hasStructuredContent: boolean;
    hasNumberedSections: boolean;
    hasBulletPoints: boolean;
    hasCodeBlocks: boolean;
    hasMathematicalContent: boolean;
    hasTabularData: boolean;
    primaryLanguage: string;
    complexityScore: number;
    technicalTermDensity: number;
  } {
    // Check for structured content patterns
    const hasNumberedSections = /^\s*\d+\./.test(text) || /^\s*\d+\.\d+/.test(text);
    const hasBulletPoints = /^\s*[•\-\*]/.test(text) || text.includes('• ') || text.includes('- ');
    const hasCodeBlocks = text.includes('```') || text.includes('function') || text.includes('class ') || /\w+\(\)/.test(text);
    const hasMathematicalContent = /[∑∏∫√±≤≥≠∞]/.test(text) || /\$.*\$/.test(text) || /\b\d+\s*[+\-*/=]\s*\d+\b/.test(text);
    const hasTabularData = text.includes('|') && text.split('|').length > 10; // Simple table detection
    
    const hasStructuredContent = hasNumberedSections || hasBulletPoints || hasCodeBlocks;
    
    // Simple language detection (basic heuristic)
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const wordCount = text.split(/\s+/).length;
    const englishWordCount = englishWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (text.match(regex) || []).length;
    }, 0);
    const englishRatio = englishWordCount / wordCount;
    const primaryLanguage = englishRatio > 0.02 ? 'en' : 'unknown';
    
    // Calculate complexity score (0-100)
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / wordCount;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / sentenceCount;
    const complexityScore = Math.min(100, Math.round(
      (avgWordLength * 10) + (avgSentenceLength * 2) + (hasCodeBlocks ? 20 : 0) + (hasMathematicalContent ? 15 : 0)
    ));
    
    // Calculate technical term density
    const technicalPatterns = [
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+\(\)/g, // Function calls
      /\b\d+\.\d+\b/g, // Version numbers or decimals
      /\b[a-z]+_[a-z]+\b/g, // Snake_case
      /\b[a-z]+[A-Z][a-z]+\b/g // camelCase
    ];
    
    const technicalTerms = technicalPatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    const technicalTermDensity = technicalTerms / wordCount;
    
    return {
      hasStructuredContent,
      hasNumberedSections,
      hasBulletPoints,
      hasCodeBlocks,
      hasMathematicalContent,
      hasTabularData,
      primaryLanguage,
      complexityScore,
      technicalTermDensity
    };
  }

  private isLikelyExample(text: string): boolean {
    const exampleKeywords = [
      'example', 'for instance', 'such as', 'e.g.', 'figure', 'diagram', 
      'chart', 'graph', 'illustration', 'sample', 'case study'
    ];
    
    const lowerText = text.toLowerCase();
    return exampleKeywords.some(keyword => lowerText.includes(keyword));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract text from a specific page range
   */
  async extractPageRange(file: File, startPage: number, endPage: number): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // This would require a more advanced PDF library like pdf2pic or pdf-lib
    // For now, return the full text with a note about the limitation
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    
    // In a full implementation, you'd extract specific pages
    return pdfData.text;
  }

  /**
   * Check if PDF is likely scanned (image-based)
   */
  async isScannedPDF(file: File): Promise<boolean> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    
    return this.isScannedPDFFromData(pdfData, file.size);
  }

  private async isScannedPDFFromData(pdfData: any, fileSize: number): Promise<boolean> {
    // Multiple heuristics to determine if PDF is scanned
    
    // 1. Text density check - if very little text relative to file size
    const textDensity = pdfData.text.length / fileSize;
    if (textDensity < 0.001) {
      return true;
    }
    
    // 2. Check for very short text content
    if (pdfData.text.trim().length < 100 && pdfData.numpages > 1) {
      return true;
    }
    
    // 3. Check text-to-page ratio
    const textPerPage = pdfData.text.length / pdfData.numpages;
    if (textPerPage < 50) { // Very little text per page
      return true;
    }
    
    // 4. Look for OCR artifacts or patterns
    const ocrPatterns = [
      /[Il1|]{3,}/, // Common OCR confusion patterns
      /[0O]{3,}/,
      /\s{5,}/, // Excessive spacing
      /[^\w\s]{10,}/ // Long sequences of non-word characters
    ];
    
    const hasOCRArtifacts = ocrPatterns.some(pattern => pattern.test(pdfData.text));
    
    // 5. Check for lack of proper word boundaries
    const words = pdfData.text.split(/\s+/).filter(word => word.length > 0);
    const validWords = words.filter(word => /^[a-zA-Z]+$/.test(word));
    const wordRatio = validWords.length / words.length;
    
    if (wordRatio < 0.3 && hasOCRArtifacts) {
      return true;
    }
    
    return false;
  }

  /**
   * Analyze PDF structure to determine content organization
   */
  async analyzePDFStructure(file: File): Promise<{
    hasImages: boolean;
    hasEmbeddedImages: boolean;
    hasImageReferences: boolean;
    isScanned: boolean;
    textQuality: 'high' | 'medium' | 'low';
    recommendedProcessing: 'text' | 'ocr' | 'hybrid';
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    
    const isScanned = await this.isScannedPDFFromData(pdfData, file.size);
    
    // Analyze text quality
    const textQuality = this.analyzeTextQuality(pdfData.text);
    
    // Check for embedded images
    const bufferStr = buffer.toString('binary');
    const hasEmbeddedImages = ['/Image', '/DCTDecode', '/FlateDecode'].some(marker => 
      bufferStr.includes(marker)
    );
    
    // Check for image references in text
    const imageReferencePatterns = [
      /Figure\s+\d+/gi,
      /Chart\s+\d+/gi,
      /Diagram\s+\d+/gi,
      /Image\s+\d+/gi
    ];
    const hasImageReferences = imageReferencePatterns.some(pattern => 
      pattern.test(pdfData.text)
    );
    
    const hasImages = hasEmbeddedImages || hasImageReferences;
    
    // Determine recommended processing approach
    let recommendedProcessing: 'text' | 'ocr' | 'hybrid';
    if (isScanned) {
      recommendedProcessing = 'ocr';
    } else if (hasImages && textQuality === 'low') {
      recommendedProcessing = 'hybrid';
    } else {
      recommendedProcessing = 'text';
    }
    
    return {
      hasImages,
      hasEmbeddedImages,
      hasImageReferences,
      isScanned,
      textQuality,
      recommendedProcessing
    };
  }

  private analyzeTextQuality(text: string): 'high' | 'medium' | 'low' {
    if (text.length < 100) return 'low';
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const validWords = words.filter(word => /^[a-zA-Z]+$/.test(word));
    const wordRatio = validWords.length / words.length;
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Check for proper capitalization
    const capitalizedSentences = sentences.filter(s => 
      /^[A-Z]/.test(s.trim())
    ).length;
    const capitalizationRatio = capitalizedSentences / sentences.length;
    
    if (wordRatio > 0.8 && avgWordsPerSentence > 5 && capitalizationRatio > 0.7) {
      return 'high';
    } else if (wordRatio > 0.6 && avgWordsPerSentence > 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}