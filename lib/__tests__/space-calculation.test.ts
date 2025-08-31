import { SpaceCalculationService, calculateSpaceUtilization, autoFillTopics } from '../space-calculation'

describe('SpaceCalculationService', () => {
  let service: SpaceCalculationService

  beforeEach(() => {
    service = new SpaceCalculationService()
  })

  describe('calculateAvailableSpace', () => {
    it('calculates available space correctly for A4 medium font', () => {
      const constraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const availableSpace = service.calculateAvailableSpace(constraints)
      expect(availableSpace).toBeGreaterThan(0)
      expect(typeof availableSpace).toBe('number')
    })

    it('calculates more space for multiple pages', () => {
      const singlePage = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const multiplePages = {
        ...singlePage,
        availablePages: 2
      }

      const singlePageSpace = service.calculateAvailableSpace(singlePage)
      const multiplePagesSpace = service.calculateAvailableSpace(multiplePages)

      expect(multiplePagesSpace).toBeGreaterThan(singlePageSpace)
      expect(multiplePagesSpace).toBeCloseTo(singlePageSpace * 2, -2)
    })

    it('calculates less space for smaller font sizes', () => {
      const largeFontConstraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'large' as const,
        columns: 1
      }

      const smallFontConstraints = {
        ...largeFontConstraints,
        fontSize: 'small' as const
      }

      const largeFontSpace = service.calculateAvailableSpace(largeFontConstraints)
      const smallFontSpace = service.calculateAvailableSpace(smallFontConstraints)

      expect(smallFontSpace).toBeGreaterThan(largeFontSpace)
    })
  })

  describe('estimateContentSpace', () => {
    it('estimates space for content correctly', () => {
      const constraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const shortContent = 'Short content'
      const longContent = 'This is a much longer piece of content that should require more space to display properly'

      const shortSpace = service.estimateContentSpace(shortContent, constraints)
      const longSpace = service.estimateContentSpace(longContent, constraints)

      expect(longSpace).toBeGreaterThan(shortSpace)
      expect(shortSpace).toBeGreaterThan(0)
    })

    it('adds overhead for multi-column layouts', () => {
      const singleColumn = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const multiColumn = {
        ...singleColumn,
        columns: 2
      }

      const content = 'Test content for space estimation'
      const singleColumnSpace = service.estimateContentSpace(content, singleColumn)
      const multiColumnSpace = service.estimateContentSpace(content, multiColumn)

      expect(multiColumnSpace).toBeGreaterThan(singleColumnSpace)
    })
  })

  describe('calculateSpaceUtilization', () => {
    it('calculates space utilization correctly', () => {
      const mockTopics = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content',
          confidence: 0.9,
          source: 'test.pdf',
          selected: true,
          originalContent: 'Test content',
          isModified: false,
          priority: 'high' as const,
          estimatedSpace: 500,
          subtopics: [],
          examples: []
        }
      ]

      const constraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const utilization = service.calculateSpaceUtilization(mockTopics, constraints)

      expect(utilization.totalAvailableSpace).toBeGreaterThan(0)
      expect(utilization.usedSpace).toBe(500)
      expect(utilization.remainingSpace).toBe(utilization.totalAvailableSpace - 500)
      expect(utilization.utilizationPercentage).toBe(500 / utilization.totalAvailableSpace)
      expect(Array.isArray(utilization.suggestions)).toBe(true)
    })

    it('includes subtopic space in calculations', () => {
      const mockTopics = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content',
          confidence: 0.9,
          source: 'test.pdf',
          selected: true,
          originalContent: 'Test content',
          isModified: false,
          priority: 'high' as const,
          estimatedSpace: 500,
          subtopics: [
            {
              id: 'subtopic-1',
              title: 'Test Subtopic',
              content: 'Subtopic content',
              priority: 'high' as const,
              estimatedSpace: 200,
              isSelected: true,
              parentTopicId: 'topic-1',
              confidence: 0.8
            }
          ],
          examples: []
        }
      ]

      const constraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const utilization = service.calculateSpaceUtilization(mockTopics, constraints)

      expect(utilization.usedSpace).toBe(700) // 500 + 200
    })
  })

  describe('autoFillTopics', () => {
    it('prioritizes high priority topics first', () => {
      const mockTopics = [
        {
          id: 'topic-1',
          topic: 'High Priority Topic',
          content: 'High priority content',
          confidence: 0.9,
          source: 'test.pdf',
          selected: false,
          originalContent: 'High priority content',
          isModified: false,
          priority: 'high' as const,
          estimatedSpace: 500,
          subtopics: [],
          examples: []
        },
        {
          id: 'topic-2',
          topic: 'Low Priority Topic',
          content: 'Low priority content',
          confidence: 0.7,
          source: 'test.pdf',
          selected: false,
          originalContent: 'Low priority content',
          isModified: false,
          priority: 'low' as const,
          estimatedSpace: 300,
          subtopics: [],
          examples: []
        }
      ]

      const constraints = {
        availablePages: 1,
        targetUtilization: 0.85,
        pageSize: 'a4' as const,
        fontSize: 'medium' as const,
        columns: 1
      }

      const result = service.autoFillTopics(mockTopics, constraints)

      expect(result.recommendedTopics).toContain('topic-1')
      expect(result.utilizationScore).toBeGreaterThan(0)
      expect(result.utilizationScore).toBeLessThanOrEqual(1)
    })
  })
})

describe('Utility Functions', () => {
  describe('calculateSpaceUtilization', () => {
    it('works with simplified config', () => {
      const mockTopics = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content',
          confidence: 0.9,
          source: 'test.pdf',
          selected: true,
          originalContent: 'Test content',
          isModified: false,
          priority: 'high' as const,
          estimatedSpace: 500,
          subtopics: [],
          examples: []
        }
      ]

      const config = {
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        columns: 1 as const,
        fontSize: 'medium' as const,
        pageCount: 1
      }

      const utilization = calculateSpaceUtilization(mockTopics, config)

      expect(utilization.totalAvailableSpace).toBeGreaterThan(0)
      expect(utilization.usedSpace).toBe(500)
      expect(Array.isArray(utilization.suggestions)).toBe(true)
    })
  })

  describe('autoFillTopics', () => {
    it('works with simplified config', () => {
      const mockTopics = [
        {
          id: 'topic-1',
          topic: 'Test Topic',
          content: 'Test content',
          confidence: 0.9,
          source: 'test.pdf',
          selected: false,
          originalContent: 'Test content',
          isModified: false,
          priority: 'high' as const,
          estimatedSpace: 500,
          subtopics: [],
          examples: []
        }
      ]

      const config = {
        paperSize: 'a4' as const,
        orientation: 'portrait' as const,
        columns: 1 as const,
        fontSize: 'medium' as const,
        pageCount: 1
      }

      const result = autoFillTopics(mockTopics, config)

      expect(Array.isArray(result.recommendedTopics)).toBe(true)
      expect(Array.isArray(result.recommendedSubtopics)).toBe(true)
      expect(typeof result.utilizationScore).toBe('number')
    })
  })
})