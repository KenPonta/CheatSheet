import { NextRequest, NextResponse } from 'next/server';
import { getImageRegenerationService, RegenerationRequest, BatchRegenerationRequest } from '@/backend/lib/ai/image-regeneration-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageRegenerationService = getImageRegenerationService();

    // Handle single image regeneration
    if (body.imageId && !body.imageIds) {
      const regenerationRequest: RegenerationRequest = {
        imageId: body.imageId,
        newStyle: body.newStyle,
        newContent: body.newContent,
        newContext: body.newContext,
        newDimensions: body.newDimensions,
        previewOnly: body.previewOnly || false
      };

      const result = await imageRegenerationService.regenerateImage(regenerationRequest);

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // Handle batch regeneration
    if (body.imageIds && Array.isArray(body.imageIds)) {
      const batchRequest: BatchRegenerationRequest = {
        imageIds: body.imageIds,
        style: body.style,
        options: body.options || {}
      };

      const result = await imageRegenerationService.regenerateImagesBatch(batchRequest);

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Image regeneration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const imageRegenerationService = getImageRegenerationService();

    switch (action) {
      case 'presets':
        const presets = imageRegenerationService.getStylePresets();
        return NextResponse.json({
          success: true,
          data: presets
        });

      case 'cache-stats':
        const stats = imageRegenerationService.getCacheStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Image regeneration GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}