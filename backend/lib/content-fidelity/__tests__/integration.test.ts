/**
 * Integration tests for content fidelity validation system
 */

import { 
  FidelityValidator, 
  ManualReviewManager, 
  createFidelityValidator,
  createManualReviewManager,
  DEFAULT_FIDELITY_CONFIG 
} from '../index';

describe('Content Fidelity Integration Tests', () => {
  let validator: FidelityValidator;
  let reviewManager: ManualReviewManager;

  beforeEach(() => {
    validator = createFidelityValidator();
    reviewManager = createManualReviewManager();
  });

  describe('End-to-end validation workflow', () => {
    it('should complete full validation and review workflow', async () => {
      // Step 1: Validate content that requires manual review
      const original = `
        # Machine Learning Fundamentals
        
        Machine learning is a subset of artificial intelligence (AI) that focuses on algorithms 
        that can learn and make decisions from data without being explicitly programmed.
        
        ## Key Concepts
        - Supervised learning uses labeled training data
        - Unsupervised learning finds patterns in unlabeled data
        - Reinforcement learning learns through trial and error
      `;
      
      const processed = `
        # ML Basics
        
        ML is part of AI technology that uses algorithms to learn from information 
        and make choices automatically.
        
        ## Important Ideas
        - Supervised methods use training examples with answers
        - Unsupervised methods discover hidden patterns
        - Reinforcement approaches learn by trying different actions
        - Deep learning uses neural networks (new addition)
      `;
      
      // Step 2: Perform validation
      const validationResult = await validator.validateContent(original, processed);
      
      expect(validationResult.requiresManualReview).toBe(true);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.warnings.length).toBeGreaterThan(0);
      
      // Step 3: Add to manual review if needed
      if (validationResult.requiresManualReview) {
        const comparison = await validator.compareContent(original, processed);
        const reviewId = reviewManager.addForReview(comparison, validationResult);
        
        expect(reviewId).toBeDefined();
        
        // Step 4: Generate review summary
        const summary = reviewManager.generateReviewSummary(reviewId);
        expect(summary).toBeDefined();
        expect(summary?.overallScore).toBeLessThan(0.8);
        expect(summary?.wordingPreservation).toBeLessThan(0.7);
        
        // Step 5: Make review decision
        if (summary && summary.recommendedAction === 'reject') {
          const success = reviewManager.rejectReview(reviewId, 'Too many terminology changes');
          expect(success).toBe(true);
        }
      }
      
      // Step 6: Check final stats
      const stats = reviewManager.getReviewStats();
      expect(stats.total).toBe(1);
      expect(stats.rejected).toBe(1);
    });

    it('should handle content that passes validation without review', async () => {
      const original = 'Machine learning algorithms process data to make predictions.';
      const processed = 'Machine learning algorithms process data to make predictions and insights.';
      
      const validationResult = await validator.validateContent(original, processed);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.requiresManualReview).toBe(false);
      expect(validationResult.score.wordingPreservation).toBeGreaterThan(0.8);
      
      // Should not need manual review
      const pendingReviews = reviewManager.getPendingReviews();
      expect(pendingReviews).toHaveLength(0);
    });
  });

  describe('Batch processing workflow', () => {
    it('should handle multiple content validations', async () => {
      const testCases = [
        {
          original: 'TCP/IP protocol implementation details.',
          processed: 'TCP/IP protocol implementation specifics.',
          expectValid: true
        },
        {
          original: 'Database normalization reduces data redundancy.',
          processed: 'Data organization minimizes information duplication.',
          expectValid: false
        },
        {
          original: 'React components manage state and props.',
          processed: 'React elements handle data and properties efficiently.',
          expectValid: false
        }
      ];
      
      const results = await Promise.all(
        testCases.map(testCase => 
          validator.validateContent(testCase.original, testCase.processed)
        )
      );
      
      expect(results).toHaveLength(3);
      
      // Check expectations
      expect(results[0].isValid).toBe(testCases[0].expectValid);
      expect(results[1].isValid).toBe(testCases[1].expectValid);
      expect(results[2].isValid).toBe(testCases[2].expectValid);
      
      // Add failed validations to review
      const reviewIds: string[] = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].requiresManualReview) {
          const comparison = await validator.compareContent(
            testCases[i].original, 
            testCases[i].processed
          );
          const reviewId = reviewManager.addForReview(comparison, results[i]);
          reviewIds.push(reviewId);
        }
      }
      
      expect(reviewIds.length).toBeGreaterThan(0);
      
      const stats = reviewManager.getReviewStats();
      expect(stats.pending).toBe(reviewIds.length);
    });
  });

  describe('Configuration and customization', () => {
    it('should work with custom validation configuration', async () => {
      const strictValidator = createFidelityValidator({
        minAcceptableScore: 0.95,
        wordingThreshold: 0.98,
        enableStrictMode: true,
        ignoreMinorChanges: false
      });
      
      const original = 'Machine learning algorithm implementation.';
      const processed = 'Machine learning algorithm implementation!'; // Only punctuation change
      
      const result = await strictValidator.validateContent(original, processed);
      
      // Strict mode should catch even minor changes
      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should use default configuration correctly', () => {
      const defaultValidator = createFidelityValidator();
      const config = defaultValidator.getConfig();
      
      expect(config.minAcceptableScore).toBe(DEFAULT_FIDELITY_CONFIG.minAcceptableScore);
      expect(config.wordingThreshold).toBe(DEFAULT_FIDELITY_CONFIG.wordingThreshold);
      expect(config.enableStrictMode).toBe(DEFAULT_FIDELITY_CONFIG.enableStrictMode);
    });
  });

  describe('Real-world content scenarios', () => {
    it('should handle technical documentation', async () => {
      const original = `
        ## API Authentication
        
        The REST API uses OAuth 2.0 for authentication. Include the access token 
        in the Authorization header: "Bearer <token>".
        
        ### Error Codes
        - 401: Unauthorized - Invalid or missing token
        - 403: Forbidden - Token lacks required permissions
        - 429: Rate Limited - Too many requests
      `;
      
      const processed = `
        ## API Auth
        
        The REST API uses OAuth 2.0 for user verification. Add the access token 
        in the Authorization header: "Bearer <your-token>".
        
        ### Common Errors
        - 401: Not authorized - Bad or missing token
        - 403: Access denied - Token missing permissions  
        - 429: Rate limited - Excessive requests
      `;
      
      const result = await validator.validateContent(original, processed);
      
      expect(result.warnings.some(w => w.type === 'wording_change')).toBe(true);
      expect(result.score.structureSimilarity).toBeGreaterThan(0.8); // Structure preserved
      expect(result.score.wordingPreservation).toBeLessThan(0.9); // Some wording changed
    });

    it('should handle code examples and technical terms', async () => {
      const original = `
        function calculateFibonacci(n) {
          if (n <= 1) return n;
          return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
        }
        
        This recursive implementation has O(2^n) time complexity.
      `;
      
      const processed = `
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        
        This recursive approach has exponential time complexity.
      `;
      
      const result = await validator.validateContent(original, processed);
      
      // Should detect function name change and terminology change
      expect(result.warnings.some(w => w.type === 'wording_change')).toBe(true);
      expect(result.score.wordingPreservation).toBeLessThan(0.9);
    });

    it('should handle academic content with citations', async () => {
      const original = `
        According to Smith et al. (2023), machine learning models demonstrate 
        significant performance improvements when trained on diverse datasets.
        The study analyzed 15 different algorithms across multiple domains.
      `;
      
      const processed = `
        Research by Smith and colleagues (2023) shows that ML models perform 
        better with varied training data. They examined 15 algorithms in 
        different fields and found substantial improvements.
      `;
      
      const result = await validator.validateContent(original, processed);
      
      expect(result.score.semanticSimilarity).toBeGreaterThan(0.7); // Meaning preserved
      expect(result.score.wordingPreservation).toBeLessThan(0.8); // Wording changed
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = 'This is a test sentence. '.repeat(1000);
      const modifiedContent = largeContent + 'Additional content at the end.';
      
      const startTime = Date.now();
      const result = await validator.validateContent(largeContent, modifiedContent);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent validations', async () => {
      const testPairs = Array.from({ length: 10 }, (_, i) => ({
        original: `Test content ${i} with specific information.`,
        processed: `Modified content ${i} with different wording.`
      }));
      
      const startTime = Date.now();
      const results = await Promise.all(
        testPairs.map(pair => validator.validateContent(pair.original, pair.processed))
      );
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.score !== undefined)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed content gracefully', async () => {
      const malformedContent = '\x00\x01\x02Invalid characters\xFF\xFE';
      const normalContent = 'Normal content for comparison.';
      
      const result = await validator.validateContent(malformedContent, normalContent);
      
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should handle extremely different content', async () => {
      const original = 'Technical documentation about database systems.';
      const processed = '🎵 Music and art are beautiful forms of expression! 🎨';
      
      const result = await validator.validateContent(original, processed);
      
      expect(result.isValid).toBe(false);
      expect(result.score.overall).toBeLessThan(0.3);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle review manager edge cases', () => {
      // Test with non-existent review operations
      expect(reviewManager.approveReview('fake-id')).toBe(false);
      expect(reviewManager.rejectReview('fake-id')).toBe(false);
      expect(reviewManager.getReviewItem('fake-id')).toBeNull();
      expect(reviewManager.generateReviewSummary('fake-id')).toBeNull();
      
      // Test clearing empty manager
      expect(reviewManager.clearCompletedReviews()).toBe(0);
      
      // Test stats for empty manager
      const emptyStats = reviewManager.getReviewStats();
      expect(emptyStats.total).toBe(0);
    });
  });
});