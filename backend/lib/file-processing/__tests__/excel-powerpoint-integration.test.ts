// Integration tests for Excel and PowerPoint processors

import { FileProcessorFactory } from '../factory';
import { ExcelProcessor } from '../processors/excel-processor';
import { PowerPointProcessor } from '../processors/powerpoint-processor';
import { createMockExcelFile, sampleExcelData } from './test-data/sample-excel-content';
import { createMockPowerPointFile, mockPowerPointZipStructure } from './test-data/sample-powerpoint-content';

// Mock dependencies
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    decode_range: jest.fn(),
    encode_cell: jest.fn()
  }
}));

jest.mock('jszip', () => ({
  default: {
    loadAsync: jest.fn()
  }
}));

describe('Excel and PowerPoint Integration Tests', () => {
  let mockXLSX: any;
  let mockJSZip: any;

  beforeEach(() => {
    mockXLSX = require('xlsx');
    mockJSZip = require('jszip');
    jest.clearAllMocks();
  });

  describe('FileProcessorFactory integration', () => {
    test('should create Excel processor for .xlsx files', () => {
      const file = createMockExcelFile('test.xlsx');
      const processor = FileProcessorFactory.createProcessor(file);
      
      expect(processor).toBeInstanceOf(ExcelProcessor);
      expect(processor?.getSupportedType()).toBe('xlsx');
    });

    test('should create PowerPoint processor for .pptx files', () => {
      const file = createMockPowerPointFile('test.pptx');
      const processor = FileProcessorFactory.createProcessor(file);
      
      expect(processor).toBeInstanceOf(PowerPointProcessor);
      expect(processor?.getSupportedType()).toBe('pptx');
    });

    test('should validate Excel files through factory', () => {
      const file = createMockExcelFile('test.xlsx');
      const validation = FileProcessorFactory.validateFile(file);
      
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('xlsx');
    });

    test('should validate PowerPoint files through factory', () => {
      const file = createMockPowerPointFile('test.pptx');
      const validation = FileProcessorFactory.validateFile(file);
      
      expect(validation.isValid).toBe(true);
      expect(validation.fileType).toBe('pptx');
    });
  });

  describe('End-to-end processing workflow', () => {
    test('should process Excel file through complete workflow', async () => {
      const file = createMockExcelFile('workflow-test.xlsx');
      
      // Mock Excel processing
      mockXLSX.read.mockReturnValue(sampleExcelData.multiSheet);
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([
          ['Product', 'Revenue'],
          ['Widget A', 1000],
          ['Widget B', 1500]
        ])
        .mockReturnValueOnce([
          ['Total Revenue', 2500]
        ])
        .mockReturnValueOnce([
          ['Chart Title', 'Revenue Chart']
        ]);

      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {
          'xl/media/chart1.png': {
            dir: false,
            async: jest.fn().mockResolvedValue('base64imagedata')
          }
        }
      });

      const result = await FileProcessorFactory.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content).toBeDefined();
      expect(result.content!.text).toContain('Data');
      expect(result.content!.text).toContain('Summary');
      expect(result.content!.tables).toHaveLength(3);
      expect(result.content!.metadata.hasTabularData).toBe(true);
    });

    test('should process PowerPoint file through complete workflow', async () => {
      const file = createMockPowerPointFile('workflow-test.pptx');
      
      mockJSZip.default.loadAsync.mockResolvedValue(mockPowerPointZipStructure);

      const result = await FileProcessorFactory.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content).toBeDefined();
      expect(result.content!.text).toContain('Introduction to Data Science');
      expect(result.content!.structure.headings.length).toBeGreaterThan(0);
      expect(result.content!.metadata.hasStructuredContent).toBe(true);
    });

    test('should process multiple files of different types', async () => {
      const excelFile = createMockExcelFile('data.xlsx');
      const pptFile = createMockPowerPointFile('presentation.pptx');
      
      // Mock Excel processing
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Value'],
        ['Item 1', 100]
      ]);

      // Mock PowerPoint processing
      mockJSZip.default.loadAsync
        .mockResolvedValueOnce({ files: {} }) // Excel
        .mockResolvedValueOnce(mockPowerPointZipStructure); // PowerPoint

      const results = await FileProcessorFactory.processMultipleFiles([excelFile, pptFile]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
      
      // Verify Excel result
      expect(results[0].content!.tables).toHaveLength(1);
      
      // Verify PowerPoint result
      expect(results[1].content!.structure.headings.length).toBeGreaterThan(0);
    });
  });

  describe('Content comparison and analysis', () => {
    test('should extract comparable content structures from both file types', async () => {
      const excelFile = createMockExcelFile('comparison.xlsx');
      const pptFile = createMockPowerPointFile('comparison.pptx');
      
      // Mock Excel with structured data
      mockXLSX.read.mockReturnValue({
        SheetNames: ['Analysis'],
        Sheets: {
          Analysis: {}
        }
      });
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Method', 'Accuracy'],
        ['Linear Regression', '85%'],
        ['Random Forest', '92%']
      ]);

      // Mock PowerPoint with similar content
      const slideWithSimilarContent = `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:txBody>
                  <a:p><a:r><a:t>Machine Learning Results</a:t></a:r></a:p>
                </p:txBody>
              </p:sp>
              <p:graphicFrame>
                <a:graphic>
                  <a:graphicData>
                    <a:tbl>
                      <a:tr>
                        <a:tc><a:txBody><a:p><a:r><a:t>Method</a:t></a:r></a:p></a:txBody></a:tc>
                        <a:tc><a:txBody><a:p><a:r><a:t>Accuracy</a:t></a:r></a:p></a:txBody></a:tc>
                      </a:tr>
                      <a:tr>
                        <a:tc><a:txBody><a:p><a:r><a:t>Linear Regression</a:t></a:r></a:p></a:txBody></a:tc>
                        <a:tc><a:txBody><a:p><a:r><a:t>85%</a:t></a:r></a:p></a:txBody></a:tc>
                      </a:tr>
                    </a:tbl>
                  </a:graphicData>
                </a:graphic>
              </p:graphicFrame>
            </p:spTree>
          </p:cSld>
        </p:sld>
      `;

      mockJSZip.default.loadAsync
        .mockResolvedValueOnce({ files: {} }) // Excel
        .mockResolvedValueOnce({
          files: {
            'ppt/slides/slide1.xml': {
              dir: false,
              async: jest.fn().mockResolvedValue(slideWithSimilarContent)
            }
          }
        });

      const excelResult = await FileProcessorFactory.processFile(excelFile);
      const pptResult = await FileProcessorFactory.processFile(pptFile);

      // Both should extract similar table structures
      expect(excelResult.content!.tables[0].headers).toEqual(['Method', 'Accuracy']);
      expect(pptResult.content!.tables[0].headers).toEqual(['Method', 'Accuracy']);
      
      // Both should contain similar text content
      expect(excelResult.content!.text).toContain('Linear Regression');
      expect(pptResult.content!.text).toContain('Linear Regression');
    });

    test('should handle mixed content types in workflow', async () => {
      const files = [
        createMockExcelFile('data.xlsx'),
        createMockPowerPointFile('presentation.pptx'),
        new File(['invalid'], 'invalid.txt', { type: 'text/plain' })
      ];

      // Mock successful processing for valid files
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data']]);
      mockJSZip.default.loadAsync
        .mockResolvedValueOnce({ files: {} })
        .mockResolvedValueOnce(mockPowerPointZipStructure);

      const results = await FileProcessorFactory.processMultipleFiles(files);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('success'); // Excel
      expect(results[1].status).toBe('success'); // PowerPoint
      expect(results[2].status).toBe('failed');  // Invalid file
    });
  });

  describe('Performance and scalability', () => {
    test('should handle large Excel files efficiently', async () => {
      const file = createMockExcelFile('large.xlsx', 10 * 1024 * 1024); // 10MB
      
      // Create large dataset
      const largeData = [['ID', 'Name', 'Value']];
      for (let i = 1; i <= 5000; i++) {
        largeData.push([i.toString(), `Item ${i}`, Math.random() * 1000]);
      }

      mockXLSX.read.mockReturnValue({
        SheetNames: ['LargeData'],
        Sheets: { LargeData: {} }
      });
      mockXLSX.utils.sheet_to_json.mockReturnValue(largeData);
      mockJSZip.default.loadAsync.mockResolvedValue({ files: {} });

      const startTime = Date.now();
      const result = await FileProcessorFactory.processFile(file);
      const processingTime = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(result.content!.tables[0].rows).toHaveLength(5000);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle large PowerPoint files efficiently', async () => {
      const file = createMockPowerPointFile('large.pptx', 20 * 1024 * 1024); // 20MB
      
      // Create structure with many slides
      const files: any = {};
      for (let i = 1; i <= 100; i++) {
        files[`ppt/slides/slide${i}.xml`] = {
          dir: false,
          async: jest.fn().mockResolvedValue(`
            <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
              <p:cSld>
                <p:spTree>
                  <p:sp>
                    <p:txBody>
                      <a:p><a:r><a:t>Slide ${i} Title</a:t></a:r></a:p>
                      <a:p><a:r><a:t>Content for slide ${i}</a:t></a:r></a:p>
                    </p:txBody>
                  </p:sp>
                </p:spTree>
              </p:cSld>
            </p:sld>
          `)
        };
      }

      mockJSZip.default.loadAsync.mockResolvedValue({ files });

      const startTime = Date.now();
      const result = await FileProcessorFactory.processFile(file);
      const processingTime = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(result.content!.metadata.pageCount).toBe(100);
      expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });

  describe('Error handling and recovery', () => {
    test('should handle partial failures gracefully', async () => {
      const files = [
        createMockExcelFile('good.xlsx'),
        createMockExcelFile('corrupt.xlsx')
      ];

      // Mock first file success, second file failure
      mockXLSX.read
        .mockReturnValueOnce(sampleExcelData.basic)
        .mockImplementationOnce(() => {
          throw new Error('Corrupt file');
        });
      
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data']]);
      mockJSZip.default.loadAsync.mockResolvedValue({ files: {} });

      const results = await FileProcessorFactory.processMultipleFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
      expect(results[1].errors[0].message).toContain('Corrupt file');
    });

    test('should provide detailed error information', async () => {
      const file = createMockExcelFile('error-test.xlsx');
      
      mockXLSX.read.mockImplementation(() => {
        throw new Error('Specific parsing error: Invalid cell reference');
      });

      const result = await FileProcessorFactory.processFile(file);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROCESSING_ERROR');
      expect(result.errors[0].message).toContain('Specific parsing error');
      expect(result.errors[0].severity).toBe('high');
    });
  });
});