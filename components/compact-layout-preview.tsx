"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Eye,
  Layout,
  Columns,
  Type,
  Maximize2,
  Minimize2,
  FileText,
  Calculator,
  BookOpen,
  Zap,
} from "lucide-react"

interface CompactLayoutConfig {
  layout: 'compact' | 'standard';
  columns: 1 | 2 | 3;
  fontSize: string;
  margins: 'narrow' | 'normal' | 'wide';
  paperSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
}

interface CompactLayoutPreviewProps {
  config: CompactLayoutConfig;
  onConfigChange?: (config: CompactLayoutConfig) => void;
}

export function CompactLayoutPreview({ config, onConfigChange }: CompactLayoutPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'print' | 'mobile'>('desktop')
  const [showMathContent, setShowMathContent] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  const handleConfigChange = (key: keyof CompactLayoutConfig, value: string | number) => {
    const newConfig = {
      ...config,
      [key]: value,
    }
    onConfigChange?.(newConfig)
  }

  const getPreviewStyles = () => {
    const baseStyles = {
      fontSize: config.fontSize === '9pt' ? '9px' : 
                 config.fontSize === '10pt' ? '10px' :
                 config.fontSize === '11pt' ? '11px' : '12px',
      lineHeight: config.layout === 'compact' ? '1.15' : '1.25',
      columnCount: config.columns,
      columnGap: config.layout === 'compact' ? '1rem' : '1.5rem',
      padding: config.margins === 'narrow' ? '0.5rem' :
               config.margins === 'normal' ? '1rem' : '1.5rem',
      fontFamily: 'Times, serif'
    }

    if (previewMode === 'print') {
      return {
        ...baseStyles,
        width: config.paperSize === 'a4' ? '210mm' : 
               config.paperSize === 'letter' ? '8.5in' : '8.5in',
        height: config.paperSize === 'a4' ? '297mm' : 
                config.paperSize === 'letter' ? '11in' : '14in',
        transform: config.orientation === 'landscape' ? 'rotate(90deg)' : 'none',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }
    }

    return baseStyles
  }

  const sampleContent = {
    title: "Part I: Discrete Probability",
    sections: [
      {
        number: "1.1",
        title: "Probability Basics",
        content: "The probability of an event A is defined as P(A) = |A|/|S| where S is the sample space. For any event A, we have 0 ≤ P(A) ≤ 1.",
        formula: "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)",
        example: {
          title: "Example 1.1",
          problem: "Find P(A ∪ B) if P(A) = 0.3, P(B) = 0.4, and P(A ∩ B) = 0.1.",
          solution: "P(A ∪ B) = 0.3 + 0.4 - 0.1 = 0.6"
        }
      },
      {
        number: "1.2", 
        title: "Conditional Probability",
        content: "The conditional probability of A given B is P(A|B) = P(A ∩ B)/P(B), provided P(B) > 0.",
        formula: "P(A|B) = P(A ∩ B)/P(B)",
        example: {
          title: "Example 1.2",
          problem: "If P(A ∩ B) = 0.2 and P(B) = 0.5, find P(A|B).",
          solution: "P(A|B) = 0.2/0.5 = 0.4"
        }
      },
      {
        number: "2.1",
        title: "Bayes' Theorem", 
        content: "Bayes' theorem provides a way to update probabilities based on new evidence.",
        formula: "P(A|B) = P(B|A)P(A)/P(B)",
        example: {
          title: "Example 2.1",
          problem: "Medical test accuracy problem with prior probability.",
          solution: "Apply Bayes' theorem step by step..."
        }
      }
    ]
  }

  const renderCompactContent = () => (
    <div 
      className="compact-preview-content"
      style={getPreviewStyles()}
    >
      {/* Title - No card wrapper */}
      <h1 style={{ 
        fontSize: '1.4em', 
        fontWeight: 'bold', 
        marginBottom: config.layout === 'compact' ? '0.5em' : '0.75em',
        textAlign: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '0.25em'
      }}>
        {sampleContent.title}
      </h1>

      {/* Content sections - Continuous flow without cards */}
      {sampleContent.sections.map((section, index) => (
        <div key={index} style={{ 
          marginBottom: config.layout === 'compact' ? '0.75em' : '1em',
          breakInside: 'avoid'
        }}>
          {/* Section heading */}
          <h2 style={{ 
            fontSize: '1.1em', 
            fontWeight: 'bold',
            marginBottom: config.layout === 'compact' ? '0.25em' : '0.5em',
            marginTop: config.layout === 'compact' ? '0.5em' : '0.75em'
          }}>
            {section.number} {section.title}
          </h2>

          {/* Content paragraph */}
          <p style={{ 
            marginBottom: config.layout === 'compact' ? '0.25em' : '0.35em',
            textAlign: 'justify'
          }}>
            {section.content}
          </p>

          {/* Formula - Centered, no box */}
          {showMathContent && (
            <div style={{ 
              textAlign: 'center',
              margin: config.layout === 'compact' ? '0.5em 0' : '0.75em 0',
              fontStyle: 'italic'
            }}>
              {section.formula}
            </div>
          )}

          {/* Example - Inline, no card */}
          <div style={{ 
            marginTop: config.layout === 'compact' ? '0.5em' : '0.75em',
            paddingLeft: '1em',
            borderLeft: '2px solid #ccc'
          }}>
            <strong>{section.example.title}:</strong> {section.example.problem}
            <br />
            <em>Solution:</em> {section.example.solution}
          </div>
        </div>
      ))}

      {/* Cross-reference example */}
      <p style={{ 
        marginTop: config.layout === 'compact' ? '0.5em' : '0.75em',
        fontSize: '0.9em',
        fontStyle: 'italic'
      }}>
        For more complex applications, see Ex. 3.2 and Theorem 2.1.
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-6 w-6 text-green-600" />
          <h2 className="font-serif text-xl font-bold text-green-800">Compact Layout Preview</h2>
        </div>
        <p className="text-green-700 mb-6">
          Preview how your content will appear with compact, academic-style formatting. No card components, dense typography, and continuous text flow.
        </p>

        {/* Preview Controls */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview Mode</Label>
            <Select value={previewMode} onValueChange={(value: any) => setPreviewMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Desktop View</SelectItem>
                <SelectItem value="print">Print Preview</SelectItem>
                <SelectItem value="mobile">Mobile View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Columns</Label>
            <Select 
              value={config.columns.toString()} 
              onValueChange={(value) => handleConfigChange("columns", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Column</SelectItem>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Font Size</Label>
            <Select 
              value={config.fontSize} 
              onValueChange={(value) => handleConfigChange("fontSize", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9pt">9pt</SelectItem>
                <SelectItem value="10pt">10pt</SelectItem>
                <SelectItem value="11pt">11pt</SelectItem>
                <SelectItem value="12pt">12pt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Layout</Label>
            <Select 
              value={config.layout} 
              onValueChange={(value) => handleConfigChange("layout", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Button
            variant={showMathContent ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMathContent(!showMathContent)}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {showMathContent ? 'Hide' : 'Show'} Math Content
          </Button>
          <Button
            variant={fullscreen ? "default" : "outline"}
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
            className="gap-2"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {fullscreen ? 'Exit' : 'Enter'} Fullscreen
          </Button>
        </div>

        {/* Preview Area */}
        <div className={`border border-green-300 rounded-lg overflow-hidden ${fullscreen ? 'fixed inset-4 z-50 bg-white' : ''}`}>
          <div className="bg-green-100 px-4 py-2 border-b border-green-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-green-700" />
              <span className="font-semibold text-sm text-green-800">
                {config.layout} Layout • {config.columns} Column{config.columns > 1 ? 's' : ''} • {config.fontSize}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                No Cards
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Dense Typography
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Academic Style
              </Badge>
            </div>
          </div>
          
          <div className={`bg-white overflow-auto ${fullscreen ? 'h-full' : 'h-96'}`}>
            <div className="p-4">
              {renderCompactContent()}
            </div>
          </div>
        </div>

        {/* Layout Information */}
        <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-4 rounded border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Type className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-green-800">Typography</h4>
            </div>
            <ul className="space-y-1 text-green-700">
              <li>• Font: Times serif</li>
              <li>• Size: {config.fontSize}</li>
              <li>• Line height: {config.layout === 'compact' ? '1.15' : '1.25'}</li>
              <li>• Margins: {config.margins}</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Columns className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-green-800">Layout</h4>
            </div>
            <ul className="space-y-1 text-green-700">
              <li>• {config.columns} column{config.columns > 1 ? 's' : ''}</li>
              <li>• {config.layout} spacing</li>
              <li>• Continuous flow</li>
              <li>• No card components</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-green-800">Features</h4>
            </div>
            <ul className="space-y-1 text-green-700">
              <li>• Mathematical formulas</li>
              <li>• Worked examples</li>
              <li>• Cross-references</li>
              <li>• Academic numbering</li>
            </ul>
          </div>
        </div>

        {/* Comparison Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Compact vs. Standard Comparison</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-700 mb-1">Traditional Card Layout:</h5>
              <ul className="text-blue-600 space-y-1">
                <li>• Boxed sections with borders</li>
                <li>• Large spacing between elements</li>
                <li>• UI-focused design</li>
                <li>• Lower content density</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-green-700 mb-1">Compact Academic Layout:</h5>
              <ul className="text-green-600 space-y-1">
                <li>• Continuous text flow</li>
                <li>• Minimal spacing</li>
                <li>• Print-optimized design</li>
                <li>• Maximum content density</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .compact-preview-content {
          column-fill: balance;
          text-align: justify;
          hyphens: auto;
        }
        
        .compact-preview-content h1,
        .compact-preview-content h2,
        .compact-preview-content h3 {
          break-after: avoid;
        }
        
        .compact-preview-content p {
          orphans: 2;
          widows: 2;
        }
        
        @media print {
          .compact-preview-content {
            column-gap: 1cm;
          }
        }
      `}</style>
    </div>
  )
}