// Academic Structure Organizer for Compact Study Generator
// Organizes content into academic structure with proper numbering and cross-references

import {
  AcademicStructure,
  DocumentPart,
  AcademicSection,
  CrossReference,
  NumberingScheme,
  MathematicalContent,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  EnhancedExtractedContent
} from './types';
import { CrossReferenceSystem, createCrossReferenceSystem } from './cross-reference-system';

export interface AcademicDocument {
  title: string;
  tableOfContents: TOCEntry[];
  parts: DocumentPart[];
  crossReferences: CrossReference[];
  appendices: Appendix[];
  metadata: DocumentMetadata;
}

export interface TOCEntry {
  level: number;
  title: string;
  sectionNumber?: string;
  pageAnchor: string;
  children: TOCEntry[];
}

export interface Appendix {
  id: string;
  title: string;
  content: string;
  type: 'exercises' | 'answers' | 'references' | 'formulas';
}

export interface DocumentMetadata {
  generatedAt: Date;
  sourceFiles: string[];
  totalSections: number;
  totalFormulas: number;
  totalExamples: number;
  preservationScore: number;
}

export interface AcademicStructureConfig {
  enableCrossReferences: boolean;
  generateTableOfContents: boolean;
  numberingScheme: NumberingScheme;
  partTitles: {
    part1: string;
    part2: string;
  };
  sectionTitles: {
    probability: string[];
    relations: string[];
  };
}

export class AcademicStructureOrganizer {
  private config: AcademicStructureConfig;
  private crossReferenceCounter: number = 1;
  private crossRefSystem: CrossReferenceSystem;

  constructor(config?: Partial<AcademicStructureConfig>) {
    this.config = {
      enableCrossReferences: true,
      generateTableOfContents: true,
      numberingScheme: {
        sections: true,
        examples: true,
        formulas: true,
        theorems: true,
        definitions: true
      },
      partTitles: {
        part1: 'Discrete Probability',
        part2: 'Relations'
      },
      sectionTitles: {
        probability: [
          'Probability Basics',
          'Complements and Unions',
          'Conditional Probability',
          'Bayes\' Theorem',
          'Independence',
          'Bernoulli Trials',
          'Random Variables',
          'Expected Value, Variance, and Standard Deviation'
        ],
        relations: [
          'Relation Definitions and Properties',
          'Reflexive, Irreflexive, Symmetric, Antisymmetric, Transitive',
          'Combining Relations',
          'N-ary Relations',
          'SQL-style Operations'
        ]
      },
      ...config
    };

    // Initialize cross-reference system
    this.crossRefSystem = createCrossReferenceSystem({
      enableAutoGeneration: this.config.enableCrossReferences,
      confidenceThreshold: 0.6,
      maxDistance: 3
    });
  }

  /**
   * Organizes extracted content into academic document structure - FORCE ACTUAL CONTENT
   */
  public organizeContent(
    extractedContents: EnhancedExtractedContent[],
    title: string = 'Compact Study Guide'
  ): AcademicDocument {
    console.log(`🔍 Organizing content: ${extractedContents.length} files, total text: ${extractedContents.reduce((sum, c) => sum + c.text.length, 0)} chars`);
    
    // Check if we have substantial actual content
    const totalTextLength = extractedContents.reduce((sum, content) => sum + content.text.length, 0);
    const hasSubstantialContent = totalTextLength > 100;
    
    if (hasSubstantialContent) {
      console.log(`✅ Using content-based organization for ${totalTextLength} characters`);
      return this.createContentBasedDocument(extractedContents, title);
    } else {
      console.log(`⚠️ Limited content (${totalTextLength} chars), using minimal structure`);
      return this.createMinimalDocument(extractedContents, title);
    }
  }

  /**
   * Create document based on actual content structure
   */
  private createContentBasedDocument(
    extractedContents: EnhancedExtractedContent[],
    title: string
  ): AcademicDocument {
    const parts: DocumentPart[] = [];
    
    extractedContents.forEach((content, index) => {
      const fileName = content.metadata.name;
      const partTitle = this.generatePartTitleFromContent(content, index);
      
      // Split content into logical sections based on actual content
      const sections = this.createSectionsFromActualContent(content, index + 1);
      
      parts.push({
        partNumber: index + 1,
        title: partTitle,
        sections
      });
      
      console.log(`📄 Created part ${index + 1}: "${partTitle}" with ${sections.length} sections from ${fileName}`);
    });

    const metadata = this.generateMetadata(extractedContents, parts);
    const tableOfContents = this.generateTableOfContents(parts);

    return {
      title,
      tableOfContents,
      parts,
      crossReferences: [],
      appendices: [],
      metadata
    };
  }

  /**
   * Generate part title from actual content
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
        // This might be a title
        if (!/^\d+\./.test(line) && !/^[a-z]/.test(line)) { // Not a numbered item or lowercase start
          return line;
        }
      }
    }
    
    // Fallback to content-based detection
    if (text.includes('probability') || text.includes('bayes') || text.includes('random')) {
      return `Discrete Probability (${fileName})`;
    } else if (text.includes('relation') || text.includes('reflexive') || text.includes('symmetric')) {
      return `Relations (${fileName})`;
    } else if (text.includes('counting') || text.includes('combinat') || text.includes('permut')) {
      return `Counting and Combinatorics (${fileName})`;
    } else {
      return fileName;
    }
  }

  /**
   * Create sections from actual content structure
   */
  private createSectionsFromActualContent(content: EnhancedExtractedContent, partNumber: number): AcademicSection[] {
    const sections: AcademicSection[] = [];
    const text = content.text;
    
    if (text.length === 0) {
      return [{
        sectionNumber: `${partNumber}.1`,
        title: 'Content Overview',
        content: `No text content available from ${content.metadata.name}`,
        formulas: [],
        examples: [],
        subsections: []
      }];
    }

    // Strategy 1: Look for natural section breaks
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const potentialSections: { title: string; startIndex: number; content: string }[] = [];
    
    // Look for section headers (lines that look like titles)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Potential section header patterns
      if (
        /^\d+\./.test(line) || // Numbered sections
        /^[A-Z][^.]*[^.]$/.test(line) && line.length < 80 || // Title case without period
        /^[A-Z\s]+$/.test(line) && line.length > 3 && line.length < 50 // ALL CAPS
      ) {
        potentialSections.push({
          title: line,
          startIndex: i,
          content: ''
        });
      }
    }

    // If we found potential sections, use them
    if (potentialSections.length > 1) {
      for (let i = 0; i < potentialSections.length; i++) {
        const section = potentialSections[i];
        const nextSection = potentialSections[i + 1];
        
        const startLine = section.startIndex + 1;
        const endLine = nextSection ? nextSection.startIndex : lines.length;
        
        const sectionContent = lines.slice(startLine, endLine).join('\n').trim();
        
        if (sectionContent.length > 10) { // Only include sections with substantial content
          sections.push({
            sectionNumber: `${partNumber}.${sections.length + 1}`,
            title: section.title,
            content: sectionContent,
            formulas: content.mathematicalContent.formulas.slice(i * 2, (i + 1) * 2), // Distribute formulas
            examples: content.mathematicalContent.workedExamples.slice(i, i + 1), // Distribute examples
            subsections: []
          });
        }
      }
    }

    // Strategy 2: If no clear sections, split content into chunks
    if (sections.length === 0) {
      const chunkSize = Math.max(200, Math.floor(text.length / 3)); // Aim for 3 sections
      const chunks = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, Math.min(i + chunkSize, text.length));
        if (chunk.trim().length > 50) {
          chunks.push(chunk.trim());
        }
      }
      
      chunks.forEach((chunk, index) => {
        // Try to find a meaningful title from the chunk
        const firstLine = chunk.split('\n')[0].trim();
        const title = firstLine.length > 5 && firstLine.length < 80 
          ? firstLine 
          : `Section ${index + 1}`;
        
        sections.push({
          sectionNumber: `${partNumber}.${index + 1}`,
          title: title,
          content: chunk,
          formulas: content.mathematicalContent.formulas.slice(index * 2, (index + 1) * 2),
          examples: content.mathematicalContent.workedExamples.slice(index, index + 1),
          subsections: []
        });
      });
    }

    // Ensure we have at least one section
    if (sections.length === 0) {
      sections.push({
        sectionNumber: `${partNumber}.1`,
        title: 'Content Overview',
        content: text.substring(0, Math.min(1000, text.length)),
        formulas: content.mathematicalContent.formulas,
        examples: content.mathematicalContent.workedExamples,
        subsections: []
      });
    }

    return sections;
  }

  /**
   * Create minimal document for very limited content
   */
  private createMinimalDocument(
    extractedContents: EnhancedExtractedContent[],
    title: string
  ): AcademicDocument {
    const parts: DocumentPart[] = [];
    
    extractedContents.forEach((content, index) => {
      const fileName = content.metadata.name;
      
      parts.push({
        partNumber: index + 1,
        title: fileName.replace(/\.(pdf|txt|docx?)$/i, ''),
        sections: [{
          sectionNumber: `${index + 1}.1`,
          title: 'Document Content',
          content: content.text.length > 0 
            ? content.text 
            : `File: ${fileName} (${content.metadata.size} bytes)\nContent extraction was limited.`,
          formulas: content.mathematicalContent.formulas,
          examples: content.mathematicalContent.workedExamples,
          subsections: []
        }]
      });
    });

    const metadata = this.generateMetadata(extractedContents, parts);
    const tableOfContents = this.generateTableOfContents(parts);

    return {
      title,
      tableOfContents,
      parts,
      crossReferences: [],
      appendices: [],
      metadata
    };
  }

  /**
   * Creates a document part with organized sections
   */
  private createDocumentPart(
    partNumber: number,
    title: string,
    content: EnhancedExtractedContent[],
    sectionTitles: string[]
  ): DocumentPart {
    const sections: AcademicSection[] = [];

    sectionTitles.forEach((sectionTitle, index) => {
      const sectionNumber = `${partNumber}.${index + 1}`;
      const sectionContent = this.extractSectionContent(content, sectionTitle, index);
      
      const section: AcademicSection = {
        sectionNumber,
        title: sectionTitle,
        content: sectionContent.text,
        formulas: this.numberFormulas(sectionContent.formulas, sectionNumber),
        examples: this.numberExamples(sectionContent.examples, sectionNumber),
        subsections: [] // No subsections for now, can be extended later
      };

      sections.push(section);
    });

    return {
      partNumber,
      title,
      sections
    };
  }

  /**
   * Filters content by academic subject type
   */
  private filterContentByType(
    contents: EnhancedExtractedContent[],
    type: 'probability' | 'relations'
  ): EnhancedExtractedContent[] {
    return contents.filter(content => {
      const text = content.text.toLowerCase();
      
      if (type === 'probability') {
        return text.includes('probability') || 
               text.includes('bayes') || 
               text.includes('bernoulli') || 
               text.includes('random variable') ||
               text.includes('expected value') ||
               text.includes('variance');
      } else {
        return text.includes('relation') || 
               text.includes('reflexive') || 
               text.includes('symmetric') || 
               text.includes('transitive') ||
               text.includes('sql') ||
               text.includes('n-ary');
      }
    });
  }

  /**
   * Extracts content relevant to a specific section - FORCE ACTUAL CONTENT USAGE
   */
  private extractSectionContent(
    contents: EnhancedExtractedContent[],
    sectionTitle: string,
    sectionIndex: number
  ): { text: string; formulas: Formula[]; examples: WorkedExample[] } {
    let combinedText = '';
    let allFormulas: Formula[] = [];
    let allExamples: WorkedExample[] = [];

    // FORCE: Always use actual content, never generate placeholders
    const totalTextLength = contents.reduce((sum, content) => sum + content.text.length, 0);
    
    if (totalTextLength === 0) {
      return {
        text: `No content available for ${sectionTitle}`,
        formulas: [],
        examples: []
      };
    }

    // Strategy 1: Distribute actual content across sections
    const totalSections = 13; // Total sections across both parts
    const contentPerSection = Math.max(50, Math.floor(totalTextLength / totalSections));
    const sectionStartIndex = sectionIndex * contentPerSection;
    
    contents.forEach(content => {
      if (content.text.length > 0) {
        // Extract actual content chunk for this section
        const sectionEndIndex = Math.min(content.text.length, sectionStartIndex + contentPerSection);
        let sectionText = content.text.substring(sectionStartIndex, sectionEndIndex);
        
        // If this section's chunk is empty, take content from anywhere in the document
        if (sectionText.trim().length < 20) {
          const fallbackStart = (sectionIndex * 200) % content.text.length;
          const fallbackEnd = Math.min(content.text.length, fallbackStart + 300);
          sectionText = content.text.substring(fallbackStart, fallbackEnd);
        }
        
        // Clean up the text to avoid cutting words mid-sentence
        if (sectionText.length > 0) {
          // Find the last complete sentence or at least complete word
          const lastPeriod = sectionText.lastIndexOf('.');
          const lastSpace = sectionText.lastIndexOf(' ');
          
          if (lastPeriod > sectionText.length * 0.7) {
            sectionText = sectionText.substring(0, lastPeriod + 1);
          } else if (lastSpace > sectionText.length * 0.8) {
            sectionText = sectionText.substring(0, lastSpace);
          }
          
          combinedText += `**${sectionTitle}**\n\n${sectionText.trim()}\n\n`;
        }
        
        // Include ALL mathematical content - don't filter
        allFormulas.push(...content.mathematicalContent.formulas);
        allExamples.push(...content.mathematicalContent.workedExamples);
      }
    });

    // Strategy 2: If still no content, use different approach
    if (combinedText.trim().length < 50 && contents.length > 0) {
      // Take content based on section index from different parts of the document
      const content = contents[0];
      const chunkSize = Math.max(100, Math.floor(content.text.length / 10));
      const startPos = (sectionIndex * chunkSize) % Math.max(1, content.text.length - chunkSize);
      const endPos = Math.min(content.text.length, startPos + chunkSize);
      
      const chunk = content.text.substring(startPos, endPos);
      if (chunk.trim().length > 0) {
        combinedText = `**${sectionTitle}**\n\n${chunk.trim()}\n\n`;
      }
    }

    // Strategy 3: Last resort - use any available text
    if (combinedText.trim().length < 20 && contents.length > 0) {
      const availableText = contents.map(c => c.text).join(' ').trim();
      if (availableText.length > 0) {
        const maxLength = Math.min(200, availableText.length);
        const textChunk = availableText.substring(0, maxLength);
        combinedText = `**${sectionTitle}**\n\n${textChunk}${textChunk.length < availableText.length ? '...' : ''}\n\n`;
      }
    }

    // Final fallback - but still use actual file info
    if (combinedText.trim().length === 0) {
      const fileNames = contents.map(c => c.metadata.name).join(', ');
      const totalSize = contents.reduce((sum, c) => sum + c.metadata.size, 0);
      combinedText = `**${sectionTitle}**\n\nContent from: ${fileNames}\nTotal size: ${totalSize} bytes\n\nNote: Content extraction was limited. Please refer to the original document.`;
    }

    return {
      text: combinedText.trim(),
      formulas: allFormulas,
      examples: allExamples
    };
  }

  /**
   * Create educational placeholder content when source content is limited
   */
  private createEducationalPlaceholder(sectionTitle: string, keywords: string[], actualText?: string): string {
    // If we have actual text, try to extract relevant portions first
    if (actualText && actualText.length > 100) {
      const relevantText = this.extractRelevantTextFromActual(actualText, keywords);
      if (relevantText.length > 50) {
        return `**${sectionTitle}**\n\n${relevantText}\n\n*Note: Content extracted from source document. Additional study material may be helpful.*`;
      }
    }
    const placeholders: { [key: string]: string } = {
      'Probability Basics': `
**${sectionTitle}**

Key concepts to study:
• Sample space and events
• Basic probability rules: P(A) = favorable outcomes / total outcomes
• Properties: 0 ≤ P(A) ≤ 1, P(S) = 1, P(∅) = 0

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Complements and Unions': `
**${sectionTitle}**

Key formulas:
• Complement: P(A') = 1 - P(A)
• Union: P(A ∪ B) = P(A) + P(B) - P(A ∩ B)
• For disjoint events: P(A ∪ B) = P(A) + P(B)

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Conditional Probability': `
**${sectionTitle}**

Key formula:
• P(A|B) = P(A ∩ B) / P(B), where P(B) > 0

Important concepts:
• Conditional probability represents probability of A given B has occurred
• Multiplication rule: P(A ∩ B) = P(A|B) × P(B)

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Bayes\' Theorem': `
**${sectionTitle}**

Bayes' Theorem:
• P(A|B) = P(B|A) × P(A) / P(B)

Applications:
• Updating probabilities with new information
• Medical diagnosis, spam filtering, etc.

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Independence': `
**${sectionTitle}**

Key concepts:
• Events A and B are independent if P(A ∩ B) = P(A) × P(B)
• Equivalently: P(A|B) = P(A) and P(B|A) = P(B)
• Multiplication rule for independent events

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Bernoulli Trials': `
**${sectionTitle}**

Key concepts:
• Sequence of independent trials with two outcomes (success/failure)
• Probability of success p remains constant
• Binomial distribution: P(X = k) = C(n,k) × p^k × (1-p)^(n-k)

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Random Variables': `
**${sectionTitle}**

Key concepts:
• Function that assigns numerical values to outcomes
• Discrete vs. continuous random variables
• Probability mass function (PMF) for discrete variables
• Cumulative distribution function (CDF)

*Note: This section requires additional study material as the source document appears to be image-based.*
      `,
      'Expected Value, Variance, and Standard Deviation': `
**${sectionTitle}**

Key formulas:
• Expected Value: E[X] = Σ x × P(X = x)
• Variance: Var(X) = E[X²] - (E[X])²
• Standard Deviation: σ = √Var(X)
• Properties: E[aX + b] = aE[X] + b, Var(aX + b) = a²Var(X)

*Note: This section requires additional study material as the source document appears to be image-based.*
      `
    };

    return placeholders[sectionTitle] || `
**${sectionTitle}**

This section covers: ${keywords.join(', ')}

*Note: Content extraction was limited. Please refer to the original document for complete information.*
    `;
  }

  /**
   * Extract relevant text from actual document content
   */
  private extractRelevantTextFromActual(text: string, keywords: string[]): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const relevantSentences: string[] = [];
    
    // Find sentences that contain keywords
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (keywords.some(keyword => lowerSentence.includes(keyword.toLowerCase()))) {
        relevantSentences.push(sentence.trim());
        if (relevantSentences.length >= 3) break; // Limit to 3 sentences per section
      }
    }
    
    // If no keyword matches, look for mathematical or educational content
    if (relevantSentences.length === 0) {
      for (const sentence of sentences) {
        if (/[=<>≤≥∑∏∫∪∩⊆⊇∈∉]|formula|theorem|definition|example|rule|principle/i.test(sentence)) {
          relevantSentences.push(sentence.trim());
          if (relevantSentences.length >= 2) break;
        }
      }
    }
    
    // If still no matches, take sentences with educational keywords
    if (relevantSentences.length === 0) {
      for (const sentence of sentences) {
        if (/counting|probability|relation|number|calculate|determine|find|solve/i.test(sentence)) {
          relevantSentences.push(sentence.trim());
          if (relevantSentences.length >= 2) break;
        }
      }
    }
    
    return relevantSentences.join('. ') + (relevantSentences.length > 0 ? '.' : '');
  }

  /**
   * Gets keywords for section content filtering
   */
  private getSectionKeywords(sectionTitle: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'Probability Basics': ['probability', 'sample space', 'event', 'outcome'],
      'Complements and Unions': ['complement', 'union', 'intersection', 'disjoint'],
      'Conditional Probability': ['conditional', 'given', 'P(A|B)', 'dependent'],
      'Bayes\' Theorem': ['bayes', 'posterior', 'prior', 'likelihood'],
      'Independence': ['independent', 'P(A∩B)', 'multiplication rule'],
      'Bernoulli Trials': ['bernoulli', 'binomial', 'trial', 'success'],
      'Random Variables': ['random variable', 'discrete', 'continuous', 'distribution'],
      'Expected Value, Variance, and Standard Deviation': ['expected value', 'variance', 'standard deviation', 'E[X]', 'Var(X)'],
      'Relation Definitions and Properties': ['relation', 'ordered pair', 'cartesian product', 'domain', 'range'],
      'Reflexive, Irreflexive, Symmetric, Antisymmetric, Transitive': ['reflexive', 'irreflexive', 'symmetric', 'antisymmetric', 'transitive'],
      'Combining Relations': ['composition', 'inverse', 'union of relations', 'intersection of relations'],
      'N-ary Relations': ['n-ary', 'ternary', 'quaternary', 'tuple'],
      'SQL-style Operations': ['sql', 'select', 'project', 'join', 'relational algebra']
    };

    return keywordMap[sectionTitle] || [sectionTitle.toLowerCase()];
  }

  /**
   * Checks if content is relevant to section keywords - Enhanced with fuzzy matching
   */
  private isContentRelevant(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    
    // Direct keyword matching
    const hasDirectMatch = keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    if (hasDirectMatch) return true;
    
    // Mathematical content indicators
    const hasMathContent = /[=<>≤≥∑∏∫∪∩⊆⊇∈∉∀∃]/g.test(text) || 
                          /\b(formula|equation|theorem|definition|example|proof)\b/i.test(text);
    
    // Probability-specific patterns
    const hasProbabilityContent = /P\([^)]*\)|E\[[^\]]*\]|Var\([^)]*\)|probability|random|distribution/i.test(text);
    
    // Relations-specific patterns  
    const hasRelationsContent = /relation|reflexive|symmetric|transitive|domain|range|ordered pair/i.test(text);
    
    // Include content with mathematical notation or academic indicators
    return hasMathContent || hasProbabilityContent || hasRelationsContent;
  }

  /**
   * Extracts text relevant to keywords - Modified to be less restrictive
   */
  private extractRelevantText(text: string, keywords: string[]): string {
    const sentences = text.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => 
      this.isContentRelevant(sentence, keywords)
    );
    
    // If keyword filtering returns too little content, include more context
    if (relevantSentences.length < 3 && sentences.length > 0) {
      // Include surrounding sentences for better context
      const expandedSentences: string[] = [];
      sentences.forEach((sentence, index) => {
        if (this.isContentRelevant(sentence, keywords)) {
          // Include previous and next sentence for context
          if (index > 0) expandedSentences.push(sentences[index - 1]);
          expandedSentences.push(sentence);
          if (index < sentences.length - 1) expandedSentences.push(sentences[index + 1]);
        }
      });
      
      // Remove duplicates and return
      const uniqueSentences = [...new Set(expandedSentences)];
      if (uniqueSentences.length > relevantSentences.length) {
        return uniqueSentences.join('. ').trim();
      }
    }
    
    // If still too little content, return a portion of the original text
    if (relevantSentences.length === 0 && text.length > 0) {
      // Return first few sentences as fallback
      const fallbackSentences = sentences.slice(0, Math.min(5, sentences.length));
      return fallbackSentences.join('. ').trim();
    }
    
    return relevantSentences.join('. ').trim();
  }

  /**
   * Numbers formulas with section-based numbering
   */
  private numberFormulas(formulas: Formula[], sectionNumber: string): Formula[] {
    return formulas.map((formula, index) => ({
      ...formula,
      id: `${sectionNumber}.${index + 1}` // e.g., "1.1.1", "1.1.2"
    }));
  }

  /**
   * Numbers examples with section-based numbering
   */
  private numberExamples(examples: WorkedExample[], sectionNumber: string): WorkedExample[] {
    return examples.map((example, index) => ({
      ...example,
      id: `Ex.${sectionNumber}.${index + 1}` // e.g., "Ex.1.1.1", "Ex.1.1.2"
    }));
  }

  /**
   * Generates cross-references between sections, examples, and formulas
   */
  private generateCrossReferences(parts: DocumentPart[]): CrossReference[] {
    const crossReferences: CrossReference[] = [];

    parts.forEach(part => {
      part.sections.forEach(section => {
        // Generate cross-references for examples
        section.examples.forEach(example => {
          const relatedFormulas = this.findRelatedFormulas(example, section.formulas);
          relatedFormulas.forEach(formula => {
            crossReferences.push({
              id: `ref-${this.crossReferenceCounter++}`,
              type: 'formula',
              sourceId: example.id,
              targetId: formula.id,
              displayText: `see Formula ${formula.id}`
            });
          });
        });

        // Generate cross-references for formulas
        section.formulas.forEach(formula => {
          const relatedExamples = this.findRelatedExamples(formula, section.examples);
          relatedExamples.forEach(example => {
            crossReferences.push({
              id: `ref-${this.crossReferenceCounter++}`,
              type: 'example',
              sourceId: formula.id,
              targetId: example.id,
              displayText: `see ${example.id}`
            });
          });
        });
      });
    });

    return crossReferences;
  }

  /**
   * Finds formulas related to an example
   */
  private findRelatedFormulas(example: WorkedExample, formulas: Formula[]): Formula[] {
    return formulas.filter(formula => {
      const exampleText = (example.problem + ' ' + example.solution.map(s => s.description).join(' ')).toLowerCase();
      const formulaContext = formula.context.toLowerCase();
      
      // Simple keyword matching - can be enhanced with more sophisticated NLP
      return exampleText.includes(formulaContext) || formulaContext.includes(example.subtopic.toLowerCase());
    });
  }

  /**
   * Finds examples related to a formula
   */
  private findRelatedExamples(formula: Formula, examples: WorkedExample[]): WorkedExample[] {
    return examples.filter(example => {
      const exampleText = (example.problem + ' ' + example.solution.map(s => s.description).join(' ')).toLowerCase();
      const formulaContext = formula.context.toLowerCase();
      
      return exampleText.includes(formulaContext) || formulaContext.includes(example.subtopic.toLowerCase());
    });
  }

  /**
   * Generates table of contents with page anchors
   */
  private generateTableOfContents(parts: DocumentPart[]): TOCEntry[] {
    const toc: TOCEntry[] = [];

    parts.forEach(part => {
      const partEntry: TOCEntry = {
        level: 1,
        title: `Part ${part.partNumber}: ${part.title}`,
        pageAnchor: `part-${part.partNumber}`,
        children: []
      };

      part.sections.forEach(section => {
        const sectionEntry: TOCEntry = {
          level: 2,
          title: section.title,
          sectionNumber: section.sectionNumber,
          pageAnchor: `section-${section.sectionNumber.replace('.', '-')}`,
          children: []
        };

        partEntry.children.push(sectionEntry);
      });

      toc.push(partEntry);
    });

    return toc;
  }

  /**
   * Generates document metadata
   */
  private generateMetadata(
    extractedContents: EnhancedExtractedContent[],
    parts: DocumentPart[]
  ): DocumentMetadata {
    const totalSections = parts.reduce((sum, part) => sum + part.sections.length, 0);
    const totalFormulas = parts.reduce((sum, part) => 
      sum + part.sections.reduce((sectionSum, section) => sectionSum + section.formulas.length, 0), 0
    );
    const totalExamples = parts.reduce((sum, part) => 
      sum + part.sections.reduce((sectionSum, section) => sectionSum + section.examples.length, 0), 0
    );

    const preservationScores = extractedContents.map(content => content.contentPreservation.preservationScore);
    const averagePreservationScore = preservationScores.length > 0 
      ? preservationScores.reduce((sum, score) => sum + score, 0) / preservationScores.length
      : 0;

    return {
      generatedAt: new Date(),
      sourceFiles: extractedContents.map(content => content.metadata.name),
      totalSections,
      totalFormulas,
      totalExamples,
      preservationScore: averagePreservationScore
    };
  }
}

// Factory function for creating academic structure organizer
export function getAcademicStructureOrganizer(config?: Partial<AcademicStructureConfig>): AcademicStructureOrganizer {
  return new AcademicStructureOrganizer(config);
}

// Default export
export default AcademicStructureOrganizer;