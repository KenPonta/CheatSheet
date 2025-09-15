const fs = require('fs');
const path = require('path');

// Test with a relations file to see if it produces different content
async function testRelationsFile() {
  try {
    console.log('📚 Testing with Relations file...\n');

    const fileName = '09 Relations_01_Student.pdf';
    const filePath = path.join(__dirname, 'Material_test', fileName);
    
    console.log(`🔄 Testing: ${fileName}`);
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(filePath);
    const base64Content = pdfBuffer.toString('base64');
    
    console.log(`📊 File size: ${pdfBuffer.length} bytes`);

    const requestData = {
      files: [{
        name: fileName,
        type: 'relations', // This should trigger different content
        content: base64Content
      }],
      config: {
        layout: 'compact',
        columns: 1,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '12pt',
        margins: 'normal',
        outputFormat: 'markdown',
        title: `Relations Test: ${fileName}`,
        enableProgressTracking: false,
        enableErrorRecovery: true
      }
    };

    const response = await fetch('http://localhost:3000/api/generate-compact-study', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    if (result.success && result.markdown) {
      console.log(`📄 Markdown length: ${result.markdown.length} characters`);
      
      // Save the result
      fs.writeFileSync('test-relations-output.md', result.markdown);
      console.log('💾 Saved to test-relations-output.md');
      
      // Check for relations-specific content
      const hasRelationsContent = result.markdown.includes('reflexive') || 
                                 result.markdown.includes('symmetric') || 
                                 result.markdown.includes('transitive');
      console.log(`🔍 Contains relations content: ${hasRelationsContent}`);
      
      // Show a preview of Part II (Relations)
      const part2Start = result.markdown.indexOf('# Part II: Relations');
      if (part2Start !== -1) {
        const part2Preview = result.markdown.substring(part2Start, part2Start + 1000);
        console.log('\n📖 Part II Preview:');
        console.log(part2Preview);
      }
      
    } else {
      console.log('❌ Failed:', result.message);
      if (result.errors) {
        console.log('🚨 Errors:', result.errors);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testRelationsFile();