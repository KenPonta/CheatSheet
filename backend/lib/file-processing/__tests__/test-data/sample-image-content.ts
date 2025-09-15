// Sample image content for OCR testing

export const sampleImageOCRResults = {
  // Mathematical formula image
  mathFormula: {
    text: 'Quadratic Formula: x = (-b ± √(b² - 4ac)) / 2a\nWhere a ≠ 0',
    confidence: 92,
    words: [
      { text: 'Quadratic', confidence: 95, bbox: { x0: 10, y0: 20, x1: 80, y1: 40 } },
      { text: 'Formula:', confidence: 90, bbox: { x0: 85, y0: 20, x1: 140, y1: 40 } },
      { text: 'x', confidence: 88, bbox: { x0: 150, y0: 20, x1: 160, y1: 40 } },
      { text: '=', confidence: 95, bbox: { x0: 165, y0: 20, x1: 175, y1: 40 } }
    ]
  },

  // Example problem image
  exampleProblem: {
    text: 'Example 1: Calculate the area of a circle\nGiven: radius = 5 cm\nSolution: A = πr² = π(5)² = 25π cm²',
    confidence: 87,
    words: [
      { text: 'Example', confidence: 92, bbox: { x0: 10, y0: 20, x1: 70, y1: 40 } },
      { text: '1:', confidence: 85, bbox: { x0: 75, y0: 20, x1: 90, y1: 40 } },
      { text: 'Calculate', confidence: 88, bbox: { x0: 95, y0: 20, x1: 160, y1: 40 } }
    ]
  },

  // Chart/diagram image
  chartDiagram: {
    text: 'Sales Chart 2023\nQ1: $50K\nQ2: $75K\nQ3: $60K\nQ4: $80K\nTotal: $265K',
    confidence: 83,
    words: [
      { text: 'Sales', confidence: 90, bbox: { x0: 50, y0: 30, x1: 90, y1: 50 } },
      { text: 'Chart', confidence: 85, bbox: { x0: 95, y0: 30, x1: 135, y1: 50 } },
      { text: '2023', confidence: 92, bbox: { x0: 140, y0: 30, x1: 180, y1: 50 } }
    ]
  },

  // Mixed content image
  mixedContent: {
    text: 'Example: Linear Function\ny = mx + b\nWhere m is slope, b is y-intercept\nGraph shows positive correlation',
    confidence: 89,
    words: [
      { text: 'Example:', confidence: 91, bbox: { x0: 10, y0: 20, x1: 70, y1: 40 } },
      { text: 'Linear', confidence: 88, bbox: { x0: 75, y0: 20, x1: 115, y1: 40 } },
      { text: 'Function', confidence: 85, bbox: { x0: 120, y0: 20, x1: 180, y1: 40 } }
    ]
  },

  // Multilingual content
  multilingualText: {
    text: 'Hello World\nBonjour le monde\nHola mundo\nПривет мир\nΓεια σας κόσμος',
    confidence: 78,
    words: [
      { text: 'Hello', confidence: 95, bbox: { x0: 10, y0: 20, x1: 50, y1: 40 } },
      { text: 'World', confidence: 92, bbox: { x0: 55, y0: 20, x1: 95, y1: 40 } },
      { text: 'Bonjour', confidence: 85, bbox: { x0: 10, y0: 50, x1: 65, y1: 70 } }
    ]
  },

  // Low quality/noisy image
  noisyImage: {
    text: 'Th1s 1s n01sy t3xt w1th p00r qu4l1ty',
    confidence: 45,
    words: [
      { text: 'Th1s', confidence: 40, bbox: { x0: 10, y0: 20, x1: 40, y1: 40 } },
      { text: '1s', confidence: 35, bbox: { x0: 45, y0: 20, x1: 60, y1: 40 } },
      { text: 'n01sy', confidence: 30, bbox: { x0: 65, y0: 20, x1: 100, y1: 40 } }
    ]
  },

  // Empty/no text image
  noText: {
    text: '',
    confidence: 0,
    words: []
  },

  // Structured document image
  structuredDocument: {
    text: 'Chapter 1: Introduction\n\n1.1 Overview\nThis section provides an overview of the topic.\n\n1.2 Objectives\n• Learn basic concepts\n• Understand applications\n• Practice examples',
    confidence: 91,
    words: [
      { text: 'Chapter', confidence: 95, bbox: { x0: 10, y0: 20, x1: 65, y1: 40 } },
      { text: '1:', confidence: 90, bbox: { x0: 70, y0: 20, x1: 85, y1: 40 } },
      { text: 'Introduction', confidence: 88, bbox: { x0: 90, y0: 20, x1: 170, y1: 40 } }
    ]
  }
};

export const expectedImageAnalysis = {
  mathFormula: {
    hasText: true,
    hasDiagrams: false,
    hasCharts: false,
    hasFormulas: true,
    hasExamples: false,
    contentType: 'formula' as const,
    confidence: 0.8
  },

  exampleProblem: {
    hasText: true,
    hasDiagrams: false,
    hasCharts: false,
    hasFormulas: true,
    hasExamples: true,
    contentType: 'example' as const,
    confidence: 0.7
  },

  chartDiagram: {
    hasText: true,
    hasDiagrams: true,
    hasCharts: true,
    hasFormulas: false,
    hasExamples: false,
    contentType: 'chart' as const,
    confidence: 0.7
  },

  mixedContent: {
    hasText: true,
    hasDiagrams: false,
    hasCharts: false,
    hasFormulas: true,
    hasExamples: true,
    contentType: 'mixed' as const,
    confidence: 0.8
  },

  noText: {
    hasText: false,
    hasDiagrams: false,
    hasCharts: false,
    hasFormulas: false,
    hasExamples: false,
    contentType: 'unknown' as const,
    confidence: 0.5
  }
};

export const sampleImageFiles = {
  // Create mock file objects for testing
  createMockImageFile: (name: string, type: string, size: number = 1024) => {
    const buffer = Buffer.alloc(size, 'fake-image-data');
    return new File([buffer], name, { type });
  },

  // Common test files
  pngFile: () => sampleImageFiles.createMockImageFile('test.png', 'image/png'),
  jpegFile: () => sampleImageFiles.createMockImageFile('test.jpg', 'image/jpeg'),
  gifFile: () => sampleImageFiles.createMockImageFile('test.gif', 'image/gif'),
  bmpFile: () => sampleImageFiles.createMockImageFile('test.bmp', 'image/bmp'),
  webpFile: () => sampleImageFiles.createMockImageFile('test.webp', 'image/webp'),
  
  // Large file for testing size limits
  largeFile: () => sampleImageFiles.createMockImageFile('large.png', 'image/png', 25 * 1024 * 1024), // 25MB
  
  // Unsupported format
  unsupportedFile: () => sampleImageFiles.createMockImageFile('test.tiff', 'image/tiff')
};