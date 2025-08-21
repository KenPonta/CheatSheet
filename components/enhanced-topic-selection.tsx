"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  CheckCircle,
  ArrowRight,
  Search,
  Filter,
  Eye,
  Edit3,
  AlertTriangle,
  FileText,
  Clock,
  X,
  RotateCcw
} from "lucide-react"

interface SelectedTopic {
  id: string
  topic: string
  content: string
  confidence: number
  source: string
  selected: boolean
  customContent?: string
  originalContent: string
  isModified: boolean
}

interface CheatSheetConfig {
  paperSize: string
  orientation: string
  columns: number
  fontSize: string
}

interface EnhancedTopicSelectionProps {
  topics: SelectedTopic[]
  onTopicToggle: (topicId: string, selected: boolean) => void
  onTopicContentUpdate: (topicId: string, newContent: string) => void
  onContinue: () => void
  onBack: () => void
  config: CheatSheetConfig
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200"
  if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-gray-100 text-gray-800 border-gray-200"
}

// Estimate page count based on selected topics and configuration
const estimatePageCount = (selectedTopics: SelectedTopic[], config: CheatSheetConfig): number => {
  const selectedCount = selectedTopics.filter(t => t.selected).length
  if (selectedCount === 0) return 0
  
  // Calculate total content length
  const totalContentLength = selectedTopics
    .filter(t => t.selected)
    .reduce((sum, topic) => {
      const content = topic.customContent || topic.content
      return sum + content.length
    }, 0)
  
  // Base characters per page based on paper size and font size
  const baseCharsPerPage = {
    small: { a4: 3500, letter: 3200, legal: 4000, a3: 7000 },
    medium: { a4: 2800, letter: 2600, legal: 3200, a3: 5600 },
    large: { a4: 2200, letter: 2000, legal: 2500, a3: 4400 }
  }
  
  const charsPerPage = baseCharsPerPage[config.fontSize as keyof typeof baseCharsPerPage]?.[config.paperSize as keyof typeof baseCharsPerPage.small] || 2800
  
  // Adjust for columns (more columns = slightly less efficient space usage)
  const columnMultiplier = config.columns === 1 ? 1 : config.columns === 2 ? 0.9 : 0.8
  const adjustedCharsPerPage = charsPerPage * columnMultiplier
  
  // Calculate estimated pages
  const estimatedPages = Math.ceil(totalContentLength / adjustedCharsPerPage)
  
  return Math.max(1, estimatedPages)
}

export function EnhancedTopicSelection({
  topics,
  onTopicToggle,
  onTopicContentUpdate,
  onContinue,
  onBack,
  config
}: EnhancedTopicSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [previewTopic, setPreviewTopic] = useState<SelectedTopic | null>(null)
  const [showModifiedOnly, setShowModifiedOnly] = useState(false)

  // Get unique sources for filtering
  const uniqueSources = useMemo(() => {
    const sources = [...new Set(topics.map(t => t.source))]
    return sources.sort()
  }, [topics])

  // Filter topics based on search and filters
  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      // Search filter
      if (searchQuery && !topic.topic.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !topic.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      // Confidence filter
      if (confidenceFilter !== "all") {
        if (confidenceFilter === "high" && topic.confidence < 0.8) return false
        if (confidenceFilter === "medium" && (topic.confidence < 0.6 || topic.confidence >= 0.8)) return false
        if (confidenceFilter === "low" && topic.confidence >= 0.6) return false
      }
      
      // Source filter
      if (sourceFilter !== "all" && topic.source !== sourceFilter) {
        return false
      }
      
      // Modified only filter
      if (showModifiedOnly && !topic.isModified) {
        return false
      }
      
      return true
    })
  }, [topics, searchQuery, confidenceFilter, sourceFilter, showModifiedOnly])

  const selectedTopics = topics.filter(t => t.selected)
  const estimatedPages = estimatePageCount(selectedTopics, config)
  const modifiedTopicsCount = topics.filter(t => t.isModified).length

  const handleTopicEdit = useCallback((topicId: string, newContent: string) => {
    const topic = topics.find(t => t.id === topicId)
    if (topic) {
      const isModified = newContent !== topic.originalContent
      onTopicContentUpdate(topicId, newContent)
      
      // Update the topic's modified status
      const updatedTopic = { ...topic, customContent: newContent, isModified }
      // This would need to be handled by the parent component
    }
  }, [topics, onTopicContentUpdate])

  const resetTopicContent = useCallback((topicId: string) => {
    const topic = topics.find(t => t.id === topicId)
    if (topic) {
      onTopicContentUpdate(topicId, topic.originalContent)
    }
  }, [topics, onTopicContentUpdate])

  const clearAllFilters = () => {
    setSearchQuery("")
    setConfidenceFilter("all")
    setSourceFilter("all")
    setShowModifiedOnly(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <CardTitle className="font-serif text-2xl">Enhanced Topic Selection</CardTitle>
        </div>
        <CardDescription>
          Choose and customize topics for your cheat sheet. {selectedTopics.length} of {topics.length} topics selected.
          {estimatedPages > 0 && (
            <span className="ml-2 font-medium text-foreground">
              Estimated: {estimatedPages} page{estimatedPages !== 1 ? 's' : ''}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filter Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium">Search Topics</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by topic name or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Confidence Level</Label>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "high", label: "High (80%+)" },
                  { value: "medium", label: "Medium (60-79%)" },
                  { value: "low", label: "Low (<60%)" }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={confidenceFilter === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfidenceFilter(option.value as any)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium">Source File</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={sourceFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSourceFilter("all")}
                >
                  All Sources
                </Button>
                {uniqueSources.map(source => (
                  <Button
                    key={source}
                    variant={sourceFilter === source ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter(source)}
                    className="max-w-[200px] truncate"
                  >
                    {source}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-modified"
                  checked={showModifiedOnly}
                  onCheckedChange={setShowModifiedOnly}
                />
                <Label htmlFor="show-modified" className="text-sm">
                  Show only modified topics ({modifiedTopicsCount})
                </Label>
              </div>
            </div>
            
            {(searchQuery || confidenceFilter !== "all" || sourceFilter !== "all" || showModifiedOnly) && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Page Count Estimation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-800">Page Estimation</h4>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>
              <strong>Estimated pages:</strong> {estimatedPages} 
              ({config.paperSize.toUpperCase()} {config.orientation}, {config.columns} column{config.columns !== 1 ? 's' : ''}, {config.fontSize} font)
            </p>
            <p><strong>Selected topics:</strong> {selectedTopics.length}</p>
            {modifiedTopicsCount > 0 && (
              <p><strong>Modified topics:</strong> {modifiedTopicsCount}</p>
            )}
          </div>
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2" />
              <p>No topics match your current filters.</p>
              <Button variant="ghost" onClick={clearAllFilters} className="mt-2">
                Clear all filters
              </Button>
            </div>
          ) : (
            filteredTopics.map((topic) => (
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
                    onCheckedChange={(checked) => onTopicToggle(topic.id, checked as boolean)}
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
                        {topic.isModified && (
                          <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                            Modified
                          </Badge>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getConfidenceColor(topic.confidence)}`}>
                          {Math.round(topic.confidence * 100)}%
                        </Badge>
                        {topic.selected && (
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>{topic.topic}</DialogTitle>
                                  <DialogDescription>
                                    Preview of topic content with current customizations
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="bg-muted p-4 rounded-lg">
                                    <h4 className="font-medium mb-2">Current Content:</h4>
                                    <p className="text-sm whitespace-pre-wrap">
                                      {topic.customContent || topic.content}
                                    </p>
                                  </div>
                                  {topic.isModified && (
                                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                      <h4 className="font-medium mb-2 text-orange-800">Original Content:</h4>
                                      <p className="text-sm text-orange-700 whitespace-pre-wrap">
                                        {topic.originalContent}
                                      </p>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    <p><strong>Source:</strong> {topic.source}</p>
                                    <p><strong>Confidence:</strong> {Math.round(topic.confidence * 100)}%</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTopic(editingTopic === topic.id ? null : topic.id)}
                              className="text-xs"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              {editingTopic === topic.id ? "Done" : "Edit"}
                            </Button>
                            {topic.isModified && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetTopicContent(topic.id)}
                                className="text-xs text-orange-600 hover:text-orange-700"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {editingTopic === topic.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={topic.customContent || topic.content}
                          onChange={(e) => handleTopicEdit(topic.id, e.target.value)}
                          placeholder="Edit the content for this topic..."
                          className="min-h-[120px]"
                        />
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium">Content Preservation Warning</p>
                              <p>Modifying this content may affect the accuracy and fidelity to your original materials. Consider keeping changes minimal to preserve the source meaning.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className={`${topic.selected ? "text-foreground" : "text-muted-foreground"} text-sm`}>
                        {(topic.customContent || topic.content).length > 200 
                          ? `${(topic.customContent || topic.content).substring(0, 200)}...` 
                          : (topic.customContent || topic.content)
                        }
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Source: {topic.source}</span>
                      <span>{(topic.customContent || topic.content).length} characters</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary and Actions */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Selection Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{selectedTopics.length} topics selected • Estimated {estimatedPages} page{estimatedPages !== 1 ? 's' : ''}</p>
                {modifiedTopicsCount > 0 && (
                  <p className="text-orange-600">{modifiedTopicsCount} topic{modifiedTopicsCount !== 1 ? 's' : ''} modified from original</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>
                Back to Upload
              </Button>
              <Button
                onClick={onContinue}
                disabled={selectedTopics.length === 0}
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
  )
}