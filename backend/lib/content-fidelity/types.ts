/**
 * Types for content fidelity validation system
 */

export interface FidelityScore {
  overall: number; // 0-1 score
  textSimilarity: number;
  structureSimilarity: number;
  semanticSimilarity: number;
  wordingPreservation: number;
}

export interface ContentComparison {
  original: string;
  processed: string;
  score: FidelityScore;
  warnings: FidelityWarning[];
  modifications: ContentModification[];
}

export interface FidelityWarning {
  type: 'wording_change' | 'content_addition' | 'content_removal' | 'structure_change';
  severity: 'low' | 'medium' | 'high';
  message: string;
  originalText: string;
  processedText: string;
  location: ContentLocation;
  suggestion?: string;
}

export interface ContentModification {
  type: 'addition' | 'removal' | 'change';
  originalText: string;
  processedText: string;
  location: ContentLocation;
  confidence: number;
}

export interface ContentLocation {
  section?: string;
  paragraph?: number;
  sentence?: number;
  startIndex: number;
  endIndex: number;
}

export interface FidelityValidationConfig {
  minAcceptableScore: number;
  wordingThreshold: number;
  structureThreshold: number;
  semanticThreshold: number;
  enableStrictMode: boolean;
  ignoreMinorChanges: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  score: FidelityScore;
  warnings: FidelityWarning[];
  recommendations: string[];
  requiresManualReview: boolean;
}

export interface ManualReviewItem {
  id: string;
  comparison: ContentComparison;
  status: 'pending' | 'approved' | 'rejected';
  userNotes?: string;
  timestamp: Date;
}