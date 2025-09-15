const fs = require('fs');
const path = require('path');

// Debug what text is actually being extracted
async function debugTextExtraction() {
  try {
    console.log('🔍 Debugging text extraction from different files...\n');

    // Test with different files
    const testFiles = [
      '05 Counting_01_student.pdf',
      '07 Properbility_01_student.pdf',
      '09 Relations_01_Student.pdf'
    ];
    
    for (const fileName of testFiles) {
      console.log(`\n📄 Testing: ${fileName}`);
      console.log('=' .repeat(50));
      
      const filePath = path.join(__dirname, 'Material_test', fileName);
      const pdfBuffer = fs.readFileSync(filePath);
      
      // Use pdf-parse directly to see what text we can extract
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(pdfBuffer);
      
      console.log(`📊 Pages: ${pdfData.numpages}`);
      console.log(`📝 Text length: ${pdfData.text.length} characters`);
      
      if (pdfData.text.length > 0) {
        console.log('📖 First 500 characters:');
        console.log(pdfData.text.substring(0, 500));
        console.log('\n📖 Last 500 characters:');
        console.log(pdfData.text.substring(Math.max(0, pdfData.text.length - 500)));
        
        // Look for mathematical content
        const hasFormulas = /[=<>≤≥∑∏∫∪∩⊆⊇∈∉]/g.test(pdfData.text);
        const hasProbability = /probability|P\(|bayes|random|distribution/i.test(pdfData.text);
        const hasRelations = /relation|reflexive|symmetric|transitive/i.test(pdfData.text);
        const hasCounting = /counting|combination|permutation|factorial/i.test(pdfData.text);
        
        console.log(`\n🔍 Content analysis:`);
        console.log(`  - Has formulas: ${hasFormulas}`);
        console.log(`  - Has probability terms: ${hasProbability}`);
        console.log(`  - Has relations terms: ${hasRelations}`);
        console.log(`  - Has counting terms: ${hasCounting}`);
        
        // Save the text for inspection
        fs.writeFileSync(`extracted-${fileName.replace('.pdf', '.txt')}`, pdfData.text);
        console.log(`💾 Saved extracted text to extracted-${fileName.replace('.pdf', '.txt')}`);
      } else {
        console.log('⚠️ No text extracted');
      }
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

// Run the debug
debugTextExtraction();