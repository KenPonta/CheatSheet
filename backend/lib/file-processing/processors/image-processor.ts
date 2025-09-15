// Enhanced image processor with OCR using sharp and tesseract.js

import { BaseFileProcessor } from '../base-processor';
import { 
  ExtractedContent, 
  ProcessingResult, 
  SupportedFileType, 
  ExtractedImage,
  TextBoundingBox,
  ImageAnalysis
} from '../types';
import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import sharp from '../../sharp-config';
import '../../startup/sharp-init';

export class ImageProcessor extends BaseFileProcessor {
  private ocrWorker: Worker | null = null;
  private readonly supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

  constructor() {
    super(
      20 * 1024 * 1024, // 20MB max file size
      ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'], // MIME types
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] // Extensions
    );
  }

  getSupportedType(): SupportedFileType {
    return 'image';
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
        // Convert file to buffer for processing
        const buffer = await this.fileToBuffer(file);
        
        // Preprocess image for better OCR accuracy
        const preprocessedBuffer = await this.preprocessImage(buffer);
        const preprocessedBase64 = `data:image/png;base64,${preprocessedBuffer.toString('base64')}`;
        
        // Convert original to base64 for storage
        const originalBase64 = await this.fileToBase64(file);
        
        // Perform OCR with Tesseract.js
        const ocrResult = await this.performOCR(preprocessedBuffer);
        
        // Analyze image content
        const imageAnalysis = await this.analyzeImageContent(buffer, ocrResult.data.text);
        
        // Extract bounding boxes for text regions
        const boundingBoxes = this.extractBoundingBoxes(ocrResult);
        
        const extractedImage: ExtractedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          base64: originalBase64,
          ocrText: ocrResult.data.text,
          context: `Image file: ${file.name}`,
          isExample: imageAnalysis.hasExamples,
          ocrConfidence: ocrResult.data.confidence,
          preprocessedImage: preprocessedBase64,
          detectedLanguages: this.detectLanguages(ocrResult.data.text),
          boundingBoxes,
          imageAnalysis
        };

        const extractedContent: ExtractedContent = {
          text: ocrResult.data.text || `Image file: ${file.name} (no text detected)`,
          images: [extractedImage],
          tables: [],
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            wordCount: this.countWords(ocrResult.data.text),
            characterCount: ocrResult.data.text.length,
            ocrRequired: true,
            hasStructuredContent: imageAnalysis.hasDiagrams || imageAnalysis.hasCharts,
            hasMathematicalContent: imageAnalysis.hasFormulas
          },
          structure: {
            headings: [],
            sections: this.extractSections(ocrResult.data.text),
            hierarchy: 0
          }
        };

        return extractedContent;
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
        errors: [this.createProcessingError('PROCESSING_ERROR', `Failed to process image: ${errorMessage}`, 'high')],
        processingTime: 0
      };
    } finally {
      // Clean up OCR worker
      if (this.ocrWorker) {
        await this.ocrWorker.terminate();
        this.ocrWorker = null;
      }
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Create Sharp instance with explicit configuration to avoid worker issues
      const sharpInstance = sharp(buffer, {
        // Disable worker threads to prevent module not found errors
        sequentialRead: true,
        limitInputPixels: false,
        // Force single-threaded processing
        density: 300
      });
      
      const processedImage = await sharpInstance
        // Convert to grayscale for better text recognition
        .grayscale()
        // Enhance contrast
        .normalize()
        // Resize for optimal OCR
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        // Convert to PNG for better OCR
        .png({ compressionLevel: 0, quality: 100 })
        .toBuffer();
      
      return processedImage;
    } catch (error) {
      // If preprocessing fails, return original buffer
      console.warn('Image preprocessing failed, using original:', error);
      
      // Try a simpler approach without Sharp if the main processing fails
      try {
        return await sharp(buffer)
          .png()
          .toBuffer();
      } catch (fallbackError) {
        console.warn('Sharp fallback also failed:', fallbackError);
        return buffer;
      }
    }
  }

  /**
   * Perform OCR using Tesseract.js
   */
  private async performOCR(imageBuffer: Buffer): Promise<RecognizeResult> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('eng', 1, {
        logger: m => {
          // Optional: log OCR progress
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
    }

    // Configure OCR for better accuracy
    await this.ocrWorker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?;:()[]{}+-=*/\\|@#$%^&_~`"\'<>',
      tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
      preserve_interword_spaces: '1'
    });

    return await this.ocrWorker.recognize(imageBuffer);
  }

  /**
   * Analyze image content to identify diagrams, examples, etc.
   */
  private async analyzeImageContent(buffer: Buffer, ocrText: string): Promise<ImageAnalysis> {
    const hasText = ocrText.trim().length > 0;
    
    // Analyze OCR text for content patterns
    const textLower = ocrText.toLowerCase();
    
    // Look for example indicators
    const exampleKeywords = ['example', 'ex.', 'e.g.', 'for instance', 'sample', 'demo'];
    const hasExamples = exampleKeywords.some(keyword => textLower.includes(keyword));
    
    // Look for mathematical content
    const mathPatterns = [/\d+\s*[+\-*/=]\s*\d+/, /[a-z]\s*=\s*/, /\b(sin|cos|tan|log|ln)\b/i];
    const hasFormulas = mathPatterns.some(pattern => pattern.test(ocrText));
    
    // Look for chart/diagram indicators
    const chartKeywords = ['chart', 'graph', 'diagram', 'figure', 'plot', 'axis', 'legend'];
    const hasCharts = chartKeywords.some(keyword => textLower.includes(keyword));
    
    // Analyze image properties using sharp
    let hasDiagrams = false;
    try {
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();
      
      // Simple heuristic: images with low color variance might be diagrams
      const colorVariance = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
      hasDiagrams = colorVariance < 30 && hasText; // Low color variance + text suggests diagram
    } catch (error) {
      console.warn('Could not analyze image properties:', error);
    }

    // Determine primary content type
    let contentType: ImageAnalysis['contentType'] = 'unknown';
    let confidence = 0.5;

    // Check for mixed content first (multiple types present)
    const contentTypeCount = [hasFormulas, hasCharts, hasDiagrams, hasExamples].filter(Boolean).length;
    
    if (contentTypeCount > 1) {
      contentType = 'mixed';
      confidence = 0.8;
    } else if (hasFormulas) {
      contentType = 'formula';
      confidence = 0.8;
    } else if (hasExamples) {
      contentType = 'example';
      confidence = 0.7;
    } else if (hasCharts) {
      contentType = 'chart';
      confidence = 0.7;
    } else if (hasDiagrams) {
      contentType = 'diagram';
      confidence = 0.6;
    } else if (hasText) {
      contentType = 'text';
      confidence = 0.6;
    }

    return {
      hasText,
      hasDiagrams,
      hasCharts,
      hasFormulas,
      hasExamples,
      contentType,
      confidence
    };
  }

  /**
   * Extract bounding boxes from OCR result
   */
  private extractBoundingBoxes(ocrResult: RecognizeResult): TextBoundingBox[] {
    const boundingBoxes: TextBoundingBox[] = [];
    
    if (ocrResult.data.words) {
      for (const word of ocrResult.data.words) {
        if (word.text.trim() && word.bbox) {
          boundingBoxes.push({
            text: word.text,
            confidence: word.confidence / 100, // Convert to 0-1 scale
            bbox: {
              x0: word.bbox.x0,
              y0: word.bbox.y0,
              x1: word.bbox.x1,
              y1: word.bbox.y1
            }
          });
        }
      }
    }
    
    return boundingBoxes;
  }

  /**
   * Detect languages in the OCR text
   */
  private detectLanguages(text: string): string[] {
    // Simple language detection based on character patterns
    const languages: string[] = ['en']; // Default to English
    
    // Check for common non-English patterns
    if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(text)) {
      languages.push('fr', 'es', 'de'); // Romance/Germanic languages
    }
    
    if (/[αβγδεζηθικλμνξοπρστυφχψω]/i.test(text)) {
      languages.push('el'); // Greek
    }
    
    if (/[а-яё]/i.test(text)) {
      languages.push('ru'); // Russian
    }
    
    return languages;
  }

  /**
   * Extract sections from OCR text based on structure
   */
  private extractSections(text: string) {
    const sections = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection = '';
    for (const line of lines) {
      // Simple heuristic: lines that are short and followed by longer content might be headings
      if (line.length < 50 && line.trim().length > 0) {
        if (currentSection) {
          sections.push({
            title: 'Content Section',
            content: currentSection.trim()
          });
        }
        currentSection = line + '\n';
      } else {
        currentSection += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push({
        title: 'Content Section',
        content: currentSection.trim()
      });
    }
    
    return sections;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Convert file to buffer
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });
  }
}