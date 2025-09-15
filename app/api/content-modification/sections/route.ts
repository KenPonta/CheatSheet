import { NextRequest, NextResponse } from 'next/server';
import { ContentModificationService } from '@/backend/lib/content-modification/content-modification-service';
import { 
  ContentModificationError,
  AddSectionOperation,
  EditSectionOperation,
  RemoveSectionOperation,
  ReorderSectionsOperation
} from '@/backend/lib/content-modification/types';

const contentService = new ContentModificationService();

/**
 * POST /api/content-modification/sections - Add or modify sections
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
        const { section, position } = body;
        if (!section || position === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Section data and position are required for add operation'
          }, { status: 400 });
        }

        operation = {
          type: 'add_section',
          data: { section, position }
        } as AddSectionOperation;
        message = 'Section added successfully';
        break;

      case 'edit':
        const { sectionId, updates } = body;
        if (!sectionId || !updates) {
          return NextResponse.json({
            success: false,
            error: 'Section ID and updates are required for edit operation'
          }, { status: 400 });
        }

        operation = {
          type: 'edit_section',
          targetId: sectionId,
          data: updates
        } as EditSectionOperation;
        message = 'Section updated successfully';
        break;

      case 'reorder':
        const { sectionIds } = body;
        if (!sectionIds || !Array.isArray(sectionIds)) {
          return NextResponse.json({
            success: false,
            error: 'Section IDs array is required for reorder operation'
          }, { status: 400 });
        }

        operation = {
          type: 'reorder_sections',
          data: { sectionIds }
        } as ReorderSectionsOperation;
        message = 'Sections reordered successfully';
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Must be "add", "edit", or "reorder"'
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
    console.error('Section modification error:', error);
    
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
 * DELETE /api/content-modification/sections - Remove section
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const sectionId = searchParams.get('sectionId');
    const userId = searchParams.get('userId');

    if (!materialId || !sectionId) {
      return NextResponse.json({
        success: false,
        error: 'Material ID and section ID are required'
      }, { status: 400 });
    }

    const operation: RemoveSectionOperation = {
      type: 'remove_section',
      targetId: sectionId
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
      message: 'Section removed successfully'
    });
  } catch (error) {
    console.error('Section removal error:', error);
    
    if (error instanceof ContentModificationError) {
      let statusCode = 400;
      if (error.code === 'MATERIAL_NOT_FOUND') statusCode = 404;
      if (error.code === 'VALIDATION_FAILED') statusCode = 422;
      if (error.code === 'DEPENDENCY_CONFLICT') statusCode = 409;
      
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