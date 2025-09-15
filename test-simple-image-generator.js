/**
 * Simple test script to verify SimpleImageGenerator functionality
 */

const { SimpleImageGenerator } = require('./backend/lib/ai/simple-image-generator.ts');

async function testGenerator() {
  console.log('Testing SimpleImageGenerator...');
  
  const generator = new SimpleImageGenerator();
  
  // Test equation generation
  const request = {
    type: 'equation',
    content: 'x^2 + 2x + 1 = 0',
    context: 'Quadratic equation',
    style: {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    },
    dimensions: { width: 400, height: 200 }
  };
  
  try {
    const result = await generator.generateFlatLineImage(request);
    console.log('✅ Successfully generated image');
    console.log('Image ID:', result.id);
    console.log('SVG contains equation:', result.svgContent.includes('x'));
    console.log('Base64 format correct:', result.base64.startsWith('data:image/svg+xml;base64,'));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGenerator();