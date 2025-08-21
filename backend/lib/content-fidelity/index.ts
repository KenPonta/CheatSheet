/**
 * Content fidelity validation system
 * 
 * This module provides automated comparison between original and processed content,
 * implements wording preservation checks with similarity scoring, and provides
 * user warnings when content has been modified beyond acceptable thresholds.
 */

import { FidelityValidator } from './fidelity-validator';
import { SimilarityCalculator } from './similarity-calculator';
import { ManualReviewManager } from './manual-review';
import type { FidelityValidationConfig } from './types';

export { FidelityValidator, SimilarityCalculator, ManualReviewManager };

export type {
  FidelityScore,
  ContentComparison,
  FidelityWarning,
  ContentModification,
  ContentLocation,
  FidelityValidationConfig,
  ValidationResult,
  ManualReviewItem
} from './types';

export type {
  ReviewSummary,
  ReviewExportData
} from './manual-review';

// Default configuration for content fidelity validation
export const DEFAULT_FIDELITY_CONFIG = {
  minAcceptableScore: 0.8,
  wordingThreshold: 0.85,
  structureThreshold: 0.7,
  semanticThreshold: 0.8,
  enableStrictMode: false,
  ignoreMinorChanges: true
};

// Utility function to create a configured fidelity validator
export function createFidelityValidator(config?: Partial<FidelityValidationConfig>) {
  return new FidelityValidator(config);
}

// Utility function to create a manual review manager
export function createManualReviewManager() {
  return new ManualReviewManager();
}