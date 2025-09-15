import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CompactStudyGenerator } from '../compact-study-generator'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('CompactStudyGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the compact study generator interface', () => {
    render(<CompactStudyGenerator />)
    
    expect(screen.getByText('Compact Study Generator')).toBeInTheDocument()
    expect(screen.getByText('Transform academic PDFs into dense, print-ready study guides')).toBeInTheDocument()
    expect(screen.getByText('Upload Academic Materials')).toBeInTheDocument()
  })

  it('shows file upload area initially', () => {
    render(<CompactStudyGenerator />)
    
    expect(screen.getByText('Drop your academic files here')).toBeInTheDocument()
    expect(screen.getByText('Supports PDF, Word documents, and text files')).toBeInTheDocument()
    expect(screen.getByText('Choose Files')).toBeInTheDocument()
  })

  it('displays feature highlights', () => {
    render(<CompactStudyGenerator />)
    
    expect(screen.getByText('Dense Layout')).toBeInTheDocument()
    expect(screen.getByText('Two-column academic formatting with minimal spacing')).toBeInTheDocument()
    expect(screen.getByText('Formula Preservation')).toBeInTheDocument()
    expect(screen.getByText('All mathematical content preserved with LaTeX rendering')).toBeInTheDocument()
    expect(screen.getByText('Multiple Formats')).toBeInTheDocument()
    expect(screen.getByText('Generate HTML, PDF, or Markdown outputs')).toBeInTheDocument()
  })

  it('shows configuration panel after files are uploaded', async () => {
    render(<CompactStudyGenerator />)
    
    // Create a mock file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Get the file input and simulate file selection
    const fileInput = screen.getByLabelText('Choose Files')
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    // Click configure layout button
    await waitFor(() => {
      const configureButton = screen.getByText('Configure Layout')
      fireEvent.click(configureButton)
    })
    
    expect(screen.getByText('Configure Compact Layout')).toBeInTheDocument()
    expect(screen.getByText('Layout Style')).toBeInTheDocument()
    expect(screen.getByText('Columns')).toBeInTheDocument()
  })

  it('handles file upload errors gracefully', () => {
    render(<CompactStudyGenerator />)
    
    // Create an invalid file
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' })
    
    // Simulate drag and drop with invalid file
    const dropArea = screen.getByText('Drop your academic files here').closest('div')
    
    fireEvent.dragOver(dropArea!)
    fireEvent.drop(dropArea!, {
      dataTransfer: {
        files: [invalidFile]
      }
    })
    
    expect(screen.getByText(/Unsupported file format/)).toBeInTheDocument()
  })

  it('shows progress indicator during generation', async () => {
    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        html: '<html><body>Test content</body></html>',
        metadata: {
          generatedAt: new Date().toISOString(),
          format: 'html',
          sourceFiles: ['test.pdf'],
          stats: {
            totalSections: 5,
            totalFormulas: 10,
            totalExamples: 3,
            estimatedPrintPages: 2
          },
          preservationScore: 0.95
        },
        processingTime: 2000
      })
    })

    render(<CompactStudyGenerator />)
    
    // Upload a file and configure
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const fileInput = screen.getByLabelText('Choose Files')
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      const configureButton = screen.getByText('Configure Layout')
      fireEvent.click(configureButton)
    })
    
    // Start generation
    const generateButton = screen.getByText('Generate Compact Study Guide')
    fireEvent.click(generateButton)
    
    // Should show progress
    expect(screen.getByText('Processing files...')).toBeInTheDocument()
  })

  it('displays results after successful generation', async () => {
    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        html: '<html><body>Test content</body></html>',
        metadata: {
          generatedAt: new Date().toISOString(),
          format: 'html',
          sourceFiles: ['test.pdf'],
          stats: {
            totalSections: 5,
            totalFormulas: 10,
            totalExamples: 3,
            estimatedPrintPages: 2
          },
          preservationScore: 0.95
        },
        processingTime: 2000
      })
    })

    render(<CompactStudyGenerator />)
    
    // Upload file, configure, and generate
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const fileInput = screen.getByLabelText('Choose Files')
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      const configureButton = screen.getByText('Configure Layout')
      fireEvent.click(configureButton)
    })
    
    const generateButton = screen.getByText('Generate Compact Study Guide')
    fireEvent.click(generateButton)
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Compact Study Guide Generated!')).toBeInTheDocument()
    })
    
    expect(screen.getByText(/5 sections organized/)).toBeInTheDocument()
    expect(screen.getByText(/10 formulas preserved/)).toBeInTheDocument()
    expect(screen.getByText(/3 worked examples included/)).toBeInTheDocument()
  })
})