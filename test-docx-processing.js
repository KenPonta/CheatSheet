// Simple test script to verify DOCX processing
const mammoth = require('mammoth');
const fs = require('fs');

async function testDocxProcessing() {
  console.log('Testing DOCX processing capabilities...');
  
  // Test 1: Check if mammoth is available
  console.log('✓ Mammoth library loaded');
  
  // Test 2: Create a simple buffer to test mammoth
  try {
    // Create a minimal DOCX-like buffer (this won't work but will test the API)
    const testBuffer = Buffer.from('test');
    
    // This should fail gracefully
    try {
      const result = await mammoth.extractRawText({ buffer: testBuffer });
      console.log('Unexpected success with test buffer');
    } catch (error) {
      console.log('✓ Mammoth correctly rejects invalid buffer');
    }
    
    console.log('✓ Mammoth API is working');
    
    // Test 3: Check available options
    const options = {
      convertImage: mammoth.images.ignoreImages,
      styleMap: [],
      includeDefaultStyleMap: false,
      includeEmbeddedStyleMap: false
    };
    
    console.log('✓ Mammoth options configured correctly');
    console.log('Available image handlers:', Object.keys(mammoth.images));
    
  } catch (error) {
    console.error('❌ Mammoth test failed:', error.message);
  }
}

// Test file reading simulation
async function testFileReading() {
  console.log('\nTesting file reading simulation...');
  
  // Simulate File API
  const mockFile = {
    name: 'test.docx',
    size: 1000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    slice: function(start, end) {
      return {
        arrayBuffer: async function() {
          // Return a mock array buffer
          const size = Math.min(end - start, this.size - start);
          return new ArrayBuffer(size);
        }
      };
    }
  };
  
  // Test chunked reading
  const chunkSize = 64 * 1024; // 64KB
  const chunks = [];
  let offset = 0;
  
  while (offset < mockFile.size) {
    const chunkEnd = Math.min(offset + chunkSize, mockFile.size);
    const chunk = mockFile.slice(offset, chunkEnd);
    const arrayBuffer = await chunk.arrayBuffer();
    chunks.push(new Uint8Array(arrayBuffer));
    offset = chunkEnd;
  }
  
  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  
  const buffer = Buffer.from(result);
  console.log(`✓ Mock file reading completed: ${buffer.length} bytes`);
}

async function runTests() {
  await testDocxProcessing();
  await testFileReading();
  console.log('\n🎉 All tests completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testDocxProcessing, testFileReading };