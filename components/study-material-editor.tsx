"use client"

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageRegenerationInterface } from './image-regeneration-interface'
import { ExportMaterialDialog } from './export-material-dialog'
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  GripVertical, 
  Image as ImageIcon, 
  RefreshCw,
  Download,
  Eye,
  Move
} from 'lucide-react'

// Types based on the design document
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

interface StudyMaterialEditorProps {
  materialId?: string
  initialMaterial?: StudyMaterial
  onSave?: (material: StudyMaterial) => Promise<void>
  onExport?: (format: 'pdf' | 'html' | 'markdown') => Promise<string>
}

export function StudyMaterialEditor({ 
  materialId, 
  initialMaterial, 
  onSave, 
  onExport 
}: StudyMaterialEditorProps) {
  const [material, setMaterial] = useState<StudyMaterial>(
    initialMaterial || {
      id: materialId || `material-${Date.now()}`,
      title: 'Untitled Study Material',
      sections: [],
      images: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: 1
      }
    }
  )

  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const dragCounter = useRef(0)

  // Content section management
  const addSection = useCallback((type: ContentSection['type'], content: string = '') => {
    const newSection: ContentSection = {
      id: `section-${Date.now()}`,
      type,
      content: content || getDefaultContent(type),
      order: material.sections.length,
      editable: true
    }

    setMaterial(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
      metadata: {
        ...prev.metadata,
        lastModified: new Date().toISOString(),
        version: prev.metadata.version + 1
      }
    }))
    setIsAddSectionOpen(false)
  }, [material.sections.length])

  const removeSection = useCallback((sectionId: string) => {
    setMaterial(prev => ({
      ...prev,
      sections: prev.sections
        .filter(section => section.id !== sectionId)
        .map((section, index) => ({ ...section, order: index })),
      metadata: {
        ...prev.metadata,
        lastModified: new Date().toISOString(),
        version: prev.metadata.version + 1
      }
    }))
  }, [])

  const updateSection = useCallback((sectionId: string, content: string) => {
    setMaterial(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, content } : section
      ),
      metadata: {
        ...prev.metadata,
        lastModified: new Date().toISOString(),
        version: prev.metadata.version + 1
      }
    }))
  }, [])

  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    setMaterial(prev => {
      const newSections = [...prev.sections]
      const [movedSection] = newSections.splice(fromIndex, 1)
      newSections.splice(toIndex, 0, movedSection)
      
      // Update order values
      const reorderedSections = newSections.map((section, index) => ({
        ...section,
        order: index
      }))

      return {
        ...prev,
        sections: reorderedSections,
        metadata: {
          ...prev.metadata,
          lastModified: new Date().toISOString(),
          version: prev.metadata.version + 1
        }
      }
    })
  }, [])

  // Image management
  const addImage = useCallback((imageRequest: any) => {
    // This would integrate with the SimpleImageGenerator
    const newImage: GeneratedImage = {
      id: `image-${Date.now()}`,
      type: 'generated',
      source: {
        type: imageRequest.type,
        content: imageRequest.content,
        context: imageRequest.context
      },
      editable: true,
      regenerationOptions: {
        availableStyles: [
          {
            lineWeight: 'medium',
            colorScheme: 'monochrome',
            layout: 'horizontal',
            annotations: true
          }
        ],
        contentHints: [],
        contextOptions: []
      },
      url: '/placeholder.svg', // Placeholder until actual generation
      alt: `Generated ${imageRequest.type} illustration`
    }

    setMaterial(prev => ({
      ...prev,
      images: [...prev.images, newImage],
      metadata: {
        ...prev.metadata,
        lastModified: new Date().toISOString(),
        version: prev.metadata.version + 1
      }
    }))
  }, [])

  const removeImage = useCallback((imageId: string) => {
    setMaterial(prev => ({
      ...prev,
      images: prev.images.filter(image => image.id !== imageId),
      metadata: {
        ...prev.metadata,
        lastModified: new Date().toISOString(),
        version: prev.metadata.version + 1
      }
    }))
  }, [])

  const regenerateImage = useCallback(async (imageId: string, newStyle: FlatLineStyle) => {
    try {
      const response = await fetch('/api/regenerate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          newStyle
        })
      })

      const data = await response.json()
      if (data.success && data.data.regeneratedImage) {
        // Update the material with the new image
        setMaterial(prev => ({
          ...prev,
          images: prev.images.map(image =>
            image.id === imageId
              ? {
                  ...image,
                  ...data.data.regeneratedImage,
                  regenerationOptions: {
                    ...image.regenerationOptions,
                    availableStyles: [newStyle]
                  }
                }
              : image
          ),
          metadata: {
            ...prev.metadata,
            lastModified: new Date().toISOString(),
            version: prev.metadata.version + 1
          }
        }))
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error)
    }
  }, [])

  const batchRegenerateImages = useCallback(async (imageIds: string[], style: FlatLineStyle) => {
    try {
      const response = await fetch('/api/regenerate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds,
          style,
          options: { preserveContent: true }
        })
      })

      const data = await response.json()
      if (data.success) {
        // Update all regenerated images
        const regeneratedImages = new Map(
          data.data.results
            .filter((result: any) => result.success && result.regeneratedImage)
            .map((result: any) => [result.imageId, result.regeneratedImage])
        )

        setMaterial(prev => ({
          ...prev,
          images: prev.images.map(image =>
            regeneratedImages.has(image.id)
              ? { ...image, ...regeneratedImages.get(image.id) }
              : image
          ),
          metadata: {
            ...prev.metadata,
            lastModified: new Date().toISOString(),
            version: prev.metadata.version + 1
          }
        }))
      }
    } catch (error) {
      console.error('Failed to batch regenerate images:', error)
    }
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/html', sectionId)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    dragCounter.current = 0

    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null)
      return
    }

    const fromIndex = material.sections.findIndex(s => s.id === draggedSection)
    const toIndex = material.sections.findIndex(s => s.id === targetSectionId)

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderSections(fromIndex, toIndex)
    }

    setDraggedSection(null)
  }, [draggedSection, material.sections, reorderSections])

  // Save functionality
  const handleSave = useCallback(async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(material)
    } catch (error) {
      console.error('Failed to save material:', error)
    } finally {
      setIsSaving(false)
    }
  }, [material, onSave])

  // Export functionality
  const handleExport = useCallback(async (format: 'pdf' | 'html' | 'markdown') => {
    if (!onExport) return

    try {
      const result = await onExport(format)
      // Handle the export result (e.g., download file)
      console.log(`Exported as ${format}:`, result)
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error)
    }
  }, [onExport])

  // Helper function for default content
  const getDefaultContent = (type: ContentSection['type']): string => {
    switch (type) {
      case 'text':
        return 'Enter your text content here...'
      case 'equation':
        return 'Enter your equation here (e.g., x = (-b ± √(b² - 4ac)) / 2a)'
      case 'example':
        return 'Enter your example problem and solution here...'
      case 'list':
        return '• Item 1\n• Item 2\n• Item 3'
      default:
        return ''
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Input
            value={material.title}
            onChange={(e) => setMaterial(prev => ({ 
              ...prev, 
              title: e.target.value,
              metadata: {
                ...prev.metadata,
                lastModified: new Date().toISOString()
              }
            }))}
            className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
            placeholder="Enter study material title..."
          />
          <p className="text-sm text-muted-foreground mt-1">
            Last modified: {new Date(material.metadata.lastModified).toLocaleString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ExportMaterialDialog
            materialId={material.id}
            materialTitle={material.title}
            onExport={(result) => {
              console.log('Export completed:', result)
              // You can add additional handling here if needed
            }}
          />
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Content Sections</h3>
          <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select onValueChange={(value) => addSection(value as ContentSection['type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="equation">Equation</SelectItem>
                    <SelectItem value="example">Example Problem</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {material.sections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No content sections yet. Add your first section to get started.</p>
            </CardContent>
          </Card>
        ) : (
          material.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <Card
                key={section.id}
                className={`transition-all ${
                  draggedSection === section.id ? 'opacity-50' : ''
                }`}
                draggable={section.editable}
                onDragStart={(e) => handleDragStart(e, section.id)}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, section.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <CardTitle className="text-sm capitalize">
                        {section.type} Section
                      </CardTitle>
                    </div>
                    <CardAction>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSection(
                            editingSection === section.id ? null : section.id
                          )}
                        >
                          {editingSection === section.id ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Edit3 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSection(section.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardAction>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingSection === section.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                        placeholder={getDefaultContent(section.type)}
                        rows={4}
                      />
                      <Button
                        size="sm"
                        onClick={() => setEditingSection(null)}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{section.content}</div>
                  )}
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {/* Images Section */}
      <Tabs defaultValue="manage" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="manage">Manage Images</TabsTrigger>
            <TabsTrigger value="regenerate">Regenerate Images</TabsTrigger>
          </TabsList>
          
          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <ImageIcon className="w-4 h-4 mr-2" />
                Add Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select onValueChange={(type) => {
                  addImage({
                    type,
                    content: 'Sample content',
                    context: 'Study material context'
                  })
                  setIsImageDialogOpen(false)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select image type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equation">Equation Visualization</SelectItem>
                    <SelectItem value="concept">Concept Diagram</SelectItem>
                    <SelectItem value="example">Example Illustration</SelectItem>
                    <SelectItem value="diagram">General Diagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="manage">
          {material.images.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No images generated yet. Add images to enhance your study material.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {material.images.map((image) => (
                <Card key={image.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm capitalize">
                        {image.source.type} Image
                      </CardTitle>
                      <CardAction>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeImage(image.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-2">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {image.source.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="regenerate">
          <ImageRegenerationInterface
            images={material.images.map(img => ({
              id: img.id,
              svgContent: '',
              base64: img.url || '/placeholder.svg',
              dimensions: { width: 400, height: 300 },
              metadata: {
                type: img.source.type,
                content: img.source.content,
                style: img.regenerationOptions.availableStyles[0] || {
                  lineWeight: 'medium',
                  colorScheme: 'monochrome',
                  layout: 'horizontal',
                  annotations: true
                },
                generatedAt: new Date()
              }
            }))}
            onRegenerateImage={regenerateImage}
            onBatchRegenerate={batchRegenerateImages}
            onPreviewGenerated={(preview) => {
              console.log('Preview generated:', preview)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}