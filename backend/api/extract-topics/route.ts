import { type NextRequest, NextResponse } from "next/server"
import { FileProcessing } from "@/lib/file-processing"
import { getTopicExtractionService } from "@/lib/ai"
import type { ExtractedContent, OrganizedTopic } from "@/lib/ai/types"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Validate files before processing
    const validationResults = await Promise.all(
      files.map(file => FileProcessing.validate(file))
    )

    const invalidFiles = validationResults.filter(result => !result.isValid)
    if (invalidFiles.length > 0) {
      return NextResponse.json({
        error: "Invalid files detected",
        details: invalidFiles.map(result => ({
          fileName: result.fileName,
          errors: result.errors
        }))
      }, { status: 400 })
    }

    // Process files to extract content
    const processingResults = await FileProcessing.processMultipleFilesEnhanced(files, {
      enableOCR: true,
      preserveFormatting: true,
      extractImages: true,
      enableProgressTracking: true
    })

    // Check for processing errors
    const failedProcessing = processingResults.filter(result => !result.success)
    if (failedProcessing.length > 0) {
      console.warn("Some files failed to process:", failedProcessing)
    }

    // Extract successful content
    const extractedContents: ExtractedContent[] = processingResults
      .filter(result => result.success && result.content)
      .map(result => ({
        ...result.content!,
        sourceFile: result.fileName
      }))

    if (extractedContents.length === 0) {
      return NextResponse.json({
        error: "No content could be extracted from the provided files",
        details: processingResults.map(result => ({
          fileName: result.fileName,
          success: result.success,
          error: result.error
        }))
      }, { status: 400 })
    }

    // Use AI service to extract and organize topics
    const topicService = getTopicExtractionService()
    const organizedTopics = await topicService.extractTopics(extractedContents)

    // Convert to frontend format
    const formattedTopics = organizedTopics.map((topic, index) => ({
      id: `topic-${index}`,
      topic: topic.title,
      content: topic.content,
      confidence: topic.confidence,
      source: topic.sourceFiles.join(", "),
      subtopics: topic.subtopics,
      examples: topic.examples,
      originalWording: topic.originalWording,
      selected: true,
      originalContent: topic.content,
      isModified: false
    }))

    // Get processing statistics
    const stats = FileProcessing.getStats()

    return NextResponse.json({
      topics: formattedTopics,
      totalFiles: files.length,
      successfulFiles: extractedContents.length,
      failedFiles: failedProcessing.length,
      processingStats: {
        totalProcessingTime: processingResults.reduce((sum, r) => sum + (r.processingTime || 0), 0),
        cacheHits: stats.cacheHits,
        memoryUsage: stats.memoryUsage
      },
      message: `Successfully extracted ${formattedTopics.length} topics from ${extractedContents.length} file(s)`,
      warnings: failedProcessing.map(result => ({
        fileName: result.fileName,
        error: result.error,
        suggestion: FileProcessing.getUserFriendlyError(result.error || "Unknown error")
      }))
    })
  } catch (error) {
    console.error("Topic extraction error:", error)
    return NextResponse.json({ 
      error: "Failed to extract topics from files",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
