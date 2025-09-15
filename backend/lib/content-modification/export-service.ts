import { 
  StudyMaterial, 
  ExportOptions, 
  ExportResult,
  ContentModificationError 
} from './types';
import { PDFGenerator } from '../pdf-generation/pdf-generator';
import { CheatSheetConfig, CheatSheetTopic } from '../pdf-generation/types';

export interface EnhancedExportOptions extends ExportOptions {
  // PDF-specific options
  pdfConfig?: {
    paperSize?: 'a4' | 'letter' | 'legal' | 'a3';
    orientation?: 'portrait' | 'landscape';
    fontSize?: 'small' | 'medium' | 'large';
    includeHeaders?: boolean;
    includeFooters?: boolean;
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  };
  
  // HTML-specific options
  htmlConfig?: {
    embedSVG?: boolean;
    includeCSS?: boolean;
    responsive?: boolean;
    theme?: 'light' | 'dark' | 'minimal';
  };
  
  // Markdown-specific options
  markdownConfig?: {
    imageFormat?: 'inline' | 'reference' | 'base64';
    mathFormat?: 'latex' | 'ascii' | 'unicode';
    includeTableOfContents?: boolean;
  };
}

export class EnhancedExportService {
  private pdfGenerator: PDFGenerator;

  constructor() {
    this.pdfGenerator = new PDFGenerator();
  }

  /**
   * Export study material with enhanced options
   */
  async exportMaterial(
    material: StudyMaterial,
    options: EnhancedExportOptions
  ): Promise<ExportResult> {
    try {
      let content: string | Buffer;
      let filename: string;

      switch (options.format) {
        case 'html':
          content = await this.exportToHTML(material, options);
          filename = `${this.sanitizeFilename(material.title)}.html`;
          break;
        
        case 'markdown':
          content = await this.exportToMarkdown(material, options);
          filename = `${this.sanitizeFilename(material.title)}.md`;
          break;
        
        case 'pdf':
          content = await this.exportToPDF(material, options);
          filename = `${this.sanitizeFilename(material.title)}.pdf`;
          break;
        
        default:
          throw new ContentModificationError(
            `Unsupported export format: ${options.format}`,
            'INVALID_OPERATION'
          );
      }

      return {
        content,
        format: options.format,
        filename,
        metadata: {
          exportedAt: new Date(),
          sections: material.sections.length,
          images: options.includeImages ? material.images.length : 0,
          size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8')
        }
      };
    } catch (error) {
      throw new ContentModificationError(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Export to enhanced HTML format with embedded SVG images
   */
  private async exportToHTML(
    material: StudyMaterial, 
    options: EnhancedExportOptions
  ): Promise<string> {
    const htmlConfig = options.htmlConfig || {};
    const theme = htmlConfig.theme || 'light';
    const embedSVG = htmlConfig.embedSVG !== false;
    const includeCSS = htmlConfig.includeCSS !== false;
    const responsive = htmlConfig.responsive !== false;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(material.title)}</title>`;

    if (includeCSS) {
      html += this.generateCSS(theme, responsive);
    }

    html += `
</head>
<body class="theme-${theme}">
  <div class="container">
    <header class="material-header">
      <h1>${this.escapeHtml(material.title)}</h1>
      <div class="material-meta">
        <span class="created-date">Created: ${material.createdAt.toLocaleDateString()}</span>
        <span class="updated-date">Updated: ${material.updatedAt.toLocaleDateString()}</span>
        <span class="version">Version: ${material.version}</span>
      </div>
    </header>

    <main class="material-content">`;

    // Add table of contents for longer materials
    if (material.sections.length > 5) {
      html += this.generateTableOfContents(material);
    }

    // Add sections in order
    const sortedSections = material.sections.sort((a, b) => a.order - b.order);
    for (const section of sortedSections) {
      html += this.renderSectionToHTML(section);
    }

    // Add images if requested
    if (options.includeImages && material.images.length > 0) {
      html += `
      <section class="images-section">
        <h2>Generated Images</h2>
        <div class="images-grid">`;

      for (const image of material.images) {
        html += this.renderImageToHTML(image, embedSVG);
      }

      html += `
        </div>
      </section>`;
    }

    html += `
    </main>`;

    // Add metadata if requested
    if (options.includeMetadata) {
      html += this.generateMetadataHTML(material);
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Export to enhanced Markdown format with proper image handling
   */
  private async exportToMarkdown(
    material: StudyMaterial,
    options: EnhancedExportOptions
  ): Promise<string> {
    const markdownConfig = options.markdownConfig || {};
    const imageFormat = markdownConfig.imageFormat || 'base64';
    const mathFormat = markdownConfig.mathFormat || 'latex';
    const includeTOC = markdownConfig.includeTableOfContents !== false;

    let markdown = `# ${material.title}\n\n`;

    // Add metadata
    markdown += `*Created: ${material.createdAt.toLocaleDateString()}*  \n`;
    markdown += `*Updated: ${material.updatedAt.toLocaleDateString()}*  \n`;
    markdown += `*Version: ${material.version}*\n\n`;

    // Add table of contents if requested
    if (includeTOC && material.sections.length > 3) {
      markdown += this.generateMarkdownTOC(material);
    }

    // Add sections in order
    const sortedSections = material.sections.sort((a, b) => a.order - b.order);
    for (const section of sortedSections) {
      markdown += this.renderSectionToMarkdown(section, mathFormat);
    }

    // Add images if requested
    if (options.includeImages && material.images.length > 0) {
      markdown += `\n## Generated Images\n\n`;
      
      for (let i = 0; i < material.images.length; i++) {
        const image = material.images[i];
        markdown += this.renderImageToMarkdown(image, imageFormat, i + 1);
      }
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      markdown += this.generateMetadataMarkdown(material);
    }

    return markdown;
  }

  /**
   * Export to PDF format using the existing PDF generator
   */
  private async exportToPDF(
    material: StudyMaterial,
    options: EnhancedExportOptions
  ): Promise<Buffer> {
    const pdfConfig = options.pdfConfig || {};
    
    // Convert StudyMaterial to CheatSheetTopic format for PDF generator
    const topics: CheatSheetTopic[] = this.convertToCheatSheetTopics(material, options);
    
    const config: CheatSheetConfig = {
      paperSize: pdfConfig.paperSize || 'a4',
      orientation: pdfConfig.orientation || 'portrait',
      columns: 1, // Single column for study materials
      fontSize: pdfConfig.fontSize || 'medium',
      includeHeaders: pdfConfig.includeHeaders !== false,
      includeFooters: pdfConfig.includeFooters !== false
    };

    const generationRequest = {
      topics,
      config,
      title: material.title,
      subtitle: `Generated on ${new Date().toLocaleDateString()}`
    };

    const result = await this.pdfGenerator.generatePDF(generationRequest);
    
    if (!result.success || !result.pdf) {
      throw new ContentModificationError(
        'PDF generation failed',
        'STORAGE_ERROR',
        result.warnings
      );
    }

    return result.pdf;
  }

  /**
   * Convert StudyMaterial to CheatSheetTopic format
   */
  private convertToCheatSheetTopics(
    material: StudyMaterial,
    options: EnhancedExportOptions
  ): CheatSheetTopic[] {
    const topics: CheatSheetTopic[] = [];
    const sortedSections = material.sections.sort((a, b) => a.order - b.order);

    // Group sections by type or create individual topics
    let currentTopic: CheatSheetTopic | null = null;
    let topicContent = '';

    for (const section of sortedSections) {
      if (section.type === 'heading') {
        // Start a new topic
        if (currentTopic && topicContent.trim()) {
          currentTopic.content = topicContent.trim();
          topics.push(currentTopic);
        }

        currentTopic = {
          id: section.id,
          topic: section.content,
          content: '',
          images: []
        };
        topicContent = '';
      } else {
        // Add to current topic content
        if (!currentTopic) {
          currentTopic = {
            id: 'main-content',
            topic: material.title,
            content: '',
            images: []
          };
        }

        if (section.type === 'equation') {
          topicContent += `\n**Equation:** ${section.content}\n\n`;
        } else if (section.type === 'example') {
          topicContent += `\n**Example:** ${section.content}\n\n`;
        } else {
          topicContent += `${section.content}\n\n`;
        }
      }
    }

    // Add the last topic
    if (currentTopic && topicContent.trim()) {
      currentTopic.content = topicContent.trim();
      topics.push(currentTopic);
    }

    // Add images to topics if requested
    if (options.includeImages && material.images.length > 0) {
      const imageTopics = material.images.map((image, index) => ({
        id: `image-${index}`,
        topic: `Generated Image ${index + 1}`,
        content: image.metadata.context || 'Generated visual representation',
        images: [{
          id: image.id,
          src: `data:image/${image.metadata.format};base64,${image.base64Data}`,
          alt: `Generated image ${index + 1}`,
          width: image.metadata.width,
          height: image.metadata.height
        }]
      }));

      topics.push(...imageTopics);
    }

    return topics;
  }

  /**
   * Generate CSS styles for HTML export
   */
  private generateCSS(theme: string, responsive: boolean): string {
    const baseStyles = `
  <style>
    :root {
      --primary-color: ${theme === 'dark' ? '#ffffff' : '#333333'};
      --secondary-color: ${theme === 'dark' ? '#cccccc' : '#666666'};
      --background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      --surface-color: ${theme === 'dark' ? '#2d2d2d' : '#f9f9f9'};
      --border-color: ${theme === 'dark' ? '#404040' : '#e5e5e5'};
      --accent-color: ${theme === 'dark' ? '#4a9eff' : '#007acc'};
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--primary-color);
      background-color: var(--background-color);
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .material-header {
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }

    .material-header h1 {
      margin: 0 0 0.5rem 0;
      color: var(--primary-color);
      font-size: 2.5rem;
      font-weight: 700;
    }

    .material-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: var(--secondary-color);
    }

    .section {
      margin: 1.5rem 0;
      padding: 1rem;
      border-radius: 8px;
    }

    .section.heading {
      background: none;
      padding: 0.5rem 0;
    }

    .section.heading h2 {
      color: var(--accent-color);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
    }

    .section.text {
      background: var(--surface-color);
      border-left: 4px solid var(--accent-color);
    }

    .section.equation {
      background: var(--surface-color);
      text-align: center;
      font-family: 'Times New Roman', serif;
      font-style: italic;
      border: 1px solid var(--border-color);
    }

    .section.example {
      background: var(--surface-color);
      border-left: 4px solid #28a745;
      position: relative;
    }

    .section.example::before {
      content: "Example";
      position: absolute;
      top: -0.5rem;
      left: 1rem;
      background: var(--background-color);
      padding: 0 0.5rem;
      font-size: 0.8rem;
      font-weight: bold;
      color: #28a745;
    }

    .section.list ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .images-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid var(--border-color);
    }

    .images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-top: 1rem;
    }

    .image-container {
      text-align: center;
      background: var(--surface-color);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .image-container img,
    .image-container svg {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }

    .image-caption {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: var(--secondary-color);
    }

    .table-of-contents {
      background: var(--surface-color);
      padding: 1.5rem;
      border-radius: 8px;
      margin: 2rem 0;
      border: 1px solid var(--border-color);
    }

    .table-of-contents h2 {
      margin-top: 0;
      color: var(--accent-color);
    }

    .table-of-contents ul {
      list-style: none;
      padding-left: 0;
    }

    .table-of-contents li {
      margin: 0.5rem 0;
    }

    .table-of-contents a {
      color: var(--accent-color);
      text-decoration: none;
    }

    .table-of-contents a:hover {
      text-decoration: underline;
    }

    .metadata-section {
      margin-top: 3rem;
      padding: 1.5rem;
      background: var(--surface-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-color);
    }

    .metadata-label {
      font-weight: bold;
      color: var(--secondary-color);
    }

    .metadata-value {
      color: var(--primary-color);
    }`;

    if (responsive) {
      return baseStyles + `
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .material-header h1 {
        font-size: 2rem;
      }

      .material-meta {
        flex-direction: column;
        gap: 0.5rem;
      }

      .images-grid {
        grid-template-columns: 1fr;
      }

      .metadata-grid {
        grid-template-columns: 1fr;
      }
    }

    @media print {
      .container {
        max-width: none;
        padding: 1rem;
      }

      .section {
        break-inside: avoid;
      }

      .images-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>`;
    }

    return baseStyles + `
  </style>`;
  }

  /**
   * Generate table of contents for HTML
   */
  private generateTableOfContents(material: StudyMaterial): string {
    const headings = material.sections
      .filter(section => section.type === 'heading')
      .sort((a, b) => a.order - b.order);

    if (headings.length === 0) return '';

    let toc = `
      <nav class="table-of-contents">
        <h2>Table of Contents</h2>
        <ul>`;

    for (const heading of headings) {
      const id = this.generateId(heading.content);
      toc += `
          <li><a href="#${id}">${this.escapeHtml(heading.content)}</a></li>`;
    }

    toc += `
        </ul>
      </nav>`;

    return toc;
  }

  /**
   * Render a section to HTML
   */
  private renderSectionToHTML(section: any): string {
    const id = section.type === 'heading' ? this.generateId(section.content) : '';
    
    let html = `
      <div class="section ${section.type}" ${id ? `id="${id}"` : ''}>`;

    switch (section.type) {
      case 'heading':
        html += `<h2>${this.escapeHtml(section.content)}</h2>`;
        break;
      case 'equation':
        html += `<div class="equation-content">${this.escapeHtml(section.content)}</div>`;
        break;
      case 'example':
        html += `<div class="example-content">${this.escapeHtml(section.content)}</div>`;
        break;
      case 'list':
        const items = section.content.split('\n').filter((item: string) => item.trim());
        html += '<ul>';
        for (const item of items) {
          html += `<li>${this.escapeHtml(item.replace(/^[-*]\s*/, ''))}</li>`;
        }
        html += '</ul>';
        break;
      default:
        html += `<p>${this.escapeHtml(section.content)}</p>`;
    }

    html += `
      </div>`;

    return html;
  }

  /**
   * Render an image to HTML
   */
  private renderImageToHTML(image: any, embedSVG: boolean): string {
    let imageHtml = '';
    
    if (image.metadata.format === 'svg' && embedSVG) {
      // Decode base64 SVG and embed directly
      const svgContent = Buffer.from(image.base64Data, 'base64').toString('utf8');
      imageHtml = svgContent;
    } else {
      imageHtml = `<img src="data:image/${image.metadata.format};base64,${image.base64Data}" 
                        alt="Generated image" 
                        width="${image.metadata.width}" 
                        height="${image.metadata.height}" />`;
    }

    return `
      <div class="image-container">
        ${imageHtml}
        <div class="image-caption">
          Generated: ${image.metadata.generatedAt ? new Date(image.metadata.generatedAt).toLocaleDateString() : 'Unknown'}
          ${image.metadata.context ? ` | ${this.escapeHtml(image.metadata.context)}` : ''}
        </div>
      </div>`;
  }

  /**
   * Generate table of contents for Markdown
   */
  private generateMarkdownTOC(material: StudyMaterial): string {
    const headings = material.sections
      .filter(section => section.type === 'heading')
      .sort((a, b) => a.order - b.order);

    if (headings.length === 0) return '';

    let toc = `## Table of Contents\n\n`;

    for (const heading of headings) {
      const anchor = heading.content.toLowerCase().replace(/[^a-z0-9]/g, '-');
      toc += `- [${heading.content}](#${anchor})\n`;
    }

    return toc + '\n';
  }

  /**
   * Render a section to Markdown
   */
  private renderSectionToMarkdown(section: any, mathFormat: string): string {
    let markdown = '';

    switch (section.type) {
      case 'heading':
        markdown += `\n## ${section.content}\n\n`;
        break;
      case 'equation':
        if (mathFormat === 'latex') {
          markdown += `\n$$${section.content}$$\n\n`;
        } else {
          markdown += `\n**Equation:** ${section.content}\n\n`;
        }
        break;
      case 'example':
        markdown += `\n> **Example:** ${section.content}\n\n`;
        break;
      case 'list':
        const items = section.content.split('\n').filter((item: string) => item.trim());
        for (const item of items) {
          markdown += `- ${item.replace(/^[-*]\s*/, '')}\n`;
        }
        markdown += '\n';
        break;
      default:
        markdown += `${section.content}\n\n`;
    }

    return markdown;
  }

  /**
   * Render an image to Markdown
   */
  private renderImageToMarkdown(image: any, imageFormat: string, index: number): string {
    switch (imageFormat) {
      case 'base64':
        return `![Generated Image ${index}](data:image/${image.metadata.format};base64,${image.base64Data})\n\n`;
      case 'reference':
        return `![Generated Image ${index}][image${index}]\n\n[image${index}]: data:image/${image.metadata.format};base64,${image.base64Data}\n\n`;
      default:
        return `![Generated Image ${index}](data:image/${image.metadata.format};base64,${image.base64Data})\n\n`;
    }
  }

  /**
   * Generate metadata HTML section
   */
  private generateMetadataHTML(material: StudyMaterial): string {
    return `
    <footer class="metadata-section">
      <h2>Document Metadata</h2>
      <div class="metadata-grid">
        <div class="metadata-item">
          <span class="metadata-label">Created:</span>
          <span class="metadata-value">${material.createdAt.toISOString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Last Updated:</span>
          <span class="metadata-value">${material.updatedAt.toISOString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Version:</span>
          <span class="metadata-value">${material.version}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Sections:</span>
          <span class="metadata-value">${material.sections.length}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Images:</span>
          <span class="metadata-value">${material.images.length}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Preservation Score:</span>
          <span class="metadata-value">${(material.metadata.preservationScore * 100).toFixed(1)}%</span>
        </div>
      </div>
    </footer>`;
  }

  /**
   * Generate metadata Markdown section
   */
  private generateMetadataMarkdown(material: StudyMaterial): string {
    return `
---

## Document Metadata

| Property | Value |
|----------|-------|
| Created | ${material.createdAt.toISOString()} |
| Last Updated | ${material.updatedAt.toISOString()} |
| Version | ${material.version} |
| Sections | ${material.sections.length} |
| Images | ${material.images.length} |
| Preservation Score | ${(material.metadata.preservationScore * 100).toFixed(1)}% |
| Original Files | ${material.metadata.originalFiles.join(', ') || 'None'} |

`;
  }

  /**
   * Utility functions
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_');
  }

  private escapeHtml(text: string): string {
    // Use a simple escape function that works in both browser and Node.js
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.pdfGenerator.cleanup();
  }
}