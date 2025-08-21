/**
 * Continuous health monitoring and alerting system
 * Monitors application health and sends alerts when issues are detected
 */

import { env, appConfig } from '../config/environment';
import { reportError, reportMessage } from './sentry';
import { trackEvent } from './analytics';

interface HealthMetrics {
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  services: Record<string, boolean>;
  errors: string[];
}

interface AlertRule {
  name: string;
  condition: (metrics: HealthMetrics[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // Minutes between alerts
}

class HealthMonitor {
  private metrics: HealthMetrics[] = [];
  private lastAlerts: Map<string, Date> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Alert rules configuration
  private alertRules: AlertRule[] = [
    {
      name: 'service_down',
      condition: (metrics) => {
        const recent = metrics.slice(-3); // Last 3 checks
        return recent.length >= 3 && recent.every(m => m.status === 'unhealthy');
      },
      severity: 'critical',
      message: 'Service is down - multiple consecutive health check failures',
      cooldown: 5,
    },
    {
      name: 'service_degraded',
      condition: (metrics) => {
        const recent = metrics.slice(-5); // Last 5 checks
        return recent.length >= 5 && recent.filter(m => m.status === 'degraded').length >= 3;
      },
      severity: 'high',
      message: 'Service is degraded - multiple degraded health checks',
      cooldown: 15,
    },
    {
      name: 'high_response_time',
      condition: (metrics) => {
        const recent = metrics.slice(-5);
        const avgResponseTime = recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
        return avgResponseTime > 10000; // 10 seconds
      },
      severity: 'medium',
      message: 'High response times detected',
      cooldown: 30,
    },
    {
      name: 'ai_service_errors',
      condition: (metrics) => {
        const recent = metrics.slice(-10);
        const aiErrors = recent.filter(m => 
          m.errors.some(error => error.toLowerCase().includes('ai') || error.toLowerCase().includes('openai'))
        );
        return aiErrors.length >= 3;
      },
      severity: 'high',
      message: 'Multiple AI service errors detected',
      cooldown: 20,
    },
  ];

  // Start continuous monitoring
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('Health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🏥 Starting health monitoring...');

    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, appConfig.healthCheck.interval);

    console.log(`✅ Health monitoring started (interval: ${appConfig.healthCheck.interval}ms)`);
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 Health monitoring stopped');
  }

  // Perform a single health check
  private async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(appConfig.healthCheck.timeout),
      });

      const responseTime = Date.now() - startTime;
      const healthData = await response.json();

      const metrics: HealthMetrics = {
        timestamp: new Date(),
        status: healthData.status,
        responseTime,
        services: {
          ai: healthData.services.ai.status === 'healthy',
          fileProcessing: healthData.services.fileProcessing.status === 'healthy',
          monitoring: healthData.services.monitoring.status === 'healthy',
        },
        errors: this.extractErrors(healthData),
      };

      this.recordMetrics(metrics);
      this.checkAlertRules();

      // Track health metrics in analytics
      trackEvent('health_check', {
        status: metrics.status,
        response_time: responseTime,
        services_healthy: Object.values(metrics.services).filter(Boolean).length,
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const metrics: HealthMetrics = {
        timestamp: new Date(),
        status: 'unhealthy',
        responseTime,
        services: {
          ai: false,
          fileProcessing: false,
          monitoring: false,
        },
        errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      this.recordMetrics(metrics);
      this.checkAlertRules();

      reportError(error as Error, {
        context: 'health_monitor',
        responseTime,
      });
    }
  }

  // Extract errors from health check response
  private extractErrors(healthData: any): string[] {
    const errors: string[] = [];
    
    if (healthData.services) {
      Object.entries(healthData.services).forEach(([service, data]: [string, any]) => {
        if (data.status !== 'healthy') {
          errors.push(`${service}: ${data.message}`);
        }
      });
    }
    
    return errors;
  }

  // Record metrics with history management
  private recordMetrics(metrics: HealthMetrics) {
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Check alert rules and send notifications
  private checkAlertRules() {
    for (const rule of this.alertRules) {
      if (this.shouldSkipAlert(rule)) {
        continue;
      }

      if (rule.condition(this.metrics)) {
        this.sendAlert(rule);
      }
    }
  }

  // Check if alert should be skipped due to cooldown
  private shouldSkipAlert(rule: AlertRule): boolean {
    const lastAlert = this.lastAlerts.get(rule.name);
    if (!lastAlert) {
      return false;
    }

    const cooldownMs = rule.cooldown * 60 * 1000;
    return Date.now() - lastAlert.getTime() < cooldownMs;
  }

  // Send alert notification
  private sendAlert(rule: AlertRule) {
    const now = new Date();
    this.lastAlerts.set(rule.name, now);

    const alertMessage = `🚨 Health Alert: ${rule.message}`;
    
    // Log alert
    console.error(alertMessage, {
      rule: rule.name,
      severity: rule.severity,
      timestamp: now.toISOString(),
    });

    // Send to monitoring services
    reportMessage(alertMessage, 'error', {
      alert_rule: rule.name,
      severity: rule.severity,
      recent_metrics: this.metrics.slice(-5),
    });

    // Track alert in analytics
    trackEvent('health_alert', {
      rule_name: rule.name,
      severity: rule.severity,
      message: rule.message,
    });

    // Send webhook notification if configured
    this.sendWebhookAlert(rule, alertMessage);
  }

  // Send webhook notification
  private async sendWebhookAlert(rule: AlertRule, message: string) {
    const webhookUrl = process.env.HEALTH_ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          severity: rule.severity,
          rule: rule.name,
          timestamp: new Date().toISOString(),
          metrics: this.metrics.slice(-3),
        }),
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  // Get current health status
  getCurrentStatus(): HealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get health history
  getHealthHistory(minutes: number = 60): HealthMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  // Get health statistics
  getHealthStats(minutes: number = 60) {
    const history = this.getHealthHistory(minutes);
    
    if (history.length === 0) {
      return null;
    }

    const totalChecks = history.length;
    const healthyChecks = history.filter(m => m.status === 'healthy').length;
    const degradedChecks = history.filter(m => m.status === 'degraded').length;
    const unhealthyChecks = history.filter(m => m.status === 'unhealthy').length;
    
    const avgResponseTime = history.reduce((sum, m) => sum + m.responseTime, 0) / totalChecks;
    const maxResponseTime = Math.max(...history.map(m => m.responseTime));
    const minResponseTime = Math.min(...history.map(m => m.responseTime));

    return {
      period: `${minutes} minutes`,
      totalChecks,
      healthyChecks,
      degradedChecks,
      unhealthyChecks,
      healthyPercentage: (healthyChecks / totalChecks) * 100,
      avgResponseTime,
      maxResponseTime,
      minResponseTime,
    };
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

// Auto-start monitoring in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Start monitoring after a short delay to allow app initialization
  setTimeout(() => {
    healthMonitor.startMonitoring();
  }, 10000); // 10 seconds
}