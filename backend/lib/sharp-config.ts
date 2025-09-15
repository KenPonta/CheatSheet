// Sharp configuration to prevent worker thread issues in Next.js

import sharp from 'sharp';

// Configure Sharp to avoid worker thread issues in Next.js
try {
  // Use environment variables for configuration
  const concurrency = process.env.SHARP_CONCURRENCY ? parseInt(process.env.SHARP_CONCURRENCY) : 1;
  
  // Disable Sharp's worker threads to prevent module not found errors
  sharp.concurrency(concurrency);
  sharp.cache(false);
  
  // Set simd to false to avoid worker thread usage
  sharp.simd(false);
  
  console.log('Sharp configured with concurrency:', concurrency);
} catch (error) {
  console.warn('Sharp configuration warning:', error);
}

// Export configured sharp instance
export default sharp;