"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Download,
  FileText,
  FileDown,
  Globe,
  Printer,
  Eye,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react"

interface OutputFormat {
  id: 'html' | 'pdf' | 'markdown';
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  recommended: boolean;
  estimatedSize?: string;
  generationTime?: string;
}

interface OutputFormatSelectorProps {
  selectedFormats: string[];
  onFormatChange: (formats: string[]) => void;
  onDownload: (format: string) => void;
  onPreview?: (format: string) => void;
  availableOutputs?: {
    html?: string;
    pdf?: string;
    markdown?: string;
  };
  isGenerating?: boolean;
  generationProgress?: {
    format: string;
    progress: number;
    message: string;
  };
}

export function OutputFormatSelector({
  selectedFormats,
  onFormatChange,
  onDownload,
  onPreview,
  availableOutputs,
  isGenerating = false,
  generationProgress
}: OutputFormatSelectorProps) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [optimizeForPrint, setOptimizeForPrint] = useState(true)

  const outputFormats: OutputFormat[] = [
    {
      id: 'html',
      name: 'HTML',
      description: 'Web-optimized format with interactive features and MathJax rendering',
      icon: <Globe className="h-5 w-5" />,
      features: [
        'Interactive navigation',
        'MathJax equation rendering',
        'Responsive design',
        'Print-friendly CSS',
        'Cross-reference links'
      ],
      recommended: true,
      estimatedSize: '~150KB',
      generationTime: '~2s'
    },
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Print-ready format with LaTeX typesetting and professional layout',
      icon: <FileDown className="h-5 w-5" />,
      features: [
        'Professional typesetting',
        'LaTeX equation rendering',
        'Optimized for printing',
        'Consistent formatting',
        'Embedded fonts'
      ],
      recommended: true,
      estimatedSize: '~300KB',
      generationTime: '~5s'
    },
    {
      id: 'markdown',
      name: 'Markdown',
      description: 'Pandoc-compatible format for further processing and customization',
      icon: <FileText className="h-5 w-5" />,
      features: [
        'Pandoc compatibility',
        'LaTeX math notation',
        'Easy customization',
        'Version control friendly',
        'Template support'
      ],
      recommended: false,
      estimatedSize: '~50KB',
      generationTime: '~1s'
    }
  ]

  const handleFormatToggle = (formatId: string, checked: boolean) => {
    if (checked) {
      onFormatChange([...selectedFormats, formatId])
    } else {
      onFormatChange(selectedFormats.filter(f => f !== formatId))
    }
  }

  const handleSelectAll = () => {
    onFormatChange(outputFormats.map(f => f.id))
  }

  const handleSelectRecommended = () => {
    onFormatChange(outputFormats.filter(f => f.recommended).map(f => f.id))
  }

  const handleClearAll = () => {
    onFormatChange([])
  }

  const getFormatStatus = (formatId: string) => {
    if (isGenerating && generationProgress?.format === formatId) {
      return 'generating'
    }
    if (availableOutputs?.[formatId as keyof typeof availableOutputs]) {
      return 'ready'
    }
    if (selectedFormats.includes(formatId)) {
      return 'selected'
    }
    return 'available'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'selected':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generating':
        return 'Generating...'
      case 'ready':
        return 'Ready for download'
      case 'selected':
        return 'Selected for generation'
      default:
        return 'Available'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-6 w-6 text-purple-600" />
          <h2 className="font-serif text-xl font-bold text-purple-800">Output Format Selection</h2>
        </div>
        <p className="text-purple-700 mb-6">
          Choose your preferred output formats. Each format is optimized for different use cases and provides unique features.
        </p>

        {/* Quick Selection Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={handleSelectRecommended} variant="outline" size="sm" className="gap-2">
            <Zap className="h-4 w-4" />
            Select Recommended
          </Button>
          <Button onClick={handleSelectAll} variant="outline" size="sm">
            Select All
          </Button>
          <Button onClick={handleClearAll} variant="outline" size="sm">
            Clear All
          </Button>
          <Button 
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} 
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {showAdvancedOptions ? 'Hide' : 'Show'} Advanced
          </Button>
        </div>

        {/* Format Selection Grid */}
        <div className="grid md:grid-cols-1 gap-4 mb-6">
          {outputFormats.map((format) => {
            const status = getFormatStatus(format.id)
            const isSelected = selectedFormats.includes(format.id)
            const isAvailable = availableOutputs?.[format.id]

            return (
              <div
                key={format.id}
                className={`border rounded-lg p-4 transition-all ${
                  isSelected 
                    ? 'border-purple-300 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <Checkbox
                      id={format.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleFormatToggle(format.id, checked as boolean)}
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Format Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {format.icon}
                      <h3 className="font-semibold text-lg">{format.name}</h3>
                      {format.recommended && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Recommended
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        {getStatusIcon(status)}
                        <span className="text-sm text-gray-600">{getStatusText(status)}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-3">{format.description}</p>

                    {/* Features */}
                    <div className="mb-3">
                      <h4 className="font-medium text-sm mb-2">Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {format.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Size: {format.estimatedSize}</span>
                      <span>Generation: {format.generationTime}</span>
                    </div>

                    {/* Generation Progress */}
                    {status === 'generating' && generationProgress && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">
                            {generationProgress.message}
                          </span>
                          <span className="text-sm text-blue-600">
                            {generationProgress.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${generationProgress.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {isAvailable && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={() => onDownload(format.id)}
                          size="sm"
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download {format.name}
                        </Button>
                        {onPreview && format.id === 'html' && (
                          <Button
                            onClick={() => onPreview(format.id)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        )}
                        {format.id === 'html' && (
                          <Button
                            onClick={() => {
                              if (availableOutputs?.html) {
                                const printWindow = window.open("", "_blank")
                                if (printWindow) {
                                  printWindow.document.write(availableOutputs.html)
                                  printWindow.document.close()
                                  printWindow.focus()
                                  printWindow.print()
                                }
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-4">Advanced Output Options</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Compression Level</Label>
                  <RadioGroup
                    value={compressionLevel}
                    onValueChange={(value: any) => setCompressionLevel(value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="text-sm">Low (Faster)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="text-sm">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="text-sm">High (Smaller)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Additional Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="metadata"
                        checked={includeMetadata}
                        onCheckedChange={setIncludeMetadata}
                      />
                      <Label htmlFor="metadata" className="text-sm">Include generation metadata</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="print-optimize"
                        checked={optimizeForPrint}
                        onCheckedChange={setOptimizeForPrint}
                      />
                      <Label htmlFor="print-optimize" className="text-sm">Optimize for printing</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection Summary */}
        {selectedFormats.length > 0 && (
          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-3">Selected Formats Summary</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedFormats.map((formatId) => {
                const format = outputFormats.find(f => f.id === formatId)
                return format ? (
                  <Badge key={formatId} className="bg-purple-100 text-purple-800 border-purple-200">
                    {format.name}
                  </Badge>
                ) : null
              })}
            </div>
            <div className="text-sm text-gray-600">
              <p>
                Total estimated size: ~{
                  selectedFormats.reduce((total, formatId) => {
                    const format = outputFormats.find(f => f.id === formatId)
                    const size = format?.estimatedSize?.match(/\d+/)?.[0] || '0'
                    return total + parseInt(size)
                  }, 0)
                }KB
              </p>
              <p>
                Estimated generation time: ~{
                  Math.max(...selectedFormats.map(formatId => {
                    const format = outputFormats.find(f => f.id === formatId)
                    const time = format?.generationTime?.match(/\d+/)?.[0] || '0'
                    return parseInt(time)
                  }))
                }s
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}