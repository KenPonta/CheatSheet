'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2, FileText, Brain, Layout, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ProgressUpdate, ProcessingStage, SessionState, errorService } from '@/lib/error-handling/error-service';

interface ProgressTrackerProps {
  sessionId: string;
  onStageComplete?: (stage: ProcessingStage) => void;
  onError?: (error: any) => void;
}

const STAGE_INFO: Record<ProcessingStage, { 
  label: string; 
  icon: React.ReactNode; 
  description: string;
  estimatedDuration: number; // seconds
}> = {
  'upload': {
    label: 'File Upload',
    icon: <FileText className="h-4 w-4" />,
    description: 'Uploading and validating files',
    estimatedDuration: 5
  },
  'validation': {
    label: 'Validation',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Checking file formats and requirements',
    estimatedDuration: 3
  },
  'extraction': {
    label: 'Content Extraction',
    icon: <FileText className="h-4 w-4" />,
    description: 'Extracting text and images from files',
    estimatedDuration: 15
  },
  'ocr': {
    label: 'Text Recognition',
    icon: <Brain className="h-4 w-4" />,
    description: 'Converting images to text using OCR',
    estimatedDuration: 20
  },
  'ai-processing': {
    label: 'AI Analysis',
    icon: <Brain className="h-4 w-4" />,
    description: 'Analyzing content with AI services',
    estimatedDuration: 10
  },
  'topic-extraction': {
    label: 'Topic Extraction',
    icon: <Brain className="h-4 w-4" />,
    description: 'Identifying and organizing topics',
    estimatedDuration: 8
  },
  'content-organization': {
    label: 'Content Organization',
    icon: <Layout className="h-4 w-4" />,
    description: 'Structuring content for cheat sheet',
    estimatedDuration: 5
  },
  'layout-generation': {
    label: 'Layout Generation',
    icon: <Layout className="h-4 w-4" />,
    description: 'Creating cheat sheet layout',
    estimatedDuration: 7
  },
  'pdf-generation': {
    label: 'PDF Generation',
    icon: <FileDown className="h-4 w-4" />,
    description: 'Generating final PDF document',
    estimatedDuration: 10
  },
  'completion': {
    label: 'Completion',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Finalizing and preparing download',
    estimatedDuration: 2
  }
};

export function ProgressTracker({ sessionId, onStageComplete, onError }: ProgressTrackerProps) {
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribeProgress = errorService.onProgress((update) => {
      setCurrentProgress(update);
      
      if (update.progress === 100) {
        onStageComplete?.(update.stage);
      }
    });

    // Load session state
    const session = errorService.getSession(sessionId);
    if (session) {
      setSessionState(session);
      setStartTime(session.lastActivity);
    }

    // Subscribe to session updates (for error handling)
    const checkSession = () => {
      const updatedSession = errorService.getSession(sessionId);
      if (updatedSession) {
        setSessionState(updatedSession);
      }
    };

    const interval = setInterval(checkSession, 1000);

    return () => {
      unsubscribeProgress();
      clearInterval(interval);
    };
  }, [sessionId, onStageComplete]);

  const getStageStatus = (stage: ProcessingStage): 'completed' | 'current' | 'failed' | 'pending' => {
    if (!sessionState) return 'pending';
    
    if (sessionState.completedStages.includes(stage)) return 'completed';
    if (sessionState.failedStages.includes(stage)) return 'failed';
    if (sessionState.currentStage === stage) return 'current';
    return 'pending';
  };

  const getOverallProgress = (): number => {
    if (!sessionState) return 0;
    
    const totalStages = Object.keys(STAGE_INFO).length;
    const completedCount = sessionState.completedStages.length;
    const currentStageProgress = currentProgress?.progress || 0;
    
    return Math.round(((completedCount + currentStageProgress / 100) / totalStages) * 100);
  };

  const getEstimatedTimeRemaining = (): string => {
    if (!sessionState || !currentProgress) return 'Calculating...';
    
    const totalStages = Object.keys(STAGE_INFO).length;
    const completedStages = sessionState.completedStages.length;
    const currentStageProgress = currentProgress.progress / 100;
    const overallProgress = (completedStages + currentStageProgress) / totalStages;
    
    if (overallProgress <= 0) return 'Calculating...';
    
    const elapsedTime = (Date.now() - startTime.getTime()) / 1000;
    const estimatedTotal = elapsedTime / overallProgress;
    const remaining = Math.max(0, estimatedTotal - elapsedTime);
    
    if (remaining < 60) return `${Math.round(remaining)}s`;
    if (remaining < 3600) return `${Math.round(remaining / 60)}m`;
    return `${Math.round(remaining / 3600)}h`;
  };

  const formatElapsedTime = (): string => {
    const elapsed = (Date.now() - startTime.getTime()) / 1000;
    if (elapsed < 60) return `${Math.round(elapsed)}s`;
    if (elapsed < 3600) return `${Math.round(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
    return `${Math.round(elapsed / 3600)}h ${Math.round((elapsed % 3600) / 60)}m`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing Progress</span>
          <Badge variant="outline">
            {getOverallProgress()}% Complete
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <Progress value={getOverallProgress()} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Elapsed: {formatElapsedTime()}</span>
            <span>Remaining: {getEstimatedTimeRemaining()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(STAGE_INFO).map(([stage, info]) => {
            const status = getStageStatus(stage as ProcessingStage);
            const isCurrentStage = sessionState?.currentStage === stage;
            const stageProgress = isCurrentStage ? (currentProgress?.progress || 0) : 
                                 status === 'completed' ? 100 : 0;

            return (
              <div key={stage} className="flex items-center space-x-3">
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${status === 'completed' ? 'bg-green-100 text-green-600' :
                    status === 'failed' ? 'bg-red-100 text-red-600' :
                    status === 'current' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'}
                `}>
                  {status === 'completed' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : status === 'failed' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : status === 'current' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    info.icon
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`
                      text-sm font-medium
                      ${status === 'completed' ? 'text-green-700' :
                        status === 'failed' ? 'text-red-700' :
                        status === 'current' ? 'text-blue-700' :
                        'text-gray-500'}
                    `}>
                      {info.label}
                    </h4>
                    {status === 'current' && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(stageProgress)}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCurrentStage && currentProgress?.message ? 
                      currentProgress.message : 
                      info.description}
                  </p>
                  
                  {status === 'current' && (
                    <Progress value={stageProgress} className="w-full h-1 mt-2" />
                  )}
                  
                  {currentProgress?.details && isCurrentStage && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {currentProgress.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sessionState && sessionState.files.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">File Processing Status</h4>
            <div className="space-y-2">
              {sessionState.files.map((file) => (
                <div key={file.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{file.name}</span>
                  <Badge 
                    variant={
                      file.status === 'completed' ? 'default' :
                      file.status === 'failed' ? 'destructive' :
                      file.status === 'processing' ? 'secondary' :
                      file.status === 'skipped' ? 'outline' :
                      'secondary'
                    }
                    className="text-xs"
                  >
                    {file.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SimpleProgressBarProps {
  stage: ProcessingStage;
  progress: number;
  message?: string;
  showPercentage?: boolean;
}

export function SimpleProgressBar({ 
  stage, 
  progress, 
  message, 
  showPercentage = true 
}: SimpleProgressBarProps) {
  const stageInfo = STAGE_INFO[stage];
  
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {stageInfo.icon}
          <span className="text-sm font-medium">{stageInfo.label}</span>
        </div>
        {showPercentage && (
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <Progress value={progress} className="w-full" />
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}