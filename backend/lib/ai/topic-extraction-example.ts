/**
 * Example usage of the Topic Extraction Service
 * This demonstrates how to use the intelligent topic extraction and organization functionality
 */

import { getTopicExtractionService } from './topic-extraction-service';
import { ExtractedContent, FileMetadata, DocumentStructure } from './types';

export async function demonstrateTopicExtraction() {
  const service = getTopicExtractionService();

  // Example extracted content from multiple documents
  const sampleContent: ExtractedContent[] = [
    {
      text: `
        Machine Learning Fundamentals
        
        Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. There are three main types of machine learning:
        
        1. Supervised Learning: Uses labeled training data to learn a mapping function from inputs to outputs. Common algorithms include linear regression, decision trees, and neural networks.
        
        2. Unsupervised Learning: Finds hidden patterns in data without labeled examples. Clustering and dimensionality reduction are common techniques.
        
        3. Reinforcement Learning: Learns through interaction with an environment, receiving rewards or penalties for actions taken.
        
        Key concepts include overfitting, cross-validation, and feature engineering.
      `,
      images: [],
      tables: [],
      metadata: {
        name: 'ml-fundamentals.pdf',
        size: 2048,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 3,
        wordCount: 120
      } as FileMetadata,
      structure: {
        headings: [
          { level: 1, text: 'Machine Learning Fundamentals', position: 0 },
          { level: 2, text: 'Types of Learning', position: 200 },
          { level: 2, text: 'Key Concepts', position: 800 }
        ],
        sections: [
          { title: 'Introduction', content: 'Machine learning is...', startPosition: 0, endPosition: 200 },
          { title: 'Learning Types', content: 'There are three main types...', startPosition: 200, endPosition: 800 },
          { title: 'Important Concepts', content: 'Key concepts include...', startPosition: 800, endPosition: 1000 }
        ],
        hierarchy: 2
      } as DocumentStructure
    },
    {
      text: `
        Deep Learning and Neural Networks
        
        Deep learning is a specialized subset of machine learning that uses artificial neural networks with multiple layers. These networks can automatically learn hierarchical representations of data.
        
        Neural Network Architecture:
        - Input Layer: Receives the raw data
        - Hidden Layers: Process and transform the data (multiple layers make it "deep")
        - Output Layer: Produces the final prediction or classification
        
        Common architectures include:
        - Convolutional Neural Networks (CNNs) for image processing
        - Recurrent Neural Networks (RNNs) for sequential data
        - Transformers for natural language processing
        
        Training involves backpropagation and gradient descent optimization.
      `,
      images: [],
      tables: [],
      metadata: {
        name: 'deep-learning-guide.pdf',
        size: 3072,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 5,
        wordCount: 150
      } as FileMetadata,
      structure: {
        headings: [
          { level: 1, text: 'Deep Learning and Neural Networks', position: 0 },
          { level: 2, text: 'Neural Network Architecture', position: 300 },
          { level: 2, text: 'Common Architectures', position: 600 }
        ],
        sections: [
          { title: 'Overview', content: 'Deep learning is...', startPosition: 0, endPosition: 300 },
          { title: 'Architecture', content: 'Neural networks consist of...', startPosition: 300, endPosition: 600 },
          { title: 'Types', content: 'Common architectures include...', startPosition: 600, endPosition: 900 }
        ],
        hierarchy: 2
      } as DocumentStructure
    }
  ];

  // User preferences for topic extraction
  const userPreferences = {
    maxTopics: 8,
    focusAreas: ['machine learning', 'neural networks', 'algorithms'],
    excludePatterns: ['introduction', 'overview']
  };

  // Configuration for the extraction process
  const config = {
    minConfidenceThreshold: 0.6,
    duplicateSimilarityThreshold: 0.75,
    preserveOriginalWording: true,
    enableHierarchicalOrganization: true
  };

  try {
    console.log('🔍 Starting topic extraction and organization...');
    
    const result = await service.extractAndOrganizeTopics(
      sampleContent,
      userPreferences,
      config
    );

    console.log('\n📊 Extraction Results:');
    console.log(`- Extracted ${result.processingStats.extractedTopicCount} initial topics`);
    console.log(`- Organized into ${result.processingStats.finalTopicCount} final topics`);
    console.log(`- Found ${result.duplicatesFound.length} duplicate groups`);
    console.log(`- Processing time: ${result.processingStats.processingTimeMs}ms`);

    console.log('\n📈 Confidence Metrics:');
    console.log(`- Average confidence: ${(result.confidenceMetrics.averageConfidence * 100).toFixed(1)}%`);
    console.log(`- High confidence topics: ${result.confidenceMetrics.highConfidenceTopics}`);
    console.log(`- Medium confidence topics: ${result.confidenceMetrics.mediumConfidenceTopics}`);
    console.log(`- Low confidence topics: ${result.confidenceMetrics.lowConfidenceTopics}`);

    console.log('\n📚 Organized Topics:');
    result.mainTopics.forEach((topic, index) => {
      console.log(`\n${index + 1}. ${topic.title} (Confidence: ${(topic.confidence * 100).toFixed(1)}%)`);
      console.log(`   Content: ${topic.content.substring(0, 100)}...`);
      console.log(`   Sources: ${topic.sourceFiles.join(', ')}`);
      
      if (topic.subtopics.length > 0) {
        console.log('   Subtopics:');
        topic.subtopics.forEach((subtopic, subIndex) => {
          console.log(`     ${subIndex + 1}. ${subtopic.title} (${(subtopic.confidence * 100).toFixed(1)}%)`);
        });
      }
    });

    if (result.duplicatesFound.length > 0) {
      console.log('\n🔄 Duplicate Groups Found:');
      result.duplicatesFound.forEach((duplicate, index) => {
        console.log(`${index + 1}. Merged topics ${duplicate.duplicateTopics.join(', ')} into ${duplicate.mergedIntoId}`);
        console.log(`   Similarity: ${(duplicate.similarity * 100).toFixed(1)}%`);
        console.log(`   Reason: ${duplicate.reason}`);
      });
    }

    return result;

  } catch (error) {
    console.error('❌ Topic extraction failed:', error);
    throw error;
  }
}

// Example of how to use the service with different configurations
export async function demonstrateConfigurationOptions() {
  const service = getTopicExtractionService();
  
  // Minimal sample content for demonstration
  const minimalContent: ExtractedContent[] = [
    {
      text: 'Artificial intelligence and machine learning are transforming technology.',
      images: [],
      tables: [],
      metadata: { name: 'sample.txt', size: 100, type: 'text/plain', lastModified: new Date() } as FileMetadata,
      structure: { headings: [], sections: [], hierarchy: 0 } as DocumentStructure
    }
  ];

  const userPreferences = {
    maxTopics: 5,
    focusAreas: [],
    excludePatterns: []
  };

  console.log('\n🔧 Testing Different Configurations:');

  // High confidence threshold - only very confident topics
  console.log('\n1. High Confidence Threshold (0.9):');
  try {
    const highConfidenceResult = await service.extractAndOrganizeTopics(
      minimalContent,
      userPreferences,
      { minConfidenceThreshold: 0.9 }
    );
    console.log(`   Topics found: ${highConfidenceResult.mainTopics.length}`);
  } catch (error) {
    console.log('   Error with high confidence threshold (expected with mock data)');
  }

  // Strict duplicate detection
  console.log('\n2. Strict Duplicate Detection (0.95 similarity):');
  try {
    const strictDuplicateResult = await service.extractAndOrganizeTopics(
      minimalContent,
      userPreferences,
      { duplicateSimilarityThreshold: 0.95 }
    );
    console.log(`   Duplicates found: ${strictDuplicateResult.duplicatesFound.length}`);
  } catch (error) {
    console.log('   Error with strict duplicate detection (expected with mock data)');
  }

  // Disabled hierarchical organization
  console.log('\n3. Flat Organization (no hierarchy):');
  try {
    const flatResult = await service.extractAndOrganizeTopics(
      minimalContent,
      userPreferences,
      { enableHierarchicalOrganization: false }
    );
    console.log(`   Topics organized: ${flatResult.mainTopics.length}`);
  } catch (error) {
    console.log('   Error with flat organization (expected with mock data)');
  }
}

// Export for use in other parts of the application
export { getTopicExtractionService } from './topic-extraction-service';