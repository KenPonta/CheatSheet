import { CheatSheetTemplates } from '../templates'
import { PDFGenerator } from '../pdf-generator'
import { GenerationRequest, CheatSheetTopic, CheatSheetConfig } from '../types'

describe('PDF Generation Content Preservation', () => {
  let pdfGenerator: PDFGenerator

  beforeEach(() => {
    pdfGenerator = new PDFGenerator()
  })

  afterEach(async () => {
    await pdfGenerator.cleanup()
  })

  describe('Content Fidelity', () => {
    it('should preserve original text content exactly', () => {
      const originalContent = 'This is the exact original text with special characters: @#$%^&*()'
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: originalContent
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).toContain(originalContent)
    })

    it('should preserve line breaks and formatting', () => {
      const contentWithBreaks = 'Line 1\nLine 2\nLine 3'
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: contentWithBreaks
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).toContain('Line 1<br>Line 2<br>Line 3')
    })

    it('should preserve custom content over original content', () => {
      const originalContent = 'Original content'
      const customContent = 'Custom modified content'
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: originalContent,
          customContent: customContent
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).toContain(customContent)
      expect(html).not.toContain(originalContent)
    })

    it('should preserve image metadata and attributes', () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Topic with Images',
          content: 'Content',
          images: [
            {
              id: 'img-1',
              src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
              alt: 'Test image with special chars: @#$%',
              caption: 'Image caption with formatting',
              width: 200,
              height: 150,
              isRecreated: true
            }
          ]
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).toContain('alt="Test image with special chars: @#$%"')
      expect(html).toContain('width="200"')
      expect(html).toContain('height="150"')
      expect(html).toContain('Image caption with formatting')
      expect(html).toContain('AI Generated')
    })
  })

  describe('Layout Quality', () => {
    it('should generate proper CSS for different paper sizes', () => {
      const configs = [
        { paperSize: 'a4', expectedWidth: '210mm', expectedHeight: '297mm' },
        { paperSize: 'letter', expectedWidth: '8.5in', expectedHeight: '11in' },
        { paperSize: 'legal', expectedWidth: '8.5in', expectedHeight: '14in' },
        { paperSize: 'a3', expectedWidth: '297mm', expectedHeight: '420mm' }
      ]

      configs.forEach(({ paperSize, expectedWidth, expectedHeight }) => {
        const config: CheatSheetConfig = {
          paperSize: paperSize as any,
          orientation: 'portrait',
          columns: 1,
          fontSize: 'medium'
        }

        const css = CheatSheetTemplates.generateCSS(config)
        
        expect(css).toContain(`--page-width: ${expectedWidth}`)
        expect(css).toContain(`--page-height: ${expectedHeight}`)
        expect(css).toContain('size: var(--page-width) var(--page-height)')
      })
    })

    it('should handle landscape orientation correctly', () => {
      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'landscape',
        columns: 1,
        fontSize: 'medium'
      }

      const css = CheatSheetTemplates.generateCSS(config)
      
      // In landscape, width and height should be swapped
      expect(css).toContain('--page-width: 297mm')
      expect(css).toContain('--page-height: 210mm')
      expect(css).toContain('size: var(--page-width) var(--page-height)')
    })

    it('should generate proper column layouts', () => {
      const columnConfigs = [1, 2, 3]

      columnConfigs.forEach(columns => {
        const config: CheatSheetConfig = {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: columns as any,
          fontSize: 'medium'
        }

        const css = CheatSheetTemplates.generateCSS(config)
        
        expect(css).toContain(`--columns: ${columns}`)
        expect(css).toContain('grid-template-columns: repeat(var(--columns), 1fr)')
      })
    })

    it('should apply correct font sizes', () => {
      const fontConfigs = [
        { fontSize: 'small', expectedBase: '8pt', expectedHeading: '10pt' },
        { fontSize: 'medium', expectedBase: '10pt', expectedHeading: '12pt' },
        { fontSize: 'large', expectedBase: '12pt', expectedHeading: '14pt' }
      ]

      fontConfigs.forEach(({ fontSize, expectedBase, expectedHeading }) => {
        const config: CheatSheetConfig = {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: fontSize as any
        }

        const css = CheatSheetTemplates.generateCSS(config)
        
        expect(css).toContain(`--font-base: ${expectedBase}`)
        expect(css).toContain(`--font-heading: ${expectedHeading}`)
        expect(css).toContain('font-size: var(--font-base)')
      })
    })
  })

  describe('Page Break Optimization', () => {
    it('should include page break CSS classes', () => {
      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const css = CheatSheetTemplates.generateCSS(config)
      
      expect(css).toContain('.page-break-before')
      expect(css).toContain('.page-break-after')
      expect(css).toContain('.page-break-avoid')
      expect(css).toContain('page-break-before: always')
      expect(css).toContain('page-break-after: always')
      expect(css).toContain('page-break-inside: avoid')
    })

    it('should apply page break avoidance to topic sections', () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).toContain('class="topic-section  page-break-avoid"')
    })

    it('should include print media queries', () => {
      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      }

      const css = CheatSheetTemplates.generateCSS(config)
      
      expect(css).toContain('@media print')
      expect(css).toContain('print-color-adjust: exact')
      expect(css).toContain('-webkit-print-color-adjust: exact')
      expect(css).toContain('break-inside: avoid')
      expect(css).toContain('orphans: 2')
      expect(css).toContain('widows: 2')
    })
  })

  describe('Header and Footer Support', () => {
    it('should include headers when enabled', () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        includeHeaders: true
      }

      const html = CheatSheetTemplates.generateHTML(topics, config, 'Custom Title')
      
      expect(html).toContain('class="header page-break-avoid"')
      expect(html).toContain('Custom Title')
    })

    it('should exclude headers when disabled', () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        includeHeaders: false
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).not.toContain('class="header')
    })

    it('should include footers when enabled', () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        includeFooters: true
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).toContain('class="footer page-break-avoid"')
      expect(html).toContain('Generated by CheatSheet Creator')
    })

    it('should exclude footers when disabled', () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ]

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        includeFooters: false
      }

      const html = CheatSheetTemplates.generateHTML(topics, config)
      
      expect(html).not.toContain('class="footer')
    })
  })

  describe('Content Overflow Analysis', () => {
    it('should estimate content requirements accurately', async () => {
      const largeTopics: CheatSheetTopic[] = Array.from({ length: 10 }, (_, i) => ({
        id: `topic-${i}`,
        topic: `Topic ${i}`,
        content: 'Very long content that should take up significant space on the page. '.repeat(20)
      }))

      const request: GenerationRequest = {
        topics: largeTopics,
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: 'small',
          pageCount: 1
        }
      }

      const result = await pdfGenerator.generateHTMLOnly(request)
      
      expect(result.contentFit.estimatedPages).toBeGreaterThan(1)
      expect(result.contentFit.overflowContent).toBeGreaterThan(0)
      expect(result.contentFit.contentUtilization).toBeLessThanOrEqual(1)
    })

    it('should account for images in content calculation', async () => {
      const topicsWithImages: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Topic with many images',
          content: 'Short text content',
          images: Array.from({ length: 5 }, (_, i) => ({
            id: `img-${i}`,
            src: `image-${i}.jpg`,
            alt: `Image ${i}`
          }))
        }
      ]

      const request: GenerationRequest = {
        topics: topicsWithImages,
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: 'medium',
          pageCount: 1
        }
      }

      const result = await pdfGenerator.generateHTMLOnly(request)
      
      // Should account for images in total content
      expect(result.contentFit.totalContent).toBeGreaterThan(2500) // 5 images * 500 + text
    })
  })

  describe('Custom Styles Integration', () => {
    it('should include custom CSS styles', () => {
      const customStyles = `
        .custom-class { color: red; }
        .another-class { font-weight: bold; }
      `

      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        customStyles
      }

      const css = CheatSheetTemplates.generateCSS(config)
      
      expect(css).toContain('.custom-class { color: red; }')
      expect(css).toContain('.another-class { font-weight: bold; }')
    })

    it('should handle empty custom styles gracefully', () => {
      const config: CheatSheetConfig = {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        customStyles: ''
      }

      const css = CheatSheetTemplates.generateCSS(config)
      
      expect(css).toBeDefined()
      expect(css.length).toBeGreaterThan(0)
    })
  })
})