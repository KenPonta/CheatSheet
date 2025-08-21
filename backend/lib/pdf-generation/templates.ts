import { CheatSheetConfig, CheatSheetTopic, CheatSheetImage, PaperDimensions } from './types'

export class CheatSheetTemplates {
  static getPaperDimensions(paperSize: string, orientation: string): PaperDimensions {
    const dimensions = {
      a4: { width: '210mm', height: '297mm' },
      letter: { width: '8.5in', height: '11in' },
      legal: { width: '8.5in', height: '14in' },
      a3: { width: '297mm', height: '420mm' }
    }

    const paper = dimensions[paperSize as keyof typeof dimensions] || dimensions.a4
    const isLandscape = orientation === 'landscape'

    return {
      width: isLandscape ? paper.height : paper.width,
      height: isLandscape ? paper.width : paper.height,
      marginTop: '15mm',
      marginRight: '10mm',
      marginBottom: '15mm',
      marginLeft: '10mm'
    }
  }

  static getFontSizes(fontSize: string) {
    const sizes = {
      small: { base: '8pt', heading: '10pt', subheading: '9pt', caption: '7pt' },
      medium: { base: '10pt', heading: '12pt', subheading: '11pt', caption: '8pt' },
      large: { base: '12pt', heading: '14pt', subheading: '13pt', caption: '9pt' }
    }
    return sizes[fontSize as keyof typeof sizes] || sizes.small
  }

  static generateCSS(config: CheatSheetConfig): string {
    const paper = this.getPaperDimensions(config.paperSize, config.orientation)
    const fonts = this.getFontSizes(config.fontSize)

    return `
      /* Enhanced CSS Variables for exact measurements */
      :root {
        --page-width: ${paper.width};
        --page-height: ${paper.height};
        --margin-top: ${paper.marginTop};
        --margin-right: ${paper.marginRight};
        --margin-bottom: ${paper.marginBottom};
        --margin-left: ${paper.marginLeft};
        --font-base: ${fonts.base};
        --font-heading: ${fonts.heading};
        --font-subheading: ${fonts.subheading};
        --font-caption: ${fonts.caption};
        --columns: ${config.columns};
      }

      @page {
        size: var(--page-width) var(--page-height);
        margin: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
        
        /* Enhanced page rules for better print quality */
        marks: none;
        bleed: 0;
        
        @top-center {
          content: "Study Cheat Sheet";
          font-family: Arial, sans-serif;
          font-size: var(--font-caption);
          color: #666;
          margin-bottom: 3mm;
        }
        
        @bottom-center {
          content: "Page " counter(page) " of " counter(pages);
          font-family: Arial, sans-serif;
          font-size: var(--font-caption);
          color: #666;
          margin-top: 3mm;
        }
      }

      /* Named page types for different sections */
      @page :first {
        @top-center {
          content: "";
        }
      }

      @page content {
        /* Standard content pages */
      }

      @page reference {
        @bottom-center {
          content: "Reference - Page " counter(page);
        }
      }
      
      /* Enhanced reset and base styles */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      html {
        /* Ensure consistent rendering across browsers */
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: var(--font-base);
        line-height: 1.4;
        color: #333;
        background: white;
        
        /* Enhanced print optimization */
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
        
        /* Prevent text selection artifacts in PDF */
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      .cheat-sheet {
        width: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        page: content;
      }
      
      .header {
        text-align: center;
        margin-bottom: 6mm;
        border-bottom: 2px solid #059669;
        padding-bottom: 3mm;
        page-break-inside: avoid;
        page-break-after: avoid;
      }
      
      .header h1 {
        margin: 0 0 2mm 0;
        font-size: var(--font-heading);
        color: #059669;
        font-weight: bold;
        line-height: 1.2;
        page-break-after: avoid;
      }
      
      .header .subtitle {
        margin: 0;
        font-size: var(--font-subheading);
        color: #666;
        font-weight: normal;
        page-break-after: avoid;
      }
      
      .content {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(var(--columns), 1fr);
        gap: 4mm;
        align-content: start;
        
        /* Enhanced grid layout for print */
        grid-auto-flow: row dense;
        align-items: start;
      }
      
      .topic-section {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 4mm;
        border: 1px solid #e5e7eb;
        border-radius: 2mm;
        padding: 3mm;
        background: #f9fafb;
        
        /* Enhanced orphan/widow control */
        orphans: 2;
        widows: 2;
        
        /* Ensure minimum content per section */
        min-height: 8mm;
      }
      
      .topic-section.priority-high {
        border-color: #059669;
        background: #f0fdf4;
        border-width: 2px;
      }
      
      .topic-section.priority-medium {
        border-color: #f59e0b;
        background: #fffbeb;
        border-width: 1.5px;
      }
      
      .topic-title {
        font-weight: bold;
        color: #059669;
        margin-bottom: 2mm;
        font-size: var(--font-subheading);
        border-bottom: 1px solid #d1d5db;
        padding-bottom: 1mm;
        line-height: 1.2;
        
        /* Prevent title orphans */
        page-break-after: avoid;
        break-after: avoid;
      }
      
      .topic-content {
        font-size: var(--font-base);
        line-height: 1.4;
        margin-bottom: 2mm;
        
        /* Enhanced text rendering */
        text-align: justify;
        hyphens: auto;
        -webkit-hyphens: auto;
        -ms-hyphens: auto;
      }
      
      .topic-content p {
        margin: 0 0 2mm 0;
        orphans: 2;
        widows: 2;
      }
      
      .topic-content ul, .topic-content ol {
        margin: 0 0 2mm 0;
        padding-left: 4mm;
        break-inside: avoid;
      }
      
      .topic-content li {
        margin-bottom: 1mm;
        break-inside: avoid;
      }
      
      .topic-images {
        margin-top: 2mm;
        break-inside: avoid;
      }
      
      .topic-image-container {
        break-inside: avoid;
        page-break-inside: avoid;
        margin: 2mm 0;
        
        /* Ensure images don't create orphans */
        orphans: 1;
        widows: 1;
      }
      
      .topic-image {
        max-width: 100%;
        height: auto;
        border: 1px solid #e5e7eb;
        border-radius: 1mm;
        display: block;
        
        /* Enhanced image rendering */
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        
        /* Prevent image breaks */
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .image-caption {
        font-size: var(--font-caption);
        color: #666;
        text-align: center;
        margin-top: 1mm;
        font-style: italic;
        break-inside: avoid;
        page-break-before: avoid;
      }
      
      .recreated-badge {
        display: inline-block;
        background: #fbbf24;
        color: #92400e;
        font-size: var(--font-caption);
        padding: 0.5mm 1mm;
        border-radius: 1mm;
        margin-left: 2mm;
        font-weight: bold;
      }
      
      .reference-section {
        margin-top: 6mm;
        padding: 4mm;
        border-top: 2px solid #d1d5db;
        background: #f3f4f6;
        border-radius: 2mm;
        page-break-inside: avoid;
        break-inside: avoid;
        page: reference;
      }
      
      .reference-title {
        font-weight: bold;
        color: #374151;
        margin-bottom: 2mm;
        font-size: var(--font-subheading);
        page-break-after: avoid;
      }
      
      .footer {
        margin-top: 6mm;
        text-align: center;
        font-size: var(--font-caption);
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
        padding-top: 2mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Enhanced page break utilities */
      .page-break-before {
        page-break-before: always;
        break-before: page;
      }
      
      .page-break-after {
        page-break-after: always;
        break-after: page;
      }
      
      .page-break-avoid {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .page-break-auto {
        page-break-inside: auto;
        break-inside: auto;
      }
      
      /* Column break utilities */
      .column-break-before {
        break-before: column;
        column-break-before: always;
      }
      
      .column-break-after {
        break-after: column;
        column-break-after: always;
      }
      
      .column-break-avoid {
        break-inside: avoid-column;
        column-break-inside: avoid;
      }
      
      /* Enhanced print optimizations */
      @media print {
        * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        body { 
          font-size: var(--font-base) !important;
          line-height: 1.4 !important;
        }
        
        .cheat-sheet { 
          height: auto !important;
          min-height: auto !important;
        }
        
        .content {
          grid-template-columns: repeat(var(--columns), 1fr) !important;
        }
        
        .topic-section {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          orphans: 2 !important;
          widows: 2 !important;
        }
        
        .topic-title {
          break-after: avoid !important;
          page-break-after: avoid !important;
        }
        
        .topic-image-container {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        .topic-image {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* Ensure proper spacing in print */
        .topic-section {
          margin-bottom: 4mm !important;
        }
        
        .topic-content p {
          margin-bottom: 2mm !important;
        }
        
        /* Hide elements that shouldn't print */
        .no-print {
          display: none !important;
        }
      }
      
      /* Screen-specific optimizations */
      @media screen {
        .cheat-sheet {
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          max-width: var(--page-width);
          margin: 20px auto;
          background: white;
          padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
        }
      }
      
      /* Custom styles placeholder */
      ${config.customStyles || ''}
    `
  }

  static renderImage(image: CheatSheetImage): string {
    // Enhanced image rendering with better error handling and optimization
    const imageAttributes = []
    
    if (image.width) {
      imageAttributes.push(`width="${image.width}"`)
    }
    if (image.height) {
      imageAttributes.push(`height="${image.height}"`)
    }
    
    // Add loading and error handling attributes
    imageAttributes.push('loading="eager"') // Ensure images load immediately for PDF
    imageAttributes.push('decoding="sync"') // Synchronous decoding for PDF generation
    
    // Optimize image for print if it's a data URL
    const isDataUrl = image.src.startsWith('data:')
    const optimizedSrc = isDataUrl ? image.src : image.src
    
    return `
      <div class="topic-image-container page-break-avoid">
        <img 
          src="${optimizedSrc}" 
          alt="${this.escapeHtml(image.alt)}"
          class="topic-image"
          ${imageAttributes.join(' ')}
          onerror="this.style.display='none'; this.nextElementSibling && this.nextElementSibling.classList.add('image-error');"
        />
        ${image.caption || image.isRecreated ? `
          <div class="image-caption">
            ${image.caption ? this.escapeHtml(image.caption) : ''}
            ${image.isRecreated ? '<span class="recreated-badge">AI Generated</span>' : ''}
          </div>
        ` : ''}
      </div>
    `
  }

  static escapeHtml(text: string): string {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }
    
    // Fallback for server-side or test environments
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  static renderTopic(topic: CheatSheetTopic): string {
    const priorityClass = topic.priority === 3 ? 'priority-high' : topic.priority === 2 ? 'priority-medium' : ''
    const content = topic.customContent || topic.content
    
    return `
      <div class="topic-section ${priorityClass} page-break-avoid">
        <div class="topic-title">${topic.topic}</div>
        <div class="topic-content">${content.replace(/\n/g, '<br>')}</div>
        ${topic.images && topic.images.length > 0 ? `
          <div class="topic-images">
            ${topic.images.map(img => this.renderImage(img)).join('')}
          </div>
        ` : ''}
      </div>
    `
  }

  static generateHTML(
    topics: CheatSheetTopic[],
    config: CheatSheetConfig,
    title: string = 'Study Cheat Sheet',
    subtitle?: string,
    referenceText?: string
  ): string {
    const css = this.generateCSS(config)
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${css}</style>
</head>
<body>
    <div class="cheat-sheet">
        ${config.includeHeaders !== false ? `
        <div class="header page-break-avoid">
            <h1>${title}</h1>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        </div>
        ` : ''}
        
        <div class="content">
            ${topics.map(topic => this.renderTopic(topic)).join('')}
        </div>
        
        ${referenceText ? `
        <div class="reference-section page-break-avoid">
            <div class="reference-title">Reference Notes</div>
            <div class="topic-content">${referenceText.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
        
        ${config.includeFooters !== false ? `
        <div class="footer page-break-avoid">
            Generated by CheatSheet Creator • ${new Date().toLocaleDateString()}
        </div>
        ` : ''}
    </div>
</body>
</html>`
  }
}