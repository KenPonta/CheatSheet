import { NextRequest, NextResponse } from 'next/server';
import { getSpaceCalculationService } from '@/backend/lib/ai/space-calculation-service';
import {
  SpaceConstraints,
  OrganizedTopic,
  ReferenceFormatAnalysis,
  TopicSelection
} from '@/backend/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, topics, constraints, referenceAnalysis, currentSelection } = body;

    const spaceService = getSpaceCalculationService();

    switch (action) {
      case 'calculate_available_space':
        return handleCalculateAvailableSpace(spaceService, constraints);
      
      case 'optimize_space_utilization':
        return handleOptimizeSpaceUtilization(spaceService, topics, constraints, referenceAnalysis);
      
      case 'calculate_space_utilization':
        return handleCalculateSpaceUtilization(spaceService, currentSelection, constraints, topics);
      
      case 'generate_suggestions':
        return handleGenerateSuggestions(spaceService, currentSelection, constraints, topics);
      
      case 'calculate_optimal_topic_count':
        return handleCalculateOptimalTopicCount(spaceService, topics, constraints, referenceAnalysis);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Space optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCalculateAvailableSpace(
  spaceService: any,
  constraints: SpaceConstraints
) {
  try {
    const availableSpace = spaceService.calculateAvailableSpace(constraints);
    
    return NextResponse.json({
      success: true,
      data: {
        availableSpace,
        constraints
      }
    });
  } catch (error) {
    console.error('Error calculating available space:', error);
    return NextResponse.json(
      { error: 'Failed to calculate available space' },
      { status: 500 }
    );
  }
}

async function handleOptimizeSpaceUtilization(
  spaceService: any,
  topics: OrganizedTopic[],
  constraints: SpaceConstraints,
  referenceAnalysis?: ReferenceFormatAnalysis
) {
  try {
    const availableSpace = spaceService.calculateAvailableSpace(constraints);
    const optimization = spaceService.optimizeSpaceUtilization(
      topics,
      availableSpace,
      referenceAnalysis
    );
    
    return NextResponse.json({
      success: true,
      data: {
        ...optimization,
        availableSpace,
        constraints
      }
    });
  } catch (error) {
    console.error('Error optimizing space utilization:', error);
    return NextResponse.json(
      { error: 'Failed to optimize space utilization' },
      { status: 500 }
    );
  }
}

async function handleCalculateSpaceUtilization(
  spaceService: any,
  currentSelection: TopicSelection[],
  constraints: SpaceConstraints,
  allTopics: OrganizedTopic[]
) {
  try {
    const availableSpace = spaceService.calculateAvailableSpace(constraints);
    const utilization = spaceService.calculateSpaceUtilization(
      currentSelection,
      availableSpace,
      allTopics
    );
    
    return NextResponse.json({
      success: true,
      data: utilization
    });
  } catch (error) {
    console.error('Error calculating space utilization:', error);
    return NextResponse.json(
      { error: 'Failed to calculate space utilization' },
      { status: 500 }
    );
  }
}

async function handleGenerateSuggestions(
  spaceService: any,
  currentSelection: TopicSelection[],
  constraints: SpaceConstraints,
  allTopics: OrganizedTopic[]
) {
  try {
    const availableSpace = spaceService.calculateAvailableSpace(constraints);
    const suggestions = spaceService.generateSpaceSuggestions(
      currentSelection,
      availableSpace,
      allTopics
    );
    
    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        availableSpace,
        currentUtilization: currentSelection.reduce((sum, sel) => sum + sel.estimatedSpace, 0) / availableSpace
      }
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

async function handleCalculateOptimalTopicCount(
  spaceService: any,
  topics: OrganizedTopic[],
  constraints: SpaceConstraints,
  referenceAnalysis?: ReferenceFormatAnalysis
) {
  try {
    const availableSpace = spaceService.calculateAvailableSpace(constraints);
    const optimalCount = spaceService.calculateOptimalTopicCount(
      availableSpace,
      topics,
      referenceAnalysis
    );
    
    return NextResponse.json({
      success: true,
      data: {
        optimalTopicCount: optimalCount,
        availableSpace,
        totalTopics: topics.length,
        utilizationEstimate: Math.min(1.0, optimalCount / topics.length)
      }
    });
  } catch (error) {
    console.error('Error calculating optimal topic count:', error);
    return NextResponse.json(
      { error: 'Failed to calculate optimal topic count' },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Space optimization API is running',
    endpoints: [
      'POST /api/space-optimization - Main optimization endpoint',
      'Actions: calculate_available_space, optimize_space_utilization, calculate_space_utilization, generate_suggestions, calculate_optimal_topic_count'
    ]
  });
}