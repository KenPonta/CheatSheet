// Enhanced PDF processor tests with OCR and metadata extraction

import { PDFProcessor } from '../processors/pdf-processor';
import { createMockFile, createLargeFile, samplePDFContent } from './test-data/sample-pdf-content';

describe('PDFProcessor - Basic Tests', () => {
  let processor: PDFProcessor;

  beforeEach(() => {
    processor = new PDFProcessor();
  });

  describe('Basic functionality', () => {
    test('should identify as PDF processor', () => {
      expect(processor.getSupportedType()).toBe('pdf');
    });

    test('should validate PDF files correctly', () => {
      const mockFile = createMockFile('test.pdf');
      const validation = processor.validateFile(mockFile);
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('pdf');
    });

    test('should reject non-PDF files', () => {
      const textFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const validation = processor.validateFile(textFile);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported MIME type: text/plain');
    });

    test('should reject oversized files', () => {
      const largeFile = createLargeFile('large.pdf', 51); // 51MB file
      
      const validation = processor.validateFile(largeFile);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('exceeds maximum allowed size');
    });

    test('should reject empty files', () => {
      const emptyFile = createMockFile('empty.pdf', 'application/pdf', 0);
      const validation = processor.validateFile(emptyFile);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File is empty');
    });

    test('should reject files with wrong extension', () => {
      const wrongExtFile = new File(['content'], 'test.doc', { type: 'application/pdf' });
      const validation = processor.validateFile(wrongExtFile);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Unsupported file extension'))).toBe(true);
    });
  });

  describe('Utility methods', () => {
    test('should generate unique file IDs', () => {
      const processor1 = new PDFProcessor();
      const processor2 = new PDFProcessor();
      
      // Access the protected method through any
      const id1 = (processor1 as any).generateFileId();
      const id2 = (processor2 as any).generateFileId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });

    test('should count words correctly', () => {
      const text = 'This is a sample text with multiple words.';
      const wordCount = (processor as any).countWords(text);
      expect(wordCount).toBe(8); // Corrected expected count
    });

    test('should handle empty text word count', () => {
      const wordCount = (processor as any).countWords('');
      expect(wordCount).toBe(0);
    });

    test('should handle whitespace-only text', () => {
      const wordCount = (processor as any).countWords('   \n\t  ');
      expect(wordCount).toBe(0);
    });
  });

  describe('Structure analysis methods', () => {
    test('should detect heading levels for numbered headings', () => {
      const lines = ['1. Main Topic', '1.1. Subtopic', '1.1.1. Sub-subtopic', 'Regular text'];
      
      const level1 = (processor as any).detectHeadingLevel('1. Main Topic', 0, lines);
      const level2 = (processor as any).detectHeadingLevel('1.1. Subtopic', 1, lines);
      const level3 = (processor as any).detectHeadingLevel('1.1.1. Sub-subtopic', 2, lines);
      const level0 = (processor as any).detectHeadingLevel('Regular text', 3, lines);
      
      expect(level1).toBe(1);
      expect(level2).toBe(2);
      expect(level3).toBe(3);
      expect(level0).toBe(0);
    });

    test('should detect all caps headings', () => {
      const lines = ['CHAPTER ONE', 'This is regular text', 'ANOTHER HEADING'];
      
      const heading1 = (processor as any).detectHeadingLevel('CHAPTER ONE', 0, lines);
      const regular = (processor as any).detectHeadingLevel('This is regular text', 1, lines);
      const heading2 = (processor as any).detectHeadingLevel('ANOTHER HEADING', 2, lines);
      
      expect(heading1).toBe(1);
      expect(regular).toBe(0);
      expect(heading2).toBe(1);
    });

    test('should detect title case headings', () => {
      const lines = ['Introduction to Machine Learning', 'This is regular text.'];
      
      const titleCase = (processor as any).detectHeadingLevel('Introduction to Machine Learning', 0, lines);
      const regular = (processor as any).detectHeadingLevel('This is regular text.', 1, lines);
      
      expect(titleCase).toBe(2);
      expect(regular).toBe(0);
    });

    test('should identify title case correctly', () => {
      const isTitleCase = (processor as any).isTitleCase.bind(processor);
      
      expect(isTitleCase('Introduction to Machine Learning')).toBe(true);
      expect(isTitleCase('This is a Title')).toBe(true);
      expect(isTitleCase('this is not title case')).toBe(false);
      expect(isTitleCase('THIS IS ALL CAPS')).toBe(false);
      expect(isTitleCase('Single')).toBe(false); // Single word
    });

    test('should estimate page numbers correctly', () => {
      const estimatePage = (processor as any).estimatePageNumber.bind(processor);
      
      expect(estimatePage(0, 100)).toBe(1);
      expect(estimatePage(50, 100)).toBe(5);
      expect(estimatePage(99, 100)).toBe(10);
    });

    test('should identify example content', () => {
      const isExample = (processor as any).isLikelyExample.bind(processor);
      
      expect(isExample('For example, this shows the process')).toBe(true);
      expect(isExample('Figure 1 illustrates the concept')).toBe(true);
      expect(isExample('This is a sample case study')).toBe(true);
      expect(isExample('Regular text without keywords')).toBe(false);
    });
  });

  describe('Enhanced PDF Analysis', () => {
    test('should detect scanned PDFs correctly', async () => {
      // Mock a scanned PDF (minimal text, large file)
      const scannedFile = createMockFile('scanned.pdf', 'application/pdf', 5 * 1024 * 1024); // 5MB
      
      // Mock pdf-parse to return minimal text
      jest.doMock('pdf-parse', () => ({
        __esModule: true,
        default: jest.fn().mockResolvedValue({
          text: 'A few OCR artifacts l1ke th1s',
          numpages: 10,
          info: {}
        })
      }));
      
      // Create a new processor instance to get the mocked version
      const testProcessor = new PDFProcessor();
      const isScanned = await testProcessor.isScannedPDF(scannedFile);
      expect(isScanned).toBe(true);
    });

    test('should analyze PDF structure comprehensively', async () => {
      const mockFile = createMockFile('structured.pdf');
      
      jest.doMock('pdf-parse', () => ({
        __esModule: true,
        default: jest.fn().mockResolvedValue(samplePDFContent.structuredDocument)
      }));
      
      // Create a new processor instance to get the mocked version
      const testProcessor = new PDFProcessor();
      const analysis = await testProcessor.analyzePDFStructure(mockFile);
      
      expect(analysis).toHaveProperty('hasImages');
      expect(analysis).toHaveProperty('isScanned');
      expect(analysis).toHaveProperty('textQuality');
      expect(analysis).toHaveProperty('recommendedProcessing');
      expect(['text', 'ocr', 'hybrid']).toContain(analysis.recommendedProcessing);
    });

    test('should analyze content characteristics', () => {
      const structuredText = `1. Introduction
      This is the main content.
      
      1.1 Subsection
      • Bullet point one
      • Bullet point two
      
      function example() {
        return "code block";
      }
      
      Mathematical formula: x = y + z`;
      
      const analysis = (processor as any).analyzeContentCharacteristics(structuredText);
      
      expect(analysis.hasStructuredContent).toBe(true);
      expect(analysis.hasNumberedSections).toBe(true);
      expect(analysis.hasBulletPoints).toBe(true);
      expect(analysis.hasCodeBlocks).toBe(true);
      expect(analysis.complexityScore).toBeGreaterThan(0);
      expect(analysis.technicalTermDensity).toBeGreaterThan(0);
    });

    test('should detect text quality levels', () => {
      const highQualityText = "This is a well-structured document with proper sentences. Each sentence follows standard grammar rules and contains meaningful content.";
      const lowQualityText = "th1s 1s p00r qu4l1ty t3xt w1th 0CR 3rr0rs";
      
      const highQuality = (processor as any).analyzeTextQuality(highQualityText);
      const lowQuality = (processor as any).analyzeTextQuality(lowQualityText);
      
      expect(['high', 'medium']).toContain(highQuality);
      expect(lowQuality).toBe('low');
    });
  });

  describe('OCR Integration', () => {
    test('should preprocess images for OCR', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      // Test the fallback behavior when Sharp fails
      const processed = await (processor as any).preprocessImageForOCR(mockImageBuffer);
      
      // Should return original buffer when preprocessing fails
      expect(processed).toBeInstanceOf(Buffer);
      expect(processed).toEqual(mockImageBuffer);
    });

    test('should clean OCR text properly', () => {
      const dirtyText = "  This   has    extra   spaces\n\n\nand  weird@#$%characters  ";
      const cleaned = (processor as any).cleanOCRText(dirtyText);
      
      expect(cleaned).toBe("This has extra spaces and weirdcharacters");
    });

    test('should handle OCR failures gracefully', async () => {
      const mockImageBuffer = Buffer.from('invalid-image');
      
      // Mock Tesseract to throw error
      jest.doMock('tesseract.js', () => ({
        recognize: jest.fn().mockRejectedValue(new Error('OCR failed'))
      }));
      
      const result = await (processor as any).performOCR(mockImageBuffer, 'test-image');
      expect(result).toBe('');
    });
  });

  describe('Image Extraction', () => {
    test('should detect image references in text', () => {
      const textWithReferences = `
        See Figure 1 for the process flow.
        Chart 2 shows the performance metrics.
        Diagram 3 illustrates the architecture.
      `;
      
      const images: any[] = [];
      (processor as any).detectImageReferences(textWithReferences, 'test-file', images);
      
      expect(images.length).toBeGreaterThan(0);
      expect(images.some(img => img.context.includes('Figure 1'))).toBe(true);
      expect(images.some(img => img.context.includes('Chart 2'))).toBe(true);
    });

    test('should extract embedded images from PDF buffer', async () => {
      const mockBuffer = Buffer.from('PDF content with /Image and /DCTDecode markers');
      const images: any[] = [];
      
      await (processor as any).extractEmbeddedImages(mockBuffer, 'test-file', images);
      
      expect(images.length).toBeGreaterThan(0);
      expect(images[0].context).toContain('Embedded image');
    });
  });

  describe('Enhanced Metadata Extraction', () => {
    test('should extract comprehensive metadata', async () => {
      const mockFile = createMockFile('test.pdf');
      const mockPdfData = {
        ...samplePDFContent.basicDocument,
        version: '1.4'
      };
      
      const metadata = await (processor as any).extractEnhancedMetadata(mockPdfData, mockFile);
      
      expect(metadata).toHaveProperty('wordCount');
      expect(metadata).toHaveProperty('characterCount');
      expect(metadata).toHaveProperty('estimatedReadingTime');
      expect(metadata).toHaveProperty('textDensityPerPage');
      expect(metadata).toHaveProperty('hasStructuredContent');
      expect(metadata).toHaveProperty('complexityScore');
      expect(metadata).toHaveProperty('technicalTermDensity');
      expect(metadata).toHaveProperty('processingTimestamp');
      expect(metadata.pdfVersion).toBe('1.4');
    });
  });

  describe('Error handling', () => {
    test('should create processing errors correctly', () => {
      const error = (processor as any).createProcessingError('TEST_ERROR', 'Test message', 'high', 'test context');
      
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.severity).toBe('high');
      expect(error.context).toBe('test context');
    });

    test('should handle validation errors in processFile', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const result = await processor.processFile(invalidFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });

    test('should handle PDF processing errors gracefully', async () => {
      const mockFile = createMockFile('error.pdf');
      
      // Create a spy on the extractPDFContent method to force an error
      const processorSpy = jest.spyOn(processor as any, 'extractPDFContent')
        .mockRejectedValue(new Error('PDF parsing failed'));
      
      const result = await processor.processFile(mockFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors[0].message).toContain('Failed to process PDF');
      
      // Restore the spy
      processorSpy.mockRestore();
    });
  });
});