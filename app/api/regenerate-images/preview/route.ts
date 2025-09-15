import { NextRequest, NextResponse } from 'next/server';
import { getImageRegenerationService, RegenerationRequest } from '@/backend/lib/ai/image-regeneration-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageRegenerationService = getImageRegenerationService();

    const previewRequest: RegenerationRequest = {
      imageId: body.imageId,
      newStyle: body.newStyle,
      newContent: body.newContent,
      newContext: body.newContext,
      newDimensions: body.newDimensions,
      previewOnly: true
    };

    const preview = await imageRegenerationService.generatePreview(previewRequest);

    return NextResponse.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Image preview generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const imageRegenerationService = getImageRegenerationService();
    imageRegenerationService.clearPreviewCache();

    return NextResponse.json({
      success: true,
      message: 'Preview cache cleared'
    });
  } catch (error) {
    console.error('Preview cache clear error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}