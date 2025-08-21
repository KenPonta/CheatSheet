import { CheatSheetTemplates } from '../templates'
import { CheatSheetConfig, CheatSheetTopic, CheatSheetImage } from '../types'

describe('CheatSheetTemplates', () => {
  describe('getPaperDimensions', () => {
    it('should return correct A4 portrait dimensions', () => {
      const dimensions = CheatSheetTemplates.getPaperDimensions('a4', 'portrait')
      
      expect(dimensions).toEqual({
        width: '210mm',
        height: '297mm',
        marginTop: '15mm',
        marginRight: '10mm',
        marginBottom: '15mm',
        marginLeft: '10mm'
      })
    })

    it('should return correct A4 landscape dimensions', () => {
      const dimensions = CheatSheetTemplates.getPaperDimensions('a4', 'landscape')
      
      expect(dimensions).toEqual({
        width: '297mm',
        height: '210mm',
        marginTop: '15mm',
        marginRight: '10mm',
        marginBottom: '15mm',
        marginLeft: '10mm'
      })
    })

    it('should return correct Letter dimensions', () => {
      const dimensions = CheatSheetTemplates.getPaperDimensions('letter', 'portrait')
      
      expect(dimensions).toEqual({
        width: '8.5in',
        height: '11in',
        marginTop: '15mm',
        marginRight: '10mm',
        marginBottom: '15mm',
        marginLeft: '10mm'
      })
    })

    it('should default to A4 for unknown paper size', () => {
      const dimensions = CheatSheetTemplates.getPaperDimensions('unknown', 'portrait')
      
      expect(dimensions.width).toBe('210mm')
      expect(dimensions.height).toBe('297mm')
    })
  })

  describe('getFontSizes', () => {
    it('should return correct small font sizes', () => {
      const sizes = CheatSheetTemplates.getFontSizes('small')
      
      expect(sizes).toEqual({
        base: '8pt',
        heading: '10pt',
        subheading: '9pt',
        caption: '7pt'
      })
    })

    it('should return correct medium font sizes', () => {
      const sizes = CheatSheetTemplates.getFontSizes('medium')
      
      expect(sizes).toEqual({
        base: '10pt',
        heading: '12pt',
        subheading: '11pt',
        caption: '8pt'
      })
    })

    it('should return correct large font sizes', () => {
      const sizes = CheatSheetTemplates.getFontSizes('large')
      
      expect(sizes).toEqual({
        base: '12pt',
        heading: '14pt',
        subheading: '13pt',
        caption: '9pt'
      })
    })

    it('should default to small for unknown font size', () => {
      const sizes = CheatSheetTemplates.getFontSizes('unknown')
      
      expect(sizes.base).toBe('8pt')
    })
  })

  describe('generateCSS', () => {
    const mockConfig: CheatSheetConfig = {
      paperSize: 'a4',
      orientation: 'portrait',
      columns: 2,
      fontSize: 'medium'
    }

    it('should generate enhanced CSS with CSS variables and exact measurements', () => {
      const css = CheatSheetTemplates.generateCSS(mockConfig)
      
      expect(css).toContain('--page-width: 210mm')
      expect(css).toContain('--page-height: 297mm')
      expect(css).toContain('--font-base: 10pt')
      expect(css).toContain('--columns: 2')
      expect(css).toContain('size: var(--page-width) var(--page-height)')
      expect(css).toContain('grid-template-columns: repeat(var(--columns), 1fr)')
    })

    it('should include enhanced print optimizations', () => {
      const css = CheatSheetTemplates.generateCSS(mockConfig)
      
      expect(css).toContain('print-color-adjust: exact')
      expect(css).toContain('-webkit-print-color-adjust: exact')
      expect(css).toContain('color-adjust: exact')
      expect(css).toContain('break-inside: avoid')
      expect(css).toContain('page-break-inside: avoid')
      expect(css).toContain('orphans: 2')
      expect(css).toContain('widows: 2')
    })

    it('should include named page types', () => {
      const css = CheatSheetTemplates.generateCSS(mockConfig)
      
      expect(css).toContain('@page :first')
      expect(css).toContain('@page content')
      expect(css).toContain('@page reference')
    })

    it('should include custom styles when provided', () => {
      const configWithCustomStyles = {
        ...mockConfig,
        customStyles: '.custom { color: red; }'
      }
      
      const css = CheatSheetTemplates.generateCSS(configWithCustomStyles)
      
      expect(css).toContain('.custom { color: red; }')
    })

    it('should handle landscape orientation with CSS variables', () => {
      const landscapeConfig = {
        ...mockConfig,
        orientation: 'landscape' as const
      }
      
      const css = CheatSheetTemplates.generateCSS(landscapeConfig)
      
      expect(css).toContain('--page-width: 297mm')
      expect(css).toContain('--page-height: 210mm')
    })

    it('should include enhanced image rendering optimizations', () => {
      const css = CheatSheetTemplates.generateCSS(mockConfig)
      
      expect(css).toContain('image-rendering: -webkit-optimize-contrast')
      expect(css).toContain('image-rendering: crisp-edges')
    })

    it('should include screen-specific optimizations', () => {
      const css = CheatSheetTemplates.generateCSS(mockConfig)
      
      expect(css).toContain('@media screen')
      expect(css).toContain('box-shadow: 0 0 10px rgba(0,0,0,0.1)')
      expect(css).toContain('max-width: var(--page-width)')
    })
  })

  describe('renderImage', () => {
    // Mock document for escapeHtml function
    beforeAll(() => {
      global.document = {
        createElement: jest.fn(() => ({
          textContent: '',
          get innerHTML() { return this.textContent }
        }))
      } as any
    })

    const mockImage: CheatSheetImage = {
      id: 'img-1',
      src: 'data:image/png;base64,test',
      alt: 'Test image',
      caption: 'Test caption',
      width: 200,
      height: 150
    }

    it('should render enhanced image with all attributes and optimizations', () => {
      const html = CheatSheetTemplates.renderImage(mockImage)
      
      expect(html).toContain('src="data:image/png;base64,test"')
      expect(html).toContain('alt="Test image"')
      expect(html).toContain('width="200"')
      expect(html).toContain('height="150"')
      expect(html).toContain('loading="eager"')
      expect(html).toContain('decoding="sync"')
      expect(html).toContain('Test caption')
      expect(html).toContain('onerror=')
    })

    it('should show enhanced recreated badge for AI generated images', () => {
      const recreatedImage = {
        ...mockImage,
        isRecreated: true
      }
      
      const html = CheatSheetTemplates.renderImage(recreatedImage)
      
      expect(html).toContain('AI Generated')
      expect(html).toContain('recreated-badge')
    })

    it('should handle images without captions', () => {
      const imageWithoutCaption = {
        ...mockImage,
        caption: undefined
      }
      
      const html = CheatSheetTemplates.renderImage(imageWithoutCaption)
      
      expect(html).not.toContain('image-caption')
    })

    it('should include error handling for broken images', () => {
      const html = CheatSheetTemplates.renderImage(mockImage)
      
      expect(html).toContain('onerror="this.style.display=\'none\'')
    })

    it('should handle images with special characters in alt text', () => {
      const imageWithSpecialChars = {
        ...mockImage,
        alt: 'Test "image" with <special> & characters',
        caption: 'Caption with "quotes" & <tags>'
      }
      
      const html = CheatSheetTemplates.renderImage(imageWithSpecialChars)
      
      // Should escape HTML in alt and caption
      expect(html).toContain('alt="Test "image" with &lt;special&gt; &amp; characters"')
      expect(html).toContain('Caption with "quotes" &amp; &lt;tags&gt;')
    })
  })

  describe('renderTopic', () => {
    const mockTopic: CheatSheetTopic = {
      id: 'topic-1',
      topic: 'Test Topic',
      content: 'Test content with\nmultiple lines',
      priority: 2
    }

    it('should render topic with correct structure', () => {
      const html = CheatSheetTemplates.renderTopic(mockTopic)
      
      expect(html).toContain('Test Topic')
      expect(html).toContain('Test content with<br>multiple lines')
      expect(html).toContain('priority-medium')
    })

    it('should use custom content when provided', () => {
      const topicWithCustomContent = {
        ...mockTopic,
        customContent: 'Custom content'
      }
      
      const html = CheatSheetTemplates.renderTopic(topicWithCustomContent)
      
      expect(html).toContain('Custom content')
      expect(html).not.toContain('Test content')
    })

    it('should render images when present', () => {
      const topicWithImages = {
        ...mockTopic,
        images: [{
          id: 'img-1',
          src: 'test.jpg',
          alt: 'Test image'
        }]
      }
      
      const html = CheatSheetTemplates.renderTopic(topicWithImages)
      
      expect(html).toContain('topic-images')
      expect(html).toContain('src="test.jpg"')
    })

    it('should apply correct priority classes', () => {
      const highPriorityTopic = { ...mockTopic, priority: 3 }
      const mediumPriorityTopic = { ...mockTopic, priority: 2 }
      const lowPriorityTopic = { ...mockTopic, priority: 1 }
      
      expect(CheatSheetTemplates.renderTopic(highPriorityTopic)).toContain('priority-high')
      expect(CheatSheetTemplates.renderTopic(mediumPriorityTopic)).toContain('priority-medium')
      expect(CheatSheetTemplates.renderTopic(lowPriorityTopic)).not.toContain('priority-')
    })
  })

  describe('generateHTML', () => {
    const mockTopics: CheatSheetTopic[] = [
      {
        id: 'topic-1',
        topic: 'Topic 1',
        content: 'Content 1'
      },
      {
        id: 'topic-2',
        topic: 'Topic 2',
        content: 'Content 2'
      }
    ]

    const mockConfig: CheatSheetConfig = {
      paperSize: 'a4',
      orientation: 'portrait',
      columns: 1,
      fontSize: 'medium'
    }

    it('should generate complete HTML document', () => {
      const html = CheatSheetTemplates.generateHTML(mockTopics, mockConfig)
      
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html lang="en">')
      expect(html).toContain('Study Cheat Sheet')
      expect(html).toContain('Topic 1')
      expect(html).toContain('Topic 2')
      expect(html).toContain('Content 1')
      expect(html).toContain('Content 2')
    })

    it('should include custom title and subtitle', () => {
      const html = CheatSheetTemplates.generateHTML(
        mockTopics,
        mockConfig,
        'Custom Title',
        'Custom Subtitle'
      )
      
      expect(html).toContain('Custom Title')
      expect(html).toContain('Custom Subtitle')
    })

    it('should include reference text when provided', () => {
      const html = CheatSheetTemplates.generateHTML(
        mockTopics,
        mockConfig,
        'Title',
        undefined,
        'Reference notes here'
      )
      
      expect(html).toContain('Reference Notes')
      expect(html).toContain('Reference notes here')
    })

    it('should exclude headers when configured', () => {
      const configWithoutHeaders = {
        ...mockConfig,
        includeHeaders: false
      }
      
      const html = CheatSheetTemplates.generateHTML(mockTopics, configWithoutHeaders)
      
      expect(html).not.toContain('class="header"')
    })

    it('should exclude footers when configured', () => {
      const configWithoutFooters = {
        ...mockConfig,
        includeFooters: false
      }
      
      const html = CheatSheetTemplates.generateHTML(mockTopics, configWithoutFooters)
      
      expect(html).not.toContain('class="footer"')
    })
  })
})