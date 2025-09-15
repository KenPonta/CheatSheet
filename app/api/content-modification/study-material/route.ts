import { type NextRequest, NextResponse } from "next/server"

interface StudyMaterialData {
  id: string
  title: string
  sections: ContentSection[]
  images: GeneratedImage[]
  metadata: MaterialMetadata
}

interface ContentSection {
  id: string
  type: 'text' | 'equation' | 'example' | 'list'
  content: string
  order: number
  editable: boolean
}

interface GeneratedImage {
  id: string
  type: 'generated' | 'original'
  source: ImageSource
  editable: boolean
  regenerationOptions: RegenerationOptions
  url?: string
  alt?: string
  svgContent?: string
  base64?: string
}

interface ImageSource {
  type: 'equation' | 'concept' | 'example' | 'diagram'
  content: string
  context: string
}

interface RegenerationOptions {
  availableStyles: FlatLineStyle[]
  contentHints: string[]
  contextOptions: string[]
}

interface FlatLineStyle {
  lineWeight: 'thin' | 'medium' | 'thick'
  colorScheme: 'monochrome' | 'minimal-color'
  layout: 'horizontal' | 'vertical' | 'grid'
  annotations: boolean
}

interface MaterialMetadata {
  createdAt: string
  lastModified: string
  version: number
  originalGenerationConfig?: any
}

// In-memory storage for demo purposes
// In a real implementation, this would use a database
const studyMaterials = new Map<string, StudyMaterialData>()

// GET - Retrieve study material by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Study material ID is required'
      }, { status: 400 })
    }

    const studyMaterial = studyMaterials.get(id)
    
    if (!studyMaterial) {
      return NextResponse.json({
        success: false,
        message: 'Study material not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: studyMaterial
    })
  } catch (error) {
    console.error('Error retrieving study material:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve study material'
    }, { status: 500 })
  }
}

// POST - Create or update study material
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, title, sections, images, metadata, action } = data

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Study material ID is required'
      }, { status: 400 })
    }

    let studyMaterial: StudyMaterialData

    if (action === 'create') {
      // Create new study material
      studyMaterial = {
        id,
        title: title || 'Untitled Study Material',
        sections: sections || [],
        images: images || [],
        metadata: {
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: 1,
          ...metadata
        }
      }
    } else {
      // Update existing study material
      const existing = studyMaterials.get(id)
      if (!existing) {
        return NextResponse.json({
          success: false,
          message: 'Study material not found for update'
        }, { status: 404 })
      }

      studyMaterial = {
        ...existing,
        title: title || existing.title,
        sections: sections || existing.sections,
        images: images || existing.images,
        metadata: {
          ...existing.metadata,
          lastModified: new Date().toISOString(),
          version: existing.metadata.version + 1,
          ...metadata
        }
      }
    }

    // Store the study material
    studyMaterials.set(id, studyMaterial)

    return NextResponse.json({
      success: true,
      message: action === 'create' ? 'Study material created successfully' : 'Study material updated successfully',
      data: studyMaterial
    })
  } catch (error) {
    console.error('Error saving study material:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save study material'
    }, { status: 500 })
  }
}

// PUT - Update specific sections or images
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, operation, target, payload } = data

    if (!id || !operation || !target) {
      return NextResponse.json({
        success: false,
        message: 'ID, operation, and target are required'
      }, { status: 400 })
    }

    const studyMaterial = studyMaterials.get(id)
    if (!studyMaterial) {
      return NextResponse.json({
        success: false,
        message: 'Study material not found'
      }, { status: 404 })
    }

    let updated = { ...studyMaterial }

    switch (operation) {
      case 'add_section':
        const newSection: ContentSection = {
          id: `section_${Date.now()}`,
          type: payload.type || 'text',
          content: payload.content || '',
          order: updated.sections.length,
          editable: true
        }
        updated.sections.push(newSection)
        break

      case 'update_section':
        const sectionIndex = updated.sections.findIndex(s => s.id === target)
        if (sectionIndex >= 0) {
          updated.sections[sectionIndex] = {
            ...updated.sections[sectionIndex],
            ...payload
          }
        }
        break

      case 'remove_section':
        updated.sections = updated.sections.filter(s => s.id !== target)
        break

      case 'add_image':
        const newImage: GeneratedImage = {
          id: `image_${Date.now()}`,
          type: 'generated',
          source: payload.source,
          editable: true,
          regenerationOptions: payload.regenerationOptions || {
            availableStyles: [],
            contentHints: [],
            contextOptions: []
          },
          ...payload
        }
        updated.images.push(newImage)
        break

      case 'update_image':
        const imageIndex = updated.images.findIndex(i => i.id === target)
        if (imageIndex >= 0) {
          updated.images[imageIndex] = {
            ...updated.images[imageIndex],
            ...payload
          }
        }
        break

      case 'remove_image':
        updated.images = updated.images.filter(i => i.id !== target)
        break

      default:
        return NextResponse.json({
          success: false,
          message: `Unknown operation: ${operation}`
        }, { status: 400 })
    }

    // Update metadata
    updated.metadata = {
      ...updated.metadata,
      lastModified: new Date().toISOString(),
      version: updated.metadata.version + 1
    }

    // Store the updated study material
    studyMaterials.set(id, updated)

    return NextResponse.json({
      success: true,
      message: `Successfully performed ${operation}`,
      data: updated
    })
  } catch (error) {
    console.error('Error updating study material:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to update study material'
    }, { status: 500 })
  }
}

// DELETE - Remove study material
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Study material ID is required'
      }, { status: 400 })
    }

    const existed = studyMaterials.has(id)
    studyMaterials.delete(id)

    if (!existed) {
      return NextResponse.json({
        success: false,
        message: 'Study material not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Study material deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting study material:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to delete study material'
    }, { status: 500 })
  }
}