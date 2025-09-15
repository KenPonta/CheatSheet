/**
 * API endpoint for analyzing reference templates with enhanced computer vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemplateAnalyzer } from '../../../backend/lib/template/analyzer';
import { TemplateProcessingError } from '../../../backend/lib/template/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Unsupported file type. Please upload a PDF or image file.',
          supportedTypes: allowedTypes
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large. Maximum size is 10MB.',
          maxSize: maxSize
        },
        { status: 400 }
      );
    }

    // Initialize analyzer
    const analyzer = new TemplateAnalyzer();

    // Analyze the reference template
    const template = await analyzer.analyzeTemplate(file);

    // Generate CSS template
    const cssTemplate = await analyzer.generateCSSTemplate(template);

    // Return comprehensive analysis
    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        createdAt: template.createdAt,
        analysis: template.analysis
      },
      cssTemplate: {
        css: cssTemplate.css,
        variables: cssTemplate.variables,
        classes: cssTemplate.classes,
        mediaQueries: cssTemplate.mediaQueries.map(mq => ({
          condition: mq.condition,
          stylesLength: mq.styles.length
        })),
        printStylesLength: cssTemplate.printStyles.length
      },
      metadata: {
        processingTime: Date.now() - Date.now(), // Would be calculated properly
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type
      }
    });

  } catch (error) {
    console.error('Reference template analysis failed:', error);

    if (error instanceof TemplateProcessingError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          details: error.details
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze reference template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'analyze-reference-template',
    description: 'Analyzes reference templates using computer vision and generates CSS templates',
    methods: ['POST'],
    parameters: {
      file: 'File (PDF or image) - The reference template to analyze'
    },
    supportedFormats: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp'
    ],
    maxFileSize: '10MB',
    features: [
      'Computer vision-based visual analysis',
      'Color scheme extraction',
      'Typography pattern detection',
      'Layout structure analysis',
      'Content density calculation',
      'CSS template generation',
      'Responsive design rules',
      'Print optimization'
    ]
  });
}