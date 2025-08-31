import { type NextRequest, NextResponse } from "next/server"
import { pdfGenerator } from "@/backend/lib/pdf-generation"
import { GenerationRequest, CheatSheetTopic, CheatSheetConfig } from "@/backend/lib/pdf-generation/types"
import { getImageRecreationService } from "@/backend/lib/ai"
import { getAIContentService } from "@/backend/lib/ai"
import { ReferenceFormatMatcher } from "@/backend/lib/template/format-matcher"
import { ContentDensityAnalyzer } from "@/backend/lib/template/content-density-analyzer"
import type { ExtractedImage, ExtractedContent, OrganizedTopic } from "@/backend/lib/ai/types"

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
  enableReferenceFormatMatching?: boolean
  referenceTemplate?: File
  userContent?: ExtractedContent[]
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
    // Handle both JSON and FormData requests for reference template support
    let data: GenerateCheatSheetRequest;
    let referenceFile: File | null = null;
    
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const dataJson = formData.get('data') as string;
      referenceFile = formData.get('referenceTemplate') as File;
      
      if (!dataJson) {
        return NextResponse.json({ error: "Request data is required" }, { status: 400 });
      }
      
      try {
        data = JSON.parse(dataJson);
      } catch (parseError) {
        return NextResponse.json({ error: "Invalid JSON in request data" }, { status: 400 });
      }
    } else {
      data = await request.json();
    }

    if (!data.topics || data.topics.length === 0) {
      return NextResponse.json({ error: "No topics provided" }, { status: 400 })
    }

    // Apply reference format matching if enabled
    let processedTopics = data.topics
    let formatMatchingResults = null
    let enhancedConfig = { ...data.config }
    
    if (data.enableReferenceFormatMatching && (referenceFile || data.referenceTemplate)) {
      try {
        const templateFile = referenceFile || data.referenceTemplate;
        if (templateFile && data.userContent) {
          console.log('🎨 Applying reference format matching...');
          
          const formatMatcher = new ReferenceFormatMatcher();
          const densityAnalyzer = new ContentDensityAnalyzer();
          
          // Convert topics to OrganizedTopic format for format matching
          const organizedTopics: OrganizedTopic[] = data.topics.map((topic, index) => ({
            id: topic.id || `topic-${index}`,
            title: topic.topic,
            content: topic.customContent || topic.content,
            subtopics: topic.subtopics?.map(sub => ({
              id: sub.id,
              title: sub.title,
              content: sub.content,
              priority: 'medium' as const,
              estimatedSpace: sub.content.length * 1.1,
              isSelected: true,
              parentTopicId: topic.id || `topic-${index}`,
              confidence: 0.8
            })) || [],
            sourceFiles: ['user-input'],
            confidence: 0.9,
            priority: (topic.priority === 1 ? 'high' : topic.priority === 2 ? 'medium' : 'low') as const,
            examples: topic.examples || [],
            originalWording: topic.originalWording || topic.content,
            estimatedSpace: (topic.customContent || topic.content).length * 1.2,
            isSelected: true
          }));
          
          formatMatchingResults = await formatMatcher.matchFormat(
            templateFile,
            data.userContent,
            organizedTopics,
            {
              preserveContentFidelity: true,
              allowLayoutModifications: true,
              matchContentDensity: true,
              adaptTypography: true,
              maintainVisualHierarchy: true
            }
          );
          
          // Apply format matching results to enhance configuration
          if (formatMatchingResults.generatedCSS.css) {
            enhancedConfig.customStyles = (enhancedConfig.customStyles || '') + '\n' + formatMatchingResults.generatedCSS.css;
          }
          
          // Update topics based on content density matching
          if (formatMatchingResults.adaptedContent.topicSelectionChanges.length > 0) {
            console.log(`📊 Applied ${formatMatchingResults.adaptedContent.topicSelectionChanges.length} content density adjustments`);
            
            // Apply topic selection changes
            processedTopics = data.topics.filter(topic => {
              const change = formatMatchingResults.adaptedContent.topicSelectionChanges.find(
                c => c.topicId === topic.id
              );
              return !change || change.action !== 'remove';
            });
          }
          
          console.log(`✅ Reference format matching completed with ${Math.round(formatMatchingResults.matchingScore * 100)}% match`);
        }
      } catch (formatError) {
        console.warn("Reference format matching failed, proceeding without formatting:", formatError);
        formatMatchingResults = null;
      }
    }

    // Process images if image recreation is enabled
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
      topics: processedTopics,
      config: enhancedConfig
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
    ];
    
    // Add format matching warnings if applicable
    if (formatMatchingResults?.warnings) {
      allWarnings.push(...formatMatchingResults.warnings.map(w => 
        `Format Matching: ${w.message} (${w.severity})`
      ));
    }

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
      } : null,
      formatMatching: formatMatchingResults ? {
        matchingScore: formatMatchingResults.matchingScore,
        appliedChanges: formatMatchingResults.adaptedContent.topicSelectionChanges.length,
        cssGenerated: !!formatMatchingResults.generatedCSS.css,
        densityMatched: formatMatchingResults.contentDensityMatch.densityRatio,
        structuralFidelity: formatMatchingResults.layoutAdaptation.structuralFidelity
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
