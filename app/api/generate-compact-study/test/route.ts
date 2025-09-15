import { NextResponse } from "next/server"

// Simple test endpoint to verify the API is working
export async function GET() {
  try {
    // Test basic functionality
    const testData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      processingMode: process.env.PROCESSING_MODE || 'default'
    };

    return NextResponse.json({
      status: 'healthy',
      service: 'compact-study-generator-test',
      data: testData
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Test endpoint with minimal processing
export async function POST() {
  try {
    // Create a minimal test document
    const testDocument = {
      title: 'Test Study Guide',
      tableOfContents: [
        { id: 'part1', title: 'Test Part', level: 1, pageNumber: 1 }
      ],
      parts: [{
        partNumber: 1,
        title: 'Test Part',
        sections: [{
          sectionNumber: '1.1',
          title: 'Test Section',
          content: 'This is a test section with a formula: P(A) = 0.5',
          formulas: [{
            id: 'test_formula',
            latex: 'P(A) = 0.5',
            context: 'Test formula',
            type: 'inline' as const,
            sourceLocation: { page: 1, line: 1 },
            isKeyFormula: true
          }],
          examples: [{
            id: 'test_example',
            title: 'Test Example',
            problem: 'Calculate the probability of a coin flip.',
            solution: [{
              stepNumber: 1,
              description: 'For a fair coin',
              formula: 'P(H) = 1/2',
              explanation: 'Equal probability for heads and tails'
            }],
            sourceLocation: { page: 1, line: 5 },
            subtopic: 'Basic Probability'
          }],
          subsections: []
        }]
      }],
      crossReferences: [],
      appendices: []
    };

    // Generate simple HTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${testDocument.title}</title>
  <style>
    body { font-family: Times, serif; font-size: 10pt; line-height: 1.15; column-count: 2; }
    h1, h2, h3 { margin-top: 0.5em; margin-bottom: 0.25em; }
    .formula { text-align: center; margin: 0.5em 0; }
  </style>
</head>
<body>
  <h1>${testDocument.title}</h1>
  <h2>${testDocument.parts[0].title}</h2>
  <h3>${testDocument.parts[0].sections[0].sectionNumber} ${testDocument.parts[0].sections[0].title}</h3>
  <p>${testDocument.parts[0].sections[0].content}</p>
  <div class="formula">${testDocument.parts[0].sections[0].formulas[0].latex}</div>
</body>
</html>`;

    return NextResponse.json({
      success: true,
      message: 'Test document generated successfully',
      html,
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'html',
        sourceFiles: ['test'],
        stats: {
          totalSections: 1,
          totalFormulas: 1,
          totalExamples: 1,
          estimatedPrintPages: 1
        },
        preservationScore: 1.0
      },
      processingTime: 1
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 });
  }
}