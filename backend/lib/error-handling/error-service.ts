// Comprehensive error handling and user feedback system

import { ProcessingError } from '../file-processing/types';

export interface UserNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  stage: ProcessingStage;
  timestamp: Date;
  actions?: NotificationAction[];
  dismissible: boolean;
  autoHide?: boolean;
  duration?: number;
}

export interface NotificationAction {
  label: string;
  action: 'retry' | 'skip' | 'fallback' | 'manual' | 'cancel' | 'continue';
  data?: any;
}

export type ProcessingStage = 
  | 'upload'
  | 'validation'
  | 'extraction'
  | 'ocr'
  | 'ai-processing'
  | 'topic-extraction'
  | 'content-organization'
  | 'layout-generation'
  | 'pdf-generation'
  | 'completion';

export interface SessionState {
  sessionId: string;
  currentStage: ProcessingStage;
  completedStages: ProcessingStage[];
  failedStages: ProcessingStage[];
  files: SessionFile[];
  notifications: UserNotification[];
  lastActivity: Date;
  canRecover: boolean;
  stageRetryCount: Record<ProcessingStage, number>;
}

export interface SessionFile {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  stage: ProcessingStage;
  errors: ProcessingError[];
  retryCount: number;
  lastProcessed: Date;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'skip' | 'manual' | 'abort';
  description: string;
  automated: boolean;
  userAction?: string;
  fallbackProcessor?: string;
  maxRetries?: number;
}

export interface ProgressUpdate {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  details?: string;
  estimatedTimeRemaining?: number;
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private sessions = new Map<string, SessionState>();
  private notificationCallbacks = new Set<(notification: UserNotification) => void>();
  private progressCallbacks = new Set<(update: ProgressUpdate) => void>();

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Initialize a new processing session
   */
  initializeSession(sessionId: string, files: File[]): SessionState {
    const sessionFiles: SessionFile[] = files.map((file, index) => ({
      id: `file-${index}`,
      name: file.name,
      status: 'pending',
      stage: 'upload',
      errors: [],
      retryCount: 0,
      lastProcessed: new Date()
    }));

    const session: SessionState = {
      sessionId,
      currentStage: 'upload',
      completedStages: [],
      failedStages: [],
      files: sessionFiles,
      notifications: [],
      lastActivity: new Date(),
      canRecover: true,
      stageRetryCount: {} as Record<ProcessingStage, number>
    };

    this.sessions.set(sessionId, session);
    this.notifyProgress({
      stage: 'upload',
      progress: 0,
      message: 'Initializing file processing session...'
    });

    return session;
  }

  /**
   * Update session progress
   */
  updateProgress(sessionId: string, stage: ProcessingStage, progress: number, message: string, details?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.currentStage = stage;
    session.lastActivity = new Date();

    if (progress === 100 && !session.completedStages.includes(stage)) {
      session.completedStages.push(stage);
    }

    this.sessions.set(sessionId, session);
    
    this.notifyProgress({
      stage,
      progress,
      message,
      details,
      estimatedTimeRemaining: this.calculateEstimatedTime(session, progress)
    });
  }

  /**
   * Handle errors with progressive recovery
   */
  handleError(
    sessionId: string,
    error: ProcessingError,
    fileId?: string,
    stage?: ProcessingStage
  ): ErrorRecoveryStrategy {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // Return a default strategy for invalid sessions instead of throwing
      return {
        type: 'abort',
        description: 'Session not found',
        automated: false,
        userAction: 'Please start a new session'
      };
    }

    // Update file status if fileId provided
    if (fileId) {
      const file = session.files.find(f => f.id === fileId);
      if (file) {
        file.errors.push(error);
        file.status = 'failed';
        if (stage) file.stage = stage;
      }
    }

    // Update session state
    if (stage && !session.failedStages.includes(stage)) {
      session.failedStages.push(stage);
    }

    // Increment stage retry count if no specific file
    if (stage && !fileId) {
      session.stageRetryCount[stage] = (session.stageRetryCount[stage] || 0) + 1;
    }

    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    // Determine recovery strategy
    const strategy = this.determineRecoveryStrategy(error, session, fileId, stage);
    
    // Create user notification
    const notification = this.createErrorNotification(error, strategy, stage);
    this.addNotification(sessionId, notification);

    return strategy;
  }

  /**
   * Determine the best recovery strategy for an error
   */
  private determineRecoveryStrategy(
    error: ProcessingError,
    session: SessionState,
    fileId?: string,
    stage?: ProcessingStage
  ): ErrorRecoveryStrategy {
    const file = fileId ? session.files.find(f => f.id === fileId) : null;
    const fileRetryCount = file?.retryCount || 0;
    const stageRetryCount = stage ? (session.stageRetryCount[stage] || 0) : 0;
    const retryCount = fileId ? fileRetryCount : stageRetryCount;

    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        if (retryCount < 3) {
          return {
            type: 'retry',
            description: 'Network issue detected. Will retry automatically.',
            automated: true,
            maxRetries: 3
          };
        }
        return {
          type: 'manual',
          description: 'Multiple network failures. Please check your connection.',
          automated: false,
          userAction: 'Check your internet connection and try again'
        };

      case 'MEMORY_ERROR':
        return {
          type: 'fallback',
          description: 'File too large. Will try with reduced quality settings.',
          automated: true,
          fallbackProcessor: 'low-memory'
        };

      case 'OCR_ERROR':
        return {
          type: 'fallback',
          description: 'Text recognition failed. Will try alternative OCR method.',
          automated: true,
          fallbackProcessor: 'alternative-ocr'
        };

      case 'PARSE_ERROR':
        if (retryCount < 1) {
          return {
            type: 'fallback',
            description: 'File format issue. Will try alternative parser.',
            automated: true,
            fallbackProcessor: 'alternative-parser'
          };
        }
        return {
          type: 'skip',
          description: 'File appears corrupted. Recommend skipping this file.',
          automated: false,
          userAction: 'Skip this file and continue with others'
        };

      case 'AI_SERVICE_ERROR':
        if (retryCount < 2) {
          return {
            type: 'retry',
            description: 'AI service temporarily unavailable. Will retry.',
            automated: true,
            maxRetries: 2
          };
        }
        return {
          type: 'fallback',
          description: 'AI service unavailable. Will use basic topic extraction.',
          automated: true,
          fallbackProcessor: 'basic-extraction'
        };

      case 'VALIDATION_ERROR':
        return {
          type: 'manual',
          description: 'File validation failed. User action required.',
          automated: false,
          userAction: 'Please check file format and size requirements'
        };

      default:
        if (retryCount < 1) {
          return {
            type: 'retry',
            description: 'Unexpected error. Will attempt retry.',
            automated: true,
            maxRetries: 1
          };
        }
        return {
          type: 'skip',
          description: 'Unable to process this file. Recommend skipping.',
          automated: false,
          userAction: 'Skip this file and continue with others'
        };
    }
  }

  /**
   * Create user-friendly error notification
   */
  private createErrorNotification(
    error: ProcessingError,
    strategy: ErrorRecoveryStrategy,
    stage?: ProcessingStage
  ): UserNotification {
    const actions: NotificationAction[] = [];

    switch (strategy.type) {
      case 'retry':
        actions.push({ label: 'Retry Now', action: 'retry' });
        actions.push({ label: 'Skip File', action: 'skip' });
        break;
      case 'fallback':
        actions.push({ label: 'Try Alternative', action: 'fallback', data: strategy.fallbackProcessor });
        actions.push({ label: 'Skip File', action: 'skip' });
        break;
      case 'skip':
        actions.push({ label: 'Skip File', action: 'skip' });
        actions.push({ label: 'Try Again', action: 'retry' });
        break;
      case 'manual':
        actions.push({ label: 'Try Again', action: 'retry' });
        actions.push({ label: 'Cancel', action: 'cancel' });
        break;
    }

    return {
      id: `error-${Date.now()}`,
      type: error.severity === 'high' ? 'error' : 'warning',
      title: this.getErrorTitle(error.code, stage),
      message: this.getUserFriendlyMessage(error, strategy),
      stage: stage || 'upload',
      timestamp: new Date(),
      actions,
      dismissible: strategy.type !== 'manual',
      autoHide: strategy.automated && strategy.type === 'retry'
    };
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(errorCode: string, stage?: ProcessingStage): string {
    const stageContext = stage ? ` during ${stage.replace('-', ' ')}` : '';
    
    const titles: Record<string, string> = {
      'NETWORK_ERROR': `Network Error${stageContext}`,
      'MEMORY_ERROR': `Memory Limit Exceeded${stageContext}`,
      'OCR_ERROR': `Text Recognition Failed${stageContext}`,
      'PARSE_ERROR': `File Format Error${stageContext}`,
      'AI_SERVICE_ERROR': `AI Service Unavailable${stageContext}`,
      'VALIDATION_ERROR': `File Validation Failed${stageContext}`,
      'TIMEOUT_ERROR': `Processing Timeout${stageContext}`,
      'PERMISSION_DENIED': `Access Denied${stageContext}`,
      'FILE_NOT_FOUND': `File Not Found${stageContext}`
    };

    return titles[errorCode] || `Processing Error${stageContext}`;
  }

  /**
   * Get user-friendly error message with recovery information
   */
  private getUserFriendlyMessage(error: ProcessingError, strategy: ErrorRecoveryStrategy): string {
    const baseMessages: Record<string, string> = {
      'NETWORK_ERROR': 'A network connection issue occurred while processing your file.',
      'MEMORY_ERROR': 'The file is too large to process with current memory settings.',
      'OCR_ERROR': 'Unable to extract text from images in this file.',
      'PARSE_ERROR': 'The file format appears to be corrupted or unsupported.',
      'AI_SERVICE_ERROR': 'The AI processing service is temporarily unavailable.',
      'VALIDATION_ERROR': 'The file does not meet the processing requirements.',
      'TIMEOUT_ERROR': 'Processing took longer than expected and timed out.',
      'PERMISSION_DENIED': 'Unable to access the file due to permission restrictions.',
      'FILE_NOT_FOUND': 'The file could not be found or accessed.'
    };

    const baseMessage = baseMessages[error.code] || error.message;
    
    let recoveryMessage = '';
    if (strategy.automated) {
      recoveryMessage = ` ${strategy.description}`;
    } else if (strategy.userAction) {
      recoveryMessage = ` ${strategy.userAction}`;
    }

    return baseMessage + recoveryMessage;
  }

  /**
   * Add notification to session
   */
  addNotification(sessionId: string, notification: UserNotification): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.notifications.push(notification);
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    // Notify subscribers
    this.notificationCallbacks.forEach(callback => callback(notification));
  }

  /**
   * Execute recovery action
   */
  async executeRecovery(
    sessionId: string,
    notificationId: string,
    action: NotificationAction
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Remove the notification
    session.notifications = session.notifications.filter(n => n.id !== notificationId);
    
    switch (action.action) {
      case 'retry':
        // Increment retry count for relevant file
        const file = session.files.find(f => f.status === 'failed');
        if (file) {
          file.retryCount++;
          file.status = 'pending';
        }
        return true;

      case 'skip':
        // Mark file as skipped
        const skipFile = session.files.find(f => f.status === 'failed');
        if (skipFile) {
          skipFile.status = 'skipped';
        }
        return true;

      case 'fallback':
        // Use fallback processor
        const fallbackFile = session.files.find(f => f.status === 'failed');
        if (fallbackFile) {
          fallbackFile.status = 'pending';
          // Store fallback processor info
        }
        return true;

      case 'cancel':
        // Cancel entire session
        session.canRecover = false;
        return false;

      default:
        return false;
    }
  }

  /**
   * Recover interrupted session
   */
  recoverSession(sessionId: string): SessionState | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.canRecover) return null;

    // Check if session is recent enough to recover (within 1 hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (session.lastActivity < hourAgo) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Reset failed files to pending for retry
    session.files.forEach(file => {
      if (file.status === 'failed' && file.retryCount < 3) {
        file.status = 'pending';
      }
    });

    // Clear old notifications
    session.notifications = session.notifications.filter(n => 
      n.type === 'error' || !n.dismissible
    );

    this.addNotification(sessionId, {
      id: `recovery-${Date.now()}`,
      type: 'info',
      title: 'Session Recovered',
      message: 'Your previous session has been restored. Processing will continue from where it left off.',
      stage: session.currentStage,
      timestamp: new Date(),
      dismissible: true,
      autoHide: true,
      duration: 5000
    });

    return session;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEstimatedTime(session: SessionState, currentProgress: number): number {
    const totalStages = 9; // Total processing stages
    const completedStages = session.completedStages.length;
    const overallProgress = (completedStages + currentProgress / 100) / totalStages;
    
    if (overallProgress <= 0) return 0;
    
    const elapsedTime = Date.now() - session.lastActivity.getTime();
    const estimatedTotal = elapsedTime / overallProgress;
    const remaining = estimatedTotal - elapsedTime;
    
    return Math.max(0, Math.round(remaining / 1000)); // Return seconds
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: UserNotification) => void): () => void {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (update: ProgressUpdate) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Notify progress subscribers
   */
  private notifyProgress(update: ProgressUpdate): void {
    this.progressCallbacks.forEach(callback => callback(update));
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Clean up old sessions
   */
  cleanup(): void {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < dayAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalSessions: number;
    activeSessions: number;
    errorsByType: Record<string, number>;
    recoverySuccessRate: number;
  } {
    const totalSessions = this.sessions.size;
    const activeSessions = Array.from(this.sessions.values()).filter(
      s => s.lastActivity > new Date(Date.now() - 60 * 60 * 1000)
    ).length;

    const errorsByType: Record<string, number> = {};
    let totalErrors = 0;
    let recoveredErrors = 0;

    for (const session of this.sessions.values()) {
      for (const file of session.files) {
        for (const error of file.errors) {
          errorsByType[error.code] = (errorsByType[error.code] || 0) + 1;
          totalErrors++;
          if (file.status === 'completed') {
            recoveredErrors++;
          }
        }
      }
    }

    const recoverySuccessRate = totalErrors > 0 ? recoveredErrors / totalErrors : 1;

    return {
      totalSessions,
      activeSessions,
      errorsByType,
      recoverySuccessRate
    };
  }
}

// Export singleton instance
export const errorService = ErrorHandlingService.getInstance();