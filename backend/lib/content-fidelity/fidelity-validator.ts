/**
 * Content fidelity validation service
 */

import { 
  FidelityScore, 
  ContentComparison, 
  FidelityWarning, 
  ContentModification,
  FidelityValidationConfig,
  ValidationResult,
  ContentLocation
} from './types';
import { SimilarityCalculator } from './similarity-calculator';

export class FidelityValidator {
  private config: FidelityValidationConfig;

  constructor(config: Partial<FidelityValidationConfig> = {}) {
    this.config = {
      minAcceptableScore: 0.8,
      wordingThreshold: 0.85,
      structureThreshold: 0.7,
      semanticThreshold: 0.8,
      enableStrictMode: false,
      ignoreMinorChanges: true,
      ...config
    };
  }

  /**
   * Validate content fidelity between original and processed content
   */
  async validateContent(original: string, processed: string): Promise<ValidationResult> {
    const comparison = await this.compareContent(original, processed);
    const warnings = this.generateWarnings(comparison);
    const recommendations = this.generateRecommendations(comparison);
    
    const isValid = this.isContentValid(comparison.score);
    const requiresManualReview = this.requiresManualReview(comparison);
    
    return {
      isValid,
      score: comparison.score,
      warnings,
      recommendations,
      requiresManualReview
    };
  }

  /**
   * Compare original and processed content
   */
  async compareContent(original: string, processed: string): Promise<ContentComparison> {
    const score = SimilarityCalculator.calculateFidelityScore(original, processed);
    const modifications = SimilarityCalculator.findModifications(original, processed);
    const warnings = this.analyzeModifications(modifications, score);
    
    return {
      original,
      processed,
      score,
      warnings,
      modifications
    };
  }

  /**
   * Check if content meets fidelity requirements
   */
  private isContentValid(score: FidelityScore): boolean {
    if (this.config.enableStrictMode) {
      return (
        score.overall >= this.config.minAcceptableScore &&
        score.wordingPreservation >= this.config.wordingThreshold &&
        score.structureSimilarity >= this.config.structureThreshold &&
        score.semanticSimilarity >= this.config.semanticThreshold
      );
    }
    
    return score.overall >= this.config.minAcceptableScore;
  }

  /**
   * Determine if content requires manual review
   */
  private requiresManualReview(comparison: ContentComparison): boolean {
    const { score, warnings } = comparison;
    
    // Require manual review if overall score is low
    if (score.overall < this.config.minAcceptableScore) {
      return true;
    }
    
    // Require manual review if wording preservation is significantly low
    if (score.wordingPreservation < this.config.wordingThreshold) {
      return true;
    }
    
    // Require manual review if there are high-severity warnings
    const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
    if (highSeverityWarnings.length > 0) {
      return true;
    }
    
    // Require manual review if there are many medium-severity warnings
    const mediumSeverityWarnings = warnings.filter(w => w.severity === 'medium');
    if (mediumSeverityWarnings.length > 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Analyze modifications and generate warnings
   */
  private analyzeModifications(modifications: ContentModification[], score: FidelityScore): FidelityWarning[] {
    const warnings: FidelityWarning[] = [];
    
    for (const mod of modifications) {
      const warning = this.createWarningFromModification(mod, score);
      if (warning) {
        warnings.push(warning);
      }
    }
    
    // Add overall score warnings
    if (score.wordingPreservation < this.config.wordingThreshold) {
      warnings.push({
        type: 'wording_change',
        severity: 'high',
        message: `Significant wording changes detected. Original wording preservation: ${(score.wordingPreservation * 100).toFixed(1)}%`,
        originalText: '',
        processedText: '',
        location: { startIndex: 0, endIndex: 0 },
        suggestion: 'Review processed content to ensure original terminology is preserved'
      });
    }
    
    if (score.structureSimilarity < this.config.structureThreshold) {
      warnings.push({
        type: 'structure_change',
        severity: 'medium',
        message: `Document structure has been significantly altered. Structure similarity: ${(score.structureSimilarity * 100).toFixed(1)}%`,
        originalText: '',
        processedText: '',
        location: { startIndex: 0, endIndex: 0 },
        suggestion: 'Verify that the document organization still matches the original intent'
      });
    }
    
    return warnings;
  }

  /**
   * Create warning from content modification
   */
  private createWarningFromModification(modification: ContentModification, score: FidelityScore): FidelityWarning | null {
    if (this.config.ignoreMinorChanges && this.isMinorChange(modification)) {
      return null;
    }
    
    const severity = this.determineSeverity(modification, score);
    
    switch (modification.type) {
      case 'addition':
        return {
          type: 'content_addition',
          severity,
          message: 'New content has been added that was not in the original',
          originalText: modification.originalText,
          processedText: modification.processedText,
          location: modification.location,
          suggestion: 'Verify that added content is necessary and accurate'
        };
        
      case 'removal':
        return {
          type: 'content_removal',
          severity,
          message: 'Original content has been removed',
          originalText: modification.originalText,
          processedText: modification.processedText,
          location: modification.location,
          suggestion: 'Ensure removed content was not essential information'
        };
        
      case 'change':
        return {
          type: 'wording_change',
          severity,
          message: 'Original wording has been modified',
          originalText: modification.originalText,
          processedText: modification.processedText,
          location: modification.location,
          suggestion: 'Review changes to ensure meaning and terminology are preserved'
        };
        
      default:
        return null;
    }
  }

  /**
   * Determine if a modification is minor
   */
  private isMinorChange(modification: ContentModification): boolean {
    const { originalText, processedText } = modification;
    
    // Consider punctuation-only changes as minor
    const origNoPunct = originalText.replace(/[^\w\s]/g, '').trim();
    const procNoPunct = processedText.replace(/[^\w\s]/g, '').trim();
    
    if (origNoPunct === procNoPunct) {
      return true;
    }
    
    // Consider case-only changes as minor
    if (originalText.toLowerCase() === processedText.toLowerCase()) {
      return true;
    }
    
    // Consider very short changes as minor
    if (Math.abs(originalText.length - processedText.length) <= 3) {
      const similarity = SimilarityCalculator.calculateTextSimilarity(originalText, processedText);
      return similarity > 0.9;
    }
    
    return false;
  }

  /**
   * Determine warning severity
   */
  private determineSeverity(modification: ContentModification, score: FidelityScore): 'low' | 'medium' | 'high' {
    const { originalText, processedText, type } = modification;
    
    // High severity for significant content additions
    if (type === 'addition' && processedText.length > 50) {
      return 'high';
    }
    
    // High severity for removal of substantial content
    if (type === 'removal' && originalText.length > 50) {
      return 'high';
    }
    
    // High severity for major wording changes
    if (type === 'change') {
      const similarity = SimilarityCalculator.calculateTextSimilarity(originalText, processedText);
      if (similarity < 0.5) {
        return 'high';
      }
      if (similarity < 0.7) {
        return 'medium';
      }
    }
    
    // Medium severity if overall wording preservation is low
    if (score.wordingPreservation < 0.7) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate warnings based on comparison results
   */
  private generateWarnings(comparison: ContentComparison): FidelityWarning[] {
    return comparison.warnings;
  }

  /**
   * Generate recommendations for improving fidelity
   */
  private generateRecommendations(comparison: ContentComparison): string[] {
    const recommendations: string[] = [];
    const { score, warnings } = comparison;
    
    if (score.wordingPreservation < this.config.wordingThreshold) {
      recommendations.push('Focus on preserving original terminology and technical language');
      recommendations.push('Avoid paraphrasing unless absolutely necessary for space constraints');
    }
    
    if (score.structureSimilarity < this.config.structureThreshold) {
      recommendations.push('Maintain the original document structure and organization');
      recommendations.push('Preserve heading hierarchy and section relationships');
    }
    
    if (score.semanticSimilarity < this.config.semanticThreshold) {
      recommendations.push('Ensure the meaning and context of original content is preserved');
      recommendations.push('Review content for accuracy and completeness');
    }
    
    const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
    if (highSeverityWarnings.length > 0) {
      recommendations.push('Address high-severity content changes before proceeding');
      recommendations.push('Consider manual review of flagged content modifications');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Content fidelity is acceptable - no major issues detected');
    }
    
    return recommendations;
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<FidelityValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): FidelityValidationConfig {
    return { ...this.config };
  }
}