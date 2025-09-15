"use client"

import { useState } from 'react'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, FileText, Settings, Zap } from 'lucide-react'

interface TroubleshootingPanelProps {
  error?: string
  onRetry?: () => void
  onConfigChange?: (config: any) => void
}

export function TroubleshootingPanel({ error, onRetry, onConfigChange }: TroubleshootingPanelProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'healthy' | 'error'>('unknown')

  const testConnection = async () => {
    setIsTestingConnection(true)
    try {
      const response = await fetch('/api/generate-compact-study/test')
      const data = await response.json()
      setConnectionStatus(data.status === 'healthy' ? 'healthy' : 'error')
    } catch (err) {
      setConnectionStatus('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const commonSolutions = [
    {
      icon: FileText,
      title: "Check File Format",
      description: "Ensure you're uploading PDF files only (max 50MB each)",
      action: "Use PDF files with text content, not scanned images"
    },
    {
      icon: Settings,
      title: "Try Simpler Configuration",
      description: "Start with basic settings and add complexity gradually",
      action: () => onConfigChange?.({
        layout: 'compact',
        columns: 2,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '10pt',
        margins: 'narrow',
        outputFormat: 'html'
      })
    },
    {
      icon: Zap,
      title: "Reduce File Count",
      description: "Try processing fewer files at once",
      action: "Start with 1-2 files to test the system"
    }
  ]

  const getErrorCategory = (errorMessage: string) => {
    if (errorMessage.includes('file') || errorMessage.includes('upload')) {
      return 'file'
    }
    if (errorMessage.includes('config') || errorMessage.includes('validation')) {
      return 'config'
    }
    if (errorMessage.includes('processing') || errorMessage.includes('pipeline')) {
      return 'processing'
    }
    return 'unknown'
  }

  const getSpecificSuggestions = (errorMessage: string) => {
    const category = getErrorCategory(errorMessage)
    
    switch (category) {
      case 'file':
        return [
          "Check that all files are valid PDFs",
          "Ensure files are under 50MB each",
          "Verify files contain text (not just images)",
          "Try uploading files one at a time"
        ]
      case 'config':
        return [
          "Use valid configuration options",
          "Try the default configuration first",
          "Check that all required fields are provided",
          "Ensure output format is 'html', 'pdf', 'markdown', or 'all'"
        ]
      case 'processing':
        return [
          "Check that PDFs contain mathematical content",
          "Ensure formulas use standard notation (P(A), E[X], etc.)",
          "Try simpler content first",
          "Enable error recovery in configuration"
        ]
      default:
        return [
          "Test the connection to the service",
          "Try refreshing the page",
          "Check your internet connection",
          "Contact support if the issue persists"
        ]
    }
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <h3 className="text-lg font-semibold text-red-800">Processing Error</h3>
      </div>

      {error && (
        <div className="bg-white border border-red-200 rounded p-3">
          <p className="text-sm text-red-700 font-mono">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-red-800">System Status</h4>
          <button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        {connectionStatus !== 'unknown' && (
          <div className="flex items-center space-x-2">
            {connectionStatus === 'healthy' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">Service is healthy</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">Service connection failed</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-red-800">Quick Solutions</h4>
        <div className="grid gap-3">
          {commonSolutions.map((solution, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-white border border-red-100 rounded">
              <solution.icon className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-red-800">{solution.title}</h5>
                <p className="text-sm text-red-600">{solution.description}</p>
                {typeof solution.action === 'function' ? (
                  <button
                    onClick={solution.action}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Apply Default Settings
                  </button>
                ) : (
                  <p className="mt-1 text-xs text-red-500">{solution.action}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="space-y-3">
          <h4 className="font-medium text-red-800">Specific Suggestions</h4>
          <ul className="space-y-1">
            {getSpecificSuggestions(error).map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-red-500 mt-1">•</span>
                <span className="text-sm text-red-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-3 pt-4 border-t border-red-200">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
        <button
          onClick={() => window.open('/api/generate-compact-study/test', '_blank')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Test Service
        </button>
      </div>

      <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
        <strong>Note:</strong> The system includes automatic fallback processing. Even if some advanced features fail, 
        basic document generation should still work. If you continue to experience issues, try the troubleshooting 
        steps above or contact support.
      </div>
    </div>
  )
}