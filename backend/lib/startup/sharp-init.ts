// Sharp initialization script to prevent worker thread issues

import sharp from 'sharp';
import './error-handlers';

export function initializeSharp(): void {
  try {
    // Configure Sharp on startup to prevent runtime issues
    sharp.concurrency(1);
    sharp.cache(false);
    sharp.simd(false);
    
    // Set environment variables to disable worker threads
    process.env.SHARP_DISABLE_WORKER = 'true';
    process.env.SHARP_CONCURRENCY = '1';
    
    console.log('Sharp configured with worker threads disabled');
    
    // Test Sharp functionality with a minimal 1x1 pixel PNG
    const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    sharp(testBuffer, { sequentialRead: true })
      .png()
      .toBuffer()
      .then(() => {
        console.log('Sharp initialization test passed');
      })
      .catch((error) => {
        console.warn('Sharp initialization test failed, but continuing:', error.message);
      });
      
  } catch (error) {
    console.error('Sharp initialization failed:', error);
    // Don't throw - allow the application to continue without Sharp optimization
  }
}

// Auto-initialize on import
initializeSharp();