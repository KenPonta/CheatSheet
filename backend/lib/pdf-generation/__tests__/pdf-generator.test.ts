import { PDFGenerator } from '../pdf-generator'
import { GenerationRequest, CheatSheetTopic, CheatSheetConfig } from '../types'
import puppeteer from 'puppeteer'

// Mock puppeteer
jest.mock('puppeteer')

// Mock document for escapeHtml function
if (typeof global.document === 'undefined') {
  Object.defineProperty(global, 'document', {
    value: {
      createElement: jest.fn(() => ({
        textContent: '',
        innerHTML: ''
      }))
    }
  })
}

describe('PDFGenerator', () => {
  let pdfGenerator: PDFGenerator
  let mockBrowser: any
  let mockPage: any

  beforeEach(() => {
    pdfGenerator = new PDFGenerator()
    
    mockPage = {
      setViewport: jest.fn(),
      setContent: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(2), // Default page count
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      emulateMediaType: jest.fn(),
      close: jest.fn()
    }
    
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    }
    
    ;(puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser)
  })

  afterEach(async () => {
    await pdfGenerator.cleanup()
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize browser successfully', async () => {
      await pdfGenerator.initialize()
      
      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ])
      })
    })

    it('should not reinitialize if browser already exists', async () => {
      await pdfGenerator.initialize()
      await pdfGenerator.initialize()
      
      expect(puppeteer.launch).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('should close browser when cleanup is called', async () => {
      await pdfGenerator.initialize()
      await pdfGenerator.cleanup()
      
      expect(mockBrowser.close).toHaveBeenCalled()
    })

    it('should handle cleanup when browser is null', async () => {
      await expect(pdfGenerator.cleanup()).resolves.not.toThrow()
    })
  })

  describe('generatePDF', () => {
    const mockRequest: GenerationRequest = {
      topics: [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ],
      config: {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium'
      },
      title: 'Test Cheat Sheet'
    }

    it('should generate PDF successfully with enhanced features', async () => {
      // Mock page count evaluation
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(2) // accurate page count
      
      const result = await pdfGenerator.generatePDF(mockRequest)
      
      expect(result.success).toBe(true)
      expect(result.html).toContain('Test Topic')
      expect(result.pdf).toBeInstanceOf(Buffer)
      expect(result.pageCount).toBe(2)
      expect(result.metadata).toBeDefined()
      expect(result.metadata?.optimization).toBe('enhanced')
      expect(mockPage.setContent).toHaveBeenCalled()
      expect(mockPage.pdf).toHaveBeenCalled()
      expect(mockPage.emulateMediaType).toHaveBeenCalledWith('print')
    })

    it('should set correct enhanced PDF options for A4 portrait', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(2) // accurate page count

      await pdfGenerator.generatePDF(mockRequest)
      
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        landscape: false,
        margin: {
          top: '15mm',
          right: '12mm',
          bottom: '15mm',
          left: '12mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: expect.stringContaining('Test Cheat Sheet'),
        footerTemplate: expect.stringContaining('pageNumber'),
        preferCSSPageSize: true,
        tagged: true,
        outline: false,
        width: undefined,
        height: undefined,
        pageRanges: '',
        omitBackground: false,
        timeout: 60000
      })
    })

    it('should set correct PDF options for landscape with adjusted margins', async () => {
      const landscapeRequest = {
        ...mockRequest,
        config: {
          ...mockRequest.config,
          orientation: 'landscape' as const
        }
      }
      
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(1) // accurate page count
      
      await pdfGenerator.generatePDF(landscapeRequest)
      
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          landscape: true,
          margin: {
            top: '12mm',    // Adjusted for landscape
            right: '15mm',
            bottom: '12mm',
            left: '15mm'
          }
        })
      )
    })

    it('should handle different paper sizes', async () => {
      const letterRequest = {
        ...mockRequest,
        config: {
          ...mockRequest.config,
          paperSize: 'letter' as const
        }
      }
      
      await pdfGenerator.generatePDF(letterRequest)
      
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'Letter'
        })
      )
    })

    it('should wait for images to load', async () => {
      const requestWithImages: GenerationRequest = {
        ...mockRequest,
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            images: [
              {
                id: 'img-1',
                src: 'test.jpg',
                alt: 'Test image'
              }
            ]
          }
        ]
      }
      
      await pdfGenerator.generatePDF(requestWithImages)
      
      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should generate warnings for content overflow', async () => {
      const largeContentRequest: GenerationRequest = {
        ...mockRequest,
        topics: Array.from({ length: 20 }, (_, i) => ({
          id: `topic-${i}`,
          topic: `Topic ${i}`,
          content: 'Very long content that should definitely overflow the page '.repeat(100)
        })),
        config: {
          ...mockRequest.config,
          pageCount: 1,
          fontSize: 'small'
        }
      }
      
      // Mock page count to be 1 (less than estimated)
      mockPage.evaluate.mockResolvedValueOnce(1)
      
      const result = await pdfGenerator.generatePDF(largeContentRequest)
      
      expect(result.warnings.length).toBeGreaterThan(0)
      const overflowWarning = result.warnings.find(w => w.type === 'overflow')
      expect(overflowWarning).toBeDefined()
    })

    it('should generate warnings for recreated images', async () => {
      const requestWithRecreatedImages: GenerationRequest = {
        ...mockRequest,
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            images: [
              {
                id: 'img-1',
                src: 'test.jpg',
                alt: 'Test image',
                isRecreated: true
              }
            ]
          }
        ]
      }
      
      const result = await pdfGenerator.generatePDF(requestWithRecreatedImages)
      
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'quality',
            message: expect.stringContaining('recreated using AI')
          })
        ])
      )
    })

    it('should fallback to HTML on PDF generation error with enhanced error handling', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
      mockPage.pdf.mockRejectedValueOnce(new Error('PDF generation failed'))
      
      const result = await pdfGenerator.generatePDF(mockRequest)
      
      expect(result.success).toBe(false)
      expect(result.html).toContain('Test Topic')
      expect(result.pdf).toBeUndefined()
      expect(result.metadata?.optimization).toBe('fallback')
      expect(result.metadata?.error).toBe('PDF generation failed')
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'quality',
            severity: 'high',
            message: expect.stringContaining('PDF generation failed: PDF generation failed')
          })
        ])
      )
    })

    it('should optimize viewport for different paper sizes', async () => {
      const a3Request = {
        ...mockRequest,
        config: {
          ...mockRequest.config,
          paperSize: 'a3' as const
        }
      }
      
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(1) // accurate page count
      
      await pdfGenerator.generatePDF(a3Request)
      
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1123,  // A3 width in pixels
        height: 1587  // A3 height in pixels
      })
    })

    it('should handle image loading with fallback', async () => {
      const requestWithImages: GenerationRequest = {
        ...mockRequest,
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            images: [
              {
                id: 'img-1',
                src: 'test.jpg',
                alt: 'Test image'
              }
            ]
          }
        ]
      }
      
      // Mock image loading to throw error
      mockPage.evaluate
        .mockRejectedValueOnce(new Error('Image loading failed'))
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(1) // accurate page count
      
      const result = await pdfGenerator.generatePDF(requestWithImages)
      
      expect(result.success).toBe(true) // Should still succeed despite image error
      expect(mockPage.evaluate).toHaveBeenCalledTimes(3)
    })

    it('should apply print optimizations', async () => {
      const complexRequest: GenerationRequest = {
        ...mockRequest,
        topics: Array.from({ length: 25 }, (_, i) => ({
          id: `topic-${i}`,
          topic: `Topic ${i}`,
          content: 'Content'
        })),
        config: {
          ...mockRequest.config,
          fontSize: 'large',
          columns: 3
        }
      }
      
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(2) // accurate page count
      
      const result = await pdfGenerator.generatePDF(complexRequest)
      
      // Should optimize font size for dense content
      expect(result.success).toBe(true)
      expect(result.metadata?.optimization).toBe('enhanced')
    })

    it('should validate PDF quality and generate warnings', async () => {
      // Mock large PDF buffer
      const largePdfBuffer = Buffer.alloc(15 * 1024 * 1024) // 15MB
      mockPage.pdf.mockResolvedValueOnce(largePdfBuffer)
      
      const complexLayoutRequest: GenerationRequest = {
        ...mockRequest,
        config: {
          ...mockRequest.config,
          columns: 3
        },
        topics: [
          {
            id: 'topic-1',
            topic: 'Complex Topic',
            content: 'Content',
            images: Array.from({ length: 5 }, (_, i) => ({
              id: `img-${i}`,
              src: `test${i}.jpg`,
              alt: `Image ${i}`
            }))
          }
        ]
      }
      
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // image loading
        .mockResolvedValueOnce(undefined) // page break optimization
        .mockResolvedValueOnce(1) // accurate page count
      
      const result = await pdfGenerator.generatePDF(complexLayoutRequest)
      
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'quality',
            message: expect.stringContaining('PDF file size is large')
          }),
          expect.objectContaining({
            type: 'quality',
            message: expect.stringContaining('Complex layout detected')
          })
        ])
      )
    })
  })

  describe('generateHTMLOnly', () => {
    const mockRequest: GenerationRequest = {
      topics: [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content'
        }
      ],
      config: {
        paperSize: 'a4',
        orientation: 'portrait',
        columns: 1,
        fontSize: 'medium',
        pageCount: 2
      }
    }

    it('should generate HTML without PDF', async () => {
      const result = await pdfGenerator.generateHTMLOnly(mockRequest)
      
      expect(result.success).toBe(true)
      expect(result.html).toContain('Test Topic')
      expect(result.pdf).toBeUndefined()
      expect(result.pageCount).toBe(2)
    })

    it('should analyze content fit', async () => {
      const result = await pdfGenerator.generateHTMLOnly(mockRequest)
      
      expect(result.contentFit).toEqual({
        totalContent: expect.any(Number),
        fittedContent: expect.any(Number),
        overflowContent: expect.any(Number),
        estimatedPages: expect.any(Number),
        contentUtilization: expect.any(Number)
      })
    })
  })

  describe('content fit analysis', () => {
    it('should calculate content requirements correctly', async () => {
      const topics: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Short topic',
          content: 'Short content'
        },
        {
          id: 'topic-2',
          topic: 'Long topic with lots of content',
          content: 'Very long content that should take up more space '.repeat(50)
        }
      ]

      const request: GenerationRequest = {
        topics,
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: 'small',
          pageCount: 1
        }
      }

      const result = await pdfGenerator.generateHTMLOnly(request)
      
      expect(result.contentFit.totalContent).toBeGreaterThan(0)
      expect(result.contentFit.estimatedPages).toBeGreaterThan(0)
    })

    it('should account for images in content calculation', async () => {
      const topicsWithImages: CheatSheetTopic[] = [
        {
          id: 'topic-1',
          topic: 'Topic with images',
          content: 'Content',
          images: [
            { id: 'img-1', src: 'test1.jpg', alt: 'Image 1' },
            { id: 'img-2', src: 'test2.jpg', alt: 'Image 2' }
          ]
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
      
      // Should account for images in total content calculation
      expect(result.contentFit.totalContent).toBeGreaterThan(1000) // 2 images * 500 + text
    })
  })
})