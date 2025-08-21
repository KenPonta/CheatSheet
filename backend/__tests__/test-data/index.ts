/**
 * Test data for comprehensive testing suite
 * Contains sample files and expected outputs for all supported formats
 */

export interface TestFile {
  name: string;
  content: string | Buffer;
  type: string;
  expectedText?: string;
  expectedTopics?: string[];
  expectedImages?: number;
}

export interface TestDataSet {
  pdf: TestFile[];
  word: TestFile[];
  powerpoint: TestFile[];
  excel: TestFile[];
  images: TestFile[];
  text: TestFile[];
}

// Sample PDF content (base64 encoded minimal PDF)
const samplePdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Sample PDF Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`);

// Sample Word document content (minimal docx structure)
const sampleWordContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00Sample Word Document Content`;

// Sample PowerPoint content (minimal pptx structure)
const samplePowerpointContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00Sample PowerPoint Slide Content`;

// Sample Excel content (minimal xlsx structure)
const sampleExcelContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00Sample Excel Sheet Data`;

export const testDataSet: TestDataSet = {
  pdf: [
    {
      name: 'sample-study-guide.pdf',
      content: samplePdfContent,
      type: 'application/pdf',
      expectedText: 'Sample PDF Content',
      expectedTopics: ['Introduction', 'Key Concepts'],
      expectedImages: 0
    },
    {
      name: 'math-formulas.pdf',
      content: samplePdfContent,
      type: 'application/pdf',
      expectedText: 'Mathematical formulas and equations',
      expectedTopics: ['Algebra', 'Calculus', 'Geometry'],
      expectedImages: 2
    }
  ],
  word: [
    {
      name: 'lecture-notes.docx',
      content: sampleWordContent,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      expectedText: 'Sample Word Document Content',
      expectedTopics: ['Chapter 1', 'Chapter 2', 'Summary'],
      expectedImages: 1
    }
  ],
  powerpoint: [
    {
      name: 'presentation-slides.pptx',
      content: samplePowerpointContent,
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      expectedText: 'Sample PowerPoint Slide Content',
      expectedTopics: ['Slide 1', 'Slide 2', 'Conclusion'],
      expectedImages: 3
    }
  ],
  excel: [
    {
      name: 'data-tables.xlsx',
      content: sampleExcelContent,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      expectedText: 'Sample Excel Sheet Data',
      expectedTopics: ['Sheet1 Data', 'Sheet2 Analysis'],
      expectedImages: 0
    }
  ],
  images: [
    {
      name: 'diagram.png',
      content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      type: 'image/png',
      expectedText: 'Sample diagram text from OCR',
      expectedTopics: ['Diagram Analysis'],
      expectedImages: 1
    },
    {
      name: 'handwritten-notes.jpg',
      content: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A',
      type: 'image/jpeg',
      expectedText: 'Handwritten notes extracted via OCR',
      expectedTopics: ['Notes Section 1'],
      expectedImages: 1
    }
  ],
  text: [
    {
      name: 'study-notes.txt',
      content: 'This is a sample text file with study notes.\n\nTopic 1: Introduction\nKey concepts and definitions.\n\nTopic 2: Advanced Topics\nDetailed explanations and examples.',
      type: 'text/plain',
      expectedText: 'This is a sample text file with study notes.',
      expectedTopics: ['Topic 1: Introduction', 'Topic 2: Advanced Topics'],
      expectedImages: 0
    }
  ]
};

export const createMockFile = (testFile: TestFile): File => {
  const content = typeof testFile.content === 'string' 
    ? new TextEncoder().encode(testFile.content)
    : testFile.content;
  
  return new File([content], testFile.name, { type: testFile.type });
};

export const createMockFiles = (category: keyof TestDataSet): File[] => {
  return testDataSet[category].map(createMockFile);
};

export const getAllMockFiles = (): File[] => {
  return Object.keys(testDataSet).flatMap(category => 
    createMockFiles(category as keyof TestDataSet)
  );
};