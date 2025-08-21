// Session recovery utilities for interrupted workflows

import { SessionState, ProcessingStage, errorService } from './error-service';

export interface RecoveryOptions {
  autoRecover?: boolean;
  skipFailedFiles?: boolean;
  retryFailedStages?: boolean;
  maxRecoveryAttempts?: number;
}

export interface RecoveryResult {
  success: boolean;
  recoveredSession?: SessionState;
  skippedFiles: string[];
  failedRecoveries: string[];
  message: string;
}

export class SessionRecoveryService {
  private static instance: SessionRecoveryService;

  static getInstance(): SessionRecoveryService {
    if (!SessionRecoveryService.instance) {
      SessionRecoveryService.instance = new SessionRecoveryService();
    }
    return SessionRecoveryService.instance;
  }

  /**
   * Attempt to recover an interrupted session
   */
  async recoverSession(
    sessionId: string, 
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult> {
    const {
      autoRecover = true,
      skipFailedFiles = false,
      retryFailedStages = true,
      maxRecoveryAttempts = 3
    } = options;

    try {
      // Try to get the session from storage
      const session = errorService.getSession(sessionId);
      
      if (!session) {
        return {
          success: false,
          skippedFiles: [],
          failedRecoveries: [],
          message: 'Session not found or expired'
        };
      }

      // Check if session is recoverable
      if (!session.canRecover) {
        return {
          success: false,
          skippedFiles: [],
          failedRecoveries: [],
          message: 'Session marked as non-recoverable'
        };
      }

      // Check session age (don't recover sessions older than 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const sessionAge = Date.now() - session.lastActivity.getTime();
      
      if (sessionAge > maxAge) {
        return {
          success: false,
          skippedFiles: [],
          failedRecoveries: [],
          message: 'Session too old to recover (older than 24 hours)'
        };
      }

      const skippedFiles: string[] = [];
      const failedRecoveries: string[] = [];

      // Process files based on recovery options
      for (const file of session.files) {
        if (file.status === 'failed') {
          if (skipFailedFiles) {
            file.status = 'skipped';
            skippedFiles.push(file.name);
          } else if (retryFailedStages && file.retryCount < maxRecoveryAttempts) {
            file.status = 'pending';
            file.retryCount++;
          } else {
            failedRecoveries.push(file.name);
          }
        }
      }

      // Reset failed stages if retrying
      if (retryFailedStages) {
        session.failedStages = [];
      }

      // Update session state
      session.lastActivity = new Date();
      
      // Add recovery notification
      errorService.addNotification(sessionId, {
        id: `recovery-${Date.now()}`,
        type: 'info',
        title: 'Session Recovered',
        message: this.buildRecoveryMessage(skippedFiles, failedRecoveries, retryFailedStages),
        stage: session.currentStage,
        timestamp: new Date(),
        dismissible: true,
        autoHide: true,
        duration: 8000
      });

      return {
        success: true,
        recoveredSession: session,
        skippedFiles,
        failedRecoveries,
        message: 'Session successfully recovered'
      };

    } catch (error) {
      return {
        success: false,
        skippedFiles: [],
        failedRecoveries: [],
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if a session can be recovered
   */
  canRecoverSession(sessionId: string): boolean {
    const session = errorService.getSession(sessionId);
    
    if (!session || !session.canRecover) {
      return false;
    }

    // Check session age
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const sessionAge = Date.now() - session.lastActivity.getTime();
    
    return sessionAge <= maxAge;
  }

  /**
   * Get recovery recommendations for a session
   */
  getRecoveryRecommendations(sessionId: string): {
    canRecover: boolean;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const session = errorService.getSession(sessionId);
    
    if (!session) {
      return {
        canRecover: false,
        recommendations: ['Session not found'],
        riskLevel: 'high'
      };
    }

    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check session age
    const sessionAge = Date.now() - session.lastActivity.getTime();
    const hoursOld = sessionAge / (60 * 60 * 1000);

    if (hoursOld > 12) {
      recommendations.push('Session is quite old - some data may be lost');
      riskLevel = 'medium';
    }

    if (hoursOld > 20) {
      recommendations.push('Session is very old - recovery may fail');
      riskLevel = 'high';
    }

    // Check failed files
    const failedFiles = session.files.filter(f => f.status === 'failed');
    if (failedFiles.length > 0) {
      recommendations.push(`${failedFiles.length} files failed - consider skipping them`);
      if (failedFiles.length > session.files.length / 2) {
        riskLevel = 'high';
      }
    }

    // Check failed stages
    if (session.failedStages.length > 0) {
      recommendations.push(`${session.failedStages.length} processing stages failed`);
      if (session.failedStages.includes('ai-processing')) {
        recommendations.push('AI processing failed - may need to use fallback methods');
      }
    }

    // Check retry counts
    const highRetryFiles = session.files.filter(f => f.retryCount > 2);
    if (highRetryFiles.length > 0) {
      recommendations.push(`${highRetryFiles.length} files have been retried multiple times`);
      riskLevel = 'medium';
    }

    if (recommendations.length === 0) {
      recommendations.push('Session appears healthy and can be safely recovered');
    }

    return {
      canRecover: this.canRecoverSession(sessionId),
      recommendations,
      riskLevel
    };
  }

  /**
   * Create a checkpoint of the current session state
   */
  createCheckpoint(sessionId: string, stage: ProcessingStage): boolean {
    try {
      const session = errorService.getSession(sessionId);
      if (!session) return false;

      // Store checkpoint data in session storage or local storage
      const checkpointData = {
        sessionId,
        stage,
        timestamp: new Date(),
        completedStages: [...session.completedStages],
        files: session.files.map(f => ({ ...f })),
        notifications: session.notifications.filter(n => n.type === 'error')
      };

      // In a real implementation, this would be stored persistently
      localStorage.setItem(`checkpoint_${sessionId}`, JSON.stringify(checkpointData));
      
      return true;
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      return false;
    }
  }

  /**
   * Restore from a checkpoint
   */
  restoreFromCheckpoint(sessionId: string): SessionState | null {
    try {
      const checkpointData = localStorage.getItem(`checkpoint_${sessionId}`);
      if (!checkpointData) return null;

      const checkpoint = JSON.parse(checkpointData);
      
      // Validate checkpoint age
      const checkpointAge = Date.now() - new Date(checkpoint.timestamp).getTime();
      if (checkpointAge > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`checkpoint_${sessionId}`);
        return null;
      }

      // Reconstruct session state
      const session: SessionState = {
        sessionId: checkpoint.sessionId,
        currentStage: checkpoint.stage,
        completedStages: checkpoint.completedStages,
        failedStages: [],
        files: checkpoint.files,
        notifications: checkpoint.notifications,
        lastActivity: new Date(checkpoint.timestamp),
        canRecover: true
      };

      return session;
    } catch (error) {
      console.error('Failed to restore from checkpoint:', error);
      return null;
    }
  }

  /**
   * Clean up old checkpoints
   */
  cleanupCheckpoints(): void {
    try {
      // Get all keys from localStorage
      const keys: string[] = [];
      
      // Try different methods to get keys (for compatibility with different environments)
      if (typeof localStorage.length !== 'undefined') {
        // Standard localStorage API
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keys.push(key);
        }
      } else {
        // Fallback for mock environments
        try {
          const allKeys = Object.keys(localStorage);
          keys.push(...allKeys);
        } catch (e) {
          // If Object.keys doesn't work, try our mock's getAllKeys method
          if ('getAllKeys' in localStorage && typeof localStorage.getAllKeys === 'function') {
            keys.push(...(localStorage as any).getAllKeys());
          }
        }
      }
      
      const checkpointKeys = keys.filter(key => key.startsWith('checkpoint_'));
      
      for (const key of checkpointKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const checkpoint = JSON.parse(data);
            const age = Date.now() - new Date(checkpoint.timestamp).getTime();
            
            // Remove checkpoints older than 7 days
            if (age > 7 * 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted checkpoint data
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup checkpoints:', error);
    }
  }

  /**
   * Get all recoverable sessions
   */
  getRecoverableSessions(): Array<{
    sessionId: string;
    lastActivity: Date;
    stage: ProcessingStage;
    fileCount: number;
    canRecover: boolean;
  }> {
    const sessions: Array<{
      sessionId: string;
      lastActivity: Date;
      stage: ProcessingStage;
      fileCount: number;
      canRecover: boolean;
    }> = [];

    // Check localStorage for checkpoints
    try {
      // Get all keys from localStorage
      const keys: string[] = [];
      
      // Try different methods to get keys (for compatibility with different environments)
      if (typeof localStorage.length !== 'undefined') {
        // Standard localStorage API
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keys.push(key);
        }
      } else {
        // Fallback for mock environments
        try {
          const allKeys = Object.keys(localStorage);
          keys.push(...allKeys);
        } catch (e) {
          // If Object.keys doesn't work, try our mock's getAllKeys method
          if ('getAllKeys' in localStorage && typeof localStorage.getAllKeys === 'function') {
            keys.push(...(localStorage as any).getAllKeys());
          }
        }
      }
      
      const checkpointKeys = keys.filter(key => key.startsWith('checkpoint_'));
      
      for (const key of checkpointKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const checkpoint = JSON.parse(data);
            const sessionId = checkpoint.sessionId;
            
            sessions.push({
              sessionId,
              lastActivity: new Date(checkpoint.timestamp),
              stage: checkpoint.stage,
              fileCount: checkpoint.files?.length || 0,
              canRecover: this.canRecoverSession(sessionId)
            });
          }
        } catch (error) {
          // Skip corrupted data
        }
      }
    } catch (error) {
      console.error('Failed to get recoverable sessions:', error);
    }

    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Build recovery message based on recovery results
   */
  private buildRecoveryMessage(
    skippedFiles: string[], 
    failedRecoveries: string[], 
    retryFailedStages: boolean
  ): string {
    const parts: string[] = ['Your session has been restored.'];

    if (skippedFiles.length > 0) {
      parts.push(`${skippedFiles.length} failed files were skipped.`);
    }

    if (failedRecoveries.length > 0) {
      parts.push(`${failedRecoveries.length} files could not be recovered.`);
    }

    if (retryFailedStages) {
      parts.push('Failed processing stages will be retried.');
    }

    parts.push('Processing will continue from where it left off.');

    return parts.join(' ');
  }
}

export const sessionRecovery = SessionRecoveryService.getInstance();