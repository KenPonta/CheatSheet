import { NextRequest, NextResponse } from 'next/server';
import { getContentUtilizationService } from '@/backend/lib/ai';
import {
  SpaceConstraints,
  OrganizedTopic,
  TopicSelection,
  ReferenceFormatAnalysis
} from '@/backend/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      selectedTopics,
      allTopics,
      constraints,
      referenceAnalysis,
      action
    }: {
      selectedTopics: TopicSelection[];
      allTopics: OrganizedTopic[];
      constraints: SpaceConstraints;
      referenceAnalysis?: ReferenceFormatAnalysis;
      action: 'analyze' | 'suggest_expansion' | 'suggest_reduction' | 'optimize_density';
    } = body;

    // Validate required fields
    if (!selectedTopics || !allTopics || !constraints || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: selectedTopics, allTopics, constraints, action' },
        { status: 400 }
      );
    }

    const contentUtilizationService = getContentUtilizationService();

    switch (action) {
      case 'analyze': {
        const analysis = contentUtilizationService.analyzeContentUtilization(
          selectedTopics,
          allTopics,
          constraints,
          referenceAnalysis
        );

        return NextResponse.json({
          success: true,
          analysis
        });
      }

      case 'suggest_expansion': {
        const availableSpace = contentUtilizationService['spaceCalculationService'].calculateAvailableSpace(constraints);
        const expansionSuggestions = contentUtilizationService.detectEmptySpaceAndSuggestContent(
          selectedTopics,
          allTopics,
          availableSpace,
          referenceAnalysis
        );

        return NextResponse.json({
          success: true,
          suggestions: expansionSuggestions
        });
      }

      case 'suggest_reduction': {
        const { overflowAmount } = body;
        if (typeof overflowAmount !== 'number') {
          return NextResponse.json(
            { error: 'overflowAmount is required for reduction suggestions' },
            { status: 400 }
          );
        }

        const reductionStrategies = contentUtilizationService.createContentReductionStrategy(
          selectedTopics,
          allTopics,
          overflowAmount,
          referenceAnalysis
        );

        return NextResponse.json({
          success: true,
          strategies: reductionStrategies
        });
      }

      case 'optimize_density': {
        const densityOptimization = contentUtilizationService.optimizeContentDensity(
          selectedTopics,
          allTopics,
          constraints,
          referenceAnalysis
        );

        return NextResponse.json({
          success: true,
          optimization: densityOptimization
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: analyze, suggest_expansion, suggest_reduction, optimize_density' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Content utilization API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Content Utilization API',
    endpoints: {
      POST: {
        description: 'Analyze content utilization and get optimization suggestions',
        actions: [
          'analyze - Get comprehensive utilization analysis',
          'suggest_expansion - Get content expansion suggestions for empty space',
          'suggest_reduction - Get content reduction strategies for overflow',
          'optimize_density - Get density optimization recommendations'
        ],
        requiredFields: ['selectedTopics', 'allTopics', 'constraints', 'action'],
        optionalFields: ['referenceAnalysis', 'overflowAmount (required for suggest_reduction)']
      }
    }
  });
}