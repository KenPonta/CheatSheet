'use client'

import React, { useState, useEffect } from 'react'
import { HelpCircle, BookOpen, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ContextualHelpProps {
  workflowStage: 'upload' | 'processing' | 'topics' | 'customization' | 'generation'
  userProgress?: {
    filesUploaded: number
    topicsSelected: number
    settingsConfigured: boolean
  }
}

interface HelpContent {
  title: string
  description: string
  tips: string[]
  commonIssues: Array<{
    issue: string
    solution: string
  }>
  nextSteps: string[]
}

const helpContent: Record<string, HelpContent> = {
  upload: {
    title: 'File Upload Stage',
    description: 'Upload your study materials to begin creating your cheat sheet.',
    tips: [
      'Supported formats: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Images, Text files',
      'Maximum file size: 50MB per file',
      'Higher quality files produce better results',
      'You can upload multiple files at once'
    ],
    commonIssues: [
      {
        issue: 'File format not supported',
        solution: 'Convert to .docx, .pptx, .xlsx, or save as PDF'
      },
      {
        issue: 'File too large',
        solution: 'Compress images or split into smaller files'
      },
      {
        issue: 'Upload fails',
        solution: 'Check internet connection and try a different browser'
      }
    ],
    nextSteps: [
      'Wait for file processing to complete',
      'Review extracted content for accuracy',
      'Proceed to topic selection'
    ]
  },
  processing: {
    title: 'Content Processing',
    description: 'We\'re extracting and analyzing content from your files.',
    tips: [
      'Processing time depends on file size and complexity',
      'Images and scanned documents take longer (OCR processing)',
      'You can monitor progress for each file',
      'Large files may take several minutes'
    ],
    commonIssues: [
      {
        issue: 'Processing takes too long',
        solution: 'Large files with many images need more time. Be patient or try smaller files.'
      },
      {
        issue: 'Processing fails',
        solution: 'Check if file is corrupted. Try re-saving and uploading again.'
      },
      {
        issue: 'Poor OCR results',
        solution: 'Ensure images have good contrast and resolution. Retake photos if needed.'
      }
    ],
    nextSteps: [
      'Review extracted content when processing completes',
      'Check for any missing or incorrect content',
      'Move to topic selection phase'
    ]
  },
  topics: {
    title: 'Topic Selection',
    description: 'Choose which topics to include and customize content for your cheat sheet.',
    tips: [
      'AI has organized content into logical topics',
      'Select topics most relevant to your study goals',
      'Edit content to focus on key points',
      'Page count estimate updates as you select topics'
    ],
    commonIssues: [
      {
        issue: 'Topics don\'t make sense',
        solution: 'Review and reorganize topics manually. Merge or split as needed.'
      },
      {
        issue: 'Missing important content',
        solution: 'Check if content was extracted properly. Add manually if needed.'
      },
      {
        issue: 'Too much content selected',
        solution: 'Deselect less important topics or increase page count'
      }
    ],
    nextSteps: [
      'Review selected topics and content',
      'Proceed to customization settings',
      'Configure page layout and formatting'
    ]
  },
  customization: {
    title: 'Layout Customization',
    description: 'Configure page settings and formatting for your cheat sheet.',
    tips: [
      'Balance content density with readability',
      'More pages allow for more detailed content',
      'Smaller text fits more content but may be harder to read',
      'Reference templates help maintain consistent formatting'
    ],
    commonIssues: [
      {
        issue: 'Content doesn\'t fit',
        solution: 'Increase page count, reduce text size, or deselect some topics'
      },
      {
        issue: 'Text too small to read',
        solution: 'Increase text size or reduce content selection'
      },
      {
        issue: 'Reference template doesn\'t work',
        solution: 'Try a simpler template or adjust settings manually'
      }
    ],
    nextSteps: [
      'Review layout preview',
      'Make final adjustments to content or settings',
      'Generate your cheat sheet'
    ]
  },
  generation: {
    title: 'Cheat Sheet Generation',
    description: 'Creating your personalized study material.',
    tips: [
      'Generation includes layout optimization and image processing',
      'AI may recreate some images for better clarity',
      'Final PDF will be optimized for printing',
      'Review the result before downloading'
    ],
    commonIssues: [
      {
        issue: 'Generation takes too long',
        solution: 'Complex layouts and image recreation take time. Please wait.'
      },
      {
        issue: 'Generated images poor quality',
        solution: 'Choose original images over AI-generated ones in approval step'
      },
      {
        issue: 'Layout issues in final PDF',
        solution: 'Adjust settings and regenerate, or try different page size'
      }
    ],
    nextSteps: [
      'Review generated cheat sheet',
      'Download PDF when satisfied',
      'Print and test readability'
    ]
  }
}

export function ContextualHelp({ workflowStage, userProgress }: ContextualHelpProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const content = helpContent[workflowStage]

  const getStageIcon = () => {
    switch (workflowStage) {
      case 'upload':
        return <BookOpen className="h-5 w-5" />
      case 'processing':
        return <Info className="h-5 w-5" />
      case 'topics':
        return <CheckCircle className="h-5 w-5" />
      case 'customization':
        return <AlertCircle className="h-5 w-5" />
      case 'generation':
        return <CheckCircle className="h-5 w-5" />
      default:
        return <HelpCircle className="h-5 w-5" />
    }
  }

  const getProgressInfo = () => {
    if (!userProgress) return null

    switch (workflowStage) {
      case 'upload':
        return userProgress.filesUploaded > 0 ? 
          `${userProgress.filesUploaded} file(s) uploaded` : 
          'No files uploaded yet'
      case 'topics':
        return userProgress.topicsSelected > 0 ? 
          `${userProgress.topicsSelected} topic(s) selected` : 
          'No topics selected yet'
      case 'customization':
        return userProgress.settingsConfigured ? 
          'Settings configured' : 
          'Settings not configured'
      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-md">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {getStageIcon()}
                {content.title}
              </div>
              <div className="flex items-center gap-2">
                {getProgressInfo() && (
                  <Badge variant="secondary" className="text-xs">
                    {getProgressInfo()}
                  </Badge>
                )}
                <HelpCircle className="h-4 w-4" />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              {content.description}
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Tips for Success</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {content.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Common Issues</h4>
                <div className="space-y-2">
                  {content.commonIssues.map((item, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium text-destructive">
                        {item.issue}
                      </div>
                      <div className="text-muted-foreground ml-2">
                        → {item.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Next Steps</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {content.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// Hook for managing contextual help state
export function useContextualHelp() {
  const [workflowStage, setWorkflowStage] = useState<'upload' | 'processing' | 'topics' | 'customization' | 'generation'>('upload')
  const [userProgress, setUserProgress] = useState({
    filesUploaded: 0,
    topicsSelected: 0,
    settingsConfigured: false
  })

  const updateProgress = (updates: Partial<typeof userProgress>) => {
    setUserProgress(prev => ({ ...prev, ...updates }))
  }

  return {
    workflowStage,
    setWorkflowStage,
    userProgress,
    updateProgress
  }
}