// Text file processor

import { BaseFileProcessor } from '../base-processor';
import { ExtractedContent, ProcessingResult, SupportedFileType } from '../types';

export class TextProcessor extends BaseFileProcessor {
  constructor() {
    super(
      10 * 1024 * 1024, // 10MB max file size
      ['text/plain'],
      ['txt']
    );
  }

  getSupportedType(): SupportedFileType {
    return 'txt';
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
        // Read text content
        const text = await file.text();

        // Basic structure detection for text files
        const lines = text.split('\n');
        const headings = lines
          .map((line, index) => ({ line: line.trim(), index }))
          .filter(({ line }) => 
            line.length > 0 && 
            (line.startsWith('#') || line.toUpperCase() === line && line.length < 100)
          )
          .map(({ line, index }) => ({
            level: line.startsWith('#') ? line.match(/^#+/)?.[0].length || 1 : 1,
            text: line.replace(/^#+\s*/, ''),
            page: Math.floor(index / 50) + 1 // Approximate page based on line count
          }));

        const extractedContent: ExtractedContent = {
          text,
          images: [],
          tables: [],
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            wordCount: this.countWords(text)
          },
          structure: {
            headings,
            sections: [], // Will be enhanced in later tasks
            hierarchy: Math.max(...headings.map(h => h.level), 0)
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
        errors: [this.createProcessingError('PROCESSING_ERROR', `Failed to process text file: ${errorMessage}`, 'high')],
        processingTime: 0
      };
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}