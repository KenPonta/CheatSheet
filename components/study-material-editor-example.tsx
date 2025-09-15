"use client"

import React, { useState } from 'react'
import { StudyMaterialEditor } from './study-material-editor'

// Example usage of the StudyMaterialEditor component
export function StudyMaterialEditorExample() {
  const [savedMaterials, setSavedMaterials] = useState<any[]>([])

  // Example initial material
  const exampleMaterial = {
    id: 'example-material-1',
    title: 'Quadratic Equations Study Guide',
    sections: [
      {
        id: 'section-1',
        type: 'text' as const,
        content: 'Quadratic equations are polynomial equations of degree 2. They have the general form ax² + bx + c = 0, where a ≠ 0.',
        order: 0,
        editable: true
      },
      {
        id: 'section-2',
        type: 'equation' as const,
        content: 'x = (-b ± √(b² - 4ac)) / 2a',
        order: 1,
        editable: true
      },
      {
        id: 'section-3',
        type: 'example' as const,
        content: 'Example: Solve x² - 5x + 6 = 0\n\nUsing the quadratic formula:\na = 1, b = -5, c = 6\n\nx = (5 ± √(25 - 24)) / 2\nx = (5 ± 1) / 2\n\nSolutions: x = 3 or x = 2',
        order: 2,
        editable: true
      },
      {
        id: 'section-4',
        type: 'list' as const,
        content: '• Always check if a ≠ 0\n• Calculate the discriminant (b² - 4ac)\n• If discriminant > 0: two real solutions\n• If discriminant = 0: one real solution\n• If discriminant < 0: no real solutions',
        order: 3,
        editable: true
      }
    ],
    images: [
      {
        id: 'image-1',
        type: 'generated' as const,
        source: {
          type: 'equation' as const,
          content: 'quadratic formula visualization',
          context: 'algebra'
        },
        editable: true,
        regenerationOptions: {
          availableStyles: [{
            lineWeight: 'medium' as const,
            colorScheme: 'monochrome' as const,
            layout: 'horizontal' as const,
            annotations: true
          }],
          contentHints: ['formula', 'mathematical notation'],
          contextOptions: ['algebra', 'mathematics']
        },
        url: '/placeholder.svg',
        alt: 'Quadratic formula visualization'
      },
      {
        id: 'image-2',
        type: 'generated' as const,
        source: {
          type: 'concept' as const,
          content: 'parabola graph showing roots',
          context: 'graphing'
        },
        editable: true,
        regenerationOptions: {
          availableStyles: [{
            lineWeight: 'thin' as const,
            colorScheme: 'minimal-color' as const,
            layout: 'vertical' as const,
            annotations: true
          }],
          contentHints: ['graph', 'parabola', 'roots'],
          contextOptions: ['graphing', 'coordinate plane']
        },
        url: '/placeholder.svg',
        alt: 'Parabola graph showing quadratic roots'
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: 1
    }
  }

  // Handle saving the study material
  const handleSave = async (material: any) => {
    try {
      // In a real application, this would save to a backend
      console.log('Saving material:', material)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state
      setSavedMaterials(prev => {
        const existingIndex = prev.findIndex(m => m.id === material.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = material
          return updated
        } else {
          return [...prev, material]
        }
      })
      
      alert('Study material saved successfully!')
    } catch (error) {
      console.error('Failed to save material:', error)
      alert('Failed to save study material. Please try again.')
    }
  }

  // Handle exporting the study material
  const handleExport = async (format: 'pdf' | 'html' | 'markdown') => {
    try {
      console.log(`Exporting as ${format}...`)
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real application, this would generate and download the file
      const mockContent = `Mock ${format.toUpperCase()} content for study material`
      
      // Create a mock download
      const blob = new Blob([mockContent], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/plain' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `study-material.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      return mockContent
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Study Material Editor</h1>
          <p className="text-muted-foreground">
            Create and edit your study materials with drag-and-drop sections and enhanced images.
          </p>
        </div>

        <StudyMaterialEditor
          initialMaterial={exampleMaterial}
          onSave={handleSave}
          onExport={handleExport}
        />

        {savedMaterials.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Saved Materials</h2>
            <div className="grid gap-4">
              {savedMaterials.map((material) => (
                <div key={material.id} className="p-4 border rounded-lg">
                  <h3 className="font-semibold">{material.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {material.sections.length} sections, {material.images.length} images
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last modified: {new Date(material.metadata.lastModified).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudyMaterialEditorExample