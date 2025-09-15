import { SessionRecoveryService, RecoveryOptions } from '../session-recovery';
import { ErrorHandlingService, SessionState } from '../error-service';
import { ProcessingError } from '../../file-processing/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
    // Add method to get all keys for testing
    getAllKeys: () => Object.keys(store)
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SessionRecoveryService', () => {
  let recoveryService: SessionRecoveryService;
  let errorService: ErrorHandlingService;
  const mockSessionId = 'test-session-recovery';
  const mockFiles = [
    new File(['test content'], 'test1.txt', { type: 'text/plain' }),
    new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' })
  ];

  beforeEach(() => {
    recoveryService = SessionRecoveryService.getInstance();
    errorService = ErrorHandlingService.getInstance();
    localStorageMock.clear();
    errorService.cleanup();
  });

  describe('Session Recovery', () => {
    test('should recover a valid session', async () => {
      // Create a session
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      errorService.updateProgress(mockSessionId, 'extraction', 50, 'Processing...');

      const result = await recoveryService.recoverSession(mockSessionId);

      expect(result.success).toBe(true);
      expect(result.recoveredSession).toBeDefined();
      expect(result.recoveredSession?.sessionId).toBe(mockSessionId);
      expect(result.message).toBe('Session successfully recovered');
    });

    test('should not recover non-existent session', async () => {
      const result = await recoveryService.recoverSession('non-existent-session');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session not found or expired');
    });

    test('should not recover non-recoverable session', async () => {
      // Create a session and mark it as non-recoverable
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      session.canRecover = false;

      const result = await recoveryService.recoverSession(mockSessionId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session marked as non-recoverable');
    });

    test('should not recover old session', async () => {
      // Create a session and make it old
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      session.lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const result = await recoveryService.recoverSession(mockSessionId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session too old to recover (older than 24 hours)');
    });

    test('should skip failed files when option is enabled', async () => {
      // Create session with failed file
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };
      
      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      const options: RecoveryOptions = {
        skipFailedFiles: true
      };

      const result = await recoveryService.recoverSession(mockSessionId, options);

      expect(result.success).toBe(true);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toBe('test1.txt');
    });

    test('should retry failed files when option is enabled', async () => {
      // Create session with failed file
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const error: ProcessingError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        severity: 'medium'
      };
      
      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      const options: RecoveryOptions = {
        retryFailedStages: true,
        maxRecoveryAttempts: 2
      };

      const result = await recoveryService.recoverSession(mockSessionId, options);

      expect(result.success).toBe(true);
      
      const session = result.recoveredSession;
      const file = session?.files.find(f => f.id === 'file-0');
      expect(file?.status).toBe('pending');
      expect(file?.retryCount).toBeGreaterThan(0);
    });

    test('should not retry files that exceeded max attempts', async () => {
      // Create session with failed file that has high retry count
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };
      
      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');
      
      // Set high retry count
      const session = errorService.getSession(mockSessionId);
      if (session) {
        const file = session.files.find(f => f.id === 'file-0');
        if (file) file.retryCount = 5;
      }

      const options: RecoveryOptions = {
        retryFailedStages: true,
        maxRecoveryAttempts: 3
      };

      const result = await recoveryService.recoverSession(mockSessionId, options);

      expect(result.success).toBe(true);
      expect(result.failedRecoveries).toHaveLength(1);
      expect(result.failedRecoveries[0]).toBe('test1.txt');
    });
  });

  describe('Recovery Recommendations', () => {
    test('should provide recommendations for healthy session', () => {
      // Create a recent, healthy session
      errorService.initializeSession(mockSessionId, mockFiles);

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);

      expect(recommendations.canRecover).toBe(true);
      expect(recommendations.riskLevel).toBe('low');
      expect(recommendations.recommendations).toContain('Session appears healthy and can be safely recovered');
    });

    test('should warn about old sessions', () => {
      // Create an old session
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      session.lastActivity = new Date(Date.now() - 15 * 60 * 60 * 1000); // 15 hours ago

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);

      expect(recommendations.riskLevel).toBe('medium');
      expect(recommendations.recommendations.some(r => r.includes('quite old'))).toBe(true);
    });

    test('should warn about very old sessions', () => {
      // Create a very old session
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      session.lastActivity = new Date(Date.now() - 22 * 60 * 60 * 1000); // 22 hours ago

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);

      expect(recommendations.riskLevel).toBe('high');
      expect(recommendations.recommendations.some(r => r.includes('very old'))).toBe(true);
    });

    test('should warn about failed files', () => {
      // Create session with failed files
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const error: ProcessingError = {
        code: 'PARSE_ERROR',
        message: 'File corrupted',
        severity: 'high'
      };
      
      errorService.handleError(mockSessionId, error, 'file-0', 'extraction');

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);

      expect(recommendations.recommendations.some(r => r.includes('files failed'))).toBe(true);
    });

    test('should warn about AI processing failures', () => {
      // Create session with AI processing failure
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const error: ProcessingError = {
        code: 'AI_SERVICE_ERROR',
        message: 'AI service unavailable',
        severity: 'medium'
      };
      
      errorService.handleError(mockSessionId, error, undefined, 'ai-processing');

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);

      expect(recommendations.recommendations.some(r => r.includes('AI processing failed'))).toBe(true);
    });

    test('should warn about high retry counts', () => {
      // Create session with high retry file
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const session = errorService.getSession(mockSessionId);
      if (session) {
        const file = session.files[0];
        file.retryCount = 3;
      }

      const recommendations = recoveryService.getRecoveryRecommendations(mockSessionId);

      expect(recommendations.riskLevel).toBe('medium');
      expect(recommendations.recommendations.some(r => r.includes('retried multiple times'))).toBe(true);
    });
  });

  describe('Checkpoints', () => {
    test('should create checkpoint successfully', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const success = recoveryService.createCheckpoint(mockSessionId, 'extraction');
      
      expect(success).toBe(true);
      
      // Check that checkpoint was stored
      const checkpointData = localStorage.getItem(`checkpoint_${mockSessionId}`);
      expect(checkpointData).toBeDefined();
      
      const checkpoint = JSON.parse(checkpointData!);
      expect(checkpoint.sessionId).toBe(mockSessionId);
      expect(checkpoint.stage).toBe('extraction');
    });

    test('should restore from checkpoint', () => {
      // Create a checkpoint
      errorService.initializeSession(mockSessionId, mockFiles);
      recoveryService.createCheckpoint(mockSessionId, 'extraction');
      
      // Restore from checkpoint
      const restoredSession = recoveryService.restoreFromCheckpoint(mockSessionId);
      
      expect(restoredSession).toBeDefined();
      expect(restoredSession?.sessionId).toBe(mockSessionId);
      expect(restoredSession?.currentStage).toBe('extraction');
    });

    test('should not restore from old checkpoint', () => {
      // Create an old checkpoint manually
      const oldCheckpoint = {
        sessionId: mockSessionId,
        stage: 'extraction',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        completedStages: [],
        files: [],
        notifications: []
      };
      
      localStorage.setItem(`checkpoint_${mockSessionId}`, JSON.stringify(oldCheckpoint));
      
      const restoredSession = recoveryService.restoreFromCheckpoint(mockSessionId);
      
      expect(restoredSession).toBeNull();
      
      // Should also remove the old checkpoint
      expect(localStorage.getItem(`checkpoint_${mockSessionId}`)).toBeNull();
    });

    test('should handle corrupted checkpoint data', () => {
      // Store corrupted data
      localStorage.setItem(`checkpoint_${mockSessionId}`, 'invalid json');
      
      const restoredSession = recoveryService.restoreFromCheckpoint(mockSessionId);
      
      expect(restoredSession).toBeNull();
    });
  });

  describe('Checkpoint Cleanup', () => {
    test('should clean up old checkpoints', () => {
      // Clear localStorage first
      localStorageMock.clear();
      
      // Create old and new checkpoints
      const oldCheckpoint = {
        sessionId: 'old-session',
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago (older than 7 days)
        stage: 'extraction'
      };
      
      const newCheckpoint = {
        sessionId: 'new-session',
        timestamp: new Date(),
        stage: 'extraction'
      };
      
      localStorage.setItem('checkpoint_old-session', JSON.stringify(oldCheckpoint));
      localStorage.setItem('checkpoint_new-session', JSON.stringify(newCheckpoint));
      
      // Verify items were set
      expect(localStorage.getItem('checkpoint_old-session')).toBeDefined();
      expect(localStorage.getItem('checkpoint_new-session')).toBeDefined();
      
      recoveryService.cleanupCheckpoints();
      
      // Old checkpoint should be removed (older than 7 days)
      expect(localStorage.getItem('checkpoint_old-session')).toBeNull();
      
      // New checkpoint should remain
      expect(localStorage.getItem('checkpoint_new-session')).toBeDefined();
    });

    test('should remove corrupted checkpoint data during cleanup', () => {
      // Clear localStorage first
      localStorageMock.clear();
      
      localStorage.setItem('checkpoint_corrupted', 'invalid json');
      
      // Verify item was set
      expect(localStorage.getItem('checkpoint_corrupted')).toBe('invalid json');
      
      recoveryService.cleanupCheckpoints();
      
      expect(localStorage.getItem('checkpoint_corrupted')).toBeNull();
    });
  });

  describe('Recoverable Sessions List', () => {
    test('should get list of recoverable sessions', () => {
      // Clear localStorage first
      localStorageMock.clear();
      
      // Create some checkpoints
      const sessions = [
        {
          sessionId: 'session-1',
          timestamp: new Date(),
          stage: 'extraction',
          files: [{ id: 'file-1' }, { id: 'file-2' }]
        },
        {
          sessionId: 'session-2',
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          stage: 'ai-processing',
          files: [{ id: 'file-1' }]
        }
      ];
      
      sessions.forEach(session => {
        localStorage.setItem(`checkpoint_${session.sessionId}`, JSON.stringify(session));
      });
      
      // Verify checkpoints were created
      expect(localStorage.getItem('checkpoint_session-1')).toBeDefined();
      expect(localStorage.getItem('checkpoint_session-2')).toBeDefined();
      
      const recoverableSessions = recoveryService.getRecoverableSessions();
      
      expect(recoverableSessions).toHaveLength(2);
      expect(recoverableSessions[0].sessionId).toBe('session-1'); // Most recent first
      expect(recoverableSessions[1].sessionId).toBe('session-2');
    });

    test('should handle empty recoverable sessions list', () => {
      const recoverableSessions = recoveryService.getRecoverableSessions();
      
      expect(recoverableSessions).toHaveLength(0);
    });
  });

  describe('Can Recover Session', () => {
    test('should return true for recoverable session', () => {
      errorService.initializeSession(mockSessionId, mockFiles);
      
      const canRecover = recoveryService.canRecoverSession(mockSessionId);
      
      expect(canRecover).toBe(true);
    });

    test('should return false for non-existent session', () => {
      const canRecover = recoveryService.canRecoverSession('non-existent');
      
      expect(canRecover).toBe(false);
    });

    test('should return false for non-recoverable session', () => {
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      session.canRecover = false;
      
      const canRecover = recoveryService.canRecoverSession(mockSessionId);
      
      expect(canRecover).toBe(false);
    });

    test('should return false for old session', () => {
      const session = errorService.initializeSession(mockSessionId, mockFiles);
      session.lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      const canRecover = recoveryService.canRecoverSession(mockSessionId);
      
      expect(canRecover).toBe(false);
    });
  });
});