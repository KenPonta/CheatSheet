#!/usr/bin/env node

/**
 * Test script to verify that the compact study generator processes different files correctly
 * and doesn't return cached content from previous files.
 */

const fs = require('fs');
const path = require('path');

async function testCacheFix() {
  console.log('🧪 Testing cache fix for compact study generator...\n');

  try {
    // Test with different PDF files to ensure they produce different outputs
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

      console.log(`📄 Testing with file: ${fileName}`);
      
      // Read the file content to create a mock File object
      const fileContent = fs.readFileSync(fileName, 'utf8');
      
      // Create a simple test payload
      const testPayload = {
        files: [{
          name: fileName,
          type: 'general',
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

      console.log(`🔄 Making API request for ${fileName}...`);
      
      const response = await fetch('http://localhost:3000/api/generate-compact-study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ API request failed for ${fileName}:`, errorData);
        continue;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Successfully generated content for ${fileName}`);
        console.log(`   - Sections: ${result.metadata.stats.totalSections}`);
        console.log(`   - Formulas: ${result.metadata.stats.totalFormulas}`);
        console.log(`   - Examples: ${result.metadata.stats.totalExamples}`);
        console.log(`   - HTML length: ${result.html ? result.html.length : 0} characters`);
        
        results.push({
          fileName,
          htmlLength: result.html ? result.html.length : 0,
          sections: result.metadata.stats.totalSections,
          formulas: result.metadata.stats.totalFormulas,
          examples: result.metadata.stats.totalExamples,
          htmlPreview: result.html ? result.html.substring(0, 200) + '...' : 'No HTML'
        });
      } else {
        console.error(`❌ Generation failed for ${fileName}:`, result.message);
      }
      
      console.log(''); // Empty line for readability
    }

    // Analyze results to check for differences
    console.log('📊 Results Analysis:');
    console.log('===================');
    
    if (results.length < 2) {
      console.log('⚠️ Need at least 2 successful results to compare');
      return;
    }

    let allSame = true;
    const firstResult = results[0];
    
    for (let i = 1; i < results.length; i++) {
      const currentResult = results[i];
      
      if (currentResult.htmlLength !== firstResult.htmlLength ||
          currentResult.sections !== firstResult.sections ||
          currentResult.formulas !== firstResult.formulas ||
          currentResult.examples !== firstResult.examples) {
        allSame = false;
        break;
      }
    }

    if (allSame) {
      console.log('❌ CACHE ISSUE DETECTED: All files produced identical results');
      console.log('   This suggests the cache is still returning the same content for different files.');
    } else {
      console.log('✅ CACHE FIX WORKING: Different files produced different results');
      console.log('   The cache fix appears to be working correctly.');
    }

    console.log('\nDetailed Results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.fileName}:`);
      console.log(`   - HTML: ${result.htmlLength} chars`);
      console.log(`   - Sections: ${result.sections}, Formulas: ${result.formulas}, Examples: ${result.examples}`);
      console.log(`   - Preview: ${result.htmlPreview}`);
    });

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testCacheFix().catch(console.error);