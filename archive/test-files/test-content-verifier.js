// Test script for AI Content Quality Verifier
const { AIContentQualityVerifier } = require('./backend/lib/ai/content-quality-verifier');

// Test content with issues (similar to what we see in the study guide)
const problematicContent = `
•Basic Counting
•Product rule
•Sum rule
•More complex counting problems
•Inclusion-Exclusion principle
•Tree Diagrams
•Pigeonhole Principle

Basic counting rules

•Basic Counting
•Product rule
•Sum rule
•More complex counting problems
•Inclusion-Exclusion principle
•Tree Diagrams
•Pigeonhole Principle

Product rule

•Basic Counting
•Product rule
•Sum rule
•More complex counting problems
•Inclusion-Exclusion principle
•Tree Diagrams
•Pigeonhole Principle

Product rule
Product rule
Product rule
Product rule
Product rule
Product rule

let N denote a digit that can take any of the values 2 through 9
let X denote a digit that can take any of the values 0 through 9
How many different North American telephone numbers are possible?

Product rule

8 · 10 · 10 = 800 area codes with format NXX
10 · 10 · 10 · 10 = 10,000 station codes with format XXXX.
`;

async function testContentVerifier() {
  console.log('🧪 Testing AI Content Quality Verifier...\n');
  
  // Create verifier instance
  const verifier = new AIContentQualityVerifier({
    enableAIVerification: false, // Test without OpenAI first
    minContentLength: 100,
    maxRedundancyThreshold: 0.3,
    requireEducationalValue: false,
    filterBulletPoints: true
  });
  
  console.log('📝 Original Content:');
  console.log('-------------------');
  console.log(problematicContent);
  console.log('\n');
  
  try {
    // Analyze content quality
    console.log('🔍 Analyzing content quality...');
    const analysis = await verifier.analyzeContentQuality(problematicContent, {
      fileName: 'test-counting.pdf',
      subject: 'counting',
      type: 'academic'
    });
    
    console.log('📊 Analysis Results:');
    console.log(`Quality Score: ${Math.round(analysis.qualityScore * 100)}%`);
    console.log(`High Quality: ${analysis.isHighQuality ? 'Yes' : 'No'}`);
    console.log(`Issues Found: ${analysis.issues.length}`);
    
    if (analysis.issues.length > 0) {
      console.log('\n🚨 Issues Detected:');
      analysis.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type.toUpperCase()} (${issue.severity}): ${issue.description}`);
        if (issue.suggestion) {
          console.log(`   💡 Suggestion: ${issue.suggestion}`);
        }
      });
    }
    
    // Verify and improve content
    console.log('\n🔧 Improving content...');
    const verificationResult = await verifier.verifyAndImproveContent(problematicContent, {
      fileName: 'test-counting.pdf',
      subject: 'counting',
      type: 'academic'
    });
    
    console.log('\n✅ Improved Content:');
    console.log('-------------------');
    console.log(verificationResult.verifiedContent);
    
    console.log('\n📈 Improvement Summary:');
    console.log(`Original Length: ${verificationResult.originalContent.length} characters`);
    console.log(`Improved Length: ${verificationResult.verifiedContent.length} characters`);
    console.log(`Quality Improvement: ${Math.round(verificationResult.qualityImprovement * 100)}%`);
    console.log(`Issues Fixed: ${verificationResult.issuesFixed.length}`);
    
    if (verificationResult.preservedElements.formulas.length > 0) {
      console.log(`Formulas Preserved: ${verificationResult.preservedElements.formulas.length}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContentVerifier().then(() => {
  console.log('\n✅ Test completed!');
}).catch(error => {
  console.error('❌ Test error:', error);
});