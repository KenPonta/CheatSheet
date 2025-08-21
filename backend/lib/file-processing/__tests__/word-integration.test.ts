// Integration tests for Word processor with realistic content

import { WordProcessor } from '../processors/word-processor';
import { ProcessingResult } from '../types';
import { sampleWordHtml, sampleWordText, expectedWordStructure } from './test-data/sample-word-content';

// Mock mammoth library
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
  extractRawText: jest.fn()
}));

describe('WordProcessor Integration Tests', () => {
  let processor: WordProcessor;
  let mockFile: File;

  beforeEach(() => {
    processor = new WordProcessor();
    
    // Create a mock Word file with realistic content
    const mockArrayBuffer = new ArrayBuffer(2048);
    mockFile = new File([mockArrayBuffer], 'cs-study-guide.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now()
    });

    // Setup mammoth mocks with realistic content
    const mammoth = require('mammoth');
    
    mammoth.extractRawText.mockResolvedValue({
      value: sampleWordText,
      messages: []
    });

    mammoth.convertToHtml.mockResolvedValue({
      value: sampleWordHtml,
      messages: []
    });

    jest.clearAllMocks();
  });

  describe('Realistic Document Processing', () => {
    it('should extract complete document structure from study guide', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      expect(result.content).toBeDefined();
      
      const content = result.content!;
      
      // Verify text extraction
      expect(content.text).toContain('Computer Science Study Guide');
      expect(content.text).toContain('Data structures are fundamental building blocks');
      expect(content.text).toContain('Binary search works on sorted arrays');
      
      // Verify heading extraction
      expect(content.structure.headings).toHaveLength(expectedWordStructure.headings.length);
      
      expectedWordStructure.headings.forEach((expectedHeading, index) => {
        expect(content.structure.headings[index]).toEqual(expectedHeading);
      });
      
      // Verify hierarchy calculation
      expect(content.structure.hierarchy).toBe(4); // Deepest level is h4
    });

    it('should extract all tables with correct structure', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      const tables = result.content!.tables;
      
      expect(tables).toHaveLength(2);
      
      // First table - complexity analysis
      const complexityTable = tables[0];
      expect(complexityTable.headers).toEqual(['Operation', 'Time Complexity', 'Space Complexity']);
      expect(complexityTable.rows).toHaveLength(3);
      expect(complexityTable.rows[0]).toEqual(['Search', 'O(n)', 'O(1)']);
      expect(complexityTable.rows[1]).toEqual(['Insertion', 'O(1)', 'O(1)']);
      expect(complexityTable.rows[2]).toEqual(['Deletion', 'O(1)', 'O(1)']);
      
      // Second table - example problems
      const problemsTable = tables[1];
      expect(problemsTable.headers).toEqual(['Problem', 'Difficulty', 'Topic']);
      expect(problemsTable.rows).toHaveLength(3);
      expect(problemsTable.rows[0]).toEqual(['Two Sum', 'Easy', 'Arrays, Hash Tables']);
      expect(problemsTable.rows[1]).toEqual(['Reverse Linked List', 'Easy', 'Linked Lists']);
      expect(problemsTable.rows[2]).toEqual(['Binary Tree Traversal', 'Medium', 'Trees, Recursion']);
    });

    it('should create logical sections from headings', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      const sections = result.content!.structure.sections;
      
      expect(sections.length).toBeGreaterThan(0);
      
      // Find main sections
      const dataStructuresSection = sections.find(s => s.title === 'Data Structures');
      const algorithmsSection = sections.find(s => s.title === 'Algorithms');
      
      expect(dataStructuresSection).toBeDefined();
      expect(dataStructuresSection!.content).toContain('fundamental building blocks');
      
      expect(algorithmsSection).toBeDefined();
      expect(algorithmsSection!.content).toContain('step-by-step procedures');
    });

    it('should generate accurate metadata for study guide', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      const metadata = result.content!.metadata;
      
      expect(metadata.name).toBe('cs-study-guide.docx');
      expect(metadata.wordCount).toBeGreaterThan(100); // Should have substantial word count
      expect(metadata.hasStructuredContent).toBe(true);
      expect(metadata.hasBulletPoints).toBe(true);
      expect(metadata.hasTabularData).toBe(true);
      expect(metadata.hasNumberedSections).toBe(true);
      expect(metadata.estimatedReadingTime).toBeGreaterThan(0);
    });

    it('should handle nested heading hierarchy correctly', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      const headings = result.content!.structure.headings;
      
      // Verify heading levels are preserved
      const h1Headings = headings.filter(h => h.level === 1);
      const h2Headings = headings.filter(h => h.level === 2);
      const h3Headings = headings.filter(h => h.level === 3);
      const h4Headings = headings.filter(h => h.level === 4);
      
      expect(h1Headings).toHaveLength(1);
      expect(h2Headings).toHaveLength(3);
      expect(h3Headings).toHaveLength(4);
      expect(h4Headings).toHaveLength(1);
      
      // Verify specific headings
      expect(h1Headings[0].text).toBe('Computer Science Study Guide');
      expect(h4Headings[0].text).toBe('Binary Search');
    });
  });

  describe('Content Preservation', () => {
    it('should preserve technical terminology and formatting', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      const text = result.content!.text;
      
      // Verify technical terms are preserved
      expect(text).toContain('O(n²)');
      expect(text).toContain('O(log n)');
      expect(text).toContain('contiguous memory locations');
      expect(text).toContain('Hash Tables');
    });

    it('should maintain list structure information', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      const metadata = result.content!.metadata;
      
      expect(metadata.hasBulletPoints).toBe(true);
      expect(metadata.hasNumberedSections).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should complete processing within reasonable time', async () => {
      // Add a small delay to mammoth mock to simulate realistic processing time
      const mammoth = require('mammoth');
      mammoth.extractRawText.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
        return { value: sampleWordText, messages: [] };
      });
      
      const startTime = Date.now();
      const result: ProcessingResult = await processor.processFile(mockFile);
      const endTime = Date.now();
      
      expect(result.status).toBe('success');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should provide processing time metrics', async () => {
      const result: ProcessingResult = await processor.processFile(mockFile);
      
      expect(result.status).toBe('success');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTime).toBe('number');
    });
  });
});