#!/usr/bin/env node

/**
 * Comprehensive test to verify the compact study generator fix
 */

const fs = require('fs');

async function testComprehensiveFix() {
  console.log('🧪 Comprehensive test for compact study generator fix...\n');

  try {
    // Step 1: Clear cache first
    console.log('🧹 Step 1: Clearing cache...');
    try {
      const clearResponse = await fetch('http://localhost:3000/api/generate-compact-study/clear-cache', {
        method: 'POST'
      });
      const clearResult = await clearResponse.json();
      console.log(clearResult.success ? '✅ Cache cleared' : '❌ Cache clear failed');
    } catch (error) {
      console.log('⚠️ Cache clear failed, continuing...');
    }

    // Step 2: Test file processing debug endpoint
    console.log('\n🔍 Step 2: Testing file processing...');
    const testFiles = [
      'extracted-05 Counting_01_student.txt',
      'extracted-07 Properbility_01_student.txt', 
      'extracted-09 Relations_01_Student.txt'
    ];

    const fileProcessingResults = [];

    for (const fileName of testFiles) {
      if (!fs.existsSync(fileName)) {
        console.log(`⚠️ Test file ${fileName} not found, skipping...`);
        continue;
      }

      const fileContent = fs.readFileSync(fileName, 'utf8');
      console.log(`📄 Testing ${fileName} (${fileContent.length} chars)`);

      try {
        const debugResponse = await fetch('http://localhost:3000/api/generate-compact-study/debug-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileName,
            content: Buffer.from(fileContent).toString('base64'),
            type: fileName.includes('Counting') ? 'general' : 
                  fileName.includes('Properbility') ? 'probability' : 
                  fileName.includes('Relations') ? 'relations' : 'general'
          })
        });

        if (debugResponse.ok) {
          const debugResult = await debugResponse.json();
          const textLengths = Object.values(debugResult.results.processingResults)
            .map(r => r.textLength || 0)
            .filter(l => l > 0);
          
          fileProcessingResults.push({
            fileName,
            originalLength: fileContent.length,
            extractedLengths: textLengths,
            success: textLengths.length > 0
          });
          
          console.log(`   ✅ Extracted ${textLengths.length} valid results`);
        } else {
          console.log(`   ❌ Debug failed for ${fileName}`);
        }
      } catch (error) {
        console.log(`   💥 Error testing ${fileName}: ${error.message}`);
      }
    }

    // Step 3: Test full compact study generation
    console.log('\n📚 Step 3: Testing full compact study generation...');
    const generationResults = [];

    for (const fileName of testFiles) {
      if (!fs.existsSync(fileName)) continue;

      const fileContent = fs.readFileSync(fileName, 'utf8');
      console.log(`🔄 Generating study guide for ${fileName}...`);

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
          title: `Test Study Guide - ${fileName}`
        }
      };

      try {
        const response = await fetch('http://localhost:3000/api/generate-compact-study', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success) {
            generationResults.push({
              fileName,
              htmlLength: result.html ? result.html.length : 0,
              sections: result.metadata.stats.totalSections,
              formulas: result.metadata.stats.totalFormulas,
              examples: result.metadata.stats.totalExamples,
              htmlPreview: result.html ? result.html.substring(0, 200) + '...' : 'No HTML',
              debugLogs: result.debugLogs || []
            });
            
            console.log(`   ✅ Generated: ${result.html ? result.html.length : 0} chars HTML`);
            console.log(`   📊 Stats: ${result.metadata.stats.totalSections} sections, ${result.metadata.stats.totalFormulas} formulas, ${result.metadata.stats.totalExamples} examples`);
          } else {
            console.log(`   ❌ Generation failed: ${result.message}`);
            if (result.debugLogs) {
              console.log(`   🔍 Debug logs: ${result.debugLogs.length} entries`);
            }
          }
        } else {
          const errorData = await response.json();
          console.log(`   ❌ API error: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`   💥 Network error: ${error.message}`);
      }
    }

    // Step 4: Analyze results
    console.log('\n📊 Step 4: Analysis Results');
    console.log('=' .repeat(50));

    // File processing analysis
    console.log('\n🔍 File Processing Analysis:');
    if (fileProcessingResults.length === 0) {
      console.log('❌ No file processing results to analyze');
    } else {
      fileProcessingResults.forEach(result => {
        console.log(`📄 ${result.fileName}:`);
        console.log(`   - Original: ${result.originalLength} chars`);
        console.log(`   - Extracted: ${result.extractedLengths.join(', ')} chars`);
        console.log(`   - Success: ${result.success ? '✅' : '❌'}`);
      });
    }

    // Generation analysis
    console.log('\n📚 Generation Analysis:');
    if (generationResults.length === 0) {
      console.log('❌ No generation results to analyze');
    } else if (generationResults.length === 1) {
      console.log('⚠️ Only one result - cannot compare for uniqueness');
    } else {
      // Check if all results are identical (indicating cache issue)
      const firstResult = generationResults[0];
      let allIdentical = true;
      
      for (let i = 1; i < generationResults.length; i++) {
        const currentResult = generationResults[i];
        if (currentResult.htmlLength !== firstResult.htmlLength ||
            currentResult.sections !== firstResult.sections ||
            currentResult.formulas !== firstResult.formulas ||
            currentResult.examples !== firstResult.examples) {
          allIdentical = false;
          break;
        }
      }

      if (allIdentical) {
        console.log('❌ CACHE ISSUE STILL EXISTS: All files produced identical results');
        console.log('   This suggests the fix did not resolve the caching problem.');
        
        // Show debug logs from the first result
        if (generationResults[0].debugLogs && generationResults[0].debugLogs.length > 0) {
          console.log('\n🔍 Debug logs from first result:');
          generationResults[0].debugLogs.slice(-10).forEach(log => {
            console.log(`   ${log.timestamp} [${log.stage}]: ${JSON.stringify(log.details)}`);
          });
        }
      } else {
        console.log('✅ CACHE FIX WORKING: Different files produced different results');
        console.log('   The cache fix appears to be working correctly.');
      }

      console.log('\n📋 Detailed Results:');
      generationResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.fileName}:`);
        console.log(`   - HTML: ${result.htmlLength} chars`);
        console.log(`   - Stats: ${result.sections} sections, ${result.formulas} formulas, ${result.examples} examples`);
        console.log(`   - Preview: ${result.htmlPreview.substring(0, 100)}...`);
      });
    }

    // Final recommendation
    console.log('\n🎯 Recommendations:');
    if (fileProcessingResults.some(r => !r.success)) {
      console.log('⚠️ Some files failed to process - check file processing pipeline');
    }
    if (generationResults.length > 1 && generationResults.every(r => r.htmlLength === generationResults[0].htmlLength)) {
      console.log('⚠️ All generated content has identical length - investigate content generation');
    }
    if (generationResults.some(r => r.htmlLength === 0)) {
      console.log('⚠️ Some results have no HTML content - check HTML generation');
    }

  } catch (error) {
    console.error('💥 Comprehensive test failed:', error);
  }
}

// Run the comprehensive test
testComprehensiveFix().catch(console.error);