'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Eye, MessageSquare } from 'lucide-react';
import type { 
  ManualReviewItem, 
  ReviewSummary, 
  FidelityWarning,
  ContentComparison 
} from '@/lib/content-fidelity';

interface ManualReviewInterfaceProps {
  reviewItems: ManualReviewItem[];
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, notes?: string) => void;
  onViewDetails: (id: string) => void;
}

export function ManualReviewInterface({
  reviewItems,
  onApprove,
  onReject,
  onViewDetails
}: ManualReviewInterfaceProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const pendingItems = reviewItems.filter(item => item.status === 'pending');
  const completedItems = reviewItems.filter(item => item.status !== 'pending');

  const handleApprove = (id: string) => {
    onApprove(id, userNotes);
    setUserNotes('');
    setSelectedItem(null);
  };

  const handleReject = (id: string) => {
    onReject(id, userNotes);
    setUserNotes('');
    setSelectedItem(null);
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews */}
      {pendingItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Reviews</h3>
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <ReviewItemCard
                key={item.id}
                item={item}
                isSelected={selectedItem === item.id}
                userNotes={userNotes}
                onSelect={setSelectedItem}
                onNotesChange={setUserNotes}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewDetails={onViewDetails}
                getSeverityColor={getSeverityColor}
                getScoreColor={getScoreColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Reviews */}
      {completedItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Completed Reviews</h3>
          <div className="space-y-2">
            {completedItems.map((item) => (
              <CompletedReviewCard
                key={item.id}
                item={item}
                onViewDetails={onViewDetails}
                getScoreColor={getScoreColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {reviewItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reviews Pending</h3>
            <p className="text-muted-foreground">
              All content has passed fidelity validation or no content has been processed yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ReviewItemCardProps {
  item: ManualReviewItem;
  isSelected: boolean;
  userNotes: string;
  onSelect: (id: string | null) => void;
  onNotesChange: (notes: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetails: (id: string) => void;
  getSeverityColor: (severity: 'low' | 'medium' | 'high') => string;
  getScoreColor: (score: number) => string;
}

function ReviewItemCard({
  item,
  isSelected,
  userNotes,
  onSelect,
  onNotesChange,
  onApprove,
  onReject,
  onViewDetails,
  getSeverityColor,
  getScoreColor
}: ReviewItemCardProps) {
  const { comparison } = item;
  const highSeverityWarnings = comparison.warnings.filter(w => w.severity === 'high');
  const mediumSeverityWarnings = comparison.warnings.filter(w => w.severity === 'medium');

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base">Content Review #{item.id.slice(-8)}</CardTitle>
            <CardDescription>
              Submitted {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Pending</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(item.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
            <div className={`text-lg font-semibold ${getScoreColor(comparison.score.overall)}`}>
              {(comparison.score.overall * 100).toFixed(1)}%
            </div>
            <Progress value={comparison.score.overall * 100} className="h-2" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Wording Preservation</div>
            <div className={`text-lg font-semibold ${getScoreColor(comparison.score.wordingPreservation)}`}>
              {(comparison.score.wordingPreservation * 100).toFixed(1)}%
            </div>
            <Progress value={comparison.score.wordingPreservation * 100} className="h-2" />
          </div>
        </div>

        {/* Warnings Summary */}
        {comparison.warnings.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Issues Detected</div>
            <div className="flex flex-wrap gap-2">
              {highSeverityWarnings.length > 0 && (
                <Badge variant={getSeverityColor('high')}>
                  {highSeverityWarnings.length} Critical
                </Badge>
              )}
              {mediumSeverityWarnings.length > 0 && (
                <Badge variant={getSeverityColor('medium')}>
                  {mediumSeverityWarnings.length} Moderate
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Key Warnings */}
        {highSeverityWarnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Critical Issues:</div>
              <ul className="text-sm space-y-1">
                {highSeverityWarnings.slice(0, 2).map((warning, index) => (
                  <li key={index}>• {warning.message}</li>
                ))}
                {highSeverityWarnings.length > 2 && (
                  <li>• And {highSeverityWarnings.length - 2} more...</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onSelect(isSelected ? null : item.id)}
          >
            {isSelected ? 'Cancel' : 'Review'}
          </Button>
          
          {isSelected && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="text-green-600 hover:text-green-700"
                onClick={() => onApprove(item.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => onReject(item.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>

        {/* Notes Input */}
        {isSelected && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Review Notes (Optional)</label>
            <Textarea
              placeholder="Add notes about your decision..."
              value={userNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CompletedReviewCardProps {
  item: ManualReviewItem;
  onViewDetails: (id: string) => void;
  getScoreColor: (score: number) => string;
}

function CompletedReviewCard({
  item,
  onViewDetails,
  getScoreColor
}: CompletedReviewCardProps) {
  const statusIcon = item.status === 'approved' ? 
    <CheckCircle className="h-4 w-4 text-green-500" /> :
    <XCircle className="h-4 w-4 text-red-500" />;

  const statusColor = item.status === 'approved' ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {statusIcon}
            <div>
              <div className="font-medium">Review #{item.id.slice(-8)}</div>
              <div className="text-sm text-muted-foreground">
                Score: <span className={getScoreColor(item.comparison.score.overall)}>
                  {(item.comparison.score.overall * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={item.status === 'approved' ? 'default' : 'destructive'}>
              {item.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(item.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {item.userNotes && (
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <MessageSquare className="h-3 w-3 inline mr-1" />
            {item.userNotes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}