// Unit tests for Word document processor

import { WordProcessor } from '../processors/word-processor';
import { ExtractedContent, ProcessingResult } from '../types';

// Mock mammoth library
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
  extractRawText: jest.fn()
}));

describe('WordProcessor', () => {
  let processor: WordProcessor;
  let mockFile: File;

  beforeEach(() => {
    processor = new WordProcessor();
    
    // Create a mock Word file
    const mockArrayBuffer = new ArrayBuffer(1024);
    mockFile = new File([mockArrayBuffer], 'test-document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now()
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should accept valid .docx files', () => {
      expect(processor.canProcess(mockFile)).toBe(true);
    });

    it('should reject files with wrong MIME type', () => {
      const invalidFile = new File(['content'], 'test.pdf', {
        type: 'application/pdf'
      });
      
      expect(processor.canProcess(invalidFile)).toBe(false);
    });

    it('should reject files with wrong extension', () => {
      const invalidFile = new File(['content'], 'test.txt', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      expect(processor.canProcess(invalidFile)).toBe(false);
    });

    it('should reject oversized files', () => {
      // Create a file larger than 100MB
      const largeBuffer = new ArrayBuffer(101 * 1024 * 1024);
      const largeFile = new File([largeBuffer], 'large.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      expect(processor.canProcess(largeFile)).toBe(false);
    });

    it('should reject empty files', () => {
      const emptyFile = new File([], 'empty.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      expect(processor.canProcess(emptyFile)).toBe(false);
    });
  });

  describe('Content Extraction', () => {
    beforeEach(() => {
      // Mock mammoth responses
      const mammoth = require('mammoth');
      
      mammoth.extractRawText.mockResolvedValue({
        value: 'Sample document text with multiple paragraphs.\n\nThis is a second paragraph with some content.',
        messages: []
      });

      mammoth.convertToHtml.mockResolvedValue({
        value: `
          <h1>Main Title</h1>
          <p>Introduction paragraph with some text.</p>
          <h2>Section 1</h2>
          <p>Content for section 1 with <strong>bold text</strong>.</p>
          <ul>
            <li>First bullet point</li>
            <li>Second bullet point</li>
          </ul>
          <h3>Subsection 1.1</h3>
          <p>Subsection content here.</p>
          <table>
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
            <tr><td>Cell 3</td><td>Cell 4</td></tr>
          </table>
          <h2>Section 2</h2>
          <p>Final section content.</p>
        `,
        messages: []
      });
    });

    it('should extract text content successfully', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      expect(result.content).toBeDefined();
      expect(result.content!.text).toContain('Sample document text');
      expect(result.content!.text).toContain('second paragraph');
    });

    it('should extract document structure with headings', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.content!.structure.headings).toHaveLength(4);
      expect(result.content!.structure.headings[0]).toEqual({
        level: 1,
        text: 'Main Title'
      });
      expect(result.content!.structure.headings[1]).toEqual({
        level: 2,
        text: 'Section 1'
      });
      expect(result.content!.structure.headings[2]).toEqual({
        level: 3,
        text: 'Subsection 1.1'
      });
    });

    it('should extract sections with content', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.content!.structure.sections.length).toBeGreaterThan(0);
      
      const mainSection = result.content!.structure.sections.find(s => s.title === 'Main Title');
      expect(mainSection).toBeDefined();
      expect(mainSection!.content).toContain('Introduction paragraph');
    });

    it('should extract tables with headers and rows', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.content!.tables).toHaveLength(1);
      
      const table = result.content!.tables[0];
      expect(table.headers).toEqual(['Header 1', 'Header 2']);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0]).toEqual(['Cell 1', 'Cell 2']);
      expect(table.rows[1]).toEqual(['Cell 3', 'Cell 4']);
    });

    it('should calculate document hierarchy correctly', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.content!.structure.hierarchy).toBe(3); // Deepest heading level
    });

    it('should generate comprehensive metadata', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      const metadata = result.content!.metadata;
      expect(metadata.name).toBe('test-document.docx');
      expect(metadata.wordCount).toBeGreaterThan(0);
      expect(metadata.characterCount).toBeGreaterThan(0);
      expect(metadata.hasStructuredContent).toBe(true);
      expect(metadata.hasBulletPoints).toBe(true);
      expect(metadata.hasTabularData).toBe(true);
      expect(metadata.extractionMethod).toBe('mammoth');
    });
  });

  describe('Image Extraction', () => {
    beforeEach(() => {
      const mammoth = require('mammoth');
      
      // Mock image extraction
      const mockImage = {
        read: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
        contentType: 'image/png',
        altText: 'Example diagram showing the process'
      };

      mammoth.convertToHtml.mockImplementation(async (input, options) => {
        // Simulate image conversion
        if (options.convertImage) {
          await options.convertImage(mockImage);
        }
        
        return {
          value: '<h1>Document with Image</h1><p>Text content</p>',
          messages: []
        };
      });

      mammoth.extractRawText.mockResolvedValue({
        value: 'Document with Image\nText content',
        messages: []
      });
    });

    it('should extract embedded images', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.content!.images).toHaveLength(1);
      
      const image = result.content!.images[0];
      expect(image.id).toMatch(/^word_img_\d+$/);
      expect(image.base64).toMatch(/^data:image\/png;base64,/);
      expect(image.context).toContain('Image extracted from Word document');
      expect(image.isExample).toBe(true); // Should detect "example" in alt text
    });
  });

  describe('Error Handling', () => {
    it('should handle mammoth processing errors gracefully', async () => {
      const mammoth = require('mammoth');
      mammoth.extractRawText.mockRejectedValue(new Error('Mammoth processing failed'));
      
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to process Word document');
    });

    it('should handle file reading errors', async () => {
      // Create a mock file that will fail to read
      const badFile = {
        ...mockFile,
        arrayBuffer: jest.fn().mockRejectedValue(new Error('File read error'))
      } as unknown as File;
      
      const result: ProcessingResult = await processor.processFile(badFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors[0].message).toContain('Failed to process Word document');
    });

    it('should return validation errors for invalid files', async () => {
      const invalidFile = new File([], 'empty.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      const result: ProcessingResult = await processor.processFile(invalidFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Content Parsing Edge Cases', () => {
    it('should handle documents without headings', async () => {
      const mammoth = require('mammoth');
      
      mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Just plain text without any headings.</p>',
        messages: []
      });

      mammoth.extractRawText.mockResolvedValue({
        value: 'Just plain text without any headings.',
        messages: []
      });
      
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      expect(result.content!.structure.headings).toHaveLength(0);
      expect(result.content!.structure.hierarchy).toBe(0);
    });

    it('should handle documents without tables', async () => {
      const mammoth = require('mammoth');
      
      mammoth.convertToHtml.mockResolvedValue({
        value: '<h1>Title</h1><p>Content without tables.</p>',
        messages: []
      });

      mammoth.extractRawText.mockResolvedValue({
        value: 'Title\nContent without tables.',
        messages: []
      });
      
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      expect(result.content!.tables).toHaveLength(0);
      expect(result.content!.metadata.hasTabularData).toBe(false);
    });

    it('should handle malformed HTML in table parsing', async () => {
      const mammoth = require('mammoth');
      
      mammoth.convertToHtml.mockResolvedValue({
        value: '<table><tr><td>Incomplete table</table>',
        messages: []
      });

      mammoth.extractRawText.mockResolvedValue({
        value: 'Incomplete table',
        messages: []
      });
      
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      // Should handle malformed HTML gracefully
    });
  });

  describe('getSupportedType', () => {
    it('should return correct supported type', () => {
      expect(processor.getSupportedType()).toBe('docx');
    });
  });
});