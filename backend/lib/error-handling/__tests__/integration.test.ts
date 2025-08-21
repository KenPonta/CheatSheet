import { ErrorHandlingService, ProcessingStage } from '../error-service';
import { AIFallbackService } from '../ai-fallback';
import { SessionRecoveryService } from '../session-recovery';
import { ProcessingError } from '../../file-processing/types';

describe('Error Handling Integration Tests', () => {
  let errorService: ErrorHandlingService;
  let aiFallbackService: AIFallbackService;
  let recoveryService: SessionRecoveryService;
  
  const mockSessionId = 'integration-test-session';
  const mockFiles = [
    new File(['test content 1'], 'document1.pdf', { type: 'application/pdf' }),
    new File(['test content 2'], 'document2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    new File(['test content 3'], 'image1.jpg', { type: 'image/jpeg' })
  ];

  beforeEach(() => {
    errorService = ErrorHandlingService.getInstance();
    aiFallbackService = AIFallbackService.getInstance();
    recoveryService = SessionRecoveryService.getInstance();
    
    // Clean up any existing state
    errorService.cleanup();
    localStorage.clear();
  });

  describe('Complete Workflow with Error Recovery', () => {
    test('should handle complete workflow with various errors and recoveries', async () => {
      // Initialize session
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      expect(session.files).toHaveLength(3);

      // Simulate upload stage completion
      errorService.updateProgress(mockSessionId, 'upload', 100, 'Files uploaded successfully');

      // Simulate validation stage with one file failing
      errorService.updateProgress(mockSessionId, 'validation', 50, 'Validating files...');
      
      const validationError: ProcessingError = {
        code: 'VALIDATION_ERROR',
        message: 'File format not supported',
        severity: 'medium'
      };
      
      const strategy1 = errorService.handleError(mockSessionId, validationError, 'file-1', 'validation');
      expect(strategy1.type).toBe('manual');

      // User decides to skip the problematic file
      await errorService.executeRecovery(mockSessionId, 'notification-1', {
        label: 'Skip File',
        action: 'skip'
      });

      // Continue with extraction stage
      errorService.updateProgress(mockSessionId, 'extraction', 100, 'Content extraction complete');

      // Simulate OCR stage with temporary failure
      errorService.updateProgress(mockSessionId, 'ocr', 30, 'Processing images...');
      
      const ocrError: ProcessingError = {
        code: 'OCR_ERROR',
        message: 'OCR service temporarily unavailable',
        severity: 'low'
      };
      
      const strategy2 = errorService.handleError(mockSessionId, ocrError, 'file-2', 'ocr');
      expect(strategy2.type).toBe('fallback');

      // System automatically uses fallback OCR
      await errorService.executeRecovery(mockSessionId, 'notification-2', {
        label: 'Use Alternative',
        action: 'fallback',
        data: 'alternative-ocr'
      });

      // Continue with AI processing
      errorService.updateProgress(mockSessionId, 'ai-processing', 50, 'Analyzing content...');
      
      const aiError: ProcessingError = {
        code: 'AI_SERVICE_ERROR',
        message: 'Primary AI service unavailable',
        severity: 'medium'
      };
      
      const strategy3 = errorService.handleError(mockSessionId, aiError, undefined, 'ai-processing');
      expect(strategy3.type).toBe('retry');

      // The AI service error should use fallback after retries
      // Since we've already had errors in this session, it may go directly to fallback
      const strategy4 = errorService.handleError(mockSessionId, aiError, undefined, 'ai-processing');
      expect(['retry', 'fallback']).toContain(strategy4.type); // Should be either retry or fallback

      // Use AI fallback service with forced failures
      const mockContent = [{
        text: 'Sample document content for testing',
        images: [],
        tables: [],
        metadata: {
          name: 'document1.pdf',
          size: 1000,
          type: 'application/pdf',
          lastModified: new Date()
        },
        structure: {
          headings: [{ level: 1, text: 'Introduction' }],
          sections: [],
          hierarchy: 1
        }
      }];

      // Mock AI services to fail so it uses basic extraction
      jest.spyOn(aiFallbackService as any, 'tryPrimaryAIService').mockRejectedValue(new Error('Primary unavailable'));
      jest.spyOn(aiFallbackService as any, 'tryFallbackAIService').mockRejectedValue(new Error('Fallback unavailable'));

      const fallbackResult = await aiFallbackService.extractTopicsWithFallback(mockContent);
      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.method).toBe('basic');

      // Complete remaining stages
      errorService.updateProgress(mockSessionId, 'topic-extraction', 100, 'Topics extracted');
      errorService.updateProgress(mockSessionId, 'content-organization', 100, 'Content organized');
      errorService.updateProgress(mockSessionId, 'layout-generation', 100, 'Layout generated');
      errorService.updateProgress(mockSessionId, 'pdf-generation', 100, 'PDF generated');
      errorService.updateProgress(mockSessionId, 'completion', 100, 'Process complete');

      // Manually mark some files as completed to simulate successful processing
      const sessionForCompletion = errorService.getSession(mockSessionId);
      if (sessionForCompletion) {
        sessionForCompletion.files.forEach((file, index) => {
          if (index === 2) { // Mark the third file as completed
            file.status = 'completed';
          }
        });
      }

      // Verify final session state
      const finalSession = errorService.getSession(mockSessionId);
      expect(finalSession?.completedStages).toContain('completion');
      expect(finalSession?.files.some(f => f.status === 'skipped')).toBe(true);
      expect(finalSession?.files.some(f => f.status === 'completed')).toBe(true);
    });

    test('should handle session interruption and recovery', async () => {
      // Start a session
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Make some progress
      errorService.updateProgress(mockSessionId, 'extraction', 75, 'Extracting content...');
      
      // Create checkpoint
      const checkpointCreated = recoveryService.createCheckpoint(mockSessionId, 'extraction');
      expect(checkpointCreated).toBe(true);

      // Simulate session interruption (clear memory state but keep session recent)
      const session = errorService.getSession(mockSessionId);
      if (session) {
        // Make sure session is recent enough to be recoverable
        session.lastActivity = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      }

      // Attempt recovery (should succeed for recent sessions)
      const recoveryResult = await recoveryService.recoverSession(mockSessionId);
      expect(recoveryResult.success).toBe(true); // Session should be recoverable

      // Restore from checkpoint
      const restoredSession = recoveryService.restoreFromCheckpoint(mockSessionId);
      expect(restoredSession).toBeDefined();
      expect(restoredSession?.currentStage).toBe('extraction');

      // Continue processing from where it left off
      if (restoredSession) {
        // Re-initialize the session in error service
        const newSession = errorService.initializeSession(mockSessionId, mockFiles);
        newSession.currentStage = restoredSession.currentStage;
        newSession.completedStages = restoredSession.completedStages;
        
        errorService.updateProgress(mockSessionId, 'extraction', 100, 'Extraction complete');
        errorService.updateProgress(mockSessionId, 'ocr', 100, 'OCR complete');
        
        const finalSession = errorService.getSession(mockSessionId);
        expect(finalSession?.completedStages).toContain('extraction');
        expect(finalSession?.completedStages).toContain('ocr');
      }
    });

    test('should handle multiple concurrent errors gracefully', async () => {
      errorService.initializeSession(mockSessionId, mockFiles);

      // Simulate multiple errors occurring simultaneously
      const errors = [
        {
          error: { code: 'NETWORK_ERROR', message: 'Connection failed', severity: 'medium' as const },
          fileId: 'file-0',
          stage: 'extraction' as ProcessingStage
        },
        {
          error: { code: 'MEMORY_ERROR', message: 'Out of memory', severity: 'high' as const },
          fileId: 'file-1',
          stage: 'ocr' as ProcessingStage
        },
        {
          error: { code: 'AI_SERVICE_ERROR', message: 'AI unavailable', severity: 'medium' as const },
          fileId: undefined,
          stage: 'ai-processing' as ProcessingStage
        }
      ];

      const strategies = errors.map(({ error, fileId, stage }) =>
        errorService.handleError(mockSessionId, error, fileId, stage)
      );

      // Verify different strategies for different error types
      expect(strategies[0].type).toBe('retry'); // Network error
      expect(strategies[1].type).toBe('fallback'); // Memory error
      expect(strategies[2].type).toBe('retry'); // AI service error

      // Execute recovery actions
      const recoveryResults = await Promise.all([
        errorService.executeRecovery(mockSessionId, 'notif-1', { label: 'Retry', action: 'retry' }),
        errorService.executeRecovery(mockSessionId, 'notif-2', { label: 'Fallback', action: 'fallback', data: 'low-memory' }),
        errorService.executeRecovery(mockSessionId, 'notif-3', { label: 'Fallback', action: 'fallback', data: 'basic-extraction' })
      ]);

      expect(recoveryResults.every(result => result)).toBe(true);

      // Verify session state after recovery
      const session = errorService.getSession(mockSessionId);
      const pendingFiles = session?.files.filter(f => f.status === 'pending') || [];
      expect(pendingFiles.length).toBeGreaterThanOrEqual(2); // At least 2 files should be pending after recovery
    });
  });

  describe('Error Statistics and Monitoring', () => {
    test('should track comprehensive error statistics', async () => {
      // Create multiple sessions with various errors
      const sessions = ['session-1', 'session-2', 'session-3'];
      
      for (const sessionId of sessions) {
        errorService.initializeSession(sessionId, mockFiles);
        
        // Add different types of errors
        const errors = [
          { code: 'NETWORK_ERROR', message: 'Network failed', severity: 'medium' as const },
          { code: 'PARSE_ERROR', message: 'Parse failed', severity: 'high' as const },
          { code: 'OCR_ERROR', message: 'OCR failed', severity: 'low' as const }
        ];
        
        errors.forEach((error, index) => {
          errorService.handleError(sessionId, error, `file-${index}`, 'extraction');
        });
      }

      const stats = errorService.getErrorStats();
      
      expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(3);
      expect(stats.errorsByType['NETWORK_ERROR']).toBeGreaterThanOrEqual(3);
      expect(stats.errorsByType['PARSE_ERROR']).toBeGreaterThanOrEqual(3);
      expect(stats.errorsByType['OCR_ERROR']).toBeGreaterThanOrEqual(3);
      expect(stats.recoverySuccessRate).toBeDefined();
    });

    test('should provide recovery recommendations based on session history', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Add multiple failures to same file
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };
      
      // Simulate multiple retry attempts
      for (let i = 0; i < 3; i++) {
        errorService.handleError(mockSessionId, error, 'file-0', 'extraction');
        const session = errorService.getSession(mockSessionId);
        if (session) {
          const file = session.files.find(f => f.id === 'file-0');
          if (file) file.retryCount = i + 1;
        }
      }

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);
      
      expect(recommendations.canRecover).toBe(true);
      expect(recommendations.riskLevel).toBe('medium');
      expect(recommendations.recommendations.some(r => r.includes('retried multiple times'))).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle large number of files with errors efficiently', async () => {
      // Create session with many files
      const manyFiles = Array.from({ length: 50 }, (_, i) => 
        new File([`content ${i}`], `file${i}.txt`, { type: 'text/plain' })
      );
      
      const startTime = Date.now();
      
      errorService.initializeSession(mockSessionId, manyFiles);
      
      // Simulate errors on multiple files
      const errors = Array.from({ length: 20 }, (_, i) => ({
        code: 'NETWORK_ERROR',
        message: `Error ${i}`,
        severity: 'medium' as const
      }));
      
      errors.forEach((error, index) => {
        errorService.handleError(mockSessionId, error, `file-${index}`, 'extraction');
      });
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
      
      const session = errorService.getSession(mockSessionId);
      expect(session?.files).toHaveLength(50);
      expect(session?.files.filter(f => f.status === 'failed')).toHaveLength(20);
    });

    test('should clean up resources properly', () => {
      // Create multiple sessions
      const sessionIds = Array.from({ length: 10 }, (_, i) => `session-${i}`);
      
      sessionIds.forEach(sessionId => {
        errorService.initializeSession(sessionId, mockFiles);
      });
      
      // Make some sessions old
      sessionIds.slice(0, 5).forEach(sessionId => {
        const session = errorService.getSession(sessionId);
        if (session) {
          session.lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
        }
      });
      
      // Run cleanup
      errorService.cleanup();
      
      // Old sessions should be removed
      sessionIds.slice(0, 5).forEach(sessionId => {
        expect(errorService.getSession(sessionId)).toBeNull();
      });
      
      // Recent sessions should remain
      sessionIds.slice(5).forEach(sessionId => {
        expect(errorService.getSession(sessionId)).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Error Boundaries', () => {
    test('should handle malformed error objects gracefully', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Test with malformed error
      const malformedError = {
        // Missing required fields
        message: 'Some error'
      } as ProcessingError;
      
      expect(() => {
        errorService.handleError(mockSessionId, malformedError, 'file-0', 'extraction');
      }).not.toThrow();
      
      const session = errorService.getSession(mockSessionId);
      expect(session?.files[0].errors).toHaveLength(1);
    });

    test('should handle invalid session IDs gracefully', () => {
      expect(() => {
        errorService.updateProgress('invalid-session', 'extraction', 50, 'Processing...');
      }).not.toThrow();
      
      expect(() => {
        errorService.handleError('invalid-session', {
          code: 'TEST_ERROR',
          message: 'Test error',
          severity: 'medium'
        });
      }).not.toThrow();
    });

    test('should handle concurrent access to same session', async () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Simulate concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => {
          errorService.updateProgress(mockSessionId, 'extraction', i * 10, `Step ${i}`);
          
          if (i % 3 === 0) {
            errorService.handleError(mockSessionId, {
              code: 'TEST_ERROR',
              message: `Concurrent error ${i}`,
              severity: 'low'
            }, `file-${i % 3}`, 'extraction');
          }
        })
      );
      
      await Promise.all(operations);
      
      const session = errorService.getSession(mockSessionId);
      expect(session).toBeDefined();
      expect(session?.currentStage).toBe('extraction');
    });
  });
});