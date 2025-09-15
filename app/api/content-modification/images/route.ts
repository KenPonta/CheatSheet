import { NextRequest, NextResponse } from 'next/server';
import { ContentModificationService } from '@/backend/lib/content-modification/content-modification-service';
import { 
  ContentModificationError,
  AddImageOperation,
  RemoveImageOperation,
  RegenerateImageOperation
} from '@/backend/lib/content-modification/types';

const contentService = new ContentModificationService();

/**
 * POST /api/content-modification/images - Add or modify images
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, action, userId } = body;

    if (!materialId) {
      return NextResponse.json({
        success: false,
        error: 'Material ID is required'
      }, { status: 400 });
    }

    let operation;
    let message;

    switch (action) {
      case 'add':
        const { image, position, sectionId } = body;
        if (!image || position === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Image data and position are required for add operation'
          }, { status: 400 });
        }

        operation = {
          type: 'add_image',
          data: { image, position, sectionId }
        } as AddImageOperation;
        message = 'Image added successfully';
        break;

      case 'regenerate':
        const { imageId, regenerationParams } = body;
        if (!imageId) {
          return NextResponse.json({
            success: false,
            error: 'Image ID is required for regenerate operation'
          }, { status: 400 });
        }

        operation = {
          type: 'regenerate_image',
          targetId: imageId,
          data: regenerationParams || {}
        } as RegenerateImageOperation;
        message = 'Image regenerated successfully';
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Must be "add" or "regenerate"'
        }, { status: 400 });
    }

    const modifiedMaterial = await contentService.modifyContent({
      materialId,
      operation,
      userId,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      data: modifiedMaterial,
      message
    });
  } catch (error) {
    console.error('Image modification error:', error);
    
    if (error instanceof ContentModificationError) {
      let statusCode = 400;
      if (error.code === 'MATERIAL_NOT_FOUND') statusCode = 404;
      if (error.code === 'VALIDATION_FAILED') statusCode = 422;
      
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/content-modification/images - Remove image
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const imageId = searchParams.get('imageId');
    const userId = searchParams.get('userId');

    if (!materialId || !imageId) {
      return NextResponse.json({
        success: false,
        error: 'Material ID and image ID are required'
      }, { status: 400 });
    }

    const operation: RemoveImageOperation = {
      type: 'remove_image',
      targetId: imageId
    };

    const modifiedMaterial = await contentService.modifyContent({
      materialId,
      operation,
      userId: userId || undefined,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      data: modifiedMaterial,
      message: 'Image removed successfully'
    });
  } catch (error) {
    console.error('Image removal error:', error);
    
    if (error instanceof ContentModificationError) {
      let statusCode = 400;
      if (error.code === 'MATERIAL_NOT_FOUND') statusCode = 404;
      if (error.code === 'VALIDATION_FAILED') statusCode = 422;
      
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}