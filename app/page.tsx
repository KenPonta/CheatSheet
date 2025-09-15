"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { FloatingHelpButton } from "@/components/help/help-system"
import { CompactStudyGenerator } from "@/components/compact-study-generator"
import {
  BookOpen,
} from "lucide-react"

export default function CheeseSheetApp() {

  return (
    <div className="min-h-screen bg-background">
      <FloatingHelpButton workflowStage="upload" />
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img src="/B1.png" alt="CheeseSheet Logo" className="h-10 w-10" />
                <div>
                  <h1 className="font-serif text-3xl font-bold text-foreground">CheeseSheet</h1>
                  <p className="text-muted-foreground mt-1">Transform your documents into optimized compact study materials</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Compact Study Generator</h2>
            </div>
            <CompactStudyGenerator />
          </div>
        </div>
      </main>
    </div>
  )
}
