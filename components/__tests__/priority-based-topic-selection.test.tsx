import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedTopicSelection } from '../enhanced-topic-selection'

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <p>{children}</p>
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`checkbox-${id}`}
    />
  )
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('high')}>High</button>
      <button onClick={() => onValueChange('medium')}>Medium</button>
      <button onClick={() => onValueChange('low')}>Low</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="search-input"
    />
  )
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h3>{children}</h3>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange }: any) => (
    <textarea value={value} onChange={onChange} data-testid="textarea" />
  )
}))

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: any) => (
    <div style={{ display: open ? 'block' : 'none' }}>{children}</div>
  ),
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div>{children}</div>
}))



describe('EnhancedTopicSelection - Priority-Based Selection', () => {
  const mockTopics = [
    {
      id: 'topic-1',
      topic: 'High Priority Topic',
      content: 'This is high priority content',
      confidence: 0.9,
      source: 'document1.pdf',
      selected: true,
      originalContent: 'This is high priority content',
      isModified: false,
      priority: 'high' as const,
      estimatedSpace: 500,
      subtopics: [
        {
          id: 'subtopic-1-1',
          title: 'High Priority Subtopic',
          content: 'Subtopic content',
          priority: 'high' as const,
          estimatedSpace: 200,
          isSelected: true,
          parentTopicId: 'topic-1',
          confidence: 0.8
        },
        {
          id: 'subtopic-1-2',
          title: 'Medium Priority Subtopic',
          content: 'Another subtopic content',
          priority: 'medium' as const,
          estimatedSpace: 150,
          isSelected: false,
          parentTopicId: 'topic-1',
          confidence: 0.7
        }
      ],
      examples: []
    },
    {
      id: 'topic-2',
      topic: 'Medium Priority Topic',
      content: 'This is medium priority content',
      confidence: 0.7,
      source: 'document2.pdf',
      selected: false,
      originalContent: 'This is medium priority content',
      isModified: false,
      priority: 'medium' as const,
      estimatedSpace: 400,
      subtopics: [],
      examples: []
    },
    {
      id: 'topic-3',
      topic: 'Low Priority Topic',
      content: 'This is low priority content',
      confidence: 0.6,
      source: 'document3.pdf',
      selected: false,
      originalContent: 'This is low priority content',
      isModified: false,
      priority: 'low' as const,
      estimatedSpace: 300,
      subtopics: [],
      examples: []
    }
  ]

  const mockConfig = {
    paperSize: 'a4' as const,
    orientation: 'portrait' as const,
    columns: 1 as const,
    fontSize: 'medium' as const,
    pageCount: 2
  }

  const mockSpaceUtilization = {
    totalAvailableSpace: 10000,
    usedSpace: 7000,
    remainingSpace: 3000,
    utilizationPercentage: 0.7,
    suggestions: [
      {
        type: 'add_topic' as const,
        targetId: 'topic-2',
        description: 'Consider adding "Medium Priority Topic" to better utilize available space',
        spaceImpact: 400
      }
    ]
  }

  const defaultProps = {
    topics: mockTopics,
    onTopicToggle: jest.fn(),
    onSubtopicToggle: jest.fn(),
    onPriorityChange: jest.fn(),
    onSubtopicPriorityChange: jest.fn(),
    onTopicContentUpdate: jest.fn(),
    onAutoFill: jest.fn(),
    onContinue: jest.fn(),
    onBack: jest.fn(),
    config: mockConfig,
    spaceUtilization: mockSpaceUtilization
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders priority-based topic selection interface', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('Priority-Based Topic Selection')).toBeInTheDocument()
    expect(screen.getByText('High Priority Topic')).toBeInTheDocument()
    expect(screen.getByText('Medium Priority Topic')).toBeInTheDocument()
    expect(screen.getByText('Low Priority Topic')).toBeInTheDocument()
  })

  it('displays space utilization dashboard', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('Space Utilization Dashboard')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '70')
  })

  it('shows priority controls for topics', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const prioritySelects = screen.getAllByTestId('select')
    expect(prioritySelects.length).toBeGreaterThan(0)
    
    // Check that high priority topic shows high priority
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('handles topic priority changes', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const highPriorityButton = screen.getAllByText('High')[0]
    await user.click(highPriorityButton)
    
    expect(defaultProps.onPriorityChange).toHaveBeenCalledWith('topic-1', 'high')
  })

  it('handles topic selection toggle', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const checkbox = screen.getByTestId('checkbox-topic-2')
    await user.click(checkbox)
    
    expect(defaultProps.onTopicToggle).toHaveBeenCalledWith('topic-2', true)
  })

  it('displays subtopics when topic is expanded', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    // Find and click the expand button for topic-1
    const expandButtons = screen.getAllByRole('button')
    const expandButton = expandButtons.find(button => 
      button.querySelector('svg') // Looking for chevron icon
    )
    
    if (expandButton) {
      await user.click(expandButton)
      expect(screen.getByText('High Priority Subtopic')).toBeInTheDocument()
      expect(screen.getByText('Medium Priority Subtopic')).toBeInTheDocument()
    }
  })

  it('handles subtopic selection', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    // First expand the topic to show subtopics
    const expandButtons = screen.getAllByRole('button')
    const expandButton = expandButtons.find(button => 
      button.querySelector('svg')
    )
    
    if (expandButton) {
      await user.click(expandButton)
      
      const subtopicCheckbox = screen.getByTestId('checkbox-subtopic-1-2')
      await user.click(subtopicCheckbox)
      
      expect(defaultProps.onSubtopicToggle).toHaveBeenCalledWith('topic-1', 'subtopic-1-2', true)
    }
  })

  it('handles subtopic priority changes', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    // First expand the topic to show subtopics
    const expandButtons = screen.getAllByRole('button')
    const expandButton = expandButtons.find(button => 
      button.querySelector('svg')
    )
    
    if (expandButton) {
      await user.click(expandButton)
      
      // Find subtopic priority controls and change priority
      const mediumButtons = screen.getAllByText('Medium')
      if (mediumButtons.length > 0) {
        await user.click(mediumButtons[0])
        expect(defaultProps.onSubtopicPriorityChange).toHaveBeenCalled()
      }
    }
  })

  it('displays space utilization suggestions', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument()
    expect(screen.getByText(/Consider adding "Medium Priority Topic"/)).toBeInTheDocument()
  })

  it('handles auto-fill functionality', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const autoFillButton = screen.getByText('Auto-Fill')
    await user.click(autoFillButton)
    
    expect(defaultProps.onAutoFill).toHaveBeenCalledWith(10000)
  })

  it('filters topics by priority', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const highPriorityFilter = screen.getByText('High Priority')
    await user.click(highPriorityFilter)
    
    // Should show only high priority topics
    expect(screen.getByText('High Priority Topic')).toBeInTheDocument()
    // Medium and low priority topics should not be visible
    expect(screen.queryByText('Medium Priority Topic')).not.toBeInTheDocument()
    expect(screen.queryByText('Low Priority Topic')).not.toBeInTheDocument()
  })

  it('shows overflow warning when space utilization is high', () => {
    const highUtilizationProps = {
      ...defaultProps,
      spaceUtilization: {
        ...mockSpaceUtilization,
        utilizationPercentage: 0.98,
        usedSpace: 9800
      }
    }
    
    render(<EnhancedTopicSelection {...highUtilizationProps} />)
    
    expect(screen.getByText('Risk of overflow')).toBeInTheDocument()
    expect(screen.getByText('Warning: Risk of content overflow')).toBeInTheDocument()
  })

  it('shows under-utilization status when space utilization is low', () => {
    const lowUtilizationProps = {
      ...defaultProps,
      spaceUtilization: {
        ...mockSpaceUtilization,
        utilizationPercentage: 0.4,
        usedSpace: 4000
      }
    }
    
    render(<EnhancedTopicSelection {...lowUtilizationProps} />)
    
    expect(screen.getByText('Under-utilized')).toBeInTheDocument()
  })

  it('displays correct selection summary', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('1 topics selected')).toBeInTheDocument()
    expect(screen.getByText('1 subtopics selected')).toBeInTheDocument()
    expect(screen.getByText('1 high priority')).toBeInTheDocument()
    expect(screen.getByText('0 medium priority')).toBeInTheDocument()
    expect(screen.getByText('0 low priority')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'High Priority')
    
    // Should show only topics matching the search
    expect(screen.getByText('High Priority Topic')).toBeInTheDocument()
  })

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    // First apply some filters
    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'test')
    
    const clearButton = screen.getByText('Clear Filters')
    await user.click(clearButton)
    
    // Search input should be cleared
    expect(searchInput).toHaveValue('')
  })

  it('disables continue button when no topics are selected', () => {
    const noSelectionProps = {
      ...defaultProps,
      topics: mockTopics.map(topic => ({ ...topic, selected: false }))
    }
    
    render(<EnhancedTopicSelection {...noSelectionProps} />)
    
    const continueButton = screen.getByText('Continue to Customization')
    expect(continueButton).toBeDisabled()
  })

  it('enables continue button when topics are selected', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue to Customization')
    expect(continueButton).not.toBeDisabled()
  })
})

describe('EnhancedTopicSelection - Space Optimization', () => {
  const mockTopics = [
    {
      id: 'topic-1',
      topic: 'Topic 1',
      content: 'Content 1',
      confidence: 0.9,
      source: 'doc1.pdf',
      selected: true,
      originalContent: 'Content 1',
      isModified: false,
      priority: 'high' as const,
      estimatedSpace: 1000,
      subtopics: [],
      examples: []
    }
  ]

  const mockConfig = {
    paperSize: 'a4' as const,
    orientation: 'portrait' as const,
    columns: 1 as const,
    fontSize: 'medium' as const,
    pageCount: 1
  }

  it('calculates space utilization correctly', () => {
    const props = {
      topics: mockTopics,
      onTopicToggle: jest.fn(),
      onSubtopicToggle: jest.fn(),
      onPriorityChange: jest.fn(),
      onSubtopicPriorityChange: jest.fn(),
      onTopicContentUpdate: jest.fn(),
      onAutoFill: jest.fn(),
      onContinue: jest.fn(),
      onBack: jest.fn(),
      config: mockConfig
    }

    render(<EnhancedTopicSelection {...props} />)
    
    // Should display space utilization information
    expect(screen.getByText('Space Utilization Dashboard')).toBeInTheDocument()
  })

  it('shows different optimization statuses based on utilization', () => {
    const highUtilizationProps = {
      topics: mockTopics,
      onTopicToggle: jest.fn(),
      onSubtopicToggle: jest.fn(),
      onPriorityChange: jest.fn(),
      onSubtopicPriorityChange: jest.fn(),
      onTopicContentUpdate: jest.fn(),
      onAutoFill: jest.fn(),
      onContinue: jest.fn(),
      onBack: jest.fn(),
      config: mockConfig,
      spaceUtilization: {
        totalAvailableSpace: 1000,
        usedSpace: 900,
        remainingSpace: 100,
        utilizationPercentage: 0.9,
        suggestions: []
      }
    }

    render(<EnhancedTopicSelection {...highUtilizationProps} />)
    
    expect(screen.getByText('Well optimized')).toBeInTheDocument()
  })
})