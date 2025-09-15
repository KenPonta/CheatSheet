"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Terminal,
  Copy,
  CheckCircle,
  Settings,
  Code,
  Download,
  FileText,
  Zap,
} from "lucide-react"

interface CLIConfig {
  layout: 'compact' | 'standard';
  columns: 1 | 2 | 3;
  equations: 'all' | 'key' | 'minimal';
  examples: 'full' | 'summary' | 'references';
  answers: 'inline' | 'appendix' | 'separate';
  fontSize: string;
  margins: 'narrow' | 'normal' | 'wide';
  outputFormat: 'html' | 'pdf' | 'markdown' | 'all';
  paperSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  title?: string;
}

interface CLIConfigInterfaceProps {
  onConfigChange?: (config: CLIConfig) => void;
  initialConfig?: Partial<CLIConfig>;
}

export function CLIConfigInterface({ onConfigChange, initialConfig }: CLIConfigInterfaceProps) {
  const [config, setConfig] = useState<CLIConfig>({
    layout: 'compact',
    columns: 2,
    equations: 'all',
    examples: 'full',
    answers: 'inline',
    fontSize: '10pt',
    margins: 'narrow',
    outputFormat: 'html',
    paperSize: 'a4',
    orientation: 'portrait',
    title: 'Compact Study Guide',
    ...initialConfig
  })

  const [showCLICommand, setShowCLICommand] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleConfigChange = (key: keyof CLIConfig, value: string | number) => {
    const newConfig = {
      ...config,
      [key]: value,
    }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }

  const generateCLICommand = () => {
    const flags = []
    
    // Layout flags
    flags.push(`--layout=${config.layout}`)
    flags.push(`--columns=${config.columns}`)
    flags.push(`--equations=${config.equations}`)
    flags.push(`--examples=${config.examples}`)
    flags.push(`--answers=${config.answers}`)
    flags.push(`--font-size=${config.fontSize}`)
    flags.push(`--margins=${config.margins}`)
    flags.push(`--output-format=${config.outputFormat}`)
    
    // Paper settings
    if (config.paperSize) {
      flags.push(`--paper-size=${config.paperSize}`)
    }
    if (config.orientation) {
      flags.push(`--orientation=${config.orientation}`)
    }
    if (config.title && config.title !== 'Compact Study Guide') {
      flags.push(`--title="${config.title}"`)
    }

    return `compact-study-generator ${flags.join(' ')} input.pdf`
  }

  const copyToClipboard = async () => {
    const command = generateCLICommand()
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const downloadConfigFile = () => {
    const configFile = {
      compactStudyGenerator: {
        defaults: config,
        description: "Configuration for compact study generator CLI tool"
      }
    }
    
    const blob = new Blob([JSON.stringify(configFile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compact-study.config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="h-6 w-6 text-gray-700" />
          <h2 className="font-serif text-xl font-bold text-gray-800">CLI Configuration Interface</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Configure settings for the compact study generator CLI tool. Generate command-line flags or export configuration files.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Layout Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 border-b border-gray-300 pb-2">Layout Configuration</h3>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">--layout</Label>
              <RadioGroup
                value={config.layout}
                onValueChange={(value) => handleConfigChange("layout", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="cli-compact" />
                  <Label htmlFor="cli-compact" className="text-sm">compact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="standard" id="cli-standard" />
                  <Label htmlFor="cli-standard" className="text-sm">standard</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">--columns</Label>
              <Select
                value={config.columns.toString()}
                onValueChange={(value) => handleConfigChange("columns", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">--font-size</Label>
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

            <div className="space-y-3">
              <Label className="text-sm font-medium">--margins</Label>
              <RadioGroup
                value={config.margins}
                onValueChange={(value) => handleConfigChange("margins", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="narrow" id="cli-narrow" />
                  <Label htmlFor="cli-narrow" className="text-sm">narrow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="cli-normal" />
                  <Label htmlFor="cli-normal" className="text-sm">normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wide" id="cli-wide" />
                  <Label htmlFor="cli-wide" className="text-sm">wide</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Content Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 border-b border-gray-300 pb-2">Content Configuration</h3>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">--equations</Label>
              <Select
                value={config.equations}
                onValueChange={(value) => handleConfigChange("equations", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  <SelectItem value="key">key</SelectItem>
                  <SelectItem value="minimal">minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">--examples</Label>
              <Select
                value={config.examples}
                onValueChange={(value) => handleConfigChange("examples", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">full</SelectItem>
                  <SelectItem value="summary">summary</SelectItem>
                  <SelectItem value="references">references</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">--answers</Label>
              <Select
                value={config.answers}
                onValueChange={(value) => handleConfigChange("answers", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">inline</SelectItem>
                  <SelectItem value="appendix">appendix</SelectItem>
                  <SelectItem value="separate">separate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">--output-format</Label>
              <Select
                value={config.outputFormat}
                onValueChange={(value) => handleConfigChange("outputFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">html</SelectItem>
                  <SelectItem value="pdf">pdf</SelectItem>
                  <SelectItem value="markdown">markdown</SelectItem>
                  <SelectItem value="all">all</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Paper Settings */}
        <div className="mt-6 pt-4 border-t border-gray-300">
          <h3 className="font-semibold text-gray-800 mb-4">Paper & Document Settings</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">--paper-size</Label>
              <Select
                value={config.paperSize}
                onValueChange={(value) => handleConfigChange("paperSize", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">a4</SelectItem>
                  <SelectItem value="letter">letter</SelectItem>
                  <SelectItem value="legal">legal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">--orientation</Label>
              <RadioGroup
                value={config.orientation}
                onValueChange={(value) => handleConfigChange("orientation", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="portrait" id="cli-portrait" />
                  <Label htmlFor="cli-portrait" className="text-sm">portrait</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="landscape" id="cli-landscape" />
                  <Label htmlFor="cli-landscape" className="text-sm">landscape</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="cli-title" className="text-sm font-medium">--title</Label>
              <input
                id="cli-title"
                type="text"
                value={config.title || ''}
                onChange={(e) => handleConfigChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Compact Study Guide"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-300 flex flex-wrap gap-3 justify-center">
          <Button 
            onClick={() => setShowCLICommand(!showCLICommand)} 
            variant="outline" 
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            {showCLICommand ? 'Hide' : 'Show'} CLI Command
          </Button>
          <Button onClick={downloadConfigFile} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Config File
          </Button>
        </div>

        {/* CLI Command Display */}
        {showCLICommand && (
          <div className="mt-6 pt-4 border-t border-gray-300">
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Generated CLI Command:</span>
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="sm"
                  className="text-green-400 hover:text-green-300 hover:bg-gray-800"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="break-all">
                <span className="text-blue-400">$</span> {generateCLICommand()}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <h4 className="font-medium mb-2">Usage Instructions:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Replace <code className="bg-gray-200 px-1 rounded">input.pdf</code> with your actual file path</li>
                <li>Multiple files can be specified: <code className="bg-gray-200 px-1 rounded">file1.pdf file2.pdf</code></li>
                <li>Use <code className="bg-gray-200 px-1 rounded">--help</code> flag to see all available options</li>
                <li>Configuration files can be used with <code className="bg-gray-200 px-1 rounded">--config=compact-study.config.json</code></li>
              </ul>
            </div>
          </div>
        )}

        {/* Configuration Preview */}
        <div className="mt-6 pt-4 border-t border-gray-300">
          <h4 className="font-medium text-gray-800 mb-3">Current Configuration Summary</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {config.layout} layout
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {config.columns} columns
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {config.fontSize} font
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {config.margins} margins
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {config.equations} equations
            </Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {config.examples} examples
            </Badge>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {config.outputFormat} output
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}