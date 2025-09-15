/**
 * API endpoint to demonstrate comprehensive error handling capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedErrorIntegration } from '../../../backend/lib/error-handling/enhanced-error-integration';
import { comprehensiveLogger } from '../../../backend/lib/monitoring/comprehensive-logger';
import { SimpleImageGenerator } from '../../../backend/lib/ai/simple-image-generator';
import { ContentModificationService } from '../../../backend/lib/content-modification/content-modification-service';

export async function POST(request: NextRequest) {
  const sessionId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { demoType, ...params } = body;

    comprehensiveLogger.info(
      'api',
      `Error handling demo started: ${demoType}`,
      {
        component: 'ErrorHandlingDemoAPI',
        operation: 'demo',
        success: true
      },
      { demoType, params },
      sessionId
    );

    let result;

    switch (demoType) {
      case 'image-generation-error':
        result = await demonstrateImageGenerationError(params, sessionId);
        break;
      
      case 'content-modification-error':
        result = await demonstrateContentModificationError(params, sessionId);
        break;
      
      case 'validation-error':
        result = await demonstrateValidationError(params, sessionId);
        break;
      
      case 'export-error':
        result = await demonstrateExportError(params, sessionId);
        break;
      
      case 'system-health':
        result = await demonstrateSystemHealth(sessionId);
        break;
      
      default:
        throw new Error(`Unknown demo type: ${demoType}`);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      demoType,
      result,
      logs: comprehensiveLogger.getLogs({ sessionId, limit: 20 })
    });

  } catch (error) {
    comprehensiveLogger.error(
      'api',
      `Error handling demo failed: ${error.message}`,
      {
        component: 'ErrorHandlingDemoAPI',
        operation: 'demo',
        success: false
      },
      { error: error.message },
      sessionId
    );

    return NextResponse.json({
      success: false,
      sessionId,
      error: error.message,
      logs: comprehensiveLogger.getLogs({ sessionId, limit: 20 })
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'stats':
        const stats = enhancedErrorIntegration.getComprehensiveErrorStatistics();
        return NextResponse.json({
          success: true,
          stats
        });

      case 'logs':
        const category = url.searchParams.get('category') as any;
        const level = url.searchParams.get('level') as any;
        const limit = parseInt(url.searchParams.get('limit') || '100');
        
        const logs = comprehensiveLogger.getLogs({
          category,
          level,
          limit
        });

        return NextResponse.json({
          success: true,
          logs
        });

      case 'export-logs':
        const format = url.searchParams.get('format') || 'json';
        const exportedLogs = comprehensiveLogger.exportLogs(format as 'json' | 'csv');
        
        const contentType = format === 'csv' ? 'text/csv' : 'application/json';
        const filename = `error-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        
        return new NextResponse(exportedLogs, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });

      case 'clear-logs':
        comprehensiveLogger.clearLogs();
        return NextResponse.json({
          success: true,
          message: 'All logs cleared'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Demonstrate image generation error handling
 */
async function demonstrateImageGenerationError(params: any, sessionId: string) {
  const { errorType = 'timeout', imageType = 'equation' } = params;
  
  // Create a mock image request
  const imageRequest = {
    type: imageType,
    content: 'x^2 + y^2 = z^2',
    context: 'Pythagorean theorem demonstration',
    style: {
      lineWeight: 'medium' as const,
      colorScheme: 'monochrome' as const,
      layout: 'horizontal' as const,
      annotations: true
    },
    dimensions: { width: 400, height: 300 }
  };

  // Simulate different types of errors
  let simulatedError: Error;
  switch (errorType) {
    case 'timeout':
      simulatedError = new Error('Image generation timeout exceeded');
      break;
    case 'memory':
      simulatedError = new Error('Memory limit exceeded during SVG generation');
      break;
    case 'parsing':
      simulatedError = new Error('Unable to parse mathematical content');
      break;
    case 'style-conflict':
      simulatedError = new Error('Style configuration conflict detected');
      break;
    default:
      simulatedError = new Error('Generic image generation error');
  }

  const context = {
    sessionId,
    operationType: 'image-generation' as const,
    stage: 'ai-processing' as const
  };

  const result = await enhancedErrorIntegration.handleImageGenerationError(
    simulatedError,
    imageRequest,
    context,
    1
  );

  return {
    type: 'image-generation-error',
    errorType,
    handled: result.handled,
    fallbackUsed: result.fallbackUsed,
    userMessage: result.userMessage,
    nextActions: result.nextActions,
    fallbackImage: result.result ? {
      id: result.result.id,
      fallbackType: result.result.fallbackType,
      dimensions: result.result.dimensions
    } : null
  };
}

/**
 * Demonstrate content modification error handling
 */
async function demonstrateContentModificationError(params: any, sessionId: string) {
  const { errorType = 'validation', operationType = 'add_section' } = params;

  // Create mock material and operation
  const mockMaterial = {
    id: 'demo-material-1',
    title: 'Demo Study Material',
    sections: [
      {
        id: 'section-1',
        type: 'text' as const,
        content: 'Existing section content',
        order: 0,
        editable: true,
        dependencies: []
      }
    ],
    images: [],
    metadata: {
      originalFiles: [],
      generationConfig: {},
      preservationScore: 1.0,
      totalSections: 1,
      totalFormulas: 0,
      totalExamples: 0,
      estimatedPrintPages: 1
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOperation = {
    type: operationType,
    data: {
      section: {
        type: 'text' as const,
        content: 'New section content',
        editable: true,
        dependencies: []
      },
      position: 1
    }
  };

  // Simulate different types of errors
  let simulatedError: Error;
  switch (errorType) {
    case 'validation':
      simulatedError = new Error('Validation failed: Missing required fields');
      break;
    case 'dependency':
      simulatedError = new Error('Dependency conflict detected');
      break;
    case 'storage':
      simulatedError = new Error('Failed to save material to storage');
      break;
    case 'concurrent':
      simulatedError = new Error('Concurrent modification detected');
      break;
    default:
      simulatedError = new Error('Generic content modification error');
  }

  const context = {
    sessionId,
    operationType: 'content-modification' as const,
    stage: 'content-organization' as const
  };

  const result = await enhancedErrorIntegration.handleContentModificationError(
    simulatedError,
    mockOperation,
    mockMaterial,
    context,
    1
  );

  return {
    type: 'content-modification-error',
    errorType,
    handled: result.handled,
    recoveryApplied: result.recoveryApplied,
    userMessage: result.userMessage,
    nextActions: result.nextActions,
    errorDetails: result.errorDetails
  };
}

/**
 * Demonstrate validation error handling
 */
async function demonstrateValidationError(params: any, sessionId: string) {
  const { errorCount = 2 } = params;

  // Create mock validation errors
  const validationErrors = [];
  
  if (errorCount >= 1) {
    validationErrors.push({
      field: 'content',
      code: 'REQUIRED_FIELD',
      message: 'Content is required',
      severity: 'error',
      suggestion: 'Please provide content for the section'
    });
  }

  if (errorCount >= 2) {
    validationErrors.push({
      field: 'type',
      code: 'INVALID_TYPE',
      message: 'Invalid section type',
      severity: 'warning',
      suggestion: 'Use one of: text, equation, example'
    });
  }

  if (errorCount >= 3) {
    validationErrors.push({
      field: 'dependencies',
      code: 'CIRCULAR_DEPENDENCY',
      message: 'Circular dependency detected',
      severity: 'error',
      suggestion: 'Remove circular references between sections'
    });
  }

  const context = {
    sessionId,
    operationType: 'validation' as const,
    stage: 'validation' as const
  };

  const result = await enhancedErrorIntegration.handleValidationError(
    validationErrors,
    context,
    'add_section'
  );

  return {
    type: 'validation-error',
    errorCount: validationErrors.length,
    handled: result.handled,
    userMessage: result.userMessage,
    nextActions: result.nextActions,
    validationErrors
  };
}

/**
 * Demonstrate export error handling
 */
async function demonstrateExportError(params: any, sessionId: string) {
  const { format = 'pdf' } = params;

  const exportError = new Error(`${format.toUpperCase()} generation failed due to rendering issues`);
  
  const context = {
    sessionId,
    operationType: 'export' as const,
    stage: 'completion' as const
  };

  const result = await enhancedErrorIntegration.handleExportError(
    exportError,
    format,
    'demo-material-1',
    context
  );

  return {
    type: 'export-error',
    format,
    handled: result.handled,
    userMessage: result.userMessage,
    nextActions: result.nextActions,
    alternativeFormats: result.errorDetails?.alternativeFormats
  };
}

/**
 * Demonstrate system health monitoring
 */
async function demonstrateSystemHealth(sessionId: string) {
  // Generate some sample errors for demonstration
  for (let i = 0; i < 5; i++) {
    comprehensiveLogger.error(
      'image-generation',
      `Demo error ${i + 1}`,
      {
        component: 'DemoComponent',
        operation: 'demo-operation',
        success: false
      },
      { demoError: true },
      sessionId
    );
  }

  const stats = enhancedErrorIntegration.getComprehensiveErrorStatistics();
  const userStats = comprehensiveLogger.getUserInteractionStatistics();
  const errorStats = comprehensiveLogger.getErrorStatistics();

  return {
    type: 'system-health',
    systemHealth: stats.overall.systemHealth,
    errorStatistics: {
      totalErrors: errorStats.totalErrors,
      errorsByCategory: errorStats.errorsByCategory,
      recentTrends: errorStats.errorTrends
    },
    userInteractions: {
      totalInteractions: userStats.totalInteractions,
      successRate: userStats.successRate,
      averageDuration: userStats.averageDuration
    },
    componentHealth: {
      imageGeneration: stats.imageGeneration,
      contentModification: stats.contentModification
    }
  };
}