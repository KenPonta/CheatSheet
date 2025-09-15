import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnhancedTopicSelection } from '../enhanced-topic-selection'

// Mock the UI components with simpler implementations
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={props['data-testid']}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>
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
    <select 
      data-testid="priority-select" 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress-bar" data-value={value}>
      {value}%
    </div>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>
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
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div>{children}</div>
}))

describe('EnhancedTopicSelection - Core Priority Features', () => {
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
      subtopics: [],
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

  it('renders the priority-based topic selection interface', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('Priority-Based Topic Selection')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toHaveTextContent('Space utilization: 70%')
  })

  it('displays space utilization dashboard', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('Space Utilization Dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', '70')
  })

  it('shows auto-fill button', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const autoFillButton = screen.getByText('Auto-Fill')
    expect(autoFillButton).toBeInTheDocument()
  })

  it('handles auto-fill button click', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const autoFillButton = screen.getByText('Auto-Fill')
    fireEvent.click(autoFillButton)
    
    expect(defaultProps.onAutoFill).toHaveBeenCalledWith(10000)
  })

  it('displays priority filter buttons', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('All Priorities')).toBeInTheDocument()
    expect(screen.getByText('High Priority')).toBeInTheDocument()
    expect(screen.getByText('Medium Priority')).toBeInTheDocument()
    expect(screen.getByText('Low Priority')).toBeInTheDocument()
  })

  it('shows space utilization suggestions', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument()
    expect(screen.getByText(/Consider adding "Medium Priority Topic"/)).toBeInTheDocument()
  })

  it('displays topic checkboxes', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByTestId('checkbox-topic-1')).toBeInTheDocument()
    expect(screen.getByTestId('checkbox-topic-2')).toBeInTheDocument()
  })

  it('handles topic selection toggle', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const checkbox = screen.getByTestId('checkbox-topic-2')
    fireEvent.click(checkbox)
    
    expect(defaultProps.onTopicToggle).toHaveBeenCalledWith('topic-2', true)
  })

  it('shows priority controls for topics', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const prioritySelects = screen.getAllByTestId('priority-select')
    expect(prioritySelects.length).toBeGreaterThan(0)
  })

  it('handles priority changes', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const prioritySelect = screen.getAllByTestId('priority-select')[0]
    fireEvent.change(prioritySelect, { target: { value: 'low' } })
    
    expect(defaultProps.onPriorityChange).toHaveBeenCalledWith('topic-1', 'low')
  })

  it('displays correct selection summary', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    expect(screen.getByText('1 topics selected')).toBeInTheDocument()
    expect(screen.getByText('1 high priority')).toBeInTheDocument()
    expect(screen.getByText('0 medium priority')).toBeInTheDocument()
    expect(screen.getByText('0 low priority')).toBeInTheDocument()
  })

  it('shows overflow warning when utilization is high', () => {
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

  it('enables continue button when topics are selected', () => {
    render(<EnhancedTopicSelection {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue to Customization')
    expect(continueButton).not.toBeDisabled()
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
})

describe('EnhancedTopicSelection - Space Optimization', () => {
  it('calculates space utilization correctly', () => {
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
})