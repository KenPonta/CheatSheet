/**
 * Manual review interface for flagged content changes
 */

import { 
  ManualReviewItem, 
  ContentComparison, 
  FidelityWarning,
  ValidationResult 
} from './types';

export class ManualReviewManager {
  private reviewItems: Map<string, ManualReviewItem> = new Map();
  private reviewQueue: string[] = [];

  /**
   * Add content for manual review
   */
  addForReview(comparison: ContentComparison, validationResult: ValidationResult): string {
    const id = this.generateReviewId();
    
    const reviewItem: ManualReviewItem = {
      id,
      comparison,
      status: 'pending',
      timestamp: new Date()
    };
    
    this.reviewItems.set(id, reviewItem);
    this.reviewQueue.push(id);
    
    return id;
  }

  /**
   * Get review item by ID
   */
  getReviewItem(id: string): ManualReviewItem | null {
    return this.reviewItems.get(id) || null;
  }

  /**
   * Get all pending review items
   */
  getPendingReviews(): ManualReviewItem[] {
    return this.reviewQueue
      .map(id => this.reviewItems.get(id))
      .filter((item): item is ManualReviewItem => item !== undefined && item.status === 'pending');
  }

  /**
   * Approve a review item
   */
  approveReview(id: string, userNotes?: string): boolean {
    const item = this.reviewItems.get(id);
    if (!item || item.status !== 'pending') {
      return false;
    }
    
    item.status = 'approved';
    item.userNotes = userNotes;
    
    // Remove from queue
    this.reviewQueue = this.reviewQueue.filter(queueId => queueId !== id);
    
    return true;
  }

  /**
   * Reject a review item
   */
  rejectReview(id: string, userNotes?: string): boolean {
    const item = this.reviewItems.get(id);
    if (!item || item.status !== 'pending') {
      return false;
    }
    
    item.status = 'rejected';
    item.userNotes = userNotes;
    
    // Remove from queue
    this.reviewQueue = this.reviewQueue.filter(queueId => queueId !== id);
    
    return true;
  }

  /**
   * Get review statistics
   */
  getReviewStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    const items = Array.from(this.reviewItems.values());
    
    return {
      total: items.length,
      pending: items.filter(item => item.status === 'pending').length,
      approved: items.filter(item => item.status === 'approved').length,
      rejected: items.filter(item => item.status === 'rejected').length
    };
  }

  /**
   * Clear completed reviews
   */
  clearCompletedReviews(): number {
    const completedIds: string[] = [];
    
    for (const [id, item] of this.reviewItems.entries()) {
      if (item.status !== 'pending') {
        completedIds.push(id);
      }
    }
    
    completedIds.forEach(id => this.reviewItems.delete(id));
    
    return completedIds.length;
  }

  /**
   * Generate review summary for an item
   */
  generateReviewSummary(id: string): ReviewSummary | null {
    const item = this.reviewItems.get(id);
    if (!item) {
      return null;
    }
    
    const { comparison } = item;
    const highSeverityWarnings = comparison.warnings.filter(w => w.severity === 'high');
    const mediumSeverityWarnings = comparison.warnings.filter(w => w.severity === 'medium');
    
    return {
      id,
      overallScore: comparison.score.overall,
      wordingPreservation: comparison.score.wordingPreservation,
      criticalIssues: highSeverityWarnings.length,
      moderateIssues: mediumSeverityWarnings.length,
      totalModifications: comparison.modifications.length,
      keyWarnings: highSeverityWarnings.slice(0, 3).map(w => w.message),
      recommendedAction: this.getRecommendedAction(comparison),
      timestamp: item.timestamp
    };
  }

  /**
   * Get recommended action for a review item
   */
  private getRecommendedAction(comparison: ContentComparison): 'approve' | 'reject' | 'modify' {
    const { score, warnings } = comparison;
    
    // Recommend rejection for very low scores
    if (score.overall < 0.6 || score.wordingPreservation < 0.5) {
      return 'reject';
    }
    
    // Recommend modification for moderate issues
    const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
    if (highSeverityWarnings.length > 0) {
      return 'modify';
    }
    
    // Recommend approval for minor issues
    return 'approve';
  }

  /**
   * Export review data for analysis
   */
  exportReviewData(): ReviewExportData {
    const items = Array.from(this.reviewItems.values());
    
    return {
      exportDate: new Date(),
      totalReviews: items.length,
      items: items.map(item => ({
        id: item.id,
        status: item.status,
        overallScore: item.comparison.score.overall,
        wordingScore: item.comparison.score.wordingPreservation,
        warningCount: item.comparison.warnings.length,
        modificationCount: item.comparison.modifications.length,
        userNotes: item.userNotes,
        timestamp: item.timestamp
      }))
    };
  }

  /**
   * Generate unique review ID
   */
  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface ReviewSummary {
  id: string;
  overallScore: number;
  wordingPreservation: number;
  criticalIssues: number;
  moderateIssues: number;
  totalModifications: number;
  keyWarnings: string[];
  recommendedAction: 'approve' | 'reject' | 'modify';
  timestamp: Date;
}

export interface ReviewExportData {
  exportDate: Date;
  totalReviews: number;
  items: Array<{
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    overallScore: number;
    wordingScore: number;
    warningCount: number;
    modificationCount: number;
    userNotes?: string;
    timestamp: Date;
  }>;
}