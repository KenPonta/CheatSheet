import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HelpTooltip, FileUploadHelp } from '../help-tooltip'
import { GuidedTour, uploadTourSteps } from '../guided-tour'
import { ContextualHelp } from '../contextual-help'
import { HelpSystem } from '../help-system'

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-value={value}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-content={value}>{children}</div>
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>
}))

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div>{children}</div>
}))

describe('Help System Components', () => {
  describe('HelpTooltip', () => {
    it('renders help tooltip with title and content', () => {
      render(
        <HelpTooltip
          title="Test Help"
          content="This is test help content"
        />
      )
      
      expect(screen.getByLabelText('Help: Test Help')).toBeInTheDocument()
    })

    it('renders predefined file upload help', () => {
      render(<FileUploadHelp />)
      
      expect(screen.getByLabelText('Help: File Upload')).toBeInTheDocument()
    })
  })

  describe('GuidedTour', () => {
    const mockOnComplete = jest.fn()
    const mockOnSkip = jest.fn()

    beforeEach(() => {
      mockOnComplete.mockClear()
      mockOnSkip.mockClear()
    })

    it('renders tour when active', () => {
      render(
        <GuidedTour
          steps={uploadTourSteps}
          isActive={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      expect(screen.getByText('1 of 4')).toBeInTheDocument()
      expect(screen.getByText('Welcome to Cheat Sheet Generator')).toBeInTheDocument()
    })

    it('does not render when inactive', () => {
      render(
        <GuidedTour
          steps={uploadTourSteps}
          isActive={false}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      expect(screen.queryByText('Welcome to Cheat Sheet Generator')).not.toBeInTheDocument()
    })

    it('calls onSkip when skip button is clicked', () => {
      render(
        <GuidedTour
          steps={uploadTourSteps}
          isActive={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      fireEvent.click(screen.getByText('Skip Tour'))
      expect(mockOnSkip).toHaveBeenCalled()
    })

    it('advances to next step when next button is clicked', () => {
      render(
        <GuidedTour
          steps={uploadTourSteps}
          isActive={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      fireEvent.click(screen.getByText('Next'))
      expect(screen.getByText('2 of 4')).toBeInTheDocument()
    })

    it('calls onComplete when finishing last step', () => {
      const singleStep = [uploadTourSteps[0]]
      
      render(
        <GuidedTour
          steps={singleStep}
          isActive={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      fireEvent.click(screen.getByText('Finish'))
      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  describe('ContextualHelp', () => {
    it('renders contextual help for upload stage', () => {
      render(
        <ContextualHelp
          workflowStage="upload"
          userProgress={{ filesUploaded: 2, topicsSelected: 0, settingsConfigured: false }}
        />
      )
      
      expect(screen.getByText('File Upload Stage')).toBeInTheDocument()
      expect(screen.getByText('2 file(s) uploaded')).toBeInTheDocument()
    })

    it('renders contextual help for topics stage', () => {
      render(
        <ContextualHelp
          workflowStage="topics"
          userProgress={{ filesUploaded: 2, topicsSelected: 5, settingsConfigured: false }}
        />
      )
      
      expect(screen.getByText('Topic Selection')).toBeInTheDocument()
      expect(screen.getByText('5 topic(s) selected')).toBeInTheDocument()
    })

    it('shows appropriate content for each workflow stage', () => {
      const stages = ['upload', 'processing', 'topics', 'customization', 'generation'] as const
      
      stages.forEach(stage => {
        const { rerender } = render(
          <ContextualHelp
            workflowStage={stage}
            userProgress={{ filesUploaded: 1, topicsSelected: 3, settingsConfigured: true }}
          />
        )
        
        // Each stage should have its own title
        expect(screen.getByRole('button')).toBeInTheDocument()
        
        rerender(<div />)
      })
    })
  })

  describe('HelpSystem', () => {
    it('renders help system dialog trigger', () => {
      render(<HelpSystem workflowStage="upload" />)
      
      expect(screen.getByText('Help')).toBeInTheDocument()
    })

    it('opens help dialog when clicked', async () => {
      render(<HelpSystem workflowStage="upload" />)
      
      fireEvent.click(screen.getByText('Help'))
      
      await waitFor(() => {
        expect(screen.getByText('Help & Documentation')).toBeInTheDocument()
      })
    })

    it('shows different tabs in help dialog', async () => {
      render(<HelpSystem workflowStage="upload" />)
      
      fireEvent.click(screen.getByText('Help'))
      
      await waitFor(() => {
        expect(screen.getByText('Current Step')).toBeInTheDocument()
        expect(screen.getByText('FAQ')).toBeInTheDocument()
        expect(screen.getByText('Guides')).toBeInTheDocument()
        expect(screen.getByText('Tours')).toBeInTheDocument()
      })
    })

    it('filters FAQ items based on search', async () => {
      render(<HelpSystem workflowStage="upload" />)
      
      fireEvent.click(screen.getByText('Help'))
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search FAQ...')
        fireEvent.change(searchInput, { target: { value: 'file format' } })
        
        // Should show FAQ items related to file formats
        expect(screen.getByText('What file formats are supported?')).toBeInTheDocument()
      })
    })

    it('shows tour options in tours tab', async () => {
      render(<HelpSystem workflowStage="upload" />)
      
      fireEvent.click(screen.getByText('Help'))
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Tours'))
        
        expect(screen.getByText('File Upload Tour')).toBeInTheDocument()
        expect(screen.getByText('Topic Selection Tour')).toBeInTheDocument()
        expect(screen.getByText('Customization Tour')).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('help system adapts to workflow stage changes', () => {
      const { rerender } = render(<HelpSystem workflowStage="upload" />)
      
      fireEvent.click(screen.getByText('Help'))
      
      // Change workflow stage
      rerender(<HelpSystem workflowStage="topics" />)
      
      // Help content should adapt to new stage
      expect(screen.getByText('Help & Documentation')).toBeInTheDocument()
    })

    it('contextual help updates with user progress', () => {
      const initialProgress = { filesUploaded: 0, topicsSelected: 0, settingsConfigured: false }
      const updatedProgress = { filesUploaded: 3, topicsSelected: 5, settingsConfigured: true }
      
      const { rerender } = render(
        <ContextualHelp workflowStage="upload" userProgress={initialProgress} />
      )
      
      expect(screen.getByText('No files uploaded yet')).toBeInTheDocument()
      
      rerender(
        <ContextualHelp workflowStage="topics" userProgress={updatedProgress} />
      )
      
      expect(screen.getByText('5 topic(s) selected')).toBeInTheDocument()
    })

    it('tour system handles step navigation correctly', () => {
      const mockOnComplete = jest.fn()
      const mockOnSkip = jest.fn()
      
      render(
        <GuidedTour
          steps={uploadTourSteps}
          isActive={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      // Navigate through all steps
      for (let i = 0; i < uploadTourSteps.length - 1; i++) {
        fireEvent.click(screen.getByText('Next'))
      }
      
      // Should be on last step
      expect(screen.getByText(`${uploadTourSteps.length} of ${uploadTourSteps.length}`)).toBeInTheDocument()
      
      // Finish tour
      fireEvent.click(screen.getByText('Finish'))
      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('help tooltips have proper aria labels', () => {
      render(
        <HelpTooltip
          title="Accessible Help"
          content="This help is accessible"
        />
      )
      
      expect(screen.getByLabelText('Help: Accessible Help')).toBeInTheDocument()
    })

    it('tour navigation is keyboard accessible', () => {
      const mockOnComplete = jest.fn()
      const mockOnSkip = jest.fn()
      
      render(
        <GuidedTour
          steps={uploadTourSteps}
          isActive={true}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )
      
      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeInTheDocument()
      
      // Should be focusable
      nextButton.focus()
      expect(document.activeElement).toBe(nextButton)
    })

    it('help dialog has proper heading structure', async () => {
      render(<HelpSystem workflowStage="upload" />)
      
      fireEvent.click(screen.getByText('Help'))
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Help & Documentation' })).toBeInTheDocument()
      })
    })
  })
})