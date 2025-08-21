import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedTopicSelection } from '../enhanced-topic-selection'

// Mock data for testing
const mockTopics = [
  {
    id: 'topic-1',
    topic: 'JavaScript Fundamentals',
    content: 'JavaScript is a programming language that enables interactive web pages and is an essential part of web applications.',
    confidence: 0.9,
    source: 'javascript-guide.pdf',
    selected: true,
    originalContent: 'JavaScript is a programming language that enables interactive web pages and is an essential part of web applications.',
    isModified: false
  },
  {
    id: 'topic-2',
    topic: 'React Components',
    content: 'React components are the building blocks of React applications. They let you split the UI into independent, reusable pieces.',
    confidence: 0.85,
    source: 'react-tutorial.docx',
    selected: false,
    originalContent: 'React components are the building blocks of React applications. They let you split the UI into independent, reusable pieces.',
    isModified: false
  },
  {
    id: 'topic-3',
    topic: 'CSS Flexbox',
    content: 'Flexbox is a one-dimensional layout method for laying out items in rows or columns.',
    confidence: 0.7,
    source: 'css-guide.pdf',
    selected: true,
    customContent: 'Flexbox is a powerful CSS layout method for creating flexible and responsive layouts in one dimension.',
    originalContent: 'Flexbox is a one-dimensional layout method for laying out items in rows or columns.',
    isModified: true
  },
  {
    id: 'topic-4',
    topic: 'Node.js Basics',
    content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
    confidence: 0.5,
    source: 'nodejs-intro.txt',
    selected: false,
    originalContent: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
    isModified: false
  }
]

const mockConfig = {
  paperSize: 'a4',
  orientation: 'portrait',
  columns: 2,
  fontSize: 'small'
}

const defaultProps = {
  topics: mockTopics,
  onTopicToggle: jest.fn(),
  onTopicContentUpdate: jest.fn(),
  onContinue: jest.fn(),
  onBack: jest.fn(),
  config: mockConfig
}

describe('EnhancedTopicSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering and Basic Functionality', () => {
    it('renders the component with correct title and description', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('Enhanced Topic Selection')).toBeInTheDocument()
      expect(screen.getByText(/2 of 4 topics selected/)).toBeInTheDocument()
    })

    it('displays page count estimation', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText(/Estimated:/)).toBeInTheDocument()
      expect(screen.getByText('Page Estimation')).toBeInTheDocument()
    })

    it('shows all topics by default', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
      expect(screen.getByText('React Components')).toBeInTheDocument()
      expect(screen.getByText('CSS Flexbox')).toBeInTheDocument()
      expect(screen.getByText('Node.js Basics')).toBeInTheDocument()
    })

    it('displays confidence badges correctly', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('90%')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('shows modified badge for modified topics', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('filters topics based on search query', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search by topic name or content...')
      await user.type(searchInput, 'JavaScript')
      
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
      expect(screen.queryByText('React Components')).not.toBeInTheDocument()
      expect(screen.queryByText('CSS Flexbox')).not.toBeInTheDocument()
    })

    it('searches in both topic names and content', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search by topic name or content...')
      await user.type(searchInput, 'building blocks')
      
      expect(screen.getByText('React Components')).toBeInTheDocument()
      expect(screen.queryByText('JavaScript Fundamentals')).not.toBeInTheDocument()
    })

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search by topic name or content...')
      await user.type(searchInput, 'nonexistent')
      
      expect(screen.getByText('No topics match your current filters.')).toBeInTheDocument()
    })
  })

  describe('Confidence Level Filtering', () => {
    it('filters topics by high confidence', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const highConfidenceButton = screen.getByText('High (80%+)')
      await user.click(highConfidenceButton)
      
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
      expect(screen.getByText('React Components')).toBeInTheDocument()
      expect(screen.queryByText('CSS Flexbox')).not.toBeInTheDocument()
      expect(screen.queryByText('Node.js Basics')).not.toBeInTheDocument()
    })

    it('filters topics by medium confidence', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const mediumConfidenceButton = screen.getByText('Medium (60-79%)')
      await user.click(mediumConfidenceButton)
      
      expect(screen.getByText('CSS Flexbox')).toBeInTheDocument()
      expect(screen.queryByText('JavaScript Fundamentals')).not.toBeInTheDocument()
      expect(screen.queryByText('React Components')).not.toBeInTheDocument()
      expect(screen.queryByText('Node.js Basics')).not.toBeInTheDocument()
    })

    it('filters topics by low confidence', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const lowConfidenceButton = screen.getByText('Low (<60%)')
      await user.click(lowConfidenceButton)
      
      expect(screen.getByText('Node.js Basics')).toBeInTheDocument()
      expect(screen.queryByText('JavaScript Fundamentals')).not.toBeInTheDocument()
      expect(screen.queryByText('React Components')).not.toBeInTheDocument()
      expect(screen.queryByText('CSS Flexbox')).not.toBeInTheDocument()
    })
  })

  describe('Source File Filtering', () => {
    it('filters topics by source file', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const sourceButton = screen.getByText('javascript-guide.pdf')
      await user.click(sourceButton)
      
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
      expect(screen.queryByText('React Components')).not.toBeInTheDocument()
      expect(screen.queryByText('CSS Flexbox')).not.toBeInTheDocument()
      expect(screen.queryByText('Node.js Basics')).not.toBeInTheDocument()
    })

    it('shows all sources button', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('All Sources')).toBeInTheDocument()
    })
  })

  describe('Modified Topics Filter', () => {
    it('shows only modified topics when filter is enabled', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const modifiedCheckbox = screen.getByLabelText(/Show only modified topics/)
      await user.click(modifiedCheckbox)
      
      expect(screen.getByText('CSS Flexbox')).toBeInTheDocument()
      expect(screen.queryByText('JavaScript Fundamentals')).not.toBeInTheDocument()
      expect(screen.queryByText('React Components')).not.toBeInTheDocument()
      expect(screen.queryByText('Node.js Basics')).not.toBeInTheDocument()
    })

    it('displays correct count of modified topics', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText(/Show only modified topics \(1\)/)).toBeInTheDocument()
    })
  })

  describe('Clear Filters Functionality', () => {
    it('shows clear filters button when filters are applied', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search by topic name or content...')
      await user.type(searchInput, 'test')
      
      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search by topic name or content...')
      await user.type(searchInput, 'JavaScript')
      
      const highConfidenceButton = screen.getByText('High (80%+)')
      await user.click(highConfidenceButton)
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters')
      await user.click(clearButton)
      
      // Check that all topics are visible again
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
      expect(screen.getByText('React Components')).toBeInTheDocument()
      expect(screen.getByText('CSS Flexbox')).toBeInTheDocument()
      expect(screen.getByText('Node.js Basics')).toBeInTheDocument()
    })
  })

  describe('Topic Selection', () => {
    it('calls onTopicToggle when checkbox is clicked', async () => {
      const user = userEvent.setup()
      const mockToggle = jest.fn()
      render(<EnhancedTopicSelection {...defaultProps} onTopicToggle={mockToggle} />)
      
      const checkbox = screen.getAllByRole('checkbox')[1] // First checkbox is for modified filter
      await user.click(checkbox)
      
      expect(mockToggle).toHaveBeenCalledWith('topic-1', false)
    })

    it('displays correct selection count in summary', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText(/2 topics selected/)).toBeInTheDocument()
    })
  })

  describe('Content Editing', () => {
    it('shows edit button for selected topics', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })

    it('opens edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)
      
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Edit the content for this topic...')).toBeInTheDocument()
    })

    it('shows content preservation warning when editing', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)
      
      expect(screen.getByText('Content Preservation Warning')).toBeInTheDocument()
    })

    it('calls onTopicContentUpdate when content is changed', async () => {
      const user = userEvent.setup()
      const mockUpdate = jest.fn()
      render(<EnhancedTopicSelection {...defaultProps} onTopicContentUpdate={mockUpdate} />)
      
      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)
      
      const textarea = screen.getByPlaceholderText('Edit the content for this topic...')
      
      // Type additional content
      await user.type(textarea, ' Additional text')
      
      // Check that the function was called
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockUpdate.mock.calls.length).toBeGreaterThan(0)
    })

    it('shows reset button for modified topics', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })
  })

  describe('Preview Functionality', () => {
    it('shows preview button for selected topics', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const previewButtons = screen.getAllByText('Preview')
      expect(previewButtons.length).toBeGreaterThan(0)
    })

    it('opens preview dialog when preview button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      const previewButton = screen.getAllByText('Preview')[0]
      await user.click(previewButton)
      
      await waitFor(() => {
        expect(screen.getByText('Preview of topic content with current customizations')).toBeInTheDocument()
      })
    })
  })

  describe('Page Estimation', () => {
    it('displays page estimation section', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText('Page Estimation')).toBeInTheDocument()
      expect(screen.getByText(/Estimated pages:/)).toBeInTheDocument()
    })

    it('shows configuration details in estimation', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByText(/A4 portrait, 2 columns, small font/)).toBeInTheDocument()
    })

    it('updates estimation when different config is provided', () => {
      const largeConfig = { ...mockConfig, fontSize: 'large', columns: 1 }
      render(<EnhancedTopicSelection {...defaultProps} config={largeConfig} />)
      
      expect(screen.getByText(/A4 portrait, 1 column, large font/)).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup()
      const mockBack = jest.fn()
      render(<EnhancedTopicSelection {...defaultProps} onBack={mockBack} />)
      
      const backButton = screen.getByText('Back to Upload')
      await user.click(backButton)
      
      expect(mockBack).toHaveBeenCalled()
    })

    it('calls onContinue when continue button is clicked', async () => {
      const user = userEvent.setup()
      const mockContinue = jest.fn()
      render(<EnhancedTopicSelection {...defaultProps} onContinue={mockContinue} />)
      
      const continueButton = screen.getByText('Continue to Customization')
      await user.click(continueButton)
      
      expect(mockContinue).toHaveBeenCalled()
    })

    it('disables continue button when no topics are selected', () => {
      const noSelectedTopics = mockTopics.map(topic => ({ ...topic, selected: false }))
      render(<EnhancedTopicSelection {...defaultProps} topics={noSelectedTopics} />)
      
      const continueButton = screen.getByText('Continue to Customization')
      expect(continueButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for form controls', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      expect(screen.getByLabelText('Search Topics')).toBeInTheDocument()
      expect(screen.getByLabelText(/Show only modified topics/)).toBeInTheDocument()
    })

    it('has proper checkbox labels', () => {
      render(<EnhancedTopicSelection {...defaultProps} />)
      
      // Check that topic titles are present as clickable labels
      mockTopics.forEach(topic => {
        expect(screen.getByText(topic.topic)).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty topics array', () => {
      render(<EnhancedTopicSelection {...defaultProps} topics={[]} />)
      
      expect(screen.getByText(/0 of 0 topics selected/)).toBeInTheDocument()
    })

    it('handles topics with very long content', () => {
      const longContentTopic = {
        ...mockTopics[0],
        content: 'A'.repeat(500)
      }
      render(<EnhancedTopicSelection {...defaultProps} topics={[longContentTopic]} />)
      
      // Should truncate long content in preview
      const contentText = screen.getByText(/A{200}\.\.\./)
      expect(contentText).toBeInTheDocument()
    })

    it('handles topics with special characters in search', async () => {
      const user = userEvent.setup()
      const specialTopic = {
        ...mockTopics[0],
        topic: 'C++ Programming & Memory Management'
      }
      render(<EnhancedTopicSelection {...defaultProps} topics={[specialTopic]} />)
      
      const searchInput = screen.getByPlaceholderText('Search by topic name or content...')
      await user.type(searchInput, 'C++')
      
      expect(screen.getByText('C++ Programming & Memory Management')).toBeInTheDocument()
    })
  })
})