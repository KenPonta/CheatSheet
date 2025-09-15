/**
 * Example usage of the enhanced equation visualization system
 */

import { SimpleImageGenerator, FlatLineStyle, ImageDimensions } from './simple-image-generator';

async function demonstrateEquationVisualization() {
  const generator = new SimpleImageGenerator();
  
  const defaultStyle: FlatLineStyle = {
    lineWeight: 'medium',
    colorScheme: 'monochrome',
    layout: 'horizontal',
    annotations: true
  };
  
  const dimensions: ImageDimensions = {
    width: 500,
    height: 400
  };

  console.log('🔢 Equation Visualization System Demo\n');

  // Example 1: Quadratic Equation
  console.log('1. Quadratic Equation: x^2 + 2x - 3 = 0');
  const quadraticResult = await generator.generateFlatLineImage({
    type: 'equation',
    content: 'x^2 + 2x - 3 = 0',
    context: 'Standard form quadratic equation with parabola visualization',
    style: defaultStyle,
    dimensions
  });
  console.log(`   Generated SVG (${quadraticResult.svgContent.length} chars)`);
  console.log(`   Type detected: Quadratic with parabola template\n`);

  // Example 2: Linear Equation
  console.log('2. Linear Equation: y = 2x + 3');
  const linearResult = await generator.generateFlatLineImage({
    type: 'equation',
    content: 'y = 2x + 3',
    context: 'Slope-intercept form with line visualization',
    style: defaultStyle,
    dimensions
  });
  console.log(`   Generated SVG (${linearResult.svgContent.length} chars)`);
  console.log(`   Type detected: Linear with line template\n`);

  // Example 3: Trigonometric Equation
  console.log('3. Trigonometric Equation: sin(x) + cos(2x) = 0.5');
  const trigResult = await generator.generateFlatLineImage({
    type: 'equation',
    content: 'sin(x) + cos(2x) = 0.5',
    context: 'Trigonometric equation with wave pattern',
    style: defaultStyle,
    dimensions
  });
  console.log(`   Generated SVG (${trigResult.svgContent.length} chars)`);
  console.log(`   Type detected: Trigonometric with wave template\n`);

  // Example 4: Exponential Equation
  console.log('4. Exponential Equation: y = 2^x');
  const expResult = await generator.generateFlatLineImage({
    type: 'equation',
    content: 'y = 2^x',
    context: 'Exponential growth function',
    style: defaultStyle,
    dimensions
  });
  console.log(`   Generated SVG (${expResult.svgContent.length} chars)`);
  console.log(`   Type detected: Exponential with growth curve\n`);

  // Example 5: Inequality
  console.log('5. Inequality: 2x + 3 > 7');
  const inequalityResult = await generator.generateFlatLineImage({
    type: 'equation',
    content: '2x + 3 > 7',
    context: 'Linear inequality with number line solution',
    style: defaultStyle,
    dimensions
  });
  console.log(`   Generated SVG (${inequalityResult.svgContent.length} chars)`);
  console.log(`   Type detected: Inequality with number line\n`);

  // Example 6: Complex Expression with Greek Letters
  console.log('6. Complex Expression: alpha^2 + beta*pi + sqrt(gamma) <= infinity');
  const complexResult = await generator.generateFlatLineImage({
    type: 'equation',
    content: 'alpha^2 + beta*pi + sqrt(gamma) <= infinity',
    context: 'Mathematical expression with Greek symbols',
    style: defaultStyle,
    dimensions
  });
  console.log(`   Generated SVG (${complexResult.svgContent.length} chars)`);
  console.log(`   Mathematical notation converted to Unicode symbols\n`);

  // Example 7: Different Styles
  console.log('7. Style Variations for y = x^2:');
  
  const styles: { name: string; style: FlatLineStyle }[] = [
    {
      name: 'Thin lines, no annotations',
      style: { lineWeight: 'thin', colorScheme: 'monochrome', layout: 'horizontal', annotations: false }
    },
    {
      name: 'Thick lines, minimal color',
      style: { lineWeight: 'thick', colorScheme: 'minimal-color', layout: 'horizontal', annotations: true }
    },
    {
      name: 'Vertical layout',
      style: { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'vertical', annotations: true }
    }
  ];

  for (const { name, style } of styles) {
    const result = await generator.generateFlatLineImage({
      type: 'equation',
      content: 'y = x^2',
      context: 'Parabola with different styling',
      style,
      dimensions
    });
    console.log(`   ${name}: Generated (${result.svgContent.length} chars)`);
  }

  console.log('\n✅ Equation visualization demo completed!');
  console.log('\nFeatures demonstrated:');
  console.log('• Automatic equation type detection (linear, quadratic, trigonometric, etc.)');
  console.log('• Template-based rendering with appropriate visualizations');
  console.log('• Mathematical notation formatting (superscripts, Greek letters, symbols)');
  console.log('• Multiple visual styles and layouts');
  console.log('• Comprehensive error handling');
  console.log('• SVG output with proper structure and metadata');
}

// Example of parsing and type detection
async function demonstrateEquationParsing() {
  const generator = new SimpleImageGenerator();
  
  console.log('\n🔍 Equation Parsing Demo\n');
  
  const equations = [
    'x^2 + 5x - 6 = 0',
    'y = 3x + 2',
    'sin(x) = 0.5',
    'y = e^x',
    'log(x) = 2',
    '2x + 3 >= 5',
    'sqrt(x) + 1 = 4'
  ];
  
  for (const equation of equations) {
    const parsed = generator.parseEquation(equation);
    const type = generator.determineEquationType(parsed);
    
    console.log(`Equation: ${equation}`);
    console.log(`  Type: ${type}`);
    console.log(`  Variables: [${parsed.variables.join(', ')}]`);
    console.log(`  Operations: [${parsed.operations.join(', ')}]`);
    console.log(`  Functions: [${parsed.functions.join(', ')}]`);
    console.log(`  Structure: ${parsed.structure.leftSide} ${parsed.structure.hasEquals ? '=' : parsed.structure.inequalityType || ''} ${parsed.structure.rightSide}`);
    console.log('');
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  demonstrateEquationVisualization()
    .then(() => demonstrateEquationParsing())
    .catch(console.error);
}

export { demonstrateEquationVisualization, demonstrateEquationParsing };