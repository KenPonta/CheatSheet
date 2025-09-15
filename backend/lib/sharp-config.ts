// Sharp configuration to prevent worker thread issues in Next.js

// Force disable worker threads at the process level BEFORE importing Sharp
process.env.SHARP_DISABLE_WORKER = 'true';
process.env.SHARP_CONCURRENCY = '1';
process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = '1';
process.env.VIPS_DISC_THRESHOLD = '0';
process.env.VIPS_PROGRESS = 'false';

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
  
  console.log('Sharp configured with concurrency:', concurrency, 'worker threads disabled');
} catch (error) {
  console.warn('Sharp configuration warning:', error);
}

// Create a wrapper function that handles worker thread errors gracefully
const safeSharp = (input?: string | Buffer | Uint8Array | Uint8ClampedArray, options?: sharp.SharpOptions) => {
  try {
    // Force sequential processing options to prevent worker thread usage
    const safeOptions: sharp.SharpOptions = {
      sequentialRead: true,
      limitInputPixels: false,
      failOnError: false,
      ...options
    };
    
    const instance = sharp(input, safeOptions);
    
    // Wrap toBuffer to catch worker thread errors
    const originalToBuffer = instance.toBuffer.bind(instance);
    instance.toBuffer = async function(...args: any[]) {
      try {
        return await originalToBuffer(...args);
      } catch (error: any) {
        if (error.message?.includes('worker') || 
            error.message?.includes('MODULE_NOT_FOUND') ||
            error.code === 'MODULE_NOT_FOUND') {
          console.warn('Sharp worker thread error caught, processing failed gracefully');
          throw new Error('Sharp processing failed - worker thread issue detected');
        }
        throw error;
      }
    };
    
    return instance;
  } catch (error) {
    console.warn('Sharp initialization failed:', error);
    throw new Error('Sharp processing unavailable');
  }
};

// Export configured sharp instance
export default safeSharp;