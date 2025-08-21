import { NextRequest, NextResponse } from 'next/server';
import { getImageRecreationService } from '@/lib/ai';
import type { ExtractedImage, ImageRecreationResult } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, options = {} } = body;

    // Validate input
    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    // Validate each image has required fields
    for (const image of images) {
      if (!image.id || !image.context) {
        return NextResponse.json(
          { error: 'Each image must have id and context' },
          { status: 400 }
        );
      }
    }

    const imageService = getImageRecreationService();
    
    // Process images
    const results: ImageRecreationResult[] = await imageService.recreateImages(images);
    
    // Separate results that need user approval
    const needsApproval = results.filter(result => result.userApprovalRequired);
    const autoApproved = results.filter(result => !result.userApprovalRequired);
    
    // Create approval workflows for images that need review
    const approvalWorkflows = needsApproval.map(result => 
      imageService.createApprovalWorkflow(result)
    );

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        recreated: results.filter(r => r.generatedImage).length,
        needsApproval: needsApproval.length,
        autoApproved: autoApproved.length,
        fallbackToOriginal: results.filter(r => r.fallbackToOriginal).length
      },
      approvalWorkflows,
      processingTime: results.reduce((sum, r) => sum + r.processingTime, 0)
    });

  } catch (error) {
    console.error('Image recreation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to recreate images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('imageId');
  
  if (!imageId) {
    return NextResponse.json(
      { error: 'imageId parameter is required' },
      { status: 400 }
    );
  }

  try {
    // This would typically fetch from a database or cache
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Image recreation status endpoint - implementation depends on storage solution'
    });
  } catch (error) {
    console.error('Failed to get image recreation status:', error);
    
    return NextResponse.json(
      { error: 'Failed to get recreation status' },
      { status: 500 }
    );
  }
}