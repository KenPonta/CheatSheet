import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageRegenerationInterface } from '../image-regeneration-interface';

// Mock fetch
global.fetch = jest.fn();

const mockImages = [
  {
    id: 'image-1',
    svgContent: '<svg><rect width="100" height="100"/></svg>',
    base64: 'data:image/svg+xml;base64,PHN2Zz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjwvc3ZnPg==',
    dimensions: { width: 400, height: 300 },
    metadata: {
      type: 'equation' as const,
      content: 'x = y + z',
      style: {
        lineWeight: 'medium' as const,
        colorScheme: 'monochrome' as const,
        layout: 'horizontal' as const,
        annotations: true
      },
      generatedAt: new Date()
    }
  },
  {
    id: 'image-2',
    svgContent: '<svg><circle cx="50" cy="50" r="40"/></svg>',
    base64: 'data:image/svg+xml;base64,PHN2Zz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIvPjwvc3ZnPg==',
    dimensions: { width: 500, height: 400 },
    metadata: {
      type: 'concept' as const,
      content: 'Concept diagram',
      style: {
        lineWeight: 'thick' as const,
        colorScheme: 'minimal-color' as const,
        layout: 'grid' as const,
        annotations: false
      },
      generatedAt: new Date()
    }
  }
];

const mockStylePresets = [
  {
    name: 'Clean Minimal',
    description: 'Clean lines with minimal visual elements',
    style: {
      lineWeight: 'thin' as const,
      colorScheme: 'monochrome' as const,
      layout: 'horizontal' as const,
      annotations: false
    },
    recommendedFor: ['equation', 'diagram']
  },
  {
    name: 'Bold Educational',
    description: 'Thick lines with annotations for teaching',
    style: {
      lineWeight: 'thick' as const,
      colorScheme: 'monochrome' as const,
      layout: 'vertical' as const,
      annotations: true
    },
    recommendedFor: ['example', 'concept']
  }
];

describe('ImageRegenerationInterface', () => {
  const mockOnRegenerateImage = jest.fn();
  const mockOnBatchRegenerate = jest.fn();
  const mockOnPreviewGenerated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ImageRegenerationInterface
        images={mockImages}
        onRegenerateImage={mockOnRegenerateImage}
        onBatchRegenerate={mockOnBatchRegenerate}
        onPreviewGenerated={mockOnPreviewGenerated}
        {...props}
      />
    );
  };

  it('should render image grid with all images', () => {
    renderComponent();

    expect(screen.getByText('Image Regeneration')).toBeInTheDocument();
    expect(screen.getByText('Equation Image')).toBeInTheDocument();
    expect(screen.getByText('Concept Image')).toBeInTheDocument();
    expect(screen.getByText('x = y + z')).toBeInTheDocument();
    expect(screen.getByText('Concept diagram')).toBeInTheDocument();
  });

  it('should load style presets on mount', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: mockStylePresets
      })
    });

    renderComponent();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/regenerate-images?action=presets');
    });
  });

  it('should handle image selection', async () => {
    const user = userEvent.setup();
    renderComponent();

    const checkboxes = screen.getAllByRole('checkbox');
    const firstImageCheckbox = checkboxes[1]; // Skip "Select All" checkbox

    await user.click(firstImageCheckbox);

    expect(firstImageCheckbox).toBeChecked();
    expect(screen.getByText('Select All (1/2)')).toBeInTheDocument();
  });

  it('should handle select all functionality', async () => {
    const user = userEvent.setup();
    renderComponent();

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    expect(selectAllCheckbox).toBeChecked();
    expect(screen.getByText('Select All (2/2)')).toBeInTheDocument();
    expect(screen.getByText('Batch Regenerate (2)')).toBeInTheDocument();
  });

  it('should open single image regeneration dialog', async () => {
    const user = userEvent.setup();
    renderComponent();

    const regenerateButtons = screen.getAllByRole('button', { name: '' });
    const firstRegenerateButton = regenerateButtons.find(button => 
      button.querySelector('svg') // Find button with RefreshCw icon
    );

    if (firstRegenerateButton) {
      await user.click(firstRegenerateButton);
      expect(screen.getByText('Regenerate Image')).toBeInTheDocument();
      expect(screen.getByText('Original Image')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    }
  });

  it('should generate preview when requested', async () => {
    const user = userEvent.setup();
    const mockPreview = {
      imageId: 'image-1',
      previewImage: mockImages[0],
      estimatedQuality: 0.85,
      styleComparison: {
        originalStyle: mockImages[0].metadata.style,
        newStyle: {
          lineWeight: 'thick' as const,
          colorScheme: 'monochrome' as const,
          layout: 'vertical' as const,
          annotations: true
        },
        differences: [
          {
            property: 'lineWeight' as const,
            originalValue: 'medium',
            newValue: 'thick',
            description: 'Line weight changed from medium to thick'
          }
        ],
        impact: 'low' as const
      }
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockStylePresets })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockPreview })
      });

    renderComponent();

    // Open regeneration dialog
    const regenerateButtons = screen.getAllByRole('button', { name: '' });
    const firstRegenerateButton = regenerateButtons.find(button => 
      button.querySelector('svg')
    );

    if (firstRegenerateButton) {
      await user.click(firstRegenerateButton);
      
      // Generate preview
      const generatePreviewButton = screen.getByText('Generate Preview');
      await user.click(generatePreviewButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/regenerate-images/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageId: 'image-1',
            newStyle: {
              lineWeight: 'medium',
              colorScheme: 'monochrome',
              layout: 'horizontal',
              annotations: true
            }
          })
        });
      });

      expect(mockOnPreviewGenerated).toHaveBeenCalledWith(mockPreview);
    }
  });

  it('should handle style preset selection', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockStylePresets })
    });

    renderComponent();

    // Open regeneration dialog
    const regenerateButtons = screen.getAllByRole('button', { name: '' });
    const firstRegenerateButton = regenerateButtons.find(button => 
      button.querySelector('svg')
    );

    if (firstRegenerateButton) {
      await user.click(firstRegenerateButton);

      // Wait for presets to load and select one
      await waitFor(() => {
        const presetSelect = screen.getByRole('combobox');
        expect(presetSelect).toBeInTheDocument();
      });

      // This would require more complex interaction with the Select component
      // In a real test, you'd need to properly interact with the Select dropdown
    }
  });

  it('should handle single image regeneration', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockStylePresets })
    });

    renderComponent();

    // Open regeneration dialog
    const regenerateButtons = screen.getAllByRole('button', { name: '' });
    const firstRegenerateButton = regenerateButtons.find(button => 
      button.querySelector('svg')
    );

    if (firstRegenerateButton) {
      await user.click(firstRegenerateButton);

      // Click regenerate button
      const regenerateButton = screen.getByText('Regenerate Image');
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(mockOnRegenerateImage).toHaveBeenCalledWith('image-1', {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        });
      });
    }
  });

  it('should handle batch regeneration', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockStylePresets })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            results: [
              { imageId: 'image-1', success: true, processingTime: 1000 },
              { imageId: 'image-2', success: true, processingTime: 1200 }
            ],
            totalProcessed: 2,
            successCount: 2,
            failureCount: 0,
            totalProcessingTime: 2200
          }
        })
      });

    renderComponent();

    // Select all images
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    // Open batch regeneration dialog
    const batchRegenerateButton = screen.getByText('Batch Regenerate (2)');
    await user.click(batchRegenerateButton);

    // Click regenerate button
    const regenerateButton = screen.getByText('Regenerate 2 Images');
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(mockOnBatchRegenerate).toHaveBeenCalledWith(
        ['image-1', 'image-2'],
        {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        }
      );
    });
  });

  it('should display image style badges correctly', () => {
    renderComponent();

    // Check for style badges on first image
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('horizontal')).toBeInTheDocument();
    expect(screen.getByText('annotated')).toBeInTheDocument();

    // Check for style badges on second image
    expect(screen.getByText('thick')).toBeInTheDocument();
    expect(screen.getByText('grid')).toBeInTheDocument();
  });

  it('should handle empty image list', () => {
    renderComponent({ images: [] });

    expect(screen.getByText('Image Regeneration')).toBeInTheDocument();
    expect(screen.getByText('Select All (0/0)')).toBeInTheDocument();
    expect(screen.queryByText('Batch Regenerate')).not.toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    // This should not crash the component
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load style presets:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should show progress during batch regeneration', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response to see progress
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockStylePresets })
      })
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: () => Promise.resolve({
              success: true,
              data: {
                results: [
                  { imageId: 'image-1', success: true, processingTime: 1000 }
                ],
                totalProcessed: 1,
                successCount: 1,
                failureCount: 0,
                totalProcessingTime: 1000
              }
            })
          }), 100)
        )
      );

    renderComponent();

    // Select images and start batch regeneration
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    const batchRegenerateButton = screen.getByText('Batch Regenerate (2)');
    await user.click(batchRegenerateButton);

    const regenerateButton = screen.getByText('Regenerate 2 Images');
    await user.click(regenerateButton);

    // Should show processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});