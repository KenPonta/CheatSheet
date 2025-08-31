import { type NextRequest, NextResponse } from "next/server"
import { FileProcessing } from "@/backend/lib/file-processing"
import { createCPUOptimizedProcessor } from "@/backend/lib/file-processing/cpu-optimized-processor"
import { getTopicExtractionService } from "@/backend/lib/ai"
import type { ExtractedContent, OrganizedTopic } from "@/backend/lib/ai/types"

export async function POST(request: NextRequest) {
  console.log('🚀 API Route: Starting file processing...');
  
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    console.log(`📁 Received ${files.length} files:`, files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    if (!files || files.length === 0) {
      console.log('❌ No files provided');
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Validate files before processing
    console.log('🔍 Starting file validation...');
    const validationResults = await Promise.all(
      files.map(file => {
        console.log(`🔍 Validating file: ${file.name}`);
        return FileProcessing.validate(file);
      })
    )

    console.log('✅ Validation completed:', validationResults.map(r => ({ 
      isValid: r.isValid, 
      errors: r.errors,
      fileType: r.fileType 
    })));

    const invalidFiles = validationResults.filter(result => !result.isValid)
    if (invalidFiles.length > 0) {
      console.log('Validation failed for files:', invalidFiles.map(r => ({
        fileName: r.fileName || 'unknown',
        errors: r.errors,
        suggestions: r.suggestions
      })))
      
      // Create detailed error message for legacy Office files
      const legacyOfficeFiles = invalidFiles.filter(result => {
        const fileName = result.fileName || '';
        return fileName.endsWith('.doc') || fileName.endsWith('.ppt') || fileName.endsWith('.xls')
      })
      
      let errorMessage = '';
      if (legacyOfficeFiles.length > 0) {
        const legacyNames = legacyOfficeFiles.map(r => r.fileName).join(', ')
        errorMessage = `Legacy Office files detected (${legacyNames}). Please save as .docx, .pptx, or .xlsx formats.`
      } else {
        errorMessage = `${invalidFiles.length} file(s) failed validation. Check file formats are supported and files are not corrupted.`
      }
      
      const validationDetails = invalidFiles.map(result => ({
        fileName: result.fileName,
        errors: result.errors,
        suggestions: result.suggestions
      }))
      
      return NextResponse.json({
        error: "Invalid files detected",
        details: errorMessage,
        validationDetails
      }, { status: 400 })
    }

    // Force garbage collection before processing
    if (global.gc) {
      global.gc()
    }
    
    let processingResults;
    
    // Try CPU-optimized processing first, fallback to standard processing
    try {
      console.log('🔧 Attempting CPU-optimized processing...');
      const cpuProcessor = createCPUOptimizedProcessor({
        chunkSize: 32 * 1024, // 32KB chunks for very low memory usage
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB max memory
        useDiskBuffer: false, // Disable disk buffer for compatibility
        enableStreaming: true
      });

      try {
        console.log('🔄 Processing files sequentially...');
        // Process files sequentially to minimize memory usage
        const cpuResults = await cpuProcessor.processMultipleFilesSequential(files);
        
        console.log('📊 CPU processing results:', cpuResults.map(r => ({ 
          fileName: r.fileName, 
          success: r.success, 
          error: r.error,
          contentLength: r.content?.length 
        })));
        
        // Check if any files were successfully processed
        const successfulResults = cpuResults.filter(result => result.success);
        
        if (successfulResults.length === 0) {
          console.log('❌ CPU-optimized processing failed for all files');
          throw new Error('CPU-optimized processing failed for all files');
        }
        
        // Convert CPU processor results to expected format
        processingResults = cpuResults.map((result, index) => ({
          fileName: result.fileName,
          success: result.success,
          content: result.success ? {
            text: result.content || '',
            images: [], // Images disabled for memory efficiency
            tables: [],
            metadata: {
              name: result.fileName,
              size: files[index]?.size || 0,
              type: files[index]?.type || 'unknown',
              lastModified: files[index]?.lastModified ? new Date(files[index].lastModified) : new Date(),
              wordCount: result.metadata?.wordCount || 0,
              ...(result.metadata || {})
            },
            structure: { 
              headings: [], 
              sections: [],
              hierarchy: 0
            }
          } : undefined,
          error: result.error,
          processingTime: result.processingTime
        }));
        
        console.log(`CPU-optimized processing succeeded for ${successfulResults.length}/${files.length} files`);
      } finally {
        cpuProcessor.cleanup();
      }
    } catch (cpuError) {
      console.warn('⚠️  CPU-optimized processing failed, falling back to standard processing:', cpuError.message);
      console.warn('Stack trace:', cpuError.stack);
      
      // Fallback to standard file processing
      try {
        console.log('🔄 Attempting standard file processing...');
        const standardResults = await FileProcessing.processMultipleFilesEnhanced(files, {
          enableOCR: false, // Disable OCR to save memory
          preserveFormatting: false, // Disable formatting to save memory
          extractImages: false, // Disable images to save memory
          enableProgressTracking: false // Disable progress tracking to save memory
        });
        
        console.log('📊 Standard processing results:', standardResults.map(r => ({ 
          fileName: r.fileName, 
          success: r.success, 
          error: r.error 
        })));
        
        processingResults = standardResults;
        console.log(`✅ Standard processing succeeded for ${standardResults.filter(r => r.success).length}/${files.length} files`);
      } catch (standardError) {
        console.error('❌ Both CPU-optimized and standard processing failed:', standardError);
        console.error('Standard error stack:', standardError.stack);
        throw new Error(`File processing failed: ${standardError.message}`);
      }
    }

    // Check for processing errors
    const failedProcessing = processingResults.filter(result => !result.success)
    if (failedProcessing.length > 0) {
      console.warn("Some files failed to process:", failedProcessing.map(r => ({
        fileName: r.fileName,
        error: r.error
      })))
    }

    // Extract successful content
    const extractedContents: ExtractedContent[] = processingResults
      .filter(result => result.success && result.content)
      .map(result => ({
        ...result.content!,
        sourceFile: result.fileName
      }))

    if (extractedContents.length === 0) {
      console.log("No content extracted. Processing results:", processingResults.map(r => ({
        fileName: r.fileName,
        success: r.success,
        error: r.error
      })))
      
      const failureDetails = processingResults.map(result => ({
        fileName: result.fileName,
        success: result.success,
        error: result.error
      }))
      
      // Create more specific error message
      let errorMessage = `Failed to process ${failedProcessing.length} file(s). Check file formats and ensure files are not corrupted.`
      
      // Check if any files have specific error patterns
      const hasUnsupportedFormat = failedProcessing.some(result => 
        result.error && result.error.includes('unsupported') || result.error && result.error.includes('format')
      )
      
      if (hasUnsupportedFormat) {
        errorMessage = "Unsupported file format detected. Please use supported formats: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Text (.txt), or Images."
      }
      
      return NextResponse.json({
        error: "No content could be extracted from the provided files",
        details: errorMessage,
        failureDetails
      }, { status: 400 })
    }

    // Use AI service to extract and organize topics
    console.log('🤖 Starting topic extraction...');
    console.log(`📊 Extracted contents: ${extractedContents.length} items`);
    
    const topicService = getTopicExtractionService()
    console.log('✅ Topic service obtained');
    
    const organizedTopics = await topicService.extractTopics(extractedContents)
    console.log(`✅ Topic extraction completed: ${organizedTopics.length} topics`);

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
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    let userFriendlyMessage = "Failed to extract topics from files"
    
    // Handle memory-related errors
    if (errorMessage.includes('Memory usage') || errorMessage.includes('memory')) {
      userFriendlyMessage = "System memory is critically low. Please close other applications and try again with fewer or smaller files."
    }
    // Handle file format errors
    else if (errorMessage.includes('Unsupported') || errorMessage.includes('format')) {
      userFriendlyMessage = "Unsupported file format detected. Please use supported formats: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Text (.txt), or Images."
    }
    // Handle processing errors
    else if (errorMessage.includes('process') || errorMessage.includes('extract')) {
      userFriendlyMessage = "Unable to process the uploaded files. Please check that files are not corrupted and try again."
    }
    
    return NextResponse.json({ 
      error: "Failed to extract topics from files",
      details: userFriendlyMessage
    }, { status: 500 })
  }
}
