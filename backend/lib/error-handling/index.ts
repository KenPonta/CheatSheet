// Error handling and user feedback system exports

export {
  ErrorHandlingService,
  errorService,
  type UserNotification,
  type NotificationAction,
  type ProcessingStage,
  type SessionState,
  type SessionFile,
  type ErrorRecoveryStrategy,
  type ProgressUpdate
} from './error-service';

export {
  AIFallbackService,
  aiFallbackService,
  type AIFallbackResult,
  type BasicTopicExtractionOptions
} from './ai-fallback';

export {
  SessionRecoveryService,
  sessionRecovery,
  type RecoveryOptions,
  type RecoveryResult
} from './session-recovery';

export {
  NotificationSystem,
  NotificationToast
} from '../../components/error-handling/notification-system';

export {
  ProgressTracker,
  SimpleProgressBar
} from '../../components/error-handling/progress-tracker';