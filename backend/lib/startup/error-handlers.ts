// Global error handlers to prevent application crashes

export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions (like the Sharp worker thread issue)
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    // Check if it's the Sharp worker thread issue
    if (error.message.includes('Cannot find module') && error.message.includes('worker-script')) {
      console.warn('Sharp worker thread issue detected - this is expected and handled');
      return; // Don't exit the process for this known issue
    }
    
    // For other uncaught exceptions, log and continue (in development)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Continuing despite uncaught exception in development mode');
      return;
    }
    
    // In production, you might want to exit gracefully
    console.error('Exiting due to uncaught exception');
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Check if it's related to Sharp
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = (reason as Error).message;
      if (message.includes('Cannot find module') && message.includes('worker-script')) {
        console.warn('Sharp-related unhandled rejection - continuing');
        return;
      }
    }
    
    // Log but don't exit for unhandled rejections in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Continuing despite unhandled rejection in development mode');
    }
  });

  // Handle warnings (like the Buffer deprecation warning)
  process.on('warning', (warning) => {
    // Filter out known warnings that we can't easily fix
    if (warning.message.includes('Buffer() is deprecated')) {
      // This is likely from a dependency - log but don't spam
      console.warn('Buffer deprecation warning (from dependency):', warning.name);
      return;
    }
    
    console.warn('Process warning:', warning);
  });

  console.log('Global error handlers initialized');
}

// Auto-setup on import
setupGlobalErrorHandlers();