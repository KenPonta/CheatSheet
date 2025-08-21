'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  ArrowLeft,
  FileText,
  BarChart3
} from 'lucide-react';
import type { 
  ContentComparison, 
  FidelityWarning, 
  ContentModification,
  FidelityScore 
} from '@/lib/content-fidelity';

interface ContentComparisonViewProps {
  comparison: ContentComparison;
  onBack: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export function ContentComparisonView({
  comparison,
  onBack,
  onApprove,
  onReject,
  showActions = false
}: ContentComparisonViewProps) {
  const [showDifferences, setShowDifferences] = useState(true);
  const [selectedWarning, setSelectedWarning] = useState<number | null>(null);

  const { original, processed, score, warnings, modifications } = comparison;

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 0.8) return 'text-green-600';
    if (scoreValue >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getModificationIcon = (type: 'addition' | 'removal' | 'change') => {
    switch (type) {
      case 'addition': return <span className="text-green-600">+</span>;
      case 'removal': return <span className="text-red-600">-</span>;
      case 'change': return <span className="text-blue-600">~</span>;
    }
  };

  const highlightDifferences = (text: string, modifications: ContentModification[], isOriginal: boolean) => {
    if (!showDifferences) return text;
    
    let highlightedText = text;
    const relevantMods = modifications.filter(mod => 
      isOriginal ? mod.originalText : mod.processedText
    );
    
    // Simple highlighting - in a real implementation, you'd want more sophisticated diff highlighting
    relevantMods.forEach(mod => {
      const targetText = isOriginal ? mod.originalText : mod.processedText;
      if (targetText) {
        const className = mod.type === 'addition' ? 'bg-green-100' : 
                         mod.type === 'removal' ? 'bg-red-100' : 'bg-blue-100';
        highlightedText = highlightedText.replace(
          targetText, 
          `<span class="${className}">${targetText}</span>`
        );
      }
    });
    
    return highlightedText;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Content Comparison</h2>
            <p className="text-muted-foreground">
              Detailed analysis of content fidelity and modifications
            </p>
          </div>
        </div>
        
        {showActions && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button variant="outline" onClick={onReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Fidelity Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Fidelity Scores
          </CardTitle>
          <CardDescription>
            Automated analysis of content preservation and similarity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FidelityScoreDisplay score={score} getScoreColor={getScoreColor} />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Side-by-Side Comparison</TabsTrigger>
          <TabsTrigger value="warnings">
            Warnings ({warnings.length})
          </TabsTrigger>
          <TabsTrigger value="modifications">
            Modifications ({modifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Content Comparison</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDifferences(!showDifferences)}
            >
              {showDifferences ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showDifferences ? 'Hide' : 'Show'} Differences
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Original Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: highlightDifferences(original, modifications, true)
                  }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processed Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: highlightDifferences(processed, modifications, false)
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          <WarningsDisplay 
            warnings={warnings}
            selectedWarning={selectedWarning}
            onSelectWarning={setSelectedWarning}
            getSeverityColor={getSeverityColor}
          />
        </TabsContent>

        <TabsContent value="modifications" className="space-y-4">
          <ModificationsDisplay 
            modifications={modifications}
            getModificationIcon={getModificationIcon}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FidelityScoreDisplayProps {
  score: FidelityScore;
  getScoreColor: (score: number) => string;
}

function FidelityScoreDisplay({ score, getScoreColor }: FidelityScoreDisplayProps) {
  const scoreItems = [
    { label: 'Overall Score', value: score.overall, description: 'Combined fidelity assessment' },
    { label: 'Wording Preservation', value: score.wordingPreservation, description: 'Original terminology retained' },
    { label: 'Semantic Similarity', value: score.semanticSimilarity, description: 'Meaning preservation' },
    { label: 'Text Similarity', value: score.textSimilarity, description: 'Character-level similarity' },
    { label: 'Structure Similarity', value: score.structureSimilarity, description: 'Document organization' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {scoreItems.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{item.label}</span>
            <span className={`text-lg font-bold ${getScoreColor(item.value)}`}>
              {(item.value * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={item.value * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

interface WarningsDisplayProps {
  warnings: FidelityWarning[];
  selectedWarning: number | null;
  onSelectWarning: (index: number | null) => void;
  getSeverityColor: (severity: 'low' | 'medium' | 'high') => string;
}

function WarningsDisplay({ 
  warnings, 
  selectedWarning, 
  onSelectWarning, 
  getSeverityColor 
}: WarningsDisplayProps) {
  if (warnings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Warnings</h3>
          <p className="text-muted-foreground">
            No significant issues were detected in the content processing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.map((warning, index) => (
        <Card 
          key={index}
          className={`cursor-pointer transition-all ${
            selectedWarning === index ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onSelectWarning(selectedWarning === index ? null : index)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge variant={getSeverityColor(warning.severity)}>
                    {warning.severity}
                  </Badge>
                  <span className="text-sm text-muted-foreground capitalize">
                    {warning.type.replace('_', ' ')}
                  </span>
                </div>
                <CardTitle className="text-base">{warning.message}</CardTitle>
              </div>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          
          {selectedWarning === index && (
            <CardContent className="space-y-4">
              {warning.originalText && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Original Text:</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    {warning.originalText}
                  </div>
                </div>
              )}
              
              {warning.processedText && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Processed Text:</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    {warning.processedText}
                  </div>
                </div>
              )}
              
              {warning.suggestion && (
                <Alert>
                  <AlertDescription>
                    <strong>Suggestion:</strong> {warning.suggestion}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

interface ModificationsDisplayProps {
  modifications: ContentModification[];
  getModificationIcon: (type: 'addition' | 'removal' | 'change') => JSX.Element;
}

function ModificationsDisplay({ modifications, getModificationIcon }: ModificationsDisplayProps) {
  if (modifications.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Modifications</h3>
          <p className="text-muted-foreground">
            The processed content is identical to the original.
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedModifications = modifications.reduce((acc, mod) => {
    if (!acc[mod.type]) acc[mod.type] = [];
    acc[mod.type].push(mod);
    return acc;
  }, {} as Record<string, ContentModification[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedModifications).map(([type, mods]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              {getModificationIcon(type as any)}
              <span className="ml-2 capitalize">{type}s ({mods.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mods.map((mod, index) => (
                <div key={index} className="border-l-4 border-muted pl-4">
                  {mod.originalText && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Original:</span>
                      <div className="text-sm">{mod.originalText}</div>
                    </div>
                  )}
                  {mod.processedText && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Processed:</span>
                      <div className="text-sm">{mod.processedText}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}