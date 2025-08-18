"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  FileImage,
  Download,
  Eye,
  Sparkles,
} from "lucide-react"

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
}

interface ExtractedTopic {
  topic: string
  content: string
  confidence: number
  source: string
}

interface SelectedTopic extends ExtractedTopic {
  id: string
  selected: boolean
  customContent?: string
}

interface CheatSheetConfig {
  paperSize: string
  orientation: string
  columns: number
  fontSize: string
  referenceText: string
  referenceImage: File | null
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
  if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("powerpoint"))
    return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200"
  if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-gray-100 text-gray-800 border-gray-200"
}

export default function CheatSheetCreator() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedTopics, setExtractedTopics] = useState<ExtractedTopic[]>([])
  const [extractionComplete, setExtractionComplete] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([])
  const [showTopicSelection, setShowTopicSelection] = useState(false)
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [showCustomization, setShowCustomization] = useState(false)
  const [cheatSheetConfig, setCheatSheetConfig] = useState<CheatSheetConfig>({
    paperSize: "a4",
    orientation: "portrait",
    columns: 2,
    fontSize: "small",
    referenceText: "",
    referenceImage: null,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCheatSheet, setGeneratedCheatSheet] = useState<string | null>(null)
  const [showCheatSheet, setShowCheatSheet] = useState(false)

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

    setUploadedFiles((prev) => [...prev, ...validFiles])
    setExtractionComplete(false)
    setExtractedTopics([])
    setSelectedTopics([])
    setShowTopicSelection(false)
    setShowCustomization(false)
    setShowCheatSheet(false)
    setGeneratedCheatSheet(null)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
    setExtractionComplete(false)
    setExtractedTopics([])
    setSelectedTopics([])
    setShowTopicSelection(false)
    setShowCustomization(false)
    setShowCheatSheet(false)
    setGeneratedCheatSheet(null)
  }, [])

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setExtractionComplete(false)
    setExtractedTopics([])
    setSelectedTopics([])
    setShowTopicSelection(false)
    setShowCustomization(false)
    setShowCheatSheet(false)
    setGeneratedCheatSheet(null)
  }

  const extractTopics = async () => {
    if (uploadedFiles.length === 0) return

    setIsExtracting(true)
    try {
      const formData = new FormData()
      uploadedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/extract-topics", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to extract topics")
      }

      const data = await response.json()
      setExtractedTopics(data.topics)
      setExtractionComplete(true)

      const initialSelectedTopics: SelectedTopic[] = data.topics.map((topic: ExtractedTopic, index: number) => ({
        ...topic,
        id: `topic-${index}`,
        selected: true,
      }))
      setSelectedTopics(initialSelectedTopics)
    } catch (error) {
      console.error("Error extracting topics:", error)
    } finally {
      setIsExtracting(false)
    }
  }

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.map((topic) => (topic.id === topicId ? { ...topic, selected: !topic.selected } : topic)),
    )
  }

  const updateTopicContent = (topicId: string, newContent: string) => {
    setSelectedTopics((prev) =>
      prev.map((topic) => (topic.id === topicId ? { ...topic, customContent: newContent } : topic)),
    )
  }

  const proceedToTopicSelection = () => {
    setShowTopicSelection(true)
  }

  const proceedToCustomization = () => {
    setShowCustomization(true)
  }

  const handleConfigChange = (key: keyof CheatSheetConfig, value: string | number | File | null) => {
    setCheatSheetConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      handleConfigChange("referenceImage", file)
    }
  }

  const generateCheatSheet = async () => {
    const finalTopics = selectedTopics.filter((t) => t.selected)

    if (finalTopics.length === 0) {
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-cheatsheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topics: finalTopics.map((topic) => ({
            topic: topic.topic,
            content: topic.content,
            customContent: topic.customContent,
          })),
          config: {
            paperSize: cheatSheetConfig.paperSize,
            orientation: cheatSheetConfig.orientation,
            columns: cheatSheetConfig.columns,
            fontSize: cheatSheetConfig.fontSize,
            referenceText: cheatSheetConfig.referenceText,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate cheat sheet")
      }

      const data = await response.json()
      setGeneratedCheatSheet(data.html)
      setShowCheatSheet(true)
    } catch (error) {
      console.error("Error generating cheat sheet:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadCheatSheet = () => {
    if (!generatedCheatSheet) return

    const blob = new Blob([generatedCheatSheet], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cheat-sheet.html"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const printCheatSheet = () => {
    if (!generatedCheatSheet) return

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(generatedCheatSheet)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  const createNewCheatSheet = () => {
    setUploadedFiles([])
    setExtractedTopics([])
    setSelectedTopics([])
    setExtractionComplete(false)
    setShowTopicSelection(false)
    setShowCustomization(false)
    setShowCheatSheet(false)
    setGeneratedCheatSheet(null)
    setCheatSheetConfig({
      paperSize: "a4",
      orientation: "portrait",
      columns: 2,
      fontSize: "small",
      referenceText: "",
      referenceImage: null,
    })
  }

  const getSelectedTopicsCount = () => {
    return selectedTopics.filter((topic) => topic.selected).length
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">CheatSheet Creator</h1>
              <p className="text-muted-foreground mt-1">Transform your documents into study aids</p>
            </div>
            {(extractionComplete || showTopicSelection || showCustomization || showCheatSheet) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Topics Extracted</span>
                {(showTopicSelection || showCustomization || showCheatSheet) && (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Topics Selected</span>
                  </>
                )}
                {(showCustomization || showCheatSheet) && (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Layout Configured</span>
                  </>
                )}
                {showCheatSheet && (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Cheat Sheet Generated!</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {showCheatSheet && generatedCheatSheet && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <CardTitle className="font-serif text-2xl">Your Cheat Sheet is Ready!</CardTitle>
                </div>
                <CardDescription>
                  Preview your generated cheat sheet below. You can download it as an HTML file or print it directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={printCheatSheet} variant="default" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Print Preview
                  </Button>
                  <Button onClick={downloadCheatSheet} variant="outline" className="gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Download HTML
                  </Button>
                  <Button onClick={createNewCheatSheet} variant="outline" className="gap-2 bg-transparent">
                    <Upload className="h-4 w-4" />
                    Create New Cheat Sheet
                  </Button>
                </div>

                {/* Preview */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 border-b border-border">
                    <h4 className="font-semibold text-sm">Preview</h4>
                  </div>
                  <div className="bg-white">
                    <iframe
                      srcDoc={generatedCheatSheet}
                      className="w-full h-[600px] border-0"
                      title="Cheat Sheet Preview"
                    />
                  </div>
                </div>

                {/* Generation Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Generation Complete</h4>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>✓ {getSelectedTopicsCount()} topics included</p>
                    <p>
                      ✓ {cheatSheetConfig.paperSize.toUpperCase()} {cheatSheetConfig.orientation} format
                    </p>
                    <p>✓ {cheatSheetConfig.columns} column layout</p>
                    <p>✓ {cheatSheetConfig.fontSize} font size</p>
                    {cheatSheetConfig.referenceText && <p>✓ Reference materials included</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showCustomization && !showCheatSheet && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary" />
                  <CardTitle className="font-serif text-2xl">Customize Your Cheat Sheet</CardTitle>
                </div>
                <CardDescription>
                  Configure the layout, paper size, and add reference materials for your cheat sheet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paper Size and Orientation */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Paper Size</Label>
                    <Select
                      value={cheatSheetConfig.paperSize}
                      onValueChange={(value) => handleConfigChange("paperSize", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select paper size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                        <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                        <SelectItem value="a3">A3 (297 × 420 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Orientation</Label>
                    <RadioGroup
                      value={cheatSheetConfig.orientation}
                      onValueChange={(value) => handleConfigChange("orientation", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="portrait" id="portrait" />
                        <Label htmlFor="portrait">Portrait</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="landscape" id="landscape" />
                        <Label htmlFor="landscape">Landscape</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Layout Options */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Number of Columns</Label>
                    <Select
                      value={cheatSheetConfig.columns.toString()}
                      onValueChange={(value) => handleConfigChange("columns", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select columns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Column</SelectItem>
                        <SelectItem value="2">2 Columns</SelectItem>
                        <SelectItem value="3">3 Columns</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Font Size</Label>
                    <Select
                      value={cheatSheetConfig.fontSize}
                      onValueChange={(value) => handleConfigChange("fontSize", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (8pt)</SelectItem>
                        <SelectItem value="medium">Medium (10pt)</SelectItem>
                        <SelectItem value="large">Large (12pt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reference Materials */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Reference Materials (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Add reference content or upload an existing cheat sheet for inspiration.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reference-text" className="text-sm font-medium">
                        Reference Text
                      </Label>
                      <Textarea
                        id="reference-text"
                        placeholder="Paste any reference text, formulas, or notes you want to include..."
                        value={cheatSheetConfig.referenceText}
                        onChange={(e) => handleConfigChange("referenceText", e.target.value)}
                        className="mt-2 min-h-[100px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reference-image" className="text-sm font-medium">
                        Reference Image
                      </Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center">
                        {cheatSheetConfig.referenceImage ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileImage className="h-5 w-5 text-primary" />
                              <span className="text-sm font-medium">{cheatSheetConfig.referenceImage.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfigChange("referenceImage", null)}
                              className="text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <>
                            <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Upload an existing cheat sheet or reference image
                            </p>
                            <input
                              type="file"
                              id="reference-image"
                              accept="image/jpeg,image/png"
                              onChange={handleReferenceImageUpload}
                              className="hidden"
                            />
                            <Button variant="outline" size="sm" asChild>
                              <label htmlFor="reference-image" className="cursor-pointer">
                                Choose Image
                              </label>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Topics Preview */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Selected Topics Preview</Label>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Your cheat sheet will include {getSelectedTopicsCount()} topics:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopics
                        .filter((topic) => topic.selected)
                        .map((topic) => (
                          <Badge key={topic.id} variant="secondary" className="text-xs">
                            {topic.topic}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowCustomization(false)}>
                    Back to Topic Selection
                  </Button>
                  <Button onClick={generateCheatSheet} size="lg" className="px-8" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Cheat Sheet
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!showCustomization && !showTopicSelection && !showCheatSheet && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Choose Paper Size</CardTitle>
                  <CardDescription>Select your preferred paper size before uploading documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Paper Size</Label>
                      <Select
                        value={cheatSheetConfig.paperSize}
                        onValueChange={(value) => handleConfigChange("paperSize", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select paper size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                          <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                          <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                          <SelectItem value="a3">A3 (297 × 420 mm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Orientation</Label>
                      <RadioGroup
                        value={cheatSheetConfig.orientation}
                        onValueChange={(value) => handleConfigChange("orientation", value)}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="portrait" id="portrait-early" />
                          <Label htmlFor="portrait-early">Portrait</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="landscape" id="landscape-early" />
                          <Label htmlFor="landscape-early">Landscape</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      <span className="font-medium text-foreground">
                        {cheatSheetConfig.paperSize.toUpperCase()} {cheatSheetConfig.orientation}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Upload Your Documents</CardTitle>
                  <CardDescription>Support for Word, PowerPoint, PDF, TXT, JPG, and PNG files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
                    <p className="text-muted-foreground mb-4">
                      Drag and drop your files here, or click the button below to select files
                    </p>
                    <input
                      type="file"
                      multiple
                      accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(",")}
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Select Files
                      </label>
                    </Button>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Uploaded Files ({uploadedFiles.length})</h4>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              {getFileIcon(file.type)}
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && !extractionComplete && (
                    <div className="mt-6 flex justify-center">
                      <Button size="lg" className="px-8" onClick={extractTopics} disabled={isExtracting}>
                        {isExtracting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extracting Topics...
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-4 w-4" />
                            Extract Topics from Files
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {showTopicSelection && selectedTopics.length > 0 && !showCustomization && !showCheatSheet && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="font-serif text-2xl">Select Topics for Your Cheat Sheet</CardTitle>
                </div>
                <CardDescription>
                  Choose which topics to include and customize their content. You have {getSelectedTopicsCount()} of{" "}
                  {selectedTopics.length} topics selected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`border rounded-lg p-4 transition-all ${
                        topic.selected ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={topic.id}
                          checked={topic.selected}
                          onCheckedChange={() => toggleTopicSelection(topic.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <label
                              htmlFor={topic.id}
                              className={`font-semibold text-lg cursor-pointer ${
                                topic.selected ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {topic.topic}
                            </label>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getConfidenceColor(topic.confidence)}`}>
                                {Math.round(topic.confidence * 100)}% confidence
                              </Badge>
                              {topic.selected && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingTopic(editingTopic === topic.id ? null : topic.id)}
                                  className="text-xs"
                                >
                                  {editingTopic === topic.id ? "Done" : "Edit"}
                                </Button>
                              )}
                            </div>
                          </div>

                          {editingTopic === topic.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={topic.customContent || topic.content}
                                onChange={(e) => updateTopicContent(topic.id, e.target.value)}
                                placeholder="Edit the content for this topic..."
                                className="min-h-[100px]"
                              />
                              <p className="text-xs text-muted-foreground">
                                Customize this content to better fit your cheat sheet needs.
                              </p>
                            </div>
                          ) : (
                            <p className={`${topic.selected ? "text-foreground" : "text-muted-foreground"}`}>
                              {topic.customContent || topic.content}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">Source: {topic.source}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Selection Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {getSelectedTopicsCount()} topics selected for your cheat sheet
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowTopicSelection(false)}>
                        Back to Upload
                      </Button>
                      <Button
                        onClick={proceedToCustomization}
                        disabled={getSelectedTopicsCount() === 0}
                        className="px-6"
                      >
                        Continue to Customization
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {extractedTopics.length > 0 && !showTopicSelection && !showCustomization && !showCheatSheet && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="font-serif text-2xl">Extracted Topics</CardTitle>
                </div>
                <CardDescription>
                  Found {extractedTopics.length} topics from your uploaded files. Review and select which ones to
                  include in your cheat sheet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {extractedTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{topic.topic}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getConfidenceColor(topic.confidence)}`}>
                            {Math.round(topic.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-2">{topic.content}</p>
                      <p className="text-xs text-muted-foreground">Source: {topic.source}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Button size="lg" className="px-8" onClick={proceedToTopicSelection}>
                    Continue to Topic Selection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!showTopicSelection && !showCustomization && !showCheatSheet && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">1. Upload Files</h3>
                    <p className="text-sm text-muted-foreground">Upload your documents, presentations, or images</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">2. Extract Topics</h3>
                    <p className="text-sm text-muted-foreground">AI analyzes your content and suggests key topics</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <File className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">3. Create Cheat Sheet</h3>
                    <p className="text-sm text-muted-foreground">Customize layout and generate your study aid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
