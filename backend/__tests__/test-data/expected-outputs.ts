/**
 * Expected outputs for testing validation
 */

export interface ExpectedTopic {
  id: string;
  title: string;
  content: string;
  subtopics: string[];
  confidence: number;
}

export interface ExpectedLayout {
  pageCount: number;
  contentFit: boolean;
  warnings: string[];
}

export interface ExpectedProcessingResult {
  fileId: string;
  extractedText: string;
  topicCount: number;
  imageCount: number;
  processingTime: number;
}

export const expectedTopics: ExpectedTopic[] = [
  {
    id: 'topic-1',
    title: 'Introduction',
    content: 'Basic concepts and overview',
    subtopics: ['Definition', 'Overview'],
    confidence: 0.9
  },
  {
    id: 'topic-2',
    title: 'Key Concepts',
    content: 'Important principles and theories',
    subtopics: ['Principle 1', 'Principle 2'],
    confidence: 0.85
  },
  {
    id: 'topic-3',
    title: 'Advanced Topics',
    content: 'Complex concepts and applications',
    subtopics: ['Application 1', 'Application 2'],
    confidence: 0.8
  }
];

export const expectedLayouts: ExpectedLayout[] = [
  {
    pageCount: 1,
    contentFit: true,
    warnings: []
  },
  {
    pageCount: 2,
    contentFit: true,
    warnings: []
  },
  {
    pageCount: 1,
    contentFit: false,
    warnings: ['Content overflow detected', 'Consider increasing page count']
  }
];

export const expectedProcessingResults: ExpectedProcessingResult[] = [
  {
    fileId: 'pdf-1',
    extractedText: 'Sample PDF Content',
    topicCount: 2,
    imageCount: 0,
    processingTime: 1000
  },
  {
    fileId: 'word-1',
    extractedText: 'Sample Word Document Content',
    topicCount: 3,
    imageCount: 1,
    processingTime: 800
  },
  {
    fileId: 'image-1',
    extractedText: 'Sample diagram text from OCR',
    topicCount: 1,
    imageCount: 1,
    processingTime: 2000
  }
];

export const performanceBenchmarks = {
  fileProcessing: {
    pdf: { maxTime: 5000, avgTime: 2000 },
    word: { maxTime: 3000, avgTime: 1500 },
    powerpoint: { maxTime: 4000, avgTime: 2500 },
    excel: { maxTime: 2000, avgTime: 1000 },
    image: { maxTime: 8000, avgTime: 4000 },
    text: { maxTime: 500, avgTime: 200 }
  },
  aiIntegration: {
    topicExtraction: { maxTime: 10000, avgTime: 5000 },
    contentOrganization: { maxTime: 8000, avgTime: 4000 },
    imageRecreation: { maxTime: 15000, avgTime: 8000 }
  },
  pdfGeneration: {
    singlePage: { maxTime: 3000, avgTime: 1500 },
    multiPage: { maxTime: 8000, avgTime: 4000 }
  }
};