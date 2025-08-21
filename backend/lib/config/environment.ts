/**
 * Environment configuration and validation
 * Centralizes all environment variable access with type safety
 */

import { z } from 'zod';

// Environment schema for validation
const envSchema = z.object({
  // AI Service Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(4000),
  
  // Optional Image Generation
  DALLE_API_KEY: z.string().optional(),
  STABILITY_AI_API_KEY: z.string().optional(),
  
  // Error Tracking
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  
  // Analytics
  ANALYTICS_API_KEY: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),
  
  // Performance Monitoring
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  
  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  
  // File Upload Configuration
  MAX_FILE_SIZE: z.coerce.number().default(50000000), // 50MB
  MAX_FILES_PER_REQUEST: z.coerce.number().default(10),
  UPLOAD_TIMEOUT: z.coerce.number().default(300000), // 5 minutes
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().default(60),
  RATE_LIMIT_REQUESTS_PER_HOUR: z.coerce.number().default(1000),
  
  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(5000),
});

// Validate and parse environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Environment validation failed');
  }
}

// Export validated environment configuration
export const env = validateEnv();

// Type-safe environment access
export type Environment = z.infer<typeof envSchema>;

// Helper functions for environment checks
export const isProduction = () => env.NODE_ENV === 'production';
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isTest = () => env.NODE_ENV === 'test';

// Service availability checks
export const hasErrorTracking = () => Boolean(env.SENTRY_DSN);
export const hasAnalytics = () => Boolean(env.ANALYTICS_API_KEY || env.POSTHOG_KEY);
export const hasPerformanceMonitoring = () => Boolean(env.NEW_RELIC_LICENSE_KEY || env.DATADOG_API_KEY);
export const hasImageGeneration = () => Boolean(env.DALLE_API_KEY || env.STABILITY_AI_API_KEY);

// Configuration objects for services
export const aiConfig = {
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_MODEL,
  maxTokens: env.OPENAI_MAX_TOKENS,
  imageGeneration: {
    dalle: env.DALLE_API_KEY,
    stability: env.STABILITY_AI_API_KEY,
  },
};

export const monitoringConfig = {
  sentry: {
    dsn: env.SENTRY_DSN,
    org: env.SENTRY_ORG,
    project: env.SENTRY_PROJECT,
  },
  analytics: {
    apiKey: env.ANALYTICS_API_KEY,
    posthog: {
      key: env.POSTHOG_KEY,
      host: env.POSTHOG_HOST,
    },
  },
  performance: {
    newRelic: env.NEW_RELIC_LICENSE_KEY,
    datadog: env.DATADOG_API_KEY,
  },
};

export const appConfig = {
  url: env.NEXT_PUBLIC_APP_URL,
  apiUrl: env.NEXT_PUBLIC_API_URL,
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    maxFiles: env.MAX_FILES_PER_REQUEST,
    timeout: env.UPLOAD_TIMEOUT,
  },
  rateLimit: {
    perMinute: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
    perHour: env.RATE_LIMIT_REQUESTS_PER_HOUR,
  },
  healthCheck: {
    interval: env.HEALTH_CHECK_INTERVAL,
    timeout: env.HEALTH_CHECK_TIMEOUT,
  },
};