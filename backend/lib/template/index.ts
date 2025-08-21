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