"use client"

import React, { useState, useCallback, useRef, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Save, 
  Plus, 
  Image as ImageIcon,
  RefreshCw,
  Download
} from 'lucide-react'

// Lazy load heavy components
const StudyMaterialEditor = lazy(() => 
  import('./study-material-editor').then(module => ({ 
    default: module.StudyMaterialEditor 
  }))
)

const ImageRegenerationInterface = lazy(() => 
  import('./image-regeneration-interface').then(module => ({ 
    default: module.ImageRegenerationInterface 
  }))
)

const ExportMaterialDialog = lazy(() => 
  import('./export-material-dialog').then(module => ({ 
    default: module.ExportMaterialDialog 
  }))
)

// Types
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

interface LazyStudyMaterialEditorProps {
  materialId?: string
  initialMaterial?: StudyMaterial
  onSave?: (material: StudyMaterial) => Promise<void>
  onExport?: (format: 'pdf' | 'html' | 'markdown') => Promise<string>
  enableLazyLoading?: boolean
}

/**
 * Performance-optimized study material editor with lazy loading
 */
export function LazyStudyMaterialEditor({ 
  materialId, 
  initialMaterial, 
  onSave, 
  onExport,
  enableLazyLoading = true
}: LazyStudyMaterialEditorProps) {
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

  const [activeTab, setActiveTab] = useState<'editor' | 'images' | 'export'>('editor')
  const [isLoading, setIsLoading] = useState(false)
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set())

  // Performance tracking
  const performanceRef = useRef<{
    renderStart: number
    componentLoadTimes: Map<string, number>
  }>({
    renderStart: Date.now(),
    componentLoadTimes: new Map()
  })

  // Track component load performance
  const trackComponentLoad = useCallback((componentName: string) => {
    const loadTime = Date.now() - performanceRef.current.renderStart
    performanceRef.current.componentLoadTimes.set(componentName, loadTime)
    setLoadedComponents(prev => new Set([...prev, componentName]))
    
    console.log(`Component ${componentName} loaded in ${loadTime}ms`)
  }, [])

  // Optimized save with debouncing
  const debouncedSave = useRef<NodeJS.Timeout>()
  const handleSave = useCallback(async (updatedMaterial?: StudyMaterial) => {
    if (!onSave) return

    const materialToSave = updatedMaterial || material

    // Clear existing debounce
    if (debouncedSave.current) {
      clearTimeout(debouncedSave.current)
    }

    // Debounce save operation
    debouncedSave.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        await onSave(materialToSave)
        console.log('Material saved successfully')
      } catch (error) {
        console.error('Failed to save material:', error)
      } finally {
        setIsLoading(false)
      }
    }, 1000) // 1 second debounce
  }, [material, onSave])

  // Auto-save on material changes
  const handleMaterialChange = useCallback((updatedMaterial: StudyMaterial) => {
    setMaterial(updatedMaterial)
    handleSave(updatedMaterial)
  }, [handleSave])

  // Lazy load component based on tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'editor':
        if (!enableLazyLoading || loadedComponents.has('editor')) {
          return (
            <Suspense fallback={<EditorSkeleton />}>
              <StudyMaterialEditor
                materialId={material.id}
                initialMaterial={material}
                onSave={handleMaterialChange}
                onExport={onExport}
              />
            </Suspense>
          )
        }
        return <EditorSkeleton />

      case 'images':
        if (!enableLazyLoading || loadedComponents.has('images')) {
          return (
            <Suspense fallback={<ImagesSkeleton />}>
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
                onRegenerateImage={async (imageId, newStyle) => {
                  // Handle image regeneration
                  console.log('Regenerating image:', imageId, newStyle)
                }}
                onBatchRegenerate={async (imageIds, style) => {
                  // Handle batch regeneration
                  console.log('Batch regenerating images:', imageIds, style)
                }}
                onPreviewGenerated={(preview) => {
                  console.log('Preview generated:', preview)
                }}
              />
            </Suspense>
          )
        }
        return <ImagesSkeleton />

      case 'export':
        if (!enableLazyLoading || loadedComponents.has('export')) {
          return (
            <Suspense fallback={<ExportSkeleton />}>
              <ExportMaterialDialog
                materialId={material.id}
                materialTitle={material.title}
                onExport={(result) => {
                  console.log('Export completed:', result)
                }}
              />
            </Suspense>
          )
        }
        return <ExportSkeleton />

      default:
        return <EditorSkeleton />
    }
  }

  // Load component when tab becomes active
  const handleTabChange = useCallback((tab: 'editor' | 'images' | 'export') => {
    setActiveTab(tab)
    
    if (enableLazyLoading && !loadedComponents.has(tab)) {
      // Trigger component loading
      setTimeout(() => {
        trackComponentLoad(tab)
      }, 100)
    }
  }, [enableLazyLoading, loadedComponents, trackComponentLoad])

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const totalTime = Date.now() - performanceRef.current.renderStart
    const componentTimes = Object.fromEntries(performanceRef.current.componentLoadTimes)
    
    return {
      totalRenderTime: totalTime,
      componentLoadTimes: componentTimes,
      loadedComponents: Array.from(loadedComponents),
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    }
  }, [loadedComponents])

  // Preload components on hover (for better UX)
  const preloadComponent = useCallback((componentName: string) => {
    if (!loadedComponents.has(componentName)) {
      // Preload the component
      switch (componentName) {
        case 'images':
          import('./image-regeneration-interface')
          break
        case 'export':
          import('./export-material-dialog')
          break
        case 'editor':
          import('./study-material-editor')
          break
      }
    }
  }, [loadedComponents])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with performance info */}
      <div className="flex items-center justify-between">
        <div>
          <Input
            value={material.title}
            onChange={(e) => {
              const updatedMaterial = { 
                ...material, 
                title: e.target.value,
                metadata: {
                  ...material.metadata,
                  lastModified: new Date().toISOString()
                }
              }
              handleMaterialChange(updatedMaterial)
            }}
            className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
            placeholder="Enter study material title..."
          />
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-muted-foreground">
              Last modified: {new Date(material.metadata.lastModified).toLocaleString()}
            </p>
            {enableLazyLoading && (
              <p className="text-xs text-muted-foreground">
                Loaded: {loadedComponents.size}/3 components
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleSave()}
            disabled={isLoading}
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
          
          {/* Performance debug button (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('Performance metrics:', getPerformanceMetrics())}
            >
              Debug
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'editor', label: 'Editor', icon: Plus },
            { id: 'images', label: 'Images', icon: ImageIcon },
            { id: 'export', label: 'Export', icon: Download }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id as any)}
              onMouseEnter={() => preloadComponent(id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {loadedComponents.has(id) && enableLazyLoading && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Component loaded" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  )
}

// Skeleton components for loading states
function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ImagesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-video w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ExportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { LazyStudyMaterialEditor };