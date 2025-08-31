/**
 * API endpoint for reference format matching system
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReferenceFormatMatcher } from '../../../backend/lib/template/format-matcher';
import { ContentDensityAnalyzer } from '../../../backend/lib/template/content-density-analyzer';
import { TemplateProcessingError } from '../../../backend/lib/template/types';
import { ExtractedContent, OrganizedTopic } from '../../../backend/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get reference template file
    const referenceFile = formData.get('referenceFile') as File;
    if (!referenceFile) {
      return NextResponse.json(
        { error: 'Reference file is required' },
        { status: 400 }
      );
    }

    // Get user content and topics
    const userContentJson = formData.get('userContent') as string;
    const userTopicsJson = formData.get('userTopics') as string;
    
    if (!userContentJson || !userTopicsJson) {
      return NextResponse.json(
        { error: 'User content and topics are required' },
        { status: 400 }
      );
    }

    let userContent: ExtractedContent[];
    let userTopics: OrganizedTopic[];
    
    try {
      userContent = JSON.parse(userContentJson);
      userTopics = JSON.parse(userTopicsJson);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format for user content or topics' },
        { status: 400 }
      );
    }

    // Get options
    const optionsJson = formData.get('options') as string;
    let options = {};
    if (optionsJson) {
      try {
        options = JSON.parse(optionsJson);
      } catch (parseError) {
        // Use default options if parsing fails
        options = {};
      }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp'
    ];

    if (!allowedTypes.includes(referenceFile.type)) {
      return NextResponse.json(
        { 
          error: 'Unsupported reference file type. Please upload a PDF or image file.',
          supportedTypes: allowedTypes
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (referenceFile.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'Reference file too large. Maximum size is 10MB.',
          maxSize: maxSize
        },
        { status: 400 }
      );
    }

    // Initialize format matcher
    const formatMatcher = new ReferenceFormatMatcher();
    const densityAnalyzer = new ContentDensityAnalyzer();

    // Perform format matching
    const startTime = Date.now();
    const matchingResult = await formatMatcher.matchFormat(
      referenceFile,
      userContent,
      userTopics,
      options
    );
    const processingTime = Date.now() - startTime;

    // Analyze density details for additional insights
    const referenceDensity = densityAnalyzer.analyzeReferenceDensity(matchingResult.matchedTemplate);
    const userDensity = densityAnalyzer.analyzeUserContentDensity(
      userContent,
      userTopics,
      matchingResult.layoutAdaptation.adaptedLayout.maxPages
    );

    // Return comprehensive results
    return NextResponse.json({
      success: true,
      matchingResult: {
        matchingScore: matchingResult.matchingScore,
        adaptedContent: {
          topicCount: matchingResult.adaptedContent.topics.length,
          adjustedForDensity: matchingResult.adaptedContent.adjustedForDensity,
          topicSelectionChanges: matchingResult.adaptedContent.topicSelectionChanges.map(change => ({
            topicId: change.topicId,
            action: change.action,
            reason: change.reason,
            densityImpact: change.densityImpact
          }))
        },
        contentDensityMatch: {
          referenceWordsPerPage: matchingResult.contentDensityMatch.referenceWordsPerPage,
          userWordsPerPage: matchingResult.contentDensityMatch.userWordsPerPage,
          densityRatio: matchingResult.contentDensityMatch.densityRatio,
          adjustmentCount: matchingResult.contentDensityMatch.adjustmentsMade.length,
          finalDensity: matchingResult.contentDensityMatch.finalDensity
        },
        layoutAdaptation: {
          structuralFidelity: matchingResult.layoutAdaptation.structuralFidelity,
          preservedElements: matchingResult.layoutAdaptation.preservedElements,
          modificationCount: matchingResult.layoutAdaptation.modifiedElements.length,
          majorChanges: matchingResult.layoutAdaptation.modifiedElements.filter(mod => mod.impact === 'major').length
        },
        generatedCSS: {
          matchFidelity: matchingResult.generatedCSS.matchFidelity,
          classCount: matchingResult.generatedCSS.classes.length,
          variableCount: Object.keys(matchingResult.generatedCSS.variables).length,
          mediaQueryCount: matchingResult.generatedCSS.mediaQueries.length,
          cssLength: matchingResult.generatedCSS.css.length
        },
        warnings: matchingResult.warnings.map(warning => ({
          type: warning.type,
          severity: warning.severity,
          message: warning.message,
          affectedElementCount: warning.affectedElements.length,
          suggestion: warning.suggestion
        }))
      },
      densityAnalysis: {
        reference: {
          wordsPerPage: referenceDensity.wordsPerPage,
          topicsPerPage: referenceDensity.topicsPerPage,
          averageTopicLength: referenceDensity.averageTopicLength,
          contentDistribution: referenceDensity.contentDistribution,
          visualDensity: referenceDensity.visualDensity
        },
        user: {
          wordsPerPage: userDensity.wordsPerPage,
          topicsPerPage: userDensity.topicsPerPage,
          averageTopicLength: userDensity.averageTopicLength,
          contentDistribution: userDensity.contentDistribution,
          visualDensity: userDensity.visualDensity
        }
      },
      template: {
        id: matchingResult.matchedTemplate.id,
        name: matchingResult.matchedTemplate.name,
        complexity: matchingResult.matchedTemplate.analysis.metadata.complexity,
        domain: matchingResult.matchedTemplate.analysis.metadata.domain,
        quality: matchingResult.matchedTemplate.analysis.metadata.quality.score
      },
      metadata: {
        processingTime,
        referenceFileSize: referenceFile.size,
        referenceFileName: referenceFile.name,
        referenceFileType: referenceFile.type,
        userContentFiles: userContent.length,
        userTopicCount: userTopics.length
      }
    });

  } catch (error) {
    console.error('Reference format matching failed:', error);

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
        error: 'Failed to match reference format',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'reference-format-matching',
    description: 'Matches user content to reference template format with content density optimization',
    methods: ['POST'],
    parameters: {
      referenceFile: 'File (PDF or image) - The reference template to match',
      userContent: 'JSON string - Array of ExtractedContent objects',
      userTopics: 'JSON string - Array of OrganizedTopic objects',
      options: 'JSON string (optional) - FormatMatchingOptions configuration'
    },
    supportedFormats: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp'
    ],
    maxFileSize: '10MB',
    options: {
      preserveContentFidelity: 'boolean - Maintain original content accuracy (default: true)',
      allowLayoutModifications: 'boolean - Allow layout changes for better fit (default: true)',
      matchContentDensity: 'boolean - Adjust content to match reference density (default: true)',
      adaptTypography: 'boolean - Adapt typography to match reference (default: true)',
      maintainVisualHierarchy: 'boolean - Preserve visual hierarchy structure (default: true)'
    },
    features: [
      'Reference template analysis and format extraction',
      'Content density matching and optimization',
      'Layout adaptation with structural preservation',
      'CSS generation matching reference visual elements',
      'Topic selection adjustment for density matching',
      'Comprehensive matching score and warnings',
      'Detailed density analysis and comparison',
      'Feasibility assessment for format matching'
    ],
    responseStructure: {
      matchingResult: 'Complete format matching results with adaptations',
      densityAnalysis: 'Detailed comparison of reference vs user content density',
      template: 'Reference template metadata and analysis',
      metadata: 'Processing information and file details'
    }
  });
}