import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ImageApprovalWorkflow } from '../image-approval-workflow';
import type { UserApprovalWorkflow } from '@/lib/ai/types';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  ThumbsUp: () => <div data-testid="thumbs-up-icon" />,
  ThumbsDown: () => <div data-testid="thumbs-down-icon" />
}));

describe('ImageApprovalWorkflow', () => {
  const mockWorkflow: UserApprovalWorkflow = {
    imageId: 'test-image-1',
    originalImage: {
      id: 'test-image-1',
      base64: 'data:image/png;base64,original',
      context: 'Mathematical formula showing quadratic equation',
      isExample: true,
      ocrText: 'x = (-b ± √(b²-4ac)) / 2a'
    },
    recreatedImage: {
      id: 'gen-1',
      url: 'https://example.com/generated.png',
      base64: 'data:image/png;base64,generated',
      prompt: 'Clean mathematical formula diagram',
      style: 'formula',
      generationTime: 2000,
      metadata: {
        model: 'dall-e-3',
        size: '512x512',
        quality: 'standard'
      }
    },
    qualityAssessment: {
      originalScore: 0.6,
      recreatedScore: 0.85,
      recommendation: 'use_recreated',
      factors: {
        clarity: 0.8,
        relevance: 0.9,
        accuracy: 0.85,
        readability: 0.8
      },
      issues: [
        {
          type: 'clarity',
          severity: 'low',
          description: 'Original image has slight blur',
          suggestion: 'Recreated version has better contrast'
        }
      ]
    },
    timestamp: new Date('2024-01-01T00:00:00Z')
  };

  const mockOnApproval = jest.fn();
  const mockOnBatchApproval = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render empty state when no workflows provided', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[]} 
          onApproval={mockOnApproval} 
        />
      );

      expect(screen.getByText('No images require approval')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should render workflow list with correct count', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      expect(screen.getByText('Image Recreation Approval (1 items)')).toBeInTheDocument();
      expect(screen.getByText('Image: test-image-1')).toBeInTheDocument();
      expect(screen.getByText('Context: Mathematical formula showing quadratic equation')).toBeInTheDocument();
    });

    it('should render quality assessment when details are shown', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      // Click details button to show assessment
      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText('Quality Assessment')).toBeInTheDocument();
      expect(screen.getByText('USE_RECREATED')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument(); // Original score
      expect(screen.getByText('85%')).toBeInTheDocument(); // Recreated score
    });

    it('should render both original and recreated images when available', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText('Original Image')).toBeInTheDocument();
      expect(screen.getByText('Recreated Image')).toBeInTheDocument();
      expect(screen.getByAltText('Original')).toBeInTheDocument();
      expect(screen.getByAltText('Recreated')).toBeInTheDocument();
    });

    it('should show OCR text when available', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText(/OCR: x = \(-b ± √\(b²-4ac\)\) \/ 2a/)).toBeInTheDocument();
    });

    it('should show generation prompt for recreated image', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText(/Prompt: Clean mathematical formula diagram/)).toBeInTheDocument();
    });
  });

  describe('Quality Assessment Display', () => {
    it('should display quality factors with correct percentages', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText('80%')).toBeInTheDocument(); // Clarity
      expect(screen.getByText('90%')).toBeInTheDocument(); // Relevance
      expect(screen.getByText('85%')).toBeInTheDocument(); // Accuracy (and recreated score)
    });

    it('should display quality issues with correct severity', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText('Issues:')).toBeInTheDocument();
      expect(screen.getByText(/clarity/i)).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('Original image has slight blur')).toBeInTheDocument();
      expect(screen.getByText('Suggestion: Recreated version has better contrast')).toBeInTheDocument();
    });

    it('should apply correct color classes for different scores', () => {
      const lowScoreWorkflow = {
        ...mockWorkflow,
        qualityAssessment: {
          ...mockWorkflow.qualityAssessment,
          originalScore: 0.4,
          recreatedScore: 0.5
        }
      };

      render(
        <ImageApprovalWorkflow 
          workflows={[lowScoreWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      // Low scores should have red color class
      const scoreElements = screen.getAllByText(/[45]0%/);
      scoreElements.forEach(element => {
        expect(element).toHaveClass('text-red-600');
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onApproval when Use Original is clicked', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Use Original'));

      expect(mockOnApproval).toHaveBeenCalledWith('test-image-1', 'original', '');
    });

    it('should call onApproval when Use Recreated is clicked', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Use Recreated'));

      expect(mockOnApproval).toHaveBeenCalledWith('test-image-1', 'recreated', '');
    });

    it('should call onApproval when Regenerate is clicked', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Regenerate'));

      expect(mockOnApproval).toHaveBeenCalledWith('test-image-1', 'regenerate', '');
    });

    it('should call onApproval when Skip is clicked', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Skip'));

      expect(mockOnApproval).toHaveBeenCalledWith('test-image-1', 'skip', '');
    });

    it('should include feedback when provided', async () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      const textarea = screen.getByPlaceholderText('Optional feedback about this image...');
      fireEvent.change(textarea, { target: { value: 'This image needs better contrast' } });

      fireEvent.click(screen.getByText('Use Original'));

      expect(mockOnApproval).toHaveBeenCalledWith('test-image-1', 'original', 'This image needs better contrast');
    });

    it('should toggle details view when Details button is clicked', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval} 
        />
      );

      // Initially details should be hidden
      expect(screen.queryByText('Quality Assessment')).not.toBeInTheDocument();

      // Click to show details
      fireEvent.click(screen.getByText('Details'));
      expect(screen.getByText('Quality Assessment')).toBeInTheDocument();

      // Click to hide details
      fireEvent.click(screen.getByText('Hide'));
      expect(screen.queryByText('Quality Assessment')).not.toBeInTheDocument();
    });
  });

  describe('Batch Operations', () => {
    it('should show batch approval button when onBatchApproval is provided and selections exist', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval}
          onBatchApproval={mockOnBatchApproval}
        />
      );

      // Initially no batch button
      expect(screen.queryByText(/Apply Batch Selections/)).not.toBeInTheDocument();

      // Select batch option
      const batchSelect = screen.getByDisplayValue('');
      fireEvent.change(batchSelect, { target: { value: 'original' } });

      // Now batch button should appear
      expect(screen.getByText(/Apply Batch Selections \(1\)/)).toBeInTheDocument();
    });

    it('should call onBatchApproval with correct selections', () => {
      const multipleWorkflows = [
        mockWorkflow,
        { ...mockWorkflow, imageId: 'test-image-2' }
      ];

      render(
        <ImageApprovalWorkflow 
          workflows={multipleWorkflows} 
          onApproval={mockOnApproval}
          onBatchApproval={mockOnBatchApproval}
        />
      );

      // Select batch options for both images
      const selects = screen.getAllByDisplayValue('');
      fireEvent.change(selects[0], { target: { value: 'original' } });
      fireEvent.change(selects[1], { target: { value: 'recreated' } });

      // Add feedback for first image
      const textareas = screen.getAllByPlaceholderText('Optional feedback about this image...');
      fireEvent.change(textareas[0], { target: { value: 'Use original for clarity' } });

      fireEvent.click(screen.getByText(/Apply Batch Selections \(2\)/));

      expect(mockOnBatchApproval).toHaveBeenCalledWith([
        { imageId: 'test-image-1', choice: 'original', feedback: 'Use original for clarity' },
        { imageId: 'test-image-2', choice: 'recreated', feedback: '' }
      ]);
    });

    it('should clear selections after batch approval', () => {
      render(
        <ImageApprovalWorkflow 
          workflows={[mockWorkflow]} 
          onApproval={mockOnApproval}
          onBatchApproval={mockOnBatchApproval}
        />
      );

      const batchSelect = screen.getByDisplayValue('');
      fireEvent.change(batchSelect, { target: { value: 'original' } });

      fireEvent.click(screen.getByText(/Apply Batch Selections \(1\)/));

      // Button should disappear after batch approval
      expect(screen.queryByText(/Apply Batch Selections/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow without recreated image', () => {
      const workflowWithoutRecreated = {
        ...mockWorkflow,
        recreatedImage: undefined
      };

      render(
        <ImageApprovalWorkflow 
          workflows={[workflowWithoutRecreated]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText('Original Image')).toBeInTheDocument();
      expect(screen.queryByText('Recreated Image')).not.toBeInTheDocument();
      expect(screen.queryByText('Use Recreated')).not.toBeInTheDocument();
    });

    it('should handle workflow without OCR text', () => {
      const workflowWithoutOCR = {
        ...mockWorkflow,
        originalImage: {
          ...mockWorkflow.originalImage,
          ocrText: undefined
        }
      };

      render(
        <ImageApprovalWorkflow 
          workflows={[workflowWithoutOCR]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.queryByText(/OCR:/)).not.toBeInTheDocument();
    });

    it('should handle workflow without base64 images', () => {
      const workflowWithoutBase64 = {
        ...mockWorkflow,
        originalImage: {
          ...mockWorkflow.originalImage,
          base64: ''
        },
        recreatedImage: {
          ...mockWorkflow.recreatedImage!,
          base64: ''
        }
      };

      render(
        <ImageApprovalWorkflow 
          workflows={[workflowWithoutBase64]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.getByText('No preview available')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle workflow with no quality issues', () => {
      const workflowWithoutIssues = {
        ...mockWorkflow,
        qualityAssessment: {
          ...mockWorkflow.qualityAssessment,
          issues: []
        }
      };

      render(
        <ImageApprovalWorkflow 
          workflows={[workflowWithoutIssues]} 
          onApproval={mockOnApproval} 
        />
      );

      fireEvent.click(screen.getByText('Details'));

      expect(screen.queryByText('Issues:')).not.toBeInTheDocument();
    });

    it('should handle different recommendation types', () => {
      const recommendations = ['use_original', 'use_recreated', 'needs_review'] as const;
      
      recommendations.forEach(recommendation => {
        const workflowWithRecommendation = {
          ...mockWorkflow,
          imageId: `test-${recommendation}`,
          qualityAssessment: {
            ...mockWorkflow.qualityAssessment,
            recommendation
          }
        };

        const { unmount } = render(
          <ImageApprovalWorkflow 
            workflows={[workflowWithRecommendation]} 
            onApproval={mockOnApproval} 
          />
        );

        fireEvent.click(screen.getByText('Details'));

        const expectedText = recommendation.replace('_', ' ').toUpperCase();
        expect(screen.getByText(expectedText)).toBeInTheDocument();

        unmount();
      });
    });
  });
});