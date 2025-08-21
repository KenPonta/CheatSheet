/**
 * Monitoring statistics API endpoint
 * Provides monitoring data for dashboards and debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '../../../../lib/monitoring/health-monitor';
import { getAIUsageStats, getAIOptimizationSuggestions } from '../../../../lib/monitoring/ai-usage-tracker';
import { isDevelopment } from '../../../../lib/config/environment';

export async function GET(request: NextRequest) {
  // Only allow access in development or with proper authentication
  if (!isDevelopment()) {
    // In production, you might want to add authentication here
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '60'; // minutes
    const minutes = parseInt(timeframe, 10);

    // Get health statistics
    const healthStats = healthMonitor.getHealthStats(minutes);
    const currentHealth = healthMonitor.getCurrentStatus();
    const healthHistory = healthMonitor.getHealthHistory(minutes);

    // Get AI usage statistics
    const aiStats = getAIUsageStats('day');
    const aiOptimizations = getAIOptimizationSuggestions();

    // System metrics
    const memoryUsage = process.memoryUsage();
    const systemStats = {
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        rss: memoryUsage.rss,
        external: memoryUsage.external,
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    const response = {
      timestamp: new Date().toISOString(),
      timeframe: `${minutes} minutes`,
      health: {
        current: currentHealth,
        stats: healthStats,
        history: healthHistory,
      },
      ai: {
        usage: aiStats,
        optimizations: aiOptimizations,
      },
      system: systemStats,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Failed to get monitoring stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve monitoring statistics' },
      { status: 500 }
    );
  }
}

// POST endpoint for manual health check trigger
export async function POST(request: NextRequest) {
  if (!isDevelopment()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Trigger a manual health check
    const healthResponse = await fetch(`${request.nextUrl.origin}/api/health`);
    const healthData = await healthResponse.json();

    return NextResponse.json({
      message: 'Manual health check triggered',
      result: healthData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Manual health check failed:', error);
    return NextResponse.json(
      { error: 'Manual health check failed' },
      { status: 500 }
    );
  }
}