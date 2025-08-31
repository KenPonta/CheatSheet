import React from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface HelpTooltipProps {
  content: string
  title?: string
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function HelpTooltip({ 
  content, 
  title, 
  className = '', 
  side = 'top',
  align = 'center'
}: HelpTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
          aria-label="Help information"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        align={align}
        className="w-80 p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg"
      >
        {title && (
          <div className="font-semibold text-gray-900 mb-2">
            {title}
          </div>
        )}
        <div className="text-gray-700 leading-relaxed">
          {content}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Priority-specific help tooltips
export const PriorityHelpTooltips = {
  topicPriority: (
    <HelpTooltip
      title="Topic Priority"
      content="Set the importance level for this topic. High priority topics are always included, medium priority topics are included when space allows, and low priority topics fill remaining space."
    />
  ),
  
  subtopicPriority: (
    <HelpTooltip
      title="Subtopic Priority"
      content="Override the topic's priority for individual subtopics. This gives you granular control over which specific content is most important."
    />
  ),
  
  autoFill: (
    <HelpTooltip
      title="Auto-Fill Content"
      content="Automatically select topics and subtopics based on their priorities and available space. High priority items are selected first, followed by medium and low priority items until optimal space utilization is reached."
    />
  ),
  
  priorityLevels: (
    <HelpTooltip
      title="Priority Levels"
      content="High: Essential content that must be included. Medium: Important content included when space allows. Low: Optional content used to fill remaining space efficiently."
    />
  )
}

// Space optimization help tooltips
export const SpaceOptimizationHelpTooltips = {
  spaceUtilization: (
    <HelpTooltip
      title="Space Utilization"
      content="Shows how much of your available page space is being used. Optimal range is 80-95%. Green indicates good utilization, yellow warns of potential issues, red indicates overflow."
    />
  ),
  
  availableSpace: (
    <HelpTooltip
      title="Available Space"
      content="Total space calculated based on your page count, size, orientation, and formatting settings. This is the maximum content that can fit in your cheat sheet."
    />
  ),
  
  contentSpace: (
    <HelpTooltip
      title="Content Space"
      content="Space required by your currently selected topics and subtopics, including text, images, and formatting overhead."
    />
  ),
  
  spaceSuggestions: (
    <HelpTooltip
      title="Space Suggestions"
      content="Intelligent recommendations to optimize your space usage. Suggestions include adding content when space is available or reducing content when over capacity."
    />
  ),
  
  overflowWarning: (
    <HelpTooltip
      title="Content Overflow"
      content="Your selected content exceeds available space. Consider removing lower-priority items, increasing page count, or adjusting formatting settings."
    />
  ),
  
  underUtilization: (
    <HelpTooltip
      title="Space Under-Utilization"
      content="You have unused space available. Consider adding more topics, expanding existing content, or including additional subtopics to make better use of your pages."
    />
  ),
  
  optimalUtilization: (
    <HelpTooltip
      title="Optimal Space Usage"
      content="Your content selection efficiently uses available space (80-95% utilization). This provides good information density while maintaining readability."
    />
  )
}

// Reference format help tooltips
export const ReferenceFormatHelpTooltips = {
  referenceAnalysis: (
    <HelpTooltip
      title="Reference Format Analysis"
      content="Upload a reference cheat sheet to analyze its visual layout, typography, spacing, and organization patterns. Your content will be formatted to match the reference style."
    />
  ),
  
  contentDensity: (
    <HelpTooltip
      title="Content Density Matching"
      content="The system adjusts topic selection and content length to match your reference's information density, ensuring similar visual balance and readability."
    />
  ),
  
  visualElements: (
    <HelpTooltip
      title="Visual Element Extraction"
      content="Automatically detects headers, bullet styles, spacing patterns, colors, and font hierarchy from your reference to recreate the same visual appearance."
    />
  ),
  
  formatApplication: (
    <HelpTooltip
      title="Format Application"
      content="Applies the analyzed reference formatting to your content while preserving the original meaning and organization of your material."
    />
  )
}

// General help tooltips
export const GeneralHelpTooltips = {
  preview: (
    <HelpTooltip
      title="Content Preview"
      content="See how your cheat sheet will look before final generation. Preview updates in real-time as you make changes to topic selection and formatting."
    />
  ),
  
  contentFidelity: (
    <HelpTooltip
      title="Content Fidelity"
      content="The system preserves your original wording and terminology. Content is condensed by removing redundant words while maintaining meaning and technical accuracy."
    />
  ),
  
  topicExtraction: (
    <HelpTooltip
      title="Topic Extraction"
      content="AI analyzes your uploaded files to identify and organize content into topics and subtopics, considering available space and reference formatting patterns."
    />
  )
}