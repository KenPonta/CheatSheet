/**
 * Example usage of the AI Content Service
 * This file demonstrates how to use the AI service for cheat sheet generation
 */

import { getAIContentService } from './content-service';
import { ExtractedContent, TopicExtractionRequest } from './types';

// Example: Extract topics from educational content
export async function exampleTopicExtraction() {
  const aiService = getAIContentService();

  // Sample extracted content (would come from file processors)
  const extractedContent: ExtractedContent = {
    text: `
      Calculus is the mathematical study of continuous change. 
      The derivative of a function measures the rate of change.
      The fundamental theorem of calculus connects derivatives and integrals.
      
      Basic derivative rules:
      - Power rule: d/dx(x^n) = nx^(n-1)
      - Product rule: d/dx(uv) = u'v + uv'
      - Chain rule: d/dx(f(g(x))) = f'(g(x)) * g'(x)
    `,
    images: [
      {
        id: 'img1',
        base64: 'base64-encoded-image-data',
        ocrText: 'f(x) = x² + 2x + 1',
        context: 'Example quadratic function from chapter 3',
        isExample: true
      }
    ],
    tables: [],
    metadata: {
      name: 'calculus-textbook.pdf',
      size: 1024000,
      type: 'application/pdf',
      lastModified: new Date(),
      pageCount: 50,
      wordCount: 1500
    },
    structure: {
      headings: [
        { level: 1, text: 'Introduction to Calculus', position: 0 },
        { level: 2, text: 'Derivatives', position: 100 },
        { level: 2, text: 'Basic Rules', position: 200 }
      ],
      sections: [
        { title: 'Introduction', content: 'Overview of calculus', startPosition: 0, endPosition: 99 },
        { title: 'Derivatives', content: 'Rate of change concepts', startPosition: 100, endPosition: 199 },
        { title: 'Rules', content: 'Derivative calculation rules', startPosition: 200, endPosition: 299 }
      ],
      hierarchy: 2
    }
  };

  const request: TopicExtractionRequest = {
    content: [extractedContent],
    userPreferences: {
      maxTopics: 5,
      focusAreas: ['derivatives', 'calculus rules'],
      excludePatterns: ['homework', 'exercises']
    }
  };

  try {
    // Extract topics from content
    console.log('Extracting topics from content...');
    const topics = await aiService.extractTopics(request);
    
    console.log(`Extracted ${topics.length} topics:`);
    topics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.title} (confidence: ${topic.confidence})`);
      console.log(`   Content: ${topic.content.substring(0, 100)}...`);
      console.log(`   Subtopics: ${topic.subtopics.length}`);
    });

    // Organize content to remove duplicates
    console.log('\nOrganizing content...');
    const organizedTopics = await aiService.organizeContent(topics);
    
    console.log(`Organized into ${organizedTopics.length} topics:`);
    organizedTopics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.title}`);
    });

    // Validate content fidelity
    console.log('\nValidating content fidelity...');
    const originalText = extractedContent.text.substring(0, 200);
    const processedText = topics[0]?.content || '';
    
    const fidelityScore = await aiService.validateContentFidelity(originalText, processedText);
    
    console.log(`Fidelity Score: ${fidelityScore.score}`);
    console.log(`Recommendation: ${fidelityScore.recommendation}`);
    if (fidelityScore.issues.length > 0) {
      console.log('Issues found:');
      fidelityScore.issues.forEach(issue => {
        console.log(`- ${issue.type}: ${issue.description}`);
      });
    }

    // Analyze image context
    if (extractedContent.images.length > 0) {
      console.log('\nAnalyzing image context...');
      const imageAnalysis = await aiService.analyzeImageContext(extractedContent.images[0]);
      
      console.log(`Image is educational: ${imageAnalysis.isEducational}`);
      console.log(`Content type: ${imageAnalysis.contentType}`);
      console.log(`Importance: ${imageAnalysis.importance}`);
      console.log(`Include in cheat sheet: ${imageAnalysis.includeInCheatSheet}`);
      console.log(`Extracted concepts: ${imageAnalysis.extractedConcepts.join(', ')}`);
    }

    return organizedTopics;

  } catch (error) {
    console.error('AI processing failed:', error);
    throw error;
  }
}

// Example: Error handling and retry logic
export async function exampleErrorHandling() {
  const aiService = getAIContentService();

  const mockContent: ExtractedContent = {
    text: 'Sample content for testing error handling',
    images: [],
    tables: [],
    metadata: {
      name: 'test.pdf',
      size: 1000,
      type: 'application/pdf',
      lastModified: new Date()
    },
    structure: {
      headings: [],
      sections: [],
      hierarchy: 0
    }
  };

  const request: TopicExtractionRequest = {
    content: [mockContent],
    userPreferences: {
      maxTopics: 3,
      focusAreas: [],
      excludePatterns: []
    }
  };

  try {
    const topics = await aiService.extractTopics(request);
    console.log('Success:', topics.length, 'topics extracted');
    return topics;
  } catch (error: any) {
    if (error.code === 'RATE_LIMIT') {
      console.log('Rate limit hit, should retry automatically');
      // The client handles retries automatically
    } else if (error.code === 'API_ERROR' && error.retryable) {
      console.log('Retryable API error occurred');
      // Could implement custom retry logic here if needed
    } else {
      console.log('Non-retryable error:', error.message);
      // Handle permanent failures
    }
    throw error;
  }
}

// Example: Batch processing multiple documents
export async function exampleBatchProcessing(documents: ExtractedContent[]) {
  const aiService = getAIContentService();

  const request: TopicExtractionRequest = {
    content: documents,
    userPreferences: {
      maxTopics: 15, // More topics for multiple documents
      focusAreas: [],
      excludePatterns: ['index', 'table of contents', 'references']
    }
  };

  try {
    // Process all documents together for better topic correlation
    const topics = await aiService.extractTopics(request);
    
    // Organize to remove cross-document duplicates
    const organizedTopics = await aiService.organizeContent(topics);
    
    // Validate fidelity for each source document
    const fidelityResults = await Promise.all(
      documents.map(async (doc, index) => {
        const relevantTopics = organizedTopics.filter(topic => 
          topic.sourceFiles.includes(doc.metadata.name)
        );
        const combinedContent = relevantTopics.map(t => t.content).join(' ');
        
        return {
          document: doc.metadata.name,
          fidelity: await aiService.validateContentFidelity(doc.text, combinedContent)
        };
      })
    );

    console.log('Batch processing results:');
    console.log(`- Total topics: ${organizedTopics.length}`);
    console.log(`- Documents processed: ${documents.length}`);
    
    fidelityResults.forEach(result => {
      console.log(`- ${result.document}: ${result.fidelity.score} fidelity, ${result.fidelity.recommendation}`);
    });

    return {
      topics: organizedTopics,
      fidelityResults
    };

  } catch (error) {
    console.error('Batch processing failed:', error);
    throw error;
  }
}

// Export for use in other parts of the application
export { getAIContentService } from './content-service';