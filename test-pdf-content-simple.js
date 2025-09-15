const fs = require('fs');
const path = require('path');

// Simple test to check if PDF content is being extracted via API
async function testPDFContent() {
  try {
    // Read the PDF file
    const pdfPath = path.join(__dirname, 'Material_test', '07 Properbility_01_student.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Content = pdfBuffer.toString('base64');

    console.log(`📄 Testing PDF content extraction for: 07 Properbility_01_student.pdf`);
    console.log(`📊 File size: ${pdfBuffer.length} bytes`);

    // Create a minimal request to test file processing
    const requestData = {
      files: [{
        name: '07 Properbility_01_student.pdf',
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
        outputFormat: 'markdown', // Use markdown to see raw content better
        title: 'PDF Content Test',
        enableProgressTracking: true,
        enableErrorRecovery: true
      }
    };

    console.log('🔄 Making API request...');
    
    const response = await fetch('http://localhost:3001/api/generate-compact-study', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    console.log('📊 API Response Status:', result.success);
    console.log('📝 Message:', result.message);
    
    if (result.success && result.markdown) {
      console.log('📄 Markdown length:', result.markdown.length);
      
      // Save markdown for inspection
      fs.writeFileSync('test-pdf-content.md', result.markdown);
      console.log('💾 Saved markdown to test-pdf-content.md');
      
      // Show preview
      console.log('📖 Content preview (first 1000 chars):');
      console.log(result.markdown.substring(0, 1000));
      
      // Check for mathematical content indicators
      const hasFormulas = /\$.*\$|\\\(.*\\\)|\\\[.*\\\]/g.test(result.markdown);
      const hasProbabilityTerms = /probability|P\(|bayes|random|distribution/i.test(result.markdown);
      const hasEquations = /=|≤|≥|∑|∏|∫/g.test(result.markdown);
      
      console.log('🧮 Contains LaTeX formulas:', hasFormulas);
      console.log('📊 Contains probability terms:', hasProbabilityTerms);
      console.log('🔢 Contains equations:', hasEquations);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('🚨 Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testPDFContent();