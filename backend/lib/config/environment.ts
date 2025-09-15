/**
 * Environment configuration and validation
 * Centralizes all environment variable access with type safety
 */

import { z } from 'zod';

// Environment schema for validation
const envSchema = z.object({
  // AI Service Configuration
  OPENAI_API_KEY: z.string().optional().default('').refine(
    (key) => {
      // In development, allow empty or test keys
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      // In production, require a real key
      return key && key.length > 0 && key !== 'sk-test-key-for-build';
    }, 
    'OpenAI API key is required in production'
  ),
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

// Lazy validation to avoid issues during build time
let _env: z.infer<typeof envSchema> | null = null;

function validateEnv() {
  if (_env) return _env;
  
  try {
    _env = envSchema.parse(process.env);
    return _env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('⚠️ Environment validation issues:');
      error.errors.forEach(err => {
        console.warn(`  • ${err.path.join('.')}: ${err.message}`);
      });
      
      // In development, continue with defaults but warn
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n💡 Continuing in development mode with defaults...');
        console.log('  To fix: Set OPENAI_API_KEY in .env.local\n');
        
        // Return a default environment for development
        _env = {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
          OPENAI_MODEL: 'gpt-4o',
          OPENAI_MAX_TOKENS: 4000,
          NODE_ENV: (process.env.NODE_ENV as any) || 'development',
          MAX_FILE_SIZE: 50000000,
          MAX_FILES_PER_REQUEST: 10,
          UPLOAD_TIMEOUT: 300000,
          RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
          RATE_LIMIT_REQUESTS_PER_HOUR: 1000,
          HEALTH_CHECK_INTERVAL: 30000,
          HEALTH_CHECK_TIMEOUT: 5000,
          POSTHOG_HOST: 'https://app.posthog.com',
        } as any;
        return _env;
      }
    }
    throw new Error('Environment validation failed - check the logs above');
  }
}

// Export getter function for validated environment configuration
export const getEnv = () => validateEnv();

// For backward compatibility, create a proxy that validates on access
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(target, prop) {
    try {
      const validatedEnv = validateEnv();
      return validatedEnv[prop as keyof typeof validatedEnv];
    } catch (error) {
      // If validation fails, return the raw environment variable for development
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ Using raw env var for ${String(prop)} due to validation error`);
        return process.env[prop as string];
      }
      throw error;
    }
  }
});

// Type-safe environment access
export type Environment = z.infer<typeof envSchema>;

// Helper functions for environment checks
export const isProduction = () => getEnv().NODE_ENV === 'production';
export const isDevelopment = () => getEnv().NODE_ENV === 'development';
export const isTest = () => getEnv().NODE_ENV === 'test';

// Service availability checks
export const hasErrorTracking = () => Boolean(getEnv().SENTRY_DSN);
export const hasAnalytics = () => Boolean(getEnv().ANALYTICS_API_KEY || getEnv().POSTHOG_KEY);
export const hasPerformanceMonitoring = () => Boolean(getEnv().NEW_RELIC_LICENSE_KEY || getEnv().DATADOG_API_KEY);
export const hasImageGeneration = () => Boolean(getEnv().DALLE_API_KEY || getEnv().STABILITY_AI_API_KEY);

// Configuration objects for services (using getters for lazy evaluation)
export const getAiConfig = () => {
  const env = getEnv();
  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    maxTokens: env.OPENAI_MAX_TOKENS,
    imageGeneration: {
      dalle: env.DALLE_API_KEY,
      stability: env.STABILITY_AI_API_KEY,
    },
  };
};

export const getMonitoringConfig = () => {
  const env = getEnv();
  return {
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
};

export const getAppConfig = () => {
  const env = getEnv();
  return {
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
};