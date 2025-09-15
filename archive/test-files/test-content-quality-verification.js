#!/usr/bin/env node

/**
 * Test script for AI Content Quality Verification in compact study generation
 */

const fs = require('fs');

async function testContentQualityVerification() {
  console.log('🔍 Testing AI Content Quality Verification...\n');

  try {
    // Test with the problematic file that has bullet point spam
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

      console.log(`🔄 Testing content verification for: ${fileName}`);
      
      // Read the file content
      const fileContent = fs.readFileSync(fileName, 'utf8');
      console.log(`   - Original file size: ${fileContent.length} characters`);
      
      // Count bullet points in original content
      const bulletLines = fileContent.split('\n').filter(line => 
        /^\s*[•·\-\*]\s/.test(line) || /^\s*\d+\.\s/.test(line)
      );
      const bulletRatio = bulletLines.length / fileContent.split('\n').length;
      
      console.log(`   - Bullet points detected: ${bulletLines.length} (${Math.round(bulletRatio * 100)}% of lines)`);
      console.log(`   - Content preview: ${fileContent.substring(0, 150)}...`);
      
      // Create test payload with content verification enabled
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
          title: `Verified Study Guide - ${fileName}`,
          // Enable content verification
          enableContentVerification: true
        }
      };

      try {
        console.log('   🤖 Generating study guide with AI content verification...');
        
        const response = await fetch('http://localhost:3000/api/generate-compact-study', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Generation failed for ${fileName}:`, errorData);
          continue;
        }

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Generation successful for ${fileName}`);
          console.log(`   - Processing time: ${result.processingTime}ms`);
          console.log(`   - HTML length: ${result.html ? result.html.length : 0} characters`);
          console.log(`   - Sections: ${result.metadata.stats.totalSections}`);
          console.log(`   - Formulas detected: ${result.metadata.stats.totalFormulas}`);
          
          // Analyze the generated HTML for quality improvements
          const htmlContent = result.html || '';
          const htmlBulletLines = htmlContent.split('\n').filter(line => 
            line.includes('<li>') || line.includes('•') || line.includes('·')
          );
          
          const htmlBulletRatio = htmlBulletLines.length / htmlContent.split('\n').length;
          
          console.log(`   - Bullet points in output: ${htmlBulletLines.length} (${Math.round(htmlBulletRatio * 100)}% of lines)`);
          
          // Check for repetitive content
          const repetitivePatterns = [
            'Basic Counting',
            'Product rule',
            'Sum rule',
            'More complex',
            'Inclusion-Exclusion',
            'Tree Diagrams',
            'Pigeonhole Principle'
          ];
          
          let repetitionCount = 0;
          repetitivePatterns.forEach(pattern => {
            const matches = (htmlContent.match(new RegExp(pattern, 'gi')) || []).length;
            if (matches > 3) {
              repetitionCount += matches - 1; // Count excess repetitions
            }
          });
          
          console.log(`   - Repetitive patterns reduced: ${repetitionCount > 0 ? 'Still present' : 'Cleaned up'}`);
          
          results.push({
            fileName,
            originalLength: fileContent.length,
            htmlLength: htmlContent.length,
            originalBulletRatio: bulletRatio,
            htmlBulletRatio: htmlBulletRatio,
            sections: result.metadata.stats.totalSections,
            formulas: result.metadata.stats.totalFormulas,
            processingTime: result.processingTime,
            repetitionCount,
            qualityImproved: bulletRatio > htmlBulletRatio && repetitionCount < 5
          });
          
          // Save HTML output for inspection
          const outputFileName = `verified-output-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
          fs.writeFileSync(outputFileName, htmlContent);
          console.log(`   - Saved verified output to: ${outputFileName}`);
          
        } else {
          console.error(`❌ Generation failed for ${fileName}:`, result.message);
        }
        
      } catch (fetchError) {
        console.error(`💥 Network error for ${fileName}:`, fetchError.message);
      }
      
      console.log(''); // Empty line for readability
    }

    // Analyze verification results
    console.log('📊 Content Quality Verification Results:');
    console.log('=' .repeat(60));
    
    if (results.length === 0) {
      console.log('❌ No successful results to analyze');
      return;
    }

    console.log(`✅ Successfully processed ${results.length} files with content verification`);
    
    // Quality improvement analysis
    const improvedFiles = results.filter(r => r.qualityImproved);
    const bulletReductionFiles = results.filter(r => r.originalBulletRatio > r.htmlBulletRatio);
    
    console.log(`\n🎯 Quality Improvements:`);
    console.log(`   - Files with overall quality improvement: ${improvedFiles.length}/${results.length}`);
    console.log(`   - Files with bullet point reduction: ${bulletReductionFiles.length}/${results.length}`);
    
    if (bulletReductionFiles.length > 0) {
      const avgBulletReduction = bulletReductionFiles.reduce((sum, r) => 
        sum + (r.originalBulletRatio - r.htmlBulletRatio), 0) / bulletReductionFiles.length;
      console.log(`   - Average bullet point reduction: ${Math.round(avgBulletReduction * 100)}%`);
    }

    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.fileName}:`);
      console.log(`   - Content: ${result.originalLength} → ${result.htmlLength} chars`);
      console.log(`   - Bullet ratio: ${Math.round(result.originalBulletRatio * 100)}% → ${Math.round(result.htmlBulletRatio * 100)}%`);
      console.log(`   - Sections: ${result.sections}, Formulas: ${result.formulas}`);
      console.log(`   - Processing time: ${result.processingTime}ms`);
      console.log(`   - Quality improved: ${result.qualityImproved ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Repetition count: ${result.repetitionCount}`);
    });

    // Performance analysis
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    console.log(`\n⚡ Performance:`);
    console.log(`   - Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
    console.log(`   - Content verification adds processing time but improves quality`);

    // Overall assessment
    const overallSuccess = improvedFiles.length >= results.length * 0.7; // 70% improvement rate
    console.log(`\n🏆 Overall Assessment: ${overallSuccess ? '✅ SUCCESS' : '⚠️ NEEDS IMPROVEMENT'}`);
    
    if (overallSuccess) {
      console.log('   AI Content Quality Verification is working effectively!');
      console.log('   - Bullet point spam is being reduced');
      console.log('   - Content structure is being improved');
      console.log('   - Study guides should be more valuable for learning');
    } else {
      console.log('   Content verification needs further tuning:');
      console.log('   - Consider adjusting verification parameters');
      console.log('   - May need stronger AI-based content improvement');
      console.log('   - Check if OpenAI API is properly configured');
    }

  } catch (error) {
    console.error('💥 Content quality verification test failed:', error);
  }
}

// Run the test
testContentQualityVerification().catch(console.error);