'use client'

import React, { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface HelpTooltipProps {
  title: string
  content: string
  children?: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

export function HelpTooltip({ 
  title, 
  content, 
  children, 
  placement = 'top',
  size = 'md' 
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            aria-label={`Help: ${title}`}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className={`${sizeClasses[size]} p-0`}
        side={placement}
        align="start"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Predefined help tooltips for common UI elements
export const FileUploadHelp = () => (
  <HelpTooltip
    title="File Upload"
    content={`Supported formats:
• PDF - Text and image extraction
• Word (.docx) - Full document processing  
• PowerPoint (.pptx) - Slide content
• Excel (.xlsx) - Data and tables
• Images (.jpg, .png) - OCR text extraction
• Text (.txt) - Plain text processing

Maximum file size: 50MB per file
Multiple files can be uploaded together.`}
  />
)

export const TopicSelectionHelp = () => (
  <HelpTooltip
    title="Topic Selection"
    content={`Choose which topics to include in your cheat sheet:

• Check/uncheck topics to include/exclude
• Edit topic content by clicking the edit button
• Preview shows estimated page count
• Content is preserved from original sources
• Topics are organized by AI analysis

Tip: Select fewer topics for more detailed coverage, or more topics for broader overview.`}
  />
)

export const PageSettingsHelp = () => (
  <HelpTooltip
    title="Page Settings"
    content={`Customize your cheat sheet layout:

Page Count: 1-10 pages (more pages = more detail)
Page Size: A4, Letter, Legal, A3
Text Size: Small (more content) to Large (more readable)
Columns: 1-3 columns per page

The system will warn you if content doesn't fit and suggest adjustments.`}
  />
)

export const ContentOverflowHelp = () => (
  <HelpTooltip
    title="Content Overflow Warning"
    content={`Your selected content won't fit in the specified page limit.

Options to fix this:
• Increase page count
• Reduce text size  
• Deselect some topics
• Edit topic content to be more concise
• Use larger paper size

The system prioritizes content based on your topic selections.`}
  />
)