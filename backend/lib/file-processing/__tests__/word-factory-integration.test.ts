// Test Word processor integration with factory

import { FileProcessorFactory } from '../factory';
import { WordProcessor } from '../processors/word-processor';

describe('Word Processor Factory Integration', () => {
  it('should create Word processor from factory for .docx files', () => {
    const mockFile = new File(['content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const processor = FileProcessorFactory.createProcessor(mockFile);
    
    expect(processor).toBeInstanceOf(WordProcessor);
    expect(processor?.getSupportedType()).toBe('docx');
  });

  it('should validate Word files correctly', () => {
    const mockFile = new File(['content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const validation = FileProcessorFactory.validateFile(mockFile);
    
    expect(validation.isValid).toBe(true);
    expect(validation.fileType).toBe('docx');
  });

  it('should include docx in supported file types', () => {
    const supportedTypes = FileProcessorFactory.getSupportedFileTypes();
    expect(supportedTypes).toContain('docx');
  });

  it('should include Word MIME type in supported types', () => {
    const supportedMimeTypes = FileProcessorFactory.getSupportedMimeTypes();
    expect(supportedMimeTypes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('should include docx extension in supported extensions', () => {
    const supportedExtensions = FileProcessorFactory.getSupportedExtensions();
    expect(supportedExtensions).toContain('docx');
  });
});