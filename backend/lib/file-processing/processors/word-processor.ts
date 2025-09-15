// Word document processor using mammoth

import { BaseFileProcessor } from '../base-processor';
import { 
  ExtractedContent, 
  ProcessingResult, 
  SupportedFileType, 
  ExtractedImage, 
  ExtractedTable, 
  Heading, 
  Section,
  DocumentStructure,
  FileMetadata
} from '../types';

interface MammothResult {
  value: string;
  messages: Array<{ type: string; message: string }>;
}

interface MammothOptions {
  convertImage?: (image: any) => Promise<{ src: string }>;
  styleMap?: string[];
}

export class WordProcessor extends BaseFileProcessor {
  constructor() {
    super(
      100 * 1024 * 1024, // 100MB max file size
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['docx']
    );
  }

  getSupportedType(): SupportedFileType {
    return 'docx';
  }

  async processFile(file: File): Promise<ProcessingResult> {
    const fileId = this.generateFileId();
    const validation = this.validateFile(file);

    if (!validation.isValid) {
      return {
        fileId,
        status: 'failed',
        errors: validation.errors.map(error => 
          this.createProcessingError('VALIDATION_ERROR', error, 'high')
        ),
        processingTime: 0
      };
    }

    try {
      const { result: content, time } = await this.measureProcessingTime(async () => {
        return await this.extractWordContent(file);
      });

      return {
        fileId,
        status: 'success',
        content,
        errors: [],
        processingTime: time
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        fileId,
        status: 'failed',
        errors: [this.createProcessingError('PROCESSING_ERROR', `Failed to process Word document: ${errorMessage}`, 'high')],
        processingTime: 0
      };
    }
  }

  private async extractWordContent(file: File): Promise<ExtractedContent> {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import('mammoth');
    
    // Extract images
    const images: ExtractedImage[] = [];
    let imageCounter = 0;

    // Configure mammoth to extract images and preserve formatting
    const options: MammothOptions = {
      convertImage: async (image: any) => {
        try {
          const buffer = await image.read();
          const base64 = this.bufferToBase64(buffer);
          const imageId = `word_img_${imageCounter++}`;
          
          images.push({
            id: imageId,
            base64: `data:${image.contentType || 'image/png'};base64,${base64}`,
            context: `Image extracted from Word document at position ${imageCounter}`,
            isExample: this.isLikelyExample(image.altText || ''),
            ocrText: undefined // OCR will be handled separately if needed
          });

          return { src: `#${imageId}` };
        } catch (error) {
          console.warn('Failed to extract image:', error);
          return { src: '' };
        }
      },
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh"
      ]
    };

    // Extract HTML with formatting and structure
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, options);
    
    // Extract plain text for fallback
    const textResult = await mammoth.extractRawText({ arrayBuffer });

    // Parse the HTML to extract structure and tables
    const { headings, sections, tables } = this.parseHtmlStructure(htmlResult.value);
    
    // Calculate metadata
    const metadata = this.calculateMetadata(file, textResult.value, htmlResult.value);

    // Create document structure
    const structure: DocumentStructure = {
      headings,
      sections,
      hierarchy: this.calculateHierarchy(headings)
    };

    return {
      text: textResult.value,
      images,
      tables,
      metadata,
      structure
    };
  }

  private parseHtmlStructure(html: string): {
    headings: Heading[];
    sections: Section[];
    tables: ExtractedTable[];
  } {
    // Simple HTML parsing to extract structure
    const headings: Heading[] = [];
    const sections: Section[] = [];
    const tables: ExtractedTable[] = [];

    // Extract headings using regex
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let headingMatch;
    
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      const level = parseInt(headingMatch[1]);
      const text = this.stripHtmlTags(headingMatch[2]);
      
      headings.push({
        level,
        text: text.trim()
      });
    }

    // Extract tables
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    let tableMatch;
    let tableCounter = 0;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const table = this.parseTable(tableHtml, `word_table_${tableCounter++}`);
      if (table) {
        tables.push(table);
      }
    }

    // Create sections from headings and content
    sections.push(...this.createSectionsFromHeadings(headings, html));

    return { headings, sections, tables };
  }

  private parseTable(tableHtml: string, tableId: string): ExtractedTable | null {
    try {
      // Extract table rows
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
      const rows: string[][] = [];
      let headers: string[] = [];
      let rowMatch;
      let isFirstRow = true;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1];
        const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gi;
        const cells: string[] = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          const cellText = this.stripHtmlTags(cellMatch[1]).trim();
          cells.push(cellText);
        }

        if (cells.length > 0) {
          if (isFirstRow && rowHtml.includes('<th')) {
            headers = cells;
            isFirstRow = false;
          } else {
            rows.push(cells);
            if (isFirstRow) {
              // If no headers found, use first row as headers
              headers = cells;
              isFirstRow = false;
            }
          }
        }
      }

      if (rows.length === 0 && headers.length === 0) {
        return null;
      }

      return {
        id: tableId,
        headers: headers.length > 0 ? headers : [],
        rows: headers.length > 0 ? rows : rows.slice(1),
        context: `Table extracted from Word document with ${rows.length} rows`
      };
    } catch (error) {
      console.warn('Failed to parse table:', error);
      return null;
    }
  }

  private createSectionsFromHeadings(headings: Heading[], html: string): Section[] {
    const sections: Section[] = [];
    
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      
      // Extract content between this heading and the next
      const headingPattern = new RegExp(`<h${heading.level}[^>]*>${this.escapeRegex(heading.text)}</h${heading.level}>`, 'i');
      const headingMatch = html.match(headingPattern);
      
      if (headingMatch) {
        const startIndex = html.indexOf(headingMatch[0]) + headingMatch[0].length;
        let endIndex = html.length;
        
        if (nextHeading) {
          const nextPattern = new RegExp(`<h${nextHeading.level}[^>]*>${this.escapeRegex(nextHeading.text)}</h${nextHeading.level}>`, 'i');
          const nextMatch = html.match(nextPattern);
          if (nextMatch) {
            endIndex = html.indexOf(nextMatch[0]);
          }
        }
        
        const sectionHtml = html.substring(startIndex, endIndex);
        const sectionText = this.stripHtmlTags(sectionHtml).trim();
        
        if (sectionText.length > 0) {
          sections.push({
            title: heading.text,
            content: sectionText
          });
        }
      }
    }
    
    return sections;
  }

  private calculateMetadata(file: File, text: string, html: string): FileMetadata {
    const wordCount = this.countWords(text);
    const characterCount = text.length;
    const lineCount = text.split('\n').length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      wordCount,
      characterCount,
      lineCount,
      estimatedReadingTime,
      hasStructuredContent: html.includes('<h1>') || html.includes('<h2>') || html.includes('<h3>'),
      hasNumberedSections: /\d+\.\s/.test(text),
      hasBulletPoints: html.includes('<ul>') || html.includes('<ol>') || /[•\-\*]\s/.test(text),
      hasTabularData: html.includes('<table>'),
      processingTimestamp: new Date(),
      extractionMethod: 'mammoth'
    };
  }

  private calculateHierarchy(headings: Heading[]): number {
    if (headings.length === 0) return 0;
    return Math.max(...headings.map(h => h.level));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private isLikelyExample(altText: string): boolean {
    const exampleKeywords = ['example', 'diagram', 'figure', 'chart', 'graph', 'illustration', 'sample'];
    const lowerAltText = altText.toLowerCase();
    return exampleKeywords.some(keyword => lowerAltText.includes(keyword));
  }
}