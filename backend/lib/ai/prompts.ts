import { ExtractedContent, TopicExtractionRequest, OrganizedTopic } from './types';

export class PromptTemplates {
  static createTopicExtractionPrompt(request: TopicExtractionRequest): string {
    const contentSummary = request.content.map((content, index) => {
      return `Document ${index + 1} (${content.metadata.name}):
- Text length: ${content.text.length} characters
- Images: ${content.images.length}
- Tables: ${content.tables.length}
- Structure: ${content.structure.headings.length} headings, ${content.structure.sections.length} sections

Content preview:
${content.text.substring(0, 500)}${content.text.length > 500 ? '...' : ''}`;
    }).join('\n\n');

    const focusAreas = request.userPreferences.focusAreas && request.userPreferences.focusAreas.length > 0 
      ? `\nFocus on these areas: ${request.userPreferences.focusAreas.join(', ')}`
      : '';

    const excludePatterns = request.userPreferences.excludePatterns && request.userPreferences.excludePatterns.length > 0
      ? `\nExclude content matching: ${request.userPreferences.excludePatterns.join(', ')}`
      : '';

    return `You are an expert content analyzer tasked with extracting and organizing topics from educational materials. Your goal is to identify the main topics and subtopics while preserving the original wording and context.

CRITICAL REQUIREMENTS:
1. PRESERVE ORIGINAL WORDING: Use exact phrases and terminology from the source materials
2. NO EXTERNAL CONTENT: Only extract information present in the provided documents
3. MAINTAIN CONTEXT: Keep the educational context and meaning intact
4. HIERARCHICAL ORGANIZATION: Create logical topic hierarchies with main topics and subtopics

Documents to analyze:
${contentSummary}

User preferences:
- Maximum topics: ${request.userPreferences.maxTopics}${focusAreas}${excludePatterns}

Please analyze the content and extract topics following this JSON structure:
{
  "topics": [
    {
      "id": "unique_topic_id",
      "title": "Main Topic Title (using original wording)",
      "content": "Key content for this topic (preserve original wording)",
      "originalWording": "Exact text from source that defines this topic",
      "confidence": 0.95,
      "sourceFiles": ["document_name_1", "document_name_2"],
      "subtopics": [
        {
          "id": "unique_subtopic_id",
          "title": "Subtopic Title (original wording)",
          "content": "Subtopic content (preserve original phrases)",
          "confidence": 0.90,
          "sourceLocation": {
            "fileId": "document_name",
            "section": "section_name_if_available"
          }
        }
      ]
    }
  ]
}

Focus on:
- Educational value and study relevance
- Clear topic boundaries without overlap
- Logical progression from basic to advanced concepts
- Preservation of technical terminology and definitions
- Maintaining the original author's explanations and examples`;
  }

  static createContentOrganizationPrompt(topics: any[]): string {
    return `You are tasked with organizing extracted topics into a coherent structure for a study cheat sheet. 

REQUIREMENTS:
1. Eliminate duplicate or highly overlapping topics
2. Create logical groupings and hierarchies
3. Preserve all original wording and terminology
4. Maintain educational flow from basic to advanced
5. Ensure each topic has clear, distinct value

Topics to organize:
${JSON.stringify(topics, null, 2)}

Please reorganize these topics following this JSON structure:
{
  "organizedTopics": [
    {
      "id": "reorganized_topic_id",
      "title": "Consolidated Topic Title",
      "content": "Merged content preserving all key information",
      "originalWording": "Combined original text from sources",
      "confidence": 0.95,
      "sourceFiles": ["all_source_files"],
      "subtopics": [
        {
          "id": "consolidated_subtopic_id",
          "title": "Merged Subtopic Title",
          "content": "Combined subtopic content",
          "confidence": 0.90,
          "sourceLocation": {
            "fileId": "primary_source",
            "section": "relevant_section"
          }
        }
      ]
    }
  ],
  "duplicatesRemoved": [
    {
      "removedTopicId": "duplicate_topic_id",
      "mergedIntoId": "target_topic_id",
      "reason": "Explanation of why it was considered duplicate"
    }
  ]
}

Prioritize:
- Comprehensive coverage without redundancy
- Logical study progression
- Preservation of all unique information
- Clear topic boundaries`;
  }

  static createContentValidationPrompt(originalText: string, processedText: string): string {
    return `You are a content fidelity validator. Compare the original text with the processed version to ensure accuracy and preservation of meaning.

ORIGINAL TEXT:
${originalText}

PROCESSED TEXT:
${processedText}

Analyze the processed text for:
1. Added information not in the original
2. Changed meanings or interpretations
3. Lost important context or details
4. Terminology changes that affect accuracy

Provide your analysis in this JSON format:
{
  "fidelityScore": 0.95,
  "recommendation": "accept",
  "issues": [
    {
      "type": "added_content",
      "severity": "medium",
      "description": "Specific description of the issue",
      "originalText": "Relevant original text snippet",
      "processedText": "Corresponding processed text snippet"
    }
  ]
}

Fidelity score scale:
- 0.9-1.0: Excellent preservation, minor or no issues
- 0.7-0.89: Good preservation, some minor changes
- 0.5-0.69: Moderate issues, review recommended
- 0.0-0.49: Significant issues, reject or major revision needed

Recommendation options: "accept", "review", "reject"`;
  }

  static createImageContextAnalysisPrompt(imageContext: string, ocrText: string): string {
    return `Analyze this image context and OCR text to determine if it contains educational examples, diagrams, or important visual information for a study cheat sheet.

IMAGE CONTEXT: ${imageContext}
OCR TEXT: ${ocrText}

Determine:
1. Is this an educational example or diagram?
2. Does it contain important information for studying?
3. What type of content is it (formula, diagram, example problem, etc.)?
4. Should it be included in a cheat sheet?

Respond in JSON format:
{
  "isEducational": true,
  "contentType": "example_problem",
  "importance": "high",
  "description": "Brief description of the content",
  "includeInCheatSheet": true,
  "extractedConcepts": ["concept1", "concept2"]
}

Content types: "formula", "diagram", "example_problem", "chart", "table", "illustration", "other"
Importance levels: "high", "medium", "low"`;
  }

  static createImageRecreationAnalysisPrompt(
    imageContext: string, 
    ocrText: string, 
    isExample: boolean
  ): string {
    return `Analyze this image to determine if it needs recreation for a cheat sheet and generate an appropriate description for AI image generation.

IMAGE CONTEXT: ${imageContext}
OCR TEXT: ${ocrText}
IS EXAMPLE: ${isExample}

Analyze:
1. Does this image need recreation for better clarity/quality in a cheat sheet?
2. What type of educational content does it contain?
3. How complex is the visual information?
4. What elements should be preserved in recreation?

Consider recreation if:
- Image quality is poor or blurry
- Text is hard to read
- Contains important diagrams that could be clearer
- Has educational examples that would benefit from clean recreation

Please respond with a JSON object containing your analysis:
{
  "needsRecreation": true,
  "recreationReason": "Poor image quality makes text hard to read",
  "contentType": "diagram",
  "educationalValue": "high",
  "complexity": "moderate",
  "extractedElements": ["formula", "diagram", "labels"],
  "generationPrompt": "Clean mathematical diagram showing [specific description] with clear labels and formulas"
}

Content types: "diagram", "example", "chart", "formula", "illustration", "text", "other"
Educational value: "high", "medium", "low"
Complexity: "simple", "moderate", "complex"`;
  }

  static createImageQualityAssessmentPrompt(
    originalImage: any,
    recreatedImage?: any
  ): string {
    const hasRecreated = recreatedImage ? 'YES' : 'NO';
    
    return `Assess the quality of educational images for use in a cheat sheet.

ORIGINAL IMAGE CONTEXT: ${originalImage.context}
ORIGINAL OCR TEXT: ${originalImage.ocrText || 'None'}
IS EXAMPLE: ${originalImage.isExample}

RECREATED IMAGE AVAILABLE: ${hasRecreated}
${recreatedImage ? `RECREATED PROMPT: ${recreatedImage.prompt}` : ''}

Assess both images on these factors:
1. CLARITY: How clear and readable is the content?
2. RELEVANCE: How relevant is it to the educational context?
3. ACCURACY: How accurate is the information presented?
4. READABILITY: How easy is it to read in a cheat sheet format?

Please provide your assessment as a JSON object with scores (0-1) and recommendation:

{
  "originalScore": 0.75,
  "recreatedScore": 0.85,
  "recommendation": "use_recreated",
  "factors": {
    "clarity": 0.8,
    "relevance": 0.9,
    "accuracy": 0.85,
    "readability": 0.8
  },
  "issues": [
    {
      "type": "clarity",
      "severity": "low",
      "description": "Minor clarity issues in original",
      "suggestion": "Recreated version has better contrast"
    }
  ]
}

Recommendations: "use_original", "use_recreated", "needs_review"
Issue types: "clarity", "accuracy", "relevance", "readability", "content_mismatch"
Severity levels: "low", "medium", "high"`;
  }

  static createSpaceAwareTopicExtractionPrompt(request: TopicExtractionRequest): string {
    const contentSummary = request.content.map((content, index) => {
      return `Document ${index + 1} (${content.metadata.name}):
- Text length: ${content.text.length} characters
- Images: ${content.images.length}
- Tables: ${content.tables.length}
- Structure: ${content.structure.headings.length} headings, ${content.structure.sections.length} sections

Content preview:
${content.text.substring(0, 500)}${content.text.length > 500 ? '...' : ''}`;
    }).join('\n\n');

    const spaceInfo = request.spaceConstraints ? `
SPACE CONSTRAINTS:
- Available pages: ${request.spaceConstraints.availablePages}
- Page size: ${request.spaceConstraints.pageSize}
- Font size: ${request.spaceConstraints.fontSize}
- Columns: ${request.spaceConstraints.columns}
- Target utilization: ${(request.spaceConstraints.targetUtilization * 100).toFixed(0)}%
${request.spaceConstraints.referenceContentDensity ? `- Reference content density: ${request.spaceConstraints.referenceContentDensity} chars/page` : ''}` : '';

    const referenceInfo = request.referenceAnalysis ? `
REFERENCE ANALYSIS:
- Content density: ${request.referenceAnalysis.contentDensity} characters per page
- Topic count: ${request.referenceAnalysis.topicCount}
- Average topic length: ${request.referenceAnalysis.averageTopicLength}
- Layout pattern: ${request.referenceAnalysis.layoutPattern}
- Organization style: ${request.referenceAnalysis.organizationStyle}` : '';

    const focusAreas = request.userPreferences.focusAreas && request.userPreferences.focusAreas.length > 0 
      ? `\nFocus on these areas: ${request.userPreferences.focusAreas.join(', ')}`
      : '';

    const excludePatterns = request.userPreferences.excludePatterns && request.userPreferences.excludePatterns.length > 0
      ? `\nExclude content matching: ${request.userPreferences.excludePatterns.join(', ')}`
      : '';

    return `You are an expert content analyzer specializing in space-optimized topic extraction for cheat sheets. Your goal is to extract topics that maximize information density while fitting within space constraints.

CRITICAL REQUIREMENTS:
1. PRESERVE ORIGINAL WORDING: Use exact phrases and terminology from source materials
2. SPACE OPTIMIZATION: Consider available space and optimize topic selection for maximum utility
3. GRANULAR SUBTOPICS: Create detailed subtopics that can be individually selected
4. PRIORITY ASSIGNMENT: Assign priorities (high/medium/low) based on educational importance
5. NO EXTERNAL CONTENT: Only extract information present in the provided documents

Documents to analyze:
${contentSummary}

${spaceInfo}

${referenceInfo}

User preferences:
- Maximum topics: ${request.userPreferences.maxTopics}${focusAreas}${excludePatterns}

SPACE-AWARE EXTRACTION GUIDELINES:
- Prioritize high-value, concise content that fits space constraints
- Create granular subtopics for flexible selection
- Consider reference patterns if provided
- Assign realistic priorities based on educational importance
- Estimate content length for space planning

Please analyze the content and extract topics following this JSON structure:
{
  "topics": [
    {
      "id": "unique_topic_id",
      "title": "Main Topic Title (using original wording)",
      "content": "Key content for this topic (preserve original wording)",
      "originalWording": "Exact text from source that defines this topic",
      "confidence": 0.95,
      "priority": "high",
      "sourceFiles": ["document_name_1", "document_name_2"],
      "subtopics": [
        {
          "id": "unique_subtopic_id",
          "title": "Subtopic Title (original wording)",
          "content": "Subtopic content (preserve original phrases)",
          "confidence": 0.90,
          "priority": "medium",
          "sourceLocation": {
            "fileId": "document_name",
            "section": "section_name_if_available"
          }
        }
      ]
    }
  ],
  "spaceAnalysis": {
    "estimatedTotalLength": 2500,
    "topicDistribution": "balanced",
    "priorityBreakdown": {
      "high": 3,
      "medium": 5,
      "low": 2
    }
  }
}

Priority assignment guidelines:
- HIGH: Core concepts, definitions, formulas, essential principles
- MEDIUM: Important examples, methods, applications, explanations
- LOW: Additional details, tips, optional information, background context

Focus on creating a balanced mix that maximizes educational value within space constraints.`;
  }

  static createGranularSubtopicExtractionPrompt(topic: OrganizedTopic): string {
    return `You are tasked with breaking down a topic into granular, individually selectable subtopics for a cheat sheet. Each subtopic should be self-contained and valuable on its own.

TOPIC TO ANALYZE:
Title: ${topic.title}
Content: ${topic.content}
Original Wording: ${topic.originalWording}

REQUIREMENTS:
1. Create granular subtopics that can be individually selected
2. Preserve original wording and terminology
3. Ensure each subtopic is self-contained and valuable
4. Assign appropriate priorities based on educational importance
5. Estimate space requirements for each subtopic

Please break down this topic into granular subtopics following this JSON structure:
{
  "subtopics": [
    {
      "id": "granular_subtopic_id",
      "title": "Specific Subtopic Title",
      "content": "Self-contained content for this subtopic",
      "confidence": 0.90,
      "priority": "high",
      "estimatedLength": 150,
      "sourceLocation": {
        "fileId": "source_document",
        "section": "relevant_section"
      }
    }
  ],
  "extractionSummary": {
    "totalSubtopics": 4,
    "averageLength": 125,
    "priorityDistribution": {
      "high": 1,
      "medium": 2,
      "low": 1
    }
  }
}

Guidelines for granular extraction:
- Each subtopic should cover a single concept or idea
- Subtopics should be independently valuable
- Maintain logical flow and relationships
- Preserve technical accuracy and original terminology
- Consider space efficiency in content selection`;
  }
}