// Example usage of the mathematical content rendering system

import { createMathRenderer, extractMathFromText } from './math-renderer';
import { Formula, WorkedExample, MathRenderingConfig } from './types';

// Example configuration
const config: MathRenderingConfig = {
  displayEquations: {
    centered: true,
    numbered: true,
    fullWidth: true
  },
  inlineEquations: {
    preserveInline: true,
    maxHeight: 20
  }
};

// Create renderer
const renderer = createMathRenderer(config, 'mathjax');

// Example 1: Render a simple formula
const pythagoreanFormula: Formula = {
  id: 'pythagoras',
  latex: 'a^2 + b^2 = c^2',
  context: 'Pythagorean theorem',
  type: 'display',
  sourceLocation: { fileId: 'example' },
  isKeyFormula: true,
  confidence: 1.0
};

console.log('=== Formula Rendering Example ===');
const renderedFormula = renderer.renderFormula(pythagoreanFormula);
console.log('Rendered Formula:', {
  id: renderedFormula.id,
  type: renderedFormula.type,
  numbered: renderedFormula.numbered,
  equationNumber: renderedFormula.equationNumber,
  html: renderedFormula.html.substring(0, 100) + '...'
});

// Example 2: Render a worked example
const conditionalProbExample: WorkedExample = {
  id: 'conditional-prob-1',
  title: 'Conditional Probability Calculation',
  problem: 'Given P(A) = 0.6, P(B) = 0.4, and P(A∩B) = 0.24, find P(A|B)',
  solution: [
    {
      stepNumber: 1,
      description: 'Apply the conditional probability formula',
      formula: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
      explanation: 'This is the definition of conditional probability'
    },
    {
      stepNumber: 2,
      description: 'Substitute the given values',
      formula: 'P(A|B) = \\frac{0.24}{0.4}',
      explanation: 'Replace with known probabilities'
    },
    {
      stepNumber: 3,
      description: 'Calculate the result',
      formula: 'P(A|B) = 0.6',
      explanation: 'Simplify the fraction'
    }
  ],
  sourceLocation: { fileId: 'example' },
  subtopic: 'conditional-probability',
  confidence: 0.95,
  isComplete: true
};

console.log('\n=== Worked Example Rendering ===');
const renderedExample = renderer.renderWorkedExample(conditionalProbExample);
console.log('Rendered Example:', {
  id: renderedExample.id,
  title: renderedExample.title,
  solutionSteps: renderedExample.solution.length,
  totalHeight: renderedExample.totalHeight,
  breakable: renderedExample.breakable
});

// Example 3: Extract math from text
const textWithMath = 'The probability formula is $P(A|B) = \\frac{P(A \\cap B)}{P(B)}$ and Bayes theorem is $$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$$';

console.log('\n=== Math Extraction Example ===');
const extractedMath = extractMathFromText(textWithMath);
console.log('Extracted Math:', {
  inlineCount: extractedMath.inline.length,
  displayCount: extractedMath.display.length,
  inline: extractedMath.inline,
  display: extractedMath.display
});

// Example 4: Configuration examples
console.log('\n=== Configuration Examples ===');
console.log('MathJax Config:', JSON.stringify(renderer.getMathJaxConfig(), null, 2));
console.log('KaTeX Config:', JSON.stringify(renderer.getKaTeXConfig(true), null, 2));

// Example 5: Equation numbering
console.log('\n=== Equation Numbering ===');
console.log('Current equation count:', renderer.getEquationCount());

const equation1: Formula = {
  id: 'eq1',
  latex: 'E = mc^2',
  context: 'Mass-energy equivalence',
  type: 'display',
  sourceLocation: { fileId: 'example' },
  isKeyFormula: true,
  confidence: 1.0
};

const equation2: Formula = {
  id: 'eq2',
  latex: 'F = ma',
  context: 'Newton\'s second law',
  type: 'display',
  sourceLocation: { fileId: 'example' },
  isKeyFormula: true,
  confidence: 1.0
};

const rendered1 = renderer.renderFormula(equation1);
const rendered2 = renderer.renderFormula(equation2);

console.log('Equation 1 number:', rendered1.equationNumber);
console.log('Equation 2 number:', rendered2.equationNumber);
console.log('Final equation count:', renderer.getEquationCount());

export { renderer, config };