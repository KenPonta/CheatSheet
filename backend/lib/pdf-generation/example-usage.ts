import { pdfGenerator } from './pdf-generator'
import { GenerationRequest, CheatSheetTopic, CheatSheetConfig } from './types'

/**
 * Example usage of the enhanced PDF generation system
 * This demonstrates the key features implemented in task 13
 */

export async function examplePDFGeneration() {
  // Example topics with various content types
  const topics: CheatSheetTopic[] = [
    {
      id: 'math-formulas',
      topic: 'Mathematical Formulas',
      content: 'Quadratic Formula: x = (-b ± √(b²-4ac)) / 2a\nPythagorean Theorem: a² + b² = c²',
      priority: 3, // High priority
      images: [
        {
          id: 'formula-diagram',
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIj48dGV4dCB4PSIxMCIgeT0iMzAiPkZvcm11bGE8L3RleHQ+PC9zdmc+',
          alt: 'Formula diagram',
          caption: 'Visual representation of the quadratic formula',
          isRecreated: true
        }
      ]
    },
    {
      id: 'physics-concepts',
      topic: 'Physics Concepts',
      content: 'Newton\'s Laws:\n1. Object at rest stays at rest\n2. F = ma\n3. Equal and opposite reactions',
      priority: 2 // Medium priority
    },
    {
      id: 'chemistry-elements',
      topic: 'Chemical Elements',
      content: 'H - Hydrogen (1)\nHe - Helium (2)\nLi - Lithium (3)\nBe - Beryllium (4)',
      priority: 1 // Low priority
    }
  ]

  // Configuration for A4 portrait with advanced features
  const config: CheatSheetConfig = {
    paperSize: 'a4',
    orientation: 'portrait',
    columns: 2,
    fontSize: 'medium',
    pageCount: 2,
    includeHeaders: true,
    includeFooters: true,
    customStyles: `
      .priority-high .topic-title {
        background: linear-gradient(90deg, #059669, #10b981);
        color: white;
        padding: 2mm;
        border-radius: 2mm;
      }
      
      .priority-medium .topic-title {
        background: #fbbf24;
        color: #92400e;
      }
    `
  }

  // Generation request
  const request: GenerationRequest = {
    topics,
    config,
    title: 'Science Study Guide',
    subtitle: 'Mathematics, Physics & Chemistry',
    referenceText: 'Remember to practice these formulas regularly and understand the underlying concepts.'
  }

  try {
    console.log('Generating PDF with advanced features...')
    
    // Generate PDF with all enhancements
    const result = await pdfGenerator.generatePDF(request)
    
    console.log('Generation completed!')
    console.log(`Success: ${result.success}`)
    console.log(`Page count: ${result.pageCount}`)
    console.log(`Content utilization: ${(result.contentFit.contentUtilization * 100).toFixed(1)}%`)
    
    if (result.warnings.length > 0) {
      console.log('Warnings:')
      result.warnings.forEach(warning => {
        console.log(`  - ${warning.type} (${warning.severity}): ${warning.message}`)
      })
    }
    
    if (result.pdf) {
      console.log(`PDF generated successfully (${result.pdf.length} bytes)`)
      // In a real application, you would save this to a file or send it to the client
      // fs.writeFileSync('cheat-sheet.pdf', result.pdf)
    }
    
    return result
    
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  } finally {
    // Always cleanup resources
    await pdfGenerator.cleanup()
  }
}

/**
 * Example of HTML-only generation for faster preview
 */
export async function exampleHTMLGeneration() {
  const topics: CheatSheetTopic[] = [
    {
      id: 'quick-reference',
      topic: 'Quick Reference',
      content: 'Key points for quick review'
    }
  ]

  const config: CheatSheetConfig = {
    paperSize: 'letter',
    orientation: 'landscape',
    columns: 3,
    fontSize: 'small'
  }

  const request: GenerationRequest = {
    topics,
    config,
    title: 'Quick Reference Sheet'
  }

  const result = await pdfGenerator.generateHTMLOnly(request)
  
  console.log('HTML generated for preview')
  console.log(`Estimated pages: ${result.contentFit.estimatedPages}`)
  
  return result.html
}

/**
 * Example demonstrating content overflow handling
 */
export async function exampleOverflowHandling() {
  // Create content that will definitely overflow
  const largeTopics: CheatSheetTopic[] = Array.from({ length: 20 }, (_, i) => ({
    id: `topic-${i}`,
    topic: `Topic ${i + 1}`,
    content: `This is a very detailed explanation of topic ${i + 1}. `.repeat(50)
  }))

  const config: CheatSheetConfig = {
    paperSize: 'a4',
    orientation: 'portrait',
    columns: 1,
    fontSize: 'large',
    pageCount: 1 // Intentionally too small
  }

  const request: GenerationRequest = {
    topics: largeTopics,
    config,
    title: 'Overflow Example'
  }

  const result = await pdfGenerator.generateHTMLOnly(request)
  
  console.log('Overflow analysis:')
  console.log(`Estimated pages needed: ${result.contentFit.estimatedPages}`)
  console.log(`Content that won't fit: ${result.contentFit.overflowContent}`)
  
  const overflowWarning = result.warnings.find(w => w.type === 'overflow')
  if (overflowWarning) {
    console.log(`Warning: ${overflowWarning.message}`)
    console.log('Suggestions:', overflowWarning.suggestions)
  }
  
  return result
}

// Export for use in other parts of the application
export {
  pdfGenerator,
  type GenerationRequest,
  type CheatSheetTopic,
  type CheatSheetConfig
}