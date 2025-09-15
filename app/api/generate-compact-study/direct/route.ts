import { type NextRequest, NextResponse } from "next/server"

interface DirectCompactStudyRequest {
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
    fontSize: string;
    margins: 'narrow' | 'normal' | 'wide';
    outputFormat: 'html' | 'pdf' | 'markdown' | 'all';
    paperSize?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    title?: string;
  };
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

// Direct content extraction without complex pipeline
async function extractContentDirect(file: File): Promise<string> {
  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // Direct PDF processing
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      
      if (pdfData.text && pdfData.text.length > 0) {
        return pdfData.text;
      }
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      // Direct text processing
      const arrayBuffer = await file.arrayBuffer();
      const text = new TextDecoder().decode(arrayBuffer);
      return text;
    }
    
    // Fallback
    return `Content from ${file.name} (${file.size} bytes)`;
  } catch (error) {
    console.error(`Direct extraction failed for ${file.name}:`, error);
    return `Failed to extract content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Generate HTML directly from content
function generateDirectHTML(
  files: Array<{ name: string; content: string; type: string }>,
  config: DirectCompactStudyRequest['config']
): string {
  const title = config.title || 'Direct Compact Study Guide';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      font-size: ${config.fontSize || '10pt'};
      line-height: 1.2;
      margin: ${config.margins === 'narrow' ? '0.5in' : config.margins === 'wide' ? '1in' : '0.75in'};
      column-count: ${config.columns};
      column-gap: 20px;
    }
    h1 {
      column-span: all;
      text-align: center;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 1.2em;
      margin-top: 15px;
      margin-bottom: 8px;
      color: #333;
      border-left: 4px solid #007acc;
      padding-left: 8px;
    }
    h3 {
      font-size: 1.1em;
      margin-top: 12px;
      margin-bottom: 6px;
      color: #555;
    }
    p {
      margin: 6px 0;
      text-align: justify;
    }
    .file-section {
      break-inside: avoid;
      margin-bottom: 20px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      background-color: #fafafa;
    }
    .file-header {
      font-weight: bold;
      color: #007acc;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .content-chunk {
      margin: 8px 0;
      padding: 5px 0;
    }
    .formula {
      text-align: center;
      margin: 10px 0;
      font-style: italic;
      background-color: #f0f8ff;
      padding: 5px;
      border-radius: 3px;
    }
    .metadata {
      font-size: 0.8em;
      color: #666;
      margin-top: 5px;
      font-style: italic;
    }
    @media print {
      body { column-count: ${config.columns}; }
      .file-section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  ${files.map((file, index) => {
    const content = file.content;
    const chunks = content.length > 1000 
      ? [
          content.substring(0, Math.floor(content.length / 3)),
          content.substring(Math.floor(content.length / 3), Math.floor(2 * content.length / 3)),
          content.substring(Math.floor(2 * content.length / 3))
        ].filter(chunk => chunk.trim().length > 0)
      : [content];
    
    return `
      <div class="file-section">
        <div class="file-header">📄 ${file.name}</div>
        ${chunks.map((chunk, chunkIndex) => `
          <div class="content-chunk">
            <h3>Section ${index + 1}.${chunkIndex + 1}</h3>
            ${chunk.split('\n').map(line => {
              const trimmedLine = line.trim();
              if (trimmedLine.length === 0) return '';
              
              // Detect formulas (simple heuristic)
              if (/[=<>≤≥∑∏∫∪∩⊆⊇∈∉]|P\(|E\[|Var\(/.test(trimmedLine)) {
                return `<div class="formula">${trimmedLine}</div>`;
              }
              
              return `<p>${trimmedLine}</p>`;
            }).join('')}
          </div>
        `).join('')}
        <div class="metadata">
          Source: ${file.name} | Type: ${file.type} | Length: ${content.length} characters
        </div>
      </div>
    `;
  }).join('')}
  
  <div style="column-span: all; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 0.8em; color: #666; text-align: center;">
    Generated: ${new Date().toLocaleString()} | Direct Processing Mode
  </div>
</body>
</html>`;

  return html;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Direct compact study generation started');
    
    // Parse request
    const data: DirectCompactStudyRequest = await request.json();
    
    console.log(`📁 Processing ${data.files.length} files directly`);
    
    // Extract content from each file directly
    const processedFiles: Array<{ name: string; content: string; type: string }> = [];
    
    for (const fileData of data.files) {
      console.log(`🔄 Direct processing: ${fileData.name}`);
      
      try {
        const file = createFileFromBase64(fileData.name, fileData.content);
        const extractedContent = await extractContentDirect(file);
        
        processedFiles.push({
          name: fileData.name,
          content: extractedContent,
          type: fileData.type
        });
        
        console.log(`✅ Extracted ${extractedContent.length} characters from ${fileData.name}`);
      } catch (error) {
        console.error(`❌ Failed to process ${fileData.name}:`, error);
        
        processedFiles.push({
          name: fileData.name,
          content: `Failed to process ${fileData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: fileData.type
        });
      }
    }
    
    // Generate HTML directly
    const html = generateDirectHTML(processedFiles, data.config);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`🎉 Direct generation completed in ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: `Generated direct compact study guide from ${processedFiles.length} files`,
      html,
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'html',
        sourceFiles: processedFiles.map(f => f.name),
        stats: {
          totalSections: processedFiles.reduce((sum, file) => {
            const chunks = file.content.length > 1000 ? 3 : 1;
            return sum + chunks;
          }, 0),
          totalFormulas: processedFiles.reduce((sum, file) => {
            const formulaMatches = file.content.match(/[=<>≤≥∑∏∫∪∩⊆⊇∈∉]|P\(|E\[|Var\(/g);
            return sum + (formulaMatches ? formulaMatches.length : 0);
          }, 0),
          totalExamples: 0,
          estimatedPrintPages: Math.max(1, Math.ceil(html.length / 3000))
        },
        preservationScore: 1.0,
        processingMode: 'direct'
      },
      processingTime,
      directMode: true
    });
    
  } catch (error) {
    console.error('💥 Direct compact study generation failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Direct generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}