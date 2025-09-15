/**
 * Analytics and usage tracking
 * Tracks user interactions and AI service usage for optimization
 */

import { PostHog } from 'posthog-js';
import { env, hasAnalytics, isProduction } from '../config/environment';

let posthog: PostHog | null = null;

// Initialize analytics
export function initAnalytics() {
  if (!hasAnalytics() || typeof window === 'undefined') {
    console.warn('⚠️ Analytics not configured or running on server');
    return;
  }

  if (env.POSTHOG_KEY) {
    const { PostHog } = require('posthog-js');
    
    posthog = new PostHog(env.POSTHOG_KEY, {
      api_host: env.POSTHOG_HOST,
      loaded: (posthog) => {
        if (!isProduction()) {
          posthog.debug();
        }
      },
      capture_pageview: true,
      capture_pageleave: true,
    });

    console.log('✅ PostHog analytics initialized');
  }
}

// Event tracking functions
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!posthog) {
    console.log(`Analytics event (not configured): ${eventName}`, properties);
    return;
  }

  posthog.capture(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

// File processing events
export function trackFileUpload(fileType: string, fileSize: number, processingTime?: number) {
  trackEvent('file_uploaded', {
    file_type: fileType,
    file_size: fileSize,
    processing_time: processingTime,
  });
}

export function trackFileProcessingError(fileType: string, error: string) {
  trackEvent('file_processing_error', {
    file_type: fileType,
    error_type: error,
  });
}

// AI service usage tracking
export function trackAIRequest(service: 'topic_extraction' | 'content_organization' | 'image_generation', tokensUsed?: number) {
  trackEvent('ai_request', {
    service,
    tokens_used: tokensUsed,
  });
}

export function trackAIError(service: string, error: string, retryCount?: number) {
  trackEvent('ai_error', {
    service,
    error_type: error,
    retry_count: retryCount,
  });
}

// User workflow tracking
export function trackWorkflowStep(step: 'upload' | 'processing' | 'topic_selection' | 'customization' | 'generation') {
  trackEvent('workflow_step', {
    step,
  });
}

export function trackWorkflowCompletion(totalTime: number, pageCount: number, topicCount: number) {
  trackEvent('workflow_completed', {
    total_time: totalTime,
    page_count: pageCount,
    topic_count: topicCount,
  });
}

export function trackWorkflowAbandonment(lastStep: string, timeSpent: number) {
  trackEvent('workflow_abandoned', {
    last_step: lastStep,
    time_spent: timeSpent,
  });
}

// Performance tracking
export function trackPerformanceMetric(metric: string, value: number, context?: Record<string, any>) {
  trackEvent('performance_metric', {
    metric,
    value,
    ...context,
  });
}

// Error tracking (complementary to Sentry)
export function trackUserError(errorType: string, context?: Record<string, any>) {
  trackEvent('user_error', {
    error_type: errorType,
    ...context,
  });
}

// Feature usage tracking
export function trackFeatureUsage(feature: string, context?: Record<string, any>) {
  trackEvent('feature_used', {
    feature,
    ...context,
  });
}

// User identification
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!posthog) return;
  
  posthog.identify(userId, properties);
}

// Custom properties
export function setUserProperties(properties: Record<string, any>) {
  if (!posthog) return;
  
  posthog.people.set(properties);
}

// Page view tracking (for SPA navigation)
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  if (!posthog) return;
  
  posthog.capture('$pageview', {
    $current_url: window.location.href,
    page_name: pageName,
    ...properties,
  });
}

// Cleanup
export function shutdownAnalytics() {
  if (posthog) {
    posthog.reset();
    posthog = null;
  }
}