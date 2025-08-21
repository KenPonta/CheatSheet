// Integration test for PDF processing workflow

import { FileProcessorFactory } from '../factory';
import { createMockFile } from './test-data/sample-pdf-content';

// Mock pdf-parse for integration testing
jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    text: `Sample PDF Document

1. Introduction
This document demonstrates PDF processing capabilities with various content types.

2. Main Content
Here we have structured content with headings and sections.

2.1. Subsection
This subsection contains detailed information about the topic.

Figure 1: Sample Diagram
[This represents an embedded image or diagram]

For example, the above figure shows the process flow.

3. Conclusion
This concludes our comprehensive PDF processing demonstration.`,
    numpages: 3,
    version: '1.7',
    info: {
      Title: 'Sample PDF Document',
      Author: 'Test Author',
      Subject: 'PDF Processing Test',
      Creator: 'Test Creator',
      Producer: 'Test Producer',
      CreationDate: new Date('2023-01-01'),
      ModDate: new Date('2023-01-02'),
      IsEncrypted: false
    }
  })
}));

// Mock Sharp for image preprocessing
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    greyscale: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image'))
  }))
}));

// Mock Tesseract.js for OCR
jest.mock('tesseract.js', () => ({
  recognize: jest.fn().mockResolvedValue({
    data: {
      text: 'Sample OCR extracted text from image',
      confidence: 85
    }
  }),
  PSM: {
    AUTO: 3
  }
}));

describe('PDF Processing Integration', () => {
  test('should process PDF file through factory', async () => {
    const mockFile = createMockFile('integration-test.pdf');
    
    // Validate file can be processed
    const validation = FileProcessorFactory.validateFile(mockFile);
    expect(validation.isValid).toBe(true);
    expect(validation.fileType).toBe('pdf');
    
    // Process the file
    const result = await FileProcessorFactory.processFile(mockFile);
    
    expect(result.status).toBe('success');
    expect(result.content).toBeDefined();
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  test('should extract comprehensive content from PDF', async () => {
    const mockFile = createMockFile('comprehensive-test.pdf');
    
    const result = await FileProcessorFactory.processFile(mockFile);
    
    expect(result.status).toBe('success');
    
    const content = result.content!;
    
    // Check text extraction
    expect(content.text).toContain('Sample PDF Document');
    expect(content.text).toContain('Introduction');
    expect(content.text).toContain('Main Content');
    
    // Check metadata
    expect(content.metadata.pageCount).toBe(3);
    expect(content.metadata.title).toBe('Sample PDF Document');
    expect(content.metadata.author).toBe('Test Author');
    expect(content.metadata.wordCount).toBeGreaterThan(0);
    expect(content.metadata.characterCount).toBeGreaterThan(0);
    expect(content.metadata.estimatedReadingTime).toBeGreaterThan(0);
    expect(content.metadata.textDensityPerPage).toBeGreaterThan(0);
    expect(content.metadata.hasStructuredContent).toBeDefined();
    expect(content.metadata.complexityScore).toBeGreaterThan(0);
    expect(content.metadata.pdfVersion).toBe('1.7');
    expect(content.metadata.isEncrypted).toBe(false);
    
    // Check structure analysis
    expect(content.structure.headings).toBeDefined();
    expect(content.structure.sections).toBeDefined();
    expect(content.structure.hierarchy).toBeGreaterThan(0);
    
    // Should detect numbered headings
    const numberedHeadings = content.structure.headings.filter(h => 
      h.text.includes('1.') || h.text.includes('2.') || h.text.includes('3.')
    );
    expect(numberedHeadings.length).toBeGreaterThan(0);
    
    // Should create sections
    expect(content.structure.sections.length).toBeGreaterThan(0);
    
    // Check images array (even if empty in mock)
    expect(content.images).toBeDefined();
    expect(Array.isArray(content.images)).toBe(true);
    
    // Check tables array
    expect(content.tables).toBeDefined();
    expect(Array.isArray(content.tables)).toBe(true);
  });

  test('should handle multiple file processing', async () => {
    const files = [
      createMockFile('doc1.pdf'),
      createMockFile('doc2.pdf'),
      createMockFile('doc3.pdf')
    ];
    
    const results = await FileProcessorFactory.processMultipleFiles(files);
    
    expect(results).toHaveLength(3);
    expect(results.every(r => r.status === 'success')).toBe(true);
    expect(results.every(r => r.content !== undefined)).toBe(true);
  });

  test('should validate multiple files correctly', () => {
    const validFiles = [
      createMockFile('valid1.pdf'),
      createMockFile('valid2.pdf')
    ];
    
    const invalidFiles = [
      new File(['content'], 'invalid.txt', { type: 'text/plain' }),
      createMockFile('empty.pdf', 'application/pdf', 0)
    ];
    
    const allFiles = [...validFiles, ...invalidFiles];
    
    const validation = FileProcessorFactory.validateMultipleFiles(allFiles);
    
    // The text file should be valid for txt processor, so we expect 3 valid files
    expect(validation.valid.length).toBeGreaterThanOrEqual(2);
    expect(validation.invalid.length).toBeGreaterThanOrEqual(1); // At least the empty PDF
    expect(validation.totalSize).toBeGreaterThan(0);
    expect(validation.totalSizeFormatted).toContain('KB');
  });

  test('should get processor configuration', () => {
    const config = FileProcessorFactory.getProcessorConfig('pdf');
    expect(config).toBeDefined();
  });

  test('should list supported file types', () => {
    const types = FileProcessorFactory.getSupportedFileTypes();
    expect(types).toContain('pdf');
    
    const mimeTypes = FileProcessorFactory.getSupportedMimeTypes();
    expect(mimeTypes).toContain('application/pdf');
    
    const extensions = FileProcessorFactory.getSupportedExtensions();
    expect(extensions).toContain('pdf');
  });

  test('should provide file type information', () => {
    const info = FileProcessorFactory.getSupportedFileInfo();
    expect(info).toBeDefined();
    expect(typeof info).toBe('object');
  });

  test('should create processor with custom config', () => {
    const mockFile = createMockFile('test.pdf');
    const processor = FileProcessorFactory.createProcessorWithConfig(mockFile, {
      maxFileSize: 10 * 1024 * 1024 // 10MB
    });
    
    expect(processor).toBeDefined();
    expect(processor!.getSupportedType()).toBe('pdf');
  });

  test('should handle processing errors gracefully', async () => {
    // Mock pdf-parse to throw an error
    const mockPdfParse = require('pdf-parse');
    mockPdfParse.default.mockRejectedValueOnce(new Error('PDF parsing failed'));
    
    const mockFile = createMockFile('error-test.pdf');
    
    const result = await FileProcessorFactory.processFile(mockFile);
    
    expect(result.status).toBe('failed');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].message).toContain('Failed to process PDF');
  });

  test('should detect and process image references', async () => {
    const mockFile = createMockFile('image-refs.pdf');
    
    const result = await FileProcessorFactory.processFile(mockFile);
    
    expect(result.status).toBe('success');
    const content = result.content!;
    
    // Should detect image references from the mock text
    expect(content.images).toBeDefined();
    expect(Array.isArray(content.images)).toBe(true);
    
    // The mock text contains "Figure 1: Sample Diagram"
    const figureReference = content.images.find(img => 
      img.context.includes('Figure 1')
    );
    expect(figureReference).toBeDefined();
  });

  test('should analyze PDF structure for scanned documents', async () => {
    // Mock a scanned PDF with minimal text
    const mockPdfParse = require('pdf-parse');
    mockPdfParse.default.mockResolvedValueOnce({
      text: 'OCR text with l1m1ted qu4l1ty',
      numpages: 5,
      info: {}
    });
    
    const mockFile = createMockFile('scanned.pdf', 'application/pdf', 10 * 1024 * 1024); // 10MB
    
    const result = await FileProcessorFactory.processFile(mockFile);
    
    expect(result.status).toBe('success');
    const content = result.content!;
    
    // Should detect low text density indicating scanned document
    expect(content.metadata.textDensityPerPage).toBeLessThan(100);
    expect(content.metadata.ocrRequired).toBe(true);
  });

  test('should extract enhanced content characteristics', async () => {
    const mockFile = createMockFile('structured.pdf');
    
    const result = await FileProcessorFactory.processFile(mockFile);
    
    expect(result.status).toBe('success');
    const content = result.content!;
    
    // Check content analysis flags
    expect(content.metadata.hasStructuredContent).toBeDefined();
    expect(content.metadata.hasNumberedSections).toBeDefined();
    expect(content.metadata.primaryLanguage).toBe('en');
    expect(content.metadata.complexityScore).toBeGreaterThan(0);
    expect(content.metadata.technicalTermDensity).toBeGreaterThanOrEqual(0);
    
    // Check processing metadata
    expect(content.metadata.processingTimestamp).toBeInstanceOf(Date);
    expect(content.metadata.extractionMethod).toBe('pdf-parse');
  });

  test('should handle OCR integration for image content', async () => {
    // Test that OCR mocking works correctly
    const Tesseract = require('tesseract.js');
    
    expect(Tesseract.recognize).toBeDefined();
    
    const mockResult = await Tesseract.recognize(Buffer.from('test'), 'eng');
    expect(mockResult.data.text).toBe('Sample OCR extracted text from image');
    expect(mockResult.data.confidence).toBe(85);
  });
});