"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Settings
} from "lucide-react"

// Enhanced interfaces for priority-based selection
interface EnhancedSubTopic {
  id: string
  title: string
  content: string
  priority: 'high' | 'medium' | 'low'
  estimatedSpace: number
  isSelected: boolean
  parentTopicId: string
  confidence: number
}

interface EnhancedTopic {
  id: string
  topic: string
  content: string
  confidence: number
  source: string
  selected: boolean
  customContent?: string
  originalContent: string
  isModified: boolean
  priority: 'high' | 'medium' | 'low'
  estimatedSpace: number
  subtopics: EnhancedSubTopic[]
  examples: any[]
}

interface SpaceUtilizationInfo {
  totalAvailableSpace: number
  usedSpace: number
  remainingSpace: number
  utilizationPercentage: number
  suggestions: SpaceSuggestion[]
}

interface SpaceSuggestion {
  type: 'add_topic' | 'add_subtopic' | 'expand_content' | 'reduce_content'
  targetId: string
  description: string
  spaceImpact: number
}

interface TopicSelection {
  topicId: string
  subtopicIds: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedSpace: number
}

interface CheatSheetConfig {
  paperSize: 'a4' | 'letter' | 'legal' | 'a3'
  orientation: 'portrait' | 'landscape'
  columns: 1 | 2 | 3
  fontSize: 'small' | 'medium' | 'large'
  pageCount?: number
}

interface EnhancedTopicSelectionProps {
  topics: EnhancedTopic[]
  onTopicToggle: (topicId: string, selected: boolean) => void
  onSubtopicToggle: (topicId: string, subtopicId: string, selected: boolean) => void
  onPriorityChange: (topicId: string, priority: 'high' | 'medium' | 'low') => void
  onSubtopicPriorityChange: (topicId: string, subtopicId: string, priority: 'high' | 'medium' | 'low') => void
  onTopicContentUpdate: (topicId: string, newContent: string) => void
  onAutoFill: (availableSpace: number) => void
  onContinue: () => void
  onBack: () => void
  config: CheatSheetConfig
  spaceUtilization?: SpaceUtilizationInfo
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200"
  if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-gray-100 text-gray-800 border-gray-200"
}

const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high': return "bg-red-100 text-red-800 border-red-200"
    case 'medium': return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case 'low': return "bg-blue-100 text-blue-800 border-blue-200"
    default: return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high': return <Target className="h-3 w-3" />
    case 'medium': return <TrendingUp className="h-3 w-3" />
    case 'low': return <BarChart3 className="h-3 w-3" />
    default: return <BarChart3 className="h-3 w-3" />
  }
}

// Calculate space utilization based on selected topics and subtopics
const calculateSpaceUtilization = (
  topics: EnhancedTopic[], 
  config: CheatSheetConfig
): SpaceUtilizationInfo => {
  // Base space calculation (simplified version of the backend service)
  const PAGE_SIZES = {
    a4: { width: 8.27, height: 11.69 },
    letter: { width: 8.5, height: 11 },
    legal: { width: 8.5, height: 14 },
    a3: { width: 11.69, height: 16.54 }
  }

  const FONT_DENSITIES = {
    small: 180,
    medium: 140,
    large: 100
  }

  const pageSize = PAGE_SIZES[config.paperSize]
  const pages = config.pageCount || 1
  const totalPageArea = pageSize.width * pageSize.height * pages
  const usableArea = totalPageArea * 0.85 // 15% margin
  const columnAdjustedArea = usableArea * Math.pow(0.95, config.columns - 1)
  const fontDensity = FONT_DENSITIES[config.fontSize]
  const totalAvailableSpace = Math.floor(columnAdjustedArea * fontDensity)

  // Calculate used space from selected topics and subtopics
  let usedSpace = 0
  topics.forEach(topic => {
    if (topic.selected) {
      usedSpace += topic.estimatedSpace || topic.content.length * 1.2
      
      topic.subtopics.forEach(subtopic => {
        if (subtopic.isSelected) {
          usedSpace += subtopic.estimatedSpace || subtopic.content.length * 1.1
        }
      })
    }
  })

  const remainingSpace = Math.max(0, totalAvailableSpace - usedSpace)
  const utilizationPercentage = Math.min(1.0, usedSpace / totalAvailableSpace)

  // Generate suggestions
  const suggestions: SpaceSuggestion[] = []
  
  if (utilizationPercentage < 0.7) {
    // Suggest adding more content
    const unselectedTopics = topics.filter(t => !t.selected && t.priority !== 'low')
    if (unselectedTopics.length > 0) {
      const topic = unselectedTopics[0]
      suggestions.push({
        type: 'add_topic',
        targetId: topic.id,
        description: `Consider adding "${topic.topic}" to better utilize available space`,
        spaceImpact: topic.estimatedSpace || topic.content.length * 1.2
      })
    }
  } else if (utilizationPercentage > 0.95) {
    // Suggest reducing content
    const lowPriorityTopics = topics.filter(t => t.selected && t.priority === 'low')
    if (lowPriorityTopics.length > 0) {
      const topic = lowPriorityTopics[0]
      suggestions.push({
        type: 'reduce_content',
        targetId: topic.id,
        description: `Consider removing low-priority topic "${topic.topic}" to prevent overflow`,
        spaceImpact: -(topic.estimatedSpace || topic.content.length * 1.2)
      })
    }
  }

  return {
    totalAvailableSpace,
    usedSpace,
    remainingSpace,
    utilizationPercentage,
    suggestions
  }
}

export function EnhancedTopicSelection({
  topics,
  onTopicToggle,
  onSubtopicToggle,
  onPriorityChange,
  onSubtopicPriorityChange,
  onTopicContentUpdate,
  onAutoFill,
  onContinue,
  onBack,
  config,
  spaceUtilization: providedSpaceUtilization
}: EnhancedTopicSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [previewTopic, setPreviewTopic] = useState<EnhancedTopic | null>(null)
  const [showModifiedOnly, setShowModifiedOnly] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [showSpaceDashboard, setShowSpaceDashboard] = useState(true)

  // Calculate space utilization
  const spaceUtilization = useMemo(() => {
    return providedSpaceUtilization || calculateSpaceUtilization(topics, config)
  }, [topics, config, providedSpaceUtilization])

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

      // Priority filter
      if (priorityFilter !== "all" && topic.priority !== priorityFilter) {
        return false
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
  }, [topics, searchQuery, confidenceFilter, priorityFilter, sourceFilter, showModifiedOnly])

  const selectedTopics = topics.filter(t => t.selected)
  const selectedSubtopicsCount = topics.reduce((count, topic) => 
    count + topic.subtopics.filter(sub => sub.isSelected).length, 0
  )
  const modifiedTopicsCount = topics.filter(t => t.isModified).length

  // Enhanced auto-fill functionality with space optimization
  const handleAutoFill = useCallback(async () => {
    if (!config.pageCount) return;
    
    try {
      // Call space optimization API
      const response = await fetch('/api/space-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_space_utilization',
          topics: topics.map(t => ({
            id: t.id,
            title: t.topic,
            content: t.content,
            subtopics: t.subtopics,
            sourceFiles: [t.source],
            confidence: t.confidence,
            priority: t.priority,
            examples: t.examples,
            originalWording: t.originalWording,
            estimatedSpace: t.estimatedSpace,
            isSelected: t.selected
          })),
          constraints: {
            pageSize: config.paperSize,
            fontSize: config.fontSize,
            columns: config.columns,
            availablePages: config.pageCount,
            targetUtilization: 0.85
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const optimization = result.data;
        
        // Apply optimization results
        optimization.recommendedTopics.forEach((topicId: string) => {
          onTopicToggle(topicId, true);
        });
        
        optimization.recommendedSubtopics.forEach((rec: any) => {
          rec.subtopicIds.forEach((subtopicId: string) => {
            onSubtopicToggle(rec.topicId, subtopicId, true);
          });
        });
        
        console.log(`Auto-fill completed with ${Math.round(optimization.utilizationScore * 100)}% utilization`);
      } else {
        // Fallback to simple auto-fill
        if (onAutoFill) {
          onAutoFill(spaceUtilization.totalAvailableSpace);
        }
      }
    } catch (error) {
      console.warn('Space optimization failed, using fallback:', error);
      if (onAutoFill) {
        onAutoFill(spaceUtilization.totalAvailableSpace);
      }
    }
  }, [topics, config, onTopicToggle, onSubtopicToggle, onAutoFill, spaceUtilization.totalAvailableSpace])

  // Toggle topic expansion
  const toggleTopicExpansion = useCallback((topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }, [])

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
    setPriorityFilter("all")
    setSourceFilter("all")
    setShowModifiedOnly(false)
  }

  // Get utilization status color
  const getUtilizationColor = (percentage: number) => {
    if (percentage < 0.5) return "text-blue-600"
    if (percentage < 0.8) return "text-green-600"
    if (percentage < 0.95) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="font-serif text-2xl">Priority-Based Topic Selection</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpaceDashboard(!showSpaceDashboard)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showSpaceDashboard ? 'Hide' : 'Show'} Space Dashboard
          </Button>
        </div>
        <CardDescription>
          Choose and prioritize topics for your cheat sheet. {selectedTopics.length} topics and {selectedSubtopicsCount} subtopics selected.
          <span className={`ml-2 font-medium ${getUtilizationColor(spaceUtilization.utilizationPercentage)}`}>
            Space utilization: {Math.round(spaceUtilization.utilizationPercentage * 100)}%
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Space Utilization Dashboard */}
        {showSpaceDashboard && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Space Utilization Dashboard</CardTitle>
                </div>
                <Button
                  onClick={handleAutoFill}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Fill
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-800">Space Usage</Label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Used: {Math.round(spaceUtilization.usedSpace).toLocaleString()} chars</span>
                      <span className={getUtilizationColor(spaceUtilization.utilizationPercentage)}>
                        {Math.round(spaceUtilization.utilizationPercentage * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={spaceUtilization.utilizationPercentage * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      Available: {Math.round(spaceUtilization.totalAvailableSpace).toLocaleString()} chars
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-800">Content Summary</Label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Topics:</span>
                      <span className="font-medium">{selectedTopics.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtopics:</span>
                      <span className="font-medium">{selectedSubtopicsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High Priority:</span>
                      <span className="font-medium text-red-600">
                        {topics.filter(t => t.selected && t.priority === 'high').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-800">Optimization Status</Label>
                  <div className="space-y-1">
                    {spaceUtilization.utilizationPercentage < 0.5 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Under-utilized
                      </Badge>
                    )}
                    {spaceUtilization.utilizationPercentage >= 0.5 && spaceUtilization.utilizationPercentage < 0.8 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Good utilization
                      </Badge>
                    )}
                    {spaceUtilization.utilizationPercentage >= 0.8 && spaceUtilization.utilizationPercentage < 0.95 && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Well optimized
                      </Badge>
                    )}
                    {spaceUtilization.utilizationPercentage >= 0.95 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Risk of overflow
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              {spaceUtilization.suggestions.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    <Label className="text-sm font-medium">Optimization Suggestions</Label>
                  </div>
                  <div className="space-y-2">
                    {spaceUtilization.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-yellow-800">{suggestion.description}</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Impact: {suggestion.spaceImpact > 0 ? '+' : ''}{Math.round(suggestion.spaceImpact).toLocaleString()} characters
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              <Label className="text-sm font-medium">Priority Level</Label>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "All Priorities" },
                  { value: "high", label: "High Priority" },
                  { value: "medium", label: "Medium Priority" },
                  { value: "low", label: "Low Priority" }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={priorityFilter === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriorityFilter(option.value as any)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

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
            
            {(searchQuery || confidenceFilter !== "all" || priorityFilter !== "all" || sourceFilter !== "all" || showModifiedOnly) && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Topics List with Priority Controls */}
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
              <Card
                key={topic.id}
                className={`transition-all ${
                  topic.selected ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Topic Header */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={topic.id}
                        checked={topic.selected}
                        onCheckedChange={(checked) => onTopicToggle(topic.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={topic.id}
                              className={`font-semibold text-lg cursor-pointer ${
                                topic.selected ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {topic.topic}
                            </label>
                            {topic.subtopics.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTopicExpansion(topic.id)}
                                className="p-1 h-6 w-6"
                              >
                                {expandedTopics.has(topic.id) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Priority Control */}
                            <Select
                              value={topic.priority}
                              onValueChange={(value: 'high' | 'medium' | 'low') => 
                                onPriorityChange(topic.id, value)
                              }
                            >
                              <SelectTrigger className="w-24 h-7 text-xs">
                                <div className="flex items-center gap-1">
                                  {getPriorityIcon(topic.priority)}
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    High
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3" />
                                    Medium
                                  </div>
                                </SelectItem>
                                <SelectItem value="low">
                                  <div className="flex items-center gap-2">
                                    <BarChart3 className="h-3 w-3" />
                                    Low
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <Badge className={`text-xs ${getPriorityColor(topic.priority)}`}>
                              {topic.priority}
                            </Badge>
                            <Badge className={`text-xs ${getConfidenceColor(topic.confidence)}`}>
                              {Math.round(topic.confidence * 100)}%
                            </Badge>
                            
                            {topic.isModified && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Topic Actions */}
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
                                    <p><strong>Priority:</strong> {topic.priority}</p>
                                    <p><strong>Estimated Space:</strong> {topic.estimatedSpace || 'Not calculated'} chars</p>
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

                        {/* Topic Content */}
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

                        {/* Subtopics */}
                        {topic.subtopics.length > 0 && expandedTopics.has(topic.id) && (
                          <Collapsible open={true}>
                            <CollapsibleContent>
                              <div className="ml-6 mt-3 space-y-2 border-l-2 border-muted pl-4">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Subtopics ({topic.subtopics.length})
                                </Label>
                                {topic.subtopics.map((subtopic) => (
                                  <div key={subtopic.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={subtopic.id}
                                        checked={subtopic.isSelected}
                                        onCheckedChange={(checked) => 
                                          onSubtopicToggle(topic.id, subtopic.id, checked as boolean)
                                        }
                                      />
                                      <label
                                        htmlFor={subtopic.id}
                                        className="text-sm cursor-pointer"
                                      >
                                        {subtopic.title}
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={subtopic.priority}
                                        onValueChange={(value: 'high' | 'medium' | 'low') => 
                                          onSubtopicPriorityChange(topic.id, subtopic.id, value)
                                        }
                                      >
                                        <SelectTrigger className="w-20 h-6 text-xs">
                                          <div className="flex items-center gap-1">
                                            {getPriorityIcon(subtopic.priority)}
                                            <SelectValue />
                                          </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="high">High</SelectItem>
                                          <SelectItem value="medium">Medium</SelectItem>
                                          <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Badge className={`text-xs ${getPriorityColor(subtopic.priority)}`}>
                                        {subtopic.estimatedSpace || 0} chars
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Topic Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-muted">
                          <div className="flex items-center gap-4">
                            <span>Source: {topic.source}</span>
                            <span>{(topic.customContent || topic.content).length} characters</span>
                            {topic.subtopics.length > 0 && (
                              <span>{topic.subtopics.filter(s => s.isSelected).length}/{topic.subtopics.length} subtopics</span>
                            )}
                          </div>
                          <span>Est. space: {topic.estimatedSpace || 'Not calculated'} chars</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Enhanced Summary and Actions */}
        <Card className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-800">Selection Summary</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div className="flex items-center gap-4">
                    <span>{selectedTopics.length} topics selected</span>
                    <span>{selectedSubtopicsCount} subtopics selected</span>
                    <span className={getUtilizationColor(spaceUtilization.utilizationPercentage)}>
                      {Math.round(spaceUtilization.utilizationPercentage * 100)}% space utilized
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-red-600">
                      {topics.filter(t => t.selected && t.priority === 'high').length} high priority
                    </span>
                    <span className="text-yellow-600">
                      {topics.filter(t => t.selected && t.priority === 'medium').length} medium priority
                    </span>
                    <span className="text-blue-600">
                      {topics.filter(t => t.selected && t.priority === 'low').length} low priority
                    </span>
                  </div>
                  {modifiedTopicsCount > 0 && (
                    <p className="text-orange-600">{modifiedTopicsCount} topic{modifiedTopicsCount !== 1 ? 's' : ''} modified from original</p>
                  )}
                  {spaceUtilization.utilizationPercentage > 0.95 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Warning: Risk of content overflow</span>
                    </div>
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
                  className="px-6 bg-green-600 hover:bg-green-700"
                >
                  Continue to Customization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}