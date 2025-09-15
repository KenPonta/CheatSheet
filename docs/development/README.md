# CheeseSheet Development Guide

This guide covers setting up CheeseSheet for development and contributing to the project.

## 🚀 Quick Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd cheesesheet

# 2. Run setup script
./setup.sh

# 3. Start development server
npm run dev
# or
pnpm dev
```

## 📋 Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI API key
- LaTeX (optional, for PDF generation)

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:low-memory   # Start with memory optimization

# Building
npm run build           # Build for production
npm run start          # Start production server

# Testing
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage

# Linting
npm run lint           # Run ESLint

# Memory Management
npm run memory:check   # Check memory usage
npm run memory:clean   # Clean memory
npm run memory:dev     # Start with memory monitoring
```

## 🏗️ Project Structure

```
cheesesheet/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── backend/               # Backend services
│   ├── lib/              # Core libraries
│   │   ├── ai/           # AI services
│   │   ├── compact-study/ # Study generation
│   │   └── utils/        # Utilities
│   └── scripts/          # Backend scripts
├── components/            # React components
├── docs/                 # Documentation
├── public/               # Static assets
├── styles/               # Stylesheets
└── test/                 # Test files
```

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
ENABLE_LATEX_PDF=true
LATEX_ENGINE=pdflatex
ENABLE_PUPPETEER_FALLBACK=true
NODE_OPTIONS=--max-old-space-size=4096
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- components/compact-study-generator.test.tsx

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🐛 Debugging

### Memory Issues
```bash
# Check memory usage
npm run memory:check

# Start with memory monitoring
npm run memory:dev

# Clean memory
npm run memory:clean
```

### LaTeX Issues
```bash
# Check LaTeX installation
pdflatex --version

# Test LaTeX compilation
echo "\\documentclass{article}\\begin{document}Hello\\end{document}" | pdflatex
```

### API Issues
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Check API logs
npm run dev # Check console output
```

## 🔄 Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow TypeScript best practices
   - Add tests for new features
   - Update documentation

3. **Test Changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write tests for new features
- Document complex functions

## 🏗️ Architecture Overview

### Frontend (Next.js)
- **App Router** for routing
- **React Server Components** where possible
- **Tailwind CSS** for styling
- **shadcn/ui** for components

### Backend (Node.js)
- **API Routes** in Next.js
- **OpenAI Integration** for AI features
- **LaTeX** for PDF generation
- **Puppeteer** for fallback PDF generation

### Key Services
- **Content Quality Verifier** - AI-powered content improvement
- **Simple Image Generator** - Educational image generation
- **Compact Study Generator** - Main study guide generation
- **PDF Output Generator** - LaTeX-based PDF creation

## 🚀 Deployment

See [Deployment Documentation](../deployment/) for deployment guides.

## 🆘 Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Node modules issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build failures:**
```bash
rm -rf .next
npm run build
```

**Memory issues:**
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
npm run dev
```

---

**CheeseSheet Development Guide v1.0**