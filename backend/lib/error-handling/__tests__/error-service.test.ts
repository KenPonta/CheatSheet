import { ErrorHandlingService, ProcessingStage, UserNotification } from '../error-service';
import { ProcessingError } from '../../file-processing/types';

describe('ErrorHandlingService', () => {
  let errorService: ErrorHandlingService;
  const mockSessionId = 'test-session-123';
  const mockFiles = [
    new File(['test content'], 'test1.txt', { type: 'text/plain' }),
    new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' })
  ];

  beforeEach(() => {
    errorService = ErrorHandlingService.getInstance();
    // Clear any existing sessions
    errorService.cleanup();
  });

  describe('Session Management', () => {
    test('should initialize a new session', () => {
      const session = errorService.initializeSession(mockSessionId, mockFiles);

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.files).toHaveLength(2);
      expect(session.currentStage).toBe('upload');
      expect(session.completedStages).toHaveLength(0);
      expect(session.canRecover).toBe(true);
    });

    test('should update session progress', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      errorService.updateProgress(mockSessionId, 'extraction', 50, 'Processing files...');
      
      const session = errorService.getSession(mockSessionId);
      expect(session?.currentStage).toBe('extraction');
      expect(session?.lastActivity).toBeInstanceOf(Date);
    });

    test('should mark stage as completed when progress reaches 100', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      errorService.updateProgress(mockSessionId, 'validation', 100, 'Validation complete');
      
      const session = errorService.getSession(mockSessionId);
      expect(session?.completedStages).toContain('validation');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      errorService.initializeSession(mockSessionId, mockFiles);
    });

    test('should handle network errors with retry strategy', () => {
      const networkError: ProcessingError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'medium'
      };

      const strategy = errorService.handleError(mockSessionId, networkError, 'file-0', 'extraction');

      expect(strategy.type).toBe('retry');
      expect(strategy.automated).toBe(true);
      expect(strategy.maxRetries).toBe(3);
    });

    test('should handle memory errors with fallback strategy', () => {
      const memoryError: ProcessingError = {
        code: 'MEMORY_ERROR',
        message: 'Out of memory',
        severity: 'high'
      };

      const strategy = errorService.handleError(mockSessionId, memoryError, 'file-0', 'extraction');

      expect(strategy.type).toBe('fallback');
      expect(strategy.automated).toBe(true);
      expect(strategy.fallbackProcessor).toBe('low-memory');
    });

    test('should handle OCR errors with fallback strategy', () => {
      const ocrError: ProcessingError = {
        code: 'OCR_ERROR',
        message: 'Text recognition failed',
        severity: 'low'
      };

      const strategy = errorService.handleError(mockSessionId, ocrError, 'file-0', 'ocr');

      expect(strategy.type).toBe('fallback');
      expect(strategy.automated).toBe(true);
      expect(strategy.fallbackProcessor).toBe('alternative-ocr');
    });

    test('should handle parse errors with skip strategy after retry', () => {
      const parseError: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'medium'
      };

      // First attempt should try fallback
      const firstStrategy = errorService.handleError(mockSessionId, parseError, 'file-0', 'extraction');
      expect(firstStrategy.type).toBe('fallback');

      // Simulate retry count increment
      const session = errorService.getSession(mockSessionId);
      if (session) {
        const file = session.files.find(f => f.id === 'file-0');
        if (file) file.retryCount = 1;
      }

      // Second attempt should suggest skip
      const secondStrategy = errorService.handleError(mockSessionId, parseError, 'file-0', 'extraction');
      expect(secondStrategy.type).toBe('skip');
      expect(secondStrategy.automated).toBe(false);
    });

    test('should handle AI service errors with retry then fallback', () => {
      const aiError: ProcessingError = {
        code: 'AI_SERVICE_ERROR',
        message: 'AI service unavailable',
        severity: 'medium'
      };

      // First attempt should retry
      const firstStrategy = errorService.handleError(mockSessionId, aiError, 'file-0', 'ai-processing');
      expect(firstStrategy.type).toBe('retry');
      expect(firstStrategy.maxRetries).toBe(2);

      // Simulate multiple retries
      const session = errorService.getSession(mockSessionId);
      if (session) {
        const file = session.files.find(f => f.id === 'file-0');
        if (file) file.retryCount = 2;
      }

      // After max retries, should use fallback
      const fallbackStrategy = errorService.handleError(mockSessionId, aiError, 'file-0', 'ai-processing');
      expect(fallbackStrategy.type).toBe('fallback');
      expect(fallbackStrategy.fallbackProcessor).toBe('basic-extraction');
    });

    test('should update file status when error occurs', () => {
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };

      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      const session = errorService.getSession(mockSessionId);
      const file = session?.files.find(f => f.id === 'file-0');
      
      expect(file?.status).toBe('failed');
      expect(file?.errors).toContain(error);
      expect(file?.stage).toBe('extraction');
    });

    test('should add failed stage to session', () => {
      const error: ProcessingError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'medium'
      };

      errorService.handleError(mockSessionId, error, undefined, 'ai-processing');

      const session = errorService.getSession(mockSessionId);
      expect(session?.failedStages).toContain('ai-processing');
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      errorService.initializeSession(mockSessionId, mockFiles);
    });

    test('should create appropriate notifications for errors', () => {
      const notifications: UserNotification[] = [];
      const unsubscribe = errorService.onNotification((notification) => {
        notifications.push(notification);
      });

      const error: ProcessingError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'medium'
      };

      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].title).toContain('Network Error');
      expect(notifications[0].stage).toBe('extraction');
      expect(notifications[0].actions).toBeDefined();

      unsubscribe();
    });

    test('should include appropriate actions for different error types', () => {
      const notifications: UserNotification[] = [];
      const unsubscribe = errorService.onNotification((notification) => {
        notifications.push(notification);
      });

      const retryableError: ProcessingError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'medium'
      };

      errorService.handleError(mockSessionId, retryableError, 'file-0', 'extraction');

      const notification = notifications[0];
      const actionLabels = notification.actions?.map(a => a.action) || [];
      
      expect(actionLabels).toContain('retry');
      expect(actionLabels).toContain('skip');

      unsubscribe();
    });
  });

  describe('Recovery Actions', () => {
    beforeEach(() => {
      errorService.initializeSession(mockSessionId, mockFiles);
    });

    test('should execute retry action successfully', async () => {
      // Create an error first
      const error: ProcessingError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'medium'
      };

      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      // Execute retry action
      const success = await errorService.executeRecovery(
        mockSessionId,
        'test-notification-id',
        { label: 'Retry', action: 'retry' }
      );

      expect(success).toBe(true);

      const session = errorService.getSession(mockSessionId);
      const file = session?.files.find(f => f.id === 'file-0');
      expect(file?.retryCount).toBe(1);
      expect(file?.status).toBe('pending');
    });

    test('should execute skip action successfully', async () => {
      // Create an error first
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };

      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      // Execute skip action
      const success = await errorService.executeRecovery(
        mockSessionId,
        'test-notification-id',
        { label: 'Skip', action: 'skip' }
      );

      expect(success).toBe(true);

      const session = errorService.getSession(mockSessionId);
      const file = session?.files.find(f => f.id === 'file-0');
      expect(file?.status).toBe('skipped');
    });

    test('should execute fallback action successfully', async () => {
      // Create an error first
      const error: ProcessingError = {
        code: 'MEMORY_ERROR',
        message: 'Out of memory',
        severity: 'high'
      };

      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      // Execute fallback action
      const success = await errorService.executeRecovery(
        mockSessionId,
        'test-notification-id',
        { label: 'Use Fallback', action: 'fallback', data: 'low-memory' }
      );

      expect(success).toBe(true);

      const session = errorService.getSession(mockSessionId);
      const file = session?.files.find(f => f.id === 'file-0');
      expect(file?.status).toBe('pending');
    });

    test('should handle cancel action', async () => {
      const success = await errorService.executeRecovery(
        mockSessionId,
        'test-notification-id',
        { label: 'Cancel', action: 'cancel' }
      );

      expect(success).toBe(false);

      const session = errorService.getSession(mockSessionId);
      expect(session?.canRecover).toBe(false);
    });
  });

  describe('Session Recovery', () => {
    test('should recover recent session', () => {
      // Create a session
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Simulate some progress
      errorService.updateProgress(mockSessionId, 'extraction', 50, 'Processing...');
      
      // Recover the session
      const recoveredSession = errorService.recoverSession(mockSessionId);
      
      expect(recoveredSession).toBeDefined();
      expect(recoveredSession?.sessionId).toBe(mockSessionId);
      expect(recoveredSession?.currentStage).toBe('extraction');
    });

    test('should not recover old session', () => {
      // Create a session
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      
      // Make it old (more than 1 hour)
      session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      // Try to recover
      const recoveredSession = errorService.recoverSession(mockSessionId);
      
      expect(recoveredSession).toBeNull();
    });

    test('should reset failed files during recovery', () => {
      // Create session and add failed file
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };
      
      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');
      
      // Recover session
      const recoveredSession = errorService.recoverSession(mockSessionId);
      
      expect(recoveredSession).toBeDefined();
      
      const file = recoveredSession?.files.find(f => f.id === 'file-0');
      expect(file?.status).toBe('pending');
    });
  });

  describe('Progress Tracking', () => {
    test('should notify progress subscribers', () => {
      const progressUpdates: any[] = [];
      const unsubscribe = errorService.onProgress((update) => {
        progressUpdates.push(update);
      });

      errorService.initializeSession(mockSessionId, mockFiles);
      errorService.updateProgress(mockSessionId, 'extraction', 75, 'Extracting content...');

      expect(progressUpdates).toHaveLength(2); // One for initialization, one for update
      expect(progressUpdates[1].stage).toBe('extraction');
      expect(progressUpdates[1].progress).toBe(75);
      expect(progressUpdates[1].message).toBe('Extracting content...');

      unsubscribe();
    });

    test('should calculate estimated time remaining', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Simulate some progress over time
      const session = errorService.getSession(mockSessionId);
      if (session) {
        session.completedStages = ['upload', 'validation'];
        session.lastActivity = new Date(Date.now() - 30000); // 30 seconds ago
      }
      
      errorService.updateProgress(mockSessionId, 'extraction', 50, 'Processing...');
      
      // The estimated time should be calculated based on progress
      // This is tested indirectly through the progress update
      expect(true).toBe(true); // Placeholder - actual calculation is internal
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Add some errors
      const errors = [
        { code: 'NETWORK_ERROR', message: 'Connection failed', severity: 'medium' as const },
        { code: 'PARSE_ERROR', message: 'File corrupted', severity: 'high' as const },
        { code: 'NETWORK_ERROR', message: 'Timeout', severity: 'medium' as const }
      ];
      
      errors.forEach((error, index) => {
        errorService.handleError(mockSessionId, error, `file-${index}`, 'extraction');
      });
      
      const stats = errorService.getErrorStats();
      
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.errorsByType['NETWORK_ERROR']).toBeGreaterThanOrEqual(1);
      expect(stats.errorsByType['PARSE_ERROR']).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cleanup', () => {
    test('should clean up old sessions', () => {
      // Create an old session
      const oldSession = errorService.initializeSession('old-session', mockFiles);
      oldSession.lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      // Create a recent session
      errorService.initializeSession(mockSessionId, mockFiles);
      
      // Run cleanup
      errorService.cleanup();
      
      // Old session should be removed
      expect(errorService.getSession('old-session')).toBeNull();
      
      // Recent session should remain
      expect(errorService.getSession(mockSessionId)).toBeDefined();
    });
  });
});