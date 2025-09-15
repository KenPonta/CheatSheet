'use client'

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Download, FileText, Globe, FileImage, Settings, Loader2 } from 'lucide-react'
import { EnhancedExportOptions } from '../backend/lib/content-modification/export-service'

interface ExportMaterialDialogProps {
  materialId: string
  materialTitle: string
  onExport?: (result: any) => void
  trigger?: React.ReactNode
}

export function ExportMaterialDialog({ 
  materialId, 
  materialTitle, 
  onExport,
  trigger 
}: ExportMaterialDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<EnhancedExportOptions>({
    format: 'html',
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
  })

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      const response = await fetch('/api/content-modification/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId,
          options: exportOptions
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const result = await response.json()
      
      if (result.success) {
        // Handle the export result
        const exportResult = result.result
        
        if (exportOptions.format === 'pdf') {
          // Download PDF file
          const pdfBlob = new Blob([
            Uint8Array.from(atob(exportResult.content), c => c.charCodeAt(0))
          ], { type: 'application/pdf' })
          
          const url = URL.createObjectURL(pdfBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = exportResult.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } else {
          // Download text file
          const blob = new Blob([exportResult.content], { 
            type: exportResult.contentType 
          })
          
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = exportResult.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }

        onExport?.(exportResult)
        setIsOpen(false)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const updateExportOptions = (updates: Partial<EnhancedExportOptions>) => {
    setExportOptions(prev => ({
      ...prev,
      ...updates
    }))
  }

  const updateFormatConfig = (format: string, config: any) => {
    setExportOptions(prev => ({
      ...prev,
      [`${format}Config`]: {
        ...prev[`${format}Config` as keyof EnhancedExportOptions],
        ...config
      }
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Study Material
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Export "{materialTitle}" in your preferred format
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Export Format
              </CardTitle>
              <CardDescription>
                Choose the output format for your study material
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={exportOptions.format}
                onValueChange={(value) => updateExportOptions({ format: value as any })}
                className="grid grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="html" id="html" />
                  <Label htmlFor="html" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="w-4 h-4" />
                    HTML
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="markdown" id="markdown" />
                  <Label htmlFor="markdown" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    Markdown
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                    <FileImage className="w-4 h-4" />
                    PDF
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* General Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={exportOptions.includeImages}
                  onCheckedChange={(checked) => 
                    updateExportOptions({ includeImages: checked as boolean })
                  }
                />
                <Label htmlFor="includeImages">Include generated images</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={exportOptions.includeMetadata}
                  onCheckedChange={(checked) => 
                    updateExportOptions({ includeMetadata: checked as boolean })
                  }
                />
                <Label htmlFor="includeMetadata">Include document metadata</Label>
              </div>
            </CardContent>
          </Card>

          {/* Format-specific Options */}
          {exportOptions.format === 'html' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  HTML Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={exportOptions.htmlConfig?.theme}
                      onValueChange={(value) => 
                        updateFormatConfig('html', { theme: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="embedSVG"
                      checked={exportOptions.htmlConfig?.embedSVG}
                      onCheckedChange={(checked) => 
                        updateFormatConfig('html', { embedSVG: checked })
                      }
                    />
                    <Label htmlFor="embedSVG">Embed SVG images directly</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCSS"
                      checked={exportOptions.htmlConfig?.includeCSS}
                      onCheckedChange={(checked) => 
                        updateFormatConfig('html', { includeCSS: checked })
                      }
                    />
                    <Label htmlFor="includeCSS">Include CSS styles</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="responsive"
                      checked={exportOptions.htmlConfig?.responsive}
                      onCheckedChange={(checked) => 
                        updateFormatConfig('html', { responsive: checked })
                      }
                    />
                    <Label htmlFor="responsive">Responsive design</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {exportOptions.format === 'markdown' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Markdown Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="imageFormat">Image Format</Label>
                    <Select
                      value={exportOptions.markdownConfig?.imageFormat}
                      onValueChange={(value) => 
                        updateFormatConfig('markdown', { imageFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base64">Base64 Inline</SelectItem>
                        <SelectItem value="reference">Reference Links</SelectItem>
                        <SelectItem value="inline">Inline Links</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="mathFormat">Math Format</Label>
                    <Select
                      value={exportOptions.markdownConfig?.mathFormat}
                      onValueChange={(value) => 
                        updateFormatConfig('markdown', { mathFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latex">LaTeX</SelectItem>
                        <SelectItem value="ascii">ASCII</SelectItem>
                        <SelectItem value="unicode">Unicode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTOC"
                    checked={exportOptions.markdownConfig?.includeTableOfContents}
                    onCheckedChange={(checked) => 
                      updateFormatConfig('markdown', { includeTableOfContents: checked })
                    }
                  />
                  <Label htmlFor="includeTOC">Include table of contents</Label>
                </div>
              </CardContent>
            </Card>
          )}

          {exportOptions.format === 'pdf' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  PDF Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paperSize">Paper Size</Label>
                    <Select
                      value={exportOptions.pdfConfig?.paperSize}
                      onValueChange={(value) => 
                        updateFormatConfig('pdf', { paperSize: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="a3">A3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="orientation">Orientation</Label>
                    <Select
                      value={exportOptions.pdfConfig?.orientation}
                      onValueChange={(value) => 
                        updateFormatConfig('pdf', { orientation: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Select
                      value={exportOptions.pdfConfig?.fontSize}
                      onValueChange={(value) => 
                        updateFormatConfig('pdf', { fontSize: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeHeaders"
                      checked={exportOptions.pdfConfig?.includeHeaders}
                      onCheckedChange={(checked) => 
                        updateFormatConfig('pdf', { includeHeaders: checked })
                      }
                    />
                    <Label htmlFor="includeHeaders">Include headers</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeFooters"
                      checked={exportOptions.pdfConfig?.includeFooters}
                      onCheckedChange={(checked) => 
                        updateFormatConfig('pdf', { includeFooters: checked })
                      }
                    />
                    <Label htmlFor="includeFooters">Include footers</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportOptions.format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ExportMaterialDialog