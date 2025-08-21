'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TourStep {
  id: string
  title: string
  content: string
  target?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void
}

interface GuidedTourProps {
  steps: TourStep[]
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
}

export function GuidedTour({ steps, isActive, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (isActive && steps[currentStep]?.target) {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement
      setTargetElement(element)
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.style.position = 'relative'
        element.style.zIndex = '1001'
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)'
        element.style.borderRadius = '4px'
      }
    }

    return () => {
      if (targetElement) {
        targetElement.style.position = ''
        targetElement.style.zIndex = ''
        targetElement.style.boxShadow = ''
        targetElement.style.borderRadius = ''
      }
    }
  }, [currentStep, isActive, steps, targetElement])

  const nextStep = () => {
    if (steps[currentStep]?.action) {
      steps[currentStep].action!()
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipTour = () => {
    if (targetElement) {
      targetElement.style.position = ''
      targetElement.style.zIndex = ''
      targetElement.style.boxShadow = ''
      targetElement.style.borderRadius = ''
    }
    onSkip()
  }

  if (!isActive || !steps.length) return null

  const step = steps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-1000" />
      
      {/* Tour Card */}
      <Card className="fixed z-1002 max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {currentStep + 1} of {steps.length}
              </Badge>
              <h3 className="font-semibold text-sm">{step.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={skipTour}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {step.content}
          </p>
          
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <Button
              size="sm"
              onClick={nextStep}
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={skipTour}
            >
              Skip Tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Predefined tours for different workflows
export const uploadTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Cheat Sheet Generator',
    content: 'This tour will guide you through creating your first cheat sheet from your study materials.',
    target: '[data-tour="upload-area"]'
  },
  {
    id: 'file-upload',
    title: 'Upload Your Files',
    content: 'Drag and drop your files here or click to select. We support PDF, Word, PowerPoint, Excel, images, and text files.',
    target: '[data-tour="upload-area"]'
  },
  {
    id: 'file-types',
    title: 'Supported File Types',
    content: 'Each file type is processed differently to extract the best content. Check the help icons for specific guidance.',
    target: '[data-tour="file-types"]'
  },
  {
    id: 'processing',
    title: 'Processing Your Files',
    content: 'Once uploaded, we\'ll extract text, analyze images with OCR, and organize content into topics using AI.',
    target: '[data-tour="processing-status"]'
  }
]

export const topicSelectionTourSteps: TourStep[] = [
  {
    id: 'topics-overview',
    title: 'AI-Organized Topics',
    content: 'We\'ve analyzed your content and organized it into topics. Review and select which ones to include.',
    target: '[data-tour="topics-list"]'
  },
  {
    id: 'topic-selection',
    title: 'Select Topics',
    content: 'Check the topics you want in your cheat sheet. The page count estimate updates as you select.',
    target: '[data-tour="topic-checkbox"]'
  },
  {
    id: 'topic-editing',
    title: 'Edit Content',
    content: 'Click the edit button to modify topic content while preserving the original meaning.',
    target: '[data-tour="topic-edit"]'
  },
  {
    id: 'page-estimate',
    title: 'Page Count Estimate',
    content: 'This shows how many pages your selected content will need. Adjust selections if needed.',
    target: '[data-tour="page-estimate"]'
  }
]

export const customizationTourSteps: TourStep[] = [
  {
    id: 'page-settings',
    title: 'Page Settings',
    content: 'Customize your cheat sheet layout: page count, size, text size, and columns.',
    target: '[data-tour="page-settings"]'
  },
  {
    id: 'reference-template',
    title: 'Reference Template',
    content: 'Upload an existing cheat sheet to use as a formatting reference for consistent styling.',
    target: '[data-tour="reference-template"]'
  },
  {
    id: 'content-warnings',
    title: 'Content Warnings',
    content: 'We\'ll warn you if content won\'t fit and suggest adjustments like reducing content or increasing pages.',
    target: '[data-tour="content-warnings"]'
  },
  {
    id: 'generate',
    title: 'Generate Your Cheat Sheet',
    content: 'When you\'re ready, click generate to create your personalized study material!',
    target: '[data-tour="generate-button"]'
  }
]

// Tour starter component
interface TourStarterProps {
  tourType: 'upload' | 'topics' | 'customization'
  onStart: (steps: TourStep[]) => void
}

export function TourStarter({ tourType, onStart }: TourStarterProps) {
  const getTourSteps = () => {
    switch (tourType) {
      case 'upload':
        return uploadTourSteps
      case 'topics':
        return topicSelectionTourSteps
      case 'customization':
        return customizationTourSteps
      default:
        return []
    }
  }

  const getTourTitle = () => {
    switch (tourType) {
      case 'upload':
        return 'File Upload Tour'
      case 'topics':
        return 'Topic Selection Tour'
      case 'customization':
        return 'Customization Tour'
      default:
        return 'Guided Tour'
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onStart(getTourSteps())}
      className="gap-2"
    >
      <Play className="h-4 w-4" />
      {getTourTitle()}
    </Button>
  )
}