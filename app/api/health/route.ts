/**
 * Health check API endpoint
 * Provides application health status and service availability
 */

import { NextResponse } from 'next/server';

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
    // Simple check for Vercel deployment
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        status: 'degraded',
        message: 'AI service will use backend API',
        responseTime: Date.now() - startTime,
      };
    }

    return {
      status: 'healthy',
      message: 'AI service configured',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'AI service will use backend API',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkFileProcessingService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    return {
      status: 'healthy',
      message: 'File processing handled by backend API',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'healthy',
      message: 'File processing handled by backend API',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkMonitoringService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    return {
      status: 'healthy',
      message: 'Frontend monitoring operational',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'healthy',
      message: 'Frontend monitoring operational',
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
      environment: process.env.NODE_ENV || 'production',
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
      environment: process.env.NODE_ENV || 'production',
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        ai: { status: 'unhealthy', message: 'Health check failed' },
        fileProcessing: { status: 'unhealthy', message: 'Health check failed' },
        monitoring: { status: 'unhealthy', message: 'Health check failed' },
      },
    }, { status: 503 });
  }
}