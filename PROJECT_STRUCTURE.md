# CheeseSheet Project Structure

This document outlines the organized structure of the CheeseSheet project.

## 📁 Root Directory Structure

```
cheesesheet/
├── 📁 app/                     # Next.js App Router
│   ├── 📁 api/                # API routes
│   ├── 📁 edit-study-material/ # Study material editor
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main application page
├── 📁 backend/                 # Backend services and libraries
│   ├── 📁 lib/                # Core backend libraries
│   └── 📁 scripts/            # Backend utility scripts
├── 📁 components/              # React components
│   ├── 📁 help/               # Help system components
│   ├── 📁 ui/                 # UI components (shadcn/ui)
│   └── *.tsx                  # Main components
├── 📁 docs/                    # 📚 Documentation
│   ├── 📁 deployment/         # Deployment guides
│   ├── 📁 development/        # Development guides
│   ├── 📁 testing/            # Testing documentation
│   ├── 📁 reference/          # Reference materials
│   └── README.md              # Documentation index
├── 📁 lib/                     # Shared utilities
├── 📁 public/                  # Static assets
│   ├── B1.png                 # CheeseSheet logo
│   └── *.png                  # Other static images
├── 📁 styles/                  # Stylesheets
├── 📁 test/                    # Test files
├── 📁 archive/                 # 🗄️ Archived files
│   ├── 📁 old-docs/           # Old documentation
│   ├── 📁 test-files/         # Old test files
│   └── 📁 Material_test/      # Test materials
├── 📁 scripts/                 # Build and utility scripts
└── 📁 tmp/                     # Temporary files
```

## 🔧 Configuration Files

```
├── .dockerignore              # Docker ignore rules
├── .env.docker               # Docker environment template
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── components.json           # shadcn/ui configuration
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile               # Docker image definition
├── jest.config.js           # Jest testing configuration
├── jest.setup.js            # Jest setup file
├── next.config.mjs          # Next.js configuration
├── package.json             # Node.js dependencies and scripts
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vercel.json              # Vercel deployment configuration
```

## 🚀 Deployment Files

```
├── deploy.sh                # General deployment script
├── docker-deploy.sh         # Docker-specific deployment
├── setup.sh                 # Development setup script
└── compact-study.config.json # Study generation configuration
```

## 📚 Documentation Structure

```
docs/
├── README.md                 # Documentation index
├── 📁 deployment/
│   ├── DEPLOYMENT_GUIDE.md   # Complete deployment guide
│   └── DOCKER_DEPLOYMENT_GUIDE.md # Docker-specific guide
├── 📁 development/
│   └── README.md             # Development setup and guidelines
├── 📁 testing/
│   └── README.md             # Testing strategies and guides
└── 📁 reference/
    └── (reference materials)
```

## 🏗️ Backend Architecture

```
backend/lib/
├── 📁 ai/                    # AI services
│   ├── content-quality-verifier.ts # Content verification
│   ├── simple-image-generator.ts   # Image generation
│   └── image-generation-error-handler.ts
├── 📁 compact-study/         # Study generation engine
│   ├── index.ts              # Main exports
│   ├── ai-enhanced-structure-organizer.ts
│   ├── html-output-generator.ts
│   ├── pdf-output-generator.ts
│   ├── types.ts              # Type definitions
│   └── (other processors)
├── 📁 config/                # Configuration management
├── 📁 error-handling/        # Error handling utilities
├── 📁 file-processing/       # File processing services
├── 📁 monitoring/            # Monitoring and logging
├── 📁 performance/           # Performance optimization
└── 📁 utils/                 # Shared utilities
```

## 🎨 Frontend Architecture

```
components/
├── 📁 ui/                    # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── (other UI components)
├── 📁 help/                  # Help system
│   └── help-system.tsx
├── compact-study-generator.tsx # Main generator component
├── export-material-dialog.tsx # Export functionality
└── monitoring-provider.tsx   # Monitoring integration
```

## 🗄️ Archive Structure

```
archive/
├── 📁 old-docs/              # Historical documentation
│   ├── CACHE_FIX_SUMMARY.md
│   ├── IMPROVEMENTS_SUMMARY.md
│   ├── TASK_*.md             # Implementation summaries
│   └── (other old docs)
├── 📁 test-files/            # Old test files and data
│   ├── test-*.js             # Test scripts
│   ├── debug-*.js            # Debug scripts
│   ├── extracted-*.txt       # Test data
│   └── (other test files)
└── 📁 Material_test/         # Test materials and samples
```

## 🔍 Key Files Explained

### Core Application Files
- **`app/page.tsx`** - Main CheeseSheet application page
- **`components/compact-study-generator.tsx`** - Primary study generation interface
- **`backend/lib/compact-study/index.ts`** - Main study generation engine

### Configuration Files
- **`package.json`** - Project dependencies and scripts
- **`next.config.mjs`** - Next.js configuration with optimizations
- **`tailwind.config.ts`** - Tailwind CSS customization
- **`tsconfig.json`** - TypeScript compiler configuration

### Deployment Files
- **`Dockerfile`** - Multi-stage Docker build configuration
- **`docker-compose.yml`** - Complete Docker stack definition
- **`deploy.sh`** - Automated deployment script with multiple platform support
- **`setup.sh`** - Quick development environment setup

### Environment Files
- **`.env.example`** - Template for environment variables
- **`.env.docker`** - Docker-specific environment template

## 🚀 Getting Started

1. **Development Setup:**
   ```bash
   ./setup.sh
   npm run dev
   ```

2. **Docker Deployment:**
   ```bash
   ./docker-deploy.sh production
   ```

3. **General Deployment:**
   ```bash
   ./deploy.sh production
   ```

## 📋 File Naming Conventions

- **Components**: PascalCase (e.g., `CompactStudyGenerator.tsx`)
- **Utilities**: camelCase (e.g., `contentProcessor.ts`)
- **Configuration**: kebab-case (e.g., `next.config.mjs`)
- **Documentation**: UPPERCASE (e.g., `README.md`)
- **Scripts**: kebab-case (e.g., `deploy.sh`)

## 🔄 Development Workflow

1. **Feature Development**: Work in `app/`, `components/`, or `backend/`
2. **Testing**: Add tests in `test/` directory
3. **Documentation**: Update relevant docs in `docs/`
4. **Deployment**: Use deployment scripts in root directory

---

**CheeseSheet Project Structure v1.0**
*Clean, organized, and ready for development*