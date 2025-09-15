# 🧀 CheeseSheet

![CheeseSheet Logo](./public/B1.png)

A comprehensive application for transforming academic documents into optimized compact study materials with enhanced visual representations and AI-powered content verification.

## Features

### 🎨 Enhanced Image Generation
- **Flat-Line Visuals**: Generate simple, clean visual representations for equations and concepts
- **Contextual Illustrations**: Automatically create relevant diagrams for mathematical content
- **Multiple Styles**: Choose from different visual styles and line weights

### ✏️ Post-Generation Editing
- **Content Modification**: Add, remove, or edit sections after generation
- **Image Management**: Regenerate, remove, or add new visual representations
- **Real-Time Preview**: See changes instantly with live preview functionality

### 📊 Compact Layout Optimization
- **Dense Formatting**: Maximize content density while maintaining readability
- **Multi-Column Layouts**: Optimize space usage with flexible column arrangements
- **Academic Styling**: Professional formatting suitable for study materials

## Supported File Formats

- PDF Documents - Text and image extraction with enhanced processing
- Word Documents - Full document processing with structure preservation
- PowerPoint Presentations - Slide content extraction with visual elements
- Excel Spreadsheets - Data and table processing with multi-sheet support
- Images - OCR text extraction with improved accuracy
- Text Files - Plain text processing with intelligent organization

## Quick Start

1. **Upload Files**: Drag and drop or select your study materials
2. **Configure Layout**: Choose compact layout settings and image generation options
3. **Generate**: Create your CheeseSheet study guide with enhanced visuals
4. **Edit Content**: Use the post-generation editor to modify sections and images
5. **Export**: Download in your preferred format (HTML, PDF, or Markdown)

## Deployment

CheeseSheet can be deployed on various platforms. See our [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### Quick Deploy

```bash
# Clone the repository
git clone <your-repo-url>
cd cheesesheet

# Run the deployment script
./deploy.sh production
```

### Supported Platforms

- **Vercel** (Recommended) - One-click deployment with automatic scaling
- **Docker** - Containerized deployment for any platform
- **AWS** - App Runner, ECS, or EC2 deployment options
- **Manual Server** - Traditional VPS or dedicated server deployment

## Documentation

- **[Complete Documentation](./docs/README.md)** - All documentation in one place
- **[Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE.md)** - Deploy to any platform
- **[Docker Guide](./docs/deployment/DOCKER_DEPLOYMENT_GUIDE.md)** - Containerized deployment
- **[Development Guide](./docs/development/README.md)** - Setup for development
- **[Testing Guide](./docs/testing/README.md)** - Testing strategies and guides

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, Express
- **AI Integration**: OpenAI API for content processing and image generation
- **File Processing**: PDF.js, Mammoth.js, ExcelJS
- **Styling**: Tailwind CSS, shadcn/ui components