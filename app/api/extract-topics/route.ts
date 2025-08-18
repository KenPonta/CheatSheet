import { type NextRequest, NextResponse } from "next/server"

// Mock topic extraction function - in a real app, this would use AI/ML services
function extractTopicsFromText(
  text: string,
  fileName: string,
): { topic: string; content: string; confidence: number }[] {
  // Simple keyword-based topic extraction for demo purposes
  const topics = []

  // Common academic/professional topics
  const topicPatterns = [
    { pattern: /\b(introduction|overview|summary)\b/gi, topic: "Introduction & Overview" },
    { pattern: /\b(method|methodology|approach|process)\b/gi, topic: "Methods & Processes" },
    { pattern: /\b(result|finding|outcome|conclusion)\b/gi, topic: "Results & Conclusions" },
    { pattern: /\b(definition|concept|theory|principle)\b/gi, topic: "Key Concepts & Definitions" },
    { pattern: /\b(formula|equation|calculation|math)\b/gi, topic: "Formulas & Calculations" },
    { pattern: /\b(example|case study|illustration)\b/gi, topic: "Examples & Case Studies" },
    { pattern: /\b(advantage|benefit|pro|strength)\b/gi, topic: "Advantages & Benefits" },
    { pattern: /\b(disadvantage|limitation|con|weakness)\b/gi, topic: "Limitations & Challenges" },
    { pattern: /\b(step|procedure|instruction|guide)\b/gi, topic: "Steps & Procedures" },
    { pattern: /\b(important|key|critical|essential)\b/gi, topic: "Key Points" },
  ]

  // Extract topics based on patterns
  topicPatterns.forEach(({ pattern, topic }) => {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      const sentences = text.split(/[.!?]+/).filter((sentence) => pattern.test(sentence) && sentence.trim().length > 20)

      if (sentences.length > 0) {
        topics.push({
          topic,
          content: sentences.slice(0, 3).join(". ").trim() + ".",
          confidence: Math.min(0.9, 0.3 + matches.length * 0.1),
        })
      }
    }
  })

  // If no specific topics found, create generic ones based on content length
  if (topics.length === 0) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10)
    if (sentences.length > 0) {
      topics.push({
        topic: `Main Content from ${fileName}`,
        content: sentences.slice(0, 5).join(". ").trim() + ".",
        confidence: 0.7,
      })
    }
  }

  return topics.slice(0, 8) // Limit to 8 topics max
}

function extractTopicsFromFileName(fileName: string): { topic: string; content: string; confidence: number }[] {
  // Extract potential topics from file name
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "")
  const words = nameWithoutExt.split(/[-_\s]+/).filter((word) => word.length > 2)

  if (words.length > 0) {
    return [
      {
        topic: `File Overview: ${words.join(" ")}`,
        content: `This document appears to cover topics related to: ${words.join(", ")}.`,
        confidence: 0.5,
      },
    ]
  }

  return []
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const allTopics: { topic: string; content: string; confidence: number; source: string }[] = []

    for (const file of files) {
      let extractedTopics: { topic: string; content: string; confidence: number }[] = []

      if (file.type === "text/plain") {
        // Handle text files
        const text = await file.text()
        extractedTopics = extractTopicsFromText(text, file.name)
      } else if (file.type === "application/pdf") {
        // Mock PDF processing - in real app, would use PDF parsing library
        extractedTopics = [
          {
            topic: "PDF Document Analysis",
            content: "This PDF document contains structured information that can be extracted for study purposes.",
            confidence: 0.8,
          },
          ...extractTopicsFromFileName(file.name),
        ]
      } else if (file.type.includes("word") || file.type.includes("document")) {
        // Mock Word document processing
        extractedTopics = [
          {
            topic: "Document Structure",
            content:
              "This Word document contains formatted text with headings, paragraphs, and potentially tables or lists.",
            confidence: 0.8,
          },
          ...extractTopicsFromFileName(file.name),
        ]
      } else if (file.type.includes("presentation") || file.type.includes("powerpoint")) {
        // Mock PowerPoint processing
        extractedTopics = [
          {
            topic: "Presentation Slides",
            content:
              "This presentation contains slides with key points, bullet lists, and visual elements for learning.",
            confidence: 0.8,
          },
          ...extractTopicsFromFileName(file.name),
        ]
      } else if (file.type.startsWith("image/")) {
        // Mock image processing - in real app, would use OCR
        extractedTopics = [
          {
            topic: "Visual Content",
            content:
              "This image may contain text, diagrams, or visual information that can be extracted for study purposes.",
            confidence: 0.6,
          },
          ...extractTopicsFromFileName(file.name),
        ]
      } else {
        // Fallback for unknown file types
        extractedTopics = extractTopicsFromFileName(file.name)
      }

      // Add source information and add to all topics
      extractedTopics.forEach((topic) => {
        allTopics.push({
          ...topic,
          source: file.name,
        })
      })
    }

    // Remove duplicates and sort by confidence
    const uniqueTopics = allTopics
      .filter((topic, index, self) => index === self.findIndex((t) => t.topic === topic.topic))
      .sort((a, b) => b.confidence - a.confidence)

    return NextResponse.json({
      topics: uniqueTopics,
      totalFiles: files.length,
      message: `Successfully extracted ${uniqueTopics.length} topics from ${files.length} file(s)`,
    })
  } catch (error) {
    console.error("Topic extraction error:", error)
    return NextResponse.json({ error: "Failed to extract topics from files" }, { status: 500 })
  }
}
