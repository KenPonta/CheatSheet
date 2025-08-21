/**
 * Content similarity calculation utilities
 */

import { FidelityScore, ContentLocation } from './types';

export class SimilarityCalculator {
  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate text similarity using Levenshtein distance
   */
  static calculateTextSimilarity(original: string, processed: string): number {
    if (original === processed) return 1.0;
    if (!original || !processed) return 0.0;
    
    const distance = this.levenshteinDistance(original.toLowerCase(), processed.toLowerCase());
    const maxLength = Math.max(original.length, processed.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate wording preservation score
   */
  static calculateWordingPreservation(original: string, processed: string): number {
    const originalWords = this.extractWords(original);
    const processedWords = this.extractWords(processed);
    
    if (originalWords.length === 0) return 1.0;
    
    let preservedWords = 0;
    const originalWordSet = new Set(originalWords.map(w => w.toLowerCase()));
    
    for (const word of processedWords) {
      if (originalWordSet.has(word.toLowerCase())) {
        preservedWords++;
      }
    }
    
    return preservedWords / originalWords.length;
  }

  /**
   * Calculate semantic similarity using word overlap and context
   */
  static calculateSemanticSimilarity(original: string, processed: string): number {
    const originalSentences = this.extractSentences(original);
    const processedSentences = this.extractSentences(processed);
    
    if (originalSentences.length === 0) return 1.0;
    
    let totalSimilarity = 0;
    
    for (const origSentence of originalSentences) {
      let maxSimilarity = 0;
      
      for (const procSentence of processedSentences) {
        const similarity = this.calculateTextSimilarity(origSentence, procSentence);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      totalSimilarity += maxSimilarity;
    }
    
    return totalSimilarity / originalSentences.length;
  }

  /**
   * Calculate structure similarity based on headings, paragraphs, and organization
   */
  static calculateStructureSimilarity(original: string, processed: string): number {
    const originalStructure = this.extractStructure(original);
    const processedStructure = this.extractStructure(processed);
    
    const headingSimilarity = this.compareArrays(originalStructure.headings, processedStructure.headings);
    const paragraphSimilarity = Math.abs(originalStructure.paragraphs - processedStructure.paragraphs) / 
                               Math.max(originalStructure.paragraphs, processedStructure.paragraphs, 1);
    
    return (headingSimilarity + (1 - paragraphSimilarity)) / 2;
  }

  /**
   * Calculate overall fidelity score
   */
  static calculateFidelityScore(original: string, processed: string): FidelityScore {
    const textSimilarity = this.calculateTextSimilarity(original, processed);
    const wordingPreservation = this.calculateWordingPreservation(original, processed);
    const semanticSimilarity = this.calculateSemanticSimilarity(original, processed);
    const structureSimilarity = this.calculateStructureSimilarity(original, processed);
    
    // Weighted average with emphasis on wording preservation
    const overall = (
      textSimilarity * 0.25 +
      wordingPreservation * 0.35 +
      semanticSimilarity * 0.25 +
      structureSimilarity * 0.15
    );
    
    return {
      overall,
      textSimilarity,
      structureSimilarity,
      semanticSimilarity,
      wordingPreservation
    };
  }

  /**
   * Extract words from text
   */
  private static extractWords(text: string): string[] {
    return text.match(/\b\w+\b/g) || [];
  }

  /**
   * Extract sentences from text
   */
  private static extractSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  /**
   * Extract structure information from text
   */
  private static extractStructure(text: string): { headings: string[], paragraphs: number } {
    const headings = text.match(/^#+\s+.+$/gm) || [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    
    return {
      headings: headings.map(h => h.replace(/^#+\s+/, '')),
      paragraphs
    };
  }

  /**
   * Compare two arrays for similarity
   */
  private static compareArrays(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1.0;
    if (arr1.length === 0 || arr2.length === 0) return 0.0;
    
    let matches = 0;
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    
    for (const item of arr1) {
      if (set2.has(item.toLowerCase())) {
        matches++;
      }
    }
    
    return matches / Math.max(arr1.length, arr2.length);
  }

  /**
   * Find content modifications between original and processed text
   */
  static findModifications(original: string, processed: string): Array<{
    type: 'addition' | 'removal' | 'change';
    originalText: string;
    processedText: string;
    location: ContentLocation;
  }> {
    const modifications: Array<{
      type: 'addition' | 'removal' | 'change';
      originalText: string;
      processedText: string;
      location: ContentLocation;
    }> = [];
    
    const originalSentences = this.extractSentences(original);
    const processedSentences = this.extractSentences(processed);
    
    // Simplified diff algorithm to avoid memory issues
    const maxLength = Math.max(originalSentences.length, processedSentences.length);
    
    for (let i = 0; i < maxLength; i++) {
      const origSentence = i < originalSentences.length ? originalSentences[i] : '';
      const procSentence = i < processedSentences.length ? processedSentences[i] : '';
      
      if (origSentence && !procSentence) {
        // Removal
        modifications.push({
          type: 'removal',
          originalText: origSentence,
          processedText: '',
          location: {
            sentence: i,
            startIndex: 0,
            endIndex: origSentence.length
          }
        });
      } else if (!origSentence && procSentence) {
        // Addition
        modifications.push({
          type: 'addition',
          originalText: '',
          processedText: procSentence,
          location: {
            sentence: i,
            startIndex: 0,
            endIndex: procSentence.length
          }
        });
      } else if (origSentence && procSentence) {
        const similarity = this.calculateTextSimilarity(origSentence, procSentence);
        if (similarity < 1.0) {
          // Change
          modifications.push({
            type: 'change',
            originalText: origSentence,
            processedText: procSentence,
            location: {
              sentence: i,
              startIndex: 0,
              endIndex: origSentence.length
            }
          });
        }
      }
    }
    
    return modifications;
  }
}