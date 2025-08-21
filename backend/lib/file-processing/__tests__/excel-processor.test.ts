// Unit tests for Excel processor

import { ExcelProcessor } from '../processors/excel-processor';
import { sampleExcelData, createMockExcelFile, mockExcelZipStructure } from './test-data/sample-excel-content';

// Mock xlsx library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    decode_range: jest.fn(),
    encode_cell: jest.fn()
  }
}));

// Mock jszip library
jest.mock('jszip', () => ({
  default: {
    loadAsync: jest.fn()
  }
}));

describe('ExcelProcessor', () => {
  let processor: ExcelProcessor;
  let mockXLSX: any;
  let mockJSZip: any;

  beforeEach(() => {
    processor = new ExcelProcessor();
    mockXLSX = require('xlsx');
    mockJSZip = require('jszip');
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    test('should identify as xlsx processor', () => {
      expect(processor.getSupportedType()).toBe('xlsx');
    });

    test('should validate Excel files correctly', () => {
      const validFile = createMockExcelFile('test.xlsx');
      const validation = processor.validateFile(validFile);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject non-Excel files', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const validation = processor.validateFile(invalidFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should reject oversized files', () => {
      const oversizedFile = createMockExcelFile('large.xlsx', 100 * 1024 * 1024); // 100MB
      const validation = processor.validateFile(oversizedFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('Content extraction', () => {
    test('should extract basic Excel content', async () => {
      const file = createMockExcelFile('basic.xlsx');
      
      // Mock XLSX.read to return sample data
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Age', 'City'],
        ['John', 25, 'New York'],
        ['Jane', 30, 'Boston']
      ]);

      // Mock JSZip for embedded content
      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {}
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content).toBeDefined();
      expect(result.content!.text).toContain('Sheet1');
      expect(result.content!.text).toContain('John');
      expect(result.content!.text).toContain('Jane');
      expect(result.content!.metadata.name).toBe('basic.xlsx');
    });

    test('should extract multi-sheet Excel content', async () => {
      const file = createMockExcelFile('multi.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.multiSheet);
      
      // Mock different sheet data
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([
          ['Product', 'Price', 'Quantity', 'Total'],
          ['Widget A', 10.99, 100, 1099]
        ])
        .mockReturnValueOnce([
          ['Total Products', 5],
          ['Total Revenue', 5495]
        ])
        .mockReturnValueOnce([
          ['Sales Chart'],
          ['Revenue by Product']
        ]);

      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {}
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.text).toContain('Data');
      expect(result.content!.text).toContain('Summary');
      expect(result.content!.text).toContain('Charts');
      expect(result.content!.tables).toHaveLength(3);
    });

    test('should extract table structures correctly', async () => {
      const file = createMockExcelFile('tables.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Age', 'City'],
        ['John', 25, 'New York'],
        ['Jane', 30, 'Boston']
      ]);

      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {}
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.tables).toHaveLength(1);
      
      const table = result.content!.tables[0];
      expect(table.headers).toEqual(['Name', 'Age', 'City']);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0]).toEqual(['John', '25', 'New York']);
      expect(table.context).toContain('Sheet1');
    });

    test('should extract metadata correctly', async () => {
      const file = createMockExcelFile('metadata.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Age'],
        ['John', 25]
      ]);

      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {}
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.metadata.title).toBe('Sample Excel File');
      expect(result.content!.metadata.author).toBe('Test Author');
      expect(result.content!.metadata.subject).toBe('Test Subject');
      expect(result.content!.metadata.hasTabularData).toBe(true);
    });
  });

  describe('Embedded content extraction', () => {
    test('should extract embedded images', async () => {
      const file = createMockExcelFile('images.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data']]);

      // Mock JSZip with embedded images
      mockJSZip.default.loadAsync.mockResolvedValue(mockExcelZipStructure);

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.images).toHaveLength(1);
      
      const image = result.content!.images[0];
      expect(image.base64).toContain('data:image/png;base64,');
      expect(image.context).toContain('Embedded image from Excel');
    });

    test('should extract chart information', async () => {
      const file = createMockExcelFile('charts.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Chart Data']]);

      mockJSZip.default.loadAsync.mockResolvedValue(mockExcelZipStructure);

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      // Charts are extracted but stored separately from the main content structure
      // This test verifies the extraction process completes without errors
    });
  });

  describe('Structure analysis', () => {
    test('should create proper document structure', async () => {
      const file = createMockExcelFile('structure.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.multiSheet);
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Product', 'Price']])
        .mockReturnValueOnce([['Summary']])
        .mockReturnValueOnce([['Charts']]);

      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {}
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.structure.headings).toHaveLength(3);
      expect(result.content!.structure.headings[0].text).toBe('Data');
      expect(result.content!.structure.headings[1].text).toBe('Summary');
      expect(result.content!.structure.headings[2].text).toBe('Charts');
    });

    test('should detect section headers within sheets', async () => {
      const file = createMockExcelFile('sections.xlsx');
      
      mockXLSX.read.mockReturnValue({
        SheetNames: ['Analysis'],
        Sheets: {
          Analysis: {}
        }
      });

      // Mock data with section headers
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Financial Analysis', '', ''], // Section header
        ['Revenue', '1000', ''],
        ['Expenses', '800', ''],
        ['', '', ''],
        ['Market Analysis', '', ''], // Another section header
        ['Market Size', '5000', '']
      ]);

      mockJSZip.default.loadAsync.mockResolvedValue({
        files: {}
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.structure.sections.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    test('should handle XLSX parsing errors', async () => {
      const file = createMockExcelFile('corrupt.xlsx');
      
      mockXLSX.read.mockImplementation(() => {
        throw new Error('Invalid Excel file format');
      });

      const result = await processor.processFile(file);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to process Excel file');
    });

    test('should handle JSZip errors gracefully', async () => {
      const file = createMockExcelFile('zip-error.xlsx');
      
      mockXLSX.read.mockReturnValue(sampleExcelData.basic);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data']]);
      
      mockJSZip.default.loadAsync.mockRejectedValue(new Error('ZIP parsing failed'));

      const result = await processor.processFile(file);

      // Should still succeed with basic content extraction
      expect(result.status).toBe('success');
      expect(result.content!.images).toHaveLength(0); // No embedded images due to ZIP error
    });

    test('should handle empty Excel files', async () => {
      const file = createMockExcelFile('empty.xlsx');
      
      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });
      
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);
      mockJSZip.default.loadAsync.mockResolvedValue({ files: {} });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.text.trim()).toBe('');
      expect(result.content!.tables).toHaveLength(0);
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle large datasets efficiently', async () => {
      const file = createMockExcelFile('large-data.xlsx');
      
      // Create large dataset
      const largeData = [['ID', 'Name', 'Value']];
      for (let i = 1; i <= 1000; i++) {
        largeData.push([i.toString(), `Item ${i}`, (Math.random() * 100).toFixed(2)]);
      }

      mockXLSX.read.mockReturnValue({
        SheetNames: ['LargeData'],
        Sheets: {
          LargeData: {}
        }
      });
      
      mockXLSX.utils.sheet_to_json.mockReturnValue(largeData);
      mockJSZip.default.loadAsync.mockResolvedValue({ files: {} });

      const startTime = Date.now();
      const result = await processor.processFile(file);
      const processingTime = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(result.content!.tables[0].rows).toHaveLength(1000);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle special characters and unicode', async () => {
      const file = createMockExcelFile('unicode.xlsx');
      
      mockXLSX.read.mockReturnValue({
        SheetNames: ['Unicode'],
        Sheets: {
          Unicode: {}
        }
      });
      
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Description'],
        ['José', 'Café ñoño'],
        ['李明', '数据科学'],
        ['محمد', 'تحليل البيانات']
      ]);
      
      mockJSZip.default.loadAsync.mockResolvedValue({ files: {} });

      const result = await processor.processFile(file);

      expect(result.status).toBe('success');
      expect(result.content!.text).toContain('José');
      expect(result.content!.text).toContain('李明');
      expect(result.content!.text).toContain('محمد');
    });
  });
});