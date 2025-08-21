// Excel file processor using xlsx with enhanced multi-sheet and chart support

import { BaseFileProcessor } from '../base-processor';
import { ExtractedContent, ProcessingResult, SupportedFileType, ExtractedTable, ExtractedImage, Heading, Section } from '../types';

interface ChartInfo {
  id: string;
  type: string;
  title?: string;
  description: string;
  dataRange?: string;
  sheetName: string;
}

interface CellRange {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

export class ExcelProcessor extends BaseFileProcessor {
  constructor() {
    super(
      50 * 1024 * 1024, // 50MB max file size
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['xlsx']
    );
  }

  getSupportedType(): SupportedFileType {
    return 'xlsx';
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
        // Convert File to ArrayBuffer for xlsx
        const arrayBuffer = await file.arrayBuffer();

        // Dynamic import to handle potential SSR issues
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true, cellDates: true });

        let allText = '';
        const tables: ExtractedTable[] = [];
        const images: ExtractedImage[] = [];
        const headings: Heading[] = [];
        const sections: Section[] = [];
        const charts: ChartInfo[] = [];

        // Process each worksheet
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Extract sheet data with enhanced processing
          const sheetData = this.processWorksheet(worksheet, sheetName, sheetIndex);
          
          // Add to collections
          allText += sheetData.text;
          tables.push(...sheetData.tables);
          images.push(...sheetData.images);
          headings.push(...sheetData.headings);
          sections.push(...sheetData.sections);
          charts.push(...sheetData.charts);
        });

        // Extract embedded images and charts from workbook
        const embeddedContent = await this.extractEmbeddedContent(workbook, arrayBuffer);
        images.push(...embeddedContent.images);
        charts.push(...embeddedContent.charts);

        const extractedContent: ExtractedContent = {
          text: allText.trim(),
          images,
          tables,
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            wordCount: this.countWords(allText),
            pageCount: workbook.SheetNames.length,
            hasTabularData: tables.length > 0,
            hasStructuredContent: sections.length > 0,
            // Excel-specific metadata
            title: workbook.Props?.Title,
            author: workbook.Props?.Author,
            subject: workbook.Props?.Subject,
            creator: workbook.Props?.Application,
            creationDate: workbook.Props?.CreatedDate ? new Date(workbook.Props.CreatedDate) : undefined,
            modificationDate: workbook.Props?.ModifiedDate ? new Date(workbook.Props.ModifiedDate) : undefined
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
        errors: [this.createProcessingError('PROCESSING_ERROR', `Failed to process Excel file: ${errorMessage}`, 'high')],
        processingTime: 0
      };
    }
  }

  private processWorksheet(worksheet: any, sheetName: string, sheetIndex: number) {
    const XLSX = require('xlsx');
    
    // Convert to JSON to extract data with enhanced options
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '', 
      raw: false,
      dateNF: 'yyyy-mm-dd'
    }) as string[][];

    const tables: ExtractedTable[] = [];
    const images: ExtractedImage[] = [];
    const headings: Heading[] = [];
    const sections: Section[] = [];
    const charts: ChartInfo[] = [];
    let text = '';

    if (jsonData.length > 0) {
      // Detect table structures within the sheet
      const detectedTables = this.detectTableStructures(jsonData, sheetName);
      tables.push(...detectedTables);

      // Extract headings and sections
      const sheetStructure = this.analyzeSheetStructure(jsonData, sheetName, sheetIndex);
      headings.push(...sheetStructure.headings);
      sections.push(...sheetStructure.sections);

      // Detect chart references and data ranges
      const chartInfo = this.detectChartReferences(worksheet, sheetName);
      charts.push(...chartInfo);

      // Convert to text for full-text search
      const sheetText = jsonData
        .map(row => row.join(' '))
        .filter(rowText => rowText.trim().length > 0)
        .join('\n');
      
      text = `\n=== ${sheetName} ===\n${sheetText}\n`;
    }

    return { text, tables, images, headings, sections, charts };
  }

  private detectTableStructures(data: string[][], sheetName: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    
    if (data.length === 0) return tables;

    // Simple table detection: look for rows with consistent column counts
    let currentTable: { headers: string[]; rows: string[][]; startRow: number } | null = null;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nonEmptyCount = row.filter(cell => cell && cell.toString().trim()).length;
      
      if (nonEmptyCount >= 2) { // Potential table row
        if (!currentTable) {
          // Start new table
          currentTable = {
            headers: row.map(cell => String(cell || '')),
            rows: [],
            startRow: i
          };
        } else if (row.length === currentTable.headers.length) {
          // Continue current table
          currentTable.rows.push(row.map(cell => String(cell || '')));
        } else {
          // End current table and start new one
          if (currentTable.rows.length > 0) {
            tables.push({
              id: `table_${sheetName}_${currentTable.startRow}_${Date.now()}`,
              headers: currentTable.headers,
              rows: currentTable.rows,
              context: `Sheet: ${sheetName}, Rows: ${currentTable.startRow + 1}-${i}`
            });
          }
          
          currentTable = {
            headers: row.map(cell => String(cell || '')),
            rows: [],
            startRow: i
          };
        }
      } else if (currentTable && nonEmptyCount === 0) {
        // Empty row might end table
        if (currentTable.rows.length > 0) {
          tables.push({
            id: `table_${sheetName}_${currentTable.startRow}_${Date.now()}`,
            headers: currentTable.headers,
            rows: currentTable.rows,
            context: `Sheet: ${sheetName}, Rows: ${currentTable.startRow + 1}-${i}`
          });
        }
        currentTable = null;
      }
    }

    // Handle final table
    if (currentTable && currentTable.rows.length > 0) {
      tables.push({
        id: `table_${sheetName}_${currentTable.startRow}_${Date.now()}`,
        headers: currentTable.headers,
        rows: currentTable.rows,
        context: `Sheet: ${sheetName}, Rows: ${currentTable.startRow + 1}-${data.length}`
      });
    }

    return tables;
  }

  private analyzeSheetStructure(data: string[][], sheetName: string, sheetIndex: number) {
    const headings: Heading[] = [];
    const sections: Section[] = [];

    // Add sheet name as main heading
    headings.push({
      level: 1,
      text: sheetName,
      page: sheetIndex + 1
    });

    // Look for potential section headers (cells that span multiple columns or are formatted differently)
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Check if this might be a section header
      if (row.length > 0 && row[0] && row[0].toString().trim()) {
        const firstCell = row[0].toString().trim();
        const restEmpty = row.slice(1).every(cell => !cell || cell.toString().trim() === '');
        
        // If first cell has content and rest are empty, might be a header
        if (restEmpty && firstCell.length > 3) {
          headings.push({
            level: 2,
            text: firstCell,
            page: sheetIndex + 1
          });

          // Create section for content following this header
          const sectionContent = this.extractSectionContent(data, i + 1, sheetName);
          if (sectionContent.trim()) {
            sections.push({
              title: firstCell,
              content: sectionContent,
              page: sheetIndex + 1
            });
          }
        }
      }
    }

    return { headings, sections };
  }

  private extractSectionContent(data: string[][], startRow: number, sheetName: string): string {
    const content: string[] = [];
    
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      const rowText = row.join(' ').trim();
      
      if (!rowText) continue;
      
      // Stop if we hit another potential header
      if (row.length > 0 && row[0] && row.slice(1).every(cell => !cell || cell.toString().trim() === '')) {
        break;
      }
      
      content.push(rowText);
      
      // Limit section content to avoid too much data
      if (content.length > 20) break;
    }
    
    return content.join('\n');
  }

  private detectChartReferences(worksheet: any, sheetName: string): ChartInfo[] {
    const charts: ChartInfo[] = [];
    
    // Look for chart-related patterns in cell values
    const range = worksheet['!ref'];
    if (!range) return charts;

    const XLSX = require('xlsx');
    const decoded = XLSX.utils.decode_range(range);
    
    for (let row = decoded.s.r; row <= decoded.e.r; row++) {
      for (let col = decoded.s.c; col <= decoded.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v) {
          const value = cell.v.toString().toLowerCase();
          
          // Look for chart-related keywords
          if (value.includes('chart') || value.includes('graph') || value.includes('plot')) {
            charts.push({
              id: `chart_${sheetName}_${row}_${col}_${Date.now()}`,
              type: 'referenced',
              title: cell.v.toString(),
              description: `Chart reference found in ${sheetName} at ${cellAddress}`,
              dataRange: `${cellAddress}`,
              sheetName
            });
          }
        }
      }
    }
    
    return charts;
  }

  private async extractEmbeddedContent(workbook: any, arrayBuffer: ArrayBuffer) {
    const images: ExtractedImage[] = [];
    const charts: ChartInfo[] = [];

    try {
      // Use JSZip to examine the Excel file structure for embedded content
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(arrayBuffer);

      // Look for embedded images in xl/media/
      const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('xl/media/'));
      
      for (const mediaFile of mediaFiles) {
        const file = zip.files[mediaFile];
        if (file && !file.dir) {
          try {
            const imageData = await file.async('base64');
            const extension = mediaFile.split('.').pop()?.toLowerCase();
            
            if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(extension || '')) {
              images.push({
                id: `excel_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                base64: `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${imageData}`,
                context: `Embedded image from Excel file: ${mediaFile}`,
                isExample: false // Will be determined by AI analysis later
              });
            }
          } catch (error) {
            console.warn(`Failed to extract image ${mediaFile}:`, error);
          }
        }
      }

      // Look for chart definitions in xl/charts/
      const chartFiles = Object.keys(zip.files).filter(name => name.startsWith('xl/charts/'));
      
      for (const chartFile of chartFiles) {
        const file = zip.files[chartFile];
        if (file && !file.dir) {
          try {
            const chartXml = await file.async('text');
            const chartInfo = this.parseChartXml(chartXml, chartFile);
            if (chartInfo) {
              charts.push(chartInfo);
            }
          } catch (error) {
            console.warn(`Failed to parse chart ${chartFile}:`, error);
          }
        }
      }

    } catch (error) {
      console.warn('Failed to extract embedded content:', error);
    }

    return { images, charts };
  }

  private parseChartXml(xml: string, filename: string): ChartInfo | null {
    try {
      // Basic XML parsing to extract chart information
      const titleMatch = xml.match(/<c:tx>.*?<a:t>([^<]+)<\/a:t>/);
      const typeMatch = xml.match(/<c:(\w+Chart)>/);
      
      return {
        id: `chart_${filename}_${Date.now()}`,
        type: typeMatch ? typeMatch[1] : 'unknown',
        title: titleMatch ? titleMatch[1] : undefined,
        description: `Chart extracted from ${filename}`,
        sheetName: 'embedded'
      };
    } catch (error) {
      return null;
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}