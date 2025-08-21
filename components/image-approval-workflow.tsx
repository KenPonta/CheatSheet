'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import type { 
  UserApprovalWorkflow, 
  ImageQualityAssessment,
  QualityIssue 
} from '@/lib/ai/types';

interface ImageApprovalWorkflowProps {
  workflows: UserApprovalWorkflow[];
  onApproval: (imageId: string, choice: 'original' | 'recreated' | 'regenerate' | 'skip', feedback?: string) => void;
  onBatchApproval?: (approvals: { imageId: string; choice: string; feedback?: string }[]) => void;
}

export function ImageApprovalWorkflow({ 
  workflows, 
  onApproval, 
  onBatchApproval 
}: ImageApprovalWorkflowProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [batchSelections, setBatchSelections] = useState<Record<string, string>>({});

  const handleApproval = (
    imageId: string, 
    choice: 'original' | 'recreated' | 'regenerate' | 'skip'
  ) => {
    onApproval(imageId, choice, feedback[imageId] || '');
    setFeedback(prev => ({ ...prev, [imageId]: '' }));
  };

  const handleBatchApproval = () => {
    if (!onBatchApproval) return;
    
    const approvals = Object.entries(batchSelections).map(([imageId, choice]) => ({
      imageId,
      choice,
      feedback: feedback[imageId]
    }));
    
    onBatchApproval(approvals);
    setBatchSelections({});
    setFeedback({});
  };

  const renderQualityAssessment = (assessment: ImageQualityAssessment) => {
    const getScoreColor = (score: number) => {
      if (score >= 0.8) return 'text-green-600';
      if (score >= 0.6) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getRecommendationBadge = (recommendation: string) => {
      const variants = {
        use_original: 'secondary',
        use_recreated: 'default',
        needs_review: 'destructive'
      } as const;
      
      return (
        <Badge variant={variants[recommendation as keyof typeof variants] || 'secondary'}>
          {recommendation.replace('_', ' ').toUpperCase()}
        </Badge>
      );
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Quality Assessment</h4>
          {getRecommendationBadge(assessment.recommendation)}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Original Score:</span>
            <span className={`ml-2 font-medium ${getScoreColor(assessment.originalScore)}`}>
              {(assessment.originalScore * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Recreated Score:</span>
            <span className={`ml-2 font-medium ${getScoreColor(assessment.recreatedScore)}`}>
              {(assessment.recreatedScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(assessment.factors).map(([factor, score]) => (
            <div key={factor} className="flex justify-between">
              <span className="capitalize text-gray-600">{factor}:</span>
              <span className={getScoreColor(score)}>
                {(score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        {assessment.issues.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">Issues:</h5>
            {assessment.issues.map((issue, index) => (
              <QualityIssueCard key={index} issue={issue} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <CheckCircle className="mx-auto h-12 w-12 mb-2" />
          <p>No images require approval</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Image Recreation Approval ({workflows.length} items)
        </h3>
        {onBatchApproval && Object.keys(batchSelections).length > 0 && (
          <Button onClick={handleBatchApproval} variant="outline">
            Apply Batch Selections ({Object.keys(batchSelections).length})
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.imageId} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Image: {workflow.originalImage.id}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWorkflow(
                    selectedWorkflow === workflow.imageId ? null : workflow.imageId
                  )}
                >
                  <Eye className="h-4 w-4" />
                  {selectedWorkflow === workflow.imageId ? 'Hide' : 'Details'}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Context: {workflow.originalImage.context}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedWorkflow === workflow.imageId && (
                <div className="space-y-4 border-t pt-4">
                  {renderQualityAssessment(workflow.qualityAssessment)}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Original Image</h5>
                      {workflow.originalImage.base64 ? (
                        <img 
                          src={workflow.originalImage.base64} 
                          alt="Original"
                          className="w-full h-32 object-contain border rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 border rounded flex items-center justify-center text-gray-500">
                          No preview available
                        </div>
                      )}
                      {workflow.originalImage.ocrText && (
                        <p className="text-xs text-gray-600 mt-1">
                          OCR: {workflow.originalImage.ocrText.substring(0, 100)}...
                        </p>
                      )}
                    </div>

                    {workflow.recreatedImage && (
                      <div>
                        <h5 className="font-medium mb-2">Recreated Image</h5>
                        {workflow.recreatedImage.base64 ? (
                          <img 
                            src={workflow.recreatedImage.base64} 
                            alt="Recreated"
                            className="w-full h-32 object-contain border rounded"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 border rounded flex items-center justify-center text-gray-500">
                            Loading...
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          Prompt: {workflow.recreatedImage.prompt.substring(0, 100)}...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Textarea
                  placeholder="Optional feedback about this image..."
                  value={feedback[workflow.imageId] || ''}
                  onChange={(e) => setFeedback(prev => ({
                    ...prev,
                    [workflow.imageId]: e.target.value
                  }))}
                  className="text-sm"
                  rows={2}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(workflow.imageId, 'original')}
                    className="flex items-center gap-1"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    Use Original
                  </Button>
                  
                  {workflow.recreatedImage && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApproval(workflow.imageId, 'recreated')}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Use Recreated
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(workflow.imageId, 'regenerate')}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApproval(workflow.imageId, 'skip')}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    Skip
                  </Button>
                </div>

                {onBatchApproval && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Batch selection:</span>
                    <select
                      value={batchSelections[workflow.imageId] || ''}
                      onChange={(e) => setBatchSelections(prev => ({
                        ...prev,
                        [workflow.imageId]: e.target.value
                      }))}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="">None</option>
                      <option value="original">Use Original</option>
                      {workflow.recreatedImage && <option value="recreated">Use Recreated</option>}
                      <option value="regenerate">Regenerate</option>
                      <option value="skip">Skip</option>
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QualityIssueCard({ issue }: { issue: QualityIssue }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <AlertTriangle className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <div className={`p-2 rounded text-xs ${getSeverityColor(issue.severity)}`}>
      <div className="flex items-center gap-1 font-medium">
        {getSeverityIcon(issue.severity)}
        <span className="capitalize">{issue.type.replace('_', ' ')}</span>
        <Badge variant="outline" className="text-xs">
          {issue.severity}
        </Badge>
      </div>
      <p className="mt-1">{issue.description}</p>
      {issue.suggestion && (
        <p className="mt-1 font-medium">Suggestion: {issue.suggestion}</p>
      )}
    </div>
  );
}