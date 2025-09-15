/**
 * Main template processing service that orchestrates all template functionality
 */

import { TemplateAnalyzer } from './analyzer';
import { TemplateApplicator } from './applicator';
import { ConflictResolver, ConflictResolutionOptions } from './conflict-resolver';
import { TemplatePreviewGenerator } from './preview';
import {
  ReferenceTemplate,
  TemplateApplication,
  TemplateComparison,
  TemplateProcessingError
} from './types';
import { ExtractedContent, OrganizedTopic } from '../ai/types';

export class TemplateService {
  private analyzer: TemplateAnalyzer;
  private applicator: TemplateApplicator;
  private conflictResolver: ConflictResolver;
  private previewGenerator: TemplatePreviewGenerator;

  constructor(conflictResolutionOptions?: Partial<ConflictResolutionOptions>) {
    this.analyzer = new TemplateAnalyzer();
    this.applicator = new TemplateApplicator();
    this.conflictResolver = new ConflictResolver(conflictResolutionOptions);
    this.previewGenerator = new TemplatePreviewGenerator();
  }

  /**
   * Analyzes a reference template file
   */
  async analyzeTemplate(file: File): Promise<ReferenceTemplate> {
    try {
      return await this.analyzer.analyzeTemplate(file);
    } catch (error) {
      throw new TemplateProcessingError(
        `Template analysis failed: ${error.message}`,
        {
          code: 'ANALYSIS_FAILED',
          retryable: true,
          details: { fileName: file.name, error }
        }
      );
    }
  }

  /**
   * Applies a template to user content with full conflict resolution
   */
  async applyTemplateWithResolution(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): Promise<TemplateApplication> {
    try {
      // Initial template application to identify conflicts
      const initialApplication = await this.applicator.applyTemplate(
        template,
        userContent,
        userTopics
      );

      // Resolve conflicts if any exist
      if (initialApplication.conflicts.length > 0) {
        const resolution = await this.conflictResolver.resolveConflicts(
          initialApplication.conflicts,
          template,
          userContent,
          userTopics
        );

        // Apply resolved layout and regenerate preview
        const resolvedPreview = await this.previewGenerator.generatePreview(
          template,
          userContent,
          userTopics,
          resolution.modifiedLayout
        );

        return {
          ...initialApplication,
          adaptedLayout: resolution.modifiedLayout,
          conflicts: resolution.resolvedConflicts,
          preview: resolvedPreview
        };
      }

      return initialApplication;
    } catch (error) {
      throw new TemplateProcessingError(
        `Template application failed: ${error.message}`,
        {
          code: 'APPLICATION_FAILED',
          retryable: true,
          details: { templateId: template.id, error }
        }
      );
    }
  }

  /**
   * Generates a preview of template application
   */
  async generatePreview(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ) {
    try {
      // Apply template to get layout configuration
      const application = await this.applicator.applyTemplate(
        template,
        userContent,
        userTopics
      );

      return application.preview;
    } catch (error) {
      throw new TemplateProcessingError(
        `Preview generation failed: ${error.message}`,
        {
          code: 'PREVIEW_GENERATION_FAILED',
          retryable: true,
          details: { templateId: template.id, error }
        }
      );
    }
  }

  /**
   * Compares original template with applied version
   */
  async compareTemplates(
    original: ReferenceTemplate,
    applied: TemplateApplication
  ): Promise<TemplateComparison> {
    try {
      return await this.previewGenerator.compareTemplates(original, applied);
    } catch (error) {
      throw new TemplateProcessingError(
        `Template comparison failed: ${error.message}`,
        {
          code: 'PREVIEW_GENERATION_FAILED',
          retryable: true,
          details: { templateId: original.id, error }
        }
      );
    }
  }

  /**
   * Generates side-by-side comparison preview
   */
  async generateComparisonPreview(
    original: ReferenceTemplate,
    applied: TemplateApplication
  ) {
    try {
      return await this.previewGenerator.generateComparisonPreview(original, applied);
    } catch (error) {
      throw new TemplateProcessingError(
        `Comparison preview generation failed: ${error.message}`,
        {
          code: 'PREVIEW_GENERATION_FAILED',
          retryable: true,
          details: { templateId: original.id, error }
        }
      );
    }
  }

  /**
   * Validates template compatibility with user content
   */
  async validateTemplateCompatibility(
    template: ReferenceTemplate,
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): Promise<{
    compatible: boolean;
    score: number; // 0-1 compatibility score
    issues: string[];
    recommendations: string[];
  }> {
    try {
      // Apply template to identify potential issues
      const application = await this.applicator.applyTemplate(
        template,
        userContent,
        userTopics
      );

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Analyze conflicts
      const highSeverityConflicts = application.conflicts.filter(c => c.severity === 'high');
      const mediumSeverityConflicts = application.conflicts.filter(c => c.severity === 'medium');

      if (highSeverityConflicts.length > 0) {
        issues.push(`${highSeverityConflicts.length} high-severity compatibility issues found`);
        recommendations.push('Consider using a different template or significantly modifying content');
      }

      if (mediumSeverityConflicts.length > 0) {
        issues.push(`${mediumSeverityConflicts.length} medium-severity compatibility issues found`);
        recommendations.push('Template can be adapted but may require layout modifications');
      }

      // Calculate compatibility score
      const totalConflicts = application.conflicts.length;
      const conflictWeight = highSeverityConflicts.length * 0.5 + mediumSeverityConflicts.length * 0.3;
      const score = Math.max(0, 1 - (conflictWeight / Math.max(1, totalConflicts)));

      // Analyze fit quality
      const fitQuality = application.preview.fitAnalysis.overallQuality;
      if (fitQuality < 0.7) {
        issues.push('Poor content fit - significant modifications required');
        recommendations.push('Reduce content volume or increase template capacity');
      }

      const compatible = score >= 0.6 && fitQuality >= 0.6;

      if (compatible && issues.length === 0) {
        recommendations.push('Template is well-suited for your content');
      }

      return {
        compatible,
        score: (score + fitQuality) / 2,
        issues,
        recommendations
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Template validation failed: ${error.message}`,
        {
          code: 'ANALYSIS_FAILED',
          retryable: true,
          details: { templateId: template.id, error }
        }
      );
    }
  }

  /**
   * Gets template recommendations based on user content characteristics
   */
  async getTemplateRecommendations(
    availableTemplates: ReferenceTemplate[],
    userContent: ExtractedContent[],
    userTopics: OrganizedTopic[]
  ): Promise<{
    template: ReferenceTemplate;
    score: number;
    reasons: string[];
  }[]> {
    try {
      const recommendations = [];

      for (const template of availableTemplates) {
        const validation = await this.validateTemplateCompatibility(
          template,
          userContent,
          userTopics
        );

        const reasons = [];

        // Analyze why this template is or isn't suitable
        if (validation.compatible) {
          reasons.push('Good compatibility with your content structure');
        }

        if (validation.score > 0.8) {
          reasons.push('Excellent fit for content volume and complexity');
        } else if (validation.score > 0.6) {
          reasons.push('Good fit with minor adjustments needed');
        } else {
          reasons.push('Requires significant modifications to work well');
        }

        // Domain-specific recommendations
        const userDomain = this.detectContentDomain(userContent);
        const templateDomain = template.analysis.metadata.domain;
        
        if (userDomain === templateDomain) {
          reasons.push(`Designed for ${userDomain} content`);
        } else if (templateDomain === 'general') {
          reasons.push('Versatile template suitable for various subjects');
        }

        recommendations.push({
          template,
          score: validation.score,
          reasons
        });
      }

      // Sort by score (best first)
      return recommendations.sort((a, b) => b.score - a.score);
    } catch (error) {
      throw new TemplateProcessingError(
        `Template recommendation failed: ${error.message}`,
        {
          code: 'ANALYSIS_FAILED',
          retryable: true,
          details: { error }
        }
      );
    }
  }

  /**
   * Exports template application as HTML/CSS for use in cheat sheet generation
   */
  async exportTemplateApplication(application: TemplateApplication): Promise<{
    html: string;
    css: string;
    metadata: {
      templateId: string;
      templateName: string;
      pageCount: number;
      conflicts: number;
      quality: number;
    };
  }> {
    try {
      const preview = application.preview;
      
      return {
        html: preview.html,
        css: preview.css,
        metadata: {
          templateId: application.sourceTemplate.id,
          templateName: application.sourceTemplate.name,
          pageCount: application.adaptedLayout.maxPages,
          conflicts: application.conflicts.length,
          quality: preview.fitAnalysis.overallQuality
        }
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Template export failed: ${error.message}`,
        {
          code: 'PREVIEW_GENERATION_FAILED',
          retryable: true,
          details: { templateId: application.sourceTemplate.id, error }
        }
      );
    }
  }

  // Helper methods
  private detectContentDomain(userContent: ExtractedContent[]): string {
    const allText = userContent.map(c => c.text).join(' ').toLowerCase();
    
    if (allText.includes('math') || allText.includes('equation') || allText.includes('formula')) {
      return 'mathematics';
    }
    if (allText.includes('code') || allText.includes('programming') || allText.includes('function')) {
      return 'computer-science';
    }
    if (allText.includes('history') || allText.includes('date') || allText.includes('century')) {
      return 'history';
    }
    if (allText.includes('biology') || allText.includes('cell') || allText.includes('organism')) {
      return 'biology';
    }
    
    return 'general';
  }
}

// Export convenience functions for common use cases
export async function analyzeReferenceTemplate(file: File): Promise<ReferenceTemplate> {
  const service = new TemplateService();
  return service.analyzeTemplate(file);
}

export async function applyTemplateToContent(
  template: ReferenceTemplate,
  userContent: ExtractedContent[],
  userTopics: OrganizedTopic[]
): Promise<TemplateApplication> {
  const service = new TemplateService();
  return service.applyTemplateWithResolution(template, userContent, userTopics);
}

export async function validateTemplateCompatibility(
  template: ReferenceTemplate,
  userContent: ExtractedContent[],
  userTopics: OrganizedTopic[]
) {
  const service = new TemplateService();
  return service.validateTemplateCompatibility(template, userContent, userTopics);
}

export async function getTemplateRecommendations(
  availableTemplates: ReferenceTemplate[],
  userContent: ExtractedContent[],
  userTopics: OrganizedTopic[]
) {
  const service = new TemplateService();
  return service.getTemplateRecommendations(availableTemplates, userContent, userTopics);
}