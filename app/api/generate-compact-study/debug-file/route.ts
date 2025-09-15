import { NextRequest, NextResponse } from "next/server"

interface DebugFileRequest {
  fileName: string;
  content: string; // base64
  type: 'probability' | 'relations' | 'general';
}

// Convert base64 content to File objects
function createFileFromBase64(name: string, content: string): File {
  const buffer = Buffer.from(content, 'base64');
  
  // Determine MIME type based on file extension
  let mimeType = 'application/octet-stream';
  const extension = name.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      mimeType = 'application/pdf';
      break;
    case 'txt':
      mimeType = 'text/plain';
      break;
    case 'docx':
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case 'doc':
      mimeType = 'application/msword';
      break;
    default:
      // Try to detect PDF by checking file signature
      if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
        mimeType = 'application/pdf';
      }
  }
  
  const blob = new Blob([buffer], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

export async function POST(request: NextRequest) {
  try {
    const data: DebugFileRequest = await request.json();
    
    // Create File object
    const file = createFileFromBase64(data.fileName, data.content);
    
    console.log(`🔍 Debug processing file: ${file.name} (${file.size} bytes, ${file.type})`);
    
    // Try multiple processing approaches
    const results: any = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      processingResults: {}
    };
    
    // 1. Try enhanced file processing (no cache)
    try {
      const { FileProcessing } = await import("@/backend/lib/file-processing");
      const result = await FileProcessing.processFileEnhanced(file, {
        useCache: false,
        trackProgress: false,
        manageMemory: false
      });
      
      results.processingResults.enhanced = {
        status: result.status,
        textLength: result.content?.text?.length || 0,
        textPreview: result.content?.text?.substring(0, 200) || 'No text',
        errors: result.errors?.map(e => e.message) || []
      };
    } catch (error) {
      results.processingResults.enhanced = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 2. Try direct PDF parsing
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(buffer);
        
        results.processingResults.directPDF = {
          success: true,
          textLength: pdfData.text?.length || 0,
          textPreview: pdfData.text?.substring(0, 200) || 'No text',
          pageCount: pdfData.numpages,
          metadata: pdfData.metadata
        };
      } catch (error) {
        results.processingResults.directPDF = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // 3. Try safe file processor
    try {
      const { createSafeFileProcessor } = await import("../debug");
      const processor = createSafeFileProcessor();
      const result = await processor.processFile(file);
      
      results.processingResults.safeProcessor = {
        success: result.success,
        textLength: result.data?.text?.length || 0,
        textPreview: result.data?.text?.substring(0, 200) || 'No text',
        error: result.error
      };
    } catch (error) {
      results.processingResults.safeProcessor = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 4. Try enhanced content extractor
    try {
      const { getEnhancedContentExtractor } = await import("@/backend/lib/compact-study");
      const extractor = getEnhancedContentExtractor();
      const result = await extractor.extractMathematicalContent(file, {
        enableLatexConversion: false,
        enableWorkedExampleDetection: false,
        enableDefinitionExtraction: false,
        enableTheoremExtraction: false,
        validateExtraction: false
      });
      
      results.processingResults.enhancedExtractor = {
        success: true,
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 200) || 'No text',
        formulaCount: result.mathematicalContent?.formulas?.length || 0,
        exampleCount: result.mathematicalContent?.workedExamples?.length || 0
      };
    } catch (error) {
      results.processingResults.enhancedExtractor = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Debug file processing error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}