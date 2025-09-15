import { NextRequest, NextResponse } from 'next/server';
import { ContentModificationService } from '@/backend/lib/content-modification/content-modification-service';
import { 
  ContentModificationRequest,
  ContentModificationError,
  ExportOptions
} from '@/backend/lib/content-modification/types';

const contentService = new ContentModificationService();

/**
 * GET /api/content-modification - List materials or get specific material
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (materialId) {
      if (action === 'history') {
        // Get modification history
        const history = await contentService.getHistory(materialId);
        return NextResponse.json({
          success: true,
          data: history
        });
      } else if (action === 'validate') {
        // Validate material integrity
        const validation = await contentService.validateMaterial(materialId);
        return NextResponse.json({
          success: true,
          data: validation
        });
      } else {
        // Get specific material
        const material = await contentService.loadMaterial(materialId);
        return NextResponse.json({
          success: true,
          data: material
        });
      }
    } else {
      // List all materials
      const materials = await contentService.listMaterials(userId || undefined);
      return NextResponse.json({
        success: true,
        data: materials
      });
    }
  } catch (error) {
    console.error('Content modification GET error:', error);
    
    if (error instanceof ContentModificationError) {
      const statusCode = error.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * POST /api/content-modification - Create new material or modify existing material
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      // Create new material
      const { title, sections = [], images = [], metadata = {} } = body;
      
      if (!title || typeof title !== 'string') {
        return NextResponse.json({
          success: false,
          error: 'Title is required and must be a string'
        }, { status: 400 });
      }

      const material = await contentService.createMaterial(title, sections, images, metadata);
      
      return NextResponse.json({
        success: true,
        data: material,
        message: 'Material created successfully'
      });
    } else if (action === 'modify') {
      // Modify existing material
      const modificationRequest: ContentModificationRequest = {
        materialId: body.materialId,
        operation: body.operation,
        userId: body.userId,
        timestamp: new Date()
      };

      if (!modificationRequest.materialId || !modificationRequest.operation) {
        return NextResponse.json({
          success: false,
          error: 'Material ID and operation are required'
        }, { status: 400 });
      }

      const modifiedMaterial = await contentService.modifyContent(modificationRequest);
      
      return NextResponse.json({
        success: true,
        data: modifiedMaterial,
        message: 'Material modified successfully'
      });
    } else if (action === 'export') {
      // Export material
      const { materialId, options }: { materialId: string; options: ExportOptions } = body;
      
      if (!materialId || !options) {
        return NextResponse.json({
          success: false,
          error: 'Material ID and export options are required'
        }, { status: 400 });
      }

      const exportResult = await contentService.exportMaterial(materialId, options);
      
      // For binary content (PDF), return base64 encoded
      const responseData = {
        ...exportResult,
        content: Buffer.isBuffer(exportResult.content) 
          ? exportResult.content.toString('base64')
          : exportResult.content
      };
      
      return NextResponse.json({
        success: true,
        data: responseData,
        message: 'Material exported successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "create", "modify", or "export"'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Content modification POST error:', error);
    
    if (error instanceof ContentModificationError) {
      let statusCode = 400;
      if (error.code === 'MATERIAL_NOT_FOUND') statusCode = 404;
      if (error.code === 'PERMISSION_DENIED') statusCode = 403;
      if (error.code === 'STORAGE_ERROR') statusCode = 500;
      
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
 * DELETE /api/content-modification - Delete material
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');

    if (!materialId) {
      return NextResponse.json({
        success: false,
        error: 'Material ID is required'
      }, { status: 400 });
    }

    await contentService.deleteMaterial(materialId);
    
    return NextResponse.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Content modification DELETE error:', error);
    
    if (error instanceof ContentModificationError) {
      const statusCode = error.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}