/**
 * Reference template processing system types
 */

import { LayoutConfig, PageConfig, TextConfig, Dimensions } from '../layout/types';
import { ExtractedContent } from '../ai/types';

export interface ReferenceTemplate {
  id: string;
  name: string;
  file: File;
  analysis: TemplateAnalysis;
  extractedContent: ExtractedContent;
  createdAt: Date;
}

export interface TemplateAnalysis {
  layout: LayoutPattern;
  typography: TypographyPattern;
  organization: OrganizationPattern;
  visual: VisualPattern;
  metadata: TemplateMetadata;
}

export interface LayoutPattern {
  pageConfig: PageConfig;
  columnStructure: ColumnStructure;
  spacing: SpacingPattern;
  margins: MarginPattern;
  pageBreaks: PageBreakPattern[];
}

export interface ColumnStructure {
  count: number;
  widths: number[]; // percentages
  gaps: number[];
  alignment: 'left' | 'center' | 'right' | 'justify';
}

export interface SpacingPattern {
  lineHeight: number;
  paragraphSpacing: number;
  sectionSpacing: number;
  headingSpacing: {
    before: number;
    after: number;
  };
}

export interface MarginPattern {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: 'mm' | 'in' | 'px';
}

export interface PageBreakPattern {
  type: 'section' | 'topic' | 'forced';
  position: number;
  context: string;
}

export interface TypographyPattern {
  fontFamilies: FontFamily[];
  headingStyles: HeadingStyle[];
  bodyTextStyle: TextStyle;
  emphasisStyles: EmphasisStyle[];
  listStyles: ListStyle[];
}

export interface FontFamily {
  name: string;
  usage: 'heading' | 'body' | 'emphasis' | 'code';
  fallbacks: string[];
}

export interface HeadingStyle {
  level: number;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  color: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;
  marginTop: number;
  marginBottom: number;
}

export interface TextStyle {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
}

export interface EmphasisStyle {
  type: 'bold' | 'italic' | 'underline' | 'highlight' | 'code';
  style: TextStyle;
  usage: string; // description of when this style is used
}

export interface ListStyle {
  type: 'ordered' | 'unordered';
  marker: string;
  indentation: number;
  spacing: number;
  nestedLevels: number;
}

export interface OrganizationPattern {
  structure: ContentStructure;
  hierarchy: HierarchyPattern;
  grouping: GroupingPattern[];
  flow: ContentFlow;
}

export interface ContentStructure {
  sections: SectionPattern[];
  topicDistribution: TopicDistribution;
  contentDensity: number; // words per square unit
}

export interface SectionPattern {
  type: 'header' | 'main' | 'sidebar' | 'footer';
  position: Dimensions;
  contentTypes: string[];
  priority: number;
}

export interface HierarchyPattern {
  maxDepth: number;
  levelIndicators: string[]; // how each level is marked (numbers, bullets, etc.)
  indentationRules: IndentationRule[];
}

export interface IndentationRule {
  level: number;
  amount: number;
  unit: 'px' | 'em' | 'rem';
}

export interface GroupingPattern {
  type: 'topic' | 'category' | 'difficulty' | 'source';
  indicator: string; // how groups are visually separated
  spacing: number;
}

export interface ContentFlow {
  direction: 'top-to-bottom' | 'left-to-right' | 'mixed';
  continuity: 'continuous' | 'sectioned' | 'columnar';
  breakPoints: FlowBreakPoint[];
}

export interface FlowBreakPoint {
  type: 'column' | 'page' | 'section';
  trigger: 'content-type' | 'length' | 'topic-change';
  position: number;
}

export interface TopicDistribution {
  averageTopicsPerPage: number;
  topicLengthVariation: 'uniform' | 'varied' | 'hierarchical';
  topicSeparation: 'spacing' | 'lines' | 'boxes' | 'none';
}

export interface VisualPattern {
  colorScheme: ColorScheme;
  borders: BorderPattern[];
  backgrounds: BackgroundPattern[];
  icons: IconPattern[];
  emphasis: VisualEmphasis[];
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
  muted: string;
}

export interface BorderPattern {
  type: 'section' | 'topic' | 'emphasis' | 'decoration';
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  width: number;
  color: string;
  usage: string;
}

export interface BackgroundPattern {
  type: 'section' | 'highlight' | 'alternating' | 'full';
  color: string;
  opacity: number;
  usage: string;
}

export interface IconPattern {
  type: 'bullet' | 'section-marker' | 'emphasis' | 'decoration';
  style: string;
  size: number;
  color: string;
  usage: string;
}

export interface VisualEmphasis {
  method: 'color' | 'background' | 'border' | 'size' | 'position';
  intensity: 'subtle' | 'moderate' | 'strong';
  usage: string;
}

export interface TemplateMetadata {
  pageCount: number;
  wordCount: number;
  topicCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  domain: string; // subject area if detectable
  quality: TemplateQuality;
}

export interface TemplateQuality {
  score: number; // 0-1 scale
  factors: {
    readability: number;
    organization: number;
    consistency: number;
    density: number;
  };
  issues: TemplateIssue[];
}

export interface TemplateIssue {
  type: 'readability' | 'inconsistency' | 'overflow' | 'poor-structure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

export interface TemplateApplication {
  sourceTemplate: ReferenceTemplate;
  userContent: ExtractedContent[];
  adaptedLayout: LayoutConfig;
  conflicts: TemplateConflict[];
  adaptations: TemplateAdaptation[];
  preview: TemplatePreview;
}

export interface TemplateConflict {
  type: 'content-overflow' | 'style-mismatch' | 'structure-incompatible' | 'format-unsupported';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedContent: string[];
  resolution: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'prioritize-content' | 'adapt-template' | 'hybrid' | 'user-choice';
  description: string;
  impact: string;
  alternatives: string[];
}

export interface TemplateAdaptation {
  type: 'layout' | 'typography' | 'spacing' | 'organization';
  original: any;
  adapted: any;
  reason: string;
  confidence: number;
}

export interface TemplatePreview {
  html: string;
  css: string;
  warnings: TemplateWarning[];
  fitAnalysis: TemplateFitAnalysis;
}

export interface TemplateWarning {
  type: 'content-modified' | 'style-changed' | 'layout-adjusted' | 'quality-degraded';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedElements: string[];
  suggestion?: string;
}

export interface TemplateFitAnalysis {
  contentFit: number; // percentage of content that fits
  styleFidelity: number; // how well template style is preserved
  overallQuality: number; // combined quality score
  recommendations: FitRecommendation[];
}

export interface FitRecommendation {
  type: 'reduce-content' | 'adjust-template' | 'change-layout' | 'accept-as-is';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'easy' | 'moderate' | 'difficult';
}

export interface TemplateComparison {
  original: ReferenceTemplate;
  applied: TemplateApplication;
  differences: TemplateDifference[];
  similarity: number; // 0-1 scale
  recommendation: 'use-template' | 'modify-template' | 'create-custom';
}

export interface TemplateDifference {
  category: 'layout' | 'typography' | 'organization' | 'visual';
  type: string;
  original: any;
  applied: any;
  impact: 'visual' | 'functional' | 'content';
  severity: 'minor' | 'moderate' | 'major';
}

export class TemplateProcessingError extends Error {
  public code: 'ANALYSIS_FAILED' | 'APPLICATION_FAILED' | 'CONFLICT_RESOLUTION_FAILED' | 'PREVIEW_GENERATION_FAILED';
  public retryable: boolean;
  public details?: any;

  constructor(
    message: string,
    options: {
      code: 'ANALYSIS_FAILED' | 'APPLICATION_FAILED' | 'CONFLICT_RESOLUTION_FAILED' | 'PREVIEW_GENERATION_FAILED';
      retryable: boolean;
      details?: any;
    }
  ) {
    super(message);
    this.name = 'TemplateProcessingError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.details = options.details;
  }
}