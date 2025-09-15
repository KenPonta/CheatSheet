/**
 * Example usage of SimpleImageGenerator
 * Demonstrates how to create different types of flat-line images
 */

import { SimpleImageGenerator, FlatLineImageRequest } from './simple-image-generator';

async function demonstrateImageGeneration() {
  const generator = new SimpleImageGenerator();

  console.log('🎨 SimpleImageGenerator Demo\n');

  // Example 1: Equation Visualization
  console.log('1. Generating equation visualization...');
  const equationRequest: FlatLineImageRequest = {
    type: 'equation',
    content: 'f(x) = ax^2 + bx + c',
    context: 'Standard quadratic function form',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    },
    dimensions: { width: 500, height: 200 }
  };

  const equationImage = await generator.generateFlatLineImage(equationRequest);
  console.log(`✅ Generated equation image (ID: ${equationImage.id})`);
  console.log(`   SVG length: ${equationImage.svgContent.length} characters`);
  console.log(`   Base64 preview: ${equationImage.base64.substring(0, 50)}...\n`);

  // Example 2: Concept Diagram
  console.log('2. Generating concept diagram...');
  const conceptRequest: FlatLineImageRequest = {
    type: 'concept',
    content: `Problem Solving Process
Input
Process -> Analyze
Analyze -> Decision
Decision -> Output
Decision -> Process`,
    context: 'Basic problem-solving workflow',
    style: {
      lineWeight: 'thin',
      colorScheme: 'minimal-color',
      layout: 'vertical',
      annotations: false
    },
    dimensions: { width: 400, height: 500 }
  };

  const conceptImage = await generator.generateFlatLineImage(conceptRequest);
  console.log(`✅ Generated concept diagram (ID: ${conceptImage.id})`);
  console.log(`   Contains nodes: ${conceptImage.svgContent.includes('<circle') ? 'Yes' : 'No'}`);
  console.log(`   Contains arrows: ${conceptImage.svgContent.includes('<line') ? 'Yes' : 'No'}\n`);

  // Example 3: Example Illustration
  console.log('3. Generating example illustration...');
  const exampleRequest: FlatLineImageRequest = {
    type: 'example',
    content: `Solve: 3x + 6 = 15

Subtract 6 from both sides: 3x = 9
Divide both sides by 3: x = 3

Therefore, x = 3`,
    context: 'Linear equation solving example',
    style: {
      lineWeight: 'thick',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    },
    dimensions: { width: 600, height: 400 }
  };

  const exampleImage = await generator.generateFlatLineImage(exampleRequest);
  console.log(`✅ Generated example illustration (ID: ${exampleImage.id})`);
  console.log(`   Contains problem section: ${exampleImage.svgContent.includes('Problem:') ? 'Yes' : 'No'}`);
  console.log(`   Contains solution section: ${exampleImage.svgContent.includes('Solution:') ? 'Yes' : 'No'}\n`);

  // Example 4: Mathematical Notation Demo
  console.log('4. Demonstrating mathematical notation...');
  const mathRequest: FlatLineImageRequest = {
    type: 'equation',
    content: 'E = mc^2 + sqrt(pi * alpha) / beta',
    context: 'Physics equation with Greek letters',
    style: {
      lineWeight: 'medium',
      colorScheme: 'minimal-color',
      layout: 'horizontal',
      annotations: true
    },
    dimensions: { width: 450, height: 150 }
  };

  const mathImage = await generator.generateFlatLineImage(mathRequest);
  console.log(`✅ Generated mathematical notation (ID: ${mathImage.id})`);
  console.log(`   Contains Greek letters: ${mathImage.svgContent.includes('π') || mathImage.svgContent.includes('α') || mathImage.svgContent.includes('β') ? 'Yes' : 'No'}`);
  console.log(`   Contains superscript: ${mathImage.svgContent.includes('baseline-shift="super"') ? 'Yes' : 'No'}\n`);

  // Example 5: Different Styles Demo
  console.log('5. Demonstrating different styles...');
  const styles = [
    { lineWeight: 'thin' as const, colorScheme: 'monochrome' as const },
    { lineWeight: 'medium' as const, colorScheme: 'minimal-color' as const },
    { lineWeight: 'thick' as const, colorScheme: 'monochrome' as const }
  ];

  for (let i = 0; i < styles.length; i++) {
    const styleRequest: FlatLineImageRequest = {
      type: 'diagram',
      content: `Style demo ${i + 1}: Simple diagram content`,
      context: `Demonstrating ${styles[i].lineWeight} lines with ${styles[i].colorScheme} colors`,
      style: {
        ...styles[i],
        layout: 'horizontal',
        annotations: false
      },
      dimensions: { width: 300, height: 150 }
    };

    const styleImage = await generator.generateFlatLineImage(styleRequest);
    console.log(`   Style ${i + 1} (${styles[i].lineWeight}/${styles[i].colorScheme}): Generated (ID: ${styleImage.id})`);
  }

  console.log('\n🎉 Demo completed! All image types generated successfully.');
  
  return {
    equationImage,
    conceptImage,
    exampleImage,
    mathImage
  };
}

// Export for use in other modules
export { demonstrateImageGeneration };

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateImageGeneration().catch(console.error);
}