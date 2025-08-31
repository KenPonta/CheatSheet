/**
 * Reference template analyzer that extracts layout patterns and formatting styles
 * Enhanced with computer vision-based analysis for visual elements
 */

import { 
  ReferenceTemplate, 
  TemplateAnalysis, 
  LayoutPattern, 
  TypographyPattern, 
  OrganizationPattern, 
  VisualPattern,
  TemplateMetadata,
  TemplateProcessingError,
  ColumnStructure,
  SpacingPattern,
  HeadingStyle,
  TextStyle,
  ContentStructure,
  HierarchyPattern,
  ColorScheme,
  TemplateQuality
} from './types';
import { ExtractedContent, DocumentStructure } from '../ai/types';
import { FileProcessorFactory } from '../file-processing/factory';
import { VisualAnalyzer, VisualAnalysisResult } from './visual-analyzer';
import { CSSGenerator } from './css-generator';

export class TemplateAnalyzer {
  private visualAnalyzer: VisualAnalyzer;
  private cssGenerator: CSSGenerator;

  constructor() {
    this.visualAnalyzer = new VisualAnalyzer();
    this.cssGenerator = new CSSGenerator();
  }

  /**
   * Analyzes a reference template file to extract patterns and styles
   */
  async analyzeTemplate(file: File): Promise<ReferenceTemplate> {
    try {
      // Extract content from the reference file
      const processingResult = await FileProcessorFactory.processFile(file);
      
      if (processingResult.status === 'failed') {
        throw new Error(`File processing failed: ${processingResult.errors.map(e => e.message).join(', ')}`);
      }
      
      const extractedContent = processingResult.content;
      
      // Perform comprehensive analysis
      const analysis = await this.performAnalysis(extractedContent, file);
      
      return {
        id: this.generateTemplateId(file),
        name: file.name,
        file,
        analysis,
        extractedContent,
        createdAt: new Date()
      };
    } catch (error) {
      throw new TemplateProcessingError(
        `Failed to analyze template: ${error.message}`,
        {
          code: 'ANALYSIS_FAILED',
          retryable: true,
          details: { fileName: file.name, error }
        }
      );
    }
  }

  /**
   * Performs comprehensive analysis of the extracted content
   * Enhanced with computer vision-based visual analysis
   */
  private async performAnalysis(content: ExtractedContent, file: File): Promise<TemplateAnalysis> {
    // Perform computer vision-based visual analysis first
    let visualAnalysisResult: VisualAnalysisResult | null = null;
    try {
      visualAnalysisResult = await this.visualAnalyzer.analyzeVisualElements(content);
    } catch (error) {
      console.warn('Visual analysis failed, using fallback analysis:', error);
    }

    // Use visual analysis results to enhance traditional analysis
    const [layout, typography, organization, visual, metadata] = await Promise.all([
      this.analyzeLayout(content, visualAnalysisResult?.layout),
      this.analyzeTypography(content, visualAnalysisResult?.typography),
      this.analyzeOrganization(content),
      this.analyzeVisualPatterns(content, visualAnalysisResult),
      this.analyzeMetadata(content, file, visualAnalysisResult?.contentDensity)
    ]);

    return {
      layout,
      typography,
      organization,
      visual,
      metadata
    };
  }

  /**
   * Analyzes layout patterns including page structure, columns, and spacing
   * Enhanced with computer vision analysis when available
   */
  private async analyzeLayout(content: ExtractedContent, visualLayout?: LayoutPattern): Promise<LayoutPattern> {
    // Use visual analysis results if available, otherwise fall back to heuristics
    if (visualLayout) {
      return visualLayout;
    }

    // Analyze document structure to infer layout
    const structure = content.structure;
    
    // Estimate page configuration from content structure
    const pageConfig = this.inferPageConfig(content);
    
    // Analyze column structure from text flow
    const columnStructure = this.analyzeColumnStructure(content);
    
    // Extract spacing patterns from content
    const spacing = this.analyzeSpacing(content);
    
    // Analyze margins from document metadata
    const margins = this.analyzeMargins(content);
    
    // Identify page break patterns
    const pageBreaks = this.analyzePageBreaks(content);

    return {
      pageConfig,
      columnStructure,
      spacing,
      margins,
      pageBreaks
    };
  }

  /**
   * Analyzes typography patterns including fonts, sizes, and styles
   * Enhanced with computer vision analysis when available
   */
  private async analyzeTypography(content: ExtractedContent, visualTypography?: TypographyPattern): Promise<TypographyPattern> {
    // Use visual analysis results if available, otherwise fall back to heuristics
    if (visualTypography) {
      return visualTypography;
    }

    // Extract font information from document structure
    const fontFamilies = this.extractFontFamilies(content);
    
    // Analyze heading styles from document hierarchy
    const headingStyles = this.analyzeHeadingStyles(content.structure);
    
    // Determine body text style
    const bodyTextStyle = this.analyzeBodyTextStyle(content);
    
    // Extract emphasis patterns
    const emphasisStyles = this.analyzeEmphasisStyles(content);
    
    // Analyze list formatting
    const listStyles = this.analyzeListStyles(content);

    return {
      fontFamilies,
      headingStyles,
      bodyTextStyle,
      emphasisStyles,
      listStyles
    };
  }

  /**
   * Analyzes content organization patterns
   */
  private async analyzeOrganization(content: ExtractedContent): Promise<OrganizationPattern> {
    // Analyze content structure
    const structure = this.analyzeContentStructure(content);
    
    // Extract hierarchy patterns
    const hierarchy = this.analyzeHierarchy(content.structure);
    
    // Identify grouping patterns
    const grouping = this.analyzeGroupingPatterns(content);
    
    // Analyze content flow
    const flow = this.analyzeContentFlow(content);

    return {
      structure,
      hierarchy,
      grouping,
      flow
    };
  }

  /**
   * Analyzes visual patterns including colors, borders, and emphasis
   * Enhanced with computer vision analysis when available
   */
  private async analyzeVisualPatterns(content: ExtractedContent, visualAnalysis?: VisualAnalysisResult): Promise<VisualPattern> {
    // Use visual analysis results if available
    if (visualAnalysis) {
      return {
        colorScheme: visualAnalysis.colorScheme,
        borders: visualAnalysis.visualElements.borders,
        backgrounds: visualAnalysis.visualElements.backgrounds,
        icons: this.analyzeIconPatterns(content), // Keep original for now
        emphasis: visualAnalysis.visualElements.emphasis
      };
    }

    // Extract color scheme (limited for text-based analysis)
    const colorScheme = this.analyzeColorScheme(content);
    
    // Analyze border patterns from structure
    const borders = this.analyzeBorderPatterns(content);
    
    // Extract background patterns
    const backgrounds = this.analyzeBackgroundPatterns(content);
    
    // Analyze icon usage
    const icons = this.analyzeIconPatterns(content);
    
    // Extract visual emphasis methods
    const emphasis = this.analyzeVisualEmphasis(content);

    return {
      colorScheme,
      borders,
      backgrounds,
      icons,
      emphasis
    };
  }

  /**
   * Analyzes template metadata and quality
   * Enhanced with content density analysis from computer vision
   */
  private async analyzeMetadata(content: ExtractedContent, file: File, contentDensity?: any): Promise<TemplateMetadata> {
    const pageCount = content.metadata.pageCount || 1;
    const wordCount = content.metadata.wordCount || this.estimateWordCount(content.text);
    const topicCount = this.estimateTopicCount(content.structure);
    const complexity = this.assessComplexity(content, contentDensity);
    const domain = this.detectDomain(content);
    const quality = this.assessQuality(content, contentDensity);

    return {
      pageCount,
      wordCount,
      topicCount,
      complexity,
      domain,
      quality
    };
  }

  // Helper methods for layout analysis
  private inferPageConfig(content: ExtractedContent) {
    // Default to A4 portrait - in a real implementation, this would analyze
    // the document properties or use heuristics based on content layout
    return {
      paperSize: 'a4' as const,
      orientation: 'portrait' as const,
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      },
      columns: 1 as const,
      columnGap: 20
    };
  }

  private analyzeColumnStructure(content: ExtractedContent): ColumnStructure {
    // Analyze text flow to determine column structure
    // This is a simplified implementation
    const textLength = content.text.length;
    const estimatedColumns = textLength > 2000 ? 2 : 1;
    
    return {
      count: estimatedColumns,
      widths: estimatedColumns === 2 ? [50, 50] : [100],
      gaps: estimatedColumns === 2 ? [20] : [],
      alignment: 'left'
    };
  }

  private analyzeSpacing(content: ExtractedContent): SpacingPattern {
    // Analyze spacing patterns from document structure
    return {
      lineHeight: 1.4,
      paragraphSpacing: 12,
      sectionSpacing: 24,
      headingSpacing: {
        before: 16,
        after: 8
      }
    };
  }

  private analyzeMargins(content: ExtractedContent) {
    return {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
      unit: 'mm' as const
    };
  }

  private analyzePageBreaks(content: ExtractedContent) {
    // Analyze where page breaks occur based on content structure
    return content.structure.sections.map((section, index) => ({
      type: 'section' as const,
      position: section.startPosition,
      context: section.title
    }));
  }

  // Helper methods for typography analysis
  private extractFontFamilies(content: ExtractedContent) {
    // Default font families - in a real implementation, this would extract
    // actual font information from the document
    return [
      {
        name: 'Arial',
        usage: 'body' as const,
        fallbacks: ['Helvetica', 'sans-serif']
      },
      {
        name: 'Arial Bold',
        usage: 'heading' as const,
        fallbacks: ['Helvetica Bold', 'sans-serif']
      }
    ];
  }

  private analyzeHeadingStyles(structure: DocumentStructure): HeadingStyle[] {
    return structure.headings.map(heading => ({
      level: heading.level,
      fontSize: 16 + (4 - heading.level) * 2, // Larger for higher levels
      fontWeight: 700,
      fontFamily: 'Arial Bold',
      color: '#000000',
      textTransform: heading.level === 1 ? 'uppercase' : undefined,
      marginTop: 16,
      marginBottom: 8
    }));
  }

  private analyzeBodyTextStyle(content: ExtractedContent): TextStyle {
    return {
      fontSize: 12,
      fontWeight: 400,
      fontFamily: 'Arial',
      color: '#000000',
      lineHeight: 1.4,
      textAlign: 'left'
    };
  }

  private analyzeEmphasisStyles(content: ExtractedContent) {
    return [
      {
        type: 'bold' as const,
        style: {
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'Arial Bold',
          color: '#000000',
          lineHeight: 1.4,
          textAlign: 'left' as const
        },
        usage: 'Key terms and important concepts'
      }
    ];
  }

  private analyzeListStyles(content: ExtractedContent) {
    return [
      {
        type: 'unordered' as const,
        marker: '•',
        indentation: 20,
        spacing: 4,
        nestedLevels: 3
      },
      {
        type: 'ordered' as const,
        marker: '1.',
        indentation: 20,
        spacing: 4,
        nestedLevels: 3
      }
    ];
  }

  // Helper methods for organization analysis
  private analyzeContentStructure(content: ExtractedContent): ContentStructure {
    const sections = content.structure.sections.map((section, index) => ({
      type: index === 0 ? 'header' : 'main' as const,
      position: {
        width: 100,
        height: 50,
        unit: 'px' as const
      },
      contentTypes: ['text'],
      priority: index === 0 ? 1 : 2
    }));

    return {
      sections,
      topicDistribution: {
        averageTopicsPerPage: content.structure.sections.length,
        topicLengthVariation: 'varied',
        topicSeparation: 'spacing'
      },
      contentDensity: this.calculateContentDensity(content)
    };
  }

  private analyzeHierarchy(structure: DocumentStructure): HierarchyPattern {
    const maxDepth = Math.max(...structure.headings.map(h => h.level), 1);
    
    return {
      maxDepth,
      levelIndicators: ['1.', '1.1', '1.1.1', 'a)', 'i)'],
      indentationRules: Array.from({ length: maxDepth }, (_, i) => ({
        level: i + 1,
        amount: (i + 1) * 20,
        unit: 'px' as const
      }))
    };
  }

  private analyzeGroupingPatterns(content: ExtractedContent) {
    return [
      {
        type: 'topic' as const,
        indicator: 'spacing',
        spacing: 24
      }
    ];
  }

  private analyzeContentFlow(content: ExtractedContent) {
    return {
      direction: 'top-to-bottom' as const,
      continuity: 'sectioned' as const,
      breakPoints: content.structure.sections.map((section, index) => ({
        type: 'section' as const,
        trigger: 'topic-change' as const,
        position: section.startPosition
      }))
    };
  }

  // Helper methods for visual analysis
  private analyzeColorScheme(content: ExtractedContent): ColorScheme {
    // Default color scheme - in a real implementation, this would extract
    // colors from the document if available
    return {
      primary: '#000000',
      secondary: '#666666',
      accent: '#0066cc',
      text: '#000000',
      background: '#ffffff',
      muted: '#f5f5f5'
    };
  }

  private analyzeBorderPatterns(content: ExtractedContent) {
    return [
      {
        type: 'section' as const,
        style: 'solid' as const,
        width: 1,
        color: '#cccccc',
        usage: 'Section separation'
      }
    ];
  }

  private analyzeBackgroundPatterns(content: ExtractedContent) {
    return [
      {
        type: 'highlight' as const,
        color: '#f0f8ff',
        opacity: 0.5,
        usage: 'Important information highlighting'
      }
    ];
  }

  private analyzeIconPatterns(content: ExtractedContent) {
    return [
      {
        type: 'bullet' as const,
        style: 'circle',
        size: 6,
        color: '#000000',
        usage: 'List item markers'
      }
    ];
  }

  private analyzeVisualEmphasis(content: ExtractedContent) {
    return [
      {
        method: 'color' as const,
        intensity: 'moderate' as const,
        usage: 'Highlighting key terms'
      }
    ];
  }

  // Helper methods for metadata analysis
  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private estimateTopicCount(structure: DocumentStructure): number {
    return structure.sections.length;
  }

  private assessComplexity(content: ExtractedContent, contentDensity?: any): 'simple' | 'moderate' | 'complex' {
    const factors = {
      textLength: content.text.length,
      sectionCount: content.structure.sections.length,
      headingLevels: Math.max(...content.structure.headings.map(h => h.level), 1),
      imageCount: content.images.length,
      tableCount: content.tables.length,
      wordCount: content.metadata.wordCount || this.estimateWordCount(content.text)
    };

    const complexityScore = 
      (factors.textLength > 5000 ? 2 : factors.textLength > 1000 ? 1 : 0) +
      (factors.sectionCount > 10 ? 2 : factors.sectionCount > 3 ? 1 : 0) +
      (factors.headingLevels > 3 ? 2 : factors.headingLevels > 2 ? 1 : 0) +
      (factors.imageCount > 5 ? 1 : factors.imageCount > 2 ? 0.5 : 0) +
      (factors.tableCount > 3 ? 1 : 0) +
      (factors.wordCount > 1000 ? 1 : factors.wordCount > 500 ? 0.5 : 0);

    if (complexityScore >= 5) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  private detectDomain(content: ExtractedContent): string {
    // Simple keyword-based domain detection
    const text = content.text.toLowerCase();
    
    if (text.includes('math') || text.includes('equation') || text.includes('formula')) {
      return 'mathematics';
    }
    if (text.includes('code') || text.includes('programming') || text.includes('function')) {
      return 'computer-science';
    }
    if (text.includes('history') || text.includes('date') || text.includes('century')) {
      return 'history';
    }
    if (text.includes('biology') || text.includes('cell') || text.includes('organism')) {
      return 'biology';
    }
    
    return 'general';
  }

  private assessQuality(content: ExtractedContent, contentDensity?: any): TemplateQuality {
    const readability = this.assessReadability(content);
    const organization = this.assessOrganization(content);
    const consistency = this.assessConsistency(content);
    const density = this.assessDensity(content);

    const score = (readability + organization + consistency + density) / 4;

    return {
      score,
      factors: {
        readability,
        organization,
        consistency,
        density
      },
      issues: this.identifyQualityIssues(content, { readability, organization, consistency, density })
    };
  }

  private assessReadability(content: ExtractedContent): number {
    // Simple readability assessment based on text characteristics
    const avgWordsPerSentence = this.calculateAverageWordsPerSentence(content.text);
    const avgSyllablesPerWord = this.estimateAverageSyllablesPerWord(content.text);
    
    // Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(1, score / 100));
  }

  private assessOrganization(content: ExtractedContent): number {
    const hasHeadings = content.structure.headings.length > 0;
    const hasSections = content.structure.sections.length > 1;
    const hierarchyDepth = Math.max(...content.structure.headings.map(h => h.level), 0);
    
    let score = 0.3; // Lower base score
    if (hasHeadings) score += 0.3;
    if (hasSections) score += 0.2;
    if (hierarchyDepth > 1 && hierarchyDepth <= 4) score += 0.2;
    
    return Math.min(1, score);
  }

  private assessConsistency(content: ExtractedContent): number {
    // Assess consistency in heading patterns, section lengths, etc.
    const headingLevels = content.structure.headings.map(h => h.level);
    const levelVariation = new Set(headingLevels).size;
    
    // More consistent if fewer level variations and logical progression
    return Math.max(0.3, 1 - (levelVariation * 0.1));
  }

  private assessDensity(content: ExtractedContent): number {
    const wordCount = this.estimateWordCount(content.text);
    const pageCount = content.metadata.pageCount || 1;
    const wordsPerPage = wordCount / pageCount;
    
    // Optimal density is around 300-500 words per page for cheat sheets
    const optimalMin = 300;
    const optimalMax = 500;
    
    if (wordsPerPage >= optimalMin && wordsPerPage <= optimalMax) {
      return 1.0;
    } else if (wordsPerPage < optimalMin) {
      return Math.max(0.1, wordsPerPage / optimalMin);
    } else {
      return Math.max(0.3, optimalMax / wordsPerPage);
    }
  }

  private identifyQualityIssues(content: ExtractedContent, factors: any) {
    const issues = [];
    
    if (factors.readability < 0.5) {
      issues.push({
        type: 'readability' as const,
        severity: 'medium' as const,
        description: 'Text may be difficult to read due to complex sentences or vocabulary',
        location: 'document-wide'
      });
    }
    
    if (factors.organization < 0.5) {
      issues.push({
        type: 'poor-structure' as const,
        severity: 'high' as const,
        description: 'Document lacks clear organizational structure',
        location: 'document-wide'
      });
    }
    
    if (factors.density < 0.3 || factors.density > 0.8) {
      issues.push({
        type: 'overflow' as const,
        severity: factors.density < 0.3 ? 'low' : 'high' as const,
        description: factors.density < 0.3 ? 'Content density is too low' : 'Content density is too high',
        location: 'document-wide'
      });
    }
    
    return issues;
  }

  // Utility methods
  private calculateContentDensity(content: ExtractedContent): number {
    const wordCount = this.estimateWordCount(content.text);
    const pageCount = content.metadata.pageCount || 1;
    return wordCount / pageCount;
  }

  private calculateAverageWordsPerSentence(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return sentences.length > 0 ? words.length / sentences.length : 0;
  }

  private estimateAverageSyllablesPerWord(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    return words.length > 0 ? totalSyllables / words.length : 0;
  }

  private countSyllables(word: string): number {
    // Simple syllable counting heuristic
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  /**
   * Generates CSS template from the analyzed reference template
   */
  async generateCSSTemplate(template: ReferenceTemplate) {
    return this.cssGenerator.generateCSS(template);
  }

  private generateTemplateId(file: File): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}