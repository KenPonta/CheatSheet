// Integration tests for OCR image processing workflow

import { ImageProcessor } from '../processors/image-processor';
import { sampleImageOCRResults, expectedImageAnalysis, sampleImageFiles } from './test-data/sample-image-content';

// Mock tesseract.js for integration tests
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn()
}));

// Mock sharp for integration tests
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

describe('Image OCR Integration Tests', () => {
  let mockWorker: any;

  beforeEach(() => {
    // Setup comprehensive mock worker
    mockWorker = {
      setParameters: jest.fn(),
      recognize: jest.fn(),
      terminate: jest.fn()
    };
    
    const { createWorker } = require('tesseract.js');
    (createWorker as jest.Mock).mockResolvedValue(mockWorker);
    
    // Setup sharp mock with realistic behavior
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
    
    const sharp = require('sharp');
    (sharp as any).mockReturnValue(mockSharp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete OCR Workflow', () => {
    it('should process mathematical formula image end-to-end', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.mathFormula);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      expect(result.content?.text).toContain('Quadratic Formula');
      
      const image = result.content?.images[0];
      expect(image?.imageAnalysis?.hasFormulas).toBe(true);
      expect(image?.imageAnalysis?.contentType).toBe('mixed'); // Contains formulas and diagrams
      expect(image?.ocrConfidence).toBe(92);
      expect(image?.boundingBoxes).toHaveLength(4);
    });

    it('should process example problem image with context analysis', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.exampleProblem);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.jpegFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      expect(result.content?.text).toContain('Example 1');
      
      const image = result.content?.images[0];
      expect(image?.imageAnalysis?.hasExamples).toBe(true);
      expect(image?.imageAnalysis?.hasFormulas).toBe(true);
      expect(image?.isExample).toBe(true);
      expect(image?.imageAnalysis?.contentType).toBe('mixed'); // Contains examples and formulas
    });

    it('should process chart/diagram with visual analysis', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.chartDiagram);
      
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
            { stdev: 18 },
            { stdev: 12 }
          ]
        })
      };
      
      const sharp = require('sharp');
      (sharp as any).mockReturnValue(mockSharp);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      expect(result.content?.text).toContain('Sales Chart');
      
      const image = result.content?.images[0];
      expect(image?.imageAnalysis?.hasCharts).toBe(true);
      expect(image?.imageAnalysis?.hasDiagrams).toBe(true);
      expect(image?.imageAnalysis?.contentType).toBe('mixed'); // Contains charts and diagrams
      
      const metadata = result.content?.metadata;
      expect(metadata?.hasStructuredContent).toBe(true);
    });

    it('should handle multilingual content detection', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.multilingualText);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      
      const image = result.content?.images[0];
      const languages = image?.detectedLanguages || [];
      
      expect(languages).toContain('en'); // English
      expect(languages).toContain('fr'); // French
      expect(languages).toContain('ru'); // Russian
      expect(languages).toContain('el'); // Greek
    });

    it('should handle low quality images gracefully', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.noisyImage);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.jpegFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      expect(result.content?.text).toContain('n01sy');
      
      const image = result.content?.images[0];
      expect(image?.ocrConfidence).toBe(45); // Low confidence
      expect(image?.boundingBoxes?.length).toBeGreaterThan(0);
      
      // Should still extract some text despite low quality
      expect(image?.ocrText).toBeTruthy();
    });

    it('should handle images with no text', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.noText);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      expect(result.content?.text).toContain('no text detected');
      
      const image = result.content?.images[0];
      expect(image?.ocrText).toBe('');
      expect(image?.imageAnalysis?.hasText).toBe(false);
      expect(image?.imageAnalysis?.contentType).toBe('unknown');
      expect(image?.boundingBoxes).toHaveLength(0);
    });
  });

  describe('File Format Support Integration', () => {
    const testFormats = [
      { name: 'PNG', file: () => sampleImageFiles.pngFile() },
      { name: 'JPEG', file: () => sampleImageFiles.jpegFile() },
      { name: 'GIF', file: () => sampleImageFiles.gifFile() },
      { name: 'BMP', file: () => sampleImageFiles.bmpFile() },
      { name: 'WebP', file: () => sampleImageFiles.webpFile() }
    ];

    testFormats.forEach(({ name, file }) => {
      it(`should process ${name} files through complete workflow`, async () => {
        mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.structuredDocument);
        
        const processor = new ImageProcessor();
        const testFile = file();
        
        const result = await processor.processFile(testFile);
        
        expect(result.status).toBe('success');
        expect(result.content?.text).toContain('Chapter 1');
        expect(result.content?.images).toHaveLength(1);
        
        const image = result.content?.images[0];
        expect(image?.base64).toMatch(/^data:image\//);
        expect(image?.preprocessedImage).toMatch(/^data:image\/png;base64,/);
        expect(image?.ocrText).toBeTruthy();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle OCR worker initialization failure', async () => {
      const { createWorker } = require('tesseract.js');
      (createWorker as jest.Mock).mockRejectedValue(new Error('Worker init failed'));
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Worker init failed');
    });

    it('should handle sharp preprocessing failure gracefully', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.structuredDocument);
      
      // Make sharp fail
      const sharp = require('sharp');
      (sharp as any).mockImplementation(() => {
        throw new Error('Sharp processing failed');
      });
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      // Should still succeed with original image
      expect(result.status).toBe('success');
      expect(result.content?.text).toContain('Chapter 1');
    });

    it('should handle file size validation', async () => {
      const processor = new ImageProcessor();
      const largeFile = sampleImageFiles.largeFile(); // 25MB file
      
      const result = await processor.processFile(largeFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('should handle unsupported file formats', async () => {
      const processor = new ImageProcessor();
      const unsupportedFile = sampleImageFiles.unsupportedFile();
      
      const result = await processor.processFile(unsupportedFile);
      
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should properly clean up OCR worker resources', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.structuredDocument);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      await processor.processFile(testFile);
      
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should clean up resources even on processing failure', async () => {
      mockWorker.recognize.mockRejectedValue(new Error('OCR processing failed'));
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      await processor.processFile(testFile);
      
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should handle multiple concurrent processing requests', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.structuredDocument);
      
      const processor = new ImageProcessor();
      
      const files = [
        sampleImageFiles.pngFile(),
        sampleImageFiles.jpegFile(),
        sampleImageFiles.gifFile()
      ];
      
      const promises = files.map(file => processor.processFile(file));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('success');
        expect(result.content?.text).toContain('Chapter 1');
      });
      
      // Each processing should have its own worker
      expect(mockWorker.terminate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Content Structure Analysis', () => {
    it('should extract document structure from OCR text', async () => {
      mockWorker.recognize.mockResolvedValue(sampleImageOCRResults.structuredDocument);
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      expect(result.status).toBe('success');
      
      const structure = result.content?.structure;
      expect(structure?.sections).toHaveLength(2); // Should extract sections
      expect(structure?.sections[0]?.content).toContain('Chapter 1');
      
      const metadata = result.content?.metadata;
      expect(metadata?.wordCount).toBeGreaterThan(0);
      expect(metadata?.characterCount).toBeGreaterThan(0);
      expect(metadata?.hasBulletPoints).toBe(true); // Document has bullet points
    });

    it('should calculate accurate word and character counts', async () => {
      const testText = 'This is a test with exactly ten words here.';
      mockWorker.recognize.mockResolvedValue({
        data: {
          text: testText,
          confidence: 90,
          words: []
        }
      });
      
      const processor = new ImageProcessor();
      const testFile = sampleImageFiles.pngFile();
      
      const result = await processor.processFile(testFile);
      
      const metadata = result.content?.metadata;
      expect(metadata?.wordCount).toBe(10);
      expect(metadata?.characterCount).toBe(testText.length);
    });
  });
});