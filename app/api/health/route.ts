/**
 * Health check API endpoint
 * Provides application health status and service availability
 */

import { NextResponse } from 'next/server';
import { env, isDevelopment } from '../../../backend/lib/config/environment';

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    ai: ServiceHealth;
    fileProcessing: ServiceHealth;
    monitoring: ServiceHealth;
  };
}

async function checkAIService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Simple check - just verify OpenAI key is configured
    if (!env.OPENAI_API_KEY) {
      return {
        status: 'unhealthy',
        message: 'OpenAI API key not configured',
      };
    }

    // Check for placeholder key
    if (env.OPENAI_API_KEY === 'sk-test-key-for-build') {
      return {
        status: 'unhealthy',
        message: 'OpenAI API key is set to placeholder value - please configure a real API key',
        responseTime: Date.now() - startTime,
      };
    }

    // In production, you might want to make a simple API call to verify connectivity
    // For now, just check if the key exists and has reasonable format
    if (env.OPENAI_API_KEY.startsWith('sk-') && env.OPENAI_API_KEY.length > 20) {
      return {
        status: 'healthy',
        message: 'AI service configured',
        responseTime: Date.now() - startTime,
      };
    }

    return {
      status: 'degraded',
      message: 'AI service configuration may be invalid',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `AI service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkFileProcessingService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Check if we can access the file system and required modules
    const fs = await import('fs');
    const path = await import('path');
    
    // Simple check - verify we can access the public directory
    const publicDir = path.join(process.cwd(), 'public');
    await fs.promises.access(publicDir);
    
    return {
      status: 'healthy',
      message: 'File processing service operational',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `File processing service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkMonitoringService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Check if monitoring is configured
    const hasSentry = !!env.SENTRY_DSN;
    const hasPosthog = !!env.NEXT_PUBLIC_POSTHOG_KEY;
    
    if (hasSentry || hasPosthog || isDevelopment()) {
      return {
        status: 'healthy',
        message: 'Monitoring service operational',
        responseTime: Date.now() - startTime,
      };
    }
    
    return {
      status: 'degraded',
      message: 'Monitoring service partially configured',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Monitoring service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
    };
  }
}

export async function GET() {
  try {
    // Check all services in parallel
    const [aiHealth, fileHealth, monitoringHealth] = await Promise.all([
      checkAIService(),
      checkFileProcessingService(),
      checkMonitoringService(),
    ]);

    const services = {
      ai: aiHealth,
      fileProcessing: fileHealth,
      monitoring: monitoringHealth,
    };

    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (serviceStatuses.every(s => s === 'healthy')) {
      overallStatus = 'healthy';
    } else if (serviceStatuses.some(s => s === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: env.NODE_ENV,
      services,
    };

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        ai: { status: 'unhealthy', message: 'Health check failed' },
        fileProcessing: { status: 'unhealthy', message: 'Health check failed' },
        monitoring: { status: 'unhealthy', message: 'Health check failed' },
      },
    }, { status: 503 });
  }
}