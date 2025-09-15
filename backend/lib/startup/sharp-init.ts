// Sharp initialization script to prevent worker thread issues

// Set environment variables FIRST, before any imports
process.env.SHARP_DISABLE_WORKER = 'true';
process.env.SHARP_CONCURRENCY = '1';
process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = '1';
process.env.VIPS_DISC_THRESHOLD = '0';
process.env.VIPS_PROGRESS = 'false';

import sharp from 'sharp';
import './error-handlers';

export function initializeSharp(): void {
  try {
    // Configure Sharp on startup to prevent runtime issues
    sharp.concurrency(1);
    sharp.cache(false);
    sharp.simd(false);
    
    console.log('Sharp configured with worker threads disabled');
    
    // Test Sharp functionality with a minimal 1x1 pixel PNG
    const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    // Wrap the test in a try-catch to handle worker thread errors
    sharp(testBuffer, { 
      sequentialRead: true,
      limitInputPixels: false,
      failOnError: false
    })
      .png()
      .toBuffer()
      .then(() => {
        console.log('Sharp initialization test passed');
      })
      .catch((error) => {
        if (error.message?.includes('worker') || error.message?.includes('MODULE_NOT_FOUND')) {
          console.warn('Sharp worker thread issue during initialization - this is expected');
        } else {
          console.warn('Sharp initialization test failed, but continuing:', error.message);
        }
      });
      
  } catch (error) {
    console.error('Sharp initialization failed:', error);
    // Don't throw - allow the application to continue without Sharp optimization
  }
}

// Auto-initialize on import
initializeSharp();