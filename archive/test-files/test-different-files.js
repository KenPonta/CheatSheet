const fs = require('fs');
const path = require('path');

// Test with different files to see if output varies
async function testDifferentFiles() {
  try {
    console.log('📚 Testing compact study guide with different files...\n');

    // Get list of available test files
    const testDir = path.join(__dirname, 'Material_test');
    const files = fs.readdirSync(testDir).filter(file => file.endsWith('.pdf'));
    
    console.log('Available test files:', files);
    
    // Test with first 2 different files
    const testFiles = files.slice(0, 2);
    
    for (let i = 0; i < testFiles.length; i++) {
      const fileName = testFiles[i];
      const filePath = path.join(testDir, fileName);
      
      console.log(`\n🔄 Testing file ${i + 1}: ${fileName}`);
      console.log('=' .repeat(50));
      
      // Read the PDF file
      const pdfBuffer = fs.readFileSync(filePath);
      const base64Content = pdfBuffer.toString('base64');
      
      console.log(`📊 File size: ${pdfBuffer.length} bytes`);

      const requestData = {
        files: [{
          name: fileName,
          type: 'probability',
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
          title: `Test ${i + 1}: ${fileName}`,
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
        
        // Extract just the content sections (skip metadata)
        const contentStart = result.markdown.indexOf('# Part I: Discrete Probability');
        const contentSection = contentStart !== -1 ? result.markdown.substring(contentStart, contentStart + 1000) : result.markdown.substring(0, 1000);
        
        console.log('📖 Content preview:');
        console.log(contentSection);
        
        // Save each result for comparison
        fs.writeFileSync(`test-output-${i + 1}.md`, result.markdown);
        console.log(`💾 Saved to test-output-${i + 1}.md`);
        
        // Check for unique content indicators
        const hasUniqueContent = result.markdown.includes(fileName) || 
                                result.markdown.length !== (i === 0 ? 0 : fs.readFileSync(`test-output-1.md`, 'utf8').length);
        console.log(`🔍 Has unique content: ${hasUniqueContent}`);
        
      } else {
        console.log('❌ Failed:', result.message);
        if (result.errors) {
          console.log('🚨 Errors:', result.errors);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Compare the outputs
    if (testFiles.length >= 2) {
      console.log('\n🔍 Comparing outputs...');
      const output1 = fs.readFileSync('test-output-1.md', 'utf8');
      const output2 = fs.readFileSync('test-output-2.md', 'utf8');
      
      const identical = output1 === output2;
      console.log(`📊 Outputs are identical: ${identical}`);
      
      if (identical) {
        console.log('⚠️ ISSUE CONFIRMED: Different files produce identical output');
      } else {
        console.log('✅ Different files produce different output');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testDifferentFiles();