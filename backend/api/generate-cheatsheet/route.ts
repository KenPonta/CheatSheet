import { type NextRequest, NextResponse } from "next/server"
import { pdfGenerator } from "@/lib/pdf-generation"
import { GenerationRequest, CheatSheetTopic, CheatSheetConfig } from "@/lib/pdf-generation/types"
import { getImageRecreationService } from "@/lib/ai"
import { getAIContentService } from "@/lib/ai"
import type { ExtractedImage } from "@/lib/ai/types"

interface GenerateCheatSheetRequest {
  topics: Array<{
    id?: string
    topic: string
    content: string
    customContent?: string
    images?: Array<{
      id: string
      src: string
      alt: string
      caption?: string
      width?: number
      height?: number
      isRecreated?: boolean
    }>
    priority?: number
    subtopics?: Array<{
      id: string
      title: string
      content: string
    }>
    examples?: ExtractedImage[]
    originalWording?: string
  }>
  config: {
    paperSize: string
    orientation: string
    columns: number
    fontSize: string
    referenceText?: string
    pageCount?: number
    includeHeaders?: boolean
    includeFooters?: boolean
    customStyles?: string
  }
  title?: string
  subtitle?: string
  outputFormat?: 'html' | 'pdf' | 'both'
  enableImageRecreation?: boolean
  enableContentValidation?: boolean
}

export function convertToGenerationRequest(data: GenerateCheatSheetRequest): GenerationRequest {
  const topics: CheatSheetTopic[] = data.topics.map((topic, index) => ({
    id: topic.id || `topic-${index}`,
    topic: topic.topic,
    content: topic.content,
    customContent: topic.customContent,
    images: topic.images || [],
    priority: topic.priority || 1
  }))

  const config: CheatSheetConfig = {
    paperSize: (['a4', 'letter', 'legal', 'a3'].includes(data.config.paperSize) ? data.config.paperSize : 'a4') as any,
    orientation: (['portrait', 'landscape'].includes(data.config.orientation) ? data.config.orientation : 'portrait') as any,
    columns: ([1, 2, 3].includes(data.config.columns) ? data.config.columns : 1) as any,
    fontSize: (['small', 'medium', 'large'].includes(data.config.fontSize) ? data.config.fontSize : 'small') as any,
    pageCount: data.config.pageCount,
    includeHeaders: data.config.includeHeaders !== false,
    includeFooters: data.config.includeFooters !== false,
    customStyles: data.config.customStyles
  }

  return {
    topics,
    config,
    referenceText: data.config.referenceText,
    title: data.title || 'Study Cheat Sheet',
    subtitle: data.subtitle
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: GenerateCheatSheetRequest = await request.json()

    if (!data.topics || data.topics.length === 0) {
      return NextResponse.json({ error: "No topics provided" }, { status: 400 })
    }

    // Process images if image recreation is enabled
    let processedTopics = data.topics
    let imageRecreationResults = null
    
    if (data.enableImageRecreation) {
      const imageService = getImageRecreationService()
      const allImages: ExtractedImage[] = []
      
      // Collect all images from topics
      data.topics.forEach(topic => {
        if (topic.examples) {
          allImages.push(...topic.examples)
        }
      })
      
      if (allImages.length > 0) {
        try {
          imageRecreationResults = await imageService.recreateImages(allImages)
          
          // Update topics with recreated images
          processedTopics = data.topics.map(topic => {
            if (topic.examples) {
              const updatedExamples = topic.examples.map(example => {
                const recreationResult = imageRecreationResults?.find(r => r.originalImage.id === example.id)
                if (recreationResult?.generatedImage && !recreationResult.userApprovalRequired) {
                  return {
                    ...example,
                    base64: recreationResult.generatedImage.base64,
                    isRecreated: true
                  }
                }
                return example
              })
              return { ...topic, examples: updatedExamples }
            }
            return topic
          })
        } catch (imageError) {
          console.warn("Image recreation failed, proceeding with original images:", imageError)
        }
      }
    }

    // Validate content fidelity if enabled
    let fidelityWarnings: string[] = []
    if (data.enableContentValidation) {
      const aiService = getAIContentService()
      
      for (const topic of processedTopics) {
        if (topic.customContent && topic.originalWording) {
          try {
            const fidelityScore = await aiService.validateContentFidelity(
              topic.originalWording,
              topic.customContent
            )
            
            if (fidelityScore.score < 0.7) {
              fidelityWarnings.push(
                `Topic "${topic.topic}" has low content fidelity (${Math.round(fidelityScore.score * 100)}%). ${fidelityScore.issues.join(', ')}`
              )
            }
          } catch (fidelityError) {
            console.warn("Content fidelity validation failed for topic:", topic.topic, fidelityError)
          }
        }
      }
    }

    const generationRequest = convertToGenerationRequest({
      ...data,
      topics: processedTopics
    })
    const outputFormat = data.outputFormat || 'html'

    let result
    
    if (outputFormat === 'pdf' || outputFormat === 'both') {
      // Generate PDF with enhanced features
      result = await pdfGenerator.generatePDF(generationRequest)
    } else {
      // Generate HTML only
      result = await pdfGenerator.generateHTMLOnly(generationRequest)
    }

    // Combine warnings from different sources
    const allWarnings = [
      ...(result.warnings || []),
      ...fidelityWarnings
    ]

    // Convert PDF buffer to base64 for JSON response if needed
    const response: any = {
      html: result.html,
      success: result.success,
      message: `Generated cheat sheet with ${processedTopics.length} topics`,
      warnings: allWarnings,
      pageCount: result.pageCount,
      contentFit: result.contentFit,
      imageRecreation: imageRecreationResults ? {
        total: imageRecreationResults.length,
        recreated: imageRecreationResults.filter(r => r.generatedImage).length,
        needsApproval: imageRecreationResults.filter(r => r.userApprovalRequired).length,
        fallbackToOriginal: imageRecreationResults.filter(r => r.fallbackToOriginal).length
      } : null,
      fidelityValidation: data.enableContentValidation ? {
        checked: processedTopics.filter(t => t.customContent && t.originalWording).length,
        warnings: fidelityWarnings.length
      } : null
    }

    if (result.pdf && (outputFormat === 'pdf' || outputFormat === 'both')) {
      response.pdf = result.pdf.toString('base64')
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Cheat sheet generation error:", error)
    return NextResponse.json({ 
      error: "Failed to generate cheat sheet",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    // Cleanup browser resources
    try {
      await pdfGenerator.cleanup()
    } catch (cleanupError) {
      console.warn("Cleanup error:", cleanupError)
    }
  }
}
