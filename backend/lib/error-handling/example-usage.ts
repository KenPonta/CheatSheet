// Example usage of the comprehensive error handling system

import { 
  errorService, 
  aiFallbackService, 
  sessionRecovery,
  type ProcessingStage,
  type UserNotification,
  type ProgressUpdate 
} from './index';
import { ProcessingError } from '../file-processing/types';

/**
 * Example: Complete file processing workflow with error handling
 */
export async function processFilesWithErrorHandling(
  files: File[],
  onProgress?: (update: ProgressUpdate) => void,
  onNotification?: (notification: UserNotification) => void,
  onError?: (error: any) => void
): Promise<{ success: boolean; sessionId: string; results?: any }> {
  const sessionId = `session-${Date.now()}`;
  
  try {
    // Check for recoverable sessions first
    const recoverableSessions = sessionRecovery.getRecoverableSessions();
    if (recoverableSessions.length > 0) {
      console.log('Found recoverable sessions:', recoverableSessions);
      // Could prompt user to recover previous session
    }

    // Subscribe to progress and notifications
    const unsubscribeProgress = onProgress ? errorService.onProgress(onProgress) : () => {};
    const unsubscribeNotifications = onNotification ? errorService.onNotification(onNotification) : () => {};

    // Initialize session
    const session = errorService.initializeSession(sessionId, files);
    console.log('Initialized session:', session.sessionId);

    // Stage 1: Upload and Validation
    await processStage('upload', async () => {
      errorService.updateProgress(sessionId, 'upload', 50, 'Uploading files...');
      
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      errorService.updateProgress(sessionId, 'upload', 100, 'Upload complete');
    });

    await processStage('validation', async () => {
      errorService.updateProgress(sessionId, 'validation', 30, 'Validating file formats...');
      
      // Simulate validation with potential errors
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Simulate validation error for unsupported files
        if (file.name.endsWith('.xyz')) {
          const error: ProcessingError = {
            code: 'VALIDATION_ERROR',
            message: 'Unsupported file format',
            severity: 'medium'
          };
          
          const strategy = errorService.handleError(sessionId, error, `file-${i}`, 'validation');
          
          if (strategy.type === 'manual') {
            // Wait for user action (in real app, this would be handled by UI)
            console.log('Waiting for user action on validation error...');
          }
        }
        
        errorService.updateProgress(sessionId, 'validation', 30 + (i + 1) * 70 / files.length, `Validated ${i + 1}/${files.length} files`);
      }
    });

    // Stage 2: Content Extraction
    await processStage('extraction', async () => {
      errorService.updateProgress(sessionId, 'extraction', 0, 'Starting content extraction...');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Simulate extraction process
          await extractFileContent(file, sessionId, `file-${i}`);
          
        } catch (error) {
          const processingError: ProcessingError = {
            code: 'PARSE_ERROR',
            message: `Failed to extract content from ${file.name}`,
            severity: 'medium'
          };
          
          const strategy = errorService.handleError(sessionId, processingError, `file-${i}`, 'extraction');
          
          if (strategy.automated && strategy.type === 'fallback') {
            // Try alternative extraction method
            await extractFileContentFallback(file, sessionId, `file-${i}`);
          }
        }
        
        errorService.updateProgress(sessionId, 'extraction', (i + 1) * 100 / files.length, `Extracted ${i + 1}/${files.length} files`);
      }
    });

    // Stage 3: OCR Processing
    await processStage('ocr', async () => {
      errorService.updateProgress(sessionId, 'ocr', 0, 'Processing images with OCR...');
      
      // Simulate OCR processing with potential failures
      try {
        await performOCR(sessionId);
        errorService.updateProgress(sessionId, 'ocr', 100, 'OCR processing complete');
        
      } catch (error) {
        const ocrError: ProcessingError = {
          code: 'OCR_ERROR',
          message: 'OCR service failed',
          severity: 'low'
        };
        
        const strategy = errorService.handleError(sessionId, ocrError, undefined, 'ocr');
        
        if (strategy.type === 'fallback') {
          // Use alternative OCR method
          await performOCRFallback(sessionId);
          errorService.updateProgress(sessionId, 'ocr', 100, 'OCR complete (using fallback method)');
        }
      }
    });

    // Stage 4: AI Processing with Fallback
    await processStage('ai-processing', async () => {
      errorService.updateProgress(sessionId, 'ai-processing', 0, 'Analyzing content with AI...');
      
      // Get extracted content (mock data for example)
      const extractedContent = [{
        text: 'Sample extracted content from files',
        images: [],
        tables: [],
        metadata: {
          name: 'combined-content',
          size: 1000,
          type: 'text/plain',
          lastModified: new Date()
        },
        structure: {
          headings: [{ level: 1, text: 'Sample Heading' }],
          sections: [],
          hierarchy: 1
        }
      }];
      
      try {
        // Try AI processing with automatic fallback
        const result = await aiFallbackService.extractTopicsWithFallback(extractedContent);
        
        if (result.success) {
          console.log(`AI processing successful using ${result.method} method`);
          console.log(`Extracted ${result.topics.length} topics with confidence ${result.confidence}`);
          
          if (result.warnings.length > 0) {
            console.log('Warnings:', result.warnings);
          }
          
          errorService.updateProgress(sessionId, 'ai-processing', 100, `AI analysis complete (${result.method} method)`);
        }
        
      } catch (error) {
        const aiError: ProcessingError = {
          code: 'AI_SERVICE_ERROR',
          message: 'All AI services failed',
          severity: 'high'
        };
        
        errorService.handleError(sessionId, aiError, undefined, 'ai-processing');
        throw error;
      }
    });

    // Continue with remaining stages...
    await processStage('topic-extraction', async () => {
      errorService.updateProgress(sessionId, 'topic-extraction', 100, 'Topics extracted and organized');
    });

    await processStage('content-organization', async () => {
      errorService.updateProgress(sessionId, 'content-organization', 100, 'Content organized for layout');
    });

    await processStage('layout-generation', async () => {
      errorService.updateProgress(sessionId, 'layout-generation', 100, 'Layout generated');
    });

    await processStage('pdf-generation', async () => {
      errorService.updateProgress(sessionId, 'pdf-generation', 100, 'PDF generated successfully');
    });

    await processStage('completion', async () => {
      errorService.updateProgress(sessionId, 'completion', 100, 'Processing complete!');
    });

    // Cleanup subscriptions
    unsubscribeProgress();
    unsubscribeNotifications();

    return { success: true, sessionId, results: 'Mock processing results' };

  } catch (error) {
    console.error('Processing failed:', error);
    onError?.(error);
    return { success: false, sessionId };
  }

  /**
   * Helper function to process a stage with error handling
   */
  async function processStage(stage: ProcessingStage, processor: () => Promise<void>): Promise<void> {
    try {
      // Create checkpoint before starting stage
      sessionRecovery.createCheckpoint(sessionId, stage);
      
      await processor();
      
    } catch (error) {
      console.error(`Stage ${stage} failed:`, error);
      
      // Handle stage-level errors
      const stageError: ProcessingError = {
        code: 'STAGE_ERROR',
        message: `Stage ${stage} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      };
      
      const strategy = errorService.handleError(sessionId, stageError, undefined, stage);
      
      if (!strategy.automated) {
        // Re-throw for manual handling
        throw error;
      }
    }
  }
}

/**
 * Example: Session recovery workflow
 */
export async function recoverInterruptedSession(
  sessionId: string,
  onProgress?: (update: ProgressUpdate) => void,
  onNotification?: (notification: UserNotification) => void
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if session can be recovered
    if (!sessionRecovery.canRecoverSession(sessionId)) {
      return { success: false, message: 'Session cannot be recovered' };
    }

    // Get recovery recommendations
    const recommendations = sessionRecovery.getRecoveryRecommendations(sessionId);
    console.log('Recovery recommendations:', recommendations);

    // Attempt recovery
    const recoveryResult = await sessionRecovery.recoverSession(sessionId, {
      autoRecover: true,
      skipFailedFiles: recommendations.riskLevel === 'high',
      retryFailedStages: true,
      maxRecoveryAttempts: 3
    });

    if (recoveryResult.success && recoveryResult.recoveredSession) {
      // Re-subscribe to notifications and progress
      if (onProgress) errorService.onProgress(onProgress);
      if (onNotification) errorService.onNotification(onNotification);

      console.log('Session recovered successfully');
      console.log('Skipped files:', recoveryResult.skippedFiles);
      console.log('Failed recoveries:', recoveryResult.failedRecoveries);

      return { success: true, message: recoveryResult.message };
    } else {
      return { success: false, message: recoveryResult.message };
    }

  } catch (error) {
    console.error('Recovery failed:', error);
    return { 
      success: false, 
      message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Example: Error monitoring and statistics
 */
export function monitorErrorStatistics(): void {
  // Get current error statistics
  const stats = errorService.getErrorStats();
  
  console.log('Error Statistics:');
  console.log('- Total sessions:', stats.totalSessions);
  console.log('- Active sessions:', stats.activeSessions);
  console.log('- Recovery success rate:', (stats.recoverySuccessRate * 100).toFixed(1) + '%');
  console.log('- Errors by type:', stats.errorsByType);

  // Test AI fallback availability
  aiFallbackService.testFallbacks().then(fallbackStatus => {
    console.log('AI Fallback Status:');
    console.log('- Primary AI available:', fallbackStatus.primaryAvailable);
    console.log('- Fallback AI available:', fallbackStatus.fallbackAvailable);
    console.log('- Basic extraction working:', fallbackStatus.basicWorking);
  });

  // Get recoverable sessions
  const recoverableSessions = sessionRecovery.getRecoverableSessions();
  console.log('Recoverable sessions:', recoverableSessions.length);

  // Clean up old data
  sessionRecovery.cleanupCheckpoints();
  errorService.cleanup();
}

// Mock helper functions for the example
async function extractFileContent(file: File, sessionId: string, fileId: string): Promise<void> {
  // Simulate file processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulate random failures
  if (Math.random() < 0.1) {
    throw new Error('Extraction failed');
  }
}

async function extractFileContentFallback(file: File, sessionId: string, fileId: string): Promise<void> {
  // Simulate fallback processing
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function performOCR(sessionId: string): Promise<void> {
  // Simulate OCR processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate OCR failures
  if (Math.random() < 0.15) {
    throw new Error('OCR service unavailable');
  }
}

async function performOCRFallback(sessionId: string): Promise<void> {
  // Simulate fallback OCR
  await new Promise(resolve => setTimeout(resolve, 800));
}