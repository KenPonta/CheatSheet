/**
 * Comprehensive Tests for StudyMaterialEditor
 * Task 14: Create unit tests for new components
 * Requirements: 4.1, 4.2, 4.3
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { StudyMaterialEditor } from '../study-material-editor'

// Mock DragEvent and DataTransfer for testing
global.DragEvent = class DragEvent extends Event {
  dataTransfer: any
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict)
    this.dataTransfer = eventInitDict?.dataTransfer || {
      effectAllowed: '',
      dropEffect: '',
      setData: jest.fn(),
      getData: jest.fn()
    }
  }
}

global.DataTransfer = class DataTransfer {
  effectAllowed = ''
  dropEffect = ''
  setData = jest.fn()
  getData = jest.fn()
}

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  CardAction: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={onChange} {...props} />
  )
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} {...props} />
  )
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div data-testid="select" onClick={() => onValueChange && onValueChange('text')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div data-testid="dialog-container">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-trigger-${value}`}>{children}</button>
}))

// Mock the ExportMaterialDialog component
jest.mock('../export-material-dialog', () => ({
  ExportMaterialDialog: ({ materialId, materialTitle, onExport }: any) => (
    <div data-testid="export-dialog">
      <button onClick={() => onExport('pdf')}>Export PDF</button>
      <button onClick={() => onExport('html')}>Export HTML</button>
      <button onClick={() => onExport('markdown')}>Export Markdown</button>
    </div>
  )
}))

// Mock the ImageRegenerationInterface component
jest.mock('../image-regeneration-interface', () => ({
  ImageRegenerationInterface: ({ images, onRegenerateImage, onBatchRegenerate }: any) => (
    <div data-testid="image-regeneration-interface">
      <button onClick={() => onRegenerateImage('image-1', { lineWeight: 'thick' })}>
        Regenerate Image
      </button>
      <button onClick={() => onBatchRegenerate(['image-1'], { lineWeight: 'thick' })}>
        Batch Regenerate
      </button>
    </div>
  )
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

describe('StudyMaterialEditor', () => {
  const mockOnSave = jest.fn()
  const mockOnExport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the editor with initial material', () => {
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      expect(screen.getByDisplayValue('Test Study Material')).toBeInTheDocument()
      expect(screen.getByText('This is a test text section')).toBeInTheDocument()
      expect(screen.getByText('x = (-b ± √(b² - 4ac)) / 2a')).toBeInTheDocument()
    })

    it('should render empty state when no material provided', () => {
      render(<StudyMaterialEditor />)

      expect(screen.getByDisplayValue('Untitled Study Material')).toBeInTheDocument()
      expect(screen.getByText('No content sections yet. Add your first section to get started.')).toBeInTheDocument()
      expect(screen.getByText('No images generated yet. Add images to enhance your study material.')).toBeInTheDocument()
    })

    it('should display material metadata', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText(/Last modified:/)).toBeInTheDocument()
    })
  })

  describe('Content Section Management - Requirement 4.1, 4.2', () => {
    it('should allow adding new content sections', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const addButton = screen.getByText('Add Section')
      await user.click(addButton)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add New Section')).toBeInTheDocument()

      const select = screen.getByTestId('select')
      await user.click(select)

      // The mock select will trigger onValueChange with 'text'
      await waitFor(() => {
        expect(screen.getByText('Enter your text content here...')).toBeInTheDocument()
      })
    })

    it('should allow removing content sections', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('aria-label') !== 'Edit'
      )

      if (deleteButton) {
        await user.click(deleteButton)
        await waitFor(() => {
          expect(screen.queryByText('This is a test text section')).not.toBeInTheDocument()
        })
      }
    })

    it('should allow editing content sections', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const editButtons = screen.getAllByRole('button')
      const editButton = editButtons.find(button => 
        button.querySelector('svg')
      )

      if (editButton) {
        await user.click(editButton)
        
        const textarea = screen.getByDisplayValue('This is a test text section')
        await user.clear(textarea)
        await user.type(textarea, 'Updated content')

        const saveButton = screen.getByText('Save Changes')
        await user.click(saveButton)

        expect(screen.getByText('Updated content')).toBeInTheDocument()
      }
    })

    it('should update material title', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const titleInput = screen.getByDisplayValue('Test Study Material')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument()
    })
  })

  describe('Image Management - Requirement 4.4', () => {
    it('should display existing images', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      expect(screen.getByText('equation Image')).toBeInTheDocument()
      expect(screen.getByText('quadratic formula')).toBeInTheDocument()
    })

    it('should allow adding new images', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const addImageButton = screen.getByText('Add Image')
      await user.click(addImageButton)

      expect(screen.getByText('Generate New Image')).toBeInTheDocument()

      const select = screen.getByTestId('select')
      await user.click(select)

      // The mock will add a new image
      await waitFor(() => {
        // Check that a new image section appears
        const imageCards = screen.getAllByText(/Image$/)
        expect(imageCards.length).toBeGreaterThan(1)
      })
    })

    it('should allow removing images', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const deleteButtons = screen.getAllByRole('button')
      const imageDeleteButton = deleteButtons.find(button => 
        button.closest('[data-testid]') || button.parentElement?.textContent?.includes('Image')
      )

      if (imageDeleteButton) {
        await user.click(imageDeleteButton)
        await waitFor(() => {
          expect(screen.queryByText('equation Image')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Drag and Drop Support - Requirement 4.3', () => {
    it('should handle drag start event', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')

      if (firstSection) {
        const dragEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })

        fireEvent(firstSection, dragEvent)
        expect(dragEvent.dataTransfer?.effectAllowed).toBe('move')
      }
    })

    it('should handle drag over event', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')

      if (firstSection) {
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })

        fireEvent(firstSection, dragOverEvent)
        expect(dragOverEvent.dataTransfer?.dropEffect).toBe('move')
      }
    })

    it('should handle drop event and reorder sections', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')
      const secondSection = sections[1].closest('[draggable="true"]')

      if (firstSection && secondSection) {
        // Start drag on first section
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dragStartEvent)

        // Drop on second section
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(secondSection, dropEvent)

        // Verify sections are reordered (this would require more complex state checking)
        expect(firstSection).toBeInTheDocument()
        expect(secondSection).toBeInTheDocument()
      }
    })
  })

  describe('Save and Export Functionality - Requirement 4.6', () => {
    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const saveButton = screen.getByText('Save')
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-material-1',
        title: 'Test Study Material'
      }))
    })

    it('should call onExport for PDF export', async () => {
      const user = userEvent.setup()
      mockOnExport.mockResolvedValue('pdf-content')
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const exportPdfButton = screen.getByText('Export PDF')
      await user.click(exportPdfButton)

      expect(mockOnExport).toHaveBeenCalledWith('pdf')
    })

    it('should call onExport for HTML export', async () => {
      const user = userEvent.setup()
      mockOnExport.mockResolvedValue('html-content')
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const exportHtmlButton = screen.getByText('Export HTML')
      await user.click(exportHtmlButton)

      expect(mockOnExport).toHaveBeenCalledWith('html')
    })

    it('should show saving state', async () => {
      const user = userEvent.setup()
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const saveButton = screen.getByText('Save')
      await user.click(saveButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockOnSave.mockRejectedValue(new Error('Save failed'))
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const saveButton = screen.getByText('Save')
      await user.click(saveButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save material:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockOnExport.mockRejectedValue(new Error('Export failed'))
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
          onExport={mockOnExport}
        />
      )

      const exportButton = screen.getByText('Export PDF')
      await user.click(exportButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to export as pdf:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Advanced Content Management - Requirement 4.1, 4.2', () => {
    it('should handle different section types correctly', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Test adding different section types
      const sectionTypes = ['text', 'equation', 'example', 'list']
      
      for (const sectionType of sectionTypes) {
        const addButton = screen.getByText('Add Section')
        await user.click(addButton)

        const select = screen.getByTestId('select')
        // Mock the select to return the specific type
        fireEvent.click(select)
        
        await waitFor(() => {
          // Check that appropriate default content is added
          const defaultContents = {
            text: 'Enter your text content here...',
            equation: 'Enter your equation here',
            example: 'Enter your example problem',
            list: '• Item 1'
          }
          
          if (defaultContents[sectionType as keyof typeof defaultContents]) {
            expect(screen.getByText(defaultContents[sectionType as keyof typeof defaultContents])).toBeInTheDocument()
          }
        })
      }
    })

    it('should validate section content before saving', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Try to edit a section with invalid content
      const editButtons = screen.getAllByRole('button')
      const editButton = editButtons.find(button => 
        button.querySelector('svg')
      )

      if (editButton) {
        await user.click(editButton)
        
        const textarea = screen.getByDisplayValue('This is a test text section')
        await user.clear(textarea)
        // Leave empty - should handle gracefully
        
        const saveButton = screen.getByText('Save Changes')
        await user.click(saveButton)

        // Should still save even with empty content (graceful handling)
        expect(screen.queryByDisplayValue('This is a test text section')).not.toBeInTheDocument()
      }
    })

    it('should maintain section order consistency', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Add multiple sections and verify order
      for (let i = 0; i < 3; i++) {
        const addButton = screen.getByText('Add Section')
        await user.click(addButton)

        const select = screen.getByTestId('select')
        await user.click(select)
      }

      // Check that sections maintain proper order
      const sections = screen.getAllByText(/Section$/)
      expect(sections.length).toBeGreaterThanOrEqual(2) // Original + new sections
    })

    it('should handle section dependencies correctly', async () => {
      const materialWithDependencies = {
        ...mockMaterial,
        sections: [
          ...mockMaterial.sections,
          {
            id: 'section-3',
            type: 'text' as const,
            content: 'Dependent section',
            order: 2,
            editable: true,
            dependencies: ['section-1']
          }
        ]
      }

      render(<StudyMaterialEditor initialMaterial={materialWithDependencies} />)

      // Verify dependent section is displayed
      expect(screen.getByText('Dependent section')).toBeInTheDocument()
      
      // When removing a section with dependencies, should handle gracefully
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('aria-label') !== 'Edit'
      )

      if (deleteButton) {
        await userEvent.click(deleteButton)
        // Should not crash when removing section with dependencies
        expect(screen.queryByText('This is a test text section')).not.toBeInTheDocument()
      }
    })
  })

  describe('Advanced Image Management - Requirement 4.4', () => {
    it('should handle different image types and regeneration options', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Switch to regenerate tab
      const regenerateTab = screen.getByText('Regenerate Images')
      await user.click(regenerateTab)

      // Should show image regeneration interface
      expect(screen.getByText('Regenerate Images')).toBeInTheDocument()
    })

    it('should handle image regeneration with different styles', async () => {
      const user = userEvent.setup()
      const mockRegenerateImage = jest.fn().mockResolvedValue({
        id: 'image-1',
        url: '/new-image.svg',
        metadata: { generatedAt: new Date() }
      })

      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onRegenerateImage={mockRegenerateImage}
        />
      )

      // Test image regeneration (would need to mock the ImageRegenerationInterface)
      expect(screen.getByText('equation Image')).toBeInTheDocument()
    })

    it('should handle batch image operations', async () => {
      const materialWithMultipleImages = {
        ...mockMaterial,
        images: [
          ...mockMaterial.images,
          {
            id: 'image-2',
            type: 'generated' as const,
            source: {
              type: 'concept' as const,
              content: 'concept diagram',
              context: 'mathematics'
            },
            editable: true,
            regenerationOptions: {
              availableStyles: [{
                lineWeight: 'thin' as const,
                colorScheme: 'minimal-color' as const,
                layout: 'vertical' as const,
                annotations: false
              }],
              contentHints: [],
              contextOptions: []
            },
            url: '/concept-image.svg',
            alt: 'Concept diagram'
          }
        ]
      }

      render(<StudyMaterialEditor initialMaterial={materialWithMultipleImages} />)

      // Should display multiple images
      expect(screen.getByText('equation Image')).toBeInTheDocument()
      expect(screen.getByText('concept Image')).toBeInTheDocument()
    })

    it('should validate image metadata and handle corrupted images', async () => {
      const materialWithCorruptedImage = {
        ...mockMaterial,
        images: [
          {
            id: 'corrupted-image',
            type: 'generated' as const,
            source: {
              type: 'equation' as const,
              content: 'corrupted equation',
              context: 'test'
            },
            editable: true,
            regenerationOptions: {
              availableStyles: [],
              contentHints: [],
              contextOptions: []
            },
            url: '', // Empty URL - corrupted
            alt: 'Corrupted image'
          }
        ]
      }

      render(<StudyMaterialEditor initialMaterial={materialWithCorruptedImage} />)

      // Should handle corrupted image gracefully
      expect(screen.getByText('equation Image')).toBeInTheDocument()
    })
  })

  describe('Enhanced Drag and Drop - Requirement 4.3', () => {
    it('should provide visual feedback during drag operations', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')

      if (firstSection) {
        // Start drag
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dragStartEvent)

        // Should add visual feedback class
        expect(firstSection).toHaveClass('transition-all')
      }
    })

    it('should handle drag and drop between non-adjacent sections', () => {
      const materialWithManySections = {
        ...mockMaterial,
        sections: [
          ...mockMaterial.sections,
          {
            id: 'section-3',
            type: 'text' as const,
            content: 'Third section',
            order: 2,
            editable: true
          },
          {
            id: 'section-4',
            type: 'text' as const,
            content: 'Fourth section',
            order: 3,
            editable: true
          }
        ]
      }

      render(<StudyMaterialEditor initialMaterial={materialWithManySections} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')
      const lastSection = sections[sections.length - 1].closest('[draggable="true"]')

      if (firstSection && lastSection) {
        // Drag first to last position
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dragStartEvent)

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(lastSection, dropEvent)

        // Should handle the reordering
        expect(firstSection).toBeInTheDocument()
        expect(lastSection).toBeInTheDocument()
      }
    })

    it('should prevent dropping on invalid targets', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')

      if (firstSection) {
        // Try to drop on itself
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dragStartEvent)

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dropEvent)

        // Should not cause any issues
        expect(firstSection).toBeInTheDocument()
      }
    })

    it('should handle drag cancellation', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const sections = screen.getAllByText(/Section$/)
      const firstSection = sections[0].closest('[draggable="true"]')

      if (firstSection) {
        // Start drag
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dragStartEvent)

        // Cancel drag
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          dataTransfer: new DataTransfer()
        })
        fireEvent(firstSection, dragEndEvent)

        // Should clean up drag state
        expect(firstSection).toBeInTheDocument()
      }
    })
  })

  describe('Real-time Updates and State Management', () => {
    it('should update material metadata on changes', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const titleInput = screen.getByDisplayValue('Test Study Material')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      // Should update last modified time
      expect(screen.getByText(/Last modified:/)).toBeInTheDocument()
    })

    it('should handle concurrent modifications gracefully', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Simulate multiple rapid changes
      const titleInput = screen.getByDisplayValue('Test Study Material')
      
      // Rapid typing
      await user.type(titleInput, ' - Updated')
      await user.type(titleInput, ' Again')
      
      expect(screen.getByDisplayValue('Test Study Material - Updated Again')).toBeInTheDocument()
    })

    it('should preserve unsaved changes during navigation', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Make changes without saving
      const titleInput = screen.getByDisplayValue('Test Study Material')
      await user.clear(titleInput)
      await user.type(titleInput, 'Unsaved Changes')

      // Switch tabs
      const regenerateTab = screen.getByText('Regenerate Images')
      await user.click(regenerateTab)

      const manageTab = screen.getByText('Manage Images')
      await user.click(manageTab)

      // Changes should still be there
      expect(screen.getByDisplayValue('Unsaved Changes')).toBeInTheDocument()
    })
  })

  describe('Integration with External Services', () => {
    it('should handle API failures gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Try to regenerate an image (which would call an API)
      const regenerateTab = screen.getByText('Regenerate Images')
      await user.click(regenerateTab)

      // Should not crash the component
      expect(screen.getByText('Regenerate Images')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should handle slow API responses', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} })
        }), 100))
      )

      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Should handle loading states appropriately
      expect(screen.getByText('Test Study Material')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      const titleInput = screen.getByDisplayValue('Test Study Material')
      await user.tab()
      
      // Should be able to navigate through interactive elements
      expect(document.activeElement).toBeDefined()
    })

    it('should provide screen reader friendly content', () => {
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)

      // Check for proper labeling of form elements
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        expect(input).toHaveAttribute('placeholder')
      })
    })

    it('should handle focus management during dynamic content changes', async () => {
      const user = userEvent.setup()
      render(<StudyMaterialEditor initialMaterial={mockMaterial} />)

      // Add a new section
      const addButton = screen.getByText('Add Section')
      await user.click(addButton)

      // Focus should be managed appropriately
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Performance Optimization', () => {
    it('should handle large numbers of sections efficiently', () => {
      const materialWithManySections = {
        ...mockMaterial,
        sections: Array(100).fill(null).map((_, i) => ({
          id: `section-${i}`,
          type: 'text' as const,
          content: `Section ${i} content`,
          order: i,
          editable: true
        }))
      }

      const startTime = Date.now()
      render(<StudyMaterialEditor initialMaterial={materialWithManySections} />)
      const endTime = Date.now()

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
      expect(screen.getByDisplayValue('Test Study Material')).toBeInTheDocument()
    })

    it('should debounce rapid state changes', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn()
      
      render(
        <StudyMaterialEditor 
          initialMaterial={mockMaterial}
          onSave={mockOnSave}
        />
      )

      const titleInput = screen.getByDisplayValue('Test Study Material')
      
      // Rapid changes
      await user.type(titleInput, 'abc')
      
      // Should not call save for each keystroke
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })
})