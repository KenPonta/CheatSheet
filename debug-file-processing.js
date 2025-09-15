#!/usr/bin/env node

/**
 * Debug script to test file processing for compact study generator
 */

const fs = require('fs');
const path = require('path');

async function debugFileProcessing() {
  console.log('🔍 Debugging file processing for compact study generator...\n');

  try {
    // Test with different files to see what content is extracted
    const testFiles = [
      'extracted-05 Counting_01_student.txt',
      'extracted-07 Properbility_01_student.txt', 
      'extracted-09 Relations_01_Student.txt'
    ];

    for (const fileName of testFiles) {
      if (!fs.existsSync(fileName)) {
        console.log(`⚠️ Test file ${fileName} not found, skipping...`);
        continue;
      }

      console.log(`🔍 Debugging file: ${fileName}`);
      
      // Read the file content
      const fileContent = fs.readFileSync(fileName, 'utf8');
      console.log(`   - File size: ${fileContent.length} characters`);
      console.log(`   - Content preview: ${fileContent.substring(0, 100)}...`);
      
      // Create test payload for debug endpoint
      const testPayload = {
        fileName: fileName,
        content: Buffer.from(fileContent).toString('base64'),
        type: fileName.includes('Counting') ? 'general' : 
              fileName.includes('Properbility') ? 'probability' : 
              fileName.includes('Relations') ? 'relations' : 'general'
      };

      console.log(`🔄 Testing file processing for ${fileName}...`);
      
      try {
        const response = await fetch('http://localhost:3000/api/generate-compact-study/debug-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Debug request failed for ${fileName}:`, errorData);
          continue;
        }

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Debug results for ${fileName}:`);
          console.log(`   - File info: ${result.results.fileSize} bytes, ${result.results.fileType}`);
          
          // Check each processing method
          Object.entries(result.results.processingResults).forEach(([method, methodResult]) => {
            console.log(`   - ${method}:`);
            if (methodResult.error) {
              console.log(`     ❌ Error: ${methodResult.error}`);
            } else {
              console.log(`     ✅ Success: ${methodResult.textLength} chars`);
              console.log(`     📄 Preview: ${methodResult.textPreview?.substring(0, 80)}...`);
            }
          });
        } else {
          console.error(`❌ Debug failed for ${fileName}:`, result.error);
        }
        
      } catch (fetchError) {
        console.error(`💥 Network error for ${fileName}:`, fetchError.message);
      }
      
      console.log(''); // Empty line for readability
    }

  } catch (error) {
    console.error('💥 Debug script failed:', error);
  }
}

// Run the debug
debugFileProcessing().catch(console.error);