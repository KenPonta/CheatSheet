/**
 * Health check endpoint for monitoring service status
 * Provides comprehensive system health information
 */

import { NextRequest, NextResponse } from 'next/server';
import { env, hasErrorTracking, hasAnalytics, hasPerformanceMonitoring } from '../../../lib/config/environment';
import { getAIUsageStats } from '../../../lib/monitoring/ai-usage-tracker';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    ai: ServiceStatus;
    fileProcessing: ServiceStatus;
    monitoring: ServiceStatus;
  };
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    ai: {
      requestsToday: number;
      successRate: number;
      avgResponseTime: number;
    };
  };
  dependencies: DependencyStatus[];
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  lastChecked: string;
}

interface DependencyStatus {
  name: string;
  status: 'available' | 'unavailable' | 'unknown';
  version?: string;
  message?: string;
}

// Cache health check results to avoid excessive checks
let lastHealthCheck: HealthCheckResult | null = null;
let lastCheckTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Return cached result if recent
    if (lastHealthCheck && (now - lastCheckTime) < CACHE_DURATION) {
      return NextResponse.json(lastHealthCheck, { status: 200 });
    }

    const healthResult = await performHealthCheck();
    
    // Cache the result
    lastHealthCheck = healthResult;
    lastCheckTime = now;

    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthResult, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      environment: env.NODE_ENV,
      services: {
        database: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
        ai: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
        fileProcessing: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
        monitoring: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
      },
      metrics: {
        uptime: process.uptime(),
        memory: { used: 0, total: 0, percentage: 0 },
        ai: { requestsToday: 0, successRate: 0, avgResponseTime: 0 },
      },
      dependencies: [],
    };

    return NextResponse.json(errorResult, { status: 503 });
  }
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  // Check AI service
  const aiStatus = await checkAIService();
  
  // Check file processing capabilities
  const fileProcessingStatus = await checkFileProcessing();
  
  // Check monitoring services
  const monitoringStatus = checkMonitoringServices();
  
  // Check dependencies
  const dependencies = await checkDependencies();
  
  // Get system metrics
  const metrics = await getSystemMetrics();
  
  // Determine overall status
  const services = {
    database: { status: 'healthy' as const, message: 'No database required', lastChecked: new Date().toISOString() },
    ai: aiStatus,
    fileProcessing: fileProcessingStatus,
    monitoring: monitoringStatus,
  };
  
  const overallStatus = determineOverallStatus(services);
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    environment: env.NODE_ENV,
    services,
    metrics,
    dependencies,
  };
}

async function checkAIService(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Simple test to verify OpenAI API key is configured
    if (!env.OPENAI_API_KEY) {
      return {
        status: 'unhealthy',
        message: 'OpenAI API key not configured',
        lastChecked: new Date().toISOString(),
      };
    }

    // Test API connectivity with a minimal request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'AI service operational',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        status: 'degraded',
        message: `AI service responded with status ${response.status}`,
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      message: `AI service unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkFileProcessing(): Promise<ServiceStatus> {
  try {
    // Check if required file processing libraries are available
    const requiredModules = ['pdf-parse', 'mammoth', 'xlsx', 'sharp', 'tesseract.js'];
    const missingModules: string[] = [];
    
    for (const module of requiredModules) {
      try {
        require.resolve(module);
      } catch {
        missingModules.push(module);
      }
    }
    
    if (missingModules.length > 0) {
      return {
        status: 'degraded',
        message: `Missing file processing modules: ${missingModules.join(', ')}`,
        lastChecked: new Date().toISOString(),
      };
    }
    
    return {
      status: 'healthy',
      message: 'File processing capabilities available',
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `File processing check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

function checkMonitoringServices(): ServiceStatus {
  const availableServices: string[] = [];
  
  if (hasErrorTracking()) {
    availableServices.push('Sentry');
  }
  
  if (hasAnalytics()) {
    availableServices.push('Analytics');
  }
  
  if (hasPerformanceMonitoring()) {
    availableServices.push('Performance Monitoring');
  }
  
  if (availableServices.length === 0) {
    return {
      status: 'degraded',
      message: 'No monitoring services configured',
      lastChecked: new Date().toISOString(),
    };
  }
  
  return {
    status: 'healthy',
    message: `Monitoring active: ${availableServices.join(', ')}`,
    lastChecked: new Date().toISOString(),
  };
}

async function checkDependencies(): Promise<DependencyStatus[]> {
  const dependencies: DependencyStatus[] = [];
  
  // Check Node.js version
  dependencies.push({
    name: 'Node.js',
    status: 'available',
    version: process.version,
    message: 'Runtime environment',
  });
  
  // Check Next.js
  try {
    const nextPackage = require('next/package.json');
    dependencies.push({
      name: 'Next.js',
      status: 'available',
      version: nextPackage.version,
      message: 'Web framework',
    });
  } catch {
    dependencies.push({
      name: 'Next.js',
      status: 'unknown',
      message: 'Version information unavailable',
    });
  }
  
  // Check OpenAI SDK
  try {
    const openaiPackage = require('openai/package.json');
    dependencies.push({
      name: 'OpenAI SDK',
      status: 'available',
      version: openaiPackage.version,
      message: 'AI service client',
    });
  } catch {
    dependencies.push({
      name: 'OpenAI SDK',
      status: 'unavailable',
      message: 'Package not found',
    });
  }
  
  return dependencies;
}

async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  
  // Get AI usage statistics
  let aiStats;
  try {
    aiStats = getAIUsageStats('day');
  } catch {
    aiStats = { totalRequests: 0, successRate: 0, avgResponseTime: 0 };
  }
  
  return {
    uptime: process.uptime(),
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    ai: {
      requestsToday: aiStats.totalRequests,
      successRate: aiStats.successRate,
      avgResponseTime: aiStats.avgResponseTime,
    },
  };
}

function determineOverallStatus(services: HealthCheckResult['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}