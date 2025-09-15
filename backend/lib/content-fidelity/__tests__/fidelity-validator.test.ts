/**
 * Tests for content fidelity validation
 */

import { FidelityValidator } from '../fidelity-validator';
import { FidelityValidationConfig } from '../types';

describe('FidelityValidator', () => {
  let validator: FidelityValidator;

  beforeEach(() => {
    validator = new FidelityValidator();
  });

  describe('validateContent', () => {
    it('should validate identical content as valid', async () => {
      const content = 'This is test content for validation.';
      const result = await validator.validateContent(content, content);
      
      expect(result.isValid).toBe(true);
      expect(result.score.overall).toBe(1.0);
      expect(result.requiresManualReview).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should flag content with low wording preservation', async () => {
      const original = 'TCP/IP protocol stack implementation requires careful consideration.';
      const processed = 'Network communication systems need thoughtful design approaches.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.isValid).toBe(false);
      expect(result.score.wordingPreservation).toBeLessThan(0.5);
      expect(result.requiresManualReview).toBe(true);
      expect(result.warnings.some(w => w.type === 'wording_change')).toBe(true);
    });

    it('should generate appropriate warnings for content modifications', async () => {
      const original = 'Machine learning algorithms process data efficiently.';
      const processed = 'Machine learning algorithms process data efficiently. Additional context added.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.warnings.some(w => w.type === 'content_addition')).toBe(true);
    });

    it('should provide recommendations for improvement', async () => {
      const original = 'Database normalization reduces redundancy.';
      const processed = 'Data organization minimizes duplication.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.recommendations).toContain(
        expect.stringMatching(/preserving original terminology/i)
      );
    });
  });

  describe('compareContent', () => {
    it('should provide detailed comparison results', async () => {
      const original = 'Original content with specific terminology.';
      const processed = 'Modified content with different wording.';
      const comparison = await validator.compareContent(original, processed);
      
      expect(comparison.original).toBe(original);
      expect(comparison.processed).toBe(processed);
      expect(comparison.score).toBeDefined();
      expect(comparison.warnings).toBeDefined();
      expect(comparison.modifications).toBeDefined();
    });

    it('should detect structural changes', async () => {
      const original = `# Heading 1
      Content under heading 1.
      
      ## Subheading
      More content.`;
      
      const processed = `Content under heading 1. More content.`;
      
      const comparison = await validator.compareContent(original, processed);
      expect(comparison.score.structureSimilarity).toBeLessThan(0.8);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const config: Partial<FidelityValidationConfig> = {
        minAcceptableScore: 0.9,
        wordingThreshold: 0.95,
        enableStrictMode: true
      };
      
      const customValidator = new FidelityValidator(config);
      const retrievedConfig = customValidator.getConfig();
      
      expect(retrievedConfig.minAcceptableScore).toBe(0.9);
      expect(retrievedConfig.wordingThreshold).toBe(0.95);
      expect(retrievedConfig.enableStrictMode).toBe(true);
    });

    it('should update configuration dynamically', () => {
      validator.updateConfig({ minAcceptableScore: 0.95 });
      const config = validator.getConfig();
      
      expect(config.minAcceptableScore).toBe(0.95);
    });

    it('should enforce strict mode validation', async () => {
      const strictValidator = new FidelityValidator({
        enableStrictMode: true,
        minAcceptableScore: 0.8,
        wordingThreshold: 0.9,
        structureThreshold: 0.8,
        semanticThreshold: 0.8
      });
      
      const original = 'Technical documentation with specific terms.';
      const processed = 'Technical docs with particular words.';
      const result = await strictValidator.validateContent(original, processed);
      
      // Should be more strict about validation
      expect(result.isValid).toBe(false);
    });
  });

  describe('warning generation', () => {
    it('should generate high severity warnings for significant changes', async () => {
      const original = 'This is a very long sentence with important technical information that should be preserved exactly as written in the original documentation.';
      const processed = 'Short summary.';
      const result = await validator.validateContent(original, processed);
      
      const highSeverityWarnings = result.warnings.filter(w => w.severity === 'high');
      expect(highSeverityWarnings.length).toBeGreaterThan(0);
    });

    it('should generate medium severity warnings for moderate changes', async () => {
      const original = 'Database normalization is important.';
      const processed = 'Data organization matters significantly.';
      const result = await validator.validateContent(original, processed);
      
      // Should have some warnings but not necessarily high severity
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should ignore minor changes when configured', async () => {
      const validator = new FidelityValidator({ ignoreMinorChanges: true });
      
      const original = 'This is a test.';
      const processed = 'This is a test!'; // Only punctuation change
      const result = await validator.validateContent(original, processed);
      
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('manual review requirements', () => {
    it('should require manual review for low scores', async () => {
      const original = 'Comprehensive technical documentation with detailed explanations.';
      const processed = 'Brief notes.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.requiresManualReview).toBe(true);
    });

    it('should require manual review for high severity warnings', async () => {
      const original = 'Critical system configuration parameters.';
      const processed = 'Critical system configuration parameters. Unauthorized additional content.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.requiresManualReview).toBe(true);
    });

    it('should not require manual review for minor changes', async () => {
      const original = 'Machine learning algorithm implementation.';
      const processed = 'Machine learning algorithm implementation details.';
      const result = await validator.validateContent(original, processed);
      
      // Minor addition should not require manual review
      expect(result.requiresManualReview).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await validator.validateContent('', '');
      expect(result.isValid).toBe(true);
      expect(result.score.overall).toBe(1.0);
    });

    it('should handle very long content', async () => {
      const longContent = 'This is a test sentence. '.repeat(1000);
      const modifiedContent = longContent + 'Additional sentence.';
      
      const result = await validator.validateContent(longContent, modifiedContent);
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should handle special characters and formatting', async () => {
      const original = 'Code: `function test() { return true; }`';
      const processed = 'Code: `function test() { return false; }`';
      
      const result = await validator.validateContent(original, processed);
      expect(result.warnings.some(w => w.type === 'wording_change')).toBe(true);
    });

    it('should handle multilingual content', async () => {
      const original = 'Hello world. Bonjour monde.';
      const processed = 'Hello world. Hola mundo.';
      
      const result = await validator.validateContent(original, processed);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});