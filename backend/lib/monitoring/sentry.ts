/**
 * Sentry error tracking configuration
 * Handles error reporting and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';
import { env, isProduction, hasErrorTracking } from '../config/environment';

// Initialize Sentry if configured
export function initSentry() {
  if (!hasErrorTracking()) {
    console.warn('⚠️ Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: isProduction() ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: isProduction() ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors in production
      if (isProduction() && event.environment === 'development') {
        return null;
      }
      
      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Skip network errors that are user-related
        if (error.message.includes('NetworkError') || 
            error.message.includes('Failed to fetch')) {
          return null;
        }
        
        // Skip file upload size errors (user errors)
        if (error.message.includes('File too large') ||
            error.message.includes('Unsupported file type')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Additional context
    initialScope: {
      tags: {
        component: 'cheat-sheet-generator',
      },
    },
  });

  console.log('✅ Sentry error tracking initialized');
}

// Custom error reporting functions
export function reportError(error: Error, context?: Record<string, any>) {
  if (!hasErrorTracking()) {
    console.error('Error (Sentry not configured):', error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

export function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (!hasErrorTracking()) {
    console.log(`Message (Sentry not configured) [${level}]:`, message, context);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureMessage(message);
  });
}

// Performance monitoring
export function startTransaction(name: string, operation: string) {
  if (!hasErrorTracking()) {
    return null;
  }

  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

export function measurePerformance<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, operation);
  
  return fn()
    .then((result) => {
      transaction?.setStatus('ok');
      return result;
    })
    .catch((error) => {
      transaction?.setStatus('internal_error');
      reportError(error, { operation: name });
      throw error;
    })
    .finally(() => {
      transaction?.finish();
    });
}

// User context
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  if (!hasErrorTracking()) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

// Custom tags and context
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (!hasErrorTracking()) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
}