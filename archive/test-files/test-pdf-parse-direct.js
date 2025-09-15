const fs = require('fs');
const path = require('path');

// Test pdf-parse directly
async function testPDFParseDirect() {
  try {
    console.log('📄 Testing pdf-parse directly...');
    
    // Import pdf-parse
    const pdfParse = require('pdf-parse');
    
    // Read the PDF file
    const pdfPath = path.join(__dirname, 'Material_test', '07 Properbility_01_student.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log(`📊 PDF file size: ${pdfBuffer.length} bytes`);
    
    // Parse the PDF
    console.log('🔄 Parsing PDF...');
    const pdfData = await pdfParse(pdfBuffer);
    
    console.log('✅ PDF parsing completed!');
    console.log(`📄 Pages: ${pdfData.numpages}`);
    console.log(`📝 Text length: ${pdfData.text.length} characters`);
    console.log(`ℹ️ Info:`, pdfData.info);
    console.log(`📊 Metadata:`, pdfData.metadata);
    
    if (pdfData.text.length > 0) {
      console.log('📖 Text preview (first 1000 characters):');
      console.log(pdfData.text.substring(0, 1000));
      
      // Check for mathematical content
      const hasFormulas = /P\(|E\[|Var\(|∑|∏|∫|≤|≥|=/.test(pdfData.text);
      const hasProbabilityTerms = /probability|bayes|random|distribution|bernoulli/i.test(pdfData.text);
      
      console.log('🧮 Contains mathematical notation:', hasFormulas);
      console.log('📊 Contains probability terms:', hasProbabilityTerms);
      
      // Save the extracted text for inspection
      fs.writeFileSync('extracted-pdf-text.txt', pdfData.text);
      console.log('💾 Saved extracted text to extracted-pdf-text.txt');
    } else {
      console.log('⚠️ No text was extracted from the PDF');
    }

  } catch (error) {
    console.error('💥 PDF parsing failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPDFParseDirect();