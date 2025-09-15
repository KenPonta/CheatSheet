/**
 * Example usage of the Compact Layout Engine
 * 
 * This file demonstrates how to use the CompactLayoutEngine to create
 * dense, academic-style layouts with two-column formatting and compact typography.
 */

import { CompactLayoutEngine } from './compact-layout-engine';
import { CompactLayoutConfig, ContentBlock } from './types';

// Example 1: Basic usage with default configuration
export function basicLayoutExample() {
  console.log('=== Basic Compact Layout Example ===');
  
  // Create layout engine with default compact settings
  const engine = new CompactLayoutEngine();
  
  // Get the default configuration
  const config = engine.getConfig();
  console.log('Default Configuration:');
  console.log(`- Paper Size: ${config.paperSize}`);
  console.log(`- Columns: ${config.columns}`);
  console.log(`- Font Size: ${config.typography.fontSize}pt`);
  console.log(`- Line Height: ${config.typography.lineHeight}`);
  console.log(`- Paragraph Spacing: ${config.spacing.paragraphSpacing}em`);
  console.log(`- List Spacing: ${config.spacing.listSpacing}em`);
  
  // Calculate layout dimensions
  const layout = engine.calculateLayout();
  console.log('\nLayout Calculations:');
  console.log(`- Page Size: ${layout.pageWidth}" × ${layout.pageHeight}"`);
  console.log(`- Content Area: ${layout.contentWidth.toFixed(2)}" × ${layout.contentHeight.toFixed(2)}"`);
  console.log(`- Column Width: ${layout.columnWidth.toFixed(2)}"`);
  console.log(`- Lines per Column: ${layout.linesPerColumn}`);
  console.log(`- Characters per Line: ${layout.charactersPerLine}`);
  console.log(`- Content Density: ${layout.estimatedContentDensity.toFixed(4)} chars/sq.in`);
}

// Example 2: Custom configuration for maximum compactness
export function maximumCompactnessExample() {
  console.log('\n=== Maximum Compactness Example ===');
  
  // Create ultra-compact configuration
  const ultraCompactConfig: Partial<CompactLayoutConfig> = {
    paperSize: 'a4',
    columns: 2,
    typography: {
      fontSize: 10, // Minimum readable size
      lineHeight: 1.15, // Minimum line height
      fontFamily: {
        body: 'Times, "Times New Roman", serif',
        heading: 'Arial, "Helvetica Neue", sans-serif',
        math: 'Computer Modern, "Latin Modern Math", serif',
        code: 'Consolas, "Courier New", monospace'
      }
    },
    spacing: {
      paragraphSpacing: 0.25, // Very tight
      listSpacing: 0.15, // Very tight
      sectionSpacing: 0.6,
      headingMargins: {
        top: 0.3,
        bottom: 0.2
      }
    },
    margins: {
      top: 0.5, // Narrow margins
      bottom: 0.5,
      left: 0.5,
      right: 0.5,
      columnGap: 0.2 // Narrow column gap
    }
  };
  
  const engine = new CompactLayoutEngine(ultraCompactConfig);
  const layout = engine.calculateLayout();
  
  console.log('Ultra-Compact Layout:');
  console.log(`- Content Density: ${layout.estimatedContentDensity.toFixed(4)} chars/sq.in`);
  console.log(`- Column Width: ${layout.columnWidth.toFixed(2)}"`);
  console.log(`- Lines per Column: ${layout.linesPerColumn}`);
}

// Example 3: Creating and distributing academic content
export function academicContentExample() {
  console.log('\n=== Academic Content Distribution Example ===');
  
  const engine = new CompactLayoutEngine();
  
  // Create sample academic content blocks
  const contentBlocks: ContentBlock[] = [
    engine.createContentBlock(
      'heading1',
      'Chapter 1: Discrete Probability',
      'heading'
    ),
    engine.createContentBlock(
      'definition1',
      'Definition 1.1: A probability space is a triple (Ω, F, P) where Ω is the sample space, F is a σ-algebra of subsets of Ω, and P is a probability measure on F.',
      'text'
    ),
    engine.createContentBlock(
      'formula1',
      'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)',
      'formula'
    ),
    engine.createContentBlock(
      'example1',
      'Example 1.1: Rolling two fair dice. Find the probability of getting a sum of 7.\n\nSolution:\nStep 1: Identify the sample space Ω = {(1,1), (1,2), ..., (6,6)} with |Ω| = 36.\nStep 2: Identify favorable outcomes A = {(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)} with |A| = 6.\nStep 3: Calculate P(A) = |A|/|Ω| = 6/36 = 1/6.',
      'example'
    ),
    engine.createContentBlock(
      'theorem1',
      'Theorem 1.1 (Bayes\' Theorem): For events A and B with P(B) > 0,\nP(A|B) = P(B|A)P(A) / P(B)',
      'formula'
    ),
    engine.createContentBlock(
      'text1',
      'The complement rule states that for any event A in a sample space Ω, the probability of A not occurring is equal to 1 minus the probability of A occurring. This is one of the fundamental rules of probability theory.',
      'text'
    ),
    engine.createContentBlock(
      'list1',
      'Properties of Probability:\n• P(Ω) = 1 (certainty)\n• P(∅) = 0 (impossibility)\n• 0 ≤ P(A) ≤ 1 for any event A\n• P(A^c) = 1 - P(A) (complement rule)',
      'list'
    )
  ];
  
  console.log(`Created ${contentBlocks.length} content blocks:`);
  contentBlocks.forEach(block => {
    console.log(`- ${block.type}: "${block.content.substring(0, 50)}..." (height: ${block.estimatedHeight.toFixed(2)}", priority: ${block.priority})`);
  });
  
  // Distribute content across columns
  const distribution = engine.distributeContent(contentBlocks);
  
  console.log('\nContent Distribution:');
  console.log(`- Total Height: ${distribution.totalHeight.toFixed(2)}"`);
  console.log(`- Balance Score: ${distribution.balanceScore.toFixed(3)} (0-1, higher is better)`);
  console.log(`- Overflow Risk: ${distribution.overflowRisk.toFixed(3)} (0-1, lower is better)`);
  
  distribution.columns.forEach((column, index) => {
    console.log(`\nColumn ${index + 1}:`);
    console.log(`- Content blocks: ${column.content.length}`);
    console.log(`- Estimated height: ${column.estimatedHeight.toFixed(2)}"`);
    column.content.forEach(block => {
      console.log(`  • ${block.type}: ${block.id}`);
    });
  });
}

// Example 4: Handling different paper sizes and column configurations
export function paperSizeComparisonExample() {
  console.log('\n=== Paper Size and Column Configuration Comparison ===');
  
  const paperSizes: Array<'a4' | 'letter' | 'legal'> = ['a4', 'letter', 'legal'];
  const columnCounts: Array<1 | 2 | 3> = [1, 2, 3];
  
  paperSizes.forEach(paperSize => {
    console.log(`\n${paperSize.toUpperCase()} Paper:`);
    
    columnCounts.forEach(columns => {
      const engine = new CompactLayoutEngine({ paperSize, columns });
      const layout = engine.calculateLayout();
      
      console.log(`  ${columns} column(s): ${layout.columnWidth.toFixed(2)}" wide, ${layout.linesPerColumn} lines, ${layout.estimatedContentDensity.toFixed(2)} density`);
    });
  });
}

// Example 5: Error handling and validation
export function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  try {
    // This should throw an error due to excessive paragraph spacing
    new CompactLayoutEngine({
      spacing: {
        paragraphSpacing: 0.5, // Exceeds 0.35em limit
        listSpacing: 0.2,
        sectionSpacing: 1,
        headingMargins: { top: 0.5, bottom: 0.3 }
      }
    });
  } catch (error) {
    console.log('Caught expected error:');
    console.log(`- Type: ${(error as Error).constructor.name}`);
    console.log(`- Message: ${(error as Error).message}`);
    if (error && typeof error === 'object' && 'suggestion' in error) {
      console.log(`- Suggestion: ${(error as any).suggestion}`);
    }
  }
  
  try {
    // This should throw an error due to invalid font size
    new CompactLayoutEngine({
      typography: {
        fontSize: 20, // Too large
        lineHeight: 1.2,
        fontFamily: {
          body: 'Times',
          heading: 'Arial',
          math: 'Computer Modern',
          code: 'Consolas'
        }
      }
    });
  } catch (error) {
    console.log('\nCaught expected error:');
    console.log(`- Type: ${(error as Error).constructor.name}`);
    console.log(`- Message: ${(error as Error).message}`);
  }
}

// Example 6: Mathematical content specific formatting
export function mathematicalContentExample() {
  console.log('\n=== Mathematical Content Formatting Example ===');
  
  const engine = new CompactLayoutEngine({
    mathRendering: {
      displayEquations: {
        centered: true,
        numbered: true,
        fullWidth: true // Allow equations to span full width when needed
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: 1.5
      }
    }
  });
  
  // Create mathematical content blocks
  const mathBlocks = [
    engine.createContentBlock(
      'inline-math',
      'The probability of event A is denoted as $P(A)$ and satisfies $0 \\leq P(A) \\leq 1$.',
      'text'
    ),
    engine.createContentBlock(
      'display-equation',
      '$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$$',
      'formula'
    ),
    engine.createContentBlock(
      'complex-equation',
      '$$\\sum_{k=0}^{n} \\binom{n}{k} p^k (1-p)^{n-k} = 1$$',
      'formula'
    ),
    engine.createContentBlock(
      'matrix-equation',
      '$$\\begin{pmatrix} P(A|B_1) \\\\ P(A|B_2) \\\\ \\vdots \\\\ P(A|B_n) \\end{pmatrix} = \\frac{1}{P(A)} \\begin{pmatrix} P(B_1|A)P(A) \\\\ P(B_2|A)P(A) \\\\ \\vdots \\\\ P(B_n|A)P(A) \\end{pmatrix}$$',
      'formula'
    )
  ];
  
  console.log('Mathematical Content Blocks:');
  mathBlocks.forEach(block => {
    console.log(`- ${block.type}: height ${block.estimatedHeight.toFixed(2)}", breakable: ${block.breakable}`);
  });
  
  const distribution = engine.distributeContent(mathBlocks);
  console.log(`\nDistribution: ${distribution.columns.length} columns, balance score: ${distribution.balanceScore.toFixed(3)}`);
}

// Run all examples
export function runAllExamples() {
  basicLayoutExample();
  maximumCompactnessExample();
  academicContentExample();
  paperSizeComparisonExample();
  errorHandlingExample();
  mathematicalContentExample();
}

// Export for use in other modules
export {
  CompactLayoutEngine
} from './compact-layout-engine';

// If running this file directly
if (require.main === module) {
  runAllExamples();
}