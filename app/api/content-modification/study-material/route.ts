import { NextRequest, NextResponse } from 'next/server';

interface StudyMaterialSection {
  id: string;
  type: 'text' | 'equation' | 'example' | 'list';
  content: string;
  order: number;
  editable: boolean;
}

interface StudyMaterialData {
  id: string;
  title: string;
  sections: StudyMaterialSection[];
  images: any[];
  metadata: {
    createdAt: string;
    lastModified: string;
    version: number;
    originalGenerationConfig?: any;
  };
  action: 'create' | 'update' | 'delete';
}

// In-memory storage for demo purposes
// In a real application, this would be stored in a database
const studyMaterials = new Map<string, StudyMaterialData>();

export async function POST(request: NextRequest) {
  try {
    const data: StudyMaterialData = await request.json();
    
    if (!data.id || !data.title || !data.sections) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: id, title, or sections' },
        { status: 400 }
      );
    }

    switch (data.action) {
      case 'create':
        // Store the study material
        studyMaterials.set(data.id, {
          ...data,
          metadata: {
            ...data.metadata,
            createdAt: data.metadata.createdAt || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: 1
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Study material created successfully',
          data: {
            studyMaterialId: data.id,
            sectionsCount: data.sections.length,
            imagesCount: data.images.length
          }
        });

      case 'update':
        if (!studyMaterials.has(data.id)) {
          return NextResponse.json(
            { success: false, message: 'Study material not found' },
            { status: 404 }
          );
        }
        
        const existing = studyMaterials.get(data.id)!;
        studyMaterials.set(data.id, {
          ...data,
          metadata: {
            ...data.metadata,
            createdAt: existing.metadata.createdAt,
            lastModified: new Date().toISOString(),
            version: existing.metadata.version + 1
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Study material updated successfully',
          data: {
            studyMaterialId: data.id,
            version: existing.metadata.version + 1
          }
        });

      case 'delete':
        if (!studyMaterials.has(data.id)) {
          return NextResponse.json(
            { success: false, message: 'Study material not found' },
            { status: 404 }
          );
        }
        
        studyMaterials.delete(data.id);
        
        return NextResponse.json({
          success: true,
          message: 'Study material deleted successfully'
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Must be create, update, or delete' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Study material API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studyMaterialId = searchParams.get('id');
    
    if (studyMaterialId) {
      // Get specific study material
      const studyMaterial = studyMaterials.get(studyMaterialId);
      
      if (!studyMaterial) {
        return NextResponse.json(
          { success: false, message: 'Study material not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: studyMaterial
      });
    } else {
      // Get all study materials
      const allMaterials = Array.from(studyMaterials.values());
      
      return NextResponse.json({
        success: true,
        data: allMaterials,
        count: allMaterials.length
      });
    }

  } catch (error) {
    console.error('Study material GET API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Alias for POST with update action
  const data = await request.json();
  data.action = 'update';
  
  const newRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: request.headers
  });
  
  return POST(newRequest);
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studyMaterialId = searchParams.get('id');
    
    if (!studyMaterialId) {
      return NextResponse.json(
        { success: false, message: 'Study material ID is required' },
        { status: 400 }
      );
    }
    
    if (!studyMaterials.has(studyMaterialId)) {
      return NextResponse.json(
        { success: false, message: 'Study material not found' },
        { status: 404 }
      );
    }
    
    studyMaterials.delete(studyMaterialId);
    
    return NextResponse.json({
      success: true,
      message: 'Study material deleted successfully'
    });

  } catch (error) {
    console.error('Study material DELETE API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}