/**
 * Monitoring system initialization
 * Centralizes all monitoring service setup
 */

import { initSentry } from './sentry';
import { initAnalytics } from './analytics';
import { healthMonitor } from './health-monitor';
import { isProduction, isDevelopment } from '../config/environment';

// Initialize all monitoring services
export function initMonitoring() {
  console.log('🔧 Initializing monitoring services...');

  // Initialize error tracking
  try {
    initSentry();
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }

  // Initialize analytics (client-side only)
  if (typeof window !== 'undefined') {
    try {
      initAnalytics();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // Start health monitoring in production
  if (isProduction() && typeof window === 'undefined') {
    try {
      // Delay health monitoring start to allow app initialization
      setTimeout(() => {
        healthMonitor.startMonitoring();
      }, 15000); // 15 seconds
    } catch (error) {
      console.error('Failed to start health monitoring:', error);
    }
  }

  console.log('✅ Monitoring services initialized');
}

// Graceful shutdown of monitoring services
export function shutdownMonitoring() {
  console.log('🛑 Shutting down monitoring services...');
  
  try {
    healthMonitor.stopMonitoring();
  } catch (error) {
    console.error('Error stopping health monitor:', error);
  }

  console.log('✅ Monitoring services shut down');
}

// Export monitoring components
export * from './sentry';
export * from './analytics';
export * from './ai-usage-tracker';
export * from './health-monitor';

// Development helpers
if (isDevelopment()) {
  // Add global helpers for debugging
  if (typeof window !== 'undefined') {
    (window as any).__monitoring = {
      healthMonitor,
      getHealthStats: () => healthMonitor.getHealthStats(),
      getCurrentStatus: () => healthMonitor.getCurrentStatus(),
    };
  }
}