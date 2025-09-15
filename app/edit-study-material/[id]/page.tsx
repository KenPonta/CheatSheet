"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { StudyMaterialEditor } from '@/components/study-material-editor'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

interface StudyMaterial {
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
}

export default function EditStudyMaterialPage() {
  const params = useParams()
  const router = useRouter()
  const studyMaterialId = params.id as string

  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (studyMaterialId) {
      loadStudyMaterial(studyMaterialId)
    }
  }, [studyMaterialId])

  const loadStudyMaterial = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/content-modification/study-material?id=${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load study material')
      }

      if (result.success && result.data) {
        // Convert the stored data to the expected format
        const convertedMaterial: StudyMaterial = {
          id: result.data.id,
          title: result.data.title,
          sections: result.data.sections || [],
          images: result.data.images || [],
          metadata: {
            createdAt: result.data.metadata.createdAt,
            lastModified: result.data.metadata.lastModified,
            version: result.data.metadata.version
          }
        }
        
        setStudyMaterial(convertedMaterial)
      } else {
        throw new Error('Study material not found')
      }
    } catch (err) {
      console.error('Failed to load study material:', err)
      setError(err instanceof Error ? err.message : 'Failed to load study material')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (material: StudyMaterial) => {
    try {
      const response = await fetch('/api/content-modification/study-material', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...material,
          action: 'update'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save study material')
      }

      if (result.success) {
        // Update local state with new version
        setStudyMaterial(prev => prev ? {
          ...prev,
          ...material,
          metadata: {
            ...prev.metadata,
            lastModified: new Date().toISOString(),
            version: prev.metadata.version + 1
          }
        } : null)
        
        // Show success message
        alert('Study material saved successfully!')
      } else {
        throw new Error(result.message || 'Failed to save study material')
      }
    } catch (err) {
      console.error('Failed to save study material:', err)
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw err
    }
  }

  const handleExport = async (format: 'pdf' | 'html' | 'markdown') => {
    try {
      // This would integrate with the existing export functionality
      // For now, we'll show a placeholder
      alert(`Export as ${format.toUpperCase()} functionality would be implemented here`)
      return `exported-${studyMaterial?.title || 'study-material'}.${format}`
    } catch (err) {
      console.error('Failed to export study material:', err)
      throw err
    }
  }

  const goBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading study material...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={goBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => loadStudyMaterial(studyMaterialId)}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!studyMaterial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Study Material Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The study material you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={goBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={goBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edit Study Material</h1>
                <p className="text-sm text-muted-foreground">
                  ID: {studyMaterialId} • Version: {studyMaterial.metadata.version}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <StudyMaterialEditor
          materialId={studyMaterial.id}
          initialMaterial={studyMaterial}
          onSave={handleSave}
          onExport={handleExport}
        />
      </main>
    </div>
  )
}