/**
 * Integration tests for enhanced cheat sheet generation functionality
 * Tests space-aware topic extraction, reference format matching, and priority-based selection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as extractTopicsPost } from '../extract-topics/route';
// generateCheatSheetPost removed as part of cleanup
import { POST as spaceOptimizationPost } from '../space-optimization/route';
import { POST as referenceFormatMatchingPost } from '../reference-format-matching/route';

// Mock the AI services
jest.mock('../../../backend/lib/ai', () => ({
  getTopicExtractionService: jest.fn(() => ({
    extractTopics: jest.fn().mockResolvedValue([
      {
        id: 'topic-1',
        title: 'JavaScript Basics',
        content: 'Variables, functions, and control structures',
        confidence: 0.9,
        sourceFiles: ['test.pdf'],
        subtopics: [
          {
            id: 'sub-1',
            title: 'Variables',
            content: 'let, const, var declarations',
            priority: 'high',
            estimatedSpace: 150,
            isSelected: true,
            parentTopicId: 'topic-1',
            confidence: 0.8
          }
        ],
        examples: [],
        originalWording: 'Variables, functions, and control structures',
        priority: 'high',
        estimatedSpace: 300,
        isSelected: true
      }
    ])
  })),
  getAIContentService: jest.fn(() => ({
    extractTopicsWithSpaceConstraints: jest.fn().mockResolvedValue([
      {
        id: 'topic-1',
        title: 'JavaScript Basics',
        content: 'Variables, functions, and control structures',
        confidence: 0.9,
        sourceFiles: ['test.pdf'],
        subtopics: [
          {
            id: 'sub-1',
            title: 'Variables',
            content: 'let, const, var declarations',
            priority: 'high',
            estimatedSpace: 150,
            isSelected: true,
            parentTopicId: 'topic-1',
            confidence: 0.8
          }
        ],
        examples: [],
        originalWording: 'Variables, functions, and control structures',
        priority: 'high',
        estimatedSpace: 300,
        isSelected: true
      }
    ]),
    optimizeSpaceUtilization: jest.fn().mockResolvedValue({
      recommendedTopics: ['topic-1'],
      recommendedSubtopics: [{ topicId: 'topic-1', subtopicIds: ['sub-1'] }],
      utilizationScore: 0.85,
      suggestions: [],
      estimatedFinalUtilization: 0.85
    }),
    validateContentFidelity: jest.fn().mockResolvedValue({
      score: 0.9,
      issues: []
    })
  })),
  getSpaceCalculationService: jest.fn(() => ({
    calculateAvailableSpace: jest.fn().mockReturnValue(2000),
    calculateSpaceUtilization: jest.fn().mockReturnValue({
      totalAvailableSpace: 2000,
      usedSpace: 1700,
      remainingSpace: 300,
      utilizationPercentage: 0.85,
      suggestions: []
    }),
    optimizeSpaceUtilization: jest.fn().mockReturnValue({
      recommendedTopics: ['topic-1'],
      recommendedSubtopics: [{ topicId: 'topic-1', subtopicIds: ['sub-1'] }],
      utilizationScore: 0.85,
      suggestions: [],
      estimatedFinalUtilization: 0.85
    })
  })),
  getImageRecreationService: jest.fn(() => ({
    recreateImages: jest.fn().mockResolvedValue([])
  }))
}));

// Mock file processing
jest.mock('../../../backend/lib/file-processing', () => ({
  FileProcessing: {
    validate: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      fileType: 'application/pdf'
    }),
    processMultipleFilesEnhanced: jest.fn().mockResolvedValue([
      {
        fileName: 'test.pdf',
        success: true,
        content: {
          text: 'Sample content about JavaScript basics',
          images: [],
          tables: [],
          metadata: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            lastModified: new Date(),
            wordCount: 100
          },
          structure: {
            headings: [],
            sections: [],
            hierarchy: 0
          }
        },
        processingTime: 1000
      }
    ]),
    getStats: jest.fn().mockReturnValue({
      cacheHits: 0,
      memoryUsage: 1024 * 1024
    }),
    getUserFriendlyError: jest.fn().mockReturnValue('Test error message')
  }
}));

// Mock PDF generation
jest.mock('../../../backend/lib/pdf-generation', () => ({
  pdfGenerator: {
    generateHTMLOnly: jest.fn().mockResolvedValue({
      html: '<html><body>Test cheat sheet</body></html>',
      success: true,
      warnings: [],
      pageCount: 1,
      contentFit: { overflow: false, utilizationPercentage: 0.85 }
    }),
    generatePDF: jest.fn().mockResolvedValue({
      html: '<html><body>Test cheat sheet</body></html>',
      pdf: Buffer.from('fake pdf content'),
      success: true,
      warnings: [],
      pageCount: 1,
      contentFit: { overflow: false, utilizationPercentage: 0.85 }
    }),
    cleanup: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock template services
jest.mock('../../../backend/lib/template/format-matcher', () => ({
  ReferenceFormatMatcher: jest.fn().mockImplementation(() => ({
    matchFormat: jest.fn().mockResolvedValue({
      matchingScore: 0.85,
      adaptedContent: {
        topics: [],
        adjustedForDensity: true,
        topicSelectionChanges: []
      },
      contentDensityMatch: {
        referenceWordsPerPage: 500,
        userWordsPerPage: 450,
        densityRatio: 0.9,
        adjustmentsMade: [],
        finalDensity: 475
      },
      layoutAdaptation: {
        structuralFidelity: 0.9,
        preservedElements: ['headers', 'bullets'],
        modifiedElements: []
      },
      generatedCSS: {
        css: '.test { color: blue; }',
        matchFidelity: 0.85,
        classes: ['test'],
        variables: {},
        mediaQueries: []
      },
      warnings: [],
      matchedTemplate: {
        id: 'template-1',
        name: 'Test Template',
        analysis: {
          metadata: {
            complexity: 'medium',
            domain: 'general',
            quality: { score: 0.9 }
          }
        }
      }
    })
  }))
}));

jest.mock('../../../backend/lib/template/content-density-analyzer', () => ({
  ContentDensityAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeReferenceDensity: jest.fn().mockReturnValue({
      wordsPerPage: 500,
      topicsPerPage: 5,
      averageTopicLength: 100,
      contentDistribution: 'even',
      visualDensity: 0.8
    }),
    analyzeUserContentDensity: jest.fn().mockReturnValue({
      wordsPerPage: 450,
      topicsPerPage: 4,
      averageTopicLength: 112,
      contentDistribution: 'even',
      visualDensity: 0.75
    })
  }))
}));

describe('Enhanced Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Space-Aware Topic Extraction', () => {
    it('should extract topics with space constraints', async () => {
      const formData = new FormData();
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('files', testFile);
      
      const spaceConstraints = {
        pageSize: 'a4',
        fontSize: 'medium',
        columns: 2,
        availablePages: 2,
        targetUtilization: 0.85
      };
      formData.append('spaceConstraints', JSON.stringify(spaceConstraints));

      const request = new NextRequest('http://localhost/api/extract-topics', {
        method: 'POST',
        body: formData
      });

      const response = await extractTopicsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topics).toBeDefined();
      expect(data.topics.length).toBeGreaterThan(0);
      expect(data.spaceOptimization).toBeDefined();
      expect(data.spaceOptimization.availableSpace).toBe(2000);
      expect(data.spaceOptimization.utilizationInfo.utilizationPercentage).toBe(0.85);
    });

    it('should handle extraction without space constraints', async () => {
      const formData = new FormData();
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('files', testFile);

      const request = new NextRequest('http://localhost/api/extract-topics', {
        method: 'POST',
        body: formData
      });

      const response = await extractTopicsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topics).toBeDefined();
      expect(data.spaceOptimization).toBeUndefined();
    });
  });

  // Reference Format Matching tests removed as part of cheat sheet cleanup

  describe('Space Optimization API', () => {
    it('should calculate available space', async () => {
      const requestBody = {
        action: 'calculate_available_space',
        constraints: {
          pageSize: 'a4',
          fontSize: 'medium',
          columns: 2,
          availablePages: 2,
          targetUtilization: 0.85
        }
      };

      const request = new NextRequest('http://localhost/api/space-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await spaceOptimizationPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableSpace).toBe(2000);
    });

    it('should optimize space utilization', async () => {
      const requestBody = {
        action: 'optimize_space_utilization',
        topics: [
          {
            id: 'topic-1',
            title: 'JavaScript Basics',
            content: 'Variables, functions, and control structures',
            confidence: 0.9,
            priority: 'high',
            estimatedSpace: 300,
            subtopics: [],
            examples: [],
            sourceFiles: ['test.pdf']
          }
        ],
        constraints: {
          pageSize: 'a4',
          fontSize: 'medium',
          columns: 2,
          availablePages: 2,
          targetUtilization: 0.85
        }
      };

      const request = new NextRequest('http://localhost/api/space-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await spaceOptimizationPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendedTopics).toContain('topic-1');
      expect(data.data.utilizationScore).toBe(0.85);
    });
  });

  describe('Reference Format Matching API', () => {
    it('should match reference format', async () => {
      const formData = new FormData();
      
      const referenceFile = new File(['reference content'], 'reference.pdf', { 
        type: 'application/pdf' 
      });
      formData.append('referenceFile', referenceFile);
      
      const userContent = [
        {
          text: 'Sample content',
          images: [],
          tables: [],
          metadata: { name: 'test.pdf' },
          structure: { headings: [], sections: [], hierarchy: 0 }
        }
      ];
      formData.append('userContent', JSON.stringify(userContent));
      
      const userTopics = [
        {
          id: 'topic-1',
          title: 'JavaScript Basics',
          content: 'Variables, functions, and control structures',
          confidence: 0.9,
          priority: 'high',
          estimatedSpace: 300,
          subtopics: [],
          examples: [],
          sourceFiles: ['test.pdf']
        }
      ];
      formData.append('userTopics', JSON.stringify(userTopics));

      const request = new NextRequest('http://localhost/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await referenceFormatMatchingPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.matchingResult.matchingScore).toBe(0.85);
      expect(data.densityAnalysis).toBeDefined();
      expect(data.template).toBeDefined();
    });

    it('should handle invalid file types', async () => {
      const formData = new FormData();
      
      const invalidFile = new File(['content'], 'test.txt', { 
        type: 'text/plain' 
      });
      formData.append('referenceFile', invalidFile);
      
      formData.append('userContent', JSON.stringify([]));
      formData.append('userTopics', JSON.stringify([]));

      const request = new NextRequest('http://localhost/api/reference-format-matching', {
        method: 'POST',
        body: formData
      });

      const response = await referenceFormatMatchingPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported reference file type');
    });
  });

  // End-to-End Enhanced Workflow tests removed as part of cheat sheet cleanup
});