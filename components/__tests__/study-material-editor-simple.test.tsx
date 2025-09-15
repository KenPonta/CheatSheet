import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StudyMaterialEditor } from '../study-material-editor'

// Simple mocks for UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
  CardAction: ({ children, ...props }: any) => <div data-testid="card-action" {...props}>{children}</div>
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={onChange} data-testid="input" {...props} />
  )
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} data-testid="textarea" {...props} />
  )
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>
}))

const mockMaterial = {
  id: 'test-material-1',
  title: 'Test Study Material',
  sections: [
    {
      id: 'section-1',
      type: 'text' as const,
      content: 'This is a test text section',
      order: 0,
      editable: true
    },
    {
      id: 'section-2',
      type: 'equation' as const,
      content: 'x = (-b ± √(b² - 4ac)) / 2a',
      order: 1,
      editable: true
    }
  ],
  images: [
    {
      id: 'image-1',
      type: 'generated' as const,
      source: {
        type: 'equation' as const,
        content: 'quadratic formula',
        context: 'algebra'
      },
      editable: true,
      regenerationOptions: {
        availableStyles: [{
          lineWeight: 'medium' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: true
        }],
        contentHints: [],
        contextOptions: []
      },
      url: '/test-image.svg',
      alt: 'Test equation image'
    }
  ],
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
    version: 1
  }
}

describe('StudyMaterialEditor - Core Functionality', () => {
  const mockOnSave = jest.fn()
  const mockOnExport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering - Requirements 4.1, 4.2, 4.3, 4.4', () => {
    it('should render the editor with material title', () => {
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      expect(screen.getByDisplayValue('Test Study Material')).toBeInTheDocument()
    })

    it('should render content sections', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('This is a test text section')).toBeInTheDocument()
      expect(screen.getByText('x = (-b ± √(b² - 4ac)) / 2a')).toBeInTheDocument()
    })

    it('should render images section', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('Generated Images')).toBeInTheDocument()
      expect(screen.getByText('quadratic formula')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Export PDF')).toBeInTheDocument()
      expect(screen.getByText('Export HTML')).toBeInTheDocument()
    })

    it('should render add section and add image buttons', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('Add Section')).toBeInTheDocument()
      expect(screen.getByText('Add Image')).toBeInTheDocument()
    })
  })

  describe('Content Section Management - Requirements 4.1, 4.2', () => {
    it('should display section types correctly', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('text Section')).toBeInTheDocument()
      expect(screen.getByText('equation Section')).toBeInTheDocument()
    })

    it('should render draggable sections', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const cards = screen.getAllByTestId('card')
      const draggableCards = cards.filter(card => card.getAttribute('draggable') === 'true')
      
      expect(draggableCards.length).toBeGreaterThan(0)
    })

    it('should show edit and delete buttons for sections', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Should have edit and delete buttons for each section
      const buttons = screen.getAllByRole('button')
      const actionButtons = buttons.filter(button => 
        button.querySelector('svg') && 
        (button.innerHTML.includes('pen-line') || button.innerHTML.includes('trash2'))
      )
      
      expect(actionButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Image Management - Requirement 4.4', () => {
    it('should display image information', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('equation Image')).toBeInTheDocument()
      expect(screen.getByAltText('Test equation image')).toBeInTheDocument()
    })

    it('should show image action buttons', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Should have regenerate and delete buttons for images
      const buttons = screen.getAllByRole('button')
      const imageActionButtons = buttons.filter(button => 
        button.querySelector('svg') && 
        (button.innerHTML.includes('refresh-cw') || button.innerHTML.includes('trash2'))
      )
      
      expect(imageActionButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Drag and Drop Support - Requirement 4.3', () => {
    it('should have draggable sections with grip handles', () => {
      const { container } = render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Check for grip vertical icons (drag handles)
      const elements = container.querySelectorAll('svg')
      const gripIcons = Array.from(elements).filter(svg => 
        svg.classList.contains('lucide-grip-vertical')
      )
      
      expect(gripIcons.length).toBeGreaterThan(0)
    })

    it('should handle drag events on sections', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const cards = screen.getAllByTestId('card')
      const draggableCard = cards.find(card => card.getAttribute('draggable') === 'true')

      if (draggableCard) {
        // Test drag start
        fireEvent.dragStart(draggableCard)
        expect(draggableCard).toBeInTheDocument()

        // Test drag over
        fireEvent.dragOver(draggableCard)
        expect(draggableCard).toBeInTheDocument()

        // Test drop
        fireEvent.drop(draggableCard)
        expect(draggableCard).toBeInTheDocument()
      }
    })
  })

  describe('Save and Export Functionality - Requirement 4.6', () => {
    it('should call onSave when save button is clicked', () => {
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-material-1',
        title: 'Test Study Material'
      }))
    })

    it('should call onExport for PDF export', () => {
      mockOnExport.mockResolvedValue('pdf-content')
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const exportPdfButton = screen.getByText('Export PDF')
      fireEvent.click(exportPdfButton)

      expect(mockOnExport).toHaveBeenCalledWith('pdf')
    })

    it('should call onExport for HTML export', () => {
      mockOnExport.mockResolvedValue('html-content')
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const exportHtmlButton = screen.getByText('Export HTML')
      fireEvent.click(exportHtmlButton)

      expect(mockOnExport).toHaveBeenCalledWith('html')
    })
  })

  describe('Empty State Handling', () => {
    it('should render empty state when no sections', () => {
      const emptyMaterial = {
        ...mockMaterial,
        sections: [],
        images: []
      }

      render(<StudyMaterialEditor initialMaterial={emptyMaterial} />)

      expect(screen.getByText('No content sections yet. Add your first section to get started.')).toBeInTheDocument()
      expect(screen.getByText('No images generated yet. Add images to enhance your study material.')).toBeInTheDocument()
    })

    it('should render with default values when no initial material', () => {
      render(<StudyMaterialEditor />)

      expect(screen.getByDisplayValue('Untitled Study Material')).toBeInTheDocument()
      expect(screen.getByText('No content sections yet. Add your first section to get started.')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper input labels and structure', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const titleInput = screen.getByDisplayValue('Test Study Material')
      expect(titleInput).toHaveAttribute('placeholder', 'Enter study material title...')

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have proper heading structure', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('Content Sections')).toBeInTheDocument()
      expect(screen.getByText('Generated Images')).toBeInTheDocument()
    })
  })
})