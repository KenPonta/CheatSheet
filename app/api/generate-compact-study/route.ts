import { type NextRequest, NextResponse } from "next/server"
import "../../../backend/lib/startup"
import { 
  processCompactStudyDocuments,
  CompactLayoutEngine,
  generateCompactHTML,
  PDFOutputGenerator,
  generateCompactMarkdown,
  type CompactLayoutConfig,
  type PipelineOrchestratorConfig,
  type AcademicDocument,
  type HTMLOutput,
  type PDFOutput,
  type MarkdownOutput
} from "@/backend/lib/compact-study"
import { 
  SimpleImageGenerator,
  type FlatLineImageRequest,
  type GeneratedImage
} from "@/backend/lib/ai/simple-image-generator"
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

// Direct processing document creation (bypasses complex pipeline)
async function createDirectProcessingDocument(
  files: Array<{ file: File; type: 'probability' | 'relations' | 'general' }>,
  config: GenerateCompactStudyRequest['config'],
  logger: CompactStudyDebugger
): Promise<AcademicDocument> {
  logger.log('direct_processing_start', { filesCount: files.length });
  
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
      
      // Create sections directly from content
      const sections = [];
      const contentLength = extractedText.length;
      
      if (contentLength > 500) {
        // Split into multiple sections
        const numSections = Math.min(5, Math.max(2, Math.floor(contentLength / 300)));
        const sectionSize = Math.floor(contentLength / numSections);
        
        for (let i = 0; i < numSections; i++) {
          const start = i * sectionSize;
          const end = i === numSections - 1 ? contentLength : (i + 1) * sectionSize;
          let sectionContent = extractedText.substring(start, end);
          
          // Try to end at a sentence boundary
          if (end < contentLength) {
            const lastPeriod = sectionContent.lastIndexOf('.');
            if (lastPeriod > sectionContent.length * 0.7) {
              sectionContent = sectionContent.substring(0, lastPeriod + 1);
            }
          }
          
          // Generate section title from content
          const firstLine = sectionContent.split('\n')[0].trim();
          const sectionTitle = firstLine.length > 5 && firstLine.length < 80 
            ? firstLine 
            : `Section ${i + 1}`;
          
          sections.push({
            sectionNumber: `${parts.length + 1}.${i + 1}`,
            title: sectionTitle,
            content: sectionContent.trim(),
            formulas: [],
            examples: [],
            subsections: []
          });
        }
      } else {
        // Single section for short content
        sections.push({
          sectionNumber: `${parts.length + 1}.1`,
          title: file.name.replace(/\.(pdf|txt|docx?)$/i, ''),
          content: extractedText,
          formulas: [],
          examples: [],
          subsections: []
        });
      }
      
      // Determine part title from file name and content
      let partTitle = file.name.replace(/\.(pdf|txt|docx?)$/i, '');
      const lowerContent = extractedText.toLowerCase();
      
      if (lowerContent.includes('probability') || lowerContent.includes('bayes')) {
        partTitle = `Probability: ${partTitle}`;
      } else if (lowerContent.includes('relation') || lowerContent.includes('reflexive')) {
        partTitle = `Relations: ${partTitle}`;
      } else if (lowerContent.includes('counting') || lowerContent.includes('combinat')) {
        partTitle = `Counting: ${partTitle}`;
      }
      
      parts.push({
        partNumber: parts.length + 1,
        title: partTitle,
        sections
      });
      
      logger.log('direct_file_processed', { 
        fileName: file.name, 
        textLength: extractedText.length,
        sectionsCreated: sections.length 
      });
      
    } catch (error) {
      logger.log('direct_file_error', { fileName: file.name }, error as Error);
      
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
    title: config.title || 'Direct Compact Study Guide',
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

// Generate images for academic document content
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

  if (!document.parts) {
    return generatedImages;
  }

  for (const part of document.parts) {
    for (const section of part.sections) {
      // Generate images for equations if enabled
      if (imageConfig.generateForEquations && section.formulas?.length > 0) {
        for (const formula of section.formulas) {
          try {
            const imageRequest: FlatLineImageRequest = {
              type: 'equation',
              content: formula.latex || formula.original || '',
              context: `${section.title}: ${section.content.substring(0, 200)}...`,
              style: imageConfig.style,
              dimensions: { width: 400, height: 200 }
            };

            const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest);
            generatedImages.push({
              ...generatedImage,
              type: 'generated',
              source: {
                type: 'equation',
                content: formula.latex || formula.original || '',
                context: section.title
              },
              editable: true,
              regenerationOptions: {
                availableStyles: [
                  { lineWeight: 'thin', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
                  { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
                  { lineWeight: 'thick', colorScheme: 'monochrome', layout: 'horizontal', annotations: true }
                ],
                contentHints: ['equation', 'formula', 'mathematical expression'],
                contextOptions: [section.title, part.title]
              }
            });

            logger.log('equation_image_generated', {
              formulaId: formula.id,
              imageId: generatedImage.id,
              sectionTitle: section.title
            });
          } catch (error) {
            logger.log('equation_image_error', { 
              formulaId: formula.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Generate images for examples if enabled
      if (imageConfig.generateForExamples && section.examples?.length > 0) {
        for (const example of section.examples) {
          try {
            const exampleContent = `Problem: ${example.problem}\nSolution: ${example.solution || ''}`;
            
            const imageRequest: FlatLineImageRequest = {
              type: 'example',
              content: exampleContent,
              context: `${section.title}: Example illustration`,
              style: imageConfig.style,
              dimensions: { width: 500, height: 300 }
            };

            const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest);
            generatedImages.push({
              ...generatedImage,
              type: 'generated',
              source: {
                type: 'example',
                content: exampleContent,
                context: section.title
              },
              editable: true,
              regenerationOptions: {
                availableStyles: [
                  { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'vertical', annotations: true },
                  { lineWeight: 'medium', colorScheme: 'minimal-color', layout: 'vertical', annotations: true }
                ],
                contentHints: ['example', 'problem-solution', 'step-by-step'],
                contextOptions: [section.title, part.title]
              }
            });

            logger.log('example_image_generated', {
              exampleId: example.id,
              imageId: generatedImage.id,
              sectionTitle: section.title
            });
          } catch (error) {
            logger.log('example_image_error', { 
              exampleId: example.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Generate concept diagrams if enabled
      if (imageConfig.generateForConcepts && section.content.length > 500) {
        try {
          // Extract key concepts from section content
          const concepts = extractKeyConceptsFromText(section.content);
          
          if (concepts.length > 0) {
            const conceptContent = `Concepts: ${concepts.join(', ')}`;
            
            const imageRequest: FlatLineImageRequest = {
              type: 'concept',
              content: conceptContent,
              context: `${section.title}: Concept overview`,
              style: { ...imageConfig.style, layout: 'grid' },
              dimensions: { width: 450, height: 350 }
            };

            const generatedImage = await imageGenerator.generateFlatLineImage(imageRequest);
            generatedImages.push({
              ...generatedImage,
              type: 'generated',
              source: {
                type: 'concept',
                content: conceptContent,
                context: section.title
              },
              editable: true,
              regenerationOptions: {
                availableStyles: [
                  { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'grid', annotations: true },
                  { lineWeight: 'thin', colorScheme: 'minimal-color', layout: 'grid', annotations: false }
                ],
                contentHints: ['concept', 'diagram', 'overview'],
                contextOptions: [section.title, part.title]
              }
            });

            logger.log('concept_image_generated', {
              sectionId: section.sectionNumber,
              imageId: generatedImage.id,
              conceptsCount: concepts.length
            });
          }
        } catch (error) {
          logger.log('concept_image_error', { 
            sectionId: section.sectionNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  logger.log('image_generation_processing_complete', { 
    totalImagesGenerated: generatedImages.length 
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
    
    // Process documents through pipeline with enhanced error handling
    let academicDocument: AcademicDocument;
    let generatedImages: GeneratedImage[] = [];
    
    try {
      academicDocument = await processCompactStudyDocuments(files, pipelineConfig);
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
        generatedAt: metadata.generatedAt ? metadata.generatedAt.toISOString() : new Date().toISOString(),
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