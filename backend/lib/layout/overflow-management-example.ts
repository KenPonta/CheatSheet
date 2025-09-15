/**
 * Example usage of the enhanced overflow management system
 * 
 * This demonstrates how to use the content overflow warning and management system
 * with intelligent content prioritization based on user topic selections.
 */

import { OverflowDetector } from './overflow-detector';
import { ContentPrioritizer, PrioritizationConfig } from './content-prioritizer';
import { LayoutConfig, ContentBlock } from './types';
import { OrganizedTopic } from '../ai/types';
import { createDefaultPageConfig } from './page-config';
import { getTextConfig } from './text-config';
import { createContentBlock } from './index';

// Example: Creating a cheat sheet with overflow management
export function demonstrateOverflowManagement() {
  // Step 1: Configure layout settings
  const layoutConfig: LayoutConfig = {
    page: createDefaultPageConfig('a4', 'portrait'),
    text: getTextConfig('medium'),
    maxPages: 2,
  };

  // Step 2: Configure content prioritization
  const prioritizationConfig: PrioritizationConfig = {
    userSelectedTopics: ['math-formulas', 'practice-problems'], // User's selections
    maxContentReduction: 30, // Allow up to 30% content reduction
    preserveHighValueContent: true,
    maintainTopicBalance: true,
  };

  // Step 3: Create overflow detector with prioritization
  const overflowDetector = new OverflowDetector(layoutConfig, prioritizationConfig);

  // Step 4: Sample topics (from AI content extraction)
  const topics: OrganizedTopic[] = [
    {
      id: 'math-formulas',
      title: 'Mathematical Formulas',
      content: 'Essential formulas for calculus including derivatives and integrals',
      subtopics: [],
      sourceFiles: ['textbook.pdf'],
      confidence: 0.95,
      examples: [{ id: 'formula-img', base64: 'data', context: 'formula', isExample: true }],
      originalWording: 'Mathematical Formulas',
    },
    {
      id: 'practice-problems',
      title: 'Practice Problems',
      content: 'Worked examples and practice exercises',
      subtopics: [],
      sourceFiles: ['workbook.pdf'],
      confidence: 0.88,
      examples: [{ id: 'problem-img', base64: 'data', context: 'problem', isExample: true }],
      originalWording: 'Practice Problems',
    },
    {
      id: 'historical-notes',
      title: 'Historical Background',
      content: 'Historical development of mathematical concepts',
      subtopics: [],
      sourceFiles: ['history.pdf'],
      confidence: 0.6,
      examples: [],
      originalWording: 'Historical Background',
    },
  ];

  // Step 5: Sample content blocks (from processed documents)
  const contentBlocks: ContentBlock[] = [
    { ...createContentBlock('math-formulas-main', 'Derivative: d/dx[x^n] = nx^(n-1)', 'heading', 9), estimatedHeight: 60 },
    { ...createContentBlock('math-formulas-examples', 'Example: d/dx[x³] = 3x²', 'paragraph', 8), estimatedHeight: 80 },
    { ...createContentBlock('practice-problems-basic', 'Problem 1: Find d/dx[5x⁴]', 'list', 8), estimatedHeight: 100 },
    { ...createContentBlock('practice-problems-advanced', 'Problem 2: Integrate ∫x²e^x dx', 'list', 7), estimatedHeight: 120 },
    { ...createContentBlock('historical-notes-main', 'Newton developed calculus in 1665...', 'paragraph', 3), estimatedHeight: 150 },
    // Add more content to simulate overflow
    ...Array.from({ length: 15 }, (_, i) => ({
      ...createContentBlock(`extra-content-${i}`, `Additional content block ${i}`, 'paragraph', 4),
      estimatedHeight: 70,
    })),
  ];

  // Step 6: Analyze overflow with prioritization
  console.log('=== Analyzing Content Overflow ===');
  const analysis = overflowDetector.analyzeOverflowWithPrioritization(contentBlocks, topics);

  if (analysis.hasOverflow) {
    console.log(`❌ Content overflow detected: ${Math.round(analysis.overflowAmount)}px`);
    console.log(`📊 Overflow percentage: ${Math.round((analysis.overflowAmount / 1000) * 100)}%`);
    
    // Step 7: Show content priorities
    if (analysis.priorities) {
      console.log('\n=== Content Priorities ===');
      analysis.priorities
        .sort((a, b) => b.priority - a.priority)
        .forEach(priority => {
          const status = priority.userSelected ? '✅ Selected' : '⭕ Not Selected';
          console.log(`${status} | Priority: ${priority.priority}/10 | ${priority.topicId} (${priority.educationalValue} value)`);
        });
    }

    // Step 8: Show reduction plan
    if (analysis.reductionPlan) {
      console.log('\n=== Reduction Plan ===');
      console.log(`🗑️  Removable blocks: ${analysis.reductionPlan.removableBlocks.length}`);
      console.log(`🗜️  Compressible blocks: ${analysis.reductionPlan.compressibleBlocks.length}`);
      console.log(`💾 Estimated space saved: ${Math.round(analysis.reductionPlan.estimatedSpaceSaved)}px`);
      console.log(`📈 Educational value loss: ${analysis.reductionPlan.impactAssessment.educationalValueLoss}`);
      console.log(`🔗 Content coherence: ${analysis.reductionPlan.impactAssessment.contentCoherence}`);
    }

    // Step 9: Show intelligent suggestions
    if (analysis.intelligentSuggestions) {
      console.log('\n=== Intelligent Suggestions ===');
      analysis.intelligentSuggestions.forEach((suggestion, index) => {
        const impactIcon = { low: '🟢', medium: '🟡', high: '🔴' }[suggestion.impact];
        console.log(`${index + 1}. ${impactIcon} ${suggestion.description}`);
        console.log(`   Impact: ${suggestion.impact} | Reduction: ${Math.round(suggestion.estimatedReduction)}px`);
      });
    }
  } else {
    console.log('✅ No overflow detected - content fits within specified pages');
  }

  // Step 10: Get detailed overflow information
  console.log('\n=== Detailed Content Analysis ===');
  const detailedInfo = overflowDetector.getDetailedOverflowInfo(contentBlocks);
  
  console.log(`📏 Total content height: ${Math.round(detailedInfo.overflowDetails.totalContentHeight)}px`);
  console.log(`📄 Available height: ${Math.round(detailedInfo.overflowDetails.availableHeight)}px`);
  console.log(`⚡ Space efficiency: ${Math.round(detailedInfo.spaceUtilization.efficiency * 100)}%`);

  // Show which content fits and which doesn't
  const fittingContent = detailedInfo.affectedContent.filter(c => c.willFit);
  const overflowingContent = detailedInfo.affectedContent.filter(c => !c.willFit);
  
  console.log(`✅ Content that fits: ${fittingContent.length} blocks`);
  console.log(`❌ Content that overflows: ${overflowingContent.length} blocks`);

  if (overflowingContent.length > 0) {
    console.log('\n=== Overflowing Content ===');
    overflowingContent.slice(0, 5).forEach(content => {
      console.log(`❌ ${content.blockId} (${content.blockType}): ${content.contentPreview}`);
      if (content.partialFit) {
        console.log(`   ⚠️  Partially fits: ${Math.round(content.partialFit.fittingPercentage * 100)}%`);
      }
    });
  }

  // Step 11: Generate layout warnings
  console.log('\n=== Layout Warnings ===');
  const warnings = overflowDetector.generateLayoutWarnings(contentBlocks);
  
  if (warnings.length === 0) {
    console.log('✅ No layout warnings');
  } else {
    warnings.forEach(warning => {
      const severityIcon = { low: '🟢', medium: '🟡', high: '🔴' }[warning.severity];
      console.log(`${severityIcon} ${warning.type.toUpperCase()}: ${warning.message}`);
    });
  }

  return {
    analysis,
    detailedInfo,
    warnings,
  };
}

// Example: Handling different user scenarios
export function demonstrateUserScenarios() {
  console.log('\n=== User Scenario Examples ===');

  // Scenario 1: Student with limited pages
  console.log('\n📚 Scenario 1: Student with 1-page limit');
  const studentConfig: LayoutConfig = {
    page: createDefaultPageConfig('a4', 'portrait'),
    text: getTextConfig('small'), // Smaller text to fit more
    maxPages: 1,
  };

  const studentPrioritization: PrioritizationConfig = {
    userSelectedTopics: ['key-formulas', 'examples'],
    maxContentReduction: 50, // Allow more aggressive reduction
    preserveHighValueContent: true,
    maintainTopicBalance: false, // Focus on selected topics only
  };

  // Scenario 2: Teacher creating comprehensive reference
  console.log('\n👩‍🏫 Scenario 2: Teacher with comprehensive reference');
  const teacherConfig: LayoutConfig = {
    page: createDefaultPageConfig('a3', 'landscape'), // Larger format
    text: getTextConfig('medium'),
    maxPages: 4,
  };

  const teacherPrioritization: PrioritizationConfig = {
    userSelectedTopics: [], // Include everything
    maxContentReduction: 15, // Minimal reduction
    preserveHighValueContent: true,
    maintainTopicBalance: true,
  };

  // Scenario 3: Quick reference card
  console.log('\n🃏 Scenario 3: Quick reference card');
  const quickRefConfig: LayoutConfig = {
    page: createDefaultPageConfig('a4', 'portrait'),
    text: getTextConfig('small'),
    maxPages: 1,
  };

  const quickRefPrioritization: PrioritizationConfig = {
    userSelectedTopics: ['formulas-only'],
    maxContentReduction: 70, // Very aggressive - only essentials
    preserveHighValueContent: true,
    maintainTopicBalance: false,
  };

  console.log('Each scenario would use different configurations to optimize for their specific needs.');
}

// Run the demonstration
if (require.main === module) {
  demonstrateOverflowManagement();
  demonstrateUserScenarios();
}