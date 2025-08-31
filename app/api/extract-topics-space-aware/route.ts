import { NextRequest, NextResponse } from 'next/server';
import { getAIContentService, getSpaceCalculationService } from '../../../backend/lib/ai';
import type { 
  ExtractedContent, 
  SpaceConstraints, 
  ReferenceFormatAnalysis 
} from '../../../backend/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      content, 
      spaceConstraints, 
      referenceAnalysis 
    }: {
      content: ExtractedContent[];
      spaceConstraints: SpaceConstraints;
      referenceAnalysis?: ReferenceFormatAnalysis;
    } = body;

    if (!content || !Array.isArray(content) || content.length === 0) {
      return NextResponse.json(
        { error: 'Content array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!spaceConstraints) {
      return NextResponse.json(
        { error: 'Space constraints are required' },
        { status: 400 }
      );
    }

    const aiService = getAIContentService();
    const spaceService = getSpaceCalculationService();

    // Calculate available space
    const availableSpace = spaceService.calculateAvailableSpace(spaceConstraints);

    // Extract topics with space awareness
    const topics = await aiService.extractTopicsWithSpaceConstraints(
      content,
      spaceConstraints,
      referenceAnalysis
    );

    // Optimize space utilization
    const optimization = await aiService.optimizeSpaceUtilization(
      topics,
      availableSpace,
      referenceAnalysis
    );

    // Calculate current space utilization
    const currentSelection = optimization.recommendedTopics.map(topicId => {
      const topic = topics.find(t => t.id === topicId);
      const subtopicSelection = optimization.recommendedSubtopics.find(rs => rs.topicId === topicId);
      
      return {
        topicId,
        subtopicIds: subtopicSelection?.subtopicIds || [],
        priority: topic?.priority || 'medium' as const,
        estimatedSpace: topic?.estimatedSpace || 0
      };
    });

    const utilizationInfo = spaceService.calculateSpaceUtilization(
      currentSelection,
      availableSpace,
      topics
    );

    return NextResponse.json({
      success: true,
      data: {
        topics,
        availableSpace,
        optimization,
        utilizationInfo,
        spaceConstraints
      }
    });

  } catch (error) {
    console.error('Space-aware topic extraction error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract topics with space awareness',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}