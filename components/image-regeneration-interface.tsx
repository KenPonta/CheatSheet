"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  RefreshCw, 
  Eye, 
  Settings, 
  Palette, 
  Layout, 
  Type,
  CheckCircle,
  XCircle,
  Clock,
  Layers
} from 'lucide-react'

interface FlatLineStyle {
  lineWeight: 'thin' | 'medium' | 'thick'
  colorScheme: 'monochrome' | 'minimal-color'
  layout: 'horizontal' | 'vertical' | 'grid'
  annotations: boolean
}

interface StylePreset {
  name: string
  description: string
  style: FlatLineStyle
  recommendedFor: string[]
}

interface GeneratedImage {
  id: string
  svgContent: string
  base64: string
  dimensions: { width: number; height: number }
  metadata: {
    type: 'equation' | 'concept' | 'example' | 'diagram'
    content: string
    style: FlatLineStyle
    generatedAt: Date
  }
}

interface RegenerationPreview {
  imageId: string
  previewImage: GeneratedImage
  estimatedQuality: number
  styleComparison: {
    originalStyle: FlatLineStyle
    newStyle: FlatLineStyle
    differences: Array<{
      property: keyof FlatLineStyle
      originalValue: any
      newValue: any
      description: string
    }>
    impact: 'low' | 'medium' | 'high'
  }
}

interface RegenerationResult {
  imageId: string
  originalImage: GeneratedImage
  regeneratedImage?: GeneratedImage
  previewImage?: GeneratedImage
  success: boolean
  error?: string
  processingTime: number
}

interface ImageRegenerationInterfaceProps {
  images: GeneratedImage[]
  onRegenerateImage?: (imageId: string, newStyle: FlatLineStyle) => Promise<void>
  onBatchRegenerate?: (imageIds: string[], style: FlatLineStyle) => Promise<void>
  onPreviewGenerated?: (preview: RegenerationPreview) => void
}

export function ImageRegenerationInterface({
  images,
  onRegenerateImage,
  onBatchRegenerate,
  onPreviewGenerated
}: ImageRegenerationInterfaceProps) {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [customStyle, setCustomStyle] = useState<FlatLineStyle>({
    lineWeight: 'medium',
    colorScheme: 'monochrome',
    layout: 'horizontal',
    annotations: true
  })
  const [stylePresets, setStylePresets] = useState<StylePreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [preview, setPreview] = useState<RegenerationPreview | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{
    total: number
    completed: number
    results: RegenerationResult[]
  } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('single')

  // Load style presets on component mount
  useEffect(() => {
    loadStylePresets()
  }, [])

  const loadStylePresets = async () => {
    try {
      const response = await fetch('/api/regenerate-images?action=presets')
      const data = await response.json()
      if (data.success) {
        setStylePresets(data.data)
      }
    } catch (error) {
      console.error('Failed to load style presets:', error)
    }
  }

  const handleImageSelect = useCallback((imageId: string, selected: boolean) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(imageId)
      } else {
        newSet.delete(imageId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedImages(new Set(images.map(img => img.id)))
    } else {
      setSelectedImages(new Set())
    }
  }, [images])

  const handlePresetSelect = useCallback((presetName: string) => {
    const preset = stylePresets.find(p => p.name === presetName)
    if (preset) {
      setCustomStyle(preset.style)
      setSelectedPreset(presetName)
    }
  }, [stylePresets])

  const generatePreview = useCallback(async () => {
    if (!selectedImage) return

    setIsGeneratingPreview(true)
    try {
      const response = await fetch('/api/regenerate-images/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedImage.id,
          newStyle: customStyle
        })
      })

      const data = await response.json()
      if (data.success) {
        setPreview(data.data)
        onPreviewGenerated?.(data.data)
      } else {
        console.error('Preview generation failed:', data.error)
      }
    } catch (error) {
      console.error('Preview generation error:', error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }, [selectedImage, customStyle, onPreviewGenerated])

  const regenerateSingleImage = useCallback(async () => {
    if (!selectedImage) return

    setIsRegenerating(true)
    try {
      await onRegenerateImage?.(selectedImage.id, customStyle)
      setIsDialogOpen(false)
      setPreview(null)
    } catch (error) {
      console.error('Image regeneration failed:', error)
    } finally {
      setIsRegenerating(false)
    }
  }, [selectedImage, customStyle, onRegenerateImage])

  const regenerateBatchImages = useCallback(async () => {
    if (selectedImages.size === 0) return

    setIsRegenerating(true)
    setBatchProgress({
      total: selectedImages.size,
      completed: 0,
      results: []
    })

    try {
      const imageIds = Array.from(selectedImages)
      
      // Process images in batches to show progress
      const batchSize = 3
      const results: RegenerationResult[] = []

      for (let i = 0; i < imageIds.length; i += batchSize) {
        const batch = imageIds.slice(i, i + batchSize)
        
        const response = await fetch('/api/regenerate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageIds: batch,
            style: customStyle,
            options: { preserveContent: true }
          })
        })

        const data = await response.json()
        if (data.success) {
          results.push(...data.data.results)
          setBatchProgress(prev => prev ? {
            ...prev,
            completed: results.length,
            results
          } : null)
        }
      }

      // Call the batch regeneration callback
      await onBatchRegenerate?.(imageIds, customStyle)
      
      setIsDialogOpen(false)
      setSelectedImages(new Set())
    } catch (error) {
      console.error('Batch regeneration failed:', error)
    } finally {
      setIsRegenerating(false)
      setBatchProgress(null)
    }
  }, [selectedImages, customStyle, onBatchRegenerate])

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600'
    if (quality >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getImpactBadgeVariant = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low': return 'secondary'
      case 'medium': return 'default'
      case 'high': return 'destructive'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with batch controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Image Regeneration</h3>
          {images.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedImages.size === images.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select All ({selectedImages.size}/{images.length})
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedImages.size > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab('batch')
                setIsDialogOpen(true)
              }}
            >
              <Layers className="w-4 h-4 mr-2" />
              Batch Regenerate ({selectedImages.size})
            </Button>
          )}
        </div>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedImages.has(image.id)}
                    onCheckedChange={(checked) => handleImageSelect(image.id, checked as boolean)}
                  />
                  <CardTitle className="text-sm capitalize">
                    {image.metadata.type} Image
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedImage(image)
                    setActiveTab('single')
                    setIsDialogOpen(true)
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-2">
                <img
                  src={image.base64}
                  alt={`Generated ${image.metadata.type}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {image.metadata.content}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    {image.metadata.style.lineWeight}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {image.metadata.style.layout}
                  </Badge>
                  {image.metadata.style.annotations && (
                    <Badge variant="outline" className="text-xs">
                      annotated
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Regeneration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'single' ? 'Regenerate Image' : `Batch Regenerate ${selectedImages.size} Images`}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="single" disabled={!selectedImage}>
                Single Image
              </TabsTrigger>
              <TabsTrigger value="batch" disabled={selectedImages.size === 0}>
                Batch ({selectedImages.size})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              {selectedImage && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Original Image</h4>
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                      <img
                        src={selectedImage.base64}
                        alt="Original"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedImage.metadata.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {selectedImage.metadata.style.lineWeight}
                        </Badge>
                        <Badge variant="outline">
                          {selectedImage.metadata.style.layout}
                        </Badge>
                        <Badge variant="outline">
                          {selectedImage.metadata.style.colorScheme}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Preview</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generatePreview}
                        disabled={isGeneratingPreview}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                      </Button>
                    </div>
                    
                    {preview ? (
                      <div className="space-y-4">
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                          <img
                            src={preview.previewImage.base64}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Estimated Quality:</span>
                            <span className={`text-sm font-semibold ${getQualityColor(preview.estimatedQuality)}`}>
                              {Math.round(preview.estimatedQuality * 100)}%
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Change Impact:</span>
                            <Badge variant={getImpactBadgeVariant(preview.styleComparison.impact)}>
                              {preview.styleComparison.impact}
                            </Badge>
                          </div>
                          
                          {preview.styleComparison.differences.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium">Changes:</span>
                              {preview.styleComparison.differences.map((diff, index) => (
                                <p key={index} className="text-xs text-muted-foreground">
                                  {diff.description}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Generate a preview to see changes</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="batch" className="space-y-4">
              {batchProgress ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {batchProgress.completed}/{batchProgress.total}
                      </span>
                    </div>
                    <Progress 
                      value={(batchProgress.completed / batchProgress.total) * 100} 
                      className="w-full"
                    />
                  </div>
                  
                  {batchProgress.results.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium">Results</h5>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {batchProgress.results.map((result) => (
                          <div key={result.imageId} className="flex items-center gap-2 text-sm">
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="flex-1">
                              {images.find(img => img.id === result.imageId)?.metadata.type || 'Unknown'} Image
                            </span>
                            <span className="text-muted-foreground">
                              {result.processingTime}ms
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Ready to regenerate {selectedImages.size} images with the selected style.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Style Configuration */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Style Configuration
            </h4>
            
            {/* Style Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Style Presets</label>
              <Select value={selectedPreset} onValueChange={handlePresetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a preset or customize below" />
                </SelectTrigger>
                <SelectContent>
                  {stylePresets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      <div className="flex flex-col">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Style Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Line Weight
                </label>
                <Select
                  value={customStyle.lineWeight}
                  onValueChange={(value) => setCustomStyle(prev => ({ 
                    ...prev, 
                    lineWeight: value as FlatLineStyle['lineWeight'] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thin">Thin</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="thick">Thick</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color Scheme
                </label>
                <Select
                  value={customStyle.colorScheme}
                  onValueChange={(value) => setCustomStyle(prev => ({ 
                    ...prev, 
                    colorScheme: value as FlatLineStyle['colorScheme'] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="minimal-color">Minimal Color</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Layout
                </label>
                <Select
                  value={customStyle.layout}
                  onValueChange={(value) => setCustomStyle(prev => ({ 
                    ...prev, 
                    layout: value as FlatLineStyle['layout'] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Annotations</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={customStyle.annotations}
                    onCheckedChange={(checked) => setCustomStyle(prev => ({ 
                      ...prev, 
                      annotations: checked as boolean 
                    }))}
                  />
                  <span className="text-sm">Include annotations</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {activeTab === 'single' ? (
              <Button
                onClick={regenerateSingleImage}
                disabled={isRegenerating || !selectedImage}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isRegenerating ? 'Regenerating...' : 'Regenerate Image'}
              </Button>
            ) : (
              <Button
                onClick={regenerateBatchImages}
                disabled={isRegenerating || selectedImages.size === 0}
              >
                <Layers className="w-4 h-4 mr-2" />
                {isRegenerating ? 'Processing...' : `Regenerate ${selectedImages.size} Images`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}