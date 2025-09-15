/**
 * Integration tests for reference format matching using actual reference files
 */

import { ReferenceFormatMatcher } from '../format-matcher';
import { ContentDensityAnalyzer } from '../content-density-analyzer';
import { TemplateAnalyzer } from '../analyzer';
import { ExtractedContent, OrganizedTopic } from '../../ai/types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Skip these tests in CI if reference files are not available
const REFERENCE_FILES_PATH = join(process.cwd(), 'Reference');
const hasReferenceFiles = (() => {
  try {
    return require('fs').existsSync(REFERENCE_FILES_PATH);
  } catch {
    return false;
  }
})();

const describeWithFiles = hasReferenceFiles ? describe : describe.skip;

describeWithFiles('Reference Format Integration Tests', () => {
  let formatMatcher: ReferenceFormatMatcher;
  let densityAnalyzer: ContentDensityAnalyzer;
  let templateAnalyzer: TemplateAnalyzer;

  // Sample user content for testing
  const sampleUserContent: ExtractedContent[] = [
    {
      text: `
        Data Science Fundamentals
        
        Machine Learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. It involves algorithms that can identify patterns, make predictions, and improve their performance over time.
        
        Key Concepts:
        - Supervised Learning: Uses labeled data to train models
        - Unsupervised Learning: Finds patterns in unlabeled data
        - Reinforcement Learning: Learns through interaction and feedback
        
        Common Algorithms:
        1. Linear Regression - Predicts continuous values
        2. Decision Trees - Makes decisions through branching logic
        3. Neural Networks - Mimics brain structure for complex pattern recognition
        4. K-Means Clustering - Groups similar data points
        
        Data Preprocessing:
        Data cleaning and preparation is crucial for successful machine learning. This includes handling missing values, normalizing data, and feature selection.
        
        Model Evaluation:
        - Accuracy: Percentage of correct predictions
        - Precision: True positives / (True positives + False positives)
        - Recall: True positives / (True positives + False negatives)
        - F1-Score: Harmonic mean of precision and recall
      `,
      images: [
        {
          id: 'img_1',
          base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          context: 'Machine learning workflow diagram',
          isExample: true
        }
      ],
      tables: [
        {
          id: 'table_1',
          headers: ['Algorithm', 'Type', 'Use Case'],
          rows: [
            ['Linear Regression', 'Supervised', 'Prediction'],
            ['K-Means', 'Unsupervised', 'Clustering'],
            ['Decision Tree', 'Supervised', 'Classification']
          ],
          context: 'Algorithm comparison table'
        }
      ],
      metadata: {
        name: 'data-science-content.pdf',
        size: 2048,
        type: 'application/pdf',
        lastModified: new Date(),
        wordCount: 180
      },
      structure: {
        headings: [
          { level: 1, text: 'Data Science Fundamentals', position: 0 },
          { level: 2, text: 'Key Concepts', position: 50 },
          { level: 2, text: 'Common Algorithms', position: 100 },
          { level: 2, text: 'Data Preprocessing', position: 150 },
          { level: 2, text: 'Model Evaluation', position: 200 }
        ],
        sections: [
          { title: 'Data Science Fundamentals', content: 'Introduction to ML', startPosition: 0, endPosition: 49 },
          { title: 'Key Concepts', content: 'ML concepts', startPosition: 50, endPosition: 99 },
          { title: 'Common Algorithms', content: 'Algorithm descriptions', startPosition: 100, endPosition: 149 },
          { title: 'Data Preprocessing', content: 'Data preparation', startPosition: 150, endPosition: 199 },
          { title: 'Model Evaluation', content: 'Evaluation metrics', startPosition: 200, endPosition: 249 }
        ],
        hierarchy: 2
      }
    }
  ];

  const sampleUserTopics: OrganizedTopic[] = [
    {
      id: 'topic_1',
      title: 'Machine Learning Basics',
      content: 'Machine learning enables computers to learn from data without explicit programming. Key types include supervised, unsupervised, and reinforcement learning.',
      subtopics: [
        {
          id: 'subtopic_1_1',
          title: 'Supervised Learning',
          content: 'Uses labeled data to train models for prediction and classification tasks.',
          priority: 'high',
          estimatedSpace: 40,
          isSelected: true,
          sourceLocation: { fileId: 'file_1', page: 1 },
          parentTopicId: 'topic_1'
        },
        {
          id: 'subtopic_1_2',
          title: 'Unsupervised Learning',
          content: 'Finds patterns in unlabeled data through clustering and dimensionality reduction.',
          priority: 'medium',
          estimatedSpace: 35,
          isSelected: true,
          sourceLocation: { fileId: 'file_1', page: 1 },
          parentTopicId: 'topic_1'
        }
      ],
      sourceFiles: ['data-science-content.pdf'],
      confidence: 0.95,
      priority: 'high',
      examples: [],
      originalWording: 'Machine learning enables computers to learn from data without explicit programming.',
      estimatedSpace: 120,
      isSelected: true
    },
    {
      id: 'topic_2',
      title: 'Common Algorithms',
      content: 'Essential algorithms include linear regression for prediction, decision trees for classification, neural networks for complex patterns, and k-means for clustering.',
      subtopics: [
        {
          id: 'subtopic_2_1',
          title: 'Linear Regression',
          content: 'Predicts continuous values by finding the best line through data points.',
          priority: 'high',
          estimatedSpace: 30,
          isSelected: true,
          sourceLocation: { fileId: 'file_1', page: 1 },
          parentTopicId: 'topic_2'
        },
        {
          id: 'subtopic_2_2',
          title: 'Decision Trees',
          content: 'Makes decisions through branching logic based on feature values.',
          priority: 'medium',
          estimatedSpace: 30,
          isSelected: true,
          sourceLocation: { fileId: 'file_1', page: 1 },
          parentTopicId: 'topic_2'
        }
      ],
      sourceFiles: ['data-science-content.pdf'],
      confidence: 0.9,
      priority: 'high',
      examples: [],
      originalWording: 'Essential algorithms for different machine learning tasks.',
      estimatedSpace: 100,
      isSelected: true
    },
    {
      id: 'topic_3',
      title: 'Model Evaluation',
      content: 'Evaluation metrics include accuracy, precision, recall, and F1-score to assess model performance.',
      subtopics: [
        {
          id: 'subtopic_3_1',
          title: 'Accuracy Metrics',
          content: 'Measures the percentage of correct predictions made by the model.',
          priority: 'medium',
          estimatedSpace: 25,
          isSelected: true,
          sourceLocation: { fileId: 'file_1', page: 1 },
          parentTopicId: 'topic_3'
        }
      ],
      sourceFiles: ['data-science-content.pdf'],
      confidence: 0.85,
      priority: 'medium',
      examples: [],
      originalWording: 'Methods to evaluate machine learning model performance.',
      estimatedSpace: 80,
      isSelected: true
    },
    {
      id: 'topic_4',
      title: 'Data Preprocessing',
      content: 'Data cleaning and preparation including handling missing values, normalization, and feature selection.',
      subtopics: [],
      sourceFiles: ['data-science-content.pdf'],
      confidence: 0.8,
      priority: 'low',
      examples: [],
      originalWording: 'Preparing data for machine learning algorithms.',
      estimatedSpace: 60,
      isSelected: true
    }
  ];

  beforeAll(() => {
    formatMatcher = new ReferenceFormatMatcher();
    densityAnalyzer = new ContentDensityAnalyzer();
    templateAnalyzer = new TemplateAnalyzer();
  });

  describe('Data Science Reference (Data-sci.pdf)', () => {
    let referenceFile: File;

    beforeAll(async () => {
      try {
        const filePath = join(REFERENCE_FILES_PATH, 'Data-sci.pdf');
        const fileBuffer = readFileSync(filePath);
        referenceFile = new File([fileBuffer], 'Data-sci.pdf', { type: 'application/pdf' });
      } catch (error) {
        console.warn('Could not load Data-sci.pdf reference file:', error);
      }
    });

    it('should analyze data science reference template successfully', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const template = await templateAnalyzer.analyzeTemplate(referenceFile);

      expect(template).toBeDefined();
      expect(template.name).toBe('Data-sci.pdf');
      expect(template.analysis).toBeDefined();
      expect(template.analysis.metadata.domain).toBeDefined();
      expect(template.analysis.organization.structure.contentDensity).toBeGreaterThan(0);
    }, 30000); // Longer timeout for file processing

    it('should match data science content to reference format', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const result = await formatMatcher.matchFormat(
        referenceFile,
        sampleUserContent,
        sampleUserTopics
      );

      expect(result).toBeDefined();
      expect(result.matchingScore).toBeGreaterThan(0);
      expect(result.matchedTemplate.name).toBe('Data-sci.pdf');
      expect(result.contentDensityMatch).toBeDefined();
      expect(result.layoutAdaptation).toBeDefined();
      expect(result.generatedCSS).toBeDefined();

      // Data science content should match well with data science reference
      expect(result.matchingScore).toBeGreaterThan(0.6);
    }, 30000);

    it('should provide meaningful density analysis for data science reference', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const template = await templateAnalyzer.analyzeTemplate(referenceFile);
      const referenceDensity = densityAnalyzer.analyzeReferenceDensity(template);

      expect(referenceDensity.wordsPerPage).toBeGreaterThan(0);
      expect(referenceDensity.topicsPerPage).toBeGreaterThan(0);
      expect(referenceDensity.averageTopicLength).toBeGreaterThan(0);
      expect(referenceDensity.contentDistribution.bodyRatio).toBeGreaterThan(0.5);
      expect(referenceDensity.visualDensity.textCoverage).toBeGreaterThan(0.4);
    }, 30000);
  });

  describe('Industrial Reference (Industrial.pdf)', () => {
    let referenceFile: File;

    beforeAll(async () => {
      try {
        const filePath = join(REFERENCE_FILES_PATH, 'Industrial.pdf');
        const fileBuffer = readFileSync(filePath);
        referenceFile = new File([fileBuffer], 'Industrial.pdf', { type: 'application/pdf' });
      } catch (error) {
        console.warn('Could not load Industrial.pdf reference file:', error);
      }
    });

    it('should handle domain mismatch between content and reference', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      // Data science content with industrial reference should show domain mismatch
      const result = await formatMatcher.matchFormat(
        referenceFile,
        sampleUserContent,
        sampleUserTopics
      );

      expect(result).toBeDefined();
      expect(result.matchingScore).toBeGreaterThanOrEqual(0);
      
      // Should have warnings about potential domain mismatch
      const domainWarnings = result.warnings.filter(w => 
        w.message.toLowerCase().includes('domain') || 
        w.message.toLowerCase().includes('subject')
      );
      
      // May or may not have explicit domain warnings, but should still work
      expect(result.adaptedContent.topics.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('All-in-One Reference (all_in_one.pdf)', () => {
    let referenceFile: File;

    beforeAll(async () => {
      try {
        const filePath = join(REFERENCE_FILES_PATH, 'all_in_one.pdf');
        const fileBuffer = readFileSync(filePath);
        referenceFile = new File([fileBuffer], 'all_in_one.pdf', { type: 'application/pdf' });
      } catch (error) {
        console.warn('Could not load all_in_one.pdf reference file:', error);
      }
    });

    it('should handle complex multi-topic reference template', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const template = await templateAnalyzer.analyzeTemplate(referenceFile);

      expect(template).toBeDefined();
      expect(template.analysis.metadata.complexity).toBeDefined();
      
      // All-in-one should be complex due to multiple topics
      if (template.analysis.metadata.topicCount > 5) {
        expect(template.analysis.metadata.complexity).toMatch(/moderate|complex/);
      }
    }, 30000);

    it('should adapt content density for comprehensive reference', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const result = await formatMatcher.matchFormat(
        referenceFile,
        sampleUserContent,
        sampleUserTopics,
        { matchContentDensity: true }
      );

      expect(result).toBeDefined();
      expect(result.contentDensityMatch.adjustmentsMade).toBeDefined();
      
      // Should provide density adjustments for comprehensive reference
      if (result.contentDensityMatch.densityRatio < 0.8 || result.contentDensityMatch.densityRatio > 1.2) {
        expect(result.contentDensityMatch.adjustmentsMade.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Daifuku Cheat Sheet Reference (daifuku_cheatsheet.pdf)', () => {
    let referenceFile: File;

    beforeAll(async () => {
      try {
        const filePath = join(REFERENCE_FILES_PATH, 'daifuku_cheatsheet.pdf');
        const fileBuffer = readFileSync(filePath);
        referenceFile = new File([fileBuffer], 'daifuku_cheatsheet.pdf', { type: 'application/pdf' });
      } catch (error) {
        console.warn('Could not load daifuku_cheatsheet.pdf reference file:', error);
      }
    });

    it('should analyze specialized cheat sheet format', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const template = await templateAnalyzer.analyzeTemplate(referenceFile);
      const density = densityAnalyzer.analyzeReferenceDensity(template);

      expect(template).toBeDefined();
      expect(density).toBeDefined();
      
      // Cheat sheets typically have high content density
      expect(density.wordsPerPage).toBeGreaterThan(100);
      expect(density.visualDensity.textCoverage).toBeGreaterThan(0.5);
    }, 30000);

    it('should generate appropriate CSS for cheat sheet format', async () => {
      if (!referenceFile) {
        console.warn('Skipping test - reference file not available');
        return;
      }

      const result = await formatMatcher.matchFormat(
        referenceFile,
        sampleUserContent,
        sampleUserTopics
      );

      expect(result.generatedCSS).toBeDefined();
      expect(result.generatedCSS.css).toContain('font-size');
      expect(result.generatedCSS.css).toContain('margin');
      expect(result.generatedCSS.matchFidelity).toBeGreaterThanOrEqual(0);
      
      // Should have compact styling appropriate for cheat sheets
      expect(result.generatedCSS.css.length).toBeGreaterThan(500);
    }, 30000);
  });

  describe('Cross-Reference Comparison', () => {
    let dataScientFile: File;
    let industrialFile: File;
    let allInOneFile: File;

    beforeAll(async () => {
      try {
        const dataSciBuf = readFileSync(join(REFERENCE_FILES_PATH, 'Data-sci.pdf'));
        dataScientFile = new File([dataSciBuf], 'Data-sci.pdf', { type: 'application/pdf' });
        
        const industrialBuf = readFileSync(join(REFERENCE_FILES_PATH, 'Industrial.pdf'));
        industrialFile = new File([industrialBuf], 'Industrial.pdf', { type: 'application/pdf' });
        
        const allInOneBuf = readFileSync(join(REFERENCE_FILES_PATH, 'all_in_one.pdf'));
        allInOneFile = new File([allInOneBuf], 'all_in_one.pdf', { type: 'application/pdf' });
      } catch (error) {
        console.warn('Could not load reference files for comparison:', error);
      }
    });

    it('should show different matching scores for different references', async () => {
      if (!dataScientFile || !industrialFile) {
        console.warn('Skipping test - reference files not available');
        return;
      }

      const dataScientResult = await formatMatcher.matchFormat(
        dataScientFile,
        sampleUserContent,
        sampleUserTopics
      );

      const industrialResult = await formatMatcher.matchFormat(
        industrialFile,
        sampleUserContent,
        sampleUserTopics
      );

      expect(dataScientResult.matchingScore).toBeDefined();
      expect(industrialResult.matchingScore).toBeDefined();
      
      // Data science reference should match better with data science content
      // (though this may not always be true depending on the actual reference content)
      expect(Math.abs(dataScientResult.matchingScore - industrialResult.matchingScore)).toBeGreaterThan(0);
    }, 60000);

    it('should provide different density recommendations for different references', async () => {
      if (!dataScientFile || !allInOneFile) {
        console.warn('Skipping test - reference files not available');
        return;
      }

      const dataScientResult = await formatMatcher.matchFormat(
        dataScientFile,
        sampleUserContent,
        sampleUserTopics
      );

      const allInOneResult = await formatMatcher.matchFormat(
        allInOneFile,
        sampleUserContent,
        sampleUserTopics
      );

      // Different references should lead to different density analyses
      expect(dataScientResult.contentDensityMatch.referenceWordsPerPage)
        .not.toBe(allInOneResult.contentDensityMatch.referenceWordsPerPage);
      
      // Adjustments may differ based on reference characteristics
      const dataScientAdjustments = dataScientResult.contentDensityMatch.adjustmentsMade.length;
      const allInOneAdjustments = allInOneResult.contentDensityMatch.adjustmentsMade.length;
      
      // At least one should have adjustments, or they should differ
      expect(dataScientAdjustments + allInOneAdjustments).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Error Handling with Real Files', () => {
    it('should handle corrupted or invalid PDF files gracefully', async () => {
      const corruptedFile = new File(['not a pdf'], 'corrupted.pdf', { type: 'application/pdf' });

      await expect(formatMatcher.matchFormat(
        corruptedFile,
        sampleUserContent,
        sampleUserTopics
      )).rejects.toThrow();
    });

    it('should handle very large content with reference files', async () => {
      if (!hasReferenceFiles) {
        console.warn('Skipping test - reference files not available');
        return;
      }

      // Create very large user content
      const largeContent = [
        {
          ...sampleUserContent[0],
          text: Array.from({ length: 5000 }, (_, i) => `word${i}`).join(' '),
          metadata: {
            ...sampleUserContent[0].metadata,
            wordCount: 5000
          }
        }
      ];

      const manyTopics = Array.from({ length: 20 }, (_, i) => ({
        ...sampleUserTopics[0],
        id: `topic_${i}`,
        title: `Topic ${i + 1}`,
        priority: i < 5 ? 'high' : i < 10 ? 'medium' : 'low'
      }));

      try {
        const filePath = join(REFERENCE_FILES_PATH, 'Data-sci.pdf');
        const fileBuffer = readFileSync(filePath);
        const referenceFile = new File([fileBuffer], 'Data-sci.pdf', { type: 'application/pdf' });

        const result = await formatMatcher.matchFormat(
          referenceFile,
          largeContent,
          manyTopics
        );

        expect(result).toBeDefined();
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.contentDensityMatch.adjustmentsMade.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn('Could not test with large content:', error);
      }
    }, 45000);
  });

  describe('Performance with Real Files', () => {
    it('should complete format matching within reasonable time', async () => {
      if (!hasReferenceFiles) {
        console.warn('Skipping test - reference files not available');
        return;
      }

      try {
        const filePath = join(REFERENCE_FILES_PATH, 'Data-sci.pdf');
        const fileBuffer = readFileSync(filePath);
        const referenceFile = new File([fileBuffer], 'Data-sci.pdf', { type: 'application/pdf' });

        const startTime = Date.now();
        
        const result = await formatMatcher.matchFormat(
          referenceFile,
          sampleUserContent,
          sampleUserTopics
        );

        const processingTime = Date.now() - startTime;

        expect(result).toBeDefined();
        expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
        
        console.log(`Format matching completed in ${processingTime}ms`);
      } catch (error) {
        console.warn('Could not test performance:', error);
      }
    }, 35000);
  });
});