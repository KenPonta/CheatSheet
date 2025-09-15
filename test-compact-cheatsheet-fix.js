const fs = require('fs');
const path = require('path');

// Test the compact study material generation with a sample PDF
async function testCompactStudyMaterial() {
  try {
    // Read the PDF file
    const pdfPath = path.join(__dirname, 'Material_test', '07 Properbility_01_student.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Content = pdfBuffer.toString('base64');

    // Prepare the request
    const requestData = {
      files: [{
        name: '07 Properbility_01_student.pdf',
        type: 'probability',
        content: base64Content
      }],
      config: {
        layout: 'compact',
        columns: 2,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '10pt',
        margins: 'narrow',
        outputFormat: 'html',
        paperSize: 'a4',
        orientation: 'portrait',
        title: 'Probability Study Material Test'
      }
    };

    console.log('🔄 Testing compact study material generation...');
    
    // Make request to the API
    const response = await fetch('http://localhost:3001/api/generate-compact-study', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success!');
      console.log('📊 Stats:', result.metadata.stats);
      console.log('📝 Message:', result.message);
      
      // Check if we have actual content (not just table of contents)
      if (result.html) {
        const htmlLength = result.html.length;
        const hasFormulas = result.html.includes('formula') || result.html.includes('equation');
        const hasExamples = result.html.includes('example') || result.html.includes('Example');
        const hasContent = result.html.includes('<p>') && result.html.split('<p>').length > 5;
        
        console.log(`📄 HTML length: ${htmlLength} characters`);
        console.log(`🧮 Contains formulas: ${hasFormulas}`);
        console.log(`📚 Contains examples: ${hasExamples}`);
        console.log(`📝 Has substantial content: ${hasContent}`);
        
        // Save the HTML for inspection
        fs.writeFileSync('test-output.html', result.html);
        console.log('💾 Saved output to test-output.html');
        
        // Show a preview of the content
        const textContent = result.html.replace(/<[^>]*>/g, '').substring(0, 500);
        console.log('📖 Content preview:', textContent);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('⚠️ Warnings:', result.warnings);
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
testCompactStudyMaterial();