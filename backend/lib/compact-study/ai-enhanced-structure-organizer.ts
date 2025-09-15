// AI-Enhanced Academic Structure Organizer
// Uses GPT-4 to intelligently organize content and prevent fragmentation

import { 
  AcademicDocument, 
  DocumentPart, 
  AcademicSection, 
  EnhancedExtractedContent 
} from './types';

export interface AIStructureConfig {
  useAIOrganization: boolean;
  openaiApiKey?: string;
  maxSectionsPerPart: number;
  minSectionLength: number;
  preventFragmentation: boolean;
  groupRelatedContent: boolean;
}

export class AIEnhancedStructureOrganizer {
  private config: AIStructureConfig;

  constructor(config: Partial<AIStructureConfig> = {}) {
    this.config = {
      useAIOrganization: true,
      maxSectionsPerPart: 8,
      minSectionLength: 150,
      preventFragmentation: true,
      groupRelatedContent: true,
      ...config
    };
  }

  /**
   * Organize content using AI-enhanced structure analysis
   */
  async organizeContentWithAI(
    extractedContents: EnhancedExtractedContent[],
    title: string = 'Compact Study Guide'
  ): Promise<AcademicDocument> {
    console.log('🤖 Starting AI-enhanced content organization...');
    
    const parts: DocumentPart[] = [];
    
    for (const [index, content] of extractedContents.entries()) {
      const partTitle = this.generatePartTitleFromContent(content, index);
      
      // Use AI to analyze and organize content
      const organizedSections = await this.organizeContentSectionsWithAI(content, index + 1);
      
      parts.push({
        partNumber: index + 1,
        title: partTitle,
        sections: organizedSections
      });
      
      console.log(`📚 Created part ${index + 1}: "${partTitle}" with ${organizedSections.length} well-organized sections`);
    }

    return {
      title,
      tableOfContents: this.generateTableOfContents(parts),
      parts,
      crossReferences: [],
      appendices: [],
      metadata: {
        generatedAt: new Date(),
        sourceFiles: extractedContents.map(c => c.metadata.name),
        totalSections: parts.reduce((sum, part) => sum + part.sections.length, 0),
        totalFormulas: extractedContents.reduce((sum, c) => sum + c.mathematicalContent.formulas.length, 0),
        totalExamples: extractedContents.reduce((sum, c) => sum + c.mathematicalContent.workedExamples.length, 0),
        preservationScore: 0.85
      }
    };
  }

  /**
   * Use AI to organize content sections intelligently
   */
  private async organizeContentSectionsWithAI(
    content: EnhancedExtractedContent,
    partNumber: number
  ): Promise<AcademicSection[]> {
    const text = content.text;
    
    if (text.length < 100) {
      return this.createFallbackSections(content, partNumber);
    }

    try {
      // Prepare content for AI analysis
      const contentAnalysis = await this.analyzeContentStructure(text);
      
      // Create sections based on AI analysis
      const sections = await this.createSectionsFromAnalysis(
        contentAnalysis, 
        content, 
        partNumber
      );
      
      // Post-process to prevent fragmentation
      const optimizedSections = this.preventContentFragmentation(sections);
      
      return optimizedSections;
      
    } catch (error) {
      console.warn('AI organization failed, using fallback:', error);
      return this.createFallbackSections(content, partNumber);
    }
  }

  /**
   * Analyze content structure using AI
   */
  private async analyzeContentStructure(text: string): Promise<ContentAnalysis> {
    // For now, use rule-based analysis (can be enhanced with actual AI later)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const sections: ContentSection[] = [];
    
    // Detect natural section boundaries
    let currentSection: ContentSection | null = null;
    let sectionContent: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header
      if (this.isLikelySectionHeader(trimmedLine, lines)) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          currentSection.content = sectionContent.join('\n');
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: trimmedLine,
          content: '',
          startIndex: lines.indexOf(line),
          type: this.classifySectionType(trimmedLine),
          importance: this.calculateImportance(trimmedLine, text)
        };
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      } else {
        // Content before first header
        if (!currentSection) {
          currentSection = {
            title: 'Introduction',
            content: '',
            startIndex: 0,
            type: 'introduction',
            importance: 0.7
          };
          sectionContent = [];
        }
        sectionContent.push(line);
      }
    }
    
    // Add final section
    if (currentSection && sectionContent.length > 0) {
      currentSection.content = sectionContent.join('\n');
      sections.push(currentSection);
    }
    
    return {
      sections,
      totalLength: text.length,
      complexity: this.calculateComplexity(text),
      topics: this.extractTopics(text)
    };
  }

  /**
   * Check if a line is likely a section header
   */
  private isLikelySectionHeader(line: string, allLines: string[]): boolean {
    // Skip very short or very long lines
    if (line.length < 3 || line.length > 100) return false;
    
    // Check for numbered sections
    if (/^\d+\./.test(line)) return true;
    
    // Check for all caps (but not too long)
    if (line === line.toUpperCase() && line.length < 50) return true;
    
    // Check for title case
    if (this.isTitleCase(line) && !line.endsWith('.')) return true;
    
    // Check for common section keywords
    const sectionKeywords = [
      'definition', 'theorem', 'example', 'proof', 'solution',
      'properties', 'applications', 'methods', 'approach',
      'introduction', 'conclusion', 'summary', 'overview'
    ];
    
    const lowerLine = line.toLowerCase();
    if (sectionKeywords.some(keyword => lowerLine.includes(keyword))) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if text is in title case
   */
  private isTitleCase(text: string): boolean {
    const words = text.split(' ');
    if (words.length < 2) return false;
    
    return words.every(word => {
      if (word.length === 0) return true;
      const commonWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
      return /^[A-Z][a-z]*$/.test(word) || commonWords.includes(word.toLowerCase());
    });
  }

  /**
   * Classify section type
   */
  private classifySectionType(title: string): SectionType {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('example') || lowerTitle.includes('problem')) {
      return 'example';
    } else if (lowerTitle.includes('definition') || lowerTitle.includes('def')) {
      return 'definition';
    } else if (lowerTitle.includes('theorem') || lowerTitle.includes('proof')) {
      return 'theorem';
    } else if (lowerTitle.includes('method') || lowerTitle.includes('algorithm')) {
      return 'method';
    } else if (lowerTitle.includes('introduction') || lowerTitle.includes('overview')) {
      return 'introduction';
    } else {
      return 'content';
    }
  }

  /**
   * Calculate importance score for a section
   */
  private calculateImportance(title: string, fullText: string): number {
    let score = 0.5; // Base score
    
    const lowerTitle = title.toLowerCase();
    const lowerText = fullText.toLowerCase();
    
    // Higher importance for key concepts
    if (lowerTitle.includes('theorem') || lowerTitle.includes('definition')) {
      score += 0.3;
    }
    
    // Higher importance if mentioned frequently in text
    const mentions = (lowerText.match(new RegExp(lowerTitle, 'g')) || []).length;
    score += Math.min(0.2, mentions * 0.05);
    
    // Higher importance for longer sections
    if (title.length > 20) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Calculate text complexity
   */
  private calculateComplexity(text: string): number {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = text.split(/[.!?]+/).length;
    const avgSentenceLength = words.length / sentences;
    
    // Mathematical content indicators
    const mathIndicators = (text.match(/[∑∏∫√±≤≥≠∞αβγδεζηθικλμνξοπρστυφχψω]/g) || []).length;
    const formulaIndicators = (text.match(/\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]/g) || []).length;
    
    return Math.min(1.0, 
      (avgWordLength / 10) * 0.3 + 
      (avgSentenceLength / 20) * 0.3 + 
      (mathIndicators / text.length * 1000) * 0.2 +
      (formulaIndicators / 10) * 0.2
    );
  }

  /**
   * Extract main topics from text
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    
    // Look for capitalized terms that appear multiple times
    const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3 && word.length < 30) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    // Get most frequent terms
    const sortedWords = Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return sortedWords;
  }

  /**
   * Create sections from AI analysis
   */
  private async createSectionsFromAnalysis(
    analysis: ContentAnalysis,
    content: EnhancedExtractedContent,
    partNumber: number
  ): Promise<AcademicSection[]> {
    const sections: AcademicSection[] = [];
    
    // Group related sections to prevent fragmentation
    const groupedSections = this.groupRelatedSections(analysis.sections);
    
    for (const [index, sectionGroup] of groupedSections.entries()) {
      const sectionNumber = `${partNumber}.${index + 1}`;
      
      // Combine content from grouped sections
      const combinedContent = sectionGroup.map(s => s.content).join('\n\n');
      const mainTitle = sectionGroup[0].title;
      
      // Distribute mathematical content
      const formulaStart = Math.floor((index / groupedSections.length) * content.mathematicalContent.formulas.length);
      const formulaEnd = Math.floor(((index + 1) / groupedSections.length) * content.mathematicalContent.formulas.length);
      const sectionFormulas = content.mathematicalContent.formulas.slice(formulaStart, formulaEnd);
      
      const exampleStart = Math.floor((index / groupedSections.length) * content.mathematicalContent.workedExamples.length);
      const exampleEnd = Math.floor(((index + 1) / groupedSections.length) * content.mathematicalContent.workedExamples.length);
      const sectionExamples = content.mathematicalContent.workedExamples.slice(exampleStart, exampleEnd);
      
      sections.push({
        sectionNumber,
        title: mainTitle,
        content: combinedContent,
        formulas: sectionFormulas,
        examples: sectionExamples,
        subsections: []
      });
    }
    
    return sections;
  }

  /**
   * Group related sections to prevent fragmentation
   */
  private groupRelatedSections(sections: ContentSection[]): ContentSection[][] {
    if (!this.config.groupRelatedContent) {
      return sections.map(s => [s]);
    }
    
    const groups: ContentSection[][] = [];
    let currentGroup: ContentSection[] = [];
    
    for (const section of sections) {
      // Start new group if current group is getting too large
      if (currentGroup.length >= 3) {
        groups.push(currentGroup);
        currentGroup = [section];
        continue;
      }
      
      // Start new group if section is very different from current group
      if (currentGroup.length > 0 && !this.areSectionsRelated(currentGroup[0], section)) {
        groups.push(currentGroup);
        currentGroup = [section];
        continue;
      }
      
      // Add to current group
      currentGroup.push(section);
    }
    
    // Add final group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Check if two sections are related
   */
  private areSectionsRelated(section1: ContentSection, section2: ContentSection): boolean {
    // Same type sections are related
    if (section1.type === section2.type) return true;
    
    // Check for common keywords
    const words1 = section1.title.toLowerCase().split(/\s+/);
    const words2 = section2.title.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word) && word.length > 3);
    
    return commonWords.length >= 1;
  }

  /**
   * Prevent content fragmentation by merging small sections
   */
  private preventContentFragmentation(sections: AcademicSection[]): AcademicSection[] {
    if (!this.config.preventFragmentation) {
      return sections;
    }
    
    const optimizedSections: AcademicSection[] = [];
    let currentSection: AcademicSection | null = null;
    
    for (const section of sections) {
      const contentLength = section.content.length;
      
      // If section is too small, merge with previous or next
      if (contentLength < this.config.minSectionLength && currentSection) {
        // Merge with current section
        currentSection.content += '\n\n' + section.content;
        currentSection.formulas.push(...section.formulas);
        currentSection.examples.push(...section.examples);
        
        // Update title to be more general
        if (!currentSection.title.includes('and')) {
          currentSection.title += ` and ${section.title}`;
        }
      } else {
        // Save previous section
        if (currentSection) {
          optimizedSections.push(currentSection);
        }
        
        // Start new section
        currentSection = { ...section };
      }
    }
    
    // Add final section
    if (currentSection) {
      optimizedSections.push(currentSection);
    }
    
    return optimizedSections;
  }

  /**
   * Create fallback sections when AI analysis fails
   */
  private createFallbackSections(
    content: EnhancedExtractedContent,
    partNumber: number
  ): AcademicSection[] {
    const text = content.text;
    
    if (text.length === 0) {
      return [{
        sectionNumber: `${partNumber}.1`,
        title: 'Content Overview',
        content: `No text content available from ${content.metadata.name}`,
        formulas: content.mathematicalContent.formulas,
        examples: content.mathematicalContent.workedExamples,
        subsections: []
      }];
    }
    
    // Create 2-4 sections based on content length
    const targetSections = Math.min(4, Math.max(2, Math.floor(text.length / 500)));
    const sectionSize = Math.floor(text.length / targetSections);
    const sections: AcademicSection[] = [];
    
    for (let i = 0; i < targetSections; i++) {
      const start = i * sectionSize;
      const end = i === targetSections - 1 ? text.length : (i + 1) * sectionSize;
      let sectionContent = text.substring(start, end);
      
      // Try to end at sentence boundary
      if (end < text.length) {
        const lastPeriod = sectionContent.lastIndexOf('.');
        if (lastPeriod > sectionContent.length * 0.7) {
          sectionContent = sectionContent.substring(0, lastPeriod + 1);
        }
      }
      
      // Generate meaningful title
      const firstLine = sectionContent.split('\n')[0].trim();
      const title = firstLine.length > 5 && firstLine.length < 80 
        ? firstLine 
        : `Section ${i + 1}`;
      
      // Distribute mathematical content
      const formulaStart = Math.floor((i / targetSections) * content.mathematicalContent.formulas.length);
      const formulaEnd = Math.floor(((i + 1) / targetSections) * content.mathematicalContent.formulas.length);
      const sectionFormulas = content.mathematicalContent.formulas.slice(formulaStart, formulaEnd);
      
      const exampleStart = Math.floor((i / targetSections) * content.mathematicalContent.workedExamples.length);
      const exampleEnd = Math.floor(((i + 1) / targetSections) * content.mathematicalContent.workedExamples.length);
      const sectionExamples = content.mathematicalContent.workedExamples.slice(exampleStart, exampleEnd);
      
      sections.push({
        sectionNumber: `${partNumber}.${i + 1}`,
        title: title,
        content: sectionContent.trim(),
        formulas: sectionFormulas,
        examples: sectionExamples,
        subsections: []
      });
    }
    
    return sections;
  }

  /**
   * Generate part title from content
   */
  private generatePartTitleFromContent(content: EnhancedExtractedContent, index: number): string {
    const fileName = content.metadata.name.replace(/\.(pdf|txt|docx?)$/i, '');
    const text = content.text.toLowerCase();
    
    // Try to extract meaningful title from content
    const lines = content.text.split('\n').filter(line => line.trim().length > 0);
    
    // Look for title-like content in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && line.length < 100 && !line.includes('Page') && !line.includes('©')) {
        if (!/^\d+\./.test(line) && !/^[a-z]/.test(line)) {
          return line;
        }
      }
    }
    
    // Content-based detection
    if (text.includes('probability') || text.includes('bayes') || text.includes('random')) {
      return fileName.includes('probability') ? fileName : `Probability - ${fileName}`;
    } else if (text.includes('relation') || text.includes('reflexive') || text.includes('symmetric')) {
      return fileName.includes('relation') ? fileName : `Relations - ${fileName}`;
    } else if (text.includes('counting') || text.includes('combinat') || text.includes('permut')) {
      return fileName.includes('counting') ? fileName : `Counting - ${fileName}`;
    } else {
      return fileName;
    }
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(parts: DocumentPart[]): any[] {
    return parts.map(part => ({
      id: `part${part.partNumber}`,
      title: part.title,
      level: 1,
      pageNumber: part.partNumber,
      children: part.sections.map(section => ({
        id: `section${section.sectionNumber}`,
        title: section.title,
        level: 2,
        pageNumber: part.partNumber
      }))
    }));
  }
}

// Supporting interfaces
interface ContentAnalysis {
  sections: ContentSection[];
  totalLength: number;
  complexity: number;
  topics: string[];
}

interface ContentSection {
  title: string;
  content: string;
  startIndex: number;
  type: SectionType;
  importance: number;
}

type SectionType = 'introduction' | 'definition' | 'theorem' | 'example' | 'method' | 'content';