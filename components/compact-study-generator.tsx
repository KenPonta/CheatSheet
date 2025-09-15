"use client"

import React, { useState, useCallback } from "react"
// Temporary fallback for Vercel deployment
const apiClient = {
  post: async (endpoint: string, data: any) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }
};
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Upload,
  FileText,
  ImageIcon,
  File,
  Loader2,
  CheckCircle,
  Brain,
  ArrowRight,
  Layout,
  Download,
  Eye,
  Sparkles,
  AlertTriangle,
  Settings,
  BookOpen,
  FileDown,
  Printer,
  RefreshCw,
  Edit3,
} from "lucide-react"

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
}

interface CompactStudyConfig {
  layout: 'compact' | 'standard';
  columns: 1 | 2 | 3;
  equations: 'all' | 'key' | 'minimal';
  examples: 'full' | 'summary' | 'references';
  answers: 'inline' | 'appendix' | 'separate';
  fontSize: string;
  margins: 'narrow' | 'normal' | 'wide';
  outputFormat: 'html' | 'pdf' | 'markdown' | 'all';
  paperSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  title?: string;
  // New image generation options
  enableImageGeneration?: boolean;
  imageGenerationConfig?: {
    generateForEquations?: boolean;
    generateForExamples?: boolean;
    generateForConcepts?: boolean;
    imageStyle?: {
      lineWeight?: 'thin' | 'medium' | 'thick';
      colorScheme?: 'monochrome' | 'minimal-color';
      layout?: 'horizontal' | 'vertical' | 'grid';
      annotations?: boolean;
    };
  };
  // Post-generation editing options
  enablePostGenerationEditing?: boolean;
  // Content quality verification
  enableContentVerification?: boolean;
}

interface ProcessingProgress {
  stage: 'processing' | 'extracting' | 'generating';
  progress: number;
  message: string;
}

interface ProcessingError {
  type: string;
  message: string;
  recoverable: boolean;
  suggestions?: string[];
}

interface CompactStudyResponse {
  success: boolean;
  message: string;
  html?: string;
  pdf?: string;
  markdown?: string;
  metadata: {
    generatedAt: string;
    format: string;
    sourceFiles: string[];
    stats: {
      totalSections: number;
      totalFormulas: number;
      totalExamples: number;
      estimatedPrintPages: number;
      totalImages?: number;
    };
    preservationScore: number;
  };
  warnings?: string[];
  errors?: string[];
  processingTime: number;
  // New fields for image generation and editing
  generatedImages?: any[];
  editingEnabled?: boolean;
  studyMaterialId?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
  if (fileType.includes("pdf") || fileType.includes("word"))
    return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}

export function CompactStudyGenerator() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [config, setConfig] = useState<CompactStudyConfig>({
    layout: 'compact',
    columns: 2,
    equations: 'all',
    examples: 'full',
    answers: 'inline',
    fontSize: '10pt',
    margins: 'narrow',
    outputFormat: 'html',
    paperSize: 'a4',
    orientation: 'portrait',
    title: 'Compact Study Guide',
    // New default settings
    enableImageGeneration: true,
    imageGenerationConfig: {
      generateForEquations: true,
      generateForExamples: true,
      generateForConcepts: false,
      imageStyle: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: true
      }
    },
    enablePostGenerationEditing: true,
    enableContentVerification: true
  })
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [results, setResults] = useState<CompactStudyResponse | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter((file) => Object.keys(ACCEPTED_FILE_TYPES).includes(file.type))
    const invalidFiles = files.filter((file) => !Object.keys(ACCEPTED_FILE_TYPES).includes(file.type))

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(f => f.name).join(', ')
      const processingError: ProcessingError = {
        type: 'file_processing',
        message: `Unsupported file format(s): ${invalidFileNames}. Please use PDF, Word, or text files.`,
        recoverable: true,
        suggestions: [
          'Use supported formats: PDF (.pdf), Word (.docx), or Text (.txt)',
          'Check that files are not corrupted',
          'Convert files to supported formats if needed'
        ]
      }
      setProcessingErrors([processingError])
    }

    setUploadedFiles((prev) => [...prev, ...validFiles])
    setShowConfiguration(false)
    setShowResults(false)
    setResults(null)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
    setShowConfiguration(false)
    setShowResults(false)
    setResults(null)
  }, [])

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setShowConfiguration(false)
    setShowResults(false)
    setResults(null)
  }

  const handleConfigChange = (key: keyof CompactStudyConfig, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const proceedToConfiguration = () => {
    setShowConfiguration(true)
  }

  const generateCompactStudy = async () => {
    if (uploadedFiles.length === 0) return

    setIsProcessing(true)
    setProcessingProgress({
      stage: 'processing',
      progress: 0,
      message: 'Processing files...'
    })
    setProcessingErrors([])
    setWarnings([])

    try {
      // Convert files to base64
      const filesData = await Promise.all(
        uploadedFiles.map(async (file) => {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          
          // Determine file type for processing
          let fileType: 'probability' | 'relations' | 'general' = 'general'
          if (file.name.toLowerCase().includes('probability') || file.name.toLowerCase().includes('prob')) {
            fileType = 'probability'
          } else if (file.name.toLowerCase().includes('relation') || file.name.toLowerCase().includes('rel')) {
            fileType = 'relations'
          }

          return {
            name: file.name,
            type: fileType,
            content: base64
          }
        })
      )

      setProcessingProgress({
        stage: 'extracting',
        progress: 30,
        message: 'Extracting mathematical content...'
      })

      const requestData = {
        files: filesData,
        config: {
          ...config,
          enableProgressTracking: true,
          enableErrorRecovery: true
        }
      }

      setProcessingProgress({
        stage: 'generating',
        progress: 60,
        message: 'Generating compact study guide...'
      })

      const data: CompactStudyResponse = await apiClient.post("/api/generate-compact-study", requestData)
      
      setResults(data)
      setShowResults(true)
      
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings)
      }

      setProcessingProgress({
        stage: 'generating',
        progress: 100,
        message: `Generated ${data.metadata.stats.estimatedPrintPages} page compact study guide`
      })
    } catch (error) {
      console.error("Error generating compact study guide:", error)
      const processingError: ProcessingError = {
        type: 'generation',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        recoverable: true,
        suggestions: ['Try uploading fewer files', 'Check file formats are supported', 'Try different configuration settings']
      }
      setProcessingErrors([processingError])
    } finally {
      setIsProcessing(false)
      setTimeout(() => setProcessingProgress(null), 3000)
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadHTML = () => {
    if (results?.html) {
      downloadFile(results.html, "compact-study-guide.html", "text/html")
    }
  }

  const downloadPDF = () => {
    if (results?.pdf) {
      try {
        // Convert base64 to binary data using browser-compatible method
        const binaryString = atob(results.pdf)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "compact-study-guide.pdf"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Failed to download PDF:', error)
        // Show user-friendly error message
        setProcessingErrors(prev => [...prev, {
          type: 'download',
          message: 'Failed to download PDF. The file may be corrupted.',
          recoverable: true,
          suggestions: ['Try generating the study guide again', 'Use HTML or Markdown format instead']
        }])
      }
    }
  }

  const downloadMarkdown = () => {
    if (results?.markdown) {
      downloadFile(results.markdown, "compact-study-guide.md", "text/markdown")
    }
  }

  const printStudyGuide = () => {
    if (results?.html) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(results.html)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
    }
  }

  const createNewStudyGuide = () => {
    setUploadedFiles([])
    setShowConfiguration(false)
    setShowResults(false)
    setResults(null)
    setProcessingProgress(null)
    setProcessingErrors([])
    setWarnings([])
    setConfig({
      layout: 'compact',
      columns: 2,
      equations: 'all',
      examples: 'full',
      answers: 'inline',
      fontSize: '10pt',
      margins: 'narrow',
      outputFormat: 'html',
      paperSize: 'a4',
      orientation: 'portrait',
      title: 'Compact Study Guide',
      enableImageGeneration: true,
      imageGenerationConfig: {
        generateForEquations: true,
        generateForExamples: true,
        generateForConcepts: false,
        imageStyle: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        }
      },
      enablePostGenerationEditing: true,
      enableContentVerification: true
    })
  }

  const openStudyMaterialEditor = (studyMaterialId: string) => {
    // Navigate to the study material editor with the generated content
    console.log('Opening study material editor for:', studyMaterialId)
    
    // Navigate to the editor page
    window.open(`/edit-study-material/${studyMaterialId}`, '_blank')
  }

  const clearCache = async () => {
    try {
      const result = await apiClient.post('/api/generate-compact-study/clear-cache', {});
      
      if (result.success) {
        setWarnings(prev => [...prev, 'File processing cache cleared successfully']);
      } else {
        setProcessingErrors(prev => [...prev, {
          type: 'system',
          message: 'Failed to clear cache: ' + result.message,
          recoverable: true,
          suggestions: ['Try refreshing the page', 'Contact support if the issue persists']
        }]);
      }
    } catch (error) {
      setProcessingErrors(prev => [...prev, {
        type: 'system',
        message: 'Failed to clear cache: ' + (error instanceof Error ? error.message : 'Unknown error'),
        recoverable: true,
        suggestions: ['Check your internet connection', 'Try refreshing the page']
      }]);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {/* Header content removed to avoid duplication with main page header */}
            </div>
            {(showConfiguration || showResults) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Files Uploaded</span>
                {showConfiguration && (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <Settings className="h-4 w-4 text-blue-600" />
                    <span>Configuration</span>
                  </>
                )}
                {showResults && (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Study Guide Generated!</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Progress Indicator */}
          {processingProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">{processingProgress.message}</span>
                    <span className="text-sm text-blue-600">{processingProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {processingErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Processing Errors</h3>
              </div>
              <div className="space-y-3">
                {processingErrors.map((error, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-sm font-medium text-red-700">{error.message}</p>
                    {error.suggestions && error.suggestions.length > 0 && (
                      <div className="text-sm text-red-600">
                        <p className="font-medium">Suggestions:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {error.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Warnings</h3>
              </div>
              <ul className="space-y-1 text-sm text-yellow-700">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}  
        {/* Results Display */}
          {showResults && results && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6 text-green-600" />
                  <h2 className="font-serif text-2xl font-bold text-green-800">Compact Study Guide Generated!</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-800">Content Statistics</h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>📚 {results.metadata.stats.totalSections} sections organized</p>
                      <p>🧮 {results.metadata.stats.totalFormulas} formulas preserved</p>
                      <p>💡 {results.metadata.stats.totalExamples} worked examples included</p>
                      {results.metadata.stats.totalImages && results.metadata.stats.totalImages > 0 && (
                        <p>🎨 {results.metadata.stats.totalImages} flat-line images generated</p>
                      )}
                      <p>📄 {results.metadata.stats.estimatedPrintPages} estimated print pages</p>
                      <p>✅ {Math.round(results.metadata.preservationScore * 100)}% content preservation</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-800">Generation Details</h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>⚡ Generated in {(results.processingTime / 1000).toFixed(1)}s</p>
                      <p>📋 {config.layout} layout with {config.columns} columns</p>
                      <p>🔤 {config.fontSize} font, {config.margins} margins</p>
                      <p>📐 {config.paperSize?.toUpperCase()} {config.orientation}</p>
                      <p>🎯 {config.equations} equations, {config.examples} examples</p>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {results.editingEnabled && results.studyMaterialId && (
                    <Button 
                      onClick={() => openStudyMaterialEditor(results.studyMaterialId!)} 
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Study Material
                    </Button>
                  )}
                  
                  {/* Show editing instructions if editing is enabled */}
                  {results.editingEnabled && results.studyMaterialId && (
                    <div className="w-full mt-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <p className="text-blue-800 font-medium mb-1">✨ Your study guide is ready for editing!</p>
                        <p className="text-blue-700">
                          Click "Edit Study Material" to customize sections, regenerate images, modify content, and export in different formats.
                        </p>
                      </div>
                    </div>
                  )}
                  {results.html && (
                    <>
                      <Button onClick={printStudyGuide} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Printer className="h-4 w-4" />
                        Print Study Guide
                      </Button>
                      <Button onClick={downloadHTML} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download HTML
                      </Button>
                    </>
                  )}
                  {results.pdf && (
                    <Button onClick={downloadPDF} variant="outline" className="gap-2">
                      <FileDown className="h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                  {results.markdown && (
                    <Button onClick={downloadMarkdown} variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Download Markdown
                    </Button>
                  )}
                  <Button onClick={createNewStudyGuide} variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Create New Guide
                  </Button>
                  <Button onClick={clearCache} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Clear Cache
                  </Button>
                </div>

                {/* Preview */}
                {results.html && (
                  <div className="border border-green-300 rounded-lg overflow-hidden">
                    <div className="bg-green-100 px-4 py-2 border-b border-green-300">
                      <h4 className="font-semibold text-sm text-green-800">Compact Layout Preview</h4>
                      <p className="text-xs text-green-600">Dense, academic-style formatting without card components</p>
                    </div>
                    <div className="bg-white">
                      <iframe
                        srcDoc={results.html}
                        className="w-full h-[600px] border-0"
                        title="Compact Study Guide Preview"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configuration Panel */}
          {showConfiguration && !showResults && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-6 w-6 text-blue-600" />
                  <h2 className="font-serif text-2xl font-bold text-blue-800">Configure Compact Layout</h2>
                </div>
                <p className="text-blue-700 mb-6">
                  Customize the dense, academic formatting for your study guide. All settings optimize for maximum content density.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Layout Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2">Layout & Typography</h3>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Layout Style</Label>
                      <RadioGroup
                        value={config.layout}
                        onValueChange={(value) => handleConfigChange("layout", value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="compact" id="compact" />
                          <Label htmlFor="compact" className="text-sm">Compact (Dense)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="standard" id="standard" />
                          <Label htmlFor="standard" className="text-sm">Standard</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Columns</Label>
                      <Select
                        value={config.columns.toString()}
                        onValueChange={(value) => handleConfigChange("columns", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Column</SelectItem>
                          <SelectItem value="2">2 Columns (Recommended)</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Font Size</Label>
                      <Select
                        value={config.fontSize}
                        onValueChange={(value) => handleConfigChange("fontSize", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9pt">9pt (Very Dense)</SelectItem>
                          <SelectItem value="10pt">10pt (Compact)</SelectItem>
                          <SelectItem value="11pt">11pt (Readable)</SelectItem>
                          <SelectItem value="12pt">12pt (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Margins</Label>
                      <RadioGroup
                        value={config.margins}
                        onValueChange={(value) => handleConfigChange("margins", value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="narrow" id="narrow" />
                          <Label htmlFor="narrow" className="text-sm">Narrow</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="normal" id="normal" />
                          <Label htmlFor="normal" className="text-sm">Normal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="wide" id="wide" />
                          <Label htmlFor="wide" className="text-sm">Wide</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Content Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2">Content & Output</h3>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Mathematical Equations</Label>
                      <Select
                        value={config.equations}
                        onValueChange={(value) => handleConfigChange("equations", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Equations</SelectItem>
                          <SelectItem value="key">Key Equations Only</SelectItem>
                          <SelectItem value="minimal">Minimal Set</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Worked Examples</Label>
                      <Select
                        value={config.examples}
                        onValueChange={(value) => handleConfigChange("examples", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Solutions</SelectItem>
                          <SelectItem value="summary">Summary Only</SelectItem>
                          <SelectItem value="references">References Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Answer Placement</Label>
                      <Select
                        value={config.answers}
                        onValueChange={(value) => handleConfigChange("answers", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inline">Inline with Problems</SelectItem>
                          <SelectItem value="appendix">Appendix</SelectItem>
                          <SelectItem value="separate">Separate Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Output Format</Label>
                      <Select
                        value={config.outputFormat}
                        onValueChange={(value) => handleConfigChange("outputFormat", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="html">HTML (Web Preview)</SelectItem>
                          <SelectItem value="pdf">PDF (Print Ready)</SelectItem>
                          <SelectItem value="markdown">Markdown (Pandoc)</SelectItem>
                          <SelectItem value="all">All Formats</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Image Generation Settings */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-4">Image Generation & Editing</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enableImageGeneration"
                        checked={config.enableImageGeneration}
                        onCheckedChange={(checked) => handleConfigChange("enableImageGeneration", checked)}
                      />
                      <Label htmlFor="enableImageGeneration" className="text-sm font-medium">
                        Generate flat-line visual representations
                      </Label>
                    </div>
                    
                    {config.enableImageGeneration && (
                      <div className="ml-6 space-y-4 p-4 bg-blue-25 rounded-lg border border-blue-100">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Generate Images For:</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="generateForEquations"
                                  checked={config.imageGenerationConfig?.generateForEquations}
                                  onCheckedChange={(checked) => 
                                    setConfig(prev => ({
                                      ...prev,
                                      imageGenerationConfig: {
                                        ...prev.imageGenerationConfig,
                                        generateForEquations: checked as boolean
                                      }
                                    }))
                                  }
                                />
                                <Label htmlFor="generateForEquations" className="text-sm">Equations & Formulas</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="generateForExamples"
                                  checked={config.imageGenerationConfig?.generateForExamples}
                                  onCheckedChange={(checked) => 
                                    setConfig(prev => ({
                                      ...prev,
                                      imageGenerationConfig: {
                                        ...prev.imageGenerationConfig,
                                        generateForExamples: checked as boolean
                                      }
                                    }))
                                  }
                                />
                                <Label htmlFor="generateForExamples" className="text-sm">Worked Examples</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="generateForConcepts"
                                  checked={config.imageGenerationConfig?.generateForConcepts}
                                  onCheckedChange={(checked) => 
                                    setConfig(prev => ({
                                      ...prev,
                                      imageGenerationConfig: {
                                        ...prev.imageGenerationConfig,
                                        generateForConcepts: checked as boolean
                                      }
                                    }))
                                  }
                                />
                                <Label htmlFor="generateForConcepts" className="text-sm">Concept Diagrams</Label>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Image Style:</Label>
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Line Weight</Label>
                                <Select
                                  value={config.imageGenerationConfig?.imageStyle?.lineWeight}
                                  onValueChange={(value) => 
                                    setConfig(prev => ({
                                      ...prev,
                                      imageGenerationConfig: {
                                        ...prev.imageGenerationConfig,
                                        imageStyle: {
                                          ...prev.imageGenerationConfig?.imageStyle,
                                          lineWeight: value as 'thin' | 'medium' | 'thick'
                                        }
                                      }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="thin">Thin</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="thick">Thick</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Color Scheme</Label>
                                <Select
                                  value={config.imageGenerationConfig?.imageStyle?.colorScheme}
                                  onValueChange={(value) => 
                                    setConfig(prev => ({
                                      ...prev,
                                      imageGenerationConfig: {
                                        ...prev.imageGenerationConfig,
                                        imageStyle: {
                                          ...prev.imageGenerationConfig?.imageStyle,
                                          colorScheme: value as 'monochrome' | 'minimal-color'
                                        }
                                      }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monochrome">Monochrome</SelectItem>
                                    <SelectItem value="minimal-color">Minimal Color</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enablePostGenerationEditing"
                        checked={config.enablePostGenerationEditing}
                        onCheckedChange={(checked) => handleConfigChange("enablePostGenerationEditing", checked)}
                      />
                      <Label htmlFor="enablePostGenerationEditing" className="text-sm font-medium">
                        Enable post-generation editing and customization
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Content Quality Verification */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-4">Content Quality & Verification</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enableContentVerification"
                        checked={config.enableContentVerification}
                        onCheckedChange={(checked) => handleConfigChange("enableContentVerification", checked)}
                      />
                      <Label htmlFor="enableContentVerification" className="text-sm font-medium">
                        AI-powered content quality verification
                      </Label>
                    </div>
                    
                    <div className="ml-6 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 mt-0.5 text-blue-600" />
                        <div>
                          <p className="font-medium mb-1">Intelligent Content Analysis</p>
                          <ul className="text-xs space-y-1 text-blue-600">
                            <li>• Removes repetitive bullet points and redundant information</li>
                            <li>• Converts meaningless lists into coherent explanations</li>
                            <li>• Ensures educational value and logical content flow</li>
                            <li>• Preserves all mathematical formulas and worked examples</li>
                            <li>• Improves overall study guide quality and usefulness</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paper Settings */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-4">Paper & Document Settings</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Paper Size</Label>
                      <Select
                        value={config.paperSize}
                        onValueChange={(value) => handleConfigChange("paperSize", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                          <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                          <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Orientation</Label>
                      <RadioGroup
                        value={config.orientation}
                        onValueChange={(value) => handleConfigChange("orientation", value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="portrait" id="portrait" />
                          <Label htmlFor="portrait" className="text-sm">Portrait</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="landscape" id="landscape" />
                          <Label htmlFor="landscape" className="text-sm">Landscape</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="title" className="text-sm font-medium">Document Title</Label>
                      <input
                        id="title"
                        type="text"
                        value={config.title || ''}
                        onChange={(e) => handleConfigChange("title", e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Compact Study Guide"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-blue-200 flex justify-center">
                  <Button 
                    onClick={generateCompactStudy} 
                    disabled={isProcessing}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        Generate Compact Study Guide
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          {!showConfiguration && !showResults && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <BookOpen className="h-16 w-16 text-blue-600 mx-auto" />
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground">Upload Academic Materials</h2>
                  <p className="text-muted-foreground mt-2">
                    Upload PDF files containing discrete probability and relations content to generate a compact study guide
                  </p>
                </div>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop your academic files here</p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, Word documents, and text files
                  </p>
                  <div className="pt-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Button variant="outline" className="gap-2" asChild>
                        <span>
                          <Upload className="h-4 w-4" />
                          Choose Files
                        </span>
                      </Button>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Uploaded Files ({uploadedFiles.length})</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.type)}
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button onClick={proceedToConfiguration} className="gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3">
                      <Settings className="h-4 w-4" />
                      Configure Layout
                    </Button>
                  </div>
                </div>
              )}

              {/* Feature Highlights */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 text-center">Compact Study Guide Features</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center space-y-2">
                    <Layout className="h-8 w-8 text-blue-600 mx-auto" />
                    <h4 className="font-medium">Dense Layout</h4>
                    <p className="text-muted-foreground">Two-column academic formatting with minimal spacing</p>
                  </div>
                  <div className="text-center space-y-2">
                    <Brain className="h-8 w-8 text-green-600 mx-auto" />
                    <h4 className="font-medium">Formula Preservation</h4>
                    <p className="text-muted-foreground">All mathematical content preserved with LaTeX rendering</p>
                  </div>
                  <div className="text-center space-y-2">
                    <FileText className="h-8 w-8 text-purple-600 mx-auto" />
                    <h4 className="font-medium">Multiple Formats</h4>
                    <p className="text-muted-foreground">Generate HTML, PDF, or Markdown outputs</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}