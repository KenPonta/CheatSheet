'use client'

import React, { useState, useEffect } from 'react'
import { HelpCircle, Book, MessageCircle, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { GuidedTour, TourStarter, uploadTourSteps, topicSelectionTourSteps, customizationTourSteps } from './guided-tour'
import { ContextualHelp, useContextualHelp } from './contextual-help'

interface HelpSystemProps {
  workflowStage?: 'upload' | 'processing' | 'topics' | 'customization' | 'generation'
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category: 'general' | 'upload' | 'processing' | 'topics' | 'customization' | 'troubleshooting'
  tags: string[]
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'What file formats are supported?',
    answer: 'We support PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), images (.jpg, .png, .gif, .bmp), and plain text (.txt) files. Legacy formats like .doc, .ppt, and .xls need to be converted to newer formats.',
    category: 'upload',
    tags: ['formats', 'upload', 'files']
  },
  {
    id: '2',
    question: 'Why is my file taking so long to process?',
    answer: 'Processing time depends on file size, complexity, and content type. Large files with many images or scanned documents take longer due to OCR processing. Files over 20MB or with 50+ pages may take 5-15 minutes.',
    category: 'processing',
    tags: ['slow', 'processing', 'time', 'ocr']
  },
  {
    id: '3',
    question: 'How accurate is the OCR text extraction?',
    answer: 'OCR accuracy depends on image quality. High-resolution images (300+ DPI) with good contrast typically achieve 95%+ accuracy. Handwritten text and poor-quality scans may have lower accuracy and should be reviewed.',
    category: 'processing',
    tags: ['ocr', 'accuracy', 'images', 'text']
  },
  {
    id: '4',
    question: 'Can I edit the extracted content?',
    answer: 'Yes! In the topic selection phase, you can edit any extracted content while preserving the original meaning. Click the edit button next to any topic to modify its content.',
    category: 'topics',
    tags: ['edit', 'content', 'topics', 'modify']
  },
  {
    id: '5',
    question: 'What should I do if content doesn\'t fit on my specified pages?',
    answer: 'You have several options: increase the page count, reduce text size, deselect some topics, edit content to be more concise, or use a larger paper size. The system will suggest the best approach.',
    category: 'customization',
    tags: ['overflow', 'pages', 'fit', 'content']
  },
  {
    id: '6',
    question: 'How do reference templates work?',
    answer: 'Upload an existing cheat sheet as a reference, and our AI will analyze its layout, formatting, and structure to apply similar styling to your content. This helps maintain consistency across your study materials.',
    category: 'customization',
    tags: ['template', 'reference', 'formatting', 'style']
  },
  {
    id: '7',
    question: 'Why are some images recreated by AI?',
    answer: 'AI recreation improves clarity and consistency of example problems, diagrams, and illustrations. You can choose between original and recreated versions during the approval process.',
    category: 'processing',
    tags: ['images', 'ai', 'recreation', 'quality']
  },
  {
    id: '8',
    question: 'Is my uploaded content stored permanently?',
    answer: 'No, all uploaded files and generated content are processed temporarily and automatically deleted after your session. We don\'t store your documents or personal study materials.',
    category: 'general',
    tags: ['privacy', 'storage', 'security', 'data']
  },
  {
    id: '9',
    question: 'What if the AI organizes topics incorrectly?',
    answer: 'You can manually reorganize topics in the selection phase. Merge related topics, split complex ones, or create new topics as needed. The AI organization is a starting point that you can customize.',
    category: 'topics',
    tags: ['topics', 'organization', 'ai', 'incorrect']
  },
  {
    id: '10',
    question: 'Can I create multiple cheat sheets from the same files?',
    answer: 'Yes! Once files are processed, you can create different cheat sheets by selecting different topics, changing page settings, or using different reference templates without re-uploading.',
    category: 'general',
    tags: ['multiple', 'reuse', 'files', 'different']
  }
]

export function HelpSystem({ workflowStage = 'upload' }: HelpSystemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [tourActive, setTourActive] = useState(false)
  const [tourSteps, setTourSteps] = useState<any[]>([])
  
  const { workflowStage: contextStage, setWorkflowStage, userProgress, updateProgress } = useContextualHelp()

  useEffect(() => {
    setWorkflowStage(workflowStage)
  }, [workflowStage, setWorkflowStage])

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = [
    { value: 'all', label: 'All Topics' },
    { value: 'general', label: 'General' },
    { value: 'upload', label: 'File Upload' },
    { value: 'processing', label: 'Processing' },
    { value: 'topics', label: 'Topic Selection' },
    { value: 'customization', label: 'Customization' },
    { value: 'troubleshooting', label: 'Troubleshooting' }
  ]

  const startTour = (steps: any[]) => {
    setTourSteps(steps)
    setTourActive(true)
    setIsOpen(false)
  }

  const completeTour = () => {
    setTourActive(false)
    setTourSteps([])
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Help
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Help & Documentation
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="contextual" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="contextual">Current Step</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="guides">Guides</TabsTrigger>
              <TabsTrigger value="tours">Tours</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contextual" className="mt-4">
              <ContextualHelp 
                workflowStage={contextStage} 
                userProgress={userProgress}
              />
            </TabsContent>
            
            <TabsContent value="faq" className="mt-4 space-y-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredFAQs.map(faq => (
                  <Card key={faq.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {faq.question}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.value === faq.category)?.label}
                        </Badge>
                        {faq.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {faq.answer}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredFAQs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No FAQ items found matching your search.
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="guides" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">File Format Guides</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      PDF Processing Guide
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Word Document Guide
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      PowerPoint Guide
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Excel Spreadsheet Guide
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Image Processing Guide
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Text File Guide
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Workflow Guides</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Complete Workflow
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Topic Selection
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Customization Options
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Troubleshooting Guide
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Reference Templates
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Visual Content Recreation
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="tours" className="mt-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Interactive tours guide you through each step of the cheat sheet creation process.
                </div>
                
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Available Tours</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">File Upload Tour</div>
                          <div className="text-sm text-muted-foreground">
                            Learn how to upload and process your study materials
                          </div>
                        </div>
                        <TourStarter 
                          tourType="upload" 
                          onStart={startTour}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Topic Selection Tour</div>
                          <div className="text-sm text-muted-foreground">
                            Understand how to choose and edit topics for your cheat sheet
                          </div>
                        </div>
                        <TourStarter 
                          tourType="topics" 
                          onStart={startTour}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Customization Tour</div>
                          <div className="text-sm text-muted-foreground">
                            Learn about layout options and formatting settings
                          </div>
                        </div>
                        <TourStarter 
                          tourType="customization" 
                          onStart={startTour}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <GuidedTour
        steps={tourSteps}
        isActive={tourActive}
        onComplete={completeTour}
        onSkip={completeTour}
      />
    </>
  )
}

// Floating help button for persistent access
export function FloatingHelpButton({ workflowStage }: { workflowStage?: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <HelpSystem workflowStage={workflowStage as any} />
    </div>
  )
}