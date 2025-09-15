// AI Content Quality Verifier
// Analyzes and improves content quality before study guide generation
// Prevents useless bullet points and redundant information

import OpenAI from 'openai';

export interface ContentQualityConfig {
  enableAIVerification: boolean;
  openaiApiKey?: string;
  minContentLength: number;
  maxRedundancyThreshold: number;
  requireEducationalValue: boolean;
  filterBulletPoints: boolean;
}

export interface ContentAnalysisResult {
  isHighQuality: boolean;
  qualityScore: number; // 0-1 scale
  issues: ContentIssue[];
  suggestions: string[];
  improvedContent?: string;
  metadata: {
    originalLength: number;
    improvedLength?: number;
    redundancyReduction: number;
    educationalValueScore: number;
  };
}

export interface ContentIssue {
  type: 'redundancy' | 'low_value' | 'fragmentation' | 'incoherent' | 'bullet_spam';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
  suggestion?: string;
}

export interface VerifiedContent {
  originalContent: string;
  verifiedContent: string;
  qualityImprovement: number;
  issuesFixed: ContentIssue[];
  preservedElements: {
    formulas: any[];
    examples: any[];
    definitions: any[];
  };
}

export class AIContentQualityVerifier {
  private openai: OpenAI | null = null;
  private config: ContentQualityConfig;

  constructor(config: Partial<ContentQualityConfig> = {}) {
    this.config = {
      enableAIVerification: true,
      minContentLength: 100,
      maxRedundancyThreshold: 0.3,
      requireEducationalValue: true,
      filterBulletPoints: true,
      ...config
    };

    // Initialize OpenAI if API key is provided
    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey
      });
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Verify and improve content quality
   */
  async verifyAndImproveContent(
    content: string,
    context: { fileName?: string; subject?: string; type?: string } = {}
  ): Promise<VerifiedContent> {
    console.log('🔍 Starting AI content quality verification...');

    // First, analyze content quality
    const analysis = await this.analyzeContentQuality(content, context);
    
    if (analysis.qualityScore >= 0.7 && analysis.issues.length === 0) {
      console.log('✅ Content quality is already high, no improvements needed');
      return {
        originalContent: content,
        verifiedContent: content,
        qualityImprovement: 0,
        issuesFixed: [],
        preservedElements: this.extractPreservedElements(content)
      };
    }

    // Improve content if quality is low
    const improvedContent = await this.improveContentQuality(content, analysis, context);
    
    return {
      originalContent: content,
      verifiedContent: improvedContent,
      qualityImprovement: analysis.qualityScore,
      issuesFixed: analysis.issues,
      preservedElements: this.extractPreservedElements(content)
    };
  }

  /**
   * Analyze content quality and identify issues
   */
  async analyzeContentQuality(
    content: string,
    context: { fileName?: string; subject?: string; type?: string } = {}
  ): Promise<ContentAnalysisResult> {
    const issues: ContentIssue[] = [];
    let qualityScore = 1.0;

    // Check content length
    if (content.length < this.config.minContentLength) {
      issues.push({
        type: 'low_value',
        severity: 'high',
        description: 'Content is too short to be educational',
        suggestion: 'Expand content with more detailed explanations'
      });
      qualityScore -= 0.3;
    }

    // Check for bullet point spam
    const bulletPointIssues = this.detectBulletPointSpam(content);
    issues.push(...bulletPointIssues);
    qualityScore -= bulletPointIssues.length * 0.1;

    // Check for redundancy
    const redundancyScore = this.calculateRedundancy(content);
    if (redundancyScore > this.config.maxRedundancyThreshold) {
      issues.push({
        type: 'redundancy',
        severity: 'medium',
        description: `High redundancy detected (${Math.round(redundancyScore * 100)}%)`,
        suggestion: 'Remove repetitive content and consolidate similar information'
      });
      qualityScore -= redundancyScore * 0.5;
    }

    // Check for fragmentation
    const fragmentationIssues = this.detectFragmentation(content);
    issues.push(...fragmentationIssues);
    qualityScore -= fragmentationIssues.length * 0.05;

    // Check educational value using AI if available
    let educationalValueScore = 0.5;
    if (this.openai && this.config.requireEducationalValue) {
      educationalValueScore = await this.assessEducationalValue(content, context);
      if (educationalValueScore < 0.4) {
        issues.push({
          type: 'low_value',
          severity: 'high',
          description: 'Content lacks educational value',
          suggestion: 'Add more explanations, examples, and structured learning content'
        });
        qualityScore -= 0.4;
      }
    }

    // Ensure quality score is between 0 and 1
    qualityScore = Math.max(0, Math.min(1, qualityScore));

    return {
      isHighQuality: qualityScore >= 0.7 && issues.filter(i => i.severity === 'high').length === 0,
      qualityScore,
      issues,
      suggestions: issues.map(issue => issue.suggestion).filter(Boolean) as string[],
      metadata: {
        originalLength: content.length,
        redundancyReduction: redundancyScore,
        educationalValueScore
      }
    };
  }

  /**
   * Detect bullet point spam and meaningless lists
   */
  private detectBulletPointSpam(content: string): ContentIssue[] {
    const issues: ContentIssue[] = [];
    const lines = content.split('\n');
    
    // Count bullet points
    const bulletLines = lines.filter(line => 
      /^\s*[•·\-\*]\s/.test(line) || /^\s*\d+\.\s/.test(line)
    );
    
    const bulletRatio = bulletLines.length / lines.length;
    
    if (bulletRatio > 0.6) {
      issues.push({
        type: 'bullet_spam',
        severity: 'high',
        description: `Excessive bullet points detected (${Math.round(bulletRatio * 100)}% of content)`,
        suggestion: 'Convert bullet points to coherent paragraphs with explanations'
      });
    }

    // Check for repetitive bullet points
    const bulletTexts = bulletLines.map(line => 
      line.replace(/^\s*[•·\-\*\d\.]\s*/, '').trim().toLowerCase()
    );
    
    const uniqueBullets = new Set(bulletTexts);
    const repetitionRatio = 1 - (uniqueBullets.size / bulletTexts.length);
    
    if (repetitionRatio > 0.3 && bulletTexts.length > 5) {
      issues.push({
        type: 'redundancy',
        severity: 'medium',
        description: `Repetitive bullet points detected (${Math.round(repetitionRatio * 100)}% repetition)`,
        suggestion: 'Remove duplicate bullet points and consolidate similar items'
      });
    }

    // Check for meaningless bullet points
    const meaninglessBullets = bulletTexts.filter(text => 
      text.length < 10 || 
      /^(basic|more|complex|simple|advanced|general)$/i.test(text) ||
      /^[a-z\s]{1,15}$/i.test(text)
    );
    
    if (meaninglessBullets.length > bulletTexts.length * 0.4) {
      issues.push({
        type: 'low_value',
        severity: 'high',
        description: 'Many bullet points lack meaningful content',
        suggestion: 'Replace vague bullet points with specific, informative content'
      });
    }

    return issues;
  }

  /**
   * Calculate content redundancy score
   */
  private calculateRedundancy(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 2) return 0;

    let redundantPairs = 0;
    const totalPairs = sentences.length * (sentences.length - 1) / 2;

    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const similarity = this.calculateSimilarity(
          sentences[i].trim().toLowerCase(),
          sentences[j].trim().toLowerCase()
        );
        if (similarity > 0.7) {
          redundantPairs++;
        }
      }
    }

    return redundantPairs / totalPairs;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const commonWords = words1.filter(word => 
      words2.includes(word) && word.length > 3
    );
    
    const totalWords = Math.max(words1.length, words2.length);
    return commonWords.length / totalWords;
  }

  /**
   * Detect content fragmentation
   */
  private detectFragmentation(content: string): ContentIssue[] {
    const issues: ContentIssue[] = [];
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    // Check for very short paragraphs
    const shortParagraphs = paragraphs.filter(p => p.trim().length < 50);
    if (shortParagraphs.length > paragraphs.length * 0.5) {
      issues.push({
        type: 'fragmentation',
        severity: 'medium',
        description: 'Content is highly fragmented with many short paragraphs',
        suggestion: 'Combine related short paragraphs into coherent sections'
      });
    }

    // Check for lack of structure
    const hasHeaders = /^#{1,6}\s/.test(content) || /^\d+\.\s/.test(content);
    if (!hasHeaders && paragraphs.length > 5) {
      issues.push({
        type: 'fragmentation',
        severity: 'low',
        description: 'Content lacks clear structure and headers',
        suggestion: 'Add section headers to organize content logically'
      });
    }

    return issues;
  }

  /**
   * Assess educational value using AI
   */
  private async assessEducationalValue(
    content: string,
    context: { fileName?: string; subject?: string; type?: string }
  ): Promise<number> {
    if (!this.openai) return 0.5;

    try {
      const prompt = `Analyze the educational value of this academic content on a scale of 0-1:

Content: "${content.substring(0, 1000)}..."
Context: ${JSON.stringify(context)}

Rate the educational value based on:
1. Clarity of explanations
2. Presence of examples and applications
3. Logical structure and flow
4. Depth of information
5. Usefulness for learning

Respond with only a number between 0 and 1.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.1
      });

      const scoreText = response.choices[0]?.message?.content?.trim();
      const score = parseFloat(scoreText || '0.5');
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));

    } catch (error) {
      console.warn('Failed to assess educational value:', error);
      return 0.5;
    }
  }

  /**
   * Improve content quality using AI
   */
  private async improveContentQuality(
    content: string,
    analysis: ContentAnalysisResult,
    context: { fileName?: string; subject?: string; type?: string }
  ): Promise<string> {
    if (!this.openai) {
      return this.improveContentWithoutAI(content, analysis);
    }

    try {
      const prompt = `Improve this academic content by addressing the following issues:

Original Content:
"${content}"

Issues to fix:
${analysis.issues.map(issue => `- ${issue.type}: ${issue.description}`).join('\n')}

Context: ${JSON.stringify(context)}

Please:
1. Remove redundant and repetitive content
2. Convert meaningless bullet points to coherent explanations
3. Add educational value with clear explanations
4. Maintain all mathematical formulas and examples
5. Create logical structure with proper flow
6. Ensure content is informative and useful for studying

Return only the improved content without any meta-commentary.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      });

      const improvedContent = response.choices[0]?.message?.content?.trim();
      return improvedContent || this.improveContentWithoutAI(content, analysis);

    } catch (error) {
      console.warn('AI content improvement failed, using fallback:', error);
      return this.improveContentWithoutAI(content, analysis);
    }
  }

  /**
   * Improve content without AI (fallback method)
   */
  private improveContentWithoutAI(
    content: string,
    analysis: ContentAnalysisResult
  ): string {
    let improved = content;

    // Remove excessive bullet points
    if (analysis.issues.some(i => i.type === 'bullet_spam')) {
      improved = this.convertBulletPointsToParagraphs(improved);
    }

    // Remove redundant content
    if (analysis.issues.some(i => i.type === 'redundancy')) {
      improved = this.removeRedundantContent(improved);
    }

    // Combine fragmented content
    if (analysis.issues.some(i => i.type === 'fragmentation')) {
      improved = this.combineFragmentedContent(improved);
    }

    return improved;
  }

  /**
   * Convert bullet points to coherent paragraphs (while preserving mathematical content)
   */
  private convertBulletPointsToParagraphs(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let currentBulletGroup: string[] = [];

    for (const line of lines) {
      const isBullet = /^\s*[•·\-\*]\s/.test(line) || /^\s*\d+\.\s/.test(line);
      
      if (isBullet) {
        const bulletText = line.replace(/^\s*[•·\-\*\d\.]\s*/, '').trim();
        
        // Preserve mathematical content and meaningful bullets
        const hasMath = /\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]/.test(bulletText);
        const hasExample = /example|problem|solution|theorem|definition|formula/i.test(bulletText);
        const hasEquation = /[=<>≤≥≠±∞∑∏∫]/.test(bulletText);
        
        if (bulletText.length > 10 || hasMath || hasExample || hasEquation) {
          currentBulletGroup.push(bulletText);
        }
      } else {
        // Process accumulated bullet group
        if (currentBulletGroup.length > 0) {
          if (currentBulletGroup.length === 1) {
            result.push(currentBulletGroup[0] + '.');
          } else {
            const paragraph = currentBulletGroup.join(', ') + '.';
            result.push(paragraph);
          }
          currentBulletGroup = [];
        }
        
        if (line.trim()) {
          result.push(line);
        }
      }
    }

    // Handle final bullet group
    if (currentBulletGroup.length > 0) {
      const paragraph = currentBulletGroup.join(', ') + '.';
      result.push(paragraph);
    }

    return result.join('\n');
  }

  /**
   * Remove redundant content (while preserving mathematical content)
   */
  private removeRedundantContent(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences: string[] = [];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      // Always preserve sentences with mathematical content
      const hasMath = /\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]/.test(trimmed);
      const hasExample = /example|problem|solution|theorem|definition|formula/i.test(trimmed);
      const hasEquation = /[=<>≤≥≠±∞∑∏∫]/.test(trimmed);
      
      if (hasMath || hasExample || hasEquation) {
        uniqueSentences.push(trimmed);
        continue;
      }
      
      // Check for duplicates only for non-mathematical content
      const isDuplicate = uniqueSentences.some(existing => 
        this.calculateSimilarity(existing.toLowerCase(), trimmed.toLowerCase()) > 0.8
      );
      
      if (!isDuplicate) {
        uniqueSentences.push(trimmed);
      }
    }
    
    return uniqueSentences.join('. ') + '.';
  }

  /**
   * Combine fragmented content
   */
  private combineFragmentedContent(content: string): string {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const combined: string[] = [];
    let currentGroup = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      
      if (trimmed.length < 100 && currentGroup.length < 300) {
        // Combine short paragraphs
        currentGroup += (currentGroup ? ' ' : '') + trimmed;
      } else {
        if (currentGroup) {
          combined.push(currentGroup);
          currentGroup = '';
        }
        combined.push(trimmed);
      }
    }

    if (currentGroup) {
      combined.push(currentGroup);
    }

    return combined.join('\n\n');
  }

  /**
   * Extract elements that should be preserved during improvement
   */
  private extractPreservedElements(content: string): {
    formulas: any[];
    examples: any[];
    definitions: any[];
  } {
    const formulas: any[] = [];
    const examples: any[] = [];
    const definitions: any[] = [];

    // Extract mathematical formulas
    const formulaPatterns = [
      /\$([^$]+)\$/g,
      /\\\(([^)]+)\\\)/g,
      /\\\[([^\]]+)\\\]/g
    ];

    for (const pattern of formulaPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        formulas.push({
          original: match[0],
          content: match[1]
        });
      }
    }

    // Extract examples
    const examplePattern = /Example\s*\d*[:.]\s*([^.!?]*[.!?])/gi;
    let exampleMatch;
    while ((exampleMatch = examplePattern.exec(content)) !== null) {
      examples.push({
        original: exampleMatch[0],
        content: exampleMatch[1]
      });
    }

    // Extract definitions
    const definitionPattern = /Definition\s*\d*[:.]\s*([^.!?]*[.!?])/gi;
    let defMatch;
    while ((defMatch = definitionPattern.exec(content)) !== null) {
      definitions.push({
        original: defMatch[0],
        content: defMatch[1]
      });
    }

    return { formulas, examples, definitions };
  }

  /**
   * Batch verify multiple content pieces
   */
  async batchVerifyContent(
    contents: Array<{ content: string; context?: any }>,
    progressCallback?: (progress: number) => void
  ): Promise<VerifiedContent[]> {
    const results: VerifiedContent[] = [];
    
    for (let i = 0; i < contents.length; i++) {
      const { content, context } = contents[i];
      const verified = await this.verifyAndImproveContent(content, context);
      results.push(verified);
      
      if (progressCallback) {
        progressCallback((i + 1) / contents.length);
      }
    }
    
    return results;
  }
}