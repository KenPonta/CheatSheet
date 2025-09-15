const fs = require('fs');
const path = require('path');

// Test just the content extraction part
async function debugContentExtraction() {
  try {
    // Read the PDF file
    const pdfPath = path.join(__dirname, 'Material_test', '07 Properbility_01_student.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Content = pdfBuffer.toString('base64');

    // Test the file processing stage first
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
        title: 'Debug Test',
        enableProgressTracking: true,
        enableErrorRecovery: true
      }
    };

    console.log('🔄 Testing content extraction...');
    
    // Make request to the API
    const response = await fetch('http://localhost:3001/api/generate-compact-study', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    console.log('📊 Full result:', JSON.stringify(result, null, 2));
    
    if (result.debugLogs) {
      console.log('🐛 Debug logs:');
      result.debugLogs.forEach(log => {
        console.log(`  ${log.timestamp}: ${log.event} -`, log.data);
      });
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

// Run the debug
debugContentExtraction();