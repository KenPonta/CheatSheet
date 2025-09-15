const fs = require('fs');
const path = require('path');

// Test PDF processing directly
async function testPDFProcessing() {
  try {
    // Read the PDF file
    const pdfPath = path.join(__dirname, 'Material_test', '07 Properbility_01_student.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Create a File object from the buffer
    const file = new File([pdfBuffer], '07 Properbility_01_student.pdf', {
      type: 'application/pdf'
    });

    console.log(`📄 Testing PDF processing for: ${file.name}`);
    console.log(`📊 File size: ${file.size} bytes`);
    console.log(`📋 File type: ${file.type}`);

    // Import the FileProcessing module
    const { FileProcessing } = await import('./backend/lib/file-processing/index.js');
    
    console.log('🔄 Processing PDF...');
    const result = await FileProcessing.processFile(file);
    
    console.log('📊 Processing result:', {
      status: result.status,
      hasContent: !!result.content,
      textLength: result.content?.text?.length || 0,
      imageCount: result.content?.images?.length || 0,
      errorCount: result.errors?.length || 0,
      processingTime: result.processingTime
    });

    if (result.content?.text) {
      console.log('📖 Text preview (first 500 chars):');
      console.log(result.content.text.substring(0, 500));
    }

    if (result.errors && result.errors.length > 0) {
      console.log('🚨 Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.code}: ${error.message}`);
      });
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFProcessing();