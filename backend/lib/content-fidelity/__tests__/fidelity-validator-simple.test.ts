/**
 * Simplified tests for content fidelity validation
 */

import { FidelityValidator } from '../fidelity-validator';

describe('FidelityValidator - Simple Tests', () => {
  let validator: FidelityValidator;

  beforeEach(() => {
    validator = new FidelityValidator();
  });

  describe('basic validation', () => {
    it('should validate identical content as valid', async () => {
      const content = 'This is test content for validation.';
      const result = await validator.validateContent(content, content);
      
      expect(result.isValid).toBe(true);
      expect(result.score.overall).toBe(1.0);
      expect(result.requiresManualReview).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should flag content with significant changes', async () => {
      const original = 'Machine learning algorithms process data.';
      const processed = 'Cooking recipes use ingredients.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.isValid).toBe(false);
      expect(result.score.overall).toBeLessThan(0.5);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle minor changes appropriately', async () => {
      const original = 'Machine learning algorithms process data efficiently.';
      const processed = 'Machine learning algorithms process data effectively.';
      const result = await validator.validateContent(original, processed);
      
      expect(result.score.wordingPreservation).toBeGreaterThan(0.8);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customValidator = new FidelityValidator({
        minAcceptableScore: 0.9,
        wordingThreshold: 0.95
      });
      
      const config = customValidator.getConfig();
      expect(config.minAcceptableScore).toBe(0.9);
      expect(config.wordingThreshold).toBe(0.95);
    });
  });
});