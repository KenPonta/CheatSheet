import { NextRequest, NextResponse } from 'next/server';
import { ContentModificationService } from '../../../../backend/lib/content-modification/content-modification-service';
import { EnhancedExportService, EnhancedExportOptions } from '../../../../backend/lib/content-modification/export-service';
import { ContentModificationError } from '../../../../backend/lib/content-modification/types';

const contentService = new ContentModificationService();
const exportService = new EnhancedExportService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, options }: { materialId: string; options: EnhancedExportOptions } = body;

    // Validate required parameters
    if (!materialId) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    if (!options || !options.format) {
      return NextResponse.json(
        { error: 'Export options with format are required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['pdf', 'html', 'markdown'].includes(options.format)) {
      return NextResponse.json(
        { error: 'Invalid export format. Must be pdf, html, or markdown' },
        { status: 400 }
      );
    }

    // Load the material
    const material = await contentService.loadMaterial(materialId);

    // Export the material
    const exportResult = await exportService.exportMaterial(material, options);

    // Handle different content types
    if (options.format === 'pdf') {
      // Return PDF as base64 for binary content
      const base64Content = Buffer.from(exportResult.content as Buffer).toString('base64');
      
      return NextResponse.json({
        success: true,
        result: {
          ...exportResult,
          content: base64Content,
          contentType: 'application/pdf',
          encoding: 'base64'
        }
      });
    } else {
      // Return text content directly
      return NextResponse.json({
        success: true,
        result: {
          ...exportResult,
          contentType: options.format === 'html' ? 'text/html' : 'text/markdown',
          encoding: 'utf8'
        }
      });
    }

  } catch (error) {
    console.error('Export error:', error);

    if (error instanceof ContentModificationError) {
      const statusCode = error.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const format = searchParams.get('format') as 'pdf' | 'html' | 'markdown';

    if (!materialId || !format) {
      return NextResponse.json(
        { error: 'Material ID and format are required' },
        { status: 400 }
      );
    }

    // Load the material
    const material = await contentService.loadMaterial(materialId);

    // Use default export options for GET requests
    const options: EnhancedExportOptions = {
      format,
      includeImages: true,
      includeMetadata: true,
      htmlConfig: {
        embedSVG: true,
        includeCSS: true,
        responsive: true,
        theme: 'light'
      },
      markdownConfig: {
        imageFormat: 'base64',
        mathFormat: 'latex',
        includeTableOfContents: true
      },
      pdfConfig: {
        paperSize: 'a4',
        orientation: 'portrait',
        fontSize: 'medium',
        includeHeaders: true,
        includeFooters: true
      }
    };

    // Export the material
    const exportResult = await exportService.exportMaterial(material, options);

    // Set appropriate headers for direct download
    const headers = new Headers();
    
    if (format === 'pdf') {
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      return new NextResponse(exportResult.content as Buffer, { headers });
    } else if (format === 'html') {
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      return new NextResponse(exportResult.content as string, { headers });
    } else {
      headers.set('Content-Type', 'text/markdown; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      return new NextResponse(exportResult.content as string, { headers });
    }

  } catch (error) {
    console.error('Export error:', error);

    if (error instanceof ContentModificationError) {
      const statusCode = error.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}