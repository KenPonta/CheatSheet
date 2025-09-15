import { type NextRequest, NextResponse } from "next/server"
import "../../../backend/lib/startup"
import { 
  processCompactStudyDocuments,
  CompactLayoutEngine,
  generateCompactHTML,
  PDFOutputGenerator,
  generateCompactMarkdown,
  AIEnhancedStructureOrganizer,
  type CompactLayoutConfig,
  type PipelineOrchestratorConfig,
  type AcademicDocument,
  type HTMLOutput,
  type PDFOutput,
  type MarkdownOutput,
  type AIStructureConfig
} from "@/backend/lib/compact-study"
import { 
  SimpleImageGenerator,
  type FlatLineImageRequest,
  type GeneratedImage
} from "@/backend/lib/ai/simple-image-generator"
import {
  AIContentQualityVerifier,
  type ContentQualityConfig,
  type VerifiedContent
} from "@/backend/lib/ai/content-quality-verifier"
import { 
  CompactStudyDebugger, 
  validateRequest, 
  createSafeFileProcessor,
  createFallbackMathExtractor 
} from "./debug"

interface GenerateCompactStudyRequest {
  files: Array<{
    name: string;
    type: 'probability' | 'relations' | 'general';
    content: string; // base64 encoded file content
  }>;
  config: {
    layout: 'compact' | 'standard';
    columns: 1 | 2 | 3;
    equations: 'all' | 'key' | 'minimal';
    examples: 'full' | 'summary' | 'references';
    answers: 'inline' | 'appendix' | 'separate';
    fontSize: string; // '10pt', '11pt', etc.
    margins: 'narrow' | 'normal' | 'wide';
    outputFormat: 'html' | 'pdf' | 'markdown' | 'all';
    paperSize?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    title?: string;
    enableProgressTracking?: boolean;
    enableErrorRecovery?: boolean;
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
  };
}

interface CompactStudyResponse {
  success: boolean;
  message: string;
  html?: string;
  pdf?: string; // base64 encoded
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
  generatedImages?: GeneratedImage[];
  editingEnabled?: boolean;
  studyMaterialId?: string; // For post-generation editing
}

// Convert request config to compact layout config
function createCompactLayoutConfig(config: GenerateCompactStudyRequest['config']): CompactLayoutConfig {
  const fontSize = parseInt(config.fontSize.replace('pt', '')) || 10;
  
  return {
    paperSize: config.paperSize || 'a4',
    columns: config.columns,
    typography: {
      fontSize,
      lineHeight: config.layout === 'compact' ? 1.15 : 1.25,
      fontFamily: {
        body: 'Times, serif',
        heading: 'Times, serif',
        math: 'Computer Modern, serif',
        code: 'Courier, monospace'
      }
    },
    spacing: {
      paragraphSpacing: config.layout === 'compact' ? 0.25 : 0.35,
      listSpacing: config.layout === 'compact' ? 0.15 : 0.25,
      sectionSpacing: config.layout === 'compact' ? 0.5 : 0.75,
      headingMargins: {
        top: config.layout === 'compact' ? 0.5 : 0.75,
        bottom: config.layout === 'compact' ? 0.25 : 0.5
      }
    },
    margins: {
      top: config.margins === 'narrow' ? 0.5 : config.margins === 'normal' ? 0.75 : 1.0,
      bottom: config.margins === 'narrow' ? 0.5 : config.margins === 'normal' ? 0.75 : 1.0,
      left: config.margins === 'narrow' ? 0.5 : config.margins === 'normal' ? 0.75 : 1.0,
      right: config.margins === 'narrow' ? 0.5 : config.margins === 'normal' ? 0.75 : 1.0
    },
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: config.equations !== 'minimal',
        fullWidth: true
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: fontSize * 1.2
      }
    }
  };
}

// Convert request config to pipeline orchestrator config
function createPipelineConfig(config: GenerateCompactStudyRequest['config']): PipelineOrchestratorConfig {
  return {
    enableProgressTracking: config.enableProgressTracking ?? true,
    enableErrorRecovery: config.enableErrorRecovery ?? true,
    structureConfig: {
      title: config.title || 'Compact Study Guide',
      enableNumbering: true,
      enableTableOfContents: true,
      partTitles: {
        probability: 'Part I: Discrete Probability',
        relations: 'Part II: Relations'
      }
    },
    mathExtractionConfig: {
      enableLatexConversion: true,
      enableWorkedExampleDetection: config.examples !== 'references',
      confidenceThreshold: 0.5,
      preserveAllFormulas: config.equations === 'all'
    },
    // New image generation configuration
    imageGenerationConfig: {
      enabled: config.enableImageGeneration ?? true,
      generateForEquations: config.imageGenerationConfig?.generateForEquations ?? true,
      generateForExamples: config.imageGenerationConfig?.generateForExamples ?? true,
      generateForConcepts: config.imageGenerationConfig?.generateForConcepts ?? false,
      style: {
        lineWeight: config.imageGenerationConfig?.imageStyle?.lineWeight ?? 'medium',
        colorScheme: config.imageGenerationConfig?.imageStyle?.colorScheme ?? 'monochrome',
        layout: config.imageGenerationConfig?.imageStyle?.layout ?? 'horizontal',
        annotations: config.imageGenerationConfig?.imageStyle?.annotations ?? true
      }
    },
    // Post-generation editing configuration
    postGenerationConfig: {
      enableEditing: config.enablePostGenerationEditing ?? true,
      preserveOriginalContent: true,
      enableImageRegeneration: true
    },
    // Content quality verification configuration
    contentQualityConfig: {
      enableAIVerification: true,
      minContentLength: 100,
      maxRedundancyThreshold: 0.3,
      requireEducationalValue: true,
      filterBulletPoints: true
    }
  };
}

// Convert base64 content to File objects
function createFileFromBase64(name: string, content: string, type: string): File {
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

// AI-Enhanced direct processing document creation with content verification
async function createDirectProcessingDocument(
  files: Array<{ file: File; type: 'probability' | 'relations' | 'general' }>,
  config: GenerateCompactStudyRequest['config'],
  logger: CompactStudyDebugger
): Promise<AcademicDocument> {
  logger.log('ai_enhanced_processing_start', { filesCount: files.length });
  
  // Try AI-enhanced processing first, fall back to improved basic processing
  try {
    // Create content quality verifier
    const contentVerifier = new AIContentQualityVerifier({
      enableAIVerification: true,
      minContentLength: 100,
      maxRedundancyThreshold: 0.3,
      requireEducationalValue: true,
      filterBulletPoints: true
    });
    
    // Create AI-enhanced structure organizer
    const aiOrganizer = new AIEnhancedStructureOrganizer({
      useAIOrganization: true,
      maxSectionsPerPart: 6,
      minSectionLength: 200,
      preventFragmentation: true,
      groupRelatedContent: true
    });
    
    // Extract content from files and create enhanced extracted content
    const extractedContents = await extractContentFromFiles(files, logger);
    
    // Verify and improve content quality before organization
    logger.log('content_verification_start', { contentsCount: extractedContents.length });
    const verifiedContents = await verifyContentQuality(extractedContents, contentVerifier, logger);
    
    // Use AI-enhanced organizer to create well-structured document
    const organizedDocument = await aiOrganizer.organizeContentWithAI(
      verifiedContents,
      config.title || 'Compact Study Guide'
    );
    
    logger.log('ai_enhanced_processing_complete', {
      partsCreated: organizedDocument.parts.length,
      totalSections: organizedDocument.parts.reduce((sum, part) => sum + part.sections.length, 0),
      totalFormulas: organizedDocument.metadata?.totalFormulas || 0,
      totalExamples: organizedDocument.metadata?.totalExamples || 0,
      contentQualityImproved: true
    });
    
    return organizedDocument;
    
  } catch (error) {
    logger.log('ai_enhanced_processing_failed', {}, error as Error);
    console.log('⚠️ AI-enhanced processing failed, using improved basic processing');
    
    // Fall back to improved basic processing
    return createImprovedBasicDocument(files, config, logger);
  }
}

// Extract content from files with proper error handling
async function extractContentFromFiles(
  files: Array<{ file: File; type: 'probability' | 'relations' | 'general' }>,
  logger: CompactStudyDebugger
): Promise<any[]> {
  const extractedContents: any[] = [];
  for (const { file, type } of files) {
    try {
      // Direct content extraction
      let extractedText = '';
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text || '';
        } catch (pdfError) {
          logger.log('direct_pdf_error', { fileName: file.name }, pdfError as Error);
          extractedText = `PDF processing failed for ${file.name}`;
        }
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          extractedText = new TextDecoder().decode(arrayBuffer);
        } catch (textError) {
          logger.log('direct_text_error', { fileName: file.name }, textError as Error);
          extractedText = `Text processing failed for ${file.name}`;
        }
      }
      
      if (extractedText.length === 0) {
        extractedText = `No content extracted from ${file.name} (${file.size} bytes)`;
      }
      
      // Create enhanced extracted content structure
      const enhancedContent = {
        text: extractedText,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date()
        },
        mathematicalContent: {
          formulas: extractFormulasFromText(extractedText),
          workedExamples: extractExamplesFromText(extractedText),
          definitions: [],
          theorems: []
        }
      };
      
      extractedContents.push(enhancedContent);
      
      logger.log('content_extracted', { 
        fileName: file.name, 
        textLength: extractedText.length,
        formulasFound: enhancedContent.mathematicalContent.formulas.length,
        examplesFound: enhancedContent.mathematicalContent.workedExamples.length
      });
      
    } catch (error) {
      logger.log('content_extraction_error', { fileName: file.name }, error as Error);
      
      // Create minimal content even for failed files
      extractedContents.push({
        text: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date()
        },
        mathematicalContent: {
          formulas: [],
          workedExamples: [],
          definitions: [],
          theorems: []
        }
      });
    }
  }
  
  return extractedContents;
}

// Improved basic document creation (fallback when AI processing fails)
async function createImprovedBasicDocument(
  files: Array<{ file: File; type: 'probability' | 'relations' | 'general' }>,
  config: GenerateCompactStudyRequest['config'],
  logger: CompactStudyDebugger
): Promise<AcademicDocument> {
  logger.log('improved_basic_processing_start', { filesCount: files.length });
  
  // Create content quality verifier for basic processing too
  const contentVerifier = new AIContentQualityVerifier({
    enableAIVerification: false, // Use rule-based verification for fallback
    minContentLength: 50,
    maxRedundancyThreshold: 0.4,
    requireEducationalValue: false,
    filterBulletPoints: true
  });
  
  const parts: any[] = [];
  
  for (const { file, type } of files) {
    try {
      // Direct content extraction
      let extractedText = '';
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text || '';
        } catch (pdfError) {
          logger.log('basic_pdf_error', { fileName: file.name }, pdfError as Error);
          extractedText = `PDF processing failed for ${file.name}`;
        }
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          extractedText = new TextDecoder().decode(arrayBuffer);
        } catch (textError) {
          logger.log('basic_text_error', { fileName: file.name }, textError as Error);
          extractedText = `Text processing failed for ${file.name}`;
        }
      }
      
      if (extractedText.length === 0) {
        extractedText = `No content extracted from ${file.name} (${file.size} bytes)`;
      }
      
      // Verify and improve content quality even in basic processing
      let improvedText = extractedText;
      try {
        const verificationResult = await contentVerifier.verifyAndImproveContent(
          extractedText,
          { fileName: file.name, subject: detectSubject(extractedText) }
        );
        improvedText = verificationResult.verifiedContent;
        
        logger.log('basic_content_improved', {
          fileName: file.name,
          originalLength: extractedText.length,
          improvedLength: improvedText.length,
          issuesFixed: verificationResult.issuesFixed.length
        });
      } catch (error) {
        logger.log('basic_content_verification_failed', { fileName: file.name }, error as Error);
      }
      
      // Create improved sections with better organization
      const sections = createImprovedSections(improvedText, parts.length + 1, file.name);
      
      // Determine part title from file name and content
      const partTitle = generatePartTitle(file.name, extractedText);
      
      parts.push({
        partNumber: parts.length + 1,
        title: partTitle,
        sections
      });
      
      logger.log('basic_file_processed', { 
        fileName: file.name, 
        originalLength: extractedText.length,
        improvedLength: improvedText.length,
        sectionsCreated: sections.length 
      });
      
    } catch (error) {
      logger.log('basic_file_error', { fileName: file.name }, error as Error);
      
      // Create minimal section even for failed files
      parts.push({
        partNumber: parts.length + 1,
        title: file.name.replace(/\.(pdf|txt|docx?)$/i, ''),
        sections: [{
          sectionNumber: `${parts.length + 1}.1`,
          title: 'Processing Error',
          content: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          formulas: [],
          examples: [],
          subsections: []
        }]
      });
    }
  }
  
  return {
    title: config.title || 'Improved Compact Study Guide',
    tableOfContents: parts.map((part, index) => ({
      id: `part${index + 1}`,
      title: part.title,
      level: 1,
      pageNumber: index + 1
    })),
    parts,
    crossReferences: [],
    appendices: [],
    metadata: {
      generatedAt: new Date(),
      sourceFiles: files.map(f => f.file.name),
      totalSections: parts.reduce((sum, part) => sum + part.sections.length, 0),
      totalFormulas: 0,
      totalExamples: 0,
      preservationScore: 0.75
    }
  };
}

// Create improved sections with better organization
function createImprovedSections(text: string, partNumber: number, fileName: string): any[] {
  if (text.length === 0) {
    return [{
      sectionNumber: `${partNumber}.1`,
      title: 'Content Overview',
      content: `No text content available from ${fileName}`,
      formulas: [],
      examples: [],
      subsections: []
    }];
  }
  
  // Improved section creation with better boundaries
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const sections: any[] = [];
  
  // Look for natural section breaks
  const sectionBreaks: number[] = [0]; // Start with beginning
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect section headers
    if (isLikelySectionHeader(line)) {
      sectionBreaks.push(i);
    }
  }
  
  // Add end
  sectionBreaks.push(lines.length);
  
  // Create sections from breaks
  for (let i = 0; i < sectionBreaks.length - 1; i++) {
    const start = sectionBreaks[i];
    const end = sectionBreaks[i + 1];
    const sectionLines = lines.slice(start, end);
    
    if (sectionLines.length === 0) continue;
    
    const sectionContent = sectionLines.join('\n');
    
    // Skip very short sections unless it's the only one
    if (sectionContent.length < 100 && sectionBreaks.length > 3) continue;
    
    const firstLine = sectionLines[0].trim();
    const title = firstLine.length > 5 && firstLine.length < 80 
      ? firstLine 
      : `Section ${sections.length + 1}`;
    
    sections.push({
      sectionNumber: `${partNumber}.${sections.length + 1}`,
      title: title,
      content: sectionContent,
      formulas: extractFormulasFromText(sectionContent),
      examples: extractExamplesFromText(sectionContent),
      subsections: []
    });
  }
  
  // Ensure we have at least one section
  if (sections.length === 0) {
    sections.push({
      sectionNumber: `${partNumber}.1`,
      title: fileName.replace(/\.(pdf|txt|docx?)$/i, ''),
      content: text.substring(0, Math.min(1000, text.length)),
      formulas: extractFormulasFromText(text),
      examples: extractExamplesFromText(text),
      subsections: []
    });
  }
  
  return sections;
}

// Check if a line is likely a section header
function isLikelySectionHeader(line: string): boolean {
  if (line.length < 3 || line.length > 100) return false;
  
  // Numbered sections
  if (/^\d+\./.test(line)) return true;
  
  // All caps (but not too long)
  if (line === line.toUpperCase() && line.length < 50) return true;
  
  // Title case without ending punctuation
  if (isTitleCase(line) && !line.endsWith('.') && !line.endsWith(',')) return true;
  
  return false;
}

// Check if text is in title case
function isTitleCase(text: string): boolean {
  const words = text.split(' ');
  if (words.length < 2) return false;
  
  return words.every(word => {
    if (word.length === 0) return true;
    const commonWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
    return /^[A-Z][a-z]*$/.test(word) || commonWords.includes(word.toLowerCase());
  });
}

// Generate part title from file name and content
function generatePartTitle(fileName: string, text: string): string {
  const baseName = fileName.replace(/\.(pdf|txt|docx?)$/i, '');
  const lowerText = text.toLowerCase();
  
  // Try to extract meaningful title from content
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Look for title-like content in first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 5 && line.length < 100 && !line.includes('Page') && !line.includes('©')) {
      if (!/^\d+\./.test(line) && !/^[a-z]/.test(line)) {
        return line;
      }
    }
  }
  
  // Content-based detection
  if (lowerText.includes('probability') || lowerText.includes('bayes') || lowerText.includes('random')) {
    return baseName.includes('probability') ? baseName : `Probability - ${baseName}`;
  } else if (lowerText.includes('relation') || lowerText.includes('reflexive') || lowerText.includes('symmetric')) {
    return baseName.includes('relation') ? baseName : `Relations - ${baseName}`;
  } else if (lowerText.includes('counting') || lowerText.includes('combinat') || lowerText.includes('permut')) {
    return baseName.includes('counting') ? baseName : `Counting - ${baseName}`;
  } else {
    return baseName;
  }
}

// Extract formulas from text using pattern matching
function extractFormulasFromText(text: string): any[] {
  const formulas: any[] = [];
  
  // Pattern for LaTeX-style formulas
  const latexPatterns = [
    /\$([^$]+)\$/g,
    /\\\(([^)]+)\\\)/g,
    /\\\[([^\]]+)\\\]/g
  ];
  
  // Pattern for mathematical expressions
  const mathPatterns = [
    /[a-zA-Z]\s*=\s*[^,\s.]+/g,
    /P\([^)]+\)\s*=\s*[^,\s.]+/g,
    /E\[[^\]]+\]\s*=\s*[^,\s.]+/g,
    /\b\d+\s*[+\-*/=]\s*\d+/g
  ];
  
  let formulaId = 1;
  
  // Extract LaTeX formulas
  for (const pattern of latexPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      formulas.push({
        id: `formula_${formulaId++}`,
        latex: match[1],
        original: match[0],
        context: extractContext(text, match.index, 100)
      });
    }
  }
  
  // Extract mathematical expressions
  for (const pattern of mathPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!formulas.some(f => f.original === match[0])) {
        formulas.push({
          id: `formula_${formulaId++}`,
          latex: match[0],
          original: match[0],
          context: extractContext(text, match.index, 100)
        });
      }
    }
  }
  
  return formulas.slice(0, 10); // Limit to 10 formulas per document
}

// Extract examples from text using pattern matching
function extractExamplesFromText(text: string): any[] {
  const examples: any[] = [];
  
  const examplePatterns = [
    /Example\s+\d+[:.]\s*([^.!?]*[.!?])/gi,
    /Problem\s+\d+[:.]\s*([^.!?]*[.!?])/gi,
    /Exercise\s+\d+[:.]\s*([^.!?]*[.!?])/gi
  ];
  
  let exampleId = 1;
  
  for (const pattern of examplePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const problem = match[1].trim();
      const context = extractContext(text, match.index, 200);
      
      // Look for solution in the following text
      const solutionMatch = context.match(/Solution[:.]\s*([^.!?]*[.!?])/i);
      const solution = solutionMatch ? solutionMatch[1].trim() : '';
      
      examples.push({
        id: `example_${exampleId++}`,
        problem,
        solution,
        context: context.substring(0, 150)
      });
    }
  }
  
  return examples.slice(0, 5); // Limit to 5 examples per document
}

// Extract context around a match
function extractContext(text: string, index: number, length: number): string {
  const start = Math.max(0, index - length / 2);
  const end = Math.min(text.length, index + length / 2);
  return text.substring(start, end);
}

// Verify and improve content quality
async function verifyContentQuality(
  extractedContents: any[],
  contentVerifier: AIContentQualityVerifier,
  logger: CompactStudyDebugger
): Promise<any[]> {
  const verifiedContents: any[] = [];
  
  for (const [index, content] of extractedContents.entries()) {
    try {
      logger.log('verifying_content', { 
        fileName: content.metadata.name,
        originalLength: content.text.length 
      });
      
      // Check if content has mathematical elements that should be preserved
      const hasFormulas = content.mathematicalContent.formulas.length > 0;
      const hasExamples = content.mathematicalContent.workedExamples.length > 0;
      const hasMathInText = /\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]|[=<>≤≥≠±∞∑∏∫]/.test(content.text);
      
      let verificationResult;
      
      if (hasFormulas || hasExamples || hasMathInText) {
        // Skip verification for mathematical content to preserve formulas and examples
        logger.log('skipping_verification_for_math', {
          fileName: content.metadata.name,
          hasFormulas,
          hasExamples,
          hasMathInText,
          formulasCount: content.mathematicalContent.formulas.length,
          examplesCount: content.mathematicalContent.workedExamples.length
        });
        
        verificationResult = {
          originalContent: content.text,
          verifiedContent: content.text, // Keep original content
          qualityImprovement: 0,
          issuesFixed: [],
          preservedElements: {
            formulas: content.mathematicalContent.formulas,
            examples: content.mathematicalContent.workedExamples,
            definitions: []
          }
        };
      } else {
        // Use verification for non-mathematical content
        verificationResult = await contentVerifier.verifyAndImproveContent(
          content.text,
          {
            fileName: content.metadata.name,
            subject: detectSubject(content.text),
            type: content.metadata.type
          }
        );
      }
      
      // Create improved content structure
      const improvedContent = {
        ...content,
        text: verificationResult.verifiedContent,
        qualityMetadata: {
          originalLength: verificationResult.originalContent.length,
          improvedLength: verificationResult.verifiedContent.length,
          qualityImprovement: verificationResult.qualityImprovement,
          issuesFixed: verificationResult.issuesFixed.length,
          preservedElements: verificationResult.preservedElements
        }
      };
      
      // Preserve original mathematical content and merge with any new content found
      const originalFormulas = content.mathematicalContent.formulas || [];
      const originalExamples = content.mathematicalContent.workedExamples || [];
      
      // Extract any new mathematical content from improved text
      const newFormulas = extractFormulasFromText(verificationResult.verifiedContent);
      const newExamples = extractExamplesFromText(verificationResult.verifiedContent);
      
      // Merge original and new content, prioritizing original
      const mergedFormulas = [...originalFormulas];
      newFormulas.forEach(newFormula => {
        if (!mergedFormulas.some(existing => existing.latex === newFormula.latex || existing.original === newFormula.original)) {
          mergedFormulas.push(newFormula);
        }
      });
      
      const mergedExamples = [...originalExamples];
      newExamples.forEach(newExample => {
        if (!mergedExamples.some(existing => existing.problem === newExample.problem)) {
          mergedExamples.push(newExample);
        }
      });
      
      improvedContent.mathematicalContent = {
        formulas: mergedFormulas,
        workedExamples: mergedExamples,
        definitions: [],
        theorems: []
      };
      
      verifiedContents.push(improvedContent);
      
      logger.log('content_verified', {
        fileName: content.metadata.name,
        originalLength: verificationResult.originalContent.length,
        improvedLength: verificationResult.verifiedContent.length,
        qualityImprovement: Math.round(verificationResult.qualityImprovement * 100),
        issuesFixed: verificationResult.issuesFixed.length,
        originalFormulas: originalFormulas.length,
        newFormulas: newFormulas.length,
        mergedFormulas: mergedFormulas.length,
        originalExamples: originalExamples.length,
        newExamples: newExamples.length,
        mergedExamples: mergedExamples.length
      });
      
    } catch (error) {
      logger.log('content_verification_error', { 
        fileName: content.metadata.name 
      }, error as Error);
      
      // Use original content if verification fails
      verifiedContents.push(content);
    }
  }
  
  return verifiedContents;
}

// Create enhanced example content for comprehensive study guide visualization
function createEnhancedExampleContent(example: any, section: any, part: any): string {
  let content = '';
  
  // Determine subject area from part title and section content
  const subject = detectSubjectFromContext(part.title, section.title, section.content);
  const template = determineExampleTemplate(example, subject);
  
  // Add metadata for better image generation
  content += `subject: ${subject}\n`;
  content += `template: ${template}\n`;
  content += `context: ${section.title} - ${part.title}\n\n`;
  
  // Enhanced problem statement
  content += `Problem: ${example.problem || 'Example problem'}\n\n`;
  
  // Add given information if available
  const givenInfo = extractGivenInformation(example.problem || '');
  if (givenInfo.length > 0) {
    content += `Given:\n`;
    givenInfo.forEach(info => {
      content += `• ${info}\n`;
    });
    content += '\n';
  }
  
  // Add what we need to find
  const findInfo = extractFindInformation(example.problem || '');
  if (findInfo) {
    content += `Find: ${findInfo}\n\n`;
  }
  
  // Enhanced solution with steps
  if (example.solution) {
    content += `Solution:\n`;
    
    // Try to break down the solution into steps
    const solutionSteps = extractSolutionSteps(example.solution, subject);
    if (solutionSteps.length > 1) {
      solutionSteps.forEach((step, index) => {
        content += `Step ${index + 1}: ${step.description}\n`;
        if (step.formula) {
          content += `Formula: ${step.formula}\n`;
        }
        if (step.calculation) {
          content += `Calculation: ${step.calculation}\n`;
        }
        if (step.result) {
          content += `Result: ${step.result}\n`;
        }
        content += '\n';
      });
    } else {
      content += `${example.solution}\n\n`;
    }
  }
  
  // Add relevant formulas from the section
  const relevantFormulas = section.formulas?.slice(0, 2) || []; // Limit to 2 most relevant
  if (relevantFormulas.length > 0) {
    content += `Key Formulas:\n`;
    relevantFormulas.forEach((formula: any) => {
      content += `• ${formula.latex || formula.original || formula.content}\n`;
    });
    content += '\n';
  }
  
  // Add final answer if not already included
  const finalAnswer = extractFinalAnswer(example.solution || '');
  if (finalAnswer) {
    content += `Final Answer: ${finalAnswer}\n`;
  }
  
  return content;
}

// Detect subject from context
function detectSubjectFromContext(partTitle: string, sectionTitle: string, content: string): string {
  const combinedText = `${partTitle} ${sectionTitle} ${content}`.toLowerCase();
  
  if (combinedText.includes('probability') || combinedText.includes('bayes') || combinedText.includes('random')) {
    return 'mathematics';
  } else if (combinedText.includes('relation') || combinedText.includes('reflexive') || combinedText.includes('symmetric')) {
    return 'mathematics';
  } else if (combinedText.includes('counting') || combinedText.includes('combinat') || combinedText.includes('permut')) {
    return 'mathematics';
  } else if (combinedText.includes('physics') || combinedText.includes('force') || combinedText.includes('velocity')) {
    return 'physics';
  } else if (combinedText.includes('chemistry') || combinedText.includes('reaction') || combinedText.includes('molecule')) {
    return 'chemistry';
  } else {
    return 'mathematics'; // Default to mathematics for academic content
  }
}

// Determine appropriate template for example
function determineExampleTemplate(example: any, subject: string): string {
  const problemText = (example.problem || '').toLowerCase();
  const solutionText = (example.solution || '').toLowerCase();
  
  if (solutionText.includes('step') || solutionText.includes('first') || solutionText.includes('then')) {
    return 'step-by-step';
  } else if (problemText.includes('prove') || solutionText.includes('proof') || solutionText.includes('therefore')) {
    return 'proof';
  } else if (solutionText.includes('calculate') || solutionText.includes('=') || /\d+/.test(solutionText)) {
    return 'calculation';
  } else {
    return 'problem-solution';
  }
}

// Extract given information from problem statement
function extractGivenInformation(problem: string): string[] {
  const given: string[] = [];
  
  // Look for common patterns of given information
  const givenPatterns = [
    /given[:\s]+([^.!?]*)/gi,
    /let[:\s]+([^.!?]*)/gi,
    /assume[:\s]+([^.!?]*)/gi,
    /suppose[:\s]+([^.!?]*)/gi,
    /if[:\s]+([^.!?]*)/gi
  ];
  
  givenPatterns.forEach(pattern => {
    const matches = problem.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const info = match.replace(/^(given|let|assume|suppose|if)[:\s]+/i, '').trim();
        if (info.length > 5 && info.length < 100) {
          given.push(info);
        }
      });
    }
  });
  
  // Look for numerical values and equations
  const numberPattern = /([a-zA-Z]\s*=\s*\d+[^.!?]*)/g;
  const numberMatches = problem.match(numberPattern);
  if (numberMatches) {
    given.push(...numberMatches.map(m => m.trim()));
  }
  
  return [...new Set(given)]; // Remove duplicates
}

// Extract what we need to find
function extractFindInformation(problem: string): string | null {
  const findPatterns = [
    /find[:\s]+([^.!?]*)/gi,
    /determine[:\s]+([^.!?]*)/gi,
    /calculate[:\s]+([^.!?]*)/gi,
    /what\s+is[:\s]+([^.!?]*)/gi,
    /solve\s+for[:\s]+([^.!?]*)/gi
  ];
  
  for (const pattern of findPatterns) {
    const match = problem.match(pattern);
    if (match && match[1]) {
      const findInfo = match[1].trim();
      if (findInfo.length > 3 && findInfo.length < 100) {
        return findInfo;
      }
    }
  }
  
  return null;
}

// Extract solution steps from solution text
function extractSolutionSteps(solution: string, subject: string): any[] {
  const steps: any[] = [];
  
  // Try to identify step markers
  const stepPatterns = [
    /step\s+\d+[:\s]*([^.!?]*[.!?])/gi,
    /first[:\s]*([^.!?]*[.!?])/gi,
    /then[:\s]*([^.!?]*[.!?])/gi,
    /next[:\s]*([^.!?]*[.!?])/gi,
    /finally[:\s]*([^.!?]*[.!?])/gi,
    /therefore[:\s]*([^.!?]*[.!?])/gi
  ];
  
  let stepFound = false;
  stepPatterns.forEach(pattern => {
    const matches = solution.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const description = match.replace(/^(step\s+\d+|first|then|next|finally|therefore)[:\s]*/i, '').trim();
        if (description.length > 10) {
          steps.push({
            description,
            formula: extractFormulaFromStep(description),
            calculation: extractCalculationFromStep(description),
            result: extractResultFromStep(description)
          });
          stepFound = true;
        }
      });
    }
  });
  
  // If no explicit steps found, try to break by sentences
  if (!stepFound && solution.length > 100) {
    const sentences = solution.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length > 1) {
      sentences.forEach(sentence => {
        steps.push({
          description: sentence.trim(),
          formula: extractFormulaFromStep(sentence),
          calculation: extractCalculationFromStep(sentence),
          result: extractResultFromStep(sentence)
        });
      });
    }
  }
  
  return steps;
}

// Extract formula from step text
function extractFormulaFromStep(stepText: string): string | null {
  const formulaPatterns = [
    /formula[:\s]*([^.!?]*)/gi,
    /using[:\s]*([^.!?]*)/gi,
    /([a-zA-Z]\s*=\s*[^.!?]*)/g
  ];
  
  for (const pattern of formulaPatterns) {
    const match = stepText.match(pattern);
    if (match && match[1]) {
      const formula = match[1].trim();
      if (formula.length > 3 && formula.length < 50) {
        return formula;
      }
    }
  }
  
  return null;
}

// Extract calculation from step text
function extractCalculationFromStep(stepText: string): string | null {
  const calcPattern = /(\d+[^.!?]*=\s*\d+[^.!?]*)/g;
  const match = stepText.match(calcPattern);
  if (match && match[0]) {
    return match[0].trim();
  }
  return null;
}

// Extract result from step text
function extractResultFromStep(stepText: string): string | null {
  const resultPatterns = [
    /result[:\s]*([^.!?]*)/gi,
    /answer[:\s]*([^.!?]*)/gi,
    /=\s*([^.!?]*)/g
  ];
  
  for (const pattern of resultPatterns) {
    const match = stepText.match(pattern);
    if (match && match[1]) {
      const result = match[1].trim();
      if (result.length > 1 && result.length < 30) {
        return result;
      }
    }
  }
  
  return null;
}

// Extract final answer from solution
function extractFinalAnswer(solution: string): string | null {
  const answerPatterns = [
    /final\s+answer[:\s]*([^.!?]*)/gi,
    /answer[:\s]*([^.!?]*)/gi,
    /therefore[:\s]*([^.!?]*)/gi,
    /result[:\s]*([^.!?]*)/gi
  ];
  
  for (const pattern of answerPatterns) {
    const match = solution.match(pattern);
    if (match && match[1]) {
      const answer = match[1].trim();
      if (answer.length > 1 && answer.length < 50) {
        return answer;
      }
    }
  }
  
  // Look for the last equation or numerical result
  const lastEquation = solution.match(/([a-zA-Z]\s*=\s*[^.!?]*)/g);
  if (lastEquation && lastEquation.length > 0) {
    return lastEquation[lastEquation.length - 1].trim();
  }
  
  return null;
}

// Create enhanced formula content for comprehensive visualization
function createEnhancedFormulaContent(formula: any, section: any, part: any): string {
  let content = '';
  
  const formulaText = formula.latex || formula.original || formula.content || '';
  const subject = detectSubjectFromContext(part.title, section.title, section.content);
  
  // Add the main equation
  content += `equation: ${formulaText}\n`;
  content += `subject: ${subject}\n`;
  content += `context: ${section.title} - ${part.title}\n\n`;
  
  // Add context from the formula if available
  if (formula.context) {
    content += `context_text: ${formula.context}\n\n`;
  }
  
  // Try to extract variable definitions from surrounding content
  const variables = extractVariablesFromContext(formulaText, section.content);
  if (variables.length > 0) {
    content += `variables:\n`;
    variables.forEach(variable => {
      content += `• ${variable}\n`;
    });
    content += '\n';
  }
  
  // Add usage information based on the section content
  const usage = extractFormulaUsage(formulaText, section.content, subject);
  if (usage) {
    content += `usage: ${usage}\n\n`;
  }
  
  // Add related examples if available
  const relatedExamples = section.examples?.slice(0, 1) || []; // Just one example
  if (relatedExamples.length > 0) {
    const example = relatedExamples[0];
    content += `example_application:\n`;
    content += `Problem: ${example.problem || 'See related example'}\n`;
    if (example.solution) {
      content += `Solution: ${example.solution.substring(0, 100)}${example.solution.length > 100 ? '...' : ''}\n`;
    }
  }
  
  return content;
}

// Extract variables from context
function extractVariablesFromContext(formula: string, context: string): string[] {
  const variables: string[] = [];
  
  // Extract single letter variables from formula
  const formulaVars = formula.match(/[a-zA-Z]/g) || [];
  const uniqueVars = [...new Set(formulaVars)].filter(v => 
    !['sin', 'cos', 'tan', 'log', 'ln', 'exp'].some(func => func.includes(v))
  );
  
  // Look for variable definitions in context
  uniqueVars.forEach(variable => {
    const varPattern = new RegExp(`${variable}[\\s]*[=:]?[\\s]*([^.!?\\n]{10,80})`, 'gi');
    const match = context.match(varPattern);
    if (match && match[0]) {
      const definition = match[0].replace(new RegExp(`^${variable}[\\s]*[=:]?[\\s]*`, 'i'), '').trim();
      if (definition.length > 5 && definition.length < 80) {
        variables.push(`${variable}: ${definition}`);
      }
    } else {
      // Add variable without definition
      variables.push(`${variable}: variable in the equation`);
    }
  });
  
  return variables.slice(0, 5); // Limit to 5 variables
}

// Extract formula usage from context
function extractFormulaUsage(formula: string, context: string, subject: string): string | null {
  // Look for usage patterns in the context
  const usagePatterns = [
    /used\s+to\s+([^.!?]*)/gi,
    /applies\s+to\s+([^.!?]*)/gi,
    /formula\s+for\s+([^.!?]*)/gi,
    /calculates?\s+([^.!?]*)/gi,
    /determines?\s+([^.!?]*)/gi
  ];
  
  for (const pattern of usagePatterns) {
    const match = context.match(pattern);
    if (match && match[1]) {
      const usage = match[1].trim();
      if (usage.length > 5 && usage.length < 100) {
        return usage;
      }
    }
  }
  
  // Default usage based on subject and formula type
  if (formula.includes('P(') || formula.includes('probability')) {
    return 'calculating probability of events';
  } else if (formula.includes('=') && subject === 'mathematics') {
    return 'solving mathematical relationships';
  } else if (formula.includes('∑') || formula.includes('sum')) {
    return 'calculating sums and series';
  } else if (formula.includes('∫') || formula.includes('integral')) {
    return 'finding areas and accumulations';
  }
  
  return null;
}

// Detect subject from content
function detectSubject(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('probability') || lowerText.includes('bayes') || lowerText.includes('random')) {
    return 'probability';
  } else if (lowerText.includes('relation') || lowerText.includes('reflexive') || lowerText.includes('symmetric')) {
    return 'relations';
  } else if (lowerText.includes('counting') || lowerText.includes('combinat') || lowerText.includes('permut')) {
    return 'counting';
  } else if (lowerText.includes('math') || lowerText.includes('equation') || lowerText.includes('formula')) {
    return 'mathematics';
  } else {
    return 'general';
  }
}

// Fallback document creation when main pipeline fails
async function createFallbackDocument(
  files: Array<{ file: File; type: 'probability' | 'relations' | 'general' }>,
  config: GenerateCompactStudyRequest['config'],
  logger: CompactStudyDebugger
): Promise<AcademicDocument> {
  logger.log('fallback_document_creation', { filesCount: files.length });
  
  const fileProcessor = createSafeFileProcessor();
  const mathExtractor = createFallbackMathExtractor();
  
  const parts: any[] = [];
  let partNumber = 1;
  
  for (const { file, type } of files) {
    try {
      // Process file safely
      const fileResult = await fileProcessor.processFile(file);
      if (!fileResult.success) {
        logger.log('fallback_file_error', { fileName: file.name, error: fileResult.error });
        continue;
      }
      
      // Extract mathematical content
      const mathContent = mathExtractor.extractMathContent(fileResult.data.text);
      
      // Create basic academic structure
      const partTitle = type === 'probability' 
        ? 'Part I: Discrete Probability'
        : type === 'relations'
        ? 'Part II: Relations'
        : `Part ${partNumber}: ${file.name.replace('.pdf', '')}`;
      
      const sections = [{
        sectionNumber: `${partNumber}.1`,
        title: 'Content Overview',
        content: fileResult.data.text.substring(0, 1000) + (fileResult.data.text.length > 1000 ? '...' : ''),
        formulas: mathContent.formulas || [],
        examples: mathContent.workedExamples || [],
        subsections: []
      }];
      
      parts.push({
        partNumber,
        title: partTitle,
        sections
      });
      
      partNumber++;
      
    } catch (error) {
      logger.log('fallback_file_processing_error', { fileName: file.name }, error as Error);
    }
  }
  
  return {
    title: config.title || 'Compact Study Guide',
    tableOfContents: parts.map((part, index) => ({
      id: `part${index + 1}`,
      title: part.title,
      level: 1,
      pageNumber: index + 1
    })),
    parts,
    crossReferences: [],
    appendices: []
  };
}

// Fallback HTML generation
// IMPROVED_FALLBACK_HTML_V2
function createFallbackHTML(document: AcademicDocument, layoutConfig: CompactLayoutConfig): HTMLOutput {
  console.log('🔧 Generating improved fallback HTML...');
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${document.title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: ${layoutConfig.typography.fontSize}pt; 
      line-height: ${layoutConfig.typography.lineHeight}; 
      column-count: ${layoutConfig.columns}; 
      column-gap: 1em;
      margin: ${layoutConfig.margins.top}in ${layoutConfig.margins.right}in ${layoutConfig.margins.bottom}in ${layoutConfig.margins.left}in;
      color: #333;
    }
    h1 { 
      font-size: 1.5em; 
      margin-top: 0; 
      margin-bottom: ${layoutConfig.spacing.headingMargins.bottom}em; 
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 0.3em;
    }
    h2 { 
      font-size: 1.3em; 
      margin-top: ${layoutConfig.spacing.headingMargins.top}em; 
      margin-bottom: ${layoutConfig.spacing.headingMargins.bottom}em; 
      color: #34495e;
    }
    h3 { 
      font-size: 1.1em; 
      margin-top: ${layoutConfig.spacing.headingMargins.top}em; 
      margin-bottom: ${layoutConfig.spacing.headingMargins.bottom}em; 
      color: #7f8c8d;
    }
    p { 
      margin: ${layoutConfig.spacing.paragraphSpacing}em 0; 
      text-align: justify;
    }
    .formula { 
      text-align: center; 
      margin: 0.8em 0; 
      font-family: 'Courier New', monospace;
      background: #f8f9fa;
      padding: 0.5em;
      border-radius: 4px;
      border-left: 4px solid #3498db;
    }
    .example { 
      margin: 1em 0; 
      padding: 0.8em; 
      border-left: 4px solid #e74c3c; 
      background: #fdf2f2;
      border-radius: 0 4px 4px 0;
    }
    .definition {
      margin: 1em 0;
      padding: 0.8em;
      border-left: 4px solid #27ae60;
      background: #f0f9f0;
      border-radius: 0 4px 4px 0;
    }
    .note {
      font-style: italic;
      color: #7f8c8d;
      margin: 0.5em 0;
    }
    .fallback-notice {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 0.75em;
      border-radius: 4px;
      margin-bottom: 1em;
      font-size: 0.9em;
    }
    .content {
      margin-bottom: 1em;
    }
    .formulas {
      margin: 1em 0;
    }
    .examples {
      margin: 1em 0;
    }
    @media print {
      body { column-count: ${layoutConfig.columns}; }
      .fallback-notice { display: none; }
    }
  </style>
</head>
<body>
  <div class="fallback-notice">
    📋 This document was generated using fallback processing. Some advanced features may not be available.
  </div>
  <h1>${document.title}</h1>
  ${document.parts.map(part => `
    <h2>${part.title}</h2>
    ${part.sections.map(section => `
      <div class="section">
        <h3>${section.title}</h3>
        <div class="content">
          ${section.content ? section.content.split('\n').map(paragraph => 
            paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
          ).join('') : '<p>No content available</p>'}
        </div>
        ${section.formulas && section.formulas.length > 0 ? `
          <div class="formulas">
            ${section.formulas.map(formula => `
              <div class="formula">${formula.latex || formula.content || formula}</div>
            `).join('')}
          </div>
        ` : ''}
        ${section.examples && section.examples.length > 0 ? `
          <div class="examples">
            ${section.examples.map(example => `
              <div class="example">
                <strong>Example:</strong> ${example.problem || example.content || example}
                ${example.solution ? `<br><strong>Solution:</strong> ${example.solution}` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
  `).join('')}
</body>
</html>`;

  return {
    html,
    css: '', // CSS is embedded
    metadata: {
      title: document.title,
      generatedAt: new Date().toISOString(),
      processingMode: 'fallback',
      totalSections: document.parts.reduce((acc, part) => acc + part.sections.length, 0)
    }
  };
}

// Generate images for academic document content - FIXED VERSION
async function generateImagesForDocument(
  document: AcademicDocument,
  imageConfig: any,
  logger: CompactStudyDebugger
): Promise<GeneratedImage[]> {
  const imageGenerator = new SimpleImageGenerator();
  const generatedImages: GeneratedImage[] = [];
  
  logger.log('image_generation_processing_start', { 
    partsCount: document.parts?.length || 0,
    config: imageConfig 
  });

  if (!document.parts || !imageConfig.enabled) {
    logger.log('image_generation_skipped', { 
      reason: !document.parts ? 'no_parts' : 'disabled',
      enabled: imageConfig.enabled 
    });
    return generatedImages;
  }

  // Generate images for each part and section
  for (const part of document.parts) {
    for (const section of part.sections) {
      
      // Generate images for equations if enabled and equations exist
      if (imageConfig.generateForEquations && section.formulas?.length > 0) {
        for (const formula of section.formulas) {
          try {
            const formulaContent = formula.latex || formula.original || formula.content || 'Mathematical formula';
            
            // Create enhanced equation content with context and explanation
            const enhancedFormulaContent = createEnhancedFormulaContent(formula, section, part);
            
            const imageRequest: FlatLineImageRequest = {
              type: 'equation',
              content: enhancedFormulaContent,
              context: `${section.title}: Complete equation analysis from ${part.title}`,
              style: imageConfig.style || {
                lineWeight: 'medium',
                colorScheme: 'monochrome',
                layout: 'vertical', // Changed to vertical for more detailed content
                annotations: true
              },
              dimensions: { width: 500, height: 350 } // Larger dimensions for comprehensive content
            };

            const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest);
            
            // Add to generated images with proper structure
            generatedImages.push(generatedImage);

            logger.log('equation_image_generated', {
              formulaId: formula.id || `formula_${generatedImages.length}`,
              imageId: generatedImage.id,
              sectionTitle: section.title,
              partTitle: part.title
            });
          } catch (error) {
            logger.log('equation_image_error', { 
              formulaId: formula.id || 'unknown',
              sectionTitle: section.title,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Generate images for examples if enabled and examples exist
      if (imageConfig.generateForExamples && section.examples?.length > 0) {
        for (const example of section.examples) {
          try {
            // Create comprehensive example content for study guide
            const enhancedExampleContent = createEnhancedExampleContent(example, section, part);
            
            const imageRequest: FlatLineImageRequest = {
              type: 'example',
              content: enhancedExampleContent,
              context: `${section.title}: Complete worked example from ${part.title}`,
              style: imageConfig.style || {
                lineWeight: 'medium',
                colorScheme: 'monochrome',
                layout: 'vertical',
                annotations: true
              },
              dimensions: { width: 600, height: 400 } // Larger dimensions for detailed content
            };

            const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest);
            
            // Add to generated images
            generatedImages.push(generatedImage);

            logger.log('example_image_generated', {
              exampleId: example.id || `example_${generatedImages.length}`,
              imageId: generatedImage.id,
              sectionTitle: section.title,
              partTitle: part.title
            });
          } catch (error) {
            logger.log('example_image_error', { 
              exampleId: example.id || 'unknown',
              sectionTitle: section.title,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Generate concept diagrams if enabled and sufficient content
      if (imageConfig.generateForConcepts && section.content && section.content.length > 200) {
        try {
          // Extract key concepts from section content
          const concepts = extractKeyConceptsFromText(section.content);
          
          if (concepts.length > 0) {
            const conceptContent = `Key concepts: ${concepts.join(', ')}\n\nContext: ${section.content.substring(0, 300)}...`;
            
            const imageRequest: FlatLineImageRequest = {
              type: 'concept',
              content: conceptContent,
              context: `${section.title}: Concept overview from ${part.title}`,
              style: { 
                ...(imageConfig.style || {}), 
                layout: 'grid',
                lineWeight: 'medium',
                colorScheme: 'monochrome',
                annotations: true
              },
              dimensions: { width: 450, height: 350 }
            };

            const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest);
            
            // Add to generated images
            generatedImages.push(generatedImage);

            logger.log('concept_image_generated', {
              sectionId: section.sectionNumber || `section_${generatedImages.length}`,
              imageId: generatedImage.id,
              conceptsCount: concepts.length,
              sectionTitle: section.title,
              partTitle: part.title
            });
          }
        } catch (error) {
          logger.log('concept_image_error', { 
            sectionId: section.sectionNumber || 'unknown',
            sectionTitle: section.title,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  logger.log('image_generation_processing_complete', { 
    totalImagesGenerated: generatedImages.length,
    equationImages: generatedImages.filter(img => img.metadata.type === 'equation').length,
    exampleImages: generatedImages.filter(img => img.metadata.type === 'example').length,
    conceptImages: generatedImages.filter(img => img.metadata.type === 'concept').length
  });

  return generatedImages;
}

// Extract key concepts from text for concept diagram generation
function extractKeyConceptsFromText(text: string): string[] {
  const concepts: string[] = [];
  
  // Simple concept extraction based on common patterns
  const conceptPatterns = [
    /(?:definition|def):\s*([^.!?]+)/gi,
    /(?:theorem|thm):\s*([^.!?]+)/gi,
    /(?:property|prop):\s*([^.!?]+)/gi,
    /(?:lemma):\s*([^.!?]+)/gi,
    /(?:corollary):\s*([^.!?]+)/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|means|refers to)/g
  ];

  for (const pattern of conceptPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const concept = match[1].trim();
      if (concept.length > 3 && concept.length < 50 && !concepts.includes(concept)) {
        concepts.push(concept);
      }
    }
  }

  // Limit to most relevant concepts
  return concepts.slice(0, 5);
}

// Store study material for post-generation editing
async function storeStudyMaterialForEditing(
  studyMaterialId: string,
  academicDocument: AcademicDocument,
  generatedImages: GeneratedImage[],
  config: GenerateCompactStudyRequest['config'],
  logger: CompactStudyDebugger
): Promise<void> {
  logger.log('storing_study_material', { studyMaterialId });

  // Convert academic document to editable sections
  const sections: any[] = [];
  let sectionOrder = 0;

  if (academicDocument.parts) {
    for (const part of academicDocument.parts) {
      // Add part title as a section
      sections.push({
        id: `part_${part.partNumber}`,
        type: 'text',
        content: `# ${part.title}`,
        order: sectionOrder++,
        editable: true
      });

      // Add each section
      for (const section of part.sections) {
        sections.push({
          id: `section_${section.sectionNumber}`,
          type: 'text',
          content: `## ${section.title}\n\n${section.content}`,
          order: sectionOrder++,
          editable: true
        });

        // Add formulas as separate sections
        if (section.formulas) {
          for (const formula of section.formulas) {
            sections.push({
              id: `formula_${formula.id}`,
              type: 'equation',
              content: formula.latex || formula.original || '',
              order: sectionOrder++,
              editable: true
            });
          }
        }

        // Add examples as separate sections
        if (section.examples) {
          for (const example of section.examples) {
            sections.push({
              id: `example_${example.id}`,
              type: 'example',
              content: `**Problem:** ${example.problem}\n\n**Solution:** ${example.solution || 'Not provided'}`,
              order: sectionOrder++,
              editable: true
            });
          }
        }
      }
    }
  }

  // Prepare study material data
  const studyMaterialData = {
    id: studyMaterialId,
    title: config.title || 'Compact Study Guide',
    sections,
    images: generatedImages,
    metadata: {
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: 1,
      originalGenerationConfig: config
    },
    action: 'create'
  };

  // Store via API call (in a real implementation, this would be a direct database call)
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content-modification/study-material`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studyMaterialData)
    });

    if (!response.ok) {
      throw new Error(`Failed to store study material: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to store study material');
    }

    logger.log('study_material_stored_successfully', { 
      studyMaterialId,
      sectionsCount: sections.length,
      imagesCount: generatedImages.length
    });
  } catch (error) {
    logger.log('study_material_storage_failed', { studyMaterialId }, error as Error);
    throw error;
  }
}

// Fallback Markdown generation
function createFallbackMarkdown(document: AcademicDocument): MarkdownOutput {
  const markdown = `---
title: "${document.title}"
author: "Generated by Compact Study Generator"
date: "${new Date().toISOString().split('T')[0]}"
---

# ${document.title}

${document.parts.map(part => `
## ${part.title}

${part.sections.map(section => `
### ${section.sectionNumber ? section.sectionNumber + ' ' : ''}${section.title}

${section.content || 'No content available'}

${section.formulas && section.formulas.length > 0 ? 
  section.formulas.map(formula => `$$${formula.latex || formula.content || formula}$$`).join('\n\n') : ''}

${section.examples && section.examples.length > 0 ? 
  section.examples.map(example => `
#### ${example.title || 'Example'}

${example.problem || example.content || example}
${example.solution ? `\n**Solution:** ${example.solution}` : ''}
`).join('') : ''}
`).join('')}
`).join('')}`;

  return {
    markdown,
    pandocTemplate: '',
    metadata: {
      generatedAt: new Date(),
      format: 'markdown',
      sourceFiles: ['fallback'],
      config: {},
      stats: {
        totalSections: document.parts.reduce((sum, part) => sum + part.sections.length, 0),
        totalFormulas: document.parts.reduce((sum, part) => 
          sum + part.sections.reduce((sSum, section) => sSum + section.formulas.length, 0), 0),
        totalExamples: document.parts.reduce((sum, part) => 
          sum + part.sections.reduce((sSum, section) => sSum + section.examples.length, 0), 0),
        estimatedPrintPages: Math.max(1, Math.ceil(document.parts.length / 2))
      },
      preservationScore: 0.8
    }
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logger = new CompactStudyDebugger();
  let processingWarnings: string[] = [];
  let processingErrors: string[] = [];

  try {
    logger.log('request_start', { timestamp: new Date().toISOString() });
    
    // Clear file processing cache to ensure fresh content extraction for each request
    const { clearGlobalCache } = await import("@/backend/lib/file-processing");
    clearGlobalCache();
    logger.log('cache_cleared', { reason: 'ensure_fresh_content' });

    // Parse request data with error handling
    let data: GenerateCompactStudyRequest;
    try {
      data = await request.json();
      logger.log('request_parsed', { filesCount: data.files?.length, config: data.config });
    } catch (parseError) {
      logger.log('request_parse_error', {}, parseError as Error);
      return NextResponse.json({ 
        success: false,
        message: "Invalid JSON in request body",
        errors: [(parseError as Error).message],
        processingTime: Date.now() - startTime
      }, { status: 400 });
    }

    // Validate request with detailed error messages
    const validation = validateRequest(data);
    if (!validation.valid) {
      logger.log('validation_failed', { errors: validation.errors });
      return NextResponse.json({ 
        success: false,
        message: "Request validation failed",
        errors: validation.errors,
        processingTime: Date.now() - startTime
      }, { status: 400 });
    }

    // Convert base64 files to File objects with error handling
    let files: Array<{ file: File; type: 'probability' | 'relations' | 'general' }>;
    try {
      files = data.files.map((fileData, index) => {
        const file = createFileFromBase64(fileData.name, fileData.content, fileData.type);
        logger.log('file_converted', { 
          index, 
          name: fileData.name, 
          type: fileData.type, 
          size: file.size,
          mimeType: file.type,
          contentPreview: fileData.content.substring(0, 50) + '...'
        });
        return {
          file,
          type: fileData.type
        };
      });
      logger.log('files_converted', { count: files.length });
    } catch (fileError) {
      logger.log('file_conversion_error', {}, fileError as Error);
      return NextResponse.json({
        success: false,
        message: 'Failed to process uploaded files',
        errors: [`File conversion error: ${(fileError as Error).message}`],
        processingTime: Date.now() - startTime
      }, { status: 400 });
    }

    console.log(`📚 Starting compact study generation for ${files.length} files...`);
    logger.log('processing_start', { filesCount: files.length });

    // Create pipeline configuration
    const pipelineConfig = createPipelineConfig(data.config);
    logger.log('pipeline_config_created', pipelineConfig);
    
    // Process documents through AI-enhanced direct processing
    let academicDocument: AcademicDocument;
    let generatedImages: GeneratedImage[] = [];
    
    try {
      // Use AI-enhanced direct processing instead of complex pipeline
      academicDocument = await createDirectProcessingDocument(files, data.config, logger);
      console.log('✅ Document processing completed');
      logger.log('pipeline_completed', { 
        title: academicDocument.title,
        partsCount: academicDocument.parts?.length || 0,
        totalSections: academicDocument.parts?.reduce((sum, part) => sum + part.sections.length, 0) || 0
      });
      
      // Log content preview for debugging
      academicDocument.parts?.forEach((part, partIndex) => {
        logger.log('part_content', {
          partIndex,
          title: part.title,
          sectionsCount: part.sections.length,
          firstSectionContent: part.sections[0]?.content?.substring(0, 100) + '...'
        });
      });

      // Generate images if enabled
      if (pipelineConfig.imageGenerationConfig?.enabled) {
        console.log('🎨 Generating flat-line images...');
        logger.log('image_generation_start', {});
        
        try {
          generatedImages = await generateImagesForDocument(academicDocument, pipelineConfig.imageGenerationConfig, logger);
          console.log(`✅ Generated ${generatedImages.length} images`);
          logger.log('image_generation_success', { imagesCount: generatedImages.length });
        } catch (imageError) {
          console.warn('Image generation failed:', imageError);
          logger.log('image_generation_error', {}, imageError as Error);
          processingWarnings.push('Image generation failed, proceeding without images');
        }
      }
      
    } catch (pipelineError) {
      console.error('Pipeline processing failed:', pipelineError);
      logger.log('pipeline_error', {}, pipelineError as Error);
      
      // Try fallback processing with more aggressive content extraction
      try {
        logger.log('fallback_processing_start', {});
        academicDocument = await createFallbackDocument(files, data.config, logger);
        processingWarnings.push('Used fallback processing due to pipeline error');
        logger.log('fallback_processing_success', {
          partsCount: academicDocument.parts?.length || 0,
          totalSections: academicDocument.parts?.reduce((sum, part) => sum + part.sections.length, 0) || 0
        });
        
        // Log fallback content for debugging
        academicDocument.parts?.forEach((part, partIndex) => {
          logger.log('fallback_part_content', {
            partIndex,
            title: part.title,
            sectionsCount: part.sections.length,
            firstSectionContent: part.sections[0]?.content?.substring(0, 100) + '...'
          });
        });
        
      } catch (fallbackError) {
        logger.log('fallback_processing_error', {}, fallbackError as Error);
        processingErrors.push(`Pipeline processing failed: ${pipelineError instanceof Error ? pipelineError.message : 'Unknown error'}`);
        processingErrors.push(`Fallback processing failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        
        return NextResponse.json({
          success: false,
          message: 'Failed to process documents',
          errors: processingErrors,
          debugLogs: logger.getLogs(),
          processingTime: Date.now() - startTime
        }, { status: 500 });
      }
    }

    // Create layout configuration
    const layoutConfig = createCompactLayoutConfig(data.config);

    // Generate outputs based on requested format
    const outputFormat = data.config.outputFormat;
    let htmlOutput: HTMLOutput | null = null;
    let pdfOutput: PDFOutput | null = null;
    let markdownOutput: MarkdownOutput | null = null;

    try {
      // Generate HTML output (always generated as base for other formats)
      if (outputFormat === 'html' || outputFormat === 'all') {
        console.log('🔄 Generating HTML output...');
        logger.log('html_generation_start', {});
        try {
          htmlOutput = await generateCompactHTML(academicDocument, {
            includeTableOfContents: true,
            includeMathJax: true,
            compactMode: data.config.layout === 'compact',
            removeCardComponents: true,
            generateResponsive: true
          }, layoutConfig);
          console.log('✅ HTML generation completed');
          logger.log('html_generation_success', { htmlLength: htmlOutput.html.length });
        } catch (htmlError) {
          logger.log('html_generation_error', {}, htmlError as Error);
          // Create fallback HTML
          htmlOutput = createFallbackHTML(academicDocument, layoutConfig);
          processingWarnings.push('Used fallback HTML generation');
        }
      }

      // Generate PDF output
      if (outputFormat === 'pdf' || outputFormat === 'all') {
        console.log('🔄 Generating PDF output...');
        logger.log('pdf_generation_start', {});
        try {
          const pdfGenerator = new PDFOutputGenerator();
          pdfOutput = await pdfGenerator.generatePDF(academicDocument, layoutConfig, {
            includeSource: false,
            timeout: 60000, // Increased timeout for better reliability
            engine: 'pdflatex'
          });
          console.log('✅ PDF generation completed');
          logger.log('pdf_generation_success', { pageCount: pdfOutput.pageCount });
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          logger.log('pdf_generation_error', {}, pdfError as Error);
          
          // Provide more specific warning message
          const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
          if (errorMessage.includes('LaTeX')) {
            processingWarnings.push('PDF generation failed due to LaTeX issues. LaTeX may not be installed or configured properly.');
          } else if (errorMessage.includes('Puppeteer')) {
            processingWarnings.push('PDF generation failed due to browser issues. Puppeteer may not be properly configured.');
          } else {
            processingWarnings.push('PDF generation failed, only HTML/Markdown available');
          }
        }
      }

      // Generate Markdown output
      if (outputFormat === 'markdown' || outputFormat === 'all') {
        console.log('🔄 Generating Markdown output...');
        logger.log('markdown_generation_start', {});
        try {
          markdownOutput = await generateCompactMarkdown(academicDocument, {
            includeFrontMatter: true,
            includeTableOfContents: true,
            mathDelimiters: 'latex',
            codeBlocks: true,
            preserveLineBreaks: false,
            pandocCompatible: true,
            generateTemplate: true
          }, layoutConfig, {
            template: 'compact',
            mathRenderer: 'mathjax',
            variables: {
              title: data.config.title || 'Compact Study Guide',
              author: 'Generated by Compact Study Generator',
              date: new Date().toISOString().split('T')[0]
            }
          });
          console.log('✅ Markdown generation completed');
          logger.log('markdown_generation_success', { markdownLength: markdownOutput.markdown.length });
        } catch (markdownError) {
          logger.log('markdown_generation_error', {}, markdownError as Error);
          // Create fallback Markdown
          markdownOutput = createFallbackMarkdown(academicDocument);
          processingWarnings.push('Used fallback Markdown generation');
        }
      }

    } catch (outputError) {
      console.error('Output generation failed:', outputError);
      logger.log('output_generation_critical_error', {}, outputError as Error);
      processingErrors.push(`Output generation failed: ${outputError instanceof Error ? outputError.message : 'Unknown error'}`);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to generate output',
        errors: processingErrors,
        debugLogs: logger.getLogs(),
        processingTime: Date.now() - startTime
      }, { status: 500 });
    }

    // Prepare response
    const processingTime = Date.now() - startTime;
    
    // Use metadata from the first available output, or create fallback metadata
    const metadata = htmlOutput?.metadata || pdfOutput?.metadata || markdownOutput?.metadata || {
      generatedAt: new Date(),
      format: outputFormat,
      sourceFiles: files.map(f => f.file.name),
      stats: {
        totalSections: academicDocument.parts?.reduce((sum, part) => sum + (part.sections?.length || 0), 0) || 0,
        totalFormulas: academicDocument.metadata?.totalFormulas || 0,
        totalExamples: academicDocument.metadata?.totalExamples || 0,
        estimatedPrintPages: 1,
        totalImages: generatedImages.length
      },
      preservationScore: academicDocument.metadata?.preservationScore || 0.8
    };

    // Generate unique study material ID for post-generation editing
    const studyMaterialId = `study-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store study material for post-generation editing if enabled
    if (data.config.enablePostGenerationEditing) {
      try {
        await storeStudyMaterialForEditing(studyMaterialId, academicDocument, generatedImages, data.config, logger);
        logger.log('study_material_stored', { studyMaterialId });
      } catch (storeError) {
        logger.log('study_material_store_error', { studyMaterialId }, storeError as Error);
        processingWarnings.push('Failed to store study material for editing');
      }
    }

    // Ensure stats are always available
    const stats = metadata.stats || {
      totalSections: academicDocument.parts?.reduce((sum, part) => sum + (part.sections?.length || 0), 0) || 0,
      totalFormulas: academicDocument.metadata?.totalFormulas || 0,
      totalExamples: academicDocument.metadata?.totalExamples || 0,
      estimatedPrintPages: 1,
      totalImages: generatedImages.length
    };

    const response: CompactStudyResponse = {
      success: true,
      message: `Generated compact study guide with ${stats.totalSections} sections, ${stats.totalFormulas} formulas, ${stats.totalExamples} examples, and ${generatedImages.length} images`,
      metadata: {
        generatedAt: metadata.generatedAt instanceof Date ? metadata.generatedAt.toISOString() : new Date().toISOString(),
        format: outputFormat,
        sourceFiles: metadata.sourceFiles || files.map(f => f.file.name),
        stats,
        preservationScore: metadata.preservationScore || academicDocument.metadata?.preservationScore || 0.8
      },
      processingTime,
      generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
      editingEnabled: data.config.enablePostGenerationEditing ?? true,
      studyMaterialId: data.config.enablePostGenerationEditing ? studyMaterialId : undefined
    };

    // Add output content based on format
    if (htmlOutput) {
      response.html = htmlOutput.html;
    }

    if (pdfOutput) {
      response.pdf = pdfOutput.buffer.toString('base64');
    }

    if (markdownOutput) {
      response.markdown = markdownOutput.markdown;
    }

    // Add warnings if any
    if (processingWarnings.length > 0) {
      response.warnings = processingWarnings;
    }

    // Add debug information in development
    if (process.env.NODE_ENV === 'development') {
      (response as any).debugLogs = logger.getLogs();
    }

    console.log(`🎉 Compact study generation completed in ${processingTime}ms`);
    logger.log('request_completed', { processingTime, warnings: processingWarnings.length });
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("Compact study generation error:", error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      message: "Failed to generate compact study guide",
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      processingTime
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'compact-study-generator',
    timestamp: new Date().toISOString()
  });
}