import React, { useState } from 'react'
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ContextualHelpProps {
  isOpen: boolean
  onClose: () => void
  context: 'reference-analysis' | 'priority-selection' | 'space-optimization' | 'topic-extraction'
}

interface HelpStep {
  title: string
  content: string
  image?: string
  tips?: string[]
}

const helpContent = {
  'reference-analysis': {
    title: 'Reference Format Analysis Workflow',
    steps: [
      {
        title: 'Upload Reference File',
        content: 'Start by uploading a high-quality reference cheat sheet. Supported formats include PDF, PNG, JPG, and other image formats. For best results, use clear, high-resolution files.',
        tips: [
          'Use digital files rather than scanned copies when possible',
          'Ensure text is clearly readable in the reference',
          'Choose references with similar content complexity to your material'
        ]
      },
      {
        title: 'Visual Analysis Process',
        content: 'The system analyzes your reference to extract visual elements including layout structure, typography, color schemes, spacing patterns, and content organization.',
        tips: [
          'Analysis may take 30-60 seconds for complex references',
          'Higher quality references produce better analysis results',
          'The system identifies headers, bullets, columns, and visual hierarchy'
        ]
      },
      {
        title: 'Format Template Generation',
        content: 'Based on the analysis, a format template is created with CSS styles and layout rules that match your reference appearance.',
        tips: [
          'Templates include font sizes, colors, spacing, and layout structure',
          'Content density patterns are extracted to guide topic selection',
          'Visual elements like bullets and headers are recreated'
        ]
      },
      {
        title: 'Content Adaptation',
        content: 'Your extracted topics and content are adapted to match the reference format while preserving original meaning and accuracy.',
        tips: [
          'Content length is adjusted to match reference density',
          'Topic organization follows reference structure patterns',
          'Visual hierarchy is applied to match reference style'
        ]
      },
      {
        title: 'Review and Refinement',
        content: 'Preview the formatted result and make adjustments as needed. You can modify topic selection, adjust formatting, or try different references.',
        tips: [
          'Use preview feature to check formatting accuracy',
          'Adjust topic priorities if content doesn\'t fit well',
          'Consider trying multiple references to find the best match'
        ]
      }
    ]
  },
  'priority-selection': {
    title: 'Priority-Based Topic Selection',
    steps: [
      {
        title: 'Understanding Priority Levels',
        content: 'Topics can be assigned High, Medium, or Low priority. High priority content is always included, medium priority is included when space allows, and low priority fills remaining space.',
        tips: [
          'High: Essential formulas, key concepts, critical definitions',
          'Medium: Important examples, detailed explanations, secondary concepts',
          'Low: Background information, additional examples, supplementary content'
        ]
      },
      {
        title: 'Setting Topic Priorities',
        content: 'Review each extracted topic and assign appropriate priority levels. Consider what information is most critical for your study needs.',
        tips: [
          'Start by identifying absolutely essential content for high priority',
          'Consider your specific study goals when setting priorities',
          'Remember that you can adjust priorities and see immediate space impact'
        ]
      },
      {
        title: 'Subtopic Granular Control',
        content: 'Each topic can be broken down into subtopics with individual priority settings, giving you fine-grained control over content inclusion.',
        tips: [
          'Expand topics to see available subtopics',
          'Set different priorities for subtopics within the same topic',
          'Use subtopic selection to include only the most relevant parts of broader topics'
        ]
      },
      {
        title: 'Auto-Fill Optimization',
        content: 'Use the auto-fill feature to automatically select content based on priorities and available space for optimal utilization.',
        tips: [
          'Auto-fill selects high priority first, then fills remaining space efficiently',
          'Monitor space utilization dashboard during auto-fill',
          'You can manually adjust the auto-fill results as needed'
        ]
      }
    ]
  },
  'space-optimization': {
    title: 'Space Optimization System',
    steps: [
      {
        title: 'Space Utilization Dashboard',
        content: 'Monitor your space usage with the real-time dashboard showing available space, used space, and utilization percentage.',
        tips: [
          'Target 80-95% utilization for optimal results',
          'Green indicates good utilization, yellow warns of issues, red shows overflow',
          'Dashboard updates immediately as you make content changes'
        ]
      },
      {
        title: 'Intelligent Suggestions',
        content: 'The system provides context-aware recommendations to optimize space usage based on your current selection and available space.',
        tips: [
          'Add content suggestions appear when space is under-utilized',
          'Reduction suggestions help when content exceeds available space',
          'Suggestions consider your priority settings and content importance'
        ]
      },
      {
        title: 'Overflow Management',
        content: 'When content exceeds available space, the system provides specific warnings and reduction recommendations.',
        tips: [
          'Review which specific content will be truncated',
          'Consider increasing page count if acceptable',
          'Use priority-based reduction to maintain most important content'
        ]
      },
      {
        title: 'Space Efficiency Optimization',
        content: 'Achieve optimal space usage by balancing content selection with available space and maintaining readability.',
        tips: [
          'Don\'t sacrifice readability for space efficiency',
          'Use preview feature to verify visual balance',
          'Consider reference formatting to guide space utilization'
        ]
      }
    ]
  },
  'topic-extraction': {
    title: 'AI Topic Extraction Process',
    steps: [
      {
        title: 'Content Analysis',
        content: 'AI analyzes your uploaded files to identify distinct topics and concepts, considering document structure and content relationships.',
        tips: [
          'Multiple file types are processed and combined intelligently',
          'Document structure (headings, sections) guides topic identification',
          'Related content from different files is merged appropriately'
        ]
      },
      {
        title: 'Space-Aware Organization',
        content: 'Topic extraction considers your page limits and reference formatting to determine optimal topic count and granularity.',
        tips: [
          'Topic count is adjusted based on available space',
          'Reference content density guides extraction depth',
          'Subtopics are created for granular selection control'
        ]
      },
      {
        title: 'Content Preservation',
        content: 'Original wording and terminology are preserved during topic extraction to maintain familiarity with source materials.',
        tips: [
          'Technical terms and specific wording are maintained',
          'Content is condensed by removing redundancy, not changing meaning',
          'No external information is added during extraction'
        ]
      },
      {
        title: 'Hierarchical Structure',
        content: 'Topics are organized in a logical hierarchy with main topics and detailed subtopics for flexible content selection.',
        tips: [
          'Main topics represent broad concept areas',
          'Subtopics allow selection of specific aspects within topics',
          'Hierarchy reflects natural content organization from source materials'
        ]
      }
    ]
  }
}

export function ContextualHelp({ isOpen, onClose, context }: ContextualHelpProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const content = helpContent[context]
  
  if (!isOpen || !content) return null

  const nextStep = () => {
    if (currentStep < content.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = content.steps[currentStep]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">
            {content.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            {content.steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : index < currentStep
                    ? 'bg-blue-200'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          {/* Step counter */}
          <div className="text-sm text-gray-500 text-center">
            Step {currentStep + 1} of {content.steps.length}
          </div>
          
          {/* Step content */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {currentStepData.title}
            </h3>
            
            <p className="text-gray-700 leading-relaxed">
              {currentStepData.content}
            </p>
            
            {currentStepData.tips && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Tips</span>
                </div>
                <ul className="space-y-1 text-sm text-blue-800">
                  {currentStepData.tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              {content.steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            
            {currentStep < content.steps.length - 1 ? (
              <Button
                onClick={nextStep}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={onClose}
                className="flex items-center space-x-2"
              >
                <span>Done</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for managing contextual help state
export function useContextualHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<ContextualHelpProps['context']>('topic-extraction')
  const [workflowStage, setWorkflowStage] = useState<'upload' | 'processing' | 'topics' | 'customization' | 'generation'>('upload')
  const [userProgress, setUserProgress] = useState({
    completedSteps: [],
    currentStep: 0
  })
  
  const openHelp = (helpContext: ContextualHelpProps['context']) => {
    setContext(helpContext)
    setIsOpen(true)
  }
  
  const closeHelp = () => {
    setIsOpen(false)
  }
  
  const updateProgress = (step: string) => {
    setUserProgress(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, step],
      currentStep: prev.currentStep + 1
    }))
  }
  
  return {
    isOpen,
    context,
    workflowStage,
    setWorkflowStage,
    userProgress,
    updateProgress,
    openHelp,
    closeHelp
  }
}