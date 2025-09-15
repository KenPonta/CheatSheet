/**
 * Template processing system - Main exports
 */

// Core service
export { TemplateService } from './service';

// Individual components
export { TemplateAnalyzer } from './analyzer';
export { TemplateApplicator } from './applicator';
export { ConflictResolver } from './conflict-resolver';
export { TemplatePreviewGenerator } from './preview';

// Enhanced analysis components
export { VisualAnalyzer } from './visual-analyzer';
export { CSSGenerator } from './css-generator';

// Types
export type {
  ReferenceTemplate,
  TemplateAnalysis,
  TemplateApplication,
  TemplateConflict,
  TemplateAdaptation,
  TemplatePreview,
  TemplateComparison,
  TemplateDifference,
  ConflictResolution,
  LayoutPattern,
  TypographyPattern,
  OrganizationPattern,
  VisualPattern,
  TemplateMetadata,
  TemplateQuality,
  TemplateProcessingError
} from './types';

// Enhanced analysis types
export type {
  VisualAnalysisResult,
  VisualElementAnalysis,
  HeaderVisualAnalysis,
  BulletVisualAnalysis,
  ContentDensityAnalysis
} from './visual-analyzer';

export type {
  GeneratedCSS,
  CSSVariables,
  CSSClasses,
  MediaQuery
} from './css-generator';

export type {
  ConflictResolutionOptions,
  RecommendedAction,
  QualityImpact
} from './conflict-resolver';

// Convenience functions
export {
  analyzeReferenceTemplate,
  applyTemplateToContent,
  validateTemplateCompatibility,
  getTemplateRecommendations
} from './service';

// Default export
export default TemplateService;