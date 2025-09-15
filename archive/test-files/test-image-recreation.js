// Test the image recreation API directly
async function testImageRecreation() {
  try {
    console.log('🖼️ Testing image recreation API...');

    // Create a test image object that should trigger recreation
    const testImages = [
      {
        id: 'test_image_1',
        context: 'Blurry scanned mathematical diagram showing probability distribution with hard-to-read formulas',
        ocrText: 'Prob... Distrib... P(X=k) = n! / (k!(n-k)!) * p^k * (1-p)^(n-k) Example: Coin flips (text is blurry and hard to read)',
        isExample: true,
        base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 transparent pixel
      },
      {
        id: 'test_image_2', 
        context: 'Poor quality scan of Bayes theorem with illegible text and formulas',
        ocrText: 'P(A|B) = P(B|A) * P(A) / P(B) - text is very blurry and pixelated, difficult to read in original scan',
        isExample: false,
        base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
    ];

    const requestData = {
      images: testImages,
      options: {
        quality: 'standard',
        size: '1024x1024',
        style: 'educational'
      }
    };

    console.log('🔄 Making request to recreate-images API...');
    
    const response = await fetch('http://localhost:3000/api/recreate-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('✅ Success:', result.success);
    
    if (result.success) {
      console.log('📈 Summary:', result.summary);
      console.log('⏱️ Processing time:', result.processingTime, 'ms');
      
      if (result.results && result.results.length > 0) {
        console.log('\n🖼️ Image recreation results:');
        result.results.forEach((imageResult, index) => {
          console.log(`\nImage ${index + 1}:`);
          console.log(`  - Original ID: ${imageResult.originalImage.id}`);
          console.log(`  - Generated: ${!!imageResult.generatedImage}`);
          console.log(`  - Needs approval: ${imageResult.userApprovalRequired}`);
          console.log(`  - Fallback to original: ${imageResult.fallbackToOriginal}`);
          console.log(`  - Processing time: ${imageResult.processingTime}ms`);
          
          if (imageResult.qualityAssessment) {
            console.log(`  - Quality scores: Original ${imageResult.qualityAssessment.originalScore}, Recreated ${imageResult.qualityAssessment.recreatedScore}`);
            console.log(`  - Recommendation: ${imageResult.qualityAssessment.recommendation}`);
          }
          
          if (imageResult.generatedImage) {
            console.log(`  - Generated image ID: ${imageResult.generatedImage.id}`);
            console.log(`  - Generation time: ${imageResult.generatedImage.generationTime}ms`);
            console.log(`  - Prompt used: ${imageResult.generatedImage.prompt.substring(0, 100)}...`);
          }
        });
      }
      
      if (result.approvalWorkflows && result.approvalWorkflows.length > 0) {
        console.log('\n📋 Approval workflows created:', result.approvalWorkflows.length);
      }
    } else {
      console.log('❌ Error:', result.error);
      if (result.details) {
        console.log('📝 Details:', result.details);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testImageRecreation();