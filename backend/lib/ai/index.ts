// AI Service Module Exports
export { AIContentService, getAIContentService } from './content-service';
export { OpenAIClient, getOpenAIClient } from './client';
export { PromptTemplates } from './prompts';
export { SpaceCalculationService, getSpaceCalculationService } from './space-calculation-service';
export { ContentUtilizationService, getContentUtilizationService } from './content-utilization-service';
export { 
  TopicExtractionService, 
  getTopicExtractionService,
  type TopicAnalysis,
  type DuplicateGroup,
  type ConfidenceMetrics,
  type ProcessingStats,
  type TopicExtractionConfig
} from './topic-extraction-service';
export { 
  ImageRecreationService, 
  getImageRecreationService 
} from './image-recreation-service';
export * from './types';

// Re-export commonly used types for convenience
export type {
  ExtractedContent,
  OrganizedTopic,
  TopicExtractionRequest,
  FidelityScore,
  AIServiceError,
  ImageGenerationRequest,
  GeneratedImage,
  ImageQualityAssessment,
  ImageRecreationResult,
  UserApprovalWorkflow,
  SpaceConstraints,
  ReferenceFormatAnalysis,
  SpaceOptimizationResult,
  SpaceSuggestion,
  TopicSelection,
  SpaceUtilizationInfo,
  EnhancedSubTopic
} from './types';