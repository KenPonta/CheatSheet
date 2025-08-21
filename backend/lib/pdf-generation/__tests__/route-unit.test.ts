import { convertToGenerationRequest } from '../../../app/api/generate-cheatsheet/route'

// Mock the PDF generator for this test
jest.mock('../pdf-generator', () => ({
  pdfGenerator: {
    generatePDF: jest.fn(),
    generateHTMLOnly: jest.fn(),
    cleanup: jest.fn()
  }
}))

describe('Route Helper Functions', () => {
  describe('convertToGenerationRequest', () => {
    it('should convert API request to generation request format', () => {
      const apiRequest = {
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            customContent: 'Custom content',
            images: [
              {
                id: 'img-1',
                src: 'test.jpg',
                alt: 'Test image',
                caption: 'Test caption',
                isRecreated: true
              }
            ],
            priority: 2
          }
        ],
        config: {
          paperSize: 'letter',
          orientation: 'landscape',
          columns: 2,
          fontSize: 'large',
          pageCount: 3,
          includeHeaders: false,
          includeFooters: true,
          customStyles: '.test { color: red; }',
          referenceText: 'Reference notes'
        },
        title: 'Custom Title',
        subtitle: 'Custom Subtitle'
      }

      const result = convertToGenerationRequest(apiRequest)

      expect(result).toEqual({
        topics: [
          {
            id: 'topic-1',
            topic: 'Test Topic',
            content: 'Test content',
            customContent: 'Custom content',
            images: [
              {
                id: 'img-1',
                src: 'test.jpg',
                alt: 'Test image',
                caption: 'Test caption',
                isRecreated: true
              }
            ],
            priority: 2
          }
        ],
        config: {
          paperSize: 'letter',
          orientation: 'landscape',
          columns: 2,
          fontSize: 'large',
          pageCount: 3,
          includeHeaders: false,
          includeFooters: true,
          customStyles: '.test { color: red; }'
        },
        referenceText: 'Reference notes',
        title: 'Custom Title',
        subtitle: 'Custom Subtitle'
      })
    })

    it('should apply default values for missing properties', () => {
      const minimalRequest = {
        topics: [
          {
            topic: 'Test Topic',
            content: 'Test content'
          }
        ],
        config: {
          paperSize: 'unknown',
          orientation: 'unknown',
          columns: 0,
          fontSize: 'unknown'
        }
      }

      const result = convertToGenerationRequest(minimalRequest)

      expect(result.topics[0].id).toBe('topic-0')
      expect(result.topics[0].priority).toBe(1)
      expect(result.topics[0].images).toEqual([])
      expect(result.config.paperSize).toBe('a4')
      expect(result.config.orientation).toBe('portrait')
      expect(result.config.columns).toBe(1)
      expect(result.config.fontSize).toBe('small')
      expect(result.config.includeHeaders).toBe(true)
      expect(result.config.includeFooters).toBe(true)
      expect(result.title).toBe('Study Cheat Sheet')
    })

    it('should handle empty topics array', () => {
      const emptyRequest = {
        topics: [],
        config: {
          paperSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          fontSize: 'medium'
        }
      }

      const result = convertToGenerationRequest(emptyRequest)

      expect(result.topics).toEqual([])
    })
  })
})