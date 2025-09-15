# CheeseSheet Deployment Guide

This guide covers deploying CheeseSheet (formerly Study Material Generator) to various platforms.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Vercel Deployment (Recommended)](#vercel-deployment)
5. [Docker Deployment](#docker-deployment)
6. [AWS Deployment](#aws-deployment)
7. [Manual Server Deployment](#manual-server-deployment)
8. [Environment Variables](#environment-variables)
9. [Post-Deployment Setup](#post-deployment-setup)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying CheeseSheet, ensure you have:

- Node.js 18+ installed
- npm or pnpm package manager
- Git for version control
- OpenAI API key (for AI features)
- LaTeX installation (for PDF generation)

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in your project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# LaTeX Configuration
ENABLE_LATEX_PDF=true
LATEX_ENGINE=pdflatex
LATEX_TIMEOUT=60000
LATEX_TEMP_DIR=/tmp/cheesesheet_latex

# Image Generation
ENABLE_PUPPETEER_FALLBACK=true

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn_here
POSTHOG_KEY=your_posthog_key_here

# Performance Settings
NODE_OPTIONS=--max-old-space-size=4096
PROCESSING_MODE=balanced

# Security
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.com
```

### Optional Environment Variables

```bash
# Advanced LaTeX Settings
LATEX_PACKAGES_PATH=/usr/local/texlive/2025/texmf-dist
LATEX_FONTS_PATH=/usr/local/texlive/2025/texmf-dist/fonts

# Content Processing
ENABLE_CONTENT_VERIFICATION=true
MAX_FILE_SIZE=50MB
MAX_FILES_PER_REQUEST=10

# Image Generation Settings
IMAGE_GENERATION_TIMEOUT=30000
MAX_IMAGE_DIMENSIONS=2000x2000

# Caching
ENABLE_REDIS_CACHE=false
REDIS_URL=redis://localhost:6379
```

## Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd cheesesheet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Install LaTeX (for PDF generation):**
   
   **macOS:**
   ```bash
   brew install --cask mactex
   # or minimal version:
   brew install --cask basictex
   ```
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt-get update
   sudo apt-get install texlive-full
   # or minimal version:
   sudo apt-get install texlive-latex-base texlive-latex-recommended
   ```
   
   **Windows:**
   - Download and install MiKTeX from https://miktex.org/

5. **Run the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Verify the setup:**
   - Open http://localhost:3000
   - Upload a test PDF file
   - Generate a study guide to test all features

## Vercel Deployment

Vercel is the recommended platform for deploying CheeseSheet.

### Quick Deploy

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

### Manual Vercel Setup

1. **Create a new project on Vercel:**
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your Git repository

2. **Configure environment variables:**
   - In your Vercel project dashboard
   - Go to Settings → Environment Variables
   - Add all required environment variables from your `.env.local`

3. **Configure build settings:**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install",
     "devCommand": "npm run dev"
   }
   ```

4. **Add Vercel configuration (vercel.json):**
   ```json
   {
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 300
       }
     },
     "regions": ["iad1"],
     "env": {
       "NODE_OPTIONS": "--max-old-space-size=4096"
     }
   }
   ```

### Vercel with LaTeX

Since Vercel doesn't support LaTeX by default, you have two options:

**Option 1: Disable LaTeX PDF generation**
```bash
ENABLE_LATEX_PDF=false
ENABLE_PUPPETEER_FALLBACK=true
```

**Option 2: Use external LaTeX service**
- Set up a separate LaTeX service (Docker container)
- Configure CheeseSheet to use the external service

## Docker Deployment

### Dockerfile

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install LaTeX
RUN apk add --no-cache \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texmf-dist-latexextra

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  cheesesheet:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ENABLE_LATEX_PDF=true
      - LATEX_ENGINE=pdflatex
    volumes:
      - /tmp/cheesesheet_latex:/tmp/cheesesheet_latex
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Deploy with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f cheesesheet

# Update deployment
docker-compose pull
docker-compose up -d --build
```

## AWS Deployment

### Using AWS App Runner

1. **Create an App Runner service:**
   ```bash
   aws apprunner create-service \
     --service-name cheesesheet \
     --source-configuration '{
       "ImageRepository": {
         "ImageIdentifier": "your-ecr-repo/cheesesheet:latest",
         "ImageConfiguration": {
           "Port": "3000",
           "RuntimeEnvironmentVariables": {
             "NODE_ENV": "production",
             "OPENAI_API_KEY": "your-key"
           }
         }
       },
       "AutoDeploymentsEnabled": true
     }'
   ```

### Using AWS ECS

1. **Create task definition:**
   ```json
   {
     "family": "cheesesheet",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "1024",
     "memory": "2048",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "cheesesheet",
         "image": "your-ecr-repo/cheesesheet:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "OPENAI_API_KEY",
             "valueFrom": "arn:aws:secretsmanager:region:account:secret:openai-key"
           }
         ]
       }
     ]
   }
   ```

## Manual Server Deployment

### Ubuntu/Debian Server

1. **Update system:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install LaTeX:**
   ```bash
   sudo apt-get install texlive-full
   ```

4. **Install PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   ```

5. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd cheesesheet
   npm install
   npm run build
   ```

6. **Create PM2 ecosystem file:**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'cheesesheet',
       script: 'npm',
       args: 'start',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       instances: 'max',
       exec_mode: 'cluster',
       max_memory_restart: '2G'
     }]
   }
   ```

7. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

8. **Setup Nginx reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 300s;
           proxy_connect_timeout 75s;
       }
   }
   ```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | `sk-...` |
| `NEXTAUTH_SECRET` | Secret for authentication | `random-string` |
| `NEXTAUTH_URL` | Base URL of your app | `https://cheesesheet.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_LATEX_PDF` | Enable LaTeX PDF generation | `true` |
| `LATEX_ENGINE` | LaTeX engine to use | `pdflatex` |
| `LATEX_TIMEOUT` | LaTeX compilation timeout (ms) | `60000` |
| `ENABLE_PUPPETEER_FALLBACK` | Enable Puppeteer PDF fallback | `true` |
| `NODE_OPTIONS` | Node.js options | `--max-old-space-size=4096` |
| `PROCESSING_MODE` | Processing optimization mode | `balanced` |

## Post-Deployment Setup

### 1. Health Check

Test your deployment:
```bash
curl -f https://your-domain.com/api/health
```

### 2. Upload Test

1. Go to your deployed CheeseSheet
2. Upload a test PDF file
3. Generate a study guide
4. Verify PDF generation works
5. Test image generation features

### 3. Monitoring Setup

Configure monitoring:
- Set up Sentry for error tracking
- Configure PostHog for analytics
- Set up uptime monitoring
- Configure log aggregation

### 4. Performance Optimization

- Enable CDN for static assets
- Configure caching headers
- Set up Redis for session storage
- Optimize image delivery

## Troubleshooting

### Common Issues

**1. LaTeX compilation fails:**
```bash
# Check LaTeX installation
pdflatex --version

# Install missing packages
sudo tlmgr install <package-name>
```

**2. Out of memory errors:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
```

**3. PDF generation timeout:**
```bash
# Increase timeout in environment
LATEX_TIMEOUT=120000
```

**4. Image generation fails:**
```bash
# Check Puppeteer dependencies
npm run puppeteer:install
```

### Performance Issues

**1. Slow PDF generation:**
- Use faster LaTeX engine (lualatex)
- Reduce content complexity
- Enable caching

**2. High memory usage:**
- Reduce concurrent processing
- Enable memory optimization mode
- Use clustering

**3. Slow image generation:**
- Optimize image dimensions
- Use simpler visualization styles
- Enable image caching

### Logs and Debugging

**View application logs:**
```bash
# PM2
pm2 logs cheesesheet

# Docker
docker-compose logs -f cheesesheet

# Vercel
vercel logs
```

**Enable debug mode:**
```bash
DEBUG=cheesesheet:* npm start
```

## Security Considerations

1. **Environment Variables:**
   - Never commit `.env` files
   - Use secrets management in production
   - Rotate API keys regularly

2. **File Upload Security:**
   - Validate file types and sizes
   - Scan uploaded files for malware
   - Use temporary storage for processing

3. **API Security:**
   - Implement rate limiting
   - Use HTTPS in production
   - Validate all inputs

4. **LaTeX Security:**
   - Run LaTeX in sandboxed environment
   - Limit LaTeX package access
   - Monitor LaTeX execution

## Backup and Recovery

1. **Database Backup:**
   - Set up automated backups
   - Test restore procedures
   - Store backups securely

2. **File Storage:**
   - Backup uploaded files
   - Implement versioning
   - Use redundant storage

3. **Configuration:**
   - Version control all configs
   - Document environment setup
   - Maintain deployment scripts

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Test with minimal configuration
4. Check system requirements

---

**CheeseSheet Deployment Guide v1.0**
*Last updated: January 2025*