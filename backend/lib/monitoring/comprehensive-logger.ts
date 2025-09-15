/**
 * Comprehensive logging and monitoring system for debugging purposes
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  metadata?: any;
  sessionId?: string;
  userId?: string;
  correlationId?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogCategory = 
  | 'image-generation'
  | 'content-modification'
  | 'editor-operations'
  | 'validation'
  | 'storage'
  | 'api'
  | 'performance'
  | 'security'
  | 'user-interaction'
  | 'system';

export interface LogContext {
  component: string;
  operation: string;
  stage?: string;
  duration?: number;
  success?: boolean;
  errorCode?: string;
  retryCount?: number;
}

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  success: boolean;
  errorCount: number;
  metadata?: any;
}

export interface ErrorMetrics {
  errorCode: string;
  category: LogCategory;
  count: number;
  lastOccurrence: Date;
  severity: 'low' | 'medium' | 'high';
  recoveryRate: number;
  averageResolutionTime: number;
}

export interface UserInteractionLog {
  userId?: string;
  sessionId: string;
  action: string;
  component: string;
  timestamp: Date;
  success: boolean;
  duration?: number;
  errorMessage?: string;
  metadata?: any;
}

export class ComprehensiveLogger {
  private static instance: ComprehensiveLogger;
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private errorMetrics = new Map<string, ErrorMetrics>();
  private userInteractions: UserInteractionLog[] = [];
  private maxLogEntries = 10000;
  private maxPerformanceEntries = 1000;
  private maxUserInteractions = 5000;
  private logLevel: LogLevel = 'info';
  private enabledCategories = new Set<LogCategory>();

  static getInstance(): ComprehensiveLogger {
    if (!ComprehensiveLogger.instance) {
      ComprehensiveLogger.instance = new ComprehensiveLogger();
      ComprehensiveLogger.instance.initializeLogger();
    }
    return ComprehensiveLogger.instance;
  }

  /**
   * Initialize logger with default settings
   */
  private initializeLogger(): void {
    // Enable all categories by default
    this.enabledCategories = new Set([
      'image-generation',
      'content-modification',
      'editor-operations',
      'validation',
      'storage',
      'api',
      'performance',
      'security',
      'user-interaction',
      'system'
    ]);

    // Set log level from environment
    const envLogLevel = process.env.LOG_LEVEL as LogLevel;
    if (envLogLevel && ['debug', 'info', 'warn', 'error', 'fatal'].includes(envLogLevel)) {
      this.logLevel = envLogLevel;
    }

    // Start periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Log a message with specified level and category
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context: LogContext,
    metadata?: any,
    sessionId?: string,
    userId?: string,
    correlationId?: string
  ): void {
    if (!this.shouldLog(level, category)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      context,
      metadata,
      sessionId,
      userId,
      correlationId
    };

    this.logs.push(logEntry);
    this.enforceLogLimit();

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(logEntry);
    }

    // Update error metrics if this is an error
    if (level === 'error' || level === 'fatal') {
      this.updateErrorMetrics(logEntry);
    }
  }

  /**
   * Log debug message
   */
  debug(category: LogCategory, message: string, context: LogContext, metadata?: any, sessionId?: string): void {
    this.log('debug', category, message, context, metadata, sessionId);
  }

  /**
   * Log info message
   */
  info(category: LogCategory, message: string, context: LogContext, metadata?: any, sessionId?: string): void {
    this.log('info', category, message, context, metadata, sessionId);
  }

  /**
   * Log warning message
   */
  warn(category: LogCategory, message: string, context: LogContext, metadata?: any, sessionId?: string): void {
    this.log('warn', category, message, context, metadata, sessionId);
  }

  /**
   * Log error message
   */
  error(category: LogCategory, message: string, context: LogContext, metadata?: any, sessionId?: string): void {
    this.log('error', category, message, context, metadata, sessionId);
  }

  /**
   * Log fatal error message
   */
  fatal(category: LogCategory, message: string, context: LogContext, metadata?: any, sessionId?: string): void {
    this.log('fatal', category, message, context, metadata, sessionId);
  }

  /**
   * Log image generation events
   */
  logImageGeneration(
    level: LogLevel,
    message: string,
    operation: string,
    success: boolean,
    duration?: number,
    errorCode?: string,
    metadata?: any,
    sessionId?: string
  ): void {
    this.log(level, 'image-generation', message, {
      component: 'SimpleImageGenerator',
      operation,
      success,
      duration,
      errorCode
    }, metadata, sessionId);
  }

  /**
   * Log content modification events
   */
  logContentModification(
    level: LogLevel,
    message: string,
    operation: string,
    materialId: string,
    success: boolean,
    duration?: number,
    errorCode?: string,
    metadata?: any,
    sessionId?: string,
    userId?: string
  ): void {
    this.log(level, 'content-modification', message, {
      component: 'ContentModificationService',
      operation,
      success,
      duration,
      errorCode
    }, { materialId, ...metadata }, sessionId, userId);
  }

  /**
   * Log editor operations
   */
  logEditorOperation(
    level: LogLevel,
    message: string,
    operation: string,
    success: boolean,
    duration?: number,
    errorCode?: string,
    metadata?: any,
    sessionId?: string,
    userId?: string
  ): void {
    this.log(level, 'editor-operations', message, {
      component: 'EditorErrorHandler',
      operation,
      success,
      duration,
      errorCode
    }, metadata, sessionId, userId);
  }

  /**
   * Log validation events
   */
  logValidation(
    level: LogLevel,
    message: string,
    validationType: string,
    success: boolean,
    errorCount?: number,
    warningCount?: number,
    metadata?: any,
    sessionId?: string
  ): void {
    this.log(level, 'validation', message, {
      component: 'ValidationService',
      operation: validationType,
      success
    }, { errorCount, warningCount, ...metadata }, sessionId);
  }

  /**
   * Start performance tracking for an operation
   */
  startPerformanceTracking(
    operationName: string,
    metadata?: any
  ): string {
    const trackingId = this.generateId();
    const startTime = Date.now();
    
    const metrics: PerformanceMetrics = {
      operationName,
      startTime,
      success: false,
      errorCount: 0,
      metadata: { trackingId, ...metadata }
    };

    this.performanceMetrics.push(metrics);
    this.enforcePerformanceLimit();

    this.debug('performance', `Started tracking: ${operationName}`, {
      component: 'PerformanceTracker',
      operation: 'start',
      success: true
    }, { trackingId, operationName });

    return trackingId;
  }

  /**
   * End performance tracking for an operation
   */
  endPerformanceTracking(
    trackingId: string,
    success: boolean = true,
    errorCount: number = 0,
    metadata?: any
  ): PerformanceMetrics | null {
    const metrics = this.performanceMetrics.find(m => 
      m.metadata?.trackingId === trackingId
    );

    if (!metrics) {
      this.warn('performance', `Performance tracking not found: ${trackingId}`, {
        component: 'PerformanceTracker',
        operation: 'end',
        success: false
      });
      return null;
    }

    const endTime = Date.now();
    metrics.endTime = endTime;
    metrics.duration = endTime - metrics.startTime;
    metrics.success = success;
    metrics.errorCount = errorCount;
    metrics.memoryUsage = process.memoryUsage();
    metrics.cpuUsage = process.cpuUsage();
    
    if (metadata) {
      metrics.metadata = { ...metrics.metadata, ...metadata };
    }

    this.info('performance', `Completed tracking: ${metrics.operationName}`, {
      component: 'PerformanceTracker',
      operation: 'end',
      success: true,
      duration: metrics.duration
    }, {
      trackingId,
      operationName: metrics.operationName,
      duration: metrics.duration,
      success,
      errorCount
    });

    return metrics;
  }

  /**
   * Log user interaction
   */
  logUserInteraction(
    userId: string | undefined,
    sessionId: string,
    action: string,
    component: string,
    success: boolean,
    duration?: number,
    errorMessage?: string,
    metadata?: any
  ): void {
    const interaction: UserInteractionLog = {
      userId,
      sessionId,
      action,
      component,
      timestamp: new Date(),
      success,
      duration,
      errorMessage,
      metadata
    };

    this.userInteractions.push(interaction);
    this.enforceUserInteractionLimit();

    this.info('user-interaction', `User action: ${action}`, {
      component,
      operation: action,
      success,
      duration
    }, metadata, sessionId, userId);
  }

  /**
   * Get logs by criteria
   */
  getLogs(criteria: {
    level?: LogLevel;
    category?: LogCategory;
    sessionId?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (criteria.level) {
      const levelPriority = this.getLevelPriority(criteria.level);
      filteredLogs = filteredLogs.filter(log => 
        this.getLevelPriority(log.level) >= levelPriority
      );
    }

    if (criteria.category) {
      filteredLogs = filteredLogs.filter(log => log.category === criteria.category);
    }

    if (criteria.sessionId) {
      filteredLogs = filteredLogs.filter(log => log.sessionId === criteria.sessionId);
    }

    if (criteria.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === criteria.userId);
    }

    if (criteria.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= criteria.startTime!);
    }

    if (criteria.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= criteria.endTime!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (criteria.limit) {
      filteredLogs = filteredLogs.slice(0, criteria.limit);
    }

    return filteredLogs;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(operationName?: string): PerformanceMetrics[] {
    let metrics = [...this.performanceMetrics];
    
    if (operationName) {
      metrics = metrics.filter(m => m.operationName === operationName);
    }

    return metrics.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<LogCategory, number>;
    errorsByCode: Record<string, ErrorMetrics>;
    recentErrors: LogEntry[];
    errorTrends: { date: string; count: number }[];
  } {
    const errorLogs = this.logs.filter(log => log.level === 'error' || log.level === 'fatal');
    
    const errorsByCategory: Record<LogCategory, number> = {} as Record<LogCategory, number>;
    errorLogs.forEach(log => {
      errorsByCategory[log.category] = (errorsByCategory[log.category] || 0) + 1;
    });

    const errorsByCode: Record<string, ErrorMetrics> = {};
    this.errorMetrics.forEach((metrics, code) => {
      errorsByCode[code] = metrics;
    });

    const recentErrors = errorLogs.slice(0, 50);

    // Calculate error trends for the last 7 days
    const errorTrends: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayErrors = errorLogs.filter(log => 
        log.timestamp.toISOString().split('T')[0] === dateStr
      );
      
      errorTrends.push({ date: dateStr, count: dayErrors.length });
    }

    return {
      totalErrors: errorLogs.length,
      errorsByCategory,
      errorsByCode,
      recentErrors,
      errorTrends
    };
  }

  /**
   * Get user interaction statistics
   */
  getUserInteractionStatistics(userId?: string): {
    totalInteractions: number;
    successRate: number;
    averageDuration: number;
    actionBreakdown: Record<string, number>;
    recentInteractions: UserInteractionLog[];
  } {
    let interactions = [...this.userInteractions];
    
    if (userId) {
      interactions = interactions.filter(i => i.userId === userId);
    }

    const totalInteractions = interactions.length;
    const successfulInteractions = interactions.filter(i => i.success).length;
    const successRate = totalInteractions > 0 ? successfulInteractions / totalInteractions : 0;

    const durationsWithValues = interactions
      .filter(i => i.duration !== undefined)
      .map(i => i.duration!);
    const averageDuration = durationsWithValues.length > 0 
      ? durationsWithValues.reduce((sum, d) => sum + d, 0) / durationsWithValues.length 
      : 0;

    const actionBreakdown: Record<string, number> = {};
    interactions.forEach(i => {
      actionBreakdown[i.action] = (actionBreakdown[i.action] || 0) + 1;
    });

    const recentInteractions = interactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100);

    return {
      totalInteractions,
      successRate,
      averageDuration,
      actionBreakdown,
      recentInteractions
    };
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        logs: this.logs,
        performanceMetrics: this.performanceMetrics,
        userInteractions: this.userInteractions,
        exportedAt: new Date().toISOString()
      }, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'category', 'message', 'component', 'operation', 'success', 'sessionId', 'userId'];
      const csvLines = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.context.component,
          log.context.operation,
          log.context.success?.toString() || '',
          log.sessionId || '',
          log.userId || ''
        ];
        csvLines.push(row.join(','));
      });
      
      return csvLines.join('\n');
    }
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.performanceMetrics = [];
    this.userInteractions = [];
    this.errorMetrics.clear();
    
    this.info('system', 'All logs cleared', {
      component: 'ComprehensiveLogger',
      operation: 'clear',
      success: true
    });
  }

  /**
   * Configure logger settings
   */
  configure(settings: {
    logLevel?: LogLevel;
    enabledCategories?: LogCategory[];
    maxLogEntries?: number;
    maxPerformanceEntries?: number;
    maxUserInteractions?: number;
  }): void {
    if (settings.logLevel) {
      this.logLevel = settings.logLevel;
    }

    if (settings.enabledCategories) {
      this.enabledCategories = new Set(settings.enabledCategories);
    }

    if (settings.maxLogEntries) {
      this.maxLogEntries = settings.maxLogEntries;
    }

    if (settings.maxPerformanceEntries) {
      this.maxPerformanceEntries = settings.maxPerformanceEntries;
    }

    if (settings.maxUserInteractions) {
      this.maxUserInteractions = settings.maxUserInteractions;
    }

    this.info('system', 'Logger configuration updated', {
      component: 'ComprehensiveLogger',
      operation: 'configure',
      success: true
    }, settings);
  }

  /**
   * Check if should log based on level and category
   */
  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    const levelPriority = this.getLevelPriority(level);
    const minPriority = this.getLevelPriority(this.logLevel);
    
    return levelPriority >= minPriority && this.enabledCategories.has(category);
  }

  /**
   * Get numeric priority for log level
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3,
      'fatal': 4
    };
    return priorities[level] || 0;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.context, entry.metadata);
        break;
      case 'info':
        console.info(message, entry.context, entry.metadata);
        break;
      case 'warn':
        console.warn(message, entry.context, entry.metadata);
        break;
      case 'error':
      case 'fatal':
        console.error(message, entry.context, entry.metadata);
        break;
    }
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(logEntry: LogEntry): void {
    const errorCode = logEntry.context.errorCode || 'UNKNOWN_ERROR';
    const existing = this.errorMetrics.get(errorCode);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = logEntry.timestamp;
    } else {
      this.errorMetrics.set(errorCode, {
        errorCode,
        category: logEntry.category,
        count: 1,
        lastOccurrence: logEntry.timestamp,
        severity: logEntry.level === 'fatal' ? 'high' : logEntry.level === 'error' ? 'medium' : 'low',
        recoveryRate: 0,
        averageResolutionTime: 0
      });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enforce log entry limit
   */
  private enforceLogLimit(): void {
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
  }

  /**
   * Enforce performance metrics limit
   */
  private enforcePerformanceLimit(): void {
    if (this.performanceMetrics.length > this.maxPerformanceEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxPerformanceEntries);
    }
  }

  /**
   * Enforce user interaction limit
   */
  private enforceUserInteractionLimit(): void {
    if (this.userInteractions.length > this.maxUserInteractions) {
      this.userInteractions = this.userInteractions.slice(-this.maxUserInteractions);
    }
  }

  /**
   * Periodic cleanup of old entries
   */
  private cleanup(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Remove old logs
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    
    // Remove old performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(
      metric => new Date(metric.startTime) > cutoffTime
    );
    
    // Remove old user interactions
    this.userInteractions = this.userInteractions.filter(
      interaction => interaction.timestamp > cutoffTime
    );
    
    // Clean up old error metrics
    for (const [code, metrics] of this.errorMetrics.entries()) {
      if (metrics.lastOccurrence < cutoffTime) {
        this.errorMetrics.delete(code);
      }
    }
  }
}

// Export singleton instance
export const comprehensiveLogger = ComprehensiveLogger.getInstance();