// PowerPoint processor with slide content and embedded image extraction

import { BaseFileProcessor } from '../base-processor';
import { ExtractedContent, ProcessingResult, SupportedFileType, ExtractedImage, ExtractedTable, Heading, Section } from '../types';

interface SlideContent {
  slideNumber: number;
  title?: string;
  text: string;
  images: ExtractedImage[];
  tables: ExtractedTable[];
  notes?: string;
}

interface SlideLayout {
  type: string;
  placeholders: string[];
}

export class PowerPointProcessor extends BaseFileProcessor {
  constructor() {
    super(
      100 * 1024 * 1024, // 100MB max file size
      ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['pptx']
    );
  }

  getSupportedType(): SupportedFileType {
    return 'pptx';
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
        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Extract content using JSZip to parse the PPTX structure
        const slides = await this.extractSlides(arrayBuffer);
        const embeddedImages = await this.extractEmbeddedImages(arrayBuffer);

        // Combine all slide content
        let allText = '';
        const allImages: ExtractedImage[] = [...embeddedImages];
        const allTables: ExtractedTable[] = [];
        const headings: Heading[] = [];
        const sections: Section[] = [];

        slides.forEach((slide, index) => {
          // Add slide title as heading
          if (slide.title) {
            headings.push({
              level: 1,
              text: slide.title,
              page: slide.slideNumber
            });
          }

          // Add slide as section
          sections.push({
            title: slide.title || `Slide ${slide.slideNumber}`,
            content: slide.text,
            page: slide.slideNumber
          });

          // Combine text
          const slideText = [
            slide.title ? `=== Slide ${slide.slideNumber}: ${slide.title} ===` : `=== Slide ${slide.slideNumber} ===`,
            slide.text,
            slide.notes ? `Notes: ${slide.notes}` : ''
          ].filter(Boolean).join('\n');

          allText += slideText + '\n\n';

          // Add slide images and tables
          allImages.push(...slide.images);
          allTables.push(...slide.tables);
        });

        const extractedContent: ExtractedContent = {
          text: allText.trim(),
          images: allImages,
          tables: allTables,
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            wordCount: this.countWords(allText),
            pageCount: slides.length,
            hasStructuredContent: true,
            hasNumberedSections: true,
            // PowerPoint-specific metadata will be extracted from core.xml
            title: await this.extractPresentationTitle(arrayBuffer),
            author: await this.extractPresentationAuthor(arrayBuffer),
            subject: await this.extractPresentationSubject(arrayBuffer)
          },
          structure: {
            headings,
            sections,
            hierarchy: Math.max(1, ...headings.map(h => h.level))
          }
        };

        return extractedContent;
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
        errors: [this.createProcessingError('PROCESSING_ERROR', `Failed to process PowerPoint: ${errorMessage}`, 'high')],
        processingTime: 0
      };
    }
  }

  private async extractSlides(arrayBuffer: ArrayBuffer): Promise<SlideContent[]> {
    const slides: SlideContent[] = [];

    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(arrayBuffer);

      // Get slide files
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
          const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
          return aNum - bNum;
        });

      for (const slideFile of slideFiles) {
        const slideNumber = parseInt(slideFile.match(/slide(\d+)\.xml$/)?.[1] || '0');
        const file = zip.files[slideFile];
        
        if (file && !file.dir) {
          const slideXml = await file.async('text');
          const slideContent = await this.parseSlideXml(slideXml, slideNumber);
          
          // Get slide notes if available
          const notesFile = slideFile.replace('/slides/', '/notesSlides/').replace('.xml', '.xml');
          if (zip.files[notesFile]) {
            const notesXml = await zip.files[notesFile].async('text');
            slideContent.notes = this.extractNotesText(notesXml);
          }
          
          slides.push(slideContent);
        }
      }

    } catch (error) {
      console.warn('Failed to extract slides:', error);
    }

    return slides;
  }

  private async parseSlideXml(xml: string, slideNumber: number): Promise<SlideContent> {
    const slide: SlideContent = {
      slideNumber,
      text: '',
      images: [],
      tables: []
    };

    try {
      // Extract text content from various text elements
      const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      const textContent: string[] = [];

      textMatches.forEach(match => {
        const text = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim();
        if (text && text.length > 0) {
          textContent.push(text);
        }
      });

      // Identify title (usually the first significant text)
      if (textContent.length > 0) {
        const potentialTitle = textContent[0];
        if (potentialTitle.length < 100 && !potentialTitle.includes('\n')) {
          slide.title = potentialTitle;
          slide.text = textContent.slice(1).join('\n');
        } else {
          slide.text = textContent.join('\n');
        }
      }

      // Extract table data
      const tables = this.extractTablesFromSlideXml(xml, slideNumber);
      slide.tables.push(...tables);

      // Extract image references (actual image extraction happens separately)
      const imageRefs = this.extractImageReferencesFromSlideXml(xml, slideNumber);
      slide.images.push(...imageRefs);

    } catch (error) {
      console.warn(`Failed to parse slide ${slideNumber}:`, error);
    }

    return slide;
  }

  private extractTablesFromSlideXml(xml: string, slideNumber: number): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    try {
      // Look for table structures in the XML
      const tableMatches = xml.match(/<a:tbl[^>]*>.*?<\/a:tbl>/gs) || [];

      tableMatches.forEach((tableXml, tableIndex) => {
        const rows: string[][] = [];
        
        // Extract table rows
        const rowMatches = tableXml.match(/<a:tr[^>]*>.*?<\/a:tr>/gs) || [];
        
        rowMatches.forEach(rowXml => {
          const cells: string[] = [];
          const cellMatches = rowXml.match(/<a:tc[^>]*>.*?<\/a:tc>/gs) || [];
          
          cellMatches.forEach(cellXml => {
            const textMatches = cellXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
            const cellText = textMatches
              .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
              .join(' ')
              .trim();
            cells.push(cellText);
          });
          
          if (cells.length > 0) {
            rows.push(cells);
          }
        });

        if (rows.length > 0) {
          const headers = rows[0] || [];
          const dataRows = rows.slice(1);

          tables.push({
            id: `ppt_table_${slideNumber}_${tableIndex}_${Date.now()}`,
            headers,
            rows: dataRows,
            context: `Slide ${slideNumber} - Table ${tableIndex + 1}`
          });
        }
      });

    } catch (error) {
      console.warn(`Failed to extract tables from slide ${slideNumber}:`, error);
    }

    return tables;
  }

  private extractImageReferencesFromSlideXml(xml: string, slideNumber: number): ExtractedImage[] {
    const images: ExtractedImage[] = [];

    try {
      // Look for image references in the slide XML
      const imageMatches = xml.match(/r:embed="([^"]+)"/g) || [];
      
      imageMatches.forEach((match, index) => {
        const embedId = match.replace('r:embed="', '').replace('"', '');
        
        // Create placeholder image reference (actual image will be resolved later)
        images.push({
          id: `ppt_image_ref_${slideNumber}_${index}_${Date.now()}`,
          base64: '', // Will be populated when actual image is found
          context: `Slide ${slideNumber} - Image reference ${embedId}`,
          isExample: false // Will be determined by AI analysis later
        });
      });

    } catch (error) {
      console.warn(`Failed to extract image references from slide ${slideNumber}:`, error);
    }

    return images;
  }

  private extractNotesText(notesXml: string): string {
    try {
      const textMatches = notesXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      return textMatches
        .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
        .join(' ')
        .trim();
    } catch (error) {
      return '';
    }
  }

  private async extractEmbeddedImages(arrayBuffer: ArrayBuffer): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];

    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(arrayBuffer);

      // Look for embedded images in ppt/media/
      const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'));
      
      for (const mediaFile of mediaFiles) {
        const file = zip.files[mediaFile];
        if (file && !file.dir) {
          try {
            const imageData = await file.async('base64');
            const extension = mediaFile.split('.').pop()?.toLowerCase();
            
            if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(extension || '')) {
              images.push({
                id: `ppt_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                base64: `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${imageData}`,
                context: `Embedded image from PowerPoint: ${mediaFile}`,
                isExample: false // Will be determined by AI analysis later
              });
            }
          } catch (error) {
            console.warn(`Failed to extract image ${mediaFile}:`, error);
          }
        }
      }

    } catch (error) {
      console.warn('Failed to extract embedded images:', error);
    }

    return images;
  }

  private async extractPresentationTitle(arrayBuffer: ArrayBuffer): Promise<string | undefined> {
    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(arrayBuffer);
      
      const coreFile = zip.files['docProps/core.xml'];
      if (coreFile) {
        const coreXml = await coreFile.async('text');
        const titleMatch = coreXml.match(/<dc:title[^>]*>([^<]*)<\/dc:title>/);
        return titleMatch ? titleMatch[1] : undefined;
      }
    } catch (error) {
      console.warn('Failed to extract presentation title:', error);
    }
    return undefined;
  }

  private async extractPresentationAuthor(arrayBuffer: ArrayBuffer): Promise<string | undefined> {
    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(arrayBuffer);
      
      const coreFile = zip.files['docProps/core.xml'];
      if (coreFile) {
        const coreXml = await coreFile.async('text');
        const authorMatch = coreXml.match(/<dc:creator[^>]*>([^<]*)<\/dc:creator>/);
        return authorMatch ? authorMatch[1] : undefined;
      }
    } catch (error) {
      console.warn('Failed to extract presentation author:', error);
    }
    return undefined;
  }

  private async extractPresentationSubject(arrayBuffer: ArrayBuffer): Promise<string | undefined> {
    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(arrayBuffer);
      
      const coreFile = zip.files['docProps/core.xml'];
      if (coreFile) {
        const coreXml = await coreFile.async('text');
        const subjectMatch = coreXml.match(/<dc:subject[^>]*>([^<]*)<\/dc:subject>/);
        return subjectMatch ? subjectMatch[1] : undefined;
      }
    } catch (error) {
      console.warn('Failed to extract presentation subject:', error);
    }
    return undefined;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}