import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMaterialDialog } from '../export-material-dialog';

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and appendChild/removeChild
const mockAnchorElement = {
  href: '',
  download: '',
  click: jest.fn(),
};

const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return mockAnchorElement as any;
  }
  return originalCreateElement.call(document, tagName);
});

const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

describe('ExportMaterialDialog', () => {
  const defaultProps = {
    materialId: 'test-material-1',
    materialTitle: 'Test Study Material',
    onExport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterAll(() => {
    document.createElement = originalCreateElement;
  });

  it('renders export button trigger', () => {
    render(<ExportMaterialDialog {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    expect(screen.getByText('Export Study Material')).toBeInTheDocument();
    expect(screen.getByText('Export "Test Study Material" in your preferred format')).toBeInTheDocument();
  });

  it('displays format selection options', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    expect(screen.getByLabelText('HTML')).toBeInTheDocument();
    expect(screen.getByLabelText('Markdown')).toBeInTheDocument();
    expect(screen.getByLabelText('PDF')).toBeInTheDocument();
  });

  it('displays general options', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    expect(screen.getByLabelText('Include generated images')).toBeInTheDocument();
    expect(screen.getByLabelText('Include document metadata')).toBeInTheDocument();
  });

  it('shows HTML-specific options when HTML format is selected', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    // HTML should be selected by default
    expect(screen.getByText('HTML Options')).toBeInTheDocument();
    expect(screen.getByLabelText('Embed SVG images directly')).toBeInTheDocument();
    expect(screen.getByLabelText('Include CSS styles')).toBeInTheDocument();
    expect(screen.getByLabelText('Responsive design')).toBeInTheDocument();
  });

  it('shows Markdown-specific options when Markdown format is selected', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByLabelText('Markdown'));
    
    expect(screen.getByText('Markdown Options')).toBeInTheDocument();
    expect(screen.getByLabelText('Image Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Math Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Include table of contents')).toBeInTheDocument();
  });

  it('shows PDF-specific options when PDF format is selected', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByLabelText('PDF'));
    
    expect(screen.getByText('PDF Options')).toBeInTheDocument();
    expect(screen.getByLabelText('Paper Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Orientation')).toBeInTheDocument();
    expect(screen.getByLabelText('Font Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Include headers')).toBeInTheDocument();
    expect(screen.getByLabelText('Include footers')).toBeInTheDocument();
  });

  it('successfully exports HTML format', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        result: {
          content: '<html><body>Test Content</body></html>',
          filename: 'Test_Study_Material.html',
          contentType: 'text/html',
          encoding: 'utf8'
        }
      })
    };
    
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('button', { name: /export html/i }));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/content-modification/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"materialId":"test-material-1"')
      });
    });

    expect(mockAnchorElement.click).toHaveBeenCalled();
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('successfully exports PDF format', async () => {
    const user = userEvent.setup();
    const mockPdfContent = 'mock-pdf-base64-content';
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        result: {
          content: mockPdfContent,
          filename: 'Test_Study_Material.pdf',
          contentType: 'application/pdf',
          encoding: 'base64'
        }
      })
    };
    
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByLabelText('PDF'));
    await user.click(screen.getByRole('button', { name: /export pdf/i }));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/content-modification/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"format":"pdf"')
      });
    });

    expect(mockAnchorElement.click).toHaveBeenCalled();
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('handles export errors gracefully', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'Material not found'
      })
    };
    
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    
    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('button', { name: /export html/i }));
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Export failed: Material not found');
    });

    alertSpy.mockRestore();
  });

  it('shows loading state during export', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    (global.fetch as jest.Mock).mockReturnValue(mockPromise);
    
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('button', { name: /export html/i }));
    
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exporting/i })).toBeDisabled();
    
    // Resolve the promise to clean up
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        result: {
          content: 'test',
          filename: 'test.html',
          contentType: 'text/html'
        }
      })
    });
  });

  it('updates export options when form controls change', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    // Toggle include images
    await user.click(screen.getByLabelText('Include generated images'));
    
    // Change to dark theme
    await user.click(screen.getByRole('combobox', { name: /theme/i }));
    await user.click(screen.getByText('Dark'));
    
    // The options should be updated (tested indirectly through export call)
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        result: {
          content: 'test',
          filename: 'test.html',
          contentType: 'text/html'
        }
      })
    };
    
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    
    await user.click(screen.getByRole('button', { name: /export html/i }));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/content-modification/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"includeImages":false')
      });
    });
  });

  it('renders with custom trigger', () => {
    const customTrigger = <button>Custom Export Button</button>;
    
    render(
      <ExportMaterialDialog 
        {...defaultProps} 
        trigger={customTrigger}
      />
    );
    
    expect(screen.getByText('Custom Export Button')).toBeInTheDocument();
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportMaterialDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export Study Material')).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    await waitFor(() => {
      expect(screen.queryByText('Export Study Material')).not.toBeInTheDocument();
    });
  });
});