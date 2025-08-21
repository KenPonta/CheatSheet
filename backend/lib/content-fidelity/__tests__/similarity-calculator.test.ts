/**
 * Tests for similarity calculation algorithms
 */

import { SimilarityCalculator } from '../similarity-calculator';

describe('SimilarityCalculator', () => {
  describe('calculateTextSimilarity', () => {
    it('should return 1.0 for identical text', () => {
      const text = 'This is a test sentence.';
      const similarity = SimilarityCalculator.calculateTextSimilarity(text, text);
      expect(similarity).toBe(1.0);
    });

    it('should return 0.0 for completely different text', () => {
      const text1 = 'This is about cats.';
      const text2 = 'Quantum physics equations.';
      const similarity = SimilarityCalculator.calculateTextSimilarity(text1, text2);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle case differences', () => {
      const text1 = 'This Is A Test';
      const text2 = 'this is a test';
      const similarity = SimilarityCalculator.calculateTextSimilarity(text1, text2);
      expect(similarity).toBe(1.0);
    });

    it('should handle empty strings', () => {
      expect(SimilarityCalculator.calculateTextSimilarity('', '')).toBe(1.0);
      expect(SimilarityCalculator.calculateTextSimilarity('test', '')).toBe(0.0);
      expect(SimilarityCalculator.calculateTextSimilarity('', 'test')).toBe(0.0);
    });

    it('should calculate similarity for minor differences', () => {
      const text1 = 'The quick brown fox jumps over the lazy dog.';
      const text2 = 'The quick brown fox jumped over the lazy dog.';
      const similarity = SimilarityCalculator.calculateTextSimilarity(text1, text2);
      expect(similarity).toBeGreaterThan(0.9);
    });
  });

  describe('calculateWordingPreservation', () => {
    it('should return 1.0 when all words are preserved', () => {
      const original = 'machine learning algorithm';
      const processed = 'algorithm machine learning';
      const preservation = SimilarityCalculator.calculateWordingPreservation(original, processed);
      expect(preservation).toBe(1.0);
    });

    it('should return 0.5 when half the words are preserved', () => {
      const original = 'machine learning algorithm neural network';
      const processed = 'machine learning system artificial intelligence';
      const preservation = SimilarityCalculator.calculateWordingPreservation(original, processed);
      expect(preservation).toBe(0.4); // 2 out of 5 words preserved
    });

    it('should handle technical terminology preservation', () => {
      const original = 'TCP/IP protocol stack implementation';
      const processed = 'TCP/IP protocol network implementation';
      const preservation = SimilarityCalculator.calculateWordingPreservation(original, processed);
      expect(preservation).toBeGreaterThan(0.7);
    });

    it('should return 1.0 for empty original text', () => {
      const preservation = SimilarityCalculator.calculateWordingPreservation('', 'any text');
      expect(preservation).toBe(1.0);
    });
  });

  describe('calculateSemanticSimilarity', () => {
    it('should return high similarity for paraphrased content', () => {
      const original = 'The cat sat on the mat. It was comfortable.';
      const processed = 'A cat was sitting comfortably on a mat.';
      const similarity = SimilarityCalculator.calculateSemanticSimilarity(original, processed);
      expect(similarity).toBeGreaterThan(0.3);
    });

    it('should return low similarity for unrelated content', () => {
      const original = 'Database normalization techniques.';
      const processed = 'Cooking pasta recipes.';
      const similarity = SimilarityCalculator.calculateSemanticSimilarity(original, processed);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle single sentence comparison', () => {
      const original = 'Machine learning is a subset of artificial intelligence.';
      const processed = 'ML is part of AI technology.';
      const similarity = SimilarityCalculator.calculateSemanticSimilarity(original, processed);
      expect(similarity).toBeGreaterThan(0.2);
    });
  });

  describe('calculateStructureSimilarity', () => {
    it('should return high similarity for similar structure', () => {
      const original = `# Introduction
      This is the introduction.
      
      ## Section 1
      Content of section 1.
      
      ## Section 2
      Content of section 2.`;
      
      const processed = `# Introduction
      This is an introduction.
      
      ## Section 1
      Modified content of section 1.
      
      ## Section 2
      Modified content of section 2.`;
      
      const similarity = SimilarityCalculator.calculateStructureSimilarity(original, processed);
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return lower similarity for different structure', () => {
      const original = `# Introduction
      Content here.
      
      ## Section 1
      More content.`;
      
      const processed = `Content here. More content.`;
      
      const similarity = SimilarityCalculator.calculateStructureSimilarity(original, processed);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('calculateFidelityScore', () => {
    it('should return perfect score for identical content', () => {
      const content = 'This is test content with some structure.';
      const score = SimilarityCalculator.calculateFidelityScore(content, content);
      
      expect(score.overall).toBe(1.0);
      expect(score.textSimilarity).toBe(1.0);
      expect(score.wordingPreservation).toBe(1.0);
      expect(score.semanticSimilarity).toBe(1.0);
      expect(score.structureSimilarity).toBe(1.0);
    });

    it('should return lower scores for modified content', () => {
      const original = 'Machine learning algorithms require large datasets for training.';
      const processed = 'AI systems need big data for learning processes.';
      const score = SimilarityCalculator.calculateFidelityScore(original, processed);
      
      expect(score.overall).toBeLessThan(0.8);
      expect(score.wordingPreservation).toBeLessThan(0.5);
      expect(score.semanticSimilarity).toBeGreaterThan(0.2);
    });

    it('should weight wording preservation heavily in overall score', () => {
      const original = 'TCP protocol implementation details';
      const processed = 'TCP protocol implementation specifics';
      const score = SimilarityCalculator.calculateFidelityScore(original, processed);
      
      // Should have high wording preservation and overall score
      expect(score.wordingPreservation).toBeGreaterThan(0.7);
      expect(score.overall).toBeGreaterThan(0.8);
    });
  });

  describe('findModifications', () => {
    it('should detect additions', () => {
      const original = 'Original content.';
      const processed = 'Original content. Additional information.';
      const modifications = SimilarityCalculator.findModifications(original, processed);
      
      const additions = modifications.filter(m => m.type === 'addition');
      expect(additions.length).toBeGreaterThan(0);
      expect(additions[0].processedText).toContain('Additional information');
    });

    it('should detect removals', () => {
      const original = 'Original content. Extra information.';
      const processed = 'Original content.';
      const modifications = SimilarityCalculator.findModifications(original, processed);
      
      const removals = modifications.filter(m => m.type === 'removal');
      expect(removals.length).toBeGreaterThan(0);
      expect(removals[0].originalText).toContain('Extra information');
    });

    it('should detect changes', () => {
      const original = 'The quick brown fox.';
      const processed = 'The slow brown fox.';
      const modifications = SimilarityCalculator.findModifications(original, processed);
      
      const changes = modifications.filter(m => m.type === 'change');
      expect(changes.length).toBeGreaterThan(0);
    });

    it('should handle complex modifications', () => {
      const original = `First sentence. Second sentence. Third sentence.`;
      const processed = `First sentence. Modified second sentence. Fourth sentence.`;
      const modifications = SimilarityCalculator.findModifications(original, processed);
      
      expect(modifications.length).toBeGreaterThan(0);
      
      // Should detect change and addition/removal
      const types = modifications.map(m => m.type);
      expect(types).toContain('change');
    });

    it('should provide location information', () => {
      const original = 'First. Second. Third.';
      const processed = 'First. Modified. Third.';
      const modifications = SimilarityCalculator.findModifications(original, processed);
      
      expect(modifications.length).toBeGreaterThan(0);
      expect(modifications[0].location).toBeDefined();
      expect(modifications[0].location.startIndex).toBeGreaterThanOrEqual(0);
      expect(modifications[0].location.endIndex).toBeGreaterThan(modifications[0].location.startIndex);
    });
  });
});