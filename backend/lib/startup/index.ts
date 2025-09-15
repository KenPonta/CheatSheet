// Main startup initialization script

import './error-handlers';
import './sharp-init';

export { initializeSharp } from './sharp-init';
export { setupGlobalErrorHandlers } from './error-handlers';

console.log('Backend startup initialization complete');