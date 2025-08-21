// Unit tests for PowerPoint processor

import { PowerPointProcessor } from '../processors/powerpoint-processor';
import { 
  createMockPowerPointFile, 
  mockPowerPointZipStructure,
  sampleSlideXml,
  sampleSlideWithTableXml,
  sampleNotesXml,
  sampleCoreXml
} from './test-data/sample-powerpoint-content';

// Mock jszip library
jest.mock('jszip', () => ({
  default: {
    loadAsync: jest.fn()
  }
}));

describe('PowerPointProcessor', () => {
  let processor: PowerPointProcessor;
  let mockJSZip: any;

  beforeEach(() => {
    processor = new PowerPointProcessor();
    mockJSZip = require('jszip');
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    test('should identify as pptx processor', () => {
      expect(processor.getSupportedType()).toBe('pptx');
    });

    test('should validate PowerPoint files correctly', () => {
      const validFile = createMockPowerPointFile('test.pptx');
      const validation = processor.validateFile(validFile);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject non-PowerPoint files', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const validation = processor.validateFile(invalidFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should reject oversized files', () => {
      const oversizedFile = createMockPowerPointFile('large.pptx', 200 * 1024 * 1024); // 200MB
      const validation = processor.validateFile(oversizedFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('Slide extraction', () => {
    test('should extract basic slide content', async () => {
      const file = createMockPowerPointFile('basic.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content).toBeDefined();
      expect(result.content!.text).toContain('Introduction to Data Science');
      expect(result.content!.text).toContain('Data science is an interdisciplinary field');
      expect(result.content!.metadata.pageCount).toBe(1);
    });

    test('should extract multiple slides', async () => {
      const file = createMockPowerPointFile('multi-slide.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'ppt/slides/slide2.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideWithTableXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.text).toContain('Slide 1');
      expect(result.content!.text).toContain('Slide 2');
      expect(result.content!.metadata.pageCount).toBe(2);
      expect(result.content!.structure.headings).toHaveLength(2);
    });

    test('should extract slide notes', async () => {
      const file = createMockPowerPointFile('with-notes.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'ppt/notesSlides/notesSlide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleNotesXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.text).toContain('Remember to explain the importance');
      expect(result.content!.text).toContain('Mention real-world examples');
    });
  });

  describe('Table extraction', () => {
    test('should extract tables from slides', async () => {
      const file = createMockPowerPointFile('with-table.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideWithTableXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.tables).toHaveLength(1);
      
      const table = result.content!.tables[0];
      expect(table.headers).toEqual(['Method', 'Accuracy']);
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]).toEqual(['Linear Regression', '85%']);
      expect(table.context).toContain('Slide 1');
    });

    test('should handle slides without tables', async () => {
      const file = createMockPowerPointFile('no-tables.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.tables).toHaveLength(0);
    });
  });

  describe('Image extraction', () => {
    test('should extract embedded images', async () => {
      const file = createMockPowerPointFile('with-images.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue(mockPowerPointZipStructure);

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.images.length).toBeGreaterThan(0);
      
      const pngImage = result.content!.images.find(img => img.base64.includes('data:image/png'));
      const jpgImage = result.content!.images.find(img => img.base64.includes('data:image/jpeg'));
      
      expect(pngImage).toBeDefined();
      expect(jpgImage).toBeDefined();
    });

    test('should handle presentations without images', async () => {
      const file = createMockPowerPointFile('no-images.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.images).toHaveLength(0);
    });
  });

  describe('Metadata extraction', () => {
    test('should extract presentation metadata', async () => {
      const file = createMockPowerPointFile('metadata.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.metadata.title).toBe('Data Science Fundamentals');
      expect(result.content!.metadata.author).toBe('Dr. Jane Smith');
      expect(result.content!.metadata.subject).toBe('Introduction to Data Science');
      expect(result.content!.metadata.hasStructuredContent).toBe(true);
    });

    test('should handle missing metadata gracefully', async () => {
      const file = createMockPowerPointFile('no-metadata.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          }
          // No core.xml file
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.metadata.title).toBeUndefined();
      expect(result.content!.metadata.author).toBeUndefined();
    });
  });

  describe('Structure analysis', () => {
    test('should create proper document structure', async () => {
      const file = createMockPowerPointFile('structure.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideXml)
          },
          'ppt/slides/slide2.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleSlideWithTableXml)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.structure.headings).toHaveLength(2);
      expect(result.content!.structure.sections).toHaveLength(2);
      
      const firstHeading = result.content!.structure.headings[0];
      expect(firstHeading.text).toBe('Introduction to Data Science');
      expect(firstHeading.level).toBe(1);
      expect(firstHeading.page).toBe(1);
    });

    test('should handle slides without titles', async () => {
      const slideWithoutTitle = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:txBody>
                  <a:p>
                    <a:r>
                      <a:t>This is content without a clear title</a:t>
                    </a:r>
                  </a:p>
                </p:txBody>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>
      `;

      const file = createMockPowerPointFile('no-title.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(slideWithoutTitle)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.structure.sections[0].title).toBe('Slide 1');
    });
  });

  describe('Error handling', () => {
    test('should handle ZIP parsing errors', async () => {
      const file = createMockPowerPointFile('corrupt.pptx');
      
      mockJSZip.default.loadAsync.mockRejectedValue(new Error('Invalid ZIP file'));

      const result = await processor.processFile(file);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to process PowerPoint');
    });

    test('should handle malformed slide XML', async () => {
      const file = createMockPowerPointFile('malformed.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue('<invalid>xml</malformed>')
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      // Should still succeed but with limited content
      expect(result.status).toBe('success');
      expect(result.content!.metadata.pageCount).toBe(1);
    });

    test('should handle empty presentations', async () => {
      const file = createMockPowerPointFile('empty.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.metadata.pageCount).toBe(0);
      expect(result.content!.text.trim()).toBe('');
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle presentations with many slides', async () => {
      const file = createMockPowerPointFile('many-slides.pptx');
      
      // Create mock structure with 50 slides
      const files: any = {
        'docProps/core.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(sampleCoreXml)
        }
      };

      for (let i = 1; i <= 50; i++) {
        files[`ppt/slides/slide${i}.xml`] = {
          dir: false,
          async: jest.fn().mockResolvedValue(sampleSlideXml.replace('Introduction to Data Science', `Slide ${i} Title`))
        };
      }

      mockJSZip.default.loadAsync.mockResolvedValue({ files });

      const startTime = Date.now();
      const result = await processor.processFile(file);
      const processingTime = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(result.content!.metadata.pageCount).toBe(50);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle special characters in slide content', async () => {
      const unicodeSlide = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:txBody>
                  <a:p>
                    <a:r>
                      <a:t>数据科学基础</a:t>
                    </a:r>
                  </a:p>
                  <a:p>
                    <a:r>
                      <a:t>Análisis de datos con símbolos especiales: α, β, γ</a:t>
                    </a:r>
                  </a:p>
                </p:txBody>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>
      `;

      const file = createMockPowerPointFile('unicode.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'ppt/slides/slide1.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(unicodeSlide)
          },
          'docProps/core.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(sampleCoreXml)
          }
        }
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.text).toContain('数据科学基础');
      expect(result.content!.text).toContain('Análisis de datos');
      expect(result.content!.text).toContain('α, β, γ');
    });
  });
});