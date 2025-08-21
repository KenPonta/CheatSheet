/**
 * Tests for manual review interface
 */

import { ManualReviewManager } from '../manual-review';
import { ContentComparison, ValidationResult, FidelityScore } from '../types';

describe('ManualReviewManager', () => {
  let reviewManager: ManualReviewManager;
  let mockComparison: ContentComparison;
  let mockValidationResult: ValidationResult;

  beforeEach(() => {
    reviewManager = new ManualReviewManager();
    
    const mockScore: FidelityScore = {
      overall: 0.7,
      textSimilarity: 0.8,
      structureSimilarity: 0.6,
      semanticSimilarity: 0.7,
      wordingPreservation: 0.65
    };

    mockComparison = {
      original: 'Original content for testing.',
      processed: 'Modified content for testing purposes.',
      score: mockScore,
      warnings: [
        {
          type: 'wording_change',
          severity: 'high',
          message: 'Wording has been modified',
          originalText: 'Original content',
          processedText: 'Modified content',
          location: { startIndex: 0, endIndex: 16 }
        }
      ],
      modifications: [
        {
          type: 'change',
          originalText: 'Original content',
          processedText: 'Modified content',
          location: { startIndex: 0, endIndex: 16 },
          confidence: 0.8
        }
      ]
    };

    mockValidationResult = {
      isValid: false,
      score: mockScore,
      warnings: mockComparison.warnings,
      recommendations: ['Review content changes'],
      requiresManualReview: true
    };
  });

  describe('addForReview', () => {
    it('should add content for manual review', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      
      expect(reviewId).toBeDefined();
      expect(reviewId).toMatch(/^review_\d+_[a-z0-9]+$/);
      
      const reviewItem = reviewManager.getReviewItem(reviewId);
      expect(reviewItem).toBeDefined();
      expect(reviewItem?.status).toBe('pending');
      expect(reviewItem?.comparison).toBe(mockComparison);
    });

    it('should add multiple items to review queue', () => {
      const id1 = reviewManager.addForReview(mockComparison, mockValidationResult);
      const id2 = reviewManager.addForReview(mockComparison, mockValidationResult);
      
      expect(id1).not.toBe(id2);
      
      const pendingReviews = reviewManager.getPendingReviews();
      expect(pendingReviews).toHaveLength(2);
    });
  });

  describe('getReviewItem', () => {
    it('should retrieve review item by ID', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      const reviewItem = reviewManager.getReviewItem(reviewId);
      
      expect(reviewItem).toBeDefined();
      expect(reviewItem?.id).toBe(reviewId);
      expect(reviewItem?.comparison).toBe(mockComparison);
    });

    it('should return null for non-existent ID', () => {
      const reviewItem = reviewManager.getReviewItem('non-existent-id');
      expect(reviewItem).toBeNull();
    });
  });

  describe('approveReview', () => {
    it('should approve a pending review', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      const userNotes = 'Approved after manual verification';
      
      const success = reviewManager.approveReview(reviewId, userNotes);
      expect(success).toBe(true);
      
      const reviewItem = reviewManager.getReviewItem(reviewId);
      expect(reviewItem?.status).toBe('approved');
      expect(reviewItem?.userNotes).toBe(userNotes);
      
      const pendingReviews = reviewManager.getPendingReviews();
      expect(pendingReviews).toHaveLength(0);
    });

    it('should not approve non-existent review', () => {
      const success = reviewManager.approveReview('non-existent-id');
      expect(success).toBe(false);
    });

    it('should not approve already processed review', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      
      // First approval
      reviewManager.approveReview(reviewId);
      
      // Second approval attempt
      const success = reviewManager.approveReview(reviewId);
      expect(success).toBe(false);
    });
  });

  describe('rejectReview', () => {
    it('should reject a pending review', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      const userNotes = 'Rejected due to significant content changes';
      
      const success = reviewManager.rejectReview(reviewId, userNotes);
      expect(success).toBe(true);
      
      const reviewItem = reviewManager.getReviewItem(reviewId);
      expect(reviewItem?.status).toBe('rejected');
      expect(reviewItem?.userNotes).toBe(userNotes);
      
      const pendingReviews = reviewManager.getPendingReviews();
      expect(pendingReviews).toHaveLength(0);
    });
  });

  describe('getReviewStats', () => {
    it('should return correct statistics', () => {
      // Add multiple reviews with different statuses
      const id1 = reviewManager.addForReview(mockComparison, mockValidationResult);
      const id2 = reviewManager.addForReview(mockComparison, mockValidationResult);
      const id3 = reviewManager.addForReview(mockComparison, mockValidationResult);
      
      reviewManager.approveReview(id1);
      reviewManager.rejectReview(id2);
      // id3 remains pending
      
      const stats = reviewManager.getReviewStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });

    it('should return zero stats for empty manager', () => {
      const stats = reviewManager.getReviewStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.rejected).toBe(0);
    });
  });

  describe('clearCompletedReviews', () => {
    it('should clear approved and rejected reviews', () => {
      const id1 = reviewManager.addForReview(mockComparison, mockValidationResult);
      const id2 = reviewManager.addForReview(mockComparison, mockValidationResult);
      const id3 = reviewManager.addForReview(mockComparison, mockValidationResult);
      
      reviewManager.approveReview(id1);
      reviewManager.rejectReview(id2);
      // id3 remains pending
      
      const clearedCount = reviewManager.clearCompletedReviews();
      expect(clearedCount).toBe(2);
      
      const stats = reviewManager.getReviewStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('generateReviewSummary', () => {
    it('should generate comprehensive review summary', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      const summary = reviewManager.generateReviewSummary(reviewId);
      
      expect(summary).toBeDefined();
      expect(summary?.id).toBe(reviewId);
      expect(summary?.overallScore).toBe(0.7);
      expect(summary?.wordingPreservation).toBe(0.65);
      expect(summary?.criticalIssues).toBe(1);
      expect(summary?.moderateIssues).toBe(0);
      expect(summary?.totalModifications).toBe(1);
      expect(summary?.keyWarnings).toContain('Wording has been modified');
      expect(summary?.recommendedAction).toBeDefined();
      expect(summary?.timestamp).toBeDefined();
    });

    it('should return null for non-existent review', () => {
      const summary = reviewManager.generateReviewSummary('non-existent-id');
      expect(summary).toBeNull();
    });

    it('should recommend appropriate actions based on content', () => {
      // Test rejection recommendation for very low score
      const lowScoreComparison = {
        ...mockComparison,
        score: {
          ...mockComparison.score,
          overall: 0.4,
          wordingPreservation: 0.3
        }
      };
      
      const reviewId = reviewManager.addForReview(lowScoreComparison, mockValidationResult);
      const summary = reviewManager.generateReviewSummary(reviewId);
      
      expect(summary?.recommendedAction).toBe('reject');
    });
  });

  describe('exportReviewData', () => {
    it('should export review data for analysis', () => {
      const id1 = reviewManager.addForReview(mockComparison, mockValidationResult);
      const id2 = reviewManager.addForReview(mockComparison, mockValidationResult);
      
      reviewManager.approveReview(id1, 'Test approval');
      
      const exportData = reviewManager.exportReviewData();
      
      expect(exportData.exportDate).toBeDefined();
      expect(exportData.totalReviews).toBe(2);
      expect(exportData.items).toHaveLength(2);
      
      const approvedItem = exportData.items.find(item => item.status === 'approved');
      expect(approvedItem).toBeDefined();
      expect(approvedItem?.userNotes).toBe('Test approval');
      
      const pendingItem = exportData.items.find(item => item.status === 'pending');
      expect(pendingItem).toBeDefined();
    });

    it('should include all relevant metrics in export', () => {
      const reviewId = reviewManager.addForReview(mockComparison, mockValidationResult);
      const exportData = reviewManager.exportReviewData();
      
      const item = exportData.items[0];
      expect(item.id).toBe(reviewId);
      expect(item.overallScore).toBe(0.7);
      expect(item.wordingScore).toBe(0.65);
      expect(item.warningCount).toBe(1);
      expect(item.modificationCount).toBe(1);
      expect(item.timestamp).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle reviews with no warnings', () => {
      const perfectComparison: ContentComparison = {
        original: 'Perfect content',
        processed: 'Perfect content',
        score: {
          overall: 1.0,
          textSimilarity: 1.0,
          structureSimilarity: 1.0,
          semanticSimilarity: 1.0,
          wordingPreservation: 1.0
        },
        warnings: [],
        modifications: []
      };
      
      const reviewId = reviewManager.addForReview(perfectComparison, {
        ...mockValidationResult,
        isValid: true,
        warnings: [],
        requiresManualReview: false
      });
      
      const summary = reviewManager.generateReviewSummary(reviewId);
      expect(summary?.criticalIssues).toBe(0);
      expect(summary?.moderateIssues).toBe(0);
      expect(summary?.recommendedAction).toBe('approve');
    });

    it('should handle reviews with many warnings', () => {
      const manyWarnings = Array.from({ length: 10 }, (_, i) => ({
        type: 'wording_change' as const,
        severity: i < 5 ? 'high' as const : 'medium' as const,
        message: `Warning ${i + 1}`,
        originalText: `Original ${i}`,
        processedText: `Processed ${i}`,
        location: { startIndex: i * 10, endIndex: (i + 1) * 10 }
      }));
      
      const warningComparison: ContentComparison = {
        ...mockComparison,
        warnings: manyWarnings
      };
      
      const reviewId = reviewManager.addForReview(warningComparison, mockValidationResult);
      const summary = reviewManager.generateReviewSummary(reviewId);
      
      expect(summary?.criticalIssues).toBe(5);
      expect(summary?.moderateIssues).toBe(5);
      expect(summary?.keyWarnings).toHaveLength(3); // Should limit to 3 key warnings
    });
  });
});