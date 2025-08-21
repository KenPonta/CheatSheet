// Unit tests for enhanced image processing with OCR

import { ImageProcessor } from '../processors/image-processor';
import { ExtractedImage, ImageAnalysis } from '../types';
import sharp from 'sharp';

// Mock tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(() => Promise.resolve({
    setParameters: jest.fn(),
    recognize: jest.fn(),
    terminate: jest.fn()
  }))
}));

// Mock sharp
jest.mock('sharp');

// Mock FileReader for Node.js environment
global.FileReader = class {
  result: string | ArrayBuffer | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  
  readAsDataURL(file: Blob) {
    setTimeout(() => {
      // Convert buffer to base64 for testing
      if (file instanceof File) {
        const buffer = Buffer.from('fake-image-data');
        this.result = `data:${file.type};base64,${buffer.toString('base64')}`;
      } else {
        this.result = 'data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh'; // 'fake-image-data' in base64
      }
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  }
} as any;

describe('ImageProcessor OCR Enhancement', () => {
  let processor: ImageProcessor;
  let mockWorker: any;

  beforeEach(() => {
    processor = new ImageProcessor();
    
    // Setup mock worker
    mockWorker = {
      setParameters: jest.fn(),
      recognize: jest.fn(),
      terminate: jest.fn()
    };
    
    const { createWorker } = require('tesseract.js');
    (createWorker as jest.Mock).mockResolvedValue(mockWorker);
    
    // Setup sharp mock
    const mockSharp = {
      grayscale: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      sharpen: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
      metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
      stats: jest.fn().mockResolvedValue({
        channels: [
          { stdev: 25 },
          { stdev: 30 },
          { stdev: 20 }
        ]
      })
    };
    
    (sharp as any).mockReturnValue(mockSharp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('OCR Text Extraction', () => {
    it('should extract text from image using OCR', async () => {
      // Mock OCR result
      const mockOCRResult = {
        data: {
          text: 'Sample text from image',
          confidence: 85,
          words: [
            {
              text: 'Sample',
              confidence: 90,
              bbox: { x0: 10, y0: 20, x1: 60, y1: 40 }
            },
            {
              text: 'text',
              confidence: 80,
              bbox: { x0: 70, y0: 20, x1: 100, y1: 40 }
            }
          ]
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      // Create test image file
      const testFile = new File([Buffer.from('fake-image-data')], 'test.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      expect(result.content?.text).toBe('Sample text from image');
      expect(result.content?.images).toHaveLength(1);
      
      const extractedImage = result.content?.images[0];
      expect(extractedImage?.ocrText).toBe('Sample text from image');
      expect(extractedImage?.ocrConfidence).toBe(85);
      expect(extractedImage?.boundingBoxes).toHaveLength(2);
    });

    it('should handle OCR failure gracefully', async () => {
      mockWorker.recognize.mockRejectedValue(new Error('OCR failed'));
      
      const testFile = new File([Buffer.from('fake-image-data')], 'test.jpg', {
        type: 'image/jpeg'
      });
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('OCR failed');
    });

    it('should detect multiple languages in text', async () => {
      const mockOCRResult = {
        data: {
          text: 'Hello world français español',
          confidence: 85,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'multilingual.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const extractedImage = result.content?.images[0];
      expect(extractedImage?.detectedLanguages).toContain('en');
      expect(extractedImage?.detectedLanguages).toContain('fr');
    });
  });

  describe('Image Preprocessing', () => {
    it('should preprocess image for better OCR accuracy', async () => {
      const mockOCRResult = {
        data: {
          text: 'Preprocessed text',
          confidence: 90,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'test.bmp', {
        type: 'image/bmp'
      });
      
      await processor.processFile(testFile);
      
      // Verify sharp preprocessing chain was called
      const sharpInstance = (sharp as any)();
      expect(sharpInstance.grayscale).toHaveBeenCalled();
      expect(sharpInstance.normalize).toHaveBeenCalled();
      expect(sharpInstance.resize).toHaveBeenCalledWith({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: false
      });
      expect(sharpInstance.sharpen).toHaveBeenCalled();
      expect(sharpInstance.png).toHaveBeenCalledWith({ quality: 100 });
    });

    it('should handle preprocessing failure gracefully', async () => {
      // Make sharp throw an error
      const mockSharp = {
        grayscale: jest.fn().mockImplementation(() => {
          throw new Error('Sharp processing failed');
        })
      };
      (sharp as any).mockReturnValue(mockSharp);
      
      const mockOCRResult = {
        data: {
          text: 'Text from original image',
          confidence: 75,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'test.gif', {
        type: 'image/gif'
      });
      
      const result = await processor.processFile(testFile);
      
      // Should still succeed with original image
      expect(result.status).toBe('success');
      expect(result.content?.text).toBe('Text from original image');
    });
  });

  describe('Image Content Analysis', () => {
    it('should identify mathematical formulas', async () => {
      const mockOCRResult = {
        data: {
          text: 'x = 2 + 3 * sin(45°)',
          confidence: 88,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      // Reset sharp mock to prevent diagram detection
      const mockSharp = {
        grayscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
        metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
        stats: jest.fn().mockResolvedValue({
          channels: [
            { stdev: 50 }, // High variance - not a diagram
            { stdev: 60 },
            { stdev: 45 }
          ]
        })
      };
      (sharp as any).mockReturnValue(mockSharp);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'formula.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const imageAnalysis = result.content?.images[0]?.imageAnalysis;
      expect(imageAnalysis?.hasFormulas).toBe(true);
      expect(imageAnalysis?.contentType).toBe('formula'); // Pure formula content
      expect(imageAnalysis?.confidence).toBeGreaterThan(0.7);
    });

    it('should identify example content', async () => {
      const mockOCRResult = {
        data: {
          text: 'Example: For instance, consider the following sample problem',
          confidence: 85,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      // Reset sharp mock to prevent diagram detection
      const mockSharp = {
        grayscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
        metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
        stats: jest.fn().mockResolvedValue({
          channels: [
            { stdev: 50 }, // High variance - not a diagram
            { stdev: 60 },
            { stdev: 45 }
          ]
        })
      };
      (sharp as any).mockReturnValue(mockSharp);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'example.jpg', {
        type: 'image/jpeg'
      });
      
      const result = await processor.processFile(testFile);
      
      const imageAnalysis = result.content?.images[0]?.imageAnalysis;
      expect(imageAnalysis?.hasExamples).toBe(true);
      expect(imageAnalysis?.contentType).toBe('example'); // Pure example content
      expect(result.content?.images[0]?.isExample).toBe(true);
    });

    it('should identify charts and diagrams', async () => {
      const mockOCRResult = {
        data: {
          text: 'Sales data trends',
          confidence: 82,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      // Mock low color variance for diagram detection
      const mockSharp = {
        grayscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
        metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
        stats: jest.fn().mockResolvedValue({
          channels: [
            { stdev: 15 }, // Low variance suggests diagram
            { stdev: 20 },
            { stdev: 10 }
          ]
        })
      };
      (sharp as any).mockReturnValue(mockSharp);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'chart.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const imageAnalysis = result.content?.images[0]?.imageAnalysis;
      expect(imageAnalysis?.hasDiagrams).toBe(true);
      expect(imageAnalysis?.contentType).toBe('diagram'); // Pure diagram content
    });

    it('should handle mixed content types', async () => {
      const mockOCRResult = {
        data: {
          text: 'Example chart: y = mx + b with diagram showing linear relationship',
          confidence: 90,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'mixed.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const imageAnalysis = result.content?.images[0]?.imageAnalysis;
      expect(imageAnalysis?.hasFormulas).toBe(true);
      expect(imageAnalysis?.hasExamples).toBe(true);
      expect(imageAnalysis?.hasCharts).toBe(true);
      expect(imageAnalysis?.contentType).toBe('mixed');
    });
  });

  describe('Bounding Box Extraction', () => {
    it('should extract text bounding boxes from OCR result', async () => {
      const mockOCRResult = {
        data: {
          text: 'Word1 Word2 Word3',
          confidence: 85,
          words: [
            {
              text: 'Word1',
              confidence: 90,
              bbox: { x0: 10, y0: 20, x1: 50, y1: 40 }
            },
            {
              text: 'Word2',
              confidence: 85,
              bbox: { x0: 60, y0: 20, x1: 100, y1: 40 }
            },
            {
              text: 'Word3',
              confidence: 80,
              bbox: { x0: 110, y0: 20, x1: 150, y1: 40 }
            }
          ]
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'text.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const boundingBoxes = result.content?.images[0]?.boundingBoxes;
      expect(boundingBoxes).toHaveLength(3);
      
      expect(boundingBoxes?.[0]).toEqual({
        text: 'Word1',
        confidence: 0.9,
        bbox: { x0: 10, y0: 20, x1: 50, y1: 40 }
      });
      
      expect(boundingBoxes?.[1]).toEqual({
        text: 'Word2',
        confidence: 0.85,
        bbox: { x0: 60, y0: 20, x1: 100, y1: 40 }
      });
    });

    it('should filter out empty text in bounding boxes', async () => {
      const mockOCRResult = {
        data: {
          text: 'Valid text',
          confidence: 85,
          words: [
            {
              text: 'Valid',
              confidence: 90,
              bbox: { x0: 10, y0: 20, x1: 50, y1: 40 }
            },
            {
              text: '',
              confidence: 0,
              bbox: { x0: 60, y0: 20, x1: 60, y1: 40 }
            },
            {
              text: '   ',
              confidence: 10,
              bbox: { x0: 70, y0: 20, x1: 80, y1: 40 }
            },
            {
              text: 'text',
              confidence: 85,
              bbox: { x0: 90, y0: 20, x1: 120, y1: 40 }
            }
          ]
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'sparse.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const boundingBoxes = result.content?.images[0]?.boundingBoxes;
      expect(boundingBoxes).toHaveLength(2); // Only valid words
      expect(boundingBoxes?.[0]?.text).toBe('Valid');
      expect(boundingBoxes?.[1]?.text).toBe('text');
    });
  });

  describe('File Format Support', () => {
    const supportedFormats = [
      { ext: 'jpg', mime: 'image/jpeg' },
      { ext: 'jpeg', mime: 'image/jpeg' },
      { ext: 'png', mime: 'image/png' },
      { ext: 'gif', mime: 'image/gif' },
      { ext: 'bmp', mime: 'image/bmp' },
      { ext: 'webp', mime: 'image/webp' }
    ];

    supportedFormats.forEach(({ ext, mime }) => {
      it(`should process ${ext.toUpperCase()} files`, async () => {
        const mockOCRResult = {
          data: {
            text: `Text from ${ext} file`,
            confidence: 85,
            words: []
          }
        };
        
        mockWorker.recognize.mockResolvedValue(mockOCRResult);
        
        const testFile = new File([Buffer.from('fake-image-data')], `test.${ext}`, {
          type: mime
        });
        
        const result = await processor.processFile(testFile);
        
        expect(result.status).toBe('success');
        expect(result.content?.text).toBe(`Text from ${ext} file`);
        expect(result.content?.metadata.type).toBe(mime);
      });
    });

    it('should reject unsupported file formats', async () => {
      const testFile = new File([Buffer.from('fake-data')], 'test.tiff', {
        type: 'image/tiff'
      });
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Worker Management', () => {
    it('should terminate OCR worker after processing', async () => {
      const mockOCRResult = {
        data: {
          text: 'Test text',
          confidence: 85,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'test.png', {
        type: 'image/png'
      });
      
      await processor.processFile(testFile);
      
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should terminate worker even on processing failure', async () => {
      mockWorker.recognize.mockRejectedValue(new Error('Processing failed'));
      
      const testFile = new File([Buffer.from('fake-image-data')], 'test.png', {
        type: 'image/png'
      });
      
      await processor.processFile(testFile);
      
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe('Metadata Enhancement', () => {
    it('should include OCR-specific metadata', async () => {
      const mockOCRResult = {
        data: {
          text: 'This is a test document with multiple words for counting.',
          confidence: 88,
          words: []
        }
      };
      
      mockWorker.recognize.mockResolvedValue(mockOCRResult);
      
      const testFile = new File([Buffer.from('fake-image-data')], 'document.png', {
        type: 'image/png'
      });
      
      const result = await processor.processFile(testFile);
      
      const metadata = result.content?.metadata;
      expect(metadata?.ocrRequired).toBe(true);
      expect(metadata?.wordCount).toBe(10); // Count of words in test text
      expect(metadata?.characterCount).toBe(mockOCRResult.data.text.length);
      expect(metadata?.hasStructuredContent).toBeDefined();
      expect(metadata?.hasMathematicalContent).toBeDefined();
    });
  });
});