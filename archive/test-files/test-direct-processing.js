#!/usr/bin/env node

/**
 * Test script for direct compact study processing (bypasses complex pipeline)
 */

const fs = require('fs');

async function testDirectProcessing() {
  console.log('🚀 Testing direct compact study processing...\n');

  try {
    const testFiles = [
      'extracted-05 Counting_01_student.txt',
      'extracted-07 Properbility_01_student.txt', 
      'extracted-09 Relations_01_Student.txt'
    ];

    const results = [];

    for (const fileName of testFiles) {
      if (!fs.existsSync(fileName)) {
        console.log(`⚠️ Test file ${fileName} not found, skipping...`);
        continue;
      }

      console.log(`🔄 Direct processing: ${fileName}`);
      
      // Read the file content
      const fileContent = fs.readFileSync(fileName, 'utf8');
      console.log(`   - File size: ${fileContent.length} characters`);
      console.log(`   - Content preview: ${fileContent.substring(0, 100)}...`);
      
      // Create test payload for direct processing
      const testPayload = {
        files: [{
          name: fileName,
          type: fileName.includes('Counting') ? 'general' : 
                fileName.includes('Properbility') ? 'probability' : 
                fileName.includes('Relations') ? 'relations' : 'general',
          content: Buffer.from(fileContent).toString('base64')
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
          title: `Direct Study Guide - ${fileName}`
        }
      };

      try {
        const response = await fetch('http://localhost:3000/api/generate-compact-study/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Direct processing failed for ${fileName}:`, errorData);
          continue;
        }

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Direct processing successful for ${fileName}`);
          console.log(`   - Processing time: ${result.processingTime}ms`);
          console.log(`   - HTML length: ${result.html ? result.html.length : 0} characters`);
          console.log(`   - Sections: ${result.metadata.stats.totalSections}`);
          console.log(`   - Formulas detected: ${result.metadata.stats.totalFormulas}`);
          
          results.push({
            fileName,
            htmlLength: result.html ? result.html.length : 0,
            sections: result.metadata.stats.totalSections,
            formulas: result.metadata.stats.totalFormulas,
            processingTime: result.processingTime,
            htmlPreview: result.html ? result.html.substring(0, 200) + '...' : 'No HTML'
          });
          
          // Save HTML output for inspection
          const outputFileName = `direct-output-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
          fs.writeFileSync(outputFileName, result.html);
          console.log(`   - Saved output to: ${outputFileName}`);
          
        } else {
          console.error(`❌ Direct processing failed for ${fileName}:`, result.message);
        }
        
      } catch (fetchError) {
        console.error(`💥 Network error for ${fileName}:`, fetchError.message);
      }
      
      console.log(''); // Empty line for readability
    }

    // Analyze results
    console.log('📊 Direct Processing Results Analysis:');
    console.log('=' .repeat(50));
    
    if (results.length === 0) {
      console.log('❌ No successful results to analyze');
      return;
    }

    console.log(`✅ Successfully processed ${results.length} files`);
    
    // Check for uniqueness
    let allSame = true;
    const firstResult = results[0];
    
    for (let i = 1; i < results.length; i++) {
      const currentResult = results[i];
      
      if (currentResult.htmlLength !== firstResult.htmlLength ||
          currentResult.sections !== firstResult.sections) {
        allSame = false;
        break;
      }
    }

    if (allSame && results.length > 1) {
      console.log('⚠️ WARNING: All files produced identical results');
      console.log('   This suggests there may still be an issue with content processing');
    } else {
      console.log('✅ SUCCESS: Different files produced different results');
      console.log('   Direct processing appears to be working correctly');
    }

    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.fileName}:`);
      console.log(`   - HTML: ${result.htmlLength} chars`);
      console.log(`   - Sections: ${result.sections}, Formulas: ${result.formulas}`);
      console.log(`   - Processing time: ${result.processingTime}ms`);
      console.log(`   - Preview: ${result.htmlPreview.substring(0, 100)}...`);
    });

    // Performance comparison
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    console.log(`\n⚡ Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
    console.log('   (Direct processing should be much faster than pipeline processing)');

  } catch (error) {
    console.error('💥 Direct processing test failed:', error);
  }
}

// Run the test
testDirectProcessing().catch(console.error);